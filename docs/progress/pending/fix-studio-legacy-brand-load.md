## (2026-11-19) — A file's older saved brand loads, its refusal reads as the strip's own words, and Add button set keeps the legacy accent (#4206, #4222, #4210)

Three findings from the #4104 audit, all about the brand a file already holds when the Studio opens it or edits it. Each has the owner's "as recommended" decision (2026-11-19). New strings are DRAFT and listed in the PR.

### What changed

- **#4206: a brand stored before #3707 or #3873 is migrated at load, with a note.** `apps/studio/src/state/legacy-input.ts` (`migrateStoredInput`) runs on every `restore-input`, in `main.ts`'s `handleHostMessage`, before `reduce` checks the blob. It makes three changes and no others: `typography.links: []` is dropped (the default list applies), a `modeAnchors` column the brand has no interactive column for is dropped (the engine ignored it before #3873), and an anchor step off its ramp moves to the nearest step. A current brand comes through as the same object. When anything changed, the error strip shows one line naming each change with a Close (`restore-migrated-close`), the way the late-restore offer (#3697 R9) does. The note goes on Close, on the next brand load, or when a Theme write lands, because by then the file holds the migrated brand.
- **#4222: a refused restore's strip says its own frame.** `RESTORE_BAR.unresolved` and `.rejected` no longer splice the engine's sentence into the line. The sentence sits under it in a closed `<details>` (`error-detail`, summary "Details"). A closed disclosure's content is not in the accessibility tree, so the `role="alert"` reads the frame only. `unreadable` keeps the host's reason on the line: those messages are the plugin's own and written for a designer (for example a brand saved by a newer Prism3). Every kind's frame now ends "off until a brand loads": the owner chose those words for `unresolved` too (2026-11-19), where it had said "until a brand resolves" since 2026-10-02. `test-build-verdict.mjs` pins it (`#2007 unresolved: …`).
- **#4210: Add button set folds `accentPalette` in first.** `addSetOptions` reads the columns the engine builds, so the legacy accent's palette counts as having a column, and a brand color named `accent` is listed disabled (#3608). `addAccent` moves `accentPalette` into `interactivePalettes` as `{ name: 'accent', palette }` before it pushes, so the Accent set and its `accent`-keyed anchors and overrides survive.

### How the migration finds the off-ramp steps

The ramp a step must sit on is the engine's generated ramp (an anchored ramp can carry an off-grid anchor step), so the module doesn't compute it. It asks `brandTheme`, reads the refusal (`… is not on the <palette> ramp; the nearest step is N.`), moves that one anchor to N, and asks again, up to 32 times. A refusal of any other kind ends the loop and leaves the brand as stored, so it is still refused in the engine's own words. `test-legacy-input.ts` pins the refusal's wording: a reworded engine message fails `#4206 off-ramp …` by name rather than leaving the brand refused.

### Tests

- `apps/studio/test-legacy-input.ts` (new suite, floor 21): each legacy shape planted on aurora, the engine's refusal as the premise, then `brandTheme` and `reduce` accepting the migrated brand, with literal expected steps.
- `test-chrome.mjs` section 29, plugin host: `#4222` reads the line and the closed Details; `#4206` posts a stored brand with `links: []`, reads the note, and closes it. On `main` both fail by name.
- `test-interactive-input.ts` section 15: `#4210`, the issue's repro.

### Traps

- `docs/public/guides/*` cite `main.ts` by line, so any line added above line 1386 moves seven citations. `lint-guide-claims.ts` names each one.
- The web's stored brand (`localStorage`) has the same legacy shapes and still boots on the refused-brand screen. That path is not a file restore and is filed as #4284.
