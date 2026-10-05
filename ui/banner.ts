import type { Standing } from '@/core/model';
import { h } from './dom';
import { icon } from './icons';

// Runs inside other people's pages, so it stays free of extension APIs and
// dependencies. The content script hands it the finished texts.

export interface BannerContent {
  standing: Standing;
  title: string;
  detail: string;
  note?: string;
  brand: string;
  hideLabel: string;
  showLabel: string;
}

export interface BannerOptions {
  content: BannerContent;
  css: string;
  /** Start as the small tab, for a shop already seen this session. */
  collapsed: boolean;
  /** Called once, the first time the bar gets out of the way. */
  onCollapse(): void;
}

// Good news does not need to stay in the way. A warning stays until the user
// closes it or scrolls on.
const GOOD_NEWS_MS = 6000;
const SCROLL_PX = 120;

export function mountBanner({ content, css, collapsed, onCollapse }: BannerOptions): HTMLElement {
  const host = document.createElement('shop-again-banner');
  // Closed, so the shop's own scripts and styles cannot reach in.
  const shadow = host.attachShadow({ mode: 'closed' });
  applyStyles(shadow, css);

  const close = h(
    'button',
    { type: 'button', class: 'close', title: content.hideLabel, 'aria-label': content.hideLabel, onclick: collapse },
    icon('close'),
  );
  const tab = h(
    'button',
    { type: 'button', class: 'tab', title: content.showLabel, 'aria-label': content.showLabel, onclick: expand },
    icon(content.standing),
  );
  const root = h(
    'div',
    { class: 'root', 'data-standing': content.standing, 'data-state': collapsed ? 'collapsed' : 'open' },
    h(
      'div',
      { class: 'bar', role: 'status' },
      icon(content.standing),
      h(
        'p',
        { class: 'text' },
        h('strong', {}, content.title),
        h('span', {}, content.detail),
        content.note && h('q', { class: 'note' }, content.note),
      ),
      h('span', { class: 'brand' }, content.brand),
      close,
    ),
    tab,
  );
  shadow.append(root);

  let reported = collapsed;
  const timer = !collapsed && content.standing === 'good' ? setTimeout(collapse, GOOD_NEWS_MS) : undefined;
  const onScroll = () => {
    if (window.scrollY > SCROLL_PX) collapse();
  };
  if (!collapsed) window.addEventListener('scroll', onScroll, { passive: true });

  function collapse() {
    const hadFocus = shadow.activeElement === close;
    root.dataset.state = 'collapsed';
    if (hadFocus) tab.focus();
    clearTimeout(timer);
    window.removeEventListener('scroll', onScroll);
    if (reported) return;
    reported = true;
    onCollapse();
  }

  function expand() {
    root.dataset.state = 'open';
    close.focus();
  }

  // On the root element and not in the body, where a shop's layout could move
  // or clip it.
  document.documentElement.append(host);
  return host;
}

function applyStyles(shadow: ShadowRoot, css: string) {
  // A constructed sheet is not held back by a strict Content-Security-Policy
  // on the shop's page, which a style element can be. Adopting one has not
  // always worked from Firefox content scripts, hence the fallback.
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    shadow.adoptedStyleSheets = [sheet];
  } catch {
    shadow.append(h('style', {}, css));
  }
}
