/**
 * Shared by every component (#2909 Q2909.3 A, Q2909.4 A; v2's lever-home table and the round-4 wireframe's block): the
 * first section of the Components list. It holds Control shape, whose one home this is: it writes no token, only the
 * geometry of buttons, fields and checkboxes, so it left Theme › Shape, which now shows it as a read-only line. Density,
 * which writes tokens every consumer reads, keeps its home in Theme › Shape and shows here as its read-only line.
 *
 * WHICH MODE A CONTROL EDITS: Control shape is brand-wide (Q54), the same bytes from any editable mode. A derived mode is
 * read-only (Q59), held here as Button options holds itself (the frame does not hold the Components page, #2700), in the
 * frame's words; the line's link stays live (RX1 A). Every write goes through `state/shape-input.ts`, the write Shape
 * made, byte for byte.
 *
 * HOW IT REPAINTS: by store subscription only (`brand` and `mode`), keeping focus on the element that had it.
 */
import type { ControlShape } from '@prism3/engine/scale';
import { currentMode, rebuild, subscribe } from '../state/store';
import { isDerived } from '../state/verdict';
import { brandControlShape, setControlShape } from '../state/shape-input';
import { glyph, h, hook } from '../shell/dom';
import { choice, keepFocus, leverBlock, leverOf } from '../ui/lever-kit';
import { BUTTON_OPTIONS_COPY, densityLine } from './button-options';
import { SHAPE_COPY } from './shape';

/** Everything a pointer or keyboard can operate, held in a derived mode. */
const OPERABLE = 'button, input, select, [role="radio"], [role="slider"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';

export const mountSharedOptions = (hostEl: HTMLElement, cleanups: (() => void)[], modeName: (m: string) => string): void => {
  const root = hook(h('div', 'p3-bopts'), 'shared-options');
  hostEl.replaceChildren(root);
  const render = (): void => {
    const { key: focusKey, again } = keepFocus(root);
    const derived = isDerived(currentMode);
    const L = leverOf('controlShape');
    const b = leverBlock('controlShape', { group: true, desc: SHAPE_COPY.shapeTip });
    const opts = (L?.options ?? []).map((o) => ({ v: String(o.value) as ControlShape, l: o.label }));
    const c = choice(L?.label ?? 'Control shape', 'control-shape-choice', opts, (v) => {
      if (isDerived(currentMode)) return;   // a derived mode is read-only (Q59), enforced at the write (#2096)
      setControlShape(v);
      rebuild();
    });
    c.set(brandControlShape());
    b.ctl.append(c.el);
    const parts: HTMLElement[] = [];
    if (derived) {
      const note = hook(h('p', 'p3-sg-note p3-sg-warn'), 'shared-options-derived');
      note.append(glyph('warn'), h('span', 'p3-sg-warn-text', BUTTON_OPTIONS_COPY.derived(modeName(currentMode))));
      parts.push(note);
    }
    parts.push(densityLine('shared-density'), b.el);
    root.replaceChildren(...parts);
    if (derived) {
      for (const n of root.querySelectorAll<HTMLElement>(OPERABLE)) {
        if (n.closest('.p3-deplink, .p3-info')) continue;
        if (n instanceof HTMLButtonElement || n instanceof HTMLInputElement || n instanceof HTMLSelectElement) n.disabled = true;
        else { n.setAttribute('aria-disabled', 'true'); n.tabIndex = -1; }
      }
    }
    if (focusKey) again()?.focus({ preventScroll: true });
  };
  cleanups.push(subscribe('brand', render), subscribe('mode', render));
  render();
};
