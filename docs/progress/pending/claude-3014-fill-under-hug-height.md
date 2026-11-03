## (2026-11-02) — `lint-fill-under-hug` gains its height twins, Accordion's and Password field's rows named measured-safe (#3014)

**Engine {{ENGINE_VERSION}}.** Owner decision Q3014.1 A: measure first, and if both rows keep their hug, close #3014
as not a defect and add the height twins with these two named measured-safe. The owner measured on 2026-11-02 (plugin
build 89c83809): every Accordion `titleRow` (48) and Password field `labelRow` (84) main reads `counterAxisSizingMode:
AUTO` after the build, and on instances both rows grow with their content (Accordion's medium title row 20 → 66 with a
four-line title; Password field's label row 26 → 27 with a `body/lg/default` label), the stretched indicator and toggle
following. The host does not freeze a hugging height the way Q537 found it freezes a width.

### What changed
- **Gate** `lint-fill-under-hug.ts`: two more arms, `stretch-under-hugging-row` (a stretch across a row whose height
  hugs) and `grow-under-hugging-column` (a grow down a column whose height hugs). They are not a host rule: a height
  fill is refused only when it is unmeasured. `MEASURED_SAFE` names the three shapes the measurement covered, by def
  and part path, typed in the gate: Accordion's `titleRow > leadingIndicator` and `> trailingIndicator`, and Password
  field's `labelRow > toggle`. An entry the walk no longer sees fails as stale. New floors: at least one row and one
  column hug their height.
- **Mutations**, each failing by name: `crossAxisFill` on the field's `labelCell` fails
  `stretch-under-hugging-row: password-field: container > labelRow > labelCell`; `grow` on the field's `message`
  fails `grow-under-hugging-column: text-field: container > message` (and its three siblings); the toggle's stretch
  removed fails `measured-safe: 'password-field: container > labelRow > toggle' … stale`.
- The gate's header, `CONTRIBUTING.md` §3, the PR template line and `prism3-build-component`'s gate note say the
  same.

### Not done here
- The measurement's one finding, the label row at 26 rather than the label's 21 (the stretched toggle's own minimum
  height still floors the row), is #3347, its own PR.
