## (2026-10-09) — Checkbox-group and radio-group carry up to eight rows, seven behind Figma-only toggles (#2344)

**Status:** engine (the schema and two defs) and the plugin round-trip. ENGINE minor (change note): the projected
component surface moves for both groups. CONTRACT unchanged. Owner decision **Q156 A**, recorded on #2344:
- 8 nested rows: row 1 always shown, rows 2–8 behind booleans, 3 shown by default;
- panel names "Option 2" … "Option 8";
- an engine change allowing Figma-only booleans, so there are no `showOptionN` code props.

### What changed

- **The groups.** Each nests `row1` to `row8`. Rows 2–8 are `optional` and each sits behind a node-visibility
  boolean (#1331's mechanism, the same one select's `showMessage` uses on a nested instance). Rows 2 and 3 are on by
  default, so a group reads as the three rows it always did.
  - **Member count is unchanged:** booleans don't multiply the set, so each group stays at 3 members (`size`).
  - **Rows still fill the group:** each row keeps `follow: ['size']` and `crossAxisFill`.
  - **Labels stay reachable:** each row is still a `nest-fixed` instance, so its label and selection are edited
    in place on the nested row, without detaching.
- **The Figma-only boolean** (`figmaProperties.booleans.<key>.figmaOnly: true`). Until now every boolean drove a
  declared prop. A group's row count is `children` in code, so a Figma-only entry names no prop, and two refusals
  come with it:
  - its key must not be a declared prop (it would then be both);
  - it must carry a `figmaName`, since there is no code name for the panel to fall back to.
- **The `[HELD]` row count is resolved** in both defs' `codeOnly` and maintainer notes. The old claim that a
  boolean-toggled nest would be the corpus's first is gone (select's `showMessage` already was one).

### Tests and mutations

- **`test.ts`, a new #2344 block.** For each group, every member must nest exactly `label, row1 … row8`, with:
  - row 1 unwired and shown;
  - row N on "Option N", hidden from row 4;
  - exactly seven BOOLEAN set properties, Option 2 and 3 on;
  - no code prop for a toggle.

  Plus the two new refusals by name, and the old "not a declared prop" refusal, which still fires without
  `figmaOnly`.
- **`test-roundtrip.ts`, host truth in the layout-model shim.** The built set's seven toggles and their defaults
  are read back, along with each member's eight rows and their wiring and built visibility. Then every toggle is
  turned on: all eight rows must span the group less its inline padding, and the group must grow taller.

Each mutation ran from a `wip:` commit and was restored with `git checkout --`:

| Arm | Fails by name |
|---|---|
| checkbox-group's `option5` boolean dropped | `❌ #2344 checkbox-group: every member nests eight rows … (children label,row1,row2,row3,row4,row6,row7,row8 …)`, `❌ #2344 checkbox-group: the set declares exactly the seven row toggles …`, and both round-trip arms (`✗ … (rows row5 missing)`) |
| the Figma-only bypass removed from `checkMap` | `❌ component: Checkbox.Group def is structurally valid — figmaProperties.booleans: 'option2' is not a declared prop …`, and Radio.Group's |
| the declared-prop refusal disabled | `❌ #2344 a figmaOnly boolean whose key is a declared prop is refused BY NAME …` |
| the figmaName refusal disabled | `❌ #2344 a figmaOnly boolean with no figmaName is refused BY NAME …` |

### A trap for whoever re-verifies this

**An `optional` part with no boolean is not built at all.** The first mutation shows it: dropping `option5` leaves
`row5` out of the tree, rather than built and stuck visible. So a missing toggle reads as a missing row, and the
row count, not the visibility check, is where it shows up.
