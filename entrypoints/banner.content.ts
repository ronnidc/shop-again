import type { BannerData, Message } from '@/core/messages';
import { browser } from '@/platform/browser';
import { formatMonth, t, tagLabel } from '@/platform/i18n';
import { mountBanner } from '@/ui/banner';
import css from '@/ui/banner.css?inline';
import mark from '@/assets/icon-small.svg?raw';
import name from '@/assets/name.svg?raw';
import { summaryText } from '@/ui/labels';

const TITLES = {
  good: 'bannerTitleGood',
  bad: 'bannerTitleBad',
  mixed: 'bannerTitleMixed',
} as const;

export default defineContentScript({
  // The background script registers this for the shops the user has given
  // access to, so the manifest itself lists no sites.
  registration: 'runtime',
  matches: [],
  // WXT can announce a content script to the page with postMessage, which a
  // shop's own message listeners may trip over.
  noScriptStartedPostMessage: true,

  async main() {
    const data = await ask<BannerData | null>({ type: 'banner:load' });
    if (!data) return;
    const { standing, good, bad, latest } = data.summary;

    mountBanner({
      css,
      collapsed: data.collapsed,
      tab: data.tab,
      onCollapse: () => void ask({ type: 'banner:seen' }),
      onOpen: () => void ask({ type: 'banner:open' }),
      content: {
        standing,
        title: t(TITLES[standing]),
        detail: [
          latest.tags.map(tagLabel).join(', '),
          formatMonth(latest.date),
          good + bad > 1 && summaryText(data.summary),
        ]
          .filter(Boolean)
          .join(' · '),
        note: latest.note,
        brand: t('extName'),
        mark,
        name,
        notesLabel: t('bannerNotes'),
        hideLabel: t('bannerHide'),
        showLabel: t('bannerShow'),
      },
    });
  },
});

/** Resolves undefined when the background script is not there to answer. */
function ask<Answer>(message: Message): Promise<Answer | undefined> {
  return browser.runtime.sendMessage(message).catch(() => undefined);
}
