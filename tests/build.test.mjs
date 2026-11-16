// build.mjs and its check, run on a copy of the repository: the committed output is what the sources give, and the
// check catches an edited, missing or extra file and an edited generated block, writes nothing, and a build repairs it.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { crc32 } from '../lib/png.mjs';
import { copyRepository, runNode } from './helpers.mjs';

describe('build.mjs', () => {
  let repo;
  before(() => {
    repo = copyRepository();
  });
  after(() => repo.remove());

  const check = () => runNode(repo.dir, ['build.mjs', '--check']);
  const build = () => runNode(repo.dir, ['build.mjs']);
  const path = (name) => join(repo.dir, name);

  test('the check passes on the committed files: every one is what the sources give', () => {
    const result = check();
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /No file would change\./);
  });

  test('the check fails on edited, missing and extra files and on an edited block, names each, and writes nothing', () => {
    const edited = 'tokens/tokens.css';
    const editedText = readFileSync(path(edited), 'utf8').replace('--nc-color-page: light-dark(', '--nc-color-page: light-dark( ');
    writeFileSync(path(edited), editedText);
    const removed = 'logo/ncode/tile/ncode-tile-dark-256.png';
    rmSync(path(removed));
    const extra = 'css/extra.css';
    writeFileSync(path(extra), '/* not generated */\n');
    const guide = 'guidelines/02-color.md';
    const guideText = readFileSync(path(guide), 'utf8').replace('| Blue | Brand |', '| Blue | Brand, edited |');
    writeFileSync(path(guide), guideText);

    const result = check();
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /^tokens\/tokens\.css {2}would change$/m);
    assert.match(result.output, /^logo\/ncode\/tile\/ncode-tile-dark-256\.png {2}missing$/m);
    assert.match(result.output, /^css\/extra\.css {2}would be removed/m);
    assert.match(result.output, /^guidelines\/02-color\.md {2}would change$/m);
    assert.match(result.output, /^manifest\.json {2}would change$/m);
    assert.equal(readFileSync(path(edited), 'utf8'), editedText);
    assert.equal(readFileSync(path(guide), 'utf8'), guideText);
    assert.ok(!existsSync(path(removed)));
    assert.ok(existsSync(path(extra)));
  });

  test('a build repairs all of it, and the check passes again', () => {
    const result = build();
    assert.equal(result.code, 0, result.output);
    assert.ok(existsSync(path('logo/ncode/tile/ncode-tile-dark-256.png')));
    assert.ok(!existsSync(path('css/extra.css')));
    const again = check();
    assert.equal(again.code, 0, again.output);
  });

  test('a PNG another encoder wrote is kept while it holds the same pixels', () => {
    const name = 'logo/ncode/nuget/ncode-nuget-tile-blue.png';
    const bytes = readFileSync(path(name));
    // The same image with an ancillary chunk before IEND: other bytes, the same pixels.
    const iend = bytes.length - 12;
    const text = Buffer.from('tEXtComment\0kept', 'latin1');
    const chunk = Buffer.alloc(12 + text.length - 4);
    chunk.writeUInt32BE(text.length - 4, 0);
    text.copy(chunk, 4);
    chunk.writeUInt32BE(crc32(text), 4 + text.length);
    writeFileSync(path(name), Buffer.concat([bytes.subarray(0, iend), chunk, bytes.subarray(iend)]));
    const result = check();
    assert.doesNotMatch(result.output, /ncode-nuget-tile-blue\.png/);
    assert.match(result.output, /^manifest\.json {2}would change$/m, 'the manifest hashes the bytes that stay');
  });

  test('a font that is not the file the lock pins stops the build', () => {
    const font = path('src/fonts/martian-mono-latin-wdth-normal.woff2');
    const bytes = readFileSync(font);
    bytes[bytes.length - 1] ^= 0xff;
    writeFileSync(font, bytes);
    const result = check();
    assert.equal(result.code, 1);
    assert.match(result.output, /src\/fonts\/martian-mono-latin-wdth-normal\.woff2 is not the file fonts\.lock\.json pins/);
  });
});
