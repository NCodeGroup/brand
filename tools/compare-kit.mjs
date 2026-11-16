// Compares two logo kits file by file, for porting a kit another generator drew. Node.js built-ins only.
//   import { compareKits } from './compare-kit.mjs';  const { compared, differences } = compareKits(kit, other);
//   node tools/compare-kit.mjs <kit> <other> [--tolerance=<n>]
//     prints each difference and "<compared> files compared, <n> differ."; exits 1 on a difference, 2 on a usage error
// It takes every file in a subfolder of either folder: the files at a folder's top level are a kit's sources and docs,
// never drawings. A PNG or an ICO is compared by its pixels, each sample within the tolerance; any other file, byte for
// byte.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { decodeIco } from '../lib/ico.mjs';
import { decodePng } from '../lib/png.mjs';

/** The paths, with "/", of the files in the subfolders of a folder. */
function subfolderFiles(folder) {
  const found = [];
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), name);
      else if (prefix) found.push(name);
    }
  };
  walk(folder, '');
  return found;
}

/** The largest difference between two samples of equal size, over all of their bytes. */
function largestDelta(a, b) {
  let largest = 0;
  for (let i = 0; i < a.length; i++) largest = Math.max(largest, Math.abs(a[i] - b[i]));
  return largest;
}

/** A description of how two decoded images differ beyond the tolerance, or null. */
function imageDifference(a, b, tolerance) {
  if (a.width !== b.width || a.height !== b.height) return `${a.width}x${a.height} and ${b.width}x${b.height}`;
  const delta = largestDelta(a.data, b.data);
  return delta > tolerance ? `a sample differs by ${delta}, over the tolerance of ${tolerance}` : null;
}

/** A description of how two files differ, or null. */
function fileDifference(name, a, b, tolerance) {
  const extension = path.extname(name).toLowerCase();
  if (extension === '.png') return imageDifference(decodePng(a), decodePng(b), tolerance);
  if (extension === '.ico') {
    const [first, second] = [decodeIco(a), decodeIco(b)];
    if (first.length !== second.length) return `${first.length} entries and ${second.length}`;
    for (let i = 0; i < first.length; i++) {
      if (first[i].png !== second[i].png) return `entry ${i} is stored as a ${first[i].png ? 'PNG' : 'bitmap'} and as a ${second[i].png ? 'PNG' : 'bitmap'}`;
      const difference = imageDifference(first[i].image, second[i].image, tolerance);
      if (difference) return `entry ${i}: ${difference}`;
    }
    return null;
  }
  return a.equals(b) ? null : 'the bytes differ';
}

/** Compares the files in the subfolders of two folders: { compared, differences }. */
export function compareKits(kit, other, { tolerance = 0 } = {}) {
  const ours = new Set(subfolderFiles(kit));
  const theirs = new Set(subfolderFiles(other));
  const differences = [];
  let compared = 0;
  for (const name of [...new Set([...ours, ...theirs])].sort()) {
    if (!theirs.has(name)) differences.push(`${name}: only in ${kit}`);
    else if (!ours.has(name)) differences.push(`${name}: only in ${other}`);
    else {
      compared++;
      const difference = fileDifference(name, readFileSync(path.join(kit, name)), readFileSync(path.join(other, name)), tolerance);
      if (difference) differences.push(`${name}: ${difference}`);
    }
  }
  return { compared, differences };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const usage = 'usage: node tools/compare-kit.mjs <kit> <other> [--tolerance=<n>]';
  let parsed;
  try {
    parsed = parseArgs({ allowPositionals: true, options: { tolerance: { type: 'string', default: '0' } } });
  } catch (error) {
    console.error(`${error.message}\n${usage}`);
    process.exit(2);
  }
  const { positionals, values } = parsed;
  const tolerance = Number(values.tolerance);
  const folders = positionals.every((folder) => existsSync(folder) && statSync(folder).isDirectory());
  if (positionals.length !== 2 || !folders || !Number.isInteger(tolerance) || tolerance < 0) {
    console.error(usage);
    process.exit(2);
  }
  const { compared, differences } = compareKits(positionals[0], positionals[1], { tolerance });
  for (const difference of differences) console.log(difference);
  console.log(`${compared} files compared, ${differences.length} differ.`);
  process.exit(differences.length ? 1 : 0);
}
