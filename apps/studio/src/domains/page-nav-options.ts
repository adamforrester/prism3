/**
 * Page navigation options (#3345, owner decision 2026-11-03 Q2 A). Current page indicator as chips, its only control.
 *
 * WHERE THEY ARE DRAWN: once, in the Components page's Page navigation section, after its sets, behind the section's
 * disclosure line (`domains/components.ts`), built as Radio options are (#3086). Its home in the page data is
 * Components › Page navigation (`shell/pages.ts`, Q578: component settings live with their components; the placement is
 * DRAFT, Q4 on #3345). It writes through `state/shape-input.ts`.
 *
 * WHICH MODE A CONTROL EDITS, and the derived modes: as Radio options. The indicator has no per-mode value, so it
 * writes the same bytes from any editable mode (Q54); a derived mode is read-only (Q59), held at the write and in the
 * controls, in the frame's own words.
 *
 * HOW IT REPAINTS: by store subscription only (`brand` and `mode`), keeping focus on the element that had it.
 */
import type { CurrentIndicator } from '@prism3/engine/scale';
import { currentMode, lastError, rebuild, subscribe } from '../state/store';
import { isDerived } from '../state/verdict';
import { brandCurrentIndicator, setCurrentIndicator } from '../state/shape-input';
import { PAGE_NAV_DESC } from '../shell/pages';
import { glyph, h, hook } from '../shell/dom';
import { choice, leverBlock, leverOf, keepFocus } from '../ui/lever-kit';
import { BUTTON_OPTIONS_COPY } from './button-options';

/** The block's copy. DRAFT for the owner (Q3 on #3345), in Radio options' pattern. */
export const PAGE_NAV_OPTIONS_COPY = {
  title: 'Page navigation options',
  desc: PAGE_NAV_DESC,
} as const;

/** Everything a pointer or keyboard can operate, held in a derived mode. */
const OPERABLE = 'button, input, select, [role="radio"], [tabindex]:not([tabindex="-1"])';

/** Mount the Page navigation options into `hostEl`. `modeName` names a mode as the mode control shows it. Subscriptions are
 *  released through `cleanups`. */
export const mountPageNavOptions = (hostEl: HTMLElement, cleanups: (() => void)[], modeName: (m: string) => string): void => {
  const root = hook(h('div', 'p3-bopts'), 'page-nav-options');
  hostEl.replaceChildren(root);
  let edited = false;

  // The current page's bar: the title's width, or half of it, centered. The same bytes from any editable mode.
  const indicator = (): HTMLElement => {
    const L = leverOf('currentIndicator');
    const b = leverBlock('currentIndicator', { group: true });
    const opts = (L?.options ?? []).map((o) => ({ v: String(o.value) as CurrentIndicator, l: o.label }));
    const c = choice(L?.label ?? 'Current page indicator', 'current-indicator-choice', opts, (v) => {
      // A derived mode is read-only (Q59), enforced at the write, whatever the controls show.
      if (isDerived(currentMode)) return;
      edited = true;
      setCurrentIndicator(v);
      rebuild();
    });
    c.set(brandCurrentIndicator());
    b.ctl.append(c.el);
    b.setRefused(!!lastError && edited);
    return b.el;
  };

  const render = (): void => {
    const { key: focusKey, again } = keepFocus(root);
    const parts: HTMLElement[] = [];
    const derived = isDerived(currentMode);
    if (derived) {
      const note = hook(h('p', 'p3-sg-note p3-sg-warn'), 'page-nav-options-derived');
      note.append(glyph('warn'), h('span', 'p3-sg-warn-text', BUTTON_OPTIONS_COPY.derived(modeName(currentMode))));
      parts.push(note);
    }
    parts.push(indicator());
    root.replaceChildren(...parts);
    if (derived) {
      // Held as Radio options hold theirs (N-3 A): help (the ⓘ) stays live (RX1 A).
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
