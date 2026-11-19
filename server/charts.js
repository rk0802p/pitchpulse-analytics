const {
  resolveCompetition,
  validateScatterMetric,
  roundTo,
} = require('./config');

const DEFAULT_SIMILARITY_METRICS = [
  'Gls_90', 'Ast_90', 'xG_90', 'xAG_90', 'PrgC', 'PrgP', 'PrgR',
];

const ROLE_PRESETS = {
  finisher: {
    metrics: { Gls_90: 0.35, xG_90: 0.30, npxG_90: 0.20, Gls_minus_xG: 0.15 },
    title: 'Clinical Finishing Index',
    description: 'Evaluates goal volume, shot selection, and finishing efficiency over performance.',
  },
  creator: {
    metrics: { xAG_90: 0.35, Ast_90: 0.30, PrgP: 0.20, 'G+A_90': 0.15 },
    title: 'Chances & Creation Index',
    description: 'Measures chance creation quality, progressive passing, and direct goal assists.',
  },
  progressor: {
    metrics: { PrgC: 0.40, PrgP: 0.40, PrgR: 0.20 },
    title: 'Ball Progression Index',
    description: 'Isolates players who drive play forward through carries, passing, and progressive receptions.',
  },
  all_round: {
    metrics: { 'xG+xAG_90': 0.30, 'G+A_90': 0.30, PrgC: 0.20, PrgP: 0.20 },
    title: 'All-Round Attacking Threat Index',
    description: 'Holistic attacking contribution combining scoring, playmaking, and vertical transition progression.',
  },
  forwards: {
    defaultPosition: 'FW',
    metrics: { Gls_90: 0.30, xG_90: 0.25, npxG_90: 0.15, Ast_90: 0.15, xAG_90: 0.15 },
    title: 'Forwards Performance Index (FW)',
    description: 'Evaluates central and wide forwards across scoring rate, shot quality, and chance creation.',
  },
  midfielders: {
    defaultPosition: 'MF',
    metrics: { xAG_90: 0.25, Ast_90: 0.20, PrgP_90: 0.25, PrgC_90: 0.15, 'G+A_90': 0.15 },
    title: 'Midfielders Performance Index (MF)',
    description: 'Balances ball progression, chance creation, and direct goal contributions for midfielders.',
  },
  defenders: {
    defaultPosition: 'DF',
    metrics: { PrgP_90: 0.35, PrgC_90: 0.25, xAG_90: 0.20, 'G+A_90': 0.20 },
    title: 'Defenders Progression & Threat Index (DF)',
    description: 'Highlights defenders driving vertical progression and final-third threat from deep.',
  },
  wingers: {
    defaultPosition: 'FW,MF',
    metrics: { 'G+A_90': 0.25, xAG_90: 0.25, xG_90: 0.20, PrgC_90: 0.20, PrgR_90: 0.10 },
    title: 'Wingers & Attacking Midfielders Index',
    description: 'Measures wide and hybrid attackers on ball carrying, chance creation, and direct goal threat.',
  },
};

const SCATTER_PER_90_NUMERATORS = {
  Gls_90: 'Gls',
  Ast_90: 'Ast',
  'G+A_90': 'G+A',
  'G-PK_90': 'G-PK',
  xG_90: 'xG',
  xAG_90: 'xAG',
  npxG_90: 'npxG',
  'npxG+xAG_90': 'npxG+xAG',
  PrgC_90: 'PrgC',
  PrgP_90: 'PrgP',
  PrgR_90: 'PrgR',
};

const SHARED_XG_PROTECTED_METRICS = new Set([
  'xG_90',
  'xAG_90',
  'xG+xAG_90',
  'npxG_90',
  'npxG+xAG_90',
  'Gls_minus_xG',
  'xG_minus_Gls',
  'Ast_minus_xAG',
]);

function isFiniteNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function pool(records, { position = null, minMinutes = 270, competition = null } = {}) {
  if (!records || records.length === 0) return [];
  let res = records;
  if (minMinutes && minMinutes > 0) {
    res = res.filter((r) => (r.Min || 0) >= minMinutes);
  }
  if (competition) {
    const resolved = resolveCompetition(competition);
    if (resolved) {
      res = res.filter((r) => r.Comp === resolved);
    }
  }
  if (position) {
    const tokens = String(position)
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (tokens.length > 0) {
      res = res.filter((r) => {
        const pStr = (r.Pos || '').toUpperCase();
        return tokens.some((tok) => pStr.includes(tok));
      });
    }
  }
  return res;
}

function pctOfValue(metric, value, poolRecords) {
  if (!poolRecords || poolRecords.length === 0 || !isFiniteNum(value)) return null;
  const valid = poolRecords.map((r) => r[metric]).filter(isFiniteNum);
  const n = valid.length;
  if (n < 5) return null;
  let lower = 0;
  let equal = 0;
  for (const v of valid) {
    if (v < value) lower += 1;
    else if (v === value) equal += 1;
  }
  return Math.max(0, Math.min(100, Math.round(((lower + 0.5 * equal) / n) * 100)));
}

function percentiles(player, poolRecords, metrics = null) {
  const list = metrics || [
    'Gls_90', 'Ast_90', 'G+A_90', 'G-PK_90', 'xG_90', 'xAG_90',
    'xG+xAG_90', 'npxG_90', 'npxG+xAG_90', 'PrgC', 'PrgP', 'PrgR',
  ];
  const pcts = {};
  for (const m of list) {
    const val = player[m];
    pcts[m] = {
      value: isFiniteNum(val) ? roundTo(val, 2) : null,
      percentile: pctOfValue(m, val, poolRecords),
      metric: m,
    };
  }
  return pcts;
}

function similarPlayers(player, poolRecords, { k = 5, weights = null, sameLeague = false } = {}) {
  if (!poolRecords || poolRecords.length === 0) return [];
  const targetId = player.id || player.Rk;
  const targetPos = String(player.Pos || 'MF').split(',')[0].trim().toUpperCase();

  let candidates = poolRecords.filter((r) => (r.Pos || '').toUpperCase().includes(targetPos));
  if (candidates.length < 5) candidates = [...poolRecords];
  if (sameLeague && player.Comp) {
    candidates = candidates.filter((r) => r.Comp === player.Comp);
  }
  candidates = candidates.filter((r) => r.id !== targetId);
  if (candidates.length === 0) return [];

  const metrics = weights ? Object.keys(weights) : DEFAULT_SIMILARITY_METRICS;
  let featureCols = metrics.filter(
    (m) =>
      isFiniteNum(player[m]) &&
      candidates.filter((r) => isFiniteNum(r[m])).length >= Math.min(5, candidates.length)
  );
  if (featureCols.length < 2) {
    featureCols = ['Gls_90', 'Ast_90', 'G+A_90', 'Min'].filter(
      (m) => isFiniteNum(player[m]) && candidates.some((r) => isFiniteNum(r[m]))
    );
  }
  if (featureCols.length === 0) return [];

  const wDict = weights || Object.fromEntries(featureCols.map((c) => [c, 1.0]));
  const totalWeight = featureCols.reduce((acc, c) => acc + (wDict[c] || 1.0), 0);

  const stats = {};
  for (const col of featureCols) {
    const vals = candidates.map((r) => r[col]).filter(isFiniteNum);
    if (vals.length === 0) continue;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance =
      vals.length > 1
        ? vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (vals.length - 1)
        : 1.0;
    const std = Math.sqrt(variance) > 1e-6 ? Math.sqrt(variance) : 1.0;
    stats[col] = { mean, std, targetZ: (player[col] - mean) / std };
  }

  const activeCols = featureCols.filter((c) => stats[c]);
  if (activeCols.length === 0) return [];

  const scored = [];
  for (const row of candidates) {
    let distSq = 0;
    let matchedWeight = 0;
    for (const col of activeCols) {
      if (!isFiniteNum(row[col])) continue;
      const w = wDict[col] || 1.0;
      const z = (row[col] - stats[col].mean) / stats[col].std;
      distSq += w * (z - stats[col].targetZ) ** 2;
      matchedWeight += w;
    }
    if (matchedWeight < totalWeight * 0.5 || matchedWeight <= 0) continue;

    // Normalize weighted squared distance by matchedWeight so missing optional dims don't bias similarity
    const rmsZDist = Math.sqrt(distSq / matchedWeight);
    const rawSim = 100.0 * (1.0 - rmsZDist / 3.0);
    const similarity = roundTo(Math.max(10.0, Math.min(99.5, rawSim)), 1);
    scored.push({
      id: row.id,
      Player: row.Player,
      Squad: row.Squad,
      Comp: row.Comp,
      Pos: row.Pos,
      Age: row.Age,
      Min: row.Min || 0,
      similarity,
      distance: roundTo(rmsZDist, 2),
      stats: {
        Gls: row.Gls || 0,
        Ast: row.Ast || 0,
        xG: isFiniteNum(row.xG) ? row.xG : null,
        xAG: isFiniteNum(row.xAG) ? row.xAG : null,
        Gls_90: isFiniteNum(row.Gls_90) ? row.Gls_90 : null,
        Ast_90: isFiniteNum(row.Ast_90) ? row.Ast_90 : null,
      },
    });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, k);
}

