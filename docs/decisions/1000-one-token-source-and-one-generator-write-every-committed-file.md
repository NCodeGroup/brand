# 1000. One token source, and one generator writes every committed file

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

NCode's look and feel reaches its consumers as many files: CSS custom properties, a Design Tokens file, a typed
module, resolved values, stylesheets, fonts, the braces, the logo kit and data for a Material UI theme. Each must agree
with every other, and a consumer must be able to name a file by a stable address at a release's tag, as a README does
with a logo. A value written in two places drifts: the logo kit's three blues and the token ramp, or a contrast table
and the colors it measures.

## Decision

Every token is written once, in `src/tokens.source.json`. Everything else a release carries is generated from the
sources in `src/` by one Node.js script, `build.mjs`, and committed. `npm run build` writes; `npm run check` writes
nothing and fails, naming each file, when a committed file is missing, differs from what the sources give, or is a file
the generator does not write. The tables of the guide and of `specimens/foundations.html` are generated blocks inside
hand-written files, between `generated:` markers; the build and the check fail, naming the block, when a block the
generator writes is in no file or twice in one. The generator writes and removes real files inside the repository
alone, and refuses a symbolic link where it writes. The generator and its tests use Node.js built-ins alone: the
repository has no npm dependency.

- Edit `src/`, `guidelines/` and `specimens/`, outside the generated blocks; never a file in `tokens/`, `css/`,
  `fonts/`, `brace/`, `logo/`, `mui/` or `manifest.json`.
- The logo kit takes its colors from the blue ramp, so the marks and the tokens cannot disagree.
- An image whose pixels are unchanged is kept, so a file another encoder wrote does not change while its picture stays.
- The check runs in CI before the build, and is the Landing section's gate.

## Options considered

- **Generated output committed** (chosen). A file has a stable address at a tag, a reviewer and a vendoring consumer
  see in a pull request exactly what changed, and the check proves the committed files are what the sources give.
- **Generated output built at release time only.** The repository stays smaller, but a README cannot name a file at a
  tag, and a reviewer sees the source change without its effect.
- **The Design Tokens file as the source.** The format, 2025.10, has no themes in a token file, no derivation from a
  tenant's input, no width axis and no `em`. It is written as an output, which a design tool can read.
- **A token tool such as Style Dictionary or Terrazzo.** Each is a dependency to pin and keep current, for output the
  generator writes in a few hundred lines.

## Consequences

- A change to a token is one edit and a build; the pull request shows every file it touches.
- The repository holds generated files, about 1 MB of them, most of it the logo kit's images.
- A generated file edited by hand fails the check, in the gate and in CI.
- The guide's numbers stay true: its tables are regenerated with the tokens.

## References

- [build.mjs](../../build.mjs), [src/tokens.source.json](../../src/tokens.source.json)
- [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/), read 2026-11-15
- [1001](1001-consumers-vendor-files-from-a-tagged-release-and-check-their-hashes.md), how the files reach consumers
