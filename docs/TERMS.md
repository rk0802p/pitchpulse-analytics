# PitchPulse Analytics — Terms of Use & Legal Disclaimers

> **IMPORTANT DISCLAIMER**: The information below outlines current development practices and technical boundaries. It is NOT legal advice.
> `TODO(lawyer)`: Draft and finalize end-user terms of service, API terms of use, and GDPR / privacy compliance policy prior to commercial deployment.

---

## 1. Non-Commercial Academic & Research Use Notice

PitchPulse Analytics is provided as an open-source analytics interface and research tool for European football statistics. 

- Data presented consists of public statistical compilations and derived metrics.
- No real-time tracking feeds, video, or official match broadcast streams are hosted or relayed.
- `TODO(lawyer)`: Define permitted non-commercial scope and establish commercial licensing terms if the service is monetized or offered as a paid SaaS product.

---

## 2. Third-Party Trademarks & Proprietary Rights

- All club names, crests, competition designations (e.g. "Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"), and federation marks are trademarks of their respective owners.
- Their reference within PitchPulse is solely for nominative identification and descriptive statistical analysis.
- `TODO(lawyer)`: Review nominative fair use guidelines regarding competition designations and team branding in relevant jurisdictions (UK, EU, US).

---

## 3. Data Accuracy & Warranty Disclaimer

- Statistical models ($xG$, $xAG$, progressive actions) are mathematical estimates and approximations of on-pitch events.
- Historical data is subject to provider adjustments and archival variances.
- PitchPulse provides all data "AS IS" without warranties of completeness, merchantability, or fitness for any particular scouting or commercial decision.
- `TODO(lawyer)`: Verify limitation of liability and warranty disclaimer clauses under applicable consumer protection and commercial law.

---

## 4. Administrative Security & API Boundaries

- Administrative ingestion endpoints (`/api/seasons/import`, `/api/seasons/active`) are restricted to authorized server operators via `ADMIN_TOKEN`.
- Direct file uploads are restricted to supported spreadsheet formats (`.csv`, `.xlsx`, `.xls`) with an immutable lock on baseline seasons.
- Remote URL fetching and local filesystem ingestion via the public HTTP API are disabled to prevent SSRF and unauthorized file access.
