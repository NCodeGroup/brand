// The NCode logo kits: every NCode mark, {N} and {id}, as SVG masters, and every PNG and ICO export each place it
// appears in asks for. The {N} drawing is ported from the kit generator of NCodeGroup/project-template, and the {id}
// drawing from NCodeGroup/identity's brand/build.py. Each kit's geometry is data in src/logo/<kit>.json, and the three
// colors are the blue ramp's anchors in src/tokens.source.json.
//
// The mark is drawn on a 64-unit grid from straight lines and circular arcs, so the SVG paths and the PNG pixels come
// from the same geometry. Sizes from 16 to 48 pixels have their own pixel-fitted geometry, because a scaled-down master
// puts its strokes between pixels.
import { decodeIco, icoBytes } from './ico.mjs';
import { RAD_TO_DEG, asin, num, roundHalfEven } from './numbers.mjs';
import { Contour, Shape, parsePath, rectangle, ring, disc, roundedRectangle } from './geometry.mjs';
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
  return Object.freeze({ taper: 0.0, beakY: null, staircase: null, squareDot: false, stepped: 0, ...fields });
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

/** The i and the d: a stem under a dot, and a bowl that a taller stem closes on the right. */
function lettersId(s) {
  const [top, middle, bottom] = s.letterY;
  const [left, right] = s.dX;
  const [dotTop, dot] = s.dot;
  const dotX = s.iX + (s.stem - dot) / 2; // the dot is centered on its stem
  let shape = rectangle(s.iX, middle, s.stem, bottom - middle);
  shape = shape.add(s.squareDot ? rectangle(dotX, dotTop, dot, dot) : disc(dotX + dot / 2, dotTop + dot / 2, dot / 2));
  shape = shape.add(rectangle(right - s.stem, top, s.stem, bottom - top));
  if (s.stepped) {
    // a top bar, a left bar and a bottom bar
    const cut = s.stepped;
    const width = right - s.stem - left;
    shape = shape.add(rectangle(left + cut, middle, width - cut, s.bowl));
    shape = shape.add(rectangle(left, middle + cut, s.bowl, bottom - middle - 2 * cut));
    shape = shape.add(rectangle(left + cut, bottom - s.bowl, width - cut, s.bowl));
  } else {
    // a ring that stands on the baseline, behind the stem
    const radius = (right - left) / 2;
    shape = shape.add(ring(right - radius, bottom - radius, radius, radius - s.bowl));
  }
  return shape;
}

