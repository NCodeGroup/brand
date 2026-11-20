// What the stylesheets promise beyond their tokens: a focus ring stays visible on a screen, a page prints in the light
// theme, Starlight paints only pairings the gate measures, and every swatch of the foundations page is legible.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { contrast } from '../lib/color.mjs';
import { BRANDS, PAIRINGS, TEXT, UI } from '../lib/contrast.mjs';
import { model, read, ROOT } from './helpers.mjs';

const m = model();

/** Every rule of a stylesheet, with the at-rules it sits in: { at: ['@media print'], selector, declarations }. */
function rules(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const walk = (from, to, at) => {
    let start = from;
    for (let i = from; i < to; i++) {
      if (text[i] === ';' && text.slice(start, i).trim().startsWith('@')) start = i + 1; // @import and the like
      if (text[i] !== '{') continue;
      const head = text.slice(start, i).trim().replace(/\s+/g, ' ');
      let depth = 1;
      let end = i + 1;
      for (; depth; end++) depth += text[end] === '{' ? 1 : text[end] === '}' ? -1 : 0;
      if (head.startsWith('@')) walk(i + 1, end - 1, [...at, head]);
      else {
        const declarations = Object.fromEntries(
          text.slice(i + 1, end - 1).split(';').map((d) => d.split(':')).filter((d) => d.length > 1).map(([k, ...v]) => [k.trim(), v.join(':').trim()]),
        );
        out.push({ at, selector: head, declarations });
      }
      start = end;
      i = end - 1;
    }
  };
  walk(0, text.length, []);
  return out;
}
const find = (list, selector) => list.filter((r) => r.selector.split(',').map((s) => s.trim()).includes(selector));

describe('focus on a screen', () => {
  const base = rules(read('css/base.css'));

  test('the ring is lit on a screen, and a listing that scrolls draws it inside its edge, where no clip cuts it', () => {
    const lit = find(base, '.screen :focus');
    assert.ok(lit.some((r) => r.declarations['outline-color'] === 'var(--nc-color-screen-lit)'), '.screen :focus is screen-lit');
    for (const selector of ['.screen pre:focus', '.command code:focus']) {
      assert.ok(find(base, selector).some((r) => r.declarations['outline-offset'] === 'calc(var(--nc-focus-width) * -1)'), selector);
    }
    // .screen clips what is outside it, so a ring 2 pixels outside a listing that fills it would not show.
    assert.equal(find(base, '.screen')[0].declarations.overflow, 'hidden');
  });

  test('the gate measures the lit ring against both grounds of a screen, for every brand', () => {
    for (const bg of ['screen', 'screen-raised']) {
      const pairing = PAIRINGS.find((p) => p.what === 'Focus ring on a screen' && p.fg === 'screen-lit' && p.bg === bg);
      assert.ok(pairing, bg);
      assert.equal(pairing.need, UI);
      assert.ok(pairing.brand && pairing.anyColor);
    }
  });
});

describe('printing', () => {
  test('tokens.css takes the light theme on paper, whatever data-theme or the system says', () => {
    const css = read('tokens/tokens.css');
    const print = rules(css).filter((r) => r.at.includes('@media print'));
    assert.ok(print.some((r) => r.selector === ':root, :root[data-theme]' && r.declarations['color-scheme'] === 'light'));
    // It comes after the rules that pin a theme, with as much specificity, so it wins.
    assert.ok(css.indexOf('@media print') > css.indexOf(':root[data-theme="dark"] { color-scheme: dark; }'));
  });

  for (const file of ['tokens/tokens.css', 'tokens/tokens.static.css']) {
    test(`${file}: the static palette's dark colors are for a screen alone`, () => {
      const dark = rules(read(file)).filter((r) => /^:root(\[data-theme="dark"\]|:not\(\[data-theme="light"\]\))$/.test(r.selector) && Object.keys(r.declarations).some((k) => k.startsWith('--nc-color-')));
      assert.equal(dark.length, 2);
      for (const r of dark) assert.ok(r.at.some((at) => /^@media screen\b/.test(at)), `${r.selector} in ${r.at.join(' ')}`);
    });
  }
});

