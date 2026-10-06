import { permissionPattern, shopKey } from '@/core/domain';
import type { BannerData, Message } from '@/core/messages';
import { summarize, type Standing } from '@/core/model';
import { browser } from '@/platform/browser';
import { t } from '@/platform/i18n';
import { hasBanner, onBannerAccessChange, releaseBanner } from '@/platform/permissions';
import { loadSettings, loadShop, loadShops, onStoreChange } from '@/platform/store';
import { openSettings, openShopPage } from '@/platform/windows';

const BANNER_SCRIPT = 'banner';
const MENU_PAGE = 'note-page';
const MENU_LINK = 'note-link';

// The badge API takes colors as values, so these repeat the tokens in
// ui/banner.css.
const BADGES: Record<Standing, { text: string; color: string }> = {
  good: { text: '✓', color: '#18794e' },
  bad: { text: '!', color: '#b42318' },
  mixed: { text: '±', color: '#9a6700' },
};

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    inTurn(syncContextMenu);
    inTurn(syncBannerScript);
  });
  onBannerAccessChange(() => inTurn(syncBannerScript));
  onStoreChange((change) => {
    if (change.settingsChanged) inTurn(syncContextMenu);
    if (change.settingsChanged || change.shopsChanged) inTurn(syncBannerScript);
    // A shop without notes has no banner to show, so the access goes too.
    for (const domain of change.removedShops) void releaseBanner(domain);
  });
  browser.contextMenus.onClicked.addListener(openNoteFromMenu);
  browser.runtime.onMessage.addListener(answer);
});

// Several events can ask for the same sync at once, and two overlapping runs
// would both try to create the same menu entry or script.
let queue: Promise<unknown> = Promise.resolve();
function inTurn(task: () => Promise<unknown>) {
  queue = queue.then(task).catch((error) => console.error(error));
}

async function syncContextMenu() {
  const { contextMenu } = await loadSettings();
  await browser.contextMenus.removeAll();
  if (!contextMenu) return;
  browser.contextMenus.create({ id: MENU_PAGE, title: t('menuNotePage'), contexts: ['page'] });
  browser.contextMenus.create({ id: MENU_LINK, title: t('menuNoteLink'), contexts: ['link'] });
}

/**
 * The banner script runs on the shops that have notes and that the user has
 * given access to, and nowhere else, even when access covers every site.
 */
async function syncBannerScript() {
  const { banner } = await loadSettings();
  const domains = banner === 'off' ? [] : Object.keys(await loadShops());
  const access = await Promise.all(domains.map(hasBanner));
  const matches = domains.filter((_, index) => access[index]).map(permissionPattern);
  const registered = await browser.scripting.getRegisteredContentScripts({ ids: [BANNER_SCRIPT] });
  if (matches.length === 0) {
    if (registered.length > 0) {
      await browser.scripting.unregisterContentScripts({ ids: [BANNER_SCRIPT] });
    }
    return;
  }
  const script = {
    id: BANNER_SCRIPT,
    matches,
    js: ['content-scripts/banner.js'],
    runAt: 'document_idle' as const,
    persistAcrossSessions: true,
  };
  if (registered.length > 0) await browser.scripting.updateContentScripts([script]);
  else await browser.scripting.registerContentScripts([script]);
}

function openNoteFromMenu(
  info: { menuItemId: string | number; linkUrl?: string; pageUrl?: string },
  tab?: { url?: string },
) {
  const address = info.menuItemId === MENU_LINK ? info.linkUrl : (info.pageUrl ?? tab?.url);
  const domain = address ? shopKey(address) : null;
  void (domain ? openShopPage(domain) : openSettings());
}

function answer(
  message: Message,
  sender: { url?: string; tab?: { id?: number } },
  respond: (data: BannerData | null) => void,
): true | undefined {
  const domain = sender.url ? shopKey(sender.url) : null;
  if (!domain) return;
  if (message.type === 'banner:seen') {
    void browser.storage.session.set({ [seenKey(domain)]: true });
    return;
  }
  if (message.type === 'banner:load') {
    void bannerData(domain, sender.tab?.id).then(respond);
    // Keeps the channel open for the answer above.
    return true;
  }
}

async function bannerData(domain: string, tabId: number | undefined): Promise<BannerData | null> {
  const summary = summarize(await loadShop(domain));
  if (!summary) return null;
  if (tabId !== undefined) void markTab(tabId, summary.standing);
  const key = seenKey(domain);
  const [seen, { tab }] = await Promise.all([browser.storage.session.get(key), loadSettings()]);
  return { summary, collapsed: seen[key] === true, tab };
}

/** The toolbar button shows the verdict too. The browser clears it on the next navigation. */
async function markTab(tabId: number, standing: Standing) {
  const { text, color } = BADGES[standing];
  await browser.action.setBadgeBackgroundColor({ tabId, color });
  await browser.action.setBadgeTextColor({ tabId, color: '#fff' });
  await browser.action.setBadgeText({ tabId, text });
}

function seenKey(domain: string): string {
  return `seen:${domain}`;
}
