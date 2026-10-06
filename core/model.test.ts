import { describe, expect, it } from 'vitest';
import {
  byNewest,
  parseShop,
  pickedDate,
  summarize,
  today,
  withEntry,
  withoutEntry,
  type Entry,
} from './model';

const entry = (overrides: Partial<Entry>): Entry => ({
  id: 'a',
  date: '2026-03-14',
  verdict: 'bad',
  tags: [],
  ...overrides,
});

describe('summarize', () => {
  it('has nothing to say about a shop without entries', () => {
    expect(summarize({ entries: [] })).toBeNull();
  });

  it('follows the verdict when all entries agree', () => {
    expect(summarize({ entries: [entry({})] })?.standing).toBe('bad');
    expect(summarize({ entries: [entry({ verdict: 'good' })] })?.standing).toBe('good');
  });

  it('is mixed when the entries disagree, and counts each kind', () => {
    const summary = summarize({
      entries: [entry({ id: 'a' }), entry({ id: 'b' }), entry({ id: 'c', verdict: 'good' })],
    });
    expect(summary).toMatchObject({ standing: 'mixed', good: 1, bad: 2 });
  });

  it('picks the latest entry by date, not by position', () => {
    const summary = summarize({
      entries: [entry({ id: 'new', date: '2026-09-01' }), entry({ id: 'old', date: '2025-01-01' })],
    });
    expect(summary?.latest.id).toBe('new');
  });
});

describe('byNewest', () => {
  it('orders entries from the same day by when they were written', () => {
    const sorted = byNewest([
      entry({ id: 'later', added: '2026-10-06T10:00:00.000Z' }),
      entry({ id: 'earlier', added: '2026-10-06T09:00:00.000Z' }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['later', 'earlier']);
  });

  it('puts the last added first among entries without a timestamp', () => {
    const sorted = byNewest([entry({ id: 'first' }), entry({ id: 'second' })]);
    expect(sorted.map((item) => item.id)).toEqual(['second', 'first']);
  });
});

describe('withEntry and withoutEntry', () => {
  it('adds a new entry and replaces one with the same id', () => {
    const added = withEntry({ entries: [entry({ id: 'a' })] }, entry({ id: 'b' }));
    expect(added.entries).toHaveLength(2);
    const edited = withEntry(added, entry({ id: 'a', verdict: 'good' }));
    expect(edited.entries.map((item) => item.verdict)).toEqual(['good', 'bad']);
  });

  it('removes by id', () => {
    const shop = withoutEntry({ entries: [entry({ id: 'a' }), entry({ id: 'b' })] }, 'a');
    expect(shop.entries.map((item) => item.id)).toEqual(['b']);
  });
});

describe('parseShop', () => {
  it('keeps valid entries and drops the rest', () => {
    const shop = parseShop({
      entries: [
        entry({ id: 'ok', tags: ['slow-delivery', 'from-a-newer-version'], note: '  late  ' }),
        { id: 'no-verdict', date: '2026-01-01', tags: [] },
        { id: 'bad-date', date: 'yesterday', verdict: 'bad', tags: [] },
        'nonsense',
      ],
    });
    expect(shop.entries).toEqual([
      entry({ id: 'ok', tags: ['slow-delivery', 'from-a-newer-version'], note: 'late' }),
    ]);
  });

  it('reads anything else as a shop without entries', () => {
    expect(parseShop(undefined)).toEqual({ entries: [] });
    expect(parseShop({ entries: 'many' })).toEqual({ entries: [] });
  });
});

describe('today', () => {
  it('is the local day, zero padded', () => {
    expect(today(new Date(2026, 2, 4, 23, 30))).toBe('2026-03-04');
  });
});

describe('pickedDate', () => {
  const now = new Date(2026, 9, 5);

  it('puts a day, a month and a year together', () => {
    expect(pickedDate(2026, 3, 14, now)).toBe('2026-03-14');
  });

  it('turns a day the month does not have into its last day', () => {
    expect(pickedDate(2026, 2, 31, now)).toBe('2026-02-28');
    expect(pickedDate(2024, 2, 31, now)).toBe('2024-02-29');
  });

  it('turns a day that has not come yet into today', () => {
    expect(pickedDate(2026, 12, 24, now)).toBe('2026-10-05');
  });
});
