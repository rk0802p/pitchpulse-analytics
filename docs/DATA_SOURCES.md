# PitchPulse Analytics — Data Sources & Provenance Documentation

> **LEGAL NOTICE**: This document records technical provenance and data sources for PitchPulse Analytics. It does NOT constitute legal advice. All licensing questions must be reviewed by qualified legal counsel.
> `TODO(lawyer)`: Complete formal legal review of commercial redistribution terms, database rights, and API access agreements for the data sources listed below.

---

## 1. Overview of Ingested Datasets

PitchPulse maintains multi-season player-level statistics covering the European Big 5 leagues (England, Spain, Italy, Germany, France).

| Season Range | Source Description | Advanced Metrics Covered | Governance & Status |
| :--- | :--- | :--- | :--- |
| `2012/13` – `2013/14` | Public FBref archive aggregates | Basic match counts, standard goals, assists, minutes, cards | `verified_historical` |
| `2014/15` – `2016/17` | Public FBref + Understat historical tables | Standard metrics + Understat estimated $xG$, $npxG$ | `verified_historical` |
| `2017/18` – `2023/24` | FBref / StatsBomb style aggregates | Full 37-column canonical schema (including progressive actions) | `verified_historical` |
| `2024/25` | Reference Baseline Dataset (`top5-players24-25.xlsx`) | Full 37-column canonical schema (SHA-256 cryptographically locked) | `read_only_baseline` |
| `2025/26` | Experimental simulated projection dataset | Synthetic player projections (197 clubs, squad attribution joins) | `quarantined` (`simulated`) |

---

## 2. Source Provenance & Vendor Rights

### A. FBref / Sports Reference LLC
- **Primary Metrics**: Traditional counting stats (goals, assists, minutes, appearances, disciplinary cards).
- **Terms of Service**: Sports Reference terms govern scraping and redistribution of their compilation.
- `TODO(lawyer)`: Verify whether serving static aggregated player season totals falls within fair use or requires an enterprise data license from Sports Reference LLC.

### B. Opta / Stats Perform
- **Primary Metrics**: Advanced event data, progressive carries ($PrgC$), progressive passes ($PrgP$), progressive receptions ($PrgR$).
- **Opta Data Changes (January 2026)**: Note changes in public metric accessibility and terms of service implemented by Stats Perform / Opta in early 2026.
- `TODO(lawyer)`: Review commercial restrictions on redistributing derived Opta event metrics under Stats Perform's updated 2026 data licensing policies.

### C. StatsBomb
- **Primary Metrics**: Expected goals ($xG$), non-penalty expected goals ($npxG$), expected assisted goals ($xAG$).
- **Terms of Service**: StatsBomb open data is governed by the StatsBomb Open Data License Agreement (typically non-commercial with explicit attribution requirements).
- `TODO(lawyer)`: Review whether player season-aggregate xG values derived from StatsBomb-style models require commercial licensing or specific attribution headers.

### D. Understat
- **Primary Metrics**: Early-era expected goals ($xG$) estimates for seasons 2014/15 through 2016/17.
- `TODO(lawyer)`: Confirm permitted usage of public Understat model outputs in non-commercial and commercial contexts.

---

## 3. Cryptographic Baseline Verification

The reference baseline (`2024-2025`) is cryptographically verified on application startup using SHA-256:

- **Archival Excel**: `7dbea8fdd43b9cf09eef5a18632953d9079d0f10bd11532da3337d937213e7e0` (`top5-players24-25.xlsx`)
- **Runtime CSV**: `b6adc0f2cb73bb2b216beecf72cf2027e1f40b2f567b43b679461df60cfa5eef` (`top5-players24-25.csv`)
- **Statistical Invariants**:
  - Total records: 2,854 player spells
  - Total goals: 4,806
  - Total assists: 3,429
  - Total minutes: 3,446,128

Any byte alteration to the baseline files causes startup verification failure (`BaselineIntegrityError`) and places `/api/health` into a 503 unhealthy state.

---

## 4. Multi-Club Spells & Identity Resolution

- Records in PitchPulse represent individual player-club spells.
- A player who transferred mid-season (e.g. Joao Felix in 2023/24) has distinct rows for each club spell.
- When `?merge_spells=true` is requested, spells are dynamically aggregated under the player's primary identity (`player_id = {slug}-{birthyear}`).
