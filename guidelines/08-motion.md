# 8. Motion

Keys travel, readouts tick, and nothing else moves. Motion says that something was pressed or that a value changed. It
never decorates, and it never delays.

| What moves | How | Tokens |
|---|---|---|
| A key | Goes down 2 pixels when pressed and comes back on release, in 70 ms | `--nc-travel`, `--nc-dur-press`, `--nc-ease-out` |
| Hover and focus | Change color only, in 120 ms | `--nc-dur-quick` |
| A switch | Slides in 200 ms; a latched tab or navigation item stays down | `--nc-dur-move`, `--nc-ease-in-out` |
| A dialog or a menu | Arrives in 280 ms, and leaves faster than it arrives, or at once | `--nc-dur-enter` |
| A readout: a count, a status, a memory cell, a lamp | Changes in one step: it never fades, slides or counts up | `--nc-ease-tick` |

- Nothing moves on its own except a readout that is live, such as the hero's memory panel or a boot sequence's lamps.
- Nothing loops in an application; a waiting state is a lamp that steps and a word that says what is awaited.
- No parallax, no scroll-driven animation, no entrance animation on page content, no skeleton shimmer, no ripple.
- Layout never animates: a row that appears is there.
- The longest motion is 280 ms; anything longer is a readout that steps.
- Movement uses `transform`, never the separate `translate` and `rotate` properties, so one feature less is needed.

`prefers-reduced-motion: reduce` removes every animation and transition, as `css/base.css` does. Each animated part
rests in a designed still state, and a state is still told by position, by a lamp and by a word, so nothing is lost.
