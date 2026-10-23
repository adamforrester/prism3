/**
 * Field options (#2905 phase 1, owner decisions Q538 and Q548 on wireframe v2). The way to Shape › Control shape, then
 * Field style as chips (Q3 B: no way to Density here).
 *
 * WHERE THEY ARE DRAWN: once, in the Components page's Fields section, after its sets, behind the section's disclosure
 * line (`domains/components.ts`). Field style is one brand-wide lever, so the one block changes every field in the
 * section. This is Field style's only control (owner decision Q578 B): its home in the page data is Components › Field
 * (`shell/pages.ts`), and Shape no longer draws it. It writes through `state/shape-input.ts`.
 *
 * THE CONTROL SHAPE LINE reads the brand's Control shape, which sets field corners too. Under Underline it says the field
 * has no corners instead, since an underline field draws none (the engine's `applyFieldStyle` binds `radius.none`).
 *
 * WHICH MODE A CONTROL EDITS, and the derived modes: as Button options (`domains/button-options.ts`). Field style has
 * no per-mode value, so it writes the same bytes from any editable mode (Q54); a derived mode is read-only (Q59), held
 * at the write and in the controls, in the frame's own words.
 *
 * HOW IT REPAINTS: by store subscription only (`brand` and `mode`), keeping focus on the element that had it.
 */
import type { FieldStyle } from '@prism3/engine/scale';
import { currentMode, lastError, rebuild, setPage, subscribe } from '../state/store';
import { isDerived } from '../state/verdict';
import { brandControlShape, brandFieldStyle, setFieldStyle } from '../state/shape-input';
import { FIELD_DESC, pageOfTab } from '../shell/pages';
import { glyph, h, hook } from '../shell/dom';
import { choice, leverBlock, leverOf, keepFocus } from '../ui/lever-kit';
import { BUTTON_OPTIONS_COPY } from './button-options';

/** The block's copy. Q10 A on #2905: as drafted in wireframe v2. */
export const FIELD_OPTIONS_COPY = {
  title: 'Field options',
  desc: FIELD_DESC,
  shapeLabel: 'Control shape',
  shapeLink: 'Set it in Shape › Control shape',
  noCorners: 'No corners on an underline field.',
} as const;

/** Everything a pointer or keyboard can operate, held in a derived mode. */
const OPERABLE = 'button, input, select, [role="radio"], [tabindex]:not([tabindex="-1"])';

/** Mount the Field options into `hostEl`. `modeName` names a mode as the mode control shows it. Subscriptions are
 *  released through `cleanups`. */
export const mountFieldOptions = (hostEl: HTMLElement, cleanups: (() => void)[], modeName: (m: string) => string): void => {
  const root = hook(h('div', 'p3-bopts'), 'field-options');
  hostEl.replaceChildren(root);
  let edited = false;

  const shapeLink = (): HTMLElement => {
    const box = hook(h('div', 'p3-lever'), 'components-control-shape');
    const head = h('div', 'p3-lever-head');
    const s = brandControlShape();
    const label = (leverOf('controlShape')?.options ?? []).find((o) => String(o.value) === s)?.label ?? s;
    const readout = brandFieldStyle() === 'underline' ? FIELD_OPTIONS_COPY.noCorners : label;
    head.append(h('span', 'p3-lever-name', FIELD_OPTIONS_COPY.shapeLabel), hook(h('span', 'p3-readout', readout), 'components-control-shape-readout'));
    const go = hook(h('button', 'p3-btn p3-btn-ghost p3-deplink'), 'components-control-shape-link');
    go.type = 'button';
    go.append(h('span', 'p3-btn-label', FIELD_OPTIONS_COPY.shapeLink), glyph('chevr'));
    go.onclick = () => setPage(pageOfTab('shape'));
    const ctl = h('div', 'p3-lever-ctl');
    ctl.append(go);
    box.append(head, ctl);
    return box;
  };
  const fieldStyle = (): HTMLElement => {
    const L = leverOf('fieldStyle');
    const b = leverBlock('fieldStyle', { group: true });
    const opts = (L?.options ?? []).map((o) => ({ v: String(o.value) as FieldStyle, l: o.label }));
    const c = choice(L?.label ?? 'Field style', 'field-style-choice', opts, (v) => {
      // A derived mode is read-only (Q59), enforced at the write, whatever the controls show.
      if (isDerived(currentMode)) return;
      edited = true;
      setFieldStyle(v);
      rebuild();
    });
    c.set(brandFieldStyle());
    b.ctl.append(c.el);
    b.setRefused(!!lastError && edited);
    return b.el;
  };

  const render = (): void => {
    const { key: focusKey, again } = keepFocus(root);
    const parts: HTMLElement[] = [];
    const derived = isDerived(currentMode);
    if (derived) {
      const note = hook(h('p', 'p3-sg-note p3-sg-warn'), 'field-options-derived');
      note.append(glyph('warn'), h('span', 'p3-sg-warn-text', BUTTON_OPTIONS_COPY.derived(modeName(currentMode))));
      parts.push(note);
    }
    parts.push(shapeLink(), fieldStyle());
    root.replaceChildren(...parts);
    if (derived) {
      // Held as Button options hold theirs (N-3 A): help (the ⓘ) and the way to Shape stay live (RX1 A).
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
