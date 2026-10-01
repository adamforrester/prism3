/**
 * THE Q4 TRIAL (the owner's QA notes, `decisions-2026-10-01-qa.md` Q4): when a Palettes lever is EDITED, the
 * preview scrolls so the palette that lever changes is in view, on Color › Palettes.
 *
 * ONLY AN EDIT MOVES IT. V1 still holds for everything else: focusing a lever, scrolling either pane and
 * changing the mode never move the preview, and the view itself (its home) never changes. A lever's edit
 * handler calls `noteEdit` with the palette it changes before it rebuilds; the preview, repainting from the
 * `brand` topic, takes that note and reveals the palette. Nothing else ever writes the note.
 *
 * THE OWNER KEPT IT (2026-10-01), with one change: the reveal scrolls smoothly, and jumps under reduced
 * motion (`revealGroup`).
 */

let pending: string | null = null;

/** Note the palette an edit changes. The next preview repaint reveals it. */
export const noteEdit = (palette: string | null): void => { pending = palette; };

/** Take the note, once. */
export const takeEdit = (): string | null => { const p = pending; pending = null; return p; };

/** Whether the viewer asked for reduced motion. Read on each reveal, so a change to the setting applies at
 *  the next edit. */
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scroll `body` so `palette`'s group is in view: its top a little under the body's top when it is not
 *  already wholly visible. Returns whether the palette was found.
 *
 *  SMOOTH, UNLESS REDUCED MOTION (owner, 2026-10-01: the trial stays, and scrolls smoothly). The scroll
 *  glides to the palette, so the eye can follow where the edit landed. Under `prefers-reduced-motion:
 *  reduce` it jumps there at once, as the trial did. `instant`, not `auto`: `auto` would defer to the
 *  pane's CSS `scroll-behavior`, which would make the reduced-motion answer depend on a stylesheet. */
export const revealGroup = (body: HTMLElement, palette: string): boolean => {
  const el = [...body.querySelectorAll<HTMLElement>('[data-p3="palette"]')].find((n) => n.dataset.palette === palette);
  if (!el) return false;
  const b = body.getBoundingClientRect(), r = el.getBoundingClientRect();
  if (r.top >= b.top && r.bottom <= b.bottom) return true;
  const top = body.scrollTop + r.top - b.top - parseFloat(getComputedStyle(body.firstElementChild as Element).paddingTop || '0');
  body.scrollTo({ top, behavior: reducedMotion() ? 'instant' : 'smooth' });
  return true;
};
