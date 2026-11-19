const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SEASONS_DIR = path.join(DATA_DIR, 'seasons');
const BASELINES_DIR = path.join(DATA_DIR, 'baselines');
const DEFAULT_SEASON = '2024-2025';

const COMPETITIONS = {
  'eng Premier League': {
    id: 'premier-league',
    name: 'Premier League',
    country: 'England',
    code: 'ENG',
    raw: 'eng Premier League',
    teams_count: 20,
  },
  'es La Liga': {
    id: 'la-liga',
    name: 'La Liga',
    country: 'Spain',
    code: 'ESP',
    raw: 'es La Liga',
    teams_count: 20,
  },
  'it Serie A': {
    id: 'serie-a',
    name: 'Serie A',
    country: 'Italy',
    code: 'ITA',
    raw: 'it Serie A',
    teams_count: 20,
  },
  'de Bundesliga': {
    id: 'bundesliga',
    name: 'Bundesliga',
    country: 'Germany',
    code: 'GER',
    raw: 'de Bundesliga',
    teams_count: 18,
  },
  'fr Ligue 1': {
    id: 'ligue-1',
    name: 'Ligue 1',
    country: 'France',
    code: 'FRA',
    raw: 'fr Ligue 1',
    teams_count: 18,
  },
};

const COMPETITION_LOOKUP = {};
for (const [rawName, info] of Object.entries(COMPETITIONS)) {
  COMPETITION_LOOKUP[rawName.toLowerCase()] = rawName;
  COMPETITION_LOOKUP[info.id.toLowerCase()] = rawName;
  COMPETITION_LOOKUP[info.name.toLowerCase()] = rawName;
}

const METRIC_DEFINITIONS = {
  Rk: { name: 'Rank', category: 'Identity', description: 'Original row rank identifier' },
  Player: { name: 'Player Name', category: 'Identity', description: 'Full name of the player' },
  Nation: { name: 'Nationality', category: 'Identity', description: 'Three-letter country code and nationality flag' },
  Pos: { name: 'Position', category: 'Identity', description: 'Primary playing position (GK, DF, MF, FW)' },
  Squad: { name: 'Squad / Club', category: 'Identity', description: 'Club team for this record' },
  Comp: { name: 'Competition', category: 'Identity', description: 'League competition' },
  Age: { name: 'Age', category: 'Demographics', description: 'Player age in years' },
  Born: { name: 'Birth Year', category: 'Demographics', description: 'Year of birth' },
  MP: { name: 'Matches Played', category: 'Playing Time', description: 'Total matches played in the competition' },
  Starts: { name: 'Starts', category: 'Playing Time', description: 'Total games started in the starting XI' },
  Min: { name: 'Minutes Played', category: 'Playing Time', description: 'Total minutes on pitch' },
  '90s': { name: '90s Played', category: 'Playing Time', description: 'Minutes played divided by 90' },
  Gls: { name: 'Goals', category: 'Scoring', description: 'Total goals scored' },
  Ast: { name: 'Assists', category: 'Playmaking', description: 'Total assists directly leading to a goal' },
  'G+A': { name: 'Goals + Assists', category: 'Scoring', description: 'Combined goals and assists' },
  'G-PK': { name: 'Non-Penalty Goals', category: 'Scoring', description: 'Goals scored excluding penalty kicks' },
  PK: { name: 'Penalty Kicks Made', category: 'Scoring', description: 'Penalty kicks successfully converted' },
  PKatt: { name: 'Penalty Kicks Attempted', category: 'Scoring', description: 'Penalty kick attempts taken' },
  CrdY: { name: 'Yellow Cards', category: 'Discipline', description: 'Yellow cards received' },
  CrdR: { name: 'Red Cards', category: 'Discipline', description: 'Red cards received' },
  xG: { name: 'Expected Goals', category: 'Advanced Scoring', description: 'Statistical model estimate of the quality of scoring chances' },
  npxG: { name: 'Non-Penalty xG', category: 'Advanced Scoring', description: 'Expected goals excluding penalties' },
  xAG: { name: 'Expected Assisted Goals', category: 'Advanced Playmaking', description: 'xG of shots assisted by the player (chance creation quality)' },
  'npxG+xAG': { name: 'npxG + xAG', category: 'Advanced Production', description: 'Combined non-penalty expected goals and assisted goals' },
  PrgC: { name: 'Progressive Carries', category: 'Progression', description: 'Carries that move the ball towards opponent goal by at least 10 yards or into penalty area' },
  PrgP: { name: 'Progressive Passes', category: 'Progression', description: 'Completed passes that move ball towards opponent goal by at least 10 yards or into penalty area' },
  PrgR: { name: 'Progressive Receptions', category: 'Progression', description: 'Completed passes received that move play forward towards goal' },
  PrgC_90: { name: 'Progressive Carries per 90', category: 'Progression Rates', description: 'Progressive carries per 90 minutes played' },
  PrgP_90: { name: 'Progressive Passes per 90', category: 'Progression Rates', description: 'Progressive passes completed per 90 minutes played' },
  PrgR_90: { name: 'Progressive Receptions per 90', category: 'Progression Rates', description: 'Progressive passes received per 90 minutes played' },
  Gls_90: { name: 'Goals per 90', category: 'Rates', description: 'Goals scored per 90 minutes played' },
  Ast_90: { name: 'Assists per 90', category: 'Rates', description: 'Assists per 90 minutes played' },
  'G+A_90': { name: 'G+A per 90', category: 'Rates', description: 'Goals and assists combined per 90 minutes' },
  'G-PK_90': { name: 'Non-Penalty Goals per 90', category: 'Rates', description: 'Non-penalty goals per 90 minutes' },
  'G+A-PK_90': { name: 'G+A (Non-PK) per 90', category: 'Rates', description: 'Non-penalty goals + assists per 90 minutes' },
  xG_90: { name: 'xG per 90', category: 'Advanced Rates', description: 'Expected goals per 90 minutes' },
  xAG_90: { name: 'xAG per 90', category: 'Advanced Rates', description: 'Expected assisted goals per 90 minutes' },
  'xG+xAG_90': { name: 'xG + xAG per 90', category: 'Advanced Rates', description: 'Combined xG and xAG per 90 minutes' },
  npxG_90: { name: 'npxG per 90', category: 'Advanced Rates', description: 'Non-penalty xG per 90 minutes' },
  'npxG+xAG_90': { name: 'npxG + xAG per 90', category: 'Advanced Rates', description: 'Non-penalty xG + xAG per 90 minutes' },
};

