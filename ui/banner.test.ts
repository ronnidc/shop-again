import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountBanner, type BannerContent, type BannerOptions } from './banner';

const content = (standing: BannerContent['standing']): BannerContent => ({
  standing,
  title: 'You had a bad experience here',
  detail: 'Slow delivery · March 2026',
  brand: 'Shop Again?',
  mark: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128"/></svg>',
  notesLabel: 'See notes',
  hideLabel: 'Hide',
  showLabel: 'Show your notes about this shop',
});

const options = (overrides: Partial<BannerOptions> = {}): BannerOptions => ({
  content: content('bad'),
  css: '',
  collapsed: false,
  tab: true,
  onCollapse: vi.fn(),
  onOpen: vi.fn(),
  ...overrides,
});

/** The banner's inside is closed to the page, so the test catches the root as it is made. */
function catchShadow(): () => ShadowRoot {
  let shadow: ShadowRoot | undefined;
  const attach = Element.prototype.attachShadow;
  vi.spyOn(Element.prototype, 'attachShadow').mockImplementation(function (this: Element, init) {
    shadow = attach.call(this, init);
    return shadow;
  });
  return () => shadow!;
}

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  window.dispatchEvent(new Event('scroll'));
}

describe('mountBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    scrollTo(0);
    document.elementFromPoint = vi.fn(() => null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.querySelector('shop-again-banner')?.remove();
  });

  it('asks for the notes when the link is clicked, and not for a close', () => {
    const onOpen = vi.fn();
    const shadow = catchShadow();
    mountBanner(options({ onOpen }));

    shadow().querySelector<HTMLButtonElement>('.close')!.click();
    expect(onOpen).not.toHaveBeenCalled();

    shadow().querySelector<HTMLButtonElement>('.notes')!.click();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('adds one element to the page and keeps its inside closed to the page', () => {
    const host = mountBanner(options());
    expect(host.parentElement).toBe(document.documentElement);
    expect(host.shadowRoot).toBeNull();
  });

  it('keeps a warning up until the user scrolls on, and reports that once', () => {
    const onCollapse = vi.fn();
    mountBanner(options({ onCollapse }));

    vi.advanceTimersByTime(60_000);
    scrollTo(40);
    expect(onCollapse).not.toHaveBeenCalled();

    scrollTo(400);
    scrollTo(800);
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('gets good news out of the way by itself', () => {
    const onCollapse = vi.fn();
    mountBanner(options({ content: content('good'), onCollapse }));

    vi.advanceTimersByTime(5_000);
    expect(onCollapse).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2_000);
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('stays quiet for a shop that was already seen this session', () => {
    const onCollapse = vi.fn();
    mountBanner(options({ collapsed: true, onCollapse }));

    vi.advanceTimersByTime(60_000);
    scrollTo(800);
    expect(onCollapse).not.toHaveBeenCalled();
  });

  it('looks for a free spot for the tab once the bar is out of the way', () => {
    mountBanner(options());
    expect(document.elementFromPoint).not.toHaveBeenCalled();

    scrollTo(800);
    expect(document.elementFromPoint).toHaveBeenCalled();
  });

  it('does not look for a spot when the user wants no tab', () => {
    mountBanner(options({ collapsed: true, tab: false }));
    expect(document.elementFromPoint).not.toHaveBeenCalled();
  });
});
