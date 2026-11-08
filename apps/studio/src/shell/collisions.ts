/**
 * The collision choice (#1909, owner decision Q112 A), plugin only: the dialog a refused Apply Theme opens when what it
 * would write is already in the file and Prism3 did not make it. One row per collision, each with its own choice, Skip
 * or Rename, and "Apply to all" in the foot; Apply runs the apply again with those choices, Cancel closes with nothing
 * written. The rules (refusal the default, nothing remembered) live in `state/collisions.ts`.
 *
 * LAYOUT: built to the closest existing pattern, Update file's dialog (`update-file.ts`) and its Kept edits group — a
 * modal over a scrim, a row per item with its name and a select, and the select that covers every row in the foot
 * beside Cancel and the primary action. The layout and every string are DRAFT (#1909: the owner's call).
 *
 * DIALOG: modal (`aria-modal`); focus goes into it as it opens; Escape and a click on the scrim cancel; Tab stays inside
 * (`trapTab`). A repaint keeps focus on the same control (`data-key`).
 */
import { subscribe } from '../state/store';
import { allChosen, choicesToPost, pickAll, sharedPick, COLLISION_COPY, type CollisionChoice, type Picks } from '../state/collisions';
import type { CollisionChoices, CollisionView } from '../write-adapter';
import { focusables, glyph, h, hook, trapTab } from './dom';

export type CollisionsLend = {
  /** The collisions the panel's last refused apply named, or null while there are none to answer. */
  readonly read: () => readonly CollisionView[] | null;
  /** Run Apply Theme again with a choice for every collision. */
  readonly submit: (choices: CollisionChoices) => void;
  /** Close the list; the refusal stands and nothing is written. */
  readonly cancel: () => void;
};

const CHOICES: readonly CollisionChoice[] = ['skip', 'rename'];

/** A select of Skip and Rename, with a first option that is no choice. */
const choiceSelect = (role: string, key: string, label: string, value: CollisionChoice | null, onPick: (c: CollisionChoice | null) => void): HTMLElement => {
  const sel = hook(h('select', 'p3-select'), role);
  sel.dataset.key = key;
  sel.setAttribute('aria-label', label);
  const none = h('option', undefined, COLLISION_COPY.unchosen);
  none.value = '';
  sel.append(none);
  for (const c of CHOICES) {
    const o = h('option', undefined, COLLISION_COPY.choice[c]);
    o.value = c;
    sel.append(o);
  }
  sel.value = value ?? '';
  sel.onchange = () => onPick(sel.value === 'skip' || sel.value === 'rename' ? sel.value : null);
  const sw = h('div', 'p3-selwrap');
  sw.append(sel, glyph('chev'));
  return sw;
};

