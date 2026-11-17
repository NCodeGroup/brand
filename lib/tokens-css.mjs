// Writes tokens/tokens.css and tokens/tokens.static.css from the model.
import {
  PREFIX, braceSizes, defaultInputs, entries, noteOf, resolveColors, roleExtras, ruleToCss, trim, valueOf,
} from './model.mjs';

/** The four features the modern block needs; a browser without one gets the static palette. */
export const SUPPORTS =
  '(color: light-dark(#000, #fff)) and (color: oklch(from #000 l c h)) and (color: lch(from #000 l c h)) and (color: color-mix(in oklab, #000, #fff))';

function primitiveLines(model) {
  const { base, semantic } = model.source;
  const lines = [];
  const section = (title) => lines.push('', `  /* ---- ${title} */`);
  const comment = (text) => text && lines.push(`  /* ${text} */`);
  const declare = (name, value, note) => lines.push(`  ${PREFIX}${name}: ${value};${note ? ` /* ${note} */` : ''}`);

  section('primitives: color. Private: read a semantic color instead (docs/decisions/1002)');
  for (const [name, ramp] of Object.entries(model.ramps)) {
    lines.push('');
    comment(ramp.note);
    for (const [step, { hex, anchor }] of Object.entries(ramp.steps)) declare(`${name}-${step}`, hex, anchor);
  }

  section('type. The families are public; the widths, weights, sizes, leadings and trackings are private primitives');
  const font = base.font;
  for (const [name, entry] of entries(font.family)) {
    declare(`font-${name}`, valueOf(entry).map((f) => (/^[a-z-]+$/.test(f) ? f : `"${f}"`)).join(', '), noteOf(entry));
  }
  lines.push('');
  comment(font.width.$note);
  for (const [name, entry] of entries(font.width)) declare(`width-${name}`, `${valueOf(entry)}%`, noteOf(entry));
  lines.push('');
  for (const [name, entry] of entries(font.weight)) declare(`weight-${name}`, valueOf(entry), noteOf(entry));
  lines.push('');
  for (const [name, entry] of entries(font.size)) declare(`text-${name}`, `${trim(valueOf(entry))}rem`, noteOf(entry));
  lines.push('');
  for (const [name, entry] of entries(font.leading)) declare(`leading-${name}`, trim(valueOf(entry)), noteOf(entry));
  lines.push('');
  for (const [name, entry] of entries(font.tracking)) {
    declare(`tracking-${name}`, valueOf(entry) === 0 ? '0' : `${trim(valueOf(entry))}em`, noteOf(entry));
  }

  section('space, shape, size, motion');
  for (const [name, entry] of entries(base.space)) declare(`space-${name}`, valueOf(entry) === 0 ? '0' : `${trim(valueOf(entry))}rem`, noteOf(entry));
  lines.push('');
  for (const [name, entry] of entries(base.radius)) declare(`radius-${name}`, `${valueOf(entry)}px`, noteOf(entry));
  lines.push('');
  for (const [name, entry] of entries(base.border)) declare(`border-${name}`, `${valueOf(entry)}px`, noteOf(entry));
  for (const [name, entry] of entries(base.size)) declare(name, `${trim(entry.value)}${entry.unit}`, entry.note);
  lines.push('');
  comment(base.breakpoint.$note);
  for (const [name, entry] of entries(base.breakpoint)) declare(`breakpoint-${name}`, `${valueOf(entry)}rem`, noteOf(entry));
  lines.push('');
  for (const [name, entry] of entries(base.motion.duration)) declare(`dur-${name}`, `${valueOf(entry)}ms`, noteOf(entry));
  for (const [name, entry] of entries(base.motion.easing)) {
    declare(`ease-${name}`, entry.type === 'cubicBezier' ? `cubic-bezier(${entry.value.join(', ')})` : entry.value, entry.note);
  }

  section('the brace: the width of each stretching brace, as build.mjs draws it in brace/');
  for (const size of braceSizes(model)) declare(`brace-${size.name}`, `${size.width}px`, size.note);

  section(`type roles: a font shorthand each, with its width and tracking beside it as ${PREFIX}type-<role>-stretch and -tracking, and its case as -case where it sets one`);
  const lookup = (group, key, unit) => (typeof key === 'string' ? `var(${PREFIX}${group}-${key})` : `${trim(key)}${unit}`);
  for (const [name, role] of entries(semantic.type)) {
    const { stretch, tracking } = roleExtras(role);
    declare(`type-${name}`, `${lookup('weight', role.weight, '')} ${lookup('text', role.size, 'rem')}/${lookup('leading', role.leading, '')} var(${PREFIX}font-${role.family})`, `${role.case ? `${role.case}: ` : ''}${role.note ?? ''}`);
    declare(`type-${name}-stretch`, stretch);
    declare(`type-${name}-tracking`, tracking);
    if (role.case) declare(`type-${name}-case`, role.case);
  }

  section("the tenant's two inputs");
  for (const input of model.inputs) declare(input.name, ruleToCss(model, input.rule), input.note);

  section('elevation');
  comment('Depth is drawn with hard edges: a lip below means raised, a shade above means recessed. Blur appears only under overlays.');
  for (const [name, layers] of entries(semantic.elevation)) declare(`elevation-${name}`, layers.map((layer) => shadowToCss(model, layer)).join(', '));
  return lines;
}

