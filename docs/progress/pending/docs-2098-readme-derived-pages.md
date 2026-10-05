## (2026-10-04) — The studio README names which pages go read-only in a derived mode (#2098 item 2)

**STATUS: branch `docs/2098-readme-derived-pages`, PR #2111 open.** Docs only: no code changes, no emitted artifact moves, ENGINE stays at {{ENGINE_VERSION}} and `CONTRACT_VERSION` is unchanged. Part of #2098 (see #1984).

**What changed.** `apps/studio/README.md`'s section on why a sweep must loop modes outside pages had said only that a derived mode is hatched. It also still described two kinds of page.

Since #2090 (S8.2) moved Components, every page is `status: 'new'`. The `'legacy'` kind is still in the type, but no page uses it. The section now says that, and drops its legacy-page bullet and the legacy halves of the symptom and the rule.

It names the seven pages that keep their controls on screen, read-only, under an "auto-derived — read-only" state line in a derived mode: Surfaces & fills, Interactive, Type, Shape, Depth & motion, Layout and Components. Brand and Palettes show no line and stay editable, since nothing they set varies by mode.

**How it was checked.**
- **Live, before #2090.** A throwaway Playwright probe (not committed) opened prism3, aurora and harbor in HC light. For each page it read the state line and how many controls were enabled. The six then-moved pages showed the line with almost every control disabled (Fills 1 of 154 enabled, Layout 1 of 33). Brand and Palettes showed no line, with their controls enabled.
- **Components, after the merge.** It was checked in code. `components.ts` draws `components-derived` in a derived mode, and `test-chrome.mjs` asserts that line.
- **The derived-state hooks.** Each of the seven has one in `src/domains/` (`isDerived`), and neither Brand nor Palettes does.
