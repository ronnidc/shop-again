import { permissionPattern } from '@/core/domain';
import { browser } from './browser';
import type { BannerMode } from './store';

// The extension has no access to any site when installed. Access is what lets
// the banner appear in a shop, and the user chooses in the settings whether it
// is asked for shop by shop, given for every site once, or never.

const EVERY_SITE = '*://*/*';

/**
 * Asks for access to the shops, in one prompt. Must be called directly in a
 * click or key handler, before any await: Firefox rejects the request once the
 * user gesture is gone. Resolves false when the user declines.
 */
export function requestBanner(domains: string[]): Promise<boolean> {
  return request(domains.map(permissionPattern));
}

export function requestBannerEverywhere(): Promise<boolean> {
  return request([EVERY_SITE]);
}

/** Asks the way the user chose, or not at all. The same rules as above apply. */
export function askForBanner(mode: BannerMode, domain: string): Promise<boolean> {
  if (mode === 'off') return Promise.resolve(false);
  return mode === 'all' ? requestBannerEverywhere() : requestBanner([domain]);
}

export function hasBanner(domain: string): Promise<boolean> {
  return browser.permissions.contains({ origins: [permissionPattern(domain)] });
}

export function releaseBanner(domain: string): Promise<boolean> {
  return release(permissionPattern(domain));
}

export function releaseBannerEverywhere(): Promise<boolean> {
  return release(EVERY_SITE);
}

/** Gives back every site the user has given access to. */
export async function releaseAllBanners(): Promise<void> {
  for (const origin of await grantedPatterns()) await release(origin);
}

/** Every origin pattern the extension has access to right now. */
export async function grantedPatterns(): Promise<string[]> {
  const { origins = [] } = await browser.permissions.getAll();
  return origins;
}

export function onBannerAccessChange(listener: () => void): void {
  browser.permissions.onAdded.addListener(listener);
  browser.permissions.onRemoved.addListener(listener);
}

function request(origins: string[]): Promise<boolean> {
  return browser.permissions.request({ origins }).catch(() => false);
}

// A pattern from the manifest, such as localhost in development, cannot be
// given back. That is not an error worth stopping for.
function release(origin: string): Promise<boolean> {
  return browser.permissions.remove({ origins: [origin] }).catch(() => false);
}
