// Exact numbers for the logo kit, from the kit generator of NCodeGroup/project-template: rounding half to even,
// decimal formatting of the exact binary value, double-double arithmetic, and correctly rounded sin, cos, asin, acos
// and distance, so the same pixels are drawn on every platform and with every Node.js release.

/** Rounds to the nearest integer, and a tie to the even one. */
function roundHalfEven(x) {
  const f = Math.floor(x);
  const d = x - f; // exact for every double
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

/**
 * The number with `digits` decimals: the exact binary value rounded half to even. toFixed(100) is the
 * exact decimal expansion of every value below 1e21 (and rounds a tiny one to digits that round to 0 all
 * the same); toFixed(digits) itself takes the larger neighbor on a tie. From 1e21 on, toFixed writes an
 * exponent, so such a value is refused.
 */
function toFixedHalfEven(v, digits) {
  if (!(Math.abs(v) < 1e21)) throw new RangeError(`can't format ${v}: only finite values below 1e21 are`);
  const negative = v < 0 || Object.is(v, -0);
  const [whole, fraction] = Math.abs(v).toFixed(100).split('.');
  const rest = fraction.slice(digits);
  let kept = whole + fraction.slice(0, digits);
  const half = '5'.padEnd(rest.length, '0');
  if (rest > half || (rest === half && Number(kept.at(-1)) % 2 === 1)) {
    kept = (BigInt(kept) + 1n).toString().padStart(kept.length, '0');
  }
  const split = kept.length - digits;
  return (negative ? '-' : '') + (digits ? `${kept.slice(0, split)}.${kept.slice(split)}` : kept);
}

function num(v, digits) {
  const s = toFixedHalfEven(v, digits).replace(/0+$/, '').replace(/\.+$/, '');
  return s === '' || s === '-0' ? '0' : s;
}

const DEG_TO_RAD = Math.PI / 180.0;
const RAD_TO_DEG = 180.0 / Math.PI;

/** a times b as the rounded product and its exact error (Dekker), so p + e is a * b exactly. */
function twoProduct(a, b) {
  const p = a * b;
  const split = (x) => {
    const c = 134217729 * x; // 2^27 + 1
    const hi = c - (c - x);
    return [hi, x - hi];
  };
  const [ah, al] = split(a);
  const [bh, bl] = split(b);
  return [p, ((ah * bh - p) + ah * bl + al * bh) + al * bl];
}

/** a + b as the rounded sum and its exact error, for |a| >= |b|. */
function fastTwoSum(a, b) {
  const x = a + b;
  return [x, b - (x - a)];
}

/** a + b as the rounded sum and its exact error. */
function twoSum(a, b) {
  const s = a + b;
  const bb = s - a;
  return [s, (a - (s - bb)) + (b - bb)];
}

// Double-double numbers, [hi, lo] with hi the double nearest hi + lo: about 106 bits.
function ddAdd([ah, al], [bh, bl]) {
  let [s, e] = twoSum(ah, bh);
  const [t, f] = twoSum(al, bl);
  e += t;
  [s, e] = fastTwoSum(s, e);
  e += f;
  return fastTwoSum(s, e);
}

function ddMul([ah, al], [bh, bl]) {
  const [p, e] = twoProduct(ah, bh);
  return fastTwoSum(p, e + (ah * bl + al * bh));
}

function ddDivide([ah, al], d) {
  const q = ah / d;
  const [p, e] = twoProduct(q, d);
  return fastTwoSum(q, (ah - p - e + al) / d);
}

// pi/2 in four parts, each of the first three 33 bits long, so a small multiple of each is exact.
const PI_2 = [1.57079632673412561417e+00, 6.07710050630396597660e-11, 2.02226624871116645580e-21, 8.47842766036889956997e-32];

/**
 * sin x and cos x as double-doubles: x less a multiple of pi/2, then the Taylor series of both to 106
 * bits. Their high parts are sin x and cos x correctly rounded.
 *
 * Math.sin and Math.cos can be a bit off in the last place, and differently from one V8 release to the
 * next; a last bit of an arc's points can move a pixel whose coverage is exactly one half. Correctly
 * rounded functions draw the same pixels on every platform and with every Node.js release.
 *
 * The reduction is exact while x / (pi/2) is below 2^20, so |x| from 2^20 radians on, far beyond the
 * angles this file uses, is refused.
 */
function sinCos(x) {
  if (!(Math.abs(x) < 2 ** 20)) throw new RangeError(`sinCos(${x}): only |x| below 2^20 radians is reduced exactly`);
  const k = Math.round(x / (Math.PI / 2));
  let r = twoSum(x, -k * PI_2[0]);
  for (const part of PI_2.slice(1)) r = ddAdd(r, [-k * part, 0]);
  const r2 = ddMul(r, r);
  let term = r;
  let sin = r;
  for (let n = 1; n < 16; n++) {
    term = ddDivide(ddMul(term, r2), -(2 * n) * (2 * n + 1));
    sin = ddAdd(sin, term);
  }
  term = [1, 0];
  let cos = [1, 0];
  for (let n = 1; n < 16; n++) {
    term = ddDivide(ddMul(term, r2), -(2 * n - 1) * (2 * n));
    cos = ddAdd(cos, term);
  }
  const negative = ([hi, lo]) => [-hi, -lo];
  return [[sin, cos], [cos, negative(sin)], [negative(sin), negative(cos)], [negative(cos), sin]][((k % 4) + 4) % 4];
}

const sin = (x) => sinCos(x)[0][0];
const cos = (x) => sinCos(x)[1][0];

/** asin y correctly rounded: Math.asin's value with one Newton step taken in double-double. */
function asin(y) {
  const a = Math.asin(y);
  if (y === 0 || Math.abs(y) === 1) return a;
  const [s, c] = sinCos(a);
  return a - ddAdd(s, [-y, 0])[0] / c[0];
}

/** acos y correctly rounded, as asin. */
function acos(y) {
  const a = Math.acos(y);
  if (Math.abs(y) === 1) return a;
  const [s, c] = sinCos(a);
  return a + ddAdd(c, [-y, 0])[0] / s[0];
}

/**
 * The distance between two points, correctly rounded: scaled by a power of two, the squares summed in
 * extended precision, the square root corrected once. A distance whose larger side is subnormal, below
 * 2^-1022, has no power of two to scale it by, and is Math.hypot's.
 */
function dist(p, q) {
  const vec = [Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])];
  const max = Math.max(vec[0], vec[1]);
  if (!Number.isFinite(max) || max === 0) return max;
  if (max < 2 ** -1022) return Math.hypot(vec[0], vec[1]);
  let e = Math.floor(Math.log2(max)) + 1; // frexp's exponent: max * 2^-e in [0.5, 1)
  while (max * 2 ** -e >= 1) e++;
  while (max * 2 ** -e < 0.5) e--;
  const scale = 2 ** -e;
  let csum = 1.0;
  let frac1 = 0.0;
  let frac2 = 0.0;
  for (const v of vec) {
    const x = v * scale;
    const [hi, lo] = twoProduct(x, x);
    const [sum, err] = fastTwoSum(csum, hi);
    csum = sum;
    frac1 += lo;
    frac2 += err;
  }
  let h = Math.sqrt(csum - 1.0 + (frac1 + frac2));
  const [hi, lo] = twoProduct(-h, h);
  const [sum, err] = fastTwoSum(csum, hi);
  csum = sum;
  frac1 += lo;
  frac2 += err;
  const x = csum - 1.0 + (frac1 + frac2);
  h += x / (2.0 * h); // differential correction
  return h / scale;
}

export { roundHalfEven, toFixedHalfEven, num, DEG_TO_RAD, RAD_TO_DEG, sin, cos, asin, acos, dist };
