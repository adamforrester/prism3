/**
 * The value picker (UI redesign S6.3, owner decision Q65 option A): the step picker's form for a type value. A
 * button showing the current value opens a panel that lists every value the control may take, each with a live
 * sample at that value, the current one checked. A value that would break the order (a size past its neighbor, a
 * weight lighter than the name below it, a line height past the next name's) is shown DISABLED, with the reason,
 * rather than left out: the order is a real rule, and hiding a value would make the list look shorter than it is.
 *
 * Its sibling is `ui/step-picker.ts` (the color step picker, V9). The two share the panel's frame (`p3-picker`,
 * its head, hint and tools rows, and Close) and their keyboard: arrow keys move along the list, Home and End go
 * to the first and last value, Enter or Space chooses, Escape closes. A choice does not move the picker's focus.
 *
 * WHAT IT WRITES: nothing itself. A value calls `onPick(v)`, the reset button (when there is something to reset)
 * calls `onReset()`, and the host writes the brand and repaints by store subscription, as every new control does.
 * Escape and Close call `onClose()`; the host returns focus to the control that opened it.
 */
import { glyph, h, hook } from '../shell/dom';

export type PickerValue = {
  /** The value written when it is chosen. */
  readonly v: number;
  /** What the value reads as (`64px`, `600 · Semibold`, `1.5×`). */
  readonly label: string;
  /** Draws the live sample at this value into `el`. */
  readonly sample: (el: HTMLElement) => void;
  /** Why the value cannot be chosen, or undefined when it can. */
  readonly refuse?: string;
};
export type ValuePickerOpts = {
  /** What is being picked, shown as the panel's title (`Display md, desktop`). */
  readonly name: string;
  /** The mode, in words (`Light`). */
  readonly modeLabel: string;
  /** One line under the title: what the list holds. */
  readonly hint: string;
  readonly values: readonly PickerValue[];
  /** The value the control resolves to now. */
  readonly current: number;
  /** The reset action, when the control has one (`Return to Auto`), and whether there is anything to reset. */
  readonly reset?: { readonly label: string; readonly enabled: boolean };
  readonly onPick: (v: number) => void;
  readonly onReset?: () => void;
  readonly onClose: () => void;
};

const same = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

/** The picker. `el` is the group; `focusCurrent` puts focus on the current value (or the first). */
export const valuePicker = (o: ValuePickerOpts): { el: HTMLElement; focusCurrent: () => void } => {
  const el = hook(h('div', 'p3-picker'), 'value-picker');
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', `Pick a value for ${o.name} in ${o.modeLabel}`);

  const head = h('div', 'p3-picker-head');
  head.append(h('b', 'p3-picker-role', o.name), h('span', 'p3-picker-mode', o.modeLabel), h('span', 'p3-spacer'));
  const close = hook(h('button', 'p3-btn p3-btn-page p3-btn-ghost'), 'value-picker-close');
  close.type = 'button';
  close.append(glyph('x'), h('span', 'p3-btn-label', 'Close'));
  close.onclick = () => o.onClose();
  head.append(close);
  const hint = h('p', 'p3-picker-hint', o.hint);

  const parts: HTMLElement[] = [head, hint];
  if (o.reset) {
    const tools = h('div', 'p3-picker-tools');
    const reset = hook(h('button', 'p3-btn p3-btn-page'), 'value-picker-reset');
    reset.type = 'button';
    reset.textContent = o.reset.label;
    reset.disabled = !o.reset.enabled;
    reset.onclick = () => o.onReset?.();
    tools.append(h('span', 'p3-spacer'), reset);
    parts.push(tools);
  }

  const list = hook(h('div', 'p3-vpick-list'), 'value-picker-values');
  const buttons = o.values.map((x) => {
    const cur = same(x.v, o.current);
    const b = hook(h('button', 'p3-vpick'), 'value-picker-value');
    b.type = 'button';
    b.dataset.value = String(x.v);
    b.setAttribute('aria-pressed', String(cur));
    b.tabIndex = -1;
    const key = h('span', 'p3-vpick-key', x.label);
    if (cur) key.append(glyph('check'));
    const samp = h('span', 'p3-vpick-sample');
    // The sample is drawn in the brand's type, at this value: content, not chrome.
    samp.dataset.content = '';
    x.sample(samp);
    b.append(key, samp);
    if (x.refuse) {
      // Disabled with the reason, never hidden: aria-disabled keeps it in the arrow-key path, so the reason is read.
      b.setAttribute('aria-disabled', 'true');
      b.dataset.refused = 'true';
      const why = h('span', 'p3-vpick-why', x.refuse);
      why.id = `p3-vpick-why-${String(x.v).replace(/[^0-9a-z]/gi, '_')}`;
      b.setAttribute('aria-describedby', why.id);
      b.title = x.refuse;
      b.append(why);
    }
    b.setAttribute('aria-label', `${x.label}${cur ? ', current' : ''}${x.refuse ? `, unavailable: ${x.refuse}` : ''}`);
    b.onclick = () => { if (!x.refuse && !cur) o.onPick(x.v); };
    return b;
  });
  const start = buttons.find((b) => b.getAttribute('aria-pressed') === 'true') ?? buttons.find((b) => b.getAttribute('aria-disabled') !== 'true') ?? buttons[0];
  if (start) start.tabIndex = 0;
  list.append(...buttons);
  list.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(e.target as HTMLButtonElement);
    if (i < 0) return;
    const to = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1
      : e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const t = buttons[Math.max(0, Math.min(buttons.length - 1, to))];
    for (const b of buttons) b.tabIndex = b === t ? 0 : -1;
    t.focus();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    o.onClose();
  });
  parts.push(list);
  el.append(...parts);
  return { el, focusCurrent: () => (buttons.find((b) => b.tabIndex === 0) ?? buttons[0])?.focus() };
};