const ALL_COMPS = [
  'eng Premier League',
  'es La Liga',
  'it Serie A',
  'de Bundesliga',
  'fr Ligue 1',
];

const METRIC_SOURCE_REGISTRY = {
  minutes: {
    display_name: 'Minutes Played',
    category: 'Playing Time',
    source_fields: ['Min', 'Minutes', 'mins', 'minutes_played'],
    preferred_source: 'FBref / Transfermarkt / Official Match Sheets',
    supported_seasons: '2012-2026 (All 14 seasons)',
    supported_competitions: ALL_COMPS,
    is_derived: false,
    derivation_formula: null,
    validation_rules: 'Integer >= 0; typical regular season maximum ~3420 mins',
    current_coverage: '100% across all 14 seasons',
  },
  matches_played: {
    display_name: 'Appearances',
    category: 'Playing Time',
    source_fields: ['MP', 'Matches', 'apps', 'appearances'],
    preferred_source: 'FBref / Transfermarkt',
    supported_seasons: '2012-2026 (All 14 seasons)',
    supported_competitions: ALL_COMPS,
    is_derived: false,
    derivation_formula: null,
    validation_rules: 'Integer between 0 and 38',
    current_coverage: '100% across all 14 seasons',
  },
  nineties: {
    display_name: '90s Played',
    category: 'Playing Time',
    source_fields: ['90s', 'nineties'],
    preferred_source: 'Derived mathematically from minutes',
    supported_seasons: '2012-2026 (All 14 seasons)',
    supported_competitions: ALL_COMPS,
    is_derived: true,
    derivation_formula: 'round(Min / 90.0, 1)',
    validation_rules: 'Float >= 0.0',
    current_coverage: '100% across all 14 seasons',
  },
  goals: {
    display_name: 'Goals',
    category: 'Scoring',
    source_fields: ['Gls', 'Goals', 'goals_scored'],
    preferred_source: 'FBref / Transfermarkt / Understat',
    supported_seasons: '2012-2026 (All 14 seasons)',
    supported_competitions: ALL_COMPS,
    is_derived: false,
    derivation_formula: null,
    validation_rules: 'Integer >= 0',
    current_coverage: '100% across all 14 seasons',
  },
  goals_per_90: {
    display_name: 'Goals per 90',
    category: 'Scoring',
    source_fields: ['Gls_90', 'Gls/90', 'goals_per_90'],
    preferred_source: 'Derived mathematically from Goals and Minutes',
    supported_seasons: '2012-2026 (All 14 seasons)',
    supported_competitions: ALL_COMPS,
    is_derived: true,
    derivation_formula: '(Gls / Min) * 90.0',
    validation_rules: 'Float >= 0.0; valid only when Min > 0',
    current_coverage: '100% across all 14 seasons',
  },
  expected_goals: {
    display_name: 'Expected Goals (xG)',
    category: 'Scoring',
    source_fields: ['xG', 'expected_goals', 'xg'],
    preferred_source: 'Understat (2014-2023) / FBref via StatsBomb (2023-2025)',
    supported_seasons: '2014-2026 (Untracked in 2012-2014 era)',
    supported_competitions: ALL_COMPS,
    is_derived: false,
    derivation_formula: null,
    validation_rules: 'Float >= 0.0',
    current_coverage: 'Tracked from 2014-2015 onward; untracked in 2012-2014',
  },
  expected_goals_per_90: {
    display_name: 'Shot Threat (xG/90)',
    category: 'Scoring',
    source_fields: ['xG_90', 'xG/90', 'xg_per_90'],
    preferred_source: 'Derived mathematically from xG and Minutes',
    supported_seasons: '2014-2026 (Untracked in 2012-2014 era)',
    supported_competitions: ALL_COMPS,
    is_derived: true,
    derivation_formula: '(xG / Min) * 90.0',
    validation_rules: 'Float >= 0.0',
    current_coverage: 'Tracked from 2014-2015 onward; untracked in 2012-2014',
  },
  assists: {
    display_name: 'Assists',
    category: 'Creation',
    source_fields: ['Ast', 'Assists', 'assists'],
    preferred_source: 'FBref / Transfermarkt / Understat',
    supported_seasons: '2012-2026 (All 14 seasons)',
    supported_competitions: ALL_COMPS,
    is_derived: false,
    derivation_formula: null,
    validation_rules: 'Integer >= 0',
    current_coverage: '100% across all 14 seasons',
  },
  expected_assisted_goals: {
    display_name: 'Expected Assisted Goals (xAG)',
    category: 'Creation',
    source_fields: ['xAG', 'expected_assisted_goals', 'xag', 'xA'],
    preferred_source: 'FBref via StatsBomb (2023-2025) / Understat xA proxy (2014-2023)',
    supported_seasons: '2014-2026 (Untracked in 2012-2014)',
    supported_competitions: ALL_COMPS,
    is_derived: false,
    derivation_formula: null,
    validation_rules: 'Float >= 0.0',
    current_coverage: 'Tracked from 2014-2015 onward; untracked in 2012-2014',
  },
  progressive_carries: {
    display_name: 'Progressive Carries (PrgC)',
    category: 'Progression',
    source_fields: ['PrgC', 'progressive_carries', 'prgc'],
    preferred_source: 'FBref via StatsBomb / Opta tracking data',
    supported_seasons: '2023-2025 (Completed)',
    supported_competitions: ALL_COMPS,
    is_derived: false,
    derivation_formula: null,
    validation_rules: 'Integer >= 0',
    current_coverage: 'Fully authentic in 2023-2024 & 2024-2025; untracked in 2012-2023',
  },
  progressive_passes: {
    display_name: 'Progressive Passes (PrgP)',
    category: 'Progression',
    source_fields: ['PrgP', 'progressive_passes', 'prgp'],
    preferred_source: 'FBref via StatsBomb / Opta tracking data',
    supported_seasons: '2023-2025 (Completed)',
    supported_competitions: ALL_COMPS,
    is_derived: false,
    derivation_formula: null,
    validation_rules: 'Integer >= 0',
    current_coverage: 'Fully authentic in 2023-2024 & 2024-2025; untracked in 2012-2023',
  },
  progressive_receptions: {
    display_name: 'Progressive Receptions (PrgR)',
    category: 'Progression',
    source_fields: ['PrgR', 'progressive_receptions', 'prgr'],
    preferred_source: 'FBref via StatsBomb',
    supported_seasons: '2023-2025 (Completed)',
    supported_competitions: ALL_COMPS,
    is_derived: false,
    derivation_formula: null,
    validation_rules: 'Integer >= 0',
    current_coverage: 'Fully authentic in 2023-2024 & 2024-2025; untracked in 2012-2023 and 2025/26',
  },
};

