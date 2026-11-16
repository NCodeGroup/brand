// lib/templates.mjs, which fills the sources of email/instrument.html and slides/instrument.css: each placeholder
// kind against the model's resolved values, inline and not, and a placeholder it can't fill fails the build.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { resolveColors } from '../lib/model.mjs';
import { embedFonts, fillTokens } from '../lib/templates.mjs';
import { model } from './helpers.mjs';

const m = model();

describe('lib/templates.mjs', () => {
  test('fills a color role with its light value, and a dark one with its dark value', () => {
    assert.equal(fillTokens('[[color:text]]', m), resolveColors(m, 'light').text);
    assert.equal(fillTokens('[[dark:text]]', m), resolveColors(m, 'dark').text);
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
