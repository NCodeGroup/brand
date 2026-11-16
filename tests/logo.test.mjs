// The kit writer, lib/logo.mjs: the d of the {id} mark keeps the hole in its bowl at every size, its link previews
// center the lockup and the descriptor together, and a source whose letters it does not draw stops with an error.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createLogo } from '../lib/logo.mjs';
import { buildModel } from '../lib/model.mjs';
import { decodePng } from '../lib/png.mjs';
import { ROOT, readJson } from './helpers.mjs';

const identity = readJson('src/logo/identity.json');
const logo = createLogo(buildModel(readJson('src/tokens.source.json')), identity);
const alpha = (image, x, y) => image.data[(y * image.width + x) * 4 + 3];

test("the d's bowl keeps its hole, and its stem and bowl are ink, at every size of the {id} mark", () => {
  for (const size of [16, 20, 24, 32, 40, 48, 64]) {
    const s = size in logo.FITTED ? logo.FITTED[size] : logo.MASTER;
    const image = logo.drawMark(size, '#000000');
    const [left, right] = s.dX;
    const [top, middle, bottom] = s.letterY;
    const holeX = Math.floor((left + s.bowl + right - s.stem) / 2);
    const holeY = Math.floor((middle + bottom) / 2);
    assert.equal(alpha(image, holeX, holeY), 0, `${size}: the hole`);
    assert.equal(alpha(image, Math.floor(right - s.stem / 2), Math.floor((top + bottom) / 2)), 255, `${size}: the stem`);
    assert.ok(alpha(image, holeX, Math.floor(bottom - s.bowl / 2)) >= 128, `${size}: the bowl`);
  }
});

test('a source whose letters lib/logo.mjs does not draw stops with an error that names the kit', () => {
  assert.throws(
    () => createLogo(buildModel(readJson('src/tokens.source.json')), { ...identity, letters: 'x' }),
    { message: 'NCode Identity: letters is "x", not one of N, id' },
  );
});

test('the {id} link previews center the lockup and the descriptor together', () => {
  for (const card of ['social/ncode-identity-og', 'github/ncode-identity-github-social']) {
    for (const color of ['light', 'dark', 'blue']) {
      const path = `logo/identity/${card}-${color}.png`;
      const image = decodePng(readFileSync(join(ROOT, path)));
      const fill = Array.from(image.data.subarray(0, 4));
      const inked = (y) => {
        for (let x = 0; x < image.width; x += 1) {
          const i = (y * image.width + x) * 4;
          if (fill.some((sample, k) => image.data[i + k] !== sample)) return true;
        }
        return false;
      };
      let top = 0;
      while (!inked(top)) top += 1;
      let bottom = image.height - 1;
      while (!inked(bottom)) bottom -= 1;
      // The descriptor's descenders put the ink's middle a few pixels below the card's; a card that centered the
      // lockup alone would be about 30 pixels off.
      assert.ok(Math.abs((top + bottom + 1) / 2 - image.height / 2) <= 8, path);
    }
  }
});
