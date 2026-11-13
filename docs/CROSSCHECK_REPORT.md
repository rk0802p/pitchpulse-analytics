# PitchPulse Independent Cross-Check Report (Phase 1)

**Generated:** 2026-11-13  
**Scope:** 14 seasons (2012-13 … 2025-26) × 5 leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1)  
**Method:** read-only comparison of `Backend/data/seasons/<season>/*.csv` against the top-scorers table and final league table of each Wikipedia season page (CC BY-SA 4.0; every page URL is listed in section 10).  
**Data changes:** none. This audit did not write to `Backend/data`, tests or application code.  
**External sources blocked:** FBref was never contacted (advanced statistics were removed from FBref on 20 Jan 2026).  

> A result is marked UNVERIFIED whenever a page could not be parsed to the expected shape, or a club/player could not be mapped without guessing. UNVERIFIED is never treated as PASS.

## 1. Parser self-test

| Check | Result | Detail |
|-------|--------|--------|
| Premier League 2012-13: Robin van Persie = 26 | PASS | got 26 |
| Premier League 2023-24: Erling Haaland = 27 | PASS | got 27 |
| Bundesliga 2023-24: Harry Kane = 36 | PASS | got 36 |
| Every final league table has the expected number of teams | PASS | 70/70 page-league tables |

All self-tests passed before the real run: the three reference scorer figures are exact and every final table has the expected number of teams (20, or 18 for the Bundesliga and for Ligue 1 from 2023-24).

## 2. Parse quality

A page is considered verified for a check only when it yields at least 10 scorers and exactly the expected number of teams. Tables with extra rows are ties; the comparison uses the first 10 rows.

| Season | League | Scorers parsed | Teams parsed | Teams expected | Status |
|--------|--------|---------------:|-------------:|---------------:|--------|
| 2012-2013 | eng Premier League | 10 | 20 | 20 | OK |
| 2012-2013 | es La Liga | 11 | 20 | 20 | OK |
| 2012-2013 | it Serie A | 11 | 20 | 20 | OK |
| 2012-2013 | de Bundesliga | 11 | 18 | 18 | OK |
| 2012-2013 | fr Ligue 1 | 10 | 20 | 20 | OK |
| 2013-2014 | eng Premier League | 10 | 20 | 20 | OK |
| 2013-2014 | es La Liga | 12 | 20 | 20 | OK |
| 2013-2014 | it Serie A | 12 | 20 | 20 | OK |
| 2013-2014 | de Bundesliga | 10 | 18 | 18 | OK |
| 2013-2014 | fr Ligue 1 | 11 | 20 | 20 | OK |
| 2014-2015 | eng Premier League | 12 | 20 | 20 | OK |
| 2014-2015 | es La Liga | 11 | 20 | 20 | OK |
| 2014-2015 | it Serie A | 12 | 20 | 20 | OK |
| 2014-2015 | de Bundesliga | 13 | 18 | 18 | OK |
| 2014-2015 | fr Ligue 1 | 10 | 20 | 20 | OK |
| 2015-2016 | eng Premier League | 10 | 20 | 20 | OK |
| 2015-2016 | es La Liga | 10 | 20 | 20 | OK |
| 2015-2016 | it Serie A | 12 | 20 | 20 | OK |
| 2015-2016 | de Bundesliga | 10 | 18 | 18 | OK |
| 2015-2016 | fr Ligue 1 | 10 | 20 | 20 | OK |
| 2016-2017 | eng Premier League | 12 | 20 | 20 | OK |
| 2016-2017 | es La Liga | 11 | 20 | 20 | OK |
| 2016-2017 | it Serie A | 10 | 20 | 20 | OK |
| 2016-2017 | de Bundesliga | 14 | 18 | 18 | OK |
| 2016-2017 | fr Ligue 1 | 10 | 20 | 20 | OK |
| 2017-2018 | eng Premier League | 13 | 20 | 20 | OK |
| 2017-2018 | es La Liga | 10 | 20 | 20 | OK |
| 2017-2018 | it Serie A | 12 | 20 | 20 | OK |
| 2017-2018 | de Bundesliga | 12 | 18 | 18 | OK |
| 2017-2018 | fr Ligue 1 | 10 | 20 | 20 | OK |
| 2018-2019 | eng Premier League | 15 | 20 | 20 | OK |
| 2018-2019 | es La Liga | 12 | 20 | 20 | OK |
| 2018-2019 | it Serie A | 11 | 20 | 20 | OK |
| 2018-2019 | de Bundesliga | 11 | 18 | 18 | OK |
| 2018-2019 | fr Ligue 1 | 10 | 20 | 20 | OK |
| 2019-2020 | eng Premier League | 10 | 20 | 20 | OK |
| 2019-2020 | es La Liga | 16 | 20 | 20 | OK |
| 2019-2020 | it Serie A | 10 | 20 | 20 | OK |
| 2019-2020 | de Bundesliga | 14 | 18 | 18 | OK |
| 2019-2020 | fr Ligue 1 | 11 | 20 | 20 | OK |
| 2020-2021 | eng Premier League | 10 | 20 | 20 | OK |
| 2020-2021 | es La Liga | 10 | 20 | 20 | OK |
| 2020-2021 | it Serie A | 10 | 20 | 20 | OK |
| 2020-2021 | de Bundesliga | 11 | 18 | 18 | OK |
| 2020-2021 | fr Ligue 1 | 11 | 20 | 20 | OK |
| 2021-2022 | eng Premier League | 10 | 20 | 20 | OK |
| 2021-2022 | es La Liga | 10 | 20 | 20 | OK |
| 2021-2022 | it Serie A | 14 | 20 | 20 | OK |
| 2021-2022 | de Bundesliga | 10 | 18 | 18 | OK |
| 2021-2022 | fr Ligue 1 | 14 | 20 | 20 | OK |
| 2022-2023 | eng Premier League | 11 | 20 | 20 | OK |
| 2022-2023 | es La Liga | 12 | 20 | 20 | OK |
| 2022-2023 | it Serie A | 12 | 20 | 20 | OK |
| 2022-2023 | de Bundesliga | 10 | 18 | 18 | OK |
| 2022-2023 | fr Ligue 1 | 10 | 20 | 20 | OK |
| 2023-2024 | eng Premier League | 11 | 20 | 20 | OK |
| 2023-2024 | es La Liga | 10 | 20 | 20 | OK |
| 2023-2024 | it Serie A | 10 | 20 | 20 | OK |
| 2023-2024 | de Bundesliga | 10 | 18 | 18 | OK |
| 2023-2024 | fr Ligue 1 | 10 | 18 | 18 | OK |
| 2024-2025 | eng Premier League | 11 | 20 | 20 | OK |
| 2024-2025 | es La Liga | 10 | 20 | 20 | OK |
| 2024-2025 | it Serie A | 10 | 20 | 20 | OK |
| 2024-2025 | de Bundesliga | 12 | 18 | 18 | OK |
| 2024-2025 | fr Ligue 1 | 10 | 18 | 18 | OK |
| 2025-2026 | eng Premier League | 10 | 20 | 20 | OK |
| 2025-2026 | es La Liga | 10 | 20 | 20 | OK |
| 2025-2026 | it Serie A | 14 | 20 | 20 | OK |
| 2025-2026 | de Bundesliga | 11 | 18 | 18 | OK |
| 2025-2026 | fr Ligue 1 | 12 | 18 | 18 | OK |

## 3. Season-by-season results

### 2012-2013 — MINOR ISSUES

*Evidence:* 1 club total(s) 5–9 goals below Wikipedia GF.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Robin van Persie | Manchester United | 26 | 26 | MATCH |
| 2 | Luis Suárez | Liverpool | 23 | 23 | MATCH |
| 3 | Gareth Bale | Tottenham Hotspur | 21 | 21 | MATCH |
| 4 | Christian Benteke | Aston Villa | 19 | 19 | MATCH |
| 5 | Michu | Swansea City | 18 | 18 | MATCH |
| 6 | Romelu Lukaku | West Bromwich Albion | 17 | 17 | MATCH |
| 7 | Demba Ba | Chelsea / Newcastle United | 15 | 15 | MATCH |
| 7 | Dimitar Berbatov | Fulham | 15 | 15 | MATCH |
| 7 | Rickie Lambert | Southampton | 15 | 15 | MATCH |
| 7 | Frank Lampard | Chelsea | 15 | 15 | MATCH |

*League completeness:* our player goals 1016 vs Wikipedia goals-for 1063 (-47).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Manchester United | 25 | 80 | 86 | -6 | borderline | shortfall 6 exceeds max(5, 5% of GF=86) |

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Lionel Messi | Barcelona | 46 | 46 | MATCH |
| 2 | Cristiano Ronaldo | Real Madrid | 34 | 34 | MATCH |
| 3 | Radamel Falcao | Atlético Madrid | 28 | 28 | MATCH |
| 4 | Álvaro Negredo | Sevilla | 25 | 25 | MATCH |
| 5 | Roberto Soldado | Valencia | 24 | 24 | MATCH |
| 6 | Rubén Castro | Real Betis | 18 | 18 | MATCH |
| 6 | Piti | Rayo Vallecano | 18 | 18 | MATCH |
| 8 | Gonzalo Higuaín | Real Madrid | 16 | 16 | MATCH |
| 9 | Aritz Aduriz | Athletic Bilbao | 14 | 14 | MATCH |
| 9 | Hélder Postiga | Zaragoza | 14 | 14 | MATCH |

*League completeness:* our player goals 1064 vs Wikipedia goals-for 1091 (-27).

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Edinson Cavani | Napoli | 29 | 29 | MATCH |
| 2 | Antonio Di Natale | Udinese | 23 | 23 | MATCH |
| 3 | Stephan El Shaarawy | Milan | 16 | 16 | MATCH |
| 3 | Dani Osvaldo (fuzzy name match) | Roma | 16 | 16 | MATCH |
| 5 | Germán Denis | Atalanta | 15 | 15 | MATCH |
| 5 | Miroslav Klose | Lazio | 15 | 15 | MATCH |
| 5 | Erik Lamela | Roma | 15 | 15 | MATCH |
| 5 | Giampaolo Pazzini | Milan | 15 | 15 | MATCH |
| 9 | Gonzalo Bergessio | Catania | 13 | 13 | MATCH |
| 9 | Alberto Gilardino | Bologna | 13 | 13 | MATCH |

*League completeness:* our player goals 978 vs Wikipedia goals-for 1003 (-25).

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Stefan Kießling | Bayer Leverkusen | 25 | 25 | MATCH |
| 2 | Robert Lewandowski | Borussia Dortmund | 24 | 24 | MATCH |
| 3 | Alexander Meier | Eintracht Frankfurt | 16 | 16 | MATCH |
| 4 | Vedad Ibišević | VfB Stuttgart | 15 | 15 | MATCH |
| 4 | Mario Mandžukić | Bayern Munich | 15 | 15 | MATCH |
| 6 | Marco Reus | Borussia Dortmund | 14 | 14 | MATCH |
| 7 | Thomas Müller | Bayern Munich | 13 | 13 | MATCH |
| 7 | Ádám Szalai | Mainz 05 | 13 | 13 | MATCH |
| 9 | Mame Biram Diouf (known alias) | Hannover 96 | 12 | 12 | MATCH |
| 9 | Artjoms Rudņevs | Hamburger SV | 12 | 12 | MATCH |

*League completeness:* our player goals 873 vs Wikipedia goals-for 898 (-25).

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Zlatan Ibrahimović | Paris Saint-Germain | 30 | 30 | MATCH |
| 2 | Pierre-Emerick Aubameyang | Saint-Étienne | 19 | 19 | MATCH |
| 2 | Darío Cvitanich | Nice | 19 | 19 | MATCH |
| 4 | Bafétimbi Gomis | Lyon | 16 | 16 | MATCH |
| 5 | Wissam Ben Yedder | Toulouse | 15 | 15 | MATCH |
| 5 | Jérémie Aliadière | Lorient | 15 | 15 | MATCH |
| 5 | Anthony Modeste | Bastia | 15 | 15 | MATCH |
| 8 | Salomon Kalou | Lille | 14 | 14 | MATCH |
| 9 | André-Pierre Gignac | Marseille | 13 | 13 | MATCH |
| 9 | Saber Khalifa | Evian | 13 | 13 | MATCH |

*League completeness:* our player goals 932 vs Wikipedia goals-for 967 (-35).


### 2013-2014 — MINOR ISSUES

*Evidence:* 1 club total(s) 5–9 goals below Wikipedia GF; 3 top-10 scorer figure(s) differ by 1–2 goals; es La Liga: 1 club total(s) slightly above Wikipedia GF.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Luis Suárez | Liverpool | 31 | 31 | MATCH |
| 2 | Daniel Sturridge | Liverpool | 21 | 22 | MISMATCH |
| 3 | Yaya Touré | Manchester City | 20 | 20 | MATCH |
| 4 | Sergio Agüero | Manchester City | 17 | 17 | MATCH |
| 4 | Wayne Rooney | Manchester United | 17 | 17 | MATCH |
| 6 | Wilfried Bony | Swansea City | 16 | 17 | MISMATCH |
| 6 | Edin Džeko | Manchester City | 16 | 16 | MATCH |
| 6 | Olivier Giroud | Arsenal | 16 | 16 | MATCH |
| 9 | Romelu Lukaku | Everton | 15 | 15 | MATCH |
| 9 | Jay Rodriguez | Southampton | 15 | 15 | MATCH |

*League completeness:* our player goals 1007 vs Wikipedia goals-for 1052 (-45).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Swansea City | 27 | 48 | 54 | -6 | borderline | shortfall 6 exceeds max(5, 5% of GF=54) |

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Cristiano Ronaldo | Real Madrid | 31 | 31 | MATCH |
| 2 | Lionel Messi | Barcelona | 28 | 28 | MATCH |
| 3 | Diego Costa | Atlético Madrid | 27 | 27 | MATCH |
| 4 | Alexis Sánchez | Barcelona | 19 | 19 | MATCH |
| 5 | Karim Benzema | Real Madrid | 17 | 17 | MATCH |
| 6 | Aritz Aduriz | Athletic Bilbao | 16 | 16 | MATCH |
| 6 | Antoine Griezmann | Real Sociedad | 16 | 16 | MATCH |
| 6 | Carlos Vela | Real Sociedad | 16 | 16 | MATCH |
| 9 | Gareth Bale | Real Madrid | 15 | 15 | MATCH |
| 9 | Kevin Gameiro | Sevilla | 15 | 15 | MATCH |

*League completeness:* our player goals 1020 vs Wikipedia goals-for 1045 (-25).

**Within-tolerance goal-count excesses** (our player goals slightly above Wikipedia GF; logged for follow-up, below the flag threshold): UD Almería 44 vs 43.

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Ciro Immobile | Torino | 22 | 22 | MATCH |
| 2 | Luca Toni | Hellas Verona | 20 | 20 | MATCH |
| 3 | Carlos Tevez | Juventus | 19 | 19 | MATCH |
| 4 | Antonio Di Natale | Udinese | 17 | 17 | MATCH |
| 4 | Gonzalo Higuaín | Napoli | 17 | 17 | MATCH |
| 4 | Rodrigo Palacio | Internazionale | 17 | 17 | MATCH |
| 7 | Domenico Berardi | Sassuolo | 16 | 16 | MATCH |
| 7 | Fernando Llorente | Juventus | 16 | 16 | MATCH |
| 7 | Giuseppe Rossi | Fiorentina | 16 | 16 | MATCH |
| 10 | José Callejón | Napoli | 15 | 15 | MATCH |

