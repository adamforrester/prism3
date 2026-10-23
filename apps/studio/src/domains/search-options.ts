/**
 * Search options (#2952; owner decisions #2905 Q5 A and Q10 A on wireframe v2). Search field style as chips, Search
 * field style's only control.
 *
 * WHERE THEY ARE DRAWN: once, in the Components page's Fields section, below Field options, behind its own disclosure
 * line (`domains/components.ts`; Q7 A: one line per block). Search field sits in Fields (Q5 A), so "Follow field style"
 * sits one block below Field style and the link between them shows without a pointer. Its home in the page data is
 * Components › Search (`shell/pages.ts`); Shape no longer draws it (Q578: component settings live with their
 * components). It writes through `state/shape-input.ts`.
 *
 * THE READOUT (Q10 A: "Follow field style · now Outline"): under Follow field style, the lever's readout names the
 * Field style the search field follows now, so a change in Field options above shows here too.
 *
 * WHICH MODE A CONTROL EDITS, and the derived modes: as Field options (`domains/field-options.ts`). Search field style
 * has no per-mode value, so it writes the same bytes from any editable mode (Q54); a derived mode is read-only (Q59),
 * held at the write and in the controls, in the frame's own words.
 *
 * HOW IT REPAINTS: by store subscription only (`brand` and `mode`), keeping focus on the element that had it.
 */
import type { SearchFieldStyle } from '@prism3/engine/scale';
import { currentMode, lastError, rebuild, subscribe } from '../state/store';
import { isDerived } from '../state/verdict';
import { brandFieldStyle, brandSearchFieldStyle, setSearchFieldStyle } from '../state/shape-input';
import { SEARCH_DESC } from '../shell/pages';
import { glyph, h, hook } from '../shell/dom';
import { choice, leverBlock, leverOf, keepFocus } from '../ui/lever-kit';
import { BUTTON_OPTIONS_COPY } from './button-options';

/** The block's copy. Q10 A on #2905: as drafted in wireframe v2. */
export const SEARCH_OPTIONS_COPY = {
  title: 'Search options',
  desc: SEARCH_DESC,
  /** The readout under Follow field style: the Field style it follows now, by its manifest label. */
  follows: (style: string): string => `now ${style}`,
} as const;

/** Everything a pointer or keyboard can operate, held in a derived mode. */
const OPERABLE = 'button, input, select, [role="radio"], [tabindex]:not([tabindex="-1"])';

/** Mount the Search options into `hostEl`. `modeName` names a mode as the mode control shows it. Subscriptions are
 *  released through `cleanups`. */
export const mountSearchOptions = (hostEl: HTMLElement, cleanups: (() => void)[], modeName: (m: string) => string): void => {
  const root = hook(h('div', 'p3-bopts'), 'search-options');
  hostEl.replaceChildren(root);
  let edited = false;

  const searchFieldStyle = (): HTMLElement => {
    const L = leverOf('searchFieldStyle');
    const b = leverBlock('searchFieldStyle', { group: true });
    const opts = (L?.options ?? []).map((o) => ({ v: String(o.value) as SearchFieldStyle, l: o.label }));
    const c = choice(L?.label ?? 'Search field style', 'search-field-style-choice', opts, (v) => {
      // A derived mode is read-only (Q59), enforced at the write, whatever the controls show.
      if (isDerived(currentMode)) return;
      edited = true;
      setSearchFieldStyle(v);
      rebuild();
    });
    const now = brandSearchFieldStyle();
    c.set(now);
    if (now === 'follow') {
      const f = brandFieldStyle();
      b.setReadout(SEARCH_OPTIONS_COPY.follows((leverOf('fieldStyle')?.options ?? []).find((o) => String(o.value) === f)?.label ?? f));
    }
    b.ctl.append(c.el);
    b.setRefused(!!lastError && edited);
    return b.el;
  };

  const render = (): void => {
    const { key: focusKey, again } = keepFocus(root);
    const parts: HTMLElement[] = [];
    const derived = isDerived(currentMode);
    if (derived) {
      const note = hook(h('p', 'p3-sg-note p3-sg-warn'), 'search-options-derived');
      note.append(glyph('warn'), h('span', 'p3-sg-warn-text', BUTTON_OPTIONS_COPY.derived(modeName(currentMode))));
      parts.push(note);
    }
    parts.push(searchFieldStyle());
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
