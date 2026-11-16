// The color math: conversions against known values, contrast, the CSS functions the tokens use, and the exact
// numbers and image formats the logo kit relies on.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  compileExpression, contrast, hexToOklch, hexToRgb, mixOklab, oklchToHexClipped, oklchToHexMapped,
  parseHex, relativeLch, relativeOklch, rgbToHex, withOklchLightness,
} from '../lib/color.mjs';
import { decodeIco, icoBytes } from '../lib/ico.mjs';
import { holds } from '../lib/logo.mjs';
import { expressionToCss } from '../lib/model.mjs';
import { num, roundHalfEven, toFixedHalfEven } from '../lib/numbers.mjs';
import { crc32, decodePng, pngBytes, sameImage } from '../lib/png.mjs';

const near = (actual, expected, tolerance, what) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${what}: ${actual} is not within ${tolerance} of ${expected}`);

describe('conversions', () => {
  test('hex and sRGB round-trip, with the short form', () => {
    assert.deepEqual(hexToRgb('#03C'), [0, 0.2, 0.8]);
    for (const hex of ['#000000', '#FFFFFF', '#0033CC', '#809FFF', '#0A1F5C', '#7C2D12', '#FACC15']) assert.equal(rgbToHex(hexToRgb(hex)), hex);
  });

  test('OKLCH of sRGB red is the value CSS Color 4 gives: oklch(62.8% 0.2577 29.23)', () => {
    const [l, c, h] = hexToOklch('#FF0000');
    near(l, 0.628, 0.0005, 'lightness');
    near(c, 0.2577, 0.0005, 'chroma');
    near(h, 29.23, 0.01, 'hue');
  });

  test('white has lightness 1 and no chroma', () => {
    const [l, c] = hexToOklch('#FFFFFF');
    near(l, 1, 1e-6, 'lightness');
    near(c, 0, 1e-6, 'chroma');
  });

  test('a color in sRGB comes back unchanged through OKLCH', () => {
    for (const hex of ['#0033CC', '#0F766E', '#C2410C', '#FACC15', '#11110F']) {
      assert.equal(oklchToHexClipped(hexToOklch(hex)), hex);
      assert.equal(oklchToHexMapped(hexToOklch(hex)), hex);
    }
  });

  test('a color outside sRGB keeps its hue and lightness by losing chroma, instead of being clipped', () => {
    const mapped = oklchToHexMapped([0.7, 0.4, 145]);
    const [l, c, h] = hexToOklch(mapped);
    near(l, 0.7, 0.01, 'lightness');
    near(h, 145, 1.5, 'hue');
    assert.ok(c < 0.4);
    assert.notEqual(mapped, oklchToHexClipped([0.7, 0.4, 145]));
  });

  test('withOklchLightness moves the lightness, keeps the hue, and gives up chroma only to stay in sRGB', () => {
    const [, c, h] = hexToOklch('#0F766E');
    const [l2, c2, h2] = hexToOklch(withOklchLightness('#0F766E', 0.6));
    near(l2, 0.6, 0.005, 'lightness');
    near(c2, c, 0.005, 'chroma');
    near(h2, h, 1, 'hue');
    const [, blueChroma, blueHue] = hexToOklch('#0033CC');
    const [l3, c3, h3] = hexToOklch(withOklchLightness('#0033CC', 0.3));
    near(l3, 0.3, 0.005, 'lightness');
    near(h3, blueHue, 1.5, 'hue');
    assert.ok(c3 < blueChroma, 'a saturated blue at a low lightness has less chroma');
  });
});

describe('contrast', () => {
  test('black on white is 21 to 1, and the order of the two does not matter', () => {
    assert.equal(contrast('#000000', '#FFFFFF'), 21);
    assert.equal(contrast('#0033CC', '#FFFFFF'), contrast('#FFFFFF', '#0033CC'));
  });

  test('#777777 on white is 4.48 to 1, just below the 4.5 text floor', () => {
    near(contrast('#777777', '#FFFFFF'), 4.48, 0.005, 'ratio');
  });

  test('NCode Blue on white is 8.95 to 1, as the logo kit says', () => {
    near(contrast('#0033CC', '#FFFFFF'), 8.95, 0.005, 'ratio');
  });
});

describe('the CSS functions the tokens use', () => {
  test('NCode Blue lifted by the dark theme rule is exactly NCode Blue Light', () => {
    assert.equal(relativeOklch('#0033CC', '0.7206', 'min(c, 0.1444)', 'h + 5.3'), '#809FFF');
  });

  test('NCode Blue as a screen is exactly NCode Navy', () => {
    assert.equal(relativeOklch('#0033CC', '0.2697', 'c * 0.478', 'h + 1.2'), '#0A1F5C');
  });

  test('the label flip in lch(): white on a dark color, black on a light one', () => {
    const label = (hex) => relativeLch(hex, 'clamp(0, (49.4 - l) * 9999, 100)', '0', '0');
    assert.equal(label('#0033CC'), '#FFFFFF');
    assert.equal(label('#FACC15'), '#000000');
  });

  test('color-mix() in OKLab: 0% is the first color, 100% the second, 50% of black and white a mid gray', () => {
    assert.equal(mixOklab('#0033CC', '#FFFFFF', 0), '#0033CC');
    assert.equal(mixOklab('#0033CC', '#FFFFFF', 100), '#FFFFFF');
    assert.equal(mixOklab('#000000', '#FFFFFF', 50), '#636363');
  });

  test('a channel expression follows precedence and its three functions', () => {
    assert.equal(compileExpression('min(c, 0.1) + 2 * (l - 1) / 4')({ l: 0.5, c: 0.3, h: 0 }), -0.15);
    assert.equal(compileExpression('clamp(0, (49.4 - l) * 9999, 100)')({ l: 40, c: 0, h: 0 }), 100);
    assert.equal(compileExpression('max(h - 10, 0)')({ l: 0, c: 0, h: 4 }), 0);
    assert.throws(() => compileExpression('q + 1'), /unknown name "q"/);
    assert.throws(() => compileExpression('min(c'), /expected/);
  });

  test('an expression is written as CSS: a bare value stays bare, arithmetic goes in calc()', () => {
    assert.equal(expressionToCss('0.7206'), '0.7206');
    assert.equal(expressionToCss('min(c, 0.1444)'), 'min(c, 0.1444)');
    assert.equal(expressionToCss('h + 5.3'), 'calc(h + 5.3)');
  });
});

describe('input', () => {
  test('parseHex takes #RGB and #RRGGBB, with or without #, and nothing else', () => {
    assert.equal(parseHex('#0033cc'), '#0033CC');
    assert.equal(parseHex('03c'), '#0033CC');
    assert.equal(parseHex(' #0F766E '), '#0F766E');
    for (const bad of ['blue', 'rgb(0, 0, 0)', '#0033CC80', '#12345', '', null, undefined, 42]) assert.equal(parseHex(bad), null);
  });
});

describe('the logo kit\'s numbers and files', () => {
  test('rounding takes the even neighbor on a tie', () => {
    assert.deepEqual([0.5, 1.5, 2.5, -0.5, -1.5].map(roundHalfEven), [0, 2, 2, 0, -2]);
    assert.equal(toFixedHalfEven(0.125, 2), '0.12');
    assert.equal(toFixedHalfEven(0.375, 2), '0.38');
    assert.equal(num(1.1, 3), '1.1');
    assert.equal(num(-0.0001, 3), '0');
  });

  test('a PNG decodes to the image that was encoded, as a palette and as truecolor', () => {
    const small = { width: 3, height: 2, data: new Uint8Array([0, 51, 204, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 51, 204, 128, 9, 9, 9, 255, 0, 51, 204, 255]) };
    assert.ok(sameImage(decodePng(pngBytes(small)), small));
    const data = new Uint8Array(32 * 32 * 4);
    for (let i = 0; i < 32 * 32; i++) data.set([i % 256, (i * 7) % 256, (i * 13) % 256, 255], i * 4);
    const many = { width: 32, height: 32, data };
    assert.ok(sameImage(decodePng(pngBytes(many)), many));
  });

  test('an ICO holds bitmap and PNG entries that decode to their images', () => {
    const image = (size) => ({ width: size, height: size, data: new Uint8Array(size * size * 4).map((_, i) => (i % 4 === 3 ? (i % 8 ? 255 : 0) : i % 251)).map((v, i, a) => (i % 4 !== 3 && a[i - (i % 4) + 3] === 0 ? 0 : v)) });
    const entries = decodeIco(icoBytes([image(16), image(32)], 32));
    assert.equal(entries[0].png, false);
    assert.equal(entries[1].png, true);
    assert.ok(sameImage(entries[0].image, image(16)));
    assert.ok(sameImage(entries[1].image, image(32)));
  });

  test('a PNG that fails a CRC or is interlaced does not decode, so the build rewrites it', () => {
    const image = { width: 3, height: 2, data: new Uint8Array([0, 51, 204, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 51, 204, 128, 9, 9, 9, 255, 0, 51, 204, 255]) };
    const good = pngBytes(image);
    const ihdrCrc = 8 + 8 + 13; // after the signature, the IHDR chunk's length and type, and its 13 bytes
    const badCrc = Buffer.from(good);
    badCrc[ihdrCrc + 3] ^= 0xff; // the pixels stay the same; only the checksum is wrong
    assert.throws(() => decodePng(badCrc), /the PNG's IHDR chunk fails its CRC/);
    assert.equal(holds(badCrc, { data: good, image }), false);
    const interlaced = Buffer.from(good);
    interlaced[ihdrCrc - 1] = 1; // IHDR's interlace method, with its CRC written to match
    interlaced.writeUInt32BE(crc32(interlaced.subarray(12, ihdrCrc)), ihdrCrc);
    assert.throws(() => decodePng(interlaced), /interlaced PNGs are not supported/);
  });

  test('an ICO bitmap whose mask disagrees with its alpha does not decode, so the build rewrites it', () => {
    const size = 16;
    const image = { width: size, height: size, data: new Uint8Array(size * size * 4).map((_, i) => (i % 4 === 3 ? (i % 8 ? 255 : 0) : i % 4 === 0 && i % 8 ? 200 : 0)) };
    const good = icoBytes([image], 32);
    const bad = Buffer.from(good);
    bad[6 + 16 + 40 + size * size * 4] ^= 0x80; // the mask bit of the first pixel of the bottom row; its alpha stays
    assert.throws(() => decodeIco(bad), /the ICO's entry 1 has a mask that doesn't match its alpha/);
    assert.equal(holds(bad, { data: good, entries: [{ png: false, image }] }), false);
  });
});
