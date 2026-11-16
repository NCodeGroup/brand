#!/usr/bin/env node
/**
 * Writes every generated file of NCode Brand from the hand-written sources in src/, and the generated blocks of
 * guidelines/ and specimens/.
 *
 *     node build.mjs            writes each file that is missing or would change   (npm run build)
 *     node build.mjs --check    writes nothing; lists each file that is missing, would change or would be removed,
 *                               and exits 1 when one would                         (npm run check)
 *
 * Generated and committed: tokens/, css/, fonts/, brace/, icons/, logo/, mui/ and manifest.json. It removes a file in
 * those folders that it does not write. A PNG or ICO that already holds the pixels it draws is kept, so an image
 * another encoder wrote doesn't change while its picture stays the same, and manifest.json hashes the bytes that stay.
 * It also fails when a pairing of the contrast gate is below its floor, and when a block it writes has lost its
 * markers. It writes and removes real files inside the repository alone: it refuses a symbolic link in a folder it
 * writes, and a font name with a path in it. It needs Node.js alone: no packages.
 */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { deriveSweep, fill, foundationsBlocks, guideBlocks, blockNames } from './lib/blocks.mjs';
import { braceFiles } from './lib/brace.mjs';
import { contrastReport } from './lib/contrast.mjs';
import { createDerive } from './lib/derive-core.mjs';
import { deriveData, deriveModule, deriveTypes, heldPairings, vectors } from './lib/derive.mjs';
import { toDtcg } from './lib/dtcg.mjs';
import { iconBlock, iconFiles, iconList, iconSet } from './lib/icons.mjs';
import { createLogo, holds, logoKit } from './lib/logo.mjs';
import { buildModel, resolveColors } from './lib/model.mjs';
import { tokensModule, tokensTypes } from './lib/module.mjs';
import { muiData } from './lib/mui.mjs';
import { tokensCss, tokensStaticCss } from './lib/tokens-css.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
/** The folders build.mjs owns: every file in them is generated. */
const GENERATED = ['tokens', 'css', 'fonts', 'brace', 'icons', 'logo', 'mui'];
/** The folders whose files hold generated blocks. */
const WITH_BLOCKS = ['guidelines', 'specimens'];
/** Hand-written files a release carries beside the generated folders. */
const RELEASED_SOURCES = ['LICENSE.txt', 'COPYRIGHT.txt', 'TRADEMARKS.md', 'vendoring/vendor-brand.mjs'];

const USAGE = 'Usage: node build.mjs [--check]';
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Markdown written in one folder with its relative links rewritten, so they work from another. */
const moveLinks = (markdown, from, to) =>
  markdown.replace(/(\]\()([^)\s]+)\)/g, (link, open, target) =>
    /^([a-z]+:|#|\/)/i.test(target) ? link : `${open}${posix.relative(to, posix.join(from, target))}${target.endsWith('/') ? '/' : ''})`);

/** The header a stylesheet copied from src/css gets. */
const cssHeader = (name, version) =>
  `/* NCode Brand ${version}: css/${name}, copied by build.mjs from src/css/${name}; edit that file. Apache-2.0. */\n`;

/**
 * The icon set: NCode's drawings and the Lucide files that src/icons/lucide.lock.json pins, checked as the fonts are,
 * and the Lucide version and license the files of icons/ name.
 */
function readIcons() {
  const lock = JSON.parse(read('src/icons/lucide.lock.json'));
  const locked = new Set();
  const lucide = {};
  for (const [name, hash] of Object.entries(lock.icons)) {
    // A plain icon name: one with a path in it would read outside src/icons/lucide.
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      throw new Error(`lucide.lock.json names "${name}", which is not the name of an icon`);
    }
    const path = join(ROOT, 'src/icons/lucide', `${name}.svg`);
    if (!existsSync(path)) throw new Error(`src/icons/lucide/${name}.svg is missing: lucide.lock.json names it`);
    const bytes = readFileSync(path);
    if (sha256(bytes) !== hash) {
      throw new Error(`src/icons/lucide/${name}.svg is not the file lucide.lock.json pins (SHA-256 ${hash})`);
    }
    lucide[name] = bytes.toString('utf8');
    locked.add(`${name}.svg`);
  }
  const unlocked = readdirSync(join(ROOT, 'src/icons/lucide')).filter((name) => !locked.has(name));
  if (unlocked.length) {
    throw new Error(`src/icons/lucide has files lucide.lock.json does not pin: ${unlocked.join(', ')}`);
  }
  const licenseBytes = readFileSync(join(ROOT, 'src/icons/LICENSE-Lucide.txt'));
  if (sha256(licenseBytes) !== lock.license.sha256) {
    throw new Error('src/icons/LICENSE-Lucide.txt is not the file lucide.lock.json pins');
  }
  const text = licenseBytes.toString('utf8');
  return {
    set: iconSet({ ncode: read('src/icons/ncode.svg'), lucide }),
    lucide: { version: lock.version, license: lock.license.name, text },
  };
}

