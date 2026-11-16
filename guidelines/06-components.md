# 6. Components

Each part has one rule. The rule decides; the examples only illustrate it. Every class here is in `css/base.css`, and
[specimens/foundations.html](../specimens/foundations.html) shows each one in its states. This is the look of a part
and when to use it, not an API: a product that builds on a framework, such as Material UI, draws the same parts with
its own components ([Applying it](12-applying.md)).

## Keys and Wells

A key is anything pressed; a well is anything filled. Classes `.key` and `.well`.

- **Rule.** A key stands 2 pixels proud on a hard lip and travels down when pressed. A chosen key stays down with its
  lamp lit: it is latched. A well is cut in, with a shade under its top edge.
- **Do.** Use one primary key in a view, `.key--primary`. Use a ghost key, `.key--ghost`, for an action that repeats in
  every row. Put a field's label above its well, in sentence case.
- **Don't.** Don't add a gradient, a glow or a blurred shadow. Don't float a label inside a well. Don't raise something
  that cannot be pressed.

A set of latching keys is tabs: one is down. A check box, a radio and a slide switch are the same family: a radio is a
lamp in a ring, and a switch shows an I or an O as well as its position, so its state never rests on color.

## Lamps

A small light beside a word. Classes `.lamp`, `.status` and `.chip`.

- **Rule.** State is a lamp and a word together. Lit and filled is on; a hollow ring is off; a triangle warns; an
  octagon stops.
- **Do.** Change the shape with the state, so the state survives without color.
- **Don't.** Don't show a lamp without its word. Don't use a lamp as decoration or as a bullet.

## Screens

A deep field of the secondary hue with lit type on it. Class `.screen`, and `.readout` for one value.

- **Rule.** What the system reports is shown on a screen: code, commands, counts, a document, a secret. A screen is the
  same in both themes.
- **Do.** Light a line to point at it. Keep amber, `--nc-color-screen-hot`, for literals and for sensitive values.
- **Don't.** Don't put running text or a form on a screen. Don't color syntax in more than the one hue and amber.

## Engraved Names, Displayed Values

Two type voices. Classes `.label` and `.value`.

- **Rule.** A fixed part of the case is named in narrow capitals: a column head, a group head, a tag, the kind of a
  boundary. A value the system reports is monospace. Everything a person reads as a sentence is sentence case.
- **Do.** Set the label of a field in sentence case, and show the key a setting is stored under beside it as a value.
- **Don't.** Don't engrave a sentence, a caption or a field label. Don't set prose in monospace.

## The Boundary Plate

The kind and the name of a security boundary between the mark's own braces, on a lit plate. Class `.boundary`.

- **Rule.** The plate names Platform, Team or Tenant, and nothing else. It appears on the display, and again in every
  dialog that acts inside the boundary.
- **Do.** Give each kind its icon, its word and its fill: a tenant is lit in the tenant's color, a team is white, the
  platform is amber with tape at its edge.
- **Don't.** Don't use it as a tag, a badge or a status. Don't change its words. Don't show a kind by color alone.

## The Display

One dark screen in the console's bar. Class `.display`.

- **Rule.** The display holds state and never a control: the three boundaries in order with the active one lit, the
  page, and who is signed in.
- **Do.** Keep it in view. The bar is sticky, so the boundary is on screen at every scroll position and on a phone.
- **Don't.** Don't put a key, a link or a field on it. Don't add a second display to a page.

## Hazard Tape

Classes `.hazard` and `.alert--warning`. Tape means "this is not routine": [Shape, depth and the brace](04-shape-and-depth.md#hazard-tape)
has its rule.

## The Rest of the Kit

| Part | Classes | Use it for |
|---|---|---|
| Plate | `.plate`, `.plate--raised` | A flush panel on the case; raised, it stands as proud as a key: a sign-in card |
| Alert | `.alert`, `.alert--success`, `--warning`, `--danger`, `--info` | A message with a signal bar, an icon and a word; a caution wears tape |
| Chip and tag | `.chip`, `.tag` | A status as a lamp and a word; an engraved name with an edge |
| Table | `.table` | Rows of values: an engraved head on a sunken ground, values in the value voice |
| Selector | `.navkey` | A column of names with one latched, its lamp lit |
| Dialog | `.dialog` | An overlay that restates its boundary with the plate beside its title; a sheet on a phone |
| Tooltip | `.tooltip` | A small screen: the screen's field and its ink |
