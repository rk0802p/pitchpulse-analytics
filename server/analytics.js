const {
  COMPETITIONS,
  isMetricTrackedInEra,
  resolveCompetition,
  validateMetric,
  roundTo,
} = require('./config');
const { seasonService, dataLoader } = require('./dataLoader');

function isFiniteNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function getCompetitionsSummary(season = null) {
  const records = dataLoader.getRecords(season);
  const compMap = new Map();

  for (const r of records) {
    if (!r.Comp) continue;
    if (!compMap.has(r.Comp)) {
      compMap.set(r.Comp, {
        squads: new Set(),
        players: 0,
        goals: 0,
        assists: 0,
        matches: 0,
      });
    }
    const bucket = compMap.get(r.Comp);
    if (r.Squad) bucket.squads.add(r.Squad);
    bucket.players += 1;
    bucket.goals += r.Gls || 0;
    bucket.assists += r.Ast || 0;
    bucket.matches += r.MP || 0;
  }

  return Array.from(compMap.keys())
    .sort()
    .map((rawName) => {
      const info = COMPETITIONS[rawName] || {
        id: rawName.toLowerCase().replace(/\s+/g, '-'),
        name: rawName,
        country: 'Europe',
        code: rawName.slice(0, 3).toUpperCase(),
      };
      const b = compMap.get(rawName);
      return {
        id: info.id,
        name: info.name,
        raw_name: rawName,
        country: info.country,
        code: info.code,
        teams_count: b.squads.size,
        players_count: b.players,
        total_goals: b.goals,
        total_assists: b.assists,
        total_matches: b.matches,
      };
    });
}

function getTeamsByCompetition(competition = null, season = null) {
  let records = dataLoader.getRecords(season);
  if (competition) {
    const resolved = resolveCompetition(competition);
    if (!resolved) return [];
    records = records.filter((r) => r.Comp === resolved);
  }
  const squads = new Set(records.map((r) => r.Squad).filter(Boolean));
  return Array.from(squads).sort();
}

function mergePlayerSpells(records) {
  if (!records || records.length === 0) return records;
  const groups = new Map();
  for (const r of records) {
    const key = r.player_id || r.player_slug || String(r.id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const numericSum = [
    'MP', 'Starts', 'Min', '90s', 'Gls', 'Ast', 'G+A', 'G-PK', 'PK', 'PKatt',
    'CrdY', 'CrdR', 'PrgC', 'PrgP', 'PrgR', 'xG', 'npxG', 'xAG', 'npxG+xAG',
  ];

  const merged = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      merged.push(group[0]);
      continue;
    }
    const sorted = [...group].sort((a, b) => (b.Min || 0) - (a.Min || 0));
    const row = { ...sorted[0] };
    const squads = Array.from(new Set(sorted.map((g) => g.Squad).filter(Boolean)));
    row.Squad = squads.join(', ');

    const isSharedXg = group.every((g) => g._shared_season_xg === true);
    const sharedFields = new Set(['xG', 'npxG', 'xAG', 'npxG+xAG']);
    for (const col of numericSum) {
      const valid = group.map((g) => g[col]).filter(isFiniteNum);
      if (isSharedXg && sharedFields.has(col)) {
        row[col] = valid.length === group.length ? roundTo(valid[0], 2) : null;
      } else {
        row[col] = valid.length > 0 ? roundTo(valid.reduce((acc, v) => acc + v, 0), 2) : null;
      }
    }

    const mins = row.Min || 0;
    if (mins > 0) {
      row['90s'] = roundTo(mins / 90.0, 1);
      for (const m of ['Gls', 'Ast', 'G+A', 'G-PK', 'xG', 'xAG', 'npxG', 'npxG+xAG', 'PrgC', 'PrgP', 'PrgR']) {
        if (isFiniteNum(row[m])) {
          row[`${m}_90`] = roundTo((row[m] / mins) * 90.0, 2);
        }
      }
      if (isFiniteNum(row['G-PK']) && isFiniteNum(row.Ast)) {
        row['G+A-PK_90'] = roundTo(((row['G-PK'] + row.Ast) / mins) * 90.0, 2);
      }
      if (isFiniteNum(row.xG_90) && isFiniteNum(row.xAG_90)) {
        row['xG+xAG_90'] = roundTo(row.xG_90 + row.xAG_90, 2);
      }
    }
    if (isFiniteNum(row.Gls) && isFiniteNum(row.xG)) {
      row.Gls_minus_xG = roundTo(row.Gls - row.xG, 2);
      row.xG_minus_Gls = roundTo(row.xG - row.Gls, 2);
    }
    if (isFiniteNum(row.Ast) && isFiniteNum(row.xAG)) {
      row.Ast_minus_xAG = roundTo(row.Ast - row.xAG, 2);
    }
    row.spells_count = group.length;
    merged.push(row);
  }
  return merged;
}

