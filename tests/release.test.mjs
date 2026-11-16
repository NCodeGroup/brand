// The release: manifest.json lists every released file and nothing else, the logo files keep within their platforms'
// limits, and vendoring/vendor-brand.mjs copies and checks a consumer's files, and refuses a release that does not match,
// an address it should not trust and a path that would take a write outside the consumer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { LIMITS } from '../lib/logo.mjs';
import { ROOT, readJson, runNode } from './helpers.mjs';

const manifest = readJson('manifest.json');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const filesUnder = (folder) =>
  readdirSync(join(ROOT, folder), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(ROOT, join(e.parentPath, e.name)).split(sep).join('/'));

describe('manifest.json', () => {
  test('lists every file of the generated folders and the released sources, and nothing else', () => {
    const expected = [
      ...['tokens', 'css', 'fonts', 'brace', 'logo', 'mui'].flatMap(filesUnder),
      'LICENSE.txt', 'COPYRIGHT.txt', 'TRADEMARKS.md', 'vendoring/vendor-brand.mjs',
    ].sort();
    assert.deepEqual(Object.keys(manifest.files), expected);
  });

  test('holds the size and SHA-256 of each file as it is, and the package version', () => {
    assert.equal(manifest.version, readJson('package.json').version);
    for (const [path, entry] of Object.entries(manifest.files)) {
      const bytes = readFileSync(join(ROOT, path));
      assert.equal(entry.bytes, bytes.length, path);
      assert.equal(entry.sha256, sha256(bytes), path);
    }
  });
});

describe('the logo kit', () => {
  test('every file keeps within the limit of the platform it is for', () => {
    const limit = { nuget: LIMITS.nuget, github: LIMITS.github, gitlab: LIMITS.gitlab, myapps: LIMITS.myapps };
    for (const [folder, max] of Object.entries(limit)) {
      for (const path of filesUnder(`logo/ncode/${folder}`)) assert.ok(statSync(join(ROOT, path)).size <= max, `${path} is over ${max} bytes`);
    }
  });

  test('the NuGet tile is the 128-pixel blue tile NuGet recommends', () => {
    const png = readFileSync(join(ROOT, 'logo/ncode/nuget/ncode-nuget-tile-blue.png'));
    assert.equal(png.readUInt32BE(16), 128);
    assert.equal(png.readUInt32BE(20), 128);
  });
});

/**
 * Stands in for fetch in the vendoring script's process, loaded with --import, so an https address needs no network:
 * it serves the release folder at any address, as BRAND_FETCH_STUB says. It answers only a request that follows no
 * redirect and has a timeout, except in "redirect" mode, where it answers as a server that redirects to another host
 * does: a fetch that follows the redirect gets what that host serves.
 */
const FETCH_STUB = `import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const { release, other, mode } = JSON.parse(process.env.BRAND_FETCH_STUB);
globalThis.fetch = async (url, init = {}) => {
  const name = decodeURIComponent(new URL(url).pathname.slice(1));
  if (mode === 'redirect') {
    if (init.redirect === 'manual') return new Response(null, { status: 302, headers: { location: 'http://mirror.example/' + name } });
    return new Response(readFileSync(join(other, name)));
  }
  if (init.redirect !== 'manual' || !(init.signal instanceof AbortSignal)) throw new TypeError('a request that follows redirects or has no timeout');
  const bytes = readFileSync(join(release, name));
  return new Response(mode === 'large' && name !== 'manifest.json' ? Buffer.concat([bytes, Buffer.from('more')]) : bytes);
};
`;

