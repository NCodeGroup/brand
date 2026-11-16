// The contrast gate, computed in Node from the tokens without a browser: every text and UI pairing the components use,
// in light and dark, for NCode's own brand, the white-label proof colors and the stress colors.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { BRANDS, PAIRINGS, TEXT, UI, contrastReport } from '../lib/contrast.mjs';
import { resolveColors } from '../lib/model.mjs';
import { model, read } from './helpers.mjs';

const m = model();
const report = contrastReport(m);

describe('the contrast gate', () => {
  test('every pairing meets WCAG 2.2 AA: 4.5 to 1 for text, 3 to 1 for a part', () => {
    const failures = report.rows.filter((r) => !r.pass).map((r) => `${r.brand}, ${r.theme}: ${r.fg} on ${r.bg} is ${r.ratio}, needs ${r.need}`);
    assert.deepEqual(failures, []);
  });

  test('it measures every pairing for NCode Blue, and every brand pairing for each tenant color, in both themes', () => {
    const brandPairs = PAIRINGS.filter((p) => p.brand);
    const stressPairs = brandPairs.filter((p) => p.anyColor);
    const tenants = BRANDS.filter((b) => b.primary && !b.stress).length;
    const stress = BRANDS.filter((b) => b.stress).length;
    assert.equal(report.measured, 2 * (PAIRINGS.length + tenants * brandPairs.length + stress * stressPairs.length));
    assert.ok(PAIRINGS.every((p) => p.need === TEXT || p.need === UI));
  });

  test('NCode Blue as text on the page passes in both themes, with the ratios the guide shows', () => {
    const row = (theme) => report.rows.find((r) => r.brand === 'NCode Blue' && r.theme === theme && r.fg === 'primary-text' && r.bg === 'page');
    assert.ok(row('light').ratio >= TEXT);
    assert.ok(row('dark').ratio >= TEXT);
    assert.match(read('guidelines/02-color.md'), new RegExp(`\\| Brand as text, lamp, focus ring \\| 6 \\| 4\\.5 \\| \\d+\\.\\d\\d / \\d+\\.\\d\\d \\|`));
  });
});

describe('the static palette', () => {
  /** The first block that opens with `open` and declares a color role: the palette, not the primitives. */
  const block = (css, open) => {
    for (let start = css.indexOf(open); start >= 0; start = css.indexOf(open, start + 1)) {
      let depth = 0;
      for (let i = css.indexOf('{', start); i < css.length; i++) {
        if (css[i] === '{') depth++;
        if (css[i] === '}' && --depth === 0) {
          const text = css.slice(start, i + 1);
          if (open.startsWith('@') || /--nc-color-[\w-]+:/.test(text)) return text;
          break;
        }
      }
    }
    throw new Error(`no block ${open} declares a color`);
  };
  const declarations = (css) => Object.fromEntries([...css.matchAll(/(--nc-color-[\w-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]));
  const colors = (theme) => Object.fromEntries(Object.entries(resolveColors(m, theme)).map(([name, value]) => [`--nc-color-${name}`, value]));

  for (const file of ['tokens/tokens.css', 'tokens/tokens.static.css']) {
    test(`${file}: the fallback colors are the computed colors, light at the root and dark by the theme`, () => {
      const css = read(file);
      const fallback = file.endsWith('static.css') ? css : block(css, '@supports not');
      const light = declarations(block(fallback, ':root {'));
      const dark = declarations(block(fallback, ':root[data-theme="dark"] {'));
      const systemDark = declarations(block(fallback, ':root:not([data-theme="light"]) {'));
      assert.deepEqual(light, colors('light'));
      assert.deepEqual({ ...light, ...dark }, colors('dark'));
      assert.deepEqual(systemDark, dark);
    });
  }

  test('tokens.static.css uses no CSS function newer than var()', () => {
    const css = read('tokens/tokens.static.css').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /light-dark\(|color-mix\(|\bfrom\b|@supports/);
  });
});
