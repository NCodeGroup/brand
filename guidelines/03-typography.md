# 3. Typography

Two voices carry every surface. A name is engraved: a fixed part of the case is labeled in narrow capitals. A value
is displayed: anything read off the system is set in a monospace face. Everything a person reads as a sentence is
sentence case.

## Families and Licenses

| Family | Role | License | Files |
|---|---|---|---|
| Instrument Sans Variable, weight 400 to 700, width 75 to 100, roman and italic | Names, headings and reading | SIL OFL 1.1, `fonts/OFL-Instrument-Sans.txt` | 4 woff2, 158 kB |
| Martian Mono Variable, weight 100 to 800, width 75 to 112.5 | Values, code, readouts | SIL OFL 1.1, `fonts/OFL-Martian-Mono.txt` | 2 woff2, 63 kB |
| Inter Display Medium | The wordmark only | SIL OFL 1.1 | None: it is outlines in the logo files |

The files are `@fontsource-variable/instrument-sans` and `@fontsource-variable/martian-mono` 5.3.0, byte for byte, and
[src/fonts/fonts.lock.json](../src/fonts/fonts.lock.json) pins each file's SHA-256: build.mjs refuses a font file that
differs. `css/fonts.css` holds only the `@font-face` rules, so the loading can be swapped in one place. Each family has
its Latin and Latin Extended subsets, which cover English, German, French and Spanish; a page in another script falls
back to the system's face.

Read the families from `--nc-font-sans` and `--nc-font-mono`. Each stack ends in system faces, so text is set before
the web font arrives, with `font-display: swap`.

## Width Is Part of the Voice

Instrument Sans is set at 82% for engraved labels, 86% for headings and 100% for text. Martian Mono is set at 75% for
values and code, where one character is 0.6 em wide: a listing 830 pixels wide holds a line of 100 characters at 13
pixels. On a readout it is set at 100%.

## Roles

A role is a font shorthand, `--nc-type-<role>`, with its width and its letter spacing beside it as
`--nc-type-<role>-stretch` and `--nc-type-<role>-tracking`. Set them together. The `label` role is the one
uppercase role, and it carries its case as `--nc-type-label-case`; a mono role also turns on the slashed zero,
`font-feature-settings: "zero" 1`.

```css
.column-head {
  font: var(--nc-type-label);
  font-stretch: var(--nc-type-label-stretch);
  letter-spacing: var(--nc-type-label-tracking);
  text-transform: var(--nc-type-label-case);
}
```

<!-- generated:typeroles -->
| Role | Family | Size / line | Weight | Width | Tracking | Use |
|---|---|---|---|---|---|---|
| `headline` | Instrument Sans | 60 / 60 | 600 | 86% | -0.028em | The one headline of a landing page |
| `title` | Instrument Sans | 40 / 43 | 600 | 86% | -0.022em | The title of a page |
| `title-long` | Instrument Sans | 32 / 35 | 600 | 86% | -0.022em | The title of a long-form page |
| `heading` | Instrument Sans | 24 / 28 | 600 | 86% | -0.012em | A section |
| `heading-long` | Instrument Sans | 24 / 28 | 600 | 86% | -0.012em | A section of a long-form page |
| `subheading` | Instrument Sans | 20 / 26 | 600 | 86% | -0.012em | A group within a section, the title of a dialog |
| `minor` | Instrument Sans | 16 / 21 | 600 | 100% | 0 | The smallest heading |
| `lead` | Instrument Sans | 18 / 27 | 400 | 100% | 0 | The first paragraph of a long-form page |
| `body` | Instrument Sans | 16 / 24 | 400 | 100% | 0 | Running text outside long-form pages |
| `reading` | Instrument Sans | 15 / 24 | 400 | 100% | 0 | Long-form documentation, on the measure |
| `ui` | Instrument Sans | 14 / 21 | 400 | 100% | 0 | The interface |
| `field` | Instrument Sans | 13 / 17 | 600 | 100% | 0 | The label of a field: sentence case, because a form is read, not scanned |
| `label` | Instrument Sans | 11 / 13 | 600 | 82% | 0.08em, uppercase | Engraved: the name of a fixed part. Column heads, group heads, tags, the boundary's kind |
| `value` | Martian Mono | 13 / 18 | 500 | 75% | -0.01em | Displayed: anything read off the system |
| `code` | Martian Mono | 13 / 21 | 400 | 75% | 0 | A listing |
| `readout` | Martian Mono | 12 / 12 | 500 | 100% | 0 | A short value on a screen |
<!-- /generated:typeroles -->

## The Scale

Sizes in pixels at the default root size: 11, 12, 13, 14, 15, 16, 18, 20, 24, 32, 40, 48, 60. The interface is set at
14, dense interface and code at 13, and long-form documentation at 15: a reader at a desk scans a page for one answer,
and a size above the interface's by one step keeps a screen of it in view. On a phone long-form text is 16. On a phone
a field of the console, a dialog, the sign-in pages and the site bar is 16 too, so the browser does not zoom into it;
a small field of the console or a dialog, `.well--sm`, stays at 13. The scale's steps are primitives: a component
reads a role, not a step.

## In Running Text

A value in a sentence, such as a type, a member, a file or a command, is inline code: Martian Mono on
`--nc-color-code-tint`, the text color thinned to a tint, with no edge. The face marks the value, and the tint shows
its extent on every surface in both themes. A reference page names dozens of identifiers on one screen: an edge
around each turns a paragraph into a row of boxes. Code of more than one line goes on a screen.

A run-in label is set in italic, never bold. It is the words that open a paragraph or a list item and name what
follows, such as *You write*, *What happens:* or *Rule.* In long-form text a column of bold labels outweighs the
sentences they introduce, and italic marks a label at the weight of the text. Keep bold for the one sentence of a
section a reader must not miss, such as the rule that opens [The Brace](04-shape-and-depth.md#the-brace). The word
of an alert, such as Note, is engraved: it is a label in the label voice, not a run-in label.

Instrument Sans has a true italic: `fonts/instrument-sans-latin-wdth-italic.woff2` and
`fonts/instrument-sans-latin-ext-wdth-italic.woff2`, which `css/fonts.css` names beside the roman files. Take them
with the roman ones. `css/base.css` turns off synthesized styles, so without them an italic is set upright. Martian
Mono has no italic: a value inside an italic label stays upright.

## Do and Don't

- Do set a value in a sentence as inline code, and a run-in label in italic: *What happens:*
- Do set a field's label in sentence case, and show the key a setting is stored under beside it as a value.
- Do set an ID, a count, a date, a hash or a secret as a value, in Martian Mono.
- Don't engrave a sentence, a caption or a field's label.
- Don't set prose in monospace, or a value in the label voice.
- Don't load Inter for interface text: it is the wordmark's face, and only as outlines in the logo files.
- Don't draw an edge around inline code, or set a run-in label in bold.