/** Every generated file, by its path from the repository root, as { data, image?, entries? }. */
function generate(model, version, icons) {
  const files = new Map();
  const text = (path, content) => files.set(path, { data: Buffer.from(content, 'utf8') });

  text('tokens/tokens.css', tokensCss(model, version));
  text('tokens/tokens.static.css', tokensStaticCss(model, version));
  text('tokens/tokens.json', json(toDtcg(model, version)));
  text('tokens/tokens.mjs', tokensModule(model, version));
  text('tokens/tokens.d.mts', tokensTypes(model, version));
  text('tokens/derive.mjs', deriveModule(model, version));
  text('tokens/derive.d.mts', deriveTypes(model, version));
  text('tokens/derive.vectors.json', json(vectors(model, version)));

  for (const name of ['base.css', 'fonts.css', 'starlight.css']) text(`css/${name}`, cssHeader(name, version) + read(`src/css/${name}`));

  const lock = JSON.parse(read('src/fonts/fonts.lock.json'));
  const locked = new Set(['fonts.lock.json']);
  for (const family of Object.values(lock.families)) {
    for (const [name, entry] of Object.entries(family.files)) {
      // A plain file name: one with a path in it would read and write outside src/fonts and fonts/.
      if (!/^[\w-][\w.-]*$/.test(name)) throw new Error(`fonts.lock.json names "${name}", which is not the name of a file in src/fonts`);
      const path = join(ROOT, 'src/fonts', name);
      if (!existsSync(path)) throw new Error(`src/fonts/${name} is missing: fonts.lock.json names it`);
      const bytes = readFileSync(path);
      if (sha256(bytes) !== entry.sha256) throw new Error(`src/fonts/${name} is not the file fonts.lock.json pins (SHA-256 ${entry.sha256})`);
      files.set(`fonts/${name}`, { data: bytes });
      locked.add(name);
    }
  }
  const unlocked = readdirSync(join(ROOT, 'src/fonts')).filter((name) => !locked.has(name));
  if (unlocked.length) throw new Error(`src/fonts has files fonts.lock.json does not pin: ${unlocked.join(', ')}`);

  const logo = createLogo(model, JSON.parse(read('src/logo/ncode.json')));
  for (const [name, content] of Object.entries(braceFiles(model, logo, version))) text(`brace/${name}`, content);
  const iconSources = iconFiles(icons.set, { version, lucide: icons.lucide });
  for (const [name, content] of Object.entries(iconSources)) text(`icons/${name}`, content);
  text('logo/README.md', `<!-- Generated by build.mjs from src/logo/kit.md: edit that file. -->\n\n${moveLinks(read('src/logo/kit.md'), 'src/logo', 'logo')}`);
  for (const [name, file] of logoKit(logo)) files.set(`logo/ncode/${name}`, file);
  for (const [name, file] of logoKit(createLogo(model, JSON.parse(read('src/logo/identity.json'))))) files.set(`logo/identity/${name}`, file);

  text('mui/instrument.json', json(muiData(model, version)));
  return files;
}

