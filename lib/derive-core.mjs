// The tenant derivation: a tenant's two colors -> every color they touch, light and dark, with each pairing held at
// its contrast floor. It evaluates the rules tokens.css evaluates in CSS, from data build.mjs takes from the token
// source, then runs the guards: a pairing below its floor moves one color's OKLCH lightness away from its ground in
// steps of 0.004 until it reaches the floor. For a color whose rules already reach every floor, it returns exactly
// what tokens.css computes. It imports only ./color.mjs, which build.mjs inlines into tokens/derive.mjs.
import { contrast, hexToOklch, mixOklab, parseHex, relativeLch, relativeOklch, withOklchLightness } from './color.mjs';

const STEP = 0.004;
const PASSES = 4;

/**
 * Builds the derivation from its data: the default input, the rules of every derived color per theme, the colors they
 * may refer to that no tenant changes, the ramp steps they name, the guards, and each color's custom property.
 */
export function createDerive(data) {
  const ref = (rule) => (typeof rule === 'string' ? /^\{([^}]+)\}$/.exec(rule)?.[1] : undefined);

  /** Every derived color for one theme and one pair of inputs; `overrides` replaces colors the guards moved. */
  function evaluate(theme, input, overrides) {
    const { rules, fixed } = data.themes[theme];
    const cache = new Map();
    const resolve = (rule) => {
      const name = ref(rule);
      if (name) {
        if (name === 'brand') return input.primary;
        if (name === 'brand-secondary') return input.secondary;
        if (name.startsWith('color.')) return color(name.slice(6));
        const step = data.ramps[name];
        if (!step) throw new Error(`unknown reference {${name}}`);
        return step;
      }
      if (typeof rule === 'string') return rule.toUpperCase();
      if ('from' in rule) return (rule.space === 'lch' ? relativeLch : relativeOklch)(resolve(rule.from), rule.l, rule.c, rule.h);
      if ('mix' in rule) return mixOklab(resolve(rule.mix[0]), resolve(rule.mix[1]), rule.share);
      throw new Error(`unknown rule ${JSON.stringify(rule)}`);
    };
    const color = (name) => {
      if (name in overrides) return overrides[name];
      if (name in fixed) return fixed[name];
      if (!(name in rules)) throw new Error(`unknown color ${name}`);
      if (!cache.has(name)) cache.set(name, resolve(rules[name]));
      return cache.get(name);
    };
    const out = {};
    for (const name of data.order) out[name] = color(name);
    return { out, color };
  }

  /** Whether every check of a guard holds: for each, the best of its foregrounds reaches the floor on its ground. */
  const holds = (guard, color) => guard.checks.every(({ fg, bg, floor }) => Math.max(...fg.map((f) => contrast(color(f), color(bg)))) >= floor);
  const worst = (guard, color) => Math.min(...guard.checks.map(({ fg, bg, floor }) => Math.max(...fg.map((f) => contrast(color(f), color(bg)))) / floor));

  function guarded(theme, input) {
    const overrides = {};
    const adjusted = new Set();
    const guards = data.guards.filter((g) => g.themes.includes(theme));
    for (let pass = 0; pass < PASSES; pass++) {
      let moved = false;
      for (const guard of guards) {
        const now = evaluate(theme, input, overrides);
        if (holds(guard, now.color)) continue;
        moved = true;
        if (guard.choices) {
          // A set of colors that change together, such as a key's label and the side its face moves toward.
          let best = null;
          for (const choice of guard.choices) {
            const trial = { ...overrides, ...Object.fromEntries(guard.tokens.map((t, i) => [t, choice[i]])) };
            const score = worst(guard, evaluate(theme, input, trial).color);
            if (!best || score > best.score) best = { trial, score };
            if (score >= 1) break;
          }
          Object.assign(overrides, best.trial);
          for (const t of guard.tokens) adjusted.add(t);
          continue;
        }
        const start = now.color(guard.token);
        const [l] = hexToOklch(start);
        let found = guard.direction > 0 ? '#FFFFFF' : '#000000';
        for (let at = l + guard.direction * STEP; at >= 0 && at <= 1; at += guard.direction * STEP) {
          const candidate = withOklchLightness(start, at);
          if (holds(guard, evaluate(theme, input, { ...overrides, [guard.token]: candidate }).color)) {
            found = candidate;
            break;
          }
        }
        overrides[guard.token] = found;
        adjusted.add(guard.token);
      }
      if (!moved) break;
    }
    const { out, color } = evaluate(theme, input, overrides);
    out.logo = input.tenant ? color('text') : color('logo');
    return { colors: out, adjusted: [...adjusted].filter((name) => data.order.includes(name)) };
  }

  /**
   * The colors a tenant's primary and secondary color derive, in both themes. A primary that is not "#RGB" or
   * "#RRGGBB" is NCode Blue; a secondary that is not follows the primary. `tenant` is true when either input was
   * given and valid, which turns NCode's own marks to one color. `adjusted` names the colors a guard moved away from
   * what tokens.css computes, so a caller can tell a tenant that a color was corrected.
   */
  function deriveBrand(primary, secondary) {
    const p = parseHex(primary);
    const s = parseHex(secondary);
    const input = { primary: p ?? data.defaults.brand, secondary: s ?? p ?? data.defaults.brand, tenant: Boolean(p || s) };
    const light = guarded('light', input);
    const dark = guarded('dark', input);
    return {
      primary: input.primary,
      secondary: input.secondary,
      tenant: input.tenant,
      light: light.colors,
      dark: dark.colors,
      adjusted: { light: light.adjusted, dark: dark.adjusted },
    };
  }

  /** One theme of deriveBrand's result as custom properties, for a host that sets the derived tokens itself. */
  function customProperties(colors) {
    return Object.fromEntries(Object.entries(colors).map(([name, value]) => [data.properties[name], value]));
  }

  return { deriveBrand, customProperties, derivedColors: [...data.order, 'logo'] };
}
