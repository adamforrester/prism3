## (2026-10-04) — test:chrome refuses a stale plugin bundle, and the studio README describes the two kinds of page (#2037, #2011)

**STATUS: branch `test/chrome-ui-freshness-2037`.** Test infrastructure and docs only. No engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. **Fixes #2037 and #2011.**

### #2037: the figma host can no longer test an old UI

`test:chrome` serves `apps/plugin/dist/ui.html` as its figma host, and the plugin build inlines `apps/studio/src` into that file. So after a studio-only rebuild, the figma arm measured the previous UI and reported on it as if it were the current one. That hit two hand-run mutation batteries (S4e's info-text mutation, S6.3's one-home mutation). `npm run verify` was never affected, because it builds both bundles first.

The suite now checks at startup that `dist/ui.html` is at least as new as every file under a literal list of source roots: `apps/studio/src`, `apps/studio/chrome`, `apps/plugin/src` and `packages/engine`. If any is newer, it exits before launching a browser and names the newest file plus the rebuild command.

**A check, not a build-first, because that is how `verify.ts` orders builds.** There, `build-web` and `build-plugin` are their own gates, and every browser suite declares `after` on them and never builds itself. A build inside `test:chrome` would build the plugin twice per verify, and a build failure would be reported under the `chrome` gate's name.

**The roots are literal, not esbuild's input set.** The plugin build writes no metafile, so this suite can't read the exact inputs. The list errs wide. It includes `packages/engine` because the studio bundles the engine, so an engine-only edit leaves the figma arm just as stale. A root wider than the bundle only costs a rebuild that wasn't needed (for example, an edit to `apps/plugin/src/main.ts`, which is the main thread's file, not the iframe's). A root that is missing or holds no files fails by name, rather than letting the walk compare nothing and pass (docs/34 shape 9).

Mutations, each failing by name with `✗ ui.html freshness: …`:
- `touch apps/studio/src/entry.ts`, then a studio-only rebuild: names `apps/studio/src/entry.ts`.
- A nested file (`apps/studio/src/shell/activity.ts`): names it.
- `touch packages/engine/color.ts`: names it.
- A root renamed to one that doesn't exist: `source root apps/studio/no-such-dir is missing or holds no files`. The first draft let `readdirSync` throw a raw `ENOENT` stack here, which fails but not by name, so the walk now catches it and reports it.
- Rebuilding the plugin clears the check: 13353/13353 chrome assertions pass.

**Trap for whoever is next.** The check compares mtimes. A `git checkout` or rebase that rewrites a source file stamps it with the current time, so `test:chrome` refuses until the plugin is rebuilt. That is correct (the bundle really is older than the checked-out source), but it will show up after every branch switch.

**Same gap, other host, not covered here.** The web host serves `apps/studio/dist/main.js`, and nothing checks that file's freshness either. The issue named only `ui.html`, and the bite it recorded was the figma arm's. Filed as #2067.

### #2011: "Driving it headlessly" no longer lists pages

`apps/studio/README.md` still said Palettes, Typography and Layout show no mode bar. That stopped being true one slice at a time as the redesign moved pages into the two panes. The section now describes the two kinds of page, and points to `src/shell/pages.ts` (`status: 'new' | 'legacy'`) as the place that says which kind a page is, so it doesn't go stale as pages move:
- **Moved pages** carry the mode control in every preview header. In a derived mode their controls stay on screen, read-only, under a state line.
- **Legacy pages** keep the #268 mode strip, shown only where a mode-varying control exists. In a derived mode they drop their editors for the read-only note.

The ordering trap and its rule are kept, and restated for both kinds of page. Layout is described with no special case, so the text holds before and after #2060 moves it.
