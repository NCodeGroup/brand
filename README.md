# NCode Brand

NCode's look and feel: tokens, logos, themes and guidelines.

[![CI](https://github.com/NCodeGroup/brand/actions/workflows/ci.yml/badge.svg)](https://github.com/NCodeGroup/brand/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/NCodeGroup/brand/badge)](https://scorecard.dev/viewer/?uri=github.com/NCodeGroup/brand)

The look is called Instrument: a neutral, precisely made case of engraved labels, keys and wells that holds live
values, with the brace of the `{N}` mark drawn around what one boundary holds. Every token is written once, in
[src/tokens.source.json](src/tokens.source.json), and one Node.js script with no packages, [build.mjs](build.mjs),
writes everything a consumer takes: the tokens as CSS, Design Tokens JSON, a Design Tokens resolver document and a
typed module, the stylesheets, the fonts, the braces, the icons, the logo kit, data for a Material UI theme and a
syntax theme for Expressive Code. Consumers copy the files they need from a tagged release's archive, once the GitHub
CLI has verified its build provenance, and check them against its `manifest.json`.

[The guide](guidelines/README.md) says what Instrument is made of, when to use each part and which file to take, and
the [specimens](specimens/foundations.html) show every part at work. Both are published at
https://ncodegroup.github.io/brand/, from `main`, by [.github/workflows/pages.yml](.github/workflows/pages.yml).

## What It Holds

| Folder | What it is |
|---|---|
| [tokens/](tokens/) | `tokens.css`, `tokens.static.css`, `tokens.json` (Design Tokens 2025.10) with `tokens.resolver.json`, its themes as a resolver modifier, `tokens.mjs` and the tenant derivation, `derive.mjs` |
| [css/](css/) | `base.css`, the element and component styles; `fonts.css`; `starlight.css`, for a Starlight site |
| [fonts/](fonts/) | Instrument Sans and Martian Mono, with their licenses |
| [brace/](brace/) | The brace as SVG masks and as path data |
| [icons/](icons/) | NCode's icons and a restyled Lucide subset: one SVG each, a sprite, path data and Lucide's license |
| [logo/](logo/README.md) | The `{N}` and `{id}` logo kits, for every place a mark appears |
| [mui/](mui/) | The values a Material UI theme takes, as data |
| [syntax/](syntax/) | `instrument-screen.json`, the syntax theme of a code block, for Expressive Code |
| [vendoring/](vendoring/vendor-brand.mjs) | The script a consumer copies to verify, vendor and check a release's files |
| [guidelines/](guidelines/README.md) | The guide |
| [guide/](guide/index.html) | The guide as web pages, which build.mjs renders from guidelines/ for the site |
| [specimens/](specimens/) | Nine pages built on the generated files alone |
| [src/](src/) | The sources: the tokens, the stylesheets, the fonts and the Lucide icons with their locks, NCode's icons, the marks' geometry |

Every file in `tokens/`, `css/`, `fonts/`, `brace/`, `icons/`, `logo/`, `mui/`, `syntax/` and `guide/`, and `manifest.json`
and `index.html`, is generated: change its source in `src/` or `guidelines/` and run `npm run build`.

## Development

Run from the repository root in PowerShell 7. The scripts need only the Node.js release `.node-version` names.

| Task | Command |
|---|---|
| Build | `npm run build` |
| Check | `npm run check` |
| Test | `npm run test` |

`npm run check` writes nothing and fails when a committed generated file is not what the sources give, or when a
contrast pairing is below its floor; it is the gate before a push, and CI runs it. `tools/shoot.mjs` and
`tools/browser-check.mjs` check the specimens, the guide's pages and the colors in a browser, by hand, with Playwright.

The weekly `pin-watch` workflow opens an issue, labeled `pin-update`, when Lucide or Fontsource publishes a release
newer than `src/icons/lucide.lock.json` or `src/fonts/fonts.lock.json` pins that is at least three days old, and
closes it once the lock pins it; `/plan-issue` plans it. `node tools/pin-watch.mjs --dry-run --repo=NCodeGroup/brand`
prints what it would do, and needs no token. `node tools/refresh-fonts.mjs` copies the fonts from the npm tarballs
`src/fonts/fonts.lock.json` pins, once each tarball and each file match their hashes.

## AI-Assisted Workflow

This repository is set up for plan-then-execute coding: Claude Opus plans each change into `PLAN.md`, a cheaper model executes it one verified step at a time, and any step that needs a decision goes back to Opus. [AGENTS.md](AGENTS.md) is the index of the instructions every agent follows.

Work in Claude Code or GitHub Copilot, and switch whenever you like: both have the same commands, and `PLAN.md` is the only state they share, so one can plan and the other execute. Each bills its own subscription.

| Tool | Plan | Execute | Re-plan one step | Review | Land, then finish |
|---|---|---|---|---|---|
| Claude Code | `/plan-feature <what to build>` (or `/plan-bugfix`, `/plan-refactor`, `/plan-tests`, …), or `/plan-issue #42` for an issue, then review `PLAN.md` | `/orchestrate-plan` | `/replan-step N` | `/review-plan-diff` | `/ship-plan`, then `/finish-plan` |
| Copilot Chat in VS Code | The Copilot Planner agent on Opus, or `/plan-feature` or `/plan-issue #42` | Run all steps with subagents, or Execute next step | Re-plan with the planner | Review the work | `/ship-plan`, then `/finish-plan` |
| Copilot CLI | `copilot --model claude-opus-5.5`, then `/plan-feature` or `/plan-issue #42` | `/orchestrate-plan` | `/replan-step N` | `/review-plan-diff` | `/ship-plan`, then `/finish-plan` |

In Claude Code, plan in Accept edits mode and execute in Auto.

Each plan gets its own git worktree under `.claude/worktrees/`, in every tool, so several sessions can work on different plans at once.

The workflow files come from a Copier template, which owns them: never edit `.template/`, `.template-version`, `.githooks/pre-push`, `.github/instructions/project-template.instructions.md`, `.copier-answers.yml`, `CLAUDE.md` or the commands, agents and skills the template generates. To change how agents work here, edit `AGENTS.md` or a file it lists. To pull in template improvements, run `.\.template\Update-Project.ps1`: it updates itself, replaces the template's files, merges template changes into the shared settings files, and never touches `AGENTS.md` or this README. To plan the update first, with a trial run, the project files that need changing and the checks, run `/plan-template-update`. The weekly `template-update` workflow opens an issue, labeled `template-update`, when a newer template version is out, and closes it once the project has updated; `/plan-issue` plans it.

## Project

- [CONTRIBUTING.md](CONTRIBUTING.md): how to set up, build, test and propose a change.
- [SECURITY.md](SECURITY.md): how to report a vulnerability privately.
- [docs/decisions/](docs/decisions/README.md): the decisions behind the design, the project's and the template's.
- [CHANGELOG.md](CHANGELOG.md): in the Keep a Changelog format, what the product does until its first stable release, while `AGENTS.md`'s Landing section says `pre-release: untracked`, and what changed in each release from then on.
- [TRADEMARKS.md](TRADEMARKS.md): how to use NCode's names and marks.
- [LICENSE.txt](LICENSE.txt): the license.

## License

Which license covers what:

- The code, the tokens, the stylesheets, the braces in [brace/](brace/), NCode's own icons in [icons/](icons/), the
  derivation, the Material UI data, the syntax theme, the vendoring script and the guide are licensed under the
  [Apache License 2.0](LICENSE.txt).
- The names NCode, NCode Group and NCode Identity and the marks are trademarks of NCode Group, and the marks' artwork,
  every file in [logo/](logo/README.md), is copyright NCode Group, all rights reserved: [TRADEMARKS.md](TRADEMARKS.md)
  says how you may use them. You may use the unmodified marks to refer to an NCode project without asking.
- Instrument Sans and Martian Mono, in [fonts/](fonts/), are copyright their authors and licensed under the SIL Open
  Font License 1.1, whose texts are beside them.
- The icons in [icons/](icons/) taken from Lucide are copyright Lucide Icons and Contributors, and those Lucide
  derives from Feather also copyright Cole Bemis, under the ISC License and the MIT License in
  `icons/LICENSE-Lucide.txt`.

Other NCode repositories publish copies of the marks under their own licenses, such as NCodeGroup/project-template's
`brand/` folder under its MIT License from v0.82.0 on; [TRADEMARKS.md](TRADEMARKS.md) lists them.
