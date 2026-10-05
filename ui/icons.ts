import type { Standing } from '@/core/model';

const SVG = 'http://www.w3.org/2000/svg';

// Stroke paths on a 24 by 24 grid. A verdict is never shown by color alone,
// so each standing has its own shape.
const PATHS = {
  good: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M7.5 12.5l3 3 6-6.5'],
  bad: ['M12 3L2 20h20L12 3z', 'M12 10v4', 'M12 17h.01'],
  mixed: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M8 12h8'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
} satisfies Record<Standing | 'close', string[]>;

export function icon(name: keyof typeof PATHS): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of PATHS[name]) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
