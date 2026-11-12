## (2026-11-12) — The agent link changes Theme color overrides: `set-override` (#3394)

Owner decisions Q3394.1–.7, all A, with the copy as drafted on the issue. #3391's label fix landed first (Q3394.6 A).

### What it is
One agent-link command, `set-override { changes, confirm }`, previewed first and then confirmed with the preview's
`previewHash`: the repo's preview-then-act spelling (`prune`, `update-components`, `panels-clean`). The plan lives in
`apps/plugin/src/set-override.ts`. It is pure: the stored brand and the changes in, the brand after them, each change's
before and after, the moved pairs, the new and existing misses, and every refusal out. `main.ts`'s `setOverride` reads
the stored brand, plans, and on a confirm hands the planned brand to `ACTIONS.applyTheme`. That is the table's own
entry, so the run guard, the saved version and the persist are the Theme write's. Its verdict is `override-result`, a
row of its own in Activity ("Color override", Q3394.7 A).

### Decisions made in the build, all technical
- **The contrast set** is Studio's counted set (every role with a minimum measured against something other than
  itself) plus each role's second pair (`alsoAgainst`) and the fill tier checks, read off `resolveAllModes` before and
  after. The aurora fixture counts 972 pairs. A pair below its minimum before is reported in `stillBelow`, never
  refused (Q3394.3 A).
- **A list with refusals is still resolved**, with the refused changes left out, so its contrast refusals come back in
  the same round as its shape refusals (Q3394.4 A: "every refusal line is returned").
- **The locked icons** are read off the engine's own carry rule (`withIconTwins`), never a copy of Studio's list: an
  icon the engine would carry its text's override to, and that holds none of its own, is locked.
- **`theme-unsaved`** compares the stored brand with the brand the panel last sent with a recount or checklist request
  (`due-request`, `file-sets-request`). Before any request it does not refuse: there is no panel brand to compare.
- **The busy guard** is `guardFor('set-override') → 'apply-theme'`, so a confirmed write is declined before it starts.
  The inner `applyTheme` is guarded too, so the guard is the dispatcher's courtesy (no "started" row for a declined
  write). `set-override/busy-declined` holds it by name.
- **The saved version keeps Theme's title**, "applied the theme". The proposal's relabeling needs new version copy,
  held for the owner on the PR.

### Gates
`apps/plugin/test-agent-link.ts`'s `set-override/*` arms. Every number is a literal typed from an independent WCAG
calculation of the palette hexes, never from `resolveAllModes`. Ten mutations, each committed first, each failing by
name: skip the contrast refusal → `refuses-below-minimum`; drop the clamp check → `refuses-clamped-link`; let an
unknown role through → `refuses-unknown-role`; call a copy of `applyTheme` → `writes-through-apply`; label the
before from the role's family (#3391's shape) → `before-names-real-palette`; skip the hash → `brand-moved`; skip the
guard → `theme-unsaved`; persist in a preview → `preview-writes-nothing`; drop the guard slot → `busy-declined`; log a
preview → `preview-not-logged`. The canary (`tools/figma-canary/`) sends one no-op preview, and its self-test's
`wrote/set-override` and `noop/set-override` fail by name when the judge's two new checks are dropped.

### Trap for whoever comes next
The test grafts `FileShim` onto the host model for the one write arm, so Apply Theme can run end to end inside
`test-agent-link.ts`. Restore the graft before any later section: the read arms expect the bare host.
