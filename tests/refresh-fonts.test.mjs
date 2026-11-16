// tools/refresh-fonts.mjs copies the fonts from the npm tarballs the font lock pins, after checking both hashes.
// The tests build a one-family lock and its tarball in a temporary folder, and never touch the network.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { tarGz } from '../lib/archive.mjs';
import { REGISTRY, integrityOf, refreshFonts } from '../tools/refresh-fonts.mjs';
import { ROOT, runNode } from './helpers.mjs';

const FONT = Buffer.from('a font, as bytes');
const LICENSE = Buffer.from('a license, as text\n');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const PACKED = tarGz([
  ['package/package.json', Buffer.from('{"name":"@fontsource-variable/test-sans","version":"1.0.0"}\n')],
  ['package/files/test-sans.woff2', FONT],
  ['package/LICENSE', LICENSE],
]);
const ADDRESS = `${REGISTRY}@fontsource-variable/test-sans/-/test-sans-1.0.0.tgz`;

let base;
let count = 0;
before(() => {
  base = mkdtempSync(join(tmpdir(), 'ncode-brand-fonts-'));
});
after(() => rmSync(base, { recursive: true, force: true }));

/** A new repository root with the lock of one family, `Test Sans`, and `from/` holding its tarball. */
function fixture({ tarball = ADDRESS, integrity = integrityOf(PACKED), fontHash = sha256(FONT) } = {}) {
  const root = join(base, `case-${count++}`);
  mkdirSync(join(root, 'src/fonts'), { recursive: true });
  mkdirSync(join(root, 'from'));
  const lock = {
    $description: 'A fixture.',
    families: {
      'Test Sans': {
        package: '@fontsource-variable/test-sans',
        version: '1.0.0',
        tarball,
        integrity,
        files: {
          'test-sans.woff2': { from: 'files/test-sans.woff2', sha256: fontHash },
          'OFL-Test-Sans.txt': { from: 'LICENSE', sha256: sha256(LICENSE) },
        },
      },
    },
  };
  writeFileSync(join(root, 'src/fonts/fonts.lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
  writeFileSync(join(root, 'from/test-sans-1.0.0.tgz'), PACKED);
  return { root, from: join(root, 'from') };
}

const font = (root, name) => join(root, 'src/fonts', name);

describe('refreshFonts', () => {
  test('copies both files, and a second run changes none', async () => {
    const { root, from } = fixture();
    const first = await refreshFonts({ root, from });
    assert.equal(first.changed, 2);
    assert.deepEqual(first.lines, ['src/fonts/test-sans.woff2  written', 'src/fonts/OFL-Test-Sans.txt  written']);
    assert.deepEqual(readFileSync(font(root, 'test-sans.woff2')), FONT);
    assert.deepEqual(readFileSync(font(root, 'OFL-Test-Sans.txt')), LICENSE);
    const second = await refreshFonts({ root, from });
    assert.equal(second.changed, 0);
    assert.deepEqual(second.lines, ['src/fonts/test-sans.woff2  unchanged', 'src/fonts/OFL-Test-Sans.txt  unchanged']);
  });

  test('check writes nothing, and reports the missing files, then the different one', async () => {
    const { root, from } = fixture();
    const missing = await refreshFonts({ root, from, check: true });
    assert.equal(missing.changed, 2);
    assert.deepEqual(missing.lines, ['src/fonts/test-sans.woff2  missing', 'src/fonts/OFL-Test-Sans.txt  missing']);
    assert.equal(existsSync(font(root, 'test-sans.woff2')), false);
    assert.equal(existsSync(font(root, 'OFL-Test-Sans.txt')), false);
    writeFileSync(font(root, 'test-sans.woff2'), 'another font');
    writeFileSync(font(root, 'OFL-Test-Sans.txt'), LICENSE);
    const different = await refreshFonts({ root, from, check: true });
    assert.equal(different.changed, 1);
    assert.deepEqual(different.lines, [
      'src/fonts/test-sans.woff2  differs from its tarball',
      'src/fonts/OFL-Test-Sans.txt  unchanged',
    ]);
    assert.equal(readFileSync(font(root, 'test-sans.woff2'), 'utf8'), 'another font');
  });

  test('a wrong integrity is refused, and no font is written', async () => {
    const { root, from } = fixture({ integrity: integrityOf(Buffer.from('another tarball')) });
    await assert.rejects(refreshFonts({ root, from }), /integrity/);
    assert.equal(existsSync(font(root, 'test-sans.woff2')), false);
    assert.equal(existsSync(font(root, 'OFL-Test-Sans.txt')), false);
  });

  test('a wrong sha256 is refused, unless pin sets it to the real hash', async () => {
    const { root, from } = fixture({ fontHash: sha256(Buffer.from('another font')) });
    await assert.rejects(refreshFonts({ root, from }), /SHA-256/);
    assert.equal(existsSync(font(root, 'test-sans.woff2')), false);
    const result = await refreshFonts({ root, from, pin: true });
    assert.equal(result.changed, 3);
    assert.ok(result.lines.includes('src/fonts/fonts.lock.json  pinned'));
    const lock = JSON.parse(readFileSync(font(root, 'fonts.lock.json'), 'utf8'));
    assert.equal(lock.families['Test Sans'].files['test-sans.woff2'].sha256, sha256(FONT));
    assert.deepEqual(readFileSync(font(root, 'test-sans.woff2')), FONT);
    await assert.rejects(refreshFonts({ root, from, check: true, pin: true }), /exclude each other/);
  });

  test('without from, it fetches the tarball address once, and refuses an address outside the registry', async () => {
    const { root } = fixture();
    const calls = [];
    const fetch = async (url, init) => {
      calls.push([url, init.headers['User-Agent']]);
      return new Response(PACKED);
    };
    const result = await refreshFonts({ root, fetch });
    assert.equal(result.changed, 2);
    assert.deepEqual(calls, [[ADDRESS, 'ncode-brand-refresh-fonts']]);
    assert.deepEqual(readFileSync(font(root, 'test-sans.woff2')), FONT);

    const failing = fixture();
    await assert.rejects(
      refreshFonts({ root: failing.root, fetch: async () => new Response('', { status: 404 }) }),
      /answered 404/,
    );

    const outside = fixture({ tarball: 'https://example.com/test-sans-1.0.0.tgz' });
    const none = [];
    await assert.rejects(
      refreshFonts({ root: outside.root, fetch: async (...args) => none.push(args) }),
      /^Error: @fontsource-variable\/test-sans 1\.0\.0: the tarball address https:\/\/example\.com\/test-sans-1\.0\.0\.tgz is not a \.tgz under https:\/\/registry\.npmjs\.org\/$/,
    );
    assert.equal(none.length, 0);
  });
});

test('--check together with --pin is a usage error', () => {
  assert.equal(runNode(ROOT, ['tools/refresh-fonts.mjs', '--check', '--pin']).code, 2);
});
