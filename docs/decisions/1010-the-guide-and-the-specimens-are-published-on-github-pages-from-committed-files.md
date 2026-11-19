# 1010. The guide and the specimens are published on GitHub Pages from committed files

- **Status:** Accepted (amended by 1015)
- **Date:** 2026-11-16
- **Deciders:** NCode Group
- **Amends:** 1000

## Context

The guide is Markdown written for GitHub's renderer, and the specimens are static HTML on the generated stylesheets;
on github.com a specimen shows as source. GitHub Pages publishes from a branch, running Jekyll unless `.nojekyll`
turns it off, or from an artifact that a workflow uploads, served as it is. It serves a `.md` file as text and sends no
`Content-Security-Policy` header (GitHub Docs, "Configuring a publishing source for your GitHub Pages site",
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site,
read 2026-11-16).

## Decision

`build.mjs` renders each page of the guide to HTML in `guide/` and writes the root `index.html`, which opens the guide.
They are generated, committed and checked by `npm run check`, and a release does not carry them. `lib/markdown.mjs`
renders the subset of Markdown the guide uses and throws on anything else. A link to a file the site publishes keeps
its relative path; a link to another repository path or to a folder goes to it on GitHub, on `main`.

`.github/workflows/pages.yml` runs `npm run check`, copies `index.html` and `brace/`, `css/`, `fonts/`, `guide/`,
`icons/`, `logo/`, `specimens/` and `tokens/`, and deploys them, building nothing. Only its deploy job holds
`pages: write` and `id-token: write`, and every action is pinned by its commit SHA. Every page states
`default-src 'self'; base-uri 'none'; form-action 'self'` in a `<meta>` element. The address is
https://ncodegroup.github.io/brand/; a domain of NCode's own is a separate decision.

## Options considered

- Pages' Jekyll build: it builds at deploy time what no one committed, and it styles the guide with a Jekyll theme
  instead of Instrument.
- Markdown served as it is: a reader gets raw text.
- A documentation framework such as Starlight: a dependency tree to pin, and its markup is styled in the documentation
  toolchain (ADR-1005).
- The specimens on Pages with the guide linked on github.com: this splits the guide from the pages it describes.
- Rendering in `build.mjs` and committing: chosen. The guide is shown in the documentation scene it describes, the site
  is reviewed as a diff, and the workflow publishes exactly what `main` holds; it costs a small renderer.

## Consequences

- A change to the guide changes `guide/` in the same pull request.
- The guide's Markdown keeps to what `lib/markdown.mjs` renders.
- A maintainer sets Pages to publish from GitHub Actions once, until which the deploy job fails.
- `foundations.html` lays out for a phone, because the site serves it to one.

## References

- [lib/markdown.mjs](../../lib/markdown.mjs), [lib/guide.mjs](../../lib/guide.mjs),
  [.github/workflows/pages.yml](../../.github/workflows/pages.yml)
- [1000](1000-one-token-source-and-one-generator-write-every-committed-file.md), which this record amends
- [1005](1005-this-repository-ships-data-and-stylesheets-never-a-frameworks-theme-code.md)
- [#4](https://github.com/NCodeGroup/brand/issues/4)
