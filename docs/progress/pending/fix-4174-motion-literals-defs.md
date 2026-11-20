## (2026-11-19) — Motion numbers leave the component defs; lint-motion-literals reads them (#4174)

The motion skill's R1 says every timing is a token, because the brand's tempo scales the ramp. `lint-motion-literals.ts` promised in its header that the defs' `motion` prose would join its literal scan "when #3487 lands". #3487 closed on 2026-11-11, and the scan never joined. The owner chose (a) on #4174: a def names the token and never its number; the generated per-brand sidecar prints the number.

### What changed
- **The gate.** Half 1 (literal shapes) now also reads every registered def's `motion.enter`, `motion.exit` and `motion.reduceMotion`, and each code-only note that names motion. That is 200 texts on this tree. A finding names the def and the field, for example `DURATION LITERAL (motion.enter): def:spinner "200ms"`. Allowances are keyed `def:<id>`; none was needed. A floor of 150 texts read guards a scan that stops reaching the registry. A self-check fixture covers the field, the note filter and the `def:` key.
- **The prose (DRAFT shipped copy, back to the owner in the PR).** Spinner, Progress and Slider lose the parenthesized millisecond values. Progress's enter and exit name its `delay` and `minDisplay` props instead of 400ms and 500ms.

### Evidence that the numbers were wrong, not merely redundant
Slider's code-only note said `motion.duration-reduced.fast` "keeps 100ms". The committed emission has 80ms and 50ms in two of the five brands. `motion.duration.fast` itself runs from 80ms to 130ms across brands.

### Left as found
- Code comments in the def files (`/** … */` headers) still cite values. They're exempt from the prose rules and aren't scanned.
- Code-only notes that don't name motion keep their numbers: Spinner's host anti-flash band, Progress's prop defaults and Toast's `duration` floor. They are API defaults or thresholds, not tempo-scaled timings.
- The component page is brand-independent (#1701), so it prints no resolved values. `<brand>.ai.json` already carries each motion token's value and description per brand.
