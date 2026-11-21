import {
  makeShortlistKey,
  isPlayerInShortlist,
  toggleShortlistItem,
  updateShortlistItem,
  removeShortlistItem,
  buildShortlistCsv,
  getAgeRangeBounds,
} from './shortlistStore';

describe('shortlistStore pure helpers', () => {
  const salah = {
    id: 1,
    Player: 'Mohamed Salah',
    Squad: 'Liverpool',
    Comp: 'eng Premier League',
    Pos: 'FW',
    Age: 32,
    Min: 3000,
    Gls: 29,
    Ast: 18,
    xG: 25.1,
    xAG: 14.2,
  };

  test('toggles player addition and removal idempotently per season', () => {
    const added = toggleShortlistItem([], salah, '2024-2025', 'Priority');
    expect(added).toHaveLength(1);
    expect(added[0].tag).toBe('Priority');
    expect(added[0].key).toBe(makeShortlistKey(salah, '2024-2025'));
    expect(isPlayerInShortlist(added, salah, '2024-2025')).toBe(true);
    expect(isPlayerInShortlist(added, salah, '2023-2024')).toBe(false);

    const removed = toggleShortlistItem(added, salah, '2024-2025');
    expect(removed).toHaveLength(0);
    expect(isPlayerInShortlist(removed, salah, '2024-2025')).toBe(false);
  });

  test('updates tags and notes and removes entries cleanly', () => {
    let list = toggleShortlistItem([], salah, '2024-2025');
    const key = list[0].key;
    list = updateShortlistItem(list, key, { tag: 'Watchlist', note: 'Elite transition threat, monitor contract' });
    expect(list[0].tag).toBe('Watchlist');
    expect(list[0].note).toBe('Elite transition threat, monitor contract');

    const csv = buildShortlistCsv(list);
    expect(csv).toContain('Mohamed Salah');
    expect(csv).toContain('"Elite transition threat, monitor contract"');

    const cleared = removeShortlistItem(list, key);
    expect(cleared).toHaveLength(0);
  });

  test('resolves age range presets to numeric bounds', () => {
    expect(getAgeRangeBounds('u21')).toMatchObject({ ageMin: null, ageMax: 21 });
    expect(getAgeRangeBounds('prime')).toMatchObject({ ageMin: 24, ageMax: 28 });
    expect(getAgeRangeBounds('vet')).toMatchObject({ ageMin: 29, ageMax: null });
    expect(getAgeRangeBounds('')).toMatchObject({ ageMin: null, ageMax: null });
  });
});
