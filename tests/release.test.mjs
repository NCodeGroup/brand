// The release: manifest.json lists every released file and nothing else, the logo files keep within their platforms'
// limits, and vendoring/vendor-brand.mjs copies and checks a consumer's files from the release's archive. It refuses an
// archive gh does not verify, one that does not match its manifest or is too large, and a path that would take a
// write outside the consumer. A write that fails partway leaves the consumer's files as they were.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { tarGz } from '../lib/archive.mjs';
import { LIMITS } from '../lib/logo.mjs';
import { releaseNotes } from '../tools/release-notes.mjs';
import { ROOT, read, readJson, runNode } from './helpers.mjs';

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
      ...['tokens', 'css', 'fonts', 'brace', 'icons', 'logo', 'mui', 'syntax', 'email', 'slides'].flatMap(filesUnder),
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

  test("starts with its #! line, then the copyright and SPDX license lines a consumer's header check reads", () => {
    const lines = read('vendoring/vendor-brand.mjs').split('\n').slice(0, 4);
    assert.deepEqual(lines, ['#!/usr/bin/env node', '// Copyright © NCode Group', '// SPDX-License-Identifier: Apache-2.0', '']);
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

  /** Locks tokens.css under src/brand/<folder>/ and returns the lock's text, to compare after a refused update. */
  const lockOne = (folder) => {
    lock({ [`src/brand/${folder}/tokens.css`]: { source: 'tokens/tokens.css', sha256: '' } });
    return readFileSync(lockPath(), 'utf8');
  };
  /** Asserts that an update wrote nothing: the folder `lockOne` locked does not exist and the lock is as it was. */
  const assertUntouched = (folder, lockText) => {
    assert.ok(!existsSync(join(consumer, 'src/brand', folder)), `src/brand/${folder} exists`);
    assert.equal(readFileSync(lockPath(), 'utf8'), lockText);
  };

  test("an update without --from downloads the archive of the release's tag with gh, verifies it as publish.yml signs it, and leaves no download behind", () => {
    lockOne('download');
    rmSync(ghLog(), { force: true });
    const result = update('--update', version);
    assert.equal(result.code, 0, result.output);
    const [download, verify] = calls();
    const archive = download[download.indexOf('--output') + 1];
    assert.deepEqual(download, ['release', 'download', `v${version}`, '--repo', 'NCodeGroup/brand', '--pattern', `brand-${version}.tar.gz`, '--output', archive]);
    assert.deepEqual(verify, [
      'attestation', 'verify', archive, '--repo', 'NCodeGroup/brand', '--signer-workflow', 'NCodeGroup/brand/.github/workflows/publish.yml',
      '--source-ref', `refs/tags/v${version}`, '--deny-self-hosted-runners', '--format', 'json',
    ]);
    assert.ok(!existsSync(dirname(archive)));
    assert.deepEqual(readFileSync(join(consumer, 'src/brand/download/tokens.css')), readFileSync(join(ROOT, 'tokens/tokens.css')));
    rmSync(join(consumer, 'src/brand/download'), { recursive: true, force: true });
  });

  test('an update refuses an archive gh does not verify, or whose attestation names another SHA-256, and writes nothing', () => {
    const lockText = lockOne('verify');
    let result = vendorWithGh('unverified', release, '--update', version, '--from', release);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /gh attestation verify failed: Error: failed to fetch attestations for subject/);
    assertUntouched('verify', lockText);
    result = vendorWithGh('other-digest', release, '--update', version, '--from', release);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /gh verified an attestation, but none names the archive's SHA-256/);
    assertUntouched('verify', lockText);
  });

  test('an update without the GitHub CLI says where to get it', () => {
    const lockText = lockOne('missing');
    const result = vendorWithGh('missing', release, '--update', version, '--from', release);
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /--update needs the GitHub CLI, gh, to download a release and verify its attestation: install it from https:\/\/cli\.github\.com/);
    assertUntouched('missing', lockText);
  });

  test('an update refuses an archive larger than 64 MiB before gh sees it, and one that unpacks to more than 256 MiB', () => {
    const lockText = lockOne('bounds');
    const large = join(other, 'large.tar.gz');
    const bomb = join(other, 'bomb.tar.gz');
    try {
      writeFileSync(large, '');
      truncateSync(large, 64 * 1024 * 1024 + 1);
      rmSync(ghLog(), { force: true });
      let result = update('--update', version, '--from', large);
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /the archive is larger than 67108864 bytes/);
      assert.ok(!existsSync(ghLog()));
      assertUntouched('bounds', lockText);
      writeFileSync(bomb, gzipSync(Buffer.alloc(256 * 1024 * 1024 + 1)));
      result = update('--update', version, '--from', bomb);
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /the archive unpacks to more than 268435456 bytes/);
      assertUntouched('bounds', lockText);
    } finally {
      rmSync(large, { force: true });
      rmSync(bomb, { force: true });
    }
  });

  test('an update refuses an archive that holds a file its manifest does not list, lacks one it lists, or holds an entry that is not a file', () => {
    const lockText = lockOne('entries');
    const folder = Buffer.from(gunzipSync(readFileSync(release)));
    // The first entry is manifest.json: type flag 5 makes it a folder.
    folder[156] = 0x35;
    const cases = [
      ['extra.tar.gz', tarGz([...releaseEntries(), ['tokens/extra.css', Buffer.from('/* extra */\n')]]), /holds tokens\/extra\.css, which the release's manifest does not list/],
      ['short.tar.gz', tarGz(releaseEntries().filter(([path]) => path !== 'css/base.css')), /css\/base\.css: the release's manifest lists it, but brand-[\d.]+\.tar\.gz does not hold it/],
      ['folder.tar.gz', gzipSync(folder), /holds manifest\.json, which is not a file/],
    ];
    for (const [file, bytes, message] of cases) {
      const path = join(other, file);
      writeFileSync(path, bytes);
      const result = update('--update', version, '--from', path);
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, message);
      assertUntouched('entries', lockText);
    }
  });

  test('an update reads an archive the system tar packs in the ustar format, as it reads the one lib/archive.mjs packs', (t) => {
    const staged = mkdtempSync(join(tmpdir(), 'ncode-brand-tar-'));
    try {
      const entries = releaseEntries();
      for (const [path, bytes] of entries) {
        mkdirSync(dirname(join(staged, path)), { recursive: true });
        writeFileSync(join(staged, path), bytes);
      }
      // tar, not lib/archive.mjs, packs it, so the reader is checked against another writer. The working folder and
      // relative names keep tar from reading `C:` as a host.
      const packed = spawnSync('tar', ['--format=ustar', '-czf', 'brand.tar.gz', ...entries.map(([path]) => path)], {
        cwd: staged,
        encoding: 'utf8',
      });
      if (packed.error?.code === 'ENOENT') return t.skip('this system has no tar');
      assert.equal(packed.status, 0, packed.stderr);
      lockOne('tar');
      const result = update('--update', version, '--from', join(staged, 'brand.tar.gz'));
      assert.equal(result.code, 0, result.output);
      assert.deepEqual(readFileSync(join(consumer, 'src/brand/tar/tokens.css')), readFileSync(join(ROOT, 'tokens/tokens.css')));
    } finally {
      rmSync(staged, { recursive: true, force: true });
      rmSync(join(consumer, 'src/brand/tar'), { recursive: true, force: true });
    }
  });

  test('an update rewrites the script itself when the lock names it, and the check then holds it', () => {
    writeFileSync(script(), `${read('vendoring/vendor-brand.mjs')}// an older copy\n`);
    lock({ 'vendor-brand.mjs': { source: 'vendoring/vendor-brand.mjs', sha256: '' } });
    const result = update('--update', version, '--from', release);
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(readFileSync(script()), readFileSync(join(ROOT, 'vendoring/vendor-brand.mjs')));
    const pinned = JSON.parse(readFileSync(lockPath(), 'utf8'));
    assert.equal(pinned.files['vendor-brand.mjs'].sha256, manifest.files['vendoring/vendor-brand.mjs'].sha256);
    assert.equal(vendor('--check').code, 0);
  });
});

