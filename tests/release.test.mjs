// The release: manifest.json lists every released file and nothing else, the logo files keep within their platforms'
// limits, and vendoring/vendor-brand.mjs copies and checks a consumer's files, and refuses a release that does not match.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { after, before, describe, test } from 'node:test';
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

describe('vendoring/vendor-brand.mjs', () => {
  let consumer;
  let release;
  const script = () => join(consumer, 'vendor-brand.mjs');
  const lock = (files) => writeFileSync(join(consumer, 'brand.lock.json'), `${JSON.stringify({ version: '0.0.0', files }, null, 2)}\n`);
  const vendor = (...args) => runNode(consumer, [script(), ...args]);
  const version = manifest.version;

  before(() => {
    consumer = mkdtempSync(join(tmpdir(), 'ncode-brand-consumer-'));
    release = mkdtempSync(join(tmpdir(), 'ncode-brand-release-'));
    cpSync(join(ROOT, 'vendoring/vendor-brand.mjs'), script());
    for (const path of ['manifest.json', ...Object.keys(manifest.files)]) cpSync(join(ROOT, path), join(release, path));
  });
  after(() => {
    rmSync(consumer, { recursive: true, force: true });
    rmSync(release, { recursive: true, force: true });
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
    const before = readFileSync(join(consumer, 'src/brand/tokens.css'));
    writeFileSync(join(release, 'tokens/derive.mjs'), '/* tampered */\n');
    const result = vendor('--update', version, '--from', release);
    assert.equal(result.code, 1);
    assert.match(result.output, /tokens\/derive\.mjs: the download does not match the release's manifest/);
    assert.deepEqual(readFileSync(join(consumer, 'src/brand/tokens.css')), before);
    cpSync(join(ROOT, 'tokens/derive.mjs'), join(release, 'tokens/derive.mjs'));
  });

  test('an update refuses a release of another version', () => {
    const result = vendor('--update', '9.9.9', '--from', release);
    assert.equal(result.code, 1);
    assert.match(result.output, new RegExp(`The release is ${version.replaceAll('.', '\\.')}, not 9\\.9\\.9\\.`));
  });

  test('a lock path that leaves its folder is refused', () => {
    lock({ '../outside.css': { source: 'tokens/tokens.css', sha256: '' } });
    const result = vendor('--update', version, '--from', release);
    assert.equal(result.code, 1);
    assert.match(result.output, /leaves its folder/);
  });
});
