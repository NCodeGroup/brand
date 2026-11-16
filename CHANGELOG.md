# Changelog

What NCode Brand gives its consumers, in the [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) format.
NCode Brand is pre-release: until version 1.0.0, the Unreleased section describes the product as it is, and a release's
notes are that section.

## [Unreleased]

### Added

- Instrument, NCode's look and feel, as design tokens from one source, `src/tokens.source.json`:
  `tokens/tokens.css` with every custom property prefixed `--nc-`, each color written once as `light-dark()`, a
  tenant's colors derived in CSS from `--nc-brand` and `--nc-brand-secondary`, and a static palette for a browser
  without 2024 CSS; `tokens/tokens.static.css`, every color resolved for NCode's own brand; `tokens/tokens.json` in the
  Design Tokens Community Group format 2025.10; and `tokens/tokens.mjs` with `tokens.d.mts`, the public tokens as a
  typed ES module.
- Two tiers: the semantic tokens are public, and the color ramps and the steps of the type scale are private
  primitives. Each type role carries its width and letter spacing as `--nc-type-<role>-stretch` and `-tracking`.
- `tokens/derive.mjs` with `derive.d.mts` and `derive.vectors.json`: a tenant's primary and secondary color derive every
  color they touch, light and dark, with each pairing held at its contrast floor for any color, in one module that
  imports nothing.
- `css/base.css`, the element and component styles: keys, wells, lamps, screens, the brace, the boundary plate, the
  display, alerts, tables, dialogs and the page layouts of the console, the sign-in pages, documentation and product
  pages. `css/fonts.css`, the `@font-face` rules. `css/starlight.css`, Starlight's custom properties from the tokens.
- Instrument Sans and Martian Mono, variable, in their Latin and Latin Extended subsets, with their SIL Open Font
  License 1.1 texts, pinned by SHA-256 in `src/fonts/fonts.lock.json`.
- The brace, drawn from the mark's construction: `brace/brace-mark.svg`, the stretching `brace-sm.svg`, `brace-md.svg`
  and `brace-lg.svg`, and `brace/brace.json`, the same pieces as path data.
- The `{N}` logo kit in `logo/ncode/`: the mark, the lockup and the tiles as SVG and PNG, the favicon set, and the files
  NuGet, GitHub, GitLab, My Apps, profile pictures, badges, link previews, banners and Windows ask for, in NCode Blue,
  NCode Blue Light and NCode Navy from the blue ramp; `logo/ncode/outlines.json`, the mark and the lockup as path data.
- `mui/instrument.json`: the palette, typography, shape, spacing, shadows, motion and breakpoints a Material UI theme
  takes, as plain data.
- `manifest.json`, the size and SHA-256 of every released file, and `vendoring/vendor-brand.mjs`, which copies the
  files a consumer's `brand.lock.json` names from a tagged release and checks them offline.
- The guide in `guidelines/`: marks, color, typography, shape and the brace, layout, components, icons, motion, voice,
  accessibility, products and tenants, applying it, the token reference, and versions and license.
- Nine specimen pages in `specimens/`, built on the generated files alone: the foundations, documentation, a landing
  page, a product page, sign-in, consent, the console, settings, and the states between screens.
- `npm run build`, which writes every generated file; `npm run check`, which fails when a committed file differs from
  what the sources give; and a contrast gate that fails the build when a pairing is below WCAG 2.2 AA.
- `TRADEMARKS.md`: how to use NCode's names and marks.

### Security

- `build.mjs` writes and removes real files inside the repository alone: it refuses a symbolic link in a folder it
  writes, and a font name in `src/fonts/fonts.lock.json` with a path in it.
- `vendoring/vendor-brand.mjs` verifies every file against the release's manifest before it writes any, refuses a
  release of another version, and refuses a lock path that leaves its folder.
- Every specimen page runs under `Content-Security-Policy: default-src 'self'`: no inline style, no `data:` address and
  no request to another origin.

[Unreleased]: https://github.com/NCodeGroup/brand/commits/main
