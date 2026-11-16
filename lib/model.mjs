// Reads src/tokens.source.json into a model the writers walk: the ramps as hex, the semantic colors with their rules,
// every rule as CSS and as a resolved color, the brace's geometry, and a flat list of every token with its tier and
// its custom property. Pure functions: build.mjs reads the file and passes the parsed source in.
import { hexToRgb, mixOklab, oklchToHexMapped, relativeLch, relativeOklch } from './color.mjs';

/** Every custom property starts with this prefix (docs/decisions/1002). */
export const PREFIX = '--nc-';

export const isMeta = (key) => key.startsWith('$');
export const valueOf = (entry) =>
  entry !== null && typeof entry === 'object' && !Array.isArray(entry) && 'value' in entry ? entry.value : entry;
export const noteOf = (entry) =>
  entry !== null && typeof entry === 'object' && !Array.isArray(entry) ? entry.note : undefined;
export const entries = (group) => Object.entries(group).filter(([key]) => !isMeta(key));

/** The whole token set in a form that is easy to walk. */
export function buildModel(source) {
  const ramps = {};
  for (const [name, steps] of entries(source.base.color)) {
    ramps[name] = { note: steps.$note, use: steps.$use, steps: {} };
    for (const [step, entry] of entries(steps)) {
      const value = valueOf(entry);
      ramps[name].steps[step] = {
        hex: typeof value === 'string' ? value.toUpperCase() : oklchToHexMapped(value),
        oklch: typeof value === 'string' ? null : value,
        anchor: noteOf(entry),
      };
    }
  }
  const colors = []; // semantic colors in source order
  for (const [groupName, group] of entries(source.semantic.color)) {
    for (const [name, entry] of entries(group)) {
      colors.push({ name, group: groupName, groupNote: group.$note, brand: group.$brand === true, rule: valueOf(entry), note: noteOf(entry) });
    }
  }
  const inputs = entries(source.brand).map(([name, entry]) => ({ name, rule: valueOf(entry), note: noteOf(entry) }));
  return { source, ramps, colors, inputs, colorByName: new Map(colors.map((c) => [c.name, c])) };
}

// ---------------------------------------------------------------------------------------------------------
// Rules: to CSS, and to a resolved color.

export const isThemed = (rule) => rule !== null && typeof rule === 'object' && 'light' in rule && 'dark' in rule;
export const refName = (rule) => (typeof rule === 'string' ? /^\{([^}]+)\}$/.exec(rule)?.[1] : undefined);

/** The custom property a reference names: an input, a semantic color, a size such as travel, or a ramp step. */
export function refToProperty(name) {
  if (name.startsWith('color.')) return `${PREFIX}color-${name.slice(6)}`;
  if (!name.includes('.')) return `${PREFIX}${name}`; // brand, brand-secondary, travel
  return `${PREFIX}${name.replace('.', '-')}`; // a ramp step: stone.200
}

/** A rule as CSS, for a browser that has light-dark(), relative colors and color-mix(). */
export function ruleToCss(model, rule) {
  if (isThemed(rule)) return `light-dark(${ruleToCss(model, rule.light)}, ${ruleToCss(model, rule.dark)})`;
  const ref = refName(rule);
  if (ref) return `var(${refToProperty(ref)})`;
  if (typeof rule === 'string') return rule;
  if ('from' in rule) {
    return `${rule.space ?? 'oklch'}(from ${ruleToCss(model, rule.from)} ${expressionToCss(rule.l)} ${expressionToCss(rule.c)} ${expressionToCss(rule.h)})`;
  }
  if ('mix' in rule) return `color-mix(in oklab, ${ruleToCss(model, rule.mix[0])}, ${ruleToCss(model, rule.mix[1])} ${rule.share}%)`;
  if ('alpha' in rule) return alphaCss(rule.alpha[0], rule.alpha[1], (r) => staticHex(model, r));
  throw new Error(`unknown rule ${JSON.stringify(rule)}`);
}

/** The same expression as CSS: bare values stay bare, a math function stays as it is, anything else goes in calc(). */
export function expressionToCss(text) {
  const t = String(text).trim();
  if (/^[0-9.]+$/.test(t) || /^[lch]$/.test(t)) return t;
  if (/^(min|max|clamp)\(.*\)$/.test(t) && balancedOuter(t)) return t;
  return `calc(${t})`;
}

