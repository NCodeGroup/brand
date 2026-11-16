# 1003. Code and tokens are Apache-2.0, and the names and marks are reserved

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

The repository was created under the Apache License 2.0, which covers code. It also holds the names and marks of NCode
Group, which identify the source of NCode's products: a license that let anyone alter them, or use them as their own
logo, would let a modified product pass as NCode's. The fonts it carries have a license of their own. Other NCode
repositories publish copies of the marks under their own licenses: NCodeGroup/project-template the `{N}` kit in its
`brand/` folder under the MIT License from v0.82.0 on, and its package icon, which every project made from it
carries; NCodeGroup/identity the `{id}` kit under the Apache License 2.0.

## Decision

- The code, the tokens, the stylesheets, the braces in `brace/`, the themes and their data, the derivation, the
  vendoring script and the guide are under the Apache License 2.0, in `LICENSE.txt`. A brace alone is a part of the
  system, which the stylesheets draw, and no mark.
- The names NCode, NCode Group and NCode Identity and the marks are trademarks of NCode Group, and the marks' artwork,
  every file in `logo/`, is copyright NCode Group, all rights reserved, under the usage policy in `TRADEMARKS.md`.
  Anyone may use the unmodified marks to refer to NCode projects: in articles, talks, package listings and "works
  with" statements. Nobody may alter them, use them as their own logo, or imply endorsement. A modified distribution
  replaces the name and the marks. Anything else is asked in the repository's issues.
- The fonts keep the SIL Open Font License 1.1, with their license files next to them in `fonts/`.
- The copies published under another license stay under the license they were published with; `TRADEMARKS.md` lists
  them.

A note in `logo/README.md`, in `README.md` and in `COPYRIGHT.txt`, which every release carries, says which license
covers what.

## Options considered

- **Code under Apache-2.0, marks reserved with a usage policy** (chosen). It is how open-source projects with a
  trademark commonly work, and Apache-2.0's section 6 already grants no trademark rights.
- **Everything under Apache-2.0.** Simple, but it lets anyone alter the marks and ship them, and section 6 would leave
  the marks' status unclear.
- **Marks under a Creative Commons license.** Licenses copying, not identity: it would still not stop a modified
  product from carrying the marks.

## Consequences

- A fork can reuse the code and the tokens, and replaces the name and the marks.
- A writer or a package listing uses the marks without asking.
- Each file's license is stated where a reader finds it: `LICENSE.txt`, `TRADEMARKS.md`, the fonts' OFL files.

## References

- [TRADEMARKS.md](../../TRADEMARKS.md), [LICENSE.txt](../../LICENSE.txt)
- [Apache License 2.0, section 6](https://www.apache.org/licenses/LICENSE-2.0#trademarks)
- [The guide: versions and license](../../guidelines/14-versions-and-license.md)
