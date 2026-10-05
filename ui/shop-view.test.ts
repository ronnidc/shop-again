import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Shop } from '@/core/model';
import { loadShop, saveShop } from '@/platform/store';
import { mountShopView } from './shop-view';

const DOMAIN = 'av-cables.dk';
const existing: Shop = {
  entries: [
    { id: 'a', date: '2026-03-14', verdict: 'bad', tags: ['slow-delivery', 'from-a-newer-version'], note: 'Six days' },
  ],
};

async function mount(): Promise<HTMLElement> {
  const view = document.createElement('div');
  document.body.replaceChildren(view);
  await mountShopView(view, DOMAIN);
  return view;
}

const settle = () => new Promise((resolve) => setTimeout(resolve));
const click = (view: HTMLElement, selector: string) => view.querySelector<HTMLElement>(selector)!.click();
const press = (view: HTMLElement, label: string) =>
  [...view.querySelectorAll('button')].find((button) => button.textContent === label)!.click();
const submit = (view: HTMLElement) =>
  view.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

describe('a shop without notes', () => {
  it('opens on the form and asks for a verdict before saving', async () => {
    const view = await mount();
    expect(view.textContent).toContain('No notes about this shop yet.');

    submit(view);
    await settle();

    expect(view.querySelector('.error')!.textContent).toBe('Choose good or bad first.');
    expect(await loadShop(DOMAIN)).toEqual({ entries: [] });
  });

  it('saves verdict, tags, note and date, and asks for access to that shop only', async () => {
    const view = await mount();
    click(view, 'input[value="bad"]');
    click(view, 'input[value="slow-delivery"]');
    view.querySelector('textarea')!.value = ' Six days ';
    view.querySelector<HTMLInputElement>('input[name="date"]')!.value = '2026-03-14';

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

  it('shows only the tags of the chosen verdict and drops the ones ticked under the other', async () => {
    const view = await mount();
    const group = (verdict: string) => view.querySelector<HTMLElement>(`.chips[data-verdict="${verdict}"]`)!;

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

describe('a shop with notes', () => {
  it('lists them and keeps tags from a newer version through an edit', async () => {
    await saveShop(DOMAIN, existing);
    const view = await mount();
    expect(view.querySelector('form')).toBeNull();
    expect(view.textContent).toContain('Six days');
    // A tag without a label is shown by its code.
    expect(view.textContent).toContain('from-a-newer-version');

    press(view, 'Edit');
    expect(view.querySelector<HTMLInputElement>('input[value="slow-delivery"]')!.checked).toBe(true);
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
