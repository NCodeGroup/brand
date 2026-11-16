// The guide and the specimens: every relative link and image resolves, every custom property and class the guide names
// exists, and each specimen's icons, styles and scripts resolve inside the repository, with no request to another origin.
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { ROOT, read, readJson } from './helpers.mjs';

const markdown = [
  'README.md', 'CONTRIBUTING.md', 'TRADEMARKS.md', 'AGENTS.md', 'CHANGELOG.md', 'docs/README.md', 'logo/README.md',
  'src/logo/README.md', 'src/logo/kit.md', 'specimens/README.md',
  ...readdirSync(join(ROOT, 'guidelines')).map((n) => `guidelines/${n}`),
  ...readdirSync(join(ROOT, 'docs/decisions')).filter((n) => /^1\d{3}-.*\.md$/.test(n)).map((n) => `docs/decisions/${n}`),
];

/** Relative targets of Markdown links and images, and of src and href attributes, without anchors or code samples. */
function targets(markdownText) {
  const text = markdownText.replace(/^```[\s\S]*?^```/gm, '');
  const out = [];
  for (const m of text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)\)/g)) out.push(m[1]);
  for (const m of text.matchAll(/(?:src|href|srcset)="([^"]+)"/g)) out.push(m[1]);
  return out.filter((t) => !/^(https?:|mailto:|#|\/)/.test(t)).map((t) => t.split('#')[0]).filter(Boolean);
}

describe('links', () => {
  for (const file of markdown) {
    test(`${file}: every relative link and image resolves`, () => {
      const missing = targets(read(file)).filter((t) => !existsSync(join(ROOT, dirname(file), decodeURIComponent(t))));
      assert.deepEqual(missing, []);
    });
  }
});

describe('names in the guide', () => {
  const base = read('css/base.css');
  const declared = new Set([...`${read('tokens/tokens.css')}${base}`.matchAll(/(--nc-[\w-]+):/g)].map((m) => m[1]));

  test('every custom property the guide names exists', () => {
    const named = new Set();
    for (const file of markdown) for (const m of read(file).matchAll(/`(--nc-[a-z0-9-]+)`/g)) named.add(m[1]);
    for (const file of markdown) for (const m of read(file).matchAll(/(--nc-[a-z0-9-]+)(?=[`,. ]|$)/gm)) if (!m[1].endsWith('-')) named.add(m[1]);
    assert.ok(named.size > 20);
    assert.deepEqual([...named].filter((name) => !declared.has(name)), []);
  });

  test('every class the guide names is a class of css/base.css, a modifier written short included', () => {
    const named = new Set();
    for (const file of markdown.filter((f) => f.startsWith('guidelines/'))) {
      for (const line of read(file).split('\n')) {
        // "`.alert--success`, `--warning`" names .alert--warning: a modifier alone takes the block of the class before it.
        let block = null;
        for (const [, name] of line.matchAll(/`(\.[a-z][\w-]*|--(?!nc-)[a-z][\w-]*)`/g)) {
          if (name.startsWith('.')) {
            named.add(name.slice(1));
            block = name.slice(1).split('--')[0];
          } else if (block) named.add(`${block}${name}`);
        }
      }
    }
    for (const name of named) if (existsSync(join(ROOT, `.${name}`))) named.delete(name); // a dotfile, such as .node-version
    assert.ok(named.size > 15);
    assert.deepEqual([...named].filter((name) => !new RegExp(`\\.${name}(?![\\w-])`).test(base)), []);
  });

  test('no npm package or scope is named @ncode', () => {
    for (const file of [...markdown, 'package.json']) assert.doesNotMatch(read(file), /@ncode\//, file);
    assert.equal(readJson('package.json').name, '@ncodegroup/brand');
  });
});

describe('specimens', () => {
  const pages = readdirSync(join(ROOT, 'specimens')).filter((n) => n.endsWith('.html'));

  test('there are nine scenes', () => {
    assert.deepEqual(pages.sort(), ['consent', 'console', 'docs', 'foundations', 'hero', 'product', 'settings', 'signin', 'states'].map((n) => `${n}.html`));
  });

  for (const page of pages) {
    test(`${page}: every symbol it uses is in its sprite, and every file it loads exists, on this origin`, () => {
      const html = read(`specimens/${page}`);
      const symbols = new Set([...html.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]));
      const used = [...html.matchAll(/<use href="#([^"]+)"/g)].map((m) => m[1]);
      assert.deepEqual(used.filter((id) => !symbols.has(id)), []);
      const loads = [...html.matchAll(/<(?:link|script)[^>]*(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
      assert.ok(loads.length >= 4);
      assert.deepEqual(loads.filter((t) => /^[a-z]+:/i.test(t) || t.startsWith('//')), [], 'a request to another origin');
      assert.deepEqual(loads.filter((t) => !existsSync(join(ROOT, 'specimens', t.split('?')[0]))), []);
      assert.doesNotMatch(html, /\sstyle="/, 'an inline style, which the Content-Security-Policy refuses');
    });
  }

  test("the {N} mark in a specimen's sprite is the kit's own drawing", () => {
    const outlines = readJson('logo/ncode/outlines.json');
    for (const page of pages) {
      const mark = /<symbol id="logo-ncode-mark" viewBox="0 0 64 64"><path d="([^"]+)"/.exec(read(`specimens/${page}`));
      if (mark) assert.equal(mark[1], outlines.mark.d, page);
      const lockup = /<symbol id="logo-ncode" viewBox="0 0 212 64"><path d="([^"]+)"/.exec(read(`specimens/${page}`));
      if (lockup) assert.equal(lockup[1], outlines.lockup.d, page);
    }
  });
});
