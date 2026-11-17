// lib/templates.mjs, which fills the sources of email/instrument.html and slides/instrument.css, and the two files it
// writes: each placeholder kind against the model's resolved values, a placeholder it can't fill failing the build, and
// each file's colors, sizes, slots and embedded fonts against the tokens and fonts/.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { resolveColors } from '../lib/model.mjs';
import { embedFonts, fillTokens } from '../lib/templates.mjs';
import { derivedColors } from '../tokens/derive.mjs';
import { model, read, readJson, ROOT } from './helpers.mjs';

const m = model();
const light = resolveColors(m, 'light');
const dark = resolveColors(m, 'dark');
const version = readJson('package.json').version;

describe('lib/templates.mjs', () => {
  test('fills a color role with its light value, and a dark one with its dark value', () => {
    assert.equal(fillTokens('[[color:text]]', m), light.text);
    assert.equal(fillTokens('[[dark:text]]', m), dark.text);
  });

  test('writes space in px inline and in rem otherwise, and zero as 0', () => {
    assert.equal(fillTokens('[[space:6]]', m, { inline: true }), '24px');
    assert.equal(fillTokens('[[space:6]]', m), '1.5rem');
    assert.equal(fillTokens('[[space:0]]', m), '0');
    assert.equal(fillTokens('[[text:2xl]]', m, { inline: true }), '28px');
  });

  test('writes a radius and a border in px', () => {
    assert.equal(fillTokens('[[radius:module]]', m), '14px');
    assert.equal(fillTokens('[[border:bold]]', m), '2px');
  });

  test('writes a type role as declarations, with font-stretch outside an email', () => {
    assert.equal(
      fillTokens('[[type:label]]', m),
      "font-family: 'Instrument Sans Variable', 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif; font-size: 0.6875rem; line-height: 1.2; font-weight: 600; font-stretch: 82%; letter-spacing: 0.08em; text-transform: uppercase",
    );
    assert.equal(
      fillTokens('[[type:body]]', m, { inline: true }),
      "font-family:'Instrument Sans Variable','Instrument Sans',system-ui,-apple-system,'Segoe UI','Roboto','Helvetica Neue','Arial',sans-serif;font-size:16px;line-height:1.5;font-weight:400;letter-spacing:0",
    );
  });

  test('fills the version', () => {
    assert.equal(fillTokens('[[version]]', m, { version: '9.9.9' }), '9.9.9');
  });

  test('throws on a placeholder it cannot fill', () => {
    assert.throws(() => fillTokens('[[color:nope]]', m), /no value for \[\[color:nope\]\]/);
    assert.throws(() => fillTokens('[[color:constructor]]', m), /no value for \[\[color:constructor\]\]/);
    assert.throws(() => fillTokens('[[nope:x]]', m), /no value for \[\[nope:x\]\]/);
    assert.throws(() => fillTokens('[[fonts]]', m), /no value for \[\[fonts\]\]/);
    assert.throws(() => fillTokens('[[color:text', m), /a placeholder is left/);
  });

  test('embeds each font file of the @font-face rules as a data: address', () => {
    const css = '@font-face { src: url("../fonts/a.woff2") format("woff2"); }\n.x { }\n@font-face { src: url("../fonts/b.woff2"); }';
    const a = Buffer.from([1, 2, 3]);
    const b = Buffer.from([4, 5, 6, 7]);
    const embedded = embedFonts(css, { 'a.woff2': a, 'b.woff2': b });
    const data = [...embedded.matchAll(/url\("data:font\/woff2;base64,([A-Za-z0-9+/=]+)"\)/g)].map((match) => Buffer.from(match[1], 'base64'));
    assert.equal(data.length, 2);
    assert.ok(data[0].equals(a));
    assert.ok(data[1].equals(b));
    assert.doesNotMatch(embedded, /\.x/);
    assert.throws(() => embedFonts(css, { 'a.woff2': a }), /no font file b\.woff2 to embed/);
  });
});

