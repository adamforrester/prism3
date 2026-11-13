## (2026-11-12) — Tag's × glyph is `closeGlyph` (#3647, Q192 A)

The amended glyph canon (#3554 Q-CC27 A) names a fixed glyph by its shape. Tag's × was `dismissGlyph`, a job
name, and the owner picked A: `closeGlyph`. The glyph never varies with `type`, which only shows or hides the
slot holding it, and the name matches Banner, Toast and Dialog's `close` control.

- `components/tag.ts` renames the part; the docs (`out/components/tag.md`), the specs, the analysis reports and
  the skill canon row's example follow. The `dismiss` slot keeps its name: it is the remove control, a job.
- `component-renames.ts` gains `{ def: 'tag', kind: 'part', from: 'dismissGlyph', to: 'closeGlyph', issue: 3647 }`,
  so an update renames the layer in place and a placed tag keeps its overrides on the ×.
- **Checked by hand**, because `lint-component-renames` does not check `part` renames (#2776). See the PR for the
  mutation that drops the entry and what catches it.
