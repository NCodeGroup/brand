# 1016. Inline code is a tint without an edge, and a run-in label is italic

- **Status:** Accepted
- **Date:** 2026-11-19
- **Deciders:** NCode Group

## Context

Long-form documentation, such as NCode.Buffers' reference pages, names dozens of types and members on one screen.
Drawn with an edge, a hairline and a plate's radius around a sunken fill, each one is a box, and a paragraph that
names many reads as a row of boxes, louder than its text. In the brand's grammar a hairline edge marks a part of the
case, a plate; a value is marked by its face, Martian Mono. The same pages open their examples with run-in labels,
such as *You write* and *What happens:*. Set in bold, a column of them outweighs the sentences they introduce.

Instrument Sans has a true italic in the package `src/fonts/fonts.lock.json` pins,
`@fontsource-variable/instrument-sans` 5.3.0 (read 2026-11-19). `css/base.css` sets `font-synthesis: none`, so an
italic needs files of its own. A code block is a screen: a deep field of the secondary hue, the same in both themes,
and the darkest block on a light page.

## Decision

Inline code is Martian Mono on `--nc-color-code-tint`, with no edge. A run-in label in prose is set in Instrument
Sans italic, never bold. A code block stays a screen in both themes.

- `--nc-color-code-tint` is a semantic color role: the text color thinned, stone 925 at 6% in the light theme and
  stone 100 at 8% in the dark. It is translucent, so it is a little darker than every light surface and a little
  lighter than every dark one. The contrast gate measures text on it over every surface
  ([1006](1006-contrast-is-computed-in-node-and-the-tenant-derivation-guards-it.md)).
- `css/base.css`'s `:not(pre) > code`, `css/starlight.css`'s `--sl-color-bg-inline-code` and the slides' inline code
  read it. Prose, tables and alerts draw inline code alike.
- The font lock pins `instrument-sans-latin-wdth-italic.woff2` and `instrument-sans-latin-ext-wdth-italic.woff2` from
  the tarball it pins for the roman, and `css/fonts.css` names them with `font-style: italic`. The slides embed them.
- The guide states both rules in its typography section and sets its own run-in labels in italic. `lib/markdown.mjs`
  renders `*text*` as `<em>`.
- In long-form text, a listing holds the lines its paragraph explains, and a single name goes in the sentence as
  inline code.

## Options considered

- *A tint without an edge* (chosen). The face marks the value, and the tint keeps the extent of a span such as
  `Span<byte>` visible without drawing a part. One look serves prose, tables and alerts.
- *An edge only in tables and other dense places.* Two looks for one element, chosen by a context a stylesheet
  can't always see, such as Starlight's markup. A table's cells already have edges.
- *No tint.* Martian Mono is distinct from Instrument Sans, but a span loses its extent, and with it where a name
  with spaces or punctuation ends.
- *`surface-sunken` without an edge.* An opaque fill is lighter than the light page and vanishes on a table's
  sunken head. A translucent tint shows on every ground.
- *A synthesized italic.* `font-synthesis: none` refuses it, and a slanted roman draws worse letters than the true
  italic.
- *A light code block in the light theme.* The screen would become two things: the syntax theme would split into a
  light and a dark one ([1012](1012-the-syntax-theme-names-the-screens-tokens-rather-than-their-colors.md)), and
  every screen role would need a second calibration for every tenant's color. A listing is copied, not read as
  prose, so standing apart from the text is its job.

## Consequences

- A new role, two font files and a changed look are a minor version
  ([1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md)).
- A consumer that vendors `css/fonts.css` takes the two italic files with it, or its italics are set upright.
- A documentation toolchain that restyles Starlight's inline code drops its border to follow the guide.
- The slide theme embeds two more fonts, about 110 kB of base64.
- A code block keeps the weight of a screen. A page that needs it lighter shows fewer lines, not a paler screen.

## References

- [src/css/base.css](../../src/css/base.css), [src/css/starlight.css](../../src/css/starlight.css),
  [src/fonts/fonts.lock.json](../../src/fonts/fonts.lock.json)
- [The typography guide](../../guidelines/03-typography.md), its section In Running Text
- [1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md),
  [1006](1006-contrast-is-computed-in-node-and-the-tenant-derivation-guards-it.md),
  [1012](1012-the-syntax-theme-names-the-screens-tokens-rather-than-their-colors.md),
  [1013](1013-slides-are-a-marp-theme-and-the-email-and-the-theme-carry-every-value-written-out.md)
- [Issue #35](https://github.com/NCodeGroup/brand/issues/35),
  [NCodeGroup/Buffers#114](https://github.com/NCodeGroup/Buffers/pull/114)
