## (2026-10-10) — Studio: a committed field writes once and keeps focus; page changes, host updates and the Activity sheet leave focus on a control (#2487 PR 1)

The first fix PR from the merged Studio redesign review (#2487, Lane A's A1, A2, A5, A6, A8, A11, A12). It comes first because
A1 lost data: Enter in a Layout breakpoint field committed twice, and the second commit deleted a different breakpoint.

**The diagnosis that made the fix small.** A1 and A2 have one root, in `ui/lever-kit.ts`'s `textField`. It committed on
`change` and again on an Enter `keydown`, but the browser already fires `change` on Enter. The first commit redrew the page
(`root.replaceChildren`), and the second came from the replaced field, whose closure still held the old breakpoint, so its
"unchanged" guard let it through: 1025 typed into 768 stored `[0,1025,1440,1920]` while the page drew `[0,1024,1025,…]`.
For Tab, `change` fires *before* focus moves, so the commit's redraw ran while focus was still on the old field, and the
browser's Tab target was then a detached node: focus went to BODY. Both are fixed by one helper, `onCommitted`: commit on
`change` only, one task later. The kit's `textField` uses it, and so do the four hand-built fields A2 traced (a brand
color's name, a gradient's name, center and stop position).

**Tried and discarded: a microtask.** The review proposed `queueMicrotask`. Measured in the built app, it fixes Enter but not
Tab: the microtask checkpoint runs right after the `change` listener, before the browser moves focus, so the redraw still
removes the Tab target. A `setTimeout` runs after focus has moved, and the page's own focus-keeping redraw then finds the
new focus by its hook. Mutation M3 (microtask instead of task) fails A2 by name, so the choice is held by a test.

**Also discarded: a "last committed value" guard.** With the Enter listener gone, `change` fires once per edit, and no arm
could be built that fails without the guard, so it was not added. **`colorField` is left as it was** (its Enter and
`change` pair): Palettes repaints the hex field in place, and its `cur` guard already drops the second commit. Both
mutations on it (Enter re-added, commit not deferred) passed every arm, so changing it would have been an untested edit.

**The rest:**
- **A5** (`shell/frame.ts`): a page change that no tab started (Layout's Continue, style guides' Close) now moves focus to
  the selected sub-tab or tab, the tab select when narrow, or the menu page, but only when focus was in the panes or the
  menu page and the render left it on BODY.
- **A6** (`domains/type.ts`, `domains/color-fills.ts`): an empty viewport, center or stop field puts its value back
  instead of writing 0px or 0%. A negative viewport is put back too, as Layout's breakpoints already were.
- **A8** (`shell/activity.ts`): at 380, a failure that opens the sheet over a focused control moves focus to the sheet's
  toggle; Escape closes the sheet and returns focus to the bar's Activity button. Escape is scoped to the narrow sheet.
- **A11** (`shell/figma.ts`): a host update that re-mints or disables the focused item moves focus to the first item that
  can run, or the button.
- **A12** (`shell/style-guides.ts`): the "Draw by table title" summary has a `data-key`, so a repaint refocuses it, and
  its open state is kept for the session, so a repaint doesn't close it while its field is empty.

**The check** is `test:chrome` §44: one case each on the web host (Layout, Type, Palettes, Surfaces & fills), the plugin
at 380 (the Activity sheet), and the plugin at 1280 (the Figma menu; then Build style guides). Writes are counted by a
`Storage.prototype.setItem` wrapper, and focus is read as `document.activeElement`'s hook. The arms fail on the unfixed
app, and each of the 14 mutations of a fix fails its arm by name; the list is in the PR.

**A trap for whoever re-verifies this.** A committed field's work now lands one task after `change`. A test that types,
blurs and reads state in the same tick reads the old state. §44 waits a task and two frames (`after`) before it reads.
The existing checks that type and blur already waited on the result, so none needed changing.
