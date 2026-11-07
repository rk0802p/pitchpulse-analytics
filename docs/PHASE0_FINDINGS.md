# PitchPulse Analytics — Phase 0 Reconnaissance & Audit Findings

**Branch**: `review-and-charts`  
**Date**: 7 November 2026  
**Auditor**: Antigravity Autonomous Workflow  
**Specification Sources**: `PitchPulse_Backend_Review.md` & `player-charts-build-guide.md`

---

## 1. Executive Summary & Verification Context

The `PitchPulse_Backend_Review.md` was compiled against a partial zip archive (which omitted the 2024/25 baseline datasets, 2025/26 composite data, and the frontend React application). 

In this initial reconnaissance phase, all items from the review were cross-verified against the **actual, complete workspace checkout**. In addition, the frontend-to-backend endpoint call map was catalogued, the safety net (`.gitignore`) was reinforced, and full baseline test runs across backend and frontend suites were executed and verified.

---

## 2. Review Findings Audit (Confirmed vs. Not Confirmed)

### 2.1 Security Findings (S1–S9)

| ID | Description in Review | Status in Real Repo | Evidence & Code Reference |
| :--- | :--- | :---: | :--- |
| **S1** | Unauthenticated import (`/seasons/import`) and active season mutation (`/seasons/active`) | **CONFIRMED** | `Backend/routes/seasons.py:51` (`POST /seasons/active`) has zero authentication; any client can mutate the global active season. `POST /seasons/import` uses `check_admin_auth()`, but `ADMIN_TOKEN` has a default fallback in `config.py` rather than failing closed when unset in production. |
| **S2** | SSRF and unbounded download in `/seasons/import` | **CONFIRMED** | While JSON `url` is rejected, URL downloading and lack of streaming limits/IP blocklists remain in legacy scripts (`scripts/import_season.py`). The HTTP import endpoint must completely remove `url` and accept multipart file uploads only. |
| **S3** | Arbitrary server-side `file_path` ingestion | **CONFIRMED** | While JSON `file_path` is rejected with `ERR_PATH_PROHIBITED` in `seasons.py:108`, `DatasetImporter.read_file()` and CLI still accept arbitrary paths. Needs complete elimination from HTTP parameters. |
| **S4** | Season identifier unvalidated (path traversal `..`, `/`) | **CONFIRMED** | `validate_season_id()` was added in `services/validation_service.py`, but it is not yet invoked across all query endpoints (`/players`, `/leaderboards`, `/dashboard`, `/competitions`) or inside `DatasetImporter.import_file()`. |
| **S5** | `/api/debug` leaks server layout & working directory | **FIXED** | Verified in `Backend/routes/meta.py`: `@meta_bp.route('/debug')` was completely deleted in commit `83eb277`. `test_api_baseline.py` now asserts `404` for `/api/debug`. |
| **S6** | CORS wide open (`*`) and ignores config | **FIXED** | Verified in `Backend/api.py:22` and `Backend/config.py:117`: CORS now binds strictly to `ALLOWED_ORIGINS` (defaulting to localhost:3000, 127.0.0.1:3000, etc.). |
| **S7** | User input used as regex in `str.contains` causes 500s | **PARTIALLY FIXED / CONFIRMED** | `regex=False, na=False` was added to `player_service.py` and `analytics_service.py`. However, position query parameter validation against `VALID_POSITIONS` is not enforced in `players.py:15`. |
| **S8** | Error handling leaks internal exception messages | **CONFIRMED** | Raw exception strings (`str(e)`) are still returned in several route handlers (`seasons.py:70`, `seasons.py:168`). Needs generic messages + structured error codes. |
| **S9** | Unpinned dependencies, missing rate limiting, hardcoded paths | **CONFIRMED** | `Backend/requirements.txt` has unpinned `>=` versions; no `Flask-Limiter` is present; hardcoded Windows paths (`C:\Users\Raj\...`) exist in `scripts/audit_candidate_2025_2026.py`, `scripts/audit_understat_recovery.py`, and `scripts/repair_understat_joins.py`. |

---

### 2.2 Baseline & Data Governance Findings (B1–B17)

