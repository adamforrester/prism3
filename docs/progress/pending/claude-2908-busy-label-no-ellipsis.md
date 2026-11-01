## (2026-11-01) — Busy labels drop their "…": the spinner is the one busy signal (#2908)

**Status:** plugin and panel, built as the owner decided (Q2908.1 A). ENGINE patch (change note): no committed artifact,
emission or component surface moves.

### What it does

- While a run is out, Update file reads **"Updating"** and Documentation › Specs' button reads **"Drawing specs"**
  (`UPDATE_COPY.busy` in `state/update-file.ts`, `DOCS_COPY.specsBusy` in `shell/documentation.ts`). The `pendingLabel`
  cell (`shell/dom.ts`), the "…" that turns into the spinner after about 300 ms, is unchanged, so a running control
  shows one busy signal, not the cell's dots plus the label's own "…" (the "dots on both sides" the owner saw).
- The literals that pin those labels move with them: `test:chrome`'s `UPDATE_RUNNING` (`"… Updating"`, the cell then the
  words), `test-build-verdict.mjs`'s `BUSY_LABEL`, and `test-style-guides-page.mjs`'s Specs text.

### What it leaves

- The Activity drawer's phase lines ("Writing to Figma…", "Drawing specs…" in `main.ts`'s `PENDING_TEXT`) are a
  different surface from the button labels and were not part of the decision, so they keep their "…". The PR asks
  about them in a DRAFT Q-block.
- #3276 (the `test:chrome` geometry arm for the same issue) pins `words === 'Updating…'` and `'Drawing specs…'`. This
  PR is independent of it: whichever merges second updates those two literals.

### Verification

Mutation: `UPDATE_COPY.busy` back to "Updating…" fails `test:chrome` §10's busy arm and `test:verdict`'s
`BUSY_LABEL` arms by name; `DOCS_COPY.specsBusy` back to "Drawing specs…" fails `test-style-guides-page.mjs`'s Specs
text arm by name.
