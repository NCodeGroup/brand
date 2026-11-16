// Shared by the tests: the repository's root, its model, and a way to run build.mjs on a copy of the repository.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel } from '../lib/model.mjs';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const read = (path) => readFileSync(join(ROOT, path), 'utf8');
export const readJson = (path) => JSON.parse(read(path));
export const model = () => buildModel(readJson('src/tokens.source.json'));

/** A copy of the repository, without .git, in a new temporary folder; remove() deletes it. */
export function copyRepository() {
  const dir = mkdtempSync(join(tmpdir(), 'ncode-brand-test-'));
  cpSync(ROOT, dir, {
    recursive: true,
    filter: (source) => {
      const path = relative(ROOT, source).split(sep);
      return path[0] !== '.git' && path[0] !== 'node_modules';
    },
  });
  return { dir, remove: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Runs a Node.js script with arguments in a folder, with more environment variables, and returns its exit code and output. */
export function runNode(cwd, args, env = {}) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  return { code: result.status, output: `${result.stdout}${result.stderr}` };
}
