import { buildExportHeader, inlineSvgStyles } from './chartMath';

test('inlines computed SVG colours and font declarations for portable PNG rendering', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('fill', 'var(--ink)');
  text.setAttribute('class', 'fill-[var(--ink)] font-ser');
  text.textContent = 'Goals';
  svg.appendChild(text);
  const serialized = inlineSvgStyles(svg);
  expect(serialized).not.toMatch(/var\(/);
  expect(serialized).toMatch(/font-family:/);
  expect(serialized).toMatch(/fill:/);
});

test('export header carries title, scope, mode, legends, quality and provenance', () => {
  const lines = buildExportHeader({ title: 'Assists vs Goals', scope: 'La Liga · FW · 1600+ minutes', mode: 'Totals', sizeLegend: 'Size: minutes', colorLegend: 'Colour: position', quality: 'minor gaps', sourceLine: 'Dataset Registry' });
  expect(lines.join(' ')).toContain('Assists vs Goals');
  expect(lines.join(' ')).toContain('La Liga · FW · 1600+ minutes');
  expect(lines.join(' ')).toContain('minor gaps');
  expect(lines.join(' ')).toContain('Dataset Registry');
});
