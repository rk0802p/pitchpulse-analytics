export const normalizePlayerSearch = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase();

export function deterministicJitter(id, axis, tickSize) {
  const input = `${id ?? ''}:${axis}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  const unit = ((hash >>> 0) / 4294967295) * 2 - 1;
  return unit * Math.abs(tickSize) * 0.25;
}

export const PER90_PAIRS = {
  Gls: 'Gls_90', Gls_90: 'Gls', Ast: 'Ast_90', Ast_90: 'Ast',
  xG: 'xG_90', xG_90: 'xG', xAG: 'xAG_90', xAG_90: 'xAG',
  PrgC: 'PrgC_90', PrgC_90: 'PrgC', PrgP: 'PrgP_90', PrgP_90: 'PrgP',
  PrgR: 'PrgR_90', PrgR_90: 'PrgR'
};
