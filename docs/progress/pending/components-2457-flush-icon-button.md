## (2026-10-14) — Flush icon button: a glyph-only action with no padding or fill, made to be nested (#2457, owner decision Q283.3 A)

**Status:** a new def, `flush-icon-button` (`FlushIconButton`, name DRAFT), plus gates. ENGINE minor (change note). CONTRACT unchanged: no new token. No executor change, so `EXECUTOR_REVISION` stays at main's 15. 181 committed artifacts (one new docs page), moved in `verify.ts` and `ci.yml` together.

**What it is (Q283.3 A, on #2427):** "its own small def, ghost only, no padding, color-only hover, code-side 44x44 hit area." The three IconButton sets are untouched.
- `size` [small, medium, large] × `state` [rest, hover, pressed, focus-visible, disabled] = 15 members. No `appearance` axis.
- The box is the glyph square: `size.{size}.side` → `icon.size.sm` / `sm` / `md` (20 / 20 / 24, Q283.13 A), and the swap slot binds the same key. No padding is bound, because none exists.
- The box declares no `paintSlots`, so it paints nothing at any state. The glyph walks IconButton.Neutral's ghost ink (`color.interactive.neutral.icon.{rest,hover,pressed}`; neutral reflects inward since #2324, so hover does move), and `color.disabled.icon` at disabled.
- Focus: the shared focus ring, `nest-fixed`, at `focus.ring.offset`, as on IconButton.
- Reactions: nothing authored. `reactions.ts` derives scope from member names, and the set has rest, hover and pressed (#2574, Q238 A). `test-reactions.ts` `map/scope` now lists 12 defs, the new one at 15 members, 6 sources, 9 reactions (3 sizes × rest → hover, rest → pressed, hover → pressed).
- Canvas furniture: on, like every set (`CANVAS_FURNITURE`, Q212 A); `test-canvas-furniture.ts` counts 30 sets, and the new set draws 5 column and 3 row labels.
- Page: `↳ Flush Icon Button` under Subcomponents (Q283.14 A), alphabetical between Field Message and Focus Ring.

**The hit area is a stated rule, not a measurement.** No emitted token is its target: the box is 20 or 24px by design. `lint-hit-target.ts` gains a third classification beside INTERACTIVE and EXCLUDED, `CODE_SIDE_TARGETS`. A listed def is measured *below* 44 at every size on comfortable (so a box grown to 44 makes the entry stale by name), and must state the 44×44 rule twice, as literals the gate holds: in `codeOnly` (the maintainer record) and in the shipped `docs.do`. The second is the one that matters to an implementer, since `codeOnly` never ships. The nest arm now also sees code-side targets, so the Counter nesting two of these will have to list them in `INNER_TARGETS`.

**Nesting (for the Counter):** `test-roundtrip.ts` builds a fixture host, never registered, that nests the button twice (`decrement`, `increment`), both `nest-exposed` with `expose: ['state']` and `follow: ['size']`, against the button's own set. It validates clean, and on the shim both instances in all 3 members are marked exposed, are instances of the right set, and read back with no `nestExpose` or `nestTarget` divergence. **So two nests exposing the same axis coexist on the shim.** A real host is not measured: Figma lists each exposed instance's properties under its own layer name, which the shim does not model.

**Gates (each mutation-proven by name):**
- `test.ts` `#2457 flush-icon-button`: 15 members (scope floor); no padding; box and glyph on the literal 20 / 20 / 24 rung; the box paints nothing at any state; the glyph walks the literal neutral ink.
- `lint-hit-target.ts` `CODE_SIDE_TARGETS`: below 44 at every size; the `codeOnly` rule; the shipped `docs.do` rule. A self-check drives `ruleGap` both ways.
- `test-roundtrip.ts` `#2457 two-nest`: the fixture above, plus the nested set offering the five owner-decided states as literals.
- `test-file-setup.ts` 3c: the page lands at its literal alphabetical place.
- Recorded counts that moved with the new def: the studio's `used-by.ts` index (`gen-used-by.ts --write`, 32 defs) and component catalog (`gen-component-catalog.ts --write`, which `test:chrome` reads for its count of sets) and the axis baseline `component-axes.json` (`lint-component-renames.ts --accept`, an addition with no rename).
- List entries: `lint-rung-names` (`MUST_COVER`, and `ICON_OFFSET_DEFS`, because the medium default is the `sm` rung per Q283.13 A), `lint-axis-values` (the canonical size set), `lint-paint-placement` (`EXPECT_ANATOMY`), and both baselines accepted.

**Mutations** (each on a committed tree, restored with `git reset --hard`):
- Hover adds a fill (an `overlay` paint slot and an `overlay.hover` key): `test.ts` fails `#2457 flush-icon-button's box paints nothing at any state` (all three hover members), and `#1608 the wash binders` names the new binder.
- Padding not zero (a `space.100` padding on the box): `test.ts` fails `#2457 flush-icon-button binds no padding at any member` (all 15).
- The hit-area sentence deleted from `docs.do`: `lint-hit-target.ts` fails `flush-icon-button: the shipped docs.do does not tell the implementer to extend the hit area`.
- The hit-area entry deleted from `codeOnly`: `lint-hit-target.ts` fails `flush-icon-button: no codeOnly entry states the code-side hit area`.
- The fixture's `state` unexposed (`nest-exposed` → `nest-fixed`): `test-roundtrip.ts` fails `#2457 two-nest: both flush icon buttons … marked exposed` (6 instances, `isExposedInstance=false`).
- `disabled` dropped from the button's projected state axis: `test-roundtrip.ts` fails `#2457 two-nest: the nested set offers the owner-decided states`.

**Owner items (DRAFT):**
1. Name and id: `FlushIconButton` / `flush-icon-button`. Alternatives: `IconButton.Flush` / `icon-button-flush`, which reads as a fourth IconButton family sibling (it has no appearance axis and a different box); `_flush-icon-button`, which hides it from a published library (a card close may place it directly).
2. Color family: neutral only, IconButton.Neutral's ghost glyph, as the stepper proposal drafted. No primary or destructive flush icon button.
3. Small's hit area: 44×44, as Q283.3 A states it, where the flush text button puts small at 24×24 (Q174 B). Small and medium are the same 20px box here.
4. Size order: small, medium, large (the #2509 rule), so Figma's inserted default is small and code's is medium. Q283.6 B put the stepper itself in the field exception; this def is not a field.

**A trap for whoever re-verifies the hover arm:** the paint the arm reads is the box's *own* paint, children excluded (`planPaintVars({ ...root, children: [] })`). Reading the whole member would see the glyph's ink at every state and could never pass; reading only the glyph would miss a wash on the box.
