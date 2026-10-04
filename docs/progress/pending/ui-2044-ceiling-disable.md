## (2026-10-04) — Type: the largest display size can't trim a size you set individually (#2044)

**STATUS: branch `ui/2044-ceiling-disable`.** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. **Fixes #2044.**

### What changed

On Type › Scale limits, the "Largest display size" select now offers a ceiling below a display size set individually as a disabled option, with the reason the owner approved on 2026-10-04: "Smaller than display ‹size›, which you set individually." ‹size› is the largest display size set individually, because that's the one the brand must reach. A size counts as set wherever the engine reads one: `typography.sizes.display`, a desktop or mobile `typography.sizeOverrides.display` endpoint, or any mode's `modeLevers[mode].typeSizes.display`. A brand whose current ceiling is already refused keeps that option live, so it can move out (B8b's rule). Every option still offered writes what it wrote before.

### Diagnosis, and why no trial build

The engine trims display rungs by position before it computes any size (`DISPLAY_VARIANTS`, `i > ceilingIdx`), and then refuses any size set on a rung that was trimmed. So which ceilings it refuses is a pure function of which display rungs have a size set. `ceilingBlocked()` in `state/type-input.ts` applies that rule directly: no trial build per option, so the select costs nothing extra on a repaint. `selectField` gained an optional `off` reason per option (disabled, with the reason in its title, the same form as the scale chips' clash and B8b's 16px chip).

### Gates and their independence

- `test-type-input.ts`: the expected refused set comes from the pins and a ceiling order typed in the test, never from the module. The engine is a second witness: each refused ceiling throws in `brandTheme`, and each other one builds. Covers a desktop pin, a mobile pin, a Dark-only pin, two pins (the larger names the reason), and a pin on `sm` (nothing refused).
- `test-chrome.mjs`: with display md pinned on desktop, then on mobile, through the real value picker, `display.sm` is disabled with the exact approved text and md to 3xl stay live; releasing the pin returns the brand to its bytes.
- Mutations, each after a `wip:` commit, each failing by name: drop the disable (`#2044: with display md set on desktop …` and `… on mobile …`), the wrong reason text (the same two), and `ceilingBlocked` ignoring mobile pins (`ceilingBlocked, display md set on mobile …`).
- Equivalence: a throwaway driver imported `origin/main`'s `type-input.ts` beside this branch's and wrote every offered ceiling on all three example brands, with no pin and with display md pinned on desktop, on mobile and in Dark. **63/63 enabled ceilings wrote the same bytes; 9 disabled.**

### #388's smoke test: re-pointed, not weakened

S6.3 had pointed `test-smoke.mjs` §2d at exactly this refusal. It now stores a **hand-written brand input** (this context's brand with the 16px title floor, the Default scale, and title 2xs set at 16px, which the engine takes), reloads, and makes a real edit on Type: the 18px smallest title. The engine refuses `typography.sizes.title.2xs`, and every assertion stands as before: the bar is quiet, then shown, names the field (`typography.sizes.title.2xs`), survives navigating to Motion, and clears on undo. The context's own brand is then restored. A mutation of the field regex failed on all three brands with the real engine message in the bar.

**Trap for whoever is next.** This fix did *not* close the last path to an engine refusal on Type. Two remain, both the same class as #2044, and both are filed: the 18px title floor with title 2xs set (#2054, which the smoke test now uses) and turning off fluid headings with a mobile size set (#2055). When both are guarded, §2d needs a home that doesn't rely on an unguarded control, most likely a test-only hook.
