const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const {
  ROOT_DIR,
  METRIC_DEFINITIONS,
  METRIC_SOURCE_REGISTRY,
  validateSeasonId,
  validatePosition,
  validateScatterMetric,
  validatePagination,
  parseBool,
} = require('./server/config');
const { seasonService, dataLoader } = require('./server/dataLoader');
const {
  getCompetitionsSummary,
  getTeamsByCompetition,
  searchPlayers,
  getPlayerProfile,
  getPlayerCareerHistory,
  getLeaderboard,
  comparePlayers,
  getDashboardAnalytics,
} = require('./server/analytics');
const {
  pool,
  percentiles,
  similarPlayers,
  performanceIndex,
  scatterMetricValue,
  getScatterChartData,
} = require('./server/charts');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const FRONTEND_BUILD_DIR = path.join(ROOT_DIR, 'frontend', 'build');

app.use(cors());
app.use(express.json({ limit: '16mb' }));

function cleanForJson(obj) {
  if (typeof obj === 'number') {
    return Number.isFinite(obj) ? obj : null;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanForJson);
  }
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = cleanForJson(v);
    }
    return out;
  }
  return obj;
}

function sendSuccess(res, data, metadata = null, statusCode = 200) {
  const payload = { success: true, data: cleanForJson(data) };
  if (metadata !== null) payload.metadata = cleanForJson(metadata);
  return res.status(statusCode).json(payload);
}

function sendError(res, message, statusCode = 400, code = null, details = null) {
  const errCode = code || `ERR_${statusCode}`;
  const payload = {
    success: false,
    error: message,
    error_detail: { code: errCode, message },
  };
  if (details !== null) {
    payload.details = cleanForJson(details);
    payload.error_detail.details = cleanForJson(details);
  }
  return res.status(statusCode).json(payload);
}

function sendPaginated(res, items, total, page, limit, metadata = null) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
  const payload = {
    success: true,
    data: cleanForJson(items),
    pagination: {
      total,
      page,
      limit,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
  if (metadata !== null) payload.metadata = cleanForJson(metadata);
  return res.status(200).json(payload);
}

let baselineVerified = false;
try {
  seasonService.verifyBaselineIntegrity();
  baselineVerified = true;
} catch (err) {
  console.warn('[PitchPulse] Baseline verification warning:', err.message);
}

try {
  dataLoader.loadSeason(seasonService.getActiveSeason());
  console.log(`[PitchPulse] Preloaded season ${seasonService.getActiveSeason()}`);
} catch (err) {
  console.error('[PitchPulse] Startup dataset load error:', err.message);
}

const api = express.Router();
const scatterRangeCache = new Map();

// --- META ROUTES ---
api.get('/health', (req, res) => {
  const activeSeason = seasonService.getActiveSeason();
  const baselineExists = seasonService.seasonExists('2024-2025');
  const activeExists = seasonService.seasonExists(activeSeason);
  const isReady = Boolean(baselineExists && activeExists);
  return sendSuccess(
    res,
    {
      status: isReady ? 'healthy' : 'unhealthy',
      service: 'PitchPulse Analytics API',
      dataset_ready: baselineExists,
      baseline_verified: baselineVerified,
      active_season: activeSeason,
      available_seasons: seasonService.listSeasons().map((s) => s.id),
    },
    null,
    isReady ? 200 : 503
  );
});

api.get('/metadata', (req, res) => {
  let targetSeason = seasonService.getActiveSeason();
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    targetSeason = check.season;
  }

  const manifest = seasonService.getSeasonManifest(targetSeason) || {};
  const policy = seasonService.getQuarantinePolicy(targetSeason);
  const records = dataLoader.getRecords(targetSeason);
  const totalGoals = records.reduce((s, r) => s + (r.Gls || 0), 0);
  const totalAssists = records.reduce((s, r) => s + (r.Ast || 0), 0);
  const totalMinutes = records.reduce((s, r) => s + (r.Min || 0), 0);
  const totalTeams = new Set(records.map((r) => r.Squad).filter(Boolean)).size;
  const totalComps = new Set(records.map((r) => r.Comp).filter(Boolean)).size;

  return sendSuccess(res, {
    season: targetSeason,
    dataset_name:
      manifest.display_name || `Big 5 European Leagues Player Statistics ${targetSeason.replace('-', '/')}`,
    source: manifest.source || manifest.source_name || 'FBref / StatsBomb style player-level aggregates',
    updated_at: manifest.imported_at || manifest.data_as_of || 'Completed Season',
    total_records: manifest.records_count || records.length,
    total_players: records.length,
    total_goals: totalGoals,
    total_assists: totalAssists,
    total_minutes: totalMinutes,
    total_teams: totalTeams,
    total_competitions: totalComps,
    competitions_count: manifest.competitions_count || totalComps,
    clubs_count: manifest.clubs_count || totalTeams,
    is_baseline: targetSeason === '2024-2025',
    is_quarantined: policy.is_quarantined,
    dataset_status: policy.dataset_status,
    status_label: policy.status_label,
    disclaimer:
      manifest.disclaimer ||
      "Player-level aggregates covering Europe's top 5 leagues. Records represent individual spells per club.",
  });
});

