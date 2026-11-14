import { getOverlapOffsets, normalizePlayerSearch, PER90_PAIRS } from './plotInteractions';

test('normalizes accents and partial-search text', () => {
  expect(normalizePlayerSearch('Vinícius Júnior')).toContain(normalizePlayerSearch('vinicius'));
});

test('overlap offsets are deterministic, pixel bounded, and leave unique points untouched', () => {
  const points = [{ id: 1, x: 2, y: 3 }, { id: 2, x: 2, y: 3 }, { id: 3, x: 5, y: 7 }];
  const offsets = getOverlapOffsets(points, (x) => x * 10, (y) => y * 10);
  expect(offsets.get(1)).toEqual(getOverlapOffsets(points, (x) => x * 10, (y) => y * 10).get(1));
  expect(Math.hypot(offsets.get(1).dx, offsets.get(1).dy)).toBeLessThanOrEqual(4);
  expect(offsets.has(3)).toBe(false);
  expect(PER90_PAIRS.Gls).toBe('Gls_90');
});
