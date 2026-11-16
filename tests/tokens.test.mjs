// The token outputs: the --nc- prefix, every var() naming a declared property, the Design Tokens file's references and
// types, the line between the public and the private tier, and the typed modules matching their declarations.
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { describe, test } from 'node:test';
import { listTokens } from '../lib/model.mjs';
import * as tokens from '../tokens/tokens.mjs';
import { model, read, readJson } from './helpers.mjs';

const m = model();
const list = listTokens(m);
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const declared = (css) => new Set([...strip(css).matchAll(/(?<![\w-])(--[\w-]+)\s*:/g)].map((x) => x[1]));
const used = (css) => new Set([...strip(css).matchAll(/var\(\s*(--[\w-]+)/g)].map((x) => x[1]));

describe('custom properties', () => {
  const tokenCss = read('tokens/tokens.css');
  const tokenProps = declared(tokenCss);

  test('every custom property the tokens declare starts with --nc-', () => {
    assert.deepEqual([...tokenProps].filter((p) => !p.startsWith('--nc-')), []);
    assert.deepEqual([...declared(read('tokens/tokens.static.css'))].filter((p) => !p.startsWith('--nc-')), []);
  });

  test('tokens.css declares exactly the tokens of the model, and tokens.static.css the same ones', () => {
    assert.deepEqual([...tokenProps].sort(), [...new Set(list.map((t) => t.property))].sort());
    assert.deepEqual([...declared(read('tokens/tokens.static.css'))].sort(), [...tokenProps].sort());
  });

  const sheets = ['css/base.css', 'css/starlight.css', 'specimens/foundations.css'];
  for (const sheet of sheets) {
    test(`${sheet}: every var() names a token or a property the same stylesheet declares, and every own property is --nc-`, () => {
      const css = read(sheet);
      const own = declared(css);
      const unknown = [...used(css)].filter((p) => !tokenProps.has(p) && !own.has(p));
      assert.deepEqual(unknown, []);
      const foreign = [...own].filter((p) => !p.startsWith('--nc-') && !(sheet.endsWith('starlight.css') && p.startsWith('--sl-')));
      assert.deepEqual(foreign, []);
    });
  }

  test('css/starlight.css sets only Starlight custom properties, from tokens', () => {
    const css = read('css/starlight.css');
    assert.deepEqual([...declared(css)].filter((p) => !p.startsWith('--sl-')), []);
    assert.ok(declared(css).has('--sl-color-accent'));
  });

  test('a stylesheet in css/ is its source in src/css/ with the release header', () => {
    for (const name of readdirSync(new URL('../src/css/', import.meta.url))) {
      const released = read(`css/${name}`);
      assert.ok(released.startsWith(`/* NCode Brand ${readJson('package.json').version}: css/${name}`), name);
      assert.ok(released.endsWith(read(`src/css/${name}`)), name);
    }
  });
});

describe('the Design Tokens file', () => {
  const dtcg = readJson('tokens/tokens.json');
  const TYPES = new Set(['color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number', 'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography']);
  const found = [];
  const walk = (node, path, type) => {
    const own = node.$type ?? type;
    if ('$value' in node) {
      found.push({ path, type: own, value: node.$value });
      return;
    }
    for (const [key, child] of Object.entries(node)) if (!key.startsWith('$') && child && typeof child === 'object') walk(child, [...path, key], own);
  };
  walk(dtcg, [], undefined);
  const byPath = new Map(found.map((t) => [t.path.join('.'), t]));

  test('it names the 2025.10 format, and every token has a type the format defines', () => {
    assert.equal(dtcg.$schema, 'https://www.designtokens.org/schemas/2025.10/format.json');
    assert.ok(found.length > 300);
    assert.deepEqual(found.filter((t) => !TYPES.has(t.type)).map((t) => t.path.join('.')), []);
  });

  test('every reference resolves to a token', () => {
    const refs = [];
    const collect = (value) => {
      if (typeof value === 'string') for (const ref of value.matchAll(/\{([^}]+)\}/g)) refs.push(ref[1]);
      else if (value && typeof value === 'object') for (const inner of Object.values(value)) collect(inner);
    };
    for (const t of found) collect(t.value);
    assert.ok(refs.length > 100);
    assert.deepEqual(refs.filter((r) => !byPath.has(r)), []);
  });

  test('a color is sRGB with three components and a hex fallback', () => {
    for (const t of found.filter((x) => x.type === 'color' && typeof x.value === 'object')) {
      assert.equal(t.value.colorSpace, 'srgb', t.path.join('.'));
      assert.equal(t.value.components.length, 3);
      assert.match(t.value.hex, /^#[0-9a-f]{6}$/);
    }
  });

  test('each top-level group states its tier', () => {
    for (const [key, group] of Object.entries(dtcg)) {
      if (key.startsWith('$')) continue;
      const tier = group.$extensions?.['org.ncode.instrument']?.tier ?? Object.values(group).find((g) => g?.$extensions?.['org.ncode.instrument']?.tier)?.$extensions['org.ncode.instrument'].tier;
      assert.ok(['primitive', 'semantic'].includes(tier), `${key} has no tier`);
    }
  });
});

describe('the public and the private tier', () => {
  test('the primitives are exactly the color ramps and the steps of the type scale', () => {
    const kinds = new Set(list.filter((t) => t.tier === 'primitive').map((t) => t.kind));
    assert.deepEqual([...kinds].sort(), ['color', 'font-size', 'leading', 'tracking', 'weight', 'width']);
    assert.ok(list.every((t) => t.tier === 'primitive' || t.tier === 'semantic'));
  });

  test('every type role is complete in the public tier: a shorthand, a width and a tracking', () => {
    const props = new Set(list.filter((t) => t.tier === 'semantic').map((t) => t.property));
    for (const role of Object.keys(m.source.semantic.type).filter((k) => !k.startsWith('$'))) {
      for (const suffix of ['', '-stretch', '-tracking']) assert.ok(props.has(`--nc-type-${role}${suffix}`), `${role}${suffix}`);
    }
  });

  test('tokens.mjs exports the public tier only', () => {
    const exported = new Set(Object.values(tokens.property));
    assert.deepEqual([...exported].sort(), list.filter((t) => t.tier === 'semantic').map((t) => t.property).sort());
    assert.ok(!('blue-600' in tokens.color.light));
    assert.equal(tokens.color.light.text, list.find((t) => t.property === '--nc-color-text').light);
  });
});

describe('the typed modules', () => {
  const exportsOf = (text) => new Set([...text.matchAll(/^export (?:declare )?(?:const|function) (\w+)/gm)].map((x) => x[1]));
  for (const name of ['tokens', 'derive']) {
    test(`${name}.d.mts declares every export of ${name}.mjs, and nothing else`, async () => {
      const module = await import(`../tokens/${name}.mjs`);
      assert.deepEqual([...exportsOf(read(`tokens/${name}.d.mts`))].sort(), Object.keys(module).sort());
    });
  }

  test('tokens.d.mts types every key of every export', () => {
    const types = read('tokens/tokens.d.mts');
    for (const role of Object.keys(tokens.color.light)) assert.match(types, new RegExp(`readonly ${/^\w+$/.test(role) ? role : `"${role}"`}: string;`), role);
    for (const role of Object.keys(tokens.type)) assert.match(types, new RegExp(`readonly ${/^\w+$/.test(role) ? role : `"${role}"`}: \\{`), role);
  });

  test('the version in every generated module is the package version', () => {
    assert.equal(tokens.version, readJson('package.json').version);
    assert.equal(readJson('mui/instrument.json').version, tokens.version);
  });
});