api.get('/metrics', (req, res) => sendSuccess(res, METRIC_DEFINITIONS));

api.get('/metrics/registry', (req, res) => {
  const metricId = req.query.metric_id;
  if (metricId) {
    const info = METRIC_SOURCE_REGISTRY[metricId];
    if (!info) return sendError(res, `Metric '${metricId}' not found in registry`, 404, 'ERR_METRIC_NOT_FOUND');
    return sendSuccess(res, info);
  }
  return sendSuccess(res, METRIC_SOURCE_REGISTRY);
});

// --- SEASONS ROUTES ---
api.get('/seasons', (req, res) => sendSuccess(res, seasonService.listSeasons()));

api.get('/seasons/active', (req, res) => {
  const activeId = seasonService.getActiveSeason();
  return sendSuccess(res, {
    active_season: activeId,
    manifest: seasonService.getSeasonManifest(activeId) || {},
  });
});

api.post('/seasons/active', (req, res) => {
  const seasonId = req.body?.season || req.body?.season_id;
  if (!seasonId) return sendError(res, "Missing required field 'season'", 400, 'ERR_MISSING_SEASON');

  const validated = validateSeasonId(seasonId, seasonService.seasonsDir, true);
  if (!validated) {
    return sendError(res, `Season '${seasonId}' does not exist or has invalid format.`, 404, 'ERR_SEASON_NOT_FOUND');
  }

  try {
    const newActive = seasonService.setActiveSeason(validated);
    dataLoader.loadSeason(newActive);
    return sendSuccess(res, {
      message: `Active season set to '${newActive}'`,
      active_season: newActive,
    });
  } catch (err) {
    return sendError(res, err.message, 404, 'ERR_SEASON_NOT_FOUND');
  }
});

api.get('/seasons/baseline/verify', (req, res) => {
  try {
    return sendSuccess(res, seasonService.verifyBaselineIntegrity());
  } catch (err) {
    return sendError(res, `Baseline integrity violation: ${err.message}`, 422, 'ERR_BASELINE_CORRUPT');
  }
});

api.get('/seasons/presets', (req, res) => sendSuccess(res, seasonService.getDownloadPresets()));

api.post('/seasons/import', (req, res) => {
  if (req.body?.url) {
    return sendError(
      res,
      'Remote URL fetching is disabled for security (SSRF prevention). All 14 historical seasons are preloaded in the archive.',
      400,
      'ERR_SSRF_PROHIBITED'
    );
  }
  return sendError(
    res,
    'Dataset ingestion requires admin credentials. All 14 verified seasons (2012-2026) are already loaded.',
    403,
    'ERR_FORBIDDEN'
  );
});

api.get('/seasons/:seasonId/quality', (req, res) => {
  const validated = validateSeasonId(req.params.seasonId, seasonService.seasonsDir, true);
  if (!validated) return sendError(res, `Season '${req.params.seasonId}' not found.`, 404, 'ERR_NOT_FOUND');

  const manifest = seasonService.getSeasonManifest(validated) || {};
  let knownGaps = null;
  const gapsFile = manifest?.known_gaps?.file || 'known_gaps.json';
  if (path.basename(gapsFile) === gapsFile) {
    const gapsPath = path.join(seasonService.seasonsDir, validated, gapsFile);
    if (fs.existsSync(gapsPath)) {
      try {
        knownGaps = JSON.parse(fs.readFileSync(gapsPath, 'utf-8'));
      } catch {
        knownGaps = null;
      }
    }
  }

  return sendSuccess(res, {
    season: validated,
    known_gaps: knownGaps,
    partial_competitions: manifest.partial_competitions || {},
    untracked_metrics: manifest.untracked_metrics || [],
    untracked_metrics_reason: manifest.untracked_metrics_reason || null,
    dataset_status: manifest.dataset_status || null,
    notes: manifest.quality_notes || manifest.verification_notes || null,
  });
});

