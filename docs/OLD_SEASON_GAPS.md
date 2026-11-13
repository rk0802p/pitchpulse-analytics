# Historical season gaps

This investigation is read-only with respect to player rows and the five analytical stores. It uses the cached Wikipedia pages and the canonical parser in `Backend/scripts/audit/crosscheck_wiki.py`.

## Grading method

A real club gap is coverage below 90% or a shortfall of at least 10 goals. COMPLETE requires league coverage of at least 96% and no real club gaps. MINOR_GAPS requires at least 92% coverage and at most three real club gaps; all other complete seasons are SIGNIFICANT_GAPS. For 2025-26, the three complete leagues are measured normally and Serie A/Ligue 1 are reported as PARTIAL_SNAPSHOT because their stored matchweek is incomplete. Own goals explain why normal coverage is below 100%.

## Per-season grades

| Season | Grade | League coverage | Clubs with gaps | Missing goals | Missing top-10 scorers |
|---|---|---:|---:|---:|---:|
| 2012-2013 | MINOR_GAPS | 96.83% | 1 | 4 | 0 |
| 2013-2014 | MINOR_GAPS | 97.12% | 1 | 6 | 0 |
| 2014-2015 | SIGNIFICANT_GAPS | 91.64% | 14 | 272 | 4 |
| 2015-2016 | MINOR_GAPS | 96.78% | 1 | 4 | 0 |
| 2016-2017 | MINOR_GAPS | 97.47% | 1 | 5 | 0 |
| 2017-2018 | MINOR_GAPS | 96.95% | 1 | 3 | 0 |
| 2018-2019 | MINOR_GAPS | 97.15% | 1 | 6 | 0 |
| 2019-2020 | MINOR_GAPS | 96.99% | 2 | 9 | 0 |
| 2020-2021 | SIGNIFICANT_GAPS | 95.60% | 6 | 88 | 1 |
| 2021-2022 | MINOR_GAPS | 96.01% | 3 | 19 | 0 |
| 2022-2023 | COMPLETE | 96.65% | 0 | 0 | 0 |
| 2023-2024 | MINOR_GAPS | 97.07% | 2 | 7 | 0 |
| 2024-2025 | MINOR_GAPS | 97.03% | 1 | 5 | 0 |
| 2025-2026 | PARTIAL_SNAPSHOT | 97.29% | 0 | 0 | 0 |

12 of 14 seasons have measurable real gaps under this rule: 2012-2013, 2013-2014, 2014-2015, 2015-2016, 2016-2017, 2017-2018, 2018-2019, 2019-2020, 2020-2021, 2021-2022, 2023-2024, 2024-2025. The likely cause is missing player-season rows in the source snapshot; the same absence is expected across CSV, parquet, XLSX, DuckDB `players`, and DuckDB `per90_metrics` because those stores are generated from the same season CSV.

## Understat archive reconciliation (follow-up)

