## (2026-10-03) — UI redesign S6.3: Type › Scale, Scale limits, Weights and styles, Line height and letter spacing; the lent region and Layout's Responsive type sizing retired

**STATUS: branch `ui/s63-type-scale`.** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. The last of S6's three PRs (S6.1 #1992, S6.2 #2013). The spec is the S6 scoping report (§3, §4, §6 "S6.3" and its traps, §7) and the owner's decisions of 2026-10-02 (Q62–Q77, with Q22–Q24, Q53, Q54, Q57–Q59 and QA-B2, QA-B9). Copy marked APPROVED there is used verbatim; every other new string is DRAFT and listed below for the owner. **Closes #831** (the style count repaints with the store) and **#2010** (Weights and styles names no Semantics tab and no "rungs").

**What the user sees.** The temporary "Scale and weights" region S6.2 lent from the legacy page is gone. In its place, after Font families:
- **Scale.** The three scale chips (the manifest's Compact / Default / Expressive); a chip the engine would refuse, because a size you set would collide at that scale (#353, a trial build), is disabled with the reason, and **Release pinned sizes** shows while any is. A line counts the sizes set individually. The **#1802 line** (Q72): a text style the preview uses that this brand does not make (a low display ceiling, a declined weight) is named, with "The preview shows a fallback." Behind Scale's own **Show 1 advanced**: **Individual sizes**, every heading size (display, title, eyebrow) with a **Desktop** and a **Mobile** control side by side (Q63 option A), sizes outside the range listed as such.
- Behind the page's **Show 12 advanced** (Q69; the count is the three sections' rows, as Palettes counts its own):
  - **Scale limits:** "Headings scale between mobile and desktop" (Q70, a switch), the min and max viewport, and "Depends on Layout: breakpoints"; the largest display size (each option priced in px); the title floor chips 18px / 16px; the caption floor 11px / 10px and the size floor 10px / 8px, new here (no surface edited them before), with the 8px warning.
  - **Weights and styles:** one row per weight (Subtle … Max), each opening the value picker; the order warning; the weights matrix (each text type × each weight, plus Link), its locks disabled with the reason, each text type's style count beside it; the italic chips Upright / Upright + italic / Italic only per text type (Q6); **Pin a font style** (Q64; the legacy "Pin a font cut", in Q70's words).
  - **Line height and letter spacing** (Q64): the step each name uses; previewing another mode, that mode's swap of a name for another; each text type's "one step looser / tighter" nudge, with the names it lands on.
