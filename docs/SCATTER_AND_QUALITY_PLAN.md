# Scatter and Data Quality Implementation Plan

## Phase 0 baseline

Branch: `codex/scatter-and-quality`  
Baseline commit/tag: `4991f61762d8803ab21a8568c468d2185b3f48dd` / `pre-scatter-quality`

Backend tests: 139 passed and 9 subtests passed. Baseline verifier: 13 tests passed. Frontend: 6 suites and 38 tests passed. Production build compiled; warnings noted in the terminal were stale `baseline-browser-mapping` and Browserslist/caniuse-lite data. The build reported 107.57 KB gzipped JavaScript and 8.49 KB gzipped CSS. A headless browser package and browser executable were not available, so reference screenshots were not captured.

| Finding | Status | Evidence | Planned change |
|---|---|---|---|
| F1 fixed Gls/Ast axes | CONFIRMED | `frontend/src/components/charts/PlotAnyMetricView.js` passes 8-step and 48 maximum props; `ScatterPlot.test.js` asserts both. | Phase 2 dynamic domains |
| F2 ambiguous tooltip labels | CONFIRMED | `ScatterPlot.js` tooltip derives labels using the first space-delimited word from `xLabel`/`yLabel`. | Phase 2 metric short labels and complete metadata |
| F3 exact highlight matching | CONFIRMED | `ScatterPlot.js` compares lowercased full names for equality. | Phase 3 normalized partial search and pinning |
| F4 PNG export styling/context | CONFIRMED | `utils/chartMath.js` serializes the live SVG and paints it without inlining its class/CSS variable styles or page context. | Phase 4 export rewrite |
| F5 request churn and chart flicker | CONFIRMED | `PlotAnyMetricView.js` requests on every filter update, clears `chartData`, and only suppresses stale responses. | Phase 1 debounce, abort, stale-while-revalidate |
| F6 query hash routing/history | CONFIRMED | `App.js` tab parser treats `?x=...` as part of the tab; the scatter view assigns `location.hash` on each control update. | Phase 1 hash utility and replaceState |
| F7 incomplete quadrant mapping | CONFIRMED | `PlotAnyMetricView.js` supplies labels for three hard-coded pairs only. | Phase 3 quadrant map and toggle |
| F8 scope mismatch | CONFIRMED | `AppLayout.js` displays global competition while `PlotAnyMetricView.js` has a separate filter and labels season as “Volume”. | Phase 2 unified scope and header handling |
| F9 chart accessibility | CONFIRMED | `ScatterPlot.js` uses `role="img"` while placing a focusable button hitbox on each point; result status is not announced consistently. | Phases 1 and 3 |
| F10 overlapping dots | CONFIRMED | Points are projected at their exact coordinates; no deterministic overlap adjustment is applied. | Phase 3 optional deterministic jitter |
| F11 data-quality metadata not surfaced | CONFIRMED | Season service exposes `known_gaps`, but frontend does not consume it; 2025-26 manifest has prose rather than structured partial/untracked metadata. | Phase 5 additive metadata and UI |
| F12 unused dependencies | FIXED | Eight unused packages were removed from the frontend dependency manifest and lockfile after a repository-wide source search. | Removed in Phase 6; validated with clean install, tests, and build |
| F13 Tailwind/PostCSS mismatch | FIXED | Tailwind 3 remains; the unused Tailwind v4 plugin and custom PostCSS config were removed so CRA uses its supported Tailwind 3 integration. | Fixed in Phase 6 |
| F14 cache version / import placement | FIXED | `request` is imported at module scope; cacheable API responses carry a SHA-256 version derived from season manifest contents, ETag, and versioned cache tag. | Fixed and covered by runtime tests |
| F15 deployment file inclusion | PARTLY | `Backend/vercel.json` explicitly includes season CSV and JSON files; `.vercelignore` excludes docs/scripts/tests and spreadsheets. Static config confirms intended inclusion, but a Vercel bundle/deployment smoke test was not run. | Runtime reads are covered locally; deployment packaging still needs a Vercel build check |
| F16 wildcard CORS default | FIXED | Wildcard is retained only for development/testing; production with unset or wildcard configuration falls back to restricted local origins and logs a warning. | Fixed and covered by config tests |
| F17 CI gaps | FIXED | CI now includes `codex/**`, frontend lint, parity for 2024/25 and 2025/26, and advisory Python/npm dependency audits. | Fixed in Phase 6 |

## Overview progression behavior

`frontend/src/App.js` skips the top-player request sorted by `PrgC` when season metadata marks progression untracked. The dashboard's progression panel checks for non-null `PrgC`/`PrgP` and displays an unavailable/not-tracked message when all values are null.

## Notes

This phase made no season data changes. At baseline, the scatter page uses a maximum of 48 for goals and assists, and its tooltip exposes ambiguous labels. Phase 0's screenshot request could not be completed because no headless browser was installed; no browser was installed for this task.

## Phase completion record

- Phase 1: deep-link parsing, debounced requests, abort handling, and stale-response protection.
- Phase 2: metric-aware domains, readable axis labels, metric-rich tooltips, and reduced-motion-aware transitions.
- Phase 3: one responsive labelled toolbar, reset action, accessible point interaction, overlap controls, and quadrant labels.
- Phase 4: context-rich PNG export and clipboard support where available.
- Phase 5: additive season quality metadata and the opt-in `lock=1` all-season scatter range API/UI.
- Phase 6: dependency/PostCSS cleanup, data-version cache headers, production CORS restriction, CI checks, and deployment documentation.

Phase 5 and Phase 6 changed metadata/configuration and application code only. No player data rows or storage copies were modified in these phases.
