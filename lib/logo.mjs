// The NCode logo kit: the {N} mark as SVG masters, and every PNG and ICO export each place it appears in asks for.
// Ported from the kit generator of NCodeGroup/project-template: the drawing code is unchanged, the geometry is data
// in src/logo/ncode.json, and the three colors are the blue ramp's anchors in src/tokens.source.json.
//
// The mark is drawn on a 64-unit grid from straight lines and circular arcs, so the SVG paths and the PNG pixels come
// from the same geometry. Sizes from 16 to 48 pixels have their own pixel-fitted geometry, because a scaled-down master
// puts its strokes between pixels.
import { decodeIco, icoBytes } from './ico.mjs';
import { RAD_TO_DEG, asin, num, roundHalfEven } from './numbers.mjs';
import { Contour, Shape, parsePath, rectangle, roundedRectangle } from './geometry.mjs';
import { decodePng, pngBytes, sameImage } from './png.mjs';
import { Canvas } from './raster.mjs';

// The largest file each platform takes, in bytes.
const NUGET_LIMIT = 1024 * 1024; // 1 MB
const GITHUB_LIMIT = 1024 * 1024; // 1 MB
const GITLAB_LIMIT = 200 * 1024; // 200 KiB
const MYAPPS_LIMIT = 100 * 1000; // 100 KB
export const LIMITS = { nuget: NUGET_LIMIT, github: GITHUB_LIMIT, gitlab: GITLAB_LIMIT, myapps: MYAPPS_LIMIT };

const WHITE = '#FFFFFF';
const BLACK = '#000000';

/** A drawing of the mark with the defaults every spec shares. */
function spec(fields) {
  return Object.freeze({ taper: 0.0, beakY: null, staircase: null, ...fields });
}

/**
 * The outline of a constant-width stroke: hook, stem, beak, stem, hook.
 *
 * The hooks and the arcs into the beak are quarter circles. The two arcs into the beak cross on the
 * inner side, which leaves the notch a curly brace has there; `taper` moves their centers together,
 * so the beak narrows to a tip `stroke - taper` high.
 */
export function leftBrace(s) {
  const half = s.stroke / 2;
  const [top, bottom] = s.braceY;
  const [tipX, hookX] = s.brace;
  const stemX = tipX + s.beakRadius; // the stem's center line
  const beakY = s.beakY === null ? (top + bottom) / 2 : s.beakY;
  const reach = s.beakRadius - s.taper / 2; // from an arc's center to the beak's center line
  const hookTop = [stemX + s.hookRadius, top + half + s.hookRadius];
  const hookBottom = [stemX + s.hookRadius, bottom - half - s.hookRadius];
  const beakUpper = [tipX, beakY - reach];
  const beakLower = [tipX, beakY + reach];
  const [hookOut, hookIn] = [s.hookRadius + half, s.hookRadius - half];
  const [beakOut, beakIn] = [s.beakRadius + half, s.beakRadius - half];
  const notch = asin(reach / beakOut) * RAD_TO_DEG; // where the outer beak arcs cross, seen from a center
  const tipHalf = (s.stroke - s.taper) / 2;

  const c = new Contour([hookX, top]);
  c.line(hookTop[0], top).arc(...hookTop, hookOut, 270, 180); // over the top hook
  c.line(stemX - half, beakUpper[1]).arc(...beakUpper, beakIn, 0, 90); // down the stem, into the beak
  c.line(tipX, beakY + tipHalf).arc(...beakLower, beakIn, 270, 360); // the tip, and out of the beak
  c.line(stemX - half, hookBottom[1]).arc(...hookBottom, hookOut, 180, 90);
  c.line(hookX, bottom).line(hookX, bottom - s.stroke); // the bottom hook's end
  c.line(hookBottom[0], bottom - s.stroke).arc(...hookBottom, hookIn, 90, 180);
  c.line(stemX + half, beakLower[1]).arc(...beakLower, beakOut, 0, -notch); // up into the notch
  c.arc(...beakUpper, beakOut, notch, 0); // and out of it
  c.line(stemX + half, hookTop[1]).arc(...hookTop, hookIn, 180, 270);
  c.line(hookX, top + s.stroke);
  return new Shape([c.reversed()]); // clockwise, as every outline here is
}

