// The tenant derivation: the released module reproduces its vectors, agrees with tokens.css wherever the CSS rules
// reach every floor, and holds every pairing it promises for any color.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { contrast } from '../lib/color.mjs';
import { BRANDS } from '../lib/contrast.mjs';
import { createDerive } from '../lib/derive-core.mjs';
import { deriveData, heldPairings } from '../lib/derive.mjs';
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
    for (const hex of sweep) {
      const derived = lib.deriveBrand(hex);
      for (const theme of ['light', 'dark']) {
        const colors = { ...resolveColors(m, theme), ...derived[theme] };
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

  test('a very bright green is too light as text, so a guard darkens it', () => {
    const derived = lib.deriveBrand('#00FF00');
    assert.deepEqual(derived.adjusted.light, ['primary-text']);
    assert.ok(contrast(derived.light['primary-text'], '#FFFFFF') >= 4.5);
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
