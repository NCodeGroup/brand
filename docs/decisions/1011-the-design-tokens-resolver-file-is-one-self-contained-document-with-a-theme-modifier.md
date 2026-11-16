# 1011. The Design Tokens resolver file is one self-contained document with a theme modifier

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

`tokens/tokens.json` follows the Design Tokens Format Module 2025.10, which holds one value per token. It carries the
semantic colors and shadows twice, under the groups `light` and `dark`, so a tool that wants one theme picks a group
by name. The Design Tokens Resolver Module 2025.10 describes themes as a set plus a modifier with one context per
theme, and a resolver document picks a context. A tool must resolve a reference inside the document, and may refuse to
read another file. The primitives' group `color` gives the tier `primitive` to every token inside it.

## Decision

`tokens/tokens.resolver.json` is one self-contained Resolver Module 2025.10 document that references no other file, and
`build.mjs` writes it and `tokens/tokens.json` from one model.

- The set `instrument` holds every group of `tokens/tokens.json` except `light` and `dark`.
- The modifier `theme` has the contexts `light` and `dark`, and `light` is the default. Each context puts that theme's
  semantic colors and shadows under a root group `theme`, such as `theme.color.text`.
- The resolution order is the set, then the modifier.
- `tokens/tokens.json` stays as it is, so a tool that reads only the format still gets both themes.

## Options considered

- **One self-contained document** (chosen). Any tool that supports same-document references reads it, and a consumer
  vendors one file.
- **A resolver that references `tokens/tokens.json` and a file per theme.** It stores each token once, but a tool may
  refuse the file references, and a consumer vendors four files that must agree.
- **Semantic tokens merged into `color` and `shadow`.** The merged `color` group gives them the tier `primitive`, which
  makes the public contract look private.
- **The resolver in place of `tokens/tokens.json`.** A tool that reads only the format loses the themes.

## Consequences

- A resolver-aware tool gets one theme at a time under `theme`.
- Both files hold the same tokens, and `npm run check` proves it: the generator writes both, and a test resolves each
  theme and compares the result with `tokens/tokens.json`.
- The semantic tokens sit under `theme`, not under `color`, so a consumer that reads the resolved tree reads
  `theme.color.text`.
- Renaming the group, the modifier or a context is a rename under [1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md).

## References

- [lib/dtcg.mjs](../../lib/dtcg.mjs), [tokens/tokens.resolver.json](../../tokens/tokens.resolver.json)
- [Design Tokens Resolver Module 2025.10](https://www.designtokens.org/tr/2025.10/resolver/), read 2026-11-16
- [1000](1000-one-token-source-and-one-generator-write-every-committed-file.md), the generator that writes both files
- [1002](1002-custom-properties-take-the-nc-prefix-and-only-semantic-tokens-are-public.md), the tiers
- [1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md), what a rename costs
- [Issue #6](https://github.com/NCodeGroup/brand/issues/6)