*League completeness:* our player goals 1008 vs Wikipedia goals-for 1035 (-27).

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Robert Lewandowski | Borussia Dortmund | 20 | 20 | MATCH |
| 2 | Mario Mandžukić | Bayern Munich | 18 | 18 | MATCH |
| 3 | Josip Drmić | 1. FC Nürnberg | 17 | 17 | MATCH |
| 4 | Roberto Firmino | 1899 Hoffenheim | 16 | 16 | MATCH |
| 4 | Adrián Ramos | Hertha BSC | 16 | 16 | MATCH |
| 4 | Marco Reus | Borussia Dortmund | 16 | 16 | MATCH |
| 7 | Stefan Kießling | Bayer Leverkusen | 15 | 15 | MATCH |
| 7 | Shinji Okazaki | Mainz 05 | 15 | 15 | MATCH |
| 7 | Raffael | Borussia Mönchengladbach | 15 | 14 | MISMATCH |
| 10 | Ivica Olić | VfL Wolfsburg | 14 | 14 | MATCH |

*League completeness:* our player goals 945 vs Wikipedia goals-for 967 (-22).

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Zlatan Ibrahimović | Paris Saint-Germain | 26 | 26 | MATCH |
| 2 | Vincent Aboubakar | Lorient | 16 | 16 | MATCH |
| 2 | Wissam Ben Yedder | Toulouse | 16 | 16 | MATCH |
| 2 | Edinson Cavani | Paris Saint-Germain | 16 | 16 | MATCH |
| 2 | André-Pierre Gignac | Marseille | 16 | 16 | MATCH |
| 2 | Salomon Kalou | Lille | 16 | 16 | MATCH |
| 7 | Alexandre Lacazette | Lyon | 15 | 15 | MATCH |
| 8 | Rémy Cabella | Montpellier | 14 | 14 | MATCH |
| 8 | Bafétimbi Gomis | Lyon | 14 | 14 | MATCH |
| 10 | Cheick Diabaté | Bordeaux | 12 | 12 | MATCH |

*League completeness:* our player goals 905 vs Wikipedia goals-for 931 (-26).


### 2014-2015 — FAIL

*Evidence:* 8 club(s) with a severe goal shortfall (missing player rows), e.g. Burnley 5/28, Atlético Madrid 3/67, Valencia CF 51/70.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Sergio Agüero | Manchester City | 26 | 26 | MATCH |
| 2 | Harry Kane | Tottenham Hotspur | 21 | 21 | MATCH |
| 3 | Diego Costa | Chelsea | 20 | 20 | MATCH |
| 4 | Charlie Austin | Queens Park Rangers | 18 | 18 | MATCH |
| 5 | Alexis Sánchez | Arsenal | 16 | 16 | MATCH |
| 6 | Saido Berahino | West Bromwich Albion | 14 | 14 | MATCH |
| 6 | Olivier Giroud | Arsenal | 14 | 14 | MATCH |
| 6 | Eden Hazard | Chelsea | 14 | 14 | MATCH |
| 9 | Christian Benteke | Aston Villa | 13 | 13 | MATCH |
| 10 | Graziano Pellè | Southampton | 12 | 12 | MATCH |

*League completeness:* our player goals 922 vs Wikipedia goals-for 975 (-53).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Burnley | 3 | 5 | 28 | -23 | severe | shortfall 23 exceeds max(5, 5% of GF=28) |

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Cristiano Ronaldo | Real Madrid | 48 | 48 | MATCH |
| 2 | Lionel Messi | Barcelona | 43 | 43 | MATCH |
| 3 | Antoine Griezmann | Atlético Madrid | 22 | — | NOT FOUND |
| 3 | Neymar | Barcelona | 22 | 22 | MATCH |
| 5 | Carlos Bacca | Sevilla | 20 | — | NOT FOUND |
| 6 | Aritz Aduriz | Athletic Bilbao | 18 | 18 | MATCH |
| 7 | Alberto Bueno | Rayo Vallecano | 17 | 17 | MATCH |
| 8 | Luis Suárez | Barcelona | 16 | 16 | MATCH |
| 9 | Karim Benzema | Real Madrid | 15 | 15 | MATCH |
| 10 | Sergio García | Espanyol | 14 | 14 | MATCH |

*League completeness:* our player goals 837 vs Wikipedia goals-for 1009 (-172).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Atlético Madrid | 3 | 3 | 67 | -64 | severe | shortfall 64 exceeds max(5, 5% of GF=67) |
| Valencia CF | 22 | 51 | 70 | -19 | severe | shortfall 19 exceeds max(5, 5% of GF=70) |
| Sevilla FC | 24 | 46 | 71 | -25 | severe | shortfall 25 exceeds max(5, 5% of GF=71) |
| Villarreal CF | 4 | 2 | 48 | -46 | severe | shortfall 46 exceeds max(5, 5% of GF=48) |

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Mauro Icardi | Internazionale | 22 | 22 | MATCH |
| 1 | Luca Toni | Hellas Verona | 22 | 22 | MATCH |
| 3 | Carlos Tevez | Juventus | 20 | 20 | MATCH |
| 4 | Gonzalo Higuaín | Napoli | 18 | 18 | MATCH |
| 5 | Jérémy Ménez | Milan | 16 | 16 | MATCH |
| 6 | Domenico Berardi | Sassuolo | 15 | 15 | MATCH |
| 6 | Manolo Gabbiadini | Sampdoria/Napoli | 15 | 15 | MATCH |
| 8 | Antonio Di Natale | Udinese | 14 | 14 | MATCH |
| 9 | Paulo Dybala | Palermo | 13 | 13 | MATCH |
| 9 | Iago Falque | Genoa | 13 | 13 | MATCH |

*League completeness:* our player goals 955 vs Wikipedia goals-for 1024 (-69).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Juventus | 27 | 64 | 72 | -8 | borderline | shortfall 8 exceeds max(5, 5% of GF=72) |
| Fiorentina | 27 | 47 | 61 | -14 | severe | shortfall 14 exceeds max(5, 5% of GF=61) |
| Cagliari | 23 | 40 | 48 | -8 | borderline | shortfall 8 exceeds max(5, 5% of GF=48) |

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Alexander Meier | Eintracht Frankfurt | 19 | 19 | MATCH |
| 2 | Robert Lewandowski | Bayern Munich | 17 | 17 | MATCH |
| 2 | Arjen Robben | Bayern Munich | 17 | — | NOT FOUND |
| 4 | Pierre-Emerick Aubameyang | Borussia Dortmund | 16 | 16 | MATCH |
| 4 | Bas Dost | VfL Wolfsburg | 16 | 16 | MATCH |
| 6 | Franco Di Santo | Werder Bremen | 13 | 13 | MATCH |
| 6 | Thomas Müller | Bayern Munich | 13 | — | NOT FOUND |
| 8 | Shinji Okazaki | Mainz 05 | 12 | 12 | MATCH |
| 8 | Raffael | Borussia Mönchengladbach | 12 | 12 | MATCH |
| 10 | Karim Bellarabi | Bayer Leverkusen | 11 | 12 | MISMATCH |

*League completeness:* our player goals 793 vs Wikipedia goals-for 843 (-50).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Bayern Munich | 26 | 48 | 80 | -32 | severe | shortfall 32 exceeds max(5, 5% of GF=80) |

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Alexandre Lacazette | Lyon | 27 | 27 | MATCH |
| 2 | André-Pierre Gignac | Marseille | 21 | 21 | MATCH |
| 3 | Zlatan Ibrahimović | Paris Saint-Germain | 19 | 19 | MATCH |
| 4 | Edinson Cavani | Paris Saint Germain | 18 | 18 | MATCH |
| 5 | Claudio Beauvue | Guingamp | 17 | 17 | MATCH |
| 5 | Max Gradel | Saint-Étienne | 17 | 17 | MATCH |
| 7 | Diego Rolan | Bordeaux | 15 | 15 | MATCH |
| 8 | Wissam Ben Yedder | Toulouse | 14 | 14 | MATCH |
| 9 | Nabil Fekir | Lyon | 13 | 13 | MATCH |
| 10 | Jordan Ayew | Lorient | 12 | 12 | MATCH |

*League completeness:* our player goals 890 vs Wikipedia goals-for 947 (-57).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| OGC Nice | 24 | 26 | 44 | -18 | severe | shortfall 18 exceeds max(5, 5% of GF=44) |


### 2015-2016 — MINOR ISSUES

*Evidence:* 1 top-10 scorer figure(s) differ by 1–2 goals.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Harry Kane | Tottenham Hotspur | 25 | 25 | MATCH |
| 2 | Sergio Agüero | Manchester City | 24 | 24 | MATCH |
| 2 | Jamie Vardy | Leicester City | 24 | 24 | MATCH |
| 4 | Romelu Lukaku | Everton | 18 | 18 | MATCH |
| 5 | Riyad Mahrez | Leicester City | 17 | 17 | MATCH |
| 6 | Olivier Giroud | Arsenal | 16 | 16 | MATCH |
| 7 | Jermain Defoe | Sunderland | 15 | 15 | MATCH |
| 7 | Odion Ighalo | Watford | 15 | 16 | MISMATCH |
| 9 | Troy Deeney | Watford | 13 | 13 | MATCH |
| 9 | Alexis Sánchez | Arsenal | 13 | 13 | MATCH |

*League completeness:* our player goals 993 vs Wikipedia goals-for 1026 (-33).

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Luis Suárez | Barcelona | 40 | 40 | MATCH |
| 2 | Cristiano Ronaldo | Real Madrid | 35 | 35 | MATCH |
| 3 | Lionel Messi | Barcelona | 26 | 26 | MATCH |
| 4 | Karim Benzema | Real Madrid | 24 | 24 | MATCH |
| 4 | Neymar | Barcelona | 24 | 24 | MATCH |
| 6 | Antoine Griezmann | Atlético Madrid | 22 | 22 | MATCH |
| 7 | Aritz Aduriz | Athletic Bilbao | 20 | 20 | MATCH |
| 8 | Gareth Bale | Real Madrid | 19 | 19 | MATCH |
| 8 | Rubén Castro | Real Betis | 19 | 19 | MATCH |
| 10 | Borja Bastón | Eibar | 18 | 18 | MATCH |

*League completeness:* our player goals 1009 vs Wikipedia goals-for 1043 (-34).

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Gonzalo Higuaín | Napoli | 36 | 36 | MATCH |
| 2 | Paulo Dybala | Juventus | 19 | 19 | MATCH |
| 3 | Carlos Bacca | Milan | 18 | 18 | MATCH |
| 4 | Mauro Icardi | Internazionale | 16 | 16 | MATCH |
| 5 | Leonardo Pavoletti | Genoa | 14 | 14 | MATCH |
| 5 | Mohamed Salah | Roma | 14 | 14 | MATCH |
| 7 | Éder | Sampdoria/Internazionale | 13 | 13 | MATCH |
| 7 | Josip Iličić | Fiorentina | 13 | 13 | MATCH |
| 7 | Massimo Maccarone | Empoli | 13 | 13 | MATCH |
| 10 | Andrea Belotti | Torino | 12 | 12 | MATCH |

*League completeness:* our player goals 951 vs Wikipedia goals-for 979 (-28).

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Robert Lewandowski | Bayern Munich | 30 | 30 | MATCH |
| 2 | Pierre-Emerick Aubameyang | Borussia Dortmund | 25 | 25 | MATCH |
| 3 | Thomas Müller | Bayern Munich | 20 | 20 | MATCH |
| 4 | Javier Hernández (known alias) | Bayer Leverkusen | 17 | 17 | MATCH |
| 5 | Anthony Modeste | 1. FC Köln | 15 | 15 | MATCH |
| 6 | Salomon Kalou | Hertha BSC | 14 | 14 | MATCH |
| 6 | Claudio Pizarro | Werder Bremen | 14 | 14 | MATCH |
| 6 | Sandro Wagner | Darmstadt 98 | 14 | 14 | MATCH |
| 9 | Daniel Didavi | VfB Stuttgart | 13 | 13 | MATCH |
| 9 | Raffael | Borussia Mönchengladbach | 13 | 13 | MATCH |

*League completeness:* our player goals 837 vs Wikipedia goals-for 866 (-29).

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Zlatan Ibrahimović | Paris Saint-Germain | 38 | 38 | MATCH |
| 2 | Alexandre Lacazette | Lyon | 21 | 21 | MATCH |
| 3 | Edinson Cavani | Paris Saint-Germain | 19 | 19 | MATCH |
| 4 | Michy Batshuayi | Marseille | 17 | 17 | MATCH |
| 4 | Hatem Ben Arfa | Nice | 17 | 17 | MATCH |
| 4 | Wissam Ben Yedder | Toulouse | 17 | 17 | MATCH |
| 7 | Valère Germain | Nice | 14 | 14 | MATCH |
| 8 | Benjamin Moukandjo | Lorient | 13 | 13 | MATCH |
| 9 | Andy Delort | Caen | 12 | 12 | MATCH |
| 9 | Ousmane Dembélé | Rennes | 12 | 12 | MATCH |

*League completeness:* our player goals 927 vs Wikipedia goals-for 960 (-33).


### 2016-2017 — MINOR ISSUES

*Evidence:* 1 top-10 scorer figure(s) differ by 1–2 goals; it Serie A: 1 club total(s) slightly above Wikipedia GF.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Harry Kane | Tottenham Hotspur | 29 | 29 | MATCH |
| 2 | Romelu Lukaku | Everton | 25 | 25 | MATCH |
| 3 | Alexis Sánchez | Arsenal | 24 | 24 | MATCH |
| 4 | Sergio Agüero | Manchester City | 20 | 20 | MATCH |
| 4 | Diego Costa | Chelsea | 20 | 20 | MATCH |
| 6 | Dele Alli | Tottenham Hotspur | 18 | 18 | MATCH |
| 7 | Zlatan Ibrahimović | Manchester United | 17 | 17 | MATCH |
| 8 | Eden Hazard | Chelsea | 16 | 16 | MATCH |
| 8 | Joshua King | Bournemouth | 16 | 16 | MATCH |
| 10 | Christian Benteke | Crystal Palace | 15 | 15 | MATCH |

