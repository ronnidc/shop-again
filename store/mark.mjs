#!/usr/bin/env node
/**
 * Draws the mark, the wordmark and the name into assets/ and store/promo/ as
 * clean SVG paths:
 *
 *   node store/mark.mjs && store/icons.sh
 *
 * The geometry is measured in pixels on the reference drawing (a 1303 by 1200
 * raster, kept out of the repo) and mapped into a 128 unit viewBox, so every
 * number below is a measurement, not magic. The question mark and the text are
 * Poppins glyphs converted to paths, so the files depend on no installed font.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { font } from './fonts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAVY = '#1e2a64';
const r1 = (n) => Math.round(n * 10) / 10;

async function load(file) {
  const bytes = await font(file);
  return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
const bold = await load('Poppins-Bold.ttf');
const medium = await load('Poppins-Medium.ttf');
const black = await load('Poppins-Black.ttf');

/**
 * The mark's shapes in reference pixels. Every gap (around the handle legs,
 * around the badge) is the same width and is cut out of the bag's outline
 * rather than painted white, so the mark works on any background.
 */
function geometry({ handleStroke, badgeR, badgeY, glyphFont, glyphEm, gap, notches = true }) {
  const cx = 600; // handle and bag center line
  const y0 = 340; // bag top edge
  const y1 = 1020; // bag bottom edge
  const wt = 262; // half width at the top
  const wb = 358; // half width at the bottom
  const rc = 48; // bag corner radius
  const hoopR = 128; // handle center-line radius
  const rise = 33; // straight leg above the rim before the hoop starts
  const legEnd = notches ? 470 : y0; // where the legs end, inside the bag or at its rim
  const slotHalf = handleStroke / 2 + gap; // notch around each leg
  const slotBottom = legEnd + handleStroke / 2 + gap;
  const bx = 870; // badge center
  const by = badgeY;
  const gapR = badgeR + gap; // the bite the badge takes out of the bag

  // Corner fillets: tangent distance t = r / tan(angle / 2) along each edge.
  const slant = Math.atan2(wb - wt, y1 - y0); // side lean from vertical
  const tTop = rc / Math.tan((Math.PI / 2 + slant) / 2);
  const tBottom = rc / Math.tan((Math.PI / 2 - slant) / 2);
  const ux = Math.sin(slant); // the sides' unit vector, x away from the center
  const uy = Math.cos(slant);

  // Where the bite circle meets the right side and the bottom edge.
  const bottomX = bx - Math.sqrt(gapR ** 2 - (y1 - by) ** 2);
  const rx0 = cx + wt;
  const dx = wb - wt;
  const dy = y1 - y0;
  // (rx0 + dx s - bx)^2 + (y0 + dy s - by)^2 = gapR^2, take the smaller s.
  const A = dx * dx + dy * dy;
  const B = 2 * (dx * (rx0 - bx) + dy * (y0 - by));
  const C = (rx0 - bx) ** 2 + (y0 - by) ** 2 - gapR ** 2;
  const s = (-B - Math.sqrt(B * B - 4 * A * C)) / (2 * A);
  const sideX = rx0 + dx * s;
  const sideY = y0 + dy * s;

  const legL = cx - hoopR;
  const legR = cx + hoopR;
  const notch = (x) =>
    notches
      ? `L${x - slotHalf} ${y0}V${slotBottom - slotHalf}A${slotHalf} ${slotHalf} 0 0 0 ${x + slotHalf} ${slotBottom - slotHalf}V${y0}`
      : '';

  const bag = [
    `M${cx - wt + tTop} ${y0}`,
    notch(legL),
    notch(legR),
    `L${rx0 - tTop} ${y0}`,
    `A${rc} ${rc} 0 0 1 ${rx0 + tTop * ux} ${y0 + tTop * uy}`,
    `L${sideX} ${sideY}`,
    `A${gapR} ${gapR} 0 0 0 ${bottomX} ${y1}`,
    `L${cx - wb + tBottom} ${y1}`,
    `A${rc} ${rc} 0 0 1 ${cx - wb + tBottom * ux} ${y1 - tBottom * uy}`,
    `L${cx - wt - tTop * ux} ${y0 + tTop * uy}`,
    `A${rc} ${rc} 0 0 1 ${cx - wt + tTop} ${y0}`,
    'Z',
  ].join('');

  const handle = `M${legL} ${legEnd}V${y0 - rise}A${hoopR} ${hoopR} 0 0 1 ${legR} ${y0 - rise}V${legEnd}`;

  // The badge is a disk with the question mark cut out of it.
  const badge = `M${bx - badgeR} ${by}A${badgeR} ${badgeR} 0 1 1 ${bx + badgeR} ${by}A${badgeR} ${badgeR} 0 1 1 ${bx - badgeR} ${by}Z`;

  const bbox = {
    x0: cx - wb,
    x1: bx + badgeR,
    y0: y0 - rise - hoopR - handleStroke / 2,
    y1: Math.max(y1, by + badgeR),
  };
  return { bag, handle, badge, bx, by, badgeR, glyphFont, glyphEm: badgeR * glyphEm, handleStroke, bbox };
}

