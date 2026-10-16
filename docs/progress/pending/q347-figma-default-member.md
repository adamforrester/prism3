## (2026-10-15) — Figma's default member follows the code default, and a gate holds it on every axis (#2752, Q347 A)

**Status:** three defs reordered, a new `test.ts` gate, a shim proof in `apps/plugin/test-update-apply.ts`. ENGINE
minor (change note): the projected sets' member order, the component docs and `components.ai.json` move. CONTRACT
unchanged. No executor code moved, so `EXECUTOR_REVISION` stands.

**What moved:** Icon button's `appearance` (and through the factory, the destructive and neutral siblings) is
`ghost, filled, outline`; Veil's `intensity` is `medium, subtle, strong`; Image placeholder's `ratio` is `4:3`, then
the rest tallest to widest. The code enums keep their own order. `lint-axis-values.ts`'s three register entries follow,
each citing Q347.

**Which member Figma inserts.** The plugin API's own typings document `ComponentSetNode.defaultVariant` as "the
top-left-most variant, spatially", the one dragged in from the library. That matches the #2501 lane's scratch-file
measurement (layer order does not move it). **Correction to 2026-09-27 "Component alignment: field family + switch
(#1699)":** that entry says `defaultVariant` is the set's first child. It is the top-left member. The two agree in
every set the engine builds today, because `planSetLayout` puts the first plan in row 0, column 0; the gate asserts
that agreement too, so a layout change that split them would fail.

**The gate** (`test.ts`, `#2752 <def>`): for every def that builds a set, the member in row 0, column 0 is read axis by
axis and compared with what the def's PROPS say. EXPECTED is a prop's own `default`, or, where the code form is a prop
of another name, an authored BRIDGE (`status` → `validation`, `selection` → `checked`/`selected`, `expansion` →
`defaultExpanded`); a slot axis expects `false` (an empty optional slot); the state axis expects `rest`. Nothing on the
expected side reads `variants`, so a reorder cannot carry its own expectation with it (docs/34 shape 1). An axis
neither answers fails as UNBRIDGED. A mismatch passes only as an exact EXCEPTION (defs, axis, both values, a reason),
and an exception no def hits fails as stale. `icon` and `spinner` build single components, so they have no default
member; that is asserted both ways.

**What the gate found beyond the three, held as owner questions on #2752, not fixed:**
- The size ladder: 27 sized defs insert `small` while code defaults to `medium`, by Q213 (#2501). Only the fields
  and Dialog lead with medium. Recorded as an exception citing Q213.
- Button ×3: the `leading icon` and `trailing icon` axes lead with `true`, so the inserted Button shows both icons
  while the code slots are empty. Recorded as two exceptions.

**Update reorders in place.** The shim section `default member` builds each set in its old order, places two
instances, and runs the dry run and apply as `main.ts` does. Each reads as moves only (216, 20, 5), every member and
the set keep key and id, the placed instances stay on the page pointing at members still in the set, and afterwards
the top-left member is the decided default. The instance model is the limit: a shim instance holds its main component
by reference, so this proves no member was rebuilt, not Figma's own instance resolution.

**Pins that moved with the order:** `#1515`'s cohort literal (4:3 first), and the `#1318` sparse-grid fixture, whose
intensity order is now typed as the pre-#2752 one so "the set's first member" and "the code default" stay two
coordinates in its refusal tests.

**Mutations (each committed first, restored after), failing by name:**
- Each of the three axes back to its old order → `#2752 icon-button` (and `-destructive`, `-neutral`): "appearance:
  Figma inserts filled, code defaults to ghost"; `#2752 veil`: "intensity: Figma inserts subtle, code defaults to
  medium"; `#2752 image-placeholder`: "ratio: Figma inserts 2:3, code defaults to 4:3".
- Icon button's prop default moved to `filled`, the order left ghost first → the three `#2752 icon-button…` arms
  ("Figma inserts ghost, code defaults to filled"). The expected side reads the prop, not the order.
- `dialog` added to the size exception, which it does not need → **did not fire at first.** The stale check asked
  whether the axis was read on each named def, not whether the exception matched there, so a complying def passed. It
  now tracks hits per def, and the same mutation fails `#2752 exception size small≠medium … STALE on: dialog`.
- The apply's grid move skipped on an update (`write-components.ts`) → `default member/<def> inserted` and
  `default member/<def> current`, on all three.