| ID | Description in Review | Status in Real Repo | Evidence & Code Reference |
| :--- | :--- | :---: | :--- |
| **B1** | Verifier checks XLSX while loader serves CSV | **PARTIALLY FIXED / CONFIRMED** | `baseline_verifier.py` was updated in commit `83eb277` to hash both CSV and XLSX, but verification is **not** executed on application startup in `api.py:create_app()`, nor is `baseline_verified` exposed in `/api/health`. |
| **B2** | "Cryptographically locked" claim overstates local SHA-256 | **CONFIRMED** | Documented in `DATA_SOURCES.md` as local tamper-evident hashing. |
| **B3** | Baseline can be overwritten | **PARTIALLY FIXED / CONFIRMED** | `dataset_importer.py` has a guard blocking `season == '2024-2025'`, but atomic staging in a temporary directory and atomic replacement (`os.replace`) with an explicit CLI `--force` flag must be standardized. |
| **B4** | API never reports `is_baseline: True` | **FIXED** | Verified in `Backend/services/season_service.py:143`: `'is_baseline': (entry == '2024-2025')` is returned. Unit tests assert `assertTrue(b24['is_baseline'])`. |
| **B5** | Unverified imports display as verified | **CONFIRMED** | `get_quarantine_policy()` in `season_service.py` treats everything as verified unless `is_quarantined` is explicitly true (deny-list). An import with `dataset_status: 'unverified'` falls back to `verified_historical`. Needs an allow-list (`verified_historical`, `read_only_baseline`). |
| **B6** | Quarantine is cosmetic and hard-coded to 2025-2026 | **CONFIRMED** | `s_id == '2025-2026'` is hardcoded. Quarantined seasons are still returned in leaderboards and percentile pools unless explicitly filtered. Needs `include_provisional=true` enforcement. |
| **B7** | Active season is process-global state | **CONFIRMED** | `SeasonService._active_season` and `DataLoader._df/_records` are shared singleton state. `season` must be made a stateless per-request parameter defaulting to the latest verified season. |
| **B8** | Startup failure swallowed, default routes 500 | **CONFIRMED** | In `api.py:create_app()`, failure to load default season logs an error without halting or returning 503 from `/api/health`. |
| **B9** | `/api/metadata` mislabels other seasons as 2024/25 | **FIXED** | Verified in `Backend/routes/meta.py:38-60`: metadata is dynamically built from the season manifest. |
| **B10** | `DataLoader.get_active_season()` doesn't exist | **FIXED** | Verified in `Backend/services/player_service.py:100`: updated to `season_service.get_active_season()`. |
| **B11** | Normalization fillna(0) masks missing counts; dead derivations | **CONFIRMED** | `int_cols` fillna(0) masks genuine unknown counts; `G+A-PK` derivation has no source column; `data_loader.py:122` crashes on hyphenated age strings (`"25-123"`). |
| **B12** | `Rk` used as permanent player ID | **CONFIRMED** | `Rk` is row-order counter. `player_id` (`slug-birthyear`) exists on the record, but API routes and queries still primarily key off `Rk`. Need clear separation of `player_id` (human) and `record_id` (spell). |
| **B13** | Mid-season transfers are separate players without merged view | **CONFIRMED** | 140 players have multiple rows in 2023/24 alone. No `?merge_spells=true` aggregate is available. |
| **B14** | Leaderboards on rate metrics have no minutes floor | **FIXED** | Verified in `Backend/routes/leaderboards.py:31` and `Backend/services/analytics_service.py:36`: rate metrics (`_90`) default to `min_minutes=270`. |
| **B15** | Percentile definitions differ between profile and radar | **CONFIRMED** | Profile percentiles compare against **positional peers** (`player_service.py:236`); radar chart scores compare against **all positions pooled** (`analytics_service.py:245`). Radar `max` fields are dead code. |
| **B16** | Position matching is fuzzy (`Pos.str.contains`) | **CONFIRMED** | Multi-position players (`DF,MF`) appear in both DF and MF pools. Standardizing to primary position (first token) is needed for clean pool comparisons. |
| **B17** | Dead endpoint: `/seasons/<id>/download` looks for `players.csv` | **FIXED** | Verified in `Backend/routes/seasons.py:200`: candidate paths check `top5-players-{season}.csv`, `dataset.csv`, etc. |

---

