// Closed contours of lines, circular arcs and Bezier curves: the outlines the logo kit draws and writes as SVG paths.
import { DEG_TO_RAD, RAD_TO_DEG, acos, cos, dist, num, sin } from './numbers.mjs';

function onArc(center, r, angle) {
  const t = angle * DEG_TO_RAD;
  return [center[0] + r * cos(t), center[1] + r * sin(t)];
}

/**
 * One closed outline. Angles are in degrees with y pointing down, so a growing angle turns clockwise.
 *
 * Outlines run clockwise on screen, so that shapes which overlap add up to their union under the
 * non-zero fill rule, in an SVG path and in the rasterizer alike.
 *
 * Segments are ['L', [x, y]], ['A', [cx, cy], r, a0, a1] and ['C', p1, p2, p3].
 */
class Contour {
  constructor(start, segments = []) {
    this.start = start;
    this.segments = segments;
  }

  line(x, y) {
    const last = this.segments.length ? this.endOf(this.segments.at(-1)) : this.start;
    if (dist(last, [x, y]) > 1e-9) this.segments.push(['L', [x, y]]); // a hook without a straight end adds no line
    return this;
  }

  arc(cx, cy, r, a0, a1) {
    this.segments.push(['A', [cx, cy], r, a0, a1]);
    return this;
  }

  cubic(p1, p2, p3) {
    this.segments.push(['C', p1, p2, p3]);
    return this;
  }

  endOf(segment) {
    if (segment[0] === 'A') return onArc(segment[1], segment[2], segment[4]);
    return segment.at(-1);
  }

  reversed() {
    const points = [this.start, ...this.segments.map((s) => this.endOf(s))];
    const out = new Contour(points.at(-1));
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const s = this.segments[i];
      if (s[0] === 'L') out.line(...points[i]);
      else if (s[0] === 'A') out.arc(...s[1], s[2], s[4], s[3]);
      else out.cubic(s[2], s[1], points[i]);
    }
    return out;
  }
}

class Shape {
  constructor(contours = []) {
    this.contours = contours;
  }

  add(other) {
    return new Shape([...this.contours, ...other.contours]);
  }

  /** Scaled about the origin, then moved. The scale is uniform, so arcs stay circular. */
  placed(scale = 1.0, dx = 0.0, dy = 0.0) {
    const p = (q) => [q[0] * scale + dx, q[1] * scale + dy];
    const out = new Shape();
    for (const c of this.contours) {
      const n = new Contour(p(c.start));
      for (const s of c.segments) {
        if (s[0] === 'L') n.line(...p(s[1]));
        else if (s[0] === 'A') n.arc(...p(s[1]), s[2] * scale, s[3], s[4]);
        else n.cubic(p(s[1]), p(s[2]), p(s[3]));
      }
      out.contours.push(n);
    }
    return out;
  }

  /** Flipped left to right about x = axisX, keeping each contour's winding direction. */
  mirrored(axisX) {
    const p = (q) => [2 * axisX - q[0], q[1]];
    const out = new Shape();
    for (const c of this.contours) {
      const n = new Contour(p(c.start));
      for (const s of c.segments) {
        if (s[0] === 'L') n.line(...p(s[1]));
        else if (s[0] === 'A') n.arc(...p(s[1]), s[2], 180 - s[3], 180 - s[4]);
        else n.cubic(p(s[1]), p(s[2]), p(s[3]));
      }
      out.contours.push(n.reversed());
    }
    return out;
  }

