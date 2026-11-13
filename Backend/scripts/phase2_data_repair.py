#!/usr/bin/env python3
"""Review and apply the approved 2025/26 Phase 2 data corrections."""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from bs4 import BeautifulSoup
import importlib.util

ROOT = Path(__file__).resolve().parents[2]
SEASON = "2025-2026"
SEASON_DIR = ROOT / "Backend" / "data" / "seasons" / SEASON
MAIN_CSV = SEASON_DIR / "top5-players-2025-2026.csv"
REVIEW_CSV = ROOT / "Backend" / "scripts" / "output" / "squad_label_review_2025_2026.csv"
REMOVED_CSV = ROOT / "Backend" / "scripts" / "output" / "removed_progression_values.csv"
SIDECAR = SEASON_DIR / "squad_verification.csv"
ZERO_ARCHIVE = SEASON_DIR / "archive" / "zero_minute_rows.csv"
HEADERS = {"User-Agent": "PitchPulsePhase2/1.0 (data verification)"}
LEAGUE_PAGE = {"it Serie A": "2025–26_Serie_A", "fr Ligue 1": "2025–26_Ligue_1"}
YOUTH_PARENTS = {
    ("it Serie A", "Atalanta U23"): "Atalanta",
    ("it Serie A", "Cagliari Primavera"): "Cagliari",
    ("it Serie A", "Fiorentina Primavera"): "Fiorentina",
    ("it Serie A", "Hellas Verona Primavera"): "Hellas Verona",
    ("it Serie A", "Salernitana Primavera"): "Salernitana",
    ("fr Ligue 1", "AJ Auxerre B"): "AJ Auxerre",
    ("fr Ligue 1", "FC Lorient B"): "FC Lorient",
    ("fr Ligue 1", "OGC Nice Espoir"): "OGC Nice",
    ("fr Ligue 1", "Stade Brest 29 B"): "Stade Brestois 29",
    ("fr Ligue 1", "Toulouse FC U19"): "Toulouse FC",
}
GENERIC_LABELS = {"Serie A Squad", "Ligue 1 Squad"}