api.get('/seasons/:seasonId/download', (req, res) => {
  const validated = validateSeasonId(req.params.seasonId, seasonService.seasonsDir, true);
  if (!validated) return sendError(res, `Season '${req.params.seasonId}' not found.`, 404, 'ERR_NOT_FOUND');
  const csvPath = seasonService.getSeasonCsvPath(validated);
  if (!csvPath) return sendError(res, `Season dataset file for '${validated}' not found.`, 404, 'ERR_NOT_FOUND');
  return res.download(csvPath, `pitchpulse_${validated}_players.csv`);
});

api.get('/seasons/:seasonId', (req, res) => {
  const validated = validateSeasonId(req.params.seasonId, seasonService.seasonsDir, true);
  if (!validated) return sendError(res, `Season '${req.params.seasonId}' not found.`, 404, 'ERR_NOT_FOUND');
  const manifest = seasonService.getSeasonManifest(validated);
  if (!manifest) return sendError(res, `Season manifest for '${validated}' not found.`, 404, 'ERR_NOT_FOUND');
  return sendSuccess(res, manifest);
});

// --- CHARTS & ANALYTICS ROUTES (registered before /players/:id) ---
api.get('/charts/scatter', (req, res) => {
  let targetSeason = seasonService.getActiveSeason();
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    targetSeason = check.season;
  }

  const xMetric = req.query.x || req.query.x_metric || 'xG_90';
  const yMetric = req.query.y || req.query.y_metric || 'xAG_90';
  let position = req.query.position || req.query.pos || null;
  const competition = req.query.competition || req.query.comp || null;

  if (position) {
    const validPos = validatePosition(position);
    if (!validPos) return sendError(res, `Invalid position '${position}'`, 400, 'ERR_INVALID_POSITION');
    position = validPos;
  }

  const parsedMin = parseInt(req.query.min_minutes, 10);
  const minMinutes = Number.isNaN(parsedMin) ? 270 : Math.max(0, parsedMin);

  let ageMax = null;
  if (req.query.age_max !== undefined && req.query.age_max !== '') {
    const parsedAge = parseFloat(req.query.age_max);
    if (!Number.isFinite(parsedAge) || parsedAge < 0) {
      return sendError(res, 'age_max must be a non-negative number', 400, 'ERR_INVALID_AGE');
    }
    ageMax = parsedAge;
  }

  const records = dataLoader.getRecords(targetSeason);
  const data = getScatterChartData(records, {
    xMetric,
    yMetric,
    position,
    competition,
    minMinutes,
    ageMax,
  });
  return sendSuccess(res, data, { season: targetSeason });
});

