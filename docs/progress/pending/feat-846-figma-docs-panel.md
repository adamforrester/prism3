## (2026-10-20) — Component usage docs, phase 2: the usage panel beside each set in Figma (#846)

**What it is.** The second phase of the approved usage docs wireframe (#846, 2026-10-19). After a build or an update
lands a set, the plugin draws the component's usage doc beside it: a 560px frame, 40px right of the set and
top-aligned with it (`apps/plugin/src/doc-panel.ts`). Its sections come from the engine's doc section model,
`docSections`, which the Markdown page already renders, so the panel and the page cannot disagree. The panel leaves out
Building it in code, which is site-only (Q406.2 A), and cuts the rest the way the wireframe draws it: two sentences per
Overview row, four Do and four Don't items, one sentence per accessibility row, Styles pointing at the set. Theming
shows the default member in light and dark side by side, each instance pinned to its mode, and is drawn only when the
file's color collection has those modes: the phase-1 trap (the surface must pass modes) is held by `present/<def>`.

**Reused, not added.** The panel is canvas furniture: drawn on the set's parent after the labels, never inside the
set, reported through the furniture's outcome, its run line and its missing-template warning (`withPanel`,
`templatesLine`). The template is one more `↳ File Components` asset beside `_Label`. The hand-edit check is the style
guide's `fingerprintOf`, exported rather than restated. The dry run's check sits beside `furnitureDue` and feeds the
same "N to draw" line, and the room for the panel comes from the update's existing set spacing (`pageSetMoves`), with
each set's box reaching past its panel. The component executor is untouched, so `EXECUTOR_REVISION` does not move.

**Its own tag, on purpose.** The panel is tagged `prism3`/`docPanel`, not `furniture`: the labels' clear removes
whatever carries their tag, and a panel a designer edited must never be removed. A redraw removes an earlier panel only
while its fingerprint matches what was written; an edited one is renamed "(edited)", tagged `kept`, moved below
everything in its column, and named in the run's result. A kept panel is never touched again except to move it down
when a fresh panel would cover it.

**Never on top of anything.** Labels sit above and left of a set and backdrops reach 12px past it, so the spot right
of the set is clear of them by construction; another set may not be. A panel that would overlap any node is not drawn,
and the run says to update. The update then moves the next set 400px past the panel. A new set is placed past every
panel already on the page, because `placeNewSet` reads every top-level node as content.

**`_Doc-block`.** Set up file builds it from the file's own Badge (the part markers), Tag (chips), List.Item (the Do
and Don't rows) and Divider, with every fill bound to a semantic color and every text on a brand text style, so the
panel follows the brand (`apps/plugin/src/doc-block.ts`). It needs those four sets and an applied theme, and says which
are missing until then. Its properties are Q406.10 A's: Type × Size, Top padding, Bottom padding, Caption, and a
Specimen instance swap. Mode is pinned on the placed instance, as the style guide pins a swatch's, so there is no Mode
axis. The Do and Don't rows are List.Item instances rather than one List, because a List holds its items in a native
slot, and a slot's items cannot be overridden one by one from an instance.

**Tests (`apps/plugin/test-doc-panel.ts`).** `present/<def>` on all 41 defs that build a set: one live panel per set,
its section frames exactly the model's sections less the site-only one. `anatomy/held back`: none of 64 held-back
notes is in any panel, and all 152 reader-ready captions are. `hand edit/…`: the edit is kept, aside, reported, and kept
once. `overlap/…`: Badge and Tag built by the real executor with their labels and panels, nothing overlapping, and a
blocked spot draws nothing. `due/…`, `room/…` and `template/…` cover the dry run, the spacing and the template.
`test-build-completed.ts` `panel/build` drives `main.ts` and finds the panel beside the set.

**Mutations, each failing by name (exit 1):** the modes not passed (`present/<def>`, Theming missing) · the site-only
section drawn (`present/<def>`) · the fingerprint check dropped (`hand edit/kept`) · the overlap check dropped
(`overlap/blocked`) · the raw part note as the caption (`anatomy/held back`) · the panel's reach dropped from the
spacing (`room/with template`) · the dry run ignoring the plan (`due/plan`) · the build not drawing the panel
(`panel/build`).

**Traps.** A file without `_Doc-block` now reads ⚠ on every build, as a missing `_Label` already does (Q284.3 A).
Editing the `_Doc-block` template changes every panel's fingerprint, so the next build keeps each one aside as edited:
the safe direction, the style guide's rule, but a designer restyling the template will see "(edited)" copies.
