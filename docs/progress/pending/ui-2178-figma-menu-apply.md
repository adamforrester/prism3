## (2026-10-06) — the Figma menu no longer lists Apply Theme; the bar's filled button is its one control (#2178)

**STATUS: branch `ui/2178-figma-menu-apply`.** UI only: no engine change, no emitted artifact moves, ENGINE bump class: **none owed**, `CONTRACT_VERSION` unchanged, no new string. **Closes #2178.** Owner decision, 2026-10-05 (after the demo): Apply Theme appeared twice, as the top bar's filled primary button and as the first item of the Figma menu. The menu's copy goes; the bar's button stays.

### What changed

Since S13.1 (#2124) the bar's Apply Theme had no state of its own: `bar.ts` read the Figma menu's list (`FigmaSource`) and looked up its `apply` item by id for the label's busy state, the off state, the tooltip and the function. So removing the item from the list alone would have left the bar's button inert (its `find` returning `undefined`, the click doing nothing, the button never off). The fix is a separate lend, not a filter:

- **`main.ts`** splits `applyAction` (one `FigmaAction`, the same fields as before: `applyBusy()`, `restoreFailure` and its `RESTORE_OFF_HINT`, `runApply`) out of `figmaActions`, which now lists Prune stale, Set up file, Build set… and Build style guides…. It lends `applyTheme` to the frame beside `figma`.
- **`shell/frame.ts`** takes `applyTheme: (() => FigmaAction) | null` and hands it to the bar in place of `figmaSource`.
- **`shell/bar.ts`** reads `placed.applyTheme()` directly. The `find((a) => a.id === 'apply')` lookups are gone, the code this change made dead.
- **`shell/figma.ts`** is unchanged in behavior; its header no longer says the menu carries a copy of Apply.

### Nothing else depended on the menu entry (checked)

- **Agent path:** an agent's apply is `agent-dispatch.ts`'s `apply-theme` command on the main thread (`ACTIONS.applyTheme`), which never touches the UI. Unchanged.
- **Keyboard path:** the menu's keyboard handling is generic over whatever items it holds. Arrow Down now opens it on Prune stale, the new first item. The bar's button is a native button. No shortcut ever named the menu's Apply.
- **`postMessage`:** the `apply-theme` message is still posted by `runApply`, now reached only from the bar's button, and handled on the main thread for the bar and the agent. No handler became dead, so there is no handler-deletion arm.
- **Test hooks:** `figma-option-apply` was used only by `test-chrome.mjs` §10 and `test-build-verdict.mjs`'s #1989 and #1994 arms. Both now drop it. The hook guard would have failed by name had a literal been left behind, since the hook no longer renders.
- `apps/plugin/README.md`'s "on the top bar, or in the Figma menu" now says "on the top bar".

### Tests

- `test:chrome` §10, plugin, both themes, at 1280, 640 and 380: the menu's items read Prune stale, Set up file, Build set…, Build style guides… (literal); a `hooks.absent` check, proven by the open menu with its items read, finds no item whose hook or label says Apply; the keyboard walk is redone over four items; the Apply write that the menu's item used to drive is now driven from the bar's button, with the same wire checks (posts `apply-theme` with example-brands.json's prism3, whole), the drawer's auto-open and the busy label. The closing "the bar's Apply and the menu's post the same message" check went with the menu's Apply.
- `test:verdict` #1989: with the menu open, its items read the same four labels, and a `hooks.absent` check finds no Apply. The bar's Apply still turns off after a refused restore and, in the control, posts the restored brand once. #1994's `allOff`/`allOn` read the bar's Apply and the menu's Prune.

**Mutation** (`wip:` commit first), the `apply` item put back at the head of `figmaActions`, both bundles rebuilt:

- `test:verdict` (316 assertions, 2 fail):
  - `✗ #2178 the Figma menu lists no Apply Theme — items [["figma-option-apply","Apply Theme"],["figma-option-prune","Prune stale"],…]`
  - `✗ #2178 the Figma menu's items read Prune stale, Set up file, Build set…, Build style guides… — read ["Apply Theme","Prune stale",…]`
- `test:chrome` (28634 assertions, 24 fail: these four in each of the plugin's six cases, light and dark at 1280, 640 and 380):
  - `✗ #2178 Figma menu figma light 1280: the menu lists no Apply Theme, the bar's button is its one control (items [["figma-option-apply","Apply Theme"],…])`
  - `✗ Figma menu figma light 1280: the items read Prune stale, Set up file, Build set…, Build style guides… — read Apply Theme, Prune stale, …`
  - `✗ Figma menu figma light 1280: Arrow Down on the button opens the menu on its first item ({"open":true,"focus":"figma-option-apply"})`
  - `✗ Figma menu figma light 1280: Arrow Down, End, Home and Arrow Up (wrapping) move along the items (…, figma-option-apply, …)`

Restored, both suites green again: `test:verdict` 316/316, `test:chrome` 28634/28634 (it was 28658 before the change: the menu's Apply checks that went, less the new ones).

### Traps for whoever re-verifies this

- The lend is `applyTheme`, not `apply`: `test-shell-imports.ts` refuses any identifier or key named after a legacy repaint tier (`apply` is one) anywhere under `src/shell`, and the first verify run of this branch failed `studio-test` on exactly that.

- The absence checks match `/apply/i` against each item's hook and label together, so an item put back under either name fails. Don't spell `data-p3="figma-option-apply"` anywhere in a suite to probe for it: the hook guard reads every literal hook from the suite's source and fails one that never renders, which, after this change, that one never does.
- Screenshots (before and after, the Figma menu open, light and dark, at 1280 and 380) were taken with `node apps/studio/test-chrome.mjs <dir>` (§10's `s14-plugin-<theme>-<w>-figma-menu.png`).
