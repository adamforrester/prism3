## (2026-10-26) — Fixed paint, the slot aspect lock, and keep-own on rebuild (#2343 PR 2)

**What landed.** The host side of the brand marks, from the #2343 proposal (§1.2, §4 PR 2), built independently of
PR 1's pipeline so the two could run in parallel: nothing here names a mark.

- **`fixedPaint`** on a `slot`, `overlay` or `nest` part: the projector pushes no `descendantFills` into it, and the
  plan says `fixedPaint: true`, so a gate reads the promise and the outcome as two facts. A slot or overlay otherwise
  takes its host's icon ink on every vector inside, which on a brand mark is the retint the provider forbids. Refused
  on any other kind and beside a `paintSlot`.
- **`aspectLock`** on a `slot` or `nest` part: the part binds `height` alone, and both executors read the proportion of
  the component the instance instances, resize to it, lock it and then bind the height, so Figma derives the width.
  The box lock (`aspectRatio`) takes its ratio from a variant axis; a slot's belongs to whatever the designer swaps in,
  so it is read at build time. A slot may now bind a `height`, but only under the lock (without it the height still
  reaches no node, and is still refused).
- **Keep-own on rebuild** (owner decision Q-B3 A). The as-built record (`member-baseline.ts`) gains `art`, one hash per
  node holding vectors, over their geometry. A designer who redraws a glyph inside its main component changed paths no
  node hash read, so an Update laid a fresh import over the drawing; now the redraw reads as a hand edit at the frame
  and is kept and reported under owner decision Q1, as a recolor already was. Beside the node hashes, on `reactions`'
  precedent: a record written before it makes no claim, so no existing file reads as edited.

- **A recolored mark takes the new colors.** In place, an untouched glyph keeps its vectors when a fresh import draws
  the same paths, so an override on one survives; that comparison read paths and boxes only, which is right for an
  icon (its fills are the host's binding, written after) and wrong for a mark, whose fills are the document's. A glyph
  that takes no host ink now compares fills too, so a provider color change is not kept under a current stamp.

**The diagnosis.** Keep-and-report already existed for every node (#2265, Q1); it missed exactly one kind of edit, the
geometry, because `vectorPaths` was never in the signature. Adding it to the node signature would have changed every
vector's hash and made every glyph in every file read as hand-edited until `BASELINE_V` moved; a separate field
scoped the change to records written from now on.

**Scope, stated.** The artwork hash applies to every glyph, the icon set's too, not only marks: Q1's rule is the same
for both, and a redrawn icon was silently overwritten before. No def sets `fixedPaint` or `aspectLock` yet; the first
hosts are the branded buttons and card fields (#2343 PRs 4–6). EXECUTOR_REVISION 39.

**Tests.** `packages/engine/test.ts` (#2343 PR 2 arms, on a Button clone whose leading slot is a mark slot, with the
real Button as control), `apps/plugin/test-write-components.ts` (`mark slot/…`, the real executor against a live 32×20
main in the shim) and `apps/plugin/test-update-apply.ts` (`redraw/…`, `recolor/taken`). Each mutation and its failing assertion is in
the PR.
