// PNG: the smallest encoding that keeps every pixel, a decoder that reads it back, and the comparison of two images.
import { deflateSync, inflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** One PNG filter applied to a row: the filtered bytes, given the row above (zeros for the first). */
function filterRow(type, raw, prior, bpp) {
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const a = i >= bpp ? raw[i - bpp] : 0;
    const b = prior[i];
    const c = i >= bpp ? prior[i - bpp] : 0;
    let predictor = 0;
    if (type === 1) predictor = a;
    else if (type === 2) predictor = b;
    else if (type === 3) predictor = (a + b) >> 1;
    else if (type === 4) predictor = paeth(a, b, c);
    out[i] = (raw[i] - predictor) & 0xff;
  }
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * The image data of a PNG: each row behind its filter byte. With `bpp` set, each row takes the filter
 * whose bytes, read as signed, sum to the least in absolute value; without, filter 0.
 */
function filtered(rows, stride, bpp) {
  const out = Buffer.alloc(rows.length * (stride + 1));
  let prior = new Uint8Array(stride);
  rows.forEach((raw, y) => {
    let best = raw;
    let bestType = 0;
    if (bpp) {
      let bestSum = Infinity;
      for (let type = 0; type < 5; type++) {
        const candidate = type ? filterRow(type, raw, prior, bpp) : raw;
        let sum = 0;
        for (const v of candidate) sum += v < 128 ? v : 256 - v;
        if (sum < bestSum) [best, bestType, bestSum] = [candidate, type, sum];
      }
    }
    out[y * (stride + 1)] = bestType;
    out.set(best, y * (stride + 1) + 1);
    prior = raw;
  });
  return out;
}

function ihdr(w, h, depth, colorType) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(w, 0);
  data.writeUInt32BE(h, 4);
  data.set([depth, colorType, 0, 0, 0], 8);
  return chunk('IHDR', data);
}

