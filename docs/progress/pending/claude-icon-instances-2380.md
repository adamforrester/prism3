## (2026-10-08) — Every icon-set glyph inside a component is an instance of its icon component (#2380)

**STATUS: branch `claude/icon-instances-2380`.** Owner decision Q137 A: a glyph drawn from the icon set is placed as a real instance of `icon/<name>`, with no swap property, so an icon change scales and a designer can still swap one by hand. ENGINE `minor` (change note); `CONTRACT_VERSION` unchanged, since no token name moves. `EXECUTOR_REVISION` 2 → 3.

### What moved

Twelve parts in seven defs now project as a `NESTED_INSTANCE` of `icon/<glyph>` instead of an inline SVG import:
- field-message: `iconError`, `iconWarning`, `iconSuccess`;
- checkbox-control: `mark`, `dash`;
- switch-control: `onGlyph`, `offGlyph`;
- tag: `check`, `dismissGlyph`;
- select: `chevron`;
- textarea: `grip`;
- image-placeholder: `marker`.

Each instance keeps the binding its glyph frame had (or `glyphPx`), with ink as `descendantFills` and no `propertyRef`. Two glyphs stay inline:
- the spinner, which is component-owned (`COMPONENT_GLYPHS`, #1670);
- `icon`'s own glyph, which is the component being instanced.

The diagnosis that made this small: both executors already built a `NESTED_INSTANCE` of a plain component, and `prebuildDependencies` already mapped `icon/<name>` to the `icon` def. So the build path needed only the projection change and two executor additions: `glyphPx` on an instance, and the inset.

### The checkbox inset (#1346), and the approach discarded

The 0.8 inset was a padded glyph artboard. An instance can't carry one. Binding a smaller size needs a `control.size.*.mark` token, which is a CONTRACT bump. Sizing the instance at 0.8 × the resolved box at paste would freeze it, so a brand or mode change would leave it behind.

What shipped: the `mark`/`dash` part is a FRAME bound to the box, holding one instance named `glyph` at `glyphInset: 0.8`. The executor places it after the flow pass, centered, with SCALE/SCALE constraints, so a resized box scales it. The padded-artboard path is deleted. Whether Figma applies SCALE constraints when a variable binding resizes the frame is a real-host fact. It is recorded in checkbox-control's `notes.unverified` for the scratch-file check.

### In-place update

- **A part whose node changes type** (field-message's glyphs): the glyph FRAME can't become an INSTANCE, so it is replaced and its child ID changes. Overrides on the old inline glyph do not carry over. The dry run names it per part through the read-back's `nestTarget` predicate (`FRAME — not an instance` → `an instance of icon/…`).
- **Checkbox's `mark`/`dash`**: the frame still fits, so its ID is kept and only its VECTOR is swapped for the instance.
- **Absent dependencies**: the dry run now refuses a set whose nested components are not in the file. It names them (`Not in this file: icon/check, … Build icon first`) and nothing is written. The check covers every `nestTarget`, not only icons. `update-apply.ts` is untouched; Lane A's #2379 work is in that file.

### Gates and tests

- `lint-glyph-geometry` gains the instance arm. The expected target is `icon/` (typed in the gate) plus the glyph `FIXED_GLYPH` records, and `SCALED_GLYPH` now pins `glyphInset`.
- `lint-nesting` gains glyph edges to `icon`, a resolves arm against the icon def's `name` members, and a floor.
- The read-back classifies `glyphInset` against the live parent box. The update snapshot now carries `parent.height` for it.
- Tests:
  - one row per part in `test-write-components.ts`, with the expected icon and binding typed;
  - a paste-vs-plugin inset check in `test.ts`;
  - the inline → instance transition and the absent-icon refusal in `test-update-apply.ts`.
- Mutations, each failing by name: projection reverted to inline (all 12 rows and the gate), the plugin inset dropped (2 rows and the round-trip), the paste inset dropped (2 `test.ts` arms), and the absent-icon blocker dropped.
- The lint-paint census for checkbox-control moved (the ink is one node down, on `mark/glyph`) and was accepted. The studio component catalog was regenerated (new `icon` nest edges).

### A trap for whoever re-verifies this

The plugin shim gives every variable-bound frame one placeholder size, so it does not show the inset at the real per-size box. A render that mixes shim px with a brand's real values puts the small and large checks off-center. Read the placement as a fraction of the parent, as the executor computes it.

### Merged with the update path's draw check (#2379, #2396) — Lane A, 2026-10-09

`EXECUTOR_REVISION` 5 → 6 (#2396 took 3, #2377 4, #2363 5). Since this PR, a set member's icon-set glyph is an instance of an icon component, so its geometry lives in the icon component and its ink in an override on the instance's vector. #2396's draw check (`drawn.ts`), which tells a member that draws wrong from one that matches its record, had to follow it there:
- **An icon component is a glyph.** A `COMPONENT` whose children are all vectors is checked like a frame glyph: its vectors must sit inside it. Before, only a `FRAME` was, so an icon's own geometry, which every instance of it draws, was never read.
- **A glyph's vectors' paints are read.** The glyph branch returned after the geometry check, so a vector's ink, inside a frame glyph or an icon component, was never compared with its variable. This was a hole before this PR too, which nothing had exercised.
- **An instance's vectors are read for paints only.** The icon instance's ink is the executor's `descendantFills` override, and an update rewrites it. The rest of an instance is its main's, and isn't read.
- **The shim:** a rewritten variable re-resolves instance vectors as well, as Apply Theme does on the host. A combine does the same, through the shared walk.
- **Tests (`test-update-apply.ts`):**
  - `single/glyph damage`: an icon's vectors left past its frame, under a current record, read "to update" and are re-laid.
  - `instance/ink`: a member's icon-instance ink override storing black reads "to update" and is repaired.
  - `verify/drawn glyphs` and `drawn/glyphs` now read the spinner and icon components, since the sets no longer hold vector glyphs. The spinner's sizes are glyphs at other than their import size.
  - `damage/dry run` plants a second paint, not a glyph.
- **Mutations, each failing by name:**

  | Mutation | Fails |
  |---|---|
  | FRAME glyphs only | `single/glyph damage` |
  | the early return after a glyph | `single/damage`, `single/damage repaired` |
  | instances skipped whole | `instance/ink` |
  | verify's draw check dropped | `verify/drawn paints`, `verify/drawn glyphs` |
  | the fresh import not scaled to its frame | `drawn/glyphs` (`spinner/x-small/ring 23.0×12.0 in 8×8`) |
- **The component-surface baseline** re-accepted for the 13 defs whose projection this PR moves (member counts unchanged).
