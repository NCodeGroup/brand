# Start Here

NCode's look and feel is called Instrument. Its mark is a value held between the braces of code, and every NCode
surface is built the same way: a neutral, precisely made case of engraved labels, keys and wells that holds live
values, lit on screens and lamps, with the mark's own brace drawn around what one boundary holds.

This guide says what Instrument is made of, when to use each part, and which file in this repository carries it. The
pages in [specimens/](../specimens/) show every part at work: [foundations.html](../specimens/foundations.html) holds
the whole kit, and each other page is a scene from a real surface.

## Principles

1. **The frame is fixed, the value is live.** Structure is stone and engraved type. Color belongs to values, to state
   and to the tenant.
2. **A brace marks a scope.** The mark's brace is drawn around what one boundary holds, and nowhere else.
3. **Names are engraved, values are displayed.** A fixed part carries narrow capitals. Anything read off the system is
   monospace.
4. **Depth means one thing.** A lip below: press it. A shade above: fill it. Flush: a plate. Hard edges only.
5. **State is lit, and said.** A lamp or a lit plate always sits beside a word, and its shape changes with the state.
6. **Hazards wear tape.** Test environments, cautions and the platform boundary carry amber and black stripes.
7. **Keys travel, readouts tick.** A key moves 2 pixels in 70 milliseconds. A value changes in one step. Nothing else
   moves.

## Sections

| # | Section | What it decides |
|---|---|---|
| 1 | [Marks](01-marks.md) | The `{N}` and `{id}` marks, their files, their clear space and sizes, and how to write the names |
| 2 | [Color](02-color.md) | The ramps, the roles components read, and the computed contrast |
| 3 | [Typography](03-typography.md) | The two voices, the type roles and the scale |
| 4 | [Shape, depth and the brace](04-shape-and-depth.md) | Radii, lines, depth, hazard tape, and where a brace may appear |
| 5 | [Layout and density](05-layout.md) | Space, control heights, the reading measure and the breakpoints |
| 6 | [Components](06-components.md) | Keys, wells, lamps, screens, the display and the boundary plate |
| 7 | [Icons](07-icons.md) | How an icon is drawn and used, and the files of the set |
| 8 | [Motion](08-motion.md) | What moves, how far and how fast |
| 9 | [Voice](09-voice.md) | How NCode writes, in prose and in an interface |
| 10 | [Accessibility](10-accessibility.md) | The floor every surface meets, and the browsers it serves |
| 11 | [Products and tenants](11-products-and-tenants.md) | What a product owns, and what a tenant may change |
| 12 | [Applying it](12-applying.md) | Which files each kind of consumer takes, and how |
| 13 | [Token reference](13-token-reference.md) | Every token, its value in light and dark, and its tier |
| 14 | [Versions and license](14-versions-and-license.md) | What a version number promises, and which license covers what |

## Which File for What

Every path is from the root of a release. Keep the release's folders side by side: `css/base.css` finds the braces in
`brace/`, and `css/fonts.css` finds the fonts in `fonts/`.

| You build | Take |
|---|---|
| A page in plain HTML and CSS | `tokens/tokens.css`, `css/fonts.css` with `fonts/`, `css/base.css` with `brace/` |
| A documentation site on Starlight | `tokens/tokens.css`, `css/fonts.css` with `fonts/`, `css/starlight.css` |
| A Material UI application | `mui/instrument.json`, `tokens/tokens.mjs`, `tokens/derive.mjs`, `css/fonts.css` with `fonts/` |
| A tool or a format with its own theme | `tokens/tokens.json`, in the Design Tokens format 2025.10 |
| An email, or a page without 2024 CSS | `tokens/tokens.static.css`, every color written out |
| A logo in a README, a favicon, a package icon | The files in `logo/ncode/`, or `logo/identity/` for NCode Identity, as [Marks](01-marks.md) says |
| An icon | `icons/sprite.svg` with `css/base.css`, or one `icons/<name>.svg`; `icons/LICENSE-Lucide.txt` with any Lucide icon, as [Icons](07-icons.md) says |
| A component that draws the brace, an icon or the mark inline | `brace/brace.json`, `icons/icons.json`, `logo/ncode/outlines.json`, `logo/identity/outlines.json` |

[Applying it](12-applying.md) says how, for each.

## Tokens: the One Rule

Read semantic tokens: the color roles (`--nc-color-*`), the type roles (`--nc-type-*`), elevation, the font families,
the measures and the two tenant inputs. The color ramps and the steps of the type scale are private primitives, which
may change in any release ([the decision](../docs/decisions/1002-custom-properties-take-the-nc-prefix-and-only-semantic-tokens-are-public.md)).

## Pin a Version

Take files from one tagged release's archive, whose build provenance the GitHub CLI verifies, and check them against
its `manifest.json`: copy [vendoring/vendor-brand.mjs](../vendoring/vendor-brand.mjs) into your repository, name the
files you take in a `brand.lock.json`, and run it with `--update <version>` to verify and vendor them and with
`--check` in your gate to prove they did not drift. [Applying it](12-applying.md#vendor-a-release) has the steps,
and [Versions and license](14-versions-and-license.md) says what a version number promises.
