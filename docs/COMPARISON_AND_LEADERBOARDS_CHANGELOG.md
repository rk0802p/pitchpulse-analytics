# Changelog: Player Comparison Workspace & Statistical Leaderboards Hub

## Overview
Phase 6 delivers an interactive head-to-head scouting and statistical leaderboard engine.
1. **Head-to-Head Scouting Radar (`ComparisonRadarChart`)**: A custom SVG multi-axis scouting polygon comparing up to 5 players across 6 dimensions (Goals/90, xG/90, Assists/90, xAG/90, Progressive Carries, Progressive Passes) benchmarked with empirical percentile scores against European peers.
2. **Statistical Benchmark Matrix (`ComparisonMatrix`)**: Category-grouped tabular benchmark (Rates, Expected Threat, Finishing Differentials, Progression, Playing Time, Discipline) with automatic category-leader identification, green highlight badges, and category leader stars.
3. **Statistical Leaderboards Hub (`LeaderboardsView`)**: Complete statistical ranking suite with 10 metric tabs, dynamic league, position, and minimum minutes thresholds, Top 3 Podium Cards (Gold, Silver, Bronze), and secondary context stats (xG, xAG, per-90s).

---

## Changes

### 1. Backend Enhancements
- **`Backend/services/analytics_service.py`**:
  - `compare_players(record_ids)`:
    - Added automatic metric leader identification (`leaders`, `best_value`) for each metric row in `aligned_matrix`.
    - Added European peer percentile scoring (`scores`) for all 6 radar dimensions against players with `Min >= 270`.
  - `get_leaderboard(...)`:
    - Enriched returned records with `competition_id`, `age`, `starts`, `goals_per_90`, `assists_per_90`, `xg_per_90`, `xag_per_90`, and `finishing_differential`.
- **`Backend/services/data_loader.py`**:
  - Added derived column `xG_minus_Gls` (underperformance tracking).
- **`Backend/services/validation_service.py`**:
  - Added support for `xG_minus_Gls` in `validate_metric`.
- **`Backend/tests/test_comparisons.py`**:
  - Added assertions validating `leaders` in matrix metrics and `scores` in radar dimensions.

### 2. Frontend Enhancements
- **`frontend/src/components/compare/ComparisonRadarChart.js`**:
  - Bespoke SVG Radar Chart with 5 concentric percentage rings (20% to 100%), 6 radial spokes, and color-coded polygons for each player.
  - Interactive vertex hover tooltips showing metric name, raw value, and percentile ranking.
- **`frontend/src/components/compare/ComparisonMatrix.js`**:
  - Categorized comparison matrix (Rates, Expected Threat, Finishing, Progression, Volume, Discipline).
  - Visual category leader highlights with green badge tinting and star indicator.
- **`frontend/src/components/leaderboards/LeaderboardsView.js`**:
  - 10 metric tabs across Scoring, Playmaking, Progression, Rates, and Volume.
  - Filter bar supporting All 5 Leagues, Positional breakdown (FW, MF, DF), and Minimum Minutes thresholds (270+, 500+, 900+).
  - Top 3 Podium display with Gold (Crown), Silver, and Bronze ranking badges.
  - Rankings 4–N table with context stats and one-click "Add to Compare" and "View Profile" actions.
- **`frontend/src/App.js`**:
  - Integrated `ComparisonRadarChart`, `ComparisonMatrix`, and `LeaderboardsView`.
  - Added "Clear All" comparison button and player removal options.
- **`frontend/src/App.test.js`**:
  - Added unit test coverage for `ComparisonRadarChart`, `ComparisonMatrix`, `LeaderboardsView`, and `PlayerProfileView`. All 9 tests passing.

---

## Verification
- **Backend Tests**: 41 passed (28 service tests, 13 baseline integration tests).
- **Frontend Tests**: 9 passed (`App.test.js`).
- **Production Build**: `npm run build` compiled cleanly with zero errors.
