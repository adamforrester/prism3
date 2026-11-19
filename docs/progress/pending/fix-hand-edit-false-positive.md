## (2026-11-18) — Update file: a nested set's change is not a hand edit, and an untouched usage panel is not "(edited)" (#4070)

The owner's Update file run on the template file, which nobody had edited, reported 60 hand edits on Card number field (and turned its updates off, #3948), 36 on List, and kept three usage panels aside as "(edited)". The diagnosis is on #4070. None of it came from the outer def's own change: building the four sets with the code of 2026-11-08 and 2026-11-13 and checking with today's plans reports no hand edit. Every false positive came from **a change that reached the member or panel only through a nested instance's main**.

### What changed
- **`Baseline.inst`** (`member-baseline.ts`). A new hash per instance beside `own`. `instSignature` is `ownSignature` with `props` cut to the values set on the instance: each property by its id (the `#…` suffix, which a rename keeps), no variant entry, and none at the main's current default. The defaults are read off the main's set (`componentPropertyDefinitions`), once per set per snapshot.
  - `baselineDiff` compares `inst` ahead of `own` where both records hold it.
  - `finishUpdated` keeps a kept edit's `inst` hash, as it keeps `own`'s.
  - `v` holds, and a record without `inst` is read as before.
- **Print form 4** (`doc-panel.ts`). A specimen is read through its own entry in `overrides`, not through `printView`, which still read the specimen root's fills, strokes, corners and effects. Those are the documented member's, so Control shape's corner change on Wallet and Sign-in buttons moved the print of panels nobody touched. Third-form prints are still compared in the third form (`printV3`).
- **Executor revision 65.** `write-components.ts` moved (the `inst` keep), and the executor-reach entry is empty: the gate drew 62 sets × 10 arms and none redrew.
- **The shim's `mainComponent.parent`** now carries the set's live `componentPropertyDefinitions`, non-enumerable, as Figma's node does.
- **The doc-panel test model.** A specimen's own root now follows its member (`liveSpecimen`), so `own draw/untouched` covers the member-root redraw.

### Tests and mutations
New arms:
- `test-update-apply.ts`: `#4070 nested/added`, `/renamed`, `/default`, `/real edit`, `/kept still reported`, and `/written before`, which pins the limit below.
- `test-doc-panel.ts`: `own draw/specimen fill (#4070)`, `own draw/v3 unchanged (#4070)`; `own draw/untouched` now also moves specimen roots.

On main, `nested/added`, `/renamed`, `/default` and `own draw/untouched` fail by name. Each mutation fails the arms it names:

| Mutation | Fails |
|---|---|
| `instSignature` returns `own` | `nested/added`, `/renamed`, `/default` |
| `baselineDiff`'s `inst` branch dropped | the same three |
| `finishUpdated`'s `inst` keep dropped | `nested/kept still reported`, plus `#3474 kept/still reported` and `/earlier record` |
| `specimenView` returns `printView` | `own draw/untouched` |
| a specimen read with none of its own overrides | `own draw/specimen fill` |
| `baselineDiff` reads `inst` where only the live record holds it | `nested/written before` |

### What this cannot fix
- **Every record and every usage-panel print written before this build.** `baselineDiff` reads `inst` only where both records hold it, and no record written before this build holds one. Such a record still takes the `own` branch, and `own` still carries the nested set's whole property list by full name, so the next change to a set it nests still reads as a hand edit on every member (`#4070 nested/written before`: a rename on List.Item reads on all 12 List members). Records are rewritten only by an update that writes the member or by Accept as built; a member that reads current is never re-recorded. A third-form panel print is still compared by `printV3`, which still reads the specimen root, so every usage panel drawn before this build is kept as "(edited)" again the first time its member's root is redrawn. This applies to the template file and to every other existing file, until each set and panel is rewritten.
- **Records from before #3474** (2026-11-06) hold no `own` either, so they compare a nested instance whole. Card number field's 84 members reproduce that way: strip `own` and move Field label's fill, and all 84 read edited at `label`.
- **A false edit already kept** keeps its old hash, by design (`finishUpdated` never launders a kept edit).
- **Recovering the template file** needs a choice: OWNER DECISION on #4088. The general recovery (re-recording a member that reads current, or a panel that reads unedited, in the new form) is filed as #4097.
- **Shape-17 limit.** Two host facts are modeled from Figma's typings, not measured: that `componentProperties` lists a property at its default when the instance does not set it, and that `overrides` lists a specimen's own fields under its id.
