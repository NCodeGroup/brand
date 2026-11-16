// The icon sources: a path scales onto the 16-unit grid and keeps its arc flags and rotations, a Lucide file is
// restyled only when it is drawn the way lib/icons.mjs reads, and NCode's symbols parse into elements.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseNcode, restyleLucide, scalePath } from '../lib/icons.mjs';

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
