import { shopKey } from '@/core/domain';
import { compareNewest, summarize, today, type Shop, type Summary } from '@/core/model';
import { mergeShop, parseExportFile, toExportFile } from '@/core/transfer';
import { formatMonth, t, tagLabel } from '@/platform/i18n';
import {
  hasBanner,
  onBannerAccessChange,
  releaseAllBanners,
  releaseBannerEverywhere,
  requestBanner,
  requestBannerEverywhere,
} from '@/platform/permissions';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  loadShops,
  onStoreChange,
  saveSettings,
  saveShops,
  type BannerMode,
  type Settings,
} from '@/platform/store';
import { fill, h } from './dom';
import { icon } from './icons';
import { standingLabel, summaryText } from './labels';
import { mountShopView } from './shop-view';

const FILTERS = ['all', 'bad', 'mixed', 'good'] as const;
type Filter = (typeof FILTERS)[number];

const BANNER_MODES = {
  ask: 'bannerModeAsk',
  all: 'bannerModeAll',
  off: 'bannerModeOff',
} as const;

/**
 * The page with every shop the user has notes on: search and filter, one shop
 * opened in a dialog, the settings, and export and import.
 */
export function mountOverview(root: HTMLElement, { open = null }: { open?: string | null } = {}): void {
  let shops: Record<string, Shop> = {};
  /** Shops whose banner cannot show on this computer, because access was never given here. */
  let withoutBanner: string[] = [];
  let settings: Settings = DEFAULT_SETTINGS;
  let search = '';
  let filter: Filter = 'all';
  /** A shop just added by address, to be shown in the list when the dialog closes. */
  let added: string | null = null;

  const list = h('div', { class: 'shop-list' });
  const settingsSection = h('section', {});
  const shopView = h('div', {});
  const dialog = h(
    'dialog',
    {},
    shopView,
    h('form', { method: 'dialog', class: 'dialog-close' }, h('button', {}, t('close'))),
  );

  async function refresh() {
    [shops, settings] = await Promise.all([loadShops(), loadSettings()]);
    const domains = Object.keys(shops);
    const access = await Promise.all(domains.map(hasBanner));
    withoutBanner = domains.filter((_, index) => !access[index]);
    renderList();
    renderSettings();
  }

  function matches(domain: string, shop: Shop, summary: Summary): boolean {
    if (filter !== 'all' && summary.standing !== filter) return false;
    const words = search.trim().toLowerCase();
    if (!words) return true;
    const texts = shop.entries.flatMap((entry) => [...entry.tags.map(tagLabel), entry.note ?? '']);
    return [domain, ...texts].some((text) => text.toLowerCase().includes(words));
  }

  function renderList() {
    // The latest experience first, like a log. Shops from the same day follow
    // the order they were written in, so a new one lands at the top.
    const rows = Object.entries(shops)
      .flatMap(([domain, shop]) => {
        const summary = summarize(shop);
        return summary && matches(domain, shop, summary) ? [{ domain, summary }] : [];
      })
      .sort((a, b) => compareNewest(a.summary.latest, b.summary.latest) || a.domain.localeCompare(b.domain));

    // A click handler, so the permission prompt is allowed to open. One prompt
    // covers every shop on the list.
    const turnOnAll = () =>
      void (settings.banner === 'all' ? requestBannerEverywhere() : requestBanner(withoutBanner)).then(refresh);

    fill(
      list,
      withoutBanner.length > 0 &&
        settings.banner !== 'off' &&
        h(
          'p',
          { class: 'notice' },
          t('bannerMissing', withoutBanner.length),
          ' ',
          h('button', { type: 'button', class: 'link', onclick: turnOnAll }, t('bannerTurnOnAll')),
        ),
      rows.length === 0
        ? h('p', { class: 'muted' }, t(Object.keys(shops).length === 0 ? 'noShops' : 'noMatches'))
        : h('ul', { class: 'shops' }, ...rows.map(({ domain, summary }) => shopRow(domain, summary))),
    );
  }

  function shopRow(domain: string, summary: Summary) {
    return h(
      'li',
      {},
      h(
        'button',
        { type: 'button', class: 'shop-row', 'data-domain': domain, onclick: () => void openShop(domain) },
        h(
          'span',
          { class: 'standing', 'data-standing': summary.standing },
          icon(summary.standing),
          standingLabel(summary.standing),
        ),
        h('span', { class: 'shop-name' }, domain),
        h('span', { class: 'muted' }, summaryText(summary)),
        h('span', { class: 'muted' }, formatMonth(summary.latest.date)),
      ),
    );
  }

  async function openShop(domain: string) {
    await mountShopView(shopView, domain);
    if (!dialog.open) dialog.showModal();
  }

  /**
   * The form sits under the list and a new shop lands at the top of it, so
   * the list scrolls to the new row once the dialog closes.
   */
  function revealAdded() {
    const domain = added;
    added = null;
    if (!domain) return;
    void refresh().then(() => {
      const row = list.querySelector<HTMLElement>(`.shop-row[data-domain="${CSS.escape(domain)}"]`);
      row?.scrollIntoView({ block: 'nearest' });
      row?.focus();
    });
  }
  dialog.addEventListener('close', revealAdded);

  /**
   * Below the list, apart from the search, because it starts a new shop rather
   * than finding one. A shop added here lands in the list by its date.
   */
  function addShopForm() {
    const error = h('p', { class: 'error', role: 'alert', hidden: true });
    const address = h('input', {
      id: 'add-shop',
      type: 'text',
      placeholder: t('otherShopPlaceholder'),
      autocomplete: 'off',
      spellcheck: 'false',
    });
    const addShop = (event: Event) => {
      event.preventDefault();
      const domain = shopKey(address.value);
      error.hidden = domain !== null;
      error.textContent = domain ? '' : t('otherShopInvalid');
      if (!domain) return;
      address.value = '';
      added = domain;
      void openShop(domain);
    };
    return h(
      'form',
      { class: 'add-shop', onsubmit: addShop },
      h('label', { for: 'add-shop' }, t('addShopLabel')),
      address,
      h('button', { type: 'submit' }, t('addShopButton')),
      error,
    );
  }

  function toolbar() {
    const onSearch = (event: Event) => {
      search = (event.target as HTMLInputElement).value;
      renderList();
    };
    const onFilter = (event: Event) => {
      filter = (event.target as HTMLSelectElement).value as Filter;
      renderList();
    };

    return h(
      'div',
      { class: 'toolbar' },
      h('label', { class: 'grow' }, t('searchLabel'), h('input', { type: 'search', oninput: onSearch })),
      h(
        'label',
        {},
        t('filterLabel'),
        h(
          'select',
          { onchange: onFilter },
          ...FILTERS.map((value) =>
            h('option', { value }, value === 'all' ? t('filterAll') : standingLabel(value)),
          ),
        ),
      ),
    );
  }

  function renderSettings() {
    const toggleMenu = (event: Event) => {
      settings = { ...settings, contextMenu: (event.target as HTMLInputElement).checked };
      void saveSettings(settings);
    };
    const toggleTab = (event: Event) => {
      settings = { ...settings, tab: (event.target as HTMLInputElement).checked };
      void saveSettings(settings);
    };
    fill(
      settingsSection,
      h('h2', {}, t('settingsHeading')),
      h(
        'label',
        { class: 'check' },
        h('input', { type: 'checkbox', checked: settings.contextMenu, onchange: toggleMenu }),
        t('settingContextMenu'),
      ),
      h(
        'fieldset',
        { class: 'banner-modes' },
        h('legend', {}, t('settingsBannerHeading')),
        h('p', { class: 'muted' }, t('settingsBannerExplain')),
        ...(Object.keys(BANNER_MODES) as BannerMode[]).map((mode) =>
          h(
            'label',
            { class: 'check' },
            h('input', {
              type: 'radio',
              name: 'banner',
              value: mode,
              checked: settings.banner === mode,
              onchange: () => chooseBannerMode(mode),
            }),
            t(BANNER_MODES[mode]),
          ),
        ),
        h(
          'label',
          { class: 'check tab-setting' },
          h('input', { type: 'checkbox', name: 'tab', checked: settings.tab, onchange: toggleTab }),
          t('settingTab'),
        ),
      ),
    );
  }

  /**
   * Giving access to every site needs the browser's prompt, so that comes
   * first, inside the click. Leaving that choice gives the access back, and
   * choosing no banner gives back every site.
   */
  function chooseBannerMode(mode: BannerMode) {
    const allowed = mode === 'all' ? requestBannerEverywhere() : Promise.resolve(true);
    void allowed.then(async (granted) => {
      if (!granted) {
        renderSettings();
        return;
      }
      if (settings.banner === 'all' && mode !== 'all') await releaseBannerEverywhere();
      if (mode === 'off') await releaseAllBanners();
      settings = { ...settings, banner: mode };
      await saveSettings(settings);
      await refresh();
    });
  }

  function dataSection() {
    const status = h('p', { role: 'status' });
    const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });

    const exportNotes = () => {
      const json = JSON.stringify(toExportFile(shops), null, 2);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = h('a', { href: url, download: `shop-again-${today()}.json`, hidden: true });
      root.append(link);
      link.click();
      link.remove();
      // Revoking in the same tick can cancel the download before it starts.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const importNotes = async () => {
      const picked = file.files?.[0];
      if (!picked) return;
      const incoming = parseExportFile(await picked.text());
      file.value = '';
      if (!incoming) {
        status.textContent = t('importInvalid');
        return;
      }
      const changed: Record<string, Shop> = {};
      let added = 0;
      for (const [domain, shop] of Object.entries(incoming)) {
        const merged = mergeShop(shops[domain] ?? { entries: [] }, shop);
        if (merged.added === 0) continue;
        changed[domain] = merged.shop;
        added += merged.added;
      }
      try {
        if (added > 0) await saveShops(changed);
        status.textContent = t('importDone', added);
      } catch {
        status.textContent = t('saveFailed');
      }
    };
    file.addEventListener('change', () => void importNotes());

    return h(
      'section',
      {},
      h('h2', {}, t('dataHeading')),
      h('p', { class: 'muted' }, t('dataExplain')),
      h(
        'div',
        { class: 'actions' },
        h('button', { type: 'button', onclick: exportNotes }, t('exportButton')),
        h('button', { type: 'button', onclick: () => file.click() }, t('importButton')),
        file,
      ),
      status,
    );
  }

  fill(
    root,
    h('header', {}, h('h1', {}, t('extName')), h('p', { class: 'muted' }, t('optionsTagline'))),
    h('main', {}, h('section', {}, toolbar(), list, addShopForm()), settingsSection, dataSection()),
    dialog,
  );

  // The list follows the notes wherever they change: in the dialog here, in
  // the popup, or on another computer through sync.
  onStoreChange(() => void refresh());
  onBannerAccessChange(() => void refresh());
  void refresh();
  const requested = open && shopKey(open);
  if (requested) void openShop(requested);
}