function balancedOuter(t) {
  let depth = 0;
  for (let i = t.indexOf('('); i < t.length; i++) {
    if (t[i] === '(') depth++;
    if (t[i] === ')' && --depth === 0) return i === t.length - 1;
  }
  return false;
}

/** An alpha color is written out as rgb(), so it needs no relative color syntax anywhere. */
function alphaCss(colorRule, alpha, resolveHex) {
  const [r, g, b] = hexToRgb(resolveHex(colorRule)).map((v) => Math.round(v * 255));
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

function staticHex(model, rule) {
  const ref = refName(rule);
  if (!ref) return rule;
  const [ramp, step] = ref.split('.');
  if (!model.ramps[ramp]?.steps[step]) throw new Error(`an alpha color must be a ramp step or a hex color, not ${rule}`);
  return model.ramps[ramp].steps[step].hex;
}

/** The default of each tenant input, resolved: NCode Blue, and the secondary following it. */
export function defaultInputs(model) {
  const resolveInput = (name, seen = new Set()) => {
    if (seen.has(name)) throw new Error(`the input ${name} refers to itself`);
    const rule = model.inputs.find((i) => i.name === name)?.rule;
    const ref = refName(rule);
    if (ref && model.inputs.some((i) => i.name === ref)) return resolveInput(ref, new Set([...seen, name]));
    if (ref) return model.ramps[ref.split('.')[0]].steps[ref.split('.')[1]].hex;
    return String(rule).toUpperCase();
  };
  return { brand: resolveInput('brand'), 'brand-secondary': resolveInput('brand-secondary') };
}

/**
 * Every semantic color as a browser computes it, for one theme and one pair of tenant inputs. Opaque colors come
 * back as "#RRGGBB", translucent ones as "rgb(r g b / a)".
 */
export function resolveColors(model, theme, { brand, secondary } = {}) {
  const defaults = defaultInputs(model);
  const input = { brand: brand ?? defaults.brand, 'brand-secondary': secondary ?? brand ?? defaults['brand-secondary'] };
  const cache = new Map();
  const resolve = (rule) => {
    if (isThemed(rule)) return resolve(rule[theme]);
    const ref = refName(rule);
    if (ref) {
      if (ref in input) return input[ref];
      if (ref.startsWith('color.')) return named(ref.slice(6));
      const [ramp, step] = ref.split('.');
      const found = model.ramps[ramp]?.steps[step];
      if (!found) throw new Error(`unknown reference {${ref}}`);
      return found.hex;
    }
    if (typeof rule === 'string') return rule.toUpperCase();
    if ('from' in rule) return (rule.space === 'lch' ? relativeLch : relativeOklch)(resolve(rule.from), rule.l, rule.c, rule.h);
    if ('mix' in rule) return mixOklab(resolve(rule.mix[0]), resolve(rule.mix[1]), rule.share);
    if ('alpha' in rule) return alphaCss(rule.alpha[0], rule.alpha[1], resolve);
    throw new Error(`unknown rule ${JSON.stringify(rule)}`);
  };
  const named = (name) => {
    if (!cache.has(name)) {
      const token = model.colorByName.get(name);
      if (!token) throw new Error(`unknown color ${name}`);
      cache.set(name, resolve(token.rule));
    }
    return cache.get(name);
  };
  const out = {};
  for (const token of model.colors) out[token.name] = named(token.name);
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// The brace's geometry, shared by the brace files and the tokens, which carry each brace's width.

/** The outline of a left brace as three pieces: w stroke, r hook radius, c cusp radius (on the centerline), e hook end. */
export function bracePieces({ w, r, c, e }) {
  const n = (value) => Number(value.toFixed(3));
  const ro = r + w / 2; // hook, outer radius
  const ri = r - w / 2; // hook, inner radius
  const co = c + w / 2; // cusp, the radius on the stem's side
  const ci = c - w / 2; // cusp, the radius on the tip's side
  const k = c - w / 4; // from the middle to the center of each cusp arc
  const xl = ci; // stem, left edge
  const xr = co; // stem, right edge
  const hx = xl + ro; // hook, center
  const end = hx + e;
  const xs = Math.sqrt(co * co - k * k); // where the two cusp arcs cross, on the stem's side
  return {
    width: end, ro: n(ro), k: n(k), xl: n(xl), w,
    top: `M${n(end)} ${n(w)}H${n(hx)}A${n(ri)} ${n(ri)} 0 0 0 ${n(xr)} ${n(ro)}H${n(xl)}A${n(ro)} ${n(ro)} 0 0 1 ${n(hx)} 0H${n(end)}Z`,
    cusp: `M${n(xr)} ${n(-k)}A${n(co)} ${n(co)} 0 0 1 ${n(xs)} 0A${n(co)} ${n(co)} 0 0 1 ${n(xr)} ${n(k)}H${n(xl)}A${n(ci)} ${n(ci)} 0 0 0 0 ${n(w / 4)}V${n(-w / 4)}A${n(ci)} ${n(ci)} 0 0 0 ${n(xl)} ${n(-k)}Z`,
    bottom: `M${n(end)} ${n(-w)}H${n(hx)}A${n(ri)} ${n(ri)} 0 0 1 ${n(xr)} ${n(-ro)}H${n(xl)}A${n(ro)} ${n(ro)} 0 0 0 ${n(hx)} 0H${n(end)}Z`,
  };
}

export function braceSizes(model) {
  return entries(model.source.base.brace)
    .filter(([name]) => name !== 'mark')
    .map(([name, spec]) => ({
      name,
      spec,
      note: spec.note,
      width: Math.ceil(bracePieces(spec).width),
      minHeight: Math.ceil(2 * (spec.r + spec.w / 2) + 2 * (spec.c - spec.w / 4)),
    }));
}

// ---------------------------------------------------------------------------------------------------------
// Type roles, resolved.

export const pick = (table, key) => (typeof key === 'string' ? valueOf(table[key]) : key);
export const trim = (n) => String(Number(n.toFixed(4)));

/** A type role's width and tracking, each as CSS: a reference to its step, or the role's own number. */
export function roleExtras(role) {
  const stretch = typeof role.width === 'string' ? `var(${PREFIX}width-${role.width})` : `${role.width}%`;
  const tracking = typeof role.tracking === 'string' ? `var(${PREFIX}tracking-${role.tracking})` : `${trim(role.tracking)}em`;
  return { stretch, tracking };
}

/** Every value of a type role, resolved: what a Material UI variant or an inline style needs. */
export function resolveRole(model, role) {
  const font = model.source.base.font;
  const size = pick(font.size, role.size);
  const tracking = pick(font.tracking, role.tracking);
  return {
    fontFamily: valueOf(font.family[role.family]),
    fontSize: `${trim(size)}rem`,
    fontWeight: pick(font.weight, role.weight),
    lineHeight: pick(font.leading, role.leading),
    fontStretch: `${pick(font.width, role.width)}%`,
    letterSpacing: tracking === 0 ? '0' : `${trim(tracking)}em`,
    ...(role.case ? { textTransform: role.case } : {}),
  };
}

// ---------------------------------------------------------------------------------------------------------
// The flat list of tokens: one entry per custom property, for the token reference, tokens.mjs and the tests.

/** The tier a group declares, or the one the nearest enclosing group declares. */
function tierOf(...groups) {
  for (const group of groups.reverse()) if (group?.$tier) return group.$tier;
  throw new Error('a token group has no $tier');
}

/**
 * Every token with: `property` (its custom property), `path` (its name in tokens.json), `tier`, `kind`, `note`,
 * and `light` and `dark`, its resolved CSS value in each theme (the same unless it is a color or a shadow).
 */
export function listTokens(model) {
  const { base, semantic } = model.source;
  const list = [];
  const add = (token) => list.push({ dark: token.light, ...token });
  const css = (group) => group.$css;
  for (const [name, ramp] of Object.entries(model.ramps)) {
    for (const [step, { hex, anchor }] of Object.entries(ramp.steps)) {
      add({ property: `${PREFIX}${name}-${step}`, path: `color.${name}.${step}`, tier: tierOf(base.color), kind: 'color', light: hex, note: anchor });
    }
  }
  const font = base.font;
  for (const [name, entry] of entries(font.family)) {
    add({ property: `${PREFIX}font-${name}`, path: `font.family.${name}`, tier: tierOf(font.family), kind: 'font', light: valueOf(entry).map((f) => (/^[a-z-]+$/.test(f) ? f : `"${f}"`)).join(', '), note: noteOf(entry) });
  }
  const scale = (group, path, unit, kind, parent = base) => {
    const format = (v) => (v === 0 && unit ? '0' : `${trim(v)}${unit}`);
    for (const [name, entry] of entries(group)) {
      add({ property: `${PREFIX}${css(group)}-${name}`, path: `${path}.${name}`, tier: tierOf(parent, group), kind, light: format(valueOf(entry)), note: noteOf(entry) });
    }
  };
  scale(font.width, 'font.width', '%', 'width');
  scale(font.weight, 'font.weight', '', 'weight');
  scale(font.size, 'font.size', 'rem', 'font-size');
  scale(font.leading, 'font.leading', '', 'leading');
  scale(font.tracking, 'font.tracking', 'em', 'tracking');
  scale(base.space, 'space', 'rem', 'space');
  scale(base.radius, 'radius', 'px', 'radius');
  scale(base.border, 'border', 'px', 'border');
  for (const [name, entry] of entries(base.size)) {
    add({ property: `${PREFIX}${name}`, path: `size.${name}`, tier: tierOf(base.size), kind: 'size', light: `${trim(entry.value)}${entry.unit}`, note: entry.note });
  }
  scale(base.breakpoint, 'breakpoint', 'rem', 'breakpoint');
  scale(base.motion.duration, 'duration', 'ms', 'duration', base.motion);
  for (const [name, entry] of entries(base.motion.easing)) {
    add({ property: `${PREFIX}ease-${name}`, path: `easing.${name}`, tier: tierOf(base.motion, base.motion.easing), kind: 'easing', light: entry.type === 'cubicBezier' ? `cubic-bezier(${entry.value.join(', ')})` : entry.value, note: entry.note });
  }
  for (const size of braceSizes(model)) {
    add({ property: `${PREFIX}brace-${size.name}`, path: `brace.${size.name}`, tier: tierOf(base.brace), kind: 'brace', light: `${size.width}px`, note: size.note });
  }
  for (const [name, role] of entries(semantic.type)) {
    const resolved = resolveRole(model, role);
    const shorthand = `${resolved.fontWeight} ${resolved.fontSize}/${resolved.lineHeight} ${font.family[role.family].value[0]}`;
    add({ property: `${PREFIX}type-${name}`, path: `typography.${name}`, tier: tierOf(semantic.type), kind: 'type', light: shorthand, note: role.note });
    add({ property: `${PREFIX}type-${name}-stretch`, path: `typography.${name}`, tier: tierOf(semantic.type), kind: 'type-stretch', light: resolved.fontStretch, note: `the width of ${name}` });
    add({ property: `${PREFIX}type-${name}-tracking`, path: `typography.${name}`, tier: tierOf(semantic.type), kind: 'type-tracking', light: resolved.letterSpacing, note: `the letter spacing of ${name}` });
  }
  const defaults = defaultInputs(model);
  for (const input of model.inputs) {
    add({ property: `${PREFIX}${input.name}`, path: `$extensions.tenantInputs.${input.name}`, tier: tierOf(model.source.brand), kind: 'input', light: defaults[input.name], note: input.note });
  }
  const light = resolveColors(model, 'light');
  const dark = resolveColors(model, 'dark');
  for (const token of model.colors) {
    add({ property: `${PREFIX}color-${token.name}`, path: `color.${token.name}`, tier: tierOf(semantic.color), kind: 'color-role', group: token.group, brand: token.brand, light: light[token.name], dark: dark[token.name], note: token.note });
  }
  for (const [name, layers] of entries(semantic.elevation)) {
    add({ property: `${PREFIX}elevation-${name}`, path: `shadow.${name}`, tier: tierOf(semantic.elevation), kind: 'shadow', light: shadowValue(model, layers, light), dark: shadowValue(model, layers, dark) });
  }
  return list;
}

/** A shadow with its colors resolved for one theme, as a CSS value. */
export function shadowValue(model, layers, colors) {
  const px = (v) => (typeof v === 'string' ? `${model.source.base.size[refName(v)].value}px` : v === 0 ? '0' : `${v}px`);
  return layers
    .map((layer) => `${layer.inset ? 'inset ' : ''}${px(layer.x)} ${px(layer.y)} ${px(layer.blur)}${layer.spread ? ` ${px(layer.spread)}` : ''} ${colors[refName(layer.color).slice(6)]}`)
    .join(', ');
}
