/** The shadow color (#305; UI redesign S9.1 lifted the legacy `tintReadout` here, and S9.2 drew it in the Depth &
 *  motion preview's Elevation section, owner decision D7 A): the color every shadow is painted in, at full strength
 *  beside the same color as a shadow actually paints it, and one line saying why the two differ. Read-only.
 *
 *  WHY IT EXISTS. The shadow steps paint at 10–14% alpha, so even a fully saturated tint moves the composited shadow
 *  only about 3 ΔE00: visible, but nowhere near what the slider's travel implies. Without this the tint sliders looked
 *  broken (#305's report: "I cannot see the tint sliders changing the examples"). The base color changes a lot while the
 *  shadow changes a little, so it shows both.
 *
 *  A mode with its own tint re-derives its own color (`shadowByMode[mode].colorRgb`); every other mode paints the
 *  brand's. The page repaints from the store, so this is drawn fresh on every edit (the legacy page refreshed it by
 *  hand, because its sliders lived in a region that never re-rendered).
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="shadow-tint"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved shadow axis, the mode in view and the block's copy. Nothing here reads the session. */
import { hex } from '@prism3/engine/color';
import type { Theme } from '@prism3/engine/theme';
import { el, hook, subHead } from './kit';

export const shadowTintSection = (shadow: Theme['shadow'], mode: string,
  copy: { title: string; full: string; painted: string; note: string }): HTMLElement => {
  const wrap = hook(el('div', 'dm-block sh-tintblock'), 'depth-shadow-color');
  wrap.dataset.sgSection = 'shadow-tint';   // the shared-section marker (`kit.ts`'s header)
  const base = hex(shadow.shadowByMode?.[mode]?.colorRgb ?? shadow.colorRgb);
  // The color goes on an INNER fill so the chip's checkerboard stays behind it: a background on the chip itself
  // would clobber the checkerboard, and the 12% swatch would read as an opaque gray.
  const swatch = (caption: string, fill: string, which: string): HTMLElement => {
    const chip = el('div', 'sh-tintchip');
    const f = hook(el('div', 'sh-tintfill'), 'shadow-color-fill');
    f.dataset.paint = which;
    f.style.backgroundColor = fill;
    chip.append(f);
    const cell = el('div', 'sh-tintcell');
    cell.append(chip, el('div', 'sh-tintcap', caption));
    return cell;
  };
  const row = el('div', 'sh-tintout');
  row.append(swatch(copy.full, base, 'full'), swatch(copy.painted, `${base}1f`, 'painted'));   // 1f: 12%, mid-steps
  const note = el('p', 'sh-tintnote');
  note.append(el('b', undefined, `${base.toUpperCase()} `), document.createTextNode(copy.note));
  wrap.append(subHead(copy.title), row, note);
  return wrap;
};
