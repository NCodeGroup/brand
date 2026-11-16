# 2. Color

Color belongs to values, to state and to the tenant. The case around them is a neutral, so it takes no side against a
tenant's hue.

## The Three Anchors

NCode Blue `#0033CC`, NCode Blue Light `#809FFF` and NCode Navy `#0A1F5C` are the logo kit's colors, and the blue ramp
passes through all three. NCode Blue is what you press on NCode's own surfaces; Blue Light is the same blue on a dark
page; Navy is the deep field of a screen. The derivation is calibrated on them: NCode Blue lifted to the dark theme is
exactly Blue Light, and NCode Blue as a screen is exactly Navy.

## Ramps

The ramps are built in OKLCH from [src/tokens.source.json](../src/tokens.source.json). Blue passes through the logo
kit's three colors and bends its hue the way they do. Stone is a neutral with a trace of warm olive. Green, red and
amber are stepped by lightness the same way. The ramps are primitives: components never read them.

<!-- generated:ramps -->
| Ramp | Use | Steps |
|---|---|---|
| Blue | Brand | 50 `#F2F5FF` · 100 `#E4EBFF` · 200 `#C3D2FF` · 300 `#809FFF` (NCode Blue Light) · 400 `#557EFA` · 500 `#2757E8` · 600 `#0033CC` (NCode Blue) · 700 `#032AA7` · 800 `#08257F` · 900 `#0A1F5C` (NCode Navy) · 950 `#071339` |
| Stone | Neutral | 0 `#FFFFFF` · 50 `#F7F7F4` · 100 `#F0F0ED` · 200 `#E9E9E4` · 300 `#D9D9D4` · 400 `#BEBEB8` · 450 `#93938C` · 500 `#797972` · 600 `#5E5E58` · 700 `#4B4B45` · 800 `#343430` · 850 `#282824` · 900 `#1E1E1B` · 925 `#171714` · 950 `#11110F` · 975 `#0A0A08` |
| Green | Success | 50 `#ECFAEF` · 100 `#D3F5DB` · 300 `#7ADE95` · 500 `#20A04E` · 600 `#11813C` · 700 `#126630` · 800 `#0D4A22` · 900 `#083518` · 950 `#092210` |
| Amber | Warning, hazard, hot | 50 `#FFF6E1` · 100 `#FFECB8` · 300 `#FAC13B` · 400 `#F4AD1D` · 500 `#DC8900` · 600 `#B96A00` · 700 `#8F4D05` · 800 `#623606` · 900 `#442504` · 950 `#2A1907` |
| Red | Danger | 50 `#FFF2F0` · 100 `#FFE2DF` · 300 `#FF958D` · 500 `#DE3C37` · 600 `#C01F1C` · 700 `#9C1B18` · 800 `#711612` · 900 `#4D1612` · 950 `#31100D` |
<!-- /generated:ramps -->

## Roles

