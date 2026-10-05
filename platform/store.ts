import { parseShop, type Shop } from '@/core/model';
import { browser } from './browser';

// Everything the extension remembers goes through this module. The notes live
// in the browser's sync storage, one item per shop, so a backend could be put
// behind the same functions later without touching the UI.

const SHOP_PREFIX = 'shop:';
const SETTINGS_KEY = 'settings';

export interface Settings {
  /** Show the entries in the right-click menu. */
  contextMenu: boolean;
}

const DEFAULT_SETTINGS: Settings = { contextMenu: true };

export interface StoreChange {
  /** Shops whose last entry was deleted. */
  removedShops: string[];
  shopsChanged: boolean;
  settingsChanged: boolean;
}

export async function loadShops(): Promise<Record<string, Shop>> {
  const items = await browser.storage.sync.get(null);
  const shops: Record<string, Shop> = {};
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(SHOP_PREFIX)) continue;
    const shop = parseShop(value);
    if (shop.entries.length > 0) shops[key.slice(SHOP_PREFIX.length)] = shop;
  }
  return shops;
}

export async function loadShop(domain: string): Promise<Shop> {
  const key = SHOP_PREFIX + domain;
  const items = await browser.storage.sync.get(key);
  return parseShop(items[key]);
}

/**
 * A shop without entries is removed. Not async on purpose: the write is handed
 * to the browser before this returns, so it still happens when a popup closes
 * right after, as it does when a permission prompt opens on top of it.
 */
export function saveShop(domain: string, shop: Shop): Promise<void> {
  const key = SHOP_PREFIX + domain;
  return shop.entries.length > 0
    ? browser.storage.sync.set({ [key]: shop })
    : browser.storage.sync.remove(key);
}

/** Sync storage limits writes per minute, so an import goes in as one write. */
export function saveShops(shops: Record<string, Shop>): Promise<void> {
  const items = Object.entries(shops).map(([domain, shop]) => [SHOP_PREFIX + domain, shop]);
  return browser.storage.sync.set(Object.fromEntries(items));
}

export async function loadSettings(): Promise<Settings> {
  const items = await browser.storage.sync.get(SETTINGS_KEY);
  const stored: unknown = items[SETTINGS_KEY];
  const settings = { ...DEFAULT_SETTINGS };
  if (typeof stored === 'object' && stored !== null && 'contextMenu' in stored) {
    settings.contextMenu = stored.contextMenu !== false;
  }
  return settings;
}

export function saveSettings(settings: Settings): Promise<void> {
  return browser.storage.sync.set({ [SETTINGS_KEY]: settings });
}

/** Also fires for changes that arrive from another computer through sync. */
export function onStoreChange(listener: (change: StoreChange) => void): void {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const shopKeys = Object.keys(changes).filter((key) => key.startsWith(SHOP_PREFIX));
    listener({
      removedShops: shopKeys
        .filter((key) => changes[key]?.newValue == null)
        .map((key) => key.slice(SHOP_PREFIX.length)),
      shopsChanged: shopKeys.length > 0,
      settingsChanged: SETTINGS_KEY in changes,
    });
  });
}
