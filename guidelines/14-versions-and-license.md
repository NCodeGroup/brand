# 14. Versions and License

## What a Version Number Promises

A release is a Git tag, `v<major>.<minor>.<patch>`, with a `manifest.json` that holds the SHA-256 of every file it
carries. Its public surface is the names, meanings and files a consumer depends on: the semantic tokens and their
custom properties, the classes of `css/base.css`, the exports of `tokens/tokens.mjs` and `tokens/derive.mjs`, the
files' paths, the typefaces and the marks. The version number says how that surface changed
([the decision](../docs/decisions/1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md)).

| Change | Version |
|---|---|
| Rename or remove a semantic token, a custom property, a class of `base.css` or an export of a module | Major |
| Move, rename or remove a released file, such as a logo's path | Major |
| Change what a token is for, or a derivation guard so a color that passed fails | Major |
| Replace a typeface, or drop a font file | Major |
| Redraw a mark | Major |
| Change a value: a color step, a radius, a duration, the neutral's hue | Minor, never a patch |
| Add a token, a file, a variant or a component | Minor |
| Change a primitive that no semantic token's value shows | Patch |
| Return a value to what the guide already says; regenerate a file with the same pixels; reword the guide | Patch |

A value change is never a patch, because the people who must look at their screens need the minor number to tell
them: nothing breaks, but screens look different, a consumer's screenshots change, and a contrast margin may narrow.
The contrast gate proves no pairing fell below its floor.

**Before 1.0.0** the major number stays at 0, as Semantic Versioning allows for a product still taking shape: a change
the table calls major raises the minor number, and so does every value change and every addition. The changelog then
describes the product as it is, not each change, and a rename needs no deprecation. Version 1.0.0 is released when
the first product ships on Instrument; from then on the table binds.

## How to Pin

Pin an exact version, never a range: vendor files from one tag and check them against its manifest
([Applying it](12-applying.md#vendor-a-release)), or name a file by its address at a tag. No tag moves, and there is
no moving `v1` tag. The changelog, [CHANGELOG.md](../CHANGELOG.md), names the tokens and files each release touches.

## Which License Covers What

| What | License |
|---|---|
| The code, the tokens, the stylesheets, the braces in `brace/`, NCode's icons in `icons/`, the derivation, the Material UI data, the vendoring script, the guide | Apache License 2.0, [LICENSE.txt](../LICENSE.txt). A brace alone is a part of the system, not a mark |
| The names NCode, NCode Group and NCode Identity, and the marks, every file in `logo/` | Trademarks of NCode Group; the marks' artwork is copyright NCode Group, all rights reserved. [TRADEMARKS.md](../TRADEMARKS.md) says how you may use them |
| Instrument Sans and Martian Mono, the files in `fonts/` | Copyright their authors, under the SIL Open Font License 1.1, in `fonts/OFL-Instrument-Sans.txt` and `fonts/OFL-Martian-Mono.txt` |
| The icons in `icons/` taken from Lucide, those `icons/icons.json` gives the source `lucide` | Copyright Lucide Icons and Contributors under the ISC License, and those Lucide derives from Feather also copyright Cole Bemis under the MIT License, both in `icons/LICENSE-Lucide.txt` |
| The wordmark's outlines, inside the logo files | Part of the marks, as the row above says. They were drawn from Inter Display, copyright The Inter Project Authors and licensed under the SIL Open Font License 1.1, which is credited here as a courtesy: no file needs or carries the font |

Other NCode repositories publish copies of the marks under their own licenses, such as NCodeGroup/project-template's
`brand/` folder under its MIT License from v0.82.0 on, and those copies stay under it; [TRADEMARKS.md](../TRADEMARKS.md)
lists them.
