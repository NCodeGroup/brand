// The tenant derivation: the released module reproduces its vectors, agrees with tokens.css wherever the CSS rules
// reach every floor, and holds every pairing it promises for any color, moving a color only as far as its floor.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { contrast, hexToOklch } from '../lib/color.mjs';
import { BRANDS } from '../lib/contrast.mjs';
import { createDerive } from '../lib/derive-core.mjs';
import { GUARDS, deriveData, heldPairings } from '../lib/derive.mjs';
import { resolveColors } from '../lib/model.mjs';
import * as released from '../tokens/derive.mjs';
import { model, read, readJson } from './helpers.mjs';

const m = model();
const lib = createDerive(deriveData(m));
const vectors = readJson('tokens/derive.vectors.json');

/** A sweep of the sRGB cube, nine steps a channel: 729 colors. */
const sweep = [];
for (let r = 0; r <= 8; r++) for (let g = 0; g <= 8; g++) for (let b = 0; b <= 8; b++) {
  sweep.push(`#${[r, g, b].map((v) => Math.round((v / 8) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase());
}
let swept;
/** What the derivation gives for each color of the sweep, worked out once. */
const derivedSweep = () => (swept ??= sweep.map((hex) => [hex, lib.deriveBrand(hex)]));
/** Every color of one theme: the derived ones over the ones no tenant changes. */
const allColors = (derived, theme) => ({ ...resolveColors(m, theme), ...derived[theme] });
/** How far a guard's checks reach, as the lowest of their ratios, each divided by its floor. */
const reach = (guard, colors) =>
  Math.min(...guard.checks.map(({ fg, bg, floor }) => Math.max(...fg.map((f) => contrast(colors[f], colors[bg]))) / floor));

describe('tokens/derive.mjs, as released', () => {
  test('imports nothing, so a consumer vendors one file', () => {
    assert.doesNotMatch(read('tokens/derive.mjs'), /^\s*import[\s{*]/m);
  });

  test('reproduces every vector in derive.vectors.json', () => {
    assert.equal(vectors.version, readJson('package.json').version);
    for (const v of vectors.vectors) assert.deepEqual(released.deriveBrand(v.primary, v.secondary), v.expected, v.name);
  });

  test('derives what the build derives, over the sweep', () => {
    for (const hex of sweep.filter((_, i) => i % 7 === 0)) assert.deepEqual(released.deriveBrand(hex), lib.deriveBrand(hex), hex);
  });

  test('names each color by its custom property', () => {
    const props = released.customProperties(released.deriveBrand('#0F766E').light);
    assert.equal(props['--nc-color-primary'], '#0F766E');
    assert.equal(Object.keys(props).length, released.derivedColors.length);
    assert.ok(Object.keys(props).every((name) => name.startsWith('--nc-color-')));
  });
});

describe('agreement with tokens.css', () => {
  for (const brand of BRANDS) {
    test(`${brand.name}: no guard moves a color, so the result is what the CSS rules compute`, () => {
      const primary = brand.primary ? `#${brand.primary}` : undefined;
      const secondary = brand.secondary ? `#${brand.secondary}` : undefined;
      const derived = lib.deriveBrand(primary, secondary);
      assert.deepEqual(derived.adjusted, { light: [], dark: [] });
      for (const theme of ['light', 'dark']) {
        const css = resolveColors(m, theme, { brand: primary, secondary });
        for (const [name, value] of Object.entries(derived[theme])) {
          if (name === 'logo') assert.equal(value, primary ? css.text : css.logo, `${theme} logo`);
          else assert.equal(value, css[name], `${theme} ${name}`);
        }
      }
    });
  }
});

