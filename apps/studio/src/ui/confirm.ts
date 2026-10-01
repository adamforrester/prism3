/**
 * An in-place confirm (owner, 2026-10-01): a destructive lever action asks first, in the levers panel, right
 * under the control that asked. No dialog and no overlay: the panel is part of the lever, so nothing covers
 * the preview, and the page around it stays readable.
 *
 * WRITTEN SMALL, TO CONVERGE. S3 (#1939) builds a confirm for Brand that was not on `main` when this landed.
 * This is the minimum Palettes needs, so that S3's helper can replace it, or this can grow into it, without
 * a call site changing much: a title, the list of what else changes, and Cancel and Confirm.
 *
 * BEHAVIOR. Opening moves focus to Cancel, the choice that changes nothing. Cancel and Escape close it and
 * return focus to the opener, and write nothing. Confirm calls `onConfirm` once. The panel is a `group`
 * named by its title, so a screen reader announces the question with the buttons.
 */
import { h, hook } from '../shell/dom';

export type InlineConfirm = { readonly el: HTMLElement; readonly focus: () => void };

let seq = 0;

export const inlineConfirm = (o: {
  /** The question, as a short title: "Remove accent?" */
  title: string;
  /** What else the action changes, one line each. */
  effects: readonly string[];
  /** The confirm button's words: "Remove". */
  confirmLabel: string;
  onConfirm: () => void;
  /** Closes the panel. The caller removes it and returns focus to the opener. */
  onCancel: () => void;
}): InlineConfirm => {
  const el = hook(h('div', 'p3-confirm'), 'confirm');
  el.setAttribute('role', 'group');
  const title = h('p', 'p3-confirm-title', o.title);
  title.id = `p3-confirm-${++seq}`;
  el.setAttribute('aria-labelledby', title.id);
  const list = h('ul', 'p3-confirm-list');
  for (const e of o.effects) list.append(h('li', undefined, e));
  const row = h('div', 'p3-confirm-actions');
  const cancel = hook(h('button', 'p3-btn p3-btn-page'), 'confirm-cancel');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.onclick = () => o.onCancel();
  const ok = hook(h('button', 'p3-btn p3-btn-primary'), 'confirm-accept');
  ok.type = 'button';
  ok.textContent = o.confirmLabel;
  let done = false;
  ok.onclick = () => { if (done) return; done = true; o.onConfirm(); };
  row.append(cancel, ok);
  el.append(title, list, row);
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); o.onCancel(); } });
  return { el, focus: () => cancel.focus() };
};
