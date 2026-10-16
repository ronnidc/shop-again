import { beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import en from '../public/_locales/en/messages.json';

const messages: Record<string, { message: string }> = en;

beforeEach(() => {
  fakeBrowser.reset();

  // The in-memory browser covers storage and messaging. Texts, permissions and
  // the manifest are filled in here: English texts, a user who says yes when
  // asked, and the version the overview page shows.
  fakeBrowser.runtime.getManifest = (() => ({ version: '1.0.0' })) as typeof fakeBrowser.runtime.getManifest;
  fakeBrowser.i18n.getUILanguage = () => 'en';
  fakeBrowser.i18n.getMessage = ((name: string, substitutions: string[] = []) =>
    (messages[name]?.message ?? '').replace(
      /\$(\d)/g,
      (_, position: string) => substitutions[Number(position) - 1] ?? '',
    )) as typeof fakeBrowser.i18n.getMessage;
  fakeBrowser.permissions.contains = vi.fn(async () => false);
  fakeBrowser.permissions.request = vi.fn(async () => true);
  fakeBrowser.permissions.remove = vi.fn(async () => true);
  fakeBrowser.permissions.getAll = vi.fn(async () => ({ origins: [], permissions: [] }));
  fakeBrowser.permissions.onAdded.addListener = vi.fn();
  fakeBrowser.permissions.onRemoved.addListener = vi.fn();
});
