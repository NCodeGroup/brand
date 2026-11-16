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
reading voice there too. Starlight sets no size on running text, which keeps the browser's 16 pixels. Its
`--sl-content-width`, 50 rem in `css/starlight.css`, bounds the content panel, listings and tables included, not the
measure of running text. In the toolchain's own rules, set running text in the `reading` role, 17 pixels, on the 41 rem
`--nc-measure`, as `.prose` does in `css/base.css`.

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
- Import `css/fonts.css` once in the application's entry: a bundler emits the four font files beside it, and a page
  served under `font-src 'self'` loads them. Vendor each family's license, `fonts/OFL-Instrument-Sans.txt` and
  `fonts/OFL-Martian-Mono.txt`, with its font files: the SIL Open Font License asks every copy of a font to carry it.

## An Email, or a Page Without 2024 CSS

Take `tokens/tokens.static.css`: every token with its color written out, light at the root and dark by the theme, and
no `light-dark()`, relative color or `color-mix()`. It derives nothing, so a tenant's colors come from
`tokens/derive.mjs`'s `customProperties()`. An email client reads custom properties poorly: write the resolved values
inline from `tokens/tokens.mjs` instead.

## A Tool That Reads Design Tokens

Take `tokens/tokens.json`, in the Design Tokens Community Group format 2025.10. Primitives are at the top level, and the
semantic colors and shadows under `light` and `dark`. A token a tenant's colors change carries its CSS rule in
`$extensions["org.ncode.instrument"]`. A group that sets a tier names it there, and the groups inside it inherit it.

## A README, a Favicon, a Package Icon

[Marks](01-marks.md) says which file of `logo/ncode/` or `logo/identity/` each place takes, and how to name a file by
its address at a release's tag in a README.

## Vendor a Release

Take files from one tagged release, and prove in your own gate that they did not drift.

1. Copy [vendoring/vendor-brand.mjs](../vendoring/vendor-brand.mjs) into your repository. It is Node.js alone, with no
   packages, and adds nothing to your lockfile.
2. Beside it, write a `brand.lock.json` that names each file you take, where it goes and where it comes from in the
   release. Take every file a stylesheet loads, here the four fonts `css/fonts.css` names, and each font family's
   license with its fonts:

   ```json
   {
     "version": "0.1.0",
     "files": {
       "src/brand/tokens/tokens.css": { "source": "tokens/tokens.css", "sha256": "" },
       "src/brand/css/fonts.css": { "source": "css/fonts.css", "sha256": "" },
       "src/brand/fonts/instrument-sans-latin-wdth-normal.woff2": { "source": "fonts/instrument-sans-latin-wdth-normal.woff2", "sha256": "" },
       "src/brand/fonts/instrument-sans-latin-ext-wdth-normal.woff2": { "source": "fonts/instrument-sans-latin-ext-wdth-normal.woff2", "sha256": "" },
       "src/brand/fonts/martian-mono-latin-wdth-normal.woff2": { "source": "fonts/martian-mono-latin-wdth-normal.woff2", "sha256": "" },
       "src/brand/fonts/martian-mono-latin-ext-wdth-normal.woff2": { "source": "fonts/martian-mono-latin-ext-wdth-normal.woff2", "sha256": "" },
       "src/brand/fonts/OFL-Instrument-Sans.txt": { "source": "fonts/OFL-Instrument-Sans.txt", "sha256": "" },
       "src/brand/fonts/OFL-Martian-Mono.txt": { "source": "fonts/OFL-Martian-Mono.txt", "sha256": "" }
     }
   }
   ```

3. Run `node vendor-brand.mjs --update 0.1.0`. It reads that release's `manifest.json` at the tag `v0.1.0`, over https
   with no redirect, refuses a release of another version and a file whose SHA-256 is not the manifest's, then writes
   the files and pins each hash in the lock. A release never changes, so once the lock pins a version, it refuses a
   file of that version with another hash. It writes nothing outside the lock's folder, by a path or through a
   symbolic link. `--from <folder>` reads a release from a folder instead, such as a clone at the tag.
4. Run `node vendor-brand.mjs --check` in your gate and in CI. It needs no network, and fails, naming the file, when a
   vendored file is missing or differs from the lock.

To move to another release, run `--update` with its version, and review the diff of the vendored files in the pull
request: a value change shows there, line by line. [Versions and license](14-versions-and-license.md) says what each
kind of version number means.