function sortRecords(records, metric, ascending = false) {
  return [...records].sort((a, b) => {
    const va = a[metric];
    const vb = b[metric];
    const aNull = va === null || va === undefined || va === '';
    const bNull = vb === null || vb === undefined || vb === '';
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;
    if (typeof va === 'string' && typeof vb === 'string') {
      return ascending ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return ascending ? va - vb : vb - va;
  });
}

function searchPlayers({
  search = null,
  competition = null,
  squad = null,
  position = null,
  minMinutes = 0,
  sortBy = 'Gls',
  order = 'desc',
  page = 1,
  limit = 50,
  season = null,
  mergeSpells = false,
} = {}) {
  let records = dataLoader.getRecords(season);
  if (mergeSpells) records = mergePlayerSpells(records);

  if (competition) {
    const resolved = resolveCompetition(competition);
    if (!resolved) return { items: [], total: 0 };
    records = records.filter((r) => r.Comp === resolved);
  }

  if (squad) {
    let decoded = String(squad);
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // keep raw
    }
    const sqLower = decoded.trim().toLowerCase();
    records = records.filter((r) => (r.Squad || '').toLowerCase() === sqLower);
  }

  if (position) {
    const posClean = String(position).trim().toUpperCase();
    records = records.filter((r) => (r.Pos || '').toUpperCase().includes(posClean));
  }

  if (minMinutes && minMinutes > 0) {
    records = records.filter((r) => (r.Min || 0) >= minMinutes);
  }

  if (search) {
    const normalize = (s) =>
      String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const rawTerm = normalize(search).trim();
    const leagueAliasMap = {
      epl: 'premier league',
      pl: 'premier league',
      laliga: 'la liga',
      seriea: 'serie a',
      ligue1: 'ligue 1',
      buli: 'bundesliga',
    };
    const term = leagueAliasMap[rawTerm] || rawTerm;
    records = records.filter(
      (r) =>
        normalize(r.Player).includes(term) ||
        normalize(r.Squad).includes(term) ||
        normalize(r.competition_name).includes(term) ||
        normalize(r.Comp).includes(term) ||
        normalize(r.country).includes(term)
    );
  }

  const total = records.length;
  if (total === 0) return { items: [], total: 0 };

  const metric = validateMetric(sortBy, 'Gls');
  const ascending = String(order).toLowerCase() === 'asc';
  const sorted = sortRecords(records, metric, ascending);

  const startIdx = (page - 1) * limit;
  return {
    items: sorted.slice(startIdx, startIdx + limit),
    total,
  };
}

