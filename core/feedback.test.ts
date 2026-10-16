import { describe, expect, it } from 'vitest';
import { describeBrowser, feedbackLinks } from './feedback';

describe('describeBrowser', () => {
  it.each([
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Chrome 141 on macOS',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.3537.57',
      'Edge 141 on Windows',
    ],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0', 'Firefox 142 on Linux'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0', 'Firefox 142 on macOS'],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
      'Chrome 141 on Android',
    ],
    [
      'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Chrome 141 on ChromeOS',
    ],
    ['Something else entirely', ''],
  ])('reads "%s"', (userAgent, expected) => {
    expect(describeBrowser(userAgent)).toBe(expected);
  });
});

describe('feedbackLinks', () => {
  const links = feedbackLinks({ name: 'Shop Again?', version: '1.0.0', browser: 'Chrome 141 on macOS' });

  it('starts a mail with the version in the subject and the browser in the body', () => {
    expect(links.mail).toBe(
      'mailto:support@ronnidc.com?subject=Shop%20Again%3F%201.0.0&body=Browser%3A%20Chrome%20141%20on%20macOS%0D%0A%0D%0A',
    );
  });

  it('opens the choice of issue forms with the version and the browser for the form', () => {
    expect(links.issues).toBe(
      'https://github.com/ronnidc/shop-again/issues/new/choose?version=1.0.0&browser=Chrome+141+on+macOS',
    );
  });

  it('leaves the browser out when it could not be read', () => {
    const { mail, issues } = feedbackLinks({ name: 'Shop Again?', version: '1.0.0', browser: '' });
    expect(mail).toBe('mailto:support@ronnidc.com?subject=Shop%20Again%3F%201.0.0');
    expect(issues).toBe('https://github.com/ronnidc/shop-again/issues/new/choose?version=1.0.0');
  });
});