describe('.github/workflows/publish.yml', () => {
  test('is the workflow vendor-brand.mjs requires to have signed the archive, started by workflow_dispatch with a tag and not by a release', () => {
    assert.ok(existsSync(join(ROOT, '.github/workflows/publish.yml')));
    assert.match(read('vendoring/vendor-brand.mjs'), /\$\{REPO\}\/\.github\/workflows\/publish\.yml/);
    const publish = read('.github/workflows/publish.yml');
    assert.match(publish, /^ {2}workflow_dispatch:\n {4}inputs:\n {6}tag:\n/m);
    assert.doesNotMatch(publish, /^ {2}release:/m);
  });

  test('creates a draft release, uploads the assets, and only then publishes it', () => {
    const publish = read('.github/workflows/publish.yml');
    const draft = publish.indexOf('--draft ');
    const upload = publish.indexOf('gh release upload');
    const publishAt = publish.indexOf('--draft=false');
    assert.ok(draft >= 0 && draft < upload && upload < publishAt, `${draft} ${upload} ${publishAt}`);
  });

  test('writes the release notes with tools/release-notes.mjs', () => {
    assert.match(read('.github/workflows/publish.yml'), /tools\/release-notes\.mjs/);
  });
});

describe('.github/workflows/publish-dispatch.yml', () => {
  test('starts publish.yml on the tag after the tagging workflow, and AGENTS.md sets release: tag', () => {
    const tagging = read('.github/workflows/tag-release.yml').match(/^name:\s*(.+?)\s*$/m)[1];
    const dispatch = read('.github/workflows/publish-dispatch.yml');
    assert.match(dispatch, /^ {2}workflow_run:/m);
    assert.ok(dispatch.includes(`workflows: [${tagging}]`), tagging);
    assert.ok(dispatch.includes('gh workflow run publish.yml --ref'));
    assert.match(read('AGENTS.md'), /^- release: tag$/m);
  });

  test('checks out no code, keys its concurrency group on the commit and still dispatches publish.yml', () => {
    const dispatch = read('.github/workflows/publish-dispatch.yml');
    assert.ok(!dispatch.includes('actions/checkout'));
    assert.match(dispatch, /^ {2}group:.*head_sha/m);
    assert.ok(dispatch.includes('gh workflow run publish.yml --ref'));
  });
});

