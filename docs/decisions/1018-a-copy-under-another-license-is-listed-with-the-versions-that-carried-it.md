# 1018. A copy under another license is listed with the versions that carried it

- **Status:** Accepted
- **Date:** 2026-11-28
- **Deciders:** NCode Group
- **Amends:** 1003

## Context

[1003](1003-code-and-tokens-are-apache-2-0-and-the-names-and-marks-are-reserved.md) has `TRADEMARKS.md` list the
copies of the marks that other NCode repositories publish under their own licenses, and keeps each under the license it
was published with. NCodeGroup/project-template's `{N}` kit in its `brand/` folder is in its versions v0.82.0 to
v0.125.2. From v0.126.0 on, the template vendors its package icon, `template/NCodeGroup.png`, from a release of this
repository, as [1001](1001-consumers-vendor-files-from-a-tagged-release-and-check-their-hashes.md) says, and a
template update replaces a project's copy of it
([NCodeGroup/project-template#557](https://github.com/NCodeGroup/project-template/issues/557)). A list that names only
a copy's first version reads as if every later version carries it.

## Decision

1. `TRADEMARKS.md` lists each copy under another license with the versions that carry it: from its first version, and,
   once a repository stops publishing it, to its last. The copies already published stay under the license they were
   published with, as 1003 says.
2. A copy a repository publishes under its own license is listed, whether it drew the copy or vendors it from a release
   of this repository, as NCodeGroup/project-template does `template/NCodeGroup.png` under its MIT License. A copy
   vendored with `TRADEMARKS.md` beside it, whose repository's license notice keeps it under the terms on that page, as
   NCodeGroup/docs's `vendor/brand/logo/` is, stays under those terms and is not listed.
3. The texts that name a copy, `TRADEMARKS.md`, `src/logo/kit.md`, `README.md` and the guide's Versions and license
   section, give the same versions.

## Options considered

- **Leave the list as it is** (rejected). "From v0.82.0 on" claims a copy that later template versions don't carry.
- **Drop the template from the list** (rejected). Versions v0.82.0 to v0.125.2 were published under the MIT License,
  and those copies stay under it.
- **Name the versions that carried each copy** (chosen).

## Consequences

- When a repository stops publishing a copy, the change that records it names its last version in every text the
  third decision lists.
- `TRADEMARKS.md` says when a template update replaces a project's `NCodeGroup.png`, so a project knows which icon it
  carries.

## References

- [1001](1001-consumers-vendor-files-from-a-tagged-release-and-check-their-hashes.md),
  [1003](1003-code-and-tokens-are-apache-2-0-and-the-names-and-marks-are-reserved.md)
- [TRADEMARKS.md](../../TRADEMARKS.md)
- [NCodeGroup/project-template ADR-0048](https://github.com/NCodeGroup/project-template/blob/main/template/docs/decisions/project-template/0048-the-template-owns-ncodegroup-png-and-takes-it-from-a-brand-release.md)
- Issue #43
