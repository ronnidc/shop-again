import { browser } from './browser';

/**
 * Opens the note form in a small window of its own. Unlike the toolbar popup,
 * a window stays open when the user looks at something else, and it can show a
 * shop other than the one in the active tab.
 */
export function openNoteWindow(domain: string | null): Promise<unknown> {
  const query = new URLSearchParams({ window: '1', ...(domain && { domain }) });
  return browser.windows.create({
    url: `${browser.runtime.getURL('/popup.html')}?${query}`,
    type: 'popup',
    width: 400,
    height: 700,
  });
}
