## (2026-10-08) — Hairline control shape reaches fields and the checkbox: 1px corners everywhere (#2361)

**What.** Under `controlShape: hairline`, text-field, select, textarea and checkbox-control now bind `radius.hairline` (1px), as buttons and icon buttons already did. The owner's decision (2026-10-08): fields, buttons and controls all get the 1px corner, for consistency first. The radio and switch stay round. Under Boxed, Rounded and Pill nothing changes. The lever's description and the studio tooltip say so, as DRAFT wording for the owner.

**The shape decision (plan on #2361).** Option A, one setting: Hairline governs all three families, so they can't drift apart. The cost is that the four options no longer reach the same set. Hairline reaches fields and checkboxes, the other three only buttons. Pill must stay buttons-only (a pill field is wrong). Whether Boxed should follow is held for the owner. Option B, a separate field-and-control setting, was set aside because it allows exactly the mismatch the owner asked to remove. It can still be added on top later.

**Why by def id, not by ref.** `applyControlShape` keyed the pill-able set on the rounded rung `radius.md`. Fields bind `radius.sm`, but so does Badge's `status.radius`, and a field setting must not move a badge. So `HAIRLINE_CORNER_REFS` names the four defs and the refs each repoints. A test pins Badge as the identity under Hairline.

**The checkbox clamp.** The corner is `min(radius.sm, snap2(edge ÷ 8))` per rung (#1015). Under Hairline the binding moves to `radius.hairline`. That is inside the clamp on any edge of 8px or more, and the smallest control rung is 12px, so the clamp formula needed no change. The `control.size.*.radius` tokens are still emitted unchanged for code. A test asserts the 8px floor over every density's control ladder, spelled out rather than calling `controlRadius`.

**No contract change.** `controlShape` never reaches the DTCG layer, which is a fact about the existing mechanism and not something new here. It is read only by the Figma build (`materializeForBrand`) and the studio. So no token name or value moves, and `CONTRACT_VERSION` and the baseline are untouched. The engine note is minor, because the projected component surface moves for a Hairline brand. The default (rounded) plans are byte-identical.

**Studio.** The style guide's radius sample hard-coded the field at `radius.sm`. It now reads the field's rung for the brand's Control shape from the generated used-by index, which regen updated. It also gains a checkbox (DRAFT) at the medium control box, drawn at `radius.hairline` under Hairline and at its own clamped corner otherwise.

**Trap for whoever re-verifies.** Fields declare no `size` axis, so a test that projects them at `'medium'` throws ("not a declared size"). Project at `undefined`.
