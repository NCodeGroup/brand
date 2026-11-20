# 4. Shape, Depth and the Brace

Instrument is flat and hard-edged: depth is drawn with 1- and 2-pixel edges, never with gradients or glow. That is
what keeps the instrument metaphor from turning into a picture of one.

## Shape and Depth

- *Radii grow with the part.* Cell 2, label plate 4, key and well 6, plate and screen 10, dialog and card 14, lamp
  round: `--nc-radius-cell`, `-plate`, `-control`, `-panel`, `-module` and `-round`.
- *Two lines.* A 1-pixel hairline between parts is decoration, `--nc-color-border`. The 1-pixel edge of a control is
  `--nc-color-border-strong`, 3 to 1 against every surface.
- *Depth is three hard-edged states.* Recessed: a 2-pixel shade inside the top edge, `--nc-elevation-recessed`.
  Flush: a 1-pixel lip, `--nc-elevation-flush`. Raised: a 2-pixel lip, `--nc-elevation-raised`.
- *One soft shadow* exists, under menus, dialogs and sheets: `--nc-elevation-floating` and `--nc-elevation-overlay`.
- *Raise only what can be pressed.* A raised part says "press me"; a plate that cannot be pressed is flush.
- *Focus is one ring.* 2 pixels of `--nc-color-focus`, 2 pixels clear of the part, on everything. On a screen the
  ring is lit, `--nc-color-screen-lit`, and a listing that scrolls draws it just inside its own edge.

## Hazard Tape

Amber and near-black stripes at 45 degrees, `--nc-color-hazard` and `--nc-color-on-hazard`. Tape means "this is not
routine", and it is the only pattern in the system: a non-production tenant's banner, a caution, a pre-release notice
and the platform boundary wear it. Don't use stripes for decoration, for an error or for emphasis.

## The Brace

**A brace marks a scope: it is drawn around what one named boundary holds, a security boundary or the lifetime of a
secret, and nowhere else.**

A motif drawn everywhere stops meaning anything, so the brace has six uses and a list of places it never goes.

| Place | What it holds | Size and ink |
|---|---|---|
| The console's workspace | Everything the active boundary governs: the selector and the page | `brace-lg`, the ink of the boundary's kind |
| A tenant's card: sign-in, consent, an authorization error | What the tenant shows its user | `brace-lg`, `brace-md` on a phone, `scope-tenant` |
| The memory panel | The bytes of a key while it is in scope | `brace-lg`, lit |
| A listing | The lines in which a secret lives, from the line that creates it to the line where it is zeroed | `brace-sm`, lit, in the gutter |
| A diagram of the settings cascade | Each boundary's settings, nested | `brace-md`, left side only, one ink per kind |
| The boundary plate | The kind and the name of a boundary | The mark's own brace, in the plate's ink |

*Where it is not used:* callouts, alerts, quotes, lists, headings, tables, navigation, cards that are not a boundary,
loading and not-found pages, and anything decorative. A callout keeps its signal bar and a caution keeps its tape. A
screen whose boundary is not known yet has no brace: a loading screen states that by leaving it out.

*Construction.* The brace is drawn the way the mark's brace is: straight stems, circular hooks at the ends, and a
cusp of two arcs whose tip is half the stroke high. build.mjs draws every brace in [brace/](../brace/) from the numbers
in [src/tokens.source.json](../src/tokens.source.json), and `brace/brace.json` holds the same pieces as path data for a
component that draws the brace inline. The brace on a boundary plate is the mark's own, drawn from the mark's geometry.
The stretching braces keep their hooks and cusp at a fixed size while the stems take the height; their radii are about
twice the mark's for the same stroke, so the shape still reads as a brace when the stems are long.

<!-- generated:braces -->
| Brace | Stroke | Hook radius | Cusp radius | Width | Smallest height | Use |
|---|---:|---:|---:|---:|---:|---|
| `brace-mark` | 4 of 64 units | 5 | 6 | 12 of 48 units | Fixed shape | The boundary plate |
| `brace-sm` | 2 px | 4 | 4 | 10 px | 17 px | A lifetime in a code listing |
| `brace-md` | 3 px | 6.5 | 7.5 | 17 px | 30 px | A card, the memory panel |
| `brace-lg` | 4 px | 9 | 10 | 23 px | 40 px | The frame of a console workspace |
<!-- /generated:braces -->

*Inks.* A tenant's brace is `--nc-color-scope-tenant`, from the tenant's secondary color. A team's is
`--nc-color-scope-team`, plain ink. The platform's is hazard tape, `--nc-color-scope-platform` striped with
`--nc-color-on-hazard`. On a screen a brace is `--nc-color-screen-lit`. The ink agrees with the boundary plate, whose
icon and word say the kind, so the kind is never told by color alone.

*One frame in a view.* A view has at most one pair of frame braces. A dialog restates the boundary with the plate,
not with a second frame. On a phone the console drops the frame and keeps the plate, which stays in view on the sticky
display.

*Never a glyph.* A brace is a CSS mask of an SVG file, so it takes any color and no font can alter it. Don't set a
brace in a font: a font's brace and the mark's differ. Without CSS masks, `css/base.css` draws a brace as a plain
2-pixel rule in the same ink.

In `css/base.css`: `.brace` frames an element, `.brace--md` and `.brace--sm` set the size, `data-scope` on it picks the
ink, `.lifetime` marks a secret's lines in a listing, and `.boundary` is the plate.