function shadowToCss(model, layer) {
  const px = (v) => (typeof v === 'string' ? ruleToCss(model, v) : v === 0 ? '0' : `${v}px`);
  return `${layer.inset ? 'inset ' : ''}${px(layer.x)} ${px(layer.y)} ${px(layer.blur)}${layer.spread ? ` ${px(layer.spread)}` : ''} ${ruleToCss(model, layer.color)}`;
}

function colorBlock(model, indent, { brand, format, notes }) {
  const lines = [];
  let lastGroup = null;
  for (const token of model.colors.filter((c) => c.brand === brand)) {
    if (token.group !== lastGroup) {
      if (lastGroup !== null) lines.push('');
      if (token.groupNote) lines.push(`${indent}/* ${token.groupNote} */`);
      lastGroup = token.group;
    }
    const value = format(token);
    if (value !== null) lines.push(`${indent}${PREFIX}color-${token.name}: ${value};${token.note && notes ? ` /* ${token.note} */` : ''}`);
  }
  return lines;
}

/** The static palette for NCode's own brand: light at the root, dark on a screen by the system setting or data-theme. */
function staticPalette(model, indent) {
  const light = resolveColors(model, 'light');
  const dark = resolveColors(model, 'dark');
  const staticLight = (token) => light[token.name];
  const staticDark = (token) => (dark[token.name] === light[token.name] ? null : dark[token.name]);
  const inner = `${indent}  `;
  const darkLines = (at) => [...colorBlock(model, at, { brand: false, format: staticDark }), '', ...colorBlock(model, at, { brand: true, format: staticDark })];
  return [
    `${indent}:root {`,
    ...colorBlock(model, inner, { brand: false, format: staticLight }),
    '',
    ...colorBlock(model, inner, { brand: true, format: staticLight }),
    `${indent}}`,
    '',
    `${indent}@media screen and (prefers-color-scheme: dark) {`,
    `${inner}:root:not([data-theme="light"]) {`,
    ...darkLines(`${inner}  `),
    `${inner}}`,
    `${indent}}`,
    '',
    `${indent}@media screen {`,
    `${inner}:root[data-theme="dark"] {`,
    ...darkLines(`${inner}  `),
    `${inner}}`,
    `${indent}}`,
  ];
}

