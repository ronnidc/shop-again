import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Shop } from '@/core/model';
import {
  loadSettings,
  loadShop,
  loadShops,
  onStoreChange,
  saveSettings,
  saveShop,
  saveShops,
} from './store';

const shop: Shop = { entries: [{ id: 'a', date: '2026-03-14', verdict: 'bad', tags: ['slow-delivery'] }] };

describe('shops', () => {
  it('reads back what was saved', async () => {
    await saveShop('av-cables.dk', shop);
    expect(await loadShop('av-cables.dk')).toEqual(shop);
    expect(await loadShops()).toEqual({ 'av-cables.dk': shop });
  });

  it('gives an unknown shop no entries', async () => {
    expect(await loadShop('unknown.dk')).toEqual({ entries: [] });
  });

  it('removes a shop when its last entry is gone', async () => {
    await saveShop('av-cables.dk', shop);
    await saveShop('av-cables.dk', { entries: [] });
    expect(await fakeBrowser.storage.sync.get(null)).toEqual({});
  });

  it('saves several shops in one write and keeps settings out of the list', async () => {
    await saveSettings({ contextMenu: false });
    await saveShops({ 'one.dk': shop, 'two.dk': shop });
    expect(Object.keys(await loadShops())).toEqual(['one.dk', 'two.dk']);
  });
});

describe('settings', () => {
  it('shows the right-click menu until it is turned off', async () => {
    expect(await loadSettings()).toEqual({ contextMenu: true });
    await saveSettings({ contextMenu: false });
    expect(await loadSettings()).toEqual({ contextMenu: false });
  });
});

describe('onStoreChange', () => {
  it('tells which shops were removed and whether settings changed', async () => {
    await saveShop('av-cables.dk', shop);
    const listener = vi.fn();
    onStoreChange(listener);

    await saveShop('av-cables.dk', { entries: [] });
    expect(listener).toHaveBeenLastCalledWith({
      removedShops: ['av-cables.dk'],
      shopsChanged: true,
      settingsChanged: false,
    });

    await saveSettings({ contextMenu: false });
    expect(listener).toHaveBeenLastCalledWith({
      removedShops: [],
      shopsChanged: false,
      settingsChanged: true,
    });
  });
});
