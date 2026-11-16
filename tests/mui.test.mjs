// mui/instrument.json, against the tokens it is made from (tokens/tokens.mjs) rather than against its own generator:
// each variant carries its type role, each elevation is one of the depths in order, and each length is its token in
// pixels.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import * as tokens from '../tokens/tokens.mjs';
import { readJson } from './helpers.mjs';

const mui = readJson('mui/instrument.json');
const SCHEMES = ['light', 'dark'];
/** A length token in pixels, at 16 pixels a rem. */
const px = (css) => {
  if (css === '0') return 0;
  const m = /^(-?[\d.]+)(rem|px)$/.exec(css);
  assert.ok(m, `${css} is not a length in rem or px`);
  return Number(m[1]) * (m[2] === 'rem' ? 16 : 1);
};
const family = (names) => names.map((f) => (/^[a-z-]+$/.test(f) ? f : `"${f}"`)).join(', ');

describe('the shadows', () => {
  // From the shallowest to the deepest.
  const DEPTHS = ['recessed', 'flush', 'raised', 'floating', 'overlay'];

  for (const scheme of SCHEMES) {
    test(`${scheme}: 25 elevations, the first none, every other one of the depths, never shallower as the level rises`, () => {
      const shadows = mui.shadows[scheme];
      const depthOf = (shadow) => Object.keys(tokens.elevation[scheme]).find((name) => tokens.elevation[scheme][name] === shadow);
      assert.equal(shadows.length, 25);
      assert.equal(shadows[0], 'none');
      const depths = shadows.slice(1).map(depthOf);
      assert.deepEqual(depths.filter((d) => d === undefined), [], 'an elevation that is no depth');
      const order = depths.map((d) => DEPTHS.indexOf(d));
      assert.deepEqual(order, [...order].sort((a, b) => a - b));
      // Material UI 9.5's components: Paper and Card at 1, AppBar at 4, Menu and Popover at 8, Drawer at 16, Dialog at
      // 24 (read from its npm package). The guide puts the one soft shadow under menus, dialogs and sheets.
      assert.equal(depthOf(shadows[1]), 'flush');
      assert.equal(depthOf(shadows[4]), 'raised');
      assert.equal(depthOf(shadows[8]), 'floating');
      assert.equal(depthOf(shadows[16]), 'overlay');
      assert.equal(depthOf(shadows[24]), 'overlay');
    });
  }
});

describe('the typography', () => {
  const { variants } = mui.typography;
  const FIELDS = ['fontSize', 'fontWeight', 'lineHeight', 'fontStretch', 'letterSpacing'];

  test('each variant carries every value of its type role, and the button differs only as a key label does', () => {
    for (const [name, variant] of Object.entries(variants)) {
      const role = tokens.type[variant.role];
      assert.ok(role, `${name} names no type role`);
      assert.equal(variant.fontFamily, family(role.fontFamily), name);
      const own = name === 'button' ? { fontWeight: 600, lineHeight: 1, textTransform: 'none' } : {};
      for (const field of FIELDS) assert.equal(variant[field], own[field] ?? role[field], `${name}.${field}`);
      assert.equal(variant.textTransform, own.textTransform ?? role.textTransform, `${name}.textTransform`);
      const mono = role.fontFamily[0] === tokens.font.mono[0];
      assert.equal(variant.fontFeatureSettings, mono ? '"zero" 1' : undefined, `${name}.fontFeatureSettings`);
    }
  });

  test('the variants an application uses most take the role that names their use', () => {
    // The roles' own uses: title is a page's title, heading a section, subheading a group within one; ui is the
    // interface's text; field the name above a part of a form.
    const roles = Object.fromEntries(Object.entries(variants).map(([name, v]) => [name, v.role]));
    assert.deepEqual(
      { h1: roles.h1, h2: roles.h2, h3: roles.h3, body1: roles.body1, body2: roles.body2, subtitle2: roles.subtitle2 },
      { h1: 'title', h2: 'heading', h3: 'subheading', body1: 'ui', body2: 'ui', subtitle2: 'field' },
    );
  });

  test('the headings run from the page title down, and none is larger than the one above it', () => {
    assert.equal(variants.h1.role, 'title');
    const sizes = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((h) => px(variants[h].fontSize));
    assert.deepEqual(sizes, [...sizes].sort((a, b) => b - a));
  });

  test('the families and the base size are the tokens', () => {
    assert.equal(mui.typography.fontFamily, family(tokens.font.sans));
    assert.equal(mui.typography.fontFamilyMono, family(tokens.font.mono));
    assert.equal(mui.typography.fontSize, px(tokens.type.ui.fontSize));
  });
});

describe('the measures', () => {
  test('each length is its token in pixels, at 16 pixels a rem', () => {
    for (const name of Object.keys(tokens.space)) assert.equal(mui.space[name], px(tokens.space[name]), `space ${name}`);
    for (const name of Object.keys(tokens.radius)) assert.equal(mui.radius[name], px(tokens.radius[name]), `radius ${name}`);
    for (const name of Object.keys(tokens.size)) assert.equal(mui.size[name], px(tokens.size[name]), `size ${name}`);
    for (const name of Object.keys(tokens.breakpoint)) assert.equal(mui.breakpoints[name], px(tokens.breakpoint[name]), `breakpoint ${name}`);
    assert.equal(mui.shape.borderRadius, px(tokens.radius.control));
    assert.deepEqual(mui.focus, { width: px(tokens.size['focus-width']), offset: px(tokens.size['focus-gap']) });
    assert.equal(mui.spacing, 8);
  });

  test('each duration is its token in milliseconds, and each easing is the token', () => {
    for (const [name, value] of Object.entries(tokens.duration)) assert.equal(mui.transitions.duration[name], Number.parseFloat(value), name);
    assert.deepEqual(mui.transitions.easing, tokens.easing);
  });

  test('every number in the file is finite: a length that is not one would be written as null', () => {
    const bad = [];
    const walk = (value, at) => {
      if (value === null || (typeof value === 'number' && !Number.isFinite(value))) bad.push(at);
      else if (typeof value === 'object') for (const [key, inner] of Object.entries(value)) walk(inner, `${at}.${key}`);
    };
    walk(mui, 'mui');
    assert.deepEqual(bad, []);
  });
});

describe('the palette', () => {
  for (const scheme of SCHEMES) {
    test(`${scheme}: Material UI's colors are the color roles of NCode's own brand`, () => {
      const palette = mui.palette[scheme];
      const c = tokens.color[scheme];
      assert.equal(palette.mode, scheme);
      assert.deepEqual(palette.instrument, c);
      assert.deepEqual(palette.primary, { main: c.primary, dark: c['primary-hover'], contrastText: c['on-primary'] });
      // The secondary color is what a tenant's secondary color drives: the screen, with its ink.
      assert.deepEqual(palette.secondary, { main: c.screen, contrastText: c['on-screen'] });
      assert.deepEqual(palette.error, { main: c.danger, dark: c['danger-hover'], contrastText: c['on-danger'] });
      for (const status of ['warning', 'info', 'success']) assert.deepEqual(palette[status], { main: c[status], contrastText: c[`on-${status}`] });
      assert.deepEqual(palette.background, { default: c.page, paper: c.surface });
      assert.deepEqual(palette.text, { primary: c.text, secondary: c['text-secondary'], disabled: c['text-disabled'] });
      assert.equal(palette.divider, c.border);
    });
  }
});