// The letters between the braces, by the source's `letters` field.
const LETTERS = { N: letterN, id: lettersId };

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
  const letters = LETTERS[geometry.letters];
  if (!letters) {
    throw new Error(`${geometry.name}: letters is "${geometry.letters}", not one of ${Object.keys(LETTERS).join(', ')}`);
  }
  const FITTED = Object.fromEntries(Object.entries(geometry.fitted).map(([size, fields]) => [size, spec(fields)]));
  const GRID = MASTER.size;
  const RADIUS = geometry.tileRadius.value / GRID; // corner radius of a rounded tile, as a fraction of its width
  const { tight: TIGHT, regular: REGULAR, safe: SAFE } = geometry.fit;
  const WORDMARK = parsePath(geometry.wordmark.path);
  const DESCRIPTOR = geometry.descriptor ? parsePath(geometry.descriptor.path).placed(...geometry.descriptor.placed) : null;

  function mark(s = MASTER) {
    const brace = leftBrace(s);
    return brace.add(letters(s)).add(brace.mirrored(s.size / 2));
  }

  // Each lockup's parts: the mark, then the wordmark, placed at a scale and an offset. The parts are filled one after
  // another, never as one shape, so the pixels where they meet round as they always have.
  const LOCKUPS = geometry.lockups.map((entry) => {
    const parts = (scale = 1.0, dx = 0.0, dy = 0.0) => [
      mark().placed(...entry.mark).placed(scale, dx, dy),
      WORDMARK.placed(1, ...entry.wordmark).placed(scale, dx, dy),
    ];
    const [symbol, word] = parts();
    return Object.freeze({ ...entry, parts, d: `${symbol.path(entry.markDigits)}${word.path(2)}` });
  });
  const BANNER = geometry.cards.banner;
  const PREVIEW = geometry.cards.preview;

  /** The mark in the pixels of a size-by-size image: fitted where there is a fitted drawing. */
  function markFor(size, fit = TIGHT) {
    if (fit === TIGHT && size in FITTED) return mark(FITTED[size]);
    return mark().placed((size / GRID) * fit, (size * (1 - fit)) / 2, (size * (1 - fit)) / 2);
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

  function drawLockup(lockup, height, ink) {
    const scale = height / lockup.height;
    const canvas = new Canvas(roundHalfEven(lockup.width * scale), height);
    for (const part of lockup.parts(scale)) canvas.fill(part, ink);
    return canvas.image();
  }

  /** The first lockup centered on a solid card, at most `widest` of the card wide. */
  function drawCard(w, h, card, { widest, descriptor = false }) {
    const [fill, ink] = CARDS[card];
    const scale = Math.floor(Math.min((widest * w) / LOCKUPS[0].width, (0.4 * h) / GRID) * 4) / 4;
    const middle = descriptor ? (MASTER.braceY[0] + geometry.descriptor.placed[2]) / 2 : GRID / 2;
    const dx = roundHalfEven((w - LOCKUPS[0].width * scale) / 2);
    const dy = roundHalfEven(h / 2 - middle * scale);
    const canvas = new Canvas(w, h, fill);
    for (const part of LOCKUPS[0].parts(scale, dx, dy)) canvas.fill(part, ink);
    if (descriptor) canvas.fill(DESCRIPTOR.placed(scale, dx, dy), ink);
    return canvas.image();
  }

  /** Blue, or light blue when the viewer's system or browser asks for a dark scheme. */
  function autoStyle(selector = 'path') {
    return `<style>${selector}{fill:${BLUE}}@media (prefers-color-scheme:dark){${selector}{fill:${LIGHT}}}</style>`;
  }

  return {
    colors: { BLUE, LIGHT, NAVY }, INKS, TILES, CARDS, MASTER, FITTED, GRID, TIGHT, REGULAR, SAFE, WORDMARK, LOCKUPS, BANNER, PREVIEW,
    NAME: geometry.name, SHORT_NAME: geometry.shortName, PREFIX: geometry.prefix,
    OUTLINES_DESCRIPTION: geometry.outlinesDescription,
    mark, markFor, drawMark, drawTile, drawLockup, drawCard, autoStyle,
  };
}

