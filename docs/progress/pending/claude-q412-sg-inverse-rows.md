## (2026-10-18) — Style guides: inverse rows inside groups you made, and a confirmable cleanup of retired tables (#2816, Q412 A)

**What the first real run showed.** #2810 met a file whose designer had grouped the guides by hand. Its "Semantic colors" frame was one horizontal auto-layout row. The run adopted it, as Q4 A says, and appended the eight new inverse guides to the end of that row: about 15,000px wide, with nothing paired. The cause was one condition. `placeGuide` put a guide in the inverse row only when `home.ours`, so an adopted group took every guide "as its layout allows". The same run left the old single Inverse table in the designer's own Inverse frame, kept as a copy, and nothing in the plugin could clear it.

**The fix, in `apps/plugin/src/style-guide.ts`.**
- **The inverse row holds in any grid.** `placeGuide` drops `home.ours`, so a new inverse guide goes under its counterpart in an adopted grid too.
- **A one-time rearrangement.** After the tables are drawn and superseded ones judged, each hand-made frame is checked: one whose guides of a group with an inverse row sit in a non-grid container, with at least one default and one inverse among them. Its guides move into a new HUG grid inserted where its first guide was (`insertChild`, so an auto layout keeps its order), with the designer's own spacing. Defaults go in row 0, in the order they had. Each inverse guide goes in row 1 under its counterpart, or past the last column when it has none.
  - Because it only acts on a non-grid container, it runs once. A rerun finds a grid, so the designer's later moves stand.
  - A guide dragged out of the group is not in the container, so it is not pulled back.
  - The frame, its title, its other children and its place are untouched.
  - The group's change in height pushes down what sits below it, where the generator left it. The page's re-stack origin moves with it, or the full run's re-stack would pull Prism3's groups back up into it.
- **The cleanup offer.** A superseded table kept as edited, moved, a copy, or unrecorded now also goes into `StyleGuideResult.retired` as `{id, name}`, and the summary says it can be removed on the Style guides page once you confirm. The run's guards (no collection, nothing drawn) and a host refusal are not offered.
  - `removeRetiredTables(api, contract, ids)` re-reads the file and plans unfiltered, as Prune stale recomputes on confirm. It removes a listed table only while it still carries the key, is not drawn by that plan, its collection exists, and the plan draws something.
  - The page lists the tables behind "Review and remove…" and sends `style-guide-cleanup` only on "Remove N tables". The main thread runs it under the style guide's own run guard.

**Wording is drafted, an owner question on the PR:** the rearranged-group summary line, the offer line, and the page's three strings.

**Tests.**
- `test-style-guide.ts` §38: the measured state (defaults then inverses in one row, over 15,000px) becomes two aligned rows with the frame, title, place, layout and spacing kept. Also covered: a dragged-out guide stays loose; a rerun keeps a guide moved by hand and rearranges nothing; a new pair joins the adopted grid inverse-under-default; loose inverse guides adopted in the same run pair up too; the old Inverse table is offered and not removed by the run, removed only when named, and a still-drawn table is never removed even when named.
- `test-style-guides-page.mjs`: the offer is shown, the list opens and Cancel posts nothing, and Remove posts exactly the listed ids.
- The shim gains `insertChild`.

**Not verified offline.** Whether Figma's `insertChild` into a hand-made auto layout keeps a guide hugging inside the new grid cell. The owner tries it in the test file first.