function computeAverageRanks(values) {
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length);
  let idx = 0;
  while (idx < indexed.length) {
    let end = idx;
    while (end + 1 < indexed.length && indexed[end + 1].v === indexed[idx].v) {
      end += 1;
    }
    const avgRank = (idx + 1 + (end + 1)) / 2;
    for (let j = idx; j <= end; j += 1) {
      ranks[indexed[j].i] = avgRank;
    }
    idx = end + 1;
  }
  return ranks;
}

function performanceIndex(
  records,
  { role = 'finisher', position = null, competition = null, minMinutes = 270, limit = 25 } = {}
) {
  const preset = ROLE_PRESETS[role] || ROLE_PRESETS.finisher;
  const baseWeights = preset.metrics;
  const effectivePosition = position || preset.defaultPosition || null;
  const filtered = pool(records, { position: effectivePosition, minMinutes, competition });
  if (filtered.length === 0) {
    return {
      players: [],
      leaders: [],
      role,
      preset,
      weights: {},
      base_weights: baseWeights,
      excluded_metrics: Object.keys(baseWeights),
      total: 0,
    };
  }

  const n = filtered.length;
  const minValidPool = Math.min(5, n);
  const trackedEntries = [];
  const excludedMetrics = [];

  for (const [metric, w] of Object.entries(baseWeights)) {
    const validIndices = [];
    const validValues = [];
    for (let i = 0; i < n; i += 1) {
      const val = filtered[i][metric];
      if (isFiniteNum(val)) {
        validIndices.push(i);
        validValues.push(val);
      }
    }
    if (validIndices.length >= minValidPool) {
      trackedEntries.push({ metric, weight: w, validIndices, validValues });
    } else {
      excludedMetrics.push(metric);
    }
  }

  // Fallback to core tracked rate metrics if every preset metric was untracked (e.g. progressor in 2012-2013)
  if (trackedEntries.length === 0) {
    const fallbackWeights = { Gls_90: 0.4, Ast_90: 0.35, 'G+A_90': 0.25 };
    for (const [metric, w] of Object.entries(fallbackWeights)) {
      const validIndices = [];
      const validValues = [];
      for (let i = 0; i < n; i += 1) {
        const val = filtered[i][metric];
        if (isFiniteNum(val)) {
          validIndices.push(i);
          validValues.push(val);
        }
      }
      if (validIndices.length >= minValidPool) {
        trackedEntries.push({ metric, weight: w, validIndices, validValues });
      }
    }
  }

  const trackedWeightSum = trackedEntries.reduce((acc, e) => acc + e.weight, 0);
  const effectiveWeights = {};
  for (const entry of trackedEntries) {
    effectiveWeights[entry.metric] =
      trackedWeightSum > 0 ? roundTo(entry.weight / trackedWeightSum, 4) : 0;
  }

  const weightedSum = new Array(n).fill(0);
  const rowWeightSum = new Array(n).fill(0);

  for (const { metric, validIndices, validValues } of trackedEntries) {
    const normW = effectiveWeights[metric];
    const mCount = validValues.length;
    const ranks = computeAverageRanks(validValues);
    for (let k = 0; k < mCount; k += 1) {
      const rowIdx = validIndices[k];
      const pctScore = ((ranks[k] - 0.5) / mCount) * 100.0;
      weightedSum[rowIdx] += normW * pctScore;
      rowWeightSum[rowIdx] += normW;
    }
  }

  const combined = [];
  for (let i = 0; i < n; i += 1) {
    // Require at least 50% of active tracked weight on a player row so missing-xG transfer spells aren't distorted
    if (rowWeightSum[i] < 0.5) continue;
    const score = roundTo(weightedSum[i] / rowWeightSum[i], 1);
    combined.push({ row: filtered[i], composite_index: score });
  }

  combined.sort((a, b) => b.composite_index - a.composite_index);

  const activeMetricKeys = trackedEntries.map((e) => e.metric);
  const players = combined.slice(0, limit).map(({ row, composite_index }, idx) => {
    const metricSnapshot = {};
    for (const m of activeMetricKeys) {
      metricSnapshot[m] = isFiniteNum(row[m]) ? roundTo(row[m], 2) : null;
    }
    return {
      rank: idx + 1,
      id: row.id,
      Player: row.Player,
      Squad: row.Squad,
      Comp: row.Comp,
      Pos: row.Pos,
      Age: row.Age,
      Min: row.Min || 0,
      composite_index,
      performance_index: composite_index,
      metrics: metricSnapshot,
    };
  });

  return {
    role,
    preset,
    weights: effectiveWeights,
    base_weights: baseWeights,
    excluded_metrics: excludedMetrics,
    total: combined.length,
    players,
    leaders: players,
  };
}

