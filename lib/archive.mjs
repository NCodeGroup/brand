// The release archive: a gzipped ustar archive of regular files whose bytes depend on its entries alone.
// build.mjs --archive writes it; vendor-brand.mjs reads it.
// tools/refresh-fonts.mjs reads an npm package's tarball with untarGz.
import { gunzipSync, gzipSync } from 'node:zlib';

/** A gzipped ustar archive of `entries`, an array of `[path, Buffer]`, in the given order. */
export function tarGz(entries) {
  const blocks = [];
  for (const [path, data] of entries) {
    const name = Buffer.from(path, 'utf8');
    if (name.length > 100) throw new Error(`${path}: a path in the release archive is at most 100 bytes`);
    const header = Buffer.alloc(512);
    name.copy(header, 0);
    header.write('0000644\0', 100, 'latin1'); // mode
    header.write('0000000\0', 108, 'latin1'); // uid
    header.write('0000000\0', 116, 'latin1'); // gid
    header.write(`${data.length.toString(8).padStart(11, '0')}\0`, 124, 'latin1');
    header.write('00000000000\0', 136, 'latin1'); // time
    header.write('        ', 148, 'latin1'); // the checksum counts its own field as spaces
    header.write('0', 156, 'latin1'); // a regular file
    header.write('ustar\x0000', 257, 'latin1'); // magic "ustar", a NUL, version "00"
    const sum = header.reduce((total, byte) => total + byte, 0);
    header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 'latin1');
    blocks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  const archive = gzipSync(Buffer.concat(blocks), { level: 9 });
  archive[9] = 255; // the gzip header's system: unknown, so the bytes are the same on every system
  return archive;
}

/**
 * A Map of path to Buffer for the regular files of the gzipped ustar archive `packed`, in archive order.
 * It skips every other entry type, such as a folder or a pax header. It throws when the archive unpacks to more
 * than `limit` bytes, when an entry is not a ustar header, when a file is cut short, and when a path occurs twice.
 */
export function untarGz(packed, { limit = 256 * 1024 * 1024 } = {}) {
  let tar;
  try {
    tar = gunzipSync(packed, { maxOutputLength: limit });
  } catch (error) {
    if (error.code === 'ERR_BUFFER_TOO_LARGE') throw new Error(`the archive unpacks to more than ${limit} bytes`);
    throw error;
  }
  const files = new Map();
  let at = 0;
  while (at + 512 <= tar.length) {
    if (tar.subarray(at, at + 512).every((byte) => byte === 0)) break;
    // A field is its bytes up to the first NUL, as UTF-8.
    const field = (offset, length) => {
      const raw = tar.subarray(at + offset, at + offset + length);
      const end = raw.indexOf(0);
      return raw.subarray(0, end < 0 ? raw.length : end).toString('utf8');
    };
    if (field(257, 6) !== 'ustar') throw new Error(`the entry at byte ${at} is not a ustar header`);
    const prefix = field(345, 155);
    const path = prefix ? `${prefix}/${field(0, 100)}` : field(0, 100);
    const type = field(156, 1);
    const size = Number.parseInt(field(124, 12).trim(), 8);
    if (!Number.isSafeInteger(size) || size < 0 || at + 512 + size > tar.length) throw new Error(`${path} is cut short`);
    if (type === '0' || type === '') {
      if (files.has(path)) throw new Error(`the archive holds ${path} twice`);
      files.set(path, tar.subarray(at + 512, at + 512 + size));
    }
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}
