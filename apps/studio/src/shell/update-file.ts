/**
 * Update file (#2909 IA v2 phase 1, plugin only): the top bar's one global action and the overlay it opens, with two
 * tabs, Update and Clean up (owner decisions Q668 A, Q2909.2 A, Q2909.5 A; round-4 wireframe).
 *
 * UPDATE: the checklist (`state/update-file.ts` holds its rules). It opens on every click, even when only the theme is
 * to be written (Q2909.2 A). As it opens it asks the host which sets the file holds and whether it is set up, and says
 * "Checking the file…" until the answer lands. Its action runs the ticked steps one at a time (`main.ts` drives them
 * through the writes the panel already had: Set up file, Apply Theme, the build queue, the style guide), then the
 * overlay closes and Activity shows each step as before. While a run is out the button is busy and, reopened, the
 * overlay shows the step running and Stop.
 *
 * WHAT IS DUE (phase 2, Q2909.8 A): the button carries a badge from the as-built ledger. Since #3081 (Q810 A) it counts
 * everything Update file would change, live: the add queue (#3129), the sets due against the brand the panel holds, and
 * one item for Theme changes the file does not hold yet (`badgeParts`). Its name splits the count (Q3129.11 A): "Update
 * file, 7 to add, 3 due", and ", theme" when the Theme item counts. The panel recounts after a setting changes and after
 * each write's verdict (`main.ts`, debounced). The recount never runs the full check. The checklist lists the due sets,
 * ticked, under Due, and as it opens asks for the full check over them
 * alone; each set then says what changes, and the update waits on that answer. One choice covers the hand edits it finds
 * (Keep, the default). A set built before the ledger reads "Not checked yet", with a way to check it. Both reads measure
 * against the panel's brand while Theme is ticked, else the file's stored one (#3023 Q701 B, `brandFor`), so a Theme toggle
 * checks the file again.
 *
 * TO ADD (#3129, Q832 A, Q3129.7–10 A; the owner's revisions R6 and R7): the file's add queue, in Components' order and
 * with its names (`queuedOf`, `displayNameOf`). To add and Due are the two subtitles of one section, Components, at
 * Theme's level (R6). Each To add row has Remove (×), and from two rows up the subtitle's line has Remove all; there is
 * no tick, so a queued set runs. Each removal is a queue write, as Components' boxes are, so a teammate sees it. An
 * empty queue shows no To add at all (R7); a file that is not set up starts empty and still offers Add all, which
 * writes every set it lacks into the queue (Q3129.9 A, Q3129.10 A, kept). With neither group, no Components section.
 *
 * CLEAN UP: Prune stale, moved here with its own preview (Q668 A): the preview runs as the tab opens and writes nothing;
 * its Delete is the confirmed prune. It never rides Update. The style guide's retired tables (Q412 A) are offered here
 * too, after a run that found some.
 *
 * DIALOG: modal (`aria-modal`), focus into it as it opens and back to the button as it closes, by any path; Escape and a
 * click on the scrim close it; Tab stays inside (`trapTab`). A repaint keeps focus on the same control (`data-key`) and
 * the body's scroll position on the same tab (#3082).
 *
 * It names no legacy repaint tier (`test-shell-imports.ts`): it reads through `lend.read` and repaints on the host topics.
 * Every string is a DRAFT placeholder (Q2909.10 A), in `UPDATE_COPY`.
 */
import { subscribe } from '../state/store';
import type { Catalog } from '../state/component-catalog';
import { displayNameOf, groupsOf, GROUPS_COPY, sentenceCase } from '../state/component-groups';
import { awaitingRead, badgeParts, defaultTicks, dueSetsOf, newSetsOf, queuedOf, stepOf, stepsOf, unrecordedOf, updatableOf, STEP_TITLE, UPDATE_COPY, type FileSets, type HandEditChoice, type LiveDue, type StepKey, type Ticks, type UpdateRun } from '../state/update-file';
import type { CheckedSetView } from '../write-adapter';
import { focusables, glyph, h, hook, pendingLabel, setBusy, trapTab } from './dom';

