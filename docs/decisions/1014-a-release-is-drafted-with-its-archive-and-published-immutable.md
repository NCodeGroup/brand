# 1014. A release is drafted with its archive and published immutable

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group
- **Amends:** 1009

## Context

The template's ADR-0028 makes GitHub releases immutable: once a release is published, its assets and its tag can't
change, and GitHub signs a release attestation. An immutable release takes no asset after publication, so the archive
and its attestation bundle have to be attached before the release is published. With `release: tag+release`,
`tag-release.yml` through `.template/Publish-Release.ps1` publishes the release as soon as it tags it, so a workflow
that attaches the assets afterwards is refused by an immutable release.

## Decision

`AGENTS.md` says `release: tag`, so the template's workflow only tags, signed in a public repository, and publishes
nothing. `.github/workflows/publish-dispatch.yml` starts `publish.yml` on the tag once that run succeeds, because a tag
pushed with `GITHUB_TOKEN` starts no workflow. `.github/workflows/publish.yml` creates a draft release with the
changelog's notes, attaches the archive and its attestation bundle, and publishes the release.

The repository's immutable releases are enabled, so GitHub signs a release attestation, and
`gh release verify <tag>` and `gh release verify-asset <tag> brand-<version>.tar.gz` check it, as SECURITY.md says.
The `release` environment's approval and the signer identity, `publish.yml` on `refs/tags/<tag>`, are the ones
ADR-1009 records.

## Options considered

- Keep `tag+release` and attach the assets after publication: an immutable release refuses the upload.
- Mutable releases: the repository gives up the release attestation and the `signed_releases` check.
- The template drafting the release: `.template/Publish-Release.ps1` is template-owned, and
  NCodeGroup/project-template#393 is undecided.
- The project completes the draft: chosen. It keeps the template untouched and the release immutable, and costs one
  small workflow.

## Consequences

- A release that is published can't be fixed, so a fix is a new version.
- A failed run leaves a draft that a rerun completes.
- The `release` environment's approval gates the publication, so a merged release stays a tag until a maintainer
  approves it.
- `publish.yml` has no `release: published` trigger, because a release published by hand can take no asset.

## References

- Issue [#25](https://github.com/NCodeGroup/brand/issues/25)
- The template's ADR-0028, [project-template#393](https://github.com/NCodeGroup/project-template/issues/393) and
  [#411](https://github.com/NCodeGroup/project-template/issues/411)
- [.github/workflows/publish.yml](../../.github/workflows/publish.yml),
  [.github/workflows/publish-dispatch.yml](../../.github/workflows/publish-dispatch.yml),
  [AGENTS.md](../../AGENTS.md), [SECURITY.md](../../SECURITY.md)
- [1009](1009-a-release-carries-an-attested-archive-and-vendor-brand-verifies-it-before-writing.md), which this record
  amends
