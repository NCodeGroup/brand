# 10. Accessibility

The floor, stated once. Every surface built on Instrument meets it, and the build checks what can be checked.

## The Floor

- **WCAG 2.2 AA in both themes**: 4.5 to 1 for text, and 3 to 1 for large text, for the edge of a control and for the
  focus ring.
- **The ratios are computed, not estimated.** build.mjs resolves every token with the same color math a browser uses
  and measures every pairing the components use, for NCode's brand, for four tenant combinations and for six stress
  colors, in light and dark: [the table](02-color.md#computed-contrast). The build and `npm test` fail when one is below
  its requirement.
- **Meaning is never carried by color alone.** A status has a lamp shape and a word. A boundary has an icon, a word and
  a fill. A switch shows an I or an O. An error has an icon and a message.
- **Keyboard focus is visible** on every control, with one ring, lit on a screen, where it reaches 3 to 1 too.
- **`prefers-reduced-motion` stops all motion**, and each animated part rests in a designed still state.
- **A table that becomes a list on a phone** keeps its table roles in the markup, and its head stays available to
  assistive technology.
- **Every page runs under `Content-Security-Policy: default-src 'self'`**: no inline styles, no `data:` addresses and no
  request to another origin. `tools/shoot.mjs` serves the specimens under that policy and fails on a violation.

Not measured as requirements, because they are decoration or exempt: the hairlines between parts, disabled text, and
the unlit lamps of a selector. A word, a weight and a latched key carry those states.

A tenant's color is the one input no table can list. [Products and tenants](11-products-and-tenants.md) says how its
pairings are held, and where CSS alone cannot hold them.

## Browser Support

A browser from 2022 on renders everything. Four features are newer, and each has a fallback.

| Feature | Used for | Without it |
|---|---|---|
| `light-dark()`, relative colors, `color-mix()` (2024) | The semantic colors and a tenant's derived colors | `tokens/tokens.css` carries the same colors, computed by the build for NCode's brand, behind `@supports not`. Such a browser cannot derive a tenant's colors: the host sets them from `tokens/derive.mjs` |
| CSS masks, unprefixed (2023) | Braces | The prefixed property is written too. With neither, a brace is a 2-pixel rule and a boundary plate shows its icon and words |
| `:has()` (2023) | The wash behind the chosen row of a radio group | The lit radio says it; a component adds the class `is-selected` |
| `:focus-visible` (2022) | Showing the ring for the keyboard only | The ring shows on every focus |
| `text-wrap: balance` and `pretty` | Better line breaks | Ordinary line breaks |

Movement uses `transform`, never the separate `translate` and `rotate` properties. `tools/browser-check.mjs` checks,
in a browser, that the static palette and the build's color math agree with what the browser computes.
