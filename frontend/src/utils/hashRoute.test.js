import {
  buildHash,
  parseHash,
  serializeExplorerHash,
  parseExplorerQuery,
  serializeCompareHash,
  parseCompareQuery,
} from './hashRoute';

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

test('round-trips explorer filters and compare player IDs cleanly', () => {
  const expHash = serializeExplorerHash({
    season: '2024-2025',
    comp: 'eng Premier League',
    pos: 'FW',
    min: 900,
    age: 'u23',
    q: 'Salah',
    mode: 'per90',
  });
  const parsedExp = parseHash(expHash);
  expect(parsedExp.tab).toBe('explorer');
  expect(parseExplorerQuery(parsedExp.query)).toMatchObject({
    season: '2024-2025',
    comp: 'eng Premier League',
    pos: 'FW',
    min: 900,
    age: 'u23',
    q: 'Salah',
    mode: 'per90',
  });

  const cmpHash = serializeCompareHash({ season: '2024-2025', ids: [101, 204, 305] });
  const parsedCmp = parseHash(cmpHash);
  expect(parsedCmp.tab).toBe('compare');
  expect(parseCompareQuery(parsedCmp.query)).toEqual({
    season: '2024-2025',
    ids: ['101', '204', '305'],
  });
});

