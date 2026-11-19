# 1015. The guide and the specimens are served at brand.ncode.io

- **Status:** Accepted
- **Date:** 2026-11-19
- **Deciders:** NCode Group
- **Amends:** 1010

## Context

ADR-1010 publishes the guide and the specimens on GitHub Pages and leaves a domain of NCode's own to a separate
decision. NCode Group owns `ncode.io` and gives it to documentation alone: every NCodeGroup documentation site is
served under it, and products and marketing use other domains. The domain's DNS is hosted on Cloudflare, and the
NCodeGroup organization has verified `ncode.io` for GitHub Pages, so no other GitHub account can serve a site under it.

Every page links its stylesheets, fonts, icons and the other pages by relative paths, so the site works from any base
path, and its `Content-Security-Policy` names `'self'` alone, which is whatever origin serves it.

## Decision

**The guide and the specimens are served at https://brand.ncode.io/, a subdomain of `ncode.io`, from the root path.**

1. `brand.ncode.io` is a CNAME record to `ncodegroup.github.io`, DNS only, so GitHub Pages serves the site and issues
   its certificate.
2. The repository's Pages settings name `brand.ncode.io` as the custom domain, with HTTPS enforced.
3. The documents that name the site's address name `https://brand.ncode.io/`.

## Options considered

- **GitHub's own address for the repository's site.** Rejected: NCode Group's documentation lives under its own
  domain.
- **A path under `ncode.io`, such as `https://ncode.io/brand/`.** GitHub Pages serves a project site there once the
  organization's own Pages site claims `ncode.io`. Rejected: the path is always the repository's name, and every
  site depends on that one repository and shares one origin with the others.
- **A subdomain per site** (chosen): each site is set up on its own, has its own origin, and is served from its root
  path, and `ncode.io` itself stays free for a page that lists every site.

## Consequences

- GitHub Pages redirects every page at `https://ncodegroup.github.io/brand/` to the same page at
  `https://brand.ncode.io/`.
- The site needs no rebuild for its address: its links are relative, and `pages.yml` copies the committed files as
  they are.
- Another NCodeGroup documentation site is a sibling subdomain of `ncode.io`, set up the same way.

## References

- [ADR-1010](1010-the-guide-and-the-specimens-are-published-on-github-pages-from-committed-files.md)
- `.github/workflows/pages.yml`
