import { permissionPattern } from '@/core/domain';
import { browser } from './browser';

// The extension has no access to any site when installed. Access is asked for
// one shop at a time, and it is what lets the banner appear in that shop.

/**
 * Asks for access to the shops, in one prompt. Must be called directly in a
 * click or key handler, before any await: Firefox rejects the request once the
 * user gesture is gone. Resolves false when the user declines.
 */
export function requestBanner(domains: string[]): Promise<boolean> {
  return browser.permissions
    .request({ origins: domains.map(permissionPattern) })
    .catch(() => false);
}

export function hasBanner(domain: string): Promise<boolean> {
  return browser.permissions.contains({ origins: [permissionPattern(domain)] });
}

export function releaseBanner(domain: string): Promise<boolean> {
  return browser.permissions.remove({ origins: [permissionPattern(domain)] });
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
