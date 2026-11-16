// tools/compare-kit.mjs compares two logo kits file by file: text byte for byte, PNG and ICO pixels within a tolerance.
// It needs no Playwright, so the tests run it on copies of a few files of the {N} kit.
import assert from 'node:assert/strict';
import { cpSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { decodePng, pngBytes } from '../lib/png.mjs';
import { compareKits } from '../tools/compare-kit.mjs';
import { ROOT, runNode } from './helpers.mjs';

const TILE = 'nuget/ncode-nuget-tile-blue.png';
let dir;
let a;
let b;
before(() => {
  dir = mkdtempSync(join(tmpdir(), 'ncode-brand-compare-'));
  a = join(dir, 'a');
  b = join(dir, 'b');
  cpSync(join(ROOT, 'logo/ncode/nuget'), join(a, 'nuget'), { recursive: true });
  cpSync(join(ROOT, 'logo/ncode/nuget'), join(b, 'nuget'), { recursive: true });
  copyFileSync(join(ROOT, 'README.md'), join(a, 'README.md'));
});
after(() => rmSync(dir, { recursive: true, force: true }));

/** Writes the tile into <b> with one color sample of an opaque pixel raised by 1. */
function raiseOneSample() {
  const image = decodePng(readFileSync(join(ROOT, 'logo/ncode', TILE)));
  const pixel = Array.from({ length: image.width * image.height }, (_, i) => i * 4)
    .find((i) => image.data[i + 3] === 255 && image.data[i] < 255);
  image.data[pixel] += 1;
  writeFileSync(join(b, TILE), pngBytes(image));
}

test('equal kits have no difference, and a top-level file is not compared', () => {
  const result = compareKits(a, b);
  assert.deepEqual(result, { compared: 5, differences: [] });
});

test('a sample that differs by 1 is a difference at tolerance 0 and none at tolerance 1', () => {
  raiseOneSample();
  const strict = compareKits(a, b);
  assert.equal(strict.differences.length, 1);
  assert.ok(strict.differences[0].startsWith(`${TILE}: `));
  assert.deepEqual(compareKits(a, b, { tolerance: 1 }), { compared: 5, differences: [] });
  copyFileSync(join(ROOT, 'logo/ncode', TILE), join(b, TILE));
});

test('a file only one folder holds is a difference', () => {
  const name = 'nuget/ncode-nuget-mark-blue.png';
  rmSync(join(b, name));
  try {
    const result = compareKits(a, b);
    assert.equal(result.compared, 4);
    assert.deepEqual(result.differences, [`${name}: only in ${a}`]);
  } finally {
    copyFileSync(join(ROOT, 'logo/ncode', name), join(b, name));
  }
});

test('the script exits 1 on a difference and 2 without arguments', () => {
  raiseOneSample();
  try {
    const different = runNode(ROOT, ['tools/compare-kit.mjs', a, b]);
    assert.equal(different.code, 1);
    assert.match(different.output, /5 files compared, 1 differ\./);
    assert.equal(runNode(ROOT, ['tools/compare-kit.mjs', a, b, '--tolerance=1']).code, 0);
  } finally {
    copyFileSync(join(ROOT, 'logo/ncode', TILE), join(b, TILE));
  }
  assert.equal(runNode(ROOT, ['tools/compare-kit.mjs']).code, 2);
});
