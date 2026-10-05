## (2026-10-04) — The studio README names which pages go read-only in a derived mode (#2098 item 2)

**STATUS: branch `docs/2098-readme-derived-pages`, PR open.** Docs only: no code changes, no emitted artifact moves, ENGINE stays at {{ENGINE_VERSION}} and `CONTRACT_VERSION` is unchanged. Part of #2098 (see #1984).

**What changed.** `apps/studio/README.md`'s moved-pages bullet said only that a derived mode is hatched. It now names the six moved pages that keep their controls on screen, read-only, under an "auto-derived — read-only" state line in a derived mode: Surfaces & fills, Interactive, Type, Shape, Depth & motion and Layout. Brand and Palettes don't: nothing they set varies by mode, so they show no line and stay editable. Components is still a legacy page, so it goes read-only by the legacy rule (the editors give way to the "auto-derived" note), which the next bullet already states.

**How it was checked.** It was checked live, not from the code. A throwaway Playwright probe (not committed) opened prism3, aurora and harbor in HC light. For each page it read the state line, the `derived-note` and how many controls were enabled:
- the six pages showed the line, with almost every control disabled (Fills 1 of 154 enabled, Layout 1 of 33);
- Brand and Palettes showed no line, with their controls enabled;
- Components showed the `derived-note`, with only the mode tabs enabled.

Each of the six already has a derived-mode arm in `test-chrome.mjs`, which the README now points to.

**A deliberate difference from the issue.** #2098 lists Components with the six. It does go read-only, but as a legacy page, so the README says so rather than putting it under the moved pages' state line.
