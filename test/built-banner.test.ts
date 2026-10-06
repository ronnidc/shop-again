import { existsSync, readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Runs the banner script as WXT built it, wrapper and all, against a stub of
// the extension API. It needs `npm run build` first and is skipped otherwise.
const BUILT = '.output/chrome-mv3/content-scripts/banner.js';

const data = {
  summary: {
    standing: 'good',
    good: 1,
    bad: 0,
    latest: { id: 'a', date: '2026-10-06', verdict: 'good', tags: ['fast-delivery'] },
  },
  collapsed: false,
  tab: true,
};

describe.skipIf(!existsSync(BUILT))('the built banner script', () => {
  const sent: string[] = [];
  const globals = globalThis as Record<string, unknown>;
  const noop = { addListener() {}, removeListener() {}, hasListener: () => false };

  beforeEach(() => {
    vi.useFakeTimers();
    sent.length = 0;
    // The test setup puts WXT's in-memory browser on the global, which the
    // built script would pick over the stub.
    globals.browser = undefined;
    globals.chrome = {
      runtime: {
        id: 'test',
        getURL: (path: string) => `chrome-extension://test/${path}`,
        onMessage: noop,
        sendMessage: async (message: { type: string }) => {
          sent.push(message.type);
          return message.type === 'banner:load' ? data : undefined;
        },
      },
      i18n: { getMessage: (name: string) => name, getUILanguage: () => 'en' },
    };
    document.elementFromPoint = () => null;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.querySelector('shop-again-banner')?.remove();
  });

  it('mounts, and gets good news out of the way after six seconds', async () => {
    new Function(readFileSync(BUILT, 'utf8'))();
    await vi.advanceTimersByTimeAsync(10);

    expect(document.querySelector('shop-again-banner')).not.toBeNull();
    expect(sent).toEqual(['banner:load']);

    await vi.advanceTimersByTimeAsync(6_500);
    expect(sent).toEqual(['banner:load', 'banner:seen']);
  });
});
