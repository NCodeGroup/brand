# 12. Applying It

This repository ships data and stylesheets, never a framework's theme code: a theme belongs to the product that runs
it, next to the framework version it was written for
([the decision](../docs/decisions/1005-this-repository-ships-data-and-stylesheets-never-a-frameworks-theme-code.md)).
Every path below is from the root of a release; keep the release's folders side by side when you vendor them, because
`css/base.css` finds the braces in `brace/` and `css/fonts.css` finds the fonts in `fonts/`.

## A Page in Plain HTML and CSS

Take `tokens/tokens.css`, `css/fonts.css` with `fonts/`, and `css/base.css` with `brace/`, and load them in that order:

```html
<link rel="stylesheet" href="brand/css/fonts.css">
<link rel="stylesheet" href="brand/tokens/tokens.css">
<link rel="stylesheet" href="brand/css/base.css">
```

The page then runs under `Content-Security-Policy: default-src 'self'`: the fonts and the brace masks come from its own
origin, and nothing needs an inline style. The [specimens](../specimens/) are built exactly this way. Set
`data-theme="light"` or `"dark"` on the root to pin a theme, and `--nc-brand` with `data-brand="tenant"` for a tenant's
color.

## A Documentation Site on Starlight

Take `tokens/tokens.css`, `css/fonts.css` with `fonts/`, and `css/starlight.css`, and name them in Starlight's
`customCss`, in that order. `css/starlight.css` sets Starlight's own custom properties (`--sl-*`) from the tokens: the
colors of both themes, the two families, the type sizes, the headings of a long-form page, the shadows and the
layout's widths. Starlight's inverted text on the accent, its primary link button and its search field's focus border
are pairings the contrast gate measures for any tenant's color. It holds no rule for Starlight's markup. The rules that
make the sidebar's current page a latched key, a code block a screen and a callout an alert depend on the markup of
one Starlight version, so they live in the documentation toolchain, beside the version they were written for. Set the
reading voice there too. Starlight sets no size on running text, which keeps the browser's 16 pixels: it reads its
`--sl-text-body`, which `css/starlight.css` sets to the `reading` step, for a card's text alone. Its
`--sl-content-width`, 52 rem in `css/starlight.css`, bounds the content panel, listings and tables included, not the
measure of running text, and its `--sl-sidebar-width`, 17 rem, is the selector with the gutter on each side of it.
In the toolchain's own rules, set running text in the `reading` role, 15 pixels, on the 42 rem `--nc-measure`, as
`.prose` does in `css/base.css`. Keep the selector, the sheet and the page index together in the middle of a wide
window, as `.docs__frame` does there. Give a hero with no image one column: Starlight keeps a second column for the
image whether or not the page has one, which leaves a headline about 490 pixels beside a sidebar.

Starlight draws inline code on `--sl-color-bg-inline-code`, which `css/starlight.css` sets to `--nc-color-code-tint`,
and gives it no border. Keep it so in the toolchain's rules: [inline code](03-typography.md#in-running-text) has a
tint and no edge.

Take `syntax/instrument-screen.json` for the code blocks. It is Expressive Code's syntax theme, which colors code as a
screen does: keywords lit, literals amber and comments dimmed. Each color is the custom property of its role, so
`tokens/tokens.css` decides it, a tenant's color included. One theme serves both page themes, because a screen is the
same in both. Name it in the toolchain's `ec.config.mjs`:

```js
import { readFileSync } from 'node:fs';
import { defineEcConfig } from '@astrojs/starlight/expressive-code';

const screen = JSON.parse(readFileSync(new URL('./src/brand/syntax/instrument-screen.json', import.meta.url), 'utf8'));

export default defineEcConfig({
  themes: [screen],
  useStarlightDarkModeSwitch: false,
  useStarlightUiThemeColors: false,
  minSyntaxHighlightingColorContrast: 0,
});
```

Keep `minSyntaxHighlightingColorContrast` at 0: Expressive Code's correction can't compute with a custom property, and
the contrast gate holds each role at 4.5 to 1 on the screen. The frame around a code block, Expressive Code's
`styleOverrides`, stays in the toolchain with its other rules
([the decision](../docs/decisions/1012-the-syntax-theme-names-the-screens-tokens-rather-than-their-colors.md)).

