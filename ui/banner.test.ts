import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountBanner, type BannerContent } from './banner';

const content = (standing: BannerContent['standing']): BannerContent => ({
  standing,
  title: 'You had a bad experience here',
  detail: 'Slow delivery · March 2026',
  brand: 'Shop Again?',
  hideLabel: 'Hide',
  showLabel: 'Show your notes about this shop',
});

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  window.dispatchEvent(new Event('scroll'));
}

describe('mountBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    scrollTo(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.querySelector('shop-again-banner')?.remove();
  });

  it('adds one element to the page and keeps its inside closed to the page', () => {
    const host = mountBanner({ content: content('bad'), css: '', collapsed: false, onCollapse: vi.fn() });
    expect(host.parentElement).toBe(document.documentElement);
    expect(host.shadowRoot).toBeNull();
  });

  it('keeps a warning up until the user scrolls on, and reports that once', () => {
    const onCollapse = vi.fn();
    mountBanner({ content: content('bad'), css: '', collapsed: false, onCollapse });

    vi.advanceTimersByTime(60_000);
    scrollTo(40);
    expect(onCollapse).not.toHaveBeenCalled();

    scrollTo(400);
    scrollTo(800);
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('gets good news out of the way by itself', () => {
    const onCollapse = vi.fn();
    mountBanner({ content: content('good'), css: '', collapsed: false, onCollapse });

    vi.advanceTimersByTime(5_000);
    expect(onCollapse).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2_000);
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('stays quiet for a shop that was already seen this session', () => {
    const onCollapse = vi.fn();
    mountBanner({ content: content('good'), css: '', collapsed: true, onCollapse });

    vi.advanceTimersByTime(60_000);
    scrollTo(800);
    expect(onCollapse).not.toHaveBeenCalled();
  });
});
