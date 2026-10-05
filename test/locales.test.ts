import { describe, expect, it } from 'vitest';
import { TAGS, tagMessageName } from '@/core/tags';
import da from '../public/_locales/da/messages.json';
import en from '../public/_locales/en/messages.json';

const locales: Record<string, Record<string, { message: string }>> = { en, da };
const placeholders = (message: string) => (message.match(/\$\d/g) ?? []).sort();

describe.each(Object.keys(locales))('locale %s', (name) => {
  const messages = locales[name]!;

  it('has exactly the same messages as English', () => {
    expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
  });

  it('uses the same placeholders as English', () => {
    for (const [key, { message }] of Object.entries(messages)) {
      expect(placeholders(message), key).toEqual(placeholders(locales.en![key]!.message));
    }
  });

  it('has a label for every tag', () => {
    for (const { code } of TAGS) {
      expect(messages[tagMessageName(code)]?.message, code).toBeTruthy();
    }
  });
});
