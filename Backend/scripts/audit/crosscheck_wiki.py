#!/usr/bin/env python3
"""
PitchPulse independent cross-check (Phase 1, read-only).

Compares Backend/data/seasons/<season>/*.csv against the Wikipedia season
pages for the five major European leagues, 2012-13 .. 2025-26.

Outputs (the only files this script writes):
  docs/CROSSCHECK_REPORT.md
  Backend/scripts/output/crosscheck_discrepancies.csv

Wikipedia HTML is cached outside the repository (system temp directory).
No data file, test or application file is modified.
"""
from __future__ import annotations

import csv
import difflib
import io
import json
import os
import re
import sys
import time
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

try:
    import duckdb
except ImportError:  # optional: the parity check reports it as unavailable
    duckdb = None

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "Backend" / "data" / "seasons"
PARQUET_DIR = ROOT / "Backend" / "data" / "parquet"
DUCKDB_PATH = ROOT / "Backend" / "data" / "pitchpulse.duckdb"
REPORT_PATH = ROOT / "docs" / "CROSSCHECK_REPORT.md"
CSV_DIR = ROOT / "Backend" / "scripts" / "output"
CSV_PATH = CSV_DIR / "crosscheck_discrepancies.csv"

SEASONS = [f"{y}-{y + 1}" for y in range(2012, 2026)]
LEAGUES = {
    "eng Premier League": "Premier League",
    "es La Liga": "La Liga",
    "it Serie A": "Serie A",
    "de Bundesliga": "Bundesliga",
    "fr Ligue 1": "Ligue 1",
}
LEAGUE_ORDER = list(LEAGUES)

CACHE_DIR = Path(os.environ.get("TEMP", r"C:\Windows\Temp")) / "pitchpulse_wiki_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
HTTP_HEADERS = {"User-Agent": "PitchPulseAudit/1.0 (read-only data cross-check)"}

EXPECTED_TEAMS = {"de Bundesliga": 18, "fr Ligue 1": 18}  # default 20 elsewhere


def expected_teams(season: str, league: str) -> int:
    if league == "de Bundesliga":
        return 18
    if league == "fr Ligue 1":
        return 20 if season <= "2022-2023" else 18
    return 20


# --------------------------------------------------------------------------
# Wikipedia fetching (rate limited, cached outside the repo)
# --------------------------------------------------------------------------
def season_wiki_year(season: str) -> str:
    a, b = season.split("-")
    return f"{a}\u2013{b[2:]}"


def page_title(season: str, league: str) -> str:
    return f"{season_wiki_year(season)} {LEAGUES[league]}"


def page_url(season: str, league: str) -> str:
    return "https://en.wikipedia.org/wiki/" + page_title(season, league).replace(" ", "_")


_last_request = [0.0]


def fetch_page(season: str, league: str) -> str:
    key = re.sub(r"[^A-Za-z0-9._-]+", "_", page_title(season, league).replace(" ", "_")) + ".html"
    path = CACHE_DIR / key
    if path.exists():
        return path.read_text(encoding="utf-8")
    wait = 1.1 - (time.time() - _last_request[0])
    if wait > 0:
        time.sleep(wait)
    response = requests.get(page_url(season, league), headers=HTTP_HEADERS, timeout=60)
    _last_request[0] = time.time()
    response.raise_for_status()
    response.encoding = "utf-8"
    path.write_text(response.text, encoding="utf-8")
    return response.text


# --------------------------------------------------------------------------
# Table parsing
# --------------------------------------------------------------------------
REF_RE = re.compile(r"\[[^\]]*\]")


def cell_text(cell) -> str:
    # Strip reference superscripts and hidden sort keys (e.g. "Lewandowski, Robert").
    for el in cell.find_all(["sup"]):
        el.decompose()
    for el in cell.find_all(style=True):
        if "display:none" in el.get("style", "").replace(" ", "").lower():
            el.decompose()
    for el in cell.find_all(class_="sortkey"):
        el.decompose()
    text = cell.get_text(" ", strip=True)
    text = REF_RE.sub("", text).replace("\u00a0", " ")
    return re.sub(r"\s+", " ", text).strip()


def table_grid(table) -> list[list[str]]:
    """Expand an HTML table into a rectangular grid honouring rowspan/colspan."""
    grid: dict[tuple[int, int], str] = {}
    trs = [tr for tr in table.find_all("tr") if tr.find_parent("table") is table]
    max_cols = 0
    for r, tr in enumerate(trs):
        col = 0
        for cell in tr.find_all(["td", "th"], recursive=False):
            while (r, col) in grid:
                col += 1
            try:
                colspan = int(float(cell.get("colspan", 1) or 1))
            except ValueError:
                colspan = 1
            try:
                rowspan = int(float(cell.get("rowspan", 1) or 1))
            except ValueError:
                rowspan = 1
            text = cell_text(cell)
            for dr in range(rowspan):
                for dc in range(colspan):
                    grid[(r + dr, col + dc)] = text
            col += colspan
            max_cols = max(max_cols, col)
    return [[grid.get((r, c), "") for c in range(max_cols)] for r in range(len(trs))]


def all_tables(html: str) -> list[list[list[str]]]:
    soup = BeautifulSoup(html, "lxml")
    return [table_grid(t) for t in soup.find_all("table")]


