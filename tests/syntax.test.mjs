// syntax/instrument-screen.json, against the screen's tokens and the stylesheet's .tk-* classes rather than against its
// own generator: the theme is dark, its editor colors are the screen's, each scope's color is a screen role that the
// page already colors code with, and the contrast gate measures each role on the screen.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PAIRINGS, TEXT } from '../lib/contrast.mjs';
import { resolveColors } from '../lib/model.mjs';
import { syntaxTheme } from '../lib/syntax.mjs';
import { model, read, readJson } from './helpers.mjs';

const m = model();
const theme = syntaxTheme(m, readJson('package.json').version);
const light = resolveColors(m, 'light');
const FOREGROUND = /^var\(--nc-color-([a-z-]+)\)$/;
const roles = new Set(theme.tokenColors.map((rule) => FOREGROUND.exec(rule.settings.foreground)?.[1]));

describe('the syntax theme', () => {
  test('is a dark theme named instrument-screen whose editor colors are the screen and its ink', () => {
    assert.equal(theme.name, 'instrument-screen');
    assert.equal(theme.type, 'dark');
    assert.deepEqual(theme.colors, { 'editor.background': light.screen, 'editor.foreground': light['on-screen-secondary'] });
    assert.equal(resolveColors(m, 'dark').screen, light.screen);
  });

  test('colors each scope with a var() of a color role, the first rule being the source and its text, and names no scope twice', () => {
    for (const rule of theme.tokenColors) assert.match(rule.settings.foreground, FOREGROUND);
    assert.deepEqual(theme.tokenColors[0].scope, ['source', 'text']);
    assert.equal(theme.tokenColors[0].settings.foreground, 'var(--nc-color-on-screen-secondary)');
    const scopes = theme.tokenColors.flatMap((rule) => rule.scope);
    assert.deepEqual(scopes.filter((scope, i) => scopes.indexOf(scope) !== i), []);
  });

  test('uses the roles that the .tk-* classes of the stylesheet use', () => {
    const classes = [...read('src/css/base.css').matchAll(/\.tk-[a-z] \{ color: var\(--nc-color-([a-z-]+)\); \}/g)].map((x) => x[1]);
    assert.equal(classes.length, 5);
    assert.deepEqual([...roles].sort(), [...new Set(classes)].sort());
  });

  test('uses only roles that the contrast gate measures on the screen at the text ratio', () => {
    for (const role of roles) {
      const held = PAIRINGS.filter((p) => p.fg === role && p.bg === 'screen' && p.need === TEXT);
      assert.ok(held.length, `the gate measures ${role} on the screen at ${TEXT} to 1`);
    }
  });
});
