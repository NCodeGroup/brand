// The generated blocks inside hand-written files: the tables of the guide in guidelines/, and the ramp cells, role
// swatches, type roles and contrast tables of specimens/foundations.html with their classes in foundations.css.
// A block sits between <!-- generated:NAME --> and <!-- /generated:NAME --> (in CSS, /* generated:NAME */ and
// /* /generated:NAME */); build.mjs rewrites what is between the markers and nothing else.
import { contrast } from './color.mjs';
import { BRANDS, summarize } from './contrast.mjs';
import { PREFIX, braceSizes, entries, listTokens, pick } from './model.mjs';

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const esc = (s) => String(s).replaceAll('|', '\\|');

/** Replaces the body of one block, or throws when its markers are missing. */
export function fill(text, tag, body, { css = false } = {}) {
  const [open, close] = css ? ['/*', '*/'] : ['<!--', '-->'];
  const start = `${open} generated:${tag} ${close}`;
  const end = `${open} /generated:${tag} ${close}`;
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a < 0 || b < a) throw new Error(`the markers of the generated block "${tag}" are missing`);
  return `${text.slice(0, a + start.length)}\n${body.replace(/\n$/, '')}\n${text.slice(b)}`;
}

/** The names of the blocks a text holds, so a file can be checked for blocks nothing fills. */
export const blockNames = (text) => [...text.matchAll(/(?:<!--|\/\*) generated:([a-z-]+) (?:-->|\*\/)/g)].map((m) => m[1]);

// ---------------------------------------------------------------------------------------------------------
// specimens/foundations.html and foundations.css

const ROLE_HEADINGS = {
  case: 'Case and plates', control: 'Keys', line: 'Lines', text: 'Type', success: 'Success', warning: 'Warning',
  danger: 'Danger', info: 'Info', hazard: 'Hazard tape', logo: "NCode's marks", depth: 'Depth',
  primary: `Primary, from ${PREFIX}brand`, screen: `Screen, from ${PREFIX}brand-secondary`, scope: 'Scope braces',
};
const ROLE_ORDER = ['case', 'control', 'line', 'text', 'primary', 'screen', 'scope', 'depth', 'success', 'warning', 'danger', 'info', 'hazard', 'logo'];

const SPECIMENS = {
  headline: 'Secrets that clean up', title: 'Clients', 'title-long': 'Quick start', heading: 'Verify a signature',
  'heading-long': 'Choosing a buffer', subheading: 'New client', minor: 'Client authentication',
  lead: 'This page derives a key from a password, verifies an HMAC-SHA256 signature with it, and zeroes the derived key when the method returns.',
  body: 'Applications that can request tokens from this tenant.',
  reading: 'Disposing the owner zeroes the whole buffer, so the key never outlives the method. There is no finalizer: a buffer that is never disposed is never zeroed.',
  ui: 'Lowercase letters, digits and hyphens. It cannot be changed later.',
  field: 'Access token lifetime', label: 'Client ID &nbsp; Type &nbsp; Status &nbsp; Created &nbsp; Rows per page',
  value: 'billing-service &nbsp; 2026-10-02 &nbsp; alex@contoso.example &nbsp; 0O 1lI',
  code: 'using var keyOwner = BufferFactory.Rent(32, isSensitive: true, out Span&lt;byte&gt; key);',
  readout: '00:05:00 &nbsp; 32 bytes &nbsp; 404',
};

function roleFacts(model, role) {
  const font = model.source.base.font;
  const size = Math.round(pick(font.size, role.size) * 16 * 100) / 100;
  const leading = pick(font.leading, role.leading);
  return {
    size,
    line: Math.round(size * leading),
    weight: pick(font.weight, role.weight),
    width: pick(font.width, role.width),
    tracking: pick(font.tracking, role.tracking),
  };
}

