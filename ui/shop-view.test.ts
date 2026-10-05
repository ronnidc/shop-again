import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Shop } from '@/core/model';
import { loadDraft, loadShop, saveShop } from '@/platform/store';
import { mountShopView } from './shop-view';

const DOMAIN = 'av-cables.dk';
const existing: Shop = {
  entries: [
    { id: 'a', date: '2026-03-14', verdict: 'bad', tags: ['slow-delivery', 'from-a-newer-version'], note: 'Six days' },
  ],
};

/** Mounting again is what happens when the popup closes and is opened anew. */
async function mount(): Promise<HTMLElement> {
  const view = document.createElement('div');
  document.body.replaceChildren(view);
  await mountShopView(view, DOMAIN);
  return view;
}

const settle = () => new Promise((resolve) => setTimeout(resolve));
const field = <Field extends HTMLElement>(view: HTMLElement, selector: string) =>
  view.querySelector<Field>(selector)!;
const click = (view: HTMLElement, selector: string) => field(view, selector).click();
const press = (view: HTMLElement, label: string) =>
  [...view.querySelectorAll('button')].find((button) => button.textContent === label)!.click();
const submit = (view: HTMLElement) =>
  field(view, 'form').dispatchEvent(new Event('submit', { cancelable: true }));

function enter(view: HTMLElement, selector: string, value: string) {
  const input = field<HTMLTextAreaElement | HTMLSelectElement>(view, selector);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

// The year list reaches back from the current year, so the clock is pinned.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 5, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a shop without notes', () => {
  it('opens on the form and asks for a verdict before saving', async () => {
    const view = await mount();
    expect(view.textContent).toContain('No notes about this shop yet.');

    submit(view);
    await settle();

    expect(field(view, '.error').textContent).toBe('Choose good or bad first.');
    expect(await loadShop(DOMAIN)).toEqual({ entries: [] });
  });

  it('saves verdict, tags, note and date, and asks for access to that shop only', async () => {
    const view = await mount();
    click(view, 'input[value="bad"]');
    click(view, 'input[value="slow-delivery"]');
    enter(view, 'textarea', ' Six days ');
    enter(view, 'select[name="day"]', '14');
    enter(view, 'select[name="month"]', '3');

    submit(view);
    await settle();

    expect((await loadShop(DOMAIN)).entries).toEqual([
      expect.objectContaining({ date: '2026-03-14', verdict: 'bad', tags: ['slow-delivery'], note: 'Six days' }),
    ]);
    expect(fakeBrowser.permissions.request).toHaveBeenCalledWith({ origins: ['*://*.av-cables.dk/*'] });
    expect(view.querySelector('form')).toBeNull();
    expect(view.textContent).toContain('Slow delivery');
    expect(view.textContent).toContain('1 bad');
  });

  it('starts the date on today and never saves a day that has not come', async () => {
    const view = await mount();
    expect(field<HTMLSelectElement>(view, 'select[name="day"]').value).toBe('5');
    expect(field<HTMLSelectElement>(view, 'select[name="month"]').value).toBe('10');
    expect(field<HTMLSelectElement>(view, 'select[name="year"]').value).toBe('2026');

    click(view, 'input[value="good"]');
    enter(view, 'select[name="day"]', '31');
    enter(view, 'select[name="month"]', '12');
    submit(view);
    await settle();

    expect((await loadShop(DOMAIN)).entries[0]?.date).toBe('2026-10-05');
  });

  it('shows only the tags of the chosen verdict and drops the ones ticked under the other', async () => {
    const view = await mount();
    const group = (verdict: string) => field(view, `.chips[data-verdict="${verdict}"]`);

    click(view, 'input[value="good"]');
    expect(group('good').hidden).toBe(false);
    expect(group('bad').hidden).toBe(true);
    click(view, 'input[value="fast-delivery"]');
    click(view, 'input[value="bad"]');
    expect(group('good').hidden).toBe(true);

    submit(view);
    await settle();

    expect((await loadShop(DOMAIN)).entries[0]).toMatchObject({ verdict: 'bad', tags: [] });
  });

  it('offers to turn the banner on when the user said no to access', async () => {
    fakeBrowser.permissions.request = vi.fn(async () => false);
    const view = await mount();
    click(view, 'input[value="bad"]');
    submit(view);
    await settle();
    expect(view.textContent).toContain('The banner is off for this shop on this computer.');

    fakeBrowser.permissions.request = vi.fn(async () => true);
    press(view, 'Turn on');
    await settle();
    expect(view.textContent).not.toContain('The banner is off');
  });
});