Components read roles, never ramp steps. Each role is one custom property, `--nc-color-<role>`, written once: as
`light-dark(<light>, <dark>)` where the themes differ, and as one value where they don't.
[The token reference](13-token-reference.md#color-roles) has every value.

| Group | Roles | What they are |
|---|---|---|
| Case | `page`, `page-sunken`, `surface`, `surface-raised`, `surface-sunken`, `well` | The case, a plate, the brightest sheet, a recess, a field |
| Keys | `control`, `control-hover`, `control-pressed`, `ghost-hover`, `ghost-pressed` | The face of a neutral key in each state |
| Lines | `border`, `border-strong`, `lamp-unlit` | A hairline, the edge of a control (3 to 1), an unlit lamp |
| Type | `text`, `text-secondary`, `text-muted`, `text-disabled` | Running text, secondary text, engraved labels, disabled text |
| Primary | `primary`, `on-primary`, `primary-shade`, `primary-hover`, `primary-pressed`, `primary-edge`, `primary-lip`, `primary-text`, `primary-subtle`, `primary-subtle-border`, `focus` | What you press, derived from `--nc-brand` |
| Screen | `screen`, `screen-raised`, `screen-border`, `screen-lit`, `on-screen`, `on-screen-secondary`, `on-screen-muted`, `screen-hot` | What you are shown, derived from `--nc-brand-secondary` |
| Scope | `scope-tenant`, `scope-team`, `scope-platform` | The ink of a brace, one per kind of boundary |
| Status | `success`, `warning`, `danger`, `info`, each with `on-`, `-mark`, `-text`, `-subtle`, `-border`; and `danger-hover`, `danger-lip` | `-mark` is a lamp, icon or line (3 to 1). `-text` is running text (4.5 to 1). A danger key has a hover and a lip of its own |
| Hazard | `hazard`, `on-hazard` | Tape, the same in both themes |
| Depth | `lip`, `shade`, `screen-shade`, `glint`, `shadow`, `scrim` | The side of a raised part, the shadow in a recess or under a screen's top edge, light on an edge |
| Marks | `logo` | NCode's marks: Blue, or Blue Light on dark |

Reach for the role that names what the part is, not the one whose value looks right: `primary-text` for the brand as
text, a line or a lamp, never `primary`, which is a key's face and may be too light to read.

## What Amber Means

Amber is the one supporting hue, and it means "this is not routine": a warning, hazard tape, and on a screen a literal
or a sensitive value. Nothing else is amber. A highlight, a badge or a new feature takes another treatment.

## A Theme

A theme is nothing but the root's `color-scheme`: the page follows the reader's system setting until `data-theme`
pins it to `light` or `dark`. On paper a page takes the light theme. A screen is the same in both themes, as hazard
tape is.

## Computed Contrast

The lowest ratio of each use, light then dark. "Tenants" is the lowest of the four tenant combinations: teal
`#0F766E`, orange `#C2410C`, teal with rust `#7C2D12` and orange with navy `#1E3A5F`. "Stress" is the lowest of six
colors chosen to break the derivation: yellow `#FACC15`, sky `#38BDF8`, red `#DC2626`, green `#16A34A`, near white
`#F1F5F9` and near black `#111827`. build.mjs computes every ratio from the tokens and fails when one is below its
requirement; [Accessibility](10-accessibility.md) says what is measured and why.

<!-- generated:contrast -->
| Use | Pairings | Needs | NCode Blue | Tenants | Stress |
|---|---:|---:|---:|---:|---:|
| Text | 9 | 4.5 | 12.68 / 10.94 |  |  |
| Text on a ghost key, touched | 3 | 4.5 | 12.21 / 9.39 |  |  |
| Secondary text | 7 | 4.5 | 6.19 / 7.92 |  |  |
| Engraved labels, setting keys, placeholders | 5 | 4.5 | 5.35 / 4.78 |  |  |
| Edge of a control | 6 | 3 | 3.09 / 3.37 |  |  |
| NCode's mark | 4 | 3 | 7.35 / 5.86 |  |  |
| Brand as text, lamp, focus ring | 6 | 4.5 | 7.35 / 5.68 | 5.10 / 5.52 | 4.84 / 5.50 |
| Primary key: label | 1 | 4.5 | 8.95 / 7.16 | 5.17 / 6.97 | 4.82 / 6.91 |
| Primary key, hover | 1 | 4.5 | 11.11 / 8.99 | 6.97 / 8.82 | 6.52 / 8.73 |
| Primary key, pressed | 1 | 4.5 | 12.77 / 5.47 | 8.59 / 5.32 | 8.08 / 5.30 |
| Primary key against its plate: its face | 3 | 3 | 7.35 / 5.86 | 4.25 / 5.68 |  |
| Primary key against its plate: its edge or its face | 3 | 3 | 10.48 / 5.86 | 7.05 / 5.68 | 3.90 / 5.61 |
| Text on a selected option | 1 | 4.5 | 15.69 / 12.56 | 16.09 / 12.42 | 14.92 / 12.40 |
| Secondary text on a selected option | 1 | 4.5 | 7.67 / 7.68 | 7.86 / 7.59 | 7.29 / 7.58 |
| Screen: values | 1 | 4.5 | 15.40 / 15.40 | 14.79 / 14.79 | 14.52 / 14.52 |
| Screen: code | 1 | 4.5 | 10.23 / 10.23 | 9.99 / 9.99 | 9.92 / 9.92 |
| Screen: comments, unlit steps | 1 | 4.5 | 6.63 / 6.63 | 6.46 / 6.46 | 6.41 / 6.41 |
| Screen: keywords, lit labels, braces | 1 | 4.5 | 6.10 / 6.10 | 5.95 / 5.95 | 5.95 / 5.95 |
| Screen: literals, hot bytes, a secret | 1 | 4.5 | 9.35 / 9.35 | 8.98 / 8.98 | 8.82 / 8.82 |
| Lit row: values | 1 | 4.5 | 12.42 / 12.42 | 11.75 / 11.75 | 11.27 / 11.27 |
| Lit row: code | 1 | 4.5 | 8.25 / 8.25 | 7.93 / 7.93 | 7.70 / 7.70 |
| Lit row: keywords | 1 | 4.5 | 4.92 / 4.92 | 4.80 / 4.80 | 4.80 / 4.80 |
| Lit row and memory cells: literals | 1 | 4.5 | 7.54 / 7.54 | 7.13 / 7.13 | 6.85 / 6.85 |
| Focus ring on a screen | 2 | 3 | 4.92 / 4.92 | 4.80 / 4.80 | 4.80 / 4.80 |
| Material UI's secondary as text: the screen, lit in dark | 6 | 4.5 | 12.64 / 5.86 | 12.14 / 5.68 | 11.92 / 5.61 |
| Boundary plate: tenant | 1 | 4.5 | 6.10 / 6.10 | 5.95 / 5.95 | 5.95 / 5.95 |
| Boundary plate: team | 1 | 4.5 | 15.40 / 15.40 | 14.79 / 14.79 | 14.52 / 14.52 |
| Boundary plate: platform; hazard band | 1 | 4.5 | 9.27 / 9.27 |  |  |
| Boundary plate against its plate: tenant (bezel or fill) | 3 | 3 | 13.48 / 5.86 | 12.96 / 5.68 | 12.71 / 5.61 |
| Boundary plate against its plate: team (bezel or fill) | 3 | 3 | 13.48 / 14.79 | 12.96 / 14.79 | 12.71 / 14.79 |
| Boundary plate against its plate: platform (bezel or fill) | 3 | 3 | 13.48 / 7.63 | 12.96 / 7.63 | 12.71 / 7.63 |
| Scope brace: tenant | 2 | 3 | 7.35 / 7.11 | 5.10 / 6.90 | 4.84 / 6.82 |
| Scope brace: team | 2 | 3 | 14.74 / 15.73 |  |  |
| Scope brace: platform (the stronger stripe of the tape) | 2 | 3 | 14.74 / 9.27 |  |  |
| Success: text | 4 | 4.5 | 5.80 / 8.95 |  |  |
| Success: lamp, icon, bar | 5 | 3 | 4.07 / 8.95 |  |  |
| Success: label on fill | 1 | 4.5 | 4.96 / 10.18 |  |  |
| Success: alert text | 1 | 4.5 | 16.66 / 14.73 |  |  |
| Warning: text | 4 | 4.5 | 5.33 / 8.98 |  |  |
| Warning: lamp, icon, bar | 5 | 3 | 3.36 / 8.98 |  |  |
| Warning: label on fill | 1 | 4.5 | 9.27 / 9.27 |  |  |
| Warning: alert text | 1 | 4.5 | 16.69 / 14.82 |  |  |
| Danger: text | 5 | 4.5 | 6.67 / 7.00 |  |  |
| Danger: lamp, icon, bar | 5 | 3 | 4.99 / 7.00 |  |  |
| Danger: label on fill | 1 | 4.5 | 6.07 / 8.20 |  |  |
| Danger: alert text | 1 | 4.5 | 16.43 / 15.19 |  |  |
| Info: text | 4 | 4.5 | 9.10 / 5.86 |  |  |
| Info: lamp, icon, bar | 5 | 3 | 7.35 / 5.86 |  |  |
| Info: label on fill | 1 | 4.5 | 8.95 / 7.16 |  |  |
| Info: alert text | 1 | 4.5 | 16.49 / 15.83 |  |  |
| Danger: key, hover | 1 | 4.5 | 8.12 / 9.73 |  |  |

1102 measurements of 132 pairings: 0 below the requirement.
<!-- /generated:contrast -->