def audit_module():
    path = ROOT / "Backend" / "scripts" / "audit" / "crosscheck_wiki.py"
    spec = importlib.util.spec_from_file_location("phase2_crosscheck", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def key(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "", text)


def player_key(value: object) -> str:
    text = re.sub(r"\[[^]]*\]", "", str(value))
    text = re.sub(r"\s*\([^)]*\)", "", text)
    return key(text)


def fetch(url: str) -> str:
    response = requests.get(url, headers=HEADERS, timeout=60)
    response.raise_for_status()
    return response.text


def club_links(competition: str) -> dict[str, str]:
    soup = BeautifulSoup(fetch("https://en.wikipedia.org/wiki/" + LEAGUE_PAGE[competition]), "html.parser")
    links = {}
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"].split("?", 1)[0]
        text = anchor.get_text(" ", strip=True)
        if text and "2025" in href and "season" in href and "action=edit" not in href:
            links.setdefault(key(text), "https://en.wikipedia.org" + href if href.startswith("/") else href)
    return links


def player_names(html: str) -> set[str]:
    names: set[str] = set()
    for table in pd.read_html(html):
        columns = list(table.columns)
        player_columns = [column for column in columns if column == "Player" or (isinstance(column, tuple) and "Player" in column)]
        column_names = {column if isinstance(column, str) else " ".join(map(str, column)) if isinstance(column, tuple) else str(column) for column in columns}
        normalized_columns = {re.sub(r"[^a-z]", "", column.lower()) for column in column_names}
        has_position = bool(normalized_columns & {"pos", "positions", "position"})
        has_nationality = bool(normalized_columns & {"nat", "nation", "nationality"})
        has_transfer_columns = bool(normalized_columns & {"from", "to", "movingfrom", "movingto"})
        if not player_columns or not has_position or not has_nationality or has_transfer_columns:
            continue
        for value in table[player_columns[0]].tolist():
            if pd.notna(value):
                names.add(player_key(value))
    return names


def official_clubs(competition: str) -> dict[str, str]:
    crosscheck = audit_module()
    table = crosscheck.parse_league_table(crosscheck.all_tables(crosscheck.fetch_page(SEASON, competition)))
    result = {}
    for row in table or []:
        mapped = crosscheck.canon_club(row["team"])
        result[mapped[0] if mapped else key(row["team"])] = row["team"]
    return result


def source_url(club: str) -> str:
    return "https://en.wikipedia.org/wiki/" + club.replace(" ", "_")


def build_review() -> pd.DataFrame:
    df = pd.read_csv(MAIN_CSV)
    crosscheck = audit_module()
    records = []
    for competition in LEAGUE_PAGE:
        official = official_clubs(competition)
        links = club_links(competition)
        sources = []
        for club_key, club in official.items():
            url = links.get(key(club))
            kind = "club_2025_26_season"
            if not url:
                url = source_url(club)
                kind = "club_current_squad_fallback"
            try:
                names = player_names(fetch(url))
            except Exception:
                names = set()
            sources.append((club_key, club, url, kind, names))
        subset = df[(df["Comp"] == competition) & (df["Min"] > 0)].copy()
        subset["club_key"] = subset["Squad"].map(lambda value: crosscheck.canon_club(value)[0] if crosscheck.canon_club(value) else None)
        subset = subset[~subset["club_key"].isin(official)]
        duplicate_players = set(df["Player"][df["Player"].duplicated(keep=False)])
        for _, row in subset.iterrows():
            matches = [source for source in sources if player_key(row["Player"]) in source[4]]
            youth_parent = YOUTH_PARENTS.get((competition, row["Squad"]))
            parent_identity = crosscheck.canon_club(youth_parent)
            parent_match = next((source for source in sources
                                 if (crosscheck.canon_club(source[1]) and parent_identity
                                     and crosscheck.canon_club(source[1])[0] == parent_identity[0])), None) if youth_parent else None
            if youth_parent and parent_match:
                action = "auto-map"
                category = "youth_reserve_parent_club"
                proposed = parent_match[1]
                evidence = f"Youth/reserve label auto-mapped to parent 2025-26 club: {proposed}"
                evidence_url = parent_match[2]
            elif youth_parent:
                action = "unresolved"
                category = "youth_reserve_non_league_parent"
                proposed = ""
                evidence = f"Youth/reserve parent {youth_parent} is not a 2025-26 {competition} club; row left unchanged"
                evidence_url = ""
            elif row["Squad"] in GENERIC_LABELS:
                action = "unresolved"
                category = "generic_placeholder"
                proposed = ""
                evidence = "Generic competition placeholder; row left unchanged"
                evidence_url = ""
            elif len(matches) == 1:
                club_key, club, url, kind, _ = matches[0]
                action = "correct" if kind == "club_2025_26_season" else "auto-map"
                category = "verified_club_season" if action == "correct" else "verified_current_squad_fallback"
                proposed = club
                evidence = f"{kind}: {club} lists {row['Player']}"
                evidence_url = url
            elif player_key(row["Player"]) in {player_key(name) for name in duplicate_players}:
                action = "unresolved"
                category = "mid_season_transfer_spell"
                proposed = ""
                evidence = "Player has multiple 2025-26 competition/spell rows; label is retained pending a unique club source"
                evidence_url = ""
            else:
                action = "unresolved"
                category = "stale_transfer_label_no_unique_squad_match"
                proposed = ""
                evidence = "No unique 2025-26 squad source matched the player; row left unchanged"
                evidence_url = ""
            records.append({"Rk": int(row["Rk"]), "Player": row["Player"], "Comp": competition,
                            "Squad_before": row["Squad"], "category": category, "action": action,
                            "proposed_squad": proposed, "evidence": evidence, "source_url": evidence_url})
    review = pd.DataFrame(records).sort_values("Rk")
    counts = review.groupby("Comp").size().to_dict()
    if len(review) != 252 or counts != {"fr Ligue 1": 124, "it Serie A": 128}:
        raise RuntimeError(f"Unexpected review population: {counts}")
    REVIEW_CSV.parent.mkdir(parents=True, exist_ok=True)
    review.to_csv(REVIEW_CSV, index=False, encoding="utf-8")
    return review


def apply_changes(review: pd.DataFrame) -> None:
    df = pd.read_csv(MAIN_CSV)
    removed = df[["Rk", "Player", "Comp", "PrgC", "PrgP", "PrgR"]].rename(
        columns={"PrgC": "PrgC_before", "PrgP": "PrgP_before", "PrgR": "PrgR_before"})
    removed["reason"] = "No traceable source for 2025-26 Serie A/Ligue 1 progression values; null per Phase 2 decision"
    removed.to_csv(REMOVED_CSV, index=False, encoding="utf-8")
    zero = df[df["Min"].eq(0)].copy()
    ZERO_ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
    zero.to_csv(ZERO_ARCHIVE, index=False, encoding="utf-8")
    df = df[df["Min"].gt(0)].copy()
    df[["PrgC", "PrgP", "PrgR"]] = np.nan
    approved = review[review["action"].isin(["correct", "auto-map"])].set_index("Rk")
    reviewed = set(review["Rk"])
    sidecar = []
    for index, row in df.iterrows():
        rk = int(row["Rk"])
        if rk in approved.index:
            after = approved.loc[rk, "proposed_squad"]
            df.at[index, "Squad"] = after
            sidecar.append({"Player": row["Player"], "Comp": row["Comp"], "Squad_after": after,
                            "verified": True, "category": approved.loc[rk, "category"], "source_url": approved.loc[rk, "source_url"]})
        elif rk in reviewed:
            sidecar.append({"Player": row["Player"], "Comp": row["Comp"], "Squad_after": row["Squad"],
                            "verified": False, "category": review.set_index("Rk").loc[rk, "category"], "source_url": review.set_index("Rk").loc[rk, "source_url"]})
    pd.DataFrame(sidecar).to_csv(SIDECAR, index=False, encoding="utf-8")
    df["Rk"] = range(1, len(df) + 1)
    df.to_csv(MAIN_CSV, index=False, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["review", "apply"])
    args = parser.parse_args()
    review = build_review()
    if args.command == "apply":
        apply_changes(review)
    print(json.dumps({"review_rows": len(review), "actions": review["action"].value_counts().to_dict()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
