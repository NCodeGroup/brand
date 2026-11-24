# 13. Token Reference

Every token, with its custom property, its value in light and dark, and what it is for. build.mjs writes the tables
below from [src/tokens.source.json](../src/tokens.source.json); `tokens/tokens.json` holds the same tokens in the Design
Tokens format, and `tokens/tokens.mjs` the public ones as an ES module.

## How Tokens Are Named

- Every custom property starts with `--nc-`, so it cannot meet a host page's own properties, Starlight's (`--sl-`) or
  Material UI's (`--mui-`).
- A color role is `--nc-color-<role>`, written once: as `light-dark(<light>, <dark>)` where the themes differ, and as
  one value where they don't. A type role is `--nc-type-<role>`, with `-stretch` and `-tracking` beside it, and
  `-case` where it sets one. Elevation is `--nc-elevation-<depth>`.
- A scale is numbered where its steps are a ramp, such as `--nc-space-3`, and named where its parts are few and fixed,
  such as `--nc-radius-control` and `--nc-dur-press`.

## The Two Tiers

*Semantic tokens are public*: renaming or removing one, or changing what it is for, is a major version. *Primitives
are private*: the color ramps and the steps of the type scale exist so the roles can be built from them, and may
change in any release. Read a role instead: a color role for a ramp step, a type role for a size or a weight. This
repository's own stylesheets read primitives, because they release with them
([the decision](../docs/decisions/1002-custom-properties-take-the-nc-prefix-and-only-semantic-tokens-are-public.md)).

<!-- generated:reference -->
### Tenant inputs

Public.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-brand` | `#0033CC` | primaryColor: what you press. Keys, links, focus, selection. |
| `--nc-brand-secondary` | `#0033CC` | secondaryColor: what you are shown. Screens and the tenant's scope braces. It follows the primary until a tenant sets it. |

### Color roles

Public.

