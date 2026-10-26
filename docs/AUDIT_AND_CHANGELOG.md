# Phase 1: Audit, Baseline Stabilization & Changes Changelog

This document records the baseline audit findings, improvements, and technical changes implemented during Phase 1 of the Sports Analytics Dashboard modernization roadmap.

---

## 1. What Was Improved & Fixed

### A. Backend Python Environment & Dependencies
- **Issue:** `Backend/requirements.txt` was pinned to `pandas==2.0.3` which does not support Python 3.13 (failing during pip build with `ModuleNotFoundError: No module named 'pkg_resources'`).
- **Fix:** Upgraded requirements to modern, Python 3.13-compatible versions:
  - `pandas>=2.2.3`
  - `openpyxl>=3.1.2`
  - `flask>=2.3.3`
  - `flask-cors>=4.0.0`
- **Impact:** Virtual environment creation (`python -m venv venv`) and pip installation now install precompiled wheels cleanly and deterministically.

### B. Repository Cleanliness & Git Configuration
- **Issue:** `.gitignore` lacked entries for Python virtual environments (`Backend/venv`, `.venv`), Python bytecode caches (`*.pyc`), environment variables, and build output directories.
- **Fix:** Expanded `.gitignore` to prevent tracking virtual environments, compiler artifacts, local environment files, and IDE directories.

### C. Frontend PostCSS & Tailwind Build Pipeline
- **Issue:** Tailwind CSS v4 (`@tailwindcss/postcss: ^4.1.13`) was installed with `react-scripts: ^5.0.1`. Create React App internally invokes `require('tailwindcss')` directly inside its webpack postcss loader, throwing:
  ```
  Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin...
  ```
  This completely broke `npm run build` and `npm start`.
- **Fix:** Standardized on `tailwindcss@^3.4.17` (which is natively supported by Create React App's postcss loader), restored standard `@tailwind base; @tailwind components; @tailwind utilities;` directives in `frontend/src/index.css`.
- **Impact:** Production build (`npm run build`) compiles cleanly without toolchain errors.

### D. Missing Static Image References
- **Issue:** `frontend/tailwind.config.js` defined `backgroundImage` pointing to `/img/grass-light.jpg` and `/img/grass-dark.jpg`. Webpack failed with `Module not found: Error: Can't resolve '/img/grass-dark.jpg'` because neither image file existed in the project.
- **Fix:** Replaced missing image paths with CSS gradient definitions (`linear-gradient(...)`).
- **Impact:** Unblocks build compilation and eliminates 404 image requests.

### E. Backend Automated Testing Suite
- **Added:** Created `Backend/test_api_baseline.py` featuring 13 automated tests across all 8 endpoints:
  - `GET /api/` (API health check)
  - `GET /api/debug` (File system inspection)
  - `GET /api/leagues` (Lists all 5 European leagues)
  - `GET /api/teams/<league>` (Valid and invalid competition queries)
  - `GET /api/players/<league>/<team>` (Squad player retrieval)
  - `GET /api/player/<player_id>` (Player profile and 404 handling)
  - `POST /api/players/compare` (Valid comparison and 400 empty body handling)
  - `GET /api/league-leaders` (Top 10 categories verification)
  - Performance latency benchmarking
- **Result:** All 13 tests pass.

### F. Frontend Testing Environment
- **Added:** Configured `frontend/src/setupTests.js` to enable `@testing-library/jest-dom` DOM matchers.
- **Added:** Implemented `frontend/src/App.test.js` validating:
  - Header rendering and asynchronous league fetch loading
  - `LeagueBanner` selection callback
  - `PlayerCard` stat display
- **Result:** All 3 unit tests pass in CI mode (`CI=true npm test`).

---

## 2. Dataset Verification Summary

- **Dataset File:** `Backend/top5-players24-25.xlsx`
- **Total Players:** 2,854
- **Competitions:** 5 (Premier League, La Liga, Serie A, Bundesliga, Ligue 1)
- **Total Clubs:** 96
- **Available Metrics:** 37 columns including goals, assists, playing time, cards, expected metrics (`xG`, `npxG`, `xAG`), progressive actions (`PrgC`, `PrgP`, `PrgR`), and per-90 rates.

---

## 3. Discovered Baseline Bottlenecks for Phase 2

1. **Uncached Disk I/O:** `api.py` re-reads and parses the 467 KB Excel file from disk on every endpoint call. Latency for `GET /api/leagues` was measured at **1.250s** with unclosed file warnings. Phase 2 will implement an in-memory cached repository.
2. **Sheet Name Bug:** `api.py` assigns `df['league'] = sheet_name`, which sets `"Sheet1"` instead of the competition name.
3. **Player Identity:** `Rk` is currently used as an identifier, which is an index rather than a durable ID.
4. **Hardcoded API URL:** `App.js` hardcodes `http://127.0.0.1:5000/api`. Phase 3 will introduce `REACT_APP_API_URL` and a centralized API service.
