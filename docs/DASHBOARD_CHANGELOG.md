# Phase 4: Overview Dashboard & Analytical Visualizations Changelog

This document details the overview dashboard, dynamic competition filtering, and interactive football analytics charts delivered in Phase 4.

---

## 1. What Was Built in Phase 4

### A. Dynamic Competition Selector
- Added a responsive league toolbar at the top of the Dashboard:
  - **All 5 Leagues** (96 Clubs · 2,854 Players)
  - **Premier League** (ENG · 20 Clubs · 574 Players)
  - **La Liga** (ESP · 20 Clubs · 583 Players)
  - **Serie A** (ITA · 20 Clubs · 577 Players)
  - **Bundesliga** (GER · 18 Clubs · 519 Players)
  - **Ligue 1** (FRA · 18 Clubs · 606 Players)
- Selecting any competition immediately recalibrates all KPI stat cards, charts, and top rankings from the dataset in real-time.

### B. High-Density KPI Stat Cards
- **Players Monitored:** Dynamically counts total players in selected competition.
- **Monitored Clubs:** Counts active squads.
- **Goals Scored:** Aggregates real goals scored and assists.
- **Cumulative Expected Goals (xG):** Shows total mathematical chance quality alongside a finishing differential badge (`Overperforming xG` or `Underperforming xG`).

### C. Three Dedicated Football Intelligence Charts
1. **Finishing Efficiency vs xG (`FinishingEfficiencyChart.js`):**
   - Directly implements Roadmap Section 7A (*Finishing versus expected goals: Compare goals scored with xG*).
   - Identifies clinical overperformers (e.g., Patrik Schick +8.3, Bryan Mbeumo +7.7, Chris Wood +6.6) and underperformers (e.g., Hugo Ekitike -6.6, Abde Ezzalzouli -6.0).
   - Features an over/under toggle, stacked bar visualizers (Goals vs xG), and minimum 500-minute threshold to prevent sample size distortion.
2. **Attacking Output Matrix (`AttackingScatterChart.js`):**
   - Directly implements Roadmap Section 7C (*Chance creation and attacking output: Plot xG against xAG*).
   - 2D scatter matrix mapping shooting threat (`xG`) on the Y-axis against creative chance quality (`xAG`) on the X-axis.
   - Categorizes players into analytical quadrants: *Complete Attackers*, *Pure Poachers*, and *Elite Creators*.
   - Outliers (Haaland, Salah, Saka, Kane, Vinicius) clearly labeled with interactive hover tooltips displaying goals, assists, club, and minutes.
3. **Ball Progression Leaders (`ProgressionMatrixChart.js`):**
   - Directly implements Roadmap Section 7D (*Progression and playing style: Use progressive carries and progressive passes*).
   - Side-by-side bar visualizer comparing Progressive Carries (`PrgC`) and Progressive Passes (`PrgP`).

### D. Analytical Provenance & Model Limitations Banner
- Features a prominent banner explaining:
  - **Season:** 2024/25 Regular Season coverage.
  - **Data Source:** FBref / StatsBomb style aggregates.
  - **Model Explanations:** Explains the mathematical definitions and limitations of Expected Goals (`xG`) and Expected Assisted Goals (`xAG`).

### E. Backend Dashboard Endpoint
- Added `GET /api/dashboard?competition=...` in `Backend/routes/leaderboards.py`.
- Computes KPIs, top scorers, top creators, over/underperformers, progression leaders, and scatter coordinates from in-memory cache in **< 3 ms**.

---

## 2. Test Coverage & Build Verification

- **Backend Unit Tests:** 28 tests in `Backend/tests/` (added `test_dashboard_analytics` and `test_dashboard_analytics_filtered`).
- **Regression Tests:** 13 baseline tests in `Backend/test_api_baseline.py`.
- **Total Backend Tests:** 41 tests (41/41 passing).
- **Frontend Unit Tests:** 5 tests in `frontend/src/App.test.js` (5/5 passing).
- **Production Build:** `npm run build` compiled successfully (`76.78 kB` JS, `6.07 kB` CSS).