function png(w, h, depth, colorType, extra, idat) {
  return Buffer.concat([PNG_SIGNATURE, ihdr(w, h, depth, colorType), ...extra,
    chunk('IDAT', deflateSync(idat, { level: 9, memLevel: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** A truecolor PNG: RGB (color type 2) or, with alpha, RGBA (6). */
function truecolorPng(image, withAlpha) {
  const { width: w, height: h, data } = image;
  const channels = withAlpha ? 4 : 3;
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = new Uint8Array(w * channels);
    for (let x = 0; x < w; x++) {
      for (let k = 0; k < channels; k++) row[x * channels + k] = data[(y * w + x) * 4 + k];
    }
    rows.push(row);
  }
  return png(w, h, 8, withAlpha ? 6 : 2, [], filtered(rows, w * channels, channels));
}

/**
 * The smallest PNG this file writes without changing a pixel: a palette when 256 colors are enough,
 * least opaque first so the transparency chunk holds only the translucent entries, at the fewest bits
 * per pixel that hold it; else RGB when every pixel is opaque, else RGBA.
 */
function pngBytes(image) {
  const { width: w, height: h, data } = image;
  const keys = new Uint32Array(w * h); // alpha, red, green, blue: sorting the keys sorts least opaque first
  const colors = new Map();
  let opaque = true;
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3];
    keys[i] = ((a << 24) | (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2]) >>> 0;
    if (colors.size <= 256) colors.set(keys[i], 0);
    if (a !== 255) opaque = false;
  }
  let out;
  if (colors.size <= 256) {
    const palette = [...colors.keys()].sort((x, y) => x - y);
    palette.forEach((key, rank) => colors.set(key, rank));
    const depth = palette.length <= 2 ? 1 : palette.length <= 4 ? 2 : palette.length <= 16 ? 4 : 8;
    const stride = Math.ceil((w * depth) / 8);
    const rows = [];
    for (let y = 0; y < h; y++) {
      const row = new Uint8Array(stride);
      for (let x = 0; x < w; x++) {
        const bit = x * depth;
        row[bit >> 3] |= colors.get(keys[y * w + x]) << (8 - depth - (bit & 7));
      }
      rows.push(row);
    }
    const plte = Buffer.alloc(palette.length * 3);
    palette.forEach((key, i) => plte.set([(key >>> 16) & 0xff, (key >>> 8) & 0xff, key & 0xff], i * 3));
    const alphas = palette.map((key) => key >>> 24).filter((a) => a < 255);
    const extra = [chunk('PLTE', plte)];
    if (alphas.length) extra.push(chunk('tRNS', Buffer.from(alphas)));
    out = png(w, h, depth, 3, extra, filtered(rows, stride, 0));
  } else {
    out = truecolorPng(image, !opaque);
  }
  if (!sameImage(decodePng(out), image)) throw new Error("the PNG that was written doesn't decode to the image that was drawn");
  return out;
}

/** The RGBA pixels of a non-interlaced PNG of 1 to 8 bits per sample, { width, height, data }. */
function decodePng(buf) {
  if (buf.length < 8 || !PNG_SIGNATURE.equals(buf.subarray(0, 8))) throw new Error('not a PNG');
  let header = null;
  let palette = null;
  let transparency = null;
  const idat = [];
  for (let at = 8; at + 8 <= buf.length;) {
    const length = buf.readUInt32BE(at);
    const type = buf.toString('latin1', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + length);
    if (data.length !== length || buf.length < at + 12 + length) throw new Error(`the PNG's ${type} chunk is cut off`);
    if (crc32(buf.subarray(at + 4, at + 8 + length)) !== buf.readUInt32BE(at + 8 + length)) {
      throw new Error(`the PNG's ${type} chunk fails its CRC`);
    }
    at += 12 + length;
    if (type === 'IHDR') {
      header = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], colorType: data[9], interlace: data[12] };
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') transparency = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (!header) throw new Error('the PNG has no IHDR chunk');
  const { w, h, depth, colorType, interlace } = header;
  if (interlace) throw new Error('interlaced PNGs are not supported');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`PNG color type ${colorType} is not supported`);
  if (![1, 2, 4, 8].includes(depth) || (channels > 1 && depth !== 8) || (colorType === 3 && !palette)) {
    throw new Error(`PNG color type ${colorType} at ${depth} bits is not supported`);
  }
  const bpp = Math.max(1, (channels * depth) >> 3);
  const stride = Math.ceil((w * channels * depth) / 8);
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length < h * (stride + 1)) throw new Error("the PNG's image data is cut off");
  const pixels = new Uint8Array(h * stride);
  let prior = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const type = raw[y * (stride + 1)];
    if (type > 4) throw new Error(`PNG filter type ${type} is not one of the five`);
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    row.set(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prior[i];
      const c = i >= bpp ? prior[i - bpp] : 0;
      if (type === 1) row[i] += a;
      else if (type === 2) row[i] += b;
      else if (type === 3) row[i] += (a + b) >> 1;
      else if (type === 4) row[i] += paeth(a, b, c);
    }
    prior = row;
  }
  const data = new Uint8Array(w * h * 4);
  const sample = (y, x) => {
    // a sample below 8 bits, of a grayscale or palette image
    const bit = x * depth;
    return (pixels[y * stride + (bit >> 3)] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
  };
  const key = (i) => (transparency && transparency.length >= 2 * (i + 1) ? transparency.readUInt16BE(2 * i) : -1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const p = y * stride + x * bpp;
      if (colorType === 0) {
        const v = depth === 8 ? pixels[p] : sample(y, x);
        const gray = Math.round((v * 255) / ((1 << depth) - 1));
        data.set([gray, gray, gray, v === key(0) ? 0 : 255], o);
      } else if (colorType === 3) {
        const index = depth === 8 ? pixels[p] : sample(y, x);
        if (3 * index + 3 > palette.length) throw new Error("a PNG pixel names a color past the palette's end");
        const alpha = transparency && index < transparency.length ? transparency[index] : 255;
        data.set([palette[3 * index], palette[3 * index + 1], palette[3 * index + 2], alpha], o);
      } else if (colorType === 2) {
        const [r, g, b] = pixels.subarray(p, p + 3);
        data.set([r, g, b, r === key(0) && g === key(1) && b === key(2) ? 0 : 255], o);
      } else if (colorType === 4) {
        data.set([pixels[p], pixels[p], pixels[p], pixels[p + 1]], o);
      } else {
        data.set(pixels.subarray(p, p + 4), o);
      }
    }
  }
  return { width: w, height: h, data };
}

function sameImage(a, b) {
  return a.width === b.width && a.height === b.height && Buffer.from(a.data).equals(Buffer.from(b.data));
}

export { PNG_SIGNATURE, crc32, truecolorPng, pngBytes, decodePng, sameImage };
