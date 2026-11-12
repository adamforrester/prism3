## (2026-11-11) — Badge's motion: no pulse, named transitions, a fade under reduced motion (#3554 Q-CC28 A, #3555 Q-MD4 A)

Owner decision Q-CC28 A, which is also Q-MD4 A's "correct Badge's motion prose to meet R7, R8 and R10". Badge's
motion named a pulse "only for a critical alert" with no critical tone, prop or state, cited no `motion.*` token,
grew from zero, and under reduced motion said "every change is instant".

- The pulse is gone (R8: it had no stop, and nothing could trigger it).
- Enter: fade in and scale up from a little under full size, from the anchor corner, on `motion.transition.enter`
  (R10, R2). Exit: fade and scale down on `motion.transition.exit` (R3). A changed count's number changes on
  `motion.transition.default`, an in-place change (R2); the pill still does not move. The status label still
  appears with no motion.
- Reduced: fades with no scale on `motion.duration-reduced.normal` both ways, the twin of the enter's `normal`,
  shared by the exit (R7, R3 and #3493).
- Prose only; `lint-component-surface` is unchanged, and `lint-motion-literals` passes. The Badge recipe in the
  skill itself travels with the Q-MD4 recipes PR.
