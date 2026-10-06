## (2026-10-06) — Studio: Italic styles as chips (#2192)

**Status:** `apps/studio/src/ui/lever-kit.ts` (new `chipChoice`), `domains/type.ts` (Italic styles uses it), `chrome.css`
(one dead rule removed), `test:smoke` section 2f and `test:chrome` sections 20b and 30b (new). No ENGINE bump (no emitted
artifact moves). CONTRACT unchanged. No copy change: the three words are Q6's. Closes #2192.

### What changed

Owner QA, 2026-10-05: in Type › Italic styles, each text type's full-width segmented control becomes three single-select
chips, as the heading pass 2 board mocked them. `chipChoice` draws `toggleChip`'s look (`.p3-btn.p3-chip`, the check
glyph on the pressed chip) as a `role="group"` named by the row, each chip a button with `aria-pressed`, exactly one
pressed. Its signature is `choice`'s, so the lever's write (`setItalicStyle`) and its hooks (`italic-choice-<value>`) are
unchanged. The pinned-style case (Italic only disabled, with its reason) and a derived mode (every control disabled) work
as before, because both set `disabled` on the same buttons. The token stays flush right on the label's line (#2217).

**The keyboard, a call this PR made.** #2192 asked for "the same keyboard behavior as the other single-select chip
groups", but none existed: Personality's chips are multi-select, and Density, which the issue cited, is a segmented
`choice`. The board left arrow keys to this PR. The chips follow Personality's chips and the board's mock: each chip is a
Tab stop, and Enter or Space presses it. Arrow keys do nothing. The segmented control had a roving tab stop where arrows
moved the selection. That was radio behavior, and it would be wrong with `aria-pressed` buttons. A press keeps focus
through the redraw (the page's hook-and-index restore).

### Equivalence (run once, recorded here)

A scratch probe made ten presses on both hosts and read the saved brand after each one: the persisted
`prism3:brandInput` on the web, and Apply's `apply-theme` input on figma. It ran first on `origin/main`'s build, the
segmented control, and then on this branch's build. All 22 saves were byte-identical, and every row's pressed value
matched after each step. The sequence covered a re-press of the pressed chip (no write) and both lists emptied and
unset (#2006).

### The gate (test:chrome section 30b, new)

The gate runs on both hosts and both themes, at 1280 and 380:
- All seven rows, in order, render a `role="group"` of three `.p3-chip` buttons with the literal words, with no segmented
  part.
- Each row has exactly one chip pressed, the one prism3 calls for as loaded, and only that chip draws its check.
- Tab moves between chips in a row. Space presses the focused chip and keeps focus on it.
- Ten steps, each compared with the saved brand: `example-brands.json`'s prism3 with the two lists set to hand-worked
  literals.

Sections 20b and 2f (`test:smoke`) now read the chips (`aria-pressed`) where they read the radios.

Each mutation came after a `wip:` commit and ran on rebuilt bundles. Each failed by name, and none failed outside 30b:
- **(a) The code row back on the segmented control** (`choice` for `g === 'code'`) → `#2192 web light 1280: row "code"
  renders chips, not a segmented control — 4 segmented part(s), group {"role":"radiogroup",…}` (96).
- **(b) Two chips pressed in a row** (`chipChoice`'s set also presses the first chip) → `#2192 web light 1280: row
  "display" has exactly one chip pressed, only — pressed ["upright","only"]` (152).
- **(c) A chip writes the wrong value** (Upright + italic writes Italic only) → `#2192 web light 1280: step 1, "caption"
  both (key) saves italics ["body","caption"] … — saved italics ["body"], italicDefault ["display","title","caption"]` (96).

### Traps for whoever re-verifies

- On the figma host, the gate reads the saved brand from Apply. Each Apply is answered with `apply-result`, so the next
  one is not held as busy. If the bar's Apply moves (the Figma menu work, #2178), the gate's `saved()` moves with it.
- `test-hooks.mjs` refuses a `data-p3` spelled with a template. That is why the chip hooks are a literal map
  (`ITALIC_CHIP`).
