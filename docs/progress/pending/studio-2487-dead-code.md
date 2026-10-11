## (2026-10-11) — Studio: the redesign's dead code goes, the typecheck reports an unused local, the copied page helpers and menu buttons are one each (#2487 PR 6)

**Status:** Studio (`apps/studio/src`, its tests and `styles.css`), plus two unused locals in the engine that the
studio typecheck reaches. No artifact moves (`regen --check` in sync), no ENGINE bump, CONTRACT unchanged. This closes
B4, B5, D8, D11 and A17 from the merged #2487 review (comment 6098371348, §4 PR 6), and D12's `infoTip` half.

### What changed

- **`noUnusedLocals` is on** in `apps/studio/tsconfig.json`, so `npm run -w @prism3/studio typecheck` fails on a dead
  local.
  - It reaches the engine modules the studio imports, and found two there: `SizingMode` in `anatomy-figma.ts` and
    `semanticInk` in `modes.ts`. Both went.
  - `PageHostIsUnforgeable` is kept through an explicit use, `export type { PageHostIsUnforgeable }`, so the
    compile-time proof still runs.
  - `test-removed-legacy.ts` pins the flag (turning it off fails by name).
- **Dead code removed:**
  - **`main.ts` (B4, D8):** `apply`, `applyFull`, `addClass`, `tokenPill`, `addButton`, `swatchCell`,
    `modeIsEditable`, `renderGeneratedNote`, and the mode-context section's `DERIVED_MODES` and `modeAllPass`. Also
    nine dead imports.
  - **Other modules (B4, D8):** `shell/theme.ts` `themePref`; `domains/shape.ts` `now`; `state/type-input.ts`
    `LETTER_SPACING_KEYS`; `state/fills-input.ts` `inputGradientCss`; `state/interactive-input.ts` `LINK_FAMILIES`.
  - **Interfaces and seams (A17):** `Frame.unmount`.
  - **The CSS custom-property write seam** in `write-adapter.ts` (`cssVarAdapter`, `makeWriteHost`, `WriteAdapter`,
    `cssVar`, `cssVarName`, `typeVar`, `TypeAtom`). Nothing in the UI read the variables, and its header now
    describes what's left (the commit seam and the inbound validator).
  - **`levers/controls.ts` `describeControl`** (#1675's chip/select descriptor), which no page read.

  The exported names are added to `test-removed-legacy.ts`'s list, since `noUnusedLocals` can't see an export.
- **Tests that tested only removed code:** `test-write-adapter.ts` keeps its inbound half (#1840), and its
  `cssVarAdapter` half went. `test-lever-controls.ts` keeps `paletteRefOptions` and `leverHook`, and its
  `describeControl` arms went.
- **One menu button (B5).** `shell/dom.ts` `menuButton` now carries the open, close and keys for the bar's Theme menu,
  the preview's Inspect menu and the plugin's Figma menu. The three copies had drifted. Now every menu:
  - opens on ArrowDown;
  - stops Escape from propagating (before, only Figma opened on ArrowDown, and Theme's Escape went on to whatever
    sat under it);
  - moves along its list with ArrowDown, ArrowUp, Home and End (Inspect's ArrowLeft and ArrowRight went with its
    copy).
- **Copied page helpers in one place** (`ui/lever-kit.ts`):
  - `keepFocus`, the focus-keeping redraw nine pages carried;
  - `pageEdit`, the edit body four pages carried word for word;
  - `markRefused`, from Surfaces & fills and Interactive;
  - `filterLevers`, the search filter Depth & motion and Shape carried word for word;
  - `leverBlock` now draws its ⓘ through `infoTip`, which it duplicated (D12).
- **The CSS (D11):** 50 rules of `styles.css` whose classes no source names anywhere (the old start screen, the
  derived-mode note, the mode-strip badge, the add button and others), plus the comments that only described them.
  `lint:live-css` holds the 325 live rules, untouched. A `--accept` afterwards wrote the baseline at 325 live and 49
  drawn by no page (95 before: the 46 keys removed here, none of them live). The other 49 are left: their classes
  are still named in the source, so a state no suite reaches may draw them.

### Not done here, and why

- **D12's host read** (a module reading `PRISM3_HOST` directly beside one handed `opts.host`). `PRISM3_HOST` is a
  build-time define that lets each bundle drop the other host's branch, so swapping it for a runtime option is not
  dead-code work.
- **`pickerFor`, `pickButton` and `sectionShell`.** The two `pickerFor`s close over each page's own picker state.
  The `pickButton` and `sectionShell` copies differ page to page. Folding either needs a state object rather than
  a move.
- **The remaining `search` filters** differ in their selectors per page.

### Tests and mutations

- `test-removed-legacy.ts` §2: the typecheck flag is on.
- `test-chrome.mjs` §47 (new; §46 is #2522's): on the web and the plugin, light, 1280, for Theme, Inspect and (plugin)
  Figma:
  - ArrowDown on the closed button opens the menu with focus inside it;
  - Escape closes it onto the button, and a `document` listener the test adds hears no Escape.

Mutations, each from a `wip:` commit, restored with `git checkout --`, each failing only its own arms, by name:
- **An unused local re-added** (`const unusedProbe = 1` in `shell/theme.ts`):
  `src/shell/theme.ts(44,7): error TS6133: 'unusedProbe' is declared but its value is never read.`
- **`menuButton`'s Escape `stopPropagation` removed:**
  `✗ §47 web light 1280 Theme: Escape closes the menu onto its button and goes no further (… "heard":1)`, and the same
  for Inspect (web, plugin) and Figma (plugin). 5 of 39196 fail.
- **The Theme menu back on its own copy** (`shell/frame.ts` at `main`): the two Theme arms on each host (ArrowDown
  `{"expanded":"false","menu":false,…}`, Escape `"heard":1`), and only those. 4 of 39196 fail.
- **`menuButton`'s ArrowDown open removed:** every `ArrowDown opens` arm, and the older Figma-menu arms that open it
  by ArrowDown.

### A trap for whoever re-verifies this

**The Escape arm first read the ArrowDown arm's failure.** With the menu never opened, Escape on the button
propagates anyway, so a missing ArrowDown failed both arms. The Escape arm now opens the menu by a click when ArrowDown
didn't, so each arm reads its own key.
