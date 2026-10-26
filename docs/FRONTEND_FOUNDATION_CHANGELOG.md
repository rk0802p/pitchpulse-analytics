# Phase 3: Frontend Foundation & Design System Changelog

This document details the frontend architecture modernization, dark analytical design system, reusable component library, centralized API client, and client-side routing implemented in Phase 3.

---

## 1. Visual System & Dark Analytical Workspace

- **Design Philosophy:** Replaced the generic gray cards, hover scaling, and non-existent grass background textures with a dark analytical workspace inspired by professional club intelligence tools (StatsBomb/Opta style).
- **Surface Palette:**
  - Background surface: `#0d131f` / `#080c14` (Pitch Dark)
  - Card containers: `#131c2e` with subtle `#1e293b` borders and hover effects
  - Tech Accent: Emerald green `#10b981` (football pitch modern tech green)
  - Secondary accents: Blue (`#3b82f6`) for playmaking, Purple (`#8b5cf6`) for progression, Amber (`#f59e0b`) for discipline, Rose (`#f43f5e`) for scoring.
- **CSS Consolidation:** Deleted duplicate `PlayerCardStyles.css` and unified all card styles in `PlayerCard.css`.
- **Branding Assets:** Added fallback club crest initials in `TeamBadge.js` to eliminate broken `<img>` tags from missing logo URLs.

---

## 2. Reusable Component Suite

Created a modular component architecture under `frontend/src/components/`:

```
frontend/src/components/
├── common/
│   ├── StatCard.js          # KPI stat cards with accent badges, trend formatting, and icons
│   ├── PageHeader.js        # Section headers with season badges, competition tags, and action buttons
│   ├── FilterBar.js         # Search input, competition selector, position pills, min minutes presets, reset
│   ├── DataTable.js         # Sortable dense analytics table, position badges, finishing deltas, pagination
│   ├── ChartPanel.js        # Visualization card container with metric controllers and legend
│   ├── LoadingSkeleton.js   # Animated shimmer skeletons for cards, tables, and grids
│   ├── EmptyState.js        # Clean empty-state view with icon and reset filters button
│   └── ErrorBanner.js       # Non-intrusive error banner with retry triggers
├── layout/
│   └── AppLayout.js         # Responsive sidebar, mobile drawer, API health pill, season badge
├── LeagueBanner.js          # Modernized competition selection cards with country pills
├── TeamBadge.js             # Club badges with automatic SVG crest fallbacks
└── PlayerCard.js            # 3D interactive flip cards with xG, xAG, PrgC, PrgP and deep link actions
```

---

## 3. Centralized API Client (`frontend/src/services/api.js`)

- **Environment Configurable:** Uses `process.env.REACT_APP_API_URL` with a local development fallback (`http://127.0.0.1:5000/api`).
- **Robust Error Handling:** Checks `response.ok` before parsing JSON and produces structured `ApiError` instances.
- **Typed Endpoints:**
  - `getHealth()`, `getMetadata()`, `getMetrics()`
  - `getCompetitions()`, `getTeams(comp)`
  - `getPlayers(params)` with search, filters, sorting, and pagination
  - `getPlayer(id)` for deep profile dossiers
  - `comparePlayers(ids)` for side-by-side matrices
  - `getLeaderboards(params)` for position/minute filtered rankings
  - Legacy methods (`getLegacyLeagues()`, `getLegacyTeams()`, `getLegacyPlayersByTeam()`)

---

## 4. Primary Application Views

`App.js` unites all 5 core analytical views with browser history hash synchronization:
1. **Overview Dashboard (`#dashboard`):** Headline metrics, monitored competitions, top scorers (Goals vs xG), and quick-action links.
2. **Player Explorer (`#explorer`):** Search by player or squad, filter by competition, position, and minutes threshold, with sortable `DataTable` and pagination.
3. **Statistical Leaderboards (`#leaderboards`):** Rankings across Goals, xG, Overperformance (`Gls - xG`), Assists, xAG, Progressive Passes, Progressive Carries, and Minutes.
4. **Player Comparison (`#compare`):** Multi-player side-by-side comparison workspace with metric benchmark table.
5. **Squad Browser (`#browse`):** Modernized classic league -> team -> 3D player card flow.
6. **Player Profile (`#profile/:id`):** Deep player dossier showing scoring, playmaking, expected metrics, progression, and standardized per-90 rates.

---

## 5. Verification & Tests

- **Unit Tests:** `PASS src/App.test.js` (4/4 passed in CI mode).
- **Production Build:** `npm run build` compiled successfully (`74.11 kB` JS bundle, `5.68 kB` CSS).
