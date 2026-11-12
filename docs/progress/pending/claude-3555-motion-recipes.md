## (2026-11-11) — prism3-motion gains recipes for Progress, Badge and the selection controls (#3555 Q-MD4 A)

Owner decision Q-MD4 A (G12, I15). The skill said "Six recipes cover the components that move today", while Badge,
Progress and the selection controls also carry motion, and their defs typed raw milliseconds or broke R7, R8 and R10.
This PR adds the three recipes the decision names; the defs follow in their own PRs (Badge with Q-CC28 A, and the
duration mapping per component family).

- **Progress:** the fill on `motion.duration.moderate` with `motion.easing-role.default`, the sweep and the
  indeterminate ring on `motion.duration.sweep`, both slowing to `motion.duration-reduced.sweep`. The show delay and
  the minimum show stay gap #3486, and the recipe sends an agent to Progress's own `delay` and `minDisplay` (R1's
  "use the component's own spec for that one value"), which is what the def already does.
- **Badge:** what Q-CC28 A decided: a fade and a scale from a little under full size on `motion.transition.enter`
  and `.exit`, a changed count on `motion.transition.default`, no pulse, and a fade under reduced motion.
- **Selection controls:** the checkbox draw and the radio dot are control state changes, so `motion.duration.fast`
  with `motion.easing-role.default` (R6), mapping the defs' "about 100-150ms"; the switch thumb and the segmented
  pill travel on `motion.transition.default`, the tabs underline's token, mapping their "150–200ms" (#3529's open
  call). Reduced: nothing draws, scales or travels, and the color change fades on `motion.duration-reduced.fast`.
- The headline now lists nine recipes and says every other component follows the rules directly, rather than
  claiming the recipes cover every component that moves (select, tag, field message, slider and link still carry
  motion without a recipe of their own).
- Skill text only: no change note, since no committed artifact moves (`regen.ts` leaves the tree clean).
