# 1009. A release carries an attested archive, and vendor-brand.mjs verifies it before writing

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group
- **Amends:** 1001

## Context

ADR-1001 has a consumer vendor files from a tagged release and check them against the SHA-256 hashes in the release's
`manifest.json`. The hashes prove that the files match the manifest, and nothing proves the manifest: whoever can push
a tag, or answer in place of the address it is read from, can serve a manifest and files that agree with each other. A
build provenance attestation, signed through Sigstore with the OIDC token of the workflow that built the files, names
the repository, the workflow, the ref and the runner, and a consumer can check it before it trusts the hashes.

## Decision

Each release carries one archive, `brand-<version>.tar.gz`, that holds `manifest.json` and every file it lists, with a
build provenance attestation. `.github/workflows/publish.yml` packs it from the tagged commit with
`node build.mjs --archive`, attests it with `actions/attest-build-provenance`, verifies the attestation, and attaches
the archive and the attestation's bundle, `v<version>.intoto.jsonl`, to the GitHub release.
The job that attests and attaches runs in the `release` environment, which admits only tags `v*` and waits for a
maintainer's approval, so no archive is attested without one; the job that packs refuses a tag whose commit `main`
doesn't hold.
`.template/Publish-Release.ps1` starts the workflow once it publishes the release.

`vendoring/vendor-brand.mjs --update <version>` downloads the archive with the GitHub CLI and runs
`gh attestation verify` on it. It requires the signer workflow `NCodeGroup/brand/.github/workflows/publish.yml`, the
source ref `refs/tags/v<version>` and a GitHub-hosted runner, and requires the verified attestation to name the
archive's SHA-256. Then it checks that the archive holds every file the manifest lists, at its size and hash, and
nothing else, before it writes any file. `--check` stays offline and needs no GitHub CLI.

## Options considered

| | `gh attestation verify` | Sigstore verification in the script | The manifest's hashes alone |
|---|---|---|---|
| Proves which workflow and tag built the files | Yes | Yes | No |
| What `--update` runs on | Node.js and the GitHub CLI | Node.js | Node.js |
| What a consumer copies and keeps current | The script | The script, with an X.509 chain check, a transparency log proof and Sigstore's trusted root | The script |

Verifying a Sigstore bundle in the script keeps `--update` to Node.js alone, but it means checking a certificate chain
to Fulcio's root and a Rekor inclusion proof or signed timestamp, and keeping the trusted root current through TUF:
code that every consumer copies and that is reviewed far less than the GitHub CLI's. The GitHub CLI implements that
verification and is installed on every GitHub-hosted runner. cosign verifies the same bundles, but adds a second tool
for the same trust. An npm package with provenance stays rejected for the reasons ADR-1001 gives.

## Consequences

- `--update` needs the GitHub CLI, signed in with `gh auth login` or `GH_TOKEN`, and the network; `--check` needs
  neither.
- A release whose tagged commit has no `.github/workflows/publish.yml` carries no archive, and `--update` refuses it.
- An update downloads the whole archive, about 1.5 MB, not only the files the lock names.
- The bundle on the release lets anyone check the archive with `gh attestation verify --bundle`, and OpenSSF Scorecard
  counts the release as signed.
- A rerun of the workflow packs the archive again and replaces the release's assets.
- Every release, also the one `.github/workflows/tag-release.yml` publishes as a pull request merges, waits for a
  maintainer to approve the `release` environment before its archive is attested and attached.

## References

- [.github/workflows/publish.yml](../../.github/workflows/publish.yml),
  [vendoring/vendor-brand.mjs](../../vendoring/vendor-brand.mjs), [lib/archive.mjs](../../lib/archive.mjs)
- [1001](1001-consumers-vendor-files-from-a-tagged-release-and-check-their-hashes.md), which this record amends
- [#5](https://github.com/NCodeGroup/brand/issues/5)
- [gh attestation verify](https://cli.github.com/manual/gh_attestation_verify), read on 2026-11-16