api.get('/charts/scatter/range', (req, res) => {
  const xRaw = req.query.x || 'xG_90';
  const yRaw = req.query.y || 'xAG_90';
  const xMetric = validateScatterMetric(xRaw, null);
  const yMetric = validateScatterMetric(yRaw, null);
  const extraValid = new Set(['Gls_minus_xG', 'Ast_minus_xAG', 'xG_minus_Gls', 'xG+xAG']);

  if (!METRIC_DEFINITIONS[xMetric] && !extraValid.has(xMetric)) {
    return sendError(res, `Invalid metric '${xRaw}'`, 400, 'ERR_INVALID_METRIC');
  }
  if (!METRIC_DEFINITIONS[yMetric] && !extraValid.has(yMetric)) {
    return sendError(res, `Invalid metric '${yRaw}'`, 400, 'ERR_INVALID_METRIC');
  }

  const position = req.query.position || null;
  if (position && !validatePosition(position)) {
    return sendError(res, `Invalid position '${position}'`, 400, 'ERR_INVALID_POSITION');
  }

  const rawMinutes = req.query.min_minutes !== undefined ? req.query.min_minutes : '270';
  const minMinutes = parseInt(rawMinutes, 10);
  if (Number.isNaN(minMinutes) || minMinutes < 0) {
    return sendError(res, 'min_minutes must be a non-negative integer', 400, 'ERR_INVALID_MINUTES');
  }

  const competition = req.query.competition || null;
  const cacheKey = JSON.stringify([xMetric, yMetric, position, competition, minMinutes]);
  if (scatterRangeCache.has(cacheKey)) {
    return sendSuccess(res, scatterRangeCache.get(cacheKey));
  }

  const seasons = seasonService.listSeasons();
  const xValues = [];
  const yValues = [];
  const xSeasons = new Set();
  const ySeasons = new Set();

  for (const s of seasons) {
    const records = dataLoader.getRecords(s.id);
    const filtered = pool(records, { position, competition, minMinutes });
    if (filtered.length === 0) continue;

    let hasX = false;
    let hasY = false;
    for (const r of filtered) {
      const vx = scatterMetricValue(r, xMetric);
      if (typeof vx === 'number' && Number.isFinite(vx)) {
        xValues.push(vx);
        hasX = true;
      }
      const vy = scatterMetricValue(r, yMetric);
      if (typeof vy === 'number' && Number.isFinite(vy)) {
        yValues.push(vy);
        hasY = true;
      }
    }
    if (hasX) xSeasons.add(s.id);
    if (hasY) ySeasons.add(s.id);
  }

  const signedSet = new Set(['Gls_minus_xG', 'Ast_minus_xAG', 'xG_minus_Gls']);
  const buildRange = (metric, values, seasonSet) => {
    if (values.length === 0) {
      return { metric, max: null, signed: signedSet.has(metric), seasons: [] };
    }
    let minV = Infinity;
    let maxV = -Infinity;
    for (const v of values) {
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const signed = signedSet.has(metric) || minV < 0;
    const out = {
      metric,
      max: maxV,
      signed,
      seasons: Array.from(seasonSet).sort(),
    };
    if (signed) out.min = minV;
    return out;
  };

  const payload = {
    x: buildRange(xMetric, xValues, xSeasons),
    y: buildRange(yMetric, yValues, ySeasons),
    filters: { position, competition, min_minutes: minMinutes },
  };
  if (scatterRangeCache.size >= 128) scatterRangeCache.clear();
  scatterRangeCache.set(cacheKey, payload);
  return sendSuccess(res, payload);
});

api.get('/leaderboards/index', (req, res) => {
  let targetSeason = seasonService.getActiveSeason();
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    targetSeason = check.season;
  }

  const role = req.query.role || req.query.preset || 'finisher';
  let position = req.query.position || req.query.pos || null;
  const competition = req.query.competition || req.query.comp || null;

  if (position) {
    const validPos = validatePosition(position);
    if (!validPos) return sendError(res, `Invalid position '${position}'`, 400, 'ERR_INVALID_POSITION');
    position = validPos;
  }

  const parsedMin = parseInt(req.query.min_minutes, 10);
  const minMinutes = Number.isNaN(parsedMin) ? 270 : Math.max(0, parsedMin);
  const parsedLimit = parseInt(req.query.limit, 10);
  const limit = Number.isNaN(parsedLimit) ? 25 : Math.max(1, Math.min(100, parsedLimit));

  const records = dataLoader.getRecords(targetSeason);
  const result = performanceIndex(records, { role, position, competition, minMinutes, limit });
  return sendSuccess(res, result, { season: targetSeason });
});

// --- COMPETITIONS & TEAMS ROUTES ---
api.get('/competitions', (req, res) => {
  let season = null;
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    season = check.season;
  }
  return sendSuccess(res, getCompetitionsSummary(season));
});

api.get('/teams', (req, res) => {
  let season = null;
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    season = check.season;
  }
  return sendSuccess(res, getTeamsByCompetition(req.query.competition || null, season));
});

api.get('/leagues', (req, res) => {
  let season = null;
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) return sendError(res, check.error, check.code);
    season = check.season;
  }
  const records = dataLoader.getRecords(season);
  const leagues = Array.from(new Set(records.map((r) => r.Comp).filter(Boolean))).sort();
  return res.json(leagues);
});