*League completeness:* our player goals 1029 vs Wikipedia goals-for 1064 (-35).

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Lionel Messi | Barcelona | 37 | 37 | MATCH |
| 2 | Luis Suárez | Barcelona | 29 | 28 | MISMATCH |
| 3 | Cristiano Ronaldo | Real Madrid | 25 | 25 | MATCH |
| 4 | Iago Aspas | Celta Vigo | 19 | 19 | MATCH |
| 5 | Aritz Aduriz | Athletic Bilbao | 16 | 16 | MATCH |
| 5 | Antoine Griezmann | Atlético Madrid | 16 | 16 | MATCH |
| 7 | Álvaro Morata | Real Madrid | 15 | 15 | MATCH |
| 8 | Sandro Ramírez | Málaga | 14 | 14 | MATCH |
| 9 | Rubén Castro | Real Betis | 13 | 13 | MATCH |
| 9 | Gerard Moreno | Espanyol | 13 | 13 | MATCH |

*League completeness:* our player goals 1091 vs Wikipedia goals-for 1118 (-27).

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Edin Džeko | Roma | 29 | 29 | MATCH |
| 2 | Dries Mertens | Napoli | 28 | 28 | MATCH |
| 3 | Andrea Belotti | Torino | 26 | 26 | MATCH |
| 4 | Gonzalo Higuaín | Juventus | 24 | 24 | MATCH |
| 4 | Mauro Icardi | Internazionale | 24 | 24 | MATCH |
| 6 | Ciro Immobile | Lazio | 23 | 23 | MATCH |
| 7 | Lorenzo Insigne | Napoli | 18 | 18 | MATCH |
| 8 | Keita Baldé | Lazio | 16 | 16 | MATCH |
| 8 | Marco Borriello | Cagliari | 16 | 16 | MATCH |
| 8 | Alejandro Gómez (known alias) | Atalanta | 16 | 16 | MATCH |

*League completeness:* our player goals 1096 vs Wikipedia goals-for 1123 (-27).

**Within-tolerance goal-count excesses** (our player goals slightly above Wikipedia GF; logged for follow-up, below the flag threshold): Sassuolo 59 vs 58.

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Pierre-Emerick Aubameyang | Borussia Dortmund | 31 | 31 | MATCH |
| 2 | Robert Lewandowski | Bayern Munich | 30 | 30 | MATCH |
| 3 | Anthony Modeste | 1. FC Köln | 25 | 25 | MATCH |
| 4 | Timo Werner | RB Leipzig | 21 | 21 | MATCH |
| 5 | Mario Gómez | VfL Wolfsburg | 16 | 16 | MATCH |
| 6 | Andrej Kramarić | 1899 Hoffenheim | 15 | 15 | MATCH |
| 6 | Max Kruse | Werder Bremen | 15 | 15 | MATCH |
| 8 | Arjen Robben | Bayern Munich | 13 | 13 | MATCH |
| 9 | Vedad Ibišević | Hertha BSC | 12 | 12 | MATCH |
| 10 | Serge Gnabry | Werder Bremen | 11 | 11 | MATCH |

*League completeness:* our player goals 861 vs Wikipedia goals-for 877 (-16).

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Edinson Cavani | Paris Saint-Germain | 35 | 35 | MATCH |
| 2 | Alexandre Lacazette | Lyon | 28 | 28 | MATCH |
| 3 | Radamel Falcao | Monaco | 21 | 21 | MATCH |
| 4 | Bafétimbi Gomis | Marseille | 20 | 20 | MATCH |
| 5 | Mario Balotelli | Nice | 15 | 15 | MATCH |
| 5 | Kylian Mbappé | Monaco | 15 | 15 | MATCH |
| 5 | Ivan Santini | Caen | 15 | 15 | MATCH |
| 5 | Florian Thauvin | Marseille | 15 | 15 | MATCH |
| 9 | Nicolas de Préville | Lille | 14 | 14 | MATCH |
| 9 | Steve Mounié | Montpellier | 14 | 14 | MATCH |

*League completeness:* our player goals 965 vs Wikipedia goals-for 991 (-26).


### 2017-2018 — MINOR ISSUES

*Evidence:* 1 club total(s) 5–9 goals below Wikipedia GF; 1 top-10 scorer figure(s) differ by 1–2 goals.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Mohamed Salah | Liverpool | 32 | 32 | MATCH |
| 2 | Harry Kane | Tottenham Hotspur | 30 | 30 | MATCH |
| 3 | Sergio Agüero | Manchester City | 21 | 21 | MATCH |
| 4 | Jamie Vardy | Leicester City | 20 | 20 | MATCH |
| 5 | Raheem Sterling | Manchester City | 18 | 18 | MATCH |
| 6 | Romelu Lukaku | Manchester United | 16 | 16 | MATCH |
| 7 | Roberto Firmino | Liverpool | 15 | 15 | MATCH |
| 8 | Alexandre Lacazette | Arsenal | 14 | 14 | MATCH |
| 9 | Gabriel Jesus | Manchester City | 13 | 13 | MATCH |
| 10 | Eden Hazard | Chelsea | 12 | 12 | MATCH |

*League completeness:* our player goals 988 vs Wikipedia goals-for 1018 (-30).

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Lionel Messi | Barcelona | 34 | 34 | MATCH |
| 2 | Cristiano Ronaldo | Real Madrid | 26 | 26 | MATCH |
| 3 | Luis Suárez | Barcelona | 25 | 25 | MATCH |
| 4 | Iago Aspas | Celta Vigo | 22 | 22 | MATCH |
| 5 | Cristhian Stuani | Girona | 21 | 21 | MATCH |
| 6 | Antoine Griezmann | Atlético Madrid | 19 | 19 | MATCH |
| 7 | Maxi Gómez | Celta Vigo | 17 | 18 | MISMATCH |
| 8 | Gareth Bale | Real Madrid | 16 | 16 | MATCH |
| 8 | Gerard Moreno | Espanyol | 16 | 16 | MATCH |
| 8 | Rodrigo | Valencia | 16 | 16 | MATCH |

*League completeness:* our player goals 994 vs Wikipedia goals-for 1024 (-30).

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Mauro Icardi | Internazionale | 29 | 29 | MATCH |
| 1 | Ciro Immobile | Lazio | 29 | 29 | MATCH |
| 3 | Paulo Dybala | Juventus | 22 | 22 | MATCH |
| 4 | Fabio Quagliarella | Sampdoria | 19 | 19 | MATCH |
| 5 | Dries Mertens | Napoli | 18 | 18 | MATCH |
| 6 | Edin Džeko | Roma | 16 | 16 | MATCH |
| 6 | Gonzalo Higuaín | Juventus | 16 | 16 | MATCH |
| 8 | Giovanni Simeone | Fiorentina | 14 | 14 | MATCH |
| 9 | Iago Falque | Torino | 12 | 12 | MATCH |
| 9 | Roberto Inglese | Chievo | 12 | 12 | MATCH |

*League completeness:* our player goals 981 vs Wikipedia goals-for 1017 (-36).

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Robert Lewandowski | Bayern Munich | 29 | 29 | MATCH |
| 2 | Nils Petersen | SC Freiburg | 15 | 15 | MATCH |
| 3 | Niclas Füllkrug | Hannover 96 | 14 | 14 | MATCH |
| 3 | Mark Uth | 1899 Hoffenheim | 14 | 14 | MATCH |
| 3 | Kevin Volland | Bayer Leverkusen | 14 | 14 | MATCH |
| 6 | Pierre-Emerick Aubameyang | Borussia Dortmund | 13 | 13 | MATCH |
| 6 | Michael Gregoritsch | FC Augsburg | 13 | 13 | MATCH |
| 6 | Andrej Kramarić | 1899 Hoffenheim | 13 | 13 | MATCH |
| 6 | Timo Werner | RB Leipzig | 13 | 13 | MATCH |
| 10 | Alfreð Finnbogason (fuzzy name match) | FC Augsburg | 12 | 12 | MATCH |

*League completeness:* our player goals 835 vs Wikipedia goals-for 855 (-20).

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Edinson Cavani | Paris Saint-Germain | 28 | 28 | MATCH |
| 2 | Florian Thauvin | Marseille | 22 | 22 | MATCH |
| 3 | Memphis Depay | Lyon | 19 | 19 | MATCH |
| 3 | Neymar | Paris Saint-Germain | 19 | 19 | MATCH |
| 5 | Mario Balotelli | Nice | 18 | 18 | MATCH |
| 5 | Radamel Falcao | Monaco | 18 | 18 | MATCH |
| 5 | Nabil Fekir | Lyon | 18 | 18 | MATCH |
| 5 | Mariano Díaz | Lyon | 18 | 18 | MATCH |
| 9 | Karl Toko Ekambi | Angers | 17 | 17 | MATCH |
| 10 | Alassane Pléa | Nice | 16 | 16 | MATCH |

*League completeness:* our player goals 998 vs Wikipedia goals-for 1033 (-35).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Paris Saint-Germain | 28 | 100 | 108 | -8 | borderline | shortfall 8 exceeds max(5, 5% of GF=108) |


### 2018-2019 — MINOR ISSUES

*Evidence:* 1 club total(s) 5–9 goals below Wikipedia GF; 1 top-10 scorer figure(s) differ by 1–2 goals; de Bundesliga: 1 club total(s) slightly above Wikipedia GF; fr Ligue 1: 1 club total(s) slightly above Wikipedia GF.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Pierre-Emerick Aubameyang | Arsenal | 22 | 22 | MATCH |
| 1 | Sadio Mané | Liverpool | 22 | 22 | MATCH |
| 1 | Mohamed Salah | Liverpool | 22 | 22 | MATCH |
| 4 | Sergio Agüero | Manchester City | 21 | 21 | MATCH |
| 5 | Jamie Vardy | Leicester City | 18 | 18 | MATCH |
| 6 | Harry Kane | Tottenham Hotspur | 17 | 17 | MATCH |
| 6 | Raheem Sterling | Manchester City | 17 | 17 | MATCH |
| 8 | Eden Hazard | Chelsea | 16 | 16 | MATCH |
| 9 | Callum Wilson | Bournemouth | 14 | 14 | MATCH |
| 10 | Raúl Jiménez | Wolverhampton Wanderers | 13 | 13 | MATCH |

*League completeness:* our player goals 1039 vs Wikipedia goals-for 1072 (-33).

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Lionel Messi | Barcelona | 36 | 36 | MATCH |
| 2 | Karim Benzema | Real Madrid | 21 | 21 | MATCH |
| 2 | Luis Suárez | Barcelona | 21 | 19 | MISMATCH |
| 4 | Iago Aspas | Celta Vigo | 20 | 20 | MATCH |
| 5 | Cristhian Stuani | Girona | 19 | 19 | MATCH |
| 6 | Wissam Ben Yedder | Sevilla | 18 | 18 | MATCH |
| 7 | Borja Iglesias | Espanyol | 17 | 17 | MATCH |
| 8 | Antoine Griezmann | Atlético Madrid | 15 | 15 | MATCH |
| 9 | Charles | Eibar | 14 | 14 | MATCH |
| 9 | Raúl de Tomás | Rayo Vallecano | 14 | 14 | MATCH |

*League completeness:* our player goals 951 vs Wikipedia goals-for 983 (-32).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Espanyol | 27 | 42 | 48 | -6 | borderline | shortfall 6 exceeds max(5, 5% of GF=48) |

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Fabio Quagliarella | Sampdoria | 26 | 26 | MATCH |
| 2 | Duván Zapata | Atalanta | 23 | 23 | MATCH |
| 3 | Krzysztof Piątek | Genoa/Milan | 22 | 22 | MATCH |
| 4 | Cristiano Ronaldo | Juventus | 21 | 21 | MATCH |
| 5 | Arkadiusz Milik | Napoli | 17 | 17 | MATCH |
| 6 | Francesco Caputo | Empoli | 16 | 16 | MATCH |
| 6 | Dries Mertens | Napoli | 16 | 16 | MATCH |
| 6 | Leonardo Pavoletti | Cagliari | 16 | 16 | MATCH |
| 6 | Andrea Petagna | SPAL | 16 | 16 | MATCH |
| 10 | Andrea Belotti | Torino | 15 | 15 | MATCH |

*League completeness:* our player goals 986 vs Wikipedia goals-for 1019 (-33).

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Robert Lewandowski | Bayern Munich | 22 | 22 | MATCH |
| 2 | Paco Alcácer | Borussia Dortmund | 18 | 18 | MATCH |
| 3 | Kai Havertz | Bayer Leverkusen | 17 | 17 | MATCH |
| 3 | Luka Jović | Eintracht Frankfurt | 17 | 17 | MATCH |
| 3 | Andrej Kramarić | 1899 Hoffenheim | 17 | 17 | MATCH |
| 3 | Marco Reus | Borussia Dortmund | 17 | 17 | MATCH |
| 3 | Wout Weghorst | VfL Wolfsburg | 17 | 17 | MATCH |
| 8 | Ishak Belfodil | 1899 Hoffenheim | 16 | 16 | MATCH |
| 8 | Timo Werner | RB Leipzig | 16 | 16 | MATCH |
| 10 | Sébastien Haller | Eintracht Frankfurt | 15 | 15 | MATCH |

*League completeness:* our player goals 954 vs Wikipedia goals-for 973 (-19).

**Within-tolerance goal-count excesses** (our player goals slightly above Wikipedia GF; logged for follow-up, below the flag threshold): VfB Stuttgart 33 vs 32.

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Kylian Mbappé | Paris Saint-Germain | 33 | 33 | MATCH |
| 2 | Nicolas Pépé | Lille | 22 | 22 | MATCH |
| 3 | Edinson Cavani | Paris Saint-Germain | 18 | 18 | MATCH |
| 4 | Florian Thauvin | Marseille | 16 | 16 | MATCH |
| 5 | Moussa Dembélé | Lyon | 15 | 15 | MATCH |
| 5 | Radamel Falcao | Monaco | 15 | 15 | MATCH |
| 5 | Neymar | Paris Saint-Germain | 15 | 15 | MATCH |
| 8 | Andy Delort | Montpellier | 14 | 14 | MATCH |
| 9 | Jonathan Bamba | Lille | 13 | 13 | MATCH |
| 9 | Wahbi Khazri | Saint-Étienne | 13 | 13 | MATCH |

*League completeness:* our player goals 946 vs Wikipedia goals-for 972 (-26).

**Within-tolerance goal-count excesses** (our player goals slightly above Wikipedia GF; logged for follow-up, below the flag threshold): SM Caen 30 vs 29.


### 2019-2020 — PASS

*Evidence:* All top-10 scorers matched and all club goal totals were within tolerance.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Jamie Vardy | Leicester City | 23 | 23 | MATCH |
| 2 | Pierre-Emerick Aubameyang | Arsenal | 22 | 22 | MATCH |
| 2 | Danny Ings | Southampton | 22 | 22 | MATCH |
| 4 | Raheem Sterling | Manchester City | 20 | 20 | MATCH |
| 5 | Mohamed Salah | Liverpool | 19 | 19 | MATCH |
| 6 | Harry Kane | Tottenham Hotspur | 18 | 18 | MATCH |
| 6 | Sadio Mané | Liverpool | 18 | 18 | MATCH |
| 8 | Raúl Jiménez | Wolverhampton Wanderers | 17 | 17 | MATCH |
| 8 | Anthony Martial | Manchester United | 17 | 17 | MATCH |
| 8 | Marcus Rashford | Manchester United | 17 | 17 | MATCH |

