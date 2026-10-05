import { describe, expect, it } from 'vitest';
import type { Shop } from './model';
import { mergeShop, parseExportFile, toExportFile } from './transfer';

const shop: Shop = {
  entries: [{ id: 'a', date: '2026-03-14', verdict: 'bad', tags: ['slow-delivery'], note: 'Six days' }],
};

describe('export file', () => {
  it('survives a round trip', () => {
    const text = JSON.stringify(toExportFile({ 'av-cables.dk': shop }));
    expect(parseExportFile(text)).toEqual({ 'av-cables.dk': shop });
  });

  it('normalizes shop names and drops shops without valid entries', () => {
    const text = JSON.stringify({
      app: 'shop-again',
      schema: 1,
      shops: { 'https://www.av-cables.dk/': shop, 'empty.dk': { entries: [] }, 'not a shop': shop },
    });
    expect(parseExportFile(text)).toEqual({ 'av-cables.dk': shop });
  });

  it.each(['', 'not json', '[]', '{"app":"something-else","schema":1,"shops":{}}', '{"app":"shop-again","schema":2,"shops":{}}'])(
    'rejects %s',
    (text) => {
      expect(parseExportFile(text)).toBeNull();
    },
  );
});

describe('mergeShop', () => {
  it('adds only the entries the shop does not have', () => {
    const incoming: Shop = {
      entries: [...shop.entries, { id: 'b', date: '2026-05-01', verdict: 'good', tags: [] }],
    };
    const merged = mergeShop(shop, incoming);
    expect(merged.added).toBe(1);
    expect(merged.shop.entries.map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});