/**
 * The generated blocks of guidelines/ and specimens/, as the whole new text of each file that has one. Every block
 * build.mjs writes must be in a file, once: a block whose markers are gone would keep its old numbers unseen. A
 * specimen page's `icons` block holds the symbols of the icons the page uses.
 */
function blocks(model, report, icons) {
  const { deriveBrand } = createDerive(deriveData(model));
  const guide = guideBlocks(model, report, deriveSweep(model, deriveBrand, heldPairings(), resolveColors));
  const foundations = foundationsBlocks(model, report);
  const out = new Map();
  // The guide's pages share one set of blocks, and each specimen file has its own.
  const places = [
    [
      { ...guide, 'icon-list': iconList(icons.set, icons.lucide) },
      'a file of guidelines/',
      readdirSync(join(ROOT, 'guidelines')).filter((n) => n.endsWith('.md')).sort().map((n) => `guidelines/${n}`),
      false,
    ],
    [foundations.html, 'specimens/foundations.html', ['specimens/foundations.html'], false],
    [foundations.css, 'specimens/foundations.css', ['specimens/foundations.css'], true],
    [
      {},
      'a page of specimens/',
      readdirSync(join(ROOT, 'specimens'))
        .filter((n) => n.endsWith('.html') && n !== 'foundations.html')
        .sort()
        .map((n) => `specimens/${n}`),
      false,
    ],
  ];
  for (const [bodies, place, paths, css] of places) {
    const filled = new Set();
    for (const path of paths) {
      const current = read(path);
      let next = current;
      const names = blockNames(current);
      // A specimen page's icons block is filled from the set, whichever page it is in.
      const page = path.startsWith('specimens/') && path.endsWith('.html');
      for (const name of names) {
        const iconsBlock = page && name === 'icons';
        if (!iconsBlock && !(name in bodies)) {
          throw new Error(`${path} has a generated block "${name}" that build.mjs does not write`);
        }
        // fill() fills the first copy of a block, so a second copy would keep its old numbers.
        if (names.indexOf(name) !== names.lastIndexOf(name)) throw new Error(`${path} holds the generated block "${name}" twice`);
        next = fill(next, name, iconsBlock ? iconBlock(icons.set, current, path) : bodies[name], { css });
        filled.add(name);
      }
      out.set(path, { data: Buffer.from(next, 'utf8') });
    }
    for (const name of Object.keys(bodies)) {
      if (!filled.has(name)) throw new Error(`no generated block "${name}" in ${place}: build.mjs writes it, so restore its markers`);
    }
  }
  return out;
}

/** The error for a symbolic link where build.mjs writes: it would take a write or a removal outside the repository. */
const linked = (path) => new Error(`${path} is a symbolic link: build.mjs writes and removes only real files inside the repository`);

/**
 * Every file below a folder, as paths from the repository root. It refuses a symbolic link, the folder's own
 * included, instead of following it, as readdirSync's recursive option would.
 */
function filesUnder(folder) {
  const out = [];
  const visit = (path) => {
    const stat = lstatSync(join(ROOT, path), { throwIfNoEntry: false });
    if (!stat) return;
    if (stat.isSymbolicLink()) throw linked(path);
    if (!stat.isDirectory()) return out.push(path);
    for (const name of readdirSync(join(ROOT, path)).sort()) visit(`${path}/${name}`);
  };
  visit(folder);
  return out;
}

