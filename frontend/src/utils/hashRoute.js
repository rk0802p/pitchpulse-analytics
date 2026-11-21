const VALID_TABS = new Set(['dashboard', 'explorer', 'plots', 'leaderboards', 'compare', 'browse', 'profile', 'data']);

export function parseHash(hash = '') {
  const raw = String(hash || '').replace(/^#\/?/, '');
  const queryIndex = raw.indexOf('?');
  const path = queryIndex < 0 ? raw : raw.slice(0, queryIndex);
  const query = new URLSearchParams(queryIndex < 0 ? '' : raw.slice(queryIndex + 1));
  const slash = path.indexOf('/');
  const tab = (slash < 0 ? path : path.slice(0, slash)) || 'dashboard';
  let param = slash < 0 ? null : path.slice(slash + 1);
  if (param) {
    try { param = decodeURIComponent(param); } catch { /* retain malformed legacy value */ }
  }
  return { tab: VALID_TABS.has(tab) ? tab : 'dashboard', param, query };
}

export function buildHash(tab, param = null, query = {}) {
  const suffix = param == null || param === '' ? '' : `/${encodeURIComponent(param)}`;
  const search = query instanceof URLSearchParams ? query : new URLSearchParams(query);
  const queryString = search.toString();
  return `#${tab}${suffix}${queryString ? `?${queryString}` : ''}`;
}

export function serializeExplorerHash({
  season = '',
  comp = '',
  pos = '',
  squad = '',
  min = 0,
  age = '',
  q = '',
  mode = 'totals',
  sort = 'Gls',
  order = 'desc',
} = {}) {
  const params = new URLSearchParams();
  if (season) params.set('season', season);
  if (comp) params.set('comp', comp);
  if (pos) params.set('pos', pos);
  if (squad) params.set('squad', squad);
  if (min && Number(min) > 0) params.set('min', String(min));
  if (age) params.set('age', age);
  if (q && String(q).trim()) params.set('q', String(q).trim());
  if (mode && mode !== 'totals') params.set('mode', mode);
  if (sort && sort !== 'Gls') params.set('sort', sort);
  if (order && order !== 'desc') params.set('order', order);
  return buildHash('explorer', null, params);
}

export function parseExplorerQuery(query) {
  if (!query) return {};
  const params = query instanceof URLSearchParams ? query : new URLSearchParams(query);
  const minRaw = params.get('min');
  const minNum = minRaw !== null ? parseInt(minRaw, 10) : null;
  const modeRaw = params.get('mode');
  return {
    season: params.get('season') || null,
    comp: params.get('comp'),
    pos: params.get('pos'),
    squad: params.get('squad'),
    min: Number.isFinite(minNum) && minNum >= 0 ? minNum : null,
    age: params.get('age'),
    q: params.get('q'),
    mode: modeRaw === 'per90' ? 'per90' : modeRaw === 'totals' ? 'totals' : null,
    sort: params.get('sort') || null,
    order: params.get('order') === 'asc' ? 'asc' : params.get('order') === 'desc' ? 'desc' : null,
  };
}

export function serializeCompareHash({ season = '', ids = [] } = {}) {
  const params = new URLSearchParams();
  if (season) params.set('season', season);
  const cleanIds = (Array.isArray(ids) ? ids : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .slice(0, 4);
  if (cleanIds.length > 0) {
    params.set('ids', cleanIds.join(','));
  }
  return buildHash('compare', null, params);
}

export function parseCompareQuery(query) {
  if (!query) return { season: null, ids: [] };
  const params = query instanceof URLSearchParams ? query : new URLSearchParams(query);
  const rawIds = params.get('ids') || '';
  const ids = rawIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  return {
    season: params.get('season') || null,
    ids,
  };
}
