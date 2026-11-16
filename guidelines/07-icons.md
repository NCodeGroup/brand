# 7. Icons

An icon is a line drawing in the same hand as the mark: square-edged, one weight, no fill.

## How an Icon Is Drawn

- On a 16-unit grid, with a stroke of 1.5, butt caps and miter joins.
- One stroke weight; no fill, except a dot drawn as a small circle.
- The line is 1.5 pixels at every size: `css/base.css` keeps the stroke from growing with the icon
  (`vector-effect: non-scaling-stroke` on the sprite's shapes), so a 20-pixel icon is drawn as finely as a 16-pixel
  one.
- The color is `currentColor`, so an icon takes the color of the text beside it.

## How an Icon Is Used

- `.icon` is 16 pixels, for a dense interface; `.icon--sm` 14, `.icon--lg` 20 beside text of 16 pixels and above, and
  `.icon--xl` 24.
- An icon never carries a state alone: a word sits beside it, as a lamp's does.
- A key that holds only an icon has an accessible name, `aria-label` or a visually hidden word (`.vh`).
- No emoji, and no icon font: a font's glyphs change with the font, and a screen reader reads them out.

The specimens in [specimens/](../specimens/) carry the icons they use in a sprite at the top of each page, drawn to
these rules. This release has no icon set as separate files.
