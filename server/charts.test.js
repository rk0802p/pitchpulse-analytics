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