### 2.3 Legal & Documentation Findings (L1–L7 & README)

| ID | Description in Review | Status in Real Repo | Evidence & Code Reference |
| :--- | :--- | :---: | :--- |
| **L1** | Third-party data licensing (Opta removal Jan 2026, FBref, Understat) | **CONFIRMED** | Documented in `DATA_SOURCES.md`. Needs explicit disclaimer paperwork and `TODO(lawyer)` review stubs. |
| **L2** | MIT license doesn't cover third-party data | **CONFIRMED** | Addressed conceptually in `DATA_SOURCES.md`, but terms stub file and clear code vs data license boundary are required. |
| **L3** | Projected/composite data presented as player statistics | **CONFIRMED** | 2025/26 composite data exhibits 197 clubs and squad anomalies. Needs `dataset_status: "simulated"` manifest tag, exclusion from authoritative views, and persistent UI/API notices. |
| **L4** | Personal data of minors (players aged 15–17) | **CONFIRMED** | Minimum age in dataset is 15. Privacy policy stub with `TODO(lawyer)` required. |
| **L5** | Trademarks and club crests | **NOT APPLICABLE** | Verified: frontend uses text and CSS styled badges (`TeamBadge.js`), not copyrighted club crest image files. |
| **L6** | Disclaimers and Terms of Use | **CONFIRMED** | Needs terms-of-use and non-commercial informational disclaimer stub files with `TODO(lawyer)`. |
| **L7** | Operator liability from unauthenticated endpoints/SSRF | **CONFIRMED** | Direct consequence of S1–S4; will be fully remediated in Phase 1. |

---

## 3. Frontend-to-Backend Endpoint Call Map

