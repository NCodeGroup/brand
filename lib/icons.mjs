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

/** Every icon of both sources, sorted by name, each as { name, source, linecap, elements }. */
export function iconSet({ ncode, lucide }) {
  const byName = new Map();
  for (const [name, elements] of parseNcode(ncode)) {
    byName.set(name, { name, source: 'ncode', linecap: 'butt', elements });
  }
  for (const [name, text] of Object.entries(lucide)) {
    if (byName.has(name)) {
      throw new Error(
        `the icon "${name}" is drawn in src/icons/ncode.svg and pinned in src/icons/lucide.lock.json: keep one`,
      );
    }
    byName.set(name, { name, source: 'lucide', linecap: 'square', elements: restyleLucide(text, name) });
  }
  if (byName.has('sprite')) throw new Error('an icon cannot be named "sprite": icons/sprite.svg is the sprite');
  return [...byName.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** One shape as markup; a stroked shape keeps a line of 1.5 pixels at every size. */
function shape({ tag, attrs }) {
  const stroked = attrs.some(([k, v]) => k === 'stroke' && v === 'none') ? '' : ' vector-effect="non-scaling-stroke"';
  return `<${tag}${attrs.map(([k, v]) => ` ${k}="${v}"`).join('')}${stroked}/>`;
}

/** An icon as a symbol of the sprite: geometry alone, plus the square caps of a Lucide icon. */
export function symbol(icon) {
  const caps = icon.source === 'lucide' ? ' stroke-linecap="square"' : '';
  return `<symbol id="i-${icon.name}" viewBox="0 0 16 16"${caps}>${icon.elements.map(shape).join('')}</symbol>`;
}

/** Every file of icons/, by its name. */
export function iconFiles(set, { version, lucide }) {
  const files = {};
  for (const icon of set) {
    const note = icon.source === 'lucide'
      ? `<!-- Lucide ${lucide.version} "${icon.name}", restyled by NCode Brand. ${lucide.license}: ` +
        'LICENSE-Lucide.txt beside this file holds the notices. -->\n'
      : '';
    files[`${icon.name}.svg`] = `${note}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" ` +
      'height="16" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      `stroke-linecap="${icon.linecap}" stroke-linejoin="miter">${icon.elements.map(shape).join('')}</svg>\n`;
  }
  files['sprite.svg'] = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    `<!-- The icons of NCode Brand ${version}. Use one as <svg class="icon"><use href="sprite.svg#i-NAME"/></svg>, ` +
      'with css/base.css. A symbol with stroke-linecap="square" is an icon of ' +
      `Lucide ${lucide.version}, restyled. ${lucide.license}: LICENSE-Lucide.txt beside this file holds the ` +
      'notices. -->',
    ...set.map((icon) => `  ${symbol(icon)}`),
    '</svg>',
    '',
  ].join('\n');
  files['icons.json'] = `${JSON.stringify({
    $description:
      `The icons of NCode Brand ${version}, as data. Each is drawn on a 16-unit grid with a stroke of 1.5 that does ` +
      'not scale, no fill, miter joins and the line cap it names. "elements" lists its shapes in order, each a tag ' +
      'and its attributes, for a component that draws the icon inline. "source" is "ncode" for NCode\'s own ' +
      `drawings, under the Apache License 2.0, or "lucide" for an icon of Lucide ${lucide.version}, restyled, ` +
      'under the licenses in LICENSE-Lucide.txt. Generated by build.mjs from src/icons/.',
    grid: 16,
    stroke: 1.5,
    linejoin: 'miter',
    lucide: { version: lucide.version, license: lucide.license, file: 'LICENSE-Lucide.txt' },
    icons: Object.fromEntries(set.map((icon) => [icon.name, {
      source: icon.source,
      linecap: icon.linecap,
      elements: icon.elements.map(({ tag, attrs }) => ({ tag, ...Object.fromEntries(attrs) })),
    }])),
  }, null, 2)}\n`;
  files['LICENSE-Lucide.txt'] = lucide.text;
  return files;
}

/** The symbols of the icons a page uses, sorted by name, one per line, for the page's generated block. */
export function iconBlock(set, page, path) {
  const names = [...new Set([...page.matchAll(/<use href="#i-([a-z0-9-]+)"/g)].map((m) => m[1]))].sort();
  return names.map((name) => {
    const icon = set.find((i) => i.name === name);
    if (!icon) throw new Error(`${path} uses the icon "${name}", which src/icons does not draw`);
    return `  ${symbol(icon)}`;
  }).join('\n');
}

/** The guide's table of the icons, by source, in the set's order. */
export function iconList(set, lucide) {
  const names = (source) => set.filter((icon) => icon.source === source).map((icon) => `\`${icon.name}\``).join(', ');
  return [
    '| Drawn by | Line ends | Icons |',
    '|---|---|---|',
    `| NCode, in \`src/icons/ncode.svg\` | Butt caps | ${names('ncode')} |`,
    `| Lucide ${lucide.version}, restyled | Square caps | ${names('lucide')} |`,
  ].join('\n');
}
