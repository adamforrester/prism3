/**
 * Brand, the levers panel (UI redesign S3; concept v6's Brand page, IA-1, v5 answer 4, T2, Q3).
 *
 * WHAT IT DRAWS, in v6's order, from the page's sections in `shell/pages.ts`: the page intro; Identity, with
 * Brand name and Token namespace side by side at every width (v5 answer 4) and the namespace notes spanning
 * both; Personality, the engine's words as chips with what each sets; Modes, Light always on, a check per
 * mode the brand can turn on or off, and the custom modes. Each schema input homed here draws its `lever-*`
 * block exactly once (`lever-id`, `lever-root`, `lever-personality`, `lever-modes`, `lever-custom-modes`).
 *
 * THE NAMESPACE (T2, F5, Q9). The field holds a draft. A reserved or placeholder namespace (`prism`, `pds3`)
 * warns before export, whether it is the brand's or the draft's. A draft that differs says what a rename
 * breaks and offers Rename namespace, which asks once more in place before it renames every token path.
 * Nothing reaches the brand until that confirm. The name writes per keystroke without a rebuild (#1196).
 *
 * MODES (Q3). High contrast dark follows dark, so turning dark off turns it off too: the confirm says so,
 * lists what each mode drops and gives the new verdict count, and high contrast dark stays off and locked
 * while dark is off. Concept v6 drew that confirm as a dialog; here it is drawn in place, under the modes.
 *
 * HOW IT REPAINTS: by store subscription only (plan §5), as Color › Palettes does. A control writes through
 * `state/brand-input.ts` and calls `rebuild()`; the `brand` topic tells this panel, the preview and the
 * chrome. The panel redraws whole only when its SHAPE changes (a custom mode added, removed or renamed, a
 * confirm opened or closed); otherwise each control updates in place and a focused field is left alone. It
 * never names a legacy repaint tier and never imports `main.ts` (`test-shell-imports.ts`).
 *
 * SEARCH (Q3) filters this panel in place, by each lever's label, description and key.
 */
import { brandState, currentMode, lastError, rebuild, rp, searchQuery, setCurrentMode, setPage, setSearchHits, subscribe, theme } from '../state/store';
import {
  MODE_NAME, MODE_ROWS, PERSONALITY_WORDS, ROOT_RE, addCustomMode, currentRoot, customModes, hcDarkLocked, modesOn, namespaceNote,
  personality, planModeOff, removeCustomMode, renameCustomMode, renameNamespace, setCustomBase, setModeOff, setModeOn, setName, setPersonality,
  customModesBasedOn,
  traitLevers, modeDrops,
} from '../state/brand-input';
import { verdictOf } from '../state/verdict';
import { DOMAINS, type PageData, type Section } from '../shell/pages';
import { glyph, h, hook } from '../shell/dom';
import { checkRow, inlineConfirm, leverBlock, leverOf, selectField, setText, stateLine, subLine, textField, toggleChip, type LeverBlock } from '../ui/lever-kit';

const PAGE = DOMAINS.find((d) => d.id === 'brand') as PageData;
const plural = (n: number, one: string): string => `${n} ${n === 1 ? one : `${one}s`}`;

type Drawn = { block: LeverBlock; keys: readonly string[]; sync: () => void };
type Built = { nodes: HTMLElement[]; drawn: Drawn[] };
/** A confirm open in the panel: the namespace rename, a mode turned off, or a custom mode removed. */
type Confirm = { kind: 'rename' } | { kind: 'modeoff'; mode: (typeof MODE_ROWS)[number]['mode'] } | { kind: 'cmremove'; i: number } | null;

/** Mount the Brand levers into `host`. Everything it subscribes to is released through `cleanups`, which
 *  the frame runs when the page goes. */
