// The site's link rules of lib/guide.mjs: where a link of a guide source goes on the published page.
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import { describe, test } from 'node:test';
import { META_CSP, REPOSITORY, SITE_FOLDERS, guideFiles, guideLink, pageName } from '../lib/guide.mjs';
import { ROOT, read, readJson } from './helpers.mjs';

describe('guideLink', () => {
  const cases = [
    ['02-color.md', '02-color.html'],
    ['README.md', 'index.html'],
    ['12-applying.md#vendor-a-release', '12-applying.html#vendor-a-release'],
    ['#variants', '#variants'],
    ['https://cli.github.com', 'https://cli.github.com'],
    ['../specimens/foundations.html', '../specimens/foundations.html'],
    ['../logo/ncode/', 'https://github.com/NCodeGroup/brand/tree/main/logo/ncode'],
    ['../docs/decisions/1002-x.md', 'https://github.com/NCodeGroup/brand/blob/main/docs/decisions/1002-x.md'],
    ['../TRADEMARKS.md', 'https://github.com/NCodeGroup/brand/blob/main/TRADEMARKS.md'],
  ];

  for (const [target, expected] of cases) {
    test(`${target} goes to ${expected}`, () => {
      assert.equal(guideLink(target), expected);
    });
  }

  test('a link out of the repository throws', () => {
    assert.throws(() => guideLink('../../outside.md'), /leaves the repository/);
  });

  test('a guide source becomes its page', () => {
    assert.equal(pageName('01-marks.md'), '01-marks.html');
  });
});