## A Material UI Application

Take `mui/instrument.json`, `tokens/tokens.mjs` with `tokens.d.mts`, `tokens/derive.mjs` with `derive.d.mts` and
`derive.vectors.json`, and `css/fonts.css` with `fonts/`. The theme, its `createTheme` call and its component overrides,
stays in the application, under its own type check and tests.

- `mui/instrument.json` holds the palette of each scheme for NCode's own brand, with every color role under
  `instrument`; the typography variants, each set in the type role that names its use, while one it does not name,
  such as `caption`, keeps Material UI's size; the radius, the space scale and Material UI's spacing unit of 8; the 25
  elevations as no shadow and four of Instrument's depths: flush, raised, floating and overlay; the durations, the
  easings and the breakpoints.
- The palette's `secondary` takes the colors a tenant's secondary color drives, chosen for how Material UI paints them:
  `main` as text on the page and its sheets, in a text or outlined key, a checkbox, a switch and a tab's indicator, and
  `contrastText` on `main` and on `dark`, a contained key at rest and touched. In the light theme `main` is the screen,
  `contrastText` is `on-screen` and `dark` is `screen-raised`. In the dark theme the screen is about as dark as the
  page, so `main` is `screen-lit`, `contrastText` is the screen and `dark` is `on-screen-secondary`. The contrast gate
  measures each of these pairings in its theme for every brand, and `tokens/derive.mjs` holds them for any color.
- For a tenant, call `deriveBrand(primaryColor, secondaryColor)` from `tokens/derive.mjs` and take its `light` and
  `dark` colors for the primary, screen and scope roles. It never throws: a primary it cannot read falls back to NCode
  Blue and a secondary to the primary, and `adjusted` names any color it moved to reach its contrast floor.
- Assert `tokens/derive.vectors.json` in the application's tests, so a vendored copy is proven to derive what this
  release derives.
- Import `css/fonts.css` once in the application's entry: a bundler emits the six font files beside it, and a page
  served under `font-src 'self'` loads them. Vendor each family's license, `fonts/OFL-Instrument-Sans.txt` and
  `fonts/OFL-Martian-Mono.txt`, with its font files: the SIL Open Font License asks every copy of a font to carry it.

## An Email

Take `email/instrument.html`: an HTML email in the light theme with every value written inline, its key and its
screen in NCode's colors or a tenant's. It has no `<style>` element, no custom property and no web font, because most
email clients drop all three: its type falls back from Instrument Sans and Martian Mono to the reader's system faces.
It lays out one column, 600 pixels wide, in tables, which Outlook on Windows needs. It asks the client for the light
scheme alone, and a client that forces a dark scheme still inverts it
([the decision](../docs/decisions/1013-slides-are-a-marp-theme-and-the-email-and-the-theme-carry-every-value-written-out.md)).

Fill each slot, a name in double braces such as `{{ heading }}`, with your template engine, and escape each value as
HTML. Mustache, Handlebars, Liquid, Scriban and Fluid read the slots as variables: Mustache and Handlebars escape a
value, and the others need their escape filter.

| Slot | What you put in it |
|---|---|
| `subject` | The subject line, which is also the page's title |
| `preheader` | The line an inbox shows after the subject; the message hides it |
| `product` | The product's name, the logo's alternative text |
| `logo_url` | The `https` address where you host the lockup at 128 pixels high: `logo/ncode/lockup/ncode-lockup-blue-h128.png`, or `logo/identity/lockup/ncode-identity-lockup-blue-h128.png` for NCode Identity. Under a tenant's colors, take the `black` lockup, because NCode's marks then go one color ([Marks](01-marks.md)) |
| `logo_width` | The lockup's width at 32 pixels high: 106 for the `{N}` lockup, 186 for the `{id}` lockup |
| `heading` | What the message is about, in the `heading` role |
| `message` | One paragraph, in the `body` role |
| `action_label`, `action_url` | The key: what it does, such as "Verify email address", and the `https` address it opens |
| `code` | A value read off the system, such as a one-time code, on a screen |
| `footer` | Why the reader got the message, in the `ui` role, muted |
| `primary`, `primary_edge`, `primary_lip`, `on_primary`, `screen`, `on_screen` | The key's, its edge's and the screen's colors: the same names, with `-` for `_`, in `deriveBrand(primary, secondary).light` of `tokens/derive.mjs`, which gives NCode's own colors without a tenant's |