const ERA_METRIC_COVERAGE = {
  pre_xg_historical_era: {
    seasons: ['2012-2013', '2013-2014'],
    untracked_metrics: [
      'xG', 'xAG', 'npxG', 'npxG+xAG', 'xG_90', 'xAG_90', 'npxG_90',
      'xG+xAG_90', 'npxG+xAG_90', 'PrgC', 'PrgP', 'PrgR', 'Gls_minus_xG', 'Ast_minus_xAG',
    ],
  },
  early_xg_historical_era: {
    seasons: [
      '2014-2015', '2015-2016', '2016-2017', '2017-2018',
      '2018-2019', '2019-2020', '2020-2021', '2021-2022', '2022-2023',
    ],
    untracked_metrics: ['PrgC', 'PrgP', 'PrgR'],
  },
  modern_verified_era: {
    seasons: ['2023-2024', '2024-2025'],
    untracked_metrics: [],
  },
  modern_regular_era_2025: {
    seasons: ['2025-2026'],
    untracked_metrics: ['PrgC', 'PrgP', 'PrgR'],
  },
};

function isMetricTrackedInEra(metricCol, seasonId) {
  if (!seasonId) return true;
  const baseMetric = metricCol.endsWith('_90') ? metricCol.slice(0, -3) : metricCol;

  for (const era of Object.values(ERA_METRIC_COVERAGE)) {
    if (era.seasons.includes(seasonId)) {
      if (era.untracked_metrics.includes(metricCol) || era.untracked_metrics.includes(baseMetric)) {
        return false;
      }
      return true;
    }
  }
  return true;
}

