#!/usr/bin/env node
// Copies the files brand.lock.json names from one release of NCodeGroup/brand, and checks them. Copy this file into
// the repository that vendors the brand, next to its brand.lock.json. Node.js alone: no packages. Apache-2.0.
//
//   node vendor-brand.mjs --check
//       Offline: every vendored file has the SHA-256 the lock pins. Exits 1, naming each file, when one is missing or
//       differs. Run it in the gate and in CI.
//   node vendor-brand.mjs --update <version> [--from <folder or https address>]
//       Reads that release's manifest.json, refuses it unless it is that version, takes each file the lock names,
//       refuses a file whose SHA-256 is not the manifest's, then writes the files and the lock. --from defaults to
//       https://raw.githubusercontent.com/NCodeGroup/brand/v<version>, the release's tag. An address is read over
//       https alone: a redirect, an answer larger than the manifest gives the file (manifest.json itself at most
//       1 MiB) and one slower than a minute are refused. A release never changes, so when the lock already pins that
//       version, a file whose SHA-256 is not the pinned one is refused too.
//   --lock <file>  the lock to use, brand.lock.json by default. Vendored paths are relative to its folder, and nothing
//       is written outside it, by a path or through a symbolic link.
//
// brand.lock.json: { "version": "0.1.0", "files": { "<vendored path>": { "source": "<path in the release>", "sha256": "" } } }
// Add a file by adding its entry with an empty sha256, then run --update.
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

const USAGE = 'Usage: node vendor-brand.mjs --check | --update <version> [--from <folder or https address>] [--lock <file>]';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** The most a manifest.json may hold, and the longest one request may take. */
const MANIFEST_LIMIT = 1024 * 1024;
const TIMEOUT = 60_000;

/** A relative path that stays inside its folder, or an error naming what it is. */
function inside(path, what) {
  const clean = normalize(path);
  if (isAbsolute(path) || clean === '..' || clean.startsWith(`..${sep}`) || clean.split(sep).includes('..')) {
    throw new Error(`${what} "${path}" leaves its folder`);
  }
  return clean;
}

/**
 * Where a vendored file is written: inside the lock's folder as the file system resolves it, so a symbolic link on
 * the way cannot take the write elsewhere, and a file or nothing yet, never a folder.
 */
function destination(root, path) {
  const file = join(root, inside(path, 'The vendored path'));
  const entry = (at) => {
    try {
      return lstatSync(at, { throwIfNoEntry: false });
    } catch (error) {
      if (error.code === 'ENOTDIR') throw new Error(`The vendored path "${path}" runs through a file`);
      throw error;
    }
  };
  let existing = file;
  while (!entry(existing)) existing = dirname(existing);
  let real;
  try {
    real = realpathSync(existing);
  } catch {
    throw new Error(`The vendored path "${path}" leads through a symbolic link to nothing`);
  }
  const top = realpathSync(root);
  if (real !== top && !real.startsWith(`${top}${sep}`)) throw new Error(`The vendored path "${path}" leaves its folder through a symbolic link`);
  if (existing === file && !statSync(file).isFile()) throw new Error(`The vendored path "${path}" is not a file`);
  return file;
}