function letterN(s) {
  const [[x0, x1], [top, bottom]] = [s.nX, s.nY];
  if (s.staircase) {
    // stems, with the diagonal as whole-pixel steps
    const [columns, rows] = s.staircase;
    let shape = rectangle(x0, top, s.stem, bottom - top).add(rectangle(x1 - s.stem, top, s.stem, bottom - top));
    for (let i = 0; i < columns; i++) shape = shape.add(rectangle(x0 + s.stem + i, top + i * rows, 1, rows));
    return shape;
  }
  const run = x1 - s.diagonal - x0; // the diagonal's edges run from corner to corner
  const rise = bottom - top;
  const joinsRight = top + (rise * (x1 - s.stem - x0 - s.diagonal)) / run;
  const joinsLeft = top + (rise * s.stem) / run;
  const c = new Contour([x0, top]);
  c.line(x0 + s.diagonal, top).line(x1 - s.stem, joinsRight).line(x1 - s.stem, top).line(x1, top);
  c.line(x1, bottom).line(x1 - s.diagonal, bottom).line(x0 + s.stem, joinsLeft);
  c.line(x0 + s.stem, bottom).line(x0, bottom);
  return new Shape([c]);
}

/** The palette and the drawings of one kit, from the mark's geometry and the token ramps. */
export function createLogo(model, geometry) {
  const blue = model.ramps.blue.steps;
  const BLUE = blue['600'].hex; // NCode Blue: the mark on light backgrounds, and the tile
  const LIGHT = blue['300'].hex; // NCode Blue Light: the mark on dark backgrounds
  const NAVY = blue['900'].hex; // NCode Navy: the dark tile and the dark cards
  const INKS = { blue: BLUE, light: LIGHT, white: WHITE, black: BLACK }; // transparent
  const TILES = { blue: [BLUE, WHITE], white: [WHITE, BLUE], dark: [NAVY, LIGHT] }; // fill, mark
  const CARDS = { light: [WHITE, BLUE], dark: [NAVY, LIGHT], blue: [BLUE, WHITE] }; // fill, lockup

  const MASTER = spec(geometry.master);
  const FITTED = Object.fromEntries(Object.entries(geometry.fitted).map(([size, fields]) => [size, spec(fields)]));
  const GRID = MASTER.size;
  const RADIUS = geometry.tileRadius.value / GRID; // corner radius of a rounded tile, as a fraction of its width
  const { tight: TIGHT, regular: REGULAR, safe: SAFE } = geometry.fit;
  const WORDMARK = parsePath(geometry.wordmark.path);
  const LOCKUP_WIDTH = geometry.wordmark.lockupWidth.value;

  function mark(s = MASTER) {
    const brace = leftBrace(s);
    return brace.add(letterN(s)).add(brace.mirrored(s.size / 2));
  }

  /** The mark in the pixels of a size-by-size image: fitted where there is a fitted drawing. */
  function markFor(size, fit = TIGHT) {
    if (fit === TIGHT && size in FITTED) return mark(FITTED[size]);
    return mark().placed((size / GRID) * fit, (size * (1 - fit)) / 2, (size * (1 - fit)) / 2);
  }

  function lockup(scale = 1.0, dx = 0.0, dy = 0.0) {
    return [mark().placed(scale, dx, dy), WORDMARK.placed(scale, dx, dy)];
  }

  function drawMark(size, ink, fit = TIGHT) {
    return new Canvas(size, size).fill(markFor(size, fit), ink).image();
  }

  /** corners: 'rounded' leaves the corners transparent; 'square' fills the whole image. */
  function drawTile(size, tile, corners, fit) {
    const [fill, ink] = TILES[tile];
    const canvas = corners === 'square'
      ? new Canvas(size, size, fill)
      : new Canvas(size, size).fill(roundedRectangle(0, 0, size, size, RADIUS * size), fill);
    return canvas.fill(markFor(size, fit), ink).image();
  }

  function drawLockup(height, ink) {
    const scale = height / GRID;
    const [symbol, word] = lockup(scale);
    return new Canvas(roundHalfEven(LOCKUP_WIDTH * scale), height).fill(symbol, ink).fill(word, ink).image();
  }

  /** The lockup centered on a solid card, half the card wide at most. */
  function drawCard(w, h, card) {
    const [fill, ink] = CARDS[card];
    const scale = Math.floor(Math.min((0.5 * w) / LOCKUP_WIDTH, (0.4 * h) / GRID) * 4) / 4;
    const dx = roundHalfEven((w - LOCKUP_WIDTH * scale) / 2);
    const dy = roundHalfEven((h - GRID * scale) / 2);
    const [symbol, word] = lockup(scale, dx, dy);
    return new Canvas(w, h, fill).fill(symbol, ink).fill(word, ink).image();
  }

  /** Blue, or light blue when the viewer's system or browser asks for a dark scheme. */
  function autoStyle(selector = 'path') {
    return `<style>${selector}{fill:${BLUE}}@media (prefers-color-scheme:dark){${selector}{fill:${LIGHT}}}</style>`;
  }

  return {
    colors: { BLUE, LIGHT, NAVY }, INKS, TILES, CARDS, MASTER, FITTED, GRID, TIGHT, REGULAR, SAFE, WORDMARK, LOCKUP_WIDTH,
    mark, markFor, lockup, drawMark, drawTile, drawLockup, drawCard, autoStyle,
  };
}