api.get('/teams/:league', (req, res) => {
  let season = null;
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) return sendError(res, check.error, check.code);
    season = check.season;
  }
  return res.json(getTeamsByCompetition(req.params.league, season));
});

// --- DASHBOARD & LEADERBOARDS ---
api.get('/dashboard', (req, res) => {
  const comp = req.query.competition || req.query.comp || null;
  let season = null;
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    season = check.season;
  }
  const data = getDashboardAnalytics(comp, season);
  if (data === null && comp) {
    return sendError(res, `Competition '${comp}' not recognized`, 404);
  }
  return sendSuccess(res, data || {});
});

api.get('/leaderboards', (req, res) => {
  const metric = req.query.metric || 'Gls';
  const competition = req.query.competition || req.query.comp || null;
  let position = req.query.position || req.query.pos || null;
  let season = null;

  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    season = check.season;
  }

  if (position) {
    const validPos = validatePosition(position);
    if (!validPos) {
      return sendError(res, `Invalid position '${position}'. Expected one of: GK, DF, MF, FW or combination.`, 400, 'ERR_INVALID_POSITION');
    }
    position = validPos;
  }

  const parsedMin = req.query.min_minutes !== undefined ? parseInt(req.query.min_minutes, 10) : NaN;
  const minMinutes = !Number.isNaN(parsedMin) ? Math.max(0, parsedMin) : String(metric).endsWith('_90') ? 270 : 0;

  const parsedLimit = parseInt(req.query.limit || '10', 10);
  const limit = Number.isNaN(parsedLimit) ? 10 : Math.max(1, Math.min(100, parsedLimit));
  const mergeSpells = parseBool(req.query.merge_spells, false);

  const results = getLeaderboard({ metric, competition, position, minMinutes, limit, season, mergeSpells });
  const targetSeason = season || seasonService.getActiveSeason();
  const quarPolicy = seasonService.getQuarantinePolicy(targetSeason);

  return sendSuccess(res, results, {
    metric,
    competition: competition || 'All Competitions',
    position: position || 'All Positions',
    min_minutes: minMinutes,
    limit,
    season: targetSeason,
    is_quarantined: quarPolicy.is_quarantined,
    dataset_status: quarPolicy.dataset_status,
    quarantine_reason: quarPolicy.quarantine_reason,
    quarantine_notice: quarPolicy.is_quarantined ? quarPolicy.quarantine_reason : null,
    quarantine_policy: quarPolicy,
  });
});

api.get('/league-leaders', (req, res) => {
  let season = null;
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) return sendError(res, check.error, check.code);
    season = check.season;
  }
  const mapRows = (metric, key) =>
    getLeaderboard({ metric, limit: 10, season }).map((r) => ({
      Player: r.player,
      Squad: r.squad,
      [key]: r.value,
      Pos: r.position,
    }));

  return res.json({
    success: true,
    leaders: {
      goals: mapRows('Gls', 'Gls'),
      assists: mapRows('Ast', 'Ast'),
      matches: mapRows('MP', 'MP'),
      minutes: mapRows('Min', 'Min'),
    },
  });
});

// --- COMPARISONS ROUTE ---
api.post('/players/compare', (req, res) => {
  const playerIds = req.body?.player_ids || req.body?.ids || [];
  let season = req.body?.season || req.query.season || null;

  if (season) {
    const check = seasonService.resolveAndValidateSeason(season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    season = check.season;
  }

  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return sendError(res, 'No players to compare', 400);
  }

  const result = comparePlayers(playerIds, season);
  if (!result || result.players.length === 0) {
    return sendError(res, 'None of the requested players were found', 404);
  }

  const selectedPlayers = result.players;
  const targetSeason = season || seasonService.getActiveSeason();
  const basePolicy = seasonService.getQuarantinePolicy(targetSeason);
  const playerPolicies = selectedPlayers.map((p) =>
    seasonService.getQuarantinePolicy(p.season || targetSeason)
  );
  const anyQuarantined = basePolicy.is_quarantined || playerPolicies.some((pol) => pol.is_quarantined);

  let quarReason = null;
  let datasetStatus = 'verified_historical';
  if (anyQuarantined) {
    const allPols = [basePolicy, ...playerPolicies];
    const firstQuar = allPols.find((pol) => pol.is_quarantined);
    quarReason = firstQuar?.quarantine_reason || 'Dataset contains unverified data and is quarantined.';
    datasetStatus = firstQuar?.dataset_status || 'quarantined';
  }

  return res.status(200).json(
    cleanForJson({
      success: true,
      players: selectedPlayers,
      metrics: result.metrics,
      radar: result.radar,
      is_quarantined: anyQuarantined,
      dataset_status: datasetStatus,
      quarantine_notice: anyQuarantined ? quarReason : null,
      quarantine_policy: anyQuarantined
        ? playerPolicies.find((p) => p.is_quarantined) || basePolicy
        : basePolicy,
      comparison_data: {
        goals: selectedPlayers.map((p) => p.Gls || 0),
        assists: selectedPlayers.map((p) => p.Ast || 0),
        matches: selectedPlayers.map((p) => p.MP || 0),
        minutes: selectedPlayers.map((p) => p.Min || 0),
      },
    })
  );
});

