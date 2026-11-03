/**
 * WHERE THE WINDOW GOES ON MINIMIZE AND RESTORE (#3327, the owner's decision 2026-11-02).
 *
 *   · Restore (maximize): the window comes back centered over the visible canvas.
 *   · Minimize: the strip goes to the canvas's lower-right corner, `STRIP_MARGIN` px in from the right and the bottom.
 *
 * Placed on the toggle only: `main.ts` calls this at the moment of each toggle, so a pan or zoom since the last one is
 * read, and a window the user dragged stays where they put it until the next toggle.
 *
 * `figma.ui.reposition` takes canvas coordinates, and `figma.viewport.bounds` is the visible canvas in canvas
 * coordinates, while the window's size is in screen px. So every px length (the window's size, the margin) is divided
 * by `zoom` before it is placed against the bounds.
 *
 * THE MARGIN IS A GUESS, TO BE TUNED ONCE IN REAL FIGMA. A plugin cannot see where Figma's own bottom toolbar is, so "clear of
 * the toolbar" is a fixed right and bottom margin, not an anchor. 16px is chosen, not measured: Figma's toolbar sits
 * at the bottom center, so the strip clears it only where the canvas is wide enough for the two side by side, and on a
 * narrower canvas it overlaps. The headless tests hold the arithmetic, not the look: a real-Figma check is owed.
 *
 * Neither placement lets the window's top-left leave the visible canvas: a window larger than the canvas starts at the
 * canvas's top-left, so its top bar (and its Minimize) stays reachable.
 */
export const STRIP_MARGIN = 16;

export type ViewportRect = { x: number; y: number; width: number; height: number };
export type WindowSize = { width: number; height: number };

/** The canvas position of the window's top-left for one toggle. Pure. */
export const windowPlacement = (
  toggle: 'minimize' | 'restore',
  bounds: ViewportRect,
  zoom: number,
  size: WindowSize,
): { x: number; y: number } => {
  const w = size.width / zoom, h = size.height / zoom;
  const x = toggle === 'restore' ? bounds.x + (bounds.width - w) / 2 : bounds.x + bounds.width - w - STRIP_MARGIN / zoom;
  const y = toggle === 'restore' ? bounds.y + (bounds.height - h) / 2 : bounds.y + bounds.height - h - STRIP_MARGIN / zoom;
  return { x: Math.max(bounds.x, x), y: Math.max(bounds.y, y) };
};
