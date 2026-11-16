// The contrast gate: the WCAG 2.x contrast of every text and UI pairing the components use, in light and dark, for
// NCode's own brand and for the white-label proof and stress colors. It resolves the tokens with the build's own color
// math, which evaluates tokens.css's rules the way a browser does, so it needs no browser
// (tools/browser-check.mjs compares the two by hand).
import { contrast, hexToRgb, rgbToHex } from './color.mjs';
import { resolveColors } from './model.mjs';

export const TEXT = 4.5;
export const UI = 3;

// [foreground, background, required ratio, what it is]. "brand" pairings are measured again for every tenant color.
// A background written "a+b" is the translucent color b painted over a. A foreground written "a|b" is a part drawn in
// two colors (a key's edge and face, a lit plate in its bezel, the two stripes of hazard tape): the stronger of the
// two sets the part off, so the better ratio counts. `anyColor` is false for the one pairing a tenant's color can
// break, a light key's face against its plate: it is measured for the proof colors, and the guide states the limit.
const surfaces = ['page', 'surface', 'surface-raised', 'surface-sunken'];
export const PAIRINGS = [];
const add = (fg, bg, need, what, brand = false, anyColor = true) => PAIRINGS.push({ fg, bg, need, what, brand, anyColor });

for (const bg of [...surfaces, 'page-sunken', 'well', 'control', 'control-hover', 'control-pressed']) add('text', bg, TEXT, 'Text');
for (const bg of ['surface+ghost-hover', 'surface+ghost-pressed', 'page+ghost-hover']) add('text', bg, TEXT, 'Text on a ghost key, touched');
for (const bg of [...surfaces, 'page-sunken', 'control', 'well']) add('text-secondary', bg, TEXT, 'Secondary text');
for (const bg of [...surfaces, 'well']) add('text-muted', bg, TEXT, 'Engraved labels, setting keys, placeholders');
for (const bg of [...surfaces, 'page-sunken', 'well']) add('border-strong', bg, UI, 'Edge of a control');
for (const bg of surfaces) add('logo', bg, UI, "NCode's mark");

for (const bg of [...surfaces, 'well', 'primary-subtle']) add('primary-text', bg, TEXT, 'Brand as text, lamp, focus ring', true);
add('on-primary', 'primary', TEXT, 'Primary key: label', true);
add('on-primary', 'primary-hover', TEXT, 'Primary key, hover', true);
add('on-primary', 'primary-pressed', TEXT, 'Primary key, pressed', true);
for (const bg of ['page', 'surface', 'surface-raised']) add('primary', bg, UI, 'Primary key against its plate: its face', true, false);
for (const bg of ['page', 'surface', 'surface-raised']) add('primary-edge|primary', bg, UI, 'Primary key against its plate: its edge or its face', true);
add('text', 'primary-subtle', TEXT, 'Text on a selected option', true);
add('text-secondary', 'primary-subtle', TEXT, 'Secondary text on a selected option', true);

add('on-screen', 'screen', TEXT, 'Screen: values', true);
add('on-screen-secondary', 'screen', TEXT, 'Screen: code', true);
add('on-screen-muted', 'screen', TEXT, 'Screen: comments, unlit steps', true);
add('screen-lit', 'screen', TEXT, 'Screen: keywords, lit labels, braces', true);
add('screen-hot', 'screen', TEXT, 'Screen: literals, hot bytes, a secret', true);
add('on-screen', 'screen-raised', TEXT, 'Lit row: values', true);
add('on-screen-secondary', 'screen-raised', TEXT, 'Lit row: code', true);
add('screen-lit', 'screen-raised', TEXT, 'Lit row: keywords', true);
add('screen-hot', 'screen-raised', TEXT, 'Lit row and memory cells: literals', true);

add('screen', 'screen-lit', TEXT, 'Boundary plate: tenant', true);
add('screen', 'on-screen', TEXT, 'Boundary plate: team', true);
add('on-hazard', 'hazard', TEXT, 'Boundary plate: platform; hazard band');
for (const bg of ['surface', 'surface-raised', 'surface-sunken']) add('screen|screen-lit', bg, UI, 'Boundary plate against its plate: tenant (bezel or fill)', true);
for (const bg of ['surface', 'surface-raised', 'surface-sunken']) add('screen|on-screen', bg, UI, 'Boundary plate against its plate: team (bezel or fill)', true);
for (const bg of ['surface', 'surface-raised', 'surface-sunken']) add('screen|hazard', bg, UI, 'Boundary plate against its plate: platform (bezel or fill)', true);
for (const bg of ['page', 'surface']) add('scope-tenant', bg, UI, 'Scope brace: tenant', true);
for (const bg of ['page', 'surface']) add('scope-team', bg, UI, 'Scope brace: team');
for (const bg of ['page', 'surface']) add('on-hazard|hazard', bg, UI, 'Scope brace: platform (the stronger stripe of the tape)');