function scatterMetricValue(row, metric) {
  const isSharedXg = Boolean(row._shared_season_xg || row.shared_season_xg);
  if (isSharedXg && SHARED_XG_PROTECTED_METRICS.has(metric)) {
    return null;
  }

  if (metric === 'G+A') {
    return isFiniteNum(row.Gls) && isFiniteNum(row.Ast) ? row.Gls + row.Ast : null;
  }
  if (metric === 'xG+xAG') {
    return isFiniteNum(row.xG) && isFiniteNum(row.xAG) ? row.xG + row.xAG : null;
  }
  if (metric === 'xG+xAG_90') {
    if (isFiniteNum(row['xG+xAG_90'])) return row['xG+xAG_90'];
    if (row['xG+xAG_90'] === null) return null;
    if (isFiniteNum(row.xG) && isFiniteNum(row.xAG) && isFiniteNum(row.Min) && row.Min > 0) {
      return ((row.xG + row.xAG) * 90.0) / row.Min;
    }
    return null;
  }
  if (metric === 'G+A-PK_90') {
    if (isFiniteNum(row['G+A-PK_90'])) return row['G+A-PK_90'];
    if (isFiniteNum(row['G-PK']) && isFiniteNum(row.Ast) && isFiniteNum(row.Min) && row.Min > 0) {
      return ((row['G-PK'] + row.Ast) * 90.0) / row.Min;
    }
    return null;
  }
  const numCol = SCATTER_PER_90_NUMERATORS[metric];
  if (numCol) {
    if (isFiniteNum(row[metric])) return row[metric];
    if (row[metric] === null) return null;
    if (isFiniteNum(row[numCol]) && isFiniteNum(row.Min) && row.Min > 0) {
      return (row[numCol] * 90.0) / row.Min;
    }
    return null;
  }
  return isFiniteNum(row[metric]) ? row[metric] : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function getScatterChartData(
  records,
  { xMetric = 'xG_90', yMetric = 'xAG_90', position = null, competition = null, minMinutes = 270, ageMax = null } = {}
) {
  const validX = validateScatterMetric(xMetric, 'xG_90');
  const validY = validateScatterMetric(yMetric, 'xAG_90');

  const emptyResult = (trackingStatus) => ({
    points: [],
    points_count: 0,
    x_metric: validX,
    y_metric: validY,
    tracking_status: trackingStatus,
    distribution: {
      median_x: null,
      median_y: null,
      min_x: null,
      max_x: null,
      min_y: null,
      max_y: null,
      quadrants: { q1: 0, q2: 0, q3: 0, q4: 0 },
    },
    medians: { x: null, y: null },
    pool: { n: 0, min_minutes: minMinutes },
  });

  if (!records || records.length === 0) return emptyResult('not_tracked');

  let cohort = pool(records, { position, minMinutes, competition });
  if (ageMax !== null) {
    cohort = cohort.filter((r) => isFiniteNum(r.Age) && r.Age <= ageMax);
  }

  const validPairs = [];
  for (const row of cohort) {
    const vx = scatterMetricValue(row, validX);
    const vy = scatterMetricValue(row, validY);
    if (isFiniteNum(vx) && isFiniteNum(vy)) {
      validPairs.push({ row, vx, vy });
    }
  }

  if (validPairs.length === 0) {
    const hasX = records.some((r) => isFiniteNum(scatterMetricValue(r, validX)));
    const hasY = records.some((r) => isFiniteNum(scatterMetricValue(r, validY)));
    return emptyResult(hasX && hasY ? 'no_eligible_observations' : 'not_tracked');
  }

  const xs = validPairs.map((p) => p.vx);
  const ys = validPairs.map((p) => p.vy);
  const medX = median(xs);
  const medY = median(ys);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  let q1 = 0;
  let q2 = 0;
  let q3 = 0;
  let q4 = 0;

  const points = validPairs.map(({ row, vx, vy }) => {
    let q;
    if (vx >= medX && vy >= medY) {
      q = 'Q1';
      q1 += 1;
    } else if (vx < medX && vy >= medY) {
      q = 'Q2';
      q2 += 1;
    } else if (vx < medX && vy < medY) {
      q = 'Q3';
      q3 += 1;
    } else {
      q = 'Q4';
      q4 += 1;
    }

    return {
      id: row.id,
      Player: row.Player,
      Squad: row.Squad,
      Comp: row.Comp,
      Pos: row.Pos,
      Age: isFiniteNum(row.Age) ? row.Age : null,
      Min: row.Min || 0,
      x: vx,
      y: vy,
      tooltip: {
        Gls_minus_xG: isFiniteNum(row.Gls) && isFiniteNum(row.xG) ? row.Gls - row.xG : null,
      },
      quadrant: q,
    };
  });

  return {
    x_metric: validX,
    y_metric: validY,
    tracking_status: 'tracked',
    points_count: points.length,
    distribution: {
      median_x: medX,
      median_y: medY,
      min_x: minX,
      max_x: maxX,
      min_y: minY,
      max_y: maxY,
      quadrants: { q1, q2, q3, q4 },
    },
    medians: { x: medX, y: medY },
    pool: { n: points.length, min_minutes: minMinutes },
    points,
  };
}

module.exports = {
  ROLE_PRESETS,
  pool,
  pctOfValue,
  percentiles,
  similarPlayers,
  performanceIndex,
  scatterMetricValue,
  getScatterChartData,
};