function getPlayerProfile(recordId, season = null) {
  const player = dataLoader.getById(recordId, season);
  if (!player) return null;

  const activeSeason = season || player.season || seasonService.getActiveSeason();
  const allRecords = dataLoader.getRecords(activeSeason);
  const playerComp = player.Comp;
  const compRecords = playerComp ? allRecords.filter((r) => r.Comp === playerComp) : allRecords;

  const hasPositiveInPool = (pool, col) => {
    for (const r of pool) {
      if (isFiniteNum(r[col]) && r[col] > 0) return true;
    }
    return false;
  };

  const isMetricTracked = (col) => {
    if (!isMetricTrackedInEra(col, activeSeason, playerComp)) return false;
    const val = player[col];
    if (!isFiniteNum(val)) return false;
    if (val > 0) return true;
    if (compRecords.length > 0) return hasPositiveInPool(compRecords, col);
    return hasPositiveInPool(allRecords, col);
  };

  const isXgTracked = isMetricTracked('xG') || isMetricTracked('xG_90');
  const isXagTracked = isMetricTracked('xAG') || isMetricTracked('xAG_90');
  const isNpxgTracked = isMetricTracked('npxG') || isMetricTracked('npxG_90');
  const isPrgcTracked = isMetricTracked('PrgC');
  const isPrgpTracked = isMetricTracked('PrgP');
  const isPrgrTracked = isMetricTracked('PrgR');

  const minVal = player.Min || 0;
  const prgc90 = minVal > 0 && isPrgcTracked && isFiniteNum(player.PrgC) ? roundTo((player.PrgC / minVal) * 90.0, 2) : null;
  const prgp90 = minVal > 0 && isPrgpTracked && isFiniteNum(player.PrgP) ? roundTo((player.PrgP / minVal) * 90.0, 2) : null;
  const prgr90 = minVal > 0 && isPrgrTracked && isFiniteNum(player.PrgR) ? roundTo((player.PrgR / minVal) * 90.0, 2) : null;

  const playerSeason = player.season || activeSeason;
  const quarPolicy = seasonService.getQuarantinePolicy(playerSeason);

  const posClean = player.Pos ? String(player.Pos).split(',')[0].trim() : 'MF';
  let peers = allRecords.filter((r) => (r.Pos || '').includes(posClean) && (r.Min || 0) >= 270);
  if (peers.length === 0) {
    peers = allRecords.filter((r) => (r.Min || 0) >= 270);
  }

  const getPct = (col, baseMetric = null) => {
    const checkCol = baseMetric || col;
    if (!isMetricTracked(checkCol)) {
      return { pct: null, tracked: false, n: 0, insufficient: false };
    }
    const validPeers = peers.filter(
      (r) => isMetricTrackedInEra(checkCol, activeSeason, r.Comp) && isFiniteNum(r[col])
    );
    const nPeers = validPeers.length;
    if (nPeers === 0) return { pct: null, tracked: false, n: 0, insufficient: false };
    if (nPeers < 10) return { pct: null, tracked: true, n: nPeers, insufficient: true };

    const val = player[col];
    if (!isFiniteNum(val)) return { pct: null, tracked: false, n: nPeers, insufficient: false };

    let strictlyLower = 0;
    let strictlyEqual = 0;
    for (const r of validPeers) {
      if (r[col] < val) strictlyLower += 1;
      else if (r[col] === val) strictlyEqual += 1;
    }
    const pct = Math.max(0, Math.min(100, Math.round(((strictlyLower + 0.5 * strictlyEqual) / nPeers) * 100)));
    return { pct, tracked: true, n: nPeers, insufficient: false };
  };

  const pGls = getPct('Gls_90', 'Gls');
  const pXg = getPct('xG_90', 'xG');
  const pAst = getPct('Ast_90', 'Ast');
  const pXag = getPct('xAG_90', 'xAG');
  const pPrgc = getPct('PrgC', 'PrgC');
  const pPrgp = getPct('PrgP', 'PrgP');
  const pPrgr = getPct('PrgR', 'PrgR');

  return {
    identity: {
      id: player.id,
      record_id: player.record_id,
      player_id: player.player_id || player.player_slug,
      rk: player.Rk,
      name: player.Player,
      slug: player.player_slug,
      nation: player.Nation,
      position: player.Pos,
      squad: player.Squad,
      competition: player.competition_name,
      competition_id: player.competition_id || '',
      country: player.country,
      age: player.Age,
      born: player.Born,
      matches_played: player.MP,
      starts: player.Starts,
      minutes: player.Min,
      nineties: player['90s'],
    },
    playing_time: {
      matches_played: player.MP,
      starts: player.Starts,
      minutes: player.Min,
      nineties: player['90s'],
    },
    totals: {
      goals: player.Gls,
      assists: player.Ast,
      goals_plus_assists: player['G+A'],
      non_penalty_goals: player['G-PK'],
      penalty_goals: player.PK,
      penalties_attempted: player.PKatt,
      yellow_cards: player.CrdY,
      red_cards: player.CrdR,
      expected_goals: isXgTracked ? player.xG : null,
      non_penalty_xg: isNpxgTracked ? player.npxG : null,
      expected_assists: isXagTracked ? player.xAG : null,
      npxg_plus_xag: isNpxgTracked && isXagTracked ? player['npxG+xAG'] : null,
      progressive_carries: isPrgcTracked ? player.PrgC : null,
      progressive_passes: isPrgpTracked ? player.PrgP : null,
      progressive_receptions: isPrgrTracked ? player.PrgR : null,
    },
    scoring: {
      goals: player.Gls,
      non_penalty_goals: player['G-PK'],
      penalty_goals: player.PK,
      penalties_attempted: player.PKatt,
      expected_goals: isXgTracked ? player.xG : null,
      non_penalty_xg: isNpxgTracked ? player.npxG : null,
      goals_minus_xg: isXgTracked ? player.Gls_minus_xG : null,
    },
    playmaking: {
      assists: player.Ast,
      goals_plus_assists: player['G+A'],
      expected_assists: isXagTracked ? player.xAG : null,
      npxg_plus_xag: isNpxgTracked && isXagTracked ? player['npxG+xAG'] : null,
    },
    progression: {
      progressive_carries: isPrgcTracked ? player.PrgC : null,
      progressive_passes: isPrgpTracked ? player.PrgP : null,
      progressive_receptions: isPrgrTracked ? player.PrgR : null,
    },
    discipline: {
      yellow_cards: player.CrdY,
      red_cards: player.CrdR,
    },
    per_90_rates: {
      goals_per_90: player.Gls_90,
      assists_per_90: player.Ast_90,
      goals_plus_assists_per_90: player['G+A_90'],
      non_penalty_goals_per_90: player['G-PK_90'],
      goals_plus_assists_non_pk_per_90: player['G+A-PK_90'],
      xg_per_90: isXgTracked ? player.xG_90 : null,
      xag_per_90: isXagTracked ? player.xAG_90 : null,
      xg_plus_xag_per_90: isXgTracked ? player['xG+xAG_90'] : null,
      npxg_per_90: isNpxgTracked ? player.npxG_90 : null,
      npxg_plus_xag_per_90: isNpxgTracked ? player['npxG+xAG_90'] : null,
      progressive_carries_per_90: prgc90,
      progressive_passes_per_90: prgp90,
      progressive_receptions_per_90: prgr90,
    },
    raw_record: player,
    season: playerSeason,
    is_quarantined: quarPolicy.is_quarantined,
    dataset_status: quarPolicy.dataset_status,
    quarantine_reason: quarPolicy.quarantine_reason,
    quarantine_policy: quarPolicy,
    percentiles: {
      goals_per_90: { value: player.Gls_90, percentile: pGls.pct, is_tracked: pGls.tracked, insufficient_sample: pGls.insufficient, label: 'Goals / 90', sample_size: pGls.n },
      xg_per_90: { value: pXg.tracked ? player.xG_90 : null, percentile: pXg.pct, is_tracked: pXg.tracked, insufficient_sample: pXg.insufficient, label: 'Shot Threat (xG/90)', sample_size: pXg.n },
      assists_per_90: { value: player.Ast_90, percentile: pAst.pct, is_tracked: pAst.tracked, insufficient_sample: pAst.insufficient, label: 'Assists / 90', sample_size: pAst.n },
      xag_per_90: { value: pXag.tracked ? player.xAG_90 : null, percentile: pXag.pct, is_tracked: pXag.tracked, insufficient_sample: pXag.insufficient, label: 'Creation Quality (xAG/90)', sample_size: pXag.n },
      progressive_carries: { value: pPrgc.tracked ? player.PrgC : null, percentile: pPrgc.pct, is_tracked: pPrgc.tracked, insufficient_sample: pPrgc.insufficient, label: 'Prog. Carries', sample_size: pPrgc.n },
      progressive_passes: { value: pPrgp.tracked ? player.PrgP : null, percentile: pPrgp.pct, is_tracked: pPrgp.tracked, insufficient_sample: pPrgp.insufficient, label: 'Prog. Passes', sample_size: pPrgp.n },
      progressive_receptions: { value: pPrgr.tracked ? player.PrgR : null, percentile: pPrgr.pct, is_tracked: pPrgr.tracked, insufficient_sample: pPrgr.insufficient, label: 'Prog. Receptions', sample_size: pPrgr.n },
      peer_sample_size: peers.length,
      comparison_position: posClean,
    },
  };
}