| Custom property | Light | Dark | What it is |
|---|---|---|---|
| `--nc-color-page` | `#E9E9E4` | `#0A0A08` | the case |
| `--nc-color-page-sunken` | `#D9D9D4` | `#050504` | a recess cut into the case |
| `--nc-color-surface` | `#F7F7F4` | `#171714` | a plate |
| `--nc-color-surface-raised` | `#FFFFFF` | `#282824` | the brightest sheet: a dialog, a menu, a page of documentation |
| `--nc-color-surface-sunken` | `#F0F0ED` | `#11110F` | a recess cut into a plate: a table head, a footer |
| `--nc-color-well` | `#FFFFFF` | `#0A0A08` | a field |
| `--nc-color-control` | `#FFFFFF` | `#282824` | its face |
| `--nc-color-control-hover` | `#F0F0ED` | `#343430` |  |
| `--nc-color-control-pressed` | `#D9D9D4` | `#11110F` |  |
| `--nc-color-ghost-hover` | `rgb(23 23 20 / 0.08)` | `rgb(240 240 237 / 0.1)` | the face a ghost key gains under the pointer: the text color, thinned |
| `--nc-color-ghost-pressed` | `rgb(23 23 20 / 0.15)` | `rgb(240 240 237 / 0.18)` |  |
| `--nc-color-border` | `#D9D9D4` | `#343430` | a hairline between parts: decoration, it carries no meaning alone |
| `--nc-color-border-strong` | `#797972` | `#797972` | the edge of a control: 3 to 1 against every surface in both themes |
| `--nc-color-lamp-unlit` | `#BEBEB8` | `#4B4B45` | an unlit lamp in a selector: decoration, the word and the latched key carry the state |
| `--nc-color-text` | `#171714` | `#F0F0ED` |  |
| `--nc-color-text-secondary` | `#4B4B45` | `#BEBEB8` |  |
| `--nc-color-text-muted` | `#5E5E58` | `#93938C` | engraved labels, placeholders |
| `--nc-color-text-disabled` | `#797972` | `#5E5E58` |  |
| `--nc-color-code-tint` | `rgb(23 23 20 / 0.06)` | `rgb(240 240 237 / 0.08)` | the tint behind inline code: the text color, thinned, so it shows on every surface |
| `--nc-color-success` | `#11813C` | `#7ADE95` |  |
| `--nc-color-on-success` | `#FFFFFF` | `#092210` |  |
| `--nc-color-success-mark` | `#11813C` | `#7ADE95` |  |
| `--nc-color-success-text` | `#126630` | `#7ADE95` |  |
| `--nc-color-success-subtle` | `#ECFAEF` | `#092210` |  |
| `--nc-color-success-border` | `#7ADE95` | `#0D4A22` |  |
| `--nc-color-warning` | `#F4AD1D` | `#F4AD1D` |  |
| `--nc-color-on-warning` | `#171714` | `#171714` |  |
| `--nc-color-warning-mark` | `#B96A00` | `#FAC13B` |  |
| `--nc-color-warning-text` | `#8F4D05` | `#FAC13B` |  |
| `--nc-color-warning-subtle` | `#FFF6E1` | `#2A1907` |  |
| `--nc-color-warning-border` | `#FAC13B` | `#623606` |  |
| `--nc-color-danger` | `#C01F1C` | `#FF958D` |  |
| `--nc-color-on-danger` | `#FFFFFF` | `#31100D` |  |
| `--nc-color-danger-mark` | `#C01F1C` | `#FF958D` |  |
| `--nc-color-danger-text` | `#9C1B18` | `#FF958D` |  |
| `--nc-color-danger-subtle` | `#FFF2F0` | `#31100D` |  |
| `--nc-color-danger-border` | `#FF958D` | `#711612` |  |
| `--nc-color-danger-hover` | `#9C1B18` | `#FFADA6` |  |
| `--nc-color-danger-lip` | `#711612` | `#9C1B18` |  |
| `--nc-color-info` | `#0033CC` | `#809FFF` |  |
| `--nc-color-on-info` | `#FFFFFF` | `#071339` |  |
| `--nc-color-info-mark` | `#0033CC` | `#809FFF` |  |
| `--nc-color-info-text` | `#032AA7` | `#809FFF` |  |
| `--nc-color-info-subtle` | `#F2F5FF` | `#071339` |  |
| `--nc-color-info-border` | `#C3D2FF` | `#08257F` |  |
| `--nc-color-hazard` | `#F4AD1D` | `#F4AD1D` |  |
| `--nc-color-on-hazard` | `#171714` | `#171714` |  |
| `--nc-color-logo` | `#0033CC` | `#809FFF` |  |
| `--nc-color-lip` | `#BEBEB8` | `#000000` | the side of a raised part |
| `--nc-color-shade` | `rgb(23 23 20 / 0.08)` | `rgb(0 0 0 / 0.55)` | the shadow inside a recess |
| `--nc-color-screen-shade` | `rgb(0 0 0 / 0.3)` | `rgb(0 0 0 / 0.3)` | the shadow inside a screen's top edge, the same in both themes |
| `--nc-color-glint` | `#FFFFFF` | `rgb(255 255 255 / 0.06)` | light on a top edge |
| `--nc-color-shadow` | `rgb(23 23 20 / 0.2)` | `rgb(0 0 0 / 0.7)` | the only soft shadow, under overlays |
| `--nc-color-scrim` | `rgb(23 23 20 / 0.5)` | `rgb(0 0 0 / 0.68)` |  |
| `--nc-color-primary` | `#0033CC` | `#809FFF` | NCode Blue becomes exactly NCode Blue Light in the dark theme |
| `--nc-color-on-primary` | `#FFFFFF` | `#071339` | white, or black when the tenant's color is lighter than CIE lightness 49.4, near where the label with the higher contrast changes. A color at the flip itself can fall short in CSS; tokens/derive.mjs chooses by measured contrast |
| `--nc-color-primary-shade` | `#000000` | `#FFFFFF` | what a primary key's face moves toward when it is touched: away from its label, so the label gains contrast |
| `--nc-color-primary-hover` | `#0029A9` | `#9BB5FF` |  |
| `--nc-color-primary-pressed` | `#002292` | `#6E8ADE` |  |
| `--nc-color-primary-edge` | `#002292` | `#6E8ADE` | the outline of a primary key: darker than its face, and never lighter than OKLCH lightness 0.55, so it reaches 3 to 1 against a light plate whatever the tenant's color |
| `--nc-color-primary-lip` | `#001465` | `#313E69` |  |
| `--nc-color-primary-text` | `#0033CC` | `#809FFF` | the brand as text, line or lamp: at most OKLCH lightness 0.48 in the light theme, 4.5 to 1 on every surface for all but the brightest greens, which tokens/derive.mjs darkens further |
| `--nc-color-primary-subtle` | `#E9F0FD` | `#262A34` | the wash behind a selected option |
| `--nc-color-primary-subtle-border` | `#AFC7F5` | `#404C6D` |  |
| `--nc-color-focus` | `#0033CC` | `#809FFF` | the focus ring |
| `--nc-color-screen` | `#0A1F5C` | `#0A1F5C` |  |
| `--nc-color-screen-raised` | `#0E2C80` | `#0E2C80` | a lit row, a memory cell |
| `--nc-color-screen-border` | `#1E4192` | `#1E4192` |  |
| `--nc-color-screen-lit` | `#809FFF` | `#809FFF` | keywords, lit labels, the lit boundary plate, braces on a screen |
| `--nc-color-on-screen` | `#FFFFFF` | `#FFFFFF` |  |
| `--nc-color-on-screen-secondary` | `#C2D2FF` | `#C2D2FF` |  |
| `--nc-color-on-screen-muted` | `#9BAACF` | `#9BAACF` |  |
| `--nc-color-screen-hot` | `#FAC13B` | `#FAC13B` | a literal, a sensitive value |
| `--nc-color-scope-tenant` | `#0033CC` | `#809FFF` | a tenant's braces take the tenant's secondary color |
| `--nc-color-scope-team` | `#171714` | `#F0F0ED` | a team's braces are plain ink |
| `--nc-color-scope-platform` | `#F4AD1D` | `#F4AD1D` | the platform's braces are hazard tape: this color striped with on-hazard |