/** Mount the layer. The frame places it last, over everything. */
export const mountCollisions = (lend: CollisionsLend, cleanups: (() => void)[]): { readonly layer: HTMLElement } => {
  const layer = hook(h('div', 'p3-bardlg-layer'), 'collisions-layer');
  /** The rows the picks answer; a new refusal starts again with no choices (nothing is remembered). */
  let shownFor: readonly CollisionView[] | null = null;
  let picks: Picks = {};
  let refocus: string | null = null;

  const paint = (): void => {
    const rows = lend.read();
    if (!rows || !rows.length) { shownFor = null; picks = {}; layer.replaceChildren(); return; }
    if (rows !== shownFor) { shownFor = rows; picks = {}; }
    const focused = refocus ?? (document.activeElement instanceof HTMLElement && layer.contains(document.activeElement) ? document.activeElement.dataset.key ?? null : null);
    refocus = null;
    const set = (next: Picks, key: string): void => { picks = next; refocus = key; paint(); };

    const scrim = h('div', 'p3-bardlg-scrim');
    scrim.dataset.still = 'true';
    const dlg = hook(h('div', 'p3-bardlg p3-upd'), 'collisions-dialog');
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-label', COLLISION_COPY.title);
    dlg.tabIndex = -1;
    dlg.addEventListener('keydown', (e) => {
      trapTab(dlg, e);
      if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); lend.cancel(); }
    });
    const head = h('div', 'p3-bardlg-head');
    head.append(h('h2', 'p3-bardlg-title', COLLISION_COPY.title));
    const x = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon'), 'collisions-x');
    x.type = 'button';
    x.dataset.key = 'x';
    x.setAttribute('aria-label', COLLISION_COPY.close);
    x.append(glyph('x'));
    x.onclick = () => lend.cancel();
    head.append(x);

    const body = hook(h('div', 'p3-bardlg-col p3-upd-body'), 'collisions-body');
    body.append(hook(h('p', 'p3-sub p3-upd-sub', COLLISION_COPY.intro(rows.length)), 'collisions-intro'));
    const list = hook(h('div', 'p3-upd-sets'), 'collisions-rows');
    for (const r of rows) {
      const row = hook(h('div', 'p3-upd-setrow'), 'collisions-row');
      row.dataset.key = `row=${r.key}`;
      const top = h('div', 'p3-upd-handsel');
      top.append(h('span', 'p3-upd-setname', `${r.kind} ${r.name}`),
        choiceSelect('collisions-choice', `pick=${r.key}`, COLLISION_COPY.rowLabel(r.kind, r.name), picks[r.key] ?? null,
          (c) => { const next = { ...picks }; if (c) next[r.key] = c; else delete next[r.key]; set(next, `pick=${r.key}`); }));
      row.append(top, hook(h('p', 'p3-sub p3-upd-setline', r.detail), 'collisions-detail'));
      list.append(row);
    }
    body.append(list);
    for (const c of CHOICES) body.append(hook(h('p', 'p3-sub p3-upd-sub', COLLISION_COPY.hint[c]), `collisions-hint-${c}`));

    const foot = h('div', 'p3-bardlg-foot');
    const all = hook(h('div', 'p3-upd-handsel'), 'collisions-all-row');
    const lab = h('label', 'p3-sub', COLLISION_COPY.all);
    lab.htmlFor = 'p3-collisions-all';
    const allSel = choiceSelect('collisions-all', 'all', COLLISION_COPY.all, sharedPick(rows, picks), (c) => set(c ? pickAll(rows, c) : {}, 'all'));
    (allSel.querySelector('select') as HTMLSelectElement).id = 'p3-collisions-all';
    all.append(lab, allSel);
    const cancel = hook(h('button', 'p3-btn p3-btn-page'), 'collisions-cancel');
    cancel.type = 'button';
    cancel.dataset.key = 'cancel';
    cancel.textContent = COLLISION_COPY.cancel;
    cancel.onclick = () => lend.cancel();
    const go = hook(h('button', 'p3-btn p3-btn-primary'), 'collisions-go');
    go.type = 'button';
    go.dataset.key = 'go';
    go.textContent = COLLISION_COPY.go;
    // Refusal is the default: Apply is off until every row has a choice.
    go.disabled = !allChosen(rows, picks);
    go.onclick = () => { const c = choicesToPost(rows, picks); if (c) lend.submit(c); };
    foot.append(all, cancel, go);

    dlg.append(head, body, foot);
    scrim.onmousedown = (e) => { if (e.target === scrim) { e.preventDefault(); lend.cancel(); } };
    scrim.append(dlg);
    layer.replaceChildren(scrim);
    if (focused) (layer.querySelector<HTMLElement>(`[data-key="${CSS.escape(focused)}"]`) ?? dlg).focus({ preventScroll: true });
    else if (!dlg.contains(document.activeElement)) (focusables(dlg)[0] ?? dlg).focus({ preventScroll: true });
  };
  cleanups.push(subscribe('host', paint));
  cleanups.push(() => layer.replaceChildren());
  paint();
  return { layer };
};
