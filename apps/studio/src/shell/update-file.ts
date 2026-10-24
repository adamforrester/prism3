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
 * CLEAN UP: Prune stale, moved here with its own preview (Q668 A): the preview runs as the tab opens and writes nothing;
 * its Delete is the confirmed prune. It never rides Update. The style guide's retired tables (Q412 A) are offered here
 * too, after a run that found some.
 *
 * DIALOG: modal (`aria-modal`), focus into it as it opens and back to the button as it closes, by any path; Escape and a
 * click on the scrim close it; Tab stays inside (`trapTab`). A repaint keeps focus on the same control (`data-key`).
 *
 * It names no legacy repaint tier (`test-shell-imports.ts`): it reads through `lend.read` and repaints on the host topics.
 * Every string is a DRAFT placeholder (Q2909.10 A), in `UPDATE_COPY`.
 */
import { subscribe } from '../state/store';
import type { Catalog } from '../state/component-catalog';
import { defaultTicks, newSetsOf, stepOf, stepsOf, STEP_TITLE, UPDATE_COPY, type FileSets, type StepKey, type Ticks, type UpdateRun } from '../state/update-file';
import { focusables, glyph, h, hook, pendingLabel, setBusy, trapTab } from './dom';

export type UpdateFileLend = {
  readonly read: () => {
    /** The file's sets and setup state, as the host last answered; `null` before the first answer. */
    readonly fileSets: FileSets | null;
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
  };
  /** Ask the host which sets the file holds (`file-sets-request`). */
  readonly check: () => void;
  readonly run: (steps: readonly StepKey[], sets: readonly string[]) => void;
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
  const layer = hook(h('div', 'p3-bardlg-layer'), 'update-layer');

  let open = false;
  let tab: 'update' | 'clean' = 'update';
  /** The answer the overlay waits for: the `fileSets` reading from before it asked. */
  let asked: FileSets | null | undefined;
  let ticks: Ticks | null = null;
  /** Clean up's preview was asked for in this opening. */
  let pruneAsked = false;

  const show = (): void => {
    if (open) return;
    open = true;
    tab = 'update';
    pruneAsked = false;
    if (!lend.read().run) { asked = lend.read().fileSets; ticks = null; lend.check(); }
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
  const item = (key: Exclude<StepKey, 'sets'>, on: boolean, title: string, sub: string, toggle: () => void): HTMLElement => {
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
    if (asked !== undefined && f === asked) return { body: [hook(h('p', 'p3-upd-line', UPDATE_COPY.checking), 'update-checking')], foot: [btn('p3-btn p3-btn-page', 'update-cancel', 'cancel', UPDATE_COPY.cancel, close)] };
    if (!f || f.error) return { body: [hook(h('p', 'p3-sg-error', UPDATE_COPY.readError), 'update-read-error')], foot: [btn('p3-btn p3-btn-page', 'update-cancel', 'cancel', UPDATE_COPY.cancel, close)] };
    asked = undefined;
    ticks ??= defaultTicks(r.catalog, f);
    const t = ticks;
    const fresh = !f.setUp;
    const body: HTMLElement[] = [];
    // A run that stopped on a failed step says so here, so a step that refused to start is never silent.
    if (r.stopped) body.push(hook(h('p', 'p3-sg-error', UPDATE_COPY.stopped(STEP_TITLE[r.stopped.step], r.stopped.headline)), 'update-stopped'));
    body.push(h('p', 'p3-sub p3-upd-lead', fresh ? UPDATE_COPY.leadFresh : UPDATE_COPY.lead));
    if (fresh) body.push(item('setup', t.setup, UPDATE_COPY.setup, UPDATE_COPY.setupSub, () => { ticks = { ...t, setup: !t.setup }; }));
    body.push(item('theme', t.theme, UPDATE_COPY.theme, UPDATE_COPY.themeSub, () => { ticks = { ...t, theme: !t.theme }; }));
    // The sets: the item's head says how many are not in the file; each is its own box.
    const fresh2 = newSetsOf(r.catalog, f);
    const sets = hook(h('div', 'p3-upd-item'), 'update-item-sets');
    sets.append(h('b', 'p3-upd-title', UPDATE_COPY.sets), h('p', 'p3-sub p3-upd-sub', UPDATE_COPY.setsSub(fresh2.length)));
    if (fresh2.length) {
      const list = hook(h('div', 'p3-upd-sets'), 'update-sets');
      for (const id of fresh2) {
        const name = r.catalog.find((e) => e.id === id)?.name ?? id;
        const on = t.sets.has(id);
        const box = check('update-set', `set=${id}`, on, [h('span', 'p3-upd-setname', name), hook(h('span', 'p3-sg-tag', UPDATE_COPY.setNew), 'update-set-new')], () => {
          const next = new Set(t.sets);
          if (on) next.delete(id); else next.add(id);
          ticks = { ...t, sets: next };
        });
        box.dataset.id = id;
        list.append(box);
      }
      sets.append(list);
    }
    body.push(sets, item('guides', t.guides, UPDATE_COPY.guides, UPDATE_COPY.guidesSub, () => { ticks = { ...t, guides: !t.guides }; }));
    const steps = stepsOf(t, f);
    const go = hook(h('button', 'p3-btn p3-btn-primary'), 'update-go');
    go.type = 'button';
    go.dataset.key = 'go';
    go.textContent = fresh ? UPDATE_COPY.goFresh : UPDATE_COPY.go;
    go.disabled = steps.length === 0 || !!r.off;
    if (r.off) go.title = r.off;
    go.onclick = () => {
      if (go.disabled) return;
      lend.run(steps, steps.includes('sets') ? fresh2.filter((id) => t.sets.has(id)) : []);
      close();
    };
    return { body, foot: [btn('p3-btn p3-btn-page', 'update-cancel', 'cancel', UPDATE_COPY.cancel, close), go] };
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
    // Busy, it still opens the overlay (the step running, and Stop), so it is not announced as unavailable.
    button.removeAttribute('aria-disabled');
    if (!open) { if (layer.firstChild) layer.replaceChildren(); return; }
    const focused = document.activeElement instanceof HTMLElement && layer.contains(document.activeElement) ? document.activeElement.dataset.key ?? null : null;
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
    bodyEl.append(...body);
    const footEl = h('div', 'p3-bardlg-foot');
    footEl.append(...foot);
    dlg.append(head, tabs, bodyEl, footEl);
    scrim.onmousedown = (e) => { if (e.target === scrim) { e.preventDefault(); close(); } };
    scrim.append(dlg);
    layer.replaceChildren(scrim);
    if (focused) layer.querySelector<HTMLElement>(`[data-key="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
    else if (!dlg.contains(document.activeElement)) (focusables(dlg)[0] ?? dlg).focus({ preventScroll: true });
  };
  for (const t of ['host', 'host:update', 'host:components', 'host:filesetup', 'host:styleguide', 'host:sgpage'] as const) cleanups.push(subscribe(t, paint));
  cleanups.push(() => layer.replaceChildren());
  paint();
  return { button, layer };
};
