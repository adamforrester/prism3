---
engine: minor
---
Control state changes name the motion scale instead of milliseconds (#3555, owner decision Q-MD4 A). Button, the flush icon buttons, Link, PageNav.Item, TextField, Textarea and Select's closed control: "~100–150ms" and "about 150ms" become `motion.duration.fast` with `motion.easing-role.default` (prism3-motion R6), and their color change under reduced motion runs on `motion.duration-reduced.fast` in place of "instantly" or "snaps" (R7). Select's open list fades in on `motion.duration.fast` with `motion.easing-role.enter` and closes on `motion.duration.instant` with `motion.easing-role.exit` (its "~100–150ms" and "~75ms"), and under reduced motion fades on `motion.duration-reduced.instant` both ways (its "~50ms"). Prose only; no member, binding or token moves.
