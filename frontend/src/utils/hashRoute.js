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