describe('guideFiles', () => {
  const sources = () => [
    ['02-b.md', '# 2. B\n\n## One\n\nSee [A](01-a.md).\n'],
    ['README.md', '# Start Here\n\nRead [B](02-b.md#one).\n'],
    ['01-a.md', '# 1. A\n\nText.\n'],
  ];
  const input = (overrides = {}) => ({
    sources: sources(),
    version: '9.9.9',
    lockup: { viewBox: '0 0 212 64', d: 'M0 0Z' },
    page: read('src/guide/page.html'),
    index: read('src/guide/index.html'),
    css: '.x {}\n',
    ...overrides,
  });

  test('writes a page for each source, the stylesheet and the root page', () => {
    const files = guideFiles(input());
    assert.deepEqual([...files.keys()].sort(), [
      'guide/01-a.html',
      'guide/02-b.html',
      'guide/guide.css',
      'guide/index.html',
      'index.html',
    ]);
    for (const [path, text] of files) assert.ok(!text.includes('{{'), `${path} holds a placeholder`);
  });

  test('the first page is README.md, with its link rewritten, its own nav key and a next key', () => {
    const text = guideFiles(input()).get('guide/index.html');
    assert.ok(text.includes('<title>Start Here · Instrument</title>'));
    assert.ok(text.includes('href="02-b.html#one"'));
    assert.match(text, /<a class="navkey" href="index\.html" aria-current="page">/);
    assert.ok(!text.includes('<a class="navkey" href="01-a.html" aria-current="page">'));
    const nav = [...text.matchAll(/<li><a class="navkey" href="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(nav.indexOf('index.html') < nav.indexOf('01-a.html'));
    assert.ok(nav.indexOf('01-a.html') < nav.indexOf('02-b.html'));
    assert.match(text, /pagenav__key--next" href="01-a\.html"/);
    assert.ok(!text.includes('pagenav__key--prev'));
  });

  test('the last page lists its level-2 headings and has a prev key and no next key', () => {
    const text = guideFiles(input()).get('guide/02-b.html');
    assert.match(text, /<a class="toc__link" href="#one">/);
    assert.ok(text.includes('pagenav__key--prev'));
    assert.ok(!text.includes('pagenav__key--next'));
  });

  test('a page with no level-2 heading has no table of contents', () => {
    assert.ok(!guideFiles(input()).get('guide/01-a.html').includes('docs__toc'));
  });

  test('guide.css starts with a header comment and ends with the source', () => {
    const css = guideFiles(input()).get('guide/guide.css');
    assert.ok(css.startsWith('/* NCode Brand 9.9.9: guide/guide.css'));
    assert.ok(css.endsWith('.x {}\n'));
  });

  test('a placeholder the template has no value for throws', () => {
    assert.throws(() => guideFiles(input({ page: '{{nope}}' })), /\{\{nope\}\}/);
  });

  test('a source the renderer cannot render names its file', () => {
    assert.throws(() => guideFiles(input({ sources: [['01-a.md', '> q']] })), /guidelines\/01-a\.md: /);
  });
});

describe('the committed site', () => {
  const exists = (path) => existsSync(join(ROOT, path));
  const hasScheme = (target) => /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//');
  const sources = readdirSync(join(ROOT, 'guidelines'));
  const pages = readdirSync(join(ROOT, 'guide')).filter((name) => name.endsWith('.html'));

  test('guide/ holds a page for each file of guidelines/, the stylesheet and nothing else', () => {
    const expected = [...sources.map(pageName), 'guide.css'].sort();
    assert.deepEqual(readdirSync(join(ROOT, 'guide')).sort(), expected);
  });

  for (const page of pages) {
    test(`guide/${page}: the policy, no inline style, unique ids, local loads, links that resolve`, () => {
      const html = read(`guide/${page}`);
      assert.ok(
        html.includes(`<meta http-equiv="Content-Security-Policy" content="${META_CSP}">`),
        'the Content-Security-Policy <meta> element',
      );
      assert.ok(!html.includes(' style="'), 'an inline style, which the Content-Security-Policy refuses');
      assert.ok(!html.includes('<style'), 'a <style> element, which the Content-Security-Policy refuses');

      // Code samples show markup as text: a `href="…"` in a <code> element is no link.
      const markup = html.replace(/<code>[\s\S]*?<\/code>/g, '');
      const ids = [...markup.matchAll(/\sid="([^"]*)"/g)].map((match) => match[1]);
      assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), [], 'a repeated id');

      const loads = [...markup.matchAll(/<(?:link|script|img|use)\b[^>]*?\s(?:href|src)="([^"]*)"/g)].map((match) => match[1]);
      assert.ok(loads.length >= 4, 'the page loads its files');
      assert.deepEqual(loads.filter(hasScheme), [], 'a request to another origin');

      const lockup = /<symbol id="logo-ncode" viewBox="0 0 212 64"><path d="([^"]+)"/.exec(html);
      assert.ok(lockup, 'the logo-ncode symbol');
      assert.equal(lockup[1], readJson('logo/ncode/outlines.json').lockup.d);

      const broken = [];
      const targets = [...markup.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((match) => match[1]);
      for (const target of targets) {
        if (target.startsWith(`${REPOSITORY}/`)) {
          const match = /^(?:tree|blob)\/main\/([^#]*)/.exec(target.slice(REPOSITORY.length + 1));
          if (!match || !exists(match[1])) broken.push(`${target}: no such path in the repository`);
          continue;
        }
        if (hasScheme(target)) continue;
        const [beforeFragment, ...rest] = target.split('#');
        const fragment = rest.join('#');
        const file = beforeFragment.split('?')[0];
        const path = file === '' ? `guide/${page}` : posix.normalize(posix.join('guide', file));
        if (path !== 'index.html' && !SITE_FOLDERS.includes(path.split('/')[0])) {
          broken.push(`${target}: ${path} is not a published file`);
        } else if (!exists(path)) {
          broken.push(`${target}: ${path} does not exist`);
        } else if (fragment && /\.(?:html|svg)$/.test(path) && !read(path).includes(`id="${fragment}"`)) {
          broken.push(`${target}: ${path} has no id="${fragment}"`);
        }
      }
      assert.deepEqual(broken, []);
    });
  }

  test('index.html sends the reader to the guide, states the policy and links to files that exist', () => {
    const html = read('index.html');
    assert.ok(html.includes('url=guide/index.html'));
    assert.ok(html.includes(`<meta http-equiv="Content-Security-Policy" content="${META_CSP}">`));
    const hrefs = [...html.matchAll(/\shref="([^"]*)"/g)].map((match) => match[1]);
    assert.ok(hrefs.length > 0);
    assert.deepEqual(
      hrefs.filter((href) => !hasScheme(href) && !exists(href.split('#')[0].split('?')[0])),
      [],
    );
  });
});