### Type roles

Public.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-type-headline` | `600 3.75rem/1 Instrument Sans Variable` | the one headline of a landing page |
| `--nc-type-headline-stretch` | `86%` | the width of headline |
| `--nc-type-headline-tracking` | `-0.028em` | the letter spacing of headline |
| `--nc-type-title` | `600 2.5rem/1.08 Instrument Sans Variable` | the title of a page |
| `--nc-type-title-stretch` | `86%` | the width of title |
| `--nc-type-title-tracking` | `-0.022em` | the letter spacing of title |
| `--nc-type-title-long` | `600 2rem/1.08 Instrument Sans Variable` | the title of a long-form page |
| `--nc-type-title-long-stretch` | `86%` | the width of title-long |
| `--nc-type-title-long-tracking` | `-0.022em` | the letter spacing of title-long |
| `--nc-type-heading` | `600 1.5rem/1.18 Instrument Sans Variable` | a section |
| `--nc-type-heading-stretch` | `86%` | the width of heading |
| `--nc-type-heading-tracking` | `-0.012em` | the letter spacing of heading |
| `--nc-type-heading-long` | `600 1.5rem/1.18 Instrument Sans Variable` | a section of a long-form page |
| `--nc-type-heading-long-stretch` | `86%` | the width of heading-long |
| `--nc-type-heading-long-tracking` | `-0.012em` | the letter spacing of heading-long |
| `--nc-type-subheading` | `600 1.25rem/1.3 Instrument Sans Variable` | a group within a section, the title of a dialog |
| `--nc-type-subheading-stretch` | `86%` | the width of subheading |
| `--nc-type-subheading-tracking` | `-0.012em` | the letter spacing of subheading |
| `--nc-type-minor` | `600 1rem/1.3 Instrument Sans Variable` | the smallest heading |
| `--nc-type-minor-stretch` | `100%` | the width of minor |
| `--nc-type-minor-tracking` | `0` | the letter spacing of minor |
| `--nc-type-lead` | `400 1.125rem/1.5 Instrument Sans Variable` | the first paragraph of a long-form page |
| `--nc-type-lead-stretch` | `100%` | the width of lead |
| `--nc-type-lead-tracking` | `0` | the letter spacing of lead |
| `--nc-type-body` | `400 1rem/1.5 Instrument Sans Variable` | running text outside long-form pages |
| `--nc-type-body-stretch` | `100%` | the width of body |
| `--nc-type-body-tracking` | `0` | the letter spacing of body |
| `--nc-type-reading` | `400 0.9375rem/1.6 Instrument Sans Variable` | long-form documentation, on the measure |
| `--nc-type-reading-stretch` | `100%` | the width of reading |
| `--nc-type-reading-tracking` | `0` | the letter spacing of reading |
| `--nc-type-ui` | `400 0.875rem/1.5 Instrument Sans Variable` | the interface |
| `--nc-type-ui-stretch` | `100%` | the width of ui |
| `--nc-type-ui-tracking` | `0` | the letter spacing of ui |
| `--nc-type-field` | `600 0.8125rem/1.3 Instrument Sans Variable` | the label of a field: sentence case, because a form is read, not scanned |
| `--nc-type-field-stretch` | `100%` | the width of field |
| `--nc-type-field-tracking` | `0` | the letter spacing of field |
| `--nc-type-label` | `600 0.6875rem/1.2 Instrument Sans Variable` | engraved: the name of a fixed part. Column heads, group heads, tags, the boundary's kind |
| `--nc-type-label-stretch` | `82%` | the width of label |
| `--nc-type-label-tracking` | `0.08em` | the letter spacing of label |
| `--nc-type-label-case` | `uppercase` | the case of label |
| `--nc-type-value` | `500 0.8125rem/1.4 Martian Mono Variable` | displayed: anything read off the system |
| `--nc-type-value-stretch` | `75%` | the width of value |
| `--nc-type-value-tracking` | `-0.01em` | the letter spacing of value |
| `--nc-type-code` | `400 0.8125rem/1.6 Martian Mono Variable` | a listing |
| `--nc-type-code-stretch` | `75%` | the width of code |
| `--nc-type-code-tracking` | `0` | the letter spacing of code |
| `--nc-type-readout` | `500 0.75rem/1 Martian Mono Variable` | a short value on a screen |
| `--nc-type-readout-stretch` | `100%` | the width of readout |
| `--nc-type-readout-tracking` | `0` | the letter spacing of readout |

### Font families

Public.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-font-sans` | `"Instrument Sans Variable", "Instrument Sans", system-ui, -apple-system, "Segoe UI", "Roboto", "Helvetica Neue", "Arial", sans-serif` | names, headings and reading |
| `--nc-font-mono` | `"Martian Mono Variable", "Martian Mono", ui-monospace, "Cascadia Mono", "SF Mono", "Menlo", "Consolas", monospace` | every value the system reports, and code |

