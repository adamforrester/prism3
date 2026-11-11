## (2026-11-10) — Dialog fades under reduced motion instead of opening at once (#3488)

**Status:** Dialog def prose + its `test.ts` arm. ENGINE minor (change note). CONTRACT unchanged: no token path moves.
No executor change: Figma shows the panel at rest, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q-M5 A (2026-11-07, on #3413), amending Q491 A:** under reduced motion every placement (centered,
  bottom sheet, full screen, end panel) and the backdrop fade only, with no slide and no scale, on
  `motion.duration-reduced.normal`, to open and to close. Before, the def said they opened and closed at once, citing
  `motion.duration-reduced.moderate` as 0ms.
- `dialog.ts`: `motion.reduceMotion` and the code-only `motion` line say the fade and the token; a new `evolution` note
  records Q-M5 A over Q491 A.
- `skills/prism3-motion/SKILL.md`: the Dialog recipe drops its "(the def still drops the fade; #3488 corrects it)" note.
- `test.ts`: the `#2877 dialog reduced motion` arm pinned Q491 A ("at once … no fade … 0ms"). It is now the
  `#3488 dialog reduced motion` arm and asserts the reverse: both lines name the fade on
  `motion.duration-reduced.normal`, and neither says "at once", "no fade", "0ms" or `duration-reduced.moderate`.
  Mutation: putting back the old `reduceMotion` sentence fails the arm by name.

### Why `normal` and not the dialog's own `moderate` twin

The decision names `normal`. The reduced ramp's `moderate` is 0ms in every tempo today, so a twin of the full
duration would be no fade at all; the ramp's order and floor are #3493 and #3484, both waiting on an owner value.