const VALID_POSITIONS = new Set([
  'GK', 'DF', 'MF', 'FW', 'DF,MF', 'MF,DF', 'MF,FW', 'FW,MF', 'DF,FW', 'FW,DF',
]);

function slugify(text) {
  if (!text) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/[-\s]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isUnsafeSeasonTraversal(seasonParam) {
  if (!seasonParam) return false;
  const s = String(seasonParam).trim();
  if (s.includes('..') || s.includes('\\') || s.includes('\0')) return true;
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return true;
  }
  const lower = s.toLowerCase();
  if (lower.includes('%2e') || lower.includes('%2f') || lower.includes('%5c')) return true;
  return false;
}

function validateSeasonId(seasonParam, seasonsDir = null, mustExist = false) {
  if (!seasonParam) return null;
  const cleaned = String(seasonParam).trim();
  if (isUnsafeSeasonTraversal(cleaned)) return null;

  let canonical = null;
  const mFull = cleaned.match(/^(\d{4})-(\d{4})$/);
  if (mFull) {
    const start = parseInt(mFull[1], 10);
    const end = parseInt(mFull[2], 10);
    if (end === start + 1) canonical = `${String(start).padStart(4, '0')}-${String(end).padStart(4, '0')}`;
  } else {
    const mSlash = cleaned.match(/^(\d{4})[/-](\d{2,4})$/);
    if (mSlash) {
      const start = parseInt(mSlash[1], 10);
      const end = mSlash[2].length === 2
        ? parseInt(mSlash[1].slice(0, 2) + mSlash[2], 10)
        : parseInt(mSlash[2], 10);
      if (end === start + 1) canonical = `${String(start).padStart(4, '0')}-${String(end).padStart(4, '0')}`;
    } else {
      const mShort = cleaned.match(/^(\d{2})[/-](\d{2})$/);
      if (mShort) {
        const start = 2000 + parseInt(mShort[1], 10);
        const end = 2000 + parseInt(mShort[2], 10);
        if (end === start + 1) canonical = `${String(start).padStart(4, '0')}-${String(end).padStart(4, '0')}`;
      }
    }
  }

  if (!canonical) return null;

  if (seasonsDir) {
    const absBase = path.resolve(seasonsDir);
    const target = path.resolve(absBase, canonical);
    if (!target.startsWith(absBase + path.sep) && target !== absBase) return null;
    if (mustExist && (!fs.existsSync(target) || !fs.statSync(target).isDirectory())) return null;
  }

  return canonical;
}

