## (2026-11-02) — Plugin window: Minimize parks the strip at the lower right, Restore centers the window (#3327)

The owner's decision on #3327: Restore brings the window back centered over the visible canvas, and Minimize parks the
strip at the canvas's lower right with a margin. The window is placed on the toggle only, so a window the user drags
stays where they put it until the next toggle.

### What landed

- `apps/plugin/src/window-place.ts`: `windowPlacement(toggle, bounds, zoom, size)`, a pure function. It returns the
  canvas position of the window's top-left. Every px length (the window's size and the 16 px `STRIP_MARGIN`) is divided by
  `zoom` before it is placed against `figma.viewport.bounds`, because `figma.ui.reposition` takes canvas coordinates.
  The top-left is held inside the bounds, so a window larger than the canvas keeps its top bar on screen.
- `main.ts`'s `setMinimized` calls it right after each `figma.ui.resize`, with the viewport as it is at that moment.
  A host with no viewport or no `reposition` (a test shim) is left where it is.

### The margin

16 px is chosen, not measured. A plugin cannot see Figma's bottom toolbar, so "clear of the toolbar" is a fixed right
and bottom margin, not an anchor. The toolbar sits at the bottom center, so the strip clears it only on a canvas wide
enough for both side by side. A real-Figma check is owed on the owner's machine: the headless tests hold the
arithmetic, not the look.

### The tests

`test-agent-link.ts`:
- `strip-place/*` holds `windowPlacement` for both toggles at zoom 1 and zoom 2, plus the clamp, against
  hand-worked literals.
- `strip/place-min` and `strip/place-restore` drive the toggles through `main.ts` at zoom 2 and assert the `reposition`
  arguments.
- `strip/place-drag` asserts that a drag places nothing.

Mutation, from a `wip:` commit: drop the `/ zoom` on the window's size. `strip-place/min-z2`, `strip-place/restore-z2`,
`strip/place-min` and `strip/place-restore` fail, by name.

Two public guides cite `main.ts` by line, and the new lines moved four of those citations, so they move here too
(`lint-guide-claims.ts`).