### Elevation

Public.

| Custom property | Light | Dark | What it is |
|---|---|---|---|
| `--nc-elevation-recessed` | `inset 0 2px 0 rgb(23 23 20 / 0.08)` | `inset 0 2px 0 rgb(0 0 0 / 0.55)` |  |
| `--nc-elevation-flush` | `inset 0 1px 0 #FFFFFF, 0 1px 0 #BEBEB8` | `inset 0 1px 0 rgb(255 255 255 / 0.06), 0 1px 0 #000000` |  |
| `--nc-elevation-raised` | `inset 0 1px 0 #FFFFFF, 0 2px 0 #BEBEB8` | `inset 0 1px 0 rgb(255 255 255 / 0.06), 0 2px 0 #000000` |  |
| `--nc-elevation-floating` | `0 1px 0 #BEBEB8, 0 10px 24px -8px rgb(23 23 20 / 0.2)` | `0 1px 0 #000000, 0 10px 24px -8px rgb(0 0 0 / 0.7)` |  |
| `--nc-elevation-overlay` | `inset 0 1px 0 #FFFFFF, 0 2px 0 #BEBEB8, 0 28px 64px -16px rgb(23 23 20 / 0.2)` | `inset 0 1px 0 rgb(255 255 255 / 0.06), 0 2px 0 #000000, 0 28px 64px -16px rgb(0 0 0 / 0.7)` |  |

