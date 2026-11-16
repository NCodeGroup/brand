# NCode Logo Kit

`ncode/` holds the NCode mark, `{N}`: N for NCode, inside the curly braces of code, as vector masters and as the PNG
and ICO files each place it appears in asks for. `ncode/outlines.json` holds the same drawing as path data, for a page
or a component that draws the mark inline. [The guide's Marks section](../guidelines/01-marks.md) says which file is
for what, and how to use them.

build.mjs draws every file here from [src/logo/ncode.json](../src/logo/ncode.json) and the blue ramp of
[src/tokens.source.json](../src/tokens.source.json). Never edit a file here: change the source and run
`npm run build`.

## License

The marks are not under this repository's Apache License 2.0. They are copyright NCode Group, all rights reserved, and
[TRADEMARKS.md](../TRADEMARKS.md) says how you may use them: unmodified, to refer to an NCode project, without asking.

Copies of this kit published earlier in NCodeGroup/project-template, in its `brand/` folder from v0.93.0 on, were
released under that repository's MIT License, and those copies stay under it.

The wordmark is Inter Display Medium, converted to outlines, so no file here needs or contains the font. Inter is
copyright The Inter Project Authors and licensed under the SIL Open Font License 1.1.
