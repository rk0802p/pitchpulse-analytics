const test = require('node:test');
const assert = require('node:assert/strict');
const { seasonService, dataLoader } = require('./dataLoader');
const {
  scatterMetricValue,
  getScatterChartData,
  performanceIndex,
  similarPlayers,
  pool,
} = require('./charts');

test('2024-2025 baseline SHA-256 integrity remains verified', () => {
  const result = seasonService.verifyBaselineIntegrity();
  assert.equal(result.verified, true);
  assert.equal(result.season, '2024-2025');
});

test('dataLoader marks multi-spell unsplit transfers with public shared_season_xg and nulls single-spell rates/deltas', () => {
  const records2526 = dataLoader.loadSeason('2025-2026');
  const sharedRows = records2526.filter((r) => r.shared_season_xg === true);
  assert.ok(sharedRows.length >= 100, `Expected >=100 shared_season_xg spell rows in 2025-2026, got ${sharedRows.length}`);

  for (const row of sharedRows) {
    assert.equal(row._shared_season_xg, true);
    assert.equal(row.xG_90, null);
    assert.equal(row.xAG_90, null);
    assert.equal(row['xG+xAG_90'], null);
    assert.equal(row.Gls_minus_xG, null);
  }
});

test('scatterMetricValue blocks shared_season_xg transfer rows from inflating per-90 xG/xAG rates', () => {
  const records2526 = dataLoader.loadSeason('2025-2026');
  const malenVilla = records2526.find(
    (r) => r.Player.toLowerCase().includes('malen') && r.Squad.toLowerCase().includes('aston villa')
  );
  assert.ok(malenVilla, 'Expected Donyell Malen (Aston Villa) spell in 2025-2026');
  assert.equal(malenVilla.shared_season_xg, true);
  assert.equal(scatterMetricValue(malenVilla, 'xG_90'), null);
  assert.equal(scatterMetricValue(malenVilla, 'xAG_90'), null);
  assert.equal(scatterMetricValue(malenVilla, 'xG+xAG_90'), null);
  assert.equal(scatterMetricValue(malenVilla, 'Gls_minus_xG'), null);
  assert.ok(typeof scatterMetricValue(malenVilla, 'Gls_90') === 'number', 'Gls_90 should still compute cleanly');

  const scatter = getScatterChartData(records2526, { xMetric: 'xG_90', yMetric: 'xAG_90', minMinutes: 270 });
  assert.equal(scatter.tracking_status, 'tracked');
  assert.ok(scatter.points.length > 500);
  const malenPlotted = scatter.points.find((p) => p.id === malenVilla.id);
  assert.equal(malenPlotted, undefined, 'Transferred spell with shared_season_xg must not be plotted on xG_90 scatter');
});

test('performanceIndex supports positional roles and re-normalizes weights when metrics are untracked', () => {
  const records2526 = dataLoader.loadSeason('2025-2026');

  // Midfielders preset relies on PrgP_90 & PrgC_90 which are untracked in 2025-2026
  const mf2526 = performanceIndex(records2526, { role: 'midfielders', minMinutes: 500, limit: 10 });
  assert.ok(mf2526.leaders.length === 10);
  assert.ok(mf2526.players.length === 10);
  assert.ok(mf2526.excluded_metrics.includes('PrgP_90'));
  assert.ok(mf2526.excluded_metrics.includes('PrgC_90'));
  assert.equal(mf2526.weights.PrgP_90, undefined);
  assert.equal(mf2526.weights.PrgC_90, undefined);

  const weightSum = Object.values(mf2526.weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(weightSum - 1.0) < 0.01, `Expected re-normalized weights to sum to 1.0, got ${weightSum}`);
  assert.ok(mf2526.leaders[0].performance_index > 80 && mf2526.leaders[0].performance_index <= 100);

  // Pre-xG season (2012-2013): forwards preset should exclude xG_90/npxG_90/xAG_90 and re-normalize over Gls_90 + Ast_90
  const records1213 = dataLoader.loadSeason('2012-2013');
  const fw1213 = performanceIndex(records1213, { role: 'forwards', minMinutes: 900, limit: 5 });
  assert.equal(fw1213.leaders.length, 5);
  assert.ok(fw1213.excluded_metrics.includes('xG_90'));
  const fw1213Sum = Object.values(fw1213.weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(fw1213Sum - 1.0) < 0.01);
});

test('similarPlayers handles partial-tracking eras without coercing untracked metrics to zero', () => {
  const records2526 = dataLoader.loadSeason('2025-2026');
  const kane = records2526.find((r) => r.Player === 'Harry Kane');
  assert.ok(kane, 'Expected Harry Kane in 2025-2026');

  const peerPool = pool(records2526, { minMinutes: 500 });
  const sims = similarPlayers(kane, peerPool, { k: 5 });
  assert.equal(sims.length, 5);
  for (const s of sims) {
    assert.ok(Number.isFinite(s.similarity) && s.similarity >= 10 && s.similarity <= 99.5);
    assert.notEqual(s.id, kane.id);
  }
});

