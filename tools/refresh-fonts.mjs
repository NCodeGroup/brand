// Copies the fonts of src/fonts/ from the npm tarballs src/fonts/fonts.lock.json pins. Node.js built-ins only.
//   import { REGISTRY, familyFiles, integrityOf, refreshFonts } from './refresh-fonts.mjs';
//   node tools/refresh-fonts.mjs [--check | --pin] [--from=<folder>]
// It checks every family's tarball against the lock's integrity, and every file the lock names against its sha256,
// before it writes any file. It downloads a tarball only from https://registry.npmjs.org/, or reads it from the
// folder given with --from, under the last segment of its address, as `npm pack <package>@<version>` writes it.
// Without an option it copies each file the lock names into src/fonts/ and leaves the lock as it is.
// --check writes nothing: it reports each file that is missing or differs from its tarball's.
// --pin is for a family whose version, tarball and integrity moved to another release: it skips the sha256 check
// and sets each file's sha256 in the lock to the hash of the file in the tarball.
// Exits 0 when done, 1 on a refusal, a failed request or a --check difference, 2 on a usage error.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { untarGz } from '../lib/archive.mjs';

/** The only address tarballs are downloaded from. */
export const REGISTRY = 'https://registry.npmjs.org/';

const MAX_TARBALL = 64 * 1024 * 1024;

/** The SRI integrity of the bytes, as the npm registry writes it: `sha512-` and the base64 SHA-512. */
export function integrityOf(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

const sha256Of = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * The files of a family's tarball `packed` that its lock entry `family` names, as
 * `[{ name, bytes, sha256, entry }]`. It throws when the tarball's integrity is not the lock's, when a name is not
 * a plain file name, when the tarball lacks a file, and, unless `pin`, when a file's SHA-256 is not the lock's.
 */
export function familyFiles(family, packed, { pin = false } = {}) {
  const label = `${family.package} ${family.version}`;
  const actual = integrityOf(packed);
  if (actual !== family.integrity) {
    throw new Error(
      `${label}: the tarball's integrity is ${actual}, not the ${family.integrity} fonts.lock.json pins`,
    );
  }
  const archive = untarGz(packed);
  const files = [];
  for (const [name, entry] of Object.entries(family.files)) {
    if (!/^[\w-][\w.-]*$/.test(name)) throw new Error(`${label}: ${name} is not a plain file name`);
    const bytes = archive.get(`package/${entry.from}`);
    if (!bytes) {
      throw new Error(`${label}: the tarball holds no package/${entry.from}, which fonts.lock.json names for ${name}`);
    }
    const hash = sha256Of(bytes);
    if (!pin && hash !== entry.sha256) {
      throw new Error(
        `${label}: package/${entry.from} has SHA-256 ${hash}, not the ${entry.sha256} fonts.lock.json pins for ${name}`,
      );
    }
    files.push({ name, bytes, sha256: hash, entry });
  }
  return files;
}

/**
 * Checks every family of the lock under `root`, then copies its files into src/fonts/ (or, with `check`, compares
 * them, or, with `pin`, also pins their SHA-256 in the lock). Returns `{ lines, changed }`: one line per file and
 * the number of files, and of lock pins, that were written, or that are missing or differ under `check`.
 */
export async function refreshFonts({ root, from, fetch = globalThis.fetch, check = false, pin = false }) {
  if (check && pin) throw new Error('--check and --pin exclude each other');
  const lockPath = path.join(root, 'src/fonts/fonts.lock.json');
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));

  const all = [];
  for (const family of Object.values(lock.families)) {
    const label = `${family.package} ${family.version}`;
    const segment = String(family.tarball).split('/').pop();
    if (!family.tarball.startsWith(REGISTRY) || !/^[\w.-]+\.tgz$/.test(segment)) {
      throw new Error(`${label}: the tarball address ${family.tarball} is not a .tgz under ${REGISTRY}`);
    }
    let packed;
    if (from) {
      packed = readFileSync(path.join(from, segment));
    } else {
      const response = await fetch(family.tarball, {
        headers: { 'User-Agent': 'ncode-brand-refresh-fonts' },
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) throw new Error(`GET ${family.tarball} answered ${response.status}`);
      packed = Buffer.from(await response.arrayBuffer());
    }
    if (packed.length > MAX_TARBALL) throw new Error(`${label}: the tarball is larger than 64 MiB`);
    all.push(...familyFiles(family, packed, { pin }));
  }

  const lines = [];
  let changed = 0;
  let pinned = 0;
  for (const { name, bytes, sha256, entry } of all) {
    const file = path.join(root, 'src/fonts', name);
    const label = `src/fonts/${name}`;
    const exists = existsSync(file);
    if (exists && readFileSync(file).equals(bytes)) {
      lines.push(`${label}  unchanged`);
    } else {
      changed++;
      if (check) {
        lines.push(`${label}  ${exists ? 'differs from its tarball' : 'missing'}`);
      } else {
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, bytes);
        lines.push(`${label}  written`);
      }
    }
    if (pin && entry.sha256 !== sha256) {
      entry.sha256 = sha256;
      pinned++;
    }
  }
  if (pinned) {
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    lines.push('src/fonts/fonts.lock.json  pinned');
    changed++;
  }
  return { lines, changed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const usage = 'usage: node tools/refresh-fonts.mjs [--check | --pin] [--from=<folder>]';
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        check: { type: 'boolean', default: false },
        pin: { type: 'boolean', default: false },
        from: { type: 'string' },
      },
    });
  } catch (error) {
    console.error(`${error.message}\n${usage}`);
    process.exit(2);
  }
  const { check, pin, from } = parsed.values;
  if (check && pin) {
    console.error(usage);
    process.exit(2);
  }
  try {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
    const { lines, changed } = await refreshFonts({ root, from: from ? path.resolve(from) : undefined, check, pin });
    for (const line of lines) console.log(line);
    if (check) {
      if (changed) {
        console.log(
          `Missing or different: ${changed} files. Run node tools/refresh-fonts.mjs to copy them from the tarballs.`,
        );
        process.exit(1);
      }
      console.log('Every font file is the one its tarball holds.');
    } else {
      console.log(changed ? `Wrote ${changed} files.` : 'No file changed.');
    }
    process.exit(0);
  } catch (error) {
    console.error(`refresh-fonts.mjs: ${error.message}`);
    process.exit(1);
  }
}
