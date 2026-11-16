# 1004. A rename is a major version, and a value change is never a patch

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

A design system's public surface is names, meanings and files: a consumer's build breaks when a token is renamed or a
file moves, and its screens change when a value does. Semantic Versioning describes the first; it says nothing of the
second, which is the change a consumer most needs to be told about, because its screenshots and visual tests change
and a contrast margin may narrow. NCode Brand is pre-release: AGENTS.md's Landing section says
`pre-release: untracked` until the first product ships on it.

## Decision

The version is `package.json`'s `version`, which the generator stamps into the generated files and `manifest.json`,
and a release is the tag `v<version>`.

- **Major**: rename or remove a semantic token, a custom property, a class of `css/base.css` or an export of a module;
  move, rename or remove a released file; change what a token is for, or a derivation guard so a color that passed
  fails; replace a typeface or drop a font file; redraw a mark.
- **Minor**: change a value, such as a color step, a radius, a duration or the neutral's hue; add a token, a file, a
  variant or a component. A value change is never a patch.
- **Patch**: change a primitive that no semantic token's value shows; return a value to what the guide already says;
  regenerate a file with the same pixels; reword the guide.

Before 1.0.0 the major number stays at 0, as Semantic Versioning allows: a change the rule calls major raises the
minor number, and so does every value change and every addition. The changelog then describes the product as it is,
as project-template ADR-0015 says. Version 1.0.0 is released when the first product ships on the brand.

## Options considered

- **Value changes as minor** (chosen). The minor number tells a consumer to look at its screens; nothing breaks.
- **Value changes as patches.** Semantic Versioning permits it, since no interface changes, but a consumer that takes
  patches without review would see its screens change unannounced.
- **Every change as major.** Honest about appearance, but it erases the difference between a rename, which breaks a
  build, and a new shade, which does not.

## Consequences

- A consumer can take patches without looking, and reviews a minor version's screens.
- The changelog names the tokens and files a release touches, and gives both values of a changed one.
- After 1.0.0 a public token that is to be renamed is deprecated first: kept, marked `$deprecated` in
  `tokens/tokens.json`, and removed in the next major.

## References

- [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html), item 4 on major version zero
- [project-template ADR-0015](project-template/0015-a-pre-release-project-describes-the-product-as-it-is.md)
- [The guide: versions and license](../../guidelines/14-versions-and-license.md)
