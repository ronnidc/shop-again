/**
 * Where feedback goes: a mail for everyone, and the issue forms on GitHub for
 * those with an account. Both links carry the version and the browser, so a
 * report arrives with what a reply needs, and the user sees both before
 * anything is sent.
 */

export const SUPPORT_EMAIL = 'support@ronnidc.com';
export const REPOSITORY = 'https://github.com/ronnidc/shop-again';

// Edge before Chrome, and Android before Linux: the first says the second too.
// Other Chromium browsers call themselves Chrome, close enough for a report.
const BROWSERS: [RegExp, string][] = [
  [/Firefox\/(\d+)/, 'Firefox'],
  [/Edg\/(\d+)/, 'Edge'],
  [/Chrome\/(\d+)/, 'Chrome'],
];
const SYSTEMS: [RegExp, string][] = [
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

/** "Chrome 141 on macOS" from the user agent string, as much of it as the string says. */
export function describeBrowser(userAgent: string): string {
  let browser: string | undefined;
  for (const [pattern, name] of BROWSERS) {
    const version = pattern.exec(userAgent)?.[1];
    if (version) {
      browser = `${name} ${version}`;
      break;
    }
  }
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  return [browser, system].filter(Boolean).join(' on ');
}

export interface FeedbackLinks {
  /** A new mail to the support address, the version in the subject and the browser in the body. */
  mail: string;
  /** GitHub's choice between the issue forms, which passes the version and the browser on to the form picked. */
  issues: string;
}

export function feedbackLinks({ name, version, browser }: { name: string; version: string; browser: string }): FeedbackLinks {
  const mail = [
    `subject=${encodeURIComponent(`${name} ${version}`)}`,
    // Line breaks in a mailto body are CRLF (RFC 6068).
    browser && `body=${encodeURIComponent(`Browser: ${browser}\r\n\r\n`)}`,
  ]
    .filter(Boolean)
    .join('&');
  const query = new URLSearchParams({ version });
  if (browser) query.set('browser', browser);
  return {
    mail: `mailto:${SUPPORT_EMAIL}?${mail}`,
    issues: `${REPOSITORY}/issues/new/choose?${query}`,
  };
}
