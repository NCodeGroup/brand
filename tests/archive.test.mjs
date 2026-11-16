// lib/archive.mjs: the release archive is one tar reads, and its bytes depend on its entries alone.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { gunzipSync, gzipSync } from 'node:zlib';
import { tarGz, untarGz } from '../lib/archive.mjs';

const entries = [
  ['manifest.json', Buffer.from('{}\n')],
  ['tokens/tokens.css', Buffer.alloc(1000, 'a')],
  ['fonts/empty.txt', Buffer.alloc(0)],
];

test('tar lists the entries in order and extracts each file with its bytes', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'ncode-brand-archive-'));
  try {
    writeFileSync(join(dir, 'brand.tar.gz'), tarGz(entries));
    // The working folder and a relative name keep tar from reading `C:` as a host.
    const list = spawnSync('tar', ['-tzf', 'brand.tar.gz'], { cwd: dir, encoding: 'utf8' });
    if (list.error?.code === 'ENOENT') return t.skip('this system has no tar');
    assert.equal(list.status, 0, list.stderr);
    assert.deepEqual(list.stdout.trim().split(/\r?\n/), entries.map(([path]) => path));

    mkdirSync(join(dir, 'out'));
    const extract = spawnSync('tar', ['-xzf', 'brand.tar.gz', '-C', 'out'], { cwd: dir, encoding: 'utf8' });
    assert.equal(extract.status, 0, extract.stderr);
    for (const [path, data] of entries) {
      assert.deepEqual(readFileSync(join(dir, 'out', path)), data, path);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the gzip header names no time and no system, so the same entries give the same bytes', () => {
  const archive = tarGz(entries);
  assert.equal(archive.readUInt32LE(4), 0);
  assert.equal(archive[9], 255);
  assert.deepEqual(tarGz(entries), archive);
});

test('a path longer than 100 bytes is refused', () => {
  assert.throws(
    () => tarGz([['a'.repeat(101), Buffer.alloc(0)]]),
    /a path in the release archive is at most 100 bytes/,
  );
});

test('untarGz returns exactly the entries tarGz packed, in order', () => {
  assert.deepEqual([...untarGz(tarGz(entries))], entries);
});

test('untarGz refuses an archive that unpacks to more than its limit', () => {
  assert.throws(() => untarGz(tarGz(entries), { limit: 512 }), /unpacks to more than 512 bytes/);
});

test('untarGz skips a folder and refuses a path that occurs twice', () => {
  const tar = gunzipSync(tarGz([['dir', Buffer.alloc(0)], ...entries]));
  tar.write('5', 156, 'latin1'); // a folder
  assert.deepEqual([...untarGz(gzipSync(tar)).keys()], entries.map(([path]) => path));
  assert.throws(() => untarGz(tarGz([entries[0], entries[0]])), /holds manifest\.json twice/);
});
