# 1005. This repository ships data and stylesheets, never a framework's theme code

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

Two consumers render the brand through a framework. NCode Identity's front end builds a Material UI 9.5 theme, whose
`createTheme` call and component overrides are typed against one Material UI major version and tested under the
application's own coverage gate. The documentation toolchain styles Astro Starlight, whose sidebar, code frames and
callouts are markup of one Starlight version. A theme published from this repository would tie each brand release to
those versions: a Material UI or Starlight upgrade in a consumer would wait on a brand release, and the theme would sit
outside the consumer's tests.

## Decision

This repository publishes data and stylesheets that hold no framework code, and the theme lives in the product that
runs it.

- For Material UI: `mui/instrument.json` holds the palette, typography, shape, spacing, shadows, motion and
  breakpoints as plain values; `tokens/tokens.mjs` the public tokens; `tokens/derive.mjs` the tenant derivation. The
  application's theme reads them.
- For Starlight: `css/starlight.css` sets Starlight's documented custom properties, `--sl-*`, from the tokens. The rules
  that restyle Starlight's markup stay in the documentation toolchain, beside the Starlight version they were written
  for.

## Options considered

- **Data here, theme code in the consumer** (chosen). An upgrade of the framework and the fix of its theme land in one
  pull request, under the consumer's tests; what must not fork, the values and the derivation, comes from here with
  hashes.
- **A theme package published from here.** It adds a runtime dependency to the consumer, a React and Material UI
  toolchain to this repository, and a release lag to every framework upgrade.
- **A copy of the theme in each consumer, values included.** The values would drift; vendoring the data prevents it.

## Consequences

- A second product on Material UI copies the first one's theme code, or a package is made then.
- `css/starlight.css` changes only when Starlight's custom properties or the tokens do.
- The guide shows what each part looks like and when to use it; the consumer's components implement it.

## References

- [mui/instrument.json](../../mui/instrument.json), [css/starlight.css](../../src/css/starlight.css)
- [The guide: applying it](../../guidelines/12-applying.md)
- [1001](1001-consumers-vendor-files-from-a-tagged-release-and-check-their-hashes.md), how consumers take the files
