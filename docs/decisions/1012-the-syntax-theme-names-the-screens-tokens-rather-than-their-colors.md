# 1012. The syntax theme names the screen's tokens rather than their colors

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

A code block is a screen, and a screen is the same in both themes. Code on it takes five roles, the ones the `.tk-*`
classes of `src/css/base.css` use: keywords `screen-lit`, types and members `on-screen`, comments `on-screen-muted`,
literals `screen-hot` and the rest `on-screen-secondary`. The contrast gate holds each of them at 4.5 to 1 on the
screen for any tenant's color ([1006](1006-contrast-is-computed-in-node-and-the-tenant-derivation-guards-it.md)).

Expressive Code takes a VS Code color theme and passes each token color to the page as it is written. It reads
`editor.background` and `editor.foreground` as colors, and its contrast correction computes with every color.

## Decision

`syntax/instrument-screen.json` is the VS Code color theme `instrument-screen`, of type `dark`.

- It colors each TextMate scope with the `var()` of a screen role's custom property, such as `--nc-color-screen-lit`.
- Its two editor colors, `editor.background` and `editor.foreground`, are hex for NCode's own brand, because Expressive
  Code needs them to load a theme.
- One theme serves both page themes, because the screen is the same in both.
- `lib/syntax.mjs` maps scopes to roles, and `build.mjs` writes the file from the one model.
- The frame, Expressive Code's `styleOverrides`, stays in the docs toolchain beside the Expressive Code version it is
  written for ([1005](1005-this-repository-ships-data-and-stylesheets-never-a-frameworks-theme-code.md)).

## Options considered

- **The roles' custom properties** (chosen). The page's `tokens/tokens.css` resolves each color for the brand in force,
  and the gate's pairings are what a reader sees.
- **Hex colors.** VS Code could load the theme and Expressive Code could correct it, but a tenant's screen would keep
  NCode's colors.
- **A light and a dark theme.** The screen does not change with the theme, so the second would repeat the first.
- **The theme kept in the docs toolchain.** The scope-to-role mapping is part of the look, and it would drift from the
  `.tk-*` classes.

## Consequences

- A page that uses it loads `tokens/tokens.css` and sets `minSyntaxHighlightingColorContrast` to 0.
- VS Code cannot use it as an editor theme, because it does not resolve a custom property.
- A change to a scope's role is a value change, a minor version
  ([1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md)).

## References

- [lib/syntax.mjs](../../lib/syntax.mjs), [syntax/instrument-screen.json](../../syntax/instrument-screen.json)
- [src/css/base.css](../../src/css/base.css), the `.tk-*` classes
- [Expressive Code themes](https://expressive-code.com/guides/themes/), read 2026-11-16
- [1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md), what a value change costs
- [1005](1005-this-repository-ships-data-and-stylesheets-never-a-frameworks-theme-code.md), what stays in the docs
  toolchain
- [1006](1006-contrast-is-computed-in-node-and-the-tenant-derivation-guards-it.md), the contrast gate
- [Issue #6](https://github.com/NCodeGroup/brand/issues/6)
