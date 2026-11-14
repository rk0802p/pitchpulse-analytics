# PitchPulse Analytics — Data Sources, Provenance & Governance

This document establishes the official data provenance, historical coverage eras, mathematical invariants, and licensing terms for all datasets utilized within the PitchPulse Analytics platform.

---

## 1. Multi-Season Registry & Historical Eras

PitchPulse maintains 14 distinct seasons spanning 2012 to 2026 across Europe's top 5 domestic leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1):

| Era | Seasons Covered | Tracked Metrics | Data Provenance / Model | Status |
| :--- | :---: | :--- | :--- | :---: |
| **Pre-xG Era** | `2012-2013` to `2013-2014` | Matches, Starts, Minutes, Goals, Assists, Non-Penalty Goals, Penalties, Yellow/Red Cards. Advanced xG and ball progression are explicitly untracked (`NaN`). | FBref / Historical Boxscore Archives (98 clubs) | **Verified Historical** |
| **Early xG Era** | `2014-2015` to `2016-2017` | Standard match statistics + shot-level Expected Goals ($xG$) and Non-Penalty $xG$ ($npxG$). Ball progression metrics remain untracked. | Understat / FBref Aggregates (98 clubs) | **Verified Historical** |
| **Modern Event Era** | `2017-2018` to `2023-2024` | Comprehensive 37 canonical metrics: Standard stats, $xG$, $xAG$, Progressive Carries ($PrgC$), Progressive Passes ($PrgP$), and Progressive Receptions ($PrgR$). | FBref / Opta Event Data Archives (98 clubs pre-2023, 96 clubs 2023/24) | **Verified Historical** |
| **Reference Baseline** | `2024-2025` | Complete 37 canonical metrics with full positional percentiles and cross-metric validation. | Immutable Reference Baseline (96 clubs, 2,854 player records) | **Authoritative Baseline (Locked)** |
| **Phase 2 Composite** | `2025-2026` | 2,611 retained rows after archiving 386 zero-minute placeholders; 73 uniquely sourced squad corrections and 11 youth/reserve parent-club auto-maps applied; 168 unresolved rows retained unchanged. `PrgC`, `PrgP`, and `PrgR` are null because the composite values have no traceable source. | Automated composite plus Wikipedia 2025/26 club-season squad evidence | **Verified with documented limitations** |

### Historical completeness flags

The cached Wikipedia audit is read-only and does not alter player rows or analytical stores. A real club gap means coverage below 90% or a shortfall of at least 10 goals. Detailed sidecars are stored as `Backend/data/seasons/<season>/known_gaps.json` for MINOR_GAPS and SIGNIFICANT_GAPS seasons. The 2024/25 baseline manifest and files remain locked.

| Season | Grade | Coverage | Note |
|---|---|---:|---|
| 2012/13 | MINOR_GAPS | 96.83% | Small club-level shortfalls. |
| 2013/14 | MINOR_GAPS | 97.12% | Small club-level shortfalls. |
| 2014/15 | SIGNIFICANT_GAPS | 91.64% | Large pre-existing gaps; patch candidates are documented only. |
| 2015/16 | MINOR_GAPS | 96.78% | Small club-level shortfalls. |
| 2016/17 | MINOR_GAPS | 97.47% | Small club-level shortfalls. |
| 2017/18 | MINOR_GAPS | 96.95% | Small club-level shortfalls. |
| 2018/19 | MINOR_GAPS | 97.15% | Small club-level shortfalls. |
| 2019/20 | MINOR_GAPS | 96.99% | Small club-level shortfalls. |
| 2020/21 | SIGNIFICANT_GAPS | 95.60% | Large pre-existing gaps, including Real Madrid attacking coverage. |
| 2021/22 | MINOR_GAPS | 96.01% | Small club-level shortfalls. |
| 2022/23 | COMPLETE | 96.65% | No club crossed the real-gap threshold. |
| 2023/24 | MINOR_GAPS | 97.07% | Small club-level shortfalls. |
| 2024/25 | MINOR_GAPS | 97.03% | Investigation-only flag; baseline files and manifest unchanged. |
| 2025/26 | PARTIAL_SNAPSHOT | 97.29%* | *Full-season leagues only; Serie A and Ligue 1 are measured against their reached matchweeks. |