Fill the color slots only from `deriveBrand()`, never from a tenant's color as it was typed. Each slot sits
inside a `style` attribute, where escaping as HTML doesn't stop a value such as `red;display:none` from adding a
declaration: `deriveBrand()` writes every color as `#RRGGBB`, and gives NCode Blue for any input that isn't a
hexadecimal color. Its guards keep the key's label and the code readable on their colors, and the key's edge reaches 3
to 1 against the card whatever the tenant's color.

Delete the key's table or the code's table when the message has neither: a comment above each marks it.

## A Page Without 2024 CSS

Take `tokens/tokens.static.css`: every token with its color written out, light at the root and dark by the theme, and
no `light-dark()`, relative color or `color-mix()`. It derives nothing, so a tenant's colors come from
`tokens/derive.mjs`'s `customProperties()`.

## Slides in Marp

Take `slides/instrument.css`, the Marp theme `instrument`, with `fonts/OFL-Instrument-Sans.txt` and
`fonts/OFL-Martian-Mono.txt`. It embeds both typefaces, so a deck renders in them on any machine and loads no other
file, and the SIL Open Font License asks every copy of a font to carry its license. Name the theme in the VS Code
extension's `markdown.marp.themes` setting, or give its path to Marp CLI's `--theme-set` option, and choose it in the
deck's front matter:

```markdown
---
marp: true
theme: instrument
paginate: true
---
```

A slide is 1280 by 720 pixels on the light theme's surface, and every type role is 1.75 times its size on a screen:
`#` is the `title` role, `##` `heading`, `###` `subheading`, running text `body`, the header, the footer and a table's
head `label`, and the page number a `readout`. A code block is a screen. `<!-- _class: lead -->` makes a title slide,
its `#` in the `headline` role, and `<!-- _class: invert -->` sets a slide on the dark theme's surface. The theme colors
no syntax: Marp Core 4 highlights code with highlight.js and Marp Core 5 with Shiki, so a deck that wants colored code
styles it in its own `<style>`. Put a mark on a slide as an image from `logo/`, as [Marks](01-marks.md) says
([the decision](../docs/decisions/1013-slides-are-a-marp-theme-and-the-email-and-the-theme-carry-every-value-written-out.md)).

## A Tool That Reads Design Tokens

Take `tokens/tokens.json`, in the Design Tokens Community Group format 2025.10. Primitives are at the top level, and the
semantic colors and shadows under `light` and `dark`. A token a tenant's colors change carries its CSS rule in
`$extensions["org.ncode.instrument"]`. A group that sets a tier names it there, and the groups inside it inherit it.

Take `tokens/tokens.resolver.json` for a tool that reads the Design Tokens Resolver Module 2025.10. It is one document
that references no other file. Its set `instrument` holds the tokens both themes share. Its modifier `theme`, `light` by
default or `dark`, puts that theme's semantic colors and shadows under the group `theme`, such as `theme.color.text`
([the decision](../docs/decisions/1011-the-design-tokens-resolver-file-is-one-self-contained-document-with-a-theme-modifier.md)).

## Icons

Take `icons/sprite.svg` beside `css/base.css`, and use an icon by its symbol, `i-<name>`:

```html
<svg class="icon" aria-hidden="true"><use href="brand/icons/sprite.svg#i-search"/></svg>
```

The sprite loads from the page's own origin, under `default-src 'self'`, and `.icon` gives the icon its size and
stroke. Take `icons/<name>.svg` for one icon alone, and `icons/icons.json` for a component that draws an icon's
shapes inline. Vendor `icons/LICENSE-Lucide.txt` with any icon from Lucide: [Icons](07-icons.md) says which they
are.

## A README, a Favicon, a Package Icon

[Marks](01-marks.md) says which file of `logo/ncode/` or `logo/identity/` each place takes, and how to name a file by
its address at a release's tag in a README.