// --- PLAYERS ROUTES ---
api.get('/players', (req, res) => {
  const search = req.query.search || null;
  const competition = req.query.competition || req.query.comp || null;
  const squad = req.query.squad || req.query.team || null;
  let position = req.query.position || req.query.pos || null;
  const sortBy = req.query.sort_by || req.query.sort || 'Gls';
  const order = req.query.order || 'desc';
  let season = null;

  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    season = check.season;
  }

  if (position) {
    const validPos = validatePosition(position);
    if (!validPos) {
      return sendError(res, `Invalid position '${position}'. Expected one of: GK, DF, MF, FW or combination.`, 400, 'ERR_INVALID_POSITION');
    }
    position = validPos;
  }

  const parsedMin = parseInt(req.query.min_minutes || req.query.min_mins || '0', 10);
  const minMinutes = Number.isNaN(parsedMin) ? 0 : Math.max(0, parsedMin);
  const targetSeason = season || seasonService.getActiveSeason();
  const quarPolicy = seasonService.getQuarantinePolicy(targetSeason);
  const meta = {
    season: targetSeason,
    is_quarantined: quarPolicy.is_quarantined,
    dataset_status: quarPolicy.dataset_status,
    quarantine_reason: quarPolicy.quarantine_reason,
    quarantine_notice: quarPolicy.is_quarantined ? quarPolicy.quarantine_reason : null,
    quarantine_policy: quarPolicy,
  };

  const allRecords = parseBool(req.query.all || req.query.raw, false);
  const mergeSpells = parseBool(req.query.merge_spells, false);

  if (allRecords) {
    const { items, total } = searchPlayers({
      search, competition, squad, position, minMinutes, sortBy, order, page: 1, limit: 3000, season, mergeSpells,
    });
    meta.total = total;
    return sendSuccess(res, items, meta);
  }

  const { page, limit } = validatePagination(req.query.page, req.query.limit);
  const { items, total } = searchPlayers({
    search, competition, squad, position, minMinutes, sortBy, order, page, limit, season, mergeSpells,
  });
  return sendPaginated(res, items, total, page, limit, meta);
});

api.get('/players/:playerId/percentiles', (req, res) => {
  let targetSeason = seasonService.getActiveSeason();
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    targetSeason = check.season;
  }

  const player = dataLoader.getById(req.params.playerId, targetSeason);
  if (!player) return sendError(res, `Player with ID '${req.params.playerId}' not found`, 404, 'ERR_NOT_FOUND');

  const parsedMin = parseInt(req.query.min_minutes, 10);
  const minMinutes = Number.isNaN(parsedMin) ? 270 : Math.max(0, parsedMin);
  const records = dataLoader.getRecords(targetSeason);
  const posClean = String(player.Pos || 'MF').split(',')[0].trim();
  const peerPool = pool(records, { position: posClean, minMinutes });

  return sendSuccess(
    res,
    {
      player_id: player.id,
      Player: player.Player,
      Pos: player.Pos,
      comparison_position: posClean,
      peer_sample_size: peerPool.length,
      percentiles: percentiles(player, peerPool),
    },
    { season: targetSeason }
  );
});

