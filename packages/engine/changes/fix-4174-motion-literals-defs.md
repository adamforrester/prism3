---
engine: minor
---
Component motion prose names motion tokens only, never their milliseconds (#4174, owner decision (a)). Spinner, Progress and Slider no longer print a duration beside the token they name, because the number was right only at the standard tempo: Slider's note said `motion.duration-reduced.fast` "keeps 100ms", and two shipped brands emit 80ms and 50ms. Progress's anti-flash timings now name their props, `delay` and `minDisplay`. Each brand's `<brand>.ai.json` prints a token's resolved value. `lint-motion-literals.ts` now runs its literal scan over every def's `motion` fields and each code-only note that names motion.