describe('tools/release-notes.mjs', () => {
  const changelog = [
    '# Changelog', '', '## [Unreleased]', '', '### Added', '', '- Unreleased thing.', '',
    '## [0.9.0] - 2026-11-16', '', '- Nine thing.', '', '## [0.8.0] - 2026-01-01', '', '- Eight thing.', '',
    '[Unreleased]: https://example.com/unreleased', '[0.9.0]: https://example.com/0.9.0', '',
  ].join('\n');

  test('uses the version\'s section over [Unreleased] and stops at the next heading', () => {
    assert.equal(releaseNotes(changelog, '0.9.0'), '- Nine thing.');
  });

  test('uses [Unreleased] when the version has no section, and stops before the link reference definitions', () => {
    const only = ['# Changelog', '', '## [Unreleased]', '', '- Only thing.', '', '[Unreleased]: https://example.com/u', ''].join('\n');
    assert.equal(releaseNotes(only, '1.0.0'), '- Only thing.');
    assert.equal(releaseNotes(changelog, '1.0.0'), '### Added\n\n- Unreleased thing.');
  });

  test('throws on an empty section', () => {
    assert.throws(() => releaseNotes('## [Unreleased]\n\n## [0.1.0]\n\n- x\n', '2.0.0'), /empty/);
  });

  test('throws when the changelog has neither [Unreleased] nor the version', () => {
    assert.throws(() => releaseNotes('# Changelog\n\n## [0.1.0]\n\n- x\n', '2.0.0'), /no section/);
  });

  test('run as a script, fails without an output path and writes the notes with one', () => {
    const script = join(ROOT, 'tools', 'release-notes.mjs');
    const version = readJson('package.json').version;
    const failed = spawnSync(process.execPath, [script, version], { encoding: 'utf8' });
    assert.notEqual(failed.status, 0);
    assert.notEqual(failed.stderr.trim(), '');
    const folder = mkdtempSync(join(tmpdir(), 'ncode-brand-notes-'));
    try {
      const out = join(folder, 'notes.md');
      const ran = spawnSync(process.execPath, [script, version, out], { encoding: 'utf8' });
      assert.equal(ran.status, 0, ran.stderr);
      assert.equal(readFileSync(out, 'utf8'), `${releaseNotes(read('CHANGELOG.md'), version)}\n`);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
