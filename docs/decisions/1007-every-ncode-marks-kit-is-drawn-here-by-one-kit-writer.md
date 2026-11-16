# 1007. Every NCode mark's kit is drawn here, by one kit writer

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

NCode Brand draws the `{N}` kit into `logo/ncode/`. NCode Identity's `{id}` kit is drawn by `brand/build.py` in
NCodeGroup/identity, under that repository's ADR-1492: a Python script that needs numpy and Pillow and repeats the
`{N}` kit's drawing code, the Bézier flattening, the fills, the lockups and the cards. Two copies of one drawing drift:
a change to a card's margin or a PNG's encoder lands in one and not the other. Python is not a tooling language here
(project-template ADR-0021), so a second generator in Python cannot move into this repository. NCode Identity cannot
vendor a file this repository does not release ([1001](1001-consumers-vendor-files-from-a-tagged-release-and-check-their-hashes.md)),
so a kit drawn elsewhere has no tagged address and no hash in `manifest.json`.

## Decision

Every NCode mark's kit is `logo/<kit>/`, drawn by `build.mjs` with one kit writer, `logoKit()` in `lib/logo.mjs`.

- A kit's names, geometry, lockups, cards and text outlines are data in `src/logo/<kit>.json`. The letters between the
  braces are the only code a kit has of its own, chosen by the source's `letters` field.
- The kit's colors come from the blue ramp, as [1000](1000-one-token-source-and-one-generator-write-every-committed-file.md)
  has it.
- A kit's files keep the names its product gave them, so a product's `brand/<path>` maps one to one to
  `logo/<kit>/<path>`.
- A product vendors its kit from a tagged release and checks the hashes in `manifest.json`.

This supersedes decisions 1 to 6 of NCodeGroup/identity's ADR-1492, through a record in that repository that names this
one.

## Options considered

- **Keep the kit in NCode Identity** (rejected). It leaves a second generator, in Python, that repeats the drawing code
  and that `npm run check` here does not cover.
- **A second generator script here** (rejected). Two writers in one repository drift as two repositories do, and each
  needs its own check.
- **One kit writer, with each kit as data** (chosen). A change to a margin, a size or an encoder is one edit, and every
  kit shows it in the same pull request.
- **A package that holds the writer** (rejected). No package is published, and the repository has no npm dependency
  ([1000](1000-one-token-source-and-one-generator-write-every-committed-file.md)).

## Consequences

- A new product mark is a letters function and a source file in `src/logo/`.
- A change to the kit writer changes every kit at once, and `npm run check` lists each file that differs.
- `tools/compare-kit.mjs` compares a port with the kit it came from, with a tolerance of one level for the PNGs that
  Python and JavaScript round differently.
- A text outline changes only with the release of its font that its source records: the outlines are path data, and no
  font tooling is in this repository.
- Adding a kit adds files, which is a minor version ([1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md)).

## References

- Issue #2
- [lib/logo.mjs](../../lib/logo.mjs), [src/logo/identity.json](../../src/logo/identity.json)
- [1000](1000-one-token-source-and-one-generator-write-every-committed-file.md), how the files are generated
- [1001](1001-consumers-vendor-files-from-a-tagged-release-and-check-their-hashes.md), how a product vendors them
- [1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md), which version a new kit takes
