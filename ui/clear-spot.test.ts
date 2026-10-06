import { describe, expect, it } from 'vitest';
import { coversSomething, isInteractive, isOccupied, probePoints } from './clear-spot';
import { h } from './dom';

describe('isInteractive', () => {
  it('knows links, buttons and form fields', () => {
    expect(isInteractive(h('a', { href: '/' }))).toBe(true);
    expect(isInteractive(h('button', {}))).toBe(true);
    expect(isInteractive(h('input', {}))).toBe(true);
  });

  it('knows elements that act as buttons', () => {
    expect(isInteractive(h('div', { role: 'button' }))).toBe(true);
    expect(isInteractive(h('div', { tabindex: '0' }))).toBe(true);
    const pointer = h('div', { style: 'cursor: pointer' });
    document.body.append(pointer);
    expect(isInteractive(pointer)).toBe(true);
    pointer.remove();
  });

  it('looks a few steps up, for the icon inside a menu button', () => {
    const icon = h('span', {});
    const button = h('button', {}, h('span', {}, icon));
    document.body.append(button);
    expect(isInteractive(icon)).toBe(true);
    button.remove();
  });

  it('leaves plain content and the page itself alone', () => {
    expect(isInteractive(h('p', {}, 'Just text'))).toBe(false);
    expect(isInteractive(document.body)).toBe(false);
    expect(isInteractive(null)).toBe(false);
  });
});

describe('isOccupied', () => {
  it('counts text, images and clickable things', () => {
    expect(isOccupied(h('span', {}, 'Nyheder'))).toBe(true);
    expect(isOccupied(h('img', { src: 'logo.png' }))).toBe(true);
    expect(isOccupied(document.createElementNS('http://www.w3.org/2000/svg', 'path'))).toBe(true);
    expect(isOccupied(h('a', { href: '/' }))).toBe(true);
  });

  it('treats a wrapper with only elements inside, and the page itself, as a gap', () => {
    expect(isOccupied(h('div', {}, h('span', {}, 'Inside')))).toBe(false);
    expect(isOccupied(h('header', {}, ' \n '))).toBe(false);
    expect(isOccupied(document.body)).toBe(false);
    expect(isOccupied(null)).toBe(false);
  });
});

describe('coversSomething', () => {
  const rect = new DOMRect(100, 0, 44, 28);

  it('probes the middle and the corners', () => {
    expect(probePoints(rect)).toEqual([
      [122, 14],
      [102, 2],
      [142, 2],
      [102, 26],
      [142, 26],
    ]);
  });

  it('is true as soon as one probe hits something clickable', () => {
    const button = h('button', {});
    expect(coversSomething(rect, (x) => (x > 140 ? button : null))).toBe(true);
    expect(coversSomething(rect, () => h('p', {}))).toBe(false);
  });
});