function getLeaderboard({
  metric = 'Gls',
  competition = null,
  position = null,
  minMinutes = null,
  limit = 10,
  season = null,
  mergeSpells = false,
} = {}) {
  let records = dataLoader.getRecords(season);
  if (mergeSpells) records = mergePlayerSpells(records);
  const metricKey = validateMetric(metric, 'Gls');

  records = records.filter((r) => r[metricKey] !== null && r[metricKey] !== undefined);

  if (competition) {
    const resolved = resolveCompetition(competition);
    if (!resolved) return [];
    records = records.filter((r) => r.Comp === resolved);
  }

  if (position) {
    const posClean = String(position).trim().toUpperCase();
    records = records.filter((r) => (r.Pos || '').toUpperCase().includes(posClean));
  }

  const isRateMetric = String(metricKey).endsWith('_90');
  const effectiveMin = isRateMetric
    ? minMinutes === null || minMinutes < 270
      ? 270
      : minMinutes
    : minMinutes !== null
      ? minMinutes
      : 0;

  if (effectiveMin > 0) {
    records = records.filter((r) => (r.Min || 0) >= effectiveMin);
  }

  if (records.length === 0) return [];

  const sorted = sortRecords(records, metricKey, false).slice(0, limit);
  const targetSeason = season || seasonService.getActiveSeason();

  return sorted.map((row, idx) => {
    const rawVal = row[metricKey];
    const cleanVal = isFiniteNum(rawVal) ? roundTo(rawVal, 2) : rawVal;
    const rowSeason = row.season || targetSeason;
    return {
      rank: idx + 1,
      id: row.id,
      Rk: row.id,
      player: row.Player,
      Player: row.Player,
      slug: row.player_slug,
      squad: row.Squad,
      Squad: row.Squad,
      competition: row.competition_name,
      competition_id: row.competition_id || '',
      country: row.country,
      position: row.Pos,
      Pos: row.Pos,
      age: row.Age,
      minutes: row.Min,
      Min: row.Min,
      matches: row.MP,
      MP: row.MP,
      starts: row.Starts || 0,
      value: cleanVal,
      metric: metricKey,
      goals: row.Gls,
      Gls: row.Gls,
      assists: row.Ast,
      Ast: row.Ast,
      xg: isFiniteNum(row.xG) ? row.xG : null,
      xG: isFiniteNum(row.xG) ? row.xG : null,
      xag: isFiniteNum(row.xAG) ? row.xAG : null,
      xAG: isFiniteNum(row.xAG) ? row.xAG : null,
      goals_per_90: isFiniteNum(row.Gls_90) ? row.Gls_90 : 0.0,
      assists_per_90: isFiniteNum(row.Ast_90) ? row.Ast_90 : 0.0,
      xg_per_90: isFiniteNum(row.xG_90) ? row.xG_90 : null,
      xag_per_90: isFiniteNum(row.xAG_90) ? row.xAG_90 : null,
      progressive_passes: isFiniteNum(row.PrgP) ? row.PrgP : null,
      progressive_carries: isFiniteNum(row.PrgC) ? row.PrgC : null,
      finishing_differential: isFiniteNum(row.Gls_minus_xG) ? row.Gls_minus_xG : null,
      season: rowSeason,
      comparison_key: `${row.id}@${rowSeason}`,
    };
  });
}

