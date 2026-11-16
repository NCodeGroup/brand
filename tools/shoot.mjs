// Takes screenshots of the specimens in specimens/ and the guide's pages in guide/, served over HTTP under a strict Content-Security-Policy,
// default-src 'self'. It waits for the fonts, and fails when a page logs an error or a warning, a request fails, no
// web font loads, or a page scrolls sideways. Run it by hand: it needs Playwright (tools/browser.mjs), and nothing
// else runs it.
//   node tools/shoot.mjs --out=<folder>                 every shot
//   node tools/shoot.mjs --out=<folder> console docs    only the shots of those scenes
// A name is <scene>-<theme>-<width>[-<suffix>]. "-full" is the whole page, taken by making the window as tall as the
// page so sticky parts sit where they belong. shots.json lists what was taken and every problem.
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from './browser.mjs';
import { ROOT, serve } from './serve.mjs';

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };
const SCENES = ['foundations', 'docs', 'hero', 'product', 'signin', 'consent', 'console', 'settings', 'states'];
const onPhone = ['foundations', 'docs', 'signin', 'consent', 'console', 'settings'];

const jobs = [];
for (const scene of SCENES) {
  for (const theme of ['light', 'dark']) {
    jobs.push({ scene, theme, size: desktop, full: true });
    if (onPhone.includes(scene)) jobs.push({ scene, theme, size: phone, full: true });
    if (scene === 'console' || scene === 'settings') jobs.push({ scene, theme, size: desktop, query: 'dialog=1', suffix: 'dialog' });
  }
}
// The phone layouts of the console: its navigation sheet and its dialogs as sheets.
jobs.push({ scene: 'console', theme: 'light', size: phone, query: 'nav=1', suffix: 'nav' });
jobs.push({ scene: 'console', theme: 'light', size: phone, query: 'dialog=1', suffix: 'dialog' });
jobs.push({ scene: 'settings', theme: 'light', size: phone, query: 'dialog=1', suffix: 'dialog' });
jobs.push({ scene: 'docs', theme: 'light', size: phone, query: 'nav=1', suffix: 'nav' });
// The white-label proof: a tenant's primary color alone, then with a secondary color.
for (const scene of ['signin', 'consent', 'console']) {
  for (const primary of ['0F766E', 'C2410C']) jobs.push({ scene, theme: 'light', size: desktop, query: `primary=${primary}`, suffix: primary });
}
jobs.push({ scene: 'console', theme: 'light', size: desktop, query: 'primary=0F766E&secondary=7C2D12', suffix: '0F766E-7C2D12' });
jobs.push({ scene: 'signin', theme: 'light', size: desktop, query: 'primary=C2410C&secondary=1E3A5F', suffix: 'C2410C-1E3A5F' });
jobs.push({ scene: 'console', theme: 'dark', size: desktop, query: 'primary=0F766E', suffix: '0F766E' });
// Each state of states.html alone, as the page it is.
for (const state of ['loading', 'empty', 'error', 'notfound']) jobs.push({ scene: 'states', theme: 'light', size: desktop, query: `state=${state}`, suffix: state });
// Pages that are not designed for a phone are still checked there for sideways scrolling.
for (const scene of ['hero', 'product', 'states']) jobs.push({ scene, theme: 'light', size: phone, full: true, onlyFull: true });
// The guide's pages: each is checked on a phone, and three are shot in both themes on a desktop.
const GUIDE = readdirSync(path.join(ROOT, 'guide')).filter((n) => n.endsWith('.html')).map((n) => n.slice(0, -5));
for (const name of GUIDE) jobs.push({ scene: `guide-${name}`, page: `guide/${name}.html`, theme: 'light', size: phone, full: true, onlyFull: true });
for (const name of ['index', '01-marks', '13-token-reference']) {
  for (const theme of ['light', 'dark']) jobs.push({ scene: `guide-${name}`, page: `guide/${name}.html`, theme, size: desktop, full: true });
}
jobs.push({ scene: 'guide-index', page: 'guide/index.html', theme: 'light', size: phone, query: 'nav=1', suffix: 'nav' });

const args = process.argv.slice(2);
const out = args.find((a) => a.startsWith('--out='))?.slice(6);
if (!out) {
  console.error('Usage: node tools/shoot.mjs --out=<folder> [scene ...]');
  process.exit(2);
}
const outDir = path.resolve(out);
const only = args.filter((a) => !a.startsWith('--'));
const selected = jobs.filter((job) => !only.length || only.includes(job.scene));

const { url, close } = await serve();
const browser = await chromium().launch();
const problems = [];
const taken = [];
mkdirSync(outDir, { recursive: true });
for (const job of selected) {
  // Reduced motion pins the animated parts (the memory panel, the loading lamps) to their designed still state.
  const context = await browser.newContext({ viewport: job.size, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const name = [job.scene, job.theme, job.size.width, job.suffix].filter(Boolean).join('-');
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${name}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${name}: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`${name}: failed ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${name}: ${r.status()} ${r.url()}`); });
  const query = [`theme=${job.theme}`, job.query].filter(Boolean).join('&');
  await page.goto(`${url}/${job.page ?? `specimens/${job.scene}.html`}?${query}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
  if (!fonts.length) problems.push(`${name}: no web font loaded`);
  await page.waitForTimeout(150);
  const { overflow, height } = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, height: document.documentElement.scrollHeight }));
  if (overflow > 0) problems.push(`${name}: the page scrolls sideways by ${overflow}px`);
  if (!job.onlyFull) {
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    taken.push({ name, width: job.size.width, height: job.size.height, overflow });
  }
  if (job.full) {
    const file = path.join(outDir, `${name}-full.png`);
    if (height > job.size.height + 1) {
      await page.setViewportSize({ width: job.size.width, height });
      await page.waitForTimeout(100);
      const tall = await page.evaluate(() => document.documentElement.scrollHeight);
      if (tall !== height) {
        await page.setViewportSize({ width: job.size.width, height: tall });
        await page.waitForTimeout(60);
      }
      await page.screenshot({ path: file });
      taken.push({ name: `${name}-full`, width: job.size.width, height: tall, overflow });
    } else if (existsSync(file)) unlinkSync(file);
  }
  console.log('shot', name, overflow ? `(overflow ${overflow}px)` : '');
  await context.close();
}
await browser.close();
await close();
writeFileSync(path.join(outDir, 'shots.json'), `${JSON.stringify({ taken, problems: [...new Set(problems)] }, null, 1)}\n`);
if (problems.length) {
  console.log('\nPROBLEMS');
  for (const p of [...new Set(problems)]) console.log(`  ${p.slice(0, 300)}`);
  process.exitCode = 1;
} else console.log(`\n${taken.length} screenshots; no console errors, no failed requests, no CSP violations, no sideways scrolling`);