A free player-season CSV was downloaded for review to `artifacts/understat_players_aggregated_2014_2024.csv` (SHA-256 `b78fad5f01844a0fdab0d89474dafba9b86c586d2f0ce88f0ce2c9af70d2bc64`). The [public repository and field documentation](https://github.com/vibedatascience/understat_players_aggregated) describes the archive as covering 2014/15–2024/25 and documents player, club, league, goals, games and minutes. The [downloaded raw CSV](https://raw.githubusercontent.com/vibedatascience/understat_players_aggregated/main/understat_players_aggregated_2014_2024.csv) is an Understat-based community aggregation. It is suitable as corroborating evidence, but the checks below show it is not a complete replacement dataset.

All five top-10 scorers previously marked `NOT FOUND` in the local season CSV are present in this downloaded archive with matching club, goals, games and minutes:

| Season | Player | Club | Goals | Games | Minutes | Local row |
|---|---|---|---:|---:|---:|---|
| 2014-2015 | Antoine Griezmann | Atlético Madrid | 22 | 37 | 2,490 | Not found |
| 2014-2015 | Carlos Bacca | Sevilla | 20 | 37 | 2,581 | Not found |
| 2014-2015 | Arjen Robben | Bayern Munich | 17 | 21 | 1,681 | Not found |
| 2014-2015 | Thomas Müller | Bayern Munich | 13 | 32 | 2,382 | Not found |
| 2020-2021 | Karim Benzema | Real Madrid | 23 | 34 | 2,914 | Not found |

For the 2014-15 Understat rows, league-to-Wikipedia final goals-for checks found all 20 La Liga, Serie A and Ligue 1 club keys, but three Bundesliga and four Premier League clubs had no rows. Examples of substantial remaining Understat shortfalls include Napoli (57 player goals vs 70 GF), Genoa (32 vs 62), Sampdoria (34 vs 48), Marseille (64 vs 76), and Caen (36 vs 54). In 2020-21, the archive had all 20 La Liga, Serie A and Ligue 1 club keys; however it lacked two Premier League and four Bundesliga clubs. Examples of remaining shortfalls include Newcastle United (36 vs 46), RC Strasbourg (38 vs 49), and Wolfsburg (51 vs 61). These totals do not reconcile to the final tables and cannot establish that every missing player or club record is available.

**Decision:** use these five entries as named patch candidates and independent cross-checks, not as an automatic import. Before a repair, verify the source snapshot/version and per-player club allocation, establish which player rows are genuinely absent versus mislabelled or split across clubs, and reconcile each candidate against an independent season-level source. Do not sum Understat goals into the existing dataset without row-level identity and duplicate checks. No player rows or analytical stores were changed in this follow-up.

## 2012-2013 — MINOR_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 95.58% | 26.5 | 23–32 | 0 |
| es La Liga | 97.53% | 27.5 | 22–33 | 0 |
| it Serie A | 97.51% | 30.0 | 24–38 | 0 |
| de Bundesliga | 97.22% | 26.5 | 22–33 | 1 |
| fr Ligue 1 | 96.38% | 28.0 | 24–33 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| VfB Stuttgart | de Bundesliga | 27 | 33 | 37 | 4 | 89.19% |

Missing Wikipedia top-10 scorers:

None.

## 2013-2014 — MINOR_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 95.72% | 27.5 | 23–38 | 1 |
| es La Liga | 97.61% | 26.5 | 24–33 | 0 |
| it Serie A | 97.39% | 30.0 | 26–38 | 0 |
| de Bundesliga | 97.72% | 27.0 | 21–30 | 0 |
| fr Ligue 1 | 97.21% | 28.0 | 22–36 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| Swansea City | eng Premier League | 27 | 48 | 54 | 6 | 88.89% |

Missing Wikipedia top-10 scorers:

None.

## 2014-2015 — SIGNIFICANT_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 94.56% | 27.5 | 3–33 | 1 |
| es La Liga | 82.95% | 24.5 | 3–35 | 4 |
| it Serie A | 93.26% | 28.5 | 23–38 | 4 |
| de Bundesliga | 94.07% | 25.5 | 19–31 | 2 |
| fr Ligue 1 | 93.98% | 27.0 | 22–31 | 3 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| Burnley | eng Premier League | 3 | 5 | 28 | 23 | 17.86% |
| Atlético Madrid | es La Liga | 3 | 3 | 67 | 64 | 4.48% |
| Valencia CF | es La Liga | 22 | 51 | 70 | 19 | 72.86% |
| Sevilla FC | es La Liga | 24 | 46 | 71 | 25 | 64.79% |
| Villarreal CF | es La Liga | 4 | 2 | 48 | 46 | 4.17% |
| Juventus | it Serie A | 27 | 64 | 72 | 8 | 88.89% |
| Fiorentina | it Serie A | 27 | 47 | 61 | 14 | 77.05% |
| Atalanta | it Serie A | 29 | 34 | 38 | 4 | 89.47% |
| Cagliari | it Serie A | 23 | 40 | 48 | 8 | 83.33% |
| Bayern Munich | de Bundesliga | 26 | 48 | 80 | 32 | 60.00% |
| Hamburger SV | de Bundesliga | 31 | 22 | 25 | 3 | 88.00% |
| OGC Nice | fr Ligue 1 | 24 | 26 | 44 | 18 | 59.09% |
| FC Nantes | fr Ligue 1 | 27 | 26 | 29 | 3 | 89.66% |
| Évian Thonon Gaillard | fr Ligue 1 | 28 | 36 | 41 | 5 | 87.80% |

Missing Wikipedia top-10 scorers:

| Player | Club | League | Wikipedia goals |
|---|---|---|---:|
| Antoine Griezmann | Atlético Madrid | es La Liga | 22 |
| Carlos Bacca | Sevilla | es La Liga | 20 |
| Arjen Robben | Bayern Munich | de Bundesliga | 17 |
| Thomas Müller | Bayern Munich | de Bundesliga | 13 |

### Patch candidates

The named candidates are the missing Wikipedia top-10 scorers above. A patch would require authoritative player-season totals including minutes, followed by validation against all five stores; no data was downloaded or ingested.

## 2015-2016 — MINOR_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 96.78% | 28.0 | 23–34 | 0 |
| es La Liga | 96.74% | 27.0 | 24–33 | 0 |
| it Serie A | 97.14% | 28.5 | 22–35 | 1 |
| de Bundesliga | 96.65% | 27.0 | 23–33 | 0 |
| fr Ligue 1 | 96.56% | 30.0 | 23–35 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| Carpi | it Serie A | 35 | 33 | 37 | 4 | 89.19% |

Missing Wikipedia top-10 scorers:

None.

## 2016-2017 — MINOR_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 96.71% | 27.0 | 23–33 | 0 |
| es La Liga | 97.58% | 27.0 | 22–35 | 0 |
| it Serie A | 97.60% | 29.0 | 22–34 | 1 |
| de Bundesliga | 98.18% | 26.0 | 22–32 | 0 |
| fr Ligue 1 | 97.38% | 28.5 | 25–34 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| Pescara | it Serie A | 34 | 32 | 37 | 5 | 86.49% |

Missing Wikipedia top-10 scorers:

None.

## 2017-2018 — MINOR_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 97.05% | 26.5 | 21–30 | 1 |
| es La Liga | 97.07% | 27.5 | 23–37 | 0 |
| it Serie A | 96.46% | 27.0 | 22–41 | 0 |
| de Bundesliga | 97.66% | 27.0 | 23–31 | 0 |
| fr Ligue 1 | 96.61% | 26.5 | 23–36 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| Huddersfield Town | eng Premier League | 25 | 25 | 28 | 3 | 89.29% |

Missing Wikipedia top-10 scorers:

None.

## 2018-2019 — MINOR_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 96.92% | 25.0 | 21–30 | 0 |
| es La Liga | 96.74% | 28.5 | 25–34 | 1 |
| it Serie A | 96.76% | 28.0 | 23–33 | 0 |
| de Bundesliga | 98.05% | 28.0 | 21–33 | 0 |
| fr Ligue 1 | 97.33% | 28.0 | 23–42 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| Espanyol | es La Liga | 27 | 42 | 48 | 6 | 87.50% |

Missing Wikipedia top-10 scorers:

None.

## 2019-2020 — MINOR_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 96.42% | 26.0 | 21–30 | 1 |
| es La Liga | 97.66% | 28.5 | 25–32 | 0 |
| it Serie A | 97.05% | 30.5 | 25–34 | 0 |
| de Bundesliga | 97.15% | 27.5 | 24–32 | 0 |
| fr Ligue 1 | 96.59% | 27.0 | 23–31 | 1 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| Brighton & Hove Albion | eng Premier League | 25 | 35 | 39 | 4 | 89.74% |
| FC Nantes | fr Ligue 1 | 29 | 23 | 28 | 5 | 82.14% |

Missing Wikipedia top-10 scorers:

None.

## 2020-2021 — SIGNIFICANT_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 96.09% | 27.0 | 22–30 | 0 |
| es La Liga | 90.45% | 29.0 | 22–34 | 3 |
| it Serie A | 96.82% | 30.0 | 25–42 | 1 |
| de Bundesliga | 96.66% | 27.0 | 23–42 | 2 |
| fr Ligue 1 | 97.52% | 29.0 | 21–40 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| Real Madrid | es La Liga | 25 | 30 | 67 | 37 | 44.78% |
| FC Barcelona | es La Liga | 22 | 74 | 85 | 11 | 87.06% |
| Valencia CF | es La Liga | 24 | 31 | 50 | 19 | 62.00% |
| Hellas Verona | it Serie A | 32 | 38 | 46 | 8 | 82.61% |
| Eintracht Frankfurt | de Bundesliga | 24 | 59 | 69 | 10 | 85.51% |
| Arminia Bielefeld | de Bundesliga | 26 | 23 | 26 | 3 | 88.46% |

Missing Wikipedia top-10 scorers:

| Player | Club | League | Wikipedia goals |
|---|---|---|---:|
| Karim Benzema | Real Madrid | es La Liga | 23 |

### Patch candidates

The named candidates are the missing Wikipedia top-10 scorers above. A patch would require authoritative player-season totals including minutes, followed by validation against all five stores; no data was downloaded or ingested.

## 2021-2022 — MINOR_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 95.52% | 26.0 | 22–30 | 2 |
| es La Liga | 96.85% | 26.0 | 21–31 | 0 |
| it Serie A | 95.32% | 28.0 | 25–34 | 1 |
| de Bundesliga | 96.33% | 27.0 | 23–31 | 0 |
| fr Ligue 1 | 96.16% | 26.0 | 23–34 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| Crystal Palace | eng Premier League | 22 | 42 | 50 | 8 | 84.00% |
| Southampton | eng Premier League | 24 | 35 | 43 | 8 | 81.40% |
| Genoa | it Serie A | 33 | 24 | 27 | 3 | 88.89% |

Missing Wikipedia top-10 scorers:

None.

## 2022-2023 — COMPLETE

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 95.85% | 28.0 | 24–36 | 0 |
| es La Liga | 96.75% | 29.0 | 25–38 | 0 |
| it Serie A | 96.82% | 30.0 | 24–40 | 0 |
| de Bundesliga | 97.43% | 28.0 | 25–35 | 0 |
| fr Ligue 1 | 96.53% | 29.5 | 26–36 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| None | — | — | — | — | — | — |

Missing Wikipedia top-10 scorers:

None.

## 2023-2024 — MINOR_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 96.07% | 29.5 | 25–35 | 1 |
| es La Liga | 97.21% | 29.5 | 25–40 | 0 |
| it Serie A | 97.58% | 30.0 | 22–39 | 1 |
| de Bundesliga | 97.46% | 28.5 | 22–34 | 0 |
| fr Ligue 1 | 97.34% | 29.5 | 25–38 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| Sheffield United | eng Premier League | 35 | 31 | 35 | 4 | 88.57% |
| Empoli | it Serie A | 34 | 26 | 29 | 3 | 89.66% |

Missing Wikipedia top-10 scorers:

None.

## 2024-2025 — MINOR_GAPS

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 97.04% | 29.0 | 23–36 | 0 |
| es La Liga | 97.39% | 30.0 | 24–38 | 0 |
| it Serie A | 96.20% | 31.5 | 26–38 | 1 |
| de Bundesliga | 97.39% | 27.0 | 23–35 | 0 |
| fr Ligue 1 | 97.15% | 30.5 | 27–35 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| Como | it Serie A | 38 | 44 | 49 | 5 | 89.80% |

Missing Wikipedia top-10 scorers:

None.

## 2025-2026 — PARTIAL_SNAPSHOT

League reference row counts:

| League | Coverage | Median rows/club | Observed row range | Clubs with gaps |
|---|---:|---:|---:|---:|
| eng Premier League | 96.17% | 27.5 | 22–32 | 0 |
| es La Liga | 97.75% | 30.5 | 24–36 | 0 |
| it Serie A | 84.18% vs reached | 20.5 | 10–27 | 0 |
| de Bundesliga | 97.98% | 28.0 | 24–32 | 0 |
| fr Ligue 1 | 81.16% vs reached | 20.5 | 14–28 | 0 |

Clubs with real gaps:

| Club | League | Rows | Data goals | Wikipedia GF | Shortfall | Coverage |
|---|---|---:|---:|---:|---:|---:|
| None | — | — | — | — | — | — |

Missing Wikipedia top-10 scorers:

None.
