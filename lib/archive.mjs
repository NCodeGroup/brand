// The release archive: a gzipped ustar archive of regular files whose bytes depend on its entries alone.
// build.mjs --archive writes it; vendor-brand.mjs reads it.
import { gzipSync } from 'node:zlib';

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