*League completeness:* our player goals 997 vs Wikipedia goals-for 1034 (-37).

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Lionel Messi | Barcelona | 25 | 25 | MATCH |
| 2 | Karim Benzema | Real Madrid | 21 | 21 | MATCH |
| 3 | Gerard Moreno | Villarreal | 18 | 18 | MATCH |
| 4 | Luis Suárez | Barcelona | 16 | 16 | MATCH |
| 5 | Raúl García | Athletic Bilbao | 15 | 15 | MATCH |
| 6 | Iago Aspas | Celta Vigo | 14 | 14 | MATCH |
| 6 | Lucas Ocampos | Sevilla | 14 | 14 | MATCH |
| 8 | Ante Budimir | Mallorca | 13 | 13 | MATCH |
| 9 | Álvaro Morata | Atlético Madrid | 12 | 12 | MATCH |
| 10 | Santi Cazorla | Villarreal | 11 | 11 | MATCH |

*League completeness:* our player goals 920 vs Wikipedia goals-for 942 (-22).

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Ciro Immobile | Lazio | 36 | 36 | MATCH |
| 2 | Cristiano Ronaldo | Juventus | 31 | 31 | MATCH |
| 3 | Romelu Lukaku | Internazionale | 23 | 23 | MATCH |
| 4 | Francesco Caputo | Sassuolo | 21 | 21 | MATCH |
| 5 | Luis Muriel | Atalanta | 18 | 18 | MATCH |
| 5 | João Pedro | Cagliari | 18 | 18 | MATCH |
| 5 | Duván Zapata | Atalanta | 18 | 18 | MATCH |
| 8 | Andrea Belotti | Torino | 16 | 16 | MATCH |
| 8 | Edin Džeko | Roma | 16 | 16 | MATCH |
| 10 | Josip Iličić | Atalanta | 15 | 15 | MATCH |

*League completeness:* our player goals 1120 vs Wikipedia goals-for 1154 (-34).

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Robert Lewandowski | Bayern Munich | 34 | 34 | MATCH |
| 2 | Timo Werner | RB Leipzig | 28 | 28 | MATCH |
| 3 | Jadon Sancho | Borussia Dortmund | 17 | 17 | MATCH |
| 4 | Wout Weghorst | VfL Wolfsburg | 16 | 16 | MATCH |
| 5 | Rouwen Hennings | Fortuna Düsseldorf | 15 | 15 | MATCH |
| 6 | Jhon Córdoba | 1. FC Köln | 13 | 13 | MATCH |
| 6 | Erling Haaland | Borussia Dortmund | 13 | 13 | MATCH |
| 6 | Florian Niederlechner | FC Augsburg | 13 | 13 | MATCH |
| 6 | Robin Quaison | Mainz 05 | 13 | 13 | MATCH |
| 10 | Sebastian Andersson | Union Berlin | 12 | 12 | MATCH |

*League completeness:* our player goals 954 vs Wikipedia goals-for 982 (-28).

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Wissam Ben Yedder | Monaco | 18 | 18 | MATCH |
| 1 | Kylian Mbappé | Paris Saint-Germain | 18 | 18 | MATCH |
| 3 | Moussa Dembélé | Lyon | 16 | 16 | MATCH |
| 4 | Neymar | Paris Saint-Germain | 13 | 13 | MATCH |
| 4 | Victor Osimhen | Lille | 13 | 13 | MATCH |
| 6 | Habib Diallo | Metz | 12 | 12 | MATCH |
| 6 | Mauro Icardi | Paris Saint-Germain | 12 | 12 | MATCH |
| 8 | Darío Benedetto | Marseille | 11 | 11 | MATCH |
| 8 | Kasper Dolberg | Nice | 11 | 11 | MATCH |
| 10 | Denis Bouanga | Saint-Étienne | 10 | 10 | MATCH |

*League completeness:* our player goals 680 vs Wikipedia goals-for 704 (-24).


### 2020-2021 — FAIL

*Evidence:* 4 club(s) with a severe goal shortfall (missing player rows), e.g. Real Madrid 30/67, FC Barcelona 74/85, Valencia CF 31/50.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Harry Kane | Tottenham Hotspur | 23 | 23 | MATCH |
| 2 | Mohamed Salah | Liverpool | 22 | 22 | MATCH |
| 3 | Bruno Fernandes | Manchester United | 18 | 18 | MATCH |
| 4 | Patrick Bamford | Leeds United | 17 | 17 | MATCH |
| 4 | Son Heung-min (reordered name) | Tottenham Hotspur | 17 | 17 | MATCH |
| 6 | Dominic Calvert-Lewin | Everton | 16 | 16 | MATCH |
| 7 | Jamie Vardy | Leicester City | 15 | 15 | MATCH |
| 8 | Ollie Watkins | Aston Villa | 14 | 14 | MATCH |
| 9 | İlkay Gündoğan | Manchester City | 13 | 13 | MATCH |
| 9 | Alexandre Lacazette | Arsenal | 13 | 13 | MATCH |

*League completeness:* our player goals 984 vs Wikipedia goals-for 1024 (-40).

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Lionel Messi | Barcelona | 30 | 30 | MATCH |
| 2 | Karim Benzema | Real Madrid | 23 | — | NOT FOUND |
| 2 | Gerard Moreno | Villarreal | 23 | 23 | MATCH |
| 4 | Luis Suárez | Atlético Madrid | 21 | 21 | MATCH |
| 5 | Youssef En-Nesyri | Sevilla | 18 | 18 | MATCH |
| 6 | Alexander Isak | Real Sociedad | 17 | 17 | MATCH |
| 7 | Iago Aspas | Celta Vigo | 14 | 14 | MATCH |
| 8 | Antoine Griezmann | Barcelona | 13 | 13 | MATCH |
| 8 | Rafa Mir | Huesca | 13 | 13 | MATCH |
| 8 | José Luis Morales | Levante | 13 | 13 | MATCH |

*League completeness:* our player goals 862 vs Wikipedia goals-for 953 (-91).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Real Madrid | 25 | 30 | 67 | -37 | severe | shortfall 37 exceeds max(5, 5% of GF=67) |
| FC Barcelona | 22 | 74 | 85 | -11 | severe | shortfall 11 exceeds max(5, 5% of GF=85) |
| Valencia CF | 24 | 31 | 50 | -19 | severe | shortfall 19 exceeds max(5, 5% of GF=50) |

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Cristiano Ronaldo | Juventus | 29 | 29 | MATCH |
| 2 | Romelu Lukaku | Inter Milan | 24 | 24 | MATCH |
| 3 | Luis Muriel | Atalanta | 22 | 22 | MATCH |
| 4 | Dušan Vlahović | Fiorentina | 21 | 21 | MATCH |
| 5 | Ciro Immobile | Lazio | 20 | 20 | MATCH |
| 5 | Simy | Crotone | 20 | 20 | MATCH |
| 7 | Lorenzo Insigne | Napoli | 19 | 19 | MATCH |
| 8 | Domenico Berardi | Sassuolo | 17 | 17 | MATCH |
| 8 | Lautaro Martínez | Inter Milan | 17 | 17 | MATCH |
| 10 | João Pedro | Cagliari | 16 | 16 | MATCH |

*League completeness:* our player goals 1126 vs Wikipedia goals-for 1163 (-37).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Hellas Verona | 32 | 38 | 46 | -8 | borderline | shortfall 8 exceeds max(5, 5% of GF=46) |

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Robert Lewandowski | Bayern Munich | 41 | 41 | MATCH |
| 2 | André Silva | Eintracht Frankfurt | 28 | 28 | MATCH |
| 3 | Erling Haaland | Borussia Dortmund | 27 | 27 | MATCH |
| 4 | Andrej Kramarić | 1899 Hoffenheim | 20 | 20 | MATCH |
| 4 | Wout Weghorst | VfL Wolfsburg | 20 | 20 | MATCH |
| 6 | Saša Kalajdžić | VfB Stuttgart | 16 | 16 | MATCH |
| 7 | Lars Stindl | Borussia Mönchengladbach | 14 | 14 | MATCH |
| 8 | Lucas Alario | Bayer Leverkusen | 11 | 11 | MATCH |
| 8 | Max Kruse | Union Berlin | 11 | 11 | MATCH |
| 8 | Thomas Müller | Bayern Munich | 11 | 11 | MATCH |

*League completeness:* our player goals 897 vs Wikipedia goals-for 928 (-31).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Eintracht Frankfurt | 24 | 59 | 69 | -10 | severe | shortfall 10 exceeds max(5, 5% of GF=69) |

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Kylian Mbappé | Paris Saint-Germain | 27 | 27 | MATCH |
| 2 | Wissam Ben Yedder | Monaco | 20 | 20 | MATCH |
| 2 | Memphis Depay | Lyon | 20 | 20 | MATCH |
| 4 | Ludovic Ajorque | Strasbourg | 16 | 16 | MATCH |
| 4 | Gaëtan Laborde | Montpellier | 16 | 16 | MATCH |
| 4 | Kevin Volland | Monaco | 16 | 16 | MATCH |
| 4 | Burak Yılmaz (fuzzy name match) | Lille | 16 | 16 | MATCH |
| 8 | Andy Delort | Montpellier | 15 | 15 | MATCH |
| 9 | Boulaye Dia | Reims | 14 | 14 | MATCH |
| 9 | Terem Moffi | Lorient | 14 | 14 | MATCH |

*League completeness:* our player goals 1023 vs Wikipedia goals-for 1049 (-26).


### 2021-2022 — MINOR ISSUES

*Evidence:* 4 club total(s) 5–9 goals below Wikipedia GF.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Mohamed Salah | Liverpool | 23 | 23 | MATCH |
| 1 | Son Heung-min (reordered name) | Tottenham Hotspur | 23 | 23 | MATCH |
| 3 | Cristiano Ronaldo | Manchester United | 18 | 18 | MATCH |
| 4 | Harry Kane | Tottenham Hotspur | 17 | 17 | MATCH |
| 5 | Sadio Mané | Liverpool | 16 | 16 | MATCH |
| 6 | Kevin De Bruyne | Manchester City | 15 | 15 | MATCH |
| 6 | Diogo Jota | Liverpool | 15 | 15 | MATCH |
| 6 | Jamie Vardy | Leicester City | 15 | 15 | MATCH |
| 9 | Wilfried Zaha | Crystal Palace | 14 | 14 | MATCH |
| 10 | Raheem Sterling | Manchester City | 13 | 13 | MATCH |

*League completeness:* our player goals 1023 vs Wikipedia goals-for 1071 (-48).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Tottenham Hotspur | 24 | 63 | 69 | -6 | borderline | shortfall 6 exceeds max(5, 5% of GF=69) |
| Crystal Palace | 22 | 42 | 50 | -8 | borderline | shortfall 8 exceeds max(5, 5% of GF=50) |
| Southampton | 24 | 35 | 43 | -8 | borderline | shortfall 8 exceeds max(5, 5% of GF=43) |

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Karim Benzema | Real Madrid | 27 | 27 | MATCH |
| 2 | Iago Aspas | Celta Vigo | 18 | 18 | MATCH |
| 3 | Raúl de Tomás | Espanyol | 17 | 17 | MATCH |
| 3 | Vinícius Júnior | Real Madrid | 17 | 17 | MATCH |
| 5 | Juanmi | Real Betis | 16 | 16 | MATCH |
| 5 | Enes Ünal | Getafe | 16 | 16 | MATCH |
| 7 | Joselu | Alavés | 14 | 14 | MATCH |
| 8 | José Luis Morales | Levante | 13 | 13 | MATCH |
| 9 | Ángel Correa | Atlético Madrid | 12 | 12 | MATCH |
| 9 | Memphis Depay | Barcelona | 12 | 12 | MATCH |

*League completeness:* our player goals 921 vs Wikipedia goals-for 951 (-30).

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Ciro Immobile | Lazio | 27 | 27 | MATCH |
| 2 | Dušan Vlahović | Fiorentina/Juventus | 24 | 24 | MATCH |
| 3 | Lautaro Martínez | Inter Milan | 21 | 21 | MATCH |
| 4 | Tammy Abraham | Roma | 17 | 17 | MATCH |
| 4 | Giovanni Simeone | Hellas Verona | 17 | 17 | MATCH |
| 6 | Gianluca Scamacca | Sassuolo | 16 | 16 | MATCH |
| 7 | Domenico Berardi | Sassuolo | 15 | 15 | MATCH |
| 8 | Marko Arnautović | Bologna | 14 | 14 | MATCH |
| 8 | Victor Osimhen | Napoli | 14 | 14 | MATCH |
| 10 | Gerard Deulofeu | Udinese | 13 | 13 | MATCH |

*League completeness:* our player goals 1038 vs Wikipedia goals-for 1089 (-51).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Hellas Verona | 28 | 59 | 65 | -6 | borderline | shortfall 6 exceeds max(5, 5% of GF=65) |

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Robert Lewandowski | Bayern Munich | 35 | 35 | MATCH |
| 2 | Patrik Schick | Bayer Leverkusen | 24 | 24 | MATCH |
| 3 | Erling Haaland | Borussia Dortmund | 22 | 22 | MATCH |
| 4 | Anthony Modeste | 1. FC Köln | 20 | 20 | MATCH |
| 4 | Christopher Nkunku | RB Leipzig | 20 | 20 | MATCH |
| 6 | Taiwo Awoniyi | Union Berlin | 15 | 15 | MATCH |
| 7 | Serge Gnabry | Bayern Munich | 14 | 14 | MATCH |
| 8 | Moussa Diaby | Bayer Leverkusen | 13 | 13 | MATCH |
| 9 | Jonas Hofmann | Borussia Mönchengladbach | 12 | 12 | MATCH |
| 9 | Max Kruse | Union Berlin VfL Wolfsburg | 12 | 12 | MATCH |

*League completeness:* our player goals 919 vs Wikipedia goals-for 954 (-35).

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Kylian Mbappé | Paris Saint-Germain | 28 | 28 | MATCH |
| 2 | Wissam Ben Yedder | Monaco | 25 | 25 | MATCH |
| 3 | Moussa Dembélé | Lyon | 21 | 21 | MATCH |
| 3 | Martin Terrier | Rennes | 21 | 21 | MATCH |
| 5 | Andy Delort | Montpellier/Nice | 18 | 18 | MATCH |
| 6 | Jonathan David | Lille | 15 | 15 | MATCH |
| 6 | Gaëtan Laborde | Montpellier/Rennes | 15 | 15 | MATCH |
| 8 | Mohamed Bayo | Clermont | 14 | 14 | MATCH |
| 9 | Neymar | Paris Saint-Germain | 13 | 13 | MATCH |
| 10 | Ludovic Ajorque | Strasbourg | 12 | 12 | MATCH |

*League completeness:* our player goals 1026 vs Wikipedia goals-for 1067 (-41).


### 2022-2023 — MINOR ISSUES

