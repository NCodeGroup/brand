# 7. Icons

An icon is a line drawing in the same hand as the mark: square-edged, one weight, no fill.

## How an Icon Is Drawn

- On a 16-unit grid, with a stroke of 1.5 and miter joins.
- NCode's own drawings end a line in a butt cap. An icon taken from Lucide ends it in a square cap: Lucide draws each
  line for a cap that reaches half the stroke past its end, and draws a dot as a line 0.01 units long, which a butt
  cap does not show.
- One stroke weight; no fill, except a dot NCode draws as a small circle.
- The line is 1.5 pixels at every size: every stroked shape in `icons/` carries
  `vector-effect="non-scaling-stroke"`, so a 20-pixel icon is drawn as finely as a 16-pixel one.
- The color is `currentColor`, so an icon takes the color of the text beside it.

## The Set

`icons/` holds each icon three ways: `icons/<name>.svg` alone, a symbol `i-<name>` in `icons/sprite.svg`, and its
shapes in `icons/icons.json`, for a component that draws it inline. `build.mjs` draws NCode's icons from
`src/icons/ncode.svg`. It takes Lucide's from the files `src/icons/lucide.lock.json` pins by SHA-256, scales each
from Lucide's 24-unit grid to 16, and draws it to the rules above.

<!-- generated:icon-list -->
| Drawn by | Line ends | Icons |
|---|---|---|
| NCode, in `src/icons/ncode.svg` | Butt caps | `arrow-left`, `arrow-right`, `arrow-up-right`, `building`, `caution`, `check`, `chevron-down`, `chevron-left`, `chevron-right`, `chip`, `clients`, `close`, `cloud`, `copy`, `device`, `edit`, `error`, `eye`, `file`, `globe`, `info`, `key`, `layers`, `lock`, `menu`, `moon`, `people`, `pin`, `plus`, `recycle`, `scope`, `search`, `server`, `shield`, `sign-out`, `sliders`, `success`, `sun`, `trash`, `user`, `zero` |
| Lucide 1.72.0, restyled | Square caps | `activity`, `bell`, `calendar`, `circle-question-mark`, `clock`, `code`, `database`, `download`, `ellipsis`, `ellipsis-vertical`, `fingerprint-pattern`, `funnel`, `git-branch`, `link`, `log-in`, `mail`, `minus`, `package`, `qr-code`, `refresh-cw`, `rotate-ccw-clock`, `settings`, `terminal`, `upload` |
<!-- /generated:icon-list -->

One source draws each name: Lucide supplies only icons NCode does not draw, and the build stops on a name both draw.
Draw a new icon to these rules in `src/icons/ncode.svg`, or take one from Lucide by adding its file and its SHA-256
to the lock ([the decision](../docs/decisions/1008-the-icon-set-is-ncodes-own-drawings-and-a-pinned-lucide-subset-restyled-to-one-grid.md)).

## How an Icon Is Used

- `.icon` is 16 pixels, for a dense interface; `.icon--sm` 14, `.icon--lg` 20 beside text of 16 pixels and above, and
  `.icon--xl` 24.
- An icon never carries a state alone: a word sits beside it, as a lamp's does.
- A key that holds only an icon has an accessible name, `aria-label` or a visually hidden word (`.vh`).
- No emoji, and no icon font: a font's glyphs change with the font, and a screen reader reads them out.

Take an icon from the sprite on the page's own origin, and `css/base.css` gives it its size and stroke:

```html
<svg class="icon" aria-hidden="true"><use href="brand/icons/sprite.svg#i-search"/></svg>
```

The specimens in [specimens/](../specimens/) take the icons each page uses from the set, in a generated block of the
sprite at the top of the page.

## License

NCode's drawings are under the Apache License 2.0, as the rest of the system is. The icons from Lucide keep Lucide's
licenses: the ISC License, and the MIT License for the icons Lucide derives from Feather. Both ask every copy to carry
its notice, so vendor `icons/LICENSE-Lucide.txt` with any Lucide icon; each Lucide file and the sprite name it.
