## (2026-11-04) — Plugin window: Minimize shrinks in place, and the strip returns where it was dragged (#3416)

The owner tried #3342's placement in real Figma. The strip landed slightly off-screen and over Figma's bottom toolbar,
and the inward clamp made the window jump on each toggle. The owner's decision on #3416: the first Minimize in a file
shrinks the window in place, and later ones put the strip back where the user last dragged it, kept per file. There is
no inward clamp. The one fallback is for a remembered spot whose top-left is off the visible canvas: the strip shrinks
in place instead, and if that top-left is off the canvas too, it starts at the canvas's top-left. Restore still
centers.

### What the API gives

`figma.ui.getPosition()` returns the UI's top-left as `{ windowSpace, canvasSpace }`, and throws when no UI is open
(Plugin API reference, `figma.ui`; `@figma/plugin-typings` `UIAPI.getPosition`). So the iframe reports nothing:
`main.ts` reads the position at each toggle. The strip's spot is read at Restore, which is where the user last left it.

### What landed

- `apps/plugin/src/window-place.ts`: `stripPlacement(bounds, zoom, here, spot)` and `restorePlacement(bounds, zoom,
  size)`, both pure. `windowPlacement` and `STRIP_MARGIN` are gone. The spot is kept in window space, because "where the
  user dragged it" is a place on the screen, and a canvas position moves with every pan and zoom. It is turned back
  into canvas units through the window's own position, read in both spaces: `here.canvas + (spot - here.window) / zoom`.
- `main.ts`: Minimize reads the position before the resize and places the strip. Restore keeps the strip's window-space
  spot in `clientStorage` under `prism3:strip-at:<file id>`, then centers. The spot is read once at start, so
  Minimize answers at once.

### The file id: a deviation from the issue's example

The issue suggests keying by `figma.root.id`, but the document node's id is `0:0` in every file, so it can't tell
files apart. `figma.fileKey` is for private plugins only. So the file's id is a random one, kept in the root's plugin
data under `prism3:file-id` and made the first time a strip spot is kept in that file. That is a small write to the
file, like the ones `doc-settings.ts` and `as-built-ledger.ts` already make. The PR flags it for the owner.

### Gaps

- A strip closed while minimized (the plugin quit without Restore) isn't kept: the spot is read at Restore only.
- The headless tests hold the arithmetic, not the look. A real-Figma check is still owed, on the owner's machine.

### The tests

`test-agent-link.ts`:
- `strip-place/*`: the first Minimize keeps the top-left, no clamp by the edge, the remembered spot at zoom 1 and 2,
  each fallback, and Restore centered. All against hand-worked literals.
- `strip/place-min`, `strip/kept-spot`, `strip/place-return`: the same rules through `main.ts`, with a `getPosition`
  shim.

Mutations, from a `wip:` commit, each failing by name:
- the lower-right corner back → `strip-place/first`, `strip/place-min`;
- the inward clamp back → `strip-place/no-clamp`;
- drop the `/ zoom` → `strip-place/spot-z2`, `strip/place-return`;
- the spot never checked for reach → `strip-place/spot-off`;
- the canvas top-left fallback dropped → `strip-place/both-off`;
- the spot not kept at Restore → `strip/kept-spot`, `strip/place-return`.

Two public guides cite `main.ts` by line, and the new lines moved four of those citations, so they move here too
(`lint-guide-claims.ts`).