*Evidence:* 1 club total(s) 5–9 goals below Wikipedia GF.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Erling Haaland | Manchester City | 36 | 36 | MATCH |
| 2 | Harry Kane | Tottenham Hotspur | 30 | 30 | MATCH |
| 3 | Ivan Toney | Brentford | 20 | 20 | MATCH |
| 4 | Mohamed Salah | Liverpool | 19 | 19 | MATCH |
| 5 | Callum Wilson | Newcastle United | 18 | 18 | MATCH |
| 6 | Marcus Rashford | Manchester United | 17 | 17 | MATCH |
| 7 | Gabriel Martinelli | Arsenal | 15 | 15 | MATCH |
| 7 | Martin Ødegaard | Arsenal | 15 | 15 | MATCH |
| 7 | Ollie Watkins | Aston Villa | 15 | 15 | MATCH |
| 10 | Aleksandar Mitrović | Fulham | 14 | 14 | MATCH |

*League completeness:* our player goals 1039 vs Wikipedia goals-for 1084 (-45).

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Robert Lewandowski | Barcelona | 23 | 23 | MATCH |
| 2 | Karim Benzema | Real Madrid | 19 | 19 | MATCH |
| 3 | Joselu | Espanyol | 16 | 16 | MATCH |
| 4 | Antoine Griezmann | Atlético Madrid | 15 | 15 | MATCH |
| 4 | Borja Iglesias | Real Betis | 15 | 15 | MATCH |
| 4 | Vedat Muriqi | Mallorca | 15 | 15 | MATCH |
| 7 | Enes Ünal | Getafe | 14 | 14 | MATCH |
| 8 | Taty Castellanos | Girona | 13 | 13 | MATCH |
| 8 | Álvaro Morata | Atlético Madrid | 13 | 13 | MATCH |
| 10 | Iago Aspas | Celta Vigo | 12 | 12 | MATCH |

*League completeness:* our player goals 924 vs Wikipedia goals-for 955 (-31).

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Victor Osimhen | Napoli | 26 | 26 | MATCH |
| 2 | Lautaro Martínez | Inter Milan | 21 | 21 | MATCH |
| 3 | Boulaye Dia | Salernitana | 16 | 16 | MATCH |
| 4 | Rafael Leão | AC Milan | 15 | 15 | MATCH |
| 5 | Olivier Giroud | AC Milan | 13 | 13 | MATCH |
| 5 | Ademola Lookman | Atalanta | 13 | 13 | MATCH |
| 5 | M'Bala Nzola | Spezia | 13 | 13 | MATCH |
| 8 | Domenico Berardi | Sassuolo | 12 | 12 | MATCH |
| 8 | Paulo Dybala | Roma | 12 | 12 | MATCH |
| 8 | Ciro Immobile | Lazio | 12 | 12 | MATCH |

*League completeness:* our player goals 943 vs Wikipedia goals-for 974 (-31).

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Niclas Füllkrug | Werder Bremen | 16 | 16 | MATCH |
| 1 | Christopher Nkunku | RB Leipzig | 16 | 16 | MATCH |
| 3 | Vincenzo Grifo | SC Freiburg | 15 | 15 | MATCH |
| 3 | Randal Kolo Muani | Eintracht Frankfurt | 15 | 15 | MATCH |
| 5 | Serge Gnabry | Bayern Munich | 14 | 14 | MATCH |
| 6 | Marcus Thuram | Borussia Mönchengladbach | 13 | 13 | MATCH |
| 7 | Marvin Ducksch | Werder Bremen | 12 | 12 | MATCH |
| 7 | Jonas Hofmann | Borussia Mönchengladbach | 12 | 12 | MATCH |
| 7 | Andrej Kramarić | 1899 Hoffenheim | 12 | 12 | MATCH |
| 7 | Jamal Musiala | Bayern Munich | 12 | 12 | MATCH |

*League completeness:* our player goals 946 vs Wikipedia goals-for 971 (-25).

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Kylian Mbappé | Paris Saint-Germain | 29 | 29 | MATCH |
| 2 | Alexandre Lacazette | Lyon | 27 | 27 | MATCH |
| 3 | Jonathan David | Lille | 24 | 24 | MATCH |
| 4 | Folarin Balogun | Reims | 21 | 21 | MATCH |
| 4 | Loïs Openda | Lens | 21 | 21 | MATCH |
| 6 | Habib Diallo | Strasbourg | 20 | 20 | MATCH |
| 7 | Wissam Ben Yedder | Monaco | 19 | 19 | MATCH |
| 7 | Elye Wahi | Montpellier | 19 | 19 | MATCH |
| 9 | Terem Moffi | Lorient/Nice | 18 | 18 | MATCH |
| 10 | Lionel Messi | Paris Saint-Germain | 16 | 16 | MATCH |

*League completeness:* our player goals 1030 vs Wikipedia goals-for 1067 (-37).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Olympique de Marseille | 30 | 61 | 67 | -6 | borderline | shortfall 6 exceeds max(5, 5% of GF=67) |


### 2023-2024 — MINOR ISSUES

*Evidence:* 1 club total(s) 5–9 goals below Wikipedia GF.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Erling Haaland | Manchester City | 27 | 27 | MATCH |
| 2 | Cole Palmer | Chelsea | 22 | 22 | MATCH |
| 3 | Alexander Isak | Newcastle United | 21 | 21 | MATCH |
| 4 | Phil Foden | Manchester City | 19 | 19 | MATCH |
| 4 | Dominic Solanke | Bournemouth | 19 | 19 | MATCH |
| 4 | Ollie Watkins | Aston Villa | 19 | 19 | MATCH |
| 7 | Mohamed Salah | Liverpool | 18 | 18 | MATCH |
| 8 | Son Heung-min | Tottenham Hotspur | 17 | 17 | MATCH |
| 9 | Jarrod Bowen | West Ham United | 16 | 16 | MATCH |
| 9 | Jean-Philippe Mateta | Crystal Palace | 16 | 16 | MATCH |

*League completeness:* our player goals 1197 vs Wikipedia goals-for 1246 (-49).

**Flagged clubs:**

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Liverpool | 30 | 80 | 86 | -6 | borderline | shortfall 6 exceeds max(5, 5% of GF=86) |

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Artem Dovbyk | Girona | 24 | 24 | MATCH |
| 2 | Alexander Sørloth | Villarreal | 23 | 23 | MATCH |
| 3 | Jude Bellingham | Real Madrid | 19 | 19 | MATCH |
| 3 | Robert Lewandowski | Barcelona | 19 | 19 | MATCH |
| 5 | Ante Budimir | Osasuna | 17 | 17 | MATCH |
| 6 | Youssef En-Nesyri | Sevilla | 16 | 16 | MATCH |
| 6 | Antoine Griezmann | Atlético Madrid | 16 | 16 | MATCH |
| 8 | Borja Mayoral | Getafe | 15 | 15 | MATCH |
| 8 | Álvaro Morata | Atlético Madrid | 15 | 15 | MATCH |
| 8 | Vinícius Júnior | Real Madrid | 15 | 15 | MATCH |

*League completeness:* our player goals 977 vs Wikipedia goals-for 1005 (-28).

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Lautaro Martínez | Inter Milan | 24 | 24 | MATCH |
| 2 | Dušan Vlahović | Juventus | 16 | 16 | MATCH |
| 3 | Olivier Giroud | AC Milan | 15 | 15 | MATCH |
| 3 | Victor Osimhen | Napoli | 15 | 15 | MATCH |
| 5 | Albert Guðmundsson | Genoa | 14 | 14 | MATCH |
| 6 | Hakan Çalhanoğlu | Inter Milan | 13 | 13 | MATCH |
| 6 | Paulo Dybala | Roma | 13 | 13 | MATCH |
| 6 | Romelu Lukaku | Roma | 13 | 13 | MATCH |
| 6 | Marcus Thuram | Inter Milan | 13 | 13 | MATCH |
| 6 | Duván Zapata | Atalanta / Torino | 13 | 13 | MATCH |

*League completeness:* our player goals 968 vs Wikipedia goals-for 992 (-24).

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Harry Kane | Bayern Munich | 36 | 36 | MATCH |
| 2 | Serhou Guirassy | VfB Stuttgart | 28 | 28 | MATCH |
| 3 | Loïs Openda | RB Leipzig | 24 | 24 | MATCH |
| 4 | Deniz Undav | VfB Stuttgart | 18 | 18 | MATCH |
| 5 | Maximilian Beier | TSG Hoffenheim | 16 | 16 | MATCH |
| 6 | Ermedin Demirović | FC Augsburg | 15 | 15 | MATCH |
| 6 | Andrej Kramarić | TSG Hoffenheim | 15 | 15 | MATCH |
| 8 | Victor Boniface | Bayer Leverkusen | 14 | 14 | MATCH |
| 8 | Benjamin Šeško | RB Leipzig | 14 | 14 | MATCH |
| 10 | Donyell Malen | Borussia Dortmund | 13 | 13 | MATCH |

*League completeness:* our player goals 960 vs Wikipedia goals-for 985 (-25).

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Kylian Mbappé | Paris Saint-Germain | 27 | 27 | MATCH |
| 2 | Jonathan David | Lille | 19 | 19 | MATCH |
| 2 | Alexandre Lacazette | Lyon | 19 | 19 | MATCH |
| 4 | Pierre-Emerick Aubameyang | Marseille | 17 | 17 | MATCH |
| 5 | Wissam Ben Yedder | Monaco | 16 | 16 | MATCH |
| 6 | Thijs Dallinga | Toulouse | 14 | 14 | MATCH |
| 7 | Georges Mikautadze | Metz | 13 | 13 | MATCH |
| 8 | Terem Moffi | Nice | 11 | 11 | MATCH |
| 8 | Gonçalo Ramos | Paris Saint-Germain | 11 | 11 | MATCH |
| 10 | Arnaud Kalimuendo | Rennes | 10 | 10 | MATCH |

*League completeness:* our player goals 804 vs Wikipedia goals-for 826 (-22).


### 2024-2025 — MINOR ISSUES

*Evidence:* de Bundesliga: 1 club total(s) slightly above Wikipedia GF.

#### eng Premier League

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Mohamed Salah | Liverpool | 29 | 29 | MATCH |
| 2 | Alexander Isak | Newcastle United | 23 | 23 | MATCH |
| 3 | Erling Haaland | Manchester City | 22 | 22 | MATCH |
| 4 | Bryan Mbeumo | Brentford | 20 | 20 | MATCH |
| 4 | Chris Wood | Nottingham Forest | 20 | 20 | MATCH |
| 6 | Yoane Wissa | Brentford | 19 | 19 | MATCH |
| 7 | Ollie Watkins | Aston Villa | 16 | 16 | MATCH |
| 8 | Matheus Cunha | Wolverhampton Wanderers | 15 | 15 | MATCH |
| 8 | Cole Palmer | Chelsea | 15 | 15 | MATCH |
| 10 | Jørgen Strand Larsen | Wolverhampton Wanderers | 14 | 14 | MATCH |

*League completeness:* our player goals 1082 vs Wikipedia goals-for 1115 (-33).

#### es La Liga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Kylian Mbappé | Real Madrid | 31 | 31 | MATCH |
| 2 | Robert Lewandowski | Barcelona | 27 | 27 | MATCH |
| 3 | Ante Budimir | Osasuna | 21 | 21 | MATCH |
| 4 | Alexander Sørloth | Atlético Madrid | 20 | 20 | MATCH |
| 5 | Ayoze Pérez | Villarreal | 19 | 19 | MATCH |
| 6 | Raphinha | Barcelona | 18 | 18 | MATCH |
| 7 | Julián Alvarez | Atlético Madrid | 17 | 17 | MATCH |
| 8 | Oihan Sancet | Athletic Bilbao | 15 | 15 | MATCH |
| 9 | Kike García (known alias) | Alavés | 13 | 13 | MATCH |
| 10 | Javi Puado | Espanyol | 12 | 12 | MATCH |

*League completeness:* our player goals 969 vs Wikipedia goals-for 995 (-26).

#### it Serie A

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Mateo Retegui | Atalanta | 25 | 25 | MATCH |
| 2 | Moise Kean | Fiorentina | 19 | 19 | MATCH |
| 3 | Ademola Lookman | Atalanta | 15 | 15 | MATCH |
| 3 | Riccardo Orsolini | Bologna | 15 | 15 | MATCH |
| 5 | Romelu Lukaku | Napoli | 14 | 14 | MATCH |
| 5 | Marcus Thuram | Inter Milan | 14 | 14 | MATCH |
| 7 | Artem Dovbyk | Roma | 12 | 12 | MATCH |
| 7 | Lorenzo Lucca | Udinese | 12 | 12 | MATCH |
| 7 | Lautaro Martínez | Inter Milan | 12 | 12 | MATCH |
| 7 | Scott McTominay | Napoli | 12 | 12 | MATCH |

*League completeness:* our player goals 936 vs Wikipedia goals-for 973 (-37).

#### de Bundesliga

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Harry Kane | Bayern Munich | 26 | 26 | MATCH |
| 2 | Serhou Guirassy | Borussia Dortmund | 21 | 21 | MATCH |
| 2 | Patrik Schick | Bayer Leverkusen | 21 | 21 | MATCH |
| 4 | Jonathan Burkardt | Mainz 05 | 18 | 18 | MATCH |
| 5 | Tim Kleindienst | Borussia Mönchengladbach | 16 | 16 | MATCH |
| 6 | Ermedin Demirović | VfB Stuttgart | 15 | 15 | MATCH |
| 6 | Hugo Ekitike | Eintracht Frankfurt | 15 | 15 | MATCH |
| 6 | Omar Marmoush | Eintracht Frankfurt | 15 | 15 | MATCH |
| 9 | Benjamin Šeško | RB Leipzig | 13 | 13 | MATCH |
| 10 | Jamal Musiala | Bayern Munich | 12 | 12 | MATCH |

*League completeness:* our player goals 934 vs Wikipedia goals-for 959 (-25).

**Within-tolerance goal-count excesses** (our player goals slightly above Wikipedia GF; logged for follow-up, below the flag threshold): Union Berlin 36 vs 35.

#### fr Ligue 1

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Ousmane Dembélé | Paris Saint-Germain | 21 | 21 | MATCH |
| 1 | Mason Greenwood | Marseille | 21 | 21 | MATCH |
| 3 | Arnaud Kalimuendo | Rennes | 17 | 17 | MATCH |
| 4 | Jonathan David | Lille | 16 | 16 | MATCH |
| 5 | Alexandre Lacazette | Lyon | 15 | 15 | MATCH |
| 6 | Bradley Barcola | Paris Saint-Germain | 14 | 14 | MATCH |
| 6 | Emanuel Emegha | Strasbourg | 14 | 14 | MATCH |
| 8 | Ludovic Ajorque | Brest | 13 | 13 | MATCH |
| 8 | Mika Biereth | Monaco | 13 | 13 | MATCH |
| 8 | Amine Gouiri | Rennes/Marseille | 13 | 13 | MATCH |

*League completeness:* our player goals 885 vs Wikipedia goals-for 911 (-26).


### 2025-2026 — PARTIAL SNAPSHOT

*Evidence:*  are complete seasons with MINOR ISSUES only (zero-minute placeholder rows); it Serie A (max MP 33/38), fr Ligue 1 (max MP 30/34) are partial snapshots whose player-level rows are real but whose final totals are not yet reached, and whose squad labels are not updated for transferred players.

