// Writes tokens/derive.mjs, derive.d.mts and derive.vectors.json: the tenant derivation as one module with no imports,
// its types, and its results for a fixed list of inputs, which a consumer's tests can assert as this repository's do.
import { readFileSync } from 'node:fs';
import { TEXT, UI } from './contrast.mjs';
import { createDerive } from './derive-core.mjs';
import { PREFIX, defaultInputs, isThemed, refName, resolveColors } from './model.mjs';

const LIGHT = ['light'];
const DARK = ['dark'];
const BOTH = ['light', 'dark'];
const plates = ['page', 'surface', 'surface-raised', 'surface-sunken', 'well'];
const on = (fg, grounds, floor) => grounds.map((bg) => ({ fg: [].concat(fg), bg, floor }));

/**
 * The guards, in the order they run. Each holds the pairings of the contrast gate that a tenant's color can break,
 * by moving one color: lighter (+1) or darker (-1), or to another of a few fixed choices. The light key's face against
 * its plate has no guard: its edge carries it, and the guide states the limit.
 */
export const GUARDS = [
  { token: 'primary-text', themes: LIGHT, direction: -1, checks: on('primary-text', [...plates, 'primary-subtle'], TEXT) },
  { token: 'primary', themes: DARK, direction: 1, checks: on('primary', [...plates, 'primary-subtle'], TEXT) },
  {
    tokens: ['on-primary', 'primary-shade'],
    themes: LIGHT,
    choices: [['#FFFFFF', '#000000'], ['#000000', '#FFFFFF']],
    checks: on('on-primary', ['primary', 'primary-hover', 'primary-pressed'], TEXT),
  },
  { token: 'on-primary', themes: DARK, direction: -1, checks: on('on-primary', ['primary', 'primary-hover', 'primary-pressed'], TEXT) },
  { token: 'primary-edge', themes: LIGHT, direction: -1, checks: on(['primary-edge', 'primary'], ['page', 'surface', 'surface-raised'], UI) },
  { token: 'primary-edge', themes: DARK, direction: 1, checks: on(['primary-edge', 'primary'], ['page', 'surface', 'surface-raised'], UI) },
  { token: 'primary-subtle', themes: LIGHT, direction: 1, checks: [...on('text', ['primary-subtle'], TEXT), ...on('text-secondary', ['primary-subtle'], TEXT)] },
  { token: 'primary-subtle', themes: DARK, direction: -1, checks: [...on('text', ['primary-subtle'], TEXT), ...on('text-secondary', ['primary-subtle'], TEXT)] },
  { token: 'screen-lit', themes: BOTH, direction: 1, checks: [...on('screen-lit', ['screen', 'screen-raised'], TEXT), ...on('screen', ['screen-lit'], TEXT)] },
  { token: 'on-screen-secondary', themes: BOTH, direction: 1, checks: on('on-screen-secondary', ['screen', 'screen-raised'], TEXT) },
  { token: 'on-screen-muted', themes: BOTH, direction: 1, checks: on('on-screen-muted', ['screen'], TEXT) },
  { token: 'screen-hot', themes: BOTH, direction: 1, checks: on('screen-hot', ['screen', 'screen-raised'], TEXT) },
  { token: 'scope-tenant', themes: LIGHT, direction: -1, checks: on('scope-tenant', ['page', 'surface'], UI) },
  { token: 'scope-tenant', themes: DARK, direction: 1, checks: on('scope-tenant', ['page', 'surface'], UI) },
];

/**
 * The pairings the derivation holds for any input: every guard's checks, and the ones no guard needs. The screen and
 * its lit color are set to a fixed lightness, so Material UI's secondary as text, the screen on a light plate and the
 * lit color on a dark one, holds for any hue; the screen-lit guard only lightens, which keeps it.
 */
export function heldPairings() {
  const extra = [
    ...on('on-screen', ['screen', 'screen-raised'], TEXT).map((c) => ({ ...c, themes: BOTH })),
    ...on('screen', ['on-screen'], TEXT).map((c) => ({ ...c, themes: BOTH })),
    ...on(['screen', 'screen-lit'], ['surface', 'surface-raised', 'surface-sunken'], UI).map((c) => ({ ...c, themes: BOTH })),
    ...on(['screen', 'on-screen'], ['surface', 'surface-raised', 'surface-sunken'], UI).map((c) => ({ ...c, themes: BOTH })),
    ...on('screen', ['page', 'surface', 'surface-raised'], TEXT).map((c) => ({ ...c, themes: LIGHT })),
    ...on('screen-lit', ['page', 'surface', 'surface-raised'], TEXT).map((c) => ({ ...c, themes: DARK })),
  ];
  return [...GUARDS.flatMap((g) => g.checks.map((c) => ({ ...c, themes: g.themes }))), ...extra];
}

