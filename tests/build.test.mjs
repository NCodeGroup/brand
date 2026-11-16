// build.mjs and its check, run on a copy of the repository: the committed output is what the sources give, and the
// check catches an edited, missing or extra file, an edited or lost generated block and a font the lock does not pin,
// writes nothing, and a build repairs it. Nothing the build writes or removes leaves the repository. Each test that
// breaks something in the copy restores it, so the tests do not depend on their order.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { crc32, decodePng, truecolorPng } from '../lib/png.mjs';
import { ROOT, copyRepository, runNode } from './helpers.mjs';

describe('build.mjs', () => {
  let repo;
  before(() => {
    repo = copyRepository();
  });
  after(() => repo.remove());

  const check = () => runNode(repo.dir, ['build.mjs', '--check']);
  const build = () => runNode(repo.dir, ['build.mjs']);
  const path = (name) => join(repo.dir, name);
  /** Puts a file or folder of the copy back as the repository has it. */
  const restore = (name) => {
    rmSync(path(name), { recursive: true, force: true });
    cpSync(join(ROOT, name), path(name), { recursive: true });
  };

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

  test('a block build.mjs writes that is in no file, or twice in one, stops the check, naming the block', () => {
    const guide = 'guidelines/02-color.md';
    const text = readFileSync(path(guide), 'utf8');
    const open = '<!-- generated:ramps -->\n';
    const close = '<!-- /generated:ramps -->\n';
    try {
      writeFileSync(path(guide), text.replace(open, '').replace(close, ''));
      let result = check();
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /no generated block "ramps" in a file of guidelines\/: build\.mjs writes it/);
      // Without its opening marker a block is not found either; without its closing one it cannot be filled.
      writeFileSync(path(guide), text.replace(open, ''));
      result = check();
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /no generated block "ramps" in a file of guidelines\//);
      writeFileSync(path(guide), `${text}\n${open}${close}`);
      result = check();
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /guidelines\/02-color\.md holds the generated block "ramps" twice/);
    } finally {
      writeFileSync(path(guide), text);
    }
  });

  test('a font the lock does not pin, a pinned one that is missing and one that is not the pinned file stop the build', () => {
    const extra = path('src/fonts/extra-latin.woff2');
    const pinned = path('src/fonts/martian-mono-latin-wdth-normal.woff2');
    const bytes = readFileSync(pinned);
    try {
      writeFileSync(extra, 'a font no lock pins');
      let result = check();
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /src\/fonts has files fonts\.lock\.json does not pin: extra-latin\.woff2/);
      rmSync(extra);
      rmSync(pinned);
      result = check();
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /src\/fonts\/martian-mono-latin-wdth-normal\.woff2 is missing: fonts\.lock\.json names it/);
      const changed = Buffer.from(bytes);
      changed[changed.length - 1] ^= 0xff;
      writeFileSync(pinned, changed);
      result = check();
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /src\/fonts\/martian-mono-latin-wdth-normal\.woff2 is not the file fonts\.lock\.json pins/);
    } finally {
      rmSync(extra, { force: true });
      writeFileSync(pinned, bytes);
    }
  });

  test('every url() in the stylesheets names a file the release carries beside them', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
    const named = [];
    for (const sheet of ['css/base.css', 'css/fonts.css', 'css/starlight.css']) {
      const css = readFileSync(join(ROOT, sheet), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) named.push(join(dirname(sheet), m[1]).split('\\').join('/'));
    }
    assert.ok(named.some((file) => file.startsWith('fonts/')) && named.some((file) => file.startsWith('brace/')));
    assert.deepEqual(named.filter((file) => !(file in manifest.files) || !existsSync(join(ROOT, file))), []);
  });

  test('a font name that leaves src/fonts, or a symbolic link where the build writes, stops it before it writes', (t) => {
    const lock = 'src/fonts/fonts.lock.json';
    const lockText = readFileSync(path(lock), 'utf8');
    const outside = `${repo.dir}-outside`;
    const escaped = `${basename(repo.dir)}-escape.woff2`;
    mkdirSync(outside, { recursive: true });
    const victim = join(outside, 'report.docx');
    writeFileSync(victim, 'not the build\'s to remove\n');
    try {
      // src/fonts/../../<name> is a file of the copy, pinned by its true hash; fonts/../../<name> is outside the copy.
      writeFileSync(path(escaped), 'bytes');
      const parsed = JSON.parse(lockText);
      Object.values(parsed.families)[0].files[`../../${escaped}`] = { sha256: createHash('sha256').update('bytes').digest('hex') };
      writeFileSync(path(lock), JSON.stringify(parsed));
      let result = build();
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /fonts\.lock\.json names "\.\.\/\.\.\/[^"]+-escape\.woff2", which is not the name of a file in src\/fonts/);
      assert.ok(!existsSync(join(dirname(repo.dir), escaped)));
      writeFileSync(path(lock), lockText);

      // A generated folder that is a link, or a link inside one, would take a write or a removal outside the copy.
      try {
        rmSync(path('mui'), { recursive: true });
        symlinkSync(outside, path('mui'), 'junction');
      } catch (error) {
        if (error.code === 'EPERM') return t.skip('this system makes no symbolic link without privileges');
        throw error;
      }
      result = build();
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /mui is a symbolic link: build\.mjs writes and removes only real files inside the repository/);
      assert.ok(existsSync(victim));
      assert.ok(!existsSync(join(outside, 'instrument.json')));
      restore('mui');
      symlinkSync(outside, path('logo/ncode/badge/linked'), 'junction');
      result = build();
      assert.equal(result.code, 1, result.output);
      assert.match(result.output, /logo\/ncode\/badge\/linked is a symbolic link/);
      assert.ok(existsSync(victim));
    } finally {
      writeFileSync(path(lock), lockText);
      rmSync(path(escaped), { force: true });
      rmSync(join(dirname(repo.dir), escaped), { force: true });
      rmSync(path('logo/ncode/badge/linked'), { force: true });
      restore('mui');
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test('a PNG another encoder wrote is kept while it holds the same pixels, and rewritten once one pixel differs', () => {
    const kept = 'logo/ncode/nuget/ncode-nuget-tile-blue.png';
    const changed = 'logo/ncode/nuget/ncode-nuget-tile-dark.png';
    try {
      // The same image with an ancillary chunk before IEND: other bytes, the same pixels.
      const bytes = readFileSync(path(kept));
      const iend = bytes.length - 12;
      const text = Buffer.from('tEXtComment\0kept', 'latin1');
      const chunk = Buffer.alloc(12 + text.length - 4);
      chunk.writeUInt32BE(text.length - 4, 0);
      text.copy(chunk, 4);
      chunk.writeUInt32BE(crc32(text), 4 + text.length);
      writeFileSync(path(kept), Buffer.concat([bytes.subarray(0, iend), chunk, bytes.subarray(iend)]));
      // Another tile with one bit of the pixel at its center flipped, written by another encoder.
      const image = decodePng(readFileSync(path(changed)));
      image.data[(64 * image.width + 64) * 4] ^= 1;
      writeFileSync(path(changed), truecolorPng(image, true));

      const result = check();
      assert.equal(result.code, 1, result.output);
      assert.doesNotMatch(result.output, /ncode-nuget-tile-blue\.png/);
      assert.match(result.output, /^logo\/ncode\/nuget\/ncode-nuget-tile-dark\.png {2}would change$/m);
      assert.match(result.output, /^manifest\.json {2}would change$/m, 'the manifest hashes the bytes that stay');
    } finally {
      restore(kept);
      restore(changed);
    }
  });
});