### Space

Public.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-space-0` | `0` |  |
| `--nc-space-1` | `0.125rem` | 2px |
| `--nc-space-2` | `0.25rem` | 4px |
| `--nc-space-3` | `0.5rem` | 8px |
| `--nc-space-4` | `0.75rem` | 12px |
| `--nc-space-5` | `1rem` | 16px |
| `--nc-space-6` | `1.5rem` | 24px |
| `--nc-space-7` | `2rem` | 32px |
| `--nc-space-8` | `3rem` | 48px |
| `--nc-space-9` | `4rem` | 64px |
| `--nc-space-10` | `6rem` | 96px |

### Radius

Public.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-radius-cell` | `2px` | memory cells, check boxes |
| `--nc-radius-plate` | `4px` | label plates, tags, keycaps |
| `--nc-radius-control` | `6px` | keys and wells |
| `--nc-radius-panel` | `10px` | plates, screens |
| `--nc-radius-module` | `14px` | the outermost modules: dialogs, cards |
| `--nc-radius-round` | `999px` | lamps |

### Border

Public.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-border-hair` | `1px` |  |
| `--nc-border-bold` | `2px` |  |

### Size

Public.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-travel` | `2px` | how far a key stands above its plate, and how far it moves when pressed |
| `--nc-focus-width` | `2px` |  |
| `--nc-focus-gap` | `2px` |  |
| `--nc-control-sm` | `1.75rem` | 28px |
| `--nc-control-md` | `2.25rem` | 36px |
| `--nc-control-lg` | `2.75rem` | 44px: every control on a phone |
| `--nc-measure` | `42rem` | the reading column of long-form documentation: about 95 characters at the reading size |
| `--nc-bleed` | `1.25rem` | how far a listing or a table starts before the reading column, so its content lines up with the text |

### Breakpoint

Public.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-breakpoint-phone` | `40rem` | at 640px and below tables become lists, dialogs become sheets and navigation moves into a sheet |
| `--nc-breakpoint-tablet` | `68rem` | at 1088px and below the console's navigation moves into a sheet |
| `--nc-breakpoint-desk` | `80rem` | at 1280px and below documentation drops its page index |

### Motion

Public.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-dur-press` | `70ms` | a key going down |
| `--nc-dur-quick` | `120ms` | hover, a change of color |
| `--nc-dur-move` | `200ms` | a switch sliding |
| `--nc-dur-enter` | `280ms` | a dialog arriving |
| `--nc-ease-out` | `cubic-bezier(0.2, 0, 0, 1)` |  |
| `--nc-ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |  |
| `--nc-ease-tick` | `steps(1, end)` | a readout changes in one step; it never glides |

### Brace

Public.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-brace-sm` | `10px` | a lifetime in a code listing |
| `--nc-brace-md` | `17px` | a card, the memory panel |
| `--nc-brace-lg` | `23px` | the frame of a console workspace |

### Primitives: color ramps

