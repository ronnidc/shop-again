import type { Standing } from '@/core/model';
import { coversSomething } from './clear-spot';
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
  /** The small mark as SVG markup, the same the toolbar button shows. */
  mark: string;
  notesLabel: string;
  hideLabel: string;
  showLabel: string;
}

export interface BannerOptions {
  content: BannerContent;
  css: string;
  /** Start out of the way, for a shop already seen this session. */
  collapsed: boolean;
  /** Leave a small tab that brings the bar back. Without it only the line stays. */
  tab: boolean;
  /** Called once, the first time the bar gets out of the way. */
  onCollapse(): void;
  /** Called when the user asks for the notes behind the banner. */
  onOpen(): void;
}

// Good news does not need to stay in the way. A warning stays until the user
// closes it or scrolls on.
const GOOD_NEWS_MS = 6000;
const SCROLL_PX = 120;

/**
 * Where the tab can sit along the top edge, as a share of the width, tried
 * from the end inwards. Shop headers tend to have gaps between their parts.
 */
const PLACES = [0.96, 0.88, 0.8, 0.72, 0.64, 0.56, 0.5, 0.44, 0.36, 0.28, 0.2, 0.12, 0.04];

export function mountBanner({ content, css, collapsed, tab: wantTab, onCollapse, onOpen }: BannerOptions): HTMLElement {
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
    {
      type: 'button',
      class: 'tab',
      hidden: true,
      title: content.showLabel,
      'aria-label': content.showLabel,
      onclick: expand,
    },
    icon(content.standing),
  );
  const root = h(
    'div',
    { class: 'root', 'data-standing': content.standing, 'data-state': collapsed ? 'collapsed' : 'open' },
    h(
      'div',
      { class: 'bar', role: 'status' },
      // The sender comes first, as the mark the user knows from the toolbar
      // button, so the bar is never taken for the shop's own.
      h('span', { class: 'sender' }, markElement(content.mark), content.brand),
      icon(content.standing),
      h(
        'p',
        { class: 'text' },
        h('strong', {}, content.title),
        h('span', {}, content.detail),
        content.note && h('q', { class: 'note' }, content.note),
      ),
      // The one action besides closing: the notes live in the popup, and a
      // clipped quote is not a button.
      h('button', { type: 'button', class: 'notes', onclick: onOpen }, content.notesLabel),
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
    if (placeTab() && hadFocus) tab.focus();
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

  /**
   * Puts the tab in a gap along the top edge, where it covers none of the
   * shop's own menus, buttons, text or images. It is probed unseen, so the
   * page does not flicker. Without a free spot the line alone stays, and the
   * toolbar button still leads to the notes.
   */
  function placeTab(): boolean {
    if (!wantTab) return false;
    tab.style.visibility = 'hidden';
    tab.hidden = false;
    let place: number | undefined;
    try {
      place = PLACES.find((share) => {
        tab.style.insetInlineStart = `${share * 100}%`;
        return !coversSomething(tab.getBoundingClientRect());
      });
    } catch {
      // Probing touches the shop's own page. If that fails, no tab is better
      // than a bar that never goes away.
    }
    tab.hidden = place === undefined;
    tab.style.visibility = '';
    return place !== undefined;
  }

  // On the root element and not in the body, where a shop's layout could move
  // or clip it.
  document.documentElement.append(host);
  if (collapsed) placeTab();
  return host;
}

/** The mark is the extension's own file, parsed as a document and not as HTML in the shop's page. */
function markElement(svg: string): Element {
  const mark = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  mark.setAttribute('class', 'mark');
  mark.setAttribute('aria-hidden', 'true');
  return mark;
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
