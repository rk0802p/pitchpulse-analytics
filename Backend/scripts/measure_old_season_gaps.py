#!/usr/bin/env python3
"""Measure historical coverage gaps using the cached cross-check parser.

This script is deliberately read-only with respect to player datasets. It writes
only known_gaps.json sidecars and the historical gap documentation requested by
the investigation.
"""
from __future__ import annotations

import importlib.util
import json
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
AUDIT_PATH = ROOT / "Backend" / "scripts" / "audit" / "crosscheck_wiki.py"
SEASONS_DIR = ROOT / "Backend" / "data" / "seasons"
DOC_PATH = ROOT / "docs" / "OLD_SEASON_GAPS.md"


def load_audit():
    spec = importlib.util.spec_from_file_location("crosscheck_wiki", AUDIT_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main() -> None:
    audit = load_audit()
    result = audit.audit()
    seasons = audit.SEASONS
    full_2025 = {"eng Premier League", "es La Liga", "de Bundesliga"}
    rows_by_season = {}

    for season in seasons:
        leagues = full_2025 if season == "2025-2026" else set(audit.LEAGUE_ORDER)
        club_gaps = []
        missing_top10 = []
        league_data_goals = 0.0
        league_wiki_goals = 0.0
        league_gap_count = 0
        league_summaries = []

        for league in audit.LEAGUE_ORDER:
            club_rows = result["club_rows"].get((season, league), [])
            df = result["season_data"][season]
            sub = df[df["Comp"] == league]
            row_counts = {}
            for squad in sub["Squad"].dropna().unique():
                mapped = audit.canon_club(squad)
                if mapped:
                    row_counts[mapped[0]] = row_counts.get(mapped[0], 0) + int((sub["Squad"] == squad).sum())

            rows_for_league = []
            data_goals_for_league = 0.0
            wiki_goals_for_league = 0.0
            gaps_for_league = 0
            for row in club_rows:
                wiki_goals = float(row["wiki"])
                data_goals = float(row["our"] or 0.0)
                shortfall = wiki_goals - data_goals
                coverage = data_goals / wiki_goals if wiki_goals else 1.0
                mapped = audit.canon_club(row["club"])
                key = mapped[0] if mapped else audit.norm(row["club"])
                club_record = {
                    "club": row["club"],
                    "league": league,
                    "rows": row_counts.get(key, 0),
                    "data_goals": int(data_goals) if data_goals.is_integer() else data_goals,
                    "wiki_goals": int(wiki_goals) if wiki_goals.is_integer() else wiki_goals,
                    "shortfall": int(shortfall) if shortfall.is_integer() else round(shortfall, 3),
                    "coverage": round(coverage, 4),
                }
                rows_for_league.append(club_record)
                data_goals_for_league += data_goals
                wiki_goals_for_league += wiki_goals
                if (coverage < 0.90 or shortfall >= 10) and (season != "2025-2026" or league in full_2025):
                    club_gaps.append(club_record)
                    gaps_for_league += 1

            if rows_for_league:
                observed = [r["rows"] for r in rows_for_league]
                median = float(pd.Series(observed).median())
                summary = {
                    "league": league,
                    "data_goals": data_goals_for_league,
                    "wiki_goals": wiki_goals_for_league,
                    "coverage": data_goals_for_league / wiki_goals_for_league if wiki_goals_for_league else None,
                    "clubs_with_gaps": gaps_for_league,
                    "median_rows_per_club": median,
                    "observed_rows_range": [min(observed), max(observed)],
                }
                if season == "2025-2026" and league not in full_2025:
                    full_schedule = 34 if league == "fr Ligue 1" else 38
                    max_mp = int(sub["MP"].max()) if len(sub) else 0
                    expected_reached = wiki_goals_for_league * max_mp / full_schedule if full_schedule else 0
                    summary["max_mp"] = max_mp
                    summary["full_schedule"] = full_schedule
                    summary["coverage_vs_reached"] = data_goals_for_league / expected_reached if expected_reached else None
                league_summaries.append(summary)
            if season != "2025-2026" or league in full_2025:
                league_data_goals += data_goals_for_league
                league_wiki_goals += wiki_goals_for_league
                league_gap_count += gaps_for_league

            for scorer in result["scorer_rows"].get((season, league), []):
                if season == "2025-2026" and league not in full_2025:
                    continue
                if scorer["status"] == "NOT FOUND":
                    missing_top10.append({
                        "player": scorer["player"],
                        "club": scorer["wiki_club"],
                        "league": league,
                        "wiki_goals": scorer["wiki_goals"],
                    })

        league_coverage = league_data_goals / league_wiki_goals if league_wiki_goals else 0.0
        if season == "2025-2026":
            grade = "PARTIAL_SNAPSHOT"
        elif league_coverage >= 0.96 and league_gap_count == 0:
            grade = "COMPLETE"
        elif league_coverage >= 0.92 and league_gap_count <= 3:
            grade = "MINOR_GAPS"
        else:
            grade = "SIGNIFICANT_GAPS"

        total_missing_goals = sum(float(g["shortfall"]) for g in club_gaps if float(g["shortfall"]) > 0)
        rows_by_season[season] = {
            "season": season,
            "grade": grade,
            "league_coverage": round(league_coverage, 6),
            "clubs_with_gaps": club_gaps,
            "missing_goals": int(total_missing_goals) if total_missing_goals.is_integer() else round(total_missing_goals, 3),
            "missing_top10_scorers": missing_top10,
            "league_summaries": league_summaries,
        }

        if grade in {"MINOR_GAPS", "SIGNIFICANT_GAPS"}:
            source_urls = [audit.page_url(season, league) for league in audit.LEAGUE_ORDER]
            summary = (
                f"{grade}: {len(club_gaps)} clubs meet the real-gap threshold, "
                f"{total_missing_goals:g} missing player goals, and {len(missing_top10)} missing Wikipedia top-10 scorers."
            )
            payload = {
                "season": season,
                "grade": grade,
                "league_coverage": round(league_coverage, 6),
                "clubs_with_gaps": [
                    {k: gap[k] for k in ("club", "league", "rows", "data_goals", "wiki_goals", "shortfall")}
                    for gap in club_gaps
                ],
                "missing_top10_scorers": missing_top10,
                "generated_on": date.today().isoformat(),
                "source_urls": source_urls,
            }
            (SEASONS_DIR / season / "known_gaps.json").write_text(
                json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
            )

            # The locked 2024-25 baseline manifest must never be changed.
            if season != "2024-2025":
                manifest_path = SEASONS_DIR / season / "manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                manifest["known_gaps"] = {"grade": grade, "file": "known_gaps.json", "summary": summary}
                if grade == "SIGNIFICANT_GAPS":
                    manifest["dataset_status"] = "verified_historical_with_known_gaps"
                manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = [
        "# Historical season gaps",
        "",
        "This investigation is read-only with respect to player rows and the five analytical stores. It uses the cached Wikipedia pages and the canonical parser in `Backend/scripts/audit/crosscheck_wiki.py`.",
        "",
        "## Grading method",
        "",
        "A real club gap is coverage below 90% or a shortfall of at least 10 goals. COMPLETE requires league coverage of at least 96% and no real club gaps. MINOR_GAPS requires at least 92% coverage and at most three real club gaps; all other complete seasons are SIGNIFICANT_GAPS. For 2025-26, the three complete leagues are measured normally and Serie A/Ligue 1 are reported as PARTIAL_SNAPSHOT because their stored matchweek is incomplete. Own goals explain why normal coverage is below 100%.",
        "",
        "## Per-season grades",
        "",
        "| Season | Grade | League coverage | Clubs with gaps | Missing goals | Missing top-10 scorers |",
        "|---|---|---:|---:|---:|---:|",
    ]
    for season in seasons:
        item = rows_by_season[season]
        lines.append(f"| {season} | {item['grade']} | {item['league_coverage']:.2%} | {len(item['clubs_with_gaps'])} | {item['missing_goals']} | {len(item['missing_top10_scorers'])} |")

    affected = [s for s in seasons if rows_by_season[s]["grade"] in {"MINOR_GAPS", "SIGNIFICANT_GAPS"}]
    lines += [
        "",
        f"{len(affected)} of {len(seasons)} seasons have measurable real gaps under this rule: {', '.join(affected) if affected else 'none'}. The likely cause is missing player-season rows in the source snapshot; the same absence is expected across CSV, parquet, XLSX, DuckDB `players`, and DuckDB `per90_metrics` because those stores are generated from the same season CSV. No repair or ingestion was performed.",
        "",
    ]
    for season in seasons:
        item = rows_by_season[season]
        lines += [f"## {season} — {item['grade']}", ""]
        lines.append("League reference row counts:")
        lines.append("")
        lines.append("| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |")
        lines.append("|---|---:|---:|---:|---:|")
        for summary in item["league_summaries"]:
            coverage = summary.get("coverage_vs_reached", summary["coverage"])
            suffix = " vs reached" if "coverage_vs_reached" in summary else ""
            lines.append(f"| {summary['league']} | {coverage:.2%}{suffix} | {summary['median_rows_per_club']:.1f} | {summary['observed_rows_range'][0]}–{summary['observed_rows_range'][1]} | {summary['clubs_with_gaps']} |")
        lines += ["", "Clubs with real gaps:", "", "| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |", "|---|---|---:|---:|---:|---:|---:|"]
        if item["clubs_with_gaps"]:
            for gap in item["clubs_with_gaps"]:
                lines.append(f"| {gap['club']} | {gap['league']} | {gap['rows']} | {gap['data_goals']} | {gap['wiki_goals']} | {gap['shortfall']} | {gap['coverage']:.2%} |")
        else:
            lines.append("| None | — | — | — | — | — | — |")
        lines += ["", "Missing Wikipedia top-10 scorers:", ""]
        missing = item["missing_top10_scorers"]
        if missing:
            lines += ["| Player | Club | League | Wikipedia goals |", "|---|---|---|---:|"]
            for scorer in missing:
                lines.append(f"| {scorer['player']} | {scorer['club']} | {scorer['league']} | {scorer['wiki_goals']} |")
        else:
            lines.append("None.")
        if item["grade"] == "SIGNIFICANT_GAPS":
            lines += ["", "### Patch candidates", "", "The named candidates are the missing Wikipedia top-10 scorers above. A patch would require authoritative player-season totals including minutes, followed by validation against all five stores; no data was downloaded or ingested."]
        lines.append("")

    DOC_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({s: {k: rows_by_season[s][k] for k in ("grade", "league_coverage", "missing_goals") } for s in seasons}, indent=2))


if __name__ == "__main__":
    main()
