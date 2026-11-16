// Color math shared by the token build, the tenant derivation and the contrast gate.
// sRGB <-> OKLab/OKLCH as CSS Color 4 defines them, WCAG 2.x contrast, and the CSS functions the tokens use
// (relative oklch() and lch(), and color-mix() in OKLab), evaluated the way a browser evaluates them.
// It imports nothing: build.mjs copies it into tokens/derive.mjs, so the released derivation runs this math.

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** "#0033CC" or "#03C" -> [r, g, b] in 0..1. */
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? [...h].map((x) => x + x).join('') : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
}

/** [r, g, b] in 0..1 -> "#0033CC". Values outside the range are clipped, as a browser clips them. */
export function rgbToHex(rgb) {
  return '#' + rgb.map((c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function rgbToOklab([r, g, b]) {
  r = toLinear(r); g = toLinear(g); b = toLinear(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear([L, a, b]) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLab -> sRGB in 0..1, not clipped. */
export function oklabToRgb(lab) {
  return oklabToLinear(lab).map((v) => (v < 0 ? -toGamma(-v) : toGamma(v)));
}

export function oklabToOklch([L, a, b]) {
  return [L, Math.sqrt(a * a + b * b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

export function oklchToOklab([L, C, h]) {
  return [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];
}

export const hexToOklch = (hex) => oklabToOklch(rgbToOklab(hexToRgb(hex)));

/** OKLCH -> hex, clipping each channel: what a browser paints for an oklch() color outside sRGB. */
export const oklchToHexClipped = (lch) => rgbToHex(oklabToRgb(oklchToOklab(lch)));

/**
 * OKLCH -> hex for a ramp step: chroma is reduced until the color fits sRGB, so the hue and the lightness
 * the ramp asks for are kept.
 */
export function oklchToHexMapped([L, C, h]) {
  const inGamut = (c) => oklabToLinear(oklchToOklab([L, c, h])).every((v) => v >= -0.0001 && v <= 1.0001);
  let chroma = C;
  if (!inGamut(C)) {
    let lo = 0, hi = C;
    for (let i = 0; i < 30; i++) {
      chroma = (lo + hi) / 2;
      if (inGamut(chroma)) lo = chroma; else hi = chroma;
    }
    chroma = lo;
  }
  return rgbToHex(oklabToLinear(oklchToOklab([L, chroma, h])).map((v) => toGamma(clamp01(v))));
}

/** WCAG 2.x relative luminance of an opaque hex color. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio of two opaque hex colors. */
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** color-mix(in oklab, a, b share%), for opaque colors. */
export function mixOklab(hexA, hexB, shareB) {
  const a = rgbToOklab(hexToRgb(hexA)), b = rgbToOklab(hexToRgb(hexB));
  const t = shareB / 100;
  return rgbToHex(oklabToRgb(a.map((v, i) => v * (1 - t) + b[i] * t)));
}

// ---------------------------------------------------------------------------------------------------------
// A channel expression: the small part of CSS math the derivation rules use. Numbers, the channel names
// l, c and h, + - * /, parentheses, and min(), max() and clamp().

function tokenize(text) {
  const tokens = [];
  const pattern = /\s*([0-9]*\.?[0-9]+|[a-z]+|[-+*/(),])/gy;
  let match, end = 0;
  while ((match = pattern.exec(text)) !== null) { tokens.push(match[1]); end = pattern.lastIndex; }
  if (text.slice(end).trim() !== '') throw new Error(`cannot read the expression "${text}"`);
  return tokens;
}

/** Parses an expression once and returns a function of the channel values. */
export function compileExpression(text) {
  const tokens = tokenize(String(text));
  let at = 0;
  const peek = () => tokens[at];
  const take = (expected) => {
    const token = tokens[at++];
    if (expected && token !== expected) throw new Error(`expected "${expected}" in "${text}"`);
    return token;
  };
  const sum = () => {
    let left = product();
    while (peek() === '+' || peek() === '-') {
      const op = take(), l = left, r = product();
      left = op === '+' ? (v) => l(v) + r(v) : (v) => l(v) - r(v);
    }
    return left;
  };
  const product = () => {
    let left = unary();
    while (peek() === '*' || peek() === '/') {
      const op = take(), l = left, r = unary();
      left = op === '*' ? (v) => l(v) * r(v) : (v) => l(v) / r(v);
    }
    return left;
  };
  const unary = () => {
    if (peek() === '-') { take(); const inner = unary(); return (v) => -inner(v); }
    return atom();
  };
  const atom = () => {
    const token = take();
    if (token === undefined) throw new Error(`unexpected end of "${text}"`);
    if (token === '(') { const inner = sum(); take(')'); return inner; }
    if (/^[0-9.]/.test(token)) { const n = Number(token); return () => n; }
    if (token === 'min' || token === 'max' || token === 'clamp' || token === 'calc') {
      take('(');
      const args = [sum()];
      while (peek() === ',') { take(); args.push(sum()); }
      take(')');
      if (token === 'calc') return args[0];
      if (token === 'min') return (v) => Math.min(...args.map((a) => a(v)));
      if (token === 'max') return (v) => Math.max(...args.map((a) => a(v)));
      return (v) => Math.max(args[0](v), Math.min(args[1](v), args[2](v))); // clamp(min, value, max)
    }
    if (token === 'l' || token === 'c' || token === 'h') return (v) => v[token];
    throw new Error(`unknown name "${token}" in "${text}"`);
  };
  const result = sum();
  if (at !== tokens.length) throw new Error(`cannot read the end of "${text}"`);
  return result;
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

// ---------------------------------------------------------------------------------------------------------
// CIE LCH with a D50 white, as CSS lch() defines it. Its lightness is a function of luminance alone, which is
// what WCAG contrast is measured in, so it is the right scale for choosing a white or a black label.

const mul = (m, v) => m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
const SRGB_TO_XYZ = [[0.41239079926595934, 0.357584339383878, 0.1804807884018343], [0.21263900587151027, 0.715168678767756, 0.07219231536073371], [0.01933081871559182, 0.11919477979462598, 0.9505321522496607]];
const XYZ_TO_SRGB = [[3.2409699419045226, -1.537383177570094, -0.4986107602930034], [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559], [0.05563007969699366, -0.20397695888897652, 1.0569715142428786]];
const D65_TO_D50 = [[1.0479298208405488, 0.022946793341019088, -0.05019222954313557], [0.029627815688159344, 0.990434484573249, -0.01707382502938514], [-0.009243058152591178, 0.015055144896577895, 0.7518742899580008]];
const D50_TO_D65 = [[0.9554734527042182, -0.023098536874261423, 0.0632593086610217], [-0.028369706963208136, 1.0099954580058226, 0.021041398966943008], [0.012314001688319899, -0.020507696433477912, 1.3303659366080753]];
const D50 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];
const EPSILON = 216 / 24389, KAPPA = 24389 / 27;

export function hexToLch(hex) {
  const xyz = mul(D65_TO_D50, mul(SRGB_TO_XYZ, hexToRgb(hex).map(toLinear)));
  const [fx, fy, fz] = xyz.map((v, i) => v / D50[i]).map((t) => (t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116));
  const L = 116 * fy - 16, a = 500 * (fx - fy), b = 200 * (fy - fz);
  return [L, Math.sqrt(a * a + b * b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

export function lchToHexClipped([L, C, h]) {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const fy = (L + 16) / 116, fx = a / 500 + fy, fz = fy - b / 200;
  const xyz = [
    fx ** 3 > EPSILON ? fx ** 3 : (116 * fx - 16) / KAPPA,
    L > KAPPA * EPSILON ? fy ** 3 : L / KAPPA,
    fz ** 3 > EPSILON ? fz ** 3 : (116 * fz - 16) / KAPPA,
  ].map((v, i) => v * D50[i]);
  return rgbToHex(mul(XYZ_TO_SRGB, mul(D50_TO_D65, xyz)).map((v) => (v < 0 ? -toGamma(-v) : toGamma(v))));
}

/** lch(from <origin> <l> <c> <h>): l runs from 0 to 100. */
export function relativeLch(originHex, l, c, h) {
  const [ol, oc, oh] = hexToLch(originHex);
  const scope = { l: ol, c: oc, h: oh };
  const L = Math.min(100, Math.max(0, compileExpression(l)(scope)));
  const C = Math.max(0, compileExpression(c)(scope));
  const H = ((compileExpression(h)(scope) % 360) + 360) % 360;
  return lchToHexClipped([L, C, H]);
}

/** oklch(from <origin> <l> <c> <h>): each channel is an expression of the origin's l, c and h. */
export function relativeOklch(originHex, l, c, h) {
  const [ol, oc, oh] = hexToOklch(originHex);
  const scope = { l: ol, c: oc, h: oh };
  const L = clamp01(compileExpression(l)(scope));
  const C = Math.max(0, compileExpression(c)(scope));
  const H = ((compileExpression(h)(scope) % 360) + 360) % 360;
  return oklchToHexClipped([L, C, H]);
}

// ---------------------------------------------------------------------------------------------------------
// Input and adjustment: what the tenant derivation needs on top of the CSS functions.

/**
 * A tenant's color as "#RRGGBB", or null when the text is not a hexadecimal color. It takes "#RGB" and
 * "#RRGGBB", with or without the "#", in either case. A color name, rgb() or anything else is null, so the
 * caller falls back to a default instead of failing.
 */
export function parseHex(text) {
  if (typeof text !== 'string') return null;
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map((x) => x + x).join('') : match[1];
  return `#${digits.toUpperCase()}`;
}

/** The color at another OKLCH lightness, with its chroma reduced until it fits sRGB and its hue kept. */
export function withOklchLightness(hex, lightness) {
  const [, c, h] = hexToOklch(hex);
  return oklchToHexMapped([clamp01(lightness), c, h]);
}