function svg(w, h, body, title) {
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
  const { INKS, TILES, CARDS, LOCKUPS, BANNER, PREVIEW, REGULAR, TIGHT, SAFE, GRID, FITTED } = logo;
  const { BLUE, LIGHT } = logo.colors;
  const { NAME, SHORT_NAME, PREFIX, OUTLINES_DESCRIPTION } = logo;
  const { mark, drawMark, drawTile, drawLockup, drawCard, autoStyle } = logo;
  const svgFile = (w, h, body) => svg(w, h, body, NAME);
  const kit = new Kit();
  const master = mark().path();
  const regular = mark().placed(REGULAR, (GRID * (1 - REGULAR)) / 2, (GRID * (1 - REGULAR)) / 2).path();

  // mark/: the mark alone on a transparent background.
  for (const [name, ink] of Object.entries(INKS)) {
    kit.text(`mark/${PREFIX}-mark-${name}.svg`, svgFile(64, 64, `<path fill="${ink}" d="${master}"/>`));
    for (const size of [256, 1024]) kit.png(`mark/${PREFIX}-mark-${name}-${size}.png`, drawMark(size, ink));
  }
  kit.text(`mark/${PREFIX}-mark-auto.svg`, svgFile(64, 64, `${autoStyle()}<path d="${master}"/>`));

  // tile/: the mark on a solid tile, the app-icon form. "square" has no rounded corners, for a
  // platform that cuts its own.
  for (const [name, [fill, ink]] of Object.entries(TILES)) {
    const glyph = `<path fill="${ink}" d="${regular}"/>`;
    const rounded = `<rect width="64" height="64" rx="14" fill="${fill}"/>`;
    const square = `<path fill="${fill}" d="M0 0H64V64H0Z"/>`;
    kit.text(`tile/${PREFIX}-tile-${name}.svg`, svgFile(64, 64, rounded + glyph));
    kit.text(`tile/${PREFIX}-tile-${name}-square.svg`, svgFile(64, 64, square + glyph));
    for (const size of [256, 1024]) kit.png(`tile/${PREFIX}-tile-${name}-${size}.png`, drawTile(size, name, 'rounded', REGULAR));
    kit.png(`tile/${PREFIX}-tile-${name}-square-1024.png`, drawTile(1024, name, 'square', REGULAR), { opaque: true });
  }

  // lockup/: the mark and the wordmark.
  for (const lockup of LOCKUPS) {
    const stem = `lockup/${PREFIX}-${lockup.file}`;
    for (const [name, ink] of Object.entries(INKS)) {
      kit.text(`${stem}-${name}.svg`, svgFile(lockup.width, lockup.height, `<path fill="${ink}" d="${lockup.d}"/>`));
      for (const height of lockup.heights) kit.png(`${stem}-${name}-h${height}.png`, drawLockup(lockup, height, ink));
    }
    kit.text(`${stem}-auto.svg`, svgFile(lockup.width, lockup.height, `${autoStyle()}<path d="${lockup.d}"/>`));
  }

  // favicon/: the blue tile. The ICO holds a pixel-fitted drawing per size; the SVG is the 32-pixel
  // drawing, which is sharp at 32 and at its multiples.
  const small = mark(FITTED[32]).path();
  const iconSizes = [16, 20, 24, 32, 40, 48, 64];
  kit.ico('favicon/favicon.ico', iconSizes.map((s) => drawTile(s, 'blue', 'rounded', TIGHT)));
  kit.text('favicon/favicon.svg', svgFile(32, 32, `<rect width="32" height="32" rx="7" fill="${BLUE}"/>` +
    `<path fill="${WHITE}" d="${small}"/>`));
  kit.png('favicon/apple-touch-icon.png', drawTile(180, 'blue', 'square', REGULAR), { opaque: true });
  kit.png('favicon/icon-192.png', drawTile(192, 'blue', 'rounded', REGULAR));
  kit.png('favicon/icon-512.png', drawTile(512, 'blue', 'rounded', REGULAR));
  kit.png('favicon/icon-maskable-512.png', drawTile(512, 'blue', 'square', SAFE), { opaque: true });
  kit.text('favicon/site.webmanifest', `${JSON.stringify({
    name: NAME,
    short_name: SHORT_NAME,
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
  kit.text('favicon/transparent/favicon.svg', svgFile(32, 32, `${autoStyle()}<path d="${small}"/>`));

  // windows/: an application icon. Bitmaps up to 64 pixels, so System.Drawing and the resource
  // compiler read it, and a PNG at 256.
  kit.ico(`windows/${PREFIX}.ico`, [...iconSizes, 256].map((s) => drawTile(s, 'blue', 'rounded', TIGHT)), 256);

  // nuget/: 128 by 128, as NuGet recommends: twice the master, so every stem is on whole pixels, and
  // still is when a client shows the icon at half or a quarter of that.
  for (const name of Object.keys(TILES)) {
    kit.png(`nuget/${PREFIX}-nuget-tile-${name}.png`, drawTile(128, name, 'rounded', TIGHT), { limit: NUGET_LIMIT });
  }
  for (const name of ['blue', 'light']) kit.png(`nuget/${PREFIX}-nuget-mark-${name}.png`, drawMark(128, INKS[name]), { limit: NUGET_LIMIT });

  // profile/: a square that a circle can be cut from (GitHub and GitLab users, Gravatar, X, LinkedIn).
  for (const name of Object.keys(TILES)) {
    kit.png(`profile/${PREFIX}-profile-tile-${name}.png`, drawTile(1024, name, 'square', SAFE), { opaque: true });
  }
  for (const name of ['blue', 'light']) kit.png(`profile/${PREFIX}-profile-mark-${name}.png`, drawMark(1024, INKS[name], SAFE));

  // github/: an organization's picture (about 500 pixels, under 1 MB) and a repository's social
  // preview (1280 by 640, under 1 MB).
  for (const name of Object.keys(TILES)) {
    kit.png(`github/${PREFIX}-github-avatar-tile-${name}.png`, drawTile(500, name, 'square', REGULAR),
      { limit: GITHUB_LIMIT, opaque: true });
  }
  for (const name of ['blue', 'light']) {
    kit.png(`github/${PREFIX}-github-avatar-mark-${name}.png`, drawMark(500, INKS[name], REGULAR), { limit: GITHUB_LIMIT });
  }
  for (const name of Object.keys(CARDS)) {
    kit.png(`github/${PREFIX}-github-social-${name}.png`, drawCard(1280, 640, name, PREVIEW), { limit: GITHUB_LIMIT, opaque: true });
  }

  // gitlab/: a group's or project's avatar (192 pixels, 200 KiB at most). A logo.png at a
  // repository's root is the project's avatar until one is uploaded.
  for (const name of Object.keys(TILES)) {
    kit.png(`gitlab/${PREFIX}-gitlab-avatar-tile-${name}.png`, drawTile(192, name, 'square', REGULAR),
      { limit: GITLAB_LIMIT, opaque: true });
  }
  for (const name of ['blue', 'light']) {
    kit.png(`gitlab/${PREFIX}-gitlab-avatar-mark-${name}.png`, drawMark(192, INKS[name], REGULAR), { limit: GITLAB_LIMIT });
  }
  kit.png('gitlab/logo.png', drawTile(192, 'blue', 'square', REGULAR), { limit: GITLAB_LIMIT, opaque: true });

  // myapps/: Microsoft Entra's My Apps takes exactly 215 by 215 pixels, PNG, 100 KB at most, and
  // asks for a solid background.
  for (const name of Object.keys(TILES)) {
    kit.png(`myapps/${PREFIX}-myapps-tile-${name}.png`, drawTile(215, name, 'square', REGULAR),
      { limit: MYAPPS_LIMIT, opaque: true });
  }

  // badge/: the mark cropped to its edges, as small a file as it gets, for a badge's logo. The .txt
  // files hold it as the value of Shields.io's logo parameter.
  const cropped = mark().placed(1, -4, -8).path(2);
  for (const name of ['white', 'blue', 'light']) {
    const badge = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 48">' +
      `<path fill="${INKS[name]}" d="${cropped}"/></svg>`;
    kit.text(`badge/${PREFIX}-badge-${name}.svg`, `${badge}\n`);
    const uri = `data:image/svg+xml;base64,${Buffer.from(badge, 'utf8').toString('base64')}`;
    kit.text(`badge/shields-logo-${name}.txt`, `${quote(uri)}\n`);
  }

  // social/: link previews (1200 by 630) and profile banners (1500 by 500).
  for (const name of Object.keys(CARDS)) {
    kit.png(`social/${PREFIX}-og-${name}.png`, drawCard(1200, 630, name, PREVIEW), { opaque: true });
    kit.png(`social/${PREFIX}-banner-${name}.png`, drawCard(1500, 500, name, BANNER), { opaque: true });
  }

  // outlines.json: the same geometry as path data, for a page or a component that draws the mark inline.
  const fitted = Object.fromEntries(Object.keys(FITTED).map((size) => [size, mark(FITTED[size]).path()]));
  kit.text('outlines.json', `${JSON.stringify({
    $description: OUTLINES_DESCRIPTION,
    colors: { blue: BLUE, light: LIGHT, navy: logo.colors.NAVY },
    mark: { viewBox: '0 0 64 64', d: master },
    brace: { viewBox: '4 8 12 48', d: leftBrace(logo.MASTER).path() },
    ...Object.fromEntries(LOCKUPS.map((l) => [l.key, { viewBox: `0 0 ${num(l.width, 3)} ${num(l.height, 3)}`, d: l.d }])),
    fitted: Object.fromEntries(Object.entries(fitted).map(([size, d]) => [size, { viewBox: `0 0 ${size} ${size}`, d }])),
  }, null, 2)}\n`);
  return kit.files;
}
