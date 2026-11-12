## (2026-11-11) — One mode control on every page at 1280: Contrast on one line, Inspect an icon (#3553 Q-UI1)

The UI polish review (#3553) found that at 1280 the preview header's mode control was its radios on Palettes,
Interactive, Type and Layout, but a select on Brand ("Style guide"), Surfaces & fills, Shape and Depth & motion, whose
longer titles left the radios no room (`place()` in `shell/preview.ts`). Moving between tabs swapped the control
under the pointer.

**The owner's Q-UI1 A.** The fit logic stays. At the wide tier the header makes room instead: the Contrast tile sets its
icon beside "Contrast" rather than above it, and Inspect is its icon alone. Measured on `main` with the word dropped and
the caret kept, Surfaces & fills was still 5px short and Depth & motion 9px. So Inspect drops its caret too ("Inspect to
an icon"): a square icon button at the control height, its name still "Inspect" (`aria-label`), and its menu unchanged.
At 1024 and at the narrow tier nothing changes: the select still takes its own row where the radios don't fit.

**Verified.** New test:chrome section `3553-q1`, in shard 3, on both hosts at 1280, both themes, on all eight Theme
pages. The mode control settles on its radios on the title's row, the Contrast icon sits left of its word on one line,
and Inspect draws only its `layers` glyph, named "Inspect". Mutation, after a `wip:` commit: the wide-tier Inspect rule
dropped fails `#3553 Q-UI1 … the mode control is its radios` on Surfaces & fills and Depth & motion, and `… Inspect is
its icon alone` on every page.
