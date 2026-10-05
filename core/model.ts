export type Verdict = 'good' | 'bad';

/** How a shop stands across all its entries. */
export type Standing = Verdict | 'mixed';

export interface Entry {
  id: string;
  /** Day of the experience, `YYYY-MM-DD`. */
  date: string;
  verdict: Verdict;
  /** Tag codes from `core/tags.ts`. */
  tags: string[];
  note?: string;
}

export interface Shop {
  entries: Entry[];
}

export interface Summary {
  standing: Standing;
  good: number;
  bad: number;
  latest: Entry;
}

/** One shop is one item in sync storage, which is capped at 8 KB per item. */
export const NOTE_MAX_LENGTH = 280;

export function newEntryId(): string {
  return crypto.randomUUID().slice(0, 8);
}

/** Today in the user's own time zone, not UTC. */
export function today(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Newest first. Entries on the same day keep the latest added on top. */
export function byNewest(entries: Entry[]): Entry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.index - a.index)
    .map(({ entry }) => entry);
}

export function summarize(shop: Shop): Summary | null {
  const latest = byNewest(shop.entries)[0];
  if (!latest) return null;
  const good = shop.entries.filter((entry) => entry.verdict === 'good').length;
  const bad = shop.entries.length - good;
  const standing = good && bad ? 'mixed' : good ? 'good' : 'bad';
  return { standing, good, bad, latest };
}

/** Adds the entry, or replaces the one with the same id. */
export function withEntry(shop: Shop, entry: Entry): Shop {
  const exists = shop.entries.some((existing) => existing.id === entry.id);
  return {
    entries: exists
      ? shop.entries.map((existing) => (existing.id === entry.id ? entry : existing))
      : [...shop.entries, entry],
  };
}

export function withoutEntry(shop: Shop, id: string): Shop {
  return { entries: shop.entries.filter((entry) => entry.id !== id) };
}

/**
 * Reads a shop from storage or from an import file. Both can hold anything, so
 * entries that do not fit the model are dropped instead of trusted.
 */
export function parseShop(value: unknown): Shop {
  if (!isRecord(value) || !Array.isArray(value.entries)) return { entries: [] };
  return { entries: value.entries.flatMap((entry) => parseEntry(entry) ?? []) };
}

function parseEntry(value: unknown): Entry | null {
  if (!isRecord(value)) return null;
  const { id, date, verdict, tags, note } = value;
  if (typeof id !== 'string' || !id) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (verdict !== 'good' && verdict !== 'bad') return null;
  const entry: Entry = {
    id,
    date,
    verdict,
    // Unknown codes are kept: they can come from a newer version on another
    // computer that shares the same sync storage.
    tags: Array.isArray(tags) ? tags.filter((tag) => typeof tag === 'string') : [],
  };
  if (typeof note === 'string' && note.trim()) {
    entry.note = note.trim().slice(0, NOTE_MAX_LENGTH);
  }
  return entry;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