/** An answer's body, refused once it is larger than `limit` bytes. */
async function body(response, name, limit, what) {
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body ?? []) {
    size += chunk.length;
    if (size > limit) throw new Error(`${name}: the answer is larger than ${what}`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** One file of the release, from a folder or from an https address, at most `limit` bytes. */
async function read(base, name, limit, what) {
  inside(name, 'The release path');
  if (/^https:\/\//.test(base)) {
    const response = await fetch(`${base.replace(/\/$/, '')}/${name}`, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT) });
    if (response.status >= 300 && response.status < 400) {
      const to = response.headers.get('location');
      throw new Error(`${name}: the address answered with a redirect${to ? ` to ${to}` : ''}, which vendor-brand.mjs does not follow; give --from the address the release is at`);
    }
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    return body(response, name, limit, what);
  }
  if (/^[a-z]+:\/\//i.test(base)) throw new Error(`--from takes a folder or an https:// address, not ${base}`);
  return readFileSync(join(base, name));
}

async function main() {
  const { values } = parseArgs({
    options: { check: { type: 'boolean' }, update: { type: 'string' }, from: { type: 'string' }, lock: { type: 'string', default: 'brand.lock.json' } },
  });
  const lockPath = resolve(values.lock);
  const root = dirname(lockPath);
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  if (!lock.files || typeof lock.files !== 'object') throw new Error(`${values.lock} has no "files"`);

  if (values.check) {
    const problems = [];
    for (const [path, entry] of Object.entries(lock.files)) {
      const file = join(root, inside(path, 'The vendored path'));
      if (!entry.sha256) problems.push(`${path}: the lock has no SHA-256 for it; run --update`);
      else if (!existsSync(file)) problems.push(`${path}: missing`);
      else if (sha256(readFileSync(file)) !== entry.sha256) problems.push(`${path}: differs from ${entry.source} of brand ${lock.version}`);
    }
    for (const problem of problems) console.error(problem);
    if (problems.length) {
      console.error(`Run "node vendor-brand.mjs --update ${lock.version}" to restore the files.`);
      return 1;
    }
    console.log(`brand ${lock.version}: ${Object.keys(lock.files).length} vendored files match the lock.`);
    return 0;
  }

  if (values.update) {
    if (!/^\d+\.\d+\.\d+$/.test(values.update)) throw new Error(`${values.update} is not a version such as 1.2.3`);
    const from = values.from ?? `https://raw.githubusercontent.com/NCodeGroup/brand/v${values.update}`;
    const manifest = JSON.parse((await read(from, 'manifest.json', MANIFEST_LIMIT, `${MANIFEST_LIMIT} bytes`)).toString('utf8'));
    if (manifest.version !== values.update) throw new Error(`The release is ${manifest.version}, not ${values.update}.`);
    const fetched = [];
    for (const [path, entry] of Object.entries(lock.files)) {
      const file = destination(root, path);
      const released = manifest.files?.[entry.source];
      if (!released) throw new Error(`brand ${manifest.version} has no ${entry.source}`);
      if (lock.version === manifest.version && entry.sha256 && entry.sha256 !== released.sha256) {
        throw new Error(`${path}: brand ${manifest.version} has another SHA-256 for ${entry.source} than the lock pins. A release never changes, so this is not that release; if you changed the entry's source, empty its sha256 and run --update again.`);
      }
      const bytes = await read(from, entry.source, released.bytes, `the ${released.bytes} bytes the release's manifest gives it`);
      if (sha256(bytes) !== released.sha256) throw new Error(`${entry.source}: the download does not match the release's manifest`);
      fetched.push({ path, entry, file, bytes, hash: released.sha256 });
    }
    // Every file is verified and every destination checked before any is written. Each is written beside its
    // destination and renamed into place once all are written, so a refused release or a failed write leaves the
    // vendored files and the lock as they were; only a rename that fails after them can leave some replaced, which
    // --check then names.
    const written = [];
    try {
      for (const f of fetched) {
        mkdirSync(dirname(f.file), { recursive: true });
        const temp = `${f.file}.${process.pid}.vendor-brand`;
        writeFileSync(temp, f.bytes, { flag: 'wx' });
        written.push([temp, f]);
      }
    } catch (error) {
      for (const [temp] of written) rmSync(temp, { force: true });
      throw error;
    }
    for (const [temp, f] of written) {
      renameSync(temp, f.file);
      f.entry.sha256 = f.hash;
      console.log(`${f.path}  <-  ${f.entry.source}  ${f.bytes.length} bytes`);
    }
    lock.version = manifest.version;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    console.log(`brand ${lock.version}: ${fetched.length} files vendored.`);
    return 0;
  }

  console.error(USAGE);
  return 2;
}

main().then(
  (code) => { process.exitCode = code; },
  (error) => { console.error(`vendor-brand.mjs: ${error.message}`); process.exitCode = 1; },
);