### Season-by-season source record

The entries below report what each season manifest says and whether a usable source reference is present in this repository. A manifest attribution is provenance metadata, not independent proof that every row came from that provider. Season completeness is reported separately in the gap table above.

| Season | Manifest-recorded source | Traceable reference in this repository | Scope and limitations |
|---|---|---|---|
| 2012/13 | Transfermarkt comprehensive match-appearance data | The manifest says “Transfermarkt Big 5 appearances” but gives no URL or archived input file. | Standard player-season aggregates; underlying source snapshot cannot be reconstructed from this repo. |
| 2013/14 | Transfermarkt comprehensive match-appearance data | The manifest says “Transfermarkt Big 5 appearances” but gives no URL or archived input file. | Standard player-season aggregates; underlying source snapshot cannot be reconstructed from this repo. |
| 2014/15 | Transfermarkt appearance data; Understat advanced metrics | [Understat-based community archive](https://github.com/vibedatascience/understat_players_aggregated) is recorded in the manifest and locally reconciled for five missing top-10 scorers. | Archive is corroborating evidence and does not reconcile every club total; it is not a replacement dataset. Progression was not recorded. |
| 2015/16 | Transfermarkt appearance data; Understat advanced metrics | [Understat-based community archive](https://github.com/vibedatascience/understat_players_aggregated) is recorded in the manifest. | The repo records xG/xA/npxG provenance; progression was not recorded. No season-specific source snapshot is retained here. |
| 2016/17 | Transfermarkt appearance data; Understat advanced metrics | [Understat-based community archive](https://github.com/vibedatascience/understat_players_aggregated) is recorded in the manifest. | The repo records xG/xA/npxG provenance; progression was not recorded. No season-specific source snapshot is retained here. |
| 2017/18 | Transfermarkt appearance data; Understat advanced metrics | [Understat-based community archive](https://github.com/vibedatascience/understat_players_aggregated) is recorded in the manifest. | The repo records xG/xA/npxG provenance; progression was not recorded. No season-specific source snapshot is retained here. |
| 2018/19 | Transfermarkt appearance data; Understat advanced metrics | [Understat-based community archive](https://github.com/vibedatascience/understat_players_aggregated) is recorded in the manifest. | The repo records xG/xA/npxG provenance; progression was not recorded. No season-specific source snapshot is retained here. |
| 2019/20 | Transfermarkt appearance data; Understat advanced metrics | [Understat-based community archive](https://github.com/vibedatascience/understat_players_aggregated) is recorded in the manifest. | The repo records xG/xA/npxG provenance; progression was not recorded. No season-specific source snapshot is retained here. |
| 2020/21 | Transfermarkt appearance data; Understat advanced metrics | [Understat-based community archive](https://github.com/vibedatascience/understat_players_aggregated) is recorded in the manifest and locally reconciled for Karim Benzema. | Archive is corroborating evidence and does not reconcile every club total; it is not a replacement dataset. Progression was not recorded. |
| 2021/22 | Transfermarkt appearance data; Understat advanced metrics | [Understat-based community archive](https://github.com/vibedatascience/understat_players_aggregated) is recorded in the manifest. | The repo records xG/xA/npxG provenance; progression was not recorded. No season-specific source snapshot is retained here. |
| 2022/23 | Transfermarkt appearance data; Understat advanced metrics | [Understat-based community archive](https://github.com/vibedatascience/understat_players_aggregated) is recorded in the manifest. | The repo records xG/xA/npxG provenance; progression was not recorded. No season-specific source snapshot is retained here. |
| 2023/24 | FBref/StatsBomb-style aggregates | [Public GitHub CSV](https://raw.githubusercontent.com/JSzamik/FootballDataAnalysis-R-Visualisations/main/top5-players.csv), as recorded in the manifest. | Manifest notes selected scorer/assister spot checks; this is not a full row-by-row independent verification. |
| 2024/25 | FBref/StatsBomb-style aggregates | The manifest points to `local://Backend/top5-players24-25.xlsx`, a path that does not identify a retrievable upstream source. Dataset files are locked by the baseline verifier. | The cryptographic lock proves file identity, not provider-level provenance. Treat the provider attribution as unverified pending a recoverable source citation. The baseline files and manifest remain unchanged. |
| 2025/26 | FBref-style composite | Manifest points to [FBref](https://fbref.com); squad changes have row-level URLs in `Backend/data/seasons/2025-2026/squad_verification.csv`. | Composite source lineage is not complete at row level. Serie A/Ligue 1 are partial snapshots. Progression fields are null because their origin could not be traced. |

The 2014/15–2024/25 community archive at [vibedatascience/understat_players_aggregated](https://github.com/vibedatascience/understat_players_aggregated) is a secondary cross-check only. In the local reconciliation it contains the five named missing scorers, but leaves material club-goal shortfalls and lacks some club-season records. Do not use its totals as an automatic patch or treat its presence as proof that a season is complete. The row-level reconciliation and hash are documented in [OLD_SEASON_GAPS.md](OLD_SEASON_GAPS.md).

The local review copy is `artifacts/understat_players_aggregated_2014_2024.csv` (SHA-256 `b78fad5f01844a0fdab0d89474dafba9b86c586d2f0ce88f0ce2c9af70d2bc64`). It is ignored by Git and excluded from Vercel packaging through the existing `artifacts/` rule. Production loaders only read registered season files under `Backend/data/seasons/`; they do not read this archive. The upstream repository attributes the dataset to Understat but does not provide a repository `LICENSE` file, so public availability must not be treated as redistribution permission. Keep the file as local audit evidence until licensing and row-level identity/club reconciliation are resolved.

### Storage parity and representation

Run `python Backend/scripts/check_storage_parity.py` to compare each season's CSV, XLSX, Parquet, DuckDB `players`, and DuckDB `per90_metrics` rows. The audit compares row-level player/team/competition/stat signatures, row counts, goals, assists, minutes, and missingness for tracked advanced metrics. The per-90 view is compared with the CSV rows having `Min > 0`, matching that view's SQL definition. It is read-only and exits nonzero when a store differs.

The audit currently reports differences for 2012/13–2022/23: legacy CSV/XLSX files contain zero placeholders for metrics that the runtime era registry marks untracked, while Parquet and DuckDB normalize those metrics to null. This is a representation mismatch between physical stores; the loader's CSV/XLSX fallback also applies normalization before serving data. The audit does not rewrite files. Reconcile these historical physical representations in a separately reviewed data migration before expecting a fully green all-season parity run.

### Deployment packaging and runtime metadata

The Vercel Python function bundles season CSV and JSON files as specified in `Backend/vercel.json`. CSV files are runtime player stores; JSON manifests and `known_gaps.json` are read by the season registry and quality endpoint. XLSX, tests, scripts, Markdown documentation, and local artifacts are excluded by `.vercelignore`; current runtime routes do not read these excluded files. GitHub Actions checks out the full repository separately and runs the relevant tests and parity script from the repository. Production deployments should set `CORS_ORIGINS` to the exact frontend origin(s); leaving it unset or wildcarded in production falls back to restricted local origins and emits a warning.

The API exposes `X-Data-Version`, a manifest-derived ETag, and both stable season and versioned data cache tags on cacheable successful GET responses. Updating any season manifest changes the ETag and data tag, allowing clients and the CDN to revalidate or purge the prior version.

---

## 2. The 2024/25 Authoritative Reference Baseline

The `2024-2025` season serves as the immutable gold standard and cryptographic anchor for all normalization, peer percentiles, and validation checks across PitchPulse.

### Cryptographic Fingerprints
- **Canonical Manifest**: `Backend/data/baselines/baseline_2024_2025.json`
- **Archival Excel Dataset (`top5-players24-25.xlsx`)**:
  `SHA-256: 7dbea8fdd43b9cf09eef5a18632953d9079d0f10bd11532da3337d937213e7e0`
- **Served Production CSV (`top5-players24-25.csv`)**:
  `SHA-256: b6adc0f2f44db409d9a89d22210a6e20172b99479998627291c540bf1785583b`

### Mathematical Invariants
Every automated verification check (`GET /api/seasons/baseline/verify` or `BaselineVerifier`) strictly enforces that the served dataset matches the following exact totals:
- **Total Player Records**: `2,854`
- **Active Clubs / Squads**: `96`
- **Total Goals Scored**: `4,806`
- **Total Assists Credited**: `3,429`
- **Total Minutes Played**: `3,459,684`
- **Competitions**: `5` (Premier League, La Liga, Serie A, Bundesliga, Ligue 1)

---

## 3. Top Scorers & Statistical Highlights

### 2023/2024 Completed Season (Verified)
- **European Golden Shoe / Bundesliga**: Harry Kane (Bayern Munich) — **36 Goals** (30.6 $xG$, 8 Assists)
- **Bundesliga Runner-Up**: Serhou Guirassy (VfB Stuttgart) — **28 Goals** (20.8 $xG$)
- **Ligue 1 Top Scorer**: Kylian Mbappé (Paris Saint-Germain) — **27 Goals** (21.2 $xG$)
- **Premier League Golden Boot**: Erling Haaland (Manchester City) — **27 Goals** (28.4 $xG$)
- **La Liga Pichichi**: Artem Dovbyk (Girona) — **24 Goals** (24.2 $xG$)
- **Serie A Capocannoniere**: Lautaro Martínez (Inter Milan) — **24 Goals** (20.1 $xG$)

### 2024/2025 Completed Season (Authoritative Baseline)
- **Top Scorers**: Kylian Mbappé (31 goals), Mohamed Salah (29 goals), Robert Lewandowski (27 goals), Harry Kane (26 goals), Mateo Retegui (25 goals).
- **Total European Production**: 4,806 goals, 3,429 assists across 3,459,684 minutes.

---

## 4. Licensing, Intellectual Property & Legal Notice

### Software Source Code License
The PitchPulse Analytics software codebase — including the Flask backend API, data loaders, scoring pipelines, analytical modules, and React frontend interface — is licensed under the **MIT License**. You are free to inspect, modify, and distribute the application code.

### Third-Party Sports Data Rights & Attribution
The datasets provided within this repository represent transformed and aggregated statistical records derived from publicly available football reporting platforms:

1. **FBref / Sports Reference LLC & Opta (Stats Perform)**:
   - Match aggregates and progressive actions (carries, passes, receptions) are published by Sports Reference LLC via FBref.
   - Detailed event metrics originate from Opta (Stats Perform). All trademarks, competition designations, and underlying proprietary event feeds belong to their respective rights holders.
   - *Opta Data Notice*: Following updates to Opta / Stats Perform terms in January 2026, downstream users must note that raw match event data and commercial league feeds require direct commercial licenses. Data distributed here is strictly for academic research, education, non-commercial scouting experimentation, and transformative analytical visualization under Fair Use principles.

2. **Understat**:
   - Advanced shot-quality and chance creation models ($xG$, $xA$, $npxG$) for early historical seasons reflect public models created by Understat.

3. **Commercial Deployment Notice**:
   - The inclusion of historical datasets in this repository does **NOT** grant commercial sports data redistribution rights. Any commercial deployment or public wagering/betting integration must procure commercial licensing agreements directly from Stats Perform (Opta), StatsBomb, or relevant league rights managers.