describe('Starlight', () => {
  // The colors Starlight 0.42 paints on one another, by its custom properties: inverted text on the accent (the skip
  // link, the sidebar's current page, a file tree's highlight, the banner), a primary link button, and the accent as
  // the search field's focus border, on the field and on the dialog around it.
  const PAINTED = [
    ['--sl-color-text-invert', '--sl-color-text-accent', TEXT],
    ['--sl-color-text-invert', '--sl-color-bg-accent', TEXT],
    ['--sl-color-black', '--sl-color-text-accent', TEXT],
    ['--sl-color-accent', '--sl-color-black', UI],
    ['--sl-color-accent', '--sl-color-gray-6', UI],
  ];
  const declared = Object.assign({}, ...rules(read('css/starlight.css')).filter((r) => !r.at.length).map((r) => r.declarations));
  /** The color role a Starlight property reads, through any role that is only another role's name. */
  const role = (property) => {
    let name = /^var\(--nc-color-([\w-]+)\)$/.exec(declared[property] ?? '')?.[1];
    assert.ok(name, `${property} is not set to a color role`);
    for (let ref; (ref = /^\{color\.([\w-]+)\}$/.exec(m.colorByName.get(name).rule)?.[1]); ) name = ref;
    return name;
  };

  test('every pair it paints is a pairing the gate measures for every brand, at its floor or above', () => {
    for (const [fg, bg, need] of PAINTED) {
      const [a, b] = [role(fg), role(bg)];
      // One set of declarations serves both themes, so the pairing must be measured in both.
      const both = (p) => p.themes.includes('light') && p.themes.includes('dark');
      const measured = PAIRINGS.find((p) => ((p.fg === a && p.bg === b) || (p.fg === b && p.bg === a)) && p.need >= need && p.anyColor && both(p));
      assert.ok(measured, `${fg} (${a}) on ${bg} (${b}) is no pairing the gate measures at ${need} to 1`);
      assert.ok(measured.brand || ![a, b].some((name) => m.colorByName.get(name).brand), `${a} on ${b} is measured for NCode Blue alone`);
    }
    assert.ok(BRANDS.length > 1);
  });

  test("its headings follow the guide: 36 and 28 pixels where base.css sets a phone, the long-form roles' steps beyond", () => {
    const type = m.source.semantic.type;
    const all = rules(read('css/starlight.css'));
    const at = (media) => Object.assign({}, ...all.filter((r) => (media ? r.at.includes(media) : !r.at.length)).map((r) => r.declarations));
    // base.css sets a long-form page's phone headings up to and at its edge; Starlight's wide-screen steps start past
    // it, so at no width do both apply.
    const phone = find(rules(read('css/base.css')), '.prose > h1').filter((r) => r.at.length).map((r) => r.at.join(' '));
    assert.equal(phone.length, 1);
    const edge = /^@media \(max-width: ([\d.]+rem)\)$/.exec(phone[0])?.[1];
    assert.ok(edge, `${phone[0]} is a max-width query`);
    const wider = `@media (width > ${edge})`;
    assert.equal(at()['--sl-text-h1'], 'var(--nc-text-3xl)');
    assert.equal(at()['--sl-text-h2'], 'var(--nc-text-2xl)');
    assert.equal(at(wider)['--sl-text-h1'], `var(--nc-text-${type['title-long'].size})`);
    assert.equal(at(wider)['--sl-text-h2'], `var(--nc-text-${type['heading-long'].size})`);
    assert.equal(at()['--sl-line-height-headings'], String(type['heading-long'].leading));
    const media = all.filter((r) => r.at.length && ('--sl-text-h1' in r.declarations || '--sl-text-h2' in r.declarations));
    assert.deepEqual([...new Set(media.map((r) => r.at.join(' ')))], [wider]);
    for (const step of ['xl', '2xl', '3xl', '4xl', '5xl', '6xl']) assert.equal(at()[`--sl-text-${step}`], `var(--nc-text-${step})`, step);
  });
});

describe('the foundations page', () => {
  test('every swatch\'s step, hex and ratio reach 4.5 to 1 against the ink foundations.css paints them in', () => {
    const sheet = rules(read('specimens/foundations.css'));
    const inkOf = (selector) => /^var\(--nc-([a-z]+)-(\d+)\)$/.exec(find(sheet, selector)[0].declarations.color).slice(1);
    const hex = ([ramp, step]) => m.ramps[ramp].steps[step].hex;
    const [light, dark] = [hex(inkOf('.sw')), hex(inkOf('.sw--dark'))];
    const html = read('specimens/foundations.html');
    const swatches = [...html.matchAll(/<li class="sw sw-([a-z]+)-(\d+)( sw--dark)?">/g)];
    assert.equal(swatches.length, Object.values(m.ramps).reduce((n, r) => n + Object.keys(r.steps).length, 0));
    const low = swatches
      .map(([, ramp, step, onDark]) => [`${ramp}-${step}`, contrast(m.ramps[ramp].steps[step].hex, onDark ? dark : light)])
      .filter(([, ratio]) => ratio < TEXT)
      .map(([name, ratio]) => `${name}: ${ratio.toFixed(2)}`);
    assert.deepEqual(low, []);
  });
});

describe('base.css on a phone', () => {
  test('the console and a dialog set a field to 16 pixels except a small one, a textarea included', () => {
    const phone = rules(read('css/base.css')).filter((r) => r.at.join(' ') === '@media (max-width: 40rem)');
    const fields = phone
      .filter((r) => r.declarations['font-size'] === 'var(--nc-text-base)')
      .flatMap((r) => r.selector.split(',').map((s) => s.trim()))
      .filter((s) => /^\.(console|dialog) /.test(s) && /\.well|textarea/.test(s));
    assert.ok(fields.some((s) => s.includes('textarea')), 'the console sets its textareas');
    assert.ok(fields.length >= 3, fields.join(' | '));
    for (const selector of fields) assert.match(selector, /:not\(\.well--sm\)$/, selector);
  });
});

describe('fonts', () => {
  test('css/fonts.css sets Instrument Sans in italic beside each roman subset, from files in fonts/', () => {
    const faces = [...read('css/fonts.css').matchAll(/@font-face \{([^}]*)\}/g)].map((match) => match[1]);
    const ranges = (style) => faces
      .filter((face) => face.includes('font-family: "Instrument Sans Variable";') && face.includes(`font-style: ${style};`))
      .map((face) => /unicode-range: ([^;]+);/.exec(face)[1]);
    assert.equal(ranges('italic').length, 2);
    assert.deepEqual(ranges('italic'), ranges('normal'));
    for (const face of faces) {
      const file = /url\("\.\.\/(fonts\/[^"]+)"\)/.exec(face)[1];
      assert.ok(existsSync(join(ROOT, file)), file);
    }
  });
});