const tidy = (lines) => `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;

export function tokensCss(model, version) {
  const modern = (token) => ruleToCss(model, token.rule);
  const out = [
    '/*',
    ` * ${model.source.name}: NCode's design tokens, NCode Brand ${version}.`,
    ' *',
    ' * Generated by build.mjs from src/tokens.source.json: do not edit it. "npm run build" writes it, and',
    ' * "npm run check" fails when it is not what the source gives.',
    ' *',
    ` * Every custom property starts with ${PREFIX}. The semantic tokens are the public contract: the color roles`,
    ` * (${PREFIX}color-*), the type roles (${PREFIX}type-*), elevation, the two font families, the measures and the two`,
    ' * tenant inputs. The color ramps and the steps of the type scale are private primitives, which may change in any',
    ' * release (docs/decisions/1002).',
    ' *',
    ' * A theme is nothing but the root\'s color-scheme: it follows prefers-color-scheme until data-theme pins it.',
    ` * A tenant replaces two values: ${PREFIX}brand (BrandingConfig.primaryColor) and ${PREFIX}brand-secondary`,
    ' * (BrandingConfig.secondaryColor). Everything their colors touch is derived from them below, in CSS. The',
    ' * derivations are calibrated on the logo kit: NCode Blue yields exactly NCode Navy for screens and exactly NCode',
    ' * Blue Light for the dark theme. tokens/derive.mjs derives the same colors in JavaScript and also guarantees their',
    ' * contrast for any input, which CSS cannot.',
    ' */',
    '',
    ':root {',
    '  color-scheme: light dark;',
    ...primitiveLines(model),
    '}',
    '',
    ':root[data-theme="light"] { color-scheme: light; }',
    ':root[data-theme="dark"] { color-scheme: dark; }',
    '',
    '/* On paper every page takes the light theme, whatever data-theme or the system says. */',
    '@media print {',
    '  :root, :root[data-theme] { color-scheme: light; }',
    '}',
    '',
    "/* Inside a nested brand scope the secondary follows that scope's own primary, until the scope sets one. */",
    `[data-brand-scope] { ${PREFIX}brand-secondary: var(${PREFIX}brand); }`,
    '',
    '/*',
    ' * Semantic colors. Each is written once: as light-dark(<light>, <dark>) where the themes differ, as one value where',
    ' * they do not.',
    ' */',
    `@supports ${SUPPORTS} {`,
    '  :root {',
    ...colorBlock(model, '    ', { brand: false, format: modern, notes: true }),
    '  }',
    '',
    '  /*',
    "   * Everything a tenant's colors touch. It is declared for the root and again for any element marked",
    '   * data-brand-scope, so one part of a page (a branding preview, say) can run under other inputs.',
    '   */',
    '  :root,',
    '  [data-brand-scope] {',
    ...colorBlock(model, '    ', { brand: true, format: modern, notes: true }),
    '  }',
    '}',
    '',
    '/*',
    ' * The same colors for a browser without light-dark(), relative colors or color-mix(): the values above,',
    " * computed by the build for NCode's own brand. Such a browser cannot derive a tenant's colors, so a host that",
    ' * must support it sets the derived tokens itself, from tokens/derive.mjs.',
    ' */',
    `@supports not (${SUPPORTS}) {`,
    ...staticPalette(model, '  '),
    '}',
    '',
    "/* Under a tenant's color NCode's marks go one color, as the logo kit allows: they never take the tenant's hue. */",
    `:root[data-brand="tenant"] { ${PREFIX}color-logo: var(${PREFIX}color-text); }`,
  ];
  return tidy(out);
}

/** The same tokens with every color resolved for NCode's own brand, and no CSS function newer than var(). */
export function tokensStaticCss(model, version) {
  const inputs = defaultInputs(model);
  const lines = primitiveLines(model).map((line) => {
    // The inputs are written as their values: nothing in this file derives from them.
    for (const name of Object.keys(inputs)) {
      if (line.startsWith(`  ${PREFIX}${name}:`)) return line.replace(/:.*?;/, `: ${inputs[name]};`);
    }
    return line;
  });
  const out = [
    '/*',
    ` * ${model.source.name}: NCode's design tokens, resolved for NCode's own brand, NCode Brand ${version}.`,
    ' *',
    ' * Generated by build.mjs from src/tokens.source.json: do not edit it. It holds what tokens.css holds, with every',
    ' * color written out, light and dark, and no light-dark(), relative color or color-mix(): for a card renderer or a',
    ' * page that must run without 2024 CSS; an email takes email/instrument.html. It derives nothing, so setting a',
    ' * tenant input here changes no other token: set the derived colors from tokens/derive.mjs instead.',
    ' */',
    '',
    ':root {',
    '  color-scheme: light dark;',
    ...lines,
    '}',
    '',
    ':root[data-theme="light"] { color-scheme: light; }',
    ':root[data-theme="dark"] { color-scheme: dark; }',
    '',
    '/* On paper every page takes the light theme, whatever data-theme or the system says. */',
    '@media print {',
    '  :root, :root[data-theme] { color-scheme: light; }',
    '}',
    '',
    ...staticPalette(model, ''),
    '',
    "/* Under a tenant's color NCode's marks go one color, as the logo kit allows: they never take the tenant's hue. */",
    `:root[data-brand="tenant"] { ${PREFIX}color-logo: var(${PREFIX}color-text); }`,
  ];
  return tidy(out);
}
