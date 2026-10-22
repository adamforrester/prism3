## (2026-10-20) — Plugin: every command that changes the file saves a version first, with a title that tells runs apart (#2828, Q442 A)

Update used to save "Before Prism3 updated <every set name>", so a broad Update filled the title and every one read the same in the history panel. Build, Style guide and Apply theme saved nothing.

### What changed
- `apps/plugin/src/version-title.ts` is the one builder and the only caller of `saveVersionHistoryAsync`. Titles: `Saved before Prism3 updated 47 sets` / `updated Dialog` (one set: its display name) / `added Pagination` / `added 6 sets` / `drew style guides` / `applied the theme`. The description is `Engine <ENGINE_VERSION>.` plus the set list (more than one set), `42 tables.`, or `Variables and styles.`. `versionTitle` in `update-apply.ts` is gone.
- Each command saves once, before its first write, and a host that refuses leaves the file untouched. Update: unchanged position. Build: `saveBeforeBuild` in `buildComponents`, after the dependency walk can be read and before anything is built; the count includes the missing sets the def nests. Style guide: `StyleGuideRun.beforeWrite`, called once after the plan is laid. Apply theme: `runApplyTheme`'s `beforeWrite`, inside the guarded write, so a pre-flight refusal saves none.

### Calls made inside the decision, for the owner to confirm
- A run whose only work is the page order reads `updated the page order`; sets plus a reorder add `Page order.` to the description.
- A one-set Build or Update shows no set list (the title names the set). A Build adds a set list whenever it adds more than one.
- Style guide saves only when the plan has at least one table; a run with no table to draw saves nothing.
- After merging main: an Update that also redraws the About frame (#2858) or the library cover (#2859) adds `About frame.` / `Cover.` to the description, not the title. An Update whose only work is either saves no version (Q498 B), so neither is ever a title of its own. `settle`'s re-spacing save (#2876) goes through the builder too.
- The Update verdict line still reads `Saved a version first: "<title>".`, which now repeats "Saved". Left as is; the line's wording is a separate copy call.

### How it is held
`test-version-title.ts` writes the titles out by hand per case, drives Apply theme and Build through the shims (one save, file empty at the save, refused leaves it empty, a pre-flight conflict saves none), and scans `src/` by AST: any use of `saveVersionHistoryAsync` outside `version-title.ts` fails `bypass/no second caller`, and each command's call into the builder is asserted by name. Update's order is asserted in `test-update-apply.ts` (`version/before first write`) and Style guide's in section 41 of `test-style-guide.ts`.