  /** SVG path data. */
  path(digits = 3) {
    const d = [];
    for (const c of this.contours) {
      let cur = c.start;
      d.push(`M${num(cur[0], digits)} ${num(cur[1], digits)}`);
      for (const s of c.segments) {
        if (s[0] === 'L') {
          const [x, y] = s[1];
          if (Math.abs(y - cur[1]) < 1e-9) d.push(`H${num(x, digits)}`);
          else if (Math.abs(x - cur[0]) < 1e-9) d.push(`V${num(y, digits)}`);
          else d.push(`L${num(x, digits)} ${num(y, digits)}`);
          cur = [x, y];
        } else if (s[0] === 'A') {
          const [, center, r, a0, a1] = s;
          cur = onArc(center, r, a1);
          const rr = num(r, digits);
          const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
          const sweep = a1 > a0 ? 1 : 0;
          d.push(`A${rr} ${rr} 0 ${large} ${sweep} ${num(cur[0], digits)} ${num(cur[1], digits)}`);
        } else {
          d.push(`C${s.slice(1).map((q) => `${num(q[0], digits)} ${num(q[1], digits)}`).join(' ')}`);
          cur = s[3];
        }
      }
      d.push('Z');
    }
    return d.join('');
  }

  /** Each contour as a polygon that stays within the tolerance of its curves. */
  polygons(tolerance = 0.01) {
    const out = [];
    for (const c of this.contours) {
      const pts = [c.start];
      for (const s of c.segments) {
        if (s[0] === 'L') {
          pts.push(s[1]);
        } else if (s[0] === 'A') {
          const [, center, r, a0, a1] = s;
          const step = r > tolerance ? 2 * (acos(Math.max(-1.0, 1 - tolerance / r)) * RAD_TO_DEG) : 360;
          const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / step));
          for (let i = 1; i <= n; i++) pts.push(onArc(center, r, a0 + ((a1 - a0) * i) / n));
        } else {
          const p0 = pts.at(-1);
          const [, p1, p2, p3] = s;
          const length = dist(p0, p1) + dist(p1, p2) + dist(p2, p3);
          const n = Math.max(4, Math.ceil(Math.sqrt(length / tolerance)));
          for (let i = 1; i <= n; i++) {
            const t = i / n;
            const u = 1 - t;
            // Products only, never **: IEEE 754 fixes every * and +, while V8 may round the last bit of a power
            // differently from one release to the next, which moves a pixel of the wordmark between releases.
            const at = (k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k];
            pts.push([at(0), at(1)]);
          }
        }
      }
      out.push(pts);
    }
    return out;
  }
}

/** The subset of SVG path data that Shape.path writes without arcs: M, L, H, V, C and Z. */
function parsePath(d) {
  const shape = new Shape();
  let contour = null;
  let cur = [0.0, 0.0];
  for (const [, cmd, args] of d.matchAll(/([MLHVCZ])([^MLHVCZ]*)/g)) {
    const v = [...args.matchAll(/-?\d*\.?\d+/g)].map((m) => Number(m[0]));
    if (cmd === 'M') {
      cur = [v[0], v[1]];
      contour = new Contour(cur);
      shape.contours.push(contour);
    } else if (cmd === 'L') {
      cur = [v[0], v[1]];
      contour.line(...cur);
    } else if (cmd === 'H') {
      cur = [v[0], cur[1]];
      contour.line(...cur);
    } else if (cmd === 'V') {
      cur = [cur[0], v[0]];
      contour.line(...cur);
    } else if (cmd === 'C') {
      contour.cubic([v[0], v[1]], [v[2], v[3]], [v[4], v[5]]);
      cur = [v[4], v[5]];
    }
  }
  return shape;
}

function rectangle(x, y, w, h) {
  return new Shape([new Contour([x, y]).line(x + w, y).line(x + w, y + h).line(x, y + h)]);
}

function roundedRectangle(x, y, w, h, r) {
  const c = new Contour([x + r, y]);
  c.line(x + w - r, y).arc(x + w - r, y + r, r, 270, 360);
  c.line(x + w, y + h - r).arc(x + w - r, y + h - r, r, 0, 90);
  c.line(x + r, y + h).arc(x + r, y + h - r, r, 90, 180);
  c.line(x, y + r).arc(x + r, y + r, r, 180, 270);
  return new Shape([c]);
}

export { onArc, Contour, Shape, parsePath, rectangle, roundedRectangle };
