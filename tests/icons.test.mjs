// The icon sources: a path scales onto the 16-unit grid and keeps its arc flags and rotations, a Lucide file is
// restyled only when it is drawn the way lib/icons.mjs reads, and NCode's symbols parse into elements.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  iconBlock, iconFiles, iconList, iconSet, parseNcode, restyleLucide, scalePath, symbol,
} from '../lib/icons.mjs';

const lucide = (body, viewBox = '0 0 24 24') =>
  `<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  viewBox="${viewBox}"\n>\n${body}\n</svg>\n`;

describe('scalePath', () => {
  test('scales coordinates, keeps an arc rotation and reads packed flags', () => {
    assert.equal(
      scalePath('M9 9.5a3 2.5 0 016 0c0 2-2 2-3 3.5', 2 / 3),
      'M6 6.333a2 1.667 0 0 1 4 0c0 1.333 -1.333 1.333 -2 2.333',
    );
  });

  test('rounds a dot to 3 decimals', () => {
    assert.equal(scalePath('M12 17h.01', 2 / 3), 'M8 11.333h0.007');
  });

  test('reads a command with no numbers', () => {
    assert.equal(scalePath('M3 3l2-2z', 2 / 3), 'M2 2l1.333 -1.333z');
  });

  test('throws for an arc flag that is not 0 or 1', () => {
    assert.throws(() => scalePath('M0 0a1 1 0 2 1 2 2', 1), /arc flag/);
  });

  test('throws for an unknown command and for a count that is not a multiple of the arity', () => {
    assert.throws(() => scalePath('M0 0x1 1', 1), /the path "M0 0x1 1"/);
    assert.throws(() => scalePath('M0 0 1', 1), /the path "M0 0 1"/);
  });
});

describe('restyleLucide', () => {
  test('scales every length by 16/24', () => {
    const body = [
      '  <circle cx="12" cy="12" r="10" />',
      '  <rect width="5" height="5" x="3" y="3" rx="1" />',
      '  <polyline points="3.29 7 12 12 20.71 7" />',
    ].join('\n');
    const [circle, rect, polyline] = restyleLucide(lucide(body), 'test');
    assert.deepEqual(circle, { tag: 'circle', attrs: [['cx', '8'], ['cy', '8'], ['r', '6.667']] });
    assert.deepEqual(rect.attrs, [['width', '3.333'], ['height', '3.333'], ['x', '2'], ['y', '2'], ['rx', '0.667']]);
    assert.deepEqual(polyline.attrs, [['points', '2.193 4.667 8 8 13.807 4.667']]);
  });

  test('throws for a file that is not on the 24-unit grid, a group and a transform', () => {
    assert.throws(() => restyleLucide(lucide('<path d="M1 1h2" />', '0 0 16 16'), 'test'), /24-unit grid/);
    assert.throws(() => restyleLucide(lucide('<g><path d="M1 1h2" /></g>'), 'test'), /holds <g>/);
    const rotated = lucide('<path d="M1 1h2" transform="rotate(5)" />');
    assert.throws(() => restyleLucide(rotated, 'test'), /attribute transform/);
  });
});

describe('parseNcode', () => {
  const symbol = (id, d) => `  <symbol id="i-${id}" viewBox="0 0 16 16"><path d="${d}"/></symbol>`;
  const file = (...symbols) =>
    `<svg xmlns="http://www.w3.org/2000/svg">\n<!-- icons -->\n${symbols.join('\n')}\n</svg>\n`;

  test('reads each symbol by its name', () => {
    const icons = parseNcode(file(symbol('arrow-left', 'M1 1h2'), symbol('eye', 'M2 2h3')));
    assert.deepEqual([...icons.keys()], ['arrow-left', 'eye']);
    assert.deepEqual(icons.get('eye'), [{ tag: 'path', attrs: [['d', 'M2 2h3']] }]);
  });

  test('throws for a name drawn twice', () => {
    assert.throws(() => parseNcode(file(symbol('eye', 'M1 1h2'), symbol('eye', 'M2 2h3'))), /eye twice/);
  });
});

