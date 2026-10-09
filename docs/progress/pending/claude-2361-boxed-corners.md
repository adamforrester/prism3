## (2026-10-08) — Boxed control shape reaches fields and the checkbox too: 0px corners (#2361)

**What.** Under `controlShape: boxed`, text-field, select, textarea and checkbox-control now bind `radius.none` (0px), as buttons and icon buttons already did. This is the owner's decision Q139 (item 3, recorded on #2381): Boxed reaches fields and the checkbox the same way Hairline does. Pill stays buttons-only, and the radio and switch stay round. It follows #2381 as its own PR, per the rule that a correction to a branch under review lands separately; it was branched from #2381's head and rebased onto `main` once #2381 merged.

**Mechanism.** No new path. #2381's map is renamed `HAIRLINE_CORNER_REFS` → `FIELD_CORNER_REFS`, since it no longer belongs to one shape, and `FIELD_CORNER_SHAPES = ['boxed', 'hairline']` names who reaches it. The rewrite target is still `CONTROL_SHAPE_RUNG[shape]`, so Boxed lands on the same `radius.none` its buttons already bind. Selection stays by def id, so Badge (`status.radius` → `radius.sm`) is the identity under Boxed too.

**The checkbox clamp at 0.** The per-rung corner is `min(radius.sm, snap2(edge ÷ 8))`, which is never negative, so a 0px binding is inside it on every rung with no floor needed. The `control.size.*.radius` tokens are emitted unchanged for code.

**Tests.** A Boxed arm beside #2381's in `test.ts`, one named assertion per family (button, each field, checkbox-control per size), plus radio and switch round, Badge the identity, and checkbox-control keeping its clamped corner under Pill. #2381's line asserting fields untouched under Boxed now covers Pill only. Expected var names are spelled out (`radius/none`, `control/size/<rung>/radius`), never read off the map.

**Wording, DRAFT for the owner.** The lever description and the studio tooltip now lead with the reach: *"Hairline gives buttons, fields and checkboxes a 1px corner, and Boxed gives them a sharp 0px corner."* The tooltip no longer opens with "The shape of buttons and icon buttons", per Q139 item 4.

**No contract change.** `controlShape` doesn't reach the DTCG layer, so no token name or value moves; `CONTRACT_VERSION` and the baseline are untouched. No `out/` token file moved, because no corpus brand uses Boxed.

**Trap for whoever re-verifies.** `regen.ts` does not rewrite `apps/studio/src/preview/used-by.ts`; run `npx tsx apps/studio/gen-used-by.ts --write` after changing what a shape reaches. The studio's `test-used-by.ts` fails while it is stale.