export const mountBrandLevers = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const root = hook(h('div', 'p3-levers-body'), 'brand-levers');
  host.replaceChildren(root);
  let drawn: Drawn[] = [];
  let shapeKey = '';
  /** The key the last edit wrote, so an engine refusal marks the lever that caused it. */
  let lastEdited: string | null = null;
  /** The namespace as typed, until it is renamed or the brand's own namespace moves under it. */
  let rootDraft: string | null = null;
  let rootSeen = currentRoot();
  let confirm: Confirm = null;

  /** A lever whose last edit the engine refused before it reached the brand (a Dark off with a custom mode
   *  still based on dark): the brand is untouched, and the lever says it was refused. */
  let refusedHere: string | null = null;
  const edit = (key: string, write: () => void): void => {
    lastEdited = key;
    refusedHere = null;
    write();
    rebuild();
    // A mode turned off may be the one the preview shows: the preview goes back to the first mode.
    if (!(rp.modes as readonly string[]).includes(currentMode)) setCurrentMode(rp.modes[0]);
  };
  const shape = (): string => JSON.stringify([confirm, customModes().map((c) => [c.name, c.base]), modesOn().includes('dark')]);
  const focusHook = (role: string): HTMLElement | null => root.querySelector<HTMLElement>(`[data-p3="${role}"]`);
  /** Turn a mode off, atomically (`setModeOff`): taken whole, or refused with the brand left as it was. */
  const turnOff = (mode: (typeof MODE_ROWS)[number]['mode']): void => {
    if (setModeOff(mode) === null) { edit('modes', () => {}); return; }
    lastEdited = 'modes';
    refusedHere = 'modes';
    render();
  };

  // ── Identity: name and namespace side by side, the notes under both ─────────────────────────────
  const identity = (): Built => {
    const nameB = leverBlock('id', { label: 'Brand name', forId: 'p3-brand-name' });
    const name = textField('p3-brand-name', 'brand-name', { onInput: (v) => { lastEdited = 'id'; setName(v); } });
    nameB.ctl.append(name.el);
    const rootB = leverBlock('root', { label: 'Token namespace', forId: 'p3-brand-namespace', desc: 'Every token path starts with it. Renaming it renames every path.' });
    const ns = textField('p3-brand-namespace', 'brand-namespace', { mono: true, describedBy: 'p3-namespace-note', onInput: (v) => { rootDraft = v; paintNotes(); } });
    rootB.ctl.append(ns.el);
    const row = hook(h('div', 'p3-idrow'), 'identity-row');
    row.append(nameB.el, rootB.el);
    const notes = hook(h('div', 'p3-idnotes'), 'namespace-note');
    notes.id = 'p3-namespace-note';
    notes.setAttribute('aria-live', 'polite');
    let notesSig = '';
    function paintNotes(): void {
      const cur = currentRoot();
      const draft = rootDraft ?? cur;
      const next = draft.trim();
      const n = namespaceNote(draft);
      const renames = next !== cur && ROOT_RE.test(next);
      // Repainted only when what it says changes, so a keystroke that leaves the notes alone costs nothing.
      const sig = JSON.stringify([n, renames && next, cur, confirm?.kind === 'rename']);
      if (sig === notesSig) return;
      notesSig = sig;
      const parts: HTMLElement[] = [];
      const line = stateLine(n.text, n.kind === 'hint' ? 'hint' : 'warn');
      parts.push(hook(line, n.kind === 'warn' ? 'namespace-warning' : n.kind === 'bad' ? 'namespace-invalid' : 'namespace-path'));
      if (renames) {
        parts.push(hook(stateLine(`Renames every token path: ${cur}.color.text.primary becomes ${next}.color.text.primary. Consumers referencing the old names stop resolving.`, 'warn'), 'namespace-renames'));
        if (confirm?.kind === 'rename') {
          parts.push(inlineConfirm('namespace-confirm', {
            title: `Rename namespace to ${next}`,
            body: [`Every token path changes: ${cur}.color.text.primary becomes ${next}.color.text.primary.`,
              'Consumers referencing the old names stop resolving, with no error. The contract version tracks names, so plan the rename with the teams that consume these tokens.'],
            action: 'Rename every token path',
            onConfirm: () => { confirm = null; if (renameNamespace(next)) { rootDraft = null; edit('root', () => {}); } else paintNotes(); },
            onCancel: () => { confirm = null; paintNotes(); },
            back: () => focusHook('brand-namespace'),
          }));
        } else {
          const go = hook(h('button', 'p3-btn p3-btn-page'), 'namespace-rename');
          go.type = 'button';
          go.append(h('span', 'p3-btn-label', 'Rename namespace'));
          go.onclick = () => { confirm = { kind: 'rename' }; paintNotes(); };
          const wrap = h('div', 'p3-idnotes-row');
          wrap.append(go);
          parts.push(wrap);
        }
      } else if (confirm?.kind === 'rename') confirm = null;
      notes.replaceChildren(...parts);
    }
    return {
      nodes: [row, notes],
      drawn: [
        { block: nameB, keys: ['id'], sync: () => name.set(brandState.id) },
        { block: rootB, keys: ['root'], sync: () => {
          // The brand's namespace moved under the draft (a rename, a brand load): the draft goes.
          if (currentRoot() !== rootSeen) { rootSeen = currentRoot(); if (document.activeElement !== ns.el) rootDraft = null; }
          ns.set(rootDraft ?? currentRoot());
          paintNotes();
        } },
      ],
    };
  };

  // ── Personality: the engine's words, and what each fills ─────────────────────────────────────────
  const personalityRow = (): Built => {
    const b = leverBlock('personality', { label: 'Personality words', group: true });
    const chips = hook(h('div', 'p3-chips'), 'personality-words');
    const set = PERSONALITY_WORDS.map((w) => {
      const c = toggleChip('personality-word', w, (on) => edit('personality', () => setPersonality(w, on)));
      chips.append(c.el);
      return c;
    });
    const sub = subLine('');
    b.ctl.append(chips, sub);
    return {
      nodes: [b.el],
      drawn: [{ block: b, keys: ['personality'], sync: () => {
        const on = personality();
        set.forEach((c, i) => c.set(on.includes(PERSONALITY_WORDS[i])));
        // Concept v6: each word on, with the settings it fills. The section's own line says the rule.
        setText(sub, on.map((w) => `${w}: ${traitLevers(w).map(([k, v]) => `${leverOf(k)?.label ?? k} → ${v}`).join(', ')}`).join('. ') + (on.length ? '.' : ''));
        sub.hidden = !on.length;
      } }],
    };
  };

  // ── Modes: Light always, a check per mode, the dark-off confirm, the custom modes ──────────────────
  const modesRow = (): Built => {
    const b = leverBlock('modes', { label: 'Modes on', group: true });
    const list = h('div', 'p3-checks');
    const light = hook(h('div', 'p3-check p3-check-fixed'), 'mode-on-light');
    const lbox = h('span', 'p3-check-box');
    lbox.setAttribute('aria-hidden', 'true');
    lbox.append(glyph('check'));
    const ltext = h('span', 'p3-check-text');
    ltext.append(h('span', 'p3-check-name', 'Light'), h('span', 'p3-check-note', 'Always generated: it’s the base mode.'));
    light.append(lbox, ltext);
    list.append(light);
    const rows = MODE_ROWS.map((r) => {
      const c = checkRow(`p3-mode-on-${r.mode}`, `mode-on-${r.mode}`, r.name, (on) => {
        if (on) { edit('modes', () => setModeOn(r.mode)); return; }
        if (planModeOff(r.mode).confirm || customModesBasedOn(r.mode).length) { confirm = { kind: 'modeoff', mode: r.mode }; render(); return; }
        turnOff(r.mode);
      });
      list.append(c.el);
      return { r, c };
    });
    b.ctl.append(list);
    if (confirm?.kind === 'modeoff') b.ctl.append(modeOffConfirm(confirm.mode));

    const cb = leverBlock('customModes', { label: 'Custom modes' });
    const cl = h('div', 'p3-list');
    const dark = modesOn().includes('dark');
    const syncs: (() => void)[] = [];
    customModes().forEach((c, i) => {
      const row = hook(h('div', 'p3-cmrow'), 'custom-mode-row');
      const nm = textField(`p3-cm-name-${i}`, 'custom-mode-name', { label: 'Custom mode name', onCommit: (v, f) => {
        if (!renameCustomMode(i, v)) { f.value = customModes()[i]?.name ?? c.name; return; }
        edit('customModes', () => {});
      } });
      const base = selectField(`p3-cm-base-${i}`, `Base of ${c.name}`, 'custom-mode-base', (v) => edit('customModes', () => setCustomBase(i, v as 'light' | 'dark')));
      const based = h('span', 'p3-cm-based', 'Based on');
      const rm = hook(h('button', 'p3-btn p3-btn-page'), 'custom-mode-remove');
      rm.type = 'button';
      rm.append(h('span', 'p3-btn-label', `Remove ${c.name}`));
      rm.onclick = () => {
        if (modeDrops(c.name).length) { confirm = { kind: 'cmremove', i }; render(); return; }
        edit('customModes', () => removeCustomMode(i));
      };
      row.append(nm.el, based, base.el, rm);
      cl.append(row);
      if (confirm?.kind === 'cmremove' && confirm.i === i) cl.append(customRemoveConfirm(i));
      syncs.push(() => {
        const cur = customModes()[i];
        if (!cur) return;
        nm.set(cur.name);
        // A mode can be based only on a mode the brand ships (the legacy add form's rule), so dark is offered
        // while dark is on, and kept while a mode is based on it.
        base.set([{ v: 'light', l: 'light' }, ...(dark || cur.base === 'dark' ? [{ v: 'dark', l: 'dark' }] : [])], cur.base);
      });
    });
    const addRow = h('div', 'p3-cmadd');
    const add = hook(h('button', 'p3-btn p3-btn-page'), 'custom-mode-add');
    add.type = 'button';
    add.append(glyph('plus'), h('span', 'p3-btn-label', 'Add custom mode'));
    add.onclick = () => {
      edit('customModes', () => { addCustomMode(); });
      const names = root.querySelectorAll<HTMLInputElement>('[data-p3="custom-mode-name"]');
      names[names.length - 1]?.focus();
    };
    addRow.append(add, h('span', 'p3-sub', 'Copies light or dark, then takes its own overrides.'));
    cl.append(addRow);
    cb.ctl.append(cl);

    return {
      nodes: [b.el, cb.el],
      drawn: [
        { block: b, keys: ['modes'], sync: () => {
          const on = modesOn();
          for (const { r, c } of rows) {
            const locked = r.mode === 'hc-dark' && hcDarkLocked();
            c.set(on.includes(r.mode) && !locked, locked ? 'Off while dark is off: it follows dark.' : r.note, locked);
          }
        } },
        { block: cb, keys: ['customModes'], sync: () => syncs.forEach((f) => f()) },
      ],
    };
  };

  /** Q3's confirm: what turning a mode off takes with it, what it drops, and what the verdict becomes. */
  const modeOffConfirm = (mode: (typeof MODE_ROWS)[number]['mode']): HTMLElement => {
    const plan = planModeOff(mode);
    const v = verdictOf(theme, rp.modes);
    const pairs = plan.off.reduce((n, m) => n + (v.per.find((p) => p.mode === m)?.n ?? 0), 0);
    const body: (string | HTMLElement)[] = [];
    if (plan.off.length > 1) body.push(`High contrast dark follows dark, so it turns off too. The two modes’ ${plural(pairs, 'pair')} leave the verdict (${v.total} becomes ${v.total - pairs}).`);
    if (plan.drops.length) {
      const ul = hook(h('ul', 'p3-confirm-list'), 'mode-off-drops');
      for (const d of plan.drops) ul.append(h('li', undefined, d));
      body.push(ul);
    } else body.push(plan.off.length > 1 ? 'No overrides are set in either mode.' : 'No overrides are set in this mode.');
    // A custom mode based on this one makes the engine refuse the change, so the confirm says so first
    // (orchestrator review of #1939). Confirming anyway is refused whole, and the brand stays as it was.
    const based = customModesBasedOn(mode);
    if (based.length) {
      body.push(hook(h('p', 'p3-confirm-line', `${based.length === 1 ? 'Custom mode' : 'Custom modes'} ${based.join(', ')} ${based.length === 1 ? 'is' : 'are'} based on ${MODE_NAME[mode]}, so turning ${MODE_NAME[mode]} off is refused until ${based.length === 1 ? 'it is' : 'they are'} based on Light or removed.`), 'mode-off-based'));
    }
    body.push(`Turning ${MODE_NAME[mode]} on again starts from Auto.`);
    return inlineConfirm('mode-off-confirm', {
      // Every item the list names counts: role overrides, per-mode settings, anchors and surfaces.
      title: `Turn off ${MODE_NAME[mode]}${plan.off.length > 1 ? ' and high contrast dark' : ''}${plan.drops.length ? `: drops ${plural(plan.drops.length, 'setting')}` : ''}`,
      body,
      action: plan.off.length > 1 ? 'Turn off both modes' : `Turn off ${MODE_NAME[mode]}`,
      onConfirm: () => { confirm = null; turnOff(mode); },
      onCancel: () => { confirm = null; render(); },
      back: () => focusHook(`mode-on-${mode}`),
    });
  };

  /** Removing a custom mode that carries overrides: concept v6 lists what goes first. */
  const customRemoveConfirm = (i: number): HTMLElement => {
    const c = customModes()[i];
    const drops = modeDrops(c.name);
    const ul = h('ul', 'p3-confirm-list');
    for (const d of drops) ul.append(h('li', undefined, d));
    return inlineConfirm('custom-mode-confirm', {
      title: `Remove ${c.name}: drops ${plural(drops.length, 'setting')}`,
      body: [ul],
      action: `Remove ${c.name}`,
      onConfirm: () => { confirm = null; edit('customModes', () => removeCustomMode(i)); },
      onCancel: () => { confirm = null; render(); },
      back: () => focusHook('custom-mode-add'),
    });
  };

  const ROWS: Record<string, () => Built> = { identity, personality: personalityRow, modes: modesRow };

  // ── the page ──────────────────────────────────────────────────────────────────────────────────
  const section = (s: Section, i: number): { el: HTMLElement; drawn: Drawn[] } => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-brand-${i}`;
    const head = h('div', 'p3-lsec-head');
    const title = h('h3', 'p3-lsec-title', s.title);
    title.id = `${el.id}-t`;
    el.setAttribute('aria-labelledby', title.id);
    head.append(title);
    if (s.desc) head.append(h('p', 'p3-lsec-desc', s.desc));
    el.append(head);
    const out: Drawn[] = [];
    for (const r of s.rows) {
      const x = ROWS[r.ctl]?.();
      if (!x) continue;
      el.append(...x.nodes);
      out.push(...x.drawn);
    }
    return { el, drawn: out };
  };

  function render(): void {
    const had = document.activeElement as HTMLElement | null;
    const focusKey = had && root.contains(had) ? had.getAttribute('data-p3') : null;
    const focusIndex = focusKey ? [...root.querySelectorAll(`[data-p3="${focusKey}"]`)].indexOf(had!) : -1;
    shapeKey = shape();
    drawn = [];
    const parts: HTMLElement[] = [h('p', 'p3-intro', PAGE.intro)];
    PAGE.sections.forEach((s, i) => { const x = section(s, i); parts.push(x.el); drawn.push(...x.drawn); });
    // The way on to the next tab, as concept v6 ends the page: Color opens on Palettes.
    const next = hook(h('button', 'p3-btn p3-btn-page p3-next'), 'brand-continue');
    next.type = 'button';
    next.append(h('span', 'p3-btn-label', 'Continue to Color › Palettes'), glyph('chevr'));
    next.onclick = () => setPage('palettes');
    const nextRow = h('div', 'p3-nextrow');
    nextRow.append(next);
    parts.push(nextRow);
    root.replaceChildren(...parts);
    sync();
    filter();
    if (focusKey && !root.querySelector('.p3-confirm')) [...root.querySelectorAll<HTMLElement>(`[data-p3="${focusKey}"]`)][Math.max(0, focusIndex)]?.focus({ preventScroll: true });
  }

  const sync = (): void => {
    for (const d of drawn) {
      d.sync();
      d.block.setRefused((!!lastError && !!lastEdited && d.keys.includes(lastEdited)) || (!!refusedHere && d.keys.includes(refusedHere)));
    }
  };

  /** Search (Q3): hide what does not match, report the count. */
  const filter = (): void => {
    const q = searchQuery.trim().toLowerCase();
    for (const d of drawn) d.block.el.hidden = !!q && !d.block.said.includes(q);
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) s.hidden = !!q && !s.querySelector('.p3-lever:not([hidden])');
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro, .p3-idnotes, .p3-nextrow')) n.hidden = !!q;
    setSearchHits(q ? drawn.filter((d) => !d.block.el.hidden).length : null);
  };

  cleanups.push(subscribe('brand', () => { if (shape() !== shapeKey) render(); else sync(); }));
  cleanups.push(subscribe('search', filter));
  // Leaving the page clears its count, so the next page's search starts from its own.
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  render();
};
