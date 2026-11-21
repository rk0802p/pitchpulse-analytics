export const SHORTLIST_STORAGE_KEY = 'pitchpulse_shortlist_v1';
export const COMPARE_STORAGE_KEY = 'pitchpulse_compare_v1';

export const SHORTLIST_TAGS = ['Target', 'Watchlist', 'Priority', 'Youth', 'Compare'];

export const AGE_RANGE_PRESETS = {
  '': { label: 'All Ages', min: null, max: null },
  u21: { label: 'U21 (≤21)', min: null, max: 21 },
  u23: { label: 'U23 (≤23)', min: null, max: 23 },
  prime: { label: 'Prime (24–28)', min: 24, max: 28 },
  vet: { label: 'Veterans (29+)', min: 29, max: null },
};

export function getAgeRangeBounds(ageRangeKey) {
  const preset = AGE_RANGE_PRESETS[ageRangeKey] || AGE_RANGE_PRESETS[''];
  return { ageMin: preset.min, ageMax: preset.max, label: preset.label };
}

export function makeShortlistKey(player, season = '2024-2025') {
  if (!player) return '';
  const name = String(player.Player || player.name || player.id || '').trim().toLowerCase();
  const idPart = player.id !== undefined && player.id !== null ? String(player.id) : name;
  const resolvedSeason = player.season || season || '2024-2025';
  return `${idPart}@${resolvedSeason}`;
}

export function isPlayerInShortlist(list, player, season = '2024-2025') {
  if (!Array.isArray(list) || !player) return false;
  const targetKey = makeShortlistKey(player, season);
  const targetName = String(player.Player || player.name || '').trim().toLowerCase();
  const targetSeason = player.season || season || '2024-2025';
  return list.some(
    (item) =>
      item.key === targetKey ||
      (targetName && item.Player?.toLowerCase() === targetName && item.season === targetSeason)
  );
}

export function toggleShortlistItem(list, player, season = '2024-2025', defaultTag = 'Target') {
  const safeList = Array.isArray(list) ? list : [];
  if (!player) return safeList;
  const resolvedSeason = player.season || season || '2024-2025';
  const key = makeShortlistKey(player, resolvedSeason);
  const targetName = String(player.Player || player.name || '').trim().toLowerCase();

  const exists = safeList.some(
    (item) =>
      item.key === key ||
      (targetName && item.Player?.toLowerCase() === targetName && item.season === resolvedSeason)
  );

  if (exists) {
    return safeList.filter(
      (item) =>
        item.key !== key &&
        !(targetName && item.Player?.toLowerCase() === targetName && item.season === resolvedSeason)
    );
  }

  const entry = {
    key,
    id: player.id ?? player.Rk ?? player.record_id ?? null,
    Player: player.Player || player.name || 'Unknown Player',
    Squad: player.Squad || player.squad || player.Team || '',
    Comp: player.Comp || player.competition || '',
    Pos: player.Pos || player.position || '',
    Age: player.Age ?? player.age ?? null,
    Min: player.Min ?? player.minutes ?? null,
    Gls: player.Gls ?? player.goals ?? null,
    Ast: player.Ast ?? player.assists ?? null,
    xG: player.xG ?? player.expected_goals ?? null,
    xAG: player.xAG ?? player.expected_assists ?? null,
    season: resolvedSeason,
    tag: SHORTLIST_TAGS.includes(defaultTag) ? defaultTag : 'Target',
    note: '',
    savedAt: new Date().toISOString(),
  };

  return [entry, ...safeList];
}

export function updateShortlistItem(list, key, patch = {}) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (item.key !== key) return item;
    const next = { ...item };
    if (patch.tag !== undefined && SHORTLIST_TAGS.includes(patch.tag)) {
      next.tag = patch.tag;
    }
    if (patch.note !== undefined) {
      next.note = String(patch.note).slice(0, 280);
    }
    return next;
  });
}

export function removeShortlistItem(list, key) {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item.key !== key);
}

export function buildShortlistCsv(list) {
  const escapeCell = (val) => {
    if (val === null || val === undefined || Number.isNaN(val)) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headers = ['Player', 'Club', 'League', 'Pos', 'Age', 'Season', 'Tag', 'Minutes', 'Goals', 'xG', 'Assists', 'Scout Note'];
  const rows = (list || []).map((item) =>
    [
      escapeCell(item.Player),
      escapeCell(item.Squad),
      escapeCell(item.Comp),
      escapeCell(item.Pos),
      escapeCell(item.Age),
      escapeCell(item.season),
      escapeCell(item.tag),
      escapeCell(item.Min),
      escapeCell(item.Gls),
      escapeCell(item.xG),
      escapeCell(item.Ast),
      escapeCell(item.note),
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function loadShortlist() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(SHORTLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveShortlist(list) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function loadSavedCompare() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function saveSavedCompare(players) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const compact = (Array.isArray(players) ? players : []).slice(0, 4).map((p) => ({
      id: p.id ?? p.Rk ?? null,
      Player: p.Player || p.name || '',
      Squad: p.Squad || p.Team || '',
      Comp: p.Comp || '',
      Pos: p.Pos || '',
      Age: p.Age ?? null,
      MP: p.MP ?? null,
      Min: p.Min ?? null,
      Gls: p.Gls ?? null,
      Ast: p.Ast ?? null,
      xG: p.xG ?? null,
      xAG: p.xAG ?? null,
      Gls_minus_xG: p.Gls_minus_xG ?? null,
      Gls_90: p.Gls_90 ?? null,
      Ast_90: p.Ast_90 ?? null,
      xG_90: p.xG_90 ?? null,
      xAG_90: p.xAG_90 ?? null,
      PrgC: p.PrgC ?? null,
      PrgP: p.PrgP ?? null,
      PrgR: p.PrgR ?? null,
      season: p.season || null,
    }));
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compact));
  } catch {
    // Ignore storage errors
  }
}
