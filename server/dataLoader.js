const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const {
  SEASONS_DIR,
  BASELINES_DIR,
  DEFAULT_SEASON,
  COMPETITIONS,
  isMetricTrackedInEra,
  slugify,
  isUnsafeSeasonTraversal,
  validateSeasonId,
  roundTo,
} = require('./config');

class SeasonService {
  constructor(seasonsDir = SEASONS_DIR) {
    this.seasonsDir = seasonsDir;
    this._activeSeason = DEFAULT_SEASON;
  }

  getActiveSeason() {
    return this._activeSeason;
  }

  setActiveSeason(seasonId) {
    const resolved = this.resolveSeason(seasonId);
    if (!this.seasonExists(resolved)) {
      throw new Error(`Season '${seasonId}' does not exist.`);
    }
    this._activeSeason = resolved;
    return this._activeSeason;
  }

  resolveSeason(seasonStr) {
    if (!seasonStr) return this._activeSeason;
    const validated = validateSeasonId(seasonStr, this.seasonsDir);
    if (validated) return validated;
    const cleaned = String(seasonStr).trim();
    if (cleaned.includes('..') || cleaned.includes('\\') || cleaned.includes('\0')) {
      return this._activeSeason;
    }
    return cleaned;
  }

  seasonExists(seasonId) {
    if (!seasonId) return false;
    return validateSeasonId(seasonId, this.seasonsDir, true) !== null;
  }

  resolveAndValidateSeason(seasonParam) {
    if (!seasonParam) return { season: null, error: null, code: 200 };
    if (isUnsafeSeasonTraversal(seasonParam)) {
      return {
        season: null,
        error: `Invalid season format '${seasonParam}'. Path traversal and malformed inputs prohibited.`,
        code: 400,
      };
    }
    const canonical = validateSeasonId(seasonParam);
    const target = canonical || String(seasonParam).trim();
    if (!this.seasonExists(target)) {
      return { season: null, error: `Season '${seasonParam}' not found`, code: 404 };
    }
    return { season: target, error: null, code: 200 };
  }