function comparePlayers(recordIds, season = null) {
  if (!recordIds || recordIds.length === 0) return null;
  const cleanIds = recordIds.slice(0, 5);
  const players = [];

  for (const rid of cleanIds) {
    let pId = rid;
    let pSeason = season;
    if (rid && typeof rid === 'object') {
      pId = rid.id || rid.player_id || rid.Rk;
      pSeason = rid.season || season;
    } else if (typeof rid === 'string' && (rid.includes(':') || rid.includes('@'))) {
      const delim = rid.includes(':') ? ':' : '@';
      const parts = rid.split(delim);
      pId = parts[0];
      pSeason = parts[1];
    }

    const p = dataLoader.getById(pId, pSeason);
    if (p) {
      const resolvedSeason = pSeason || season || seasonService.getActiveSeason();
      players.push({
        ...p,
        season: resolvedSeason,
        comparison_key: `${p.id}@${resolvedSeason}`,
      });
    }
  }

  if (players.length === 0) return null;

  const metricsToCompare = [
    { key: 'MP', label: 'Matches Played', type: 'total' },
    { key: 'Starts', label: 'Games Started', type: 'total' },
    { key: 'Min', label: 'Minutes Played', type: 'total' },
    { key: '90s', label: '90s Completed', type: 'total' },
    { key: 'Gls', label: 'Goals', type: 'total' },
    { key: 'G-PK', label: 'Non-Penalty Goals', type: 'total' },
    { key: 'PK', label: 'Penalty Goals', type: 'total' },
    { key: 'PKatt', label: 'Penalties Attempted', type: 'total' },
    { key: 'xG', label: 'Expected Goals (xG)', type: 'expected' },
    { key: 'npxG', label: 'Non-Penalty xG (npxG)', type: 'expected' },
    { key: 'Gls_minus_xG', label: 'Finishing Differential (Gls - xG)', type: 'differential' },
    { key: 'Ast', label: 'Assists', type: 'total' },
    { key: 'G+A', label: 'Goals + Assists', type: 'total' },
    { key: 'xAG', label: 'Expected Assisted Goals (xAG)', type: 'expected' },
    { key: 'Gls_90', label: 'Goals / 90', type: 'rate' },
    { key: 'Ast_90', label: 'Assists / 90', type: 'rate' },
    { key: 'G+A_90', label: 'Goals + Assists / 90', type: 'rate' },
    { key: 'xG_90', label: 'xG / 90', type: 'rate' },
    { key: 'xAG_90', label: 'xAG / 90', type: 'rate' },
    { key: 'npxG_90', label: 'npxG / 90', type: 'rate' },
    { key: 'PrgC', label: 'Progressive Carries', type: 'progression' },
    { key: 'PrgP', label: 'Progressive Passes', type: 'progression' },
    { key: 'PrgR', label: 'Progressive Receptions', type: 'progression' },
    { key: 'CrdY', label: 'Yellow Cards', type: 'discipline' },
    { key: 'CrdR', label: 'Red Cards', type: 'discipline' },
  ];

  const radarDimensions = [
    { key: 'Gls_90', label: 'Goals/90' },
    { key: 'xG_90', label: 'xG/90' },
    { key: 'Ast_90', label: 'Assists/90' },
    { key: 'xAG_90', label: 'xAG/90' },
    { key: 'PrgC', label: 'Prog. Carries' },
    { key: 'PrgP', label: 'Prog. Passes' },
    { key: 'PrgR', label: 'Prog. Receptions' },
  ];

  const alignedMatrix = metricsToCompare.map((m) => {
    const key = m.key;
    const values = {};
    const untracked = [];
    const validVals = [];

    for (const p of players) {
      const pSeason = p.season || season || seasonService.getActiveSeason();
      const val = p[key];
      const tracked = isMetricTrackedInEra(key, pSeason, p.Comp) && isFiniteNum(val);
      const cleanVal = tracked ? val : null;
      values[String(p.id)] = cleanVal;
      values[p.comparison_key] = cleanVal;
      if (!tracked) {
        untracked.push(p.comparison_key, String(p.id));
      } else {
        validVals.push(val);
      }
    }

    let bestVal = null;
    if (validVals.length > 0) {
      bestVal = key === 'CrdY' || key === 'CrdR' ? Math.min(...validVals) : Math.max(...validVals);
    }

    const leaders = [];
    if (bestVal !== null) {
      for (const p of players) {
        const val = p[key];
        if (isFiniteNum(val) && val === bestVal && (key === 'CrdY' || key === 'CrdR' || bestVal > 0)) {
          leaders.push(String(p.id), p.comparison_key);
        }
      }
    }

    return {
      metric: m.label,
      label: m.label,
      key,
      category: m.type,
      values,
      leaders,
      best_value: bestVal,
      untracked,
    };
  });

  const radarData = radarDimensions.map((dim) => {
    const key = dim.key;
    const dimValues = {};
    const dimScores = {};
    const dimTracked = {};

    for (const p of players) {
      const pSeason = p.season || season || seasonService.getActiveSeason();
      const pRecords = dataLoader.getRecords(pSeason);
      const rawVal = p[key];
      const tracked = isMetricTrackedInEra(key, pSeason, p.Comp) && isFiniteNum(rawVal);

      const pIdStr = String(p.id);
      const pCmpKey = p.comparison_key;
      dimValues[pIdStr] = tracked ? rawVal : null;
      dimValues[pCmpKey] = tracked ? rawVal : null;
      dimTracked[pIdStr] = tracked;
      dimTracked[pCmpKey] = tracked;

      if (!tracked) {
        dimScores[pIdStr] = null;
        dimScores[pCmpKey] = null;
      } else {
        const posClean = p.Pos ? String(p.Pos).split(',')[0].trim() : 'MF';
        let peers = pRecords.filter((r) => (r.Pos || '').includes(posClean) && (r.Min || 0) >= 270);
        if (peers.length < 10) peers = pRecords.filter((r) => (r.Min || 0) >= 270);
        const validVals = peers.map((r) => r[key]).filter(isFiniteNum);
        if (validVals.length >= 10) {
          let lower = 0;
          let equal = 0;
          for (const v of validVals) {
            if (v < rawVal) lower += 1;
            else if (v === rawVal) equal += 1;
          }
          const pct = Math.max(0, Math.min(100, roundTo(((lower + 0.5 * equal) / validVals.length) * 100, 1)));
          dimScores[pIdStr] = pct;
          dimScores[pCmpKey] = pct;
        } else {
          dimScores[pIdStr] = null;
          dimScores[pCmpKey] = null;
        }
      }
    }

    return {
      dimension: dim.label,
      key,
      values: dimValues,
      scores: dimScores,
      is_tracked: dimTracked,
    };
  });

  return { players, metrics: alignedMatrix, radar: radarData };
}

