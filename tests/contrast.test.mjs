// The contrast gate, computed in Node from the tokens without a browser: every text and UI pairing the components use,
// in light and dark, for NCode's own brand, the white-label proof colors and the stress colors. A palette with a
// pairing below its floor fails it, and the build with it.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { BRANDS, PAIRINGS, TEXT, UI, contrastReport } from '../lib/contrast.mjs';
import { buildModel, resolveColors } from '../lib/model.mjs';
import { copyRepository, model, read, readJson, runNode } from './helpers.mjs';

const m = model();
const report = contrastReport(m);

describe('the contrast gate', () => {
  test('every pairing meets WCAG 2.2 AA: 4.5 to 1 for text, 3 to 1 for a part', () => {
    const failures = report.rows.filter((r) => !r.pass).map((r) => `${r.brand}, ${r.theme}: ${r.fg} on ${r.bg} is ${r.ratio}, needs ${r.need}`);
    assert.deepEqual(failures, []);
  });

  test('it measures every pairing for NCode Blue, and every brand pairing for each tenant color, in the themes that paint it', () => {
    const tenants = BRANDS.filter((b) => b.primary && !b.stress).length;
    const stress = BRANDS.filter((b) => b.stress).length;
    const times = (p) => p.themes.length * (1 + (p.brand ? tenants : 0) + (p.brand && p.anyColor ? stress : 0));
    assert.equal(report.measured, PAIRINGS.reduce((n, p) => n + times(p), 0));
    assert.ok(PAIRINGS.every((p) => p.need === TEXT || p.need === UI));
    assert.ok(PAIRINGS.every((p) => p.themes.length && p.themes.every((t) => t === 'light' || t === 'dark')));
    // A pairing painted in one theme only is measured there alone: Material UI's secondary is the screen on a light page.
    const secondary = (theme) => report.rows.filter((r) => r.brand === 'NCode Blue' && r.theme === theme && r.what.startsWith("Material UI's secondary"));
    assert.deepEqual(secondary('light').map((r) => r.fg), ['screen', 'screen', 'screen']);
    assert.deepEqual(secondary('dark').map((r) => r.fg), ['screen-lit', 'screen-lit', 'screen-lit']);
  });

  test('every use is measured in both themes, so each row of the guide\'s table has a light and a dark ratio', () => {
    for (const brand of BRANDS) {
      const uses = (theme) => [...new Set(report.rows.filter((r) => r.brand === brand.name && r.theme === theme).map((r) => r.what))].sort();
      assert.deepEqual(uses('light'), uses('dark'), brand.name);
    }
  });

  test('NCode Blue as text on the page passes in both themes, with the ratios the guide shows', () => {
    const row = (theme) => report.rows.find((r) => r.brand === 'NCode Blue' && r.theme === theme && r.fg === 'primary-text' && r.bg === 'page');
    assert.ok(row('light').ratio >= TEXT);
    assert.ok(row('dark').ratio >= TEXT);
    assert.match(read('guidelines/02-color.md'), new RegExp(`\\| Brand as text, lamp, focus ring \\| 6 \\| 4\\.5 \\| \\d+\\.\\d\\d / \\d+\\.\\d\\d \\|`));
  });
});

/** The token source with engraved labels at stone 450 in the light theme, and the edge of a control at stone 400. */
function lowered() {
  const source = readJson('src/tokens.source.json');
  source.semantic.color.text['text-muted'].value.light = '{stone.450}';
  source.semantic.color.line['border-strong'].value = '{stone.400}';
  return source;
}

describe('a palette below its floor', () => {
  test('fails the pairings it breaks, at 4.5 to 1 for text and 3 to 1 for a part, and keeps the ones it does not', () => {
    const low = contrastReport(buildModel(lowered()));
    const rows = (fg, theme) => low.rows.filter((r) => r.brand === 'NCode Blue' && r.fg === fg && r.theme === theme);
    assert.equal(rows('text-muted', 'light').length, 5);
    for (const r of rows('text-muted', 'light')) {
      assert.equal(r.need, TEXT, r.bg);
      assert.ok(r.ratio < TEXT, `${r.bg}: ${r.ratio}`);
      assert.equal(r.pass, false, r.bg);
    }
    assert.equal(rows('border-strong', 'light').length, 6);
    for (const r of rows('border-strong', 'light')) {
      assert.equal(r.need, UI, r.bg);
      assert.ok(r.ratio < UI, `${r.bg}: ${r.ratio}`);
      assert.equal(r.pass, false, r.bg);
    }
    assert.ok(rows('border-strong', 'dark').every((r) => r.pass), 'stone 400 is light enough for every dark ground');
    assert.ok(low.rows.filter((r) => r.fg !== 'text-muted' && r.fg !== 'border-strong').every((r) => r.pass));
  });

  describe('in a build', () => {
    let repo;
    before(() => {
      repo = copyRepository();
    });
    after(() => repo.remove());

    test('the build writes its files and exits 1, naming each pairing below its floor; the check then fails on that alone', () => {
      const source = join(repo.dir, 'src/tokens.source.json');
      const text = readFileSync(source, 'utf8');
      writeFileSync(source, text.replace('"text-muted": { "value": { "light": "{stone.600}"', '"text-muted": { "value": { "light": "{stone.450}"'));
      assert.notEqual(readFileSync(source, 'utf8'), text);
      const built = runNode(repo.dir, ['build.mjs']);
      assert.equal(built.code, 1, built.output);
      assert.match(built.output, /^ {2}NCode Blue, light: text-muted on page is 2\.53, needs 4\.5$/m);
      assert.match(built.output, /^Contrast: \d+ measurements of \d+ pairings, 5 below the requirement\.$/m);
      const checked = runNode(repo.dir, ['build.mjs', '--check']);
      assert.equal(checked.code, 1, checked.output);
      assert.match(checked.output, /No file would change\./);
    });
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
