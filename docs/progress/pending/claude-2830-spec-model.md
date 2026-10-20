## (2026-10-20) — Component specs, phase 1: the engine spec model, its emission and its read-back gate (#2830)

**Status:** engine module + emission + gate. ENGINE minor (change note). CONTRACT unchanged: no token path moves.
No executor change, so `EXECUTOR_REVISION` stays. `regen --check` grows by one artifact (`out/components/specs.json`),
so `EXPECTED_ARTIFACTS` in `verify.ts` and the count in `ci.yml` move to 203 together.

### What changed

- **`packages/engine/component-specs.ts`** (new, exported as `@prism3/engine/component-specs`): `componentSpec(def)`
  builds one pure spec model from the def and its Figma anatomy plan — the four blocks of the approved wireframe
  (Q429 A): anatomy (every part by path, the members that hold it), redlines (padding, gap, height, width, min-width
  per size and slot case) plus a type block, colors (fill, stroke, ink, icon per part per state), and nesting
  (nested instances with their fixed variant, followed and exposed axes; swap slots with their property and
  visibility boolean; native slots; the set's component properties).
- **Token names only.** A value is the DTCG ref (`space.200`) when the plan binds a variable, and a px number labeled
  `literal` (a field's 120 floor, its 320 build width) or `derived` (Button's 88 / 104 / 128 floor, a "Locked to edges"
  reserve, Tag's ratio floor) when the build writes a number. A caller with a brand passes `px` to resolve tokens; the
  emission does not, so one file serves every brand.
- **Rows key themselves.** Redlines start at size × slot case, colors at every variant axis × state, type at size,
  and each key grows until every value is a function of it. Button's redlines key on `inset` too (flush drops the
  padding) and its type on `appearance` (the underlined text appearance); a row never claims one value for members
  that hold two.
- **Emission:** `out/components/specs.json` (one file, every projected def; payload, classified in
  `payload-manifest.json`) and a **Specs** section at the end of each projected def's `out/components/<id>.md`.
  No part notes or `codeOnly` prose ship (#1623); a code-only state is named, not explained.
- **`specMaterialize`** restates the plugin's `materializeForBrand(def, null)` in the engine (the engine must not
  import a surface), so the model describes what Apply builds for a file with no brand settings, Button's floor
  included.

### The gate: `apps/plugin/test-roundtrip.ts` SPEC READ-BACK

- The model descends from the plan, so it is checked against the HOST, not the plan (docs/34): every round-tripped
  def (66 rows, the lever and override variants included) is built into the shim and read back by a reader that
  shares no code with the model — its own Figma-key list, its own walk, its own member-name parse, names resolved
  through the host's catalogs.
- **Both directions, per member, by name.** DROPPED: every part, bound redline, unbound literal, text style, paint and
  instance the host holds must be in the one row covering that member. CLAIMED: every value a row states must be on
  every member it covers. Plus part counts per path, the set's component properties both ways, and every nest's host
  node type.
- **It found two model gaps on its first run**, both fixed before this entry: Button's pending spinner is an instance
  the build places by member (not a swap the designer drives), now a `fixed` nest listing its components; and a drawn
  glyph's color sits on the geometry inside it, which the reader now reaches.
- **Mutations of `component-specs.ts`, each failing `spec read-back: <def> — N disagreement(s)` by def:** dropping
  `paddingLeft` from the key map (Button ×3, Text field, …), dropping strokes (focus-ring, Button ×3, …), dropping the
  `label` parts from the anatomy, keying redlines on size alone (Button ×3 at 1,728 each, flush-icon-button, …), and
  dropping a nest's exposed axes (Text field, Textarea, Checkbox row, …). A hand-built "predicate speaks" block in the gate itself drops a part, a padding side and a stroke from
  Button's real model and asserts each fails by name. The two materializations are compared on all defs.
- **Where its coverage stops:** a wrong plan agrees with itself here (both sides descend from it); `test.ts` pins the
  wireframe's hand-read values (Button's slot-aware padding and floor, Text field's literals and nested label, the
  code-only states). An instance's own icon fill is inside another component, so the claim direction counts those as
  unreadable and prints the count.

### Next (phase 2, not built)

The Figma sheet on the component page beside the usage docs panel (#846), and Generate specs in a separate file
through library imports by key (no REST, any plan) — planned in the PR body.
