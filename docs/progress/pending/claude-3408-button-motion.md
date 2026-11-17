## (2026-11-17) — Button's state transition and press bind motion tokens (#3408, Q146 A)

**What.** Owner decision Q146 A on #3408 binds Button's state transition (the brief's ~100–150ms) and its 0.98 press to
existing motion tokens in the engine def, so `@prism3/css` picks them up from the emission instead of from prose.
Q-MD4 A had already mapped the transition to `motion.duration.fast` in the `motion` prose, with nothing reading or
gating it. The three Button defs now bind:
- `motion.state` and `motion.press` → `motion.duration.fast` (100ms at the standard tempo);
- `motion.state-easing` and `motion.press-easing` → `motion.easing-role.default`;
- `motion.state-reduced` → `motion.duration-reduced.fast`.

Under reduced motion the press scale resolves to none, so the press has no reduced binding. The emission carries these
once #3506's PR lands: its spec `motion` block lists every `tokens` binding to a `motion.*` token, with no change here.

**Why these tokens.** prism3-motion R6: a control's state change takes `instant` or `fast`, and `fast` is the ramp step
inside the brief's 100–150ms. The composite `motion.transition.*` tokens don't fit:
- `default` runs `normal`, 200ms;
- `exit` pairs `fast` with the accelerate curve, which is for leaving, not a state change.

**What has no token.** The press's 0.98 is a magnitude, not a timing, and the motion family holds only timings
(durations, easings, springs, transitions). It stays in the def's prose and is held as an OWNER DECISION on the PR.
IconButton and FlushIconButton carry the same prose-only motion note. Q146 A named Button, so they are left as they
are and flagged on the PR.

**Measured.** A `test.ts` arm (`#3408 Q146 A`) types the five bindings and R6's `instant`-or-`fast` set as literals.
It requires the reduced binding to be the reduced twin of the duration, and every bound path to resolve in all five
committed brands. On main's defs it fails 6 assertions; with the fix all 12 pass. Mutations, each failing by name:
`motion.state` → `motion.duration.normal` (bindings, R6 and twin all fail); `motion.press-easing` → a path no brand
emits (fails resolution, naming each brand file).
