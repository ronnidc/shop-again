import { describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Shop } from '@/core/model';
import { toExportFile } from '@/core/transfer';
import { loadSettings, loadShop, saveShops } from '@/platform/store';
import { mountOverview } from './overview';

const slowShop: Shop = {
  entries: [{ id: 'a', date: '2026-03-14', verdict: 'bad', tags: ['slow-delivery'], note: 'Six days' }],
};
const fastShop: Shop = {
  entries: [{ id: 'b', date: '2026-09-01', verdict: 'good', tags: ['fast-delivery'] }],
};

const settle = () => new Promise((resolve) => setTimeout(resolve));

async function mount(shops: Record<string, Shop> = { 'av-cables.dk': slowShop, 'bilka.dk': fastShop }) {
  if (Object.keys(shops).length > 0) await saveShops(shops);
  document.body.replaceChildren();
  mountOverview(document.body);
  await settle();
  return document.body;
}

const shopNames = (page: HTMLElement) =>
  [...page.querySelectorAll('.shop-name')].map((name) => name.textContent);
const press = (page: HTMLElement, label: string) =>
  [...page.querySelectorAll('button')].find((button) => button.textContent === label)!.click();

function type(page: HTMLElement, selector: string, value: string, event: string) {
  const field = page.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event(event));
}

async function importFile(page: HTMLElement, text: string) {
  const input = page.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, 'files', { value: [new File([text], 'notes.json')], configurable: true });
  input.dispatchEvent(new Event('change'));
  await settle();
}

describe('the list of shops', () => {
  it('tells a new user how to get started', async () => {
    const page = await mount({});
    expect(page.textContent).toContain('No shops yet.');
  });

  it('shows the shops with the latest experience first', async () => {
    const page = await mount();
    expect(shopNames(page)).toEqual(['bilka.dk', 'av-cables.dk']);
  });

  it('searches in names, tags and notes, and filters by standing', async () => {
    const page = await mount();

    type(page, 'input[type="search"]', 'SLOW', 'input');
    expect(shopNames(page)).toEqual(['av-cables.dk']);
    type(page, 'input[type="search"]', 'six days', 'input');
    expect(shopNames(page)).toEqual(['av-cables.dk']);
    type(page, 'input[type="search"]', 'bilka', 'input');
    expect(shopNames(page)).toEqual(['bilka.dk']);

    type(page, 'select', 'bad', 'change');
    expect(shopNames(page)).toEqual([]);
    expect(page.textContent).toContain('No shops match.');
  });

  it('follows the notes when they change somewhere else', async () => {
    const page = await mount();
    await saveShops({ 'new-shop.dk': fastShop });
    await settle();
    expect(shopNames(page)).toContain('new-shop.dk');
  });

  it('opens a shop in the dialog', async () => {
    const page = await mount();
    page.querySelector<HTMLElement>('.shop-row')!.click();
    await settle();

    const dialog = page.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')!.textContent).toBe('bilka.dk');
  });

  it('opens a shop from a typed address, and says so when it is not one', async () => {
    const page = await mount();
    const add = (text: string) => {
      page.querySelector<HTMLInputElement>('#add-shop')!.value = text;
      page.querySelector('form.add-shop')!.dispatchEvent(new Event('submit', { cancelable: true }));
    };

    add('not a shop');
    expect(page.querySelector('.error')!.textContent).toBe('That does not look like a shop address.');

    add('https://www.proshop.dk/kabler');
    await settle();
    expect(page.querySelector('dialog h2')!.textContent).toBe('proshop.dk');
  });
});

describe('banner access', () => {
  it('asks for every shop without a banner in one prompt', async () => {
    const page = await mount();
    expect(page.textContent).toContain('Shops without a banner on this computer: 2');

    press(page, 'Turn on for all');

    expect(fakeBrowser.permissions.request).toHaveBeenCalledWith({
      origins: ['*://*.av-cables.dk/*', '*://*.bilka.dk/*'],
    });
  });
});

describe('settings', () => {
  it('turns the right-click menu off', async () => {
    const page = await mount();
    const box = page.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(box.checked).toBe(true);

    box.click();
    await settle();

    expect(await loadSettings()).toEqual({ contextMenu: false });
  });
});

describe('import', () => {
  it('adds the notes the user does not already have', async () => {
    const page = await mount();
    const extra: Shop = {
      entries: [...slowShop.entries, { id: 'c', date: '2026-10-01', verdict: 'bad', tags: ['wrong-stock'] }],
    };

    await importFile(page, JSON.stringify(toExportFile({ 'av-cables.dk': extra })));

    expect(page.textContent).toContain('Import done. Notes added: 1');
    expect((await loadShop('av-cables.dk')).entries.map((entry) => entry.id)).toEqual(['a', 'c']);
  });

  it('refuses a file that is not an export', async () => {
    const page = await mount();
    await importFile(page, '{"some":"other file"}');
    expect(page.textContent).toContain('This is not a Shop Again? export file.');
  });
});
