# Changelog

What NCode Brand gives its consumers, in the [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) format. A
release's notes are the Unreleased section as it stands.
Until the first stable release, the [Unreleased] section describes the product as it is, not its changes.

## [Unreleased]

### Added

- Instrument, NCode's look and feel, as design tokens from one source, `src/tokens.source.json`:
  `tokens/tokens.css` with every custom property prefixed `--nc-`, each color written once, as `light-dark()` where
  the themes differ, a tenant's colors derived in CSS from `--nc-brand` and `--nc-brand-secondary`, the light theme
  on paper, and a static palette for a browser without 2024 CSS; `tokens/tokens.static.css`, every color resolved for
  NCode's own brand; `tokens/tokens.json` in the Design Tokens Community Group format 2025.10; and
  `tokens/tokens.mjs` with `tokens.d.mts`, the public tokens as a typed ES module.
- `tokens/tokens.resolver.json`: the same tokens as one document of the Design Tokens Resolver Module 2025.10 that
  references no other file. Its set `instrument` holds the tokens both themes share, and its modifier `theme`, `light`
  by default or `dark`, puts that theme's semantic colors and shadows under the group `theme`, such as
  `theme.color.text` ([#6](https://github.com/NCodeGroup/brand/issues/6),
  [ADR-1011](docs/decisions/1011-the-design-tokens-resolver-file-is-one-self-contained-document-with-a-theme-modifier.md)).
- Two tiers: the semantic tokens are public, and the color ramps and the steps of the type scale are private
  primitives. Each type role carries its width and letter spacing as `--nc-type-<role>-stretch` and `-tracking`, and
  the label role its case as `--nc-type-label-case`.
- `tokens/derive.mjs` with `derive.d.mts` and `derive.vectors.json`: a tenant's primary and secondary color derive every
  color they touch, light and dark, with every pairing it guards held at its contrast floor for any color, in one
  module that imports nothing. A key's face lighter than about OKLCH lightness 0.75 stays faint on a light plate, as
  the guide's Products and tenants section says.
- `css/base.css`, the element and component styles: keys, wells, lamps, screens, the brace, the boundary plate, the
  display, alerts, tables, dialogs and the page layouts of the console, the sign-in pages, documentation and product
  pages. `css/fonts.css`, the `@font-face` rules. `css/starlight.css`, Starlight's custom properties from the tokens.
- `syntax/instrument-screen.json`: the syntax theme of a code block on a screen, a VS Code color theme for Expressive
  Code. It colors keywords `--nc-color-screen-lit`, types and members `--nc-color-on-screen`, comments
  `--nc-color-on-screen-muted`, literals `--nc-color-screen-hot` and the rest `--nc-color-on-screen-secondary`, each as
  the `var()` of the token, so `tokens/tokens.css` resolves it for the brand in force. One theme serves both page
  themes ([#6](https://github.com/NCodeGroup/brand/issues/6),
  [ADR-1012](docs/decisions/1012-the-syntax-theme-names-the-screens-tokens-rather-than-their-colors.md)).
- `email/instrument.html`: an HTML email in the light theme with every value written inline but
  the key's and the screen's colors, in one column 600 pixels wide laid out in tables: the lockup, a heading, a
  paragraph, a primary key, a code on a screen and a muted footer. It has no `<style>` element, custom property or web
  font. The sending application's template engine fills each slot in double braces, such as `{{ action_url }}`, and
  fills the key's and the screen's colors from `deriveBrand()` in `tokens/derive.mjs`, NCode's own colors or a tenant's
  ([#21](https://github.com/NCodeGroup/brand/issues/21),
  [ADR-1013](docs/decisions/1013-slides-are-a-marp-theme-and-the-email-and-the-theme-carry-every-value-written-out.md)).
- `slides/instrument.css`: the Marp theme `instrument`, a slide of 1280 by 720 pixels with every value written out, the
  light theme by default and the dark one under the class `invert`, a title slide under the class `lead`, code blocks
  on a screen, and Instrument Sans and Martian Mono embedded as data. `build.mjs` writes it and the email from
  `src/slides/` and `src/email/` with `lib/templates.mjs`
  ([#21](https://github.com/NCodeGroup/brand/issues/21),
  [ADR-1013](docs/decisions/1013-slides-are-a-marp-theme-and-the-email-and-the-theme-carry-every-value-written-out.md)).
- Instrument Sans and Martian Mono, variable, in their Latin and Latin Extended subsets, with their SIL Open Font
  License 1.1 texts, pinned by SHA-256 in `src/fonts/fonts.lock.json`. `tools/refresh-fonts.mjs` copies each file from
  the npm tarball the lock pins, once the tarball matches the lock's integrity and the file its SHA-256. With `--pin`,
  it pins the files of a release the lock moves to ([#6](https://github.com/NCodeGroup/brand/issues/6)).
- The brace, drawn from the mark's construction: `brace/brace-mark.svg`, the stretching `brace-sm.svg`, `brace-md.svg`
  and `brace-lg.svg`, and `brace/brace.json`, the same pieces as path data.
- The icon set in `icons/`: NCode's own 41 drawings and 24 icons of Lucide 1.72.0, restyled onto the same 16-unit
  grid with a stroke of 1.5, square caps and miter joins. Each icon is `icons/<name>.svg`, a symbol `i-<name>` in
  `icons/sprite.svg` and its shapes in `icons/icons.json`, with a line that stays 1.5 pixels at every size.
  `build.mjs` draws them from `src/icons/`, where `src/icons/lucide.lock.json` pins each Lucide file by SHA-256, and
  each specimen page takes its icons from the set, and `specimens/foundations.html` shows every icon at 16 and
  20 pixels. `icons/LICENSE-Lucide.txt` holds Lucide's ISC and MIT notices
  ([#3](https://github.com/NCodeGroup/brand/issues/3),
  [ADR-1008](docs/decisions/1008-the-icon-set-is-ncodes-own-drawings-and-a-pinned-lucide-subset-restyled-to-one-grid.md)).
- The `{N}` logo kit in `logo/ncode/`: the mark, the lockup and the tiles as SVG and PNG, the favicon set, and the files
  NuGet, GitHub, GitLab, My Apps, profile pictures, badges, link previews, banners and Windows ask for, in NCode Blue,
  NCode Blue Light and NCode Navy from the blue ramp; `logo/ncode/outlines.json`, the mark and the lockup as path data.
- The `{id}` logo kit in `logo/identity/`, NCode Identity's mark: the files of the `{N}` kit under `ncode-identity-`
  names, a stacked lockup in `lockup/ncode-identity-lockup-stacked-*`, and link previews that carry the descriptor
  "OpenID Connect and OAuth 2.x for .NET"; `logo/identity/outlines.json`, the mark and both lockups as path data.
  `build.mjs` draws it from `src/logo/identity.json` with the code that draws the `{N}` kit
  ([#2](https://github.com/NCodeGroup/brand/issues/2),
  [ADR-1007](docs/decisions/1007-every-ncode-marks-kit-is-drawn-here-by-one-kit-writer.md)).
- `mui/instrument.json`: the palette, typography, shape, spacing, shadows, motion and breakpoints a Material UI theme
  takes, as plain data.
- `manifest.json`, the size and SHA-256 of every released file, and `vendoring/vendor-brand.mjs`, which copies the
  files a consumer's `brand.lock.json` names from a release's archive and checks them offline.
- Each release's archive, `brand-<version>.tar.gz`: `manifest.json` and every file it lists, packed by
  `node build.mjs --archive <folder>` from the tagged commit and attached to the GitHub release by
  `.github/workflows/publish.yml` once a maintainer approves its `release` environment, with its build provenance
  attestation and that attestation's bundle, `v<version>.intoto.jsonl`
  ([#5](https://github.com/NCodeGroup/brand/issues/5), [#16](https://github.com/NCodeGroup/brand/issues/16),
  [ADR-1009](docs/decisions/1009-a-release-carries-an-attested-archive-and-vendor-brand-verifies-it-before-writing.md)).
- The guide in `guidelines/`: marks, color, typography, shape and the brace, layout, components, icons, motion, voice,
  accessibility, products and tenants, applying it, the token reference, and versions and license.
- Nine specimen pages in `specimens/`, built on the generated files alone: the foundations, documentation, a landing
  page, a product page, sign-in, consent, the console, settings, and the states between screens. Each lays out for a
  phone 390 pixels wide without scrolling sideways, `foundations.html` included
  ([#4](https://github.com/NCodeGroup/brand/issues/4)).
- The guide and the specimens as a website at <https://ncodegroup.github.io/brand/>: `build.mjs` renders each page of
  `guidelines/` into `guide/<name>.html`, and `README.md` into `guide/index.html`, in the documentation scene of
  `css/base.css` with `guide/guide.css`, and writes `index.html`, which opens the guide.
  `.github/workflows/pages.yml` runs `npm run check` and publishes `index.html`, `guide/`, `specimens/` and the
  folders their pages load to GitHub Pages on each push to `main`, building nothing. A release's archive carries none
  of the site's own files ([#4](https://github.com/NCodeGroup/brand/issues/4),
  [ADR-1010](docs/decisions/1010-the-guide-and-the-specimens-are-published-on-github-pages-from-committed-files.md)).
- `npm run build`, which writes every generated file; `npm run check`, which fails when a committed file differs from
  what the sources give; and a contrast gate that fails the build when a pairing is below WCAG 2.2 AA.
- `TRADEMARKS.md`: how to use NCode's names and marks.

### Security

- `build.mjs` writes and removes real files inside the repository alone: it refuses a symbolic link in a folder it
  writes, and a font name in `src/fonts/fonts.lock.json` or an icon name in `src/icons/lucide.lock.json` with a
  path in it.
- `vendoring/vendor-brand.mjs --update` downloads a release's archive with the GitHub CLI and refuses it unless
  `gh attestation verify` proves that `.github/workflows/publish.yml` built it for the release's tag on a
  GitHub-hosted runner and the attestation names the archive's SHA-256. It refuses an archive that holds a file
  the manifest does not list, lacks one it lists or holds one of another size or hash, and checks every
  destination, before it writes any file. It refuses a release of another version and, once the lock pins a
  version, a file of it with another hash. It bounds the archive to 64 MiB packed and 256 MiB unpacked, and refuses
  a lock path that leaves its folder, by its name or through a symbolic link
  ([#5](https://github.com/NCodeGroup/brand/issues/5),
  [ADR-1009](docs/decisions/1009-a-release-carries-an-attested-archive-and-vendor-brand-verifies-it-before-writing.md)).
- Every specimen page and every page of the guide runs under `Content-Security-Policy: default-src 'self'`: no inline
  style, no `data:` address and no request to another origin. Each states the policy,
  `default-src 'self'; base-uri 'none'; form-action 'self'`, in a `<meta>` element, so it holds on GitHub Pages, which
  sends no such header ([#4](https://github.com/NCodeGroup/brand/issues/4)).
- `.github/workflows/pin-watch.yml` runs `tools/pin-watch.mjs` every Monday: for a Lucide or Fontsource release newer
  than `src/icons/lucide.lock.json` or `src/fonts/fonts.lock.json` pins and at least three days old, it keeps one open
  issue per lock, labeled `pin-update`, until the lock pins that release
  ([#13](https://github.com/NCodeGroup/brand/issues/13)).
- `.github/workflows/pages.yml` pins every action by its commit SHA. Its job that assembles the site reads the
  repository with `contents: read` alone, and only its deploy job holds `pages: write` and `id-token: write`
  ([#4](https://github.com/NCodeGroup/brand/issues/4),
  [ADR-1010](docs/decisions/1010-the-guide-and-the-specimens-are-published-on-github-pages-from-committed-files.md)).

