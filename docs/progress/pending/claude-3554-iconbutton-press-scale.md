## (2026-11-11) — The icon buttons state their press scale (#3554 Q-CC29a A)

Owner decision Q-CC29a A. IconButton's `motion.reduceMotion` told a consumer to resolve "scale/translate to none"
under reduced motion, but never stated a press scale, where Button states 0.98. The shared factory's prose now
states the same subtle press, scale 0.98, so all three icon-button families carry it, and the reduced-motion clause
refers to something the component does. Button's value was carried over unchanged: the decision was to state the
scale, and the sibling's is the one the family already uses.

- Prose only. The component catalog and the three icon-button docs move; no binding, member or token does.
- The untokened "~100–150ms" in the same sentence is left for the Q-MD4 durations pass, one concern per PR.