describe('email/instrument.html', () => {
  const html = read('email/instrument.html');
  const colors = new Set(Object.values(light));
  const colorSlots = ['on_primary', 'on_screen', 'primary', 'primary_lip', 'screen'];

  test('has no placeholder, custom property, style element, stylesheet or script', () => {
    assert.doesNotMatch(html, /\[\[|var\(|--nc-|<style|<link|<script/);
  });

  test('has the slots the guide names, and no other double brace', () => {
    const slots = [...new Set([...html.matchAll(/\{\{ ([a-z_]+) \}\}/g)].map((match) => match[1]))].sort();
    assert.deepEqual(slots, ['action_label', 'action_url', 'code', 'footer', 'heading', 'logo_url', 'logo_width', 'message', ...colorSlots, 'preheader', 'product', 'subject'].sort());
    const rest = html.replace(/\{\{ [a-z_]+ \}\}/g, '');
    assert.ok(!rest.includes('{{') && !rest.includes('}}'));
  });

  test('names each color slot after a color deriveBrand() writes', () => {
    for (const slot of colorSlots) assert.ok(derivedColors.includes(slot.replaceAll('_', '-')), `${slot} is not a derived color`);
  });

  test('writes only colors of the light theme', () => {
    const hexes = [...html.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((match) => match[0]);
    assert.ok(hexes.length >= 5, `${hexes.length} colors`);
    for (const hex of hexes) assert.ok(colors.has(hex), `${hex} is not a color of the light theme`);
  });

  test('colors the page with its role, and the key with its lip and the screen with their slots', () => {
    assert.ok(html.includes(`<body style="margin:0;padding:0;background-color:${light.page};">`));
    assert.ok(html.includes('background-color:{{ primary }};border-bottom:2px solid {{ primary_lip }};'));
    assert.ok(html.includes('color:{{ on_primary }};text-decoration:none;">{{ action_label }}</a>'));
    assert.ok(html.includes('background-color:{{ screen }};'));
  });

  test('writes sizes in pixels', () => {
    assert.doesNotMatch(html, /\d(?:\.\d+)?rem\b/);
  });

  test('names the release it comes from', () => {
    assert.ok(html.includes(`NCode Brand ${version}: email/instrument.html`));
  });
});

describe('slides/instrument.css', () => {
  const css = read('slides/instrument.css');
  const text = css.replace(/url\("data:[^"]+"\)/g, '');
  const colors = new Set([...Object.values(light), ...Object.values(dark)]);

  test('is the Marp theme instrument, a slide of 1280 by 720 pixels', () => {
    assert.match(css, /^\/\*\n \* @theme instrument\n \* @auto-scaling true\n/);
    assert.match(text, /section \{[^}]*width: 1280px;[^}]*height: 720px;/);
  });

  test('has no placeholder, custom property, font address or import', () => {
    assert.doesNotMatch(css, /\[\[|var\(|url\("\.\.\/|@import/);
  });

  test('embeds each woff2 file of fonts/', () => {
    const embedded = [...css.matchAll(/url\("data:font\/woff2;base64,([A-Za-z0-9+/=]+)"\)/g)].map((match) => Buffer.from(match[1], 'base64'));
    assert.equal(embedded.length, 4);
    const files = readdirSync(join(ROOT, 'fonts')).filter((name) => name.endsWith('.woff2'));
    assert.equal(files.length, 4);
    for (const name of files) {
      const bytes = readFileSync(join(ROOT, 'fonts', name));
      assert.ok(embedded.some((data) => data.equals(bytes)), `fonts/${name} is not embedded`);
    }
  });

  test('writes only colors of the two themes, the light one on a slide and the dark one under invert', () => {
    for (const hex of text.match(/#[0-9A-Fa-f]{6}\b/g)) assert.ok(colors.has(hex), `${hex} is not a color of either theme`);
    assert.match(text, new RegExp(`section \\{[^}]*background: ${light.surface};`));
    assert.ok(text.includes(`section.invert { background: ${dark.surface}; color: ${dark.text}; }`));
  });

  test('sets a code block on the screen and colors no syntax', () => {
    assert.match(text, new RegExp(`pre \\{[^}]*background: ${light.screen};[^}]*color: ${light['on-screen-secondary']};`));
    assert.doesNotMatch(css, /hljs|shiki/i);
  });

  test('names the release it comes from', () => {
    assert.ok(css.includes(`NCode Brand ${version}: slides/instrument.css`));
  });
});
