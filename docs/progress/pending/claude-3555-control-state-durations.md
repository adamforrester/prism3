## (2026-11-11) — Control state changes name the motion scale, not milliseconds (#3555 Q-MD4 A)

Owner decision Q-MD4 A, "map the untokened durations to the scale" (I15), for the components outside the selection
controls (their own PR) and outside IconButton (which travels with its press-scale PR, the same sentence).

- **Button, the flush icon buttons, Link, PageNav.Item, TextField, Textarea, Select's closed control.** Every
  "~100–150ms" or "about 150ms" state change maps to `motion.duration.fast` (100ms at the standard tempo) with
  `motion.easing-role.default`: a hover, press or focus change is chrome under R6, and in place under R2. Under
  reduced motion the color change keeps running on `motion.duration-reduced.fast` (R7: reduced motion substitutes;
  it does not delete) where the prose said "instantly", "snaps" or "with no transition".
- **Select's open list.** Open "~100–150ms" → `motion.duration.fast` with `motion.easing-role.enter`; close "~75ms"
  → `motion.duration.instant` with `motion.easing-role.exit`, so the exit stays shorter (R3); reduced "~50ms" →
  `motion.duration-reduced.instant`, shared both ways (R3, #3493). The 4px translate stays a number: distance has no
  token yet (#3482).
- **Textarea.** "At or under 100ms" for an optional auto-grow transition → "at or under `motion.duration.fast`".
- Button's and the flush buttons' `notes.unverified` "motion timing" entries now say the timing is named in prose
  and still ungated, rather than carried as a raw target.
- Prose only. The component catalog and twelve pages move; the component-surface baseline was re-accepted for
  Link's three sets, whose plans carry the code-only motion text (same member counts).
- `lint-token-consumers`: Select's prose now names `motion.duration.instant` and `motion.duration-reduced.instant`,
  so the `motion.**` register's unread count drops from 12 to 10, as the gate asks. Mutation: back at 12, the gate
  fails by name ("'motion.**' claims 10 unread token(s) and declares 12").