  getSeasonManifest(seasonId) {
    const sId = this.resolveSeason(seasonId);
    const manifestPath = path.join(this.seasonsDir, sId, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  getQuarantinePolicy(seasonId) {
    const sId = seasonId ? this.resolveSeason(seasonId) : this._activeSeason;
    const manifest = this.getSeasonManifest(sId) || {};
    const VERIFIED_ALLOWLIST = new Set(['verified_historical', 'read_only_baseline']);
    const KNOWN_STATUSES = new Set([
      'verified_historical',
      'read_only_baseline',
      'projected',
      'simulated',
      'quarantined',
    ]);
    const rawStatus = manifest.dataset_status || '';
    const isBaseline = sId === '2024-2025' || manifest.is_baseline === true;

    let isQuarantined = false;
    let status = 'verified_historical';
    let datasetStatus = 'verified_historical';
    let statusLabel = 'Historical Season';
    let quarantineReason = null;

    if (isBaseline) {
      isQuarantined = false;
    } else if (
      manifest.is_quarantined === true ||
      rawStatus === 'simulated' ||
      rawStatus === 'quarantined' ||
      !VERIFIED_ALLOWLIST.has(rawStatus)
    ) {
      isQuarantined = true;
      status = KNOWN_STATUSES.has(rawStatus) ? rawStatus : 'quarantined';
      datasetStatus = status;
      statusLabel = manifest.status_label || 'Quarantined / Provisional';
      quarantineReason =
        manifest.quarantine_reason ||
        'Dataset status is not in the verified historical allowlist. Quarantined from authoritative rankings.';
    } else {
      statusLabel = manifest.status_label || 'Historical Season';
    }

    return {
      season_id: sId,
      is_quarantined: isQuarantined,
      status,
      dataset_status: datasetStatus,
      status_label: statusLabel,
      quarantine_reason: quarantineReason,
      warning_title: isQuarantined ? 'Quarantined / Provisional Dataset' : null,
      warning_message: isQuarantined ? quarantineReason : null,
      allow_authoritative_rankings: !isQuarantined,
      exclude_from_global_benchmarks: isQuarantined,
      badge_variant: isQuarantined ? 'warning' : 'success',
    };
  }

  listSeasons() {
    if (!fs.existsSync(this.seasonsDir)) return [];
    const entries = fs
      .readdirSync(this.seasonsDir)
      .filter((entry) => {
        const dirPath = path.join(this.seasonsDir, entry);
        return fs.statSync(dirPath).isDirectory() && /^\d{4}-\d{4}$/.test(entry);
      })
      .sort();

    return entries.map((entry) => {
      const manifest = this.getSeasonManifest(entry) || {};
      const policy = this.getQuarantinePolicy(entry);
      const shortYear = entry.replace('-', '/').replace('20', '');
      const displayName =
        manifest.display_name ||
        (policy.is_quarantined ? `${shortYear} Provisional Season` : `${shortYear} Historical Season`);

      const recordsCount = manifest.records_count || 0;
      const clubsCount = manifest.clubs_count || 0;

      return {
        id: entry,
        canonical_id: entry,
        name: displayName,
        display_name: displayName,
        is_active: entry === this._activeSeason,
        is_baseline: entry === '2024-2025',
        is_quarantined: policy.is_quarantined,
        quarantine_reason: policy.quarantine_reason,
        dataset_status: policy.dataset_status,
        status_label: policy.status_label,
        is_projection: policy.is_quarantined,
        is_simulated: Boolean(manifest.is_simulated),
        records_count: recordsCount,
        total_players: recordsCount,
        clubs_count: clubsCount,
        total_teams: clubsCount,
        competitions_count: manifest.competitions_count || 5,
        imported_at: manifest.imported_at || 'Completed Season',
        source: manifest.source || manifest.source_name || 'FBref / StatsBomb style aggregates',
        source_name: manifest.source_name || manifest.source,
        source_url: manifest.source_url || null,
        data_as_of: manifest.data_as_of || null,
        verification_notes: manifest.verification_notes || null,
        known_gaps: manifest.known_gaps || null,
        partial_competitions: manifest.partial_competitions || {},
        untracked_metrics: manifest.untracked_metrics || [],
        untracked_metrics_reason: manifest.untracked_metrics_reason || null,
        quality_notes: manifest.quality_notes || manifest.verification_notes || null,
        content_hash: manifest.content_hash || manifest.sha256 || null,
        validation_status: manifest.validation_status || 'passed',
        files: manifest.files || {},
      };
    });
  }

  getSeasonCsvPath(seasonId) {
    const sId = this.resolveSeason(seasonId);
    const dirPath = path.join(this.seasonsDir, sId);
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return null;

    const candidates = [
      path.join(dirPath, `top5-players-${sId}.csv`),
      path.join(dirPath, 'top5-players24-25.csv'),
      path.join(dirPath, 'dataset.csv'),
      path.join(dirPath, 'players.csv'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }

    const csvFile = fs.readdirSync(dirPath).find((f) => f.toLowerCase().endsWith('.csv'));
    return csvFile ? path.join(dirPath, csvFile) : null;
  }

  getDownloadPresets() {
    return [
      {
        id: 'top5-2023-2024',
        season: '2023-2024',
        title: 'Top 5 European Leagues 2023/24',
        description:
          'Complete player season stats across Premier League, La Liga, Serie A, Bundesliga, and Ligue 1.',
        url: 'https://raw.githubusercontent.com/JSzamik/FootballDataAnalysis-R-Visualisations/main/top5-players.csv',
        source: 'FBref / StatsBomb (JSzamik archive)',
        records_approx: 2852,
        format: 'csv',
      },
    ];
  }

  getDataVersion() {
    const hash = crypto.createHash('sha256');
    if (fs.existsSync(this.seasonsDir)) {
      const entries = fs.readdirSync(this.seasonsDir).sort();
      for (const entry of entries) {
        const mPath = path.join(this.seasonsDir, entry, 'manifest.json');
        if (fs.existsSync(mPath)) {
          hash.update(entry);
          hash.update('\0');
          hash.update(fs.readFileSync(mPath));
          hash.update('\0');
        }
      }
    }
    return hash.digest('hex');
  }

  verifyBaselineIntegrity() {
    const baselineSpecPath = path.join(BASELINES_DIR, 'baseline_2024_2025.json');
    const csvPath = this.getSeasonCsvPath('2024-2025');
    if (!csvPath || !fs.existsSync(csvPath)) {
      throw new Error('2024-2025 baseline CSV file is missing.');
    }
    const rawBuf = fs.readFileSync(csvPath);
    const actualSha = crypto.createHash('sha256').update(rawBuf).digest('hex');
    const normalizedBuf = Buffer.from(rawBuf.toString('utf-8').replace(/\r\n/g, '\n'), 'utf-8');
    const lfSha = crypto.createHash('sha256').update(normalizedBuf).digest('hex');

    let spec = {};
    if (fs.existsSync(baselineSpecPath)) {
      spec = JSON.parse(fs.readFileSync(baselineSpecPath, 'utf-8'));
    }

    const expectedSha = spec?.files?.csv?.sha256;
    const expectedLfSha = spec?.files?.csv?.lf_sha256;
    const matched =
      !expectedSha || actualSha === expectedSha || (expectedLfSha && lfSha === expectedLfSha);

    if (!matched) {
      throw new Error(`CSV SHA-256 mismatch: expected ${expectedSha}, got ${actualSha}`);
    }

    return {
      verified: true,
      season: '2024-2025',
      sha256: spec?.files?.excel?.sha256 || actualSha,
      primary_sha: actualSha,
      csv_sha256: actualSha,
      invariants: spec.invariants || null,
    };
  }
}

function parseAge(val) {
  if (val === undefined || val === null || val === '') return null;
  const s = String(val).trim();
  if (s.includes('-')) {
    const parts = s.split('-');
    const years = parseFloat(parts[0]);
    const days = parts[1] ? parseFloat(parts[1]) : 0;
    if (Number.isFinite(years) && Number.isFinite(days)) {
      return roundTo(years + days / 365.25, 1);
    }
  }
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : null;
}

function parseIntOrZero(val) {
  if (val === undefined || val === null || val === '') return 0;
  const num = parseFloat(val);
  return Number.isFinite(num) ? Math.trunc(num) : 0;
}

function parseNullableInt(val) {
  if (val === undefined || val === null || val === '') return null;
  const num = parseFloat(val);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

function parseFloatOrNull(val, decimals = 2) {
  if (val === undefined || val === null || val === '') return null;
  const num = parseFloat(val);
  return Number.isFinite(num) ? roundTo(num, decimals) : null;
}

function parseFloatOrZero(val, decimals = 2) {
  const v = parseFloatOrNull(val, decimals);
  return v === null ? 0.0 : v;
}

class DataLoader {
  constructor(seasonSvc) {
    this.seasonService = seasonSvc;
    this._seasonsRecords = new Map();
    this._seasonsById = new Map();
  }

  loadSeason(seasonId, forceReload = false) {
    const sId = this.seasonService.resolveSeason(seasonId);
    if (!this.seasonService.seasonExists(sId)) {
      throw new Error(`Season '${sId}' not found.`);
    }

    if (this._seasonsRecords.has(sId) && !forceReload) {
      return this._seasonsRecords.get(sId);
    }

    const csvPath = this.seasonService.getSeasonCsvPath(sId);
    if (!csvPath) {
      throw new Error(`Season data file not found for season '${sId}'.`);
    }

    let rawContent;
    try {
      rawContent = fs.readFileSync(csvPath, 'utf-8');
    } catch {
      rawContent = fs.readFileSync(csvPath, 'latin1');
    }
    if (rawContent.charCodeAt(0) === 0xfeff) {
      rawContent = rawContent.slice(1);
    }

    const rawRows = parse(rawContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });

    const records = rawRows.map((row, idx) => this._normalizeRow(row, sId, idx));

    // Detect multi-spell players where source data joined an unsplit full-season xG & xAG identically onto every club spell
    const normSpellKey = (r) => {
      const base = String(r.Player || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      return `${base}|${r.Born || ''}`;
    };
    const spellGroups = new Map();
    for (const r of records) {
      const key = normSpellKey(r);
      if (!spellGroups.has(key)) spellGroups.set(key, []);
      spellGroups.get(key).push(r);
    }
    for (const group of spellGroups.values()) {
      if (group.length < 2) continue;
      const validXg = group.filter((r) => typeof r.xG === 'number' && Number.isFinite(r.xG) && r.xG > 0);
      const validXag = group.filter((r) => typeof r.xAG === 'number' && Number.isFinite(r.xAG) && r.xAG > 0);
      const sameXg = validXg.length === group.length && new Set(validXg.map((r) => r.xG)).size === 1;
      const sameXag = validXag.length === group.length && new Set(validXag.map((r) => r.xAG)).size === 1;
      if (sameXg && sameXag) {
        const combinedMin = group.reduce((s, r) => s + (r.Min || 0), 0);
        for (const r of group) {
          r._shared_season_xg = true;
          r._combined_season_min = combinedMin;
          // Single-club per-90 rates cannot be computed from unsplit full-season xG/xAG
          r.xG_90 = null;
          r.xAG_90 = null;
          r['xG+xAG_90'] = null;
          r.npxG_90 = null;
          r['npxG+xAG_90'] = null;
        }
      }
    }

    const byId = new Map();
    for (const r of records) {
      byId.set(r.Rk, r);
    }

    this._seasonsRecords.set(sId, records);
    this._seasonsById.set(sId, byId);
    return records;
  }

  _normalizeRow(raw, seasonId, idx) {
    const compRaw = raw.Comp || '';
    const compInfo = COMPETITIONS[compRaw] || {
      id: slugify(compRaw),
      name: compRaw,
      country: 'Unknown',
    };

    const rk = parseIntOrZero(raw.Rk) || idx + 1;
    const min = parseIntOrZero(raw.Min);
    const hasMinutes = min > 0;
    const mp = parseIntOrZero(raw.MP);
    const starts = parseIntOrZero(raw.Starts);
    const gls = parseIntOrZero(raw.Gls);
    const ast = parseIntOrZero(raw.Ast);
    const gPlusA = raw['G+A'] !== undefined && raw['G+A'] !== '' ? parseIntOrZero(raw['G+A']) : gls + ast;
    const gMinusPk = parseIntOrZero(raw['G-PK']);
    const pk = parseIntOrZero(raw.PK);
    const pkAtt = parseIntOrZero(raw.PKatt);
    const crdY = parseIntOrZero(raw.CrdY);
    const crdR = parseIntOrZero(raw.CrdR);

    let nineties = parseFloatOrZero(raw['90s'], 1);
    if (hasMinutes && nineties === 0) {
      nineties = roundTo(min / 90.0, 1);
    }

    const track = (m) => isMetricTrackedInEra(m, seasonId, compRaw);

    const xG = track('xG') ? parseFloatOrNull(raw.xG, 2) : null;
    const npxG = track('npxG') ? parseFloatOrNull(raw.npxG, 2) : null;
    const xAG = track('xAG') ? parseFloatOrNull(raw.xAG, 2) : null;
    const npxGPlusXAG = track('npxG+xAG') ? parseFloatOrNull(raw['npxG+xAG'], 2) : null;

    const prgC = track('PrgC') ? parseNullableInt(raw.PrgC) : null;
    const prgP = track('PrgP') ? parseNullableInt(raw.PrgP) : null;
    const prgR = track('PrgR') ? parseNullableInt(raw.PrgR) : null;

    const deriveRate = (total, rawRateVal, isAdvanced = false) => {
      if (total === null || total === undefined) return null;
      let rate = isAdvanced ? parseFloatOrNull(rawRateVal, 2) : parseFloatOrZero(rawRateVal, 2);
      if (hasMinutes) {
        const expected = roundTo((total / min) * 90.0, 2);
        if (rate === null || (total > 0 && rate === 0) || (min >= 90 && Math.abs(rate - expected) > 0.05)) {
          rate = expected;
        }
      } else if (rate === null) {
        rate = 0.0;
      }
      return rate;
    };

    const gls90 = deriveRate(gls, raw.Gls_90, false);
    const ast90 = deriveRate(ast, raw.Ast_90, false);
    const gPlusA90 = deriveRate(gPlusA, raw['G+A_90'], false);
    const gMinusPk90 = deriveRate(gMinusPk, raw['G-PK_90'], false);
    let gPlusAMinusPk90 = parseFloatOrZero(raw['G+A-PK_90'], 2);
    if (hasMinutes && (gMinusPk > 0 || ast > 0)) {
      const expGaPk90 = roundTo(((gMinusPk + ast) / min) * 90.0, 2);
      if (gPlusAMinusPk90 === 0 || (min >= 90 && Math.abs(gPlusAMinusPk90 - expGaPk90) > 0.05)) {
        gPlusAMinusPk90 = expGaPk90;
      }
    }

    const xG90 = track('xG_90') ? deriveRate(xG, raw.xG_90, true) : null;
    const xAG90 = track('xAG_90') ? deriveRate(xAG, raw.xAG_90, true) : null;
    const npxG90 = track('npxG_90') ? deriveRate(npxG, raw.npxG_90, true) : null;
    const npxGPlusXAG90 = track('npxG+xAG_90') ? deriveRate(npxGPlusXAG, raw['npxG+xAG_90'], true) : null;
    let xGPlusXAG90 = track('xG+xAG_90') ? parseFloatOrNull(raw['xG+xAG_90'], 2) : null;
    if (track('xG+xAG_90') && xG !== null && xAG !== null) {
      if (hasMinutes) {
        const expSum90 = roundTo(((xG + xAG) / min) * 90.0, 2);
        if (xGPlusXAG90 === null || ((xG > 0 || xAG > 0) && xGPlusXAG90 === 0) || (min >= 90 && Math.abs(xGPlusXAG90 - expSum90) > 0.05)) {
          xGPlusXAG90 = expSum90;
        }
      } else if (xGPlusXAG90 === null) {
        xGPlusXAG90 = 0.0;
      }
    }

    const prgC90 = track('PrgC_90') ? deriveRate(prgC, raw.PrgC_90, true) : null;
    const prgP90 = track('PrgP_90') ? deriveRate(prgP, raw.PrgP_90, true) : null;
    const prgR90 = track('PrgR_90') ? deriveRate(prgR, raw.PrgR_90, true) : null;

    const glsMinusXG = xG !== null ? roundTo(gls - xG, 2) : null;
    const xGMinusGls = xG !== null ? roundTo(xG - gls, 2) : null;
    const astMinusXAG = xAG !== null ? roundTo(ast - xAG, 2) : null;

    const playerName = raw.Player || '';
    const playerSlug = slugify(playerName);
    const born = parseNullableInt(raw.Born);
    const playerId = born ? `${playerSlug}-${born}` : playerSlug;

    return {
      Rk: rk,
      id: rk,
      record_id: rk,
      Player: playerName,
      player_slug: playerSlug,
      player_id: playerId,
      Nation: raw.Nation || 'Unknown',
      Pos: raw.Pos || '',
      Squad: raw.Squad || '',
      Comp: compRaw,
      competition_id: compInfo.id,
      competition_name: compInfo.name,
      country: compInfo.country,
      league: compInfo.name,
      Age: parseAge(raw.Age),
      Born: born,
      MP: mp,
      Starts: starts,
      Min: min,
      '90s': nineties,
      Gls: gls,
      Ast: ast,
      'G+A': gPlusA,
      'G-PK': gMinusPk,
      PK: pk,
      PKatt: pkAtt,
      CrdY: crdY,
      CrdR: crdR,
      xG,
      npxG,
      xAG,
      'npxG+xAG': npxGPlusXAG,
      PrgC: prgC,
      PrgP: prgP,
      PrgR: prgR,
      Gls_90: gls90,
      Ast_90: ast90,
      'G+A_90': gPlusA90,
      'G-PK_90': gMinusPk90,
      'G+A-PK_90': gPlusAMinusPk90,
      xG_90: xG90,
      xAG_90: xAG90,
      'xG+xAG_90': xGPlusXAG90,
      npxG_90: npxG90,
      'npxG+xAG_90': npxGPlusXAG90,
      PrgC_90: prgC90,
      PrgP_90: prgP90,
      PrgR_90: prgR90,
      Gls_minus_xG: glsMinusXG,
      xG_minus_Gls: xGMinusGls,
      Ast_minus_xAG: astMinusXAG,
      season: seasonId,
      comparison_key: `${rk}@${seasonId}`,
    };
  }

  getRecords(season = null) {
    const sId = season ? this.seasonService.resolveSeason(season) : this.seasonService.getActiveSeason();
    return this.loadSeason(sId);
  }

  getById(recordId, season = null) {
    const sId = season ? this.seasonService.resolveSeason(season) : this.seasonService.getActiveSeason();
    const records = this.loadSeason(sId);
    const byId = this._seasonsById.get(sId);

    const num = Number(recordId);
    if (Number.isInteger(num) && String(recordId).trim() !== '' && byId.has(num)) {
      return byId.get(num);
    }

    const reqStr = String(recordId).trim();
    const slug = slugify(reqStr);
    return (
      records.find((r) => r.player_id === reqStr || r.player_slug === slug || r.Player.toLowerCase() === reqStr.toLowerCase()) ||
      null
    );
  }
}

const seasonService = new SeasonService();
const dataLoader = new DataLoader(seasonService);

module.exports = {
  seasonService,
  dataLoader,
};
