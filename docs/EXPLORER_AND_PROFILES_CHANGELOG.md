# Changelog: Player Explorer & Dedicated Player Profiles

## Overview
Phase 5 elevates the player scouting workflow from a basic card flip list into an enterprise-grade analytics suite. It introduces:
1. **Positional Peer Percentile Benchmarking**: Statistical percentile ranking (0–100th percentile) against positional peers across Europe's top 5 leagues with minimum minutes threshold (270 mins).
2. **Standardized Per-90 vs Raw Totals Toggle**: Interactive mode switch in the Player Explorer to evaluate output adjusted for playing time vs total volume.
3. **Comprehensive Player Dossier (`PlayerProfileView`)**: Professional scouting dossier featuring player identity, physical metrics (age, nation, squad, competition), playing time analysis, scoring efficiency, playmaking threat, progressive ball movement, discipline metrics, and visual peer percentile ranking bars.

---

## Changes

### 1. Backend Enhancements
- **`Backend/services/player_service.py`**:
  - Implemented `_compute_positional_percentiles()`: Calculates empirical percentiles against European peers sharing the same primary position (`FW`, `MF`, `DF`, `GK`) with `Min >= 270`.
  - Benchmarks 8 core metrics: `goals_per_90`, `xg_per_90`, `assists_per_90`, `xag_per_90`, `progressive_carries`, `progressive_passes`, `progressive_receptions`, `finishing_differential`.
  - Integrated percentiles into the standardized `GET /api/players/<player_id>` response payload under the `percentiles` key.
- **`Backend/tests/test_players.py`**:
  - Added assertions validating `percentiles` presence, structure, and value ranges [0, 100].
  - All 28 player and API test suite cases pass.

### 2. Frontend Enhancements
- **`frontend/src/components/profile/PlayerProfileView.js`**:
  - New modular profile dossier component.
  - Header with nation, age, position badge, club crest initial, quick comparison toggle, and breadcrumb navigation back to Explorer.
  - KPI Stat Cards: Goals with xG finishing differential, Assists with G+A volume, Playing Time (apps, starts, minutes, 90s), Progressive Carries & Passes.
  - Positional Peer Percentile Radar/Bar breakdown: Visual bar fills colored dynamically based on tier (Elite 85%+, High 65%+, Mid 40%+, Base).
  - Rate Cards: Goals/90, xG/90, Assists/90, xAG/90, Yellows/90, Reds/90.
- **`frontend/src/App.js`**:
  - Added Per-90 toggle (`rateMode`) to Player Explorer data table headers.
  - Switched columns dynamically between raw totals (Gls, Ast, xG, xAG, PrgC, PrgP) and standardized per-90 rates (Gls/90, Ast/90, xG/90, xAG/90, PrgC/90, PrgP/90).
  - Integrated `<PlayerProfileView>` into the active router view with comparison toggle wiring.

---

## Verification
- **Backend Tests**: 41 passed (28 service tests, 13 baseline integration tests).
- **Frontend Tests**: 5 passed (`App.test.js`).
- **Production Build**: `npm run build` compiled cleanly without warnings or errors.