test('server.js exports Express app and serves core API endpoints with HTTP 200', async () => {
  const app = require('../server');
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const [health, seasons, baseline, players, dashboard, mbappeHistory] = await Promise.all([
      fetch(`${baseUrl}/api/health`).then((r) => ({ status: r.status, body: r.json() })),
      fetch(`${baseUrl}/api/seasons`).then((r) => ({ status: r.status, body: r.json() })),
      fetch(`${baseUrl}/api/seasons/baseline/verify`).then((r) => ({ status: r.status, body: r.json() })),
      fetch(`${baseUrl}/api/players?season=2024-2025&limit=5`).then((r) => ({ status: r.status, body: r.json() })),
      fetch(`${baseUrl}/api/dashboard?season=2024-2025`).then((r) => ({ status: r.status, body: r.json() })),
      fetch(`${baseUrl}/api/players/${encodeURIComponent('Kylian Mbappé')}/history`).then((r) => ({ status: r.status, body: r.json() })),
    ]);

    assert.equal(health.status, 200);
    assert.equal((await health.body).success, true);

    assert.equal(seasons.status, 200);
    const seasonsJson = await seasons.body;
    assert.equal(seasonsJson.success, true);
    assert.ok(Array.isArray(seasonsJson.data) && seasonsJson.data.length >= 14);

    assert.equal(baseline.status, 200);
    const baselineJson = await baseline.body;
    assert.equal(baselineJson.data.verified, true);

    assert.equal(players.status, 200);
    const playersJson = await players.body;
    assert.equal(playersJson.success, true);
    assert.equal(playersJson.data.length, 5);

    assert.equal(dashboard.status, 200);
    const dashJson = await dashboard.body;
    assert.equal(dashJson.success, true);
    assert.ok(dashJson.data.kpis.total_players > 2500);

    assert.equal(mbappeHistory.status, 200);
    const mbappeJson = await mbappeHistory.body;
    assert.equal(mbappeJson.success, true);
    assert.ok(Array.isArray(mbappeJson.data.seasons) && mbappeJson.data.seasons.length >= 8);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('season details API returns distinct live CSV SHA-256 hashes and valid CSV download stream', async () => {
  const app = require('../server');
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const [res2425, res2526, csvRes] = await Promise.all([
      fetch(`${baseUrl}/api/seasons/2024-2025`).then((r) => ({ status: r.status, body: r.json() })),
      fetch(`${baseUrl}/api/seasons/2025-2026`).then((r) => ({ status: r.status, body: r.json() })),
      fetch(`${baseUrl}/api/seasons/2024-2025/download`).then(async (r) => ({
        status: r.status,
        text: await r.text(),
      })),
    ]);

    assert.equal(res2425.status, 200);
    assert.equal(res2526.status, 200);

    const d2425 = (await res2425.body).data;
    const d2526 = (await res2526.body).data;
    assert.match(d2425.csv_sha256, /^[0-9a-f]{64}$/);
    assert.match(d2526.csv_sha256, /^[0-9a-f]{64}$/);
    assert.notEqual(d2425.csv_sha256, d2526.csv_sha256);
    assert.ok(d2425.file_size_bytes > 10000);
    assert.equal(d2526.is_quarantined, false);

    assert.equal(csvRes.status, 200);
    const firstLine = csvRes.text.split(/\r?\n/)[0];
    assert.ok(firstLine.includes('Player') && firstLine.includes('Squad'), `Unexpected CSV header: ${firstLine}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('getDashboardAnalytics returns Big 5 league_efficiency, club_efficiency, true medians, and null xG in pre-xG eras', () => {
  const { getDashboardAnalytics } = require('./analytics');

  const d2425 = getDashboardAnalytics(null, '2024-2025');
  assert.equal(d2425.kpis.has_xg, true);
  assert.equal(d2425.kpis.total_goals, 4806);
  assert.equal(d2425.league_efficiency.length, 5);
  assert.equal(d2425.club_efficiency.length, 8);
  assert.ok(d2425.scatter_medians.xG > 0 && d2425.scatter_medians.xAG > 0);
  const sumLeagueGoals = d2425.league_efficiency.reduce((s, l) => s + l.goals, 0);
  assert.equal(sumLeagueGoals, 4806);
  for (const lg of d2425.league_efficiency) {
    assert.ok(typeof lg.xg === 'number' && lg.xg > 500);
    assert.ok(typeof lg.conversion_pct === 'number' && lg.conversion_pct > 70 && lg.conversion_pct < 130);
    assert.ok(lg.top_scorer && lg.top_scorer.Player);
  }

  // Pre-xG season (2012-2013) must strictly report null xG KPIs and empty scatter_data (never fake 0.0)
  const d1213 = getDashboardAnalytics(null, '2012-2013');
  assert.equal(d1213.kpis.has_xg, false);
  assert.equal(d1213.kpis.total_xg, null);
  assert.equal(d1213.kpis.finishing_delta, null);
  assert.equal(d1213.scatter_data.length, 0);
  assert.equal(d1213.league_efficiency.length, 5);
  for (const lg of d1213.league_efficiency) {
    assert.equal(lg.xg, null);
    assert.equal(lg.finishing_delta, null);
    assert.ok(lg.goals > 500);
  }
});
