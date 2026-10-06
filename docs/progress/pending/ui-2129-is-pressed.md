## (2026-10-05) — Studio: the orphaned `is-pressed` leaves STATES (#2129)

**STATUS: branch `ui/2129-is-pressed`.** UI only: no engine change, no emitted artifact moves, ENGINE stays at {{ENGINE_VERSION}}, `CONTRACT_VERSION` unchanged. No visible text changes. **Fixes #2129.**

**What changed.** `is-pressed` is removed from `STATES` in `apps/studio/src/main.ts`. Since #2127 removed the legacy Interactive CSS, no rule names it and no markup applies it, the same case as `arow-lead`, which #2127 removed. The comment at the top of `test-smoke.mjs` no longer lists `.is-pressed` among the state classes the suite reads, because it reads none.

**How "dead" was established**, the way #2116 did it:
- **Source and tests.** A word-bounded search, `(?<![\w-])is-pressed(?![\w-])`, over every tracked file finds three hits:
  - the `STATES` entry;
  - the smoke comment;
  - one line of past prose in `docs/00-progress.md`, left as history.

  `styles.css` has none.
- **Run-time names.** No source builds an `is-` class: no `'is-' +` and no `` `is-${…}` ``. The two loops over a `'pressed'` state, in `preview/sections/interactive.ts` and `domains/color-interactive.ts`, build a hook name and an element id, never a class.
- **Built bundles.** Before the change, `apps/studio/dist/main.js` and `apps/plugin/dist/ui.html` each carried one hit, and `apps/plugin/dist/main.js` carried none. Both hits are the `STATES` array literal itself. After rebuilding, all three carry none. So the bundle check sees the name when it is there.

**The mutation counterpart.** Nothing can fail by name for a deletion of dead code, because nothing reads it: that is what "dead" means. The control is the bundle count above, 1 before and 0 after, plus the full `verify` passing without the entry. `installStyles`' scope law still holds at boot.
