import { getDomain } from 'tldts';

/**
 * The key a shop is stored under, from a URL, a host name or whatever the user
 * typed. It is the registrable domain, so `www.`, `shop.` and checkout
 * subdomains all count as the same shop. Returns null for anything that is not
 * a web address.
 */
export function shopKey(input: string): string | null {
  const url = toUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host) return null;
  // Private suffixes keep shops on shared platforms apart, so
  // `one.myshopify.com` and `two.myshopify.com` are two shops.
  const domain = getDomain(host, { allowPrivateDomains: true });
  if (domain) return domain;
  return isBareHost(host) ? host : null;
}

/**
 * The match pattern that gives the extension access to a shop, used both for
 * asking permission and for where the banner runs.
 */
export function permissionPattern(domain: string): string {
  return isBareHost(domain) ? `*://${domain}/*` : `*://*.${domain}/*`;
}

function toUrl(input: string): URL | null {
  const text = input.trim();
  if (!text) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text);
  try {
    const url = new URL(hasScheme ? text : `https://${text}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** Hosts without a registrable domain that are still real addresses. */
function isBareHost(host: string): boolean {
  return host === 'localhost' || /^\d+(\.\d+){3}$/.test(host);
}
