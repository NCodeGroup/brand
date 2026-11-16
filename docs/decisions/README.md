# Architecture Decision Records

How NCode Brand records its decisions: one short Markdown file per decision, kept in this folder and changed in
the same pull request as the code it explains.

## When to Write One

Write a record for a non-obvious choice that someone would otherwise question again: a design with real alternatives,
a trade-off that looks wrong without its reasons, or a departure from the project template. The conventions themselves
go in `AGENTS.md` or the instruction files it lists; a record explains why a convention is what it is.
`/analyze-decision` compares the options and writes one, in a worktree of its own, where it lands with the plan that
builds it. Work bigger than one plan starts as a design document in `docs/designs/`, from
[its template](../designs/_template.md), and each of its decisions becomes a record here when its phase lands.

## How to Write One

- Copy [0000-template.md](0000-template.md) to `NNNN-kebab-case-title.md`, starting from `1000`. Numbers below 1000
  are the project template's, in [project-template/](project-template/README.md), so an ADR number names one record
  across both folders. `.template/Test-AdrIndex.ps1` fails a new record numbered below 1000; records the project
  already had keep their numbers.
- Take a number no one else holds. Fetch first, then take the next number above both the highest record numbered 1000
  or more on `origin/<default branch>` and any record an open branch, pull request or worktree is writing. Check again
  after rebasing or merging the default branch, and when the number was taken meanwhile, renumber the file, its title,
  its index row and every link to it. Two records never share a number; `.template/Test-AdrIndex.ps1` fails when they
  do.
- Add the record to the index below, in the same change.

## Statuses

- `Proposed`: the decision is open.
- `Accepted`: the decision holds.
- `Deprecated`: the decision no longer applies, and nothing replaces it.
- `Superseded by NNNN`: a later record replaces it whole.

Never rewrite the decision of an accepted record; fixing a typo or a broken link is fine. A changed decision is a new
record, and the old record's status and index row say so. When the new record changes only part of the old one, the
old one stays `Accepted` with a note, "Accepted (amended by NNNN)", and the new one's index row says "(amends NNNN)".
The old record's text is not edited beyond its status line.

## What a Record Is

A record is a decision the project made, not an authority. Where an external standard or current security practice
governs, it wins: a record that conflicts with one is superseded to align with it, never cited to justify the
deviation.

## Writing Rules

- Write every section in the present tense, so it reads the same a year later: what is, and why. Avoid words that
  date it, such as "now", "new", "currently", "previously", "originally", "we decided to change" or "the first
  version"; the history belongs in the commit log and in the records a record supersedes.
- Give a volatile fact (a price, a quota, a limit, a supported version) its source and the date it was read, and mark
  an estimate as an estimate.
- Keep a record short, and link to the code, issues and records it depends on rather than restating them.

## The Template's Decisions

The project template's own decisions are in [project-template/](project-template/README.md). Template updates replace
that folder. To decide otherwise, write a record here that says "Supersedes: project-template ADR-NNNN" and list the
override in `AGENTS.md`.

## Index

One row per record of NCode Brand's own, numbered from 1000; an empty table means it has none. The template's
records are indexed in [project-template/](project-template/README.md).

| ADR | Decision | Status |
| --- | --- | --- |
| [1000](1000-one-token-source-and-one-generator-write-every-committed-file.md) | One token source, and one generator writes every committed file | Accepted (amended by 1010) |
| [1001](1001-consumers-vendor-files-from-a-tagged-release-and-check-their-hashes.md) | Consumers vendor files from a tagged release and check their hashes | Accepted (amended by 1009) |
| [1002](1002-custom-properties-take-the-nc-prefix-and-only-semantic-tokens-are-public.md) | Custom properties take the --nc- prefix, and only semantic tokens are public | Accepted |
| [1003](1003-code-and-tokens-are-apache-2-0-and-the-names-and-marks-are-reserved.md) | Code and tokens are Apache-2.0, and the names and marks are reserved | Accepted (amended by 1008) |
| [1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md) | A rename is a major version, and a value change is never a patch | Accepted |
| [1005](1005-this-repository-ships-data-and-stylesheets-never-a-frameworks-theme-code.md) | This repository ships data and stylesheets, never a framework's theme code | Accepted |
| [1006](1006-contrast-is-computed-in-node-and-the-tenant-derivation-guards-it.md) | Contrast is computed in Node, and the tenant derivation guards it | Accepted |
| [1007](1007-every-ncode-marks-kit-is-drawn-here-by-one-kit-writer.md) | Every NCode mark's kit is drawn here, by one kit writer | Accepted |
| [1008](1008-the-icon-set-is-ncodes-own-drawings-and-a-pinned-lucide-subset-restyled-to-one-grid.md) | The icon set is NCode's own drawings and a pinned Lucide subset, restyled to one grid (amends 1003) | Accepted |
| [1009](1009-a-release-carries-an-attested-archive-and-vendor-brand-verifies-it-before-writing.md) | A release carries an attested archive, and vendor-brand.mjs verifies it before writing (amends 1001) | Accepted |
| [1010](1010-the-guide-and-the-specimens-are-published-on-github-pages-from-committed-files.md) | The guide and the specimens are published on GitHub Pages from committed files (amends 1000) | Accepted |
| [1011](1011-the-design-tokens-resolver-file-is-one-self-contained-document-with-a-theme-modifier.md) | The Design Tokens resolver file is one self-contained document with a theme modifier | Accepted |
