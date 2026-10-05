type Child = Node | string | false | null | undefined;
type Props = Record<string, string | boolean | undefined | ((event: Event) => void)>;

/**
 * Creates an element. Props are attributes, except functions, which become
 * listeners (`onclick`, `onsubmit`). Text only ever enters the page as text
 * nodes, never as markup, because notes and shop names are free text.
 */
export function h<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (typeof value === 'function') element.addEventListener(name.slice(2), value);
    else element.setAttribute(name, value === true ? '' : value);
  }
  element.append(...present(children));
  return element;
}

/** Replaces what the element holds, with the same children `h` accepts. */
export function fill(element: Element, ...children: Child[]): void {
  element.replaceChildren(...present(children));
}

function present(children: Child[]): (Node | string)[] {
  return children.filter((child) => child !== false && child != null);
}
