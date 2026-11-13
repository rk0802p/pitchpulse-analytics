# Phase 2 data repair report

Generated 2026-11-13. Scope is `2025-2026` only.

## Before and after

| Measure | Before | After |
|---|---:|---:|
| Total rows | 2,997 | 2,611 |
| Serie A rows | 495 | 495 |
| Ligue 1 rows | 447 | 447 |
| Reviewed squad-label rows | 252 | 252 |
| Verified squad corrections | 0 | 89 |
| Unresolved reviewed rows | 252 | 163 |
| Zero-minute rows | 386 | 0 |
| Distinct raw squad labels | 197 | 176 |
| Serie A stale-label rows | 128 | 93 |
| Ligue 1 stale-label rows | 124 | 70 |
| Distinct Serie A raw labels | 96 | 81 |
| Distinct Ligue 1 raw labels | 97 | 62 |
| Final league clubs represented (Serie A / Ligue 1) | 20 / 18 | 20 / 18 |
| Non-null `PrgC`/`PrgP`/`PrgR` values | 8,991 | 0 |

The 252 review rows are the rows whose labels did not resolve to a final 2025/26 league-table club: 128 Serie A and 124 Ligue 1. The review CSV contains every row, category, action, proposed squad and evidence. Only `correct` or `auto-map` actions were applied; this run had 89 `correct`, 0 `auto-map`, and 163 `unresolved` rows. Unresolved rows remain unchanged.

Review categories after Stage 1 were `verified_club_season` (89) and `unresolved_no_unique_squad_source` (163). The zero-minute archive was 142 Premier League, 156 La Liga and 88 Bundesliga rows; Serie A and Ligue 1 had no zero-minute rows.

## Progression provenance

The values entered with the 2025/26 data refactor and were carried through `DataLoader` and the parquet migration. Git history, scripts and docs contain no source-bearing import or formula that generated the Serie A/Ligue 1 values. The matched CSV has no progression columns, FBref advanced data ended in January 2026, and the audit reported correlation 0.83 with goals (0.39 in 2023/24) and 0.10 with minutes. All three fields are therefore null for all retained 2025/26 rows. Original values are in `Backend/scripts/output/removed_progression_values.csv`.

## Backups and verification

The pre-change commit is tagged `pre-phase2`. A second copy of `Backend/data` was made at `C:\Users\Raj\PitchPulse_pre_phase2_data_2025_2026_2`; its pre-change 2025/26 count was 2,997 in CSV, parquet and DuckDB. Zero-minute rows are archived at `Backend/data/seasons/2025-2026/archive/zero_minute_rows.csv`. Squad verification is sidecar-only at `Backend/data/seasons/2025-2026/squad_verification.csv`; no main-schema column was added.

2024/25 baseline verification remains required and all seasons outside 2025/26 are expected to remain unchanged. Step D is investigate-only; see `OLD_SEASON_GAPS.md`.