describe('the icon set', () => {
  const sym = (id, body) => `  <symbol id="i-${id}" viewBox="0 0 16 16">${body}</symbol>`;
  const ncode = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    '<!-- icons -->',
    sym('eye', '<path d="M1 1h2"/><circle cx="8" cy="8" r="1" stroke="none"/>'),
    sym('arrow-left', '<path d="M2 2h3"/>'),
    '</svg>',
    '',
  ].join('\n');
  const clock = lucide('  <circle cx="12" cy="12" r="10" />\n  <path d="M12 6v6l4 2" />');
  const license = {
    version: '1.72.0',
    license: 'ISC, and MIT for the icons Lucide derives from Feather',
    text: 'LICENSE\n',
  };
  const set = iconSet({ ncode, lucide: { clock } });
  const files = iconFiles(set, { version: '0.3.0', lucide: license });

  test('sorts by name and records each source and line cap', () => {
    assert.deepEqual(set.map((i) => [i.name, i.source, i.linecap]), [
      ['arrow-left', 'ncode', 'butt'],
      ['clock', 'lucide', 'square'],
      ['eye', 'ncode', 'butt'],
    ]);
  });

  test('throws for a name in both sources and for the name sprite', () => {
    assert.throws(() => iconSet({ ncode, lucide: { eye: clock } }), /the icon "eye" is drawn in src\/icons\/ncode/);
    assert.throws(() => iconSet({ ncode, lucide: { sprite: clock } }), /cannot be named "sprite"/);
  });

  test('gives a stroked shape a non-scaling stroke and a shape with stroke none none', () => {
    const eye = set.find((i) => i.name === 'eye');
    assert.equal(
      symbol(eye),
      '<symbol id="i-eye" viewBox="0 0 16 16"><path d="M1 1h2" vector-effect="non-scaling-stroke"/>' +
        '<circle cx="8" cy="8" r="1" stroke="none"/></symbol>',
    );
  });

  test('writes a file for each icon, the sprite, the data and the license', () => {
    assert.deepEqual(
      Object.keys(files).sort(),
      ['LICENSE-Lucide.txt', 'arrow-left.svg', 'clock.svg', 'eye.svg', 'icons.json', 'sprite.svg'],
    );
    assert.equal(files['LICENSE-Lucide.txt'], 'LICENSE\n');
  });

  test('marks a Lucide file with its comment and square caps', () => {
    assert.ok(files['clock.svg'].startsWith('<!-- Lucide 1.72.0 "'));
    assert.match(files['clock.svg'], /stroke-linecap="square"/);
    assert.match(files['arrow-left.svg'], /stroke-linecap="butt"/);
    assert.doesNotMatch(files['arrow-left.svg'], /Lucide/);
  });

  test('puts a symbol of each icon in the sprite', () => {
    assert.match(files['sprite.svg'], /<symbol id="i-clock" viewBox="0 0 16 16" stroke-linecap="square">/);
    assert.match(files['sprite.svg'], /<symbol id="i-eye" viewBox="0 0 16 16">/);
    assert.ok(files['sprite.svg'].endsWith('</svg>\n'));
  });

  test('writes icons.json as data', () => {
    const data = JSON.parse(files['icons.json']);
    assert.equal(data.grid, 16);
    assert.equal(data.lucide.file, 'LICENSE-Lucide.txt');
    assert.deepEqual(data.icons.eye.elements[0], { tag: 'path', d: 'M1 1h2' });
    assert.equal(data.icons.clock.source, 'lucide');
  });

  test('iconBlock lists each used icon once, sorted, and throws for an unknown one', () => {
    const page = '<use href="#i-eye"/><use href="#i-arrow-left"/><use href="#i-eye"/>';
    const lines = iconBlock(set, page, 'specimens/a.html').split('\n');
    assert.equal(lines.length, 2);
    assert.match(lines[0], /^ {2}<symbol id="i-arrow-left"/);
    assert.match(lines[1], /^ {2}<symbol id="i-eye"/);
    assert.throws(
      () => iconBlock(set, '<use href="#i-nope"/>', 'specimens/a.html'),
      /specimens\/a\.html uses the icon "nope"/,
    );
  });

  test('iconList holds a row for each source', () => {
    const list = iconList(set, license);
    assert.match(list, /\| NCode, in `src\/icons\/ncode\.svg` \| Butt caps \| `arrow-left`, `eye` \|/);
    assert.match(list, /\| Lucide 1\.72\.0, restyled \| Square caps \| `clock` \|/);
  });
});
