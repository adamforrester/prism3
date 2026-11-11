## (2026-11-11) — The icon buttons state their press scale and name their timing (#3554 Q-CC29a A, #3555 Q-MD4 A)

Owner decision Q-CC29a A. IconButton's `motion.reduceMotion` told a consumer to resolve "scale/translate to none"
under reduced motion, but never stated a press scale, where Button states 0.98. The shared factory's prose now
states the same subtle press, scale 0.98, so all three icon-button families carry it, and the reduced-motion clause
refers to something the component does. Button's value was carried over unchanged: the decision was to state the
scale, and the sibling's is the one the family already uses.

The same sentence carried the untokened "~100–150ms", so Q-MD4 A's duration mapping for the icon buttons travels
here rather than in the control-state-durations PR, which would otherwise conflict on this line: the state transition
runs on `motion.duration.fast` with `motion.easing-role.default` (R6), and under reduced motion the color change runs
on `motion.duration-reduced.fast` (R7). The `notes.unverified` timing entry says the timing is named and still
ungated.

- Prose only. The component catalog and the three icon-button pages move; no binding, member or token does
  (`lint-component-surface` unchanged).