describe('a note in progress', () => {
  it('is still there when the popup has closed and is opened again', async () => {
    const first = await mount();
    click(first, 'input[value="bad"]');
    click(first, 'input[value="wrong-stock"]');
    enter(first, 'textarea', 'Said in stock, was not');
    enter(first, 'select[name="day"]', '2');
    await settle();

    const reopened = await mount();

    expect(field<HTMLInputElement>(reopened, 'input[value="bad"]').checked).toBe(true);
    expect(field<HTMLInputElement>(reopened, 'input[value="wrong-stock"]').checked).toBe(true);
    expect(field(reopened, '.chips[data-verdict="bad"]').hidden).toBe(false);
    expect(field<HTMLTextAreaElement>(reopened, 'textarea').value).toBe('Said in stock, was not');
    expect(field<HTMLSelectElement>(reopened, 'select[name="day"]').value).toBe('2');
    expect(await loadShop(DOMAIN)).toEqual({ entries: [] });
  });

  it('brings an edit back to the entry it belongs to', async () => {
    await saveShop(DOMAIN, existing);
    const first = await mount();
    press(first, 'Edit');
    enter(first, 'textarea', 'Six days, then a wrong cable');
    await settle();

    const reopened = await mount();
    expect(field<HTMLTextAreaElement>(reopened, 'textarea').value).toBe('Six days, then a wrong cable');
    submit(reopened);
    await settle();

    const { entries } = await loadShop(DOMAIN);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: 'a', note: 'Six days, then a wrong cable' });
  });

  it('is forgotten once it is saved', async () => {
    const view = await mount();
    click(view, 'input[value="good"]');
    await settle();
    expect(await loadDraft(DOMAIN)).not.toBeNull();

    submit(view);
    await settle();

    expect(await loadDraft(DOMAIN)).toBeNull();
    expect((await mount()).querySelector('form')).toBeNull();
  });

  it('is forgotten when the user cancels', async () => {
    const view = await mount();
    click(view, 'input[value="bad"]');
    enter(view, 'textarea', 'Never mind');
    await settle();

    press(view, 'Cancel');
    await settle();

    expect(await loadDraft(DOMAIN)).toBeNull();
    expect(field<HTMLTextAreaElement>(view, 'textarea').value).toBe('');
    expect(field<HTMLInputElement>(view, 'input[value="bad"]').checked).toBe(false);
  });
});

describe('a shop with notes', () => {
  it('lists them and keeps tags from a newer version through an edit', async () => {
    await saveShop(DOMAIN, existing);
    const view = await mount();
    expect(view.querySelector('form')).toBeNull();
    expect(view.textContent).toContain('Six days');
    // A tag without a label is shown by its code.
    expect(view.textContent).toContain('from-a-newer-version');

    press(view, 'Edit');
    expect(field<HTMLInputElement>(view, 'input[value="slow-delivery"]').checked).toBe(true);
    click(view, 'input[value="wrong-stock"]');
    submit(view);
    await settle();

    expect((await loadShop(DOMAIN)).entries).toEqual([
      { ...existing.entries[0], tags: ['slow-delivery', 'wrong-stock', 'from-a-newer-version'] },
    ]);
  });

  it('deletes only after a second click, and removes the shop with its last note', async () => {
    await saveShop(DOMAIN, existing);
    const view = await mount();

    press(view, 'Delete');
    expect(view.textContent).toContain('Delete this note?');
    expect((await loadShop(DOMAIN)).entries).toHaveLength(1);

    press(view, 'Delete');
    await settle();

    expect(await fakeBrowser.storage.sync.get(null)).toEqual({});
    expect(view.querySelector('form')).not.toBeNull();
  });
});
