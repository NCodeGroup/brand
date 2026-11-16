// The release: manifest.json lists every released file and nothing else, the logo files keep within their platforms'
// limits, and vendoring/vendor-brand.mjs copies and checks a consumer's files from the release's archive. It refuses an
// archive gh does not verify, one that does not match its manifest or is too large, and a path that would take a
// write outside the consumer. A write that fails partway leaves the consumer's files as they were.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { tarGz } from '../lib/archive.mjs';
import { LIMITS } from '../lib/logo.mjs';
import { ROOT, readJson, runNode } from './helpers.mjs';

const manifest = readJson('manifest.json');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const filesUnder = (folder) =>
  readdirSync(join(ROOT, folder), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(ROOT, join(e.parentPath, e.name)).split(sep).join('/'));
/**
 * manifest.json and every file it lists, as the release's archive holds them, with the bytes `changes` gives a path
 * instead.
 */
const releaseEntries = (changes = {}) =>
  ['manifest.json', ...Object.keys(manifest.files)].map((path) => [path, changes[path] ?? readFileSync(join(ROOT, path))]);

describe('manifest.json', () => {
  test('lists every file of the generated folders and the released sources, and nothing else', () => {
    const expected = [
      ...['tokens', 'css', 'fonts', 'brace', 'icons', 'logo', 'mui'].flatMap(filesUnder),
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
    for (const kit of ['ncode', 'identity']) {
      for (const [folder, max] of Object.entries(limit)) {
        for (const path of filesUnder(`logo/${kit}/${folder}`)) assert.ok(statSync(join(ROOT, path)).size <= max, `${path} is over ${max} bytes`);
      }
    }
  });

  test('the NuGet tile is the 128-pixel blue tile NuGet recommends', () => {
    for (const path of ['logo/ncode/nuget/ncode-nuget-tile-blue.png', 'logo/identity/nuget/ncode-identity-nuget-tile-blue.png']) {
      const png = readFileSync(join(ROOT, path));
      assert.equal(png.readUInt32BE(16), 128, path);
      assert.equal(png.readUInt32BE(20), 128, path);
    }
  });
});

/**
 * Stands in for the GitHub CLI in the vendoring script's process, loaded with --import, as BRAND_GH_STUB says. It
 * replaces spawnSync for the command gh alone and appends each call's arguments to "log" as a line of JSON. "release
 * download" copies "archive" to the file after --output. "attestation verify" answers as gh does in "mode": "verified"
 * names the SHA-256 of the file it is given, "other-digest" names another, "unverified" fails as gh does for an archive
 * with no attestation, and "missing" answers every call as a system without gh.
 */
const GH_STUB = `import childProcess from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, copyFileSync, readFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
const { archive, mode, log } = JSON.parse(process.env.BRAND_GH_STUB);
const spawnSync = childProcess.spawnSync;
childProcess.spawnSync = (command, args, options) => {
  if (command !== 'gh') return spawnSync(command, args, options);
  appendFileSync(log, JSON.stringify(args) + '\\n');
  if (mode === 'missing') {
    return { status: null, stdout: '', stderr: '', error: Object.assign(new Error('spawnSync gh ENOENT'), { code: 'ENOENT' }) };
  }
  if (args[0] === 'release' && args[1] === 'download') {
    copyFileSync(archive, args[args.indexOf('--output') + 1]);
    return { status: 0, stdout: '', stderr: '' };
  }
  if (args[0] === 'attestation' && args[1] === 'verify') {
    if (mode === 'unverified') return { status: 1, stdout: '', stderr: 'Error: failed to fetch attestations for subject\\n' };
    const sha256 = mode === 'other-digest' ? '0'.repeat(64) : createHash('sha256').update(readFileSync(args[2])).digest('hex');
    const verified = [{ verificationResult: { statement: { subject: [{ name: 'brand.tar.gz', digest: { sha256 } }] } } }];
    return { status: 0, stdout: JSON.stringify(verified), stderr: '' };
  }
  return { status: 1, stdout: '', stderr: 'stub: unexpected gh ' + args.join(' ') };
};
// The script imports spawnSync by name: this hands it the stand-in.
syncBuiltinESMExports();
`;

/**
 * Stands in for writeFileSync in the vendoring script's process, loaded with --import, as BRAND_FS_STUB says. With
 * "fail", a write to a file whose name starts with it fails, as on a full disk. With "plant", a symbolic link to
 * "target" appears where the script is about to create a file whose name starts with it, as another process could put
 * one there.
 */
const FS_STUB = `import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { basename } from 'node:path';
const { fail, plant, target } = JSON.parse(process.env.BRAND_FS_STUB);
const writeFileSync = fs.writeFileSync;
fs.writeFileSync = (file, data, options) => {
  const name = basename(String(file));
  if (fail && name.startsWith(fail)) throw Object.assign(new Error('ENOSPC: no space left on device, write ' + name), { code: 'ENOSPC' });
  if (plant && name.startsWith(plant) && !fs.lstatSync(file, { throwIfNoEntry: false })) fs.symlinkSync(target, file);
  return writeFileSync(file, data, options);
};
// The script imports writeFileSync by name: this hands it the stand-in.
syncBuiltinESMExports();
`;

describe('vendoring/vendor-brand.mjs', () => {
  let consumer;
  let other;
  let release;
  let forged;
  let ghStub;
  let fsStub;
  const script = () => join(consumer, 'vendor-brand.mjs');
  const lockPath = () => join(consumer, 'brand.lock.json');
  const lock = (files, at = '0.0.0') => writeFileSync(lockPath(), `${JSON.stringify({ version: at, files }, null, 2)}\n`);
  const vendor = (...args) => runNode(consumer, [script(), ...args]);
  const ghLog = () => join(other, 'gh.log');
  /** The script with gh stood in for, as GH_STUB says; stopped if it runs 20 seconds. */
  const vendorWithGh = (mode, archive, ...args) =>
    runNode(consumer, ['--import', pathToFileURL(ghStub).href, script(), ...args], { BRAND_GH_STUB: JSON.stringify({ archive, mode, log: ghLog() }) }, 20_000);
  const update = (...args) => vendorWithGh('verified', release, ...args);
  const calls = () => readFileSync(ghLog(), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  /** The script with gh and writeFileSync stood in for, as GH_STUB and FS_STUB say. */
  const vendorWithFs = (stubbed, ...args) =>
    runNode(
      consumer,
      ['--import', pathToFileURL(ghStub).href, '--import', pathToFileURL(fsStub).href, script(), ...args],
      { BRAND_GH_STUB: JSON.stringify({ archive: release, mode: 'verified', log: ghLog() }), BRAND_FS_STUB: JSON.stringify(stubbed) },
    );
  const version = manifest.version;
  const write = (path, text) => {
    mkdirSync(join(consumer, path, '..'), { recursive: true });
    writeFileSync(join(consumer, path), text);
  };

  before(() => {
    consumer = mkdtempSync(join(tmpdir(), 'ncode-brand-consumer-'));
    other = mkdtempSync(join(tmpdir(), 'ncode-brand-other-'));
    ghStub = join(other, 'gh-stub.mjs');
    writeFileSync(ghStub, GH_STUB);
    fsStub = join(other, 'fs-stub.mjs');
    writeFileSync(fsStub, FS_STUB);
    cpSync(join(ROOT, 'vendoring/vendor-brand.mjs'), script());
    release = join(other, `brand-${version}.tar.gz`);
    writeFileSync(release, tarGz(releaseEntries()));
    // Another release of the same version, whose manifest matches its own altered tokens.css: what a host that answers
    // in the release's place could serve.
    const altered = Buffer.from('/* not the release */\n');
    const otherManifest = structuredClone(manifest);
    otherManifest.files['tokens/tokens.css'] = { bytes: altered.length, sha256: sha256(altered) };
    forged = join(other, 'forged.tar.gz');
    writeFileSync(forged, tarGz(releaseEntries({ 'manifest.json': Buffer.from(JSON.stringify(otherManifest)), 'tokens/tokens.css': altered })));
  });
  after(() => {
    for (const folder of [consumer, other]) rmSync(folder, { recursive: true, force: true });
  });

  test("an update copies the files the lock names from the release's archive and pins their hashes", () => {
    lock({
      'src/brand/tokens.css': { source: 'tokens/tokens.css', sha256: '' },
      'src/brand/fonts/instrument-sans-latin-wdth-normal.woff2': { source: 'fonts/instrument-sans-latin-wdth-normal.woff2', sha256: '' },
      'src/brand/derive.mjs': { source: 'tokens/derive.mjs', sha256: '' },
    });
    const result = update('--update', version, '--from', release);
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
    const tampered = join(other, 'tampered.tar.gz');
    writeFileSync(tampered, tarGz(releaseEntries({ 'tokens/derive.mjs': Buffer.from('/* tampered */\n') })));
    const result = update('--update', version, '--from', tampered);
    assert.equal(result.code, 1);
    assert.match(result.output, /tokens\/derive\.mjs: the archive does not match the release's manifest/);
    assert.deepEqual(readFileSync(join(consumer, 'src/brand/tokens.css')), kept);
  });

  test('an update refuses a release of another version', () => {
    const result = update('--update', '9.9.9', '--from', release);
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
    const result = update('--update', version, '--from', release);
    assert.equal(result.code, 1);
    assert.match(result.output, /has no tokens\/none\.css/);
  });

  test('an update takes --from as the path of an archive file, and refuses an address', () => {
    lock({ 'src/brand/tokens.css': { source: 'tokens/tokens.css', sha256: '' } });
    const result = update('--update', version, '--from', 'https://release.example/');
    assert.equal(result.code, 1);
    assert.match(result.output, /--from takes the path of an archive file, not https:\/\/release\.example\//);
  });

  test('an update refuses to pin another SHA-256 for a file of the version the lock already pins', () => {
    lock({ 'src/brand/pinned/tokens.css': { source: 'tokens/tokens.css', sha256: '' } });
    assert.equal(update('--update', version, '--from', release).code, 0);
    const pinned = readFileSync(lockPath(), 'utf8');
    const vendored = readFileSync(join(consumer, 'src/brand/pinned/tokens.css'));
    const result = update('--update', version, '--from', forged);
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
    const lockText = readFileSync(lockPath(), 'utf8');
    const result = update('--update', version, '--from', release);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /The vendored path "src\/brand\/second\.css" is not a file/);
    assert.equal(readFileSync(join(consumer, 'src/brand/first.css'), 'utf8'), '/* before */\n');
    assert.equal(readFileSync(lockPath(), 'utf8'), lockText);
  });

  test('an update whose write fails partway leaves every vendored file and the lock as they were', () => {
    write('src/brand/write/first.css', '/* before */\n');
    lock({
      'src/brand/write/first.css': { source: 'tokens/tokens.css', sha256: '' },
      'src/brand/write/second.css': { source: 'css/base.css', sha256: '' },
    });
    const lockText = readFileSync(lockPath(), 'utf8');
    const result = vendorWithFs({ fail: 'second.css' }, '--update', version, '--from', release);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /ENOSPC: no space left on device, write second\.css/);
    assert.equal(readFileSync(join(consumer, 'src/brand/write/first.css'), 'utf8'), '/* before */\n');
    // Nothing written beside them is left behind.
    assert.deepEqual(readdirSync(join(consumer, 'src/brand/write')), ['first.css']);
    assert.equal(readFileSync(lockPath(), 'utf8'), lockText);
  });

  test('an update writes through no symbolic link that appears where it creates a file', (t) => {
    const outside = mkdtempSync(join(tmpdir(), 'ncode-brand-outside-'));
    const raced = join(consumer, 'src/brand/raced');
    try {
      writeFileSync(join(outside, 'profile'), 'keep\n');
      try {
        symlinkSync(join(outside, 'profile'), join(outside, 'probe'));
      } catch (error) {
        if (error.code === 'EPERM') return t.skip('this system makes no symbolic link to a file without privileges');
        throw error;
      }
      lock({ 'src/brand/raced/tokens.css': { source: 'tokens/tokens.css', sha256: '' } });
      const lockText = readFileSync(lockPath(), 'utf8');
      const result = vendorWithFs({ plant: 'tokens.css', target: join(outside, 'profile') }, '--update', version, '--from', release);
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /EEXIST/);
      assert.equal(readFileSync(join(outside, 'profile'), 'utf8'), 'keep\n');
      assert.equal(lstatSync(join(raced, 'tokens.css'), { throwIfNoEntry: false }), undefined);
      assert.equal(readFileSync(lockPath(), 'utf8'), lockText);
    } finally {
      rmSync(raced, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test('a lock path that leaves its folder is refused, by its name or through a symbolic link', (t) => {
    lock({ '../outside.css': { source: 'tokens/tokens.css', sha256: '' } });
    let result = update('--update', version, '--from', release);
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
      result = update('--update', version, '--from', release);
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
      result = update('--update', version, '--from', release);
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