export type UpdateFileLend = {
  readonly read: () => {
    /** The file's sets and setup state, as the host last answered; `null` before the first answer. */
    readonly fileSets: FileSets | null;
    /** #3081 Q810 A: the badge's live recount against the panel's brand, or null before its first answer (and on the
     *  web, and after a failed restore, where nothing is asked). */
    readonly liveDue: LiveDue | null;
    readonly catalog: Catalog;
    /** The run that is out, or null. */
    readonly run: UpdateRun | null;
    /** The last run that ended on a failed step, with the step and its words, until the next run; else null. */
    readonly stopped: { readonly step: StepKey; readonly headline: string } | null;
    /** Why Update file cannot run now (the file's brand did not restore), or null. */
    readonly off: string | null;
    readonly prune: {
      readonly busy: false | 'preview' | 'delete';
      readonly preview: { readonly count: number; readonly summary: string } | null;
      readonly verdict: { readonly ok: boolean; readonly applied: boolean; readonly count: number; readonly summary: string } | null;
    };
    /** The style guide's retired tables (Q412 A), and whether their removal is out. */
    readonly retired: readonly { readonly id: string; readonly name: string }[];
    readonly cleanupBusy: boolean;
    /** Q2909.8 A: the background pass's hand edits by set, and the scoped check's last answer (`pending` while out). */
    readonly handEdits: ReadonlyMap<string, { readonly members: number; readonly edited: number }>;
    readonly updateCheck: { readonly previewHash: string; readonly sets: readonly CheckedSetView[]; readonly error: string | null } | 'pending' | null;
    /** #3129 Q833 A: the file's add queue, as the host last read it or the panel last wrote it; null before the host has
     *  said. */
    readonly queue: readonly string[] | null;
  };
  /** #3129: queue `ids` in the file (`on`), or take them out (`add-queue`). */
  readonly queueSets: (ids: readonly string[], on: boolean) => void;
  /** Ask the host which sets the file holds (`file-sets-request`). `theme`: whether Theme is ticked, which decides the
   *  brand what is due is measured against (#3023 Q701 B: the panel's, else the file's stored one). */
  readonly check: (theme: boolean) => void;
  /** Q2909.8 A: the full check, scoped to `defs` (`update-check-request`), against the brand `theme` picks, as `check`. */
  readonly checkSets: (defs: readonly string[], theme: boolean) => void;
  /** `update`: the due sets to update in place, the check's hash for exactly those sets (empty when they are fewer than
   *  the check read, and the run checks them again first), and the hand-edit choice. */
  readonly run: (steps: readonly StepKey[], sets: readonly string[], update: { readonly defs: readonly string[]; readonly previewHash: string; readonly checked: readonly CheckedSetView[]; readonly handEdits: HandEditChoice } | null) => void;
  readonly stop: () => void;
  readonly pruneCheck: () => void;
  readonly pruneDelete: () => void;
  readonly cleanUp: (ids: readonly string[]) => void;
};

