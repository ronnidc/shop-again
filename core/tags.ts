import type { Verdict } from './model';

/**
 * The reasons a user can tick off. Entries store the code, never the text, so
 * the wording can change and be translated freely. Adding a tag is safe.
 * Removing one leaves old entries pointing at a code without a label.
 */
export const TAGS: readonly { code: string; verdict: Verdict }[] = [
  { code: 'slow-delivery', verdict: 'bad' },
  { code: 'wrong-stock', verdict: 'bad' },
  { code: 'bad-service', verdict: 'bad' },
  { code: 'hard-return', verdict: 'bad' },
  { code: 'not-as-described', verdict: 'bad' },
  { code: 'unexpected-fees', verdict: 'bad' },
  { code: 'fast-delivery', verdict: 'good' },
  { code: 'stock-correct', verdict: 'good' },
  { code: 'good-service', verdict: 'good' },
  { code: 'easy-return', verdict: 'good' },
];

export function tagsFor(verdict: Verdict): string[] {
  return TAGS.filter((tag) => tag.verdict === verdict).map((tag) => tag.code);
}

/** The name of a tag's label in the locale files. */
export function tagMessageName(code: string): string {
  return `tag_${code.replaceAll('-', '_')}`;
}
