# NCode Brand

NCode's look and feel: tokens, logos, themes and guidelines.

Instructions for every coding agent in this repository. This file is an index: read each file it lists, in order, then the sections below. Where the project's instructions differ from the template's, the project's win. Claude Code reads this file through `CLAUDE.md` and imports each `@` file. GitHub Copilot reads it directly and loads every `.github/instructions/*.instructions.md` file on its own.

This file belongs to the project: template updates never change it. Keep it under 200 lines; put anything longer in a listed file.

## Instructions

- @.github/instructions/project-template.instructions.md — the plan-then-execute workflow and base conventions, from the project template. Template updates replace it; never edit it. To change one of its rules, override it below or in a listed file.
- `docs/decisions/` — this project's architecture decision records, and in `project-template/` the template's; read the ones a change touches before deciding otherwise.
- `guidelines/` — the product's own guide: read the sections a change touches, and `guidelines/09-voice.md` before writing any text a consumer reads.
- Project instruction files: add one line for each, `@<path> — what it covers`.

## Commands

Run from the repository root in PowerShell 7. Node.js alone: there are no packages to install.

- Build: `npm run build` writes every generated file and block from `src/`; commit what it writes
- Check: `npm run check` writes nothing, names each generated file or block that is missing, stale or extra, and fails then, or when a contrast pairing is below its floor; it is the Landing gate and a CI step
- Test: `npm run test` runs `tests/*.test.mjs` with `node --test`
- By hand, with Playwright installed where Node.js finds it, as `CONTRIBUTING.md` says: `node tools/shoot.mjs --out=<folder>` screenshots the specimens and fails on a console error, a failed request, a CSP violation or sideways scrolling; `node tools/browser-check.mjs` compares the build's color math, the static palette and the brace fallback with a browser

## Landing

How `/ship-plan` lands a reviewed plan. `integrate`: `pull-request` pushes the plan's branch and opens a pull request; `direct` pushes to the default branch. `release`: `none`; `tag` tags the plan's `Release:` version, or the next free one when another plan landed it first; `tag+release` also publishes a release from that version's section of `changelog`. On GitHub, `.github/workflows/tag-release.yml` tags and publishes it as the pull request merges, from the `Release:` line `/ship-plan` writes in its description or the changelog's newest section, and for a .NET library starts `.github/workflows/publish.yml`; `/ship-plan` run after the merge does only what that workflow didn't. `changelog`: the file every plan's last step writes, in the Keep a Changelog format, `CHANGELOG.md` by default. `pre-release`: `untracked` keeps the project pre-release until a version tag of 1.0.0 or later: nothing it released or stored has a reader that must keep working, so every text describes the product as it is, the changelog's `## [Unreleased]` is a catalog of what the product does that each plan edits in place, and a breaking change needs no deprecation or migration path, as ADR-0015 in `docs/decisions/project-template/` says; `tracked`, the default when the line is missing, tracks every change from the first release, for a project whose releases or stored data already have readers. `draft`: `no`, the default, which a template update never changes, so a project lands as it did; `yes` opens every pull request as a draft, as `/ship-plan draft` does, and `/run-issues` opens its pull requests as drafts either way. `follow-ups`: `issues` files a plan's follow-ups as issues in this repository; `<owner/repo>` files them in that repository; `none` files none, and `/ship-plan` lists them for you to record. `follow-up-label`: the label those issues get, `follow-up` by default; write a name with spaces as it is, such as `tech debt`. `gate`: `none`; a command, such as `./build/dod.ps1 -Fast`, that `/ship-plan`, `/run-issues`, `/address-feedback` and `/run-feedback` run from the repository root before each push, stopping when it exits non-zero or changes a file. `protect`: `none`; `hook` makes `.githooks/pre-push` refuse any push to the default branch, for a host that can't require pull requests, such as a private repository on GitHub Free. `pr-format`: `none`; `<file>#<heading>`, such as `AGENTS.md#Pull requests`, names the section that sets the title and description of the pull requests `/ship-plan` opens, which still end with their `Closes` lines. `review-bots`: the review bots, by login and separated by commas, whose findings `/run-issues`, `/address-feedback` and `/run-feedback` may fix, `ncode-review` by default, or `none`; `/run-issues` and `/run-feedback` judge every one of NCode Review's findings, whatever its severity, and fix each that holds, and a bot's finding alone never changes CI, the template, agent configuration, the build or the dependencies: `/address-feedback` and `/run-feedback` change them only when you approve it in their start question. `max-review-rounds`: `3`; after that many rounds of review feedback on a pull request, `/run-issues` and `/run-feedback` comment no further `/review`, so NCode Review isn't asked to review again, and still fix and answer every finding; they recommend the merge once every finding is fixed, declined or answered and the review of the last push they asked for is in. `prelude`: `none`; one PowerShell command that sets up the shell the workflow's commands run in, such as `./build/env.ps1`, a script in the repository, or `nvs use 26`, to put a tool installed through a version manager on `PATH`. `/ship-plan`, `/run-issues`, `/address-feedback` and `/run-feedback` run it before the gate, and executors and coordinators before each Done-when command, dot-sourced in the same PowerShell; a plan names it under Context for the executor, so no step repeats it. When it fails, they stop and show its error. Write it on one line, without a leading `. ` or `& ` operator, a `#` comment, or `;`, `|`, `&`, `&&` or `||`; `.template/Get-PlanState.ps1` prints any other value as `prelude=invalid`, and `/ship-plan` stops on it. `/run-issues` runs only when the host requires pull requests into the default branch, or `protect` is `hook` and the hooks are enabled.