/**
 * The mark's elements in viewBox units, fitted into a box of the given size
 * with the given air on each side, and centered on (cx, cy).
 */
function mark(g, { box, air, cx, cy, color }) {
  const w = g.bbox.x1 - g.bbox.x0;
  const h = g.bbox.y1 - g.bbox.y0;
  const scale = (box * (1 - 2 * air)) / Math.max(w, h);
  const tx = cx - ((g.bbox.x0 + g.bbox.x1) / 2) * scale;
  const ty = cy - ((g.bbox.y0 + g.bbox.y1) / 2) * scale;
  const pt = (x, y) => `${r1(x * scale + tx)} ${r1(y * scale + ty)}`;
  const path = (d) =>
    d.replace(/([MLAV])([^MLAVZ]+)/g, (_, cmd, args) => {
      const n = args.trim().split(/\s+/).map(Number);
      if (cmd === 'V') return `V${r1(n[0] * scale + ty)}`;
      if (cmd === 'A') return `A${r1(n[0] * scale)} ${r1(n[1] * scale)} ${n[2]} ${n[3]} ${n[4]} ${pt(n[5], n[6])}`;
      return `${cmd}${pt(n[0], n[1])}`;
    });

  // The glyph, centered on the badge by its own bounding box.
  const em = g.glyphEm * scale;
  const b = g.glyphFont.getPath('?', 0, 0, em).getBoundingBox();
  const gx = g.bx * scale + tx - (b.x1 + b.x2) / 2;
  const gy = g.by * scale + ty - (b.y1 + b.y2) / 2;
  const glyph = g.glyphFont.getPath('?', gx, gy, em).toPathData(1);

  return {
    elements: [
      `<path d="${path(g.bag)}" fill="${color}"/>`,
      `<path d="${path(g.handle)}" fill="none" stroke="${color}" stroke-width="${r1(g.handleStroke * scale)}" stroke-linecap="round"/>`,
      `<path d="${path(g.badge)}${glyph}" fill="${color}" fill-rule="evenodd"/>`,
    ],
    badgeRight: (g.bx + g.badgeR) * scale + tx,
    badgeY: g.by * scale + ty,
  };
}

/**
 * An icon: the mark on a white rounded square (corner radius 22 percent),
 * inset from the 128 edge by `inset` and nudged up by `lift`, since the bag's
 * mass sits low and a geometrically centered mark looks low. The square has a
 * class so the extension's own pages, which inline the icon, can stroke it
 * where a white square would otherwise vanish.
 */
function icon(g, { inset, air, lift, comment }) {
  const tile = 128 - 2 * inset;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
    `  <!-- ${comment} -->`,
    `  <rect class="tile" x="${inset}" y="${inset}" width="${tile}" height="${tile}" rx="${Math.round(tile * 0.22)}" fill="#fff"/>`,
    ...mark(g, { box: tile, air, cx: 64, cy: 64 - lift, color: NAVY }).elements.map((el) => `  ${el}`),
    '</svg>',
    '',
  ].join('\n');
}

/** "Shop" in Poppins Bold and "Again?" in Poppins Medium, as one path. */
function name(x, baseline, size) {
  const shop = bold.getPath('Shop', x, baseline, size);
  const shopWidth = bold.getAdvanceWidth('Shop', size, { kerning: true });
  // A word space of 0.4 em, since a weight change at a normal space reads as
  // a seam inside one word.
  const space = 0.4 * size - 0.08 * size;
  const again = medium.getPath('Again?', x + shopWidth + space, baseline, size);
  const b1 = shop.getBoundingBox();
  const b2 = again.getBoundingBox();
  return {
    d: shop.toPathData(1) + again.toPathData(1),
    bbox: { x1: b1.x1, y1: Math.min(b1.y1, b2.y1), x2: b2.x2, y2: Math.max(b1.y2, b2.y2) },
  };
}

