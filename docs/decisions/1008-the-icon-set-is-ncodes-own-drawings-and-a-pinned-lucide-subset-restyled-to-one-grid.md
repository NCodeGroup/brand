# 1008. The icon set is NCode's own drawings and a pinned Lucide subset, restyled to one grid

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group
- **Amends:** 1003

## Context

The guide's Icons section says how an icon is drawn: a 16-unit grid, a stroke of 1.5, miter joins and no fill. NCode
draws 41 icons to those rules. An interface needs more than that, and an icon a product draws for itself is drawn in
another hand. Lucide draws more than 2,000 icons on a 24-unit grid with a stroke of 2 and round caps and joins, under
the ISC License, with the icons it derives from Feather also under the MIT License; both licenses ask every copy to
carry their notice. A Lucide line is drawn for a cap that reaches half the stroke past its end, and a Lucide dot is a
line 0.01 units long, which only a round or a square cap shows. A product takes a file only from a tagged release,
checked against its hash ([1001](1001-consumers-vendor-files-from-a-tagged-release-and-check-their-hashes.md)).
Lucide 1.72.0 was released on 2026-11-11, read from its GitHub releases on 2026-11-16.

## Decision

`icons/` holds one set of icons, NCode's own drawings and a subset of Lucide, which `build.mjs` draws from
`src/icons/` to the guide's rules.

- NCode's drawings are `src/icons/ncode.svg`, one symbol each. Their lines end in butt caps.
- Each Lucide icon is its file at a Lucide tag, unchanged, in `src/icons/lucide/`, pinned by SHA-256 in
  `src/icons/lucide.lock.json` with the tag's license. The build refuses a file the lock does not pin.
- The build scales a Lucide icon from 24 units to 16, strokes it at 1.5 with miter joins, and ends its lines in
  square caps, which keep each line's drawn length and each dot.
- One source draws each name: the subset holds only icons NCode does not draw, and the build stops on a name both
  draw.
- Each icon is `icons/<name>.svg`, a symbol `i-<name>` in `icons/sprite.svg`, and its shapes in `icons/icons.json`.
  Every stroked shape carries `vector-effect="non-scaling-stroke"`, so its line is 1.5 pixels at any size.
- NCode's drawings are under the Apache License 2.0, as the rest of the system is
  ([1003](1003-code-and-tokens-are-apache-2-0-and-the-names-and-marks-are-reserved.md)). The Lucide icons keep
  Lucide's licenses: `icons/LICENSE-Lucide.txt` holds both notices, each Lucide file and the sprite name it, and
  `COPYRIGHT.txt`, `TRADEMARKS.md` and the guide say which files they cover.
- Each specimen page takes the icons it uses from the set, in a generated block of its sprite.

## Options considered

- **NCode's drawings alone** (rejected). Each icon a product needs waits for a drawing, and the product draws its own
  meanwhile.
- **Lucide as it ships** (rejected). Its round ends and joins sit beside NCode's square ones, and a 24-unit icon shown
  at 16 pixels has a line of 1.33.
- **Lucide with butt caps** (rejected). Each line ends a stroke short of where Lucide drew it, and its dots vanish.
- **Lucide with square caps and miter joins** (chosen). The lines keep their length and the dots stay, and every end
  and corner is square, as NCode's are.
- **The `lucide-static` npm package** (rejected). The repository has no npm dependency
  ([1000](1000-one-token-source-and-one-generator-write-every-committed-file.md)), and a pinned file per icon is all
  the build reads.

## Consequences

- A new NCode icon is a symbol in `src/icons/ncode.svg`. A new Lucide icon is its file in `src/icons/lucide/` and its
  SHA-256 in the lock.
- Moving to another Lucide tag changes every pinned file and the lock in one pull request, and `npm run check` lists
  each icon that changes. Nothing moves the lock on its own.
- Adding an icon is a minor version, and renaming or removing one is a major version
  ([1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md)).
- A consumer who vendors a Lucide icon vendors `icons/LICENSE-Lucide.txt` with it.

## References

- Issue #3
- [lib/icons.mjs](../../lib/icons.mjs), [src/icons/lucide.lock.json](../../src/icons/lucide.lock.json)
- [Lucide's license at 1.72.0](https://github.com/lucide-icons/lucide/blob/1.72.0/LICENSE)
- [The guide: icons](../../guidelines/07-icons.md)
- [1003](1003-code-and-tokens-are-apache-2-0-and-the-names-and-marks-are-reserved.md), the license split this
  record amends