Private: read a semantic token instead.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-blue-50` | `#F2F5FF` |  |
| `--nc-blue-100` | `#E4EBFF` |  |
| `--nc-blue-200` | `#C3D2FF` |  |
| `--nc-blue-300` | `#809FFF` | NCode Blue Light |
| `--nc-blue-400` | `#557EFA` |  |
| `--nc-blue-500` | `#2757E8` |  |
| `--nc-blue-600` | `#0033CC` | NCode Blue |
| `--nc-blue-700` | `#032AA7` |  |
| `--nc-blue-800` | `#08257F` |  |
| `--nc-blue-900` | `#0A1F5C` | NCode Navy |
| `--nc-blue-950` | `#071339` |  |
| `--nc-stone-0` | `#FFFFFF` |  |
| `--nc-stone-50` | `#F7F7F4` |  |
| `--nc-stone-100` | `#F0F0ED` |  |
| `--nc-stone-200` | `#E9E9E4` |  |
| `--nc-stone-300` | `#D9D9D4` |  |
| `--nc-stone-400` | `#BEBEB8` |  |
| `--nc-stone-450` | `#93938C` |  |
| `--nc-stone-500` | `#797972` |  |
| `--nc-stone-600` | `#5E5E58` |  |
| `--nc-stone-700` | `#4B4B45` |  |
| `--nc-stone-800` | `#343430` |  |
| `--nc-stone-850` | `#282824` |  |
| `--nc-stone-900` | `#1E1E1B` |  |
| `--nc-stone-925` | `#171714` |  |
| `--nc-stone-950` | `#11110F` |  |
| `--nc-stone-975` | `#0A0A08` |  |
| `--nc-green-50` | `#ECFAEF` |  |
| `--nc-green-100` | `#D3F5DB` |  |
| `--nc-green-300` | `#7ADE95` |  |
| `--nc-green-500` | `#20A04E` |  |
| `--nc-green-600` | `#11813C` |  |
| `--nc-green-700` | `#126630` |  |
| `--nc-green-800` | `#0D4A22` |  |
| `--nc-green-900` | `#083518` |  |
| `--nc-green-950` | `#092210` |  |
| `--nc-amber-50` | `#FFF6E1` |  |
| `--nc-amber-100` | `#FFECB8` |  |
| `--nc-amber-300` | `#FAC13B` |  |
| `--nc-amber-400` | `#F4AD1D` |  |
| `--nc-amber-500` | `#DC8900` |  |
| `--nc-amber-600` | `#B96A00` |  |
| `--nc-amber-700` | `#8F4D05` |  |
| `--nc-amber-800` | `#623606` |  |
| `--nc-amber-900` | `#442504` |  |
| `--nc-amber-950` | `#2A1907` |  |
| `--nc-red-50` | `#FFF2F0` |  |
| `--nc-red-100` | `#FFE2DF` |  |
| `--nc-red-300` | `#FF958D` |  |
| `--nc-red-500` | `#DE3C37` |  |
| `--nc-red-600` | `#C01F1C` |  |
| `--nc-red-700` | `#9C1B18` |  |
| `--nc-red-800` | `#711612` |  |
| `--nc-red-900` | `#4D1612` |  |
| `--nc-red-950` | `#31100D` |  |

### Primitives: type scale

Private: read a semantic token instead.

| Custom property | Value | What it is |
|---|---|---|
| `--nc-width-label` | `82%` |  |
| `--nc-width-display` | `86%` |  |
| `--nc-width-text` | `100%` |  |
| `--nc-width-code` | `75%` | Martian Mono at 75% has a 0.6em advance, the usual width of a code face |
| `--nc-width-readout` | `100%` | a short value on a screen is set wide, like a display |
| `--nc-weight-regular` | `400` |  |
| `--nc-weight-medium` | `500` |  |
| `--nc-weight-semibold` | `600` |  |
| `--nc-weight-bold` | `700` |  |
| `--nc-text-2xs` | `0.6875rem` | 11px: engraved labels |
| `--nc-text-xs` | `0.75rem` | 12px |
| `--nc-text-sm` | `0.8125rem` | 13px: dense interface, code, field labels |
| `--nc-text-md` | `0.875rem` | 14px: interface |
| `--nc-text-reading` | `0.9375rem` | 15px: long-form documentation |
| `--nc-text-base` | `1rem` | 16px |
| `--nc-text-lg` | `1.125rem` | 18px: lead |
| `--nc-text-xl` | `1.25rem` | 20px |
| `--nc-text-2xl` | `1.5rem` | 24px |
| `--nc-text-3xl` | `2rem` | 32px |
| `--nc-text-4xl` | `2.5rem` | 40px |
| `--nc-text-5xl` | `3rem` | 48px |
| `--nc-text-6xl` | `3.75rem` | 60px |
| `--nc-leading-flat` | `1` |  |
| `--nc-leading-tight` | `1.08` |  |
| `--nc-leading-snug` | `1.3` |  |
| `--nc-leading-normal` | `1.5` |  |
| `--nc-leading-reading` | `1.6` |  |
| `--nc-tracking-label` | `0.08em` |  |
| `--nc-tracking-display` | `-0.022em` |  |
| `--nc-tracking-heading` | `-0.012em` |  |
| `--nc-tracking-normal` | `0` |  |
<!-- /generated:reference -->