/** The data the derivation runs on, taken from the model. */
export function deriveData(model) {
  const derived = model.colors.filter((c) => c.brand);
  const order = derived.map((c) => c.name);
  const ramps = {};
  const themes = {};
  for (const theme of BOTH) {
    const resolved = resolveColors(model, theme);
    const rules = {};
    const fixed = {};
    for (const token of derived) {
      const rule = isThemed(token.rule) ? token.rule[theme] : token.rule;
      rules[token.name] = rule;
      collectRamps(model, rule, ramps);
    }
    for (const token of model.colors) if (!token.brand) fixed[token.name] = resolved[token.name];
    themes[theme] = { rules, fixed };
  }
  const properties = Object.fromEntries([...order, 'logo'].map((name) => [name, `${PREFIX}color-${name}`]));
  const guards = GUARDS.map((g) => ({ ...g }));
  return { defaults: { brand: defaultInputs(model).brand }, order, ramps, themes, guards, properties };
}

function collectRamps(model, rule, into) {
  const ref = refName(rule);
  if (ref) {
    if (!ref.startsWith('color.') && ref !== 'brand' && ref !== 'brand-secondary') {
      const [ramp, step] = ref.split('.');
      into[ref] = model.ramps[ramp].steps[step].hex;
    }
    return;
  }
  if (rule && typeof rule === 'object') {
    if ('from' in rule) collectRamps(model, rule.from, into);
    if ('mix' in rule) for (const part of rule.mix) collectRamps(model, part, into);
  }
}

/** The inputs the vectors pin: NCode's own, the proof and stress colors, the hard cases and input a parser refuses. */
export const VECTOR_INPUTS = [
  { name: 'No input: NCode Blue', primary: null, secondary: null },
  { name: 'NCode Blue, given', primary: '#0033CC', secondary: null },
  { name: 'Teal', primary: '#0F766E', secondary: null },
  { name: 'Orange', primary: '#C2410C', secondary: null },
  { name: 'Teal, secondary rust', primary: '#0F766E', secondary: '#7C2D12' },
  { name: 'Orange, secondary navy', primary: '#C2410C', secondary: '#1E3A5F' },
  { name: 'Yellow', primary: '#FACC15', secondary: null },
  { name: 'Sky', primary: '#38BDF8', secondary: null },
  { name: 'Red at the flip', primary: '#DC2626', secondary: null },
  { name: 'Green at the flip', primary: '#16A34A', secondary: null },
  { name: 'Near white', primary: '#F1F5F9', secondary: null },
  { name: 'Near black', primary: '#111827', secondary: null },
  { name: 'Pale yellow', primary: '#FFF3A0', secondary: null },
  { name: 'Violet', primary: '#9F20FF', secondary: null },
  { name: 'White', primary: '#FFFFFF', secondary: null },
  { name: 'Black', primary: '#000000', secondary: null },
  { name: 'Short form, lower case', primary: 'f80', secondary: null },
  { name: 'A color name: NCode Blue instead', primary: 'blue', secondary: null },
  { name: 'Secondary only', primary: null, secondary: '#7C2D12' },
];

export function vectors(model, version) {
  const { deriveBrand } = createDerive(deriveData(model));
  return {
    $description:
      "tokens/derive.mjs's result for each input: assert these in a consumer's tests to prove a vendored copy derives " +
      `what NCode Brand ${version} derives. Generated by build.mjs; do not edit it.`,
    version,
    vectors: VECTOR_INPUTS.map((input) => ({ ...input, expected: deriveBrand(input.primary, input.secondary) })),
  };
}

const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');

