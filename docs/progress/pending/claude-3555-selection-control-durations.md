## (2026-11-11) — The selection controls' motion names tokens, not milliseconds (#3555 Q-MD4 A, #3529)

Owner decision Q-MD4 A, "map the untokened durations to the scale", for the selection controls, following the
recipe the skill PR adds. This also settles #3529 (switch control, switch row and segmented control), whose one open
call, which transition the switch thumb travels on, Q-MD4 A's selection-controls recipe answers.

- Checkbox (control, group, row) and radio (control, group, row): "about 100-150ms" → `motion.duration.fast` with
  `motion.easing-role.default`, a control state change under R6. The radio's dot scales in "from a little under full
  size" (R10), and the code-only note drops "spring" (R4: a click is not a hand's release).
- Switch (control, row) and segmented control: "~150–200ms, ease-in-out" and "about 150–200ms" →
  `motion.transition.default`, the tabs underline's token, since both are the same kind of travel.
- Reduced motion: "snaps (0ms)", "flips instantly" and "a crossfade under 150ms may remain" become R7's
  substitution: the glyph, dot, thumb and pill take their new place at once and the color change fades on
  `motion.duration-reduced.fast`.
- The brief's own figures stay where a note quotes the brief as a source; the def's claims no longer type a number.
- Prose only. The component catalog and the eleven pages move; the component-surface baseline was re-accepted for
  checkbox-control, radio-control and segmented-control, whose plans carry the motion text (same member counts).
