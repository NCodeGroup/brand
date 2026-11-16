# The Marks' Sources

[ncode.json](ncode.json) holds the geometry of the `{N}` mark, which build.mjs draws every file of
[logo/ncode/](../../logo/ncode/) and [brace/brace-mark.svg](../../brace/brace-mark.svg) from, and
[identity.json](identity.json) holds the geometry of the `{id}` mark, which build.mjs draws every file of
[logo/identity/](../../logo/identity/) from. [kit.md](kit.md) is the text of [logo/README.md](../../logo/README.md).
Edit them here and run `npm run build`. The marks are NCode Group's: [TRADEMARKS.md](../../TRADEMARKS.md) says how you
may use them.

Both sources have the same members. Each describes the numbers of its own drawing in `$fields`, `$master` and
`$fitted`; the members they share are these:

- `name`: the product the mark stands for, the title of every SVG and the web manifest's `name`.
- `shortName`: the web manifest's `short_name`.
- `prefix`: how every file's name starts.
- `letters`: what `lib/logo.mjs` draws between the braces, `N` or `id`.
- `outlinesDescription`: the `$description` of `outlines.json`.
- `fit`: how much of its square the mark covers: tight, across seven eighths of it, where the picture is shown small
  (favicons, NuGet, badges); regular on tiles and avatars; safe inside the center circle of 80% of the width, where a
  circle is cut from it (profile pictures, maskable icons).
- `lockups`: the lockups, each the mark and the wordmark in one drawing. The cards carry the first lockup. Each lockup
  has these members:
  - `file`: names its files.
  - `key`: names its entry in `outlines.json`.
  - `width` and `height`: the drawing's size, in units.
  - `mark`: the mark's scale and where its canvas's corner goes.
  - `wordmark`: where the wordmark's path goes.
  - `markDigits`: the decimals of the mark's part of the lockup's SVG path; the wordmark's part has 2.
  - `heights`: the heights of its PNG files.
  - `note`: how its numbers were reached, for a person reading the file; the build doesn't read it.
- `cards`: the first lockup centered on a solid card, scaled in quarter steps, with a member for each kind of card:
  - `banner`: the profile banners.
  - `preview`: the link previews and GitHub's social preview.

  Each card has these members:
  - `widest`: the most of the card's width the lockup takes.
  - `descriptor`: `true` draws the descriptor under the lockup. A card without it has none.
