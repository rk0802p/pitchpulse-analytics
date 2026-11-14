export const normalizePlayerSearch = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase();

export function getOverlapOffsets(points, projectX, projectY, enabled = true, maxOffset = 4) {
  if (!enabled) return new Map();
  const groups = new Map();
  points.forEach((point) => {
    const key = `${Math.round(projectX(point.x))}:${Math.round(projectY(point.y))}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(point);
  });

  const offsets = new Map();
  groups.forEach((group) => {
    if (group.length < 2) return;
    const radius = Math.min(maxOffset, 1.2 + Math.sqrt(group.length) * 0.8);
    [...group].sort((a, b) => String(a.id).localeCompare(String(b.id))).forEach((point, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / group.length;
      offsets.set(point.id, { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius });
    });
  });
  return offsets;
}

export const PER90_PAIRS = {
  Gls: 'Gls_90', Gls_90: 'Gls', Ast: 'Ast_90', Ast_90: 'Ast',
  xG: 'xG_90', xG_90: 'xG', xAG: 'xAG_90', xAG_90: 'xAG',
  PrgC: 'PrgC_90', PrgC_90: 'PrgC', PrgP: 'PrgP_90', PrgP_90: 'PrgP',
  PrgR: 'PrgR_90', PrgR_90: 'PrgR'
};
