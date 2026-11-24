# 1017. Long-form text is 15 pixels on a 42 rem measure, and a documentation frame stays together in the middle of the window

- **Status:** Accepted
- **Date:** 2026-11-24
- **Deciders:** NCode Group

## Context

A documentation site is read at a desk, in a window 1280 to 2560 pixels wide, by a reader who scans for one answer: a
type, a member, a listing. A landing page leads to it and is read the same way. How much of a page one screen shows,
and how far apart its parts stand, decide whether that reader finds the answer by the page around it.

The interface is set at 14 pixels, with controls 36 pixels high. `--nc-control-lg`, 44 pixels, is the height of a
control on a phone.

Instrument Sans sets a character of English text in about 0.46 em at text sizes (measured in Chromium on the guide's
own paragraphs, 2026-11-24). Martian Mono at 75% width sets a character in 0.6 em, so a listing line of 100
characters at 13 pixels is 780 pixels of code.

Starlight, which NCode's documentation sites are built on, gives a hero's copy 7/11 of the content panel from 50 rem
up, whether or not the hero has an image (`Hero.astro` of `@astrojs/starlight` 0.43.1, read 2026-11-24). It fixes the
sidebar to the window's left edge and gives the page index half of the width the content panel leaves
(`TwoColumnContent.astro`, same version).

## Decision

**The type scale's steps above 16 pixels are 18, 20, 24, 32, 40, 48 and 60. Long-form text is 15 pixels on a line of
24, on a 42 rem measure. A documentation page's selector, sheet and page index stand together in the middle of the
window, no wider than 90 rem.**

1. The scale is 11, 12, 13, 14, 15, 16, 18, 20, 24, 32, 40, 48 and 60 pixels. The `reading` step, 15, stands between
   the interface's 14 and the body's 16.
2. The roles take these steps: `reading` 15 on a line height of 1.6, `lead` 18, `subheading` 20, `heading` and
   `heading-long` 24, `title-long` 32, `title` 40 and `headline` 60. `code` keeps 13 pixels on a line height of 1.6.
3. A long-form page's title and section headings are one size at every width. On a phone its running text is 16
   pixels: it is read in worse light than a desk has.
4. `--nc-measure` is 42 rem, about 95 characters of `reading`. `css/starlight.css` sets Starlight's content panel to
   52 rem, which holds a listing line of 100 characters inside the listing's padding, and its sidebar to 17 rem, the
   selector with a gutter on each side. It sets `--sl-text-body` to the `reading` step; Starlight reads that property
   for a card's text alone and sets no size on running text, so a toolchain's own rules set the `reading` role.
5. A section of a long-form page starts with a rule, 40 pixels after the text before it and 32 before its heading.
   Blocks of text stand 16 pixels apart.
6. `.docs__frame` and the site bar above it are no wider than 90 rem and stand in the middle of the window. The
   selector and the page index are set at 13 pixels, and an entry of the selector is `--nc-control-sm` high. At 960
   pixels and below the selector is a sheet over the page, and an entry in it is 14 pixels and 40 pixels high.
7. A landing page's headline is 60 pixels, 48 at 1088 pixels and below and 40 on a phone, the line under it 18 on a
   measure of 36 rem, and its keys the interface's, `--nc-control-md`, with `--nc-control-lg` on a phone.
8. The contrast floor, the control heights, the space scale, the breakpoints and the interface's own size are no part
   of this decision: the console is set at 14 pixels.

## Options considered

Each option is counted in a window of 1905 by 1415 pixels, measured in Chromium on NCode.PropertyBag's site,
2026-11-24.

- *15 pixels on a line of 24, on a 42 rem measure, with a title of 32, a section heading of 24 and a headline of 60*
  (chosen). A screen holds 58 lines of text, each of about 97 characters, and a headline of four words is one line.
  The steps are the scale's own, so every role and every rule of `css/base.css` that reads a step follows: a section
  head of a product page, a card's title and a dialog's title keep their order under the title.
- *17 pixels on a line of 29, on a 41 rem measure, with a title of 44, a section heading of 28 and a headline of 76.*
  A screen holds 48 lines of about 84 characters. The headline breaks after two words in the 490 pixels Starlight
  gives a hero's copy beside a sidebar. NCode's maintainers read pages set this way as large print and as cramped at
  once: little on a screen, and what is there in a narrow column.
- *16 pixels on a line of 26.* A screen holds 54 lines, and a title 2.75 times the text still sets the page's scale.
- *14 pixels, the interface's size.* The guide's own pages are paragraphs that are read, not rows that are operated:
  one step above the interface keeps the two apart.
- *17 pixels on a wider measure.* 52 rem is a line of about 107 characters, and a screen still holds 48 lines.
- *A sheet as wide as the window, with the selector at the window's edge.* The sheet is 1056 pixels wide in
  Starlight's layout. Text on a 41 rem measure fills 656 pixels of it, and the page index stands in a column of 550
  pixels beyond it, of which its entries fill 220. Text as wide as the sheet is a line of more than 120 characters.
- *A size that follows the window, `clamp()` with a viewport unit.* A role is then a different number in each window,
  and a guide that states exact numbers cannot state it.
- *Two ladders of steps, one for the interface and one for long-form pages.* Each rule that reads a step is then a
  choice between them.

## Consequences

- A value change is a minor version
  ([1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md)): 0.13.0.
- Everything that reads a role follows: the slides, which set each role at 1.75 times its size
  ([1013](1013-slides-are-a-marp-theme-and-the-email-and-the-theme-carry-every-value-written-out.md)), the email's
  heading, and `mui/instrument.json`.
- A documentation toolchain that vendors `css/starlight.css` gets a content panel of 52 rem and a sidebar of 17 rem.
  The widths it states to the authors of components follow them, and its own rules keep the selector, the sheet and
  the page index together and give a hero with no image one column, as `guidelines/12-applying.md` says.
- A line of about 95 characters is longer than the 80 that WCAG 2.2's success criterion 1.4.8 asks for at level AAA.
  The floor is level AA, which sets no line length. A reader who needs shorter lines narrows the window, and the
  text wraps to it.
- `tests/stylesheets.test.mjs` holds the order of the long-form steps, the measure between 80 and 100 characters, the
  one size of a heading at every width, and the frame's cap and Starlight's widths as the guide states them.

## References

- `src/tokens.source.json`, `src/css/base.css`, `src/css/starlight.css`.
- [guidelines/03-typography.md](../../guidelines/03-typography.md), [guidelines/05-layout.md](../../guidelines/05-layout.md),
  [guidelines/12-applying.md](../../guidelines/12-applying.md).
- [W3C: Understanding SC 1.4.8, Visual Presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html),
  read 2026-11-24.
