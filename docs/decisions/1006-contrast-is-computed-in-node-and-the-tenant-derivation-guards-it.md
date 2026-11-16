# 1006. Contrast is computed in Node, and the tenant derivation guards it

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

A tenant replaces two colors, and everything they touch is derived: keys, text, focus rings, screens, braces. The
derivation is written in CSS, with relative colors and `color-mix()`, so a page needs no script to follow a tenant. CSS
cannot search, so a rule cannot raise a color that falls short of its contrast floor: in a sweep of 729 colors, nine
steps a channel, the rules hold every pairing for 698 and fall short for 31, mostly very bright greens as text
(measured by build.mjs on 2026-11-16; the guide's Products and tenants section holds the figures the build computes
from the current rules). A tenant's color is unbounded input. The contrast of every pairing must also be checked on every change, in CI, without
a browser to install.

## Decision

- **The contrast gate runs in Node.** build.mjs resolves every token with the same color math a browser uses, measures
  every pairing the components use for NCode Blue, four tenant combinations and six stress colors, in light and dark,
  and fails when one is below 4.5 to 1 for text or 3 to 1 for a part. The tests run it too.
  `tools/browser-check.mjs` compares that math with a browser by hand; they differ by at most one step of one channel.
- **`tokens/derive.mjs` derives a tenant's colors with guards.** It evaluates the CSS rules, then moves any color whose
  pairing is below its floor, in steps of OKLCH lightness, until it reaches it, and names what it moved. For every
  color whose rules already hold, it returns exactly what CSS computes. It is generated from the same color math and
  the same token source, imports nothing, and `tokens/derive.vectors.json` pins its results.
- A surface with one brand takes the CSS derivation. An application that accepts any tenant's color sets the derived
  colors from `tokens/derive.mjs`.

## Options considered

- **CSS for one brand, JavaScript with guards for any tenant** (chosen). The guarantee holds where the input is
  unbounded, and a static page still needs no script.
- **CSS only.** No script, but 31 of 729 colors fall short, and a browser without relative colors gets no tenant
  colors at all.
- **JavaScript only.** Every page would need a script to show NCode's own colors, and the CSS fallback would go.
- **The gate in a browser.** It measures what a browser paints, but needs a browser in CI; the Node math agrees with
  it to one step of one channel, which the by-hand check confirms.

## Consequences

- An application that accepts any color can tell a tenant when a color was corrected.
- The light key's face against its plate has no guard: it is the tenant's own color, and its edge carries the key. The
  guide states the limit.
- A change to a derivation rule changes `tokens/derive.mjs` and its vectors in the same pull request.

## References

- [lib/contrast.mjs](../../lib/contrast.mjs), [lib/derive.mjs](../../lib/derive.mjs),
  [tokens/derive.vectors.json](../../tokens/derive.vectors.json)
- [The guide: products and tenants](../../guidelines/11-products-and-tenants.md)
- [WCAG 2.2, success criteria 1.4.3 and 1.4.11](https://www.w3.org/TR/WCAG22/)