describe('the contrast guards', () => {
  test('every pairing the derivation promises reaches its floor for every color of the sweep, in both themes', () => {
    const held = heldPairings();
    const failures = [];
    for (const [hex, derived] of derivedSweep()) {
      for (const theme of ['light', 'dark']) {
        const colors = allColors(derived, theme);
        for (const pairing of held.filter((p) => p.themes.includes(theme))) {
          const ratio = Math.max(...pairing.fg.map((fg) => contrast(colors[fg], colors[pairing.bg])));
          if (ratio < pairing.floor) failures.push(`${hex} ${theme}: ${pairing.fg.join('|')} on ${pairing.bg} is ${ratio.toFixed(2)}`);
        }
      }
    }
    assert.deepEqual(failures, []);
  });

  test('a secondary color drives the screens and the tenant braces, and the primary keeps the keys', () => {
    const derived = lib.deriveBrand('#0F766E', '#7C2D12');
    assert.equal(derived.light.primary, '#0F766E');
    assert.equal(derived.secondary, '#7C2D12');
    assert.notEqual(derived.light.screen, lib.deriveBrand('#0F766E').light.screen);
  });

  test('a guard moves a color in steps of lightness until it reaches its floor, and no further than 5% past it', () => {
    // White or black passes every floor, so a step search that ran the wrong way, or not at all, would still hold
    // every pairing: the stop shows it searched.
    const moved = [];
    for (const [hex, derived] of derivedSweep()) {
      for (const theme of ['light', 'dark']) {
        const colors = allColors(derived, theme);
        for (const guard of GUARDS.filter((g) => g.token && g.themes.includes(theme) && derived.adjusted[theme].includes(g.token))) {
          const ratio = reach(guard, colors);
          moved.push(ratio);
          assert.ok(ratio >= 1 && ratio < 1.05, `${hex} ${theme}: ${guard.token} reaches ${ratio.toFixed(4)} times its floor`);
        }
      }
    }
    assert.ok(moved.length >= 30, `the sweep moves ${moved.length} colors by a single-color guard`);
  });

  test('a very bright green is too light as text, so a guard darkens it to its floor and keeps its hue', () => {
    const derived = lib.deriveBrand('#00FF00');
    assert.deepEqual(derived.adjusted.light, ['primary-text']);
    const text = derived.light['primary-text'];
    assert.ok(contrast(text, '#FFFFFF') >= 4.5);
    assert.notEqual(text, '#000000');
    assert.ok(Math.abs(hexToOklch(text)[2] - hexToOklch('#00FF00')[2]) < 1, `${text} keeps the hue of #00FF00`);
  });

  test('a guard whose floor no lightness reaches ends at black going down and at white going up, and names the color', () => {
    const unreachable = (token, themes, direction) => ({ token, themes, direction, checks: [{ fg: [token], bg: 'page', floor: 22 }] });
    const derive = createDerive({
      ...deriveData(m),
      guards: [unreachable('primary-text', ['light'], -1), unreachable('screen-lit', ['dark'], 1)],
    });
    const derived = derive.deriveBrand('#0F766E');
    assert.equal(derived.light['primary-text'], '#000000');
    assert.equal(derived.dark['screen-lit'], '#FFFFFF');
    assert.deepEqual(derived.adjusted, { light: ['primary-text'], dark: ['screen-lit'] });
  });
});

describe('input', () => {
  test('no input, or input that is not a hexadecimal color, is NCode Blue and no tenant', () => {
    for (const input of [undefined, null, '', 'blue', 'rgb(0, 51, 204)']) {
      const derived = lib.deriveBrand(input);
      assert.equal(derived.primary, '#0033CC');
      assert.equal(derived.tenant, false);
    }
  });

  test("a tenant's color, primary or secondary, turns NCode's marks to the text color", () => {
    assert.equal(lib.deriveBrand('#0F766E').tenant, true);
    assert.equal(lib.deriveBrand(null, '#7C2D12').tenant, true);
    const css = resolveColors(m, 'light');
    assert.equal(lib.deriveBrand('#0F766E').light.logo, css.text);
    assert.equal(lib.deriveBrand().light.logo, css.logo);
  });

  test('a secondary color that is missing or invalid follows the primary', () => {
    assert.equal(lib.deriveBrand('#C2410C', 'not a color').secondary, '#C2410C');
  });
});
