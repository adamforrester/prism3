## (2026-10-26) — Library cover redesign: centered name, logo slot, the display name fixed (#2915, #2891, #2892)

**Status:** plugin cover + studio name field + engine brief/dialect fix + tests. ENGINE minor (change note). CONTRACT
unchanged: no token path moves. The cover is not component-executor code, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q1–Q5 A (2026-10-26, on #2915)**, built from the wireframe's direction A
  (`apps/plugin/src/cover-frame.ts`): the ground binds `color/background/primary`; the name binds `color/text/brand` in
  the display face at 120 px (was 240), centered and wrapping inside a 240 px inset; the subtitle "Design system"
  (DRAFT) sits 28 px under it at 36 px; the version reads `v<engine>` (was `Prism3 <engine>`) at 28 px, 96 px in from the
  bottom-left; both bind `color/text/secondary`. The name and subtitle are one block centered on the frame, re-centered
  when the name changes.
- **The logo slot (Q4 A, #2891):** an empty frame named "Logo", tagged `cover-part` = `logo`, 200 × 72, 96 px in from
  the top-right. `coverPrint` skips it and everything in it, and `findPart` never looks inside it, so a pasted logo is
  not a hand edit: the name and version keep updating and the name stays visible.
- **Existing covers:** the record now carries `design: 2`. An unedited cover with no `design` (#2859's) is redrawn in
  this design inside the same frame on Update, so its place and the thumbnail pointer stay; the dry run says "to redraw
  in the new design". An edited one is never redrawn (#2956): the dry run and the result call it "Cover (edited)", and
  only its tagged version text is set, as Q?4 B decided. Documentation's Cover off is still read by the callers.
- **The name (Q5 A, and the bug the wireframe found):** the fallback is the id made readable (`readableId`), and the
  dry run and result add "No display name is set, so it shows ‹name›, from the brand's id." The Studio's Brand name
  field now edits `BrandInput.name` (`setName`); the id stays the export slug. The bar and the start window's
  "back to" and guard texts show the display name, else the id as written. `prism3.design.md` and the redesign seed
  brief gain `name`. #2892 is fixed here, since it is the same path: `standardToBrandInput` carries the standard
  brief's `name` into `BrandInput.name`, and leaves it unset when the brief has none.

### Verification

- `test-cover-frame.ts` (109 assertions) is rewritten against literals from the wireframe. It measures contrast for
  both inks on the ground across every example brand and mode (lowest 5.00:1). The first design's fingerprint is a
  literal computed once with #2859's own `coverPrint`, so a change that made old records read as edited would fail it.
- Mutations, each committed first and each failing by name: one paint literal → `bound/every paint on the cover is
  bound`; the version write skipped on an unedited cover → `update/version refreshed on an unedited cover`;
  `coverPrint` reading the slot → `logo/content in the slot is not a hand edit`; `setName` writing `id` →
  `the Brand name field writes name, not id`; the fallback back to the id as written → `name/the readable fallback`.

### Held

- **The subtitle is in the fingerprint.** Retyping it marks the whole cover edited, so the name stops updating. The
  wireframe's "What Update keeps current" board proposed judging each part on its own (the subtitle written once, then
  the team's). The Q-block did not ask it, so this keeps the one-fingerprint rule and raises it as a question.
- **Layout options** (centered, low-left, framed) are the owner's follow-up, filed separately.
