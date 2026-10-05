import { tagMessageName } from '@/core/tags';
import { browser } from './browser';

export type MessageName = keyof typeof import('../public/_locales/en/messages.json');

// WXT types getMessage with one overload per known message, which a union of
// names does not satisfy.
const i18n = browser.i18n as unknown as {
  getMessage(name: string, substitutions?: string[]): string;
};

export function t(name: MessageName, ...substitutions: (string | number)[]): string {
  return i18n.getMessage(name, substitutions.map(String));
}

/** Falls back to the code for a tag this version has no label for. */
export function tagLabel(code: string): string {
  return i18n.getMessage(tagMessageName(code)) || code;
}

/** `2026-03-14` as "March 2026" in the browser's language. */
export function formatMonth(date: string): string {
  return formatDate(date, { month: 'long', year: 'numeric' });
}

/** `2026-03-14` as "14 March 2026" in the browser's language. */
export function formatDay(date: string): string {
  return formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number);
  const language = browser.i18n.getUILanguage();
  return new Intl.DateTimeFormat(language, options).format(new Date(year, month - 1, day));
}
