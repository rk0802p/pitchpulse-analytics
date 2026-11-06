/**
 * Metric formatting, glossary, and microcopy utilities for PitchPulse & Terrace Ledger.
 * Enforces precise editorial standards, number alignment, and honest data representations.
 */

export const GLOSSARY = {
  xG: {
    term: "Expected Goals (xG)",
    short: "xG",
    definition: "The statistical probability (0.0 to 1.0) that a given shot results in a goal, summed over all of a player's shots."
  },
  "G - xG": {
    term: "Goals Minus Expected Goals (G - xG)",
    short: "G - xG",
    definition: "Goals scored minus expected goals. A positive number indicates overperforming chance quality (clinical finishing or fortunate deflections), which often regresses toward zero over time."
  },
  xAG: {
    term: "Expected Assisted Goals (xAG)",
    short: "xAG",
    definition: "The xG value of shots that directly followed a player's passes, measuring chance creation quality regardless of whether teammates converted."
  },
  PrgC: {
    term: "Progressive Carries (PrgC)",
    short: "PrgC",
    definition: "Carries that move the ball at least 10 yards closer to the opponent’s goal line, or any carry into the penalty area (excluding defending 50%)."
  },
  PrgP: {
    term: "Progressive Passes (PrgP)",
    short: "PrgP",
    definition: "Completed forward passes that advance the ball at least 10 yards toward the opponent goal or into the box (excluding passes from defending 40%)."
  },
  PrgR: {
    term: "Progressive Receptions (PrgR)",
    short: "PrgR",
    definition: "Completed passes received in forward territory that advance play significantly toward the opponent goal."
  },
  "90s": {
    term: "Total 90s Played",
    short: "90s",
    definition: "Total on-pitch minutes played divided by 90.0, standardizing playing time volume."
  },
  "Per 90": {
    term: "Per 90 Rates",
    short: "Per 90",
    definition: "Statistics scaled to 90 minutes so players with different playing time can be fairly compared."
  },
  Percentile: {
    term: "Positional Peer Percentile",
    short: "Percentile",
    definition: "The percentage of positional peers across the Big 5 leagues that a player ranks above on that metric (99th means higher than 99% of peers)."
  },
  "G+A": {
    term: "Goals Plus Assists (G+A)",
    short: "G+A",
    definition: "Combined direct scoring and assist contributions."
  },
  Apps: {
    term: "Appearances (MP)",
    short: "Apps",
    definition: "Total official league matches played in the campaign."
  },
  Min: {
    term: "Minutes Played",
    short: "Mins",
    definition: "Total minutes on the pitch during league play."
  }
};

export const formatMetricValue = (value, fallback = '—') => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return value;
};

export const formatNumber = (val) => {
  if (val === null || val === undefined || Number.isNaN(val)) return '—';
  const num = Number(val);
  return Number.isNaN(num) ? String(val) : num.toLocaleString();
};

export const formatMinutes = (mins) => {
  if (mins === null || mins === undefined || Number.isNaN(mins)) return '—';
  const num = Number(mins);
  if (Number.isNaN(num)) return '—';
  return `${num.toLocaleString()} mins`;
};

export const formatRateMetric = (rate, fallback = 'N/A') => {
  if (rate === null || rate === undefined || Number.isNaN(rate)) {
    return fallback;
  }
  return typeof rate === 'number' ? rate.toFixed(2) : Number(rate).toFixed(2);
};

export const formatDecimal = (val, decimals = 1, fallback = '—') => {
  if (val === null || val === undefined || Number.isNaN(val)) return fallback;
  const num = Number(val);
  return Number.isNaN(num) ? fallback : num.toFixed(decimals);
};

export const formatGoalsMinusXG = (delta) => {
  if (delta === null || delta === undefined || Number.isNaN(delta)) {
    return { text: '—', glyph: '', isOver: false, isUnder: false, num: 0 };
  }
  const num = Number(delta);
  if (Number.isNaN(num)) return { text: '—', glyph: '', isOver: false, isUnder: false, num: 0 };
  
  const sign = num > 0 ? '+' : num < 0 ? '−' : '';
  const glyph = num > 0 ? '▲' : num < 0 ? '▼' : '';
  const text = `${sign}${Math.abs(num).toFixed(1)}`;
  return {
    text,
    glyph,
    isOver: num > 0,
    isUnder: num < 0,
    num
  };
};

export const formatDiscipline = (yellows, reds) => {
  const y = Number(yellows) || 0;
  const r = Number(reds) || 0;
  const yText = `${y} yellow${y === 1 ? '' : 's'}`;
  const rText = `${r} red${r === 1 ? '' : 's'}`;
  return `${yText}, ${rText}`;
};

export const generateProfileSummary = (player) => {
  if (!player) return "";
  const name = player.Player || player.name || "The player";
  const pos = (player.Pos || player.position || "FW").split(',')[0].trim();
  const gls = Number(player.Gls || player.goals || 0);
  const xg = Number(player.xG || player.expected_goals || 0);
  const ast = Number(player.Ast || player.assists || 0);
  const prgc = Number(player.PrgC || player.progressive_carries || 0);
  const min = Number(player.Min || player.minutes || 0);
  const delta = gls - xg;

  const sentences = [];

  if (min < 900) {
    sentences.push(`Based on ${min.toLocaleString()} minutes. Treat per-90 rates with caution.`);
  }

  if (delta >= 3.0) {
    sentences.push(`${name} has scored ${delta.toFixed(1)} more than his chances suggest (${gls} goals from ${xg.toFixed(1)} xG).`);
  } else if (delta <= -3.0) {
    sentences.push(`${name} has scored ${Math.abs(delta).toFixed(1)} fewer than expected from ${xg.toFixed(1)} xG.`);
  } else if (gls > 0) {
    sentences.push(`${name} has scored ${gls} goals roughly in line with expectation (${xg.toFixed(1)} xG).`);
  }

  if (prgc >= 75) {
    sentences.push(`Ranks among the most proactive ball carriers with ${prgc} progressive carries.`);
  }

  if (ast >= 8) {
    sentences.push(`A primary creative outlet with ${ast} assists recorded this campaign.`);
  }

  return sentences.join(" ") || `${name} has featured in ${min.toLocaleString()} minutes across all competitions.`;
};

export const isMetricTracked = (value) => {
  return value !== null && value !== undefined && !Number.isNaN(value);
};

export const nullSafeComparator = (a, b, key, direction = 'desc') => {
  const valA = a ? a[key] : null;
  const valB = b ? b[key] : null;

  const isANull = valA === null || valA === undefined || Number.isNaN(valA);
  const isBNull = valB === null || valB === undefined || Number.isNaN(valB);

  // Nulls always placed at the end regardless of direction
  if (isANull && isBNull) return 0;
  if (isANull) return 1;
  if (isBNull) return -1;

  if (valA < valB) return direction === 'asc' ? -1 : 1;
  if (valA > valB) return direction === 'asc' ? 1 : -1;
  return 0;
};