function resolveCompetition(compParam) {
  if (!compParam) return null;
  let decoded = String(compParam);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // keep raw
  }
  const key = decoded.trim().toLowerCase();
  if (COMPETITION_LOOKUP[key]) return COMPETITION_LOOKUP[key];
  const keyClean = key.replace(/[-_]/g, ' ');
  if (COMPETITION_LOOKUP[keyClean]) return COMPETITION_LOOKUP[keyClean];
  for (const [lookupK, v] of Object.entries(COMPETITION_LOOKUP)) {
    if (lookupK === key || lookupK.endsWith(key) || key.endsWith(lookupK)) {
      return v;
    }
  }
  return null;
}

function validatePosition(posParam) {
  if (!posParam) return null;
  const pos = String(posParam).trim().toUpperCase();
  if (VALID_POSITIONS.has(pos) || ['GK', 'DF', 'MF', 'FW'].some((p) => pos.includes(p))) {
    return pos;
  }
  return null;
}

function validateMetric(metricParam, defaultMetric = 'Gls') {
  if (!metricParam) return defaultMetric;
  const cleaned = String(metricParam).trim();
  const aliasMap = {
    goals: 'Gls',
    assists: 'Ast',
    minutes: 'Min',
    matches: 'MP',
    xg: 'xG',
    xag: 'xAG',
    npxg: 'npxG',
    prgc: 'PrgC',
    prgp: 'PrgP',
    prgr: 'PrgR',
    prgc_90: 'PrgC_90',
    prgp_90: 'PrgP_90',
    prgr_90: 'PrgR_90',
  };
  const key = aliasMap[cleaned.toLowerCase()] || cleaned;
  if (METRIC_DEFINITIONS[key] || ['Gls_minus_xG', 'Ast_minus_xAG', 'xG_minus_Gls'].includes(key)) {
    return key;
  }
  return defaultMetric;
}

function validateScatterMetric(metricParam, defaultMetric = 'Gls') {
  if (metricParam && String(metricParam).trim().toLowerCase() === 'xg+xag') {
    return 'xG+xAG';
  }
  return validateMetric(metricParam, defaultMetric);
}

function validatePagination(pageStr, limitStr, defaultPage = 1, defaultLimit = 50, maxLimit = 500) {
  let page = parseInt(pageStr, 10);
  if (Number.isNaN(page) || page < 1) page = defaultPage;
  let limit = parseInt(limitStr, 10);
  if (Number.isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit };
}

function parseBool(val, defaultVal = false) {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  if (['true', '1', 'yes', 't', 'y', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'f', 'n', 'off'].includes(s)) return false;
  return defaultVal;
}

function roundTo(val, decimals = 2) {
  if (val === null || val === undefined || !Number.isFinite(val)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  SEASONS_DIR,
  BASELINES_DIR,
  DEFAULT_SEASON,
  COMPETITIONS,
  COMPETITION_LOOKUP,
  METRIC_DEFINITIONS,
  METRIC_SOURCE_REGISTRY,
  ERA_METRIC_COVERAGE,
  isMetricTrackedInEra,
  slugify,
  isUnsafeSeasonTraversal,
  validateSeasonId,
  resolveCompetition,
  validatePosition,
  validateMetric,
  validateScatterMetric,
  validatePagination,
  parseBool,
  roundTo,
};
