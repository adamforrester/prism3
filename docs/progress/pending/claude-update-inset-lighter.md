## (2026-11-17) — Update file's group insets one step lighter, with no white chip on them

**The ask.** The owner, after using the rebuilt plugin: "can we make the grey that is used in the component containers a
shade lighter? It's just too dark right now and the white labels on top of it look strange."

**What the "white labels" were.** Inside an open card in Update file, each group (Due, To add, Kept edits) is an inset,
`.p3-upd-inset`, drawn in `--p3-fill-1`: `color.foreground.primary`, neutral 050 (`#e9e9e9`) in light. The text on it is
already dark ink (`text` 16.00:1, `text-2` 4.54:1). The white things were the status chips ("Due · its settings changed",
"Engine update: …"): a rule gave every chip in an inset `--p3-bg-page`, a white pill, 1.21:1 against the gray.

**The change.** The inset takes `--p3-levers-bg`, which is the step one lighter in light (neutral 025, `#f7f7f7`) and
fill-1's own step in dark (neutral 900). The white-pill rule is gone, so a chip in an inset takes the tag's own fill,
as every other tag does (`.p3-sg-tag`, `fill-1`). Measured, light: `text` 18.13:1 and `text-2` 5.15:1 on the inset;
the chip's ink 4.54:1 on its fill; the chip's fill 1.14:1 on the inset. Dark keeps neutral 900 because the step
lighter, 850, puts `text-2` at 4.17:1, under the 4.5 floor. In dark the chip's fill matches the inset, so it reads as
plain secondary text (4.64:1).

**Held by.** `test:chrome` section `ia2`, `inset one step lighter`: each inset's computed fill against the emission's
neutral 025 (light) and `color.foreground.primary` (dark), and each chip's against `color.foreground.primary`. Both
fail on main by name; mutating either half back fails its own arm.

**Held for the owner.** The chip treatment and the dark side are DRAFT: the options and numbers are in the PR body.
