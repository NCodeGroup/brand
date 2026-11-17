# 1013. Slides are a Marp theme, and the email and the theme carry every value written out

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

An email and a slide deck show the brand where no page loads `tokens/tokens.css`. Most email clients drop a `<style>`
element, a custom property and a web font, and Outlook on Windows lays out with Word's engine, which needs tables. A
deck needs a file format that a person writing slides opens and that `build.mjs` writes with Node.js alone
([1000](1000-one-token-source-and-one-generator-write-every-committed-file.md)). This repository ships data and
stylesheets, never a framework's theme code
([1005](1005-this-repository-ships-data-and-stylesheets-never-a-frameworks-theme-code.md)).

Marp turns a Markdown file into slides, as HTML, PDF or PowerPoint, through Marp CLI or its VS Code extension. A Marp
theme is one CSS file that styles each slide's `section`, its `header` and `footer` and its page number,
`section::after`, as Marpit's theme CSS documents, and its `rem` is the slide's font size. Marp CLI 4.5.1, the latest
release on 2026-11-16, renders with Marp Core 4, which highlights code with highlight.js; Marp Core 5, a pre-release
on that date, highlights with Shiki.

## Decision

`email/instrument.html` is an HTML email, and `slides/instrument.css` is the Marp theme `instrument`. `build.mjs`
writes each from a hand-written source, `src/email/instrument.html` and `src/slides/instrument.css`, whose
`[[kind:name]]` placeholders `lib/templates.mjs` fills with the tokens' values, resolved for NCode's own brand.

- The email writes every value inline, in `style` attributes: no `<style>` element, custom property or web font. It is
  the light theme alone, one column 600 pixels wide, in tables. The sending application's template engine fills its
  slots, such as `{{ heading }}`, escaped as HTML.
- The email's key and its screen take their colors from slots named after the colors `deriveBrand()` of
  `tokens/derive.mjs` writes, with `_` for `-`: `{{ primary }}`, `{{ primary_lip }}`, `{{ on_primary }}`,
  `{{ screen }}` and `{{ on_screen }}`. The application fills them from `deriveBrand()`'s light theme, which gives
  NCode's own colors without a tenant's and whose guards hold each label on its color, so one email serves NCode and
  every tenant. Its other colors don't change with a tenant, and stay written inline.
- The theme writes every value out: the light theme on each slide, and the dark one under the class `invert`. It
  embeds Instrument Sans and Martian Mono as `data:` addresses, the `@font-face` rules of `src/css/fonts.css` with each
  file's bytes, so a deck renders in them on any machine and loads no other file. A slide is 1280 by 720 pixels at a
  font size of 28 pixels, so each type role is 1.75 times its size on a screen.
- The theme styles only what Marpit's theme CSS documents and the HTML that Markdown produces. It colors no syntax,
  because the highlighter's classes change with the Marp Core version.

## Options considered

- **A Marp theme** (chosen). It is a stylesheet, written with Node.js alone and reviewed as text, and Marp exports a
  deck to HTML, PDF and PowerPoint.
- **A PowerPoint template, `.potx`.** It is a ZIP of Office Open XML parts that `build.mjs` would write with no
  packages, a pull request can't review it line by line, and PowerPoint uses a font only when the machine that opens
  the deck has it installed.
- **A reveal.js theme.** It is CSS too, but it styles the markup of one reveal.js version, and the deck is an HTML page
  someone writes and serves.
- **Custom properties, with `tokens/tokens.css` beside the file.** Marp registers a theme as one file by its path, and
  an email client drops custom properties: both files would lose their values.
- **The fonts named, not embedded.** The theme would be about 6 KB instead of about 195 KB, both estimates, but a deck
  would fall back to the system's faces on every machine without the two typefaces installed.
- **A function that rewrites the email's colors for a tenant.** It would find NCode's colors by their values, and two
  roles can share a value, so it could recolor the wrong part.

## Consequences

- A change to a token's value changes both files, a minor version
  ([1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md)).
- The theme carries two fonts under the SIL Open Font License 1.1: a consumer vendors `fonts/OFL-Instrument-Sans.txt`
  and `fonts/OFL-Martian-Mono.txt` with it.
- A deck that wants colored code styles its highlighter in its own `<style>`, beside the Marp version it renders with.
- An application that fills the email's color slots with anything but `deriveBrand()`'s values, such as a tenant's
  color as it was typed, loses the contrast its guards hold.
- A client that forces a dark scheme on an email still inverts it.

## References

- [lib/templates.mjs](../../lib/templates.mjs), [src/email/instrument.html](../../src/email/instrument.html),
  [src/slides/instrument.css](../../src/slides/instrument.css)
- [The guide: applying it](../../guidelines/12-applying.md)
- [Marpit theme CSS](https://marpit.marp.app/theme-css), read 2026-11-16
- [Marp Core 4 auto-scaling](https://github.com/marp-team/marp-core/tree/v4#auto-scaling-features), read 2026-11-16
- [Marp CLI releases](https://github.com/marp-team/marp-cli/releases), v4.5.1 the latest on 2026-11-16
- [1000](1000-one-token-source-and-one-generator-write-every-committed-file.md), [1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md),
  [1005](1005-this-repository-ships-data-and-stylesheets-never-a-frameworks-theme-code.md)
- [Issue #21](https://github.com/NCodeGroup/brand/issues/21)
