/**
 * WHERE THE WINDOW GOES ON MINIMIZE AND RESTORE (#3327; the strip's rules are the owner's decision on #3416, 2026-11-04).
 *
 *   · Restore (maximize): the window comes back centered over the visible canvas (#3327, unchanged).
 *   · Minimize, the first time in a file: the window shrinks in place. Its top-left stays where it is: `resize` alone,
 *     no `reposition`.
 *   · Minimize after that: the strip goes back to where it was when it was last restored, which is where the user
 *     last dragged it. `main.ts` keeps that spot per file.
 *   · No inward clamp on Minimize. The one fallback: a remembered spot whose top-left is outside the visible canvas
 *     (another screen, another zoom) is dropped for shrinking in place, and if the window's own top-left is outside
 *     too, the strip starts at the visible canvas's top-left. A window that is reachable is never moved.
 *
 * Placed on the toggle only: `main.ts` calls this at the moment of each toggle, so a pan or zoom since the last one is
 * read, and a window the user dragged stays where they put it until the next toggle.
 *
 * HOW THE PLUGIN KNOWS WHERE THE WINDOW IS. The Plugin API has `figma.ui.getPosition()`, which returns the UI's
 * top-left as `{ windowSpace, canvasSpace }` and throws when no UI is open
 * (https://developers.figma.com/docs/plugins/api/figma-ui/, `@figma/plugin-typings` `UIAPI.getPosition`). So the
 * iframe reports nothing: `main.ts` reads the position at the moment of each toggle.
 *
 * READ FROM THE API REFERENCE, NOT OBSERVED ON THE HOST (review of #3420, S2). Three things this file leans on are the
 * owner's real-Figma checks, and no headless test can fail on them (the test shim builds each one in):
 *   (a) `getPosition()` reflects a drag by the user, not only the last `reposition`;
 *   (b) `getPosition().canvasSpace` and `reposition(x, y)` address the same point of the window;
 *   (c) `windowSpace` is stable within a session (the same screen point reads the same between toggles).
 * The first Minimize of a reachable window depends on none of them (it shrinks in place, `resize` alone). The return to a remembered spot
 * depends on all three. Restore centers from `figma.viewport` alone; the spot it keeps is what (a) and (c) are about.
 *
 * WHY THE SPOT IS KEPT IN WINDOW SPACE. "Where the user dragged it" is a place on the screen, and a canvas position
 * moves on the screen with every pan and zoom. So the strip's `windowSpace` position is kept, and turned back into the
 * canvas position `figma.ui.reposition` takes through the window's own position read now, in both spaces: a window px
 * is `1 / zoom` canvas units, so `canvas = here.canvas + (spot - here.window) / zoom`. Any fixed origin of window
 * space cancels in the subtraction.
 *
 * `figma.ui.reposition` takes canvas coordinates, and `figma.viewport.bounds` is the visible canvas in canvas
 * coordinates, while the window's size is in screen px. So every px length is divided by `zoom` before it is placed
 * against the bounds.
 */
export type ViewportRect = { x: number; y: number; width: number; height: number };
export type WindowSize = { width: number; height: number };
export type Point = { x: number; y: number };
/** The window's top-left as `figma.ui.getPosition()` reads it: `window` in screen px, `canvas` in canvas units. */
export type WindowAt = { window: Point; canvas: Point };

/** Restore: the canvas position of the window's top-left, centered over the visible canvas. A window larger than the
 *  canvas starts at the canvas's top-left, so its top bar stays reachable. Pure. */
export const restorePlacement = (bounds: ViewportRect, zoom: number, size: WindowSize): Point => {
  const w = size.width / zoom, h = size.height / zoom;
  return { x: Math.max(bounds.x, bounds.x + (bounds.width - w) / 2), y: Math.max(bounds.y, bounds.y + (bounds.height - h) / 2) };
};

/** Whether a canvas point lies on the visible canvas, edges included. */
export const onCanvas = (p: Point, bounds: ViewportRect): boolean =>
  p.x >= bounds.x && p.x <= bounds.x + bounds.width && p.y >= bounds.y && p.y <= bounds.y + bounds.height;

/** Minimize: the canvas position of the strip's top-left, or null to leave the window where it is. `here` is the
 *  window's top-left now, before it shrinks; `spot` is the strip's remembered window-space top-left in this file, or
 *  null the first time. Pure.
 *
 *  IN PLACE IS NULL, NOT `here.canvas` (review of #3420, S2). `resize` alone keeps the window's top-left, so shrinking
 *  in place needs no `reposition`. Handing `here.canvas` back to `reposition` would assume `getPosition().canvasSpace`
 *  and `reposition(x, y)` address the same point of the window; if they differ (say, by the title bar), every first
 *  Minimize would move the window by that offset, the jump #3416 rules out. Null keeps the first Minimize off that
 *  assumption. */
export const stripPlacement = (bounds: ViewportRect, zoom: number, here: WindowAt, spot: Point | null): Point | null => {
  if (spot) {
    const back = { x: here.canvas.x + (spot.x - here.window.x) / zoom, y: here.canvas.y + (spot.y - here.window.y) / zoom };
    if (onCanvas(back, bounds)) return back;
  }
  if (onCanvas(here.canvas, bounds)) return null;
  return { x: bounds.x, y: bounds.y };
};
