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
    const posClean = String(position).split(',')[0].trim().toUpperCase();
    if (posClean) {
      res = res.filter((r) => (r.Pos || '').toUpperCase().includes(posClean));
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
  let featureCols = metrics.filter((m) => isFiniteNum(player[m]));
  if (featureCols.length < 3) {
    featureCols = ['Gls_90', 'Ast_90', 'Min', 'G+A_90'];
  }

  const wDict = weights || Object.fromEntries(featureCols.map((c) => [c, 1.0]));
  const wSum = featureCols.reduce((acc, c) => acc + (wDict[c] || 1.0), 0);

  const stats = {};
  for (const col of featureCols) {
    const vals = candidates.map((r) => (isFiniteNum(r[col]) ? r[col] : 0.0));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance =
      vals.length > 1
        ? vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (vals.length - 1)
        : 1.0;
    const std = Math.sqrt(variance) > 1e-6 ? Math.sqrt(variance) : 1.0;
    const targetVal = isFiniteNum(player[col]) ? player[col] : 0.0;
    stats[col] = { mean, std, targetZ: (targetVal - mean) / std };
  }

  const maxReasonableDist = Math.sqrt(wSum) * 3.0;

  const scored = candidates.map((row) => {
    let distSq = 0;
    for (const col of featureCols) {
      const w = wDict[col] || 1.0;
      const val = isFiniteNum(row[col]) ? row[col] : 0.0;
      const z = (val - stats[col].mean) / stats[col].std;
      distSq += w * (z - stats[col].targetZ) ** 2;
    }
    const dist = Math.sqrt(distSq);
    const rawSim = 100.0 * (1.0 - dist / maxReasonableDist);
    const similarity = roundTo(Math.max(10.0, Math.min(99.5, rawSim)), 1);
    return {
      id: row.id,
      Player: row.Player,
      Squad: row.Squad,
      Comp: row.Comp,
      Pos: row.Pos,
      Age: row.Age,
      Min: row.Min || 0,
      similarity,
      distance: roundTo(dist, 2),
      stats: {
        Gls: row.Gls || 0,
        Ast: row.Ast || 0,
        xG: isFiniteNum(row.xG) ? row.xG : null,
        xAG: isFiniteNum(row.xAG) ? row.xAG : null,
        Gls_90: isFiniteNum(row.Gls_90) ? row.Gls_90 : null,
        Ast_90: isFiniteNum(row.Ast_90) ? row.Ast_90 : null,
      },
    };
  });

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
  const weights = preset.metrics;
  const filtered = pool(records, { position, minMinutes, competition });
  if (filtered.length === 0) {
    return { players: [], role, preset, total: 0 };
  }

  const n = filtered.length;
  const scores = new Array(n).fill(0);
  let activeWeightsSum = 0;

  for (const [metric, w] of Object.entries(weights)) {
    const vals = filtered.map((r) => (isFiniteNum(r[metric]) ? r[metric] : 0.0));
    const ranks = computeAverageRanks(vals);
    for (let i = 0; i < n; i += 1) {
      scores[i] += w * ((ranks[i] / n) * 100.0);
    }
    activeWeightsSum += w;
  }

  const combined = filtered.map((row, i) => ({
    row,
    composite_index: activeWeightsSum > 0 ? roundTo(scores[i] / activeWeightsSum, 1) : 50.0,
  }));

  combined.sort((a, b) => b.composite_index - a.composite_index);

  const players = combined.slice(0, limit).map(({ row, composite_index }, idx) => {
    const metricSnapshot = {};
    for (const m of Object.keys(weights)) {
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
      metrics: metricSnapshot,
    };
  });

  return {
    role,
    preset,
    total: filtered.length,
    players,
  };
}

function scatterMetricValue(row, metric) {
  if (metric === 'G+A') {
    return isFiniteNum(row.Gls) && isFiniteNum(row.Ast) ? row.Gls + row.Ast : null;
  }
  if (metric === 'xG+xAG') {
    return isFiniteNum(row.xG) && isFiniteNum(row.xAG) ? row.xG + row.xAG : null;
  }
  if (metric === 'xG+xAG_90') {
    if (isFiniteNum(row.xG) && isFiniteNum(row.xAG) && isFiniteNum(row.Min) && row.Min > 0) {
      return ((row.xG + row.xAG) * 90.0) / row.Min;
    }
    return null;
  }
  if (metric === 'G+A-PK_90') {
    if (isFiniteNum(row['G-PK']) && isFiniteNum(row.Ast) && isFiniteNum(row.Min) && row.Min > 0) {
      return ((row['G-PK'] + row.Ast) * 90.0) / row.Min;
    }
    return null;
  }
  const numCol = SCATTER_PER_90_NUMERATORS[metric];
  if (numCol) {
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
