// Finds out whether a spot on a shop's page is free, so the banner's tab can
// sit in a gap instead of on the shop's own menus, buttons, text and images.

const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'LABEL']);
const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'menuitem',
  'tab',
  'checkbox',
  'switch',
  'combobox',
  'searchbox',
  'textbox',
]);
const MEDIA_TAGS = new Set(['IMG', 'PICTURE', 'VIDEO', 'CANVAS', 'IFRAME']);
const SVG = 'http://www.w3.org/2000/svg';

/** How far up from the hit element a clickable parent still counts. */
const ANCESTORS = 4;

/**
 * Whether the element, or something it sits in, is there to be clicked. A
 * pointer cursor counts too, because many menus are plain elements with a
 * click handler.
 */
export function isInteractive(hit: Element | null): boolean {
  let element = hit;
  for (let depth = 0; element && depth <= ANCESTORS; depth++) {
    if (isPage(element)) return false;
    if (INTERACTIVE_TAGS.has(element.tagName)) return true;
    if (INTERACTIVE_ROLES.has(element.getAttribute('role') ?? '')) return true;
    if (element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1') return true;
    if (getComputedStyle(element).cursor === 'pointer') return true;
    element = element.parentElement;
  }
  return false;
}

/**
 * Whether the element shows something of its own at that spot: text, an
 * image, or anything clickable. A wrapper with only other elements inside is
 * a gap.
 */
export function isOccupied(hit: Element | null): boolean {
  if (!hit || isPage(hit)) return false;
  if (hit.namespaceURI === SVG || MEDIA_TAGS.has(hit.tagName)) return true;
  if (hasOwnText(hit)) return true;
  return isInteractive(hit);
}

/** The center and the four corners, a little inside the edge. */
export function probePoints(rect: DOMRect): [number, number][] {
  const inset = 2;
  return [
    [rect.left + rect.width / 2, rect.top + rect.height / 2],
    [rect.left + inset, rect.top + inset],
    [rect.right - inset, rect.top + inset],
    [rect.left + inset, rect.bottom - inset],
    [rect.right - inset, rect.bottom - inset],
  ];
}

/** Whether any part of the rectangle lies over something the page shows there. */
export function coversSomething(
  rect: DOMRect,
  hit: (x: number, y: number) => Element | null = (x, y) => document.elementFromPoint(x, y),
): boolean {
  return probePoints(rect).some(([x, y]) => isOccupied(hit(x, y)));
}

function isPage(element: Element): boolean {
  return element === document.body || element === document.documentElement;
}

function hasOwnText(element: Element): boolean {
  return [...element.childNodes].some(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
  );
}
