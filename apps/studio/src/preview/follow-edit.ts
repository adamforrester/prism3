/**
 * THE Q4 TRIAL (the owner's QA notes, `decisions-2026-10-01-qa.md` Q4): when a Palettes lever is EDITED, the
 * preview scrolls so the palette that lever changes is in view. Tried on Color › Palettes alone; the owner
 * decides whether it applies everywhere. It is one commit on top of S2, so it can be dropped whole.
 *
 * ONLY AN EDIT MOVES IT. V1 still holds for everything else: focusing a lever, scrolling either pane and
 * changing the mode never move the preview, and the view itself (its home) never changes. A lever's edit
 * handler calls `noteEdit` with the palette it changes before it rebuilds; the preview, repainting from the
 * `brand` topic, takes that note and reveals the palette. Nothing else ever writes the note.
 */

let pending: string | null = null;

/** Note the palette an edit changes. The next preview repaint reveals it. */
export const noteEdit = (palette: string | null): void => { pending = palette; };

/** Take the note, once. */
export const takeEdit = (): string | null => { const p = pending; pending = null; return p; };

/** Scroll `body` so `palette`'s group is in view: its top a little under the body's top when it is not
 *  already wholly visible. Returns whether the palette was found. */
export const revealGroup = (body: HTMLElement, palette: string): boolean => {
  const el = [...body.querySelectorAll<HTMLElement>('[data-p3="palette"]')].find((n) => n.dataset.palette === palette);
  if (!el) return false;
  const b = body.getBoundingClientRect(), r = el.getBoundingClientRect();
  if (r.top >= b.top && r.bottom <= b.bottom) return true;
  body.scrollTop += r.top - b.top - parseFloat(getComputedStyle(body.firstElementChild as Element).paddingTop || '0');
  return true;
};
