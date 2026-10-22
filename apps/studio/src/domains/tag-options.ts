/**
 * Tag options (owner decision Q578 part 2, A on #2931's wireframe). Tag style as chips, Tag style's only control.
 *
 * WHERE THEY ARE DRAWN: once, in the Components page's Tag section, after its one set, behind the section's disclosure
 * line (`domains/components.ts`). Its home in the page data is Components › Tag (`shell/pages.ts`); Shape no longer
 * draws it. It writes through `state/shape-input.ts`.
 *
 * WHICH MODE A CONTROL EDITS, and the derived modes: as Field options (`domains/field-options.ts`). Tag style has no
 * per-mode value, so it writes the same bytes from any editable mode (Q54); a derived mode is read-only (Q59), held at
 * the write and in the controls, in the frame's own words.
 *
 * HOW IT REPAINTS: by store subscription only (`brand` and `mode`), keeping focus on the element that had it.
 */
import type { TagStyle } from '@prism3/engine/scale';
import { currentMode, lastError, rebuild, subscribe } from '../state/store';
import { isDerived } from '../state/verdict';
import { brandTagStyle, setTagStyle } from '../state/shape-input';
import { TAG_DESC } from '../shell/pages';
import { glyph, h, hook } from '../shell/dom';
import { choice, leverBlock, leverOf, keepFocus } from '../ui/lever-kit';
import { BUTTON_OPTIONS_COPY } from './button-options';

/** The block's copy. Q10 A on #2905: as drafted in wireframe v2. */
export const TAG_OPTIONS_COPY = {
  title: 'Tag options',
  desc: TAG_DESC,
} as const;

/** Everything a pointer or keyboard can operate, held in a derived mode. */
const OPERABLE = 'button, input, select, [role="radio"], [tabindex]:not([tabindex="-1"])';

/** Mount the Tag options into `hostEl`. `modeName` names a mode as the mode control shows it. Subscriptions are
 *  released through `cleanups`. */
export const mountTagOptions = (hostEl: HTMLElement, cleanups: (() => void)[], modeName: (m: string) => string): void => {
  const root = hook(h('div', 'p3-bopts'), 'tag-options');
  hostEl.replaceChildren(root);
  let edited = false;

  const tagStyle = (): HTMLElement => {
    const L = leverOf('tagStyle');
    const b = leverBlock('tagStyle', { group: true });
    const opts = (L?.options ?? []).map((o) => ({ v: String(o.value) as TagStyle, l: o.label }));
    const c = choice(L?.label ?? 'Tag style', 'tag-style-choice', opts, (v) => {
      // A derived mode is read-only (Q59), enforced at the write, whatever the controls show.
      if (isDerived(currentMode)) return;
      edited = true;
      setTagStyle(v);
      rebuild();
    });
    c.set(brandTagStyle());
    b.ctl.append(c.el);
    b.setRefused(!!lastError && edited);
    return b.el;
  };

  const render = (): void => {
    const { key: focusKey, again } = keepFocus(root);
    const parts: HTMLElement[] = [];
    const derived = isDerived(currentMode);
    if (derived) {
      const note = hook(h('p', 'p3-sg-note p3-sg-warn'), 'tag-options-derived');
      note.append(glyph('warn'), h('span', 'p3-sg-warn-text', BUTTON_OPTIONS_COPY.derived(modeName(currentMode))));
      parts.push(note);
    }
    parts.push(tagStyle());
    root.replaceChildren(...parts);
    if (derived) {
      // Held as Field options hold theirs (N-3 A): help (the ⓘ) stays live (RX1 A).
      for (const n of root.querySelectorAll<HTMLElement>(OPERABLE)) {
        if (n.closest('.p3-info')) continue;
        if (n instanceof HTMLButtonElement || n instanceof HTMLInputElement || n instanceof HTMLSelectElement) n.disabled = true;
        else { n.setAttribute('aria-disabled', 'true'); n.tabIndex = -1; }
      }
    }
    if (focusKey) again()?.focus({ preventScroll: true });
  };

  cleanups.push(subscribe('brand', render), subscribe('mode', render));
  render();
};
