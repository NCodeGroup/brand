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
//       https://raw.githubusercontent.com/NCodeGroup/brand/v<version>, the release's tag.
//   --lock <file>  the lock to use, brand.lock.json by default. Vendored paths are relative to its folder.
//
// brand.lock.json: { "version": "0.1.0", "files": { "<vendored path>": { "source": "<path in the release>", "sha256": "" } } }
// Add a file by adding its entry with an empty sha256, then run --update.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

const USAGE = 'Usage: node vendor-brand.mjs --check | --update <version> [--from <folder or https address>] [--lock <file>]';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** A relative path that stays inside its folder, or an error naming what it is. */
function inside(path, what) {
  const clean = normalize(path);
  if (isAbsolute(path) || clean === '..' || clean.startsWith(`..${sep}`) || clean.split(sep).includes('..')) {
    throw new Error(`${what} "${path}" leaves its folder`);
  }
  return clean;
}

async function read(base, name) {
  inside(name, 'The release path');
  if (/^https:\/\//.test(base) || /^http:\/\/127\.0\.0\.1[:/]/.test(base)) {
    const response = await fetch(`${base.replace(/\/$/, '')}/${name}`, { redirect: 'follow' });
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
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
    const manifest = JSON.parse((await read(from, 'manifest.json')).toString('utf8'));
    if (manifest.version !== values.update) throw new Error(`The release is ${manifest.version}, not ${values.update}.`);
    const fetched = [];
    for (const [path, entry] of Object.entries(lock.files)) {
      inside(path, 'The vendored path');
      const released = manifest.files?.[entry.source];
      if (!released) throw new Error(`brand ${manifest.version} has no ${entry.source}`);
      const bytes = await read(from, entry.source);
      if (sha256(bytes) !== released.sha256) throw new Error(`${entry.source}: the download does not match the release's manifest`);
      fetched.push([path, entry, bytes, released.sha256]);
    }
    // Every file is verified before any is written, so a refused release leaves the vendored files as they were.
    for (const [path, entry, bytes, hash] of fetched) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), bytes);
      entry.sha256 = hash;
      console.log(`${path}  <-  ${entry.source}  ${bytes.length} bytes`);
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
