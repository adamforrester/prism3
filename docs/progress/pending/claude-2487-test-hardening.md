## (2026-10-11) — Studio tests: names, pressed states, rings in menus and dialogs, hover contrast, and the late-read and finish-line gaps (#2487 PR 5)

PR 5 of the merged Studio redesign review on #2487 (comment 6098371348): test hardening. It closes B3, D4, D10, A16 and D12's `:1640` blind spot, and folds in #2504 and #2507. The mutations the review found surviving now fail by name: Lane D's M1, M2, M4 and M5, and Lane A's K2. Lane A's K4 stays the control. Only tests change, plus one stale line in #2496's fragment. No product code moves.

- **B3: names and pressed states (M2, M4, M5).** A new test-chrome section reads the browser's accessibility tree (CDP `getFullAXTree`). Every control role, and every tablist, radiogroup, menu and dialog under the frame, must have a non-empty computed name. It covers every place, on both hosts, at 1280 and at 380 (both panes), plus once with Inspect open. Brand content and the lent legacy views are skipped by hook; the token list's own gaps are #2492. At 380, after each pane switch, the tree must report exactly one pane toggle pressed, and it must be the pane the layout draws.
- **B3: rings with a menu or a dialog open (K2).** The brand, theme, Inspect and Figma menus are each opened by keyboard and walked by their own arrows until they come back to an item already read. The export dialog is walked by Tab the same way. Every ring is held to #2144's `ringMisses`. The ring reader is `focusRings`' own page function, hoisted unchanged into `FOCUS_RING_READ`, so the menu walk reads rings with exactly the same code.
- **A16: hover contrast.** Each kind in `HOVER_KINDS`, plus a tab and a menu item, is hovered, and every text it draws must hold `TEXT_MIN` against the ground it is drawn on. Both hosts and both chrome themes; 12 kinds were read each time.
- **D10.** The two `ok(true)` arms after unbounded waits in the Brand case are now bounded waits whose result is the assertion.
- **D12's `:1640`.** The "no local switch between legacy pages" check matched `[aria-label$=" pages"]`, so it went blind exactly when that label regressed (M4). It now counts every tab list outside the frame's own hooked ones: the tab row, `color-sub-row` and Inspect.
- **D4 (M1).** `test-brand-input.ts` seeds `overrides`, `modeLevers`, `modeAnchors` and `surfaces` for `custom-1`, with dark and light keeping entries of their own in two of them. It then removes the mode and asserts three things: each `custom-1` entry is gone, the other modes' entries stay, and the engine still builds.
- **#2504.** Four arms in the start suite's held-read section, each leaving exactly one brand-menu guard to do the work. Reopening the menu, or choosing a second file, during the read leaves only the read generation to drop it. Closing with Escape or an outside click goes through `closeMenu` and leaves only the open state.
- **#2507.** Two finish-line arms, described in the PR.

**Found, filed, not fixed: #2523.** The export dialog's preview (`pre.p3-export-pre`, a Tab stop since #2124) draws the browser's ring, 1px `#005fcc`. It sits in a scrolling container, so the fix has to choose an inside ring or make room for an outside one. The dialog arm keeps it as a pinned known gap (`PR5_RING_GAPS`): it must still be reached and still miss, so fixing it fails the pin and the entry comes out.

**The trap in the pressed arm.** At 380 the preview pane's own element (`preview-pane`) is `display: contents`. A "drawn" check on it reads zero rects whichever pane shows, so the arm reads the pane's body (`preview-body`) instead.

**Floors** (docs/34 shape 9), each set under what was measured when this landed:
- names: 10 named nodes in one sweep (the fewest measured was 12, web at 380);
- menus: 2 items;
- the export dialog: 3 controls (15 measured);
- hover: 10 kinds (12 measured).

**Also here:** `docs/progress/pending/claude-2487-a11y-basics.md` (#2496) said "Section 44 measures it". The merge with PR 1 renumbered that section to 45.
