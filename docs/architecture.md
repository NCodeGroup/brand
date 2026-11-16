# Architecture

[//]: # "Maintainers: describe the components, as a diagram and a table (Component, Role), and the rules the design
keeps."

How NCode Brand is built. [assurance-case.md](assurance-case.md) explains why the design meets its security
requirements.

## Components

Not described yet.

## Design Rules

- Decisions the design rests on are recorded in [decisions/](decisions/README.md).

## Build and Release

CI runs the project's commands on every pull request (`.github/workflows/ci.yml`). `AGENTS.md`'s Landing section sets
`release: tag+release`, so each release is tagged and published as its pull request merges, as
[ADR-0016](decisions/project-template/0016-releases-are-tagged-and-published-when-their-pull-request-merges.md)
records, and `.github/workflows/publish.yml` attaches its attested archive
([ADR-1009](decisions/1009-a-release-carries-an-attested-archive-and-vendor-brand-verifies-it-before-writing.md)).
