/** #305 — the tint sliders' honest feedback (UI redesign S9.1, lifted from `main.ts`'s `tintReadout`, unchanged in
 *  output). Read-only. The legacy Elevation page draws it under its tint sliders; the Depth & motion page (S9.2)
 *  will draw the same code.
 *
 *  The shadow ramp runs at 10–14% alpha, so even a fully saturated tint moves the COMPOSITED shadow
 *  only ~3 ΔE00 — visible, but nowhere near what the slider's travel implies. Without this read-out the
 *  control looked broken: the reported symptom was "I cannot see the tint sliders changing the
 *  examples", and the honest answer is that the base color changes a lot while the shadow changes a
 *  little. So show the base color at FULL opacity (where the hue is unmistakable) beside the shadow as
 *  actually painted, and say why they differ.
 *
 *  Refreshed IMPERATIVELY through the returned `refresh`, not by re-render. On the legacy page the shadow
 *  editor lives in the stable head (doc-26: controls are built once and survive `apply()`; only the volatile
 *  bands re-render), so a read-out that computed its color at construction time would freeze at the value
 *  it was born with. That is exactly the inert-control bug this issue is about — the first cut of this
 *  fix shipped frozen and a browser check caught it, so the slider handlers call the refresh.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="shadow-tint"`, `kit.ts`'s header). It is a
 *  block inside the Shadow section rather than a section of its own, so the marker is on the block.
 *  WHAT IT IS HANDED. A reader of the resolved shadow axis and the mode in view, called at every refresh.
 *  Nothing here reads the session. */
import { hex } from '@prism3/engine/color';
import type { Theme } from '@prism3/engine/theme';
import { el } from './kit';

export const shadowTintReadout = (read: () => { shadow: Theme['shadow']; mode: string }): { node: HTMLElement; refresh: () => void } => {
  const row = el('div', 'sh-tintout');

  // The color goes on an INNER fill so the chip's checkerboard stays behind it — setting
  // `style.background` on the chip itself would clobber the background-image shorthand and the 12%
  // swatch would read as an opaque gray instead of a translucent near-black.
  const swatch = (caption: string): { cell: HTMLElement; fill: HTMLElement } => {
    const chip = el('div', 'sh-tintchip');
    const fill = el('div', 'sh-tintfill');
    chip.append(fill);
    const cell = el('div', 'sh-tintcell');
    cell.append(chip, el('div', 'sh-tintcap', caption));
    return { cell, fill };
  };
  const solid = swatch('Tint color · 100%');
  // The same color at a mid-ramp alpha — what the eye actually gets on the ramp.
  const painted = swatch('In a shadow · 12%');
  row.append(solid.cell, painted.cell);

  const note = el('div', 'sh-tintnote');
  const hexLabel = el('b', undefined, '');
  const noteText = document.createTextNode('');
  note.append(hexLabel, noteText);

  const refresh = (): void => {
    const { shadow, mode } = read();
    // A mode with its own tint override re-derives its own base color; otherwise it inherits the global.
    const base = shadow.shadowByMode?.[mode]?.colorRgb ?? shadow.colorRgb;
    const baseHex = hex(base);
    const amount = shadow.shadowByMode?.[mode]?.tint.amount ?? shadow.tint.amount;
    solid.fill.style.backgroundColor = baseHex;
    painted.fill.style.backgroundColor = `${baseHex}1f`;   // 12% — mid-ramp
    hexLabel.textContent = baseHex.toUpperCase() + ' ';
    noteText.nodeValue = amount === 0
      ? '— pure black. Raise Tint amount to shift the shadow base off black.'
      : 'is the shadow base. Shadows paint it at 10–14% opacity, so the hue reads far subtler on the ramp than on the swatch above — that is the shadow doing its job, not the slider failing.';
  };
  refresh();

  const wrap = el('div', 'sh-tintblock');
  wrap.dataset.sgSection = 'shadow-tint';   // the shared-section marker (`kit.ts`'s header)
  wrap.append(row, note);
  return { node: wrap, refresh };
};
