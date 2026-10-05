import { shopKey } from './domain';
import { parseShop, type Shop } from './model';

/** The file a user exports as a backup, or to carry notes to another browser. */
export interface ExportFile {
  app: 'shop-again';
  schema: 1;
  exportedAt: string;
  shops: Record<string, Shop>;
}

export function toExportFile(shops: Record<string, Shop>, now = new Date()): ExportFile {
  return { app: 'shop-again', schema: 1, exportedAt: now.toISOString(), shops };
}

/** Returns the shops in an export file, or null when the text is not one. */
export function parseExportFile(text: string): Record<string, Shop> | null {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof file !== 'object' || file === null) return null;
  const { app, schema, shops } = file as Record<string, unknown>;
  if (app !== 'shop-again' || schema !== 1) return null;
  if (typeof shops !== 'object' || shops === null) return null;

  const result: Record<string, Shop> = {};
  for (const [name, value] of Object.entries(shops)) {
    const domain = shopKey(name);
    const shop = parseShop(value);
    if (domain && shop.entries.length > 0) result[domain] = shop;
  }
  return result;
}

/** Adds the incoming entries the shop does not already have, matched by id. */
export function mergeShop(existing: Shop, incoming: Shop): { shop: Shop; added: number } {
  const known = new Set(existing.entries.map((entry) => entry.id));
  const fresh = incoming.entries.filter((entry) => !known.has(entry.id));
  return { shop: { entries: [...existing.entries, ...fresh] }, added: fresh.length };
}
