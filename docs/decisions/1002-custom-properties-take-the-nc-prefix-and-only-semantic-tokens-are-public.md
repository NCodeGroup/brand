# 1002. Custom properties take the --nc- prefix, and only semantic tokens are public

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** NCode Group

## Context

A custom property with a bare name, such as `--color-primary`, `--text-md` or `--space-3`, sits in a namespace
Tailwind's theme uses, and a tenant's page or a host application may define one such as `--brand`. Material UI and
Starlight both prefix their own properties, `--mui-` and `--sl-`. A token set also needs a stated line between what a
consumer may depend on and what is raw material: without one, every ramp step becomes a promise. Both are cheap to
settle before 1.0.0 and the most expensive breaking changes after it.

## Decision

Every custom property this repository declares starts with `--nc-`: the tokens, `--nc-color-text`, `--nc-space-3`,
`--nc-brand`, and the component properties `css/base.css` sets, `--nc-key-face`. Class names in `css/base.css` and the
`data-theme`, `data-brand` and `data-brand-scope` attributes keep their names: `data-theme` is the one Starlight sets,
and `base.css` styles pages built on it, not a foreign stylesheet.

**The semantic tier is public and primitives are private.** Each group in `src/tokens.source.json` states its tier.

- **Primitive, private**: the color ramps and the steps of the type scale (sizes, weights, line heights, letter
  spacings and widths). They exist so roles can be built from them, and may change in any release.
- **Semantic, public**: the two tenant inputs, the color roles, the type roles, the two font families, elevation, and
  the measures no role stands in front of: space, radii, borders, the control and layout sizes, breakpoints, motion
  and the braces. Renaming or removing one, or changing what it is for, is a major version.

So a type role is complete in the public tier, the generator writes its width, its letter spacing and, where it sets
one, its case beside its font shorthand: `--nc-type-label-stretch`, `--nc-type-label-tracking` and
`--nc-type-label-case`. This repository's own stylesheets may read
primitives, because they release with them; `tokens/tokens.mjs` exports the public tier only, and `tokens/tokens.json`
marks the tier of each group that sets one, which the groups inside it inherit.

## Options considered

- **A prefix on every property** (chosen). One rule, no collision with Tailwind, Starlight or a host page. It costs
  four characters a name.
- **No prefix.** Shorter; but a name such as `--brand` or `--color-*` collides with names a host page uses.
- **A prefix on classes too.** It would let `base.css` sit in a foreign page, which no consumer asks for; a later
  change can still add it before 1.0.0.
- **Every token public.** Simple to state, but a ramp step becomes a promise, and the neutral's hue could never move in
  a minor version.
- **Only colors and type roles public.** Then a consumer has no public spacing or radius, and reads primitives anyway.

## Consequences

- A rename of a public token is a major version after 1.0.0 ([1004](1004-a-rename-is-a-major-version-and-a-value-change-is-never-a-patch.md)).
- A consumer's own CSS reads `--nc-color-*`, `--nc-type-*` and the measures; a ramp step it reads may change in any
  release.
- The tests check that every custom property starts with `--nc-` and that every `var()` names a declared property.

## References

- [src/tokens.source.json](../../src/tokens.source.json), [the token reference](../../guidelines/13-token-reference.md)
- [project-template ADR-0015](project-template/0015-a-pre-release-project-describes-the-product-as-it-is.md)
