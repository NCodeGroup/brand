# 3. Typography

Two voices carry every surface. A name is engraved: a fixed part of the case is labeled in narrow capitals. A value
is displayed: anything read off the system is set in a monospace face. Everything a person reads as a sentence is
sentence case.

## Families and Licenses

| Family | Role | License | Files |
|---|---|---|---|
| Instrument Sans Variable, weight 400 to 700, width 75 to 100 | Names, headings and reading | SIL OFL 1.1, `fonts/OFL-Instrument-Sans.txt` | 2 woff2, 76 kB |
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
| `headline` | Instrument Sans | 76 / 76 | 600 | 86% | -0.028em | The one headline of a landing page |
| `title` | Instrument Sans | 44 / 48 | 600 | 86% | -0.022em | The title of a page |
| `title-long` | Instrument Sans | 56 / 58 | 600 | 86% | -0.026em | The title of a long-form page |
| `heading` | Instrument Sans | 28 / 33 | 600 | 86% | -0.012em | A section |
| `heading-long` | Instrument Sans | 36 / 41 | 600 | 86% | -0.022em | A section of a long-form page |
| `subheading` | Instrument Sans | 22 / 29 | 600 | 86% | -0.012em | A group within a section, the title of a dialog |
| `minor` | Instrument Sans | 16 / 21 | 600 | 100% | 0 | The smallest heading |
| `lead` | Instrument Sans | 22 / 33 | 400 | 100% | 0 | The first paragraph of a long-form page |
| `body` | Instrument Sans | 16 / 24 | 400 | 100% | 0 | Running text outside long-form pages |
| `reading` | Instrument Sans | 17 / 29 | 400 | 100% | 0 | Long-form documentation, on the measure |
| `ui` | Instrument Sans | 14 / 21 | 400 | 100% | 0 | The interface |
| `field` | Instrument Sans | 13 / 17 | 600 | 100% | 0 | The label of a field: sentence case, because a form is read, not scanned |
| `label` | Instrument Sans | 11 / 13 | 600 | 82% | 0.08em, uppercase | Engraved: the name of a fixed part. Column heads, group heads, tags, the boundary's kind |
| `value` | Martian Mono | 13 / 18 | 500 | 75% | -0.01em | Displayed: anything read off the system |
| `code` | Martian Mono | 13 / 22 | 400 | 75% | 0 | A listing |
| `readout` | Martian Mono | 12 / 12 | 500 | 100% | 0 | A short value on a screen |
<!-- /generated:typeroles -->

## The Scale

Sizes in pixels at the default root size: 11, 12, 13, 14, 16, 17, 19, 22, 28, 36, 44, 56, 76. The interface is set at
14, dense interface and code at 13, long-form documentation at 17. On a phone a field of the console, a dialog, the
sign-in pages and the site bar is 16, so the browser does not zoom into it; a small field, `.well--sm`, stays at 13.
The scale's steps are primitives: a component reads a role, not a step.

## Do and Don't

- Do set a field's label in sentence case, and show the key a setting is stored under beside it as a value.
- Do set an ID, a count, a date, a hash or a secret as a value, in Martian Mono.
- Don't engrave a sentence, a caption or a field's label.
- Don't set prose in monospace, or a value in the label voice.
- Don't load Inter for interface text: it is the wordmark's face, and only as outlines in the logo files.
