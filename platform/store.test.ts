import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Draft, Shop } from '@/core/model';
import {
  clearDraft,
  DEFAULT_SETTINGS,
  loadDraft,
  loadDraftDomains,
  loadSettings,
  loadShop,
  loadShops,
  onStoreChange,
  saveDraft,
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
    await saveSettings({ ...DEFAULT_SETTINGS, contextMenu: false });
    await saveShops({ 'one.dk': shop, 'two.dk': shop });
    expect(Object.keys(await loadShops())).toEqual(['one.dk', 'two.dk']);
  });
});

describe('settings', () => {
  it('shows the menu, the tab and asks shop by shop until told otherwise', async () => {
    expect(await loadSettings()).toEqual({ contextMenu: true, banner: 'ask', tab: true });
    await saveSettings({ contextMenu: false, banner: 'off', tab: false });
    expect(await loadSettings()).toEqual({ contextMenu: false, banner: 'off', tab: false });
  });

  it('falls back to asking when the stored banner mode is unknown', async () => {
    await fakeBrowser.storage.sync.set({ settings: { banner: 'sometimes' } });
    expect((await loadSettings()).banner).toBe('ask');
  });
});

describe('drafts', () => {
  const draft: Draft = { entryId: null, verdict: 'bad', tags: ['wrong-stock'], note: 'Half a note', date: '2026-10-05' };

  it('keeps an unfinished note apart from the saved ones', async () => {
    expect(await loadDraft('av-cables.dk')).toBeNull();

    await saveDraft('av-cables.dk', draft);

    expect(await loadDraft('av-cables.dk')).toEqual(draft);
    expect(await loadDraftDomains()).toEqual(['av-cables.dk']);
    expect(await loadShops()).toEqual({});
    expect(await fakeBrowser.storage.sync.get(null)).toEqual({});
  });

  it('forgets a draft when asked to', async () => {
    await saveDraft('av-cables.dk', draft);
    await clearDraft('av-cables.dk');
    expect(await loadDraft('av-cables.dk')).toBeNull();
    expect(await loadDraftDomains()).toEqual([]);
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

    await saveSettings({ ...DEFAULT_SETTINGS, contextMenu: false });
    expect(listener).toHaveBeenLastCalledWith({
      removedShops: [],
      shopsChanged: false,
      settingsChanged: true,
    });
  });
});
