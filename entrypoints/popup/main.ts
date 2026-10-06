import '@/ui/base.css';
import '@/ui/shop-view.css';
import './style.css';
import { shopKey } from '@/core/domain';
import { browser } from '@/platform/browser';
import { t } from '@/platform/i18n';
import { loadDraftDomains } from '@/platform/store';
import { openNoteWindow, openSettings } from '@/platform/windows';
import { fill, h } from '@/ui/dom';
import { icon } from '@/ui/icons';
import { mountShopView } from '@/ui/shop-view';

const element = (id: string) => document.querySelector<HTMLElement>(`#${id}`)!;

const query = new URLSearchParams(location.search);
// Opened from the right-click menu or with "Open in a window", the page is a
// window of its own and not the fixed-width toolbar popup.
const standalone = query.has('window');

/** The shop on show, which is not always the one in the active tab. */
let current: string | null = null;

async function activeShop(): Promise<string | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.url ? shopKey(tab.url) : null;
}

async function open(domain: string | null) {
  current = domain;
  if (domain) await mountShopView(element('shop'), domain);
  else fill(element('shop'), h('p', { class: 'muted' }, t('popupNoShop')));
  await showDrafts();
}

/**
 * A note the user started on another shop is one click away, so looking
 * something up in another tab and opening the popup there does not strand it.
 */
async function showDrafts() {
  const domains = (await loadDraftDomains()).filter((domain) => domain !== current);
  fill(
    element('drafts'),
    ...domains.map((domain) =>
      h(
        'p',
        { class: 'notice' },
        t('draftElsewhere', domain),
        ' ',
        h('button', { type: 'button', class: 'link', onclick: () => void open(domain) }, t('draftContinue')),
      ),
    ),
  );
}

const moveToWindow = () => void openNoteWindow(current).then(() => window.close());

document.documentElement.classList.toggle('standalone', standalone);
document.documentElement.lang = browser.i18n.getUILanguage();
fill(
  element('more'),
  // What is typed so far follows along, because the draft is stored.
  !standalone && h('button', { type: 'button', class: 'link', onclick: moveToWindow }, t('openInWindow')),
  // The gear says that the settings live on the same page.
  h('button', { type: 'button', class: 'link', onclick: () => void openSettings() }, icon('gear'), t('allShops')),
);

const requested = query.get('domain');
void (requested ? Promise.resolve(shopKey(requested)) : activeShop()).then(open);
