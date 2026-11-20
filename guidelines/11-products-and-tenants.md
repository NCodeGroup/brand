# 11. Products and Tenants

Four layers decide how a surface looks, each narrower than the last.

| Layer | Who | What it sets |
|---|---|---|
| System | Instrument | Structure: type, shape, depth, space, motion, the neutral case, the status colors, hazard tape, the brace |
| Organization | NCode | The three anchors; `--nc-brand` is NCode Blue |
| Product | NCode Identity, NCode Buffers | A mark of the mark's construction, a name, a descriptor and its cards. No color of its own |
| Tenant | A customer of NCode Identity | Two colors, the theme, a logo and a display name, at run time |

## What a Product Owns

A product owns its mark, `{id}` for NCode Identity, its name and what it says about itself. It does not own a color:
every NCode product is NCode Blue on NCode's own surfaces, so the family reads as one.

## What a Tenant May Change

A tenant changes five things, the fields of NCode Identity's `BrandingConfig`: its name, its logo, its primary color,
its secondary color and the theme.

- *`primaryColor` colors what you press.* It becomes `--nc-brand`. Keys, links, the focus ring, selection and lit
  lamps derive from it.
- *`secondaryColor` colors what you are shown.* It becomes `--nc-brand-secondary`. Screens, the display, the lit
  boundary plate and the tenant's scope braces derive from it. It follows the primary until a tenant sets it.
- *`mode`* pins the theme with `data-theme`. Without it the page follows the system setting.
- *`logoUrl`* fills the nameplate of the tenant's card.

A tenant cannot change the typefaces, the shapes, the neutral, the status colors, hazard tape or the brace. NCode's own
marks go one color, the text color, under a tenant's colors: set `data-brand="tenant"` on the root, and they never
take the tenant's hue.

One part of a page can run under other inputs: mark an element `data-brand-scope` and set `--nc-brand` on it, as a
branding preview does. Inside it the secondary follows that element's own primary until it sets one.

## How the Colors Are Derived

`tokens/tokens.css` derives everything the two inputs touch in CSS, with relative colors and `color-mix()`, and is
calibrated on the logo kit: NCode Blue yields exactly NCode Navy for screens and exactly NCode Blue Light for the dark
theme. Its rules hold these guarantees for the colors a tenant is likely to choose:

- The label of a primary key is white or black, by the color's lightness, and a touched key's face moves away from
  its label, so hover and pressed keep their contrast.
- The brand as text, as a line and as the focus ring is darkened to OKLCH lightness 0.48 at most in the light theme,
  and lifted to 0.72 in the dark theme.
- The outline of a primary key is never lighter than OKLCH lightness 0.55, so the key reaches 3 to 1 against a light
  plate by its edge, whatever its face.
- Every color on a screen is set to a fixed lightness, so a screen passes for any hue.

CSS cannot search, so a rule cannot raise a color that falls short. `tokens/derive.mjs` derives the same colors in
JavaScript, then moves any color whose pairing is below its floor, in steps of OKLCH lightness, until it reaches it,
and names what it moved in `adjusted`.

<!-- generated:derive -->
In a sweep of the sRGB cube, 729 colors in nine steps a channel, the rules of `tokens.css` hold every pairing for 698 of them. For the other 31, `tokens/derive.mjs` moves the colors below their floor (`on-primary`, `primary-shade`, `primary-text`, `screen-lit`) and holds every pairing for all 729, with 0 below the floor. For NCode Blue and the ten proof and stress colors it moves nothing, so it gives what `tokens.css` gives.
<!-- /generated:derive -->

So a surface with one brand, such as NCode's documentation, takes the CSS derivation; an application that accepts any
tenant's color, such as NCode Identity, sets the derived colors from `tokens/derive.mjs`, and a tenant can be told when
a color was corrected. `tokens/derive.vectors.json` pins its results for a fixed list of inputs, NCode Blue, the proof
and stress colors and the hard cases, so a consumer's tests can assert the same numbers this repository's do.

## The Limit

The face of a primary key lighter than about OKLCH lightness 0.75 is faint on a light plate: yellow `#FACC15` is 1.3
to 1 on the page and 1.4 to 1 on a plate. Its edge, its lip and its label still mark it, and no guard changes it,
because the face is the tenant's own color. Whether a product accepts such a color as it is, warns the tenant or
darkens it is the product's decision.
