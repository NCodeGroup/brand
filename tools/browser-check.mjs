// Checks in a browser what the build computes in Node, by hand: it needs Playwright (tools/browser.mjs), and nothing
// else runs it.
//   1. The build's color math gives what the browser computes from tokens/tokens.css, for every semantic color, in
//      light and dark, for NCode Blue and every proof and stress color, to within one step of one channel.
//   2. The static palette: tokens.css served as a browser without light-dark(), relative colors or color-mix() reads
//      it gives every color the full rendering gives, in light, in dark, and in each by the system setting alone.
//   3. Braces without CSS masks: the specimens load without errors or sideways scrolling, and draw each brace as a
//      plain rule.
//   node tools/browser-check.mjs       exits 1 when any of the three finds a difference
import { readFileSync } from 'node:fs';
import { hexToRgb } from '../lib/color.mjs';
import { BRANDS } from '../lib/contrast.mjs';
import { buildModel, resolveColors } from '../lib/model.mjs';
import { chromium } from './browser.mjs';
import { ROOT, serve } from './serve.mjs';

const model = buildModel(JSON.parse(readFileSync(`${ROOT}/src/tokens.source.json`, 'utf8')));
const names = model.colors.map((c) => c.name);
const probe = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Token probe</title><link rel="stylesheet" href="/tokens/tokens.css"></head><body></body></html>';

/** Every semantic color as the browser paints it: opaque ones read back from a canvas, translucent ones as CSS. */
const paint = (page, { theme, primary, secondary }) => page.evaluate(({ names, theme, primary, secondary }) => {
  const root = document.documentElement;
  if (theme) root.setAttribute('data-theme', theme); else root.removeAttribute('data-theme');
  for (const [prop, value] of [['--nc-brand', primary], ['--nc-brand-secondary', secondary]]) {
    if (value) root.style.setProperty(prop, `#${value}`); else root.style.removeProperty(prop);
  }
  const el = document.createElement('div');
  document.body.appendChild(el);
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const out = {};
  for (const name of names) {
    el.style.color = `var(--nc-color-${name})`;
    const computed = getComputedStyle(el).color;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = computed;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    out[name] = d[3] === 255 ? `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}` : `rgba(${[...d].join(',')})`;
  }
  el.remove();
  return out;
}, { names, theme, primary, secondary });

const channelDifference = (a, b) => Math.round(Math.max(...hexToRgb(a).map((v, i) => Math.abs(v - hexToRgb(b)[i]))) * 255);

/** Removes "@supports <condition> { ... }" blocks whose condition matches, or unwraps them, by brace counting. */
function transformSupports(css, decide) {
  let out = '';
  let at = 0;
  for (;;) {
    const start = css.indexOf('@supports', at);
    if (start < 0) return out + css.slice(at);
    const open = css.indexOf('{', start);
    let depth = 1;
    let i = open + 1;
    for (; depth > 0; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
    }
    const action = decide(css.slice(start + 9, open).trim());
    out += css.slice(at, start) + (action === 'drop' ? '' : action === 'unwrap' ? css.slice(open + 1, i - 1) : css.slice(start, i));
    at = i;
  }
}

const browser = await chromium().launch();
let failures = 0;

// ---- 1. the build's math against the browser
{
  const { url, close } = await serve({ pages: { '/__probe': probe } });
  const page = await browser.newPage();
  await page.goto(`${url}/__probe`);
  let worst = 0;
  for (const brand of BRANDS) {
    for (const theme of ['light', 'dark']) {
      const painted = await paint(page, { theme, primary: brand.primary, secondary: brand.secondary });
      const computed = resolveColors(model, theme, {
        brand: brand.primary ? `#${brand.primary}` : undefined,
        secondary: brand.secondary ? `#${brand.secondary}` : undefined,
      });
      for (const name of names) {
        if (!painted[name].startsWith('#')) continue;
        const d = channelDifference(painted[name], computed[name]);
        worst = Math.max(worst, d);
        if (d > 1) {
          failures++;
          console.log(`  ${brand.name}, ${theme}: --nc-color-${name} is ${painted[name]} in the browser, ${computed[name]} in the build`);
        }
      }
    }
  }
  console.log(`1. build math against the browser: worst difference ${worst} of 255 in one channel`);
  await close();
}

// ---- 2. the static palette
{
  const oldTokens = (css) => transformSupports(css, (condition) => (condition.startsWith('not') ? 'unwrap' : condition.includes('light-dark') ? 'drop' : 'keep'));
  const modern = await serve({ pages: { '/__probe': probe } });
  const old = await serve({ pages: { '/__probe': probe }, rewrite: (file, data) => (file === '/tokens/tokens.css' ? oldTokens(data.toString('utf8')) : null) });
  let worst = 0;
  for (const [label, theme, scheme] of [['light', 'light', 'light'], ['dark', 'dark', 'dark'], ['dark by the system setting', null, 'dark'], ['light by the system setting', null, 'light']]) {
    const context = await browser.newContext({ colorScheme: scheme });
    const a = await context.newPage();
    const b = await context.newPage();
    await a.goto(`${modern.url}/__probe`);
    await b.goto(`${old.url}/__probe`);
    const full = await paint(a, { theme });
    const fallback = await paint(b, { theme });
    let differ = 0;
    for (const name of names) {
      if (full[name] === fallback[name]) continue;
      const d = full[name].startsWith('#') && fallback[name].startsWith('#') ? channelDifference(full[name], fallback[name]) : 255;
      worst = Math.max(worst, d);
      if (d > 1) {
        differ++;
        console.log(`  ${label}: --nc-color-${name} is ${fallback[name]} in the fallback, ${full[name]} in full`);
      }
    }
    failures += differ;
    console.log(`2. static palette, ${label}: ${names.length - differ} of ${names.length} colors match`);
    await context.close();
  }
  console.log(`   worst difference ${worst} of 255 in one channel`);
  await modern.close();
  await old.close();
}

// ---- 3. braces without masks
{
  const noMasks = (css) => transformSupports(css, (condition) => (condition.includes('mask-image') ? 'drop' : 'keep'));
  const plain = await serve({ rewrite: (file, data) => (file === '/css/base.css' ? noMasks(data.toString('utf8')) : null) });
  for (const [scene, width] of [['signin', 1440], ['console', 1440], ['hero', 1440], ['docs', 1440], ['consent', 390]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${plain.url}/specimens/${scene}.html?theme=light`);
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const brace = document.querySelector('.brace, .lifetime');
      const before = brace ? getComputedStyle(brace, '::before') : null;
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        rule: before ? `${before.width} wide, ${before.maskImage === 'none' || !before.maskImage ? 'no mask' : 'masked'}` : 'no brace on the page',
      };
    });
    const ok = !errors.length && result.overflow === 0 && /^2px wide, no mask$/.test(result.rule);
    if (!ok) failures++;
    console.log(`3. without masks, ${scene} at ${width}: ${ok ? 'ok' : 'PROBLEM'} (brace: ${result.rule}; sideways ${result.overflow}px${errors.length ? `; ${errors.length} errors` : ''})`);
    await context.close();
  }
  await plain.close();
}

await browser.close();
if (failures) {
  console.error(`${failures} problems`);
  process.exitCode = 1;
} else console.log('The browser agrees with the build.');