api.get('/players/:playerId/similar', (req, res) => {
  let targetSeason = seasonService.getActiveSeason();
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    targetSeason = check.season;
  }

  const player = dataLoader.getById(req.params.playerId, targetSeason);
  if (!player) return sendError(res, `Player with ID '${req.params.playerId}' not found`, 404, 'ERR_NOT_FOUND');

  const parsedK = parseInt(req.query.k || '5', 10);
  const k = Number.isNaN(parsedK) ? 5 : Math.max(1, Math.min(20, parsedK));
  const parsedMin = parseInt(req.query.min_minutes || '270', 10);
  const minMinutes = Number.isNaN(parsedMin) ? 270 : Math.max(0, parsedMin);
  const sameLeague = parseBool(req.query.same_league, false);

  const records = dataLoader.getRecords(targetSeason);
  const peerPool = pool(records, { minMinutes });
  const similar = similarPlayers(player, peerPool, { k, sameLeague });

  return sendSuccess(
    res,
    {
      target_player: {
        id: player.id,
        Player: player.Player,
        Squad: player.Squad,
        Comp: player.Comp,
        Pos: player.Pos,
      },
      count: similar.length,
      similar_players: similar,
    },
    { season: targetSeason }
  );
});

api.get('/players/:playerId/history', (req, res) => {
  let season = null;
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    season = check.season;
  }

  let seasonsFilter = null;
  if (req.query.seasons) {
    const rawList = String(req.query.seasons)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const validated = [];
    for (const s of rawList) {
      const check = seasonService.resolveAndValidateSeason(s);
      if (check.error) {
        return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
      }
      validated.push(check.season);
    }
    seasonsFilter = validated;
  }

  const history = getPlayerCareerHistory(req.params.playerId, { season, seasonsFilter });
  if (!history) {
    return sendError(res, `Player '${req.params.playerId}' not found across archive seasons`, 404, 'ERR_NOT_FOUND');
  }
  return sendSuccess(res, history);
});

api.get('/players/:playerId', (req, res) => {
  let season = null;
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) {
      return sendError(res, check.error, check.code, check.code === 400 ? 'ERR_INVALID_SEASON' : 'ERR_SEASON_NOT_FOUND');
    }
    season = check.season;
  }
  const profile = getPlayerProfile(req.params.playerId, season);
  if (!profile) return sendError(res, `Player with ID '${req.params.playerId}' not found`, 404, 'ERR_NOT_FOUND');
  return sendSuccess(res, profile);
});

api.get('/players/:league/:team', (req, res) => {
  let season = null;
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) return sendError(res, check.error, check.code);
    season = check.season;
  }
  const { items } = searchPlayers({
    competition: req.params.league,
    squad: req.params.team,
    limit: 100,
    season,
  });
  return res.json(cleanForJson(items));
});

api.get('/player/:playerId', (req, res) => {
  let season = null;
  if (req.query.season) {
    const check = seasonService.resolveAndValidateSeason(req.query.season);
    if (check.error) return sendError(res, check.error, check.code);
    season = check.season;
  }
  const player = dataLoader.getById(req.params.playerId, season);
  if (!player) return res.status(404).json({ success: false, error: 'Player not found' });

  return res.json(
    cleanForJson({
      success: true,
      player,
      statistics: {
        goals: player.Gls || 0,
        assists: player.Ast || 0,
        matches_played: player.MP || 0,
        minutes: player.Min || 0,
        starts: player.Starts || 0,
        yellow_cards: player.CrdY || 0,
        red_cards: player.CrdR || 0,
      },
    })
  );
});

api.get('/', (req, res) => res.send('Football Analytics API is running!'));

// Mount API router
app.use('/api', api);

// Serve built React frontend static assets
if (fs.existsSync(FRONTEND_BUILD_DIR)) {
  app.use(express.static(FRONTEND_BUILD_DIR));
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return sendError(res, 'Endpoint not found', 404, 'ERR_NOT_FOUND');
    }
    return res.sendFile(path.join(FRONTEND_BUILD_DIR, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.send('PitchPulse Analytics server running. Build frontend with npm run build.'));
}

app.use((err, req, res, next) => {
  console.error('[PitchPulse] Server error:', err);
  if (res.headersSent) return next(err);
  return sendError(res, 'Internal server error', 500, 'ERR_INTERNAL_SERVER_ERROR');
});

app.listen(PORT, HOST, () => {
  console.log(`[PitchPulse] Server running at http://${HOST}:${PORT}`);
});
