# 5. Layout and Density

## Space

Space is a 4-pixel scale with two half steps: 2, 4, 8, 12, 16, 24, 32, 48, 64 and 96 pixels, `--nc-space-1` to
`--nc-space-10`, and `--nc-space-0`. A part's padding and the gap between parts take a step of the scale; a value
between two steps is a sign that a part is the wrong size.

## Controls

| Height | Token | Where |
|---|---|---|
| 28 px | `--nc-control-sm` | A ghost key repeated in every row of a table, a key on a screen |
| 36 px | `--nc-control-md` | Every key and field of the interface |
| 44 px | `--nc-control-lg` | Every control on a phone, and the primary key of a sign-in card |

A key stands `--nc-travel`, 2 pixels, proud of its plate. A table row is 40 pixels high and its head 36.

## Long-Form Pages

Documentation gets room. Text runs on a 41 rem measure, `--nc-measure`, at 17 pixels with a line height of 1.7, the
`reading` role. The title is 56 pixels, `title-long`, and a section heading 36, `heading-long`. A section starts with a
rule, 64 pixels after the text before it and 40 before its heading. Listings and tables start `--nc-bleed`, 20 pixels,
before the text and use the width of the sheet, so what is in them lines up with the text.

## The Console

The console is a faceplate. A sticky bar holds the brand, the way out of the boundary and the display; below it the
workspace stands between the braces of the boundary the user acts in, with the selector on a plate that runs the
workspace's height. A table's unused rows keep the row rhythm, ruled but empty.

## Breakpoints

Media queries cannot read custom properties, so `css/base.css` repeats these numbers, and `tokens/tokens.mjs` and
`mui/instrument.json` export them for a theme's breakpoints.

| Below | Token | What changes |
|---|---|---|
| 1280 px | `--nc-breakpoint-desk` | Documentation drops its page index |
| 1088 px | `--nc-breakpoint-tablet` | The console's selector, the way out and the session move into a sheet |
| 640 px | `--nc-breakpoint-phone` | A table becomes a list of two-line rows, a dialog becomes a sheet that rises from the bottom edge with its keys side by side, and every control is at least 44 pixels high |

No page scrolls sideways at any width: a listing scrolls inside its own screen. The one exception is the kit's catalog,
[specimens/foundations.html](../specimens/foundations.html), which is laid out for a desktop window. A table that
becomes a list keeps its table roles in the markup, so assistive technology still reads a table.