function pickFields(row, fields) {
  const obj = {};
  for (const f of fields) {
    obj[f] = row[f] !== undefined ? row[f] : null;
  }
  return obj;
}

function getDashboardAnalytics(competition = null, season = null) {
  let records = dataLoader.getRecords(season);
  if (competition) {
    const resolved = resolveCompetition(competition);
    if (!resolved) return null;
    records = records.filter((r) => r.Comp === resolved);
  }

  const totalPlayers = records.length;
  const totalClubs = new Set(records.map((r) => r.Squad).filter(Boolean)).size;
  let totalGoals = 0;
  let totalAssists = 0;
  let totalXg = 0;
  let totalXag = 0;
  let maxXg = 0;
  let maxPrgC = 0;

  const seenSharedXg = new Set();
  for (const r of records) {
    totalGoals += r.Gls || 0;
    totalAssists += r.Ast || 0;
    const skipShared = r._shared_season_xg && seenSharedXg.has(r.player_id || r.player_slug);
    if (r._shared_season_xg && !skipShared) {
      seenSharedXg.add(r.player_id || r.player_slug);
    }
    if (!skipShared && isFiniteNum(r.xG)) {
      totalXg += r.xG;
      if (r.xG > maxXg) maxXg = r.xG;
    }
    if (!skipShared && isFiniteNum(r.xAG)) totalXag += r.xAG;
    if (isFiniteNum(r.PrgC) && r.PrgC > maxPrgC) maxPrgC = r.PrgC;
  }

  totalXg = roundTo(totalXg, 1);
  totalXag = roundTo(totalXag, 1);
  const finishingDelta = roundTo(totalGoals - totalXg, 1);

  const scorerFields = ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'Gls', 'xG', 'Gls_minus_xG', 'Min'];
  const creatorFields = ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'Ast', 'xAG', 'Ast_minus_xAG', 'Min'];
  const progFields = ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'PrgC', 'PrgP', 'Min'];
  const scatterFields = ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'xG', 'xAG', 'Gls', 'Ast', 'Min'];

  const topScorers = sortRecords(records, 'Gls', false)
    .slice(0, 8)
    .map((r) => pickFields(r, scorerFields));

  const topCreators = sortRecords(records, 'Ast', false)
    .slice(0, 8)
    .map((r) => pickFields(r, creatorFields));

  const hasXg = maxXg > 0;
  const hasPrgC = maxPrgC > 0;

  const min500 = records.filter((r) => (r.Min || 0) >= 500 && isFiniteNum(r.Gls_minus_xG));
  const overperformers = hasXg
    ? sortRecords(min500, 'Gls_minus_xG', false)
        .slice(0, 5)
        .map((r) => pickFields(r, scorerFields))
    : [];
  const underperformers = hasXg
    ? sortRecords(min500, 'Gls_minus_xG', true)
        .slice(0, 5)
        .map((r) => pickFields(r, scorerFields))
    : [];

  const progressionLeaders = hasPrgC
    ? [...records]
        .sort((a, b) => ((b.PrgC || 0) + (b.PrgP || 0)) - ((a.PrgC || 0) + (a.PrgP || 0)))
        .slice(0, 8)
        .map((r) => pickFields(r, progFields))
    : [];

  const min450 = records.filter((r) => (r.Min || 0) >= 450);
  const scatterData = [...min450]
    .sort((a, b) => {
      const sa = hasXg ? (a.xG || 0) + (a.xAG || 0) : (a.Gls || 0) + (a.Ast || 0);
      const sb = hasXg ? (b.xG || 0) + (b.xAG || 0) : (b.Gls || 0) + (b.Ast || 0);
      return sb - sa;
    })
    .slice(0, 25)
    .map((r) => pickFields(r, scatterFields));

  const quarPolicy = seasonService.getQuarantinePolicy(season);
  const quarantineNotice = quarPolicy.is_quarantined
    ? quarPolicy.warning_message || `This ${quarPolicy.dataset_status} dataset is quarantined from authoritative rankings.`
    : null;

  return {
    is_quarantined: quarPolicy.is_quarantined,
    quarantine_notice: quarantineNotice,
    quarantine_policy: quarPolicy,
    kpis: {
      total_players: totalPlayers,
      total_clubs: totalClubs,
      total_goals: totalGoals,
      total_assists: totalAssists,
      total_xg: totalXg,
      total_xag: totalXag,
      finishing_delta: finishingDelta,
    },
    top_scorers: topScorers,
    top_creators: topCreators,
    overperformers,
    underperformers,
    progression_leaders: progressionLeaders,
    scatter_data: scatterData,
  };
}

