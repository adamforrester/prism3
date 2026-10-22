## (2026-10-21) — Button group fill: a label wraps inside its button, even one long word (#2885 follow-up, refs #2880)

**What moved.** Review of #2885 measured the fill line in a browser: with `min-width: 0` the two buttons are equal, but a single long word (a German label, say) overflows its button instead of wrapping. The fill line now adds `overflow-wrap: anywhere` on the label, stated in the Button group's code line and evolution note and in the Dialog's `fill` code line. The `#2880 button group fill` arm in `test.ts` requires that clause as a literal.

**Nits.** The stale three-value `footer` comment in `component-schema.ts` now says four; the `actionsFill` note drops its double colon and the wrong "each half the width" (three buttons share a third each); a studio test message gives the right member counts (3 end, 6 fill).

**Not measured.** The clause is a contract line checked as text. It was not rendered against delivered Button CSS, which does not exist yet (#2454).
