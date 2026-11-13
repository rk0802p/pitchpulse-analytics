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
| **Phase 2 Composite** | `2025-2026` | 2,611 retained rows after archiving 386 zero-minute placeholders; 89 uniquely sourced squad corrections applied and 163 unresolved rows retained unchanged. `PrgC`, `PrgP`, and `PrgR` are null because the composite values have no traceable source. | Automated composite plus Wikipedia 2025/26 club-season squad evidence | **Verified with documented limitations** |

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
