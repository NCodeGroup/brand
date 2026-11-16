// Fills the [[kind:name]] placeholders of the hand-written sources of email/instrument.html and
// slides/instrument.css with the tokens' values, resolved for NCode's own brand, and embeds the fonts the slide theme
// carries as data: addresses (docs/decisions/1013). A {{ slot }} is the consumer's and stays as it is.
import { resolveColors, resolveRole, trim, valueOf } from './model.mjs';

const PLACEHOLDER = /\[\[(\w+)(?::([\w-]+))?\]\]/g;

/**
 * The source with every placeholder replaced. `inline` writes for an email's style attributes: sizes in px,
 * declarations without spaces and no font-stretch; otherwise sizes are in rem. Throws on a placeholder it can't fill.
 */
export function fillTokens(source, model, { version, inline = false, fonts } = {}) {
  const base = model.source.base;
  const length = (rem) => (rem === 0 ? '0' : inline ? `${trim(rem * 16)}px` : `${trim(rem)}rem`);
  const lookup = (table, name) => (name !== undefined && Object.hasOwn(table, name) ? table[name] : undefined);
  const colors = {};
  const themed = (theme, name) => lookup((colors[theme] ??= resolveColors(model, theme)), name);
  const measured = (table, name) => {
    const entry = lookup(table, name);
    return entry === undefined ? undefined : valueOf(entry);
  };

  const kinds = {
    color: (name) => themed('light', name),
    dark: (name) => themed('dark', name),
    space: (name) => {
      const rem = measured(base.space, name);
      return rem === undefined ? undefined : length(rem);
    },
    text: (name) => {
      const rem = measured(base.font.size, name);
      return rem === undefined ? undefined : length(rem);
    },
    radius: (name) => {
      const px = measured(base.radius, name);
      return px === undefined ? undefined : `${px}px`;
    },
    border: (name) => {
      const px = measured(base.border, name);
      return px === undefined ? undefined : `${px}px`;
    },
    type: (name) => {
      const role = lookup(model.source.semantic.type, name);
      return role === undefined ? undefined : typeDeclarations(resolveRole(model, role));
    },
    version: () => version,
    fonts: () => fonts,
  };

  function typeDeclarations(r) {
    const family = r.fontFamily.map((name) => (/^[a-z-]+$/.test(name) ? name : `'${name}'`)).join(inline ? ',' : ', ');
    const declarations = [
      ['font-family', family],
      ['font-size', length(Number.parseFloat(r.fontSize))],
      ['line-height', r.lineHeight],
      ['font-weight', r.fontWeight],
      ...(inline ? [] : [['font-stretch', r.fontStretch]]),
      ['letter-spacing', r.letterSpacing],
      ...(r.textTransform ? [['text-transform', r.textTransform]] : []),
    ];
    return declarations.map(([prop, value]) => (inline ? `${prop}:${value}` : `${prop}: ${value}`)).join(inline ? ';' : '; ');
  }

  const filled = source.replace(PLACEHOLDER, (match, kind, name) => {
    const value = Object.hasOwn(kinds, kind) ? kinds[kind](name) : undefined;
    if (value === undefined) throw new Error(`no value for [[${kind}${name ? ':' + name : ''}]]`);
    return String(value);
  });
  if (filled.includes('[[')) throw new Error('a placeholder is left: [[');
  return filled;
}

/**
 * The @font-face rules of a stylesheet, each url("../fonts/<name>") replaced with the file's bytes as a data:
 * address, joined by a blank line. `woff2` maps a file name to its bytes.
 */
export function embedFonts(css, woff2) {
  const rules = css.match(/@font-face\s*\{[^}]*\}/g);
  if (!rules) throw new Error('no @font-face rule to embed');
  return rules
    .map((rule) =>
      rule.replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (match, name) => {
        if (!Object.hasOwn(woff2, name)) throw new Error(`no font file ${name} to embed`);
        return `url("data:font/woff2;base64,${Buffer.from(woff2[name]).toString('base64')}")`;
      }),
    )
    .join('\n\n');
}