function normalizeNameKey(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getPlayerCareerHistory(playerQuery, { season = null, seasonsFilter = null } = {}) {
  if (!playerQuery && playerQuery !== 0) return null;
  const allSeasonEntries = seasonService.listSeasons();
  const allSeasonIds = allSeasonEntries.map((s) => s.id); // chronological asc

  let seedPlayer = null;
  const activeSeason = season || seasonService.getActiveSeason();

  // 1. Try resolving in the requested/active season first (handles numeric record IDs accurately)
  if (seasonService.seasonExists(activeSeason)) {
    seedPlayer = dataLoader.getById(playerQuery, activeSeason);
  }

  // 2. If not found (e.g. searching by name for a player active in other seasons like Lionel Messi), scan newest->oldest
  if (!seedPlayer) {
    const queryNorm = normalizeNameKey(playerQuery);
    const queryStr = String(playerQuery).trim();
    const seasonsDesc = [...allSeasonIds].reverse();
    for (const sId of seasonsDesc) {
      const records = dataLoader.getRecords(sId);
      const exact = records.find(
        (r) =>
          r.player_id === queryStr ||
          r.player_slug === queryStr ||
          normalizeNameKey(r.Player) === queryNorm
      );
      if (exact) {
        seedPlayer = exact;
        break;
      }
    }
    // Partial fallback if still not found
    if (!seedPlayer && queryNorm.length >= 3) {
      for (const sId of seasonsDesc) {
        const records = dataLoader.getRecords(sId);
        const partial = records
          .filter((r) => normalizeNameKey(r.Player).includes(queryNorm))
          .sort((a, b) => (b.Min || 0) - (a.Min || 0))[0];
        if (partial) {
          seedPlayer = partial;
          break;
        }
      }
    }
  }

  if (!seedPlayer) return null;

  const targetNameNorm = normalizeNameKey(seedPlayer.Player);
  const targetBorn = isFiniteNum(seedPlayer.Born) ? seedPlayer.Born : null;
  const allowedSeasons = Array.isArray(seasonsFilter) && seasonsFilter.length > 0 ? new Set(seasonsFilter) : null;

  const historyRows = [];
  const availableSeasons = [];
  const xgTrackedSeasons = [];

  for (const sId of allSeasonIds) {
    const records = dataLoader.getRecords(sId);
    const matches = records.filter((r) => {
      if (normalizeNameKey(r.Player) !== targetNameNorm) return false;
      if (targetBorn !== null && isFiniteNum(r.Born) && Math.abs(r.Born - targetBorn) > 1) {
        return false;
      }
      return true;
    });

    if (matches.length === 0) continue;

    availableSeasons.push(sId);

    // Aggregate multi-club spells within the same season
    const sortedSpells = [...matches].sort((a, b) => (b.Min || 0) - (a.Min || 0));
    const primary = sortedSpells[0];
    const squads = Array.from(new Set(sortedSpells.map((m) => m.Squad).filter(Boolean)));
    const comps = Array.from(new Set(sortedSpells.map((m) => m.competition_name).filter(Boolean)));

    const totalMin = matches.reduce((s, m) => s + (m.Min || 0), 0);
    const totalMp = matches.reduce((s, m) => s + (m.MP || 0), 0);
    const totalStarts = matches.reduce((s, m) => s + (m.Starts || 0), 0);
    const totalGls = matches.reduce((s, m) => s + (m.Gls || 0), 0);
    const totalAst = matches.reduce((s, m) => s + (m.Ast || 0), 0);
    const totalPk = matches.reduce((s, m) => s + (m.PK || 0), 0);
    const totalPkAtt = matches.reduce((s, m) => s + (m.PKatt || 0), 0);
    const totalNonPkGls = matches.reduce((s, m) => s + (m['G-PK'] || 0), 0);

    const isSharedSeasonXg = matches.length > 1 && matches.every((m) => m._shared_season_xg === true);
    const sharedExpectedFields = new Set(['xG', 'npxG', 'xAG']);
    const sumNullable = (field) => {
      const valid = matches.map((m) => m[field]).filter(isFiniteNum);
      if (valid.length !== matches.length) return null;
      if (isSharedSeasonXg && sharedExpectedFields.has(field)) {
        return roundTo(valid[0], 2);
      }
      return roundTo(valid.reduce((acc, v) => acc + v, 0), 2);
    };

    const totalXg = sumNullable('xG');
    const totalNpxg = sumNullable('npxG');
    const totalXag = sumNullable('xAG');
    const totalPrgC = sumNullable('PrgC');
    const totalPrgP = sumNullable('PrgP');
    const totalPrgR = sumNullable('PrgR');

    const isXgTracked = isFiniteNum(totalXg);
    if (isXgTracked) xgTrackedSeasons.push(sId);

    const glsMinusXg = isXgTracked ? roundTo(totalGls - totalXg, 2) : null;
    const efficiencyPct = isXgTracked && totalXg > 0 ? roundTo((totalGls / totalXg) * 100, 1) : null;
    const gls90 = totalMin > 0 ? roundTo((totalGls / totalMin) * 90, 2) : 0;
    const xg90 = isXgTracked && totalMin > 0 ? roundTo((totalXg / totalMin) * 90, 2) : null;
    const ast90 = totalMin > 0 ? roundTo((totalAst / totalMin) * 90, 2) : 0;
    const xag90 = isFiniteNum(totalXag) && totalMin > 0 ? roundTo((totalXag / totalMin) * 90, 2) : null;

    if (!allowedSeasons || allowedSeasons.has(sId)) {
      const shortLabel = `${sId.slice(2, 4)}/${sId.slice(7, 9)}`;
      historyRows.push({
        season: sId,
        season_short: shortLabel,
        id: primary.id,
        Player: primary.Player,
        Pos: primary.Pos,
        Age: primary.Age,
        Squad: squads.join(' / '),
        competition_name: comps.join(' / '),
        Comp: primary.Comp,
        spells_count: matches.length,
        MP: totalMp,
        Starts: totalStarts,
        Min: totalMin,
        '90s': roundTo(totalMin / 90, 1),
        Gls: totalGls,
        Ast: totalAst,
        'G+A': totalGls + totalAst,
        PK: totalPk,
        PKatt: totalPkAtt,
        'G-PK': totalNonPkGls,
        xG: totalXg,
        npxG: totalNpxg,
        xAG: totalXag,
        PrgC: totalPrgC,
        PrgP: totalPrgP,
        PrgR: totalPrgR,
        Gls_90: gls90,
        xG_90: xg90,
        Ast_90: ast90,
        xAG_90: xag90,
        Gls_minus_xG: glsMinusXg,
        efficiency_pct: efficiencyPct,
        is_xg_tracked: isXgTracked,
      });
    }
  }

  return {
    player_name: seedPlayer.Player,
    player_id: seedPlayer.player_id || seedPlayer.player_slug,
    player_slug: seedPlayer.player_slug,
    born: targetBorn,
    nation: seedPlayer.Nation || 'Unknown',
    position: seedPlayer.Pos || '',
    available_seasons: availableSeasons,
    xg_tracked_seasons: xgTrackedSeasons,
    seasons: historyRows,
  };
}

module.exports = {
  getCompetitionsSummary,
  getTeamsByCompetition,
  mergePlayerSpells,
  searchPlayers,
  getPlayerProfile,
  getPlayerCareerHistory,
  getLeaderboard,
  comparePlayers,
  getDashboardAnalytics,
};