Grep inspection of `frontend/src/` confirms that all API traffic flows through [`frontend/src/services/api.js`](file:///d:/New%20folder%20(2)/Sports%20Analytical%20Website/frontend/src/services/api.js). Below is the complete catalog of endpoints called by the frontend:

| Endpoint Path | HTTP Method | Frontend Caller(s) | Passes `?season=`? | Notes & Legacy Compatibility Status |
| :--- | :---: | :--- | :---: | :--- |
| `/api/health` | `GET` | `api.getHealth()` | No | Health & readiness probe. |
| `/api/metadata` | `GET` | `App.js:97`, `DataManagementView.js:76` | **Yes** (`?season=activeSeason`) | Season metadata manifest. |
| `/api/metrics` | `GET` | `api.getMetrics()` | No | Canonical metric definitions. |
| `/api/seasons` | `GET` | `App.js:84`, `DataManagementView.js:62` | No | List of versioned seasons. |
| `/api/seasons/active` | `GET` | `api.getActiveSeason()` | No | Read active season. Deprecate for stateless execution. |
| `/api/seasons/active` | `POST` | `App.js:203`, `DataManagementView.js:159` | Body (`{ season }`) | **Must be token-protected or made a no-op** without breaking client. |
| `/api/seasons/presets` | `GET` | `DataManagementView.js:89` | No | Verified download presets. |
| `/api/seasons/baseline/verify` | `GET` | `DataManagementView.js:108` | No | Cryptographic baseline verification. |
| `/api/seasons/:id` | `GET` | `DataManagementView.js:143` | N/A | Full manifest of season `:id`. |
| `/api/seasons/:id/download` | `GET` | `DataManagementView.js:179` | N/A | CSV download link for season `:id`. |
| `/api/seasons/import` | `POST` | `DataManagementView.js:229` | Form data / JSON | Ingestion endpoint. **Must require Bearer token.** |
| `/api/players` | `GET` | `App.js` (multiple), `LeaderboardsView.js`, `SquadBrowserView.js`, `PlayerProfileView.js` | **Yes** (`season` included in params) | Primary player search, pagination, and sorting. |
| `/api/players/:id` | `GET` | `PlayerProfileView.js:43` | **Yes** (`?season=activeSeason`) | Player dossier and positional percentiles. |
| `/api/players/compare` | `POST` | `api.comparePlayers()` | Body (`{ season }`) | Head-to-head radar & matrix. |
| `/api/dashboard` | `GET` | `api.getDashboard()` | **Yes** (`?season=...`) | Attacking scatter, progression, finishing. |
| `/api/competitions` | `GET` | `api.getCompetitions()` | **Yes** (`?season=...`) | Competition aggregate summary cards. |
| `/api/teams` | `GET` | `App.js:127`, `SquadBrowserView.js:60` | **Yes** (`?season=...`) | Club lists per competition. |
| `/api/leaderboards` | `GET` | `api.getLeaderboards()` | **Yes** (`?season=...`) | Top scorers, creators, progressive leaders. |
| `/api/leagues` | `GET` | `api.getLegacyLeagues()` | **Yes** (`?season=...`) | **Legacy endpoint**: must retain backward-compatible response. |
| `/api/teams/:league` | `GET` | `api.getLegacyTeams()` | **Yes** (`?season=...`) | **Legacy endpoint**: fallback in `services/api.js`. |
| `/api/players/:league/:team` | `GET` | `api.getLegacyPlayersByTeam()` | **Yes** (`?season=...`) | **Legacy endpoint**: fallback in `services/api.js`. |

---

## 4. Checkout Data Inventory & Missing Files

### 4.1 Datasets Present in `Backend/data/seasons/`
The repository checkout contains **14 full seasons**:

1. `2012-2013` (Pre-xG Era, 98 clubs)
2. `2013-2014` (Pre-xG Era, 98 clubs)
3. `2014-2015` (Early xG Era, 98 clubs)
4. `2015-2016` (Early xG Era, 98 clubs)
5. `2016-2017` (Early xG Era, 98 clubs)
6. `2017-2018` (Modern Event Era, 98 clubs)
7. `2018-2019` (Modern Event Era, 98 clubs)
8. `2019-2020` (Modern Event Era, 98 clubs)
9. `2020-2021` (Modern Event Era, 98 clubs)
10. `2021-2022` (Modern Event Era, 98 clubs)
11. `2022-2023` (Modern Event Era, 98 clubs)
12. `2023-2024` (Modern Event Era, 96 clubs, 2,852 rows)
13. `2024-2025` (**Authoritative Reference Baseline**, 96 clubs, 2,854 rows — `top5-players24-25.csv`, `top5-players24-25.xlsx`, `manifest.json`)
14. `2025-2026` (Quarantined Composite Dataset, 197 clubs, 2,997 rows)

### 4.2 Baselines Present in `Backend/data/baselines/`
- `baseline_2024_2025.json`: Present, containing SHA-256 hashes for Excel (`7dbea8fd...`) and CSV (`b6adc0f2...`), with invariant totals (Goals: 4,806; Assists: 3,429; Minutes: 3,459,684).

### 4.3 Files Missing from Checkout
- **`2026-2027` dataset**: Does not exist in the repository (previously referenced in README as synthetic/projected).
- **`scripts/inject_future_seasons.py`**: Does not exist in the repository.

---

## 5. Baseline Test Execution Results

All existing test suites were executed on the clean branch:

| Suite | Command | Total Tests | Passed | Failed | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Backend Pytest** | `python -m pytest Backend/tests` | 90 | **90** | 0 | **PASS** |
| **Baseline Verification** | `python Backend/test_api_baseline.py` | 13 | **13** | 0 | **PASS** |
| **Frontend Jest** | `npm test -- --watchAll=false` (in `frontend/`) | 19 | **19** | 0 | **PASS** |

---

## 6. Safety Net Implementation

Updated [`.gitignore`](file:///d:/New%20folder%20(2)/Sports%20Analytical%20Website/.gitignore) and created [`Backend/.gitignore`](file:///d:/New%20folder%20(2)/Sports%20Analytical%20Website/Backend/.gitignore) to strictly exclude:
- Python bytecode and caches: `__pycache__/`, `*.pyc`, `*.pyo`, `*.pyd`
- Pytest caches: `.pytest_cache/`, `*/.pytest_cache/`
- Environment files: `.env`, `.env.*`, `.env.local`, `config.env`
- Virtual environments: `venv/`, `env/`, `.venv/`
- Node dependencies & builds: `node_modules/`, `build/`, `dist/`

---

## 7. Phase 0 Completion Sign-off

Phase 0 has completed without making any runtime behavioral modifications to the application. All findings have been confirmed against the live codebase, the endpoint map is established, and baseline tests are 100% green.
