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
| F12 unused dependencies | CONFIRMED | Repository source search found no imports for the seven named packages. | Phase 6 remove and verify install/build |
| F13 Tailwind/PostCSS mismatch | CONFIRMED | Frontend declares Tailwind 3 and v4 `@tailwindcss/postcss`; CRA config uses that plugin while project directives/config are v3 style. | Phase 6 retain Tailwind 3 and remove unused v4 plugin/config |
| F14 cache version / import placement | CONFIRMED | `Backend/api.py` imports `request` after registering the closure; cache tags identify the season but have no dataset version. | Phase 6 move import and add version tags/ETag |
| F15 deployment file inclusion | PARTLY | `Backend/vercel.json` explicitly includes baseline JSON and season CSV only. `.vercelignore` excludes docs/scripts/tests and spreadsheets, but does not exclude manifest/known-gap JSON. Static config does not establish what Vercel's Python tracer bundles; no deployment build was run. CSV is the runtime store, while metadata JSON is read dynamically. | Phase 5 explicitly include metadata JSON and verify the bundled-data smoke test |
| F16 wildcard CORS default | CONFIRMED | `Backend/config.py` sets `ALLOWED_ORIGINS='*'` when `CORS_ORIGINS` is missing or `*`. | Phase 6 environment-sensitive default and warning |
| F17 CI gaps | CONFIRMED | `.github/workflows/ci.yml` pushes to `main` and stale `review-and-charts`; it runs tests/build but no lint, storage parity, or dependency audits. | Phase 6 CI updates |

## Overview progression behavior

`frontend/src/App.js` requests a top player sorted by `PrgC` on every season change. The dashboard's progression panel checks for non-null `PrgC`/`PrgP` and already displays an unavailable/not-tracked message when all values are null; the unused top-progression result is still fetched and stored. Phase 5 will remove or guard that request when progression is untracked so it cannot imply a zero-valued leader.

## Notes

This phase made no season data changes. At baseline, the scatter page uses a maximum of 48 for goals and assists, and its tooltip exposes ambiguous labels. Phase 0's screenshot request could not be completed because no headless browser was installed; no browser was installed for this task.
