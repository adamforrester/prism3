## (2026-11-18) — A collapsed Accordion keeps its panel slot, hidden (#3058)

The owner decided on 2026-11-18 (A) that a collapsed accordion's slot stays hidden but intact. Checked on
main, it did not. The panel part was `presentWhen: { expansion: ['expanded'] }`, so every collapsed member had
no `content` node. Figma carries an instance's slot content across a variant switch by the slot's name, so the
content was lost on the way through collapsed, which matches the field report. `test.ts` pinned the old shape
("on no collapsed one (Q182)").

- **The fix** is a box-only part field, `hiddenWhenAbsent: true`. It keeps a variant-gated part in the tree at
  every member and builds it hidden (`visible: false`) where the gate fails. The plan already had that field
  for node-visibility booleans (#1331), and both executors already write it, so neither executor's code moved
  and `EXECUTOR_REVISION` stays. The layout reads the hidden part as absent (`shown`), as Figma's auto layout
  does, so the collapsed footprint is unchanged. A state gate stays a presence gate.
- **The validator** refuses the field on every kind but `box` (the `KIND_ONLY` table), and on a part with no
  variant gate in `presentWhen` to soften.
- **Tests:** the #2417 accordion arm now reads "a native slot on every member, shown while expanded and built
  hidden while collapsed". It failed before the fix (`collapsed/medium: ABSENT`) and passes after. #910's
  generic presence arms read a `hiddenWhenAbsent` part as shown or not shown.
- **Baselines:** `lint-component-surface --accept` (the accordion's plan digest moved, with the `minor` note
  declared) and `lint-paint --accept`. The census gains the 24 collapsed members' hidden placeholder ink, so
  96 paint assignments where there were 72. `lint-part-union`'s ADMITS table is the gate's own authored copy,
  not derived from the schema, and it gains `hiddenWhenAbsent: ['box']`.
- **Mutation:** dropping `hiddenWhenAbsent: true` from the accordion's panel fails the #3058 arm by name.
- **Not measured:** that Figma's own variant switch keeps a hidden slot's content. The shim builds and reads
  back the hidden slot, but the claim about Figma's override carry-over is host behavior. The owner can check
  it in a real file.