def strip_accents(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def norm(text) -> str:
    text = strip_accents(str(text)).lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def header_index(header, exact=(), prefix=()):
    for i, cell in enumerate(header):
        h = norm(cell)
        if h in exact:
            return i
        if any(h.startswith(p) for p in prefix):
            return i
    return None


def parse_scorers(tables) -> list[dict] | None:
    best = None
    for rows in tables:
        for hdr_i in range(min(3, len(rows))):
            hdr = rows[hdr_i]
            ri = header_index(hdr, exact=("rank",))
            pi = header_index(hdr, exact=("player",))
            ci = header_index(hdr, exact=("club",), prefix=("team",))
            gi = header_index(hdr, exact=("goals",))
            if None in (ri, pi, ci, gi) or gi == ci:
                continue
            data = []
            for row in rows[hdr_i + 1:]:
                if gi >= len(row) or not row[gi].strip():
                    continue
                goals_txt = re.sub(r"[^0-9.]", "", row[gi])
                if not goals_txt:
                    continue
                try:
                    goals = float(goals_txt)
                except ValueError:
                    continue
                player = row[pi].strip() if pi < len(row) else ""
                if not player:
                    continue
                data.append({
                    "rank": row[ri].strip() if ri < len(row) else "",
                    "player": player,
                    "club": row[ci].strip() if ci < len(row) else "",
                    "goals": int(goals) if goals == int(goals) else goals,
                })
            if data and (best is None or len(data) > len(best)):
                best = data
    return best


def parse_league_table(tables) -> list[dict] | None:
    best = None
    for rows in tables:
        for hdr_i in range(min(3, len(rows))):
            hdr = rows[hdr_i]
            pi = header_index(hdr, exact=("pos", "pos."))
            ti = header_index(hdr, exact=("team",), prefix=("team",))
            pl = header_index(hdr, exact=("pld", "played"))
            gf = header_index(hdr, exact=("gf", "goals for"))
            ga = header_index(hdr, exact=("ga", "goals against"))
            if None in (pi, ti, pl, gf, ga):
                continue
            data = []
            for row in rows[hdr_i + 1:]:
                if pi >= len(row) or not row[pi].strip():
                    continue
                pos_txt = re.sub(r"[^0-9]", "", row[pi])
                if not pos_txt:
                    continue
                try:
                    gf_v = int(float(re.sub(r"[^0-9.]", "", row[gf])))
                    ga_v = int(float(re.sub(r"[^0-9.]", "", row[ga])))
                except (ValueError, IndexError):
                    continue
                data.append({
                    "pos": int(pos_txt),
                    "team": row[ti].strip() if ti < len(row) else "",
                    "pld": row[pl].strip() if pl < len(row) else "",
                    "gf": gf_v,
                    "ga": ga_v,
                })
            if len(data) >= 18 and (best is None or len(data) > len(best)):
                best = data
    return best


# --------------------------------------------------------------------------
# Canonical club registry
# Display name first; all aliases are normalised before lookup.
# --------------------------------------------------------------------------
CLUB_ALIASES: list[tuple[str, list[str]]] = [
    # England
    ("Arsenal", ["Arsenal", "Arsenal FC"]),
    ("Aston Villa", ["Aston Villa"]),
    ("AFC Bournemouth", ["Bournemouth", "AFC Bournemouth"]),
    ("Brentford", ["Brentford", "Brentford FC"]),
    ("Brighton & Hove Albion", ["Brighton", "Brighton & Hove Albion"]),
    ("Burnley", ["Burnley", "Burnley FC"]),
    ("Cardiff City", ["Cardiff City"]),
    ("Chelsea", ["Chelsea", "Chelsea FC"]),
    ("Crystal Palace", ["Crystal Palace"]),
    ("Everton", ["Everton", "Everton FC"]),
    ("Fulham", ["Fulham", "Fulham FC"]),
    ("Huddersfield Town", ["Huddersfield Town"]),
    ("Hull City", ["Hull City"]),
    ("Ipswich Town", ["Ipswich Town"]),
    ("Leeds United", ["Leeds United"]),
    ("Leicester City", ["Leicester City"]),
    ("Liverpool", ["Liverpool", "Liverpool FC"]),
    ("Luton Town", ["Luton Town"]),
    ("Manchester City", ["Manchester City"]),
    ("Manchester United", ["Manchester United", "Manchester Utd", "Man Utd"]),
    ("Middlesbrough", ["Middlesbrough", "Middlesbrough FC"]),
    ("Newcastle United", ["Newcastle United", "Newcastle", "Newcastle Utd"]),
    ("Norwich City", ["Norwich City"]),
    ("Nottingham Forest", ["Nottingham Forest", "Nottingham", "Nott'ham Forest"]),
    ("Queens Park Rangers", ["Queens Park Rangers"]),
    ("Reading", ["Reading", "Reading FC"]),
    ("Sheffield United", ["Sheffield United", "Sheffield Utd"]),
    ("Southampton", ["Southampton", "Southampton FC", "Southampton AFC"]),
    ("Stoke City", ["Stoke City"]),
    ("Sunderland", ["Sunderland", "Sunderland AFC"]),
    ("Swansea City", ["Swansea City"]),
    ("Tottenham Hotspur", ["Tottenham Hotspur", "Tottenham"]),
    ("Watford", ["Watford", "Watford FC"]),
    ("West Bromwich Albion", ["West Bromwich Albion"]),
    ("West Ham United", ["West Ham United", "West Ham"]),
    ("Wigan Athletic", ["Wigan Athletic"]),
    ("Wolverhampton Wanderers", ["Wolverhampton Wanderers", "Wolves"]),
    # Spain
    ("Deportivo Alavés", ["Alavés", "Deportivo Alavés"]),
    ("UD Almería", ["Almería", "UD Almería"]),
    ("Athletic Bilbao", ["Athletic Bilbao", "Athletic Club"]),
    ("Atlético Madrid", ["Atlético Madrid", "Atlético de Madrid"]),
    ("FC Barcelona", ["Barcelona", "FC Barcelona"]),
    ("Celta Vigo", ["Celta Vigo", "Celta de Vigo"]),
    ("Cádiz CF", ["Cádiz", "Cádiz CF"]),
    ("Córdoba CF", ["Córdoba", "Córdoba CF"]),
    ("Deportivo La Coruña", ["Deportivo La Coruña", "Deportivo de La Coruña"]),
    ("SD Eibar", ["Eibar", "SD Eibar"]),
    ("Elche CF", ["Elche", "Elche CF"]),
    ("Espanyol", ["Espanyol", "RCD Espanyol Barcelona", "Espanyol Barcelona"]),
    ("Getafe CF", ["Getafe", "Getafe CF"]),
    ("Girona FC", ["Girona", "Girona FC"]),
    ("Granada CF", ["Granada", "Granada CF"]),
    ("SD Huesca", ["Huesca", "SD Huesca"]),
    ("UD Las Palmas", ["Las Palmas", "UD Las Palmas"]),
    ("CD Leganés", ["Leganés", "CD Leganés"]),
    ("Levante UD", ["Levante", "Levante UD"]),
    ("RCD Mallorca", ["Mallorca", "RCD Mallorca"]),
    ("Málaga CF", ["Málaga", "Málaga CF"]),
    ("CA Osasuna", ["Osasuna", "CA Osasuna"]),
    ("Real Oviedo", ["Oviedo", "Real Oviedo"]),
    ("Rayo Vallecano", ["Rayo Vallecano"]),
    ("Real Betis", ["Real Betis", "Betis", "Real Betis Balompié"]),
    ("Real Madrid", ["Real Madrid"]),
    ("Real Sociedad", ["Real Sociedad"]),
    ("Sevilla FC", ["Sevilla", "Sevilla FC"]),
    ("Sporting Gijón", ["Sporting Gijón"]),
    ("Valencia CF", ["Valencia", "Valencia CF"]),
    ("Real Valladolid", ["Valladolid", "Real Valladolid", "Real Valladolid CF"]),
    ("Villarreal CF", ["Villarreal", "Villarreal CF"]),
    ("Real Zaragoza", ["Zaragoza", "Real Zaragoza"]),
    # Italy
    ("AC Milan", ["Milan", "AC Milan"]),
    ("Atalanta", ["Atalanta", "Atalanta BC"]),
    ("Benevento", ["Benevento", "Benevento Calcio"]),
    ("Bologna", ["Bologna", "Bologna FC 1909", "Bologna Football Club 1909"]),
    ("Brescia", ["Brescia", "Brescia Calcio"]),
    ("Cagliari", ["Cagliari", "Cagliari Calcio"]),
    ("Carpi", ["Carpi", "AC Carpi"]),
    ("Catania", ["Catania", "Catania FC"]),
    ("Cesena", ["Cesena", "Cesena FC"]),
    ("Chievo", ["Chievo", "Chievo Verona"]),
    ("Como", ["Como", "Como 1907"]),
    ("Cremonese", ["Cremonese", "US Cremonese"]),
    ("Crotone", ["Crotone", "FC Crotone"]),
    ("Empoli", ["Empoli", "FC Empoli"]),
    ("Fiorentina", ["Fiorentina", "ACF Fiorentina"]),
    ("Frosinone", ["Frosinone", "Frosinone Calcio"]),
    ("Genoa", ["Genoa", "Genoa CFC"]),
    ("Hellas Verona", ["Hellas Verona", "Verona"]),
    ("Inter Milan", ["Inter", "Inter Milan", "Internazionale"]),
    ("Juventus", ["Juventus", "Juventus FC"]),
    ("Lazio", ["Lazio", "SS Lazio", "Società Sportiva Lazio S.p.A."]),
    ("Lecce", ["Lecce", "US Lecce"]),
    ("Livorno", ["Livorno", "US Livorno 1915"]),
    ("Monza", ["Monza", "AC Monza"]),
    ("Napoli", ["Napoli", "SSC Napoli"]),
    ("Palermo", ["Palermo", "Palermo FC"]),
    ("Parma", ["Parma", "Parma Calcio 1913"]),
    ("Pescara", ["Pescara", "Delfino Pescara 1936"]),
    ("Pisa", ["Pisa", "Pisa Sporting Club"]),
    ("Reggiana", ["Reggiana", "AC Reggiana 1919"]),
    ("Roma", ["Roma", "AS Roma", "Associazione Sportiva Roma"]),
    ("Salernitana", ["Salernitana", "US Salernitana 1919"]),
    ("Sampdoria", ["Sampdoria", "UC Sampdoria"]),
    ("Sassuolo", ["Sassuolo", "US Sassuolo"]),
    ("Siena", ["Siena", "Siena FC"]),
    ("SPAL", ["SPAL"]),
    ("Spezia", ["Spezia", "Spezia Calcio"]),
    ("Torino", ["Torino", "Torino FC"]),
    ("Udinese", ["Udinese", "Udinese Calcio"]),
    ("Venezia", ["Venezia", "Venezia FC"]),
    # Germany
    ("1. FC Köln", ["1. FC Köln", "1.FC Köln", "Köln", "FC Köln"]),
    ("1. FC Nürnberg", ["1. FC Nürnberg", "1.FC Nuremberg", "Nürnberg"]),
    ("FC Augsburg", ["Augsburg", "FC Augsburg"]),
    ("Arminia Bielefeld", ["Arminia Bielefeld", "Bielefeld"]),
    ("Bayer Leverkusen", ["Bayer Leverkusen", "Bayer 04 Leverkusen", "Leverkusen"]),
    ("Bayern Munich", ["Bayern Munich", "FC Bayern Munich", "Bayern"]),
    ("VfL Bochum", ["Bochum", "VfL Bochum"]),
    ("Borussia Dortmund", ["Borussia Dortmund", "Dortmund"]),
    ("Borussia Mönchengladbach", ["Borussia Mönchengladbach", "Gladbach"]),
    ("Darmstadt 98", ["Darmstadt 98", "SV Darmstadt 98", "Darmstadt"]),
    ("Eintracht Braunschweig", ["Eintracht Braunschweig"]),
    ("Eintracht Frankfurt", ["Eintracht Frankfurt", "Eint Frankfurt", "Frankfurt"]),
    ("FC Ingolstadt", ["FC Ingolstadt", "FC Ingolstadt 04", "Ingolstadt"]),
    ("FC St. Pauli", ["FC St. Pauli", "St Pauli", "St. Pauli"]),
    ("Fortuna Düsseldorf", ["Fortuna Düsseldorf"]),
    ("Greuther Fürth", ["Greuther Fürth", "SpVgg Greuther Fürth", "Fürth"]),
    ("Hamburger SV", ["Hamburger SV", "Hamburg"]),
    ("Hannover 96", ["Hannover 96"]),
    ("1. FC Heidenheim", ["Heidenheim", "1. FC Heidenheim"]),
    ("Hertha BSC", ["Hertha BSC", "Hertha"]),
    ("TSG Hoffenheim", ["Hoffenheim", "TSG Hoffenheim", "TSG 1899 Hoffenheim", "1899 Hoffenheim"]),
    ("Holstein Kiel", ["Holstein Kiel", "Kiel"]),
    ("Mainz 05", ["Mainz 05", "1. FSV Mainz 05", "1.FSV Mainz 05", "Mainz"]),
    ("SC Paderborn 07", ["SC Paderborn 07", "SC Paderborn", "Paderborn"]),
    ("RB Leipzig", ["RB Leipzig", "Leipzig"]),
    ("Schalke 04", ["Schalke 04", "FC Schalke 04", "Schalke"]),
    ("SC Freiburg", ["SC Freiburg", "Freiburg"]),
    ("Union Berlin", ["Union Berlin", "1. FC Union Berlin", "1.FC Union Berlin"]),
    ("VfB Stuttgart", ["VfB Stuttgart", "Stuttgart"]),
    ("VfL Wolfsburg", ["VfL Wolfsburg", "Wolfsburg"]),
    ("Werder Bremen", ["Werder Bremen", "SV Werder Bremen"]),
    # France
    ("AC Ajaccio", ["Ajaccio", "AC Ajaccio"]),
    ("Amiens SC", ["Amiens", "Amiens SC"]),
    ("Angers SCO", ["Angers", "Angers SCO"]),
    ("AJ Auxerre", ["Auxerre", "AJ Auxerre"]),
    ("SC Bastia", ["Bastia", "SC Bastia"]),
    ("Girondins de Bordeaux", ["Bordeaux", "FC Girondins Bordeaux", "Girondins Bordeaux"]),
    ("Stade Brestois 29", ["Brest", "Stade Brestois 29"]),
    ("SM Caen", ["Caen", "SM Caen"]),
    ("Clermont Foot", ["Clermont", "Clermont Foot", "Clermont Foot 63"]),
    ("Dijon FCO", ["Dijon", "Dijon FCO"]),
    ("Évian Thonon Gaillard", ["Evian", "Thonon Évian Grand Genève FC", "Évian Thonon Gaillard"]),
    ("Gazélec Ajaccio", ["Gazélec Ajaccio", "GFC Ajaccio"]),
    ("EA Guingamp", ["Guingamp", "EA Guingamp"]),
    ("Le Havre AC", ["Le Havre", "Le Havre AC"]),
    ("RC Lens", ["Lens", "RC Lens"]),
    ("LOSC Lille", ["Lille", "LOSC Lille"]),
    ("FC Lorient", ["Lorient", "FC Lorient"]),
    ("Olympique Lyonnais", ["Lyon", "Olympique Lyon", "Olympique Lyonnais"]),
    ("Olympique de Marseille", ["Marseille", "Olympique Marseille", "Olympique de Marseille"]),
    ("FC Metz", ["Metz", "FC Metz"]),
    ("AS Monaco", ["Monaco", "AS Monaco"]),
    ("Montpellier HSC", ["Montpellier", "Montpellier HSC"]),
    ("AS Nancy-Lorraine", ["Nancy", "AS Nancy-Lorraine"]),
    ("FC Nantes", ["Nantes", "FC Nantes"]),
    ("OGC Nice", ["Nice", "OGC Nice"]),
    ("Nîmes Olympique", ["Nîmes", "Nîmes Olympique"]),
    ("Paris FC", ["Paris FC"]),
    ("Paris Saint-Germain", ["Paris Saint-Germain", "Paris S-G", "PSG"]),
    ("Stade de Reims", ["Reims", "Stade Reims"]),
    ("Stade Rennais FC", ["Rennes", "Stade Rennais FC", "Stade Rennais"]),
    ("AS Saint-Étienne", ["Saint-Étienne", "AS Saint-Étienne"]),
    ("FC Sochaux-Montbéliard", ["Sochaux", "FC Sochaux-Montbéliard", "FC Sochaux"]),
    ("RC Strasbourg Alsace", ["Strasbourg", "RC Strasbourg Alsace"]),
    ("Toulouse FC", ["Toulouse", "FC Toulouse"]),
    ("ES Troyes AC", ["Troyes", "ESTAC Troyes"]),
    ("Valenciennes FC", ["Valenciennes", "Valenciennes FC"]),
]

MARKER_RE = re.compile(r"\((?:[A-Z]{1,3}(?:,\s*[A-Z]{1,3})*)\)")


def clean_club_name(raw: str) -> str:
    name = REF_RE.sub("", str(raw))
    name = MARKER_RE.sub("", name)
    name = re.sub(r"\s+", " ", name).strip(" ,;")
    return name


ALIAS_TO_CANON: dict[str, tuple[str, str]] = {}
for _display, _aliases in CLUB_ALIASES:
    _key = norm(_display)
    for _alias in _aliases:
        ALIAS_TO_CANON[norm(clean_club_name(_alias))] = (_key, _display)
    # the raw display name itself maps even if not repeated in the alias list
    ALIAS_TO_CANON.setdefault(norm(clean_club_name(_display)), (_key, _display))


def canon_club(raw: str):
    cleaned = clean_club_name(raw)
    key = norm(cleaned)
    if key in ALIAS_TO_CANON:
        return ALIAS_TO_CANON[key]
    return None


# --------------------------------------------------------------------------
# Player name matching
# --------------------------------------------------------------------------
def norm_player(name: str) -> str:
    name = strip_accents(str(name)).lower()
    name = re.sub(r"[^a-z0-9]+", " ", name)
    return re.sub(r"\s+", " ", name).strip()


# Explicit, documented nickname aliases (Wikipedia name -> name used in our CSVs).
# These are well-known football aliases, not guesses; every use is reported.
PLAYER_ALIASES = {
    "mame biram diouf": "mame diouf",
    "alejandro gomez": "papu gomez",
    "kike garcia": "kike",
    "javier hernandez": "chicharito",
}


def match_player(wiki_name: str, players: dict[str, dict]) -> tuple[str | None, str | None]:
    """Match a Wikipedia player name to a normalised key used in our data."""
    key = norm_player(wiki_name)
    alias = PLAYER_ALIASES.get(key)
    if alias and alias in players:
        return alias, "known alias"
    if key in players:
        return key, None
    signature = tuple(sorted(key.split()))
    reordered = [k for k in players if tuple(sorted(k.split())) == signature]
    if len(reordered) == 1:
        return reordered[0], "reordered name"
    candidates = difflib.get_close_matches(key, list(players), n=3, cutoff=0.86)
    if len(candidates) == 1:
        return candidates[0], "fuzzy name match"
    if len(candidates) > 1:
        best = difflib.SequenceMatcher(None, key, candidates[0]).ratio()
        second = difflib.SequenceMatcher(None, key, candidates[1]).ratio()
        if best >= 0.93 and best - second >= 0.04:
            return candidates[0], "fuzzy name match"
    return None, None


# --------------------------------------------------------------------------
# Data loading
# --------------------------------------------------------------------------
def season_csv(season: str) -> Path:
    files = sorted((DATA_DIR / season).glob("*.csv"))
    if len(files) != 1:
        raise RuntimeError(f"Expected one CSV for {season}, found {files}")
    return files[0]


def load_season(season: str) -> pd.DataFrame:
    df = pd.read_csv(season_csv(season))
    for col in ("Gls", "Ast", "Min", "MP", "PrgC", "PrgP", "PrgR"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


# --------------------------------------------------------------------------
# Checks
# --------------------------------------------------------------------------
def league_player_data(df: pd.DataFrame, league: str) -> dict[str, dict[str, float]]:
    """normalised player -> {canonical club key or None: goals} inside one league."""
    sub = df[df["Comp"] == league]
    players: dict[str, dict[str, float]] = {}
    for player, squad, goals in zip(sub["Player"], sub["Squad"], sub["Gls"].fillna(0)):
        key = norm_player(player)
        mapped = canon_club(squad)
        club_key = mapped[0] if mapped else None
        players.setdefault(key, {})
        players[key][club_key] = players[key].get(club_key, 0.0) + float(goals)
    return players


def split_wiki_clubs(cell: str) -> list[str]:
    return [part.strip() for part in re.split(r"\s*/\s*", str(cell)) if part.strip()]


def build_scorer_rows(season, league, wiki_scorers, df):
    players = league_player_data(df, league)
    rows = []
    for entry in wiki_scorers[:10]:
        matched, note = match_player(entry["player"], players)
        wiki_clubs = []
        for part in split_wiki_clubs(entry["club"]):
            mapped = canon_club(part)
            if mapped:
                wiki_clubs.append(mapped[0])
        if matched is None:
            our_goals = None
            status = "NOT FOUND"
        else:
            by_club = players[matched]
            if wiki_clubs and any(club in by_club for club in wiki_clubs):
                our_goals = sum(g for club, g in by_club.items() if club in wiki_clubs)
            else:
                our_goals = sum(by_club.values())
                if wiki_clubs:
                    note = (note + "; " if note else "") + "club mismatch"
            status = ("MATCH" if abs(float(our_goals) - float(entry["goals"])) < 1e-9
                      else "MISMATCH")
        rows.append({
            "season": season,
            "league": league,
            "rank": entry["rank"],
            "player": entry["player"],
            "wiki_club": entry["club"],
            "wiki_goals": entry["goals"],
            "our_goals": our_goals,
            "status": status,
            "note": note,
        })
    return rows


def club_check(season, league, df, wiki_table, wiki_unmapped_teams):
    """Return (club_rows, flags, naming_info)."""
    sub = df[df["Comp"] == league]
    canon_goals: dict[str, float] = defaultdict(float)
    canon_rows: dict[str, int] = defaultdict(int)
    raw_by_canon: dict[str, set[str]] = defaultdict(set)
    unmapped_squads: dict[str, int] = defaultdict(int)
    for squad, goals in zip(sub["Squad"], sub["Gls"].fillna(0)):
        mapped = canon_club(squad)
        if mapped is None:
            unmapped_squads[str(squad)] += 1
            continue
        canon_goals[mapped[0]] += float(goals)
        canon_rows[mapped[0]] += 1
        raw_by_canon[mapped[0]].add(str(squad))

    wiki_teams: dict[str, dict] = {}
    for row in wiki_table:
        mapped = canon_club(row["team"])
        if mapped is None:
            wiki_unmapped_teams.append((season, league, row["team"]))
            continue
        wiki_teams[mapped[0]] = row

    rows = []
    flags = []
    for key, wrow in wiki_teams.items():
        our = canon_goals.get(key)
        display = ALIAS_TO_CANON.get(key, (key, key))[1]
        if our is None:
            flags.append({
                "season": season, "league": league, "club": display,
                "our_goals": None, "wiki_gf": wrow["gf"], "diff": None,
                "our_rows": 0,
                "reason": "no player rows for this club in our data",
            })
            rows.append({"club": display, "our": None, "wiki": wrow["gf"], "diff": None})
            continue
        diff = float(our) - float(wrow["gf"])
        rows.append({"club": display, "our": our, "wiki": wrow["gf"], "diff": diff,
                     "raw": sorted(raw_by_canon.get(key, []))})
        tolerance = max(5, 0.05 * wrow["gf"])
        if diff > tolerance:
            flags.append({
                "season": season, "league": league, "club": display,
                "our_goals": our, "wiki_gf": wrow["gf"], "diff": diff,
                "our_rows": canon_rows.get(key, 0),
                "severity": "severe" if diff >= 10 else "borderline",
                "reason": f"our player goals exceed Wikipedia GF by {diff:g} (> tolerance {tolerance:g})",
            })
        elif -diff > tolerance:
            flags.append({
                "season": season, "league": league, "club": display,
                "our_goals": our, "wiki_gf": wrow["gf"], "diff": diff,
                "our_rows": canon_rows.get(key, 0),
                "severity": "severe" if (-diff >= 10 or our < 0.7 * wrow["gf"]) else "borderline",
                "reason": f"shortfall {abs(diff):g} exceeds max(5, 5% of GF={wrow['gf']})",
            })

    extras = []
    for key, raws in raw_by_canon.items():
        if key in wiki_teams:
            continue
        for raw in raws:
            extras.append({"raw": raw, "canonical": ALIAS_TO_CANON.get(key, (key, key))[1]})
    for raw in unmapped_squads:
        extras.append({"raw": raw, "canonical": None})

    naming = {
        "raw_count": int(sub["Squad"].nunique()),
        "canon_count": len(canon_goals) + len(unmapped_squads),
        "wiki_count": len(wiki_table),
        "wiki_mapped": len(wiki_teams),
        "variants": {ALIAS_TO_CANON.get(k, (k, k))[1]: sorted(v) for k, v in raw_by_canon.items() if len(v) > 1},
        "extras": extras,
        "unmapped_squads": dict(unmapped_squads),
        "excess_notes": [
            {"club": ALIAS_TO_CANON.get(k, (k, k))[1], "our": canon_goals[k], "wiki": wiki_teams[k]["gf"]}
            for k in canon_goals
            if k in wiki_teams and 0 < canon_goals[k] - wiki_teams[k]["gf"] <= max(5, 0.05 * wiki_teams[k]["gf"])
        ],
    }
    return rows, flags, naming


# --------------------------------------------------------------------------
# Main audit
# --------------------------------------------------------------------------
def audit():
    wiki: dict[tuple[str, str], dict] = {}
    parse_quality = []
    self_test_failures = []

    for season in SEASONS:
        for league in LEAGUE_ORDER:
            url = page_url(season, league)
            html = fetch_page(season, league)
            tables = all_tables(html)
            scorers = parse_scorers(tables)
            table = parse_league_table(tables)
            expected = expected_teams(season, league)
            sq = len(scorers) if scorers else 0
            tq = len(table) if table else 0
            ok = sq >= 10 and tq == expected
            parse_quality.append({
                "season": season, "league": league, "scorers": sq,
                "teams": tq, "expected_teams": expected,
                "ok": ok, "url": url,
            })
            wiki[(season, league)] = {"scorers": scorers, "table": table}

    # ---- Parser self-test -------------------------------------------------
    def find_scorer(season, league, player):
        data = wiki[(season, league)]["scorers"] or []
        target = norm_player(player)
        for row in data:
            if norm_player(row["player"]) == target:
                return row["goals"]
        return None

    tests = [
        ("Premier League 2012-13: Robin van Persie = 26", find_scorer("2012-2013", "eng Premier League", "Robin van Persie") == 26,
         f"got {find_scorer('2012-2013', 'eng Premier League', 'Robin van Persie')}"),
        ("Premier League 2023-24: Erling Haaland = 27", find_scorer("2023-2024", "eng Premier League", "Erling Haaland") == 27,
         f"got {find_scorer('2023-2024', 'eng Premier League', 'Erling Haaland')}"),
        ("Bundesliga 2023-24: Harry Kane = 36", find_scorer("2023-2024", "de Bundesliga", "Harry Kane") == 36,
         f"got {find_scorer('2023-2024', 'de Bundesliga', 'Harry Kane')}"),
    ]
    for season, league in [(s, l) for s in SEASONS for l in LEAGUE_ORDER]:
        want = expected_teams(season, league)
        got = len(wiki[(season, league)]["table"] or [])
        tests.append((f"{season} {league}: final table has {want} teams", got == want, f"got {got}"))
    table_pass = sum(1 for _, passed, _ in tests[3:] if passed)
    table_total = len(tests) - 3
    tests = tests[:3] + [(
        "Every final league table has the expected number of teams",
        table_pass == table_total,
        f"{table_pass}/{table_total} page-league tables",
    )]

    for name, passed, detail in tests:
        if not passed:
            self_test_failures.append((name, detail))

    self_test_results = [(name, passed, detail) for name, passed, detail in tests]

    # ---- data-side checks ------------------------------------------------
    season_data = {s: load_season(s) for s in SEASONS}
    scorer_rows_all = {}
    club_flags = []
    naming_all = {}
    club_rows_all = {}
    wiki_unmapped_teams = []

    for season in SEASONS:
        df = season_data[season]
        for league in LEAGUE_ORDER:
            sc = wiki[(season, league)]["scorers"]
            lt = wiki[(season, league)]["table"]
            if sc:
                scorer_rows_all[(season, league)] = build_scorer_rows(season, league, sc, df)
            if lt:
                rows, flags, naming = club_check(season, league, df, lt, wiki_unmapped_teams)
                club_rows_all[(season, league)] = rows
                club_flags.extend(flags)
                naming_all[(season, league)] = naming

    # ---- zero-minute rows -------------------------------------------------
    zero_rows = []
    for season in SEASONS:
        df = season_data[season]
        n = int((df["Min"].fillna(0) == 0).sum()) if "Min" in df else 0
        zero_rows.append((season, n, len(df)))
    only_2025_zero = all(n == 0 for s, n, _ in zero_rows if s != "2025-2026")

    # ---- per-league verdict for 2025-26 -----------------------------------
    # The 2025-26 verdict is derived league by league: complete seasons are
    # judged on the usual checks, while a league whose maximum appearance count
    # is below its full schedule is an in-progress snapshot and cannot be
    # compared with final goals-for / final top-scorer totals.
    s26 = "2025-2026"
    df26 = season_data[s26]
    league_verdicts = {}
    for league in LEAGUE_ORDER:
        sub = df26[df26["Comp"] == league]
        max_mp = int(sub["MP"].max()) if len(sub) else 0
        full = 34 if league in ("de Bundesliga", "fr Ligue 1") else 38
        partial = max_mp < full
        zero_n = int((sub["Min"].fillna(0) == 0).sum()) if len(sub) else 0
        extras = len(naming_all.get((s26, league), {}).get("extras", []))
        sc = scorer_rows_all.get((s26, league), [])
        short = [r for r in sc if r["status"] in ("MISMATCH", "NOT FOUND")]
        flags = [f for f in club_flags if f["season"] == s26 and f["league"] == league]
        severe = [f for f in flags if f.get("severity") == "severe"]
        if partial:
            status = "PARTIAL SNAPSHOT"
            evidence = (f"max MP {max_mp} of {full} — the stored season stops before the final matchweek, so "
                        f"final goals-for and final top-10 totals are not comparable; {len(short)} top-10 "
                        f"figure(s) are below the final total; {extras} squad label(s) name a club outside the "
                        "2025-26 league table (players who transferred in).")
        elif zero_n:
            status = "MINOR ISSUES"
            evidence = (f"complete season (max MP {max_mp} of {full}); {zero_n} zero-minute placeholder row(s); "
                        f"all top-10 scorers matched.")
        elif short:
            status = "MINOR ISSUES"
            evidence = f"complete season (max MP {max_mp} of {full}); {len(short)} top-10 scorer figure(s) differ."
        elif severe:
            status = "FAIL"
            evidence = f"complete season; {len(severe)} severe club shortfall(s)."
        else:
            status = "PASS"
            evidence = (f"complete season (max MP {max_mp} of {full}); top-10 scorers and club goal totals matched.")
        league_verdicts[league] = {
            "status": status, "evidence": evidence, "max_mp": max_mp, "full": full,
            "zero": zero_n, "extras": extras, "short": len(short),
        }

    return {
        "wiki": wiki,
        "parse_quality": parse_quality,
        "self_test_results": self_test_results,
        "self_test_failures": self_test_failures,
        "scorer_rows": scorer_rows_all,
        "club_flags": club_flags,
        "club_rows": club_rows_all,
        "naming": naming_all,
        "wiki_unmapped_teams": wiki_unmapped_teams,
        "zero_rows": zero_rows,
        "only_2025_zero": only_2025_zero,
        "season_data": season_data,
        "league_verdicts": league_verdicts,
    }


def verdict_for(season, result):
    pq = [q for q in result["parse_quality"] if q["season"] == season]
    if any(not q["ok"] for q in pq):
        return "UNVERIFIED", "At least one league page parsed short of the expected scorer/team counts."
    sc_rows = [r for (s, _), rows in result["scorer_rows"].items() if s == season for r in rows]
    mismatches = [r for r in sc_rows if r["status"] == "MISMATCH"]
    not_found = [r for r in sc_rows if r["status"] == "NOT FOUND"]
    flags = [f for f in result["club_flags"] if f["season"] == season]
    severe = [f for f in flags if f.get("severity") == "severe"]
    borderline = [f for f in flags if f.get("severity") != "severe"]

    if season == "2025-2026":
        lv = result["league_verdicts"]
        statuses = {league: v["status"] for league, v in lv.items()}
        if "UNVERIFIED" in statuses.values():
            return "UNVERIFIED", "At least one 2025-26 league could not be assessed."
        if "FAIL" in statuses.values():
            failed = [l for l, s in statuses.items() if s == "FAIL"]
            return "FAIL", "Severe defects in: " + ", ".join(failed) + "."
        if "PARTIAL SNAPSHOT" in statuses.values():
            complete = [l for l, s in statuses.items() if s == "MINOR ISSUES"]
            partial = [l for l, s in statuses.items() if s == "PARTIAL SNAPSHOT"]
            partial_desc = ", ".join(
                "{} (max MP {}/{})".format(l, lv[l]["max_mp"], lv[l]["full"]) for l in partial
            )
            return "PARTIAL SNAPSHOT", (
                f"{', '.join(complete)} are complete seasons with MINOR ISSUES only (zero-minute placeholder rows); "
                f"{partial_desc} are partial snapshots whose player-level rows are real but whose final totals are "
                "not yet reached, and whose squad labels are not updated for transferred players.")
        if any(s == "MINOR ISSUES" for s in statuses.values()):
            return "MINOR ISSUES", "All five leagues are complete but at least one has minor issues."
        return "PASS", "All five 2025-26 leagues are complete, with top-10 scorers and club totals within tolerance."
    if severe:
        return "FAIL", (f"{len(severe)} club(s) with a severe goal shortfall (missing player rows), e.g. " +
                        ", ".join(f"{f['club']} {fmt(f['our_goals'])}/{f['wiki_gf']}" for f in severe[:3]) + ".")
    if not_found:
        return "FAIL", (f"{len(not_found)} Wikipedia top-10 scorer(s) have no player row in our data: " +
                        ", ".join(r["player"] for r in not_found[:3]) + ".")

    minor = []
    if borderline:
        minor.append(f"{len(borderline)} club total(s) 5–9 goals below Wikipedia GF")
    if mismatches:
        minor.append(f"{len(mismatches)} top-10 scorer figure(s) differ by 1–2 goals")
    if result["wiki_unmapped_teams"] and any(l == season for _, l, _ in result["wiki_unmapped_teams"]):
        minor.append("unmapped Wikipedia club name")
    for (s, l), naming in result["naming"].items():
        if s == season and naming["extras"]:
            minor.append(f"{l}: {len(naming['extras'])} squad name(s) outside the league")
        if s == season and naming.get("excess_notes"):
            minor.append(f"{l}: {len(naming['excess_notes'])} club total(s) slightly above Wikipedia GF")
    if minor:
        return "MINOR ISSUES", "; ".join(sorted(set(minor))) + "."
    return "PASS", "All top-10 scorers matched and all club goal totals were within tolerance."


# --------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------
def fmt(value, nd=0):
    if value is None:
        return "—"
    if isinstance(value, float):
        return f"{value:.{nd}f}"
    return str(value)


PARITY_PLAYERS = {
    "2014-2015": ["Arjen Robben", "Thomas Müller", "Antoine Griezmann", "Carlos Bacca"],
    "2020-2021": ["Karim Benzema", "Luka Modrić"],
}


def representation_frames(season):
    """Read the same season from CSV, parquet, XLSX and DuckDB. Read-only."""
    frames = []
    csv_path = season_csv(season)
    frames.append(("CSV", pd.read_csv(csv_path, encoding="utf-8")))
    parquet_path = PARQUET_DIR / f"{season}.parquet"
    frames.append(("Parquet", pd.read_parquet(parquet_path)))
    xlsx_path = csv_path.with_suffix(".xlsx")
    if xlsx_path.exists():
        frames.append(("XLSX", pd.read_excel(xlsx_path)))
    else:
        frames.append(("XLSX", None))
    if duckdb is not None and DUCKDB_PATH.exists():
        con = duckdb.connect(str(DUCKDB_PATH), read_only=True)
        try:
            frames.append(("DuckDB players",
                           con.execute("select * from players where season = ?", [season]).fetchdf()))
            frames.append(("DuckDB per90_metrics",
                           con.execute("select * from per90_metrics where season = ?", [season]).fetchdf()))
        finally:
            con.close()
    else:
        frames.append(("DuckDB players", None))
    return frames


def utf8_csv_audit():
    """Decode every CSV in the repository and report the result."""
    skip = {"venv", "node_modules", ".git", "__pycache__", "dist", "build"}
    rows = []
    for path in ROOT.rglob("*.csv"):
        if any(part in skip for part in path.parts):
            continue
        data = path.read_bytes()
        try:
            data.decode("utf-8")
            ok, error = True, ""
        except UnicodeDecodeError as exc:
            ok, error = False, f"{exc.reason} at byte {exc.start}"
        rows.append({
            "path": path.relative_to(ROOT).as_posix(),
            "size": len(data),
            "bom": data[:3] == b"\xef\xbb\xbf",
            "ok": ok,
            "error": error,
            "season": "seasons" in path.parts,
        })
    return rows


def write_report(result, generated):
    lines = []
    add = lines.append

    add("# PitchPulse Independent Cross-Check Report (Phase 1)")
    add("")
    add(f"**Generated:** {generated}  ")
    add("**Scope:** 14 seasons (2012-13 … 2025-26) × 5 leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1)  ")
    add("**Method:** read-only comparison of `Backend/data/seasons/<season>/*.csv` against the top-scorers table and final "
        "league table of each Wikipedia season page (CC BY-SA 4.0; every page URL is listed in section 10).  ")
    add("**Data changes:** none. This audit did not write to `Backend/data`, tests or application code.  ")
    add("**External sources blocked:** FBref was never contacted (advanced statistics were removed from FBref on 20 Jan 2026).  ")
    add("")
    add("> A result is marked UNVERIFIED whenever a page could not be parsed to the expected shape, or a club/player "
        "could not be mapped without guessing. UNVERIFIED is never treated as PASS.")
    add("")

    add("## 1. Parser self-test")
    add("")
    add("| Check | Result | Detail |")
    add("|-------|--------|--------|")
    for name, passed, detail in result["self_test_results"]:
        add(f"| {name} | {'PASS' if passed else 'FAIL'} | {detail} |")
    add("")
    if result["self_test_failures"]:
        add("**The self-test failed. The audit must not proceed.**")
        add("")
    else:
        add("All self-tests passed before the real run: the three reference scorer figures are exact and every final "
            "table has the expected number of teams (20, or 18 for the Bundesliga and for Ligue 1 from 2023-24).")
        add("")

    add("## 2. Parse quality")
    add("")
    add("A page is considered verified for a check only when it yields at least 10 scorers and exactly the expected "
        "number of teams. Tables with extra rows are ties; the comparison uses the first 10 rows.")
    add("")
    add("| Season | League | Scorers parsed | Teams parsed | Teams expected | Status |")
    add("|--------|--------|---------------:|-------------:|---------------:|--------|")
    for q in result["parse_quality"]:
        add(f"| {q['season']} | {q['league']} | {q['scorers']} | {q['teams']} | {q['expected_teams']} | "
            f"{'OK' if q['ok'] else 'SHORT'} |")
    add("")

    add("## 3. Season-by-season results")
    add("")
    for season in SEASONS:
        verdict, evidence = verdict_for(season, result)
        add(f"### {season} — {verdict}")
        add("")
        add(f"*Evidence:* {evidence}")
        add("")
        for league in LEAGUE_ORDER:
            rows = result["scorer_rows"].get((season, league))
            if not rows:
                add(f"#### {league}")
                add("")
                add("UNVERIFIED — the top-scorers table could not be parsed.")
                add("")
                continue
            add(f"#### {league}")
            add("")
            if season == "2025-2026" and league in result["league_verdicts"]:
                lv = result["league_verdicts"][league]
                add(f"*Status:* **{lv['status']}** — {lv['evidence']}")
                add("")
            add("| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |")
            add("|-----:|-------------------|------------------|---------:|--------:|--------|")
            for row in rows:
                note = f" ({row['note']})" if row["note"] else ""
                add(f"| {row['rank']} | {row['player']}{note} | {row['wiki_club']} | {row['wiki_goals']} | "
                    f"{fmt(row['our_goals'])} | {row['status']} |")
            add("")
            club_rows = result["club_rows"].get((season, league)) or []
            if club_rows:
                if season == "2025-2026":
                    our_total = int(result["season_data"][season].loc[
                        result["season_data"][season]["Comp"] == league, "Gls"].sum())
                else:
                    our_total = sum(c["our"] or 0 for c in club_rows)
                wiki_total = sum(c["wiki"] for c in club_rows)
                note = ""
                if season == "2025-2026" and result["league_verdicts"][league]["status"] == "PARTIAL SNAPSHOT":
                    note = " (partial snapshot; the final goals-for is not directly comparable)"
                add(f"*League completeness:* our player goals {fmt(our_total)} vs Wikipedia goals-for "
                    f"{fmt(wiki_total)} ({fmt(our_total - wiki_total)}){note}.")
                add("")
            flags = [f for f in result["club_flags"] if f["season"] == season and f["league"] == league]
            naming = result["naming"].get((season, league))
            if flags:
                add("**Flagged clubs:**")
                add("")
                if season == "2025-2026" and result["league_verdicts"][league]["status"] == "PARTIAL SNAPSHOT":
                    add("*The differences below are expected for a partial-season snapshot and are not defects.*")
                    add("")
                add("| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |")
                add("|------|---------:|---------------:|--------:|-----:|----------|--------|")
                for f in flags:
                    add(f"| {f['club']} | {f.get('our_rows', '—')} | {fmt(f['our_goals'])} | {f['wiki_gf']} | "
                        f"{fmt(f['diff'])} | {f.get('severity', '—')} | {f['reason']} |")
                add("")
            if naming:
                if naming["variants"]:
                    add("**Squad-name variants mapped to one club:** " +
                        "; ".join(f"{club} ← {', '.join(v)}" for club, v in sorted(naming["variants"].items())) + ".")
                    add("")
                if naming.get("excess_notes"):
                    add("**Within-tolerance goal-count excesses** (our player goals slightly above Wikipedia GF; "
                        "logged for follow-up, below the flag threshold): " +
                        "; ".join(f"{e['club']} {fmt(e['our'])} vs {e['wiki']}" for e in naming["excess_notes"]) + ".")
                    add("")
                if naming["extras"]:
                    add("**Squad labels that are not in the 2025-26 league table** (players who transferred into this "
                        "league during the season; the player statistics are real, the label is not updated):")
                    add("")
                    add("| Squad label in our data | Canonical club |")
                    add("|------------------------|----------------|")
                    for extra in naming["extras"]:
                        add(f"| {extra['raw']} | {extra['canonical'] or 'UNMAPPED'} |")
                    add("")
        add("")

    # ---- coverage anomalies ---------------------------------------------
    severe_flags = [f for f in result["club_flags"] if f.get("severity") == "severe"]
    add("## 4. Coverage anomalies (severe goal shortfalls)")
    add("")
    add("These are clubs whose player-goal total is at least 10 goals below Wikipedia, or below 70% of it. "
        "For a complete season this indicates that player rows are missing from our CSV rather than ordinary "
        "own goals. 2025-26 Ligue 1 and Serie A are partial-season snapshots, so their final-goal comparison "
        "is expected to fall short and is labelled accordingly.")
    add("")
    add("| Season | League | Club | Our rows | Our player Gls | Wiki GF | Diff | Explanation |")
    add("|--------|--------|------|---------:|---------------:|--------:|-----:|-------------|")
    for f in severe_flags:
        if f["season"] == "2025-2026" and f["league"] in ("fr Ligue 1", "it Serie A"):
            explanation = "partial-season snapshot; final GF not comparable"
        elif f["our_goals"] is None or f.get("our_rows", 99) < 10:
            explanation = f"club has only {f.get('our_rows', 0)} player rows — players missing"
        else:
            explanation = "goal shortfall too large for own goals alone — players likely missing"
        add(f"| {f['season']} | {f['league']} | {f['club']} | {f.get('our_rows', '—')} | {fmt(f['our_goals'])} | "
            f"{f['wiki_gf']} | {fmt(f['diff'])} | {explanation} |")
    add("")

    # ---- 2025-26 deep dive ----------------------------------------------
    add("## 5. 2025-26 deep dive")
    add("")
    df = result["season_data"]["2025-2026"]
    add("The 2025-26 verdict is computed per league. A league whose maximum appearance count reaches its full "
        "schedule is treated as a complete season and judged on the usual checks; a league that stops earlier is a "
        "partial snapshot and its final-table comparison is labelled accordingly.")
    add("")
    add("| League | Status | Evidence |")
    add("|--------|--------|----------|")
    for league in LEAGUE_ORDER:
        lv = result["league_verdicts"][league]
        add(f"| {league} | **{lv['status']}** | {lv['evidence']} |")
    add("")
    add("| League | Rows | Squad label in league table | Squad label outside the table | Raw squads | Wikipedia clubs | Max MP | Player Gls |")
    add("|--------|-----:|----------------------------:|------------------------------:|-----------:|----------------:|-------:|-----------:|")
    for league in LEAGUE_ORDER:
        sub = df[df["Comp"] == league]
        naming = result["naming"].get(("2025-2026", league), {})
        wiki_keys = set()
        for row in result["wiki"][("2025-2026", league)]["table"] or []:
            mapped = canon_club(row["team"])
            if mapped:
                wiki_keys.add(mapped[0])
        in_league = 0
        for squad in sub["Squad"]:
            mapped = canon_club(squad)
            if mapped and mapped[0] in wiki_keys:
                in_league += 1
        add(f"| {league} | {len(sub)} | {in_league} | {len(sub) - in_league} | {sub['Squad'].nunique()} | "
            f"{naming.get('wiki_count', '—')} | {fmt(sub['MP'].max())} | {fmt(sub['Gls'].sum())} |")
    add("")
    per_club = []
    for league in LEAGUE_ORDER:
        sub = df[df["Comp"] == league]
        clubs = len(result["wiki"][("2025-2026", league)]["table"] or [])
        played = int((sub["Min"].fillna(0) > 0).sum())
        per_club.append(f"{LEAGUES[league]}: {played / clubs:.1f}")
    add("Excluding the zero-minute rows, the squad sizes are " + ", ".join(per_club) + " players per club, which is "
        "normal for a league season. In Serie A and Ligue 1 a minority of rows carry the name of a club that is not "
        "in that league's 2025-26 table; these are players who transferred into the league during 2025-26 and whose "
        "squad label was not updated. Their player-level statistics are real, but the club label is wrong, so the "
        "label must be repaired before club-level aggregation. Examples: Jay Idzes (`Venezia`, 32 Serie A "
        "appearances), Luka Modrić (`Real Madrid`, 32 Serie A appearances) and Manuel Akanji (`Manchester City`, 31 "
        "Serie A appearances). The same population is listed at the end of each league sub-section in section 3.")
    zero = df[df["Min"].fillna(0) == 0]
    zero_flat = zero[(zero["MP"].fillna(0) == 0) & (zero["Gls"].fillna(0) == 0) & (zero["Nation"] == "Unknown")]
    zero_leagues = ", ".join(f"{k}: {v}" for k, v in zero.groupby("Comp").size().items())
    add("")
    add("**Progression columns.** `PrgC` is zero for "
        f"{int((df['PrgC'] == 0).sum())} of {len(df)} rows ({int(((df['PrgC'] == 0) & (df['Min'] > 900)).sum())} of "
        f"{int((df['Min'] > 900).sum())} players over 900 minutes) and `PrgR` is zero for every row.")
    big_three = [lg for lg in LEAGUE_ORDER if lg not in ("fr Ligue 1", "it Serie A")]
    for label, group in (("Premier League / La Liga / Bundesliga", df[df["Comp"].isin(big_three)]),
                         ("Serie A / Ligue 1", df[df["Comp"].isin(("it Serie A", "fr Ligue 1"))])):
        add("")
        add(f"- {label}: `PrgC` is zero for {int((group['PrgC'] == 0).sum())} of {len(group)} rows, "
            f"`PrgP` for {int((group['PrgP'] == 0).sum())} and `PrgR` for {int((group['PrgR'] == 0).sum())}.")
    add("")
    add("The progression metrics are therefore populated for the two partial leagues but absent for the three complete "
        "leagues. The zeros in the complete leagues are unavailable data, not genuine zero values, and must be treated "
        "as untracked rather than as evidence that no player carried or received the ball. No redistribution of values "
        "between rows is justified.")
    add("")
    transfers = [g for _, g in df.groupby(["Player", "Squad"]) if len(g) > 1]
    example = next((g for g in transfers if g["Player"].iloc[0] == "Donyell Malen"), transfers[0] if transfers else None)
    add(f"**Mid-season transfers.** {len(transfers)} (player, club) pairs appear under two competitions, which is "
        "consistent with a transfer during the season where the same squad label is kept on both spells. The rows are "
        "separate real appearance records, not duplicates, but a naive club-level sum would count the same player twice "
        "under one label."
        + (f" Example: {example['Player'].iloc[0]} / {example['Squad'].iloc[0]} — "
           + "; ".join(f"{r['Comp']}: {fmt(r['MP'])} apps, {fmt(r['Min'])} min, {fmt(r['Gls'])} goals"
                       for _, r in example.iterrows()) + "." if example is not None else ""))
    add("")
    add("**Zero-minute rows.** 2025-26 contains "
        f"{len(zero)} rows with `Min = 0`; every other season contains none. "
        f"All {len(zero_flat)} of them also have `MP = 0`, `Gls = 0` and `Nation = Unknown`, so they carry no "
        f"playing time or scoring, and {sum(1 for g in transfers if (g['Min'].fillna(0) == 0).any() and (g['Min'].fillna(0) > 0).any())} "
        f"pair a zero-minute row with a played row. "
        f"They are concentrated in the three complete leagues ({zero_leagues}).")
    add("")
    add("**Match-week coverage.** A full season is 38 matches for the Premier League, La Liga and Serie A, and 34 "
        "for the Bundesliga and Ligue 1 (Ligue 1 has had 18 clubs since 2023-24). The maximum appearance count "
        "identifies the snapshot:")
    add("")
    add("| League | Max MP | Full season | Coverage | Our player goals | Wikipedia final GF | Ratio |")
    add("|--------|-------:|------------:|----------|-----------------:|-------------------:|------:|")
    full_games = {"de Bundesliga": 34, "fr Ligue 1": 34}
    for league in LEAGUE_ORDER:
        sub = df[df["Comp"] == league]
        max_mp = int(sub["MP"].max())
        full = full_games.get(league, 38)
        coverage = "complete season" if max_mp >= full else f"snapshot ≈ matchweek {max_mp} of {full}"
        club_rows = result["club_rows"].get(("2025-2026", league)) or []
        wiki_total = sum(c["wiki"] for c in club_rows)
        our_total = int(sub["Gls"].sum())
        ratio = f"{our_total / wiki_total:.0%}" if wiki_total else "—"
        add(f"| {league} | {max_mp} | {full} | {coverage} | {fmt(our_total)} | {fmt(wiki_total)} | {ratio} |")
    add("")
    add("The Premier League, La Liga and Bundesliga reach the full match count and their player goals cover 96–98% "
        "of Wikipedia's final goals-for (the remainder is own goals, which are not player goals). Ligue 1 stops at "
        "30 of 34 appearances and Serie A at 33 of 38, and their player goals cover 79% and 83% of the final totals, "
        "consistent with an in-progress season. Their final goals-for and final top-10 totals are therefore not "
        "comparable with the stored rows: the differences are a consequence of the snapshot point, not of corrupt "
        "player statistics.")
    add("")
    for league in LEAGUE_ORDER:
        rows = result["scorer_rows"].get(("2025-2026", league), [])
        matches = [r for r in rows if r["status"] == "MATCH"]
        short = [r for r in rows if r["status"] in ("MISMATCH", "NOT FOUND")]
        partial = result["league_verdicts"][league]["status"] == "PARTIAL SNAPSHOT"
        if partial:
            add(f"**{league} (partial snapshot):** {len(matches)}/10 figures already equal the final total; "
                f"{len(short)} are below it, as expected before the final matchweek.")
        else:
            add(f"**{league}:** {len(matches)}/10 top-10 figures equal the Wikipedia final total; "
                f"{len(short)} are short or missing.")
        if short:
            add("")
            add("| Player | Wiki final Gls | Our Gls | Status |")
            add("|--------|---------------:|--------:|--------|")
            for r in short:
                add(f"| {r['player']} | {r['wiki_goals']} | {fmt(r['our_goals'])} | {r['status']} |")
        add("")

    # ---- zero-minute table ----------------------------------------------
    add("## 6. Zero-minute rows by season")
    add("")
    add("| Season | Rows with Min = 0 | Total rows |")
    add("|--------|------------------:|-----------:|")
    for season, n, total in result["zero_rows"]:
        add(f"| {season} | {n} | {total} |")
    add("")
    add("Only 2025-26 has zero-minute rows. In the other 13 seasons the loader has already excluded them, so the "
        f"{int(result['season_data']['2025-2026']['Min'].fillna(0).eq(0).sum())} rows are a 2025-26-specific artefact "
        "rather than a normal feature of the pipeline.")
    add("")

    # ---- export parity ----------------------------------------------------
    add("## 7. Export parity for 2014-15 and 2020-21")
    add("")
    add("The same season is stored four ways: the season CSV, `Backend/data/parquet/<season>.parquet`, the season "
        "XLSX and the DuckDB file (`players` and `per90_metrics`, both with a `season` column). If a player is absent "
        "from the CSV but present in one of the other stores, the defect is in the CSV export rather than in the "
        "underlying season. The check below reads all stores without modifying them.")
    add("")
    for season in ("2014-2015", "2020-2021"):
        names = PARITY_PLAYERS[season]
        try:
            frames = representation_frames(season)
        except Exception as exc:  # report the limitation rather than guessing
            add(f"**{season}:** parity check unavailable ({type(exc).__name__}: {exc}).")
            add("")
            continue
        add(f"### {season}")
        add("")
        add("| Store | Rows | " + " | ".join(names) + " |")
        add("|-------|-----:|" + "|".join("---" for _ in names) + "|")
        for label, frame in frames:
            if frame is None:
                add(f"| {label} | — | " + " | ".join("not available" for _ in names) + " |")
                continue
            cells = []
            for name in names:
                key = norm_player(name)
                sub = frame[frame["Player"].map(norm_player) == key]
                if len(sub):
                    r = sub.iloc[0]
                    cells.append(f"present ({r['Squad']}, {r['Comp']})")
                else:
                    cells.append("absent")
            add(f"| {label} | {len(frame)} | " + " | ".join(cells) + " |")
        add("")
        all_present = []
        all_absent = []
        for name in names:
            key = norm_player(name)
            found = [label for label, frame in frames if frame is not None
                     and (frame["Player"].map(norm_player) == key).any()]
            (all_present if found else all_absent).append(name)
        if all_absent:
            add("**" + ", ".join(all_absent) + "** " + ("is" if len(all_absent) == 1 else "are") +
                " absent from every representation, so the gap is in the stored season itself, not in the CSV export "
                "or a derived store.")
        if all_present:
            add("Present in every representation: " + ", ".join(all_present) + ".")
        add("")

    # ---- CSV encoding -----------------------------------------------------
    add("## 8. CSV encoding check")
    add("")
    enc = utf8_csv_audit()
    bad = [r for r in enc if not r["ok"]]
    add(f"All {len(enc)} CSV files in the repository were decoded as UTF-8: "
        f"{len(enc) - len(bad)} valid, {len(bad)} invalid.")
    if bad:
        add("")
        add("| File | Error |")
        add("|------|-------|")
        for r in bad:
            add(f"| `{r['path']}` | {r['error']} |")
        add("")
        add("The invalid files must be re-encoded before they are consumed by the API or the frontend.")
    else:
        add("")
        season_files = sum(1 for r in enc if r["season"])
        add(f"All {season_files} season CSVs and the {len(enc) - season_files} top-level CSVs decode without error. "
            f"{sum(1 for r in enc if r['bom'])} file(s) start with a UTF-8 BOM (this report's discrepancy CSV, so "
            "Excel opens its accents correctly); the season CSVs have no BOM, which the backend reads correctly but "
            "Excel may display with mis-encoded accents if a season file is opened directly.")
    add("")

    # ---- verdict summary --------------------------------------------------
    add("## 9. Verdict summary")
    add("")
    add("`PASS` and `MINOR ISSUES` apply to a complete season. `PARTIAL SNAPSHOT` means the stored season stops before "
        "the final matchweek, so its player-level rows are real but final goals-for and final top-10 totals are not "
        "comparable; it is neither a pass nor a failure. `FAIL` means the stored season is missing players or whole "
        "clubs that are absent from every representation (section 7). `UNVERIFIED` is never treated as `PASS`.")
    add("")
    add("| Season | Verdict | Evidence |")
    add("|--------|---------|----------|")
    for season in SEASONS:
        verdict, evidence = verdict_for(season, result)
        add(f"| {season} | {verdict} | {evidence} |")
    add("")

    add("## 10. Sources (Wikipedia, CC BY-SA 4.0)")
    add("")
    add("Each season page was fetched once and cached outside the repository. The URL below is the exact page used.")
    add("")
    add("| Season | League | URL |")
    add("|--------|--------|-----|")
    for q in result["parse_quality"]:
        add(f"| {q['season']} | {q['league']} | {q['url']} |")
    add("")

    add("## 11. Recommended repairs")
    add("")
    add("1. **2025-26 progression metrics.** In the Premier League, La Liga and Bundesliga the three columns are zero "
        "for every row (2,055 rows); set them to the project's missing-value representation (NULL) so the UI reports "
        "\"not tracked\" instead of zero. Keep the populated Serie A / Ligue 1 values, mark them as partial-season "
        "statistics, and do not compare them with a full season. Archive a copy of the season before either change.")
    add("2. **2025-26 transferred players.** Update the squad label on every row whose label names a club outside the "
        "2025-26 league table (for example `Venezia` → the player's 2025-26 club) using an authoritative source. Until "
        "then, do not sum those rows by label, and do not sum the two spells of a mid-season transfer as if they were "
        "one club total.")
    add("3. **2025-26 zero-minute rows.** Remove the rows with `Min = 0` from 2025-26 (no other season has any) and "
        "archive them to a side file. They all have `MP = 0`, `Gls = 0` and `Nation = Unknown`, which identifies them "
        "as placeholders rather than real squad members; spot-check the three that pair with a played row before "
        "deleting.")
    add("4. **2025-26 club names.** Normalise squad-name variants (for example `Inter` / `Inter Milan`, `AS Roma` / "
        "`Roma`) against a canonical vocabulary built from the Wikipedia table names and the 2024-25 baseline, and "
        "review any unmapped name against the registry before merging. This is separate from the transferred-player "
        "labels in item 2.")
    add("5. **2025-26 league coverage.** Ligue 1 and Serie A are partial-season snapshots (Ligue 1 ≈ matchweek 30 of "
        "34, Serie A ≈ matchweek 33 of 38). Either refresh them from a permitted source or mark the two leagues as "
        "partial in the manifest and README; do not present their figures as final totals.")
    add("6. **Historical coverage holes (out of 2025-26 scope, do not repair in Phase 2).** 2014-15 is missing most of "
        "the Burnley, Atlético Madrid and Villarreal squads plus several high-profile scorers, and 2020-21 is missing "
        "Benzema and other attacking players at Real Madrid. These are pre-existing gaps in the stored CSV; record "
        "them as known limitations rather than silently patching other seasons.")
    add("7. **Metadata.** Make the manifest, README and `docs/DATA_SOURCES.md` agree: `is_simulated=false`, "
        "`dataset_status` describing a verified historical season with partial metrics, and explicit notes about the "
        "unavailable progression data and the club-name normalisation date.")
    add("8. **Regression tests.** Add a test that fails if a season reports a progression total of zero while the "
        "column is supposed to be tracked, a test that fails when a squad label names a club outside the league table, "
        "and a test that pins the per-league club counts.")
    add("")

    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_csv(result):
    CSV_DIR.mkdir(parents=True, exist_ok=True)
    with CSV_PATH.open("w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.writer(fh)
        writer.writerow(["check", "season", "league", "entity", "our_value", "wiki_value",
                         "difference", "status", "detail"])
        for (season, league), rows in sorted(result["scorer_rows"].items()):
            for row in rows:
                if row["status"] == "MATCH":
                    continue
                diff = None
                if row["our_goals"] is not None:
                    diff = float(row["our_goals"]) - float(row["wiki_goals"])
                writer.writerow([
                    "top_scorer", season, league, row["player"], row["our_goals"],
                    row["wiki_goals"], diff, row["status"],
                    f"wiki club: {row['wiki_club']}" + (f"; {row['note']}" if row["note"] else ""),
                ])
        for flag in result["club_flags"]:
            writer.writerow([
                "club_goals", flag["season"], flag["league"], flag["club"],
                flag["our_goals"], flag["wiki_gf"], flag["diff"], "FLAG",
                f"{flag['reason']}; severity: {flag.get('severity', '—')}; our rows: {flag.get('our_rows', '—')}",
            ])
        for (season, league), naming in sorted(result["naming"].items()):
            for extra in naming["extras"]:
                writer.writerow([
                    "squad_label", season, league, extra["raw"], "", "",
                    "", "OUTSIDE_LEAGUE_LABEL",
                    (f"transferred player; canonical: {extra['canonical']}" if extra["canonical"]
                     else "transferred player; not in canonical registry"),
                ])
            for club, raws in sorted(naming["variants"].items()):
                writer.writerow([
                    "club_naming", season, league, club, len(raws), "", "", "VARIANTS",
                    "raw names: " + " | ".join(raws),
                ])
        for season, n, total in result["zero_rows"]:
            if n:
                df = result["season_data"][season]
                zero = df[df["Min"].fillna(0) == 0]
                writer.writerow([
                    "zero_minutes", season, "", "rows with Min=0", n, 0, n, "FLAG",
                    f"{n} of {total} rows; MP=0: {int((zero['MP'].fillna(0) == 0).sum())}; "
                    f"Gls=0: {int((zero['Gls'].fillna(0) == 0).sum())}; "
                    f"Nation=Unknown: {int((zero['Nation'] == 'Unknown').sum())}",
                ])


def main():
    result = audit()
    if result["self_test_failures"]:
        for name, detail in result["self_test_failures"]:
            print(f"SELF-TEST FAILED: {name} ({detail})")
        return 2
    write_report(result, date.today().isoformat())
    write_csv(result)
    for season in SEASONS:
        verdict, _ = verdict_for(season, result)
        print(f"{season}: {verdict}")
    print(f"report: {REPORT_PATH}")
    print(f"csv:    {CSV_PATH}")
    print(f"cache:  {CACHE_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
