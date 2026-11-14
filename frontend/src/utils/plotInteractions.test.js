import { deterministicJitter, normalizePlayerSearch, PER90_PAIRS } from './plotInteractions';

test('normalizes accents and partial-search text', () => {
  expect(normalizePlayerSearch('Vinícius Júnior')).toContain(normalizePlayerSearch('vinicius'));
});

test('jitter is deterministic and bounded to one quarter tick', () => {
  const offset = deterministicJitter(42, 'x', 8);
  expect(offset).toBe(deterministicJitter(42, 'x', 8));
  expect(Math.abs(offset)).toBeLessThanOrEqual(2);
  expect(PER90_PAIRS.Gls).toBe('Gls_90');
});
