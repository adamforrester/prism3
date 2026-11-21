---
engine: minor
---
Spinner and Progress's code-only notes bind their constant turn to `var(--motion-easing-linear)`, not the bare CSS `linear` keyword, as the motion skill already says (`motion.easing.linear` for both). `lint-motion-literals.ts` now refuses the bare keyword wherever it is a timing function (#3592), and found these two.
