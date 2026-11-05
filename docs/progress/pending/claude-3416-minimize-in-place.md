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

**This comes from the API reference and the typings, not from the host.** Three things the strip leans on have not
been observed in real Figma, and the test shim builds each one in, so no headless arm can fail on them:
- (a) `getPosition()` reflects a drag by the user, not only the last `reposition`;
- (b) `getPosition().canvasSpace` and `reposition(x, y)` address the same point of the window (both the iframe's
  top-left, or both the title bar's);
- (c) `windowSpace` is stable within a session.

So the first Minimize of a reachable window doesn't depend on any of them: shrinking in place is `resize` alone, with no
`reposition` (review of #3420, S2). Had it repositioned to `canvasSpace`, a host where (b) is false would move every
first Minimize by the offset between the two, the jump #3416 rules out. The return to a remembered spot depends on all
three. They are the owner's real-Figma checks.

### What landed

- `apps/plugin/src/window-place.ts`: `stripPlacement(bounds, zoom, here, spot)` and `restorePlacement(bounds, zoom,
  size)`, both pure. `windowPlacement` and `STRIP_MARGIN` are gone. The spot is kept in window space, because "where the
  user dragged it" is a place on the screen, and a canvas position moves with every pan and zoom. It is turned back
  into canvas units through the window's own position, read in both spaces: `here.canvas + (spot - here.window) / zoom`.
- `main.ts`: Minimize reads the position before the resize. In place, it only resizes; otherwise it repositions the
  strip. Restore keeps the strip's window-space
  spot in `clientStorage` under `prism3:strip-at:<file id>`, then centers. The spot is read once at start, so
  Minimize answers at once.

### The file id: a deviation from the issue's example

The issue suggests keying by `figma.root.id`, but the document node's id is `0:0` in every file, so it can't tell
files apart. `figma.fileKey` is for private plugins only. So the file's id is a random one, kept in the root's plugin
data under `prism3:file-id` and made the first time a strip spot is kept in that file. That is a small write to the
file, like the ones `doc-settings.ts` and `as-built-ledger.ts` already make. The PR flags it for the owner.

### Gaps

- A strip closed while minimized (the plugin quit without Restore) isn't kept: the spot is read at Restore only.
- The headless tests hold the arithmetic, not the look. A real-Figma check is still owed, on the owner's machine:
  (a)–(c) above, and that the first Minimize keeps the window exactly where it was.

### The tests

`test-agent-link.ts`:
- `strip-place/*`: the first Minimize keeps the top-left, no clamp by the edge, the remembered spot at zoom 1 and 2,
  each fallback, and Restore centered. All against hand-worked literals.
- `strip-place/spot-edge`: a remembered spot by the canvas's edge isn't pulled inward.
- `strip/place-min`, `strip/kept-spot`, `strip/place-return`: the same rules through `main.ts`, with a `getPosition`
  shim. `strip/place-min` also checks that the first Minimize repositions nothing.
- `strip-relaunch/read`, `strip-relaunch/return`: `main.ts` launched a second time, into a host that already holds the
  file's id and its spot. The first Minimize lands on the stored spot. This is the cross-launch half of "remembered per
  file".

Mutations, from a `wip:` commit, each failing by name:
- the lower-right corner back → `strip-place/first`, `strip/place-min`;
- the inward clamp back → `strip-place/no-clamp`;
- drop the `/ zoom` → `strip-place/spot-z2`, `strip/place-return`;
- the spot never checked for reach → `strip-place/spot-off`;
- the canvas top-left fallback dropped → `strip-place/both-off`;
- the spot not kept at Restore → `strip/kept-spot`, `strip/place-return`;
- in place repositioned to `canvasSpace` again → `strip/place-min`, `strip/place-drag`, `strip/place-restore`;
- the start-up read of the stored spot dropped → `strip-relaunch/return`;
- a clamp on the remembered spot only → `strip-place/spot-edge`, `strip/place-return`, `strip-relaunch/return`.

Five public guides cite the plugin's `main.ts` by line, and the new lines moved them, so they move here too. Each was
re-pointed by content, against main's cited block, so the range-only ones `lint-guide-claims.ts` can't check are right
as well.
