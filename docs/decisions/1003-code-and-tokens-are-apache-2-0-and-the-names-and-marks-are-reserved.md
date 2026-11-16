# 1003. Code and tokens are Apache-2.0, and the names and marks are reserved

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

The repository was created under the Apache License 2.0, which covers code. It also holds the names and marks of NCode
Group, which identify the source of NCode's products: a license that let anyone alter them, or use them as their own
logo, would let a modified product pass as NCode's. The fonts it carries have a license of their own. Copies of the
logo kit were published earlier under the MIT License, in NCodeGroup/project-template's `brand/` folder, from v0.93.0
on.

## Decision

- The code, the tokens, the stylesheets, the themes and their data, the derivation, the vendoring script and the guide
  are under the Apache License 2.0, in `LICENSE.txt`.
- The names NCode, NCode Group and NCode Identity, and the marks, every file in `logo/`, are copyright NCode Group, all
  rights reserved, under the usage policy in `TRADEMARKS.md`. Anyone may use the unmodified marks to refer to NCode
  projects: in articles, talks, package listings and "works with" statements. Nobody may alter them, use them as their
  own logo, or imply endorsement. A modified distribution replaces the name and the marks. Anything else is asked in
  the repository's issues.
- The fonts keep the SIL Open Font License 1.1, with their license files next to them in `fonts/`.
- The copies published earlier under the MIT License stay under the license they were published with.

A note in `logo/README.md` and in `README.md` says which license covers what.

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