/** Mount the button and the overlay. The bar places `button`; the frame places `layer` last, over everything. */
export const mountUpdateFile = (lend: UpdateFileLend, cleanups: (() => void)[]): { readonly button: HTMLButtonElement; readonly layer: HTMLElement } => {
  const button = hook(h('button', 'p3-btn p3-btn-primary p3-upd-btn'), 'update-file');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.append(pendingLabel(UPDATE_COPY.button, UPDATE_COPY.busy));
  // Q2909.8 A, #3081 Q810 A: the number of things Update file would change, beside the label; its words ride the
  // button's name too, so the name says the same count.
  const badge = hook(h('span', 'p3-upd-badge'), 'update-badge');
  badge.setAttribute('aria-hidden', 'true');
  button.append(badge);
  const layer = hook(h('div', 'p3-bardlg-layer'), 'update-layer');

  let open = false;
  let tab: 'update' | 'clean' = 'update';
  /** The answer the overlay waits for: the `fileSets` reading from before it asked. */
  let asked: FileSets | null | undefined;
  let ticks: Ticks | null = null;
  /** Clean up's preview was asked for in this opening. */
  let pruneAsked = false;
  /** The sets this opening asked the scoped check for, or null before it has (Q2909.8 A). */
  let checkedFor: readonly string[] | null = null;
  /** A Theme toggle asked the file again (#3023): its answer ticks the due sets afresh. */
  let rechecking = false;
  /** The not-yet-recorded sets a check has already ticked or left, so an untick by hand sticks. */
  const seen = new Set<string>();
  /** #3129: the control the next repaint focuses, set by a removal whose own button the repaint drops. */
  let refocus: string | null = null;

  const show = (): void => {
    if (open) return;
    open = true;
    tab = 'update';
    pruneAsked = false;
    checkedFor = null;
    rechecking = false;
    seen.clear();
    if (!lend.read().run) { asked = lend.read().fileSets; ticks = null; lend.check(true); }
    paint();
    const d = layer.querySelector<HTMLElement>('[data-p3="update-dialog"]');
    if (d) (focusables(d)[0] ?? d).focus();
  };
  const close = (): void => {
    if (!open) return;
    open = false;
    paint();
    button.focus({ preventScroll: true });
  };
  // Busy, it still opens: the overlay then shows the step running and Stop.
  button.onclick = show;

  const check = (role: string, key: string, on: boolean, label: Node[], toggle: () => void): HTMLButtonElement => {
    const b = hook(h('button', 'p3-btn p3-btn-page p3-check p3-upd-check'), role);
    b.type = 'button';
    b.dataset.key = key;
    b.setAttribute('role', 'checkbox');
    b.setAttribute('aria-checked', String(on));
    const bx = h('span', 'p3-check-box');
    bx.setAttribute('aria-hidden', 'true');
    bx.append(glyph('check'));
    b.append(bx, ...label);
    b.onclick = () => { toggle(); paint(); };
    return b;
  };
  const btn = (cls: string, role: string, key: string, label: string, onClick: () => void): HTMLButtonElement => {
    const b = hook(h('button', cls as 'p3-btn'), role);
    b.type = 'button';
    b.dataset.key = key;
    b.textContent = label;
    b.onclick = onClick;
    return b;
  };

  /** An item: its box, title and count on one row, its line under them, and what it holds. */
  const item = (key: Exclude<StepKey, 'sets' | 'update'>, on: boolean, title: string, sub: string, toggle: () => void): HTMLElement => {
    const row = hook(h('div', 'p3-upd-item'), `update-item-${key}`);
    row.append(check(`update-check-${key}`, `item=${key}`, on, [h('b', undefined, title)], toggle), h('p', 'p3-sub p3-upd-sub', sub));
    return row;
  };

  const updateBody = (): { body: HTMLElement[]; foot: HTMLElement[] } => {
    const r = lend.read();
    const run = r.run;
    if (run) {
      const step = stepOf(run);
      const line = hook(h('p', 'p3-upd-line', step ? UPDATE_COPY.running(STEP_TITLE[step], run.results.length + 1, run.steps.length) : ''), 'update-running');
      const stop = btn('p3-btn p3-btn-page', 'update-stop', 'stop', UPDATE_COPY.stop, () => lend.stop());
      if (run.stopping) stop.disabled = true;
      return { body: [line], foot: [btn('p3-btn p3-btn-page', 'update-close', 'close', UPDATE_COPY.close, close), stop] };
    }
    const f = r.fileSets;
    if (awaitingRead(f, asked)) return { body: [hook(h('p', 'p3-upd-line', UPDATE_COPY.checking), 'update-checking')], foot: [btn('p3-btn p3-btn-page', 'update-cancel', 'cancel', UPDATE_COPY.cancel, close)] };
    if (!f || f.error) return { body: [hook(h('p', 'p3-sg-error', UPDATE_COPY.readError), 'update-read-error')], foot: [btn('p3-btn p3-btn-page', 'update-cancel', 'cancel', UPDATE_COPY.cancel, close)] };
    asked = undefined;
    if (rechecking && ticks) { rechecking = false; ticks = { ...ticks, update: new Set(dueSetsOf(r.catalog, f)) }; }
    ticks ??= defaultTicks(r.catalog, f);
    const t = ticks;
    const fresh = !f.setUp;
    const body: HTMLElement[] = [];
    // A run that stopped on a failed step says so here, so a step that refused to start is never silent.
    if (r.stopped) body.push(hook(h('p', 'p3-sg-error', UPDATE_COPY.stopped(STEP_TITLE[r.stopped.step], r.stopped.headline)), 'update-stopped'));
    body.push(h('p', 'p3-sub p3-upd-lead', fresh ? UPDATE_COPY.leadFresh : UPDATE_COPY.lead));
    if (fresh) body.push(item('setup', t.setup, UPDATE_COPY.setup, UPDATE_COPY.setupSub, () => { ticks = { ...t, setup: !t.setup }; }));
    // #3023 Q701 B: Theme decides the brand the sets are measured against, so a toggle checks the file again, and the due
    // sets are ticked again from that answer; what the counts say stays what the run writes.
    body.push(item('theme', t.theme, UPDATE_COPY.theme, UPDATE_COPY.themeSub, () => {
      ticks = { ...t, theme: !t.theme };
      rechecking = true;
      asked = f;
      checkedFor = null;
      seen.clear();
      lend.check(!t.theme);
    }));
    // #3129: the add queue, then the due sets (Q2909.8 A), each group under its own title.
    const queue = queuedOf(r.catalog, f, r.queue);
    const addable = newSetsOf(r.catalog, f);
    const due = dueSetsOf(r.catalog, f);
    const unrec = unrecordedOf(r.catalog, f);
    // The full check, over the due sets alone, once per opening, as soon as the ledger's answer is in.
    if (due.length && checkedFor === null) { checkedFor = due; lend.checkSets(due, t.theme); }
    const chk = r.updateCheck;
    const answered = chk && chk !== 'pending' && checkedFor !== null ? chk : null;
    const checkOf = (id: string): CheckedSetView | undefined => answered?.sets.find((c) => c.def === id);
    // Q392 A on #2812: a set named as Components names it.
    const nameOf = (id: string): string => displayNameOf(r.catalog, id);
    // A check that read the not-yet-recorded sets ticks each one an update would change, once, before anything is drawn.
    if (answered && checkedFor && unrec.some((id) => checkedFor!.includes(id) && !t.update.has(id) && !seen.has(id))) {
      for (const id of unrec) if (checkOf(id)) seen.add(id);
      const add = unrec.filter((id) => { const c = checkOf(id); return c && !c.blocked && !c.upToDate && !t.update.has(id); });
      if (add.length) { ticks = { ...t, update: new Set([...t.update, ...add]) }; return updateBody(); }
    }
    const updating = [...new Set([...due, ...t.update])];
    // #3129 R6: To add and Due are the two subtitles of one section, Components, at Theme's level. Where a removal takes
    // the last of To add away, focus goes on to the next control: Due's first tick, else Style guides'.
    const after = updating.length ? `due=${updating[0]}` : 'item=guides';
    const comps = hook(h('div', 'p3-upd-item'), 'update-item-components');
    comps.append(hook(h('b', 'p3-upd-title', UPDATE_COPY.components), 'update-components-title'));
    // R7: an empty queue shows no To add at all, except on a file that is not set up, which offers Add all (Q3129.9 A,
    // Q3129.10 A, both kept by the revision).
    if (queue.length || (fresh && addable.length)) {
      const grp = hook(h('div', 'p3-upd-group'), 'update-group-add');
      const head = h('div', 'p3-upd-grouphead');
      head.append(h('span', 'p3-upd-subtitle', UPDATE_COPY.toAdd));
      // Q3129.8 A: Remove all, a ghost button in the group's head, from two rows up.
      if (queue.length >= 2) head.append(btn('p3-btn p3-btn-ghost p3-upd-removeall', 'update-remove-all', 'remove-all', UPDATE_COPY.removeAll, () => { refocus = after; lend.queueSets(queue, false); }));
      grp.append(head);
      if (queue.length) {
        grp.append(hook(h('p', 'p3-sub p3-upd-sub', UPDATE_COPY.toAddSub(queue.length)), 'update-add-line'));
        const rows = groupsOf(r.catalog).flatMap((sec) => sec.rows);
        const list = hook(h('div', 'p3-upd-sets'), 'update-add-sets');
        queue.forEach((id, i) => {
          const name = nameOf(id);
          const row = hook(h('div', 'p3-upd-addrow'), 'update-add-row');
          row.dataset.id = id;
          row.append(h('span', 'p3-upd-setname', name));
          // Where it lands, when its name is not its page's (a part set, or a set on a shared page).
          const page = rows.find((x) => x.ids.includes(id))?.page ?? null;
          if (page && sentenceCase(page) !== name) row.append(hook(h('span', 'p3-cp-where p3-upd-where', GROUPS_COPY.page(page)), 'update-add-page'));
          const x = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon p3-upd-remove'), 'update-remove');
          x.type = 'button';
          x.dataset.key = `remove=${id}`;
          x.setAttribute('aria-label', UPDATE_COPY.removeSet(name));
          x.append(glyph('x'));
          // Focus goes to the next row's Remove, else the one before, else past To add.
          x.onclick = () => { const to = queue[i + 1] ?? queue[i - 1]; refocus = to ? `remove=${to}` : after; lend.queueSets([id], false); };
          row.append(x);
          list.append(row);
        });
        grp.append(list);
      } else {
        // Q3129.9 A, Q3129.10 A: a file that is not set up starts with nothing queued; Add all writes every set it lacks
        // into the queue, as Components' Select all does.
        grp.append(hook(h('p', 'p3-sub p3-upd-sub', UPDATE_COPY.queueFresh(addable.length)), 'update-add-line'),
          btn('p3-btn p3-btn-page p3-upd-addall', 'update-add-all', 'add-all', UPDATE_COPY.addAll(addable.length), () => { refocus = `remove=${addable[0]}`; lend.queueSets(addable, true); }));
      }
      comps.append(grp);
    }
    const sets = hook(h('div', 'p3-upd-group'), 'update-group-due');
    sets.append(h('span', 'p3-upd-subtitle', UPDATE_COPY.due));
    let handN = 0;
    if (updating.length) {
      sets.append(hook(h('p', 'p3-sub p3-upd-sub', UPDATE_COPY.dueSub(updating.length)), 'update-due-line'));
      const list = hook(h('div', 'p3-upd-sets'), 'update-due-sets');
      for (const id of updating) {
        const on = t.update.has(id);
        const d = f.due[id];
        const c = checkOf(id);
        const label: Node[] = [h('span', 'p3-upd-setname', nameOf(id))];
        if (d?.state === 'due') label.push(hook(h('span', 'p3-sg-tag', UPDATE_COPY.dueWhy(d)), 'update-set-due'));
        const box = check('update-due-set', `due=${id}`, on, label, () => {
          const next = new Set(t.update);
          if (on) next.delete(id); else next.add(id);
          ticks = { ...t, update: next };
        });
        box.dataset.id = id;
        const row = h('div', 'p3-upd-setrow');
        row.append(box, hook(h('p', 'p3-sub p3-upd-setline', c ? UPDATE_COPY.checked(c) : chk === 'pending' ? UPDATE_COPY.checkingSets : ''), 'update-set-check'));
        list.append(row);
        // #2831: on a published set, what the update breaks for library consumers, beside the set.
        if (c?.breaks && !c.blocked) list.append(hook(h('p', 'p3-sub p3-upd-setline', c.breaks), 'update-set-breaks'));
      }
      sets.append(list);
      if (chk && chk !== 'pending' && chk.error) sets.append(hook(h('p', 'p3-sg-error', UPDATE_COPY.checkError), 'update-check-error'));
      // One choice for every hand edit the update meets (the owner's starter-kit posture: Keep, by default). Since #3083
      // (the owner's Q3083.3 A) a compact select in the foot, before Cancel and Update file, built below.
      handN = [...t.update].reduce((n, id) => n + (checkOf(id)?.handEdited ?? r.handEdits.get(id)?.edited ?? 0), 0);
      if (t.update.size) sets.append(hook(h('p', 'p3-sub p3-upd-saves', UPDATE_COPY.saves), 'update-saves'));
    }
    if (unrec.length && !unrec.every((id) => t.update.has(id) || checkOf(id))) {
      // Built before the ledger: only the full check can say. Checked, each one with changes joins the update, ticked.
      const line = hook(h('div', 'p3-upd-handrow'), 'update-unrecorded');
      line.append(h('span', 'p3-sub', UPDATE_COPY.unrecorded(unrec.length)),
        btn('p3-btn p3-btn-page', 'update-check-unrecorded', 'unrecorded', UPDATE_COPY.checkUnrecorded(unrec.length), () => {
          checkedFor = [...due, ...unrec];
          lend.checkSets(checkedFor, t.theme);
        }));
      sets.append(line);
    }
    // Due is drawn while a set is due or unchecked (the check offered below); a file with neither has no Due group, and
    // with neither group there is no Components section.
    if (updating.length || unrec.length) comps.append(sets);
    if (comps.children.length > 1) body.push(comps);
    body.push(item('guides', t.guides, UPDATE_COPY.guides, UPDATE_COPY.guidesSub, () => { ticks = { ...t, guides: !t.guides }; }));
    const t2 = ticks ?? t;
    // The update waits on the check's answer: its counts are what the person reviews, and its hash what the update echoes.
    const updatable = answered ? updatableOf(t2, answered) : [];
    const steps = stepsOf({ ...t2, update: new Set(updatable) }, f, queue);
    const waiting = t2.update.size > 0 && !answered;
    const go = hook(h('button', 'p3-btn p3-btn-primary'), 'update-go');
    go.type = 'button';
    go.dataset.key = 'go';
    go.textContent = fresh ? UPDATE_COPY.goFresh : UPDATE_COPY.go;
    go.disabled = steps.length === 0 || !!r.off || waiting;
    if (r.off) go.title = r.off;
    go.onclick = () => {
      if (go.disabled || !answered && t2.update.size) return;
      const exact = !!answered && checkedFor !== null && updatable.length === checkedFor.length && updatable.every((id) => checkedFor!.includes(id));
      lend.run(steps, steps.includes('sets') ? queue : [],
        updatable.length && answered ? { defs: updatable, previewHash: exact ? answered.previewHash : '', checked: answered.sets, handEdits: t2.handEdits } : null);
      close();
    };
    const foot: HTMLElement[] = [btn('p3-btn p3-btn-page', 'update-cancel', 'cancel', UPDATE_COPY.cancel, close), go];
    if (handN > 0) {
      // #3083 (Q3083.3 A, Q3083.4 A): "Hand edits", then the select, its label tied to it; a repaint keeps focus on it.
      const wrap = hook(h('div', 'p3-upd-handsel'), 'update-hand-row');
      const lab = h('label', 'p3-sub', UPDATE_COPY.handEdits);
      lab.htmlFor = 'p3-upd-hand';
      const sw = h('div', 'p3-selwrap');
      const sel = hook(h('select', 'p3-select'), 'update-hand-edits');
      sel.id = 'p3-upd-hand';
      sel.dataset.key = 'hand';
      for (const k of ['keep', 'overwrite', 'accept'] as const) {
        const o = h('option', undefined, UPDATE_COPY.handChoice[k]);
        o.value = k;
        sel.append(o);
      }
      sel.value = t2.handEdits;
      sel.onchange = () => { ticks = { ...t2, handEdits: sel.value as HandEditChoice }; paint(); };
      sw.append(sel, glyph('chev'));
      wrap.append(lab, sw);
      foot.unshift(wrap);
    }
    return { body, foot };
  };

  const cleanBody = (): { body: HTMLElement[]; foot: HTMLElement[] } => {
    const r0 = lend.read();
    // Never after a failed restore: the brand on screen is then the demo's, and its preview would not be the file's.
    if (!pruneAsked && !r0.prune.busy && !r0.prune.preview && !r0.off) { pruneAsked = true; lend.pruneCheck(); }
    // Read again after asking: the dry run is out now, and the tab says so rather than drawing the reading from before.
    const r = lend.read();
    const p = r.prune;
    const body: HTMLElement[] = [h('p', 'p3-sub p3-upd-lead', UPDATE_COPY.cleanLead)];
    if (r.off) body.push(hook(h('p', 'p3-sg-error', r.off), 'clean-off'));
    const foot: HTMLElement[] = [btn('p3-btn p3-btn-page', 'update-cancel', 'cancel', UPDATE_COPY.close, close)];
    if (p.busy) body.push(hook(h('p', 'p3-upd-line', UPDATE_COPY.cleanChecking), 'clean-checking'));
    else if (p.preview) {
      body.push(hook(h('p', 'p3-upd-summary', p.preview.summary), 'clean-prune-summary'));
      const del = btn('p3-btn p3-btn-primary', 'clean-prune-confirm', 'prune', `Delete ${p.preview.count} item${p.preview.count === 1 ? '' : 's'}`, () => lend.pruneDelete());
      if (r.off) { del.disabled = true; del.title = r.off; }
      foot.push(del);
    } else if (p.verdict) body.push(hook(h('p', 'p3-upd-summary', p.verdict.count === 0 && !p.verdict.applied ? UPDATE_COPY.cleanNone : p.verdict.summary), 'clean-prune-result'));
    if (r.retired.length) {
      const box = hook(h('div', 'p3-upd-item'), 'clean-tables');
      const ul = h('ul', 'p3-sg-cleanup-list');
      for (const t of r.retired) ul.append(h('li', undefined, t.name));
      box.append(h('p', 'p3-upd-summary', UPDATE_COPY.cleanRetired(r.retired.length)), ul);
      body.push(box);
      const rm = btn('p3-btn p3-btn-primary', 'clean-tables-confirm', 'tables', UPDATE_COPY.removeTables(r.retired.length), () => lend.cleanUp(r.retired.map((t) => t.id)));
      rm.disabled = r.cleanupBusy;
      foot.push(rm);
    }
    return { body, foot };
  };

  const paint = (): void => {
    const r = lend.read();
    setBusy(button, !!r.run);
    const parts = badgeParts(r.catalog, r.fileSets, r.liveDue, r.queue);
    const n = parts.add + parts.due + (parts.theme ? 1 : 0);
    badge.textContent = n ? String(n) : '';
    badge.hidden = !n;
    if (n) button.setAttribute('aria-label', UPDATE_COPY.badgeName(parts)); else button.removeAttribute('aria-label');
    // Busy, it still opens the overlay (the step running, and Stop), so it is not announced as unavailable.
    button.removeAttribute('aria-disabled');
    if (!open) { if (layer.firstChild) layer.replaceChildren(); return; }
    const focused = refocus ?? (document.activeElement instanceof HTMLElement && layer.contains(document.activeElement) ? document.activeElement.dataset.key ?? null : null);
    refocus = null;
    // #3082: a repaint (a tick, a host answer) keeps where the body was scrolled, on the same tab; a new tab starts at the top.
    const was = layer.querySelector<HTMLElement>('[data-p3="update-body"]');
    const scrolled = was && was.dataset.tab === tab ? was.scrollTop : 0;
    const scrim = h('div', 'p3-bardlg-scrim');
    const dlg = hook(h('div', 'p3-bardlg p3-upd'), 'update-dialog');
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-label', UPDATE_COPY.title);
    dlg.tabIndex = -1;
    dlg.addEventListener('keydown', (e) => {
      trapTab(dlg, e);
      if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); close(); }
    });
    const head = h('div', 'p3-bardlg-head');
    head.append(h('h2', 'p3-bardlg-title', UPDATE_COPY.title));
    const x = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon'), 'update-x');
    x.type = 'button';
    x.dataset.key = 'x';
    x.setAttribute('aria-label', UPDATE_COPY.close);
    x.append(glyph('x'));
    x.onclick = close;
    head.append(x);
    const tabs = h('div', 'p3-tabs p3-upd-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', UPDATE_COPY.title);
    const tabBtns = (['update', 'clean'] as const).map((k) => {
      const b = hook(h('button', 'p3-tab', k === 'update' ? UPDATE_COPY.tabUpdate : UPDATE_COPY.tabClean), `update-tab-${k}`);
      b.type = 'button';
      b.dataset.key = `tab=${k}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(tab === k));
      b.tabIndex = tab === k ? 0 : -1;
      b.onclick = () => { tab = k; paint(); };
      return b;
    });
    tabs.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      tab = tab === 'update' ? 'clean' : 'update';
      paint();
      layer.querySelector<HTMLElement>(`[data-key="tab=${tab}"]`)?.focus();
    });
    tabs.append(...tabBtns);
    const { body, foot } = tab === 'update' ? updateBody() : cleanBody();
    const bodyEl = hook(h('div', 'p3-bardlg-col p3-upd-body'), 'update-body');
    bodyEl.setAttribute('role', 'tabpanel');
    bodyEl.dataset.tab = tab;
    bodyEl.append(...body);
    const footEl = h('div', 'p3-bardlg-foot');
    footEl.append(...foot);
    dlg.append(head, tabs, bodyEl, footEl);
    scrim.onmousedown = (e) => { if (e.target === scrim) { e.preventDefault(); close(); } };
    scrim.append(dlg);
    layer.replaceChildren(scrim);
    bodyEl.scrollTop = scrolled;
    // A control gone from the repaint (Theme's box while its toggle checks the file again, #3023) leaves focus on the
    // dialog, never outside the modal.
    if (focused) (layer.querySelector<HTMLElement>(`[data-key="${CSS.escape(focused)}"]`) ?? dlg).focus({ preventScroll: true });
    else if (!dlg.contains(document.activeElement)) (focusables(dlg)[0] ?? dlg).focus({ preventScroll: true });
  };
  for (const t of ['host', 'host:update', 'host:components', 'host:filesetup', 'host:styleguide', 'host:sgpage'] as const) cleanups.push(subscribe(t, paint));
  cleanups.push(() => layer.replaceChildren());
  paint();
  return { button, layer };
};