function main() {
  let values;
  try {
    ({ values } = parseArgs({ options: { check: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' } } }));
  } catch (error) {
    console.error(`${error.message}\n${USAGE}`);
    return 2;
  }
  if (values.help) {
    console.log(`${USAGE}\n\nWrites every generated file of NCode Brand from src/.\n  --check  write nothing; list each file that is missing, would change or would be removed, and exit 1 if any is`);
    return 0;
  }
  const check = values.check;
  // Before anything is read or written: no folder build.mjs writes in, and nothing in one, is a symbolic link.
  const existing = GENERATED.flatMap(filesUnder);
  for (const folder of WITH_BLOCKS) filesUnder(folder);
  if (lstatSync(join(ROOT, 'manifest.json'), { throwIfNoEntry: false })?.isSymbolicLink()) throw linked('manifest.json');

  const version = JSON.parse(read('package.json')).version;
  const model = buildModel(JSON.parse(read('src/tokens.source.json')));
  const report = contrastReport(model);
  const icons = readIcons();

  const filled = blocks(model, report, icons); // first, so a lost block fails before the logo kit is drawn
  const targets = new Map([...generate(model, version, icons), ...filled]);
  const released = new Map(); // path -> the bytes a release carries after this run
  let changed = 0;
  const lines = [];
  for (const [path, file] of targets) {
    const full = join(ROOT, path);
    const exists = existsSync(full);
    const current = exists ? readFileSync(full) : null;
    const kept = exists && holds(current, file);
    released.set(path, kept ? current : file.data);
    if (kept) continue;
    changed++;
    if (!check) {
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, file.data);
    }
    lines.push(`${path}  ${check ? (exists ? 'would change' : 'missing') : 'written'}`);
  }

  const stale = existing.filter((path) => !targets.has(path));
  for (const path of stale) {
    changed++;
    if (!check) rmSync(join(ROOT, path));
    lines.push(`${path}  ${check ? 'would be removed: build.mjs does not write it' : 'removed'}`);
  }

  // The manifest: every released file, as it is once this run is done.
  for (const path of RELEASED_SOURCES) released.set(path, readFileSync(join(ROOT, path)));
  const manifestFiles = Object.fromEntries(
    [...released.keys()]
      .filter((path) => GENERATED.some((folder) => path.startsWith(`${folder}/`)) || RELEASED_SOURCES.includes(path))
      .sort()
      .map((path) => [path, { bytes: released.get(path).length, sha256: sha256(released.get(path)) }]),
  );
  const manifest = json({
    $description:
      'Every file of this NCode Brand release, with its size and SHA-256. A consumer vendors files from it and checks them ' +
      'offline against these hashes (vendoring/vendor-brand.mjs). Generated by build.mjs; do not edit it.',
    name: 'NCodeGroup/brand',
    version,
    files: manifestFiles,
  });
  const manifestPath = join(ROOT, 'manifest.json');
  const manifestCurrent = existsSync(manifestPath) ? readFileSync(manifestPath, 'utf8') : null;
  if (manifestCurrent !== manifest) {
    changed++;
    if (!check) writeFileSync(manifestPath, manifest);
    lines.push(`manifest.json  ${check ? (manifestCurrent === null ? 'missing' : 'would change') : 'written'}`);
  }

  for (const line of lines) console.log(line);
  const total = targets.size + 1;
  console.log(`${total} generated files and blocks, ${Object.keys(manifestFiles).length} released files.`);
  const failing = report.rows.filter((r) => !r.pass);
  console.log(`Contrast: ${report.measured} measurements of ${report.pairings} pairings, ${failing.length} below the requirement.`);
  for (const r of failing) console.error(`  ${r.brand}, ${r.theme}: ${r.fg} on ${r.bg} is ${r.ratio}, needs ${r.need}`);
  const files = changed === 1 ? '1 file' : `${changed} files`;
  if (check) console.log(changed ? `Missing, stale or extra: ${files}. Run npm run build and commit what it writes.` : 'No file would change.');
  else console.log(changed ? `Wrote or removed ${files}.` : 'No file changed.');
  return (check && changed) || failing.length ? 1 : 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`build.mjs: ${error.message}`);
  process.exitCode = 1;
}