function svg(w, h, body, title = 'NCode') {
  const size = `width="${num(w, 3)}" height="${num(h, 3)}" viewBox="0 0 ${num(w, 3)} ${num(h, 3)}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" ${size} role="img" aria-label="${title}">` +
    `<title>${title}</title>${body}</svg>\n`;
}

/** Percent-encodes every character but letters, digits and _ . - ~. */
function quote(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// ---- The kit -------------------------------------------------------------------------------------
/** Each file's bytes, and what an existing file must decode to for the run to keep it. */
class Kit {
  constructor() {
    this.files = new Map();
  }

  text(name, content) {
    this.files.set(name, { data: Buffer.from(content, 'utf8') });
  }

  png(name, image, { limit = null, opaque = false } = {}) {
    const data = pngBytes(image);
    if (limit !== null && data.length > limit) throw new Error(`${name} is ${data.length} bytes, over the ${limit} its platform allows`);
    if (opaque && image.data.some((v, i) => i % 4 === 3 && v < 255)) throw new Error(`${name} must have no transparency`);
    this.files.set(name, { data, image });
  }

  ico(name, images, bitmapsBelow = 0) {
    const data = icoBytes(images, bitmapsBelow);
    this.files.set(name, { data, entries: images.map((image) => ({ png: image.width >= bitmapsBelow, image })) });
  }
}

/** Whether the existing bytes hold the file: the same bytes, or the same pixels stored the same way. */
export function holds(existing, file) {
  if (existing.equals(file.data)) return true;
  try {
    if (file.image) return sameImage(decodePng(existing), file.image);
    if (file.entries) {
      const entries = decodeIco(existing);
      return entries.length === file.entries.length &&
        entries.every((e, i) => e.png === file.entries[i].png && sameImage(e.image, file.entries[i].image));
    }
  } catch {
    return false; // a file that doesn't decode is rewritten
  }
  return false;
}

/** Every file of the kit, by its path inside the kit's folder. */
export function logoKit(logo) {
  const { INKS, TILES, CARDS, LOCKUP_WIDTH, REGULAR, TIGHT, SAFE, GRID, FITTED, WORDMARK } = logo;
  const { BLUE, LIGHT } = logo.colors;
  const { mark, drawMark, drawTile, drawLockup, drawCard, autoStyle } = logo;
  const kit = new Kit();
  const master = mark().path();
  const word = WORDMARK.path(2);
  const regular = mark().placed(REGULAR, (GRID * (1 - REGULAR)) / 2, (GRID * (1 - REGULAR)) / 2).path();

  // mark/: the mark alone on a transparent background.
  for (const [name, ink] of Object.entries(INKS)) {
    kit.text(`mark/ncode-mark-${name}.svg`, svg(64, 64, `<path fill="${ink}" d="${master}"/>`));
    for (const size of [256, 1024]) kit.png(`mark/ncode-mark-${name}-${size}.png`, drawMark(size, ink));
  }
  kit.text('mark/ncode-mark-auto.svg', svg(64, 64, `${autoStyle()}<path d="${master}"/>`));

  // tile/: the mark on a solid tile, the app-icon form. "square" has no rounded corners, for a
  // platform that cuts its own.
  for (const [name, [fill, ink]] of Object.entries(TILES)) {
    const glyph = `<path fill="${ink}" d="${regular}"/>`;
    const rounded = `<rect width="64" height="64" rx="14" fill="${fill}"/>`;
    const square = `<path fill="${fill}" d="M0 0H64V64H0Z"/>`;
    kit.text(`tile/ncode-tile-${name}.svg`, svg(64, 64, rounded + glyph));
    kit.text(`tile/ncode-tile-${name}-square.svg`, svg(64, 64, square + glyph));
    for (const size of [256, 1024]) kit.png(`tile/ncode-tile-${name}-${size}.png`, drawTile(size, name, 'rounded', REGULAR));
    kit.png(`tile/ncode-tile-${name}-square-1024.png`, drawTile(1024, name, 'square', REGULAR), { opaque: true });
  }

  // lockup/: the mark and the wordmark.
  for (const [name, ink] of Object.entries(INKS)) {
    kit.text(`lockup/ncode-lockup-${name}.svg`, svg(LOCKUP_WIDTH, 64, `<path fill="${ink}" d="${master}${word}"/>`));
    for (const height of [128, 512]) kit.png(`lockup/ncode-lockup-${name}-h${height}.png`, drawLockup(height, ink));
  }
  kit.text('lockup/ncode-lockup-auto.svg', svg(LOCKUP_WIDTH, 64, `${autoStyle()}<path d="${master}${word}"/>`));

  // favicon/: the blue tile. The ICO holds a pixel-fitted drawing per size; the SVG is the 32-pixel
  // drawing, which is sharp at 32 and at its multiples.
  const small = mark(FITTED[32]).path();
  const iconSizes = [16, 20, 24, 32, 40, 48, 64];
  kit.ico('favicon/favicon.ico', iconSizes.map((s) => drawTile(s, 'blue', 'rounded', TIGHT)));
  kit.text('favicon/favicon.svg', svg(32, 32, `<rect width="32" height="32" rx="7" fill="${BLUE}"/>` +
    `<path fill="${WHITE}" d="${small}"/>`));
  kit.png('favicon/apple-touch-icon.png', drawTile(180, 'blue', 'square', REGULAR), { opaque: true });
  kit.png('favicon/icon-192.png', drawTile(192, 'blue', 'rounded', REGULAR));
  kit.png('favicon/icon-512.png', drawTile(512, 'blue', 'rounded', REGULAR));
  kit.png('favicon/icon-maskable-512.png', drawTile(512, 'blue', 'square', SAFE), { opaque: true });
  kit.text('favicon/site.webmanifest', `${JSON.stringify({
    name: 'NCode',
    short_name: 'NCode',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    theme_color: BLUE,
    background_color: WHITE,
    display: 'standalone',
  }, null, 2)}\n`);
  // The same without a tile: blue for a light tab strip, light blue for a dark one.
  kit.ico('favicon/transparent/favicon.ico', iconSizes.map((s) => drawMark(s, BLUE)));
  kit.ico('favicon/transparent/favicon-dark.ico', iconSizes.map((s) => drawMark(s, LIGHT)));
  kit.text('favicon/transparent/favicon.svg', svg(32, 32, `${autoStyle()}<path d="${small}"/>`));

  // windows/: an application icon. Bitmaps up to 64 pixels, so System.Drawing and the resource
  // compiler read it, and a PNG at 256.
  kit.ico('windows/ncode.ico', [...iconSizes, 256].map((s) => drawTile(s, 'blue', 'rounded', TIGHT)), 256);

  // nuget/: 128 by 128, as NuGet recommends: twice the master, so every stem is on whole pixels, and
  // still is when a client shows the icon at half or a quarter of that.
  for (const name of Object.keys(TILES)) {
    kit.png(`nuget/ncode-nuget-tile-${name}.png`, drawTile(128, name, 'rounded', TIGHT), { limit: NUGET_LIMIT });
  }
  for (const name of ['blue', 'light']) kit.png(`nuget/ncode-nuget-mark-${name}.png`, drawMark(128, INKS[name]), { limit: NUGET_LIMIT });

  // profile/: a square that a circle can be cut from (GitHub and GitLab users, Gravatar, X, LinkedIn).
  for (const name of Object.keys(TILES)) {
    kit.png(`profile/ncode-profile-tile-${name}.png`, drawTile(1024, name, 'square', SAFE), { opaque: true });
  }
  for (const name of ['blue', 'light']) kit.png(`profile/ncode-profile-mark-${name}.png`, drawMark(1024, INKS[name], SAFE));

  // github/: an organization's picture (about 500 pixels, under 1 MB) and a repository's social
  // preview (1280 by 640, under 1 MB).
  for (const name of Object.keys(TILES)) {
    kit.png(`github/ncode-github-avatar-tile-${name}.png`, drawTile(500, name, 'square', REGULAR),
      { limit: GITHUB_LIMIT, opaque: true });
  }
  for (const name of ['blue', 'light']) {
    kit.png(`github/ncode-github-avatar-mark-${name}.png`, drawMark(500, INKS[name], REGULAR), { limit: GITHUB_LIMIT });
  }
  for (const name of Object.keys(CARDS)) {
    kit.png(`github/ncode-github-social-${name}.png`, drawCard(1280, 640, name), { limit: GITHUB_LIMIT, opaque: true });
  }

  // gitlab/: a group's or project's avatar (192 pixels, 200 KiB at most). A logo.png at a
  // repository's root is the project's avatar until one is uploaded.
  for (const name of Object.keys(TILES)) {
    kit.png(`gitlab/ncode-gitlab-avatar-tile-${name}.png`, drawTile(192, name, 'square', REGULAR),
      { limit: GITLAB_LIMIT, opaque: true });
  }
  for (const name of ['blue', 'light']) {
    kit.png(`gitlab/ncode-gitlab-avatar-mark-${name}.png`, drawMark(192, INKS[name], REGULAR), { limit: GITLAB_LIMIT });
  }
  kit.png('gitlab/logo.png', drawTile(192, 'blue', 'square', REGULAR), { limit: GITLAB_LIMIT, opaque: true });

  // myapps/: Microsoft Entra's My Apps takes exactly 215 by 215 pixels, PNG, 100 KB at most, and
  // asks for a solid background.
  for (const name of Object.keys(TILES)) {
    kit.png(`myapps/ncode-myapps-tile-${name}.png`, drawTile(215, name, 'square', REGULAR),
      { limit: MYAPPS_LIMIT, opaque: true });
  }

  // badge/: the mark cropped to its edges, as small a file as it gets, for a badge's logo. The .txt
  // files hold it as the value of Shields.io's logo parameter.
  const cropped = mark().placed(1, -4, -8).path(2);
  for (const name of ['white', 'blue', 'light']) {
    const badge = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 48">' +
      `<path fill="${INKS[name]}" d="${cropped}"/></svg>`;
    kit.text(`badge/ncode-badge-${name}.svg`, `${badge}\n`);
    const uri = `data:image/svg+xml;base64,${Buffer.from(badge, 'utf8').toString('base64')}`;
    kit.text(`badge/shields-logo-${name}.txt`, `${quote(uri)}\n`);
  }

  // social/: link previews (1200 by 630) and profile banners (1500 by 500).
  for (const name of Object.keys(CARDS)) {
    kit.png(`social/ncode-og-${name}.png`, drawCard(1200, 630, name), { opaque: true });
    kit.png(`social/ncode-banner-${name}.png`, drawCard(1500, 500, name), { opaque: true });
  }

  // outlines.json: the same geometry as path data, for a page or a component that draws the mark inline.
  const fitted = Object.fromEntries(Object.keys(FITTED).map((size) => [size, mark(FITTED[size]).path()]));
  kit.text('outlines.json', `${JSON.stringify({
    $description: 'The {N} mark and its lockup as SVG path data, filled with the nonzero rule. "mark" is the master on its 64-unit ' +
      'grid; "fitted" is the drawing for each small size, whose stems lie on whole pixels at that size; "brace" is the ' +
      "mark's left brace alone, which a right brace mirrors. Generated by build.mjs from src/logo/ncode.json.",
    colors: { blue: BLUE, light: LIGHT, navy: logo.colors.NAVY },
    mark: { viewBox: '0 0 64 64', d: master },
    brace: { viewBox: '4 8 12 48', d: leftBrace(logo.MASTER).path() },
    lockup: { viewBox: `0 0 ${num(LOCKUP_WIDTH, 3)} 64`, d: `${master}${word}` },
    fitted: Object.fromEntries(Object.entries(fitted).map(([size, d]) => [size, { viewBox: `0 0 ${size} ${size}`, d }])),
  }, null, 2)}\n`);
  return kit.files;
}