/** The mark on the left and the name on the right, the baseline on the badge's center line. */
function wordmark(g, { color, comment }) {
  const size = 72; // em, the capitals are about half the mark's height
  const capHeight = (bold.tables.os2.sCapHeight / bold.unitsPerEm) * size;
  const m = mark(g, { box: 128, air: 0.1, cx: 64, cy: 64, color });
  const probe = name(0, 0, size);
  const x = m.badgeRight + 0.6 * capHeight - probe.bbox.x1;
  const text = name(x, r1(m.badgeY), size);
  const width = Math.ceil(text.bbox.x2 + 8);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 128">`,
    `  <!-- ${comment} -->`,
    ...m.elements.map((el) => `  ${el}`),
    `  <path d="${text.d}" fill="${color}"/>`,
    '</svg>',
    '',
  ].join('\n');
}

/** The name alone, the viewBox tight around the letters. */
function nameOnly({ color, comment }) {
  const text = name(0, 0, 100);
  const { x1, y1, x2, y2 } = text.bbox;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r1(x1)} ${r1(y1)} ${r1(x2 - x1)} ${r1(y2 - y1)}">`,
    `  <!-- ${comment} -->`,
    `  <path d="${text.d}" fill="${color}"/>`,
    '</svg>',
    '',
  ].join('\n');
}

const full = geometry({ handleStroke: 54, badgeR: 195, badgeY: 825, glyphFont: bold, glyphEm: 1.75, gap: 29 });
// The toolbar sizes get a heavier handle, a bigger badge that hangs below the
// bag and a heavier glyph, and the handle meets the rim instead of running
// into it, because a 16 pixel render has about 14 pixels for the whole mark
// and the notches around the legs turn to mush there.
const small = geometry({ handleStroke: 72, badgeR: 300, badgeY: 815, glyphFont: black, glyphEm: 1.7, gap: 70, notches: false });

const files = {
  'assets/icon.svg': icon(full, {
    inset: 8,
    air: 0.09,
    lift: 2,
    comment:
      'The full mark, drawn by store/mark.mjs: a shopping bag with a hoop handle and a question badge on its lower right corner, in one dark blue. The question mark is a Poppins Bold glyph cut out of the badge. The white rounded square is part of the icon, inset 8 of 128 as the stores want air around an icon, so the blue never sits on a dark toolbar or a dark store page. Used from 48 pixels up, the toolbar sizes come from icon-small.svg.',
  }),
  'assets/icon-small.svg': icon(small, {
    inset: 0,
    air: 0.07,
    lift: 0,
    comment:
      'The small mark for the toolbar, 16 and 32 pixels, also inlined by the banner, drawn by store/mark.mjs: the bag with a heavier handle, a bigger badge and a Poppins Black question mark, filling the square, because the full mark\'s details turn to mush below 48 pixels.',
  }),
  'assets/wordmark.svg': wordmark(full, {
    color: NAVY,
    comment:
      'The wordmark for light backgrounds, drawn by store/mark.mjs: the mark and "Shop Again?" in Poppins Bold and Medium (SIL Open Font License 1.1), the text as paths.',
  }),
  'assets/wordmark-white.svg': wordmark(full, {
    color: '#fff',
    comment:
      'The wordmark for dark backgrounds, drawn by store/mark.mjs: the mark and "Shop Again?" in Poppins Bold and Medium (SIL Open Font License 1.1), the text as paths.',
  }),
  'store/promo/name-white.svg': nameOnly({
    color: '#fff',
    comment:
      'The name alone, for the promotional tiles that show the icon next to it, drawn by store/mark.mjs: "Shop Again?" in Poppins Bold and Medium, the text as paths.',
  }),
  'assets/name.svg': nameOnly({
    color: 'currentColor',
    comment:
      'The name alone in the current color, for the extension\'s own pages, which inline it next to the icon, drawn by store/mark.mjs: "Shop Again?" in Poppins Bold and Medium, the text as paths.',
  }),
};
for (const [file, body] of Object.entries(files)) {
  await writeFile(join(ROOT, file), body);
  console.log(`${file} ${body.length} bytes`);
}
