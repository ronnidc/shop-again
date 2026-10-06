import { browser } from './browser';

/** The overview page, which also holds the settings. */
export function openSettings(): Promise<void> {
  return browser.runtime.openOptionsPage();
}

/**
 * The overview page with one shop's notes opened in its dialog. A tab of its
 * own, because the toolbar popup only knows the active tab and closes as soon
 * as the user looks elsewhere.
 */
export function openShopPage(domain: string): Promise<unknown> {
  const query = new URLSearchParams({ domain });
  return browser.tabs.create({ url: `${browser.runtime.getURL('/options.html')}?${query}` });
}