function htmlTable(rows, title) {
  let h = `        <table class="table fd-contrast__table">\n          <caption class="label">${title}</caption>\n          <thead><tr><th class="label" scope="col">Use</th><th class="label" scope="col">Pairs</th><th class="label num" scope="col">Needs</th><th class="label num" scope="col">Light</th><th class="label num" scope="col">Dark</th></tr></thead>\n          <tbody>\n`;
  for (const g of rows) h += `            <tr><th scope="row">${cap(g.what)}</th><td class="value">${g.pairs.size}</td><td class="value num">${g.need}</td><td class="value num">${g.light.toFixed(2)}</td><td class="value num">${g.dark.toFixed(2)}</td></tr>\n`;
  return `${h}          </tbody>\n        </table>\n`;
}

/** The lowest ratio of each use over several brands, light and dark. */
function lowestOver(report, brands) {
  const groups = new Map();
  for (const brand of brands) {
    for (const g of summarize(report, brand.name)) {
      const m = groups.get(g.what) ?? { ...g, pairs: new Set(g.pairs), light: Infinity, dark: Infinity };
      m.light = Math.min(m.light, g.light);
      m.dark = Math.min(m.dark, g.dark);
      groups.set(g.what, m);
    }
  }
  return [...groups.values()];
}

export function foundationsBlocks(model, report) {
  const css = [];
  let ramps = '';
  for (const [name, ramp] of Object.entries(model.ramps)) {
    ramps += `        <div class="ramp">\n          <p class="ramp__name"><span class="h4">${cap(name)}</span><span class="label">${ramp.use}</span></p>\n          <ol class="ramp__cells ramp__cells--${Object.keys(ramp.steps).length}">\n`;
    for (const [step, { hex, anchor }] of Object.entries(ramp.steps)) {
      const onWhite = contrast(hex, '#FFFFFF');
      const onBlack = contrast(hex, '#000000');
      const id = `${name}-${step}`;
      css.push(`.sw-${id} { background: var(${PREFIX}${id}); }`);
      ramps += `            <li class="sw sw-${id}${onWhite > onBlack ? ' sw--dark' : ''}"><span class="label">${step}</span>${anchor ? `<span class="sw__anchor">${anchor}</span>` : ''}<span class="sw__hex">${hex}</span><span class="sw__ratio">${onWhite.toFixed(2)} · ${onBlack.toFixed(2)}</span></li>\n`;
    }
    ramps += '          </ol>\n        </div>\n';
  }

  let roles = '';
  for (const group of ROLE_ORDER) {
    roles += `        <div class="rolegroup">\n          <h4 class="label">${ROLE_HEADINGS[group]}</h4>\n          <ul class="rolegroup__list">\n`;
    for (const token of model.colors.filter((c) => c.group === group)) {
      css.push(`.rolesw-${token.name} { background: var(${PREFIX}color-${token.name}); }`);
      roles += `            <li><span class="rolesw rolesw-${token.name}"></span><code>${token.name}</code></li>\n`;
    }
    roles += '          </ul>\n        </div>\n';
  }

  let type = '';
  for (const [name, role] of entries(model.source.semantic.type)) {
    const f = roleFacts(model, role);
    const facts = `${f.size} / ${f.line} · ${f.weight} · ${f.width}%${f.tracking ? ` · ${f.tracking > 0 ? '+' : ''}${f.tracking}em` : ''}`;
    css.push(`.ty-${name} { font: var(${PREFIX}type-${name}); font-stretch: var(${PREFIX}type-${name}-stretch); letter-spacing: var(${PREFIX}type-${name}-tracking);${role.case ? ` text-transform: ${role.case};` : ''}${role.family === 'mono' ? ' font-feature-settings: "zero" 1;' : ''} }`);
    type += `      <div class="fd-type__row"><p class="label">${cap(name.replace('-', ', '))}<br>${facts}</p><p class="ty-${name}${name === 'lead' ? ' fd-type__lead' : ''}${['reading', 'body', 'ui'].includes(name) ? ' fd-type__body' : ''}">${SPECIMENS[name] ?? name}</p></div>\n`;
  }

  const [own, ...others] = BRANDS;
  const tenants = others.filter((b) => !b.stress);
  const stress = others.filter((b) => b.stress);
  const ownRows = summarize(report, own.name);
  const half = Math.ceil(ownRows.length / 2);
  let tables = htmlTable(ownRows.slice(0, half), `${own.name}: neutrals, brand and screens`) + htmlTable(ownRows.slice(half), `${own.name}: boundaries and status`);
  for (const tenant of tenants) tables += htmlTable(summarize(report, tenant.name), `${tenant.name}: #${tenant.primary}${tenant.secondary ? ` and #${tenant.secondary}` : ''}, everything derived`);
  tables += htmlTable(lowestOver(report, stress), `Stress colors: the lowest of ${stress.map((b) => `#${b.primary}`).join(', ')}`);
  const failing = report.rows.filter((r) => !r.pass).length;
  const summary = `          <p class="fd-legend">WCAG 2.2, computed by build.mjs from the tokens: ${report.measured} measurements of ${report.pairings} pairings; ${failing} below the requirement. The lowest ratio of each use is shown.</p>`;
  return {
    html: { ramps, roles, typeroles: type, contrast: tables, 'contrast-summary': summary },
    css: { swatches: css.join('\n') },
  };
}

// ---------------------------------------------------------------------------------------------------------
// guidelines/

export function guideBlocks(model, report, deriveStats) {
  let ramps = '| Ramp | Use | Steps |\n|---|---|---|\n';
  for (const [name, ramp] of Object.entries(model.ramps)) {
    const steps = Object.entries(ramp.steps).map(([step, { hex, anchor }]) => `${step} \`${hex}\`${anchor ? ` (${anchor})` : ''}`);
    ramps += `| ${cap(name)} | ${ramp.use} | ${steps.join(' · ')} |\n`;
  }

  let type = '| Role | Family | Size / line | Weight | Width | Tracking | Use |\n|---|---|---|---|---|---|---|\n';
  for (const [name, role] of entries(model.source.semantic.type)) {
    const f = roleFacts(model, role);
    type += `| \`${name}\` | ${role.family === 'mono' ? 'Martian Mono' : 'Instrument Sans'} | ${f.size} / ${f.line} | ${f.weight} | ${f.width}% | ${f.tracking ? `${f.tracking}em` : '0'}${role.case ? `, ${role.case}` : ''} | ${role.note ? cap(role.note) : ''} |\n`;
  }

  const [own, ...others] = BRANDS;
  const tenants = others.filter((b) => !b.stress);
  const stress = others.filter((b) => b.stress);
  const lowest = (brands, what, theme) => {
    const values = brands.flatMap((b) => summarize(report, b.name)).filter((g) => g.what === what).map((g) => g[theme]);
    return values.length ? Math.min(...values).toFixed(2) : null;
  };
  const both = (brands, what) => {
    const light = lowest(brands, what, 'light');
    return light === null ? '' : `${light} / ${lowest(brands, what, 'dark')}`;
  };
  let contrastTable = '| Use | Pairings | Needs | NCode Blue | Tenants | Stress |\n|---|---:|---:|---:|---:|---:|\n';
  for (const g of summarize(report, own.name)) {
    contrastTable += `| ${cap(g.what)} | ${g.pairs.size} | ${g.need} | ${g.light.toFixed(2)} / ${g.dark.toFixed(2)} | ${both(tenants, g.what)} | ${both(stress, g.what)} |\n`;
  }
  const failing = report.rows.filter((r) => !r.pass).length;
  contrastTable += `\n${report.measured} measurements of ${report.pairings} pairings: ${failing} below the requirement.\n`;

  let braces = '| Brace | Stroke | Hook radius | Cusp radius | Width | Smallest height | Use |\n|---|---:|---:|---:|---:|---:|---|\n';
  const mark = model.source.base.brace.mark;
  braces += `| \`brace-mark\` | ${mark.w} of 64 units | ${mark.r} | ${mark.c} | 12 of 48 units | Fixed shape | The boundary plate |\n`;
  for (const size of braceSizes(model)) {
    braces += `| \`brace-${size.name}\` | ${size.spec.w} px | ${size.spec.r} | ${size.spec.c} | ${size.width} px | ${size.minHeight} px | ${cap(size.note)} |\n`;
  }

  const derive =
    `In a sweep of the sRGB cube, ${deriveStats.colors} colors in nine steps a channel, the rules of \`tokens.css\` hold every ` +
    `pairing for ${deriveStats.colors - deriveStats.adjusted} of them. For the other ${deriveStats.adjusted}, \`tokens/derive.mjs\` ` +
    `moves the colors below their floor (${deriveStats.tokens.join(', ')}) and holds every pairing for all ` +
    `${deriveStats.colors}, with ${deriveStats.failures} below the floor. For NCode Blue and the ten proof and stress colors ` +
    'it moves nothing, so it gives what `tokens.css` gives.\n';

  return { ramps, typeroles: type, contrast: contrastTable, braces, derive, reference: tokenReference(model) };
}

/** Every token: its custom property, its value in light and dark, its tier and what it is for. */
export function tokenReference(model) {
  const tokens = listTokens(model);
  const groups = [
    ['Tenant inputs', (t) => t.kind === 'input'],
    ['Color roles', (t) => t.kind === 'color-role'],
    ['Type roles', (t) => t.kind.startsWith('type')],
    ['Font families', (t) => t.kind === 'font'],
    ['Elevation', (t) => t.kind === 'shadow'],
    ['Space', (t) => t.kind === 'space'],
    ['Radius', (t) => t.kind === 'radius'],
    ['Border', (t) => t.kind === 'border'],
    ['Size', (t) => t.kind === 'size'],
    ['Breakpoint', (t) => t.kind === 'breakpoint'],
    ['Motion', (t) => t.kind === 'duration' || t.kind === 'easing'],
    ['Brace', (t) => t.kind === 'brace'],
    ['Primitives: color ramps', (t) => t.kind === 'color'],
    ['Primitives: type scale', (t) => ['width', 'weight', 'font-size', 'leading', 'tracking'].includes(t.kind)],
  ];
  const listed = new Set(groups.flatMap(([, test]) => tokens.filter(test)));
  const unlisted = tokens.filter((t) => !listed.has(t)).map((t) => t.property);
  if (unlisted.length) throw new Error(`the token reference has no table for ${unlisted.join(', ')}`);
  let out = '';
  for (const [title, test] of groups) {
    const rows = tokens.filter(test);
    const tier = rows[0].tier;
    if (rows.some((t) => t.tier !== tier)) throw new Error(`the token reference's table "${title}" mixes tiers`);
    const themed = rows.some((t) => t.light !== t.dark);
    out += `\n### ${title}\n\n${tier === 'primitive' ? 'Private: read a semantic token instead.' : 'Public.'}\n\n`;
    out += themed ? '| Custom property | Light | Dark | What it is |\n|---|---|---|---|\n' : '| Custom property | Value | What it is |\n|---|---|---|\n';
    for (const t of rows) {
      const value = (v) => `\`${esc(v)}\``;
      out += themed
        ? `| \`${t.property}\` | ${value(t.light)} | ${value(t.dark)} | ${esc(t.note ?? '')} |\n`
        : `| \`${t.property}\` | ${value(t.light)} | ${esc(t.note ?? '')} |\n`;
    }
  }
  return `${out.trimStart()}`;
}

/** The derivation's sweep: how many colors the CSS rules alone hold, and whether the guards hold every pairing. */
export function deriveSweep(model, deriveBrand, held, resolveColors) {
  let adjusted = 0;
  let failures = 0;
  const tokens = new Set();
  let colors = 0;
  for (let r = 0; r <= 8; r++) for (let g = 0; g <= 8; g++) for (let b = 0; b <= 8; b++) {
    colors++;
    const hex = `#${[r, g, b].map((v) => Math.round((v / 8) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    const d = deriveBrand(hex);
    if (d.adjusted.light.length || d.adjusted.dark.length) adjusted++;
    for (const theme of ['light', 'dark']) {
      for (const t of d.adjusted[theme]) tokens.add(t);
      const all = { ...resolveColors(model, theme), ...d[theme] };
      for (const c of held.filter((x) => x.themes.includes(theme))) {
        if (Math.max(...c.fg.map((f) => contrast(all[f], all[c.bg]))) < c.floor) failures++;
      }
    }
  }
  return { colors, adjusted, failures, tokens: [...tokens].sort().map((t) => `\`${t}\``) };
}
