# 1001. Consumers vendor files from a tagged release and check their hashes

- **Status:** Accepted (amended by 1009)
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

The brand's consumers differ: a documentation toolchain, a React front end with Material UI, a .NET host that renders
a page, the project template's package icon, READMEs. A library or product repository carries no dependency it does not
ship: its software bill of materials is its dependency graph, and NCode Identity's front end holds every new npm
version for three days. A design change must also be reviewable in the consumer's own pull request.

## Decision

A consumer copies the files it takes from one tagged release into its own repository and checks them offline against
SHA-256 hashes. The release's `manifest.json` lists every released file with its size and SHA-256. The consumer names
the files it takes in a `brand.lock.json` and runs `vendoring/vendor-brand.mjs`, a Node.js script with no packages:
`--update <version>` reads the release's manifest at its tag, refuses a release of another version and a file whose
hash differs, and writes the files and the hashes; `--check` proves, with no network, that no vendored file drifted.
The consumer runs `--check` in its gate and in CI. A tag never moves, so `--update` also refuses a hash other than
the one the lock already pins for that version; it follows no redirect, and writes nothing outside the lock's folder.

No npm package and no NuGet package is published. When a second JavaScript product needs the brand, the package to
publish is `@ncodegroup/brand`, carrying the release's files and nothing else.

## Options considered

| | Vendored files, checked against a release | npm package | Git dependency |
|---|---|---|---|
| Entry in the consumer's lockfile and SBOM | None | One | One |
| Integrity | SHA-256 per file in the lock, checked offline | The registry's signature and provenance | The commit hash |
| Serves a consumer that is not JavaScript | Yes, the same script | No | No |
| A brand change in the consumer's pull request | The vendored files' diff | A version number | A commit hash |
| Update signal | A person, or a scheduled job, runs `--update` | Dependabot | Poor |

Vendoring is the one path that serves every consumer and adds nothing to a lockfile. An npm package suits a second
JavaScript product or a consumer that wants Dependabot to carry brand updates; a NuGet package of static web assets
suits two .NET hosts that render the same pages. Neither consumer exists.

## Consequences

- A consumer sees, in its own pull request, every line a brand release changes in the files it takes.
- No update arrives by itself: a person or a scheduled job runs `--update`.
- Each consumer carries its own copy of a short script, which it takes from a release.
- The release's folders must keep their layout: `css/base.css` finds the braces in `brace/` and `css/fonts.css` the
  fonts in `fonts/`, so a consumer vendors them side by side.
- No release asset carries signed build provenance, so `--update` trusts the tag and the manifest it holds.

## References

- [vendoring/vendor-brand.mjs](../../vendoring/vendor-brand.mjs), [manifest.json](../../manifest.json)
- [The guide: vendor a release](../../guidelines/12-applying.md#vendor-a-release)
- [1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md), what a version number promises
