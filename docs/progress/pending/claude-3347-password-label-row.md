## (2026-11-02) — Password field's label row is the label's line again: the Show button's block padding zeroed on the instance (#3347)

**Engine {{ENGINE_VERSION}}.** Found by the owner's real-Figma check of #3014 (2026-11-02, build 89c83809). Q380 A
meant the label row to be one label line tall (18 / 21 / 24). It measured 26 on all 84 members, with the label at 21.

### Diagnosis
The host floors a hugging row at a STRETCHED child's own content height, not at the height it is set to. The Show
button is a small flush text Button: bound 36 tall, with `space.075` (6px) above and below its `label/sm` line (12 ×
1.15 = 13.8). So its floor is 6 + 13.8 + 6 = 25.8, which the host shows as 26. A taller label (27) passed it, which is
why the row followed the label there. Every offline model missed it: `test.ts`'s #2804 arm left a stretched child out
of the row's height, and the shim measured a stretched instance at its main's height.

### What changed
- **The fix, the smaller of the two the issue named.** A new `PartDef.nestPaddingBlock` binds a nested instance's top
  and bottom padding as an instance override. The toggle binds `toggle.pad-block` → `space.0`, so its floor is the
  13.8 "Show" line, under every label line. The row hugs the label again, still grows with a larger label style, and
  keeps the stretch #3014 measured as safe. "Show" stays centered on the row, as before. Button's own set is
  untouched. The other option, Q3014.2 A (drop the stretch and bind the nested Button's height to the label's line
  height), needs a line-height variable the emission doesn't carry, and it gives up growing with the label.
- **No executor change.** Both executors already bind a plan's `bound` on every node they make, an instance
  included. So `EXECUTOR_REVISION` and `executor-reach.json` don't move, and `lint-executor-revision` passes.
- **Shim:** `stretchFloorsHug` (opt-in, under `layoutModel`) models the measured rule. A child stretched across a
  hugging row takes the row's height, and the row counts it at its own content height: block padding (an instance's
  override, else its main's) plus flow content.
- **Test:** a `test:roundtrip` arm builds Password field on that shim, with every variable and line box from the
  default brand's emission, and asserts on all 84 members that `labelRow` is the literal 18 / 21 / 24, hugging, with
  the toggle as tall as the row. A self-check first clears the toggle's override and must read back the real file's
  26 (it reads 25.8), so the arm can fail. **Mutation:** removing `nestPaddingBlock` from the toggle fails the arm by
  name: `#3347 password-field label row … 84 off — status=default, size=medium, state=rest: the label row is 25.8,
  not 21`.

### Not done here
- A real-Figma re-check after merge, on a scratch file: the label row at 18 / 21 / 24, and the toggle's padding
  override held on the instance. Neither gate covers this: the shim's floor is modeled from one measurement.
