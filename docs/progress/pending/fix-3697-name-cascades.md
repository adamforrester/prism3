## (2026-11-12) — Studio: every name cascade reads one table, and rename and remove are atomic (#3697 H3, M1)

**Status:** studio only. No engine, emission or token-name change, so no change note and no `CONTRACT_VERSION` move. The
executor is untouched, so `EXECUTOR_REVISION` stays.

### What changed

- **One table (H3).** `apps/studio/src/state/name-refs.ts` lists every `BrandInput` field that names a palette, an
  interactive column or a mode, each with its rename, its removal fallback and its confirm line. `cascadeRename`,
  `cascadeRemove`, `removalEffects`, `removeAccent`, `modeDrops`, `setModeOff`, `removeCustomMode` and
  `renameCustomMode` all read it, so a field is cascaded everywhere or nowhere.
- **The three latent siblings #3697 found are on it.** `removeAccent` now drops the column's anchors, role overrides
  and outline hover fill (it spliced the column and nothing else: #3549 on the other door).
  `outlineHoverFill.<mode>.sets.<column>` follows a column rename or removal, and `outlineHoverFill.<mode>` follows a
  custom mode's rename or removal and Dark off. Its `palette.step` picks follow a color rename, and on the color's
  removal they go back to the default rule. `surfaces.<mode>.inverse*` as `{ palette, step }` follows a color rename,
  and on removal goes back to Auto, which the confirm now says.
- **Found while building the table.** `accentPalette` (the legacy single column) and `glassRoles.<name>.palette` were on
  no list either. Both now follow a rename. A removed color's legacy column goes. A column with its own `name` drawn from
  a removed color now drops its keys too: only an unnamed column's keys were dropped before.
- **Atomic (M1).** Rename and remove of a color, removing a column, and renaming or removing a custom mode go through
  `commitAtomic`: the change is made on a copy, asked of the engine the way the store's rebuild asks it
  (`brandTheme`, then `resolvePreview`), and replaces the brand only if it resolves. A refused change leaves the brand,
  `lastGoodInput` and storage together, byte for byte. A brand the engine already refused before the edit is not the
  edit's refusal, so the edit is taken.

### Behavior the owner should see

- **A held reference now refuses the removal.** An override that names the color (#3391) stays held, and so does a glass
  drawn from it. Before, the removal went through and the brand would not build. Now the removal is refused and the
  Brand colors lever is marked refused. The confirm line changed to match: "… — the color can't be removed until it's
  re-picked." (was "… — the brand won't build until it's re-picked."). This is copy, and it's the owner's to change.
- A refused custom-mode removal marks the Custom modes lever refused, as Dark off already did.

### The gate

`apps/studio/test-name-refs.ts` (in `npm test`) reads the `BrandInput` and `SurfaceMode` field lists from
`packages/engine/theme.ts`'s text, and every field is classified by hand: either a seed that names `acc` (a color and
its column), `promo` (a custom mode) or `dark`, or the reason it names nothing. An unclassified field fails by name.
Each seed then runs every mutator: color rename and removal, column removal, custom-mode rename and removal, and Dark
off. After each, the test asserts the edit was taken (or refused byte for byte where it's held), that the engine
resolves the brand, and that a scan of the brand finds no segment still naming the old name. The scan doesn't know
which field held the name. The table is never read. Mutation: dropping the
`outlineHoverFill.<mode>.sets.<column>` row (committed as `wip:` on the branch, then reverted) fails 10 assertions by
name, starting with `outlineHoverFill: renaming acc to acx is taken`.

### After the first review (#3710)

- **`glassRoles.<name>.role` names a column, and is on the table now.** A glass role may take its color from a role
  path (`interactive.<column>.fill.rest`). It follows a column's rename. On a removal of the color or its button set it
  is held, as a glass drawn from a palette is: the removal is refused, and the confirm names the glass. Before, the
  rename was refused silently and the confirm promised a removal the commit then refused. The palette removal confirm
  now also reads the column rows of every column that goes with the color.
- **A refused button-set removal says so.** The set's card shows the same refused mark the other levers do. Before, a
  refused removal changed nothing visible.
- **The gate.** Seeds now carry a hand-typed count of the confirm lines a removal adds against the unseeded fixture's,
  so a missing or merged line (an inverse surface, an outline hover fill, the legacy accent column) fails by name. The
  classification also walks the named nested types the naming fields hold (`GlassRoleInput`, `OutlineHoverPick`,
  `GradientInput`, `GradientStopInput`, beside `SurfaceMode`). `test-chrome.mjs` section 19 drives the refused mark.
- **New confirm line, the owner's copy:** "The <name> glass is drawn from its button set — the color can't be removed
  until the glass is re-picked."
