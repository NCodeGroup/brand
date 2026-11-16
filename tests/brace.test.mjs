// The brace, against sources that do not come from each other: the mark's brace is the {N} mark's own in every file
// that carries it, the construction every stretching size uses gives back the mark's arcs from the token source's
// numbers, and each size's SVG and brace.json agree and keep the shape a brace has.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { bracePieces } from '../lib/model.mjs';
import * as tokens from '../tokens/tokens.mjs';
import { read, readJson } from './helpers.mjs';

const brace = readJson('brace/brace.json');
const outlines = readJson('logo/ncode/outlines.json');
const source = readJson('src/tokens.source.json').base.brace;
const SIZES = ['sm', 'md', 'lg'];
const n = (v) => Number(v.toFixed(3));

/** The segments of an SVG path written with absolute M, H, V, L, A and Z commands, as the brace's are. */
function segments(d, dx = 0, dy = 0) {
  const tokens = d.match(/[MHVLAZ]|-?[\d.]+/g);
  const out = [];
  let at = 0;
  let x = 0;
  let y = 0;
  let start = [0, 0];
  const num = () => Number(tokens[at++]);
  while (at < tokens.length) {
    const command = tokens[at++];
    const from = [x, y];
    if (command === 'M') { x = num() + dx; y = num() + dy; start = [x, y]; continue; }
    if (command === 'H') x = num() + dx;
    else if (command === 'V') y = num() + dy;
    else if (command === 'L') { x = num() + dx; y = num() + dy; }
    else if (command === 'Z') [x, y] = start;
    else if (command === 'A') {
      const [rx, ry, rotation, large, sweep] = [num(), num(), num(), num(), num()];
      x = num() + dx;
      y = num() + dy;
      out.push({ arc: true, r: rx, ry, rotation, large, sweep, from, to: [x, y] });
      continue;
    }
    out.push({ arc: false, from, to: [x, y] });
  }
  return out;
}

/** The arcs of a path as one string each, the same whichever way the path runs: a reversed arc sweeps the other way. */
function arcs(d, dx = 0, dy = 0) {
  return segments(d, dx, dy)
    .filter((s) => s.arc)
    .map((s) => {
      const [a, b] = [s.from.map(n), s.to.map(n)];
      const forward = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
      const [p, q, sweep] = forward ? [a, b, s.sweep] : [b, a, 1 - s.sweep];
      return `r${n(s.r)} sweep ${sweep} from ${p.join(',')} to ${q.join(',')}`;
    })
    .sort();
}

describe('the mark\'s brace', () => {
  test('is the {N} mark\'s own left brace in every file that carries it', () => {
    const own = outlines.mark.d.split(/(?=M)/)[0];
    assert.match(own, /Z$/);
    assert.equal(brace.mark.d, own);
    assert.equal(outlines.brace.d, own);
    assert.equal(/<path d="([^"]+)"/.exec(read('brace/brace-mark.svg'))[1], own);
    assert.match(read('brace/brace-mark.svg'), /viewBox="4 8 12 48" width="12" height="48"/);
  });

  test('is what the construction of every size draws from the token source\'s numbers for the mark', () => {
    // On the mark's grid the brace's top is at (4, 8), its cusp at (4, 32) and its bottom at (4, 56).
    const p = bracePieces(source.mark);
    const built = [...arcs(p.top, 4, 8), ...arcs(p.cusp, 4, 32), ...arcs(p.bottom, 4, 56)].sort();
    assert.equal(built.length, 8);
    assert.deepEqual(built, arcs(brace.mark.d));
  });
});

describe('the stretching braces', () => {
  for (const size of SIZES) {
    test(`brace-${size}.svg and brace.json draw the same brace, with a tip half the stroke high`, () => {
      const data = brace[size];
      const spec = source[size];
      const svg = read(`brace/brace-${size}.svg`);
      const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
      assert.deepEqual(paths, [data.top, data.cusp, data.bottom]);
      const stems = [...svg.matchAll(/<rect x="([\d.]+)" y="(?:0|50%)" width="([\d.]+)" height="50%"/g)];
      assert.equal(stems.length, 2);
      for (const [, x, width] of stems) assert.deepEqual([Number(x), Number(width)], [data.stem.x, data.stem.width]);
      assert.deepEqual([data.stroke, data.hookRadius, data.cuspRadius, data.hookEnd], [spec.w, spec.r, spec.c, spec.e]);
      assert.equal(data.stem.width, spec.w);

      // The tip: the cusp's one vertical edge, at x 0, half the stroke high and centered on the middle.
      const tip = segments(data.cusp).filter((s) => !s.arc && s.from[0] === s.to[0] && s.from[0] === 0);
      assert.equal(tip.length, 1);
      assert.equal(n(Math.abs(tip[0].to[1] - tip[0].from[1])), spec.w / 2);
      assert.equal(n(tip[0].to[1] + tip[0].from[1]), 0);

      // The width is the hook's end, rounded up to a whole pixel, in the SVG, the data and the token.
      const end = Math.max(...segments(data.top).flatMap((s) => [s.from[0], s.to[0]]));
      assert.equal(data.width, Math.ceil(end));
      assert.match(svg, new RegExp(`^<svg xmlns="http://www\\.w3\\.org/2000/svg" width="${data.width}" height="100%">`));
      assert.equal(tokens.brace[size].width, `${data.width}px`);
      // The least height holds both hooks and the cusp.
      assert.equal(data.minHeight, Math.ceil(2 * data.stem.hookReach + 2 * data.stem.cuspReach));
      assert.equal(tokens.brace[size].minHeight, `${data.minHeight}px`);
    });
  }
});
