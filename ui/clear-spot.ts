// Finds out whether a spot on a shop's page is free, so the banner's tab can
// stay off the shop's own menus and buttons.

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
    if (element === document.body || element === document.documentElement) return false;
    if (INTERACTIVE_TAGS.has(element.tagName)) return true;
    if (INTERACTIVE_ROLES.has(element.getAttribute('role') ?? '')) return true;
    if (element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1') return true;
    if (getComputedStyle(element).cursor === 'pointer') return true;
    element = element.parentElement;
  }
  return false;
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

/** Whether something clickable lies under any part of the rectangle. */
export function coversSomething(
  rect: DOMRect,
  hit: (x: number, y: number) => Element | null = (x, y) => document.elementFromPoint(x, y),
): boolean {
  return probePoints(rect).some(([x, y]) => isInteractive(hit(x, y)));
}