/** The released module: the color math and the derivation inlined, the data embedded, nothing imported. */
export function deriveModule(model, version) {
  const strip = (text) =>
    text
      .replace(/^import [^;]+;\n/gm, '')
      .replace(/^export (?=function|const|class)/gm, '');
  return [
    '/*',
    ` * The tenant derivation of NCode Brand ${version}: a tenant's primary and secondary color -> every color they touch,`,
    ' * light and dark, with each pairing held at its contrast floor. It computes what tokens/tokens.css derives in CSS,',
    ' * then moves a color whose pairing is below its floor (4.5 to 1 for text, 3 to 1 for a part) until it reaches it.',
    ' * For NCode Blue and the proof colors it changes nothing, so it agrees with tokens.css.',
    ' *',
    ' * Generated by build.mjs from lib/color.mjs, lib/derive-core.mjs and src/tokens.source.json: do not edit it.',
    ' * It imports nothing and runs in a browser, in Node.js and under a test runner. derive.d.mts types it, and',
    ' * derive.vectors.json holds its results for a fixed list of inputs. Licensed under the Apache License 2.0.',
    ' *',
    ' *   import { deriveBrand, customProperties } from "./derive.mjs";',
    ' *   const brand = deriveBrand(branding.primaryColor, branding.secondaryColor);',
    ' *   brand.light.primary, brand.dark["on-primary"], customProperties(brand.light)',
    ' */',
    '',
    '// ---- lib/color.mjs',
    strip(read('./color.mjs')).trim(),
    '',
    '// ---- lib/derive-core.mjs',
    strip(read('./derive-core.mjs')).trim(),
    '',
    '// ---- the data, from src/tokens.source.json',
    `const DATA = ${JSON.stringify(deriveData(model), null, 2)};`,
    '',
    'const derive = createDerive(DATA);',
    '',
    '/** The NCode Brand release this module came from. */',
    `export const version = ${JSON.stringify(version)};`,
    'export const deriveBrand = derive.deriveBrand;',
    'export const customProperties = derive.customProperties;',
    'export const derivedColors = derive.derivedColors;',
    'export { contrast, parseHex };',
    '',
  ].join('\n');
}

export function deriveTypes(model, version) {
  const names = [...model.colors.filter((c) => c.brand).map((c) => c.name), 'logo'];
  const notes = new Map(model.colors.map((c) => [c.name, c.note]));
  notes.set('logo', "NCode's own marks: the logo color, or the text color under a tenant's colors");
  return [
    `// Types of tokens/derive.mjs, NCode Brand ${version}. Generated by build.mjs; do not edit it.`,
    '',
    '/** Every color a tenant\'s inputs derive, in one theme, as "#RRGGBB". */',
    'export interface DerivedColors {',
    ...names.flatMap((name) => [...(notes.get(name) ? [`  /** ${notes.get(name)} */`] : []), `  readonly ${JSON.stringify(name)}: string;`]),
    '}',
    '',
    'export interface DerivedBrand {',
    '  /** The primary color used: the input, or NCode Blue when it was missing or not a hexadecimal color. */',
    '  readonly primary: string;',
    '  /** The secondary color used: the input, or the primary when it was missing or not a hexadecimal color. */',
    '  readonly secondary: string;',
    "  /** True when either input was a color: NCode's marks then go one color. */",
    '  readonly tenant: boolean;',
    '  readonly light: DerivedColors;',
    '  readonly dark: DerivedColors;',
    '  /** The colors a contrast guard moved away from what tokens.css derives, per theme. */',
    '  readonly adjusted: { readonly light: readonly string[]; readonly dark: readonly string[] };',
    '}',
    '',
    `/** The NCode Brand release the module came from. */`,
    'export declare const version: string;',
    '/** The names of the derived colors, in the order of DerivedColors. */',
    'export declare const derivedColors: readonly (keyof DerivedColors)[];',
    '/** Derives a tenant\'s colors. "#RGB" or "#RRGGBB", with or without "#"; anything else falls back. */',
    'export declare function deriveBrand(primary?: string | null, secondary?: string | null): DerivedBrand;',
    `/** One theme of a result as custom properties, such as { "${PREFIX}color-primary": "#0F766E" }. */`,
    'export declare function customProperties(colors: DerivedColors): Readonly<Record<string, string>>;',
    '/** The WCAG 2.x contrast ratio of two opaque colors written "#RRGGBB" or "#RGB". */',
    'export declare function contrast(a: string, b: string): number;',
    '/** A color written "#RGB" or "#RRGGBB", with or without "#", as "#RRGGBB"; anything else is null. */',
    'export declare function parseHex(text: unknown): string | null;',
    '',
  ].join('\n');
}
