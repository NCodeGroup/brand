// The rasterizer: exact area coverage by signed-area accumulation, and an RGBA canvas that composites in sRGB.
import { roundHalfEven } from './numbers.mjs';

/** Sutherland-Hodgman clip of a polygon to the canvas. */
function clip(points, w, h) {
  const cut = (pts, inside, cross) => {
    const out = [];
    let prev = pts.length ? pts.at(-1) : null;
    for (const cur of pts) {
      if (inside(cur)) {
        if (!inside(prev)) out.push(cross(prev, cur));
        out.push(cur);
      } else if (inside(prev)) {
        out.push(cross(prev, cur));
      }
      prev = cur;
    }
    return out;
  };
  const atX = (x) => (a, b) => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
  const atY = (y) => (a, b) => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];
  points = cut(points, (q) => q[0] >= 0, atX(0.0));
  points = cut(points, (q) => q[0] <= w, atX(w));
  points = cut(points, (q) => q[1] >= 0, atY(0.0));
  return cut(points, (q) => q[1] <= h, atY(h));
}

/**
 * The fraction of each pixel the shape covers, 0 to 1 (non-zero winding), row by row.
 *
 * Every edge adds its signed area to the pixels it crosses and its full height to the pixel after
 * them; a running sum along each row then gives the coverage. An edge on a pixel boundary therefore
 * gives exactly 0 or 1, which is what keeps the pixel-fitted sizes sharp.
 *
 * Each row of the accumulator is two pixels wider than the image, and an index below 0 counts from the
 * row's end.
 */
function coverage(shape, w, h) {
  const W = w + 2;
  const acc = new Float64Array(h * W);
  const at = (i) => (i < 0 ? i + W : i);
  for (const raw of shape.polygons()) {
    const polygon = clip(raw, w, h);
    for (let i = 0; i < polygon.length; i++) {
      let [x0, y0] = polygon[i];
      let [x1, y1] = polygon[(i + 1) % polygon.length];
      if (y0 === y1) continue;
      let sign = 1.0;
      if (y0 > y1) [x0, y0, x1, y1, sign] = [x1, y1, x0, y0, -1.0];
      const slope = (x1 - x0) / (y1 - y0);
      let x = x0;
      const yEnd = Math.min(h, Math.ceil(y1));
      for (let y = Math.max(0, Math.floor(y0)); y < yEnd; y++) {
        const dy = Math.min(y + 1, y1) - Math.max(y, y0);
        if (dy <= 0) continue;
        const xNext = x + slope * dy;
        const d = dy * sign;
        const [xa, xb] = x < xNext ? [x, xNext] : [xNext, x];
        const ia = Math.floor(xa);
        const ib = Math.ceil(xb);
        const row = y * W;
        if (ib <= ia + 1) {
          // the edge stays inside one pixel column
          const mid = 0.5 * (x + xNext) - ia;
          acc[row + at(ia)] += d * (1 - mid);
          acc[row + at(ia + 1)] += d * mid;
        } else {
          // it crosses several: a trapezoid per column
          const s = 1.0 / (xb - xa);
          const fa = xa - ia;
          const first = 0.5 * s * ((1 - fa) * (1 - fa));
          const fb = xb - ib + 1.0;
          const last = 0.5 * s * fb * fb;
          acc[row + at(ia)] += d * first;
          if (ib === ia + 2) {
            acc[row + at(ia + 1)] += d * (1.0 - first - last);
          } else {
            const second = s * (1.5 - fa);
            acc[row + at(ia + 1)] += d * (second - first);
            const ds = d * s;
            const from = Math.max(0, at(ia + 2));
            const to = Math.min(W, at(ib - 1));
            for (let k = from; k < to; k++) acc[row + k] += ds;
            acc[row + at(ib - 1)] += d * (1.0 - second - (ib - ia - 3) * s - last);
          }
          acc[row + at(ib)] += d * last;
        }
        x = xNext;
      }
    }
  }
  const cover = new Float64Array(h * w);
  for (let y = 0; y < h; y++) {
    let sum = 0.0;
    for (let k = 0; k < w; k++) {
      sum += acc[y * W + k];
      cover[y * w + k] = Math.min(Math.max(Math.abs(sum), 0.0), 1.0);
    }
  }
  return cover;
}

function rgb(color) {
  return [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
}

/** An RGBA image in floats. Shapes are composited source-over in sRGB, as browsers composite SVG. */
class Canvas {
  constructor(w, h, background = null) {
    this.w = w;
    this.h = h;
    this.color = new Float64Array(w * h * 3);
    this.alpha = new Float64Array(w * h);
    if (background) {
      const c = rgb(background);
      for (let i = 0; i < w * h; i++) {
        this.color.set(c, i * 3);
        this.alpha[i] = 1.0;
      }
    }
  }

  fill(shape, color) {
    const cover = coverage(shape, this.w, this.h);
    const c = rgb(color);
    for (let i = 0; i < cover.length; i++) {
      const under = this.alpha[i] * (1 - cover[i]);
      const alpha = cover[i] + under;
      for (let k = 0; k < 3; k++) {
        const mixed = c[k] * cover[i] + this.color[i * 3 + k] * under;
        this.color[i * 3 + k] = alpha > 0 ? mixed / alpha : 0;
      }
      this.alpha[i] = alpha;
    }
    return this;
  }

  /** The image in 8-bit RGBA, { width, height, data }; a fully transparent pixel's color is 0. */
  image() {
    const data = new Uint8Array(this.w * this.h * 4);
    for (let i = 0; i < this.w * this.h; i++) {
      const alpha = roundHalfEven(this.alpha[i] * 255);
      data[i * 4 + 3] = alpha;
      if (alpha === 0) continue;
      for (let k = 0; k < 3; k++) data[i * 4 + k] = Math.min(Math.max(roundHalfEven(this.color[i * 3 + k]), 0), 255);
    }
    return { width: this.w, height: this.h, data };
  }
}

export { clip, coverage, rgb, Canvas };