- **The value picker** (Q65 option A, new `ui/value-picker.ts`, the step picker's frame): a size, a weight, a line height or a letter spacing opens the list of every value it may take, each with a live sample at that value, the current one checked; a value that would break the order is listed disabled with the reason ("Lighter than emphasis (500). Weights stay in order.") and writes nothing. Arrow keys, Home, End, Escape, focus back to the button on close.
- **Labels read first** (QA-B2): every S6.3 control shows its plain label, then its token in mono under it (`font.weight-role.strong`, `type.title.md`, `font.line-height-role.normal`). S6.2's Font families controls keep their token-first order: the shared styling PR flips those.
- **Which mode a control edits** (Q22, Q62 option A): per-mode values (a weight, a heading's desktop size, a line height or letter spacing swap) write the brand value previewing Light and `modeLevers.dark.*` previewing Dark, shown as "Auto: follows Light (‹value›)" with Return to Auto. Brand-wide values (the scale and limits, which weights and styles ship, the pins, each name's step, the nudges, a heading's mobile size) write the same bytes from Light and Dark (Q54). Derived modes disable every control (Q59), the advanced sections included.
- **The preview** (§3, previewed mode only, gray containers): Type sample; Font families; **Scale** (every style, one row per text type and size, its sample capped at 44px as v6 caps it, desktop and mobile px, line height, letter spacing and the weights it ships; then "Sizes that merge on mobile"); **Weights and styles** (the S6.1 "Weight roles by font family" table, now the previewed mode's weights and families, plus each text type's italic and link styles); **Line height and letter spacing** (each name's step in that mode, swaps shown, what uses it, a specimen); **Building blocks** (Q73: the fixed size, line height and letter spacing steps, read-only). Each heading and description is its lever section's (Q23); Scale limits pairs with Scale (`PREVIEW_HEADING`).
- **The edit-reveal** (#2015) runs on Type: `domains/type.ts` notes the edit (`noteSectionEdit`) before it rebuilds, so a Scale edit eases the preview to Scale, a limit to Scale, a weight to Weights and styles.
- **Layout** no longer draws "Responsive type sizing" or its fluid read-out (Q71, C10 = yes). Type is its one home.

### Diagnosis and structure

- **New modules:** `ui/value-picker.ts`; `preview/sections/type-scale.ts` (`data-sg-section="type-scale"`), `line-spacing.ts`, `building-blocks.ts`. **Retired:** `preview/sections/type-ramp.ts` and `type-fluid.ts` (folded into Scale).
- **`state/type-input.ts`** gains `setCaptionFloor` and `setSizeFloor` (each UNSETS its default), and `setItalicStyle` / `italicStyleOf`, which compose the two legacy italic writes in the order the legacy page needed them (the boxes were exclusive) and nothing else. Every other write is S6.1's, unchanged.
- **`main.ts` 6,103 → 5,142 lines.** Retired: `renderTypeLent`, the heading sizes (`renderTypeSizes`, the size tables, `sizeCell`), `stepCell`, the weight table and roles, the leading and tracking bindings and the per-mode tables' Type caller, the category table, the font-style pins, the size and line height ladders, Layout's `renderResponsiveControls` and `paintFluidPreview`. `renderRepointTable` STAYS (Motion's easing table, S9); its line height and letter spacing branch is now dead and goes with it in S9. `PageLends.typeStyles` is gone.
- **#831.** The page repaints whole on `brand`, so the style count, the nudges' landing names and the chips' clash state are read fresh after every edit. The nudges, links and pins still commit through the store's `rebuild()` only, as `apply()` did; the legacy lent region on `origin/main` already repainted on `brand`, so the bytes match it.

**Behavior-neutral, measured.** An equivalence driver (scratch, not committed) drove every kept legacy control, previewing Light and Dark, on each corpus brand (prism3, aurora, harbor), on `origin/main`'s lent region and Layout page (`101f6270`) and on the new page: the scale chips away and back, the ceiling, the title floor, desktop and mobile sizes and their resets, a pin left for Release (exercised where a chip clashed), each weight a step and reset, every unlocked matrix cell and Link both ways, every italic chip transition (as the legacy boxes reach it), two pins typed and cleared, each line height and letter spacing name a step and back, every Dark swap and back to Auto, every nudge ±1 and back, the fluid switch and both viewports. **1,078/1,078 persisted brands byte-identical after each edit**, 0 page errors. The traps held: an emptied `italics` or `links` is `[]`; `responsive.fluid` is always written; nudges, links and pins commit through one `rebuild()`.

### Design calls (the most conservative option that reuses a pattern; for the owner)

1. **Three Show advanced folds:** Font families' (S6.2's, unchanged), Scale's (Individual sizes), and the page's (the three advanced sections, Palettes' pattern, counted by rows: "Show 12 advanced").
2. **The 16px title floor stays live under Compact,** as the legacy toggle was: the engine refuses it and the refusal surfaces (#388). v6 and §7 disable it; the info text says so instead. Disabling it would also leave #388 with no reachable path on Type.
3. **A heading's Mobile size is brand-wide** (`sizeOverrides`, no mode): editable previewing Dark too (Q54), with "Mobile sizes apply to every mode." The legacy table offered it on the base column only.
4. **Weights now stay in order:** the picker disables a weight past its neighbor (Q65), where the legacy stepper allowed a crossing with a warning. The order warning stays for a brand that arrives crossed.
5. **Line height and letter spacing per mode:** each row keeps its step picker (brand-wide) and, previewing Dark, adds a swap select under it.
6. **The Scale preview groups by style** (one row per text type and size, weights listed), as v6's Scale board does, replacing the per-composite ramp.
7. **Pin a font style keeps the legacy hooks and placeholder** ("Derived from weight").

### Tests

- **Counts** (against `origin/main` `101f6270`): `test` type-input 68 → 80, repaint-guard 160 → 165, page-data 76 → 76; `test:smoke` 4,052 → {{SMOKE}}; `test:chrome` 12,926 → {{CHROME}}; `test:verdict` 299 → 299.
- **Unit (`test-type-input`)**: the caption and size floors (`setCaptionFloor(11) leaves the brand byte-identical`), the italic chips' writes as literals from prism3's lists, the lock string in Q70's words.
- **`test-shell-imports`**: the four new modules scanned, the Type preview's six shared pieces, `main.ts` drawing no Scale, Weights and styles, Building blocks or fluid read-out of its own.
- **`test:smoke`**: 1f's sections and markers, and Scale held to the emission (every style once, desktop and mobile px, weights at their numbers); Layout draws no fluid read-out; #388 on the new scale and title floor chips; #1639/#1681 on the matrix; #1296 on the italic chips; the pin on the new rows; **a round trip per italics chip through the exported DTCG `fontStyle`**.
- **`test:chrome`**: section 20 (the new specimens, Q59 over every advanced control on a floor of 150, the face scan and a Q70 plain-words scan with every fold open); 20b (every S6.3 lever once; Q23 pairs and copy literals; QA-B2 order; Q65 refusal; #831; Q22 Dark weight, size and swap; Q54 nudge; the floors and the 8px warning; the pinned "Italic only"; `typography.responsive is drawn on Type only`); section 21's Type reveal; #1031 moved to Layout's legacy fields.

**Mutations, each after a `wip:` commit, restored with `git checkout -- <file>`, each failing by name:** {{MUTATIONS}}

### Open with the owner (DRAFT copy)

{{DRAFT}}

### Found, not fixed

{{FOUND}}