- integrate: pull-request
- release: tag+release
- changelog: CHANGELOG.md
- pre-release: untracked
- draft: no
- follow-ups: issues
- follow-up-label: follow-up
- gate: npm run check
- protect: none
- pr-format: none
- review-bots: ncode-review
- max-review-rounds: 3
- prelude: ./.template/Use-Node.ps1

## Conventions

- One source, one generator (ADR-1000 in `docs/decisions/`). Every token is written once, in `src/tokens.source.json`. `build.mjs` writes everything in `tokens/`, `css/`, `fonts/`, `brace/`, `logo/`, `mui/` and `manifest.json`, and the blocks between `generated:` markers in `guidelines/` and `specimens/`. Edit `src/`, `lib/`, `build.mjs`, `guidelines/`, `specimens/`, `tests/`, `tools/` and `vendoring/`; never a generated file or block. A change to a source ends with `npm run build`, and its commit holds the generated files it changed.
- No npm dependencies: every script uses Node.js built-ins, and `package.json` has none, so it has no lockfile. Only the by-hand tools in `tools/` load Playwright, from wherever Node.js finds it; nothing the build, the check or the tests run may need it. Use Node.js for every tool, never Python.
- Every custom property starts with `--nc-`, the tokens and the ones `src/css/base.css` sets alike (ADR-1002). Each group in `src/tokens.source.json` states its `$tier`: semantic tokens are the public contract, and the color ramps and the steps of the type scale are private primitives. A component reads a role, never a primitive; this repository's own stylesheets may read primitives.
- The version a release ships is `package.json`'s `version`, which the generator stamps into the generated files; a plan with a `Release:` line sets it. A rename, removal, file move or typeface change is a major version; a value change is a minor one, never a patch; before 1.0.0 the major number stays at 0 and those changes raise the minor one (ADR-1004). A changelog entry names the tokens and files a change touches.
- Consumers vendor files from a tagged release and check them against `manifest.json` with `vendoring/vendor-brand.mjs` (ADR-1001). Keep a released file's path, or count its move as a major version. No package is published; if one is, its name is `@ncodegroup/brand`: NCode's npm scopes are `@ncodegroup` and `@nidentity`, and no other.
- This repository ships data and stylesheets, never a framework's theme code: a Material UI theme lives in its application, and the rules that restyle Starlight's markup live in the documentation toolchain (ADR-1005). `src/css/starlight.css` sets only Starlight's `--sl-*` properties.
- The contrast gate runs in Node: `npm run check` and the tests fail when a pairing is below 4.5 to 1 for text or 3 to 1 for a part (ADR-1006). A pairing a tenant's color can break is held by a guard in `lib/derive.mjs`; a change to a derivation rule changes `tokens/derive.mjs` and its vectors in the same commit.
- A brace marks a scope: it is drawn around what one named boundary holds, a security boundary or the lifetime of a secret, and nowhere else (`guidelines/04-shape-and-depth.md`). Don't add one to a callout, a heading, a card that is not a boundary, or anything decorative.
- Code, tokens, stylesheets and the guide are Apache-2.0; the names and marks are reserved under `TRADEMARKS.md` (ADR-1003). A font changes only with `src/fonts/fonts.lock.json`, which pins its SHA-256.
- A change to `src/css/`, the tokens or a specimen runs `node tools/shoot.mjs --out=<folder>` by hand and compares the shots with the ones before the change; screenshots are not committed.
