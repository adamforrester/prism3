## (2026-11-17) — Apply Theme sees `core` variables outside every slice (#1109)

**What.** `upsertCollection` narrows `core` to the group its plan owns (`palette`, `dimension` or `font`), because three
executors write into one collection. `byName` was built after that narrowing, and `byName` is what the orphan reports
and the migration pass read, so two kinds of variable were invisible to all three:
- **An un-rooted pre-#1097 name** (`palette/accent/550`): `coreGroupOf` reads the segment after the root, so the name was
  in no group. Membership is now read on the name the materialization rules carry it to (`sliceGroupOf` in
  `write-figma.ts`, through `composeVariableRenames` with no contract rows). The #1097 rule takes `palette/x` to
  `<root>/core/palette/x`, so it joins the palette slice: migrated in place when the plan writes it, otherwise
  reported as a `core/palette` orphan. With the map refused, `openMigration` disarms the rules and the name falls to (2).
- **A group no slice owns** (`<root>/core/<other>/*`, or an un-rooted name no rule routes into a slice): no executor can
  see it, so `unownedCore` reads it once, from `runApplyTheme` after the three `core` writers ran, with every slice's
  planned names. It rides the guarded result as `uc`, and `main.ts` adds it to the orphan summary.

**Owner decision pending.** The new orphan entry's label, shown in the Apply Theme summary (`⚠ N orphaned variables not
in the plan (core/other: 2) …`). Options: `core/other` (built, recommended: it reads like the slice labels beside it,
`core/palette`); `core/unowned`; `core (no plan)`. DRAFT copy.

**Not in scope.** The agent paste path (`materialise-to-figma.ts`) narrows `core` the same way and reports only the
palette and colour orphans, so the same two kinds stay invisible there. It is filed as its own issue. #1108 (stranded
pre-#1097 `core-*` collections) is unchanged.

**Measured.** `apps/plugin/test-write.ts` gains five #1109 arms: an un-rooted planned palette name migrates (same
variable); an un-rooted unplanned one is a `core/palette` orphan; and through `runApplyTheme` on the file shim, a clean
file reports `uc: []`, while a hand-made `<root>/core/zzlegacy/1` and an un-rooted `zzmisc/1` are reported (but not the
un-rooted palette name its slice owns) and left in place. On main four fail. Mutating `sliceGroupOf` to skip the rules
fails three by name.