describe('vendoring/vendor-brand.mjs', () => {
  let consumer;
  let release;
  let other;
  let stub;
  const script = () => join(consumer, 'vendor-brand.mjs');
  const lockPath = () => join(consumer, 'brand.lock.json');
  const lock = (files, at = '0.0.0') => writeFileSync(lockPath(), `${JSON.stringify({ version: at, files }, null, 2)}\n`);
  const vendor = (...args) => runNode(consumer, [script(), ...args]);
  /** The script with fetch stood in for, reading a release at an https address. */
  const vendorOverHttps = (mode, ...args) =>
    runNode(consumer, ['--import', pathToFileURL(stub).href, script(), ...args], { BRAND_FETCH_STUB: JSON.stringify({ release, other, mode }) });
  const version = manifest.version;
  const write = (path, text) => {
    mkdirSync(join(consumer, path, '..'), { recursive: true });
    writeFileSync(join(consumer, path), text);
  };

  before(() => {
    consumer = mkdtempSync(join(tmpdir(), 'ncode-brand-consumer-'));
    release = mkdtempSync(join(tmpdir(), 'ncode-brand-release-'));
    other = mkdtempSync(join(tmpdir(), 'ncode-brand-other-'));
    stub = join(other, 'fetch-stub.mjs');
    writeFileSync(stub, FETCH_STUB);
    cpSync(join(ROOT, 'vendoring/vendor-brand.mjs'), script());
    for (const path of ['manifest.json', ...Object.keys(manifest.files)]) cpSync(join(ROOT, path), join(release, path));
    // Another release of the same version, whose manifest matches its own altered tokens.css: what a host that answers
    // in the release's place could serve.
    for (const path of ['manifest.json', 'tokens/tokens.css']) cpSync(join(ROOT, path), join(other, path));
    const altered = Buffer.from('/* not the release */\n');
    writeFileSync(join(other, 'tokens/tokens.css'), altered);
    const otherManifest = structuredClone(manifest);
    otherManifest.files['tokens/tokens.css'] = { bytes: altered.length, sha256: sha256(altered) };
    writeFileSync(join(other, 'manifest.json'), JSON.stringify(otherManifest));
  });
  after(() => {
    for (const folder of [consumer, release, other]) rmSync(folder, { recursive: true, force: true });
  });

  test('an update copies the files the lock names from a release folder and pins their hashes', () => {
    lock({
      'src/brand/tokens.css': { source: 'tokens/tokens.css', sha256: '' },
      'src/brand/fonts/instrument-sans-latin-wdth-normal.woff2': { source: 'fonts/instrument-sans-latin-wdth-normal.woff2', sha256: '' },
      'src/brand/derive.mjs': { source: 'tokens/derive.mjs', sha256: '' },
    });
    const result = vendor('--update', version, '--from', release);
    assert.equal(result.code, 0, result.output);
    const pinned = JSON.parse(readFileSync(join(consumer, 'brand.lock.json'), 'utf8'));
    assert.equal(pinned.version, version);
    assert.equal(pinned.files['src/brand/tokens.css'].sha256, manifest.files['tokens/tokens.css'].sha256);
    assert.deepEqual(readFileSync(join(consumer, 'src/brand/derive.mjs')), readFileSync(join(ROOT, 'tokens/derive.mjs')));
  });

  test('the check passes offline on what the update wrote, and fails, naming the file, once one is edited', () => {
    assert.equal(vendor('--check').code, 0);
    writeFileSync(join(consumer, 'src/brand/tokens.css'), '/* edited */\n');
    const result = vendor('--check');
    assert.equal(result.code, 1);
    assert.match(result.output, /src\/brand\/tokens\.css: differs from tokens\/tokens\.css of brand/);
  });

  test('an update refuses a release whose file does not match its manifest, and writes nothing', () => {
    const kept = readFileSync(join(consumer, 'src/brand/tokens.css'));
    writeFileSync(join(release, 'tokens/derive.mjs'), '/* tampered */\n');
    try {
      const result = vendor('--update', version, '--from', release);
      assert.equal(result.code, 1);
      assert.match(result.output, /tokens\/derive\.mjs: the download does not match the release's manifest/);
      assert.deepEqual(readFileSync(join(consumer, 'src/brand/tokens.css')), kept);
    } finally {
      cpSync(join(ROOT, 'tokens/derive.mjs'), join(release, 'tokens/derive.mjs'));
    }
  });

  test('an update refuses a release of another version', () => {
    const result = vendor('--update', '9.9.9', '--from', release);
    assert.equal(result.code, 1);
    assert.match(result.output, new RegExp(`The release is ${version.replaceAll('.', '\\.')}, not 9\\.9\\.9\\.`));
  });

  test('the check fails, naming the file, when a vendored file is missing or the lock pins no SHA-256 for it', () => {
    lock({
      'src/brand/missing.css': { source: 'tokens/tokens.css', sha256: manifest.files['tokens/tokens.css'].sha256 },
      'src/brand/unpinned.css': { source: 'tokens/tokens.css', sha256: '' },
    });
    const result = vendor('--check');
    assert.equal(result.code, 1);
    assert.match(result.output, /src\/brand\/missing\.css: missing/);
    assert.match(result.output, /src\/brand\/unpinned\.css: the lock has no SHA-256 for it; run --update/);
  });

  test('an update refuses a lock entry whose source the release does not have', () => {
    lock({ 'src/brand/none.css': { source: 'tokens/none.css', sha256: '' } });
    const result = vendor('--update', version, '--from', release);
    assert.equal(result.code, 1);
    assert.match(result.output, /has no tokens\/none\.css/);
  });

  test('an update reads a folder or an https address, and refuses any other address', () => {
    lock({ 'src/brand/tokens.css': { source: 'tokens/tokens.css', sha256: '' } });
    const result = vendor('--update', version, '--from', 'http://127.0.0.1:9/');
    assert.equal(result.code, 1);
    assert.match(result.output, /--from takes a folder or an https:\/\/ address, not http:\/\/127\.0\.0\.1:9\//);
  });

  test('an update over https asks for no redirect and a timeout, and refuses a redirect and an answer too large', () => {
    lock({ 'src/brand/https/tokens.css': { source: 'tokens/tokens.css', sha256: '' } });
    const from = ['--update', version, '--from', 'https://release.example/'];
    let result = vendorOverHttps('serve', ...from);
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(readFileSync(join(consumer, 'src/brand/https/tokens.css')), readFileSync(join(ROOT, 'tokens/tokens.css')));

    lock({ 'src/brand/redirected/tokens.css': { source: 'tokens/tokens.css', sha256: '' } });
    result = vendorOverHttps('redirect', ...from);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /manifest\.json: the address answered with a redirect to http:\/\/mirror\.example\/manifest\.json, which vendor-brand\.mjs does not follow/);
    assert.ok(!existsSync(join(consumer, 'src/brand/redirected')));

    lock({ 'src/brand/large/tokens.css': { source: 'tokens/tokens.css', sha256: '' } });
    result = vendorOverHttps('large', ...from);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, new RegExp(`tokens/tokens\\.css: the answer is larger than the ${manifest.files['tokens/tokens.css'].bytes} bytes the release's manifest gives it`));
    assert.ok(!existsSync(join(consumer, 'src/brand/large')));
  });

  test('an update refuses to pin another SHA-256 for a file of the version the lock already pins', () => {
    lock({ 'src/brand/pinned/tokens.css': { source: 'tokens/tokens.css', sha256: '' } });
    assert.equal(vendor('--update', version, '--from', release).code, 0);
    const pinned = readFileSync(lockPath(), 'utf8');
    const vendored = readFileSync(join(consumer, 'src/brand/pinned/tokens.css'));
    const result = vendor('--update', version, '--from', other);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, new RegExp(`src/brand/pinned/tokens\\.css: brand ${version.replaceAll('.', '\\.')} has another SHA-256 for tokens/tokens\\.css than the lock pins`));
    assert.equal(readFileSync(lockPath(), 'utf8'), pinned);
    assert.deepEqual(readFileSync(join(consumer, 'src/brand/pinned/tokens.css')), vendored);
  });

  test('an update checks every destination before it writes any: one that is a folder leaves every file as it was', () => {
    write('src/brand/first.css', '/* before */\n');
    mkdirSync(join(consumer, 'src/brand/second.css'), { recursive: true });
    lock({
      'src/brand/first.css': { source: 'tokens/tokens.css', sha256: '' },
      'src/brand/second.css': { source: 'css/base.css', sha256: '' },
    });
    const before = readFileSync(lockPath(), 'utf8');
    const result = vendor('--update', version, '--from', release);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /The vendored path "src\/brand\/second\.css" is not a file/);
    assert.equal(readFileSync(join(consumer, 'src/brand/first.css'), 'utf8'), '/* before */\n');
    assert.equal(readFileSync(lockPath(), 'utf8'), before);
  });

  test('a lock path that leaves its folder is refused, by its name or through a symbolic link', (t) => {
    lock({ '../outside.css': { source: 'tokens/tokens.css', sha256: '' } });
    let result = vendor('--update', version, '--from', release);
    assert.equal(result.code, 1);
    assert.match(result.output, /leaves its folder/);

    const outside = mkdtempSync(join(tmpdir(), 'ncode-brand-outside-'));
    try {
      writeFileSync(join(outside, 'profile'), 'keep\n');
      try {
        symlinkSync(outside, join(consumer, 'linked'), 'junction');
      } catch (error) {
        if (error.code === 'EPERM') return t.skip('this system makes no symbolic link without privileges');
        throw error;
      }
      lock({ 'linked/tokens.css': { source: 'tokens/tokens.css', sha256: '' } });
      result = vendor('--update', version, '--from', release);
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /The vendored path "linked\/tokens\.css" leaves its folder through a symbolic link/);
      assert.ok(!existsSync(join(outside, 'tokens.css')));

      mkdirSync(join(consumer, 'vendor'), { recursive: true });
      try {
        symlinkSync(join(outside, 'profile'), join(consumer, 'vendor/derive.mjs'));
      } catch (error) {
        if (error.code === 'EPERM') return t.skip('this system makes no symbolic link to a file without privileges');
        throw error;
      }
      lock({ 'vendor/derive.mjs': { source: 'tokens/derive.mjs', sha256: '' } });
      result = vendor('--update', version, '--from', release);
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /The vendored path "vendor\/derive\.mjs" leaves its folder through a symbolic link/);
      assert.equal(readFileSync(join(outside, 'profile'), 'utf8'), 'keep\n');
    } finally {
      rmSync(join(consumer, 'linked'), { force: true });
      rmSync(join(consumer, 'vendor'), { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