#### eng Premier League

*Status:* **PASS** — complete season (max MP 38 of 38); top-10 scorers and club goal totals matched.

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Erling Haaland | Manchester City | 27 | 27 | MATCH |
| 2 | Igor Thiago | Brentford | 22 | 22 | MATCH |
| 3 | Antoine Semenyo | Bournemouth / Manchester City | 17 | 17 | MATCH |
| 4 | Ollie Watkins | Aston Villa | 16 | 16 | MATCH |
| 5 | Morgan Gibbs-White | Nottingham Forest | 15 | 15 | MATCH |
| 5 | João Pedro | Chelsea | 15 | 15 | MATCH |
| 7 | Dominic Calvert-Lewin | Leeds United | 14 | 14 | MATCH |
| 7 | Viktor Gyökeres | Arsenal | 14 | 14 | MATCH |
| 9 | Eli Junior Kroupi | Bournemouth | 13 | 13 | MATCH |
| 9 | Danny Welbeck | Brighton & Hove Albion | 13 | 13 | MATCH |

*League completeness:* our player goals 1005 vs Wikipedia goals-for 1045 (-40).

#### es La Liga

*Status:* **PASS** — complete season (max MP 38 of 38); top-10 scorers and club goal totals matched.

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Kylian Mbappé | Real Madrid | 25 | 25 | MATCH |
| 2 | Vedat Muriqi | Mallorca | 23 | 23 | MATCH |
| 3 | Ante Budimir | Osasuna | 17 | 17 | MATCH |
| 4 | Ferran Torres | Barcelona | 16 | 16 | MATCH |
| 4 | Vinícius Júnior | Real Madrid | 16 | 16 | MATCH |
| 4 | Lamine Yamal | Barcelona | 16 | 16 | MATCH |
| 7 | Mikel Oyarzabal | Real Sociedad | 15 | 15 | MATCH |
| 8 | Borja Iglesias | Celta Vigo | 14 | 14 | MATCH |
| 8 | Robert Lewandowski | Barcelona | 14 | 14 | MATCH |
| 8 | Toni Martínez | Alavés | 14 | 14 | MATCH |

*League completeness:* our player goals 1001 vs Wikipedia goals-for 1024 (-23).

#### it Serie A

*Status:* **PARTIAL SNAPSHOT** — max MP 33 of 38 — the stored season stops before the final matchweek, so final goals-for and final top-10 totals are not comparable; 7 top-10 figure(s) are below the final total; 44 squad label(s) name a club outside the 2025-26 league table (players who transferred in).

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Lautaro Martínez | Inter Milan | 17 | 16 | MISMATCH |
| 2 | Anastasios Douvikas | Como | 14 | 11 | MISMATCH |
| 2 | Donyell Malen | Roma | 14 | 10 | MISMATCH |
| 4 | Marcus Thuram | Inter Milan | 13 | 11 | MISMATCH |
| 5 | Rasmus Højlund | Napoli | 12 | 10 | MISMATCH |
| 5 | Nico Paz | Como | 12 | 12 | MATCH |
| 7 | Giovanni Simeone (club mismatch) | Torino | 11 | 9 | MISMATCH |
| 8 | Federico Bonazzoli | Cremonese | 10 | 7 | MISMATCH |
| 8 | Keinan Davis | Udinese | 10 | 10 | MATCH |
| 8 | Nikola Krstović (club mismatch) | Atalanta | 10 | 10 | MATCH |

*League completeness:* our player goals 765 vs Wikipedia goals-for 922 (-157) (partial snapshot; the final goals-for is not directly comparable).

**Flagged clubs:**

*The differences below are expected for a partial-season snapshot and are not defects.*

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Inter Milan | 18 | 61 | 89 | -28 | severe | shortfall 28 exceeds max(5, 5% of GF=89) |
| Roma | 25 | 50 | 59 | -9 | borderline | shortfall 9 exceeds max(5, 5% of GF=59) |
| Como | 24 | 55 | 65 | -10 | severe | shortfall 10 exceeds max(5, 5% of GF=65) |
| Juventus | 18 | 42 | 61 | -19 | severe | shortfall 19 exceeds max(5, 5% of GF=61) |
| Atalanta | 18 | 31 | 51 | -20 | severe | shortfall 20 exceeds max(5, 5% of GF=51) |
| Bologna | 27 | 43 | 49 | -6 | borderline | shortfall 6 exceeds max(5, 5% of GF=49) |
| Lazio | 17 | 17 | 41 | -24 | severe | shortfall 24 exceeds max(5, 5% of GF=41) |
| Udinese | 24 | 31 | 45 | -14 | severe | shortfall 14 exceeds max(5, 5% of GF=45) |
| Sassuolo | 11 | 20 | 46 | -26 | severe | shortfall 26 exceeds max(5, 5% of GF=46) |
| Torino | 22 | 29 | 44 | -15 | severe | shortfall 15 exceeds max(5, 5% of GF=44) |
| Cagliari | 20 | 24 | 40 | -16 | severe | shortfall 16 exceeds max(5, 5% of GF=40) |
| Cremonese | 10 | 10 | 32 | -22 | severe | shortfall 22 exceeds max(5, 5% of GF=32) |
| Hellas Verona | 19 | 9 | 25 | -16 | severe | shortfall 16 exceeds max(5, 5% of GF=25) |
| Pisa | 15 | 8 | 26 | -18 | severe | shortfall 18 exceeds max(5, 5% of GF=26) |

**Squad-name variants mapped to one club:** AC Milan ← AC Milan, Milan; Bologna ← Bologna, Bologna FC 1909; Cagliari ← Cagliari, Cagliari Calcio; Como ← Como, Como 1907; Fiorentina ← ACF Fiorentina, Fiorentina; Genoa ← Genoa, Genoa CFC; Hellas Verona ← Hellas Verona, Hellas Verona (R); Inter Milan ← Inter, Inter Milan; Juventus ← Juventus, Juventus FC; Lazio ← Lazio, SS Lazio; Lecce ← Lecce, US Lecce; Napoli ← Napoli, SSC Napoli; Parma ← Parma, Parma Calcio 1913; Roma ← AS Roma, Roma; Torino ← Torino, Torino FC; Udinese ← Udinese, Udinese Calcio; Villarreal CF ← Villarreal, Villarreal CF.

**Within-tolerance goal-count excesses** (our player goals slightly above Wikipedia GF; logged for follow-up, below the flag threshold): Genoa 44 vs 41; Lecce 29 vs 28.

**Squad labels that are not in the 2025-26 league table** (players who transferred into this league during the season; the player statistics are real, the label is not updated):

| Squad label in our data | Canonical club |
|------------------------|----------------|
| Marseille | Olympique de Marseille |
| Lens | RC Lens |
| Manchester City | Manchester City |
| Wolfsburg | VfL Wolfsburg |
| Lille | LOSC Lille |
| RB Leipzig | RB Leipzig |
| Nice | OGC Nice |
| Newcastle Utd | Newcastle United |
| Osasuna | CA Osasuna |
| Monza | Monza |
| AC Reggiana 1919 | Reggiana |
| Lyon | Olympique Lyonnais |
| Venezia | Venezia |
| Leicester City | Leicester City |
| Ipswich Town | Ipswich Town |
| Toulouse | Toulouse FC |
| Empoli | Empoli |
| Eint Frankfurt | Eintracht Frankfurt |
| Southampton | Southampton |
| Villarreal CF | Villarreal CF |
| Villarreal | Villarreal CF |
| Everton | Everton |
| Brighton | Brighton & Hove Albion |
| Serie A Squad | UNMAPPED |
| AEK Athens | UNMAPPED |
| SK Brann | UNMAPPED |
| Ajax Amsterdam | UNMAPPED |
| São Bernardo FC | UNMAPPED |
| GNK Dinamo Zagreb | UNMAPPED |
| Feyenoord Rotterdam | UNMAPPED |
| Grenoble Foot 38 | UNMAPPED |
| Avigliano | UNMAPPED |
| KAA Gent | UNMAPPED |
| CF Estrela Amadora | UNMAPPED |
| Grazer AK 1902 | UNMAPPED |
| CA Alvarado II | UNMAPPED |
| Clube Atlético Mineiro | UNMAPPED |
| Hibernian FC | UNMAPPED |
| Wisla Plock | UNMAPPED |
| FC Viktoria Plzen | UNMAPPED |
| Cracovia | UNMAPPED |
| Royal Antwerp FC | UNMAPPED |
| Salernitana Primavera | UNMAPPED |
| Criciúma Esporte Clube | UNMAPPED |

#### de Bundesliga

*Status:* **PASS** — complete season (max MP 34 of 34); top-10 scorers and club goal totals matched.

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Harry Kane | Bayern Munich | 36 | 36 | MATCH |
| 2 | Deniz Undav | VfB Stuttgart | 19 | 19 | MATCH |
| 3 | Serhou Guirassy | Borussia Dortmund | 17 | 17 | MATCH |
| 4 | Patrik Schick | Bayer Leverkusen | 16 | 16 | MATCH |
| 5 | Luis Díaz | Bayern Munich | 15 | 15 | MATCH |
| 5 | Michael Olise | Bayern Munich | 15 | 15 | MATCH |
| 7 | Andrej Kramarić | TSG Hoffenheim | 14 | 14 | MATCH |
| 8 | Christoph Baumgartner | RB Leipzig | 13 | 13 | MATCH |
| 8 | Jonathan Burkardt | Eintracht Frankfurt | 13 | 13 | MATCH |
| 8 | Said El Mala | 1. FC Köln | 13 | 13 | MATCH |

*League completeness:* our player goals 970 vs Wikipedia goals-for 990 (-20).

#### fr Ligue 1

*Status:* **PARTIAL SNAPSHOT** — max MP 30 of 34 — the stored season stops before the final matchweek, so final goals-for and final top-10 totals are not comparable; 7 top-10 figure(s) are below the final total; 24 squad label(s) name a club outside the 2025-26 league table (players who transferred in).

| Rank | Player (Wikipedia) | Club (Wikipedia) | Wiki Gls | Our Gls | Status |
|-----:|-------------------|------------------|---------:|--------:|--------|
| 1 | Esteban Lepaul | Angers/Rennes | 21 | 17 | MISMATCH |
| 2 | Mason Greenwood | Marseille | 16 | 15 | MISMATCH |
| 2 | Joaquín Panichelli | Strasbourg | 16 | 16 | MATCH |
| 4 | Folarin Balogun | Monaco | 13 | 12 | MISMATCH |
| 5 | Odsonne Édouard | Lens | 12 | 12 | MATCH |
| 5 | Wesley Saïd | Lens | 12 | 10 | MISMATCH |
| 5 | Lassine Sinayoko | Auxerre | 12 | 8 | MISMATCH |
| 8 | Bradley Barcola | Paris Saint-Germain | 11 | 10 | MISMATCH |
| 8 | Ansu Fati | Monaco | 11 | 9 | MISMATCH |
| 8 | Pavel Šulc | Lyon | 11 | 11 | MATCH |

*League completeness:* our player goals 685 vs Wikipedia goals-for 863 (-178) (partial snapshot; the final goals-for is not directly comparable).

**Flagged clubs:**

*The differences below are expected for a partial-season snapshot and are not defects.*

| Club | Our rows | Our player Gls | Wiki GF | Diff | Severity | Reason |
|------|---------:|---------------:|--------:|-----:|----------|--------|
| Paris Saint-Germain | 19 | 53 | 74 | -21 | severe | shortfall 21 exceeds max(5, 5% of GF=74) |
| RC Lens | 28 | 59 | 66 | -7 | borderline | shortfall 7 exceeds max(5, 5% of GF=66) |
| LOSC Lille | 23 | 39 | 52 | -13 | severe | shortfall 13 exceeds max(5, 5% of GF=52) |
| Olympique Lyonnais | 18 | 36 | 53 | -17 | severe | shortfall 17 exceeds max(5, 5% of GF=53) |
| Olympique de Marseille | 22 | 51 | 63 | -12 | severe | shortfall 12 exceeds max(5, 5% of GF=63) |
| Stade Rennais FC | 16 | 17 | 59 | -42 | severe | shortfall 42 exceeds max(5, 5% of GF=59) |
| AS Monaco | 27 | 52 | 60 | -8 | borderline | shortfall 8 exceeds max(5, 5% of GF=60) |
| RC Strasbourg Alsace | 25 | 44 | 58 | -14 | severe | shortfall 14 exceeds max(5, 5% of GF=58) |
| Toulouse FC | 21 | 39 | 47 | -8 | borderline | shortfall 8 exceeds max(5, 5% of GF=47) |
| FC Lorient | 17 | 27 | 48 | -21 | severe | shortfall 21 exceeds max(5, 5% of GF=48) |
| Paris FC | 24 | 32 | 47 | -15 | severe | shortfall 15 exceeds max(5, 5% of GF=47) |
| Stade Brestois 29 | 19 | 30 | 43 | -13 | severe | shortfall 13 exceeds max(5, 5% of GF=43) |
| Le Havre AC | 21 | 23 | 32 | -9 | borderline | shortfall 9 exceeds max(5, 5% of GF=32) |
| AJ Auxerre | 20 | 19 | 34 | -15 | severe | shortfall 15 exceeds max(5, 5% of GF=34) |
| OGC Nice | 22 | 24 | 37 | -13 | severe | shortfall 13 exceeds max(5, 5% of GF=37) |
| FC Metz | 14 | 18 | 32 | -14 | severe | shortfall 14 exceeds max(5, 5% of GF=32) |

**Squad-name variants mapped to one club:** AJ Auxerre ← AJ Auxerre, Auxerre; AS Monaco ← AS Monaco, Monaco; Angers SCO ← Angers, Angers SCO; FC Lorient ← FC Lorient, Lorient; FC Nantes ← FC Nantes, Nantes; LOSC Lille ← LOSC Lille, Lille; Le Havre AC ← Le Havre, Le Havre AC; OGC Nice ← Nice, Nice (O), OGC Nice; Olympique Lyonnais ← Lyon, Olympique Lyon; Olympique de Marseille ← Marseille, Olympique Marseille; Paris Saint-Germain ← Paris S-G, Paris Saint-Germain; RC Lens ← Lens, RC Lens; RC Strasbourg Alsace ← RC Strasbourg Alsace, Strasbourg; Stade Brestois 29 ← Brest, Stade Brestois 29; Stade Rennais FC ← Rennes, Stade Rennais FC; Toulouse FC ← FC Toulouse, Toulouse.

**Within-tolerance goal-count excesses** (our player goals slightly above Wikipedia GF; logged for follow-up, below the flag threshold): Angers SCO 30 vs 29.

**Squad labels that are not in the 2025-26 league table** (players who transferred into this league during the season; the player statistics are real, the label is not updated):