for (const s of ['success', 'warning', 'danger', 'info']) {
  for (const bg of ['page', 'surface', 'surface-raised', `${s}-subtle`]) add(`${s}-text`, bg, TEXT, `${s}: text`);
  for (const bg of [...surfaces, `${s}-subtle`]) add(`${s}-mark`, bg, UI, `${s}: lamp, icon, bar`);
  add(`on-${s}`, s, TEXT, `${s}: label on fill`);
  add('text', `${s}-subtle`, TEXT, `${s}: alert text`);
}
add('on-danger', 'danger-hover', TEXT, 'danger: key, hover');
add('danger-text', 'surface-sunken', TEXT, 'danger: text');

/** NCode's own brand, the four tenant combinations of the white-label proof, and six colors chosen to break it. */
export const BRANDS = [
  { name: 'NCode Blue', primary: null, secondary: null },
  { name: 'Tenant teal', primary: '0F766E', secondary: null },
  { name: 'Tenant orange', primary: 'C2410C', secondary: null },
  { name: 'Tenant teal, secondary rust', primary: '0F766E', secondary: '7C2D12' },
  { name: 'Tenant orange, secondary navy', primary: 'C2410C', secondary: '1E3A5F' },
  // Stress colors: the lightest, the darkest and the ones nearest the point where the label of a key flips.
  { name: 'Stress: yellow', primary: 'FACC15', secondary: null, stress: true },
  { name: 'Stress: sky', primary: '38BDF8', secondary: null, stress: true },
  { name: 'Stress: red at the flip', primary: 'DC2626', secondary: null, stress: true },
  { name: 'Stress: green at the flip', primary: '16A34A', secondary: null, stress: true },
  { name: 'Stress: near white', primary: 'F1F5F9', secondary: null, stress: true },
  { name: 'Stress: near black', primary: '111827', secondary: null, stress: true },
];

/** "rgb(r g b / a)" painted over an opaque hex color. */
function over(top, bottom) {
  const m = /^rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)[ ,/]+([0-9.]+)\)$/.exec(top);
  const rgb = hexToRgb(bottom);
  return rgbToHex(m.slice(1, 4).map((v, i) => (Number(v) / 255) * Number(m[4]) + rgb[i] * (1 - Number(m[4]))));
}

/** The color a pairing names, from resolved colors: "a+b" composites b over a. */
export function pairColor(colors, token) {
  const [base, layer] = token.split('+');
  if (!colors[base]?.startsWith('#')) throw new Error(`--nc-color-${base} is not opaque`);
  return layer ? over(colors[layer], colors[base]) : colors[base];
}

/** One measurement: the better foreground of an "a|b" pairing on its background. */
export function measure(colors, pairing) {
  const bgHex = pairColor(colors, pairing.bg);
  const [ratio, fgHex] = pairing.fg
    .split('|')
    .map((name) => [contrast(pairColor(colors, name), bgHex), pairColor(colors, name)])
    .sort((a, b) => b[0] - a[0])[0];
  return { ratio, fgHex, bgHex };
}

/** Every measurement of every pairing for every brand, in light and dark. */
export function contrastReport(model) {
  const rows = [];
  for (const brand of BRANDS) {
    for (const theme of ['light', 'dark']) {
      const colors = resolveColors(model, theme, {
        brand: brand.primary ? `#${brand.primary}` : undefined,
        secondary: brand.secondary ? `#${brand.secondary}` : undefined,
      });
      for (const pairing of PAIRINGS) {
        if (brand.primary && !pairing.brand) continue;
        if (brand.stress && !pairing.anyColor) continue;
        const { ratio, fgHex, bgHex } = measure(colors, pairing);
        rows.push({
          brand: brand.name, theme, what: pairing.what, fg: pairing.fg, bg: pairing.bg, fgHex, bgHex,
          ratio: Math.floor(ratio * 100) / 100, need: pairing.need, pass: ratio >= pairing.need,
        });
      }
    }
  }
  return { measured: rows.length, pairings: PAIRINGS.length, brands: BRANDS, rows };
}

/** One line per use, with the lowest ratio of that use among one brand's pairings, light and dark. */
export function summarize(report, brandName) {
  const groups = new Map();
  for (const r of report.rows.filter((x) => x.brand === brandName)) {
    const g = groups.get(r.what) ?? { what: r.what, need: r.need, pairs: new Set(), light: Infinity, dark: Infinity };
    g.pairs.add(`${r.fg}|${r.bg}`);
    g[r.theme] = Math.min(g[r.theme], r.ratio);
    groups.set(r.what, g);
  }
  return [...groups.values()];
}