## Vendor a Release

Take files from one tagged release, and prove in your own gate that they did not drift.

1. Copy [vendoring/vendor-brand.mjs](../vendoring/vendor-brand.mjs) into your repository. It is Node.js alone, with no
   packages, and adds nothing to your lockfile. Copy it unchanged: it starts with `// Copyright © NCode Group` and
   `// SPDX-License-Identifier: Apache-2.0`, so a header check takes it as it is, and it keeps the SHA-256 the
   release's `manifest.json` lists for it.
2. Beside it, write a `brand.lock.json` that names each file you take, where it goes and where it comes from in the
   release. Name the script itself too, so `--update` keeps it at the release's SHA-256 and `--check` holds it
   there. Take every file a stylesheet loads, here the six fonts `css/fonts.css` names, and each font family's
   license with its fonts:

   ```json
   {
     "version": "0.13.0",
     "files": {
       "vendor-brand.mjs": { "source": "vendoring/vendor-brand.mjs", "sha256": "" },
       "src/brand/tokens/tokens.css": { "source": "tokens/tokens.css", "sha256": "" },
       "src/brand/css/fonts.css": { "source": "css/fonts.css", "sha256": "" },
       "src/brand/fonts/instrument-sans-latin-wdth-normal.woff2": { "source": "fonts/instrument-sans-latin-wdth-normal.woff2", "sha256": "" },
       "src/brand/fonts/instrument-sans-latin-ext-wdth-normal.woff2": { "source": "fonts/instrument-sans-latin-ext-wdth-normal.woff2", "sha256": "" },
       "src/brand/fonts/instrument-sans-latin-wdth-italic.woff2": { "source": "fonts/instrument-sans-latin-wdth-italic.woff2", "sha256": "" },
       "src/brand/fonts/instrument-sans-latin-ext-wdth-italic.woff2": { "source": "fonts/instrument-sans-latin-ext-wdth-italic.woff2", "sha256": "" },
       "src/brand/fonts/martian-mono-latin-wdth-normal.woff2": { "source": "fonts/martian-mono-latin-wdth-normal.woff2", "sha256": "" },
       "src/brand/fonts/martian-mono-latin-ext-wdth-normal.woff2": { "source": "fonts/martian-mono-latin-ext-wdth-normal.woff2", "sha256": "" },
       "src/brand/fonts/OFL-Instrument-Sans.txt": { "source": "fonts/OFL-Instrument-Sans.txt", "sha256": "" },
       "src/brand/fonts/OFL-Martian-Mono.txt": { "source": "fonts/OFL-Martian-Mono.txt", "sha256": "" }
     }
   }
   ```

3. Run `node vendor-brand.mjs --update 0.13.0`. It needs the [GitHub CLI](https://cli.github.com), `gh`, signed in
   with `gh auth login`, or with `GH_TOKEN` in CI. It downloads the release's archive, `brand-0.13.0.tar.gz`, from
   the GitHub release `v0.13.0`, and has `gh attestation verify` prove its build provenance: signed by
   [publish.yml](../.github/workflows/publish.yml) for the tag `v0.13.0` on a GitHub-hosted runner. It refuses the
   archive unless the attestation names its SHA-256, its `manifest.json` is that version, and it holds every file
   the manifest lists, at the manifest's size and SHA-256, and nothing else. Only then does it write the files and
   pin each hash in the lock. A release never changes, so once the lock pins a version, it refuses a file of that
   version with another hash. It writes nothing outside the lock's folder, by a path or through a symbolic link.
   `--from <file>` reads the archive from a file instead, such as one you downloaded, and verifies it the same way.
4. Run `node vendor-brand.mjs --check` in your gate and in CI. It needs no network and no GitHub CLI, and fails,
   naming the file, when a vendored file is missing or differs from the lock.

To move to another release, run `--update` with its version, and review the diff of the vendored files in the pull
request: a value change shows there, line by line. [Versions and license](14-versions-and-license.md) says what each
kind of version number means.

To check an archive yourself, run
`gh attestation verify brand-0.13.0.tar.gz --repo NCodeGroup/brand --signer-workflow NCodeGroup/brand/.github/workflows/publish.yml`.