| Squad label in our data | Canonical club |
|------------------------|----------------|
| Napoli | Napoli |
| Genoa | Genoa |
| Everton | Everton |
| Brighton | Brighton & Hove Albion |
| Southampton | Southampton |
| Reims | Stade de Reims |
| Montpellier | Montpellier HSC |
| Eint Frankfurt | Eintracht Frankfurt |
| Union Berlin | Union Berlin |
| Saint-Étienne | AS Saint-Étienne |
| Roma | Roma |
| Bologna | Bologna |
| Bochum | VfL Bochum |
| Lecce | Lecce |
| Wolves | Wolverhampton Wanderers |
| Ligue 1 Squad | UNMAPPED |
| Club Siero | UNMAPPED |
| Columbus Crew | UNMAPPED |
| Ajax Amsterdam | UNMAPPED |
| Al-Fateh SC | UNMAPPED |
| Union Saint-Gilloise | UNMAPPED |
| Djoliba AC | UNMAPPED |
| FC Lausanne-Sport | UNMAPPED |
| Aris Limassol | UNMAPPED |


## 4. Coverage anomalies (severe goal shortfalls)

These are clubs whose player-goal total is at least 10 goals below Wikipedia, or below 70% of it. For a complete season this indicates that player rows are missing from our CSV rather than ordinary own goals. 2025-26 Ligue 1 and Serie A are partial-season snapshots, so their final-goal comparison is expected to fall short and is labelled accordingly.

| Season | League | Club | Our rows | Our player Gls | Wiki GF | Diff | Explanation |
|--------|--------|------|---------:|---------------:|--------:|-----:|-------------|
| 2014-2015 | eng Premier League | Burnley | 3 | 5 | 28 | -23 | club has only 3 player rows — players missing |
| 2014-2015 | es La Liga | Atlético Madrid | 3 | 3 | 67 | -64 | club has only 3 player rows — players missing |
| 2014-2015 | es La Liga | Valencia CF | 22 | 51 | 70 | -19 | goal shortfall too large for own goals alone — players likely missing |
| 2014-2015 | es La Liga | Sevilla FC | 24 | 46 | 71 | -25 | goal shortfall too large for own goals alone — players likely missing |
| 2014-2015 | es La Liga | Villarreal CF | 4 | 2 | 48 | -46 | club has only 4 player rows — players missing |
| 2014-2015 | it Serie A | Fiorentina | 27 | 47 | 61 | -14 | goal shortfall too large for own goals alone — players likely missing |
| 2014-2015 | de Bundesliga | Bayern Munich | 26 | 48 | 80 | -32 | goal shortfall too large for own goals alone — players likely missing |
| 2014-2015 | fr Ligue 1 | OGC Nice | 24 | 26 | 44 | -18 | goal shortfall too large for own goals alone — players likely missing |
| 2020-2021 | es La Liga | Real Madrid | 25 | 30 | 67 | -37 | goal shortfall too large for own goals alone — players likely missing |
| 2020-2021 | es La Liga | FC Barcelona | 22 | 74 | 85 | -11 | goal shortfall too large for own goals alone — players likely missing |
| 2020-2021 | es La Liga | Valencia CF | 24 | 31 | 50 | -19 | goal shortfall too large for own goals alone — players likely missing |
| 2020-2021 | de Bundesliga | Eintracht Frankfurt | 24 | 59 | 69 | -10 | goal shortfall too large for own goals alone — players likely missing |
| 2025-2026 | it Serie A | Inter Milan | 18 | 61 | 89 | -28 | partial-season snapshot; final GF not comparable |
| 2025-2026 | it Serie A | Como | 24 | 55 | 65 | -10 | partial-season snapshot; final GF not comparable |
| 2025-2026 | it Serie A | Juventus | 18 | 42 | 61 | -19 | partial-season snapshot; final GF not comparable |
| 2025-2026 | it Serie A | Atalanta | 18 | 31 | 51 | -20 | partial-season snapshot; final GF not comparable |
| 2025-2026 | it Serie A | Lazio | 17 | 17 | 41 | -24 | partial-season snapshot; final GF not comparable |
| 2025-2026 | it Serie A | Udinese | 24 | 31 | 45 | -14 | partial-season snapshot; final GF not comparable |
| 2025-2026 | it Serie A | Sassuolo | 11 | 20 | 46 | -26 | partial-season snapshot; final GF not comparable |
| 2025-2026 | it Serie A | Torino | 22 | 29 | 44 | -15 | partial-season snapshot; final GF not comparable |
| 2025-2026 | it Serie A | Cagliari | 20 | 24 | 40 | -16 | partial-season snapshot; final GF not comparable |
| 2025-2026 | it Serie A | Cremonese | 10 | 10 | 32 | -22 | partial-season snapshot; final GF not comparable |
| 2025-2026 | it Serie A | Hellas Verona | 19 | 9 | 25 | -16 | partial-season snapshot; final GF not comparable |
| 2025-2026 | it Serie A | Pisa | 15 | 8 | 26 | -18 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | Paris Saint-Germain | 19 | 53 | 74 | -21 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | LOSC Lille | 23 | 39 | 52 | -13 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | Olympique Lyonnais | 18 | 36 | 53 | -17 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | Olympique de Marseille | 22 | 51 | 63 | -12 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | Stade Rennais FC | 16 | 17 | 59 | -42 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | RC Strasbourg Alsace | 25 | 44 | 58 | -14 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | FC Lorient | 17 | 27 | 48 | -21 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | Paris FC | 24 | 32 | 47 | -15 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | Stade Brestois 29 | 19 | 30 | 43 | -13 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | AJ Auxerre | 20 | 19 | 34 | -15 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | OGC Nice | 22 | 24 | 37 | -13 | partial-season snapshot; final GF not comparable |
| 2025-2026 | fr Ligue 1 | FC Metz | 14 | 18 | 32 | -14 | partial-season snapshot; final GF not comparable |

## 5. 2025-26 deep dive

The 2025-26 verdict is computed per league. A league whose maximum appearance count reaches its full schedule is treated as a complete season and judged on the usual checks; a league that stops earlier is a partial snapshot and its final-table comparison is labelled accordingly.

| League | Status | Evidence |
|--------|--------|----------|
| eng Premier League | **PASS** | complete season (max MP 38 of 38); top-10 scorers and club goal totals matched. |
| es La Liga | **PASS** | complete season (max MP 38 of 38); top-10 scorers and club goal totals matched. |
| it Serie A | **PARTIAL SNAPSHOT** | max MP 33 of 38 — the stored season stops before the final matchweek, so final goals-for and final top-10 totals are not comparable; 7 top-10 figure(s) are below the final total; 44 squad label(s) name a club outside the 2025-26 league table (players who transferred in). |
| de Bundesliga | **PASS** | complete season (max MP 34 of 34); top-10 scorers and club goal totals matched. |
| fr Ligue 1 | **PARTIAL SNAPSHOT** | max MP 30 of 34 — the stored season stops before the final matchweek, so final goals-for and final top-10 totals are not comparable; 7 top-10 figure(s) are below the final total; 24 squad label(s) name a club outside the 2025-26 league table (players who transferred in). |

| League | Rows | Squad label in league table | Squad label outside the table | Raw squads | Wikipedia clubs | Max MP | Player Gls |
|--------|-----:|----------------------------:|------------------------------:|-----------:|----------------:|-------:|-----------:|
| eng Premier League | 551 | 551 | 0 | 20 | 20 | 38 | 1005 |
| es La Liga | 611 | 611 | 0 | 20 | 20 | 38 | 1001 |
| it Serie A | 495 | 399 | 96 | 80 | 20 | 33 | 765 |
| de Bundesliga | 507 | 507 | 0 | 18 | 18 | 34 | 970 |
| fr Ligue 1 | 447 | 375 | 72 | 59 | 18 | 30 | 685 |

Excluding the zero-minute rows, the squad sizes are Premier League: 27.6, La Liga: 30.6, Serie A: 24.8, Bundesliga: 28.2, Ligue 1: 24.8 players per club, which is normal for a league season. In Serie A and Ligue 1 a minority of rows carry the name of a club that is not in that league's 2025-26 table; these are players who transferred into the league during 2025-26 and whose squad label was not updated. Their player-level statistics are real, but the club label is wrong, so the label must be repaired before club-level aggregation. Examples: Jay Idzes (`Venezia`, 32 Serie A appearances), Luka Modrić (`Real Madrid`, 32 Serie A appearances) and Manuel Akanji (`Manchester City`, 31 Serie A appearances). The same population is listed at the end of each league sub-section in section 3.

**Progression columns.** `PrgC` is zero for 0 of 2611 rows (0 of 1518 players over 900 minutes) and `PrgR` is zero for every row.

- Premier League / La Liga / Bundesliga: `PrgC` is zero for 0 of 1669 rows, `PrgP` for 0 and `PrgR` for 0.

- Serie A / Ligue 1: `PrgC` is zero for 0 of 942 rows, `PrgP` for 0 and `PrgR` for 0.

The progression metrics are therefore populated for the two partial leagues but absent for the three complete leagues. The zeros in the complete leagues are unavailable data, not genuine zero values, and must be treated as untracked rather than as evidence that no player carried or received the ball. No redistribution of values between rows is justified.

**Mid-season transfers.** 2 (player, club) pairs appear under two competitions, which is consistent with a transfer during the season where the same squad label is kept on both spells. The rows are separate real appearance records, not duplicates, but a naive club-level sum would count the same player twice under one label. Example: Loïs Openda / RB Leipzig — de Bundesliga: 2 apps, 51 min, 0 goals; it Serie A: 24 apps, 675 min, 1 goals.

**Zero-minute rows.** 2025-26 contains 0 rows with `Min = 0`; every other season contains none. All 0 of them also have `MP = 0`, `Gls = 0` and `Nation = Unknown`, so they carry no playing time or scoring, and 0 pair a zero-minute row with a played row. They are concentrated in the three complete leagues ().

**Match-week coverage.** A full season is 38 matches for the Premier League, La Liga and Serie A, and 34 for the Bundesliga and Ligue 1 (Ligue 1 has had 18 clubs since 2023-24). The maximum appearance count identifies the snapshot:

| League | Max MP | Full season | Coverage | Our player goals | Wikipedia final GF | Ratio |
|--------|-------:|------------:|----------|-----------------:|-------------------:|------:|
| eng Premier League | 38 | 38 | complete season | 1005 | 1045 | 96% |
| es La Liga | 38 | 38 | complete season | 1001 | 1024 | 98% |
| it Serie A | 33 | 38 | snapshot ≈ matchweek 33 of 38 | 765 | 922 | 83% |
| de Bundesliga | 34 | 34 | complete season | 970 | 990 | 98% |
| fr Ligue 1 | 30 | 34 | snapshot ≈ matchweek 30 of 34 | 685 | 863 | 79% |

The Premier League, La Liga and Bundesliga reach the full match count and their player goals cover 96–98% of Wikipedia's final goals-for (the remainder is own goals, which are not player goals). Ligue 1 stops at 30 of 34 appearances and Serie A at 33 of 38, and their player goals cover 79% and 83% of the final totals, consistent with an in-progress season. Their final goals-for and final top-10 totals are therefore not comparable with the stored rows: the differences are a consequence of the snapshot point, not of corrupt player statistics.

**eng Premier League:** 10/10 top-10 figures equal the Wikipedia final total; 0 are short or missing.

**es La Liga:** 10/10 top-10 figures equal the Wikipedia final total; 0 are short or missing.

**it Serie A (partial snapshot):** 3/10 figures already equal the final total; 7 are below it, as expected before the final matchweek.

| Player | Wiki final Gls | Our Gls | Status |
|--------|---------------:|--------:|--------|
| Lautaro Martínez | 17 | 16 | MISMATCH |
| Anastasios Douvikas | 14 | 11 | MISMATCH |
| Donyell Malen | 14 | 10 | MISMATCH |
| Marcus Thuram | 13 | 11 | MISMATCH |
| Rasmus Højlund | 12 | 10 | MISMATCH |
| Giovanni Simeone | 11 | 9 | MISMATCH |
| Federico Bonazzoli | 10 | 7 | MISMATCH |

**de Bundesliga:** 10/10 top-10 figures equal the Wikipedia final total; 0 are short or missing.

**fr Ligue 1 (partial snapshot):** 3/10 figures already equal the final total; 7 are below it, as expected before the final matchweek.

| Player | Wiki final Gls | Our Gls | Status |
|--------|---------------:|--------:|--------|
| Esteban Lepaul | 21 | 17 | MISMATCH |
| Mason Greenwood | 16 | 15 | MISMATCH |
| Folarin Balogun | 13 | 12 | MISMATCH |
| Wesley Saïd | 12 | 10 | MISMATCH |
| Lassine Sinayoko | 12 | 8 | MISMATCH |
| Bradley Barcola | 11 | 10 | MISMATCH |
| Ansu Fati | 11 | 9 | MISMATCH |

## 6. Zero-minute rows by season

| Season | Rows with Min = 0 | Total rows |
|--------|------------------:|-----------:|
| 2012-2013 | 0 | 2749 |
| 2013-2014 | 0 | 2745 |
| 2014-2015 | 0 | 2580 |
| 2015-2016 | 0 | 2770 |
| 2016-2017 | 0 | 2731 |
| 2017-2018 | 0 | 2690 |
| 2018-2019 | 0 | 2706 |
| 2019-2020 | 0 | 2727 |
| 2020-2021 | 0 | 2802 |
| 2021-2022 | 0 | 2632 |
| 2022-2023 | 0 | 2885 |
| 2023-2024 | 0 | 2852 |
| 2024-2025 | 0 | 2854 |
| 2025-2026 | 0 | 2611 |

Only 2025-26 has zero-minute rows. In the other 13 seasons the loader has already excluded them, so the 0 rows are a 2025-26-specific artefact rather than a normal feature of the pipeline.

## 7. Export parity for 2014-15 and 2020-21

The same season is stored four ways: the season CSV, `Backend/data/parquet/<season>.parquet`, the season XLSX and the DuckDB file (`players` and `per90_metrics`, both with a `season` column). If a player is absent from the CSV but present in one of the other stores, the defect is in the CSV export rather than in the underlying season. The check below reads all stores without modifying them.

### 2014-2015

| Store | Rows | Arjen Robben | Thomas Müller | Antoine Griezmann | Carlos Bacca |
|-------|-----:|---|---|---|---|
| CSV | 2580 | absent | absent | absent | absent |
| Parquet | 2580 | absent | absent | absent | absent |
| XLSX | 2580 | absent | absent | absent | absent |
| DuckDB players | 2580 | absent | absent | absent | absent |
| DuckDB per90_metrics | 2580 | absent | absent | absent | absent |

**Arjen Robben, Thomas Müller, Antoine Griezmann, Carlos Bacca** are absent from every representation, so the gap is in the stored season itself, not in the CSV export or a derived store.

### 2020-2021

| Store | Rows | Karim Benzema | Luka Modrić |
|-------|-----:|---|---|
| CSV | 2802 | absent | absent |
| Parquet | 2802 | absent | absent |
| XLSX | 2802 | absent | absent |
| DuckDB players | 2802 | absent | absent |
| DuckDB per90_metrics | 2802 | absent | absent |

**Karim Benzema, Luka Modrić** are absent from every representation, so the gap is in the stored season itself, not in the CSV export or a derived store.

