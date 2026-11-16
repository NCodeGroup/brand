// Reads the sources of the icon set: NCode's own drawings, already on the 16-unit grid, and the Lucide icons, which are
// drawn on a 24-unit grid and scaled by 16/24 onto it. The module takes text and returns values; build.mjs reads the
// files.
const ARITY = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/;
const SHAPES = ['path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon'];
const NCODE_ATTRIBUTES = ['d', 'points', 'fill', 'stroke', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height',
  'x1', 'y1', 'x2', 'y2'];
const LENGTHS = ['cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2'];
const SCALE = 16 / 24;

const n = (value) => String(Number(value.toFixed(3)));

/** A path with every coordinate multiplied by factor and rounded to 3 decimals; arc rotations and flags are kept. */
export function scalePath(d, factor) {
  const fail = (why) => new Error(`the path "${d}" ${why}`);
  const out = [];
  let at = 0;
  const skip = () => {
    while (at < d.length && /[\s,]/.test(d[at])) at++;
  };
  const number = () => {
    skip();
    const m = NUMBER.exec(d.slice(at));
    if (!m) throw fail(`has no number at position ${at}, where its command needs one`);
    at += m[0].length;
    return m[0];
  };
  const flag = () => {
    skip();
    const c = d[at];
    if (c !== '0' && c !== '1') throw fail(`has an arc flag that is not 0 or 1 at position ${at}`);
    at++;
    return c;
  };
  skip();
  while (at < d.length) {
    const command = d[at++];
    const arity = ARITY[command.toUpperCase()];
    if (arity === undefined) throw fail(`has the command ${command}, which lib/icons.mjs does not read`);
    const values = [];
    if (arity > 0) {
      let groups = 0;
      for (;;) {
        skip();
        if (at >= d.length || /[A-Za-z]/.test(d[at])) break;
        for (let i = 0; i < arity; i++) {
          if (command.toUpperCase() === 'A' && (i === 3 || i === 4)) values.push(flag());
          else if (command.toUpperCase() === 'A' && i === 2) values.push(number());
          else values.push(n(Number(number()) * factor));
        }
        groups++;
      }
      if (groups === 0) throw fail(`has the command ${command} without numbers`);
    }
    out.push(command + values.join(' '));
    skip();
  }
  return out.join('');
}

/** The shapes of the text, each as { tag, attrs: [[name, value], …] } in source order. */
function shapes(text, label, allowed) {
  const elements = [];
  for (const m of text.matchAll(/<(\w+)\b([^>]*?)\s*\/>/g)) {
    const tag = m[1];
    if (!SHAPES.includes(tag)) throw new Error(`${label} holds <${tag}>, which lib/icons.mjs does not draw`);
    const attrs = [...m[2].matchAll(/\s([a-z-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]);
    for (const [k] of attrs) {
      if (!allowed.includes(k)) throw new Error(`${label} has the attribute ${k}, which lib/icons.mjs does not scale`);
    }
    elements.push({ tag, attrs });
  }
  return elements;
}

/** The text with its shapes removed, to tell what else the file holds. */
function leftover(text) {
  return text.replace(/<(\w+)\b([^>]*?)\s*\/>/g, '').trim();
}

/** NCode's drawings from src/icons/ncode.svg, as a Map from name to elements. */
export function parseNcode(text) {
  const label = 'src/icons/ncode.svg';
  const icons = new Map();
  const symbol = /<symbol id="i-([a-z0-9]+(?:-[a-z0-9]+)*)" viewBox="0 0 16 16">([\s\S]*?)<\/symbol>/g;
  let rest = text;
  for (const m of text.matchAll(symbol)) {
    if (icons.has(m[1])) throw new Error(`${label} draws ${m[1]} twice`);
    const inner = m[2];
    icons.set(m[1], shapes(inner, `${label} symbol ${m[1]}`, NCODE_ATTRIBUTES));
    const extra = leftover(inner);
    if (extra) throw new Error(`${label} symbol ${m[1]} holds ${extra}, which lib/icons.mjs does not read`);
  }
  rest = rest.replace(symbol, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<svg\b[^>]*>/g, '').replace(/<\/svg>/g, '');
  if (rest.trim()) throw new Error(`${label} holds ${rest.trim()}, which lib/icons.mjs does not read`);
  return icons;
}

/** A Lucide icon's elements, scaled by 16/24 onto the 16-unit grid. */
export function restyleLucide(text, name) {
  const label = `src/icons/lucide/${name}.svg`;
  const root = /<svg\b[^>]*>/.exec(text);
  if (!root || !/\sviewBox="0 0 24 24"/.test(root[0])) {
    throw new Error(`${label} is not drawn on Lucide's 24-unit grid`);
  }
  const body = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<svg\b[^>]*>/g, '').replace(/<\/svg>/g, '');
  const extra = leftover(body);
  if (extra) {
    const tag = /<(\w+)/.exec(extra);
    throw new Error(tag
      ? `${label} holds <${tag[1]}>, which lib/icons.mjs does not draw`
      : `${label} holds ${extra}, which lib/icons.mjs does not read`);
  }
  const allowed = ['d', 'points', ...LENGTHS];
  return shapes(body, label, allowed).map(({ tag, attrs }) => ({
    tag,
    attrs: attrs.map(([k, v]) => {
      if (k === 'd') return [k, scalePath(v, SCALE)];
      if (k === 'points') {
        const numbers = v.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
        return [k, numbers.map((x) => n(Number(x) * SCALE)).join(' ')];
      }
      return [k, n(Number(v) * SCALE)];
    }),
  }));
}
