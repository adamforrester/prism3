---
engine: minor
---
The selection controls' motion prose names tokens instead of raw milliseconds (#3555, owner decision Q-MD4 A; closes #3529). The checkbox's draw and the radio's dot run on `motion.duration.fast` with `motion.easing-role.default` (their "about 100-150ms"); the switch thumb and the segmented control's pill travel on `motion.transition.default` (their "150–200ms" and "ease-in-out"). Under reduced motion nothing draws, scales or travels, and the color change fades on `motion.duration-reduced.fast` in place of "snaps (0ms)" and "a crossfade under 150ms may remain". Covers checkbox control, group and row; radio control, group and row; switch control and row; segmented control and its segment. Prose only; no member, binding or token moves.
