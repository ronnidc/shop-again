import '@/ui/base.css';
import '@/ui/shop-view.css';
import './style.css';
import { shopKey } from '@/core/domain';
import { browser } from '@/platform/browser';
import { t } from '@/platform/i18n';
import { h } from '@/ui/dom';
import { mountShopView } from '@/ui/shop-view';

const shopElement = document.querySelector<HTMLElement>('#shop')!;
const moreElement = document.querySelector<HTMLElement>('#more')!;

async function activeShop(): Promise<string | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.url ? shopKey(tab.url) : null;
}

async function open(domain: string | null) {
  if (domain) await mountShopView(shopElement, domain);
  else shopElement.replaceChildren(h('p', { class: 'muted' }, t('popupNoShop')));
}

/**
 * A bad experience usually shows days after the order, when the shop is no
 * longer the page in front of the user. Typing or pasting its address gets to
 * the same note form from anywhere.
 */
function otherShopForm() {
  const error = h('p', { class: 'error', role: 'alert', hidden: true });
  const input = h('input', {
    id: 'other-shop',
    type: 'text',
    placeholder: t('otherShopPlaceholder'),
    autocomplete: 'off',
    spellcheck: 'false',
  });
  const submit = (event: Event) => {
    event.preventDefault();
    const domain = shopKey(input.value);
    error.hidden = domain !== null;
    error.textContent = domain ? '' : t('otherShopInvalid');
    if (!domain) return;
    input.value = '';
    void open(domain);
  };
  return [
    h(
      'form',
      { class: 'other-shop', onsubmit: submit },
      h('label', { for: 'other-shop' }, t('otherShopLabel')),
      input,
      h('button', { type: 'submit' }, t('otherShopOpen')),
    ),
    error,
  ];
}

const query = new URLSearchParams(location.search);
// Opened from the right-click menu, the page is a window of its own and not
// the fixed-width toolbar popup.
document.documentElement.classList.toggle('standalone', query.has('window'));
document.documentElement.lang = browser.i18n.getUILanguage();

moreElement.append(
  ...otherShopForm(),
  h(
    'button',
    { type: 'button', class: 'link', onclick: () => void browser.runtime.openOptionsPage() },
    t('allShops'),
  ),
);

const requested = query.get('domain');
void (requested ? Promise.resolve(shopKey(requested)) : activeShop()).then(open);