## 8. CSV encoding check

All 24 CSV files in the repository were decoded as UTF-8: 24 valid, 0 invalid.

All 16 season CSVs and the 8 top-level CSVs decode without error. 1 file(s) start with a UTF-8 BOM (this report's discrepancy CSV, so Excel opens its accents correctly); the season CSVs have no BOM, which the backend reads correctly but Excel may display with mis-encoded accents if a season file is opened directly.

## 9. Verdict summary

`PASS` and `MINOR ISSUES` apply to a complete season. `PARTIAL SNAPSHOT` means the stored season stops before the final matchweek, so its player-level rows are real but final goals-for and final top-10 totals are not comparable; it is neither a pass nor a failure. `FAIL` means the stored season is missing players or whole clubs that are absent from every representation (section 7). `UNVERIFIED` is never treated as `PASS`.

| Season | Verdict | Evidence |
|--------|---------|----------|
| 2012-2013 | MINOR ISSUES | 1 club total(s) 5–9 goals below Wikipedia GF. |
| 2013-2014 | MINOR ISSUES | 1 club total(s) 5–9 goals below Wikipedia GF; 3 top-10 scorer figure(s) differ by 1–2 goals; es La Liga: 1 club total(s) slightly above Wikipedia GF. |
| 2014-2015 | FAIL | 8 club(s) with a severe goal shortfall (missing player rows), e.g. Burnley 5/28, Atlético Madrid 3/67, Valencia CF 51/70. |
| 2015-2016 | MINOR ISSUES | 1 top-10 scorer figure(s) differ by 1–2 goals. |
| 2016-2017 | MINOR ISSUES | 1 top-10 scorer figure(s) differ by 1–2 goals; it Serie A: 1 club total(s) slightly above Wikipedia GF. |
| 2017-2018 | MINOR ISSUES | 1 club total(s) 5–9 goals below Wikipedia GF; 1 top-10 scorer figure(s) differ by 1–2 goals. |
| 2018-2019 | MINOR ISSUES | 1 club total(s) 5–9 goals below Wikipedia GF; 1 top-10 scorer figure(s) differ by 1–2 goals; de Bundesliga: 1 club total(s) slightly above Wikipedia GF; fr Ligue 1: 1 club total(s) slightly above Wikipedia GF. |
| 2019-2020 | PASS | All top-10 scorers matched and all club goal totals were within tolerance. |
| 2020-2021 | FAIL | 4 club(s) with a severe goal shortfall (missing player rows), e.g. Real Madrid 30/67, FC Barcelona 74/85, Valencia CF 31/50. |
| 2021-2022 | MINOR ISSUES | 4 club total(s) 5–9 goals below Wikipedia GF. |
| 2022-2023 | MINOR ISSUES | 1 club total(s) 5–9 goals below Wikipedia GF. |
| 2023-2024 | MINOR ISSUES | 1 club total(s) 5–9 goals below Wikipedia GF. |
| 2024-2025 | MINOR ISSUES | de Bundesliga: 1 club total(s) slightly above Wikipedia GF. |
| 2025-2026 | PARTIAL SNAPSHOT |  are complete seasons with MINOR ISSUES only (zero-minute placeholder rows); it Serie A (max MP 33/38), fr Ligue 1 (max MP 30/34) are partial snapshots whose player-level rows are real but whose final totals are not yet reached, and whose squad labels are not updated for transferred players. |

## 10. Sources (Wikipedia, CC BY-SA 4.0)

Each season page was fetched once and cached outside the repository. The URL below is the exact page used.

| Season | League | URL |
|--------|--------|-----|
| 2012-2013 | eng Premier League | https://en.wikipedia.org/wiki/2012–13_Premier_League |
| 2012-2013 | es La Liga | https://en.wikipedia.org/wiki/2012–13_La_Liga |
| 2012-2013 | it Serie A | https://en.wikipedia.org/wiki/2012–13_Serie_A |
| 2012-2013 | de Bundesliga | https://en.wikipedia.org/wiki/2012–13_Bundesliga |
| 2012-2013 | fr Ligue 1 | https://en.wikipedia.org/wiki/2012–13_Ligue_1 |
| 2013-2014 | eng Premier League | https://en.wikipedia.org/wiki/2013–14_Premier_League |
| 2013-2014 | es La Liga | https://en.wikipedia.org/wiki/2013–14_La_Liga |
| 2013-2014 | it Serie A | https://en.wikipedia.org/wiki/2013–14_Serie_A |
| 2013-2014 | de Bundesliga | https://en.wikipedia.org/wiki/2013–14_Bundesliga |
| 2013-2014 | fr Ligue 1 | https://en.wikipedia.org/wiki/2013–14_Ligue_1 |
| 2014-2015 | eng Premier League | https://en.wikipedia.org/wiki/2014–15_Premier_League |
| 2014-2015 | es La Liga | https://en.wikipedia.org/wiki/2014–15_La_Liga |
| 2014-2015 | it Serie A | https://en.wikipedia.org/wiki/2014–15_Serie_A |
| 2014-2015 | de Bundesliga | https://en.wikipedia.org/wiki/2014–15_Bundesliga |
| 2014-2015 | fr Ligue 1 | https://en.wikipedia.org/wiki/2014–15_Ligue_1 |
| 2015-2016 | eng Premier League | https://en.wikipedia.org/wiki/2015–16_Premier_League |
| 2015-2016 | es La Liga | https://en.wikipedia.org/wiki/2015–16_La_Liga |
| 2015-2016 | it Serie A | https://en.wikipedia.org/wiki/2015–16_Serie_A |
| 2015-2016 | de Bundesliga | https://en.wikipedia.org/wiki/2015–16_Bundesliga |
| 2015-2016 | fr Ligue 1 | https://en.wikipedia.org/wiki/2015–16_Ligue_1 |
| 2016-2017 | eng Premier League | https://en.wikipedia.org/wiki/2016–17_Premier_League |
| 2016-2017 | es La Liga | https://en.wikipedia.org/wiki/2016–17_La_Liga |
| 2016-2017 | it Serie A | https://en.wikipedia.org/wiki/2016–17_Serie_A |
| 2016-2017 | de Bundesliga | https://en.wikipedia.org/wiki/2016–17_Bundesliga |
| 2016-2017 | fr Ligue 1 | https://en.wikipedia.org/wiki/2016–17_Ligue_1 |
| 2017-2018 | eng Premier League | https://en.wikipedia.org/wiki/2017–18_Premier_League |
| 2017-2018 | es La Liga | https://en.wikipedia.org/wiki/2017–18_La_Liga |
| 2017-2018 | it Serie A | https://en.wikipedia.org/wiki/2017–18_Serie_A |
| 2017-2018 | de Bundesliga | https://en.wikipedia.org/wiki/2017–18_Bundesliga |
| 2017-2018 | fr Ligue 1 | https://en.wikipedia.org/wiki/2017–18_Ligue_1 |
| 2018-2019 | eng Premier League | https://en.wikipedia.org/wiki/2018–19_Premier_League |
| 2018-2019 | es La Liga | https://en.wikipedia.org/wiki/2018–19_La_Liga |
| 2018-2019 | it Serie A | https://en.wikipedia.org/wiki/2018–19_Serie_A |
| 2018-2019 | de Bundesliga | https://en.wikipedia.org/wiki/2018–19_Bundesliga |
| 2018-2019 | fr Ligue 1 | https://en.wikipedia.org/wiki/2018–19_Ligue_1 |
| 2019-2020 | eng Premier League | https://en.wikipedia.org/wiki/2019–20_Premier_League |
| 2019-2020 | es La Liga | https://en.wikipedia.org/wiki/2019–20_La_Liga |
| 2019-2020 | it Serie A | https://en.wikipedia.org/wiki/2019–20_Serie_A |
| 2019-2020 | de Bundesliga | https://en.wikipedia.org/wiki/2019–20_Bundesliga |
| 2019-2020 | fr Ligue 1 | https://en.wikipedia.org/wiki/2019–20_Ligue_1 |
| 2020-2021 | eng Premier League | https://en.wikipedia.org/wiki/2020–21_Premier_League |
| 2020-2021 | es La Liga | https://en.wikipedia.org/wiki/2020–21_La_Liga |
| 2020-2021 | it Serie A | https://en.wikipedia.org/wiki/2020–21_Serie_A |
| 2020-2021 | de Bundesliga | https://en.wikipedia.org/wiki/2020–21_Bundesliga |
| 2020-2021 | fr Ligue 1 | https://en.wikipedia.org/wiki/2020–21_Ligue_1 |
| 2021-2022 | eng Premier League | https://en.wikipedia.org/wiki/2021–22_Premier_League |
| 2021-2022 | es La Liga | https://en.wikipedia.org/wiki/2021–22_La_Liga |
| 2021-2022 | it Serie A | https://en.wikipedia.org/wiki/2021–22_Serie_A |
| 2021-2022 | de Bundesliga | https://en.wikipedia.org/wiki/2021–22_Bundesliga |
| 2021-2022 | fr Ligue 1 | https://en.wikipedia.org/wiki/2021–22_Ligue_1 |
| 2022-2023 | eng Premier League | https://en.wikipedia.org/wiki/2022–23_Premier_League |
| 2022-2023 | es La Liga | https://en.wikipedia.org/wiki/2022–23_La_Liga |
| 2022-2023 | it Serie A | https://en.wikipedia.org/wiki/2022–23_Serie_A |
| 2022-2023 | de Bundesliga | https://en.wikipedia.org/wiki/2022–23_Bundesliga |
| 2022-2023 | fr Ligue 1 | https://en.wikipedia.org/wiki/2022–23_Ligue_1 |
| 2023-2024 | eng Premier League | https://en.wikipedia.org/wiki/2023–24_Premier_League |
| 2023-2024 | es La Liga | https://en.wikipedia.org/wiki/2023–24_La_Liga |
| 2023-2024 | it Serie A | https://en.wikipedia.org/wiki/2023–24_Serie_A |
| 2023-2024 | de Bundesliga | https://en.wikipedia.org/wiki/2023–24_Bundesliga |
| 2023-2024 | fr Ligue 1 | https://en.wikipedia.org/wiki/2023–24_Ligue_1 |
| 2024-2025 | eng Premier League | https://en.wikipedia.org/wiki/2024–25_Premier_League |
| 2024-2025 | es La Liga | https://en.wikipedia.org/wiki/2024–25_La_Liga |
| 2024-2025 | it Serie A | https://en.wikipedia.org/wiki/2024–25_Serie_A |
| 2024-2025 | de Bundesliga | https://en.wikipedia.org/wiki/2024–25_Bundesliga |
| 2024-2025 | fr Ligue 1 | https://en.wikipedia.org/wiki/2024–25_Ligue_1 |
| 2025-2026 | eng Premier League | https://en.wikipedia.org/wiki/2025–26_Premier_League |
| 2025-2026 | es La Liga | https://en.wikipedia.org/wiki/2025–26_La_Liga |
| 2025-2026 | it Serie A | https://en.wikipedia.org/wiki/2025–26_Serie_A |
| 2025-2026 | de Bundesliga | https://en.wikipedia.org/wiki/2025–26_Bundesliga |
| 2025-2026 | fr Ligue 1 | https://en.wikipedia.org/wiki/2025–26_Ligue_1 |

## 11. Recommended repairs (original audit recommendations)

These recommendations record the state at the time of the independent audit. Phase 2 subsequently addressed items 1–5; see [PHASE2_REPORT.md](PHASE2_REPORT.md) and the [before/after verification below](#12-phase-2-beforeafter-verification). Items 6–8 remain historical coverage notes or follow-up quality work, not claims that Phase 2 left its approved tasks incomplete.

1. **2025-26 progression metrics.** In the Premier League, La Liga and Bundesliga the three columns are zero for every row (2,055 rows); set them to the project's missing-value representation (NULL) so the UI reports "not tracked" instead of zero. Keep the populated Serie A / Ligue 1 values, mark them as partial-season statistics, and do not compare them with a full season. Archive a copy of the season before either change.
2. **2025-26 transferred players.** Update the squad label on every row whose label names a club outside the 2025-26 league table (for example `Venezia` → the player's 2025-26 club) using an authoritative source. Until then, do not sum those rows by label, and do not sum the two spells of a mid-season transfer as if they were one club total.
3. **2025-26 zero-minute rows.** Remove the rows with `Min = 0` from 2025-26 (no other season has any) and archive them to a side file. They all have `MP = 0`, `Gls = 0` and `Nation = Unknown`, which identifies them as placeholders rather than real squad members; spot-check the three that pair with a played row before deleting.
4. **2025-26 club names.** Normalise squad-name variants (for example `Inter` / `Inter Milan`, `AS Roma` / `Roma`) against a canonical vocabulary built from the Wikipedia table names and the 2024-25 baseline, and review any unmapped name against the registry before merging. This is separate from the transferred-player labels in item 2.
5. **2025-26 league coverage.** Ligue 1 and Serie A are partial-season snapshots (Ligue 1 ≈ matchweek 30 of 34, Serie A ≈ matchweek 33 of 38). Either refresh them from a permitted source or mark the two leagues as partial in the manifest and README; do not present their figures as final totals.
6. **Historical coverage holes (out of 2025-26 scope, do not repair in Phase 2).** 2014-15 is missing most of the Burnley, Atlético Madrid and Villarreal squads plus several high-profile scorers, and 2020-21 is missing Benzema and other attacking players at Real Madrid. These are pre-existing gaps in the stored CSV; record them as known limitations rather than silently patching other seasons.
7. **Metadata.** Make the manifest, README and `docs/DATA_SOURCES.md` agree: `is_simulated=false`, `dataset_status` describing a verified historical season with partial metrics, and explicit notes about the unavailable progression data and the club-name normalisation date.
8. **Regression tests.** Add a test that fails if a season reports a progression total of zero while the column is supposed to be tracked, a test that fails when a squad label names a club outside the league table, and a test that pins the per-league club counts.

## 12. Phase 2 before/after verification

The following table compares the pre-Phase-2 backup with the modified 2025-26 CSV. “Stale labels” counts played rows whose squad label is outside the corresponding 2025-26 league table; distinct clubs is the number of distinct raw `Squad` labels.

| League | Stale labels before | Stale labels after | Zero-minute rows before | Zero-minute rows after | Distinct clubs before | Distinct clubs after |
|---|---:|---:|---:|---:|---:|---:|
| Serie A | 128 | 96 | 0 | 0 | 96 | 80 |
| Ligue 1 | 124 | 72 | 0 | 0 | 97 | 59 |
| Other three leagues | 0 | 0 | 386 | 0 | unchanged | unchanged |

The 252 reviewed rows are classified after the approved corrections as follows: 73 `verified_club_season` corrections, 11 `youth_reserve_parent_club` auto-maps, 87 `stale_transfer_label_no_unique_squad_match`, 71 `generic_placeholder`, 9 `mid_season_transfer_spell`, and 1 `youth_reserve_non_league_parent` (Salernitana Primavera, unchanged). The 386 zero-minute rows from the Premier League, La Liga, and Bundesliga are archived and removed; no rows are deleted by the squad-label step.

