import { buildHash, parseHash } from './hashRoute';

test.each(['', '#', '#/'])('parses empty hash %s as dashboard', (hash) => {
  expect(parseHash(hash).tab).toBe('dashboard');
});

test('parses a query string on a tab', () => {
  const parsed = parseHash('#plots?x=Gls&y=Ast');
  expect(parsed.tab).toBe('plots');
  expect(parsed.query.get('x')).toBe('Gls');
});

test('supports legacy slash routes and encoded profile names', () => {
  expect(parseHash('#/plots').tab).toBe('plots');
  expect(parseHash(buildHash('profile', 'Jean/Paul')).param).toBe('Jean/Paul');
});

test('unknown tabs fall back to dashboard and trailing query remains query data', () => {
  expect(parseHash('#unknown/trailing?x=1').tab).toBe('dashboard');
  expect(parseHash('#plots?x=Gls&y=Ast').query.get('y')).toBe('Ast');
});
