// ICO: entries as 32-bit bitmaps or PNG, and a decoder that reads each entry back.
import { PNG_SIGNATURE, decodePng, sameImage, truecolorPng } from './png.mjs';

/** A 32-bit bitmap entry of an ICO: the header, BGRA rows bottom row first, then the 1-bit mask. */
function bitmapEntry(image) {
  const { width: w, height: h, data } = image;
  const rowBytes = Math.floor((w + 31) / 32) * 4; // the 1-bit mask, padded to 32 bits
  const color = Buffer.alloc(w * h * 4);
  const mask = Buffer.alloc(rowBytes * h);
  for (let row = 0; row < h; row++) {
    const y = h - 1 - row; // bottom row first
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = data.subarray((y * w + x) * 4, (y * w + x) * 4 + 4);
      color.set([b, g, r, a], (row * w + x) * 4);
      if (a === 0) mask[row * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(w, 4);
  header.writeInt32LE(h * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(color.length + mask.length, 20);
  return Buffer.concat([header, color, mask]);
}

/**
 * An ICO holding the images. Entries narrower than `bitmapsBelow` are stored as 32-bit bitmaps, which
 * every Windows API reads; the others as PNG, which browsers and Windows Vista and later read.
 */
function icoBytes(images, bitmapsBelow = 0) {
  const entries = images.map((image) => ({
    w: image.width,
    h: image.height,
    data: image.width < bitmapsBelow ? bitmapEntry(image) : truecolorPng(image, true), // RGBA: Windows wants 32 bits here
  }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = header.length + 16 * entries.length;
  const directory = entries.map(({ w, h, data }) => {
    const d = Buffer.alloc(16);
    d.set([w % 256, h % 256, 0, 0], 0);
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(data.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += data.length;
    return d;
  });
  const icon = Buffer.concat([header, ...directory, ...entries.map((e) => e.data)]);
  const decoded = decodeIco(icon); // read each entry back, as pngBytes does
  images.forEach((image, i) => {
    if (!sameImage(decoded[i].image, image)) {
      throw new Error(`the icon's ${image.width}-pixel entry doesn't decode to the image that was drawn`);
    }
  });
  return icon;
}

/**
 * The entries of an ICO, in order: { png, image } for each, with `png` saying how it is stored. A
 * bitmap entry takes its alpha from its 32-bit pixels and must have its mask set exactly where the
 * alpha is 0.
 */
function decodeIco(buf) {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) throw new Error('not an ICO');
  const count = buf.readUInt16LE(4);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const d = 6 + 16 * i;
    const size = buf.readUInt32LE(d + 8);
    const offset = buf.readUInt32LE(d + 12);
    const data = buf.subarray(offset, offset + size);
    if (data.length !== size) throw new Error(`the ICO's entry ${i + 1} is cut off`);
    if (data.length >= 8 && PNG_SIGNATURE.equals(data.subarray(0, 8))) {
      entries.push({ png: true, image: decodePng(Buffer.from(data)) });
      continue;
    }
    const w = data.readInt32LE(4);
    const h = data.readInt32LE(8) / 2;
    if (data.readUInt32LE(0) !== 40 || data.readUInt16LE(14) !== 32 || data.readUInt32LE(16) !== 0) {
      throw new Error(`the ICO's entry ${i + 1} is not an uncompressed 32-bit bitmap`);
    }
    const rowBytes = Math.floor((w + 31) / 32) * 4;
    if (data.length < 40 + w * h * 4 + rowBytes * h) throw new Error(`the ICO's entry ${i + 1} is cut off`);
    const pixels = new Uint8Array(w * h * 4);
    for (let row = 0; row < h; row++) {
      const y = h - 1 - row;
      for (let x = 0; x < w; x++) {
        const at = 40 + (row * w + x) * 4;
        const alpha = data[at + 3];
        const masked = (data[40 + w * h * 4 + row * rowBytes + (x >> 3)] & (0x80 >> (x & 7))) !== 0;
        if (masked !== (alpha === 0)) throw new Error(`the ICO's entry ${i + 1} has a mask that doesn't match its alpha`);
        pixels.set([data[at + 2], data[at + 1], data[at], alpha], (y * w + x) * 4);
      }
    }
    entries.push({ png: false, image: { width: w, height: h, data: pixels } });
  }
  return entries;
}

export { bitmapEntry, icoBytes, decodeIco };
