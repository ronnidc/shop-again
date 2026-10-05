import { describe, expect, it } from 'vitest';
import { permissionPattern, shopKey } from './domain';

describe('shopKey', () => {
  it.each([
    ['https://www.av-cables.dk/produkt/hdmi?ref=1', 'av-cables.dk'],
    ['av-cables.dk', 'av-cables.dk'],
    ['  WWW.Bilka.DK ', 'bilka.dk'],
    ['http://shop.example.co.uk/', 'example.co.uk'],
    ['https://brugsen.coop.dk/', 'coop.dk'],
    ['https://one.myshopify.com/cart', 'one.myshopify.com'],
    ['ordre@av-cables.dk', 'av-cables.dk'],
    ['http://localhost:5173/shop', 'localhost'],
    ['http://127.0.0.1:8080/', '127.0.0.1'],
  ])('reads %s as %s', (input, expected) => {
    expect(shopKey(input)).toBe(expected);
  });

  it.each(['', '   ', 'not a shop', 'av-cables', 'chrome://extensions', 'about:blank', 'file:///tmp/shop.html'])(
    'rejects "%s"',
    (input) => {
      expect(shopKey(input)).toBeNull();
    },
  );
});

describe('permissionPattern', () => {
  it('covers a shop and its subdomains', () => {
    expect(permissionPattern('av-cables.dk')).toBe('*://*.av-cables.dk/*');
  });

  it('names a host without a domain exactly', () => {
    expect(permissionPattern('localhost')).toBe('*://localhost/*');
    expect(permissionPattern('127.0.0.1')).toBe('*://127.0.0.1/*');
  });
});
