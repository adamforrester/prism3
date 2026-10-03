/**
 * Color › Interactive, the levers panel (UI redesign S5.2; concept v6's Interactive page).
 *
 * WHAT IT DRAWS, from the page's sections in `shell/pages.ts`, titled as the preview's sections (owner decision
 * Q51): the intro, then jump links to each button set (Q33; "column" in code, never in copy, Q53);
 * **Interactive** (the page-wide settings, the action palette, the outline hover and the strict contrast switch,
 * QA-I5; then a group per button set, Primary, Neutral, Destructive, then each accent, every color it carries as a
 * row, its hover and pressed under it, the Neutral set opening on its neutral emphasis, QA-I6; then the dashed add
 * button, whose color select shows only once it is clicked, QA-I4); **Disabled** (the "Full contrast" switch, and
 * the floor chips only while it is off, QA-I8); **Links** (the link palette, the three state rungs, each select
 * on its own line, QA-I9, and the four link families' resting link). Every lever is shown (R2), except the floor
 * chips under Full. Last, the way on to Type.
 *
 * NO ICONS SECTION (S5.3, the owner's QA-I10): the icon contrast control left this page. Surfaces & fills' Icon
 * section writes `iconContrast` (Unpair and Pair), and the preview dropped its Icons section with it, so the lever
 * sections and the preview's still match one for one (Q23).
 *
 * EVERY PER-COLUMN COLOR IS A ROW (owner decision Q33, replacing v6's "per-role in the Roles matrix only",
 * which Q31 deferred): `INTERACTIVE_ROWS` / `interactiveRowsFor` in `state/interactive-input.ts`, in the
 * legacy page's order. A row is S4a's fill row (a swatch, its name and role, and a button that opens the step
 * picker under it, the ratio on it); a translucent wash has no ramp step to pick, so its row reads the
 * primitive out instead (#1210). All groups start expanded.
 *
 * WHICH MODE A ROW EDITS (owner decisions Q22, Q34): the mode the preview shows, as the legacy page edited the
 * mode its strip showed. A column anchor in Light is the column's global field; in any other mode it is
 * `modeAnchors` (`setAnchor`). A button set exists across every mode, so it is added and removed from any
 * editable mode (Q54). A derived mode is read-only, EVERY lever on the page, brand-wide ones included (Q59),
 * under S4a's approved line, once at the top.
 *
 * BEHAVIOR-NEUTRAL (the S2 rule). Every write goes through `state/interactive-input.ts`, which writes what the
 * legacy page wrote, byte for byte on the persisted brand. The option sets are the legacy page's (owner
 * decision Q35): every anchor step, the promotable palettes without Primary, the action palette without
 * Neutral (#1811). Two writes the legacy page had no control for: the link palette's Auto (Q36), which UNSETS
 * the key, and the strict contrast switch, whose off UNSETS it, so an untouched brand stays byte-identical.
 *
 * HOW IT REPAINTS: by store subscription only (plan §5), as `domains/color-fills.ts`: a control writes and
 * calls `rebuild()`; the panel is redrawn whole, keeping focus on the element that had it. It never names a
 * legacy repaint tier and never imports `main.ts` (`test-shell-imports.ts`).
 */
import { normalizeDisabledStrategy } from '@prism3/engine/theme';
import { brandState, currentMode, getPath, lastError, rebuild, searchQuery, setPage, setSearchHits, subscribe, theme } from '../state/store';
import { isDerived } from '../state/verdict';
import { overrideOf, rolesIn, stepHex, stepOfPath, stepsOf } from '../state/fills-input';
import {
  BUILT_IN_COLUMNS, LINK_ROWS, addAccent, anchorOf, baselineAnchorStepOf, baselineStepOf, interactivePaletteOf, interactiveRowsFor,
  removeAccent, setLever, setLinkPalette, setLinkRung, setStrictInteractiveContrast, stepKeyOf, writeInteractiveRow,
  type InteractiveRow, type LinkRungState,
} from '../state/interactive-input';
import { paletteRefOptions } from '../levers/controls';
import { DOMAINS, type PageData, type Section } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { glyph, h, hook } from '../shell/dom';
import { addRowButton, choice, jumpLabel, leverBlock, leverOf, selectField, stateLine, subLine, switchButton, type LeverBlock } from '../ui/lever-kit';
import { noteSectionEdit, scrollToStart } from '../preview/follow-edit';
import { fmtRatio, stepPicker, type PickerPalette } from '../ui/step-picker';

/** The button sets lever's info text (owner-approved, 2026-10-02). */
export const BUTTON_SET_TOOLTIP = 'Add a button set from any brand color on Palettes. Each set gets fill, text, border and state colors in every mode.';

const PAGE = (DOMAINS.find((d) => d.id === 'color') as { subpages: readonly PageData[] }).subpages.find((p) => p.id === 'interactive')!;
/** The page the Continue button opens: the next tab, Type, by the store's page key (its legacy page until S6). */
const NEXT = { label: 'Type', page: 'typography' } as const;

/** Owner decision Q38, verbatim (APPROVED). */
export const STRICT_CAPTION = 'Off: inverse button labels clear 4.5:1 at rest and may dip on hover and pressed. On: they clear 4.5:1 in every state.';
/** Owner decisions Q40 and Q53, verbatim (APPROVED). */
export const ADD_COLUMN_HINT = 'Add a brand color on Palettes to use it for another button set.';
/** Owner decision Q53, verbatim (APPROVED): no "column" in visible copy; a column is a button set. */
export const BUTTON_SET_COPY = {
  add: 'Add button set',
  select: 'Color for the new button set',
  remove: 'Remove button set',
  removeLabel: (name: string): string => `Remove the ${name} button set`,
  landmark: 'Button sets',
} as const;
/** The Disabled switch (the owner's QA-I8 answer, APPROVED verbatim, 2026-10-02): its label and its caption
 *  in each state. */
export const DISABLED_SWITCH = {
  label: 'Full contrast',
  on: 'Disabled controls keep full contrast.',
  off: 'Disabled controls drop to the floor you pick.',
} as const;
/** The link palette's Auto (owner decision Q36). */
export const LINK_AUTO = 'Auto: follows action palette';
/** The legacy page's promotable list never offered these: they are the built-in columns' names. */
const RESERVED_COLUMNS = new Set(['primary', 'neutral', 'destructive']);

const capWord = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
/** A column name safe in an element id. */
const idOf = (col: string): string => `p3-icol-${col.replace(/[^a-z0-9-]/gi, '-')}`;

/** A resolved role, with the two fields a translucent role carries. */
type IRole = { hex: string; path?: string; ratio?: number; min?: number; against?: string; alpha?: number; tint?: { opacity: number } };
/** Something drawn that search can hide and a refusal can mark. `rows` are the items inside a block. */
type Item = { el: HTMLElement; said: string; key: string; block?: LeverBlock; refmark?: HTMLElement };

const rowHook = (role: string): string => `int-row-${role.replace(/\./g, '-')}`;

/** The columns, in order (Q33): Primary, Neutral, Destructive, then each accent, as [column, palette key, name shown]. */
export const columnsInOrder = (): Array<readonly [string, string, string]> => [
  ...BUILT_IN_COLUMNS.map(([c, pk]) => [c, pk, capWord(c)] as const),
  ...(brandState.interactivePalettes ?? []).map((e) => { const n = e.name ?? e.palette; return [n, e.palette, capWord(n)] as const; }),
];

/** Mount the Interactive levers into `host`. Subscriptions are released through `cleanups`. */
export const mountInteractiveLevers = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const root = hook(h('div', 'p3-levers-body p3-ilevers'), 'interactive-levers');
  host.replaceChildren(root);
  /** The role whose step picker is open, or null. One at a time, under its row. */
  let openRole: string | null = null;
  /** The key the last edit wrote, so an engine refusal marks the lever or row that caused it. */
  let lastEdited: string | null = null;
  let items: Item[] = [];
  const pickers = new Map<string, () => void>();
  /** True once Add button set is clicked: the color select, the add and Cancel show in its place (QA-I4). */
  let adding = false;

  const edit = (key: string, write: () => void): void => {
    lastEdited = key;
    write();
    noteSectionEdit();   // QA-B9: the edit, and only an edit, reveals its preview section
    rebuild();
  };

  /** A derived mode's one line, at the top of the levers: every lever on the page is read-only there (Q59). */
  const derivedLine = (): HTMLElement | null =>
    isDerived(currentMode) ? hook(stateLine(`${modeLabel(currentMode)} is auto-derived — read-only. Edit Light or Dark and it follows.`), 'interactive-derived') : null;
  /** Which mode the rows edit; nothing in a derived mode, which says so once at the top. */
  const editingLine = (): HTMLElement | null => isDerived(currentMode) ? null : subLine(`Editing ${modeLabel(currentMode)}, the mode the preview shows.`);

  // ── an enum lever as chips (#1675's rule: two to four options) ──────────────────────────────────
  const enumLever = (key: string): Item => {
    const L = leverOf(key)!;
    const b = leverBlock(key, { group: true });
    const role = `${b.el.getAttribute('data-p3')!.slice('lever-'.length)}-chips`;
    const c = choice(L.label, role, (L.options ?? []).map((o) => ({ v: String(o.value), l: o.label })), (v) => edit(key, () => setLever(key, v)));
    c.set(String(getPath(brandState, key) ?? L.default));
    b.ctl.append(c.el);
    return { el: b.el, said: b.said, key, block: b };
  };

  // ── Actions ────────────────────────────────────────────────────────────────────────────────────
  const actionPalette = (): Item => {
    const L = leverOf('actionPalette')!;
    const b = leverBlock('actionPalette', { forId: 'p3-action-palette' });
    const s = selectField('p3-action-palette', L.label, 'action-palette-select', (v) => edit('actionPalette', () => setLever('actionPalette', v)));
    s.set(paletteRefOptions('actionPalette', (brandState.brandColors ?? []).map((x) => x.name)).map((p) => ({ v: p, l: capWord(p) })), String(brandState.actionPalette ?? 'primary'));
    b.ctl.append(s.el);
    return { el: b.el, said: b.said, key: 'actionPalette', block: b };
  };
  const linkPalette = (): Item => {
    const L = leverOf('linkPalette')!;
    const b = leverBlock('linkPalette', { forId: 'p3-link-palette' });
    const s = selectField('p3-link-palette', L.label, 'link-palette-select', (v) => edit('linkPalette', () => setLinkPalette(v === '' ? undefined : v)));
    s.set([{ v: '', l: LINK_AUTO }, ...paletteRefOptions('linkPalette', (brandState.brandColors ?? []).map((x) => x.name)).map((p) => ({ v: p, l: capWord(p) }))],
      brandState.linkPalette ?? '');
    b.ctl.append(s.el);
    // WCAG 1.4.1, warn and never force (#1496): the engine's own decision, read from its notes.
    if (theme.notes.some((n) => /WCAG 1\.4\.1/.test(n))) {
      b.setState(hook(stateLine(`Links in ${theme.linkPalette} match body text color: underline them (WCAG 1.4.1).`, 'warn'), 'link-palette-warning'));
    }
    return { el: b.el, said: b.said, key: 'linkPalette', block: b };
  };

  // ── rows ───────────────────────────────────────────────────────────────────────────────────────
  /** One row: the swatch, the name and role, and the picker button, or a read-out for a wash. */
  const rowOf = (r: InteractiveRow, nested: boolean): Item | null => {
    const mode = currentMode;
    const roles = rolesIn(mode) as Record<string, IRole | undefined>;
    const res = roles[r.role];
    if (!res) return null;
    const derived = isDerived(mode);
    const label = r.label;
    const el = hook(h('div', 'p3-fillrow'), rowHook(r.role));
    el.dataset.role = r.role;
    if (nested) el.dataset.nested = 'true';
    const sw = h('span', 'p3-fill-sw');
    sw.dataset.content = '';
    const nm = h('div', 'p3-fill-name');
    nm.append(h('b', 'p3-fill-label', label), h('span', 'p3-fill-tok', r.role));
    const wrap = h('div', 'p3-fillrow-wrap');
    const said = `${r.group} ${label} ${r.role}`.toLowerCase();

    // A translucent wash (#1210): painted over the ground it declares, and read out, never picked.
    if (r.write === 'readout') {
      const ground = (res.against ? roles[res.against]?.hex : undefined) ?? roles['background.primary']?.hex ?? '#ffffff';
      const n = parseInt(res.hex.slice(1), 16);
      const rgba = `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${res.alpha ?? 1})`;
      sw.style.background = `linear-gradient(${rgba}, ${rgba}), ${ground}`;
      const parts = (res.path ?? '').split('.');
      const read = hook(h('span', 'p3-pick-read'), 'int-readout');
      read.textContent = res.tint ? `fill at ${res.tint.opacity}%` : parts.length >= 2 ? `${parts[parts.length - 2]} ${stepKeyOf(res.path)}` : (res.path ?? '');
      read.title = res.tint
        ? 'The button’s own fill at an opacity step, chosen to keep the hover label readable and the hover visible. Change the fill to change its color.'
        : 'A translucent wash has no ramp step to swap in — a step of the neutral ramp is opaque, and would replace the wash rather than retint it.';
      el.append(sw, nm, read);
      wrap.append(el);
      return { el: wrap, said, key: `row:${r.role}` };
    }

    sw.style.background = res.hex;
    const palette = interactivePaletteOf(r);
    const steps = stepsOf(palette);
    if (!steps.length) return null;
    const at = stepOfPath(res.path);
    // What the row holds now, and what its Auto names.
    let overridden: boolean;
    let current: { palette: string; step: string } | null;
    let autoName: string;
    if (r.write === 'anchor') {
      const v = anchorOf(mode, r.column!);
      overridden = v !== undefined;
      current = overridden ? { palette, step: steps.find((k) => Number(k) === v) ?? String(v) } : at && at.palette === palette ? at : null;
      autoName = `${palette} ${baselineAnchorStepOf(r.role, mode, r.column!)}`;
    } else if (r.write === 'inverse-fill') {
      const ov = brandState.overrides?.[mode]?.[r.role];
      overridden = typeof ov?.step === 'string';
      current = overridden ? { palette: ov!.palette, step: ov!.step } : at;
      autoName = `${baselineStepOf(r.role, mode)} (crisp)`;
    } else {
      const ov = overrideOf(mode, r.role);
      overridden = ov !== undefined;
      current = overridden ? { palette, step: ov! } : at;
      autoName = at && !overridden ? `${at.palette} ${at.step}` : `${palette} ${baselineStepOf(r.role, mode)}`;
    }
    const ratio = res.against && res.against !== 'self' && typeof res.ratio === 'number' ? res.ratio : null;
    const below = ratio !== null && (res.min ?? 0) > 0 && ratio + 1e-9 < res.min!;
    const now = overridden ? `Override · ${current ? `${current.palette} ${current.step}` : ''}` : `Auto · ${autoName}`;
    const btn = hook(h('button', 'p3-btn p3-btn-page p3-pick'), 'int-pick');
    btn.type = 'button';
    btn.id = `p3-ipick-${r.role.replace(/\./g, '-')}`;
    btn.dataset.role = r.role;
    const open = openRole === r.role && !derived;
    btn.setAttribute('aria-expanded', String(open));
    btn.append(h('span', 'p3-btn-label', now));
    if (ratio !== null) {
      const rr = h('small', 'p3-pick-ratio', fmtRatio(ratio));
      if (below) { rr.dataset.below = 'true'; rr.append(glyph('x')); }
      btn.append(rr);
    }
    btn.append(glyph('chev'));
    btn.setAttribute('aria-label', `${label}: ${now}${ratio !== null ? `, ${fmtRatio(ratio)}` : ''}${below ? ', below floor' : ''}. Pick a step`);
    btn.disabled = derived;
    btn.onclick = () => {
      const opening = openRole !== r.role;
      openRole = opening ? r.role : null;
      render();
      if (opening) pickers.get(r.role)?.();
    };
    el.append(sw, nm, btn);
    const refmark = h('p', 'p3-refmark');
    refmark.setAttribute('role', 'note');
    refmark.append(glyph('x'), h('span', undefined, 'Refused. The preview keeps the last valid theme.'));
    refmark.hidden = true;
    wrap.append(el, refmark);
    if (open) {
      const key = `row:${r.role}`;
      const palOf = (p: string): PickerPalette => ({ palette: p, steps: (theme.palettes.find((x) => x.palette === p)?.steps ?? []).map((s) => ({ key: s.key, hex: s.hex })) });
      // The inverse fill offers its column's ramp and the neutral one (#1384); every other row its own ramp.
      const nPal = theme.roleToPalette.neutral;
      const palettes = r.write === 'inverse-fill' && nPal !== palette ? [palOf(palette), palOf(nPal)] : [palOf(palette)];
      const against = res.against && res.against !== 'self' && (res.min ?? 0) > 0
        ? { hex: roles[res.against]?.hex ?? (() => { const d = res.against!.lastIndexOf('.'); return stepHex(res.against!.slice(0, d), res.against!.slice(d + 1)) ?? '#ffffff'; })(), name: res.against, floor: res.min! }
        : null;
      const pk = stepPicker({
        role: r.role,
        modeLabel: modeLabel(mode),
        palettes,
        current,
        against,
        overridden,
        onPick: (p, step) => edit(key, () => writeInteractiveRow(mode, r, r.write === 'inverse-fill' ? `${p}::${step}` : step)),
        onAuto: () => edit(key, () => writeInteractiveRow(mode, r, undefined)),
        onClose: () => { openRole = null; render(); root.querySelector<HTMLElement>(`#${btn.id}`)?.focus(); },
      });
      wrap.append(pk.el);
      pickers.set(r.role, pk.focusCurrent);
    }
    return { el: wrap, said, key: `row:${r.role}`, refmark };
  };

  /** Rows in their groups: a rest row, then its hover and pressed under it (Q33). */
  const rowsInGroups = (rows: readonly InteractiveRow[], into: HTMLElement, out: Item[]): void => {
    let parent: HTMLElement | null = null;
    let group = '';
    for (const r of rows) {
      const child = r.label === 'Hover' || r.label === 'Pressed';
      const it = rowOf(r, child && r.group === group);
      if (!it) continue;
      out.push(it);
      if (child && parent && r.group === group) { parent.append(it.el); continue; }
      group = r.group;
      const g = hook(h('div', 'p3-irow-group'), 'int-row-group');
      g.dataset.group = r.group;
      parent = hook(h('div', 'p3-irow-states'), 'int-row-states');
      g.append(it.el, parent);
      into.append(g);
    }
  };

  // ── Interactive palettes: the column groups, the add row, and the strict switch ────────────────────
  const columns = (): Item[] => {
    // The engine's description speaks of "columns"; the owner's word is "button set" (Q53), so this page
    // hands in its own, approved 2026-10-02. The manifest's stays as MCP and the emission read it.
    const b = leverBlock('interactivePalettes', { desc: BUTTON_SET_TOOLTIP });
    const out: Item[] = [];
    const box = hook(h('div', 'p3-icols'), 'interactive-columns');
    const line = editingLine();
    if (line) box.append(line);
    (columnsInOrder()).forEach(([col, pk, name]) => {
      const rows = interactiveRowsFor(col, pk);
      const roles = rolesIn(currentMode);
      if (!roles[`interactive.${col}.fill.rest`]) return;
      const grp = hook(h('section', 'p3-icol'), 'interactive-column');
      grp.id = idOf(col);
      grp.tabIndex = -1;
      grp.dataset.column = col;
      const head = h('div', 'p3-icol-head');
      const t = h('h4', 'p3-icol-title', name);
      t.id = `${grp.id}-t`;
      grp.setAttribute('aria-labelledby', t.id);
      const pal = interactivePaletteOf(rows[0]);
      head.append(t, h('span', 'p3-sub', `palette ${pal}`), h('span', 'p3-spacer'));
      const i = (brandState.interactivePalettes ?? []).findIndex((e) => (e.name ?? e.palette) === col);
      // A button set exists across every mode, so it is removed from any editable mode (owner decision Q54).
      if (i >= 0) {
        const rm = hook(h('button', 'p3-btn p3-btn-page'), 'column-remove');
        rm.type = 'button';
        rm.append(h('span', 'p3-btn-label', BUTTON_SET_COPY.remove));
        rm.setAttribute('aria-label', BUTTON_SET_COPY.removeLabel(name));
        rm.onclick = () => edit('interactivePalettes', () => removeAccent(i));
        head.append(rm);
      }
      grp.append(head);
      // The neutral emphasis opens the Neutral set (the owner's QA-I6): it sets how bold that set's fill is.
      if (col === 'neutral') { const ne = enumLever('neutralEmphasis'); grp.append(ne.el); out.push(ne); }
      const list = h('div', 'p3-fillrows');
      rowsInGroups(rows, list, out);
      grp.append(list);
      box.append(grp);
    });
    // The add row, in every mode (Q54): the list is mode-independent. The promotable list is the legacy page's (Q35).
    // S5.3 (the owner's QA-I4): the dashed Add button set first; the color select only once it is clicked, with the
    // add and Cancel beside it. Cancel, or Escape in the form, writes nothing and puts the dashed button back.
    {
      const add = hook(h('div', 'p3-icol-add'), 'column-add');
      const already = new Set((brandState.interactivePalettes ?? []).map((e) => e.palette));
      const actionPal = theme.roleToPalette.action;
      const promotable = ['primary', ...(brandState.brandColors ?? []).map((x) => x.name)].filter((p) => !already.has(p) && p !== actionPal && !RESERVED_COLUMNS.has(p));
      const reopen = (): void => root.querySelector<HTMLElement>('[data-p3="column-add-open"]')?.focus();
      if (!promotable.length) { adding = false; add.append(hook(subLine(ADD_COLUMN_HINT), 'column-promote-hint')); }
      else if (!adding) {
        add.append(addRowButton('column-add-open', BUTTON_SET_COPY.add, () => {
          adding = true;
          render();
          root.querySelector<HTMLElement>('#p3-promote')?.focus();
        }));
      } else {
        const form = hook(h('div', 'p3-icol-addform'), 'column-add-form');
        const lab = h('label', 'p3-field-label', BUTTON_SET_COPY.select);
        lab.htmlFor = 'p3-promote';
        const s = selectField('p3-promote', BUTTON_SET_COPY.select, 'column-promote-select', () => {});
        s.set(promotable.map((p) => ({ v: p, l: capWord(p) })), promotable[0]);
        const go = hook(h('button', 'p3-btn p3-btn-page'), 'column-promote');
        go.type = 'button';
        go.append(glyph('plus'), h('span', 'p3-btn-label', BUTTON_SET_COPY.add));
        // After the add, focus goes back to Add button set. When that color was the last one to add, the button gives
        // way to the hint, so focus goes to the new set's group instead, as its jump link does.
        go.onclick = () => {
          const v = s.select.value;
          adding = false;
          edit('interactivePalettes', () => addAccent(v));
          const back = root.querySelector<HTMLElement>('[data-p3="column-add-open"]') ?? root.querySelector<HTMLElement>(`#${idOf(v)}`);
          back?.focus();
        };
        // "Cancel" is the inline confirm's word (`inlineConfirm`, `ui/lever-kit.ts`), reused.
        const cancel = hook(h('button', 'p3-btn p3-btn-page'), 'column-promote-cancel');
        cancel.type = 'button';
        cancel.append(h('span', 'p3-btn-label', 'Cancel'));
        const close = (): void => { adding = false; render(); reopen(); };
        cancel.onclick = close;
        form.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
        const row = h('div', 'p3-icol-addrow');
        row.append(s.el, go, cancel);
        form.append(lab, row);
        add.append(form);
      }
      box.append(add);
    }
    b.ctl.append(box);
    return [{ el: b.el, said: '', key: 'interactivePalettes', block: b }, ...out];
  };
  const strict = (): Item => {
    const L = leverOf('strictInteractiveContrast')!;
    const b = leverBlock('strictInteractiveContrast', { forId: 'p3-strict-switch' });
    const sw = switchButton('p3-strict-switch', L.label, 'strict-contrast-switch', { on: 'On', off: 'Off' },
      (v) => edit('strictInteractiveContrast', () => setStrictInteractiveContrast(v)));
    sw.set(!!brandState.strictInteractiveContrast);
    b.ctl.append(sw.el, subLine(STRICT_CAPTION));
    return { el: b.el, said: `${b.said} ${STRICT_CAPTION}`.toLowerCase(), key: 'strictInteractiveContrast', block: b };
  };

  // ── Links: the rungs and the four families' resting link ─────────────────────────────────────────
  const rungs = (): Item => {
    const b = leverBlock('linkStateRungs', { group: true });
    // One select to a line, the full width of the panel, so no option label is cut short (the owner's QA-I9).
    const grid = h('div', 'p3-fieldgrid p3-irungs');
    for (const st of ['hover', 'pressed', 'visited'] as LinkRungState[]) {
      const f = h('div', 'p3-field');
      const id = `p3-link-rung-${st}`;
      const lab = h('label', 'p3-field-label', capWord(st));
      lab.htmlFor = id;
      const s = selectField(id, `${capWord(st)} link state`, `link-rung-${st}`, (v) => edit('linkStateRungs', () => setLinkRung(st, v === '' ? undefined : Number(v))));
      s.set([{ v: '', l: 'Auto: tuned walk' }, ...[1, 2, 3, 4, 5, 6, 7, 8].map((k) => ({ v: String(k), l: `${k} step${k > 1 ? 's' : ''}` }))],
        String(brandState.linkStateRungs?.[st] ?? ''));
      f.append(lab, s.el);
      grid.append(f);
    }
    b.ctl.append(grid);
    return { el: b.el, said: b.said, key: 'linkStateRungs', block: b };
  };
  const linkFamilies = (): Item[] => {
    const box = hook(h('div', 'p3-fillrows'), 'link-rows');
    const line = editingLine();
    if (line) box.append(line);
    const out: Item[] = [];
    for (const r of LINK_ROWS) { const it = rowOf(r, false); if (it) { box.append(it.el); out.push(it); } }
    return [{ el: box, said: '', key: 'linkFamilies' }, ...out];
  };

  // ── Disabled: the "Full contrast" switch, and the floor as four chips while it is off (QA-I8, Q37) ─────
  const isFull = (): boolean => normalizeDisabledStrategy(getPath(brandState, 'disabledStrategy') as string | undefined) === 'full';
  /** On writes `'full'`, off writes `'reduced'`: the two values the segmented control it replaces wrote, so the
   *  persisted brand is the same byte for byte. Under Full it keeps the approved Full note (#1974). */
  const disabledSwitch = (): Item => {
    const b = leverBlock('disabledStrategy', { label: DISABLED_SWITCH.label, forId: 'p3-disabled-switch' });
    const full = isFull();
    const sw = switchButton('p3-disabled-switch', DISABLED_SWITCH.label, 'disabled-full-switch', { on: 'On', off: 'Off' },
      (on) => edit('disabledStrategy', () => setLever('disabledStrategy', on ? 'full' : 'reduced')));
    sw.set(full);
    const caption = full ? DISABLED_SWITCH.on : DISABLED_SWITCH.off;
    b.ctl.append(sw.el, hook(subLine(caption), 'disabled-full-caption'));
    if (full) b.setState(stateLine('At 4.5:1 a disabled label reads like body text. The disabled cue rests on fill, border and cursor.'));
    return { el: b.el, said: `${b.said} ${caption}`.toLowerCase(), key: 'disabledStrategy', block: b };
  };
  /** The floor chips, drawn only while the switch is off: under Full the floor is 4.5:1 and the chips do nothing. */
  const disabledMin = (): Item[] => {
    if (isFull()) return [];
    const L = leverOf('disabledMin')!;
    const b = leverBlock('disabledMin', { group: true });
    const c = choice(L.label, 'disabled-min-chips', [3, 3.5, 4, 4.5].map((v) => ({ v: String(v), l: `${v}:1` })), (v) => edit('disabledMin', () => setLever('disabledMin', Number(v))));
    c.set(String(getPath(brandState, 'disabledMin') ?? L.default));
    b.ctl.append(c.el);
    return [{ el: b.el, said: b.said, key: 'disabledMin', block: b }];
  };

  const one = (f: () => Item): (() => Item[]) => () => [f()];
  const ROWS: Record<string, (row: { keys?: readonly string[] }) => Item[]> = {
    palette: (row) => [row.keys?.[0] === 'linkPalette' ? linkPalette() : actionPalette()],
    enum: (row) => [enumLever(row.keys![0])],
    interactivePalettes: columns,
    toggle: one(strict),
    linkStateRungs: one(rungs),
    linkFamilies,
    disabledSwitch: one(disabledSwitch),
    disabledMin,
  };

  // ── the page ──────────────────────────────────────────────────────────────────────────────────
  const section = (s: Section, i: number): { el: HTMLElement; items: Item[] } => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-interactive-${i}`;
    const head = h('div', 'p3-lsec-head');
    const title = h('h3', 'p3-lsec-title', s.title);
    title.id = `${el.id}-t`;
    el.setAttribute('aria-labelledby', title.id);
    head.append(title);
    if (s.desc) head.append(h('p', 'p3-lsec-desc', s.desc));
    el.append(head);
    const out: Item[] = [];
    for (const r of s.rows) {
      const its = ROWS[r.ctl]?.(r) ?? [];
      if (its[0]) el.append(its[0].el);
      out.push(...its);
    }
    return { el, items: out };
  };

  /** Jump links to each column group (Q33), at the top of the levers. */
  const jumps = (): HTMLElement => {
    const nav = hook(h('nav', 'p3-jump'), 'interactive-jump');
    nav.setAttribute('aria-label', BUTTON_SET_COPY.landmark);
    nav.append(jumpLabel());
    for (const [col, , name] of columnsInOrder()) {
      if (!rolesIn(currentMode)[`interactive.${col}.fill.rest`]) continue;
      const a = hook(h('a', 'p3-jump-link', name), 'interactive-jump-link');
      a.href = `#${idOf(col)}`;
      a.dataset.column = col;
      a.onclick = (e) => {
        e.preventDefault();
        const to = root.querySelector<HTMLElement>(`#${idOf(col)}`);
        if (to) scrollToStart(to);   // QA-B17: eased, and at once under reduced motion
        to?.focus({ preventScroll: true });
      };
      nav.append(a);
    }
    return nav;
  };

  const render = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const focusKey = had && root.contains(had) ? had.getAttribute('data-p3') : null;
    const focusIndex = focusKey ? [...root.querySelectorAll(`[data-p3="${focusKey}"]`)].indexOf(had!) : -1;
    const focusStep = had?.dataset.step ?? null;
    const scrollTop = host.scrollTop;
    items = [];
    pickers.clear();
    const derived = derivedLine();
    const parts: HTMLElement[] = [h('p', 'p3-intro', PAGE.intro), ...(derived ? [derived] : []), jumps()];
    PAGE.sections.forEach((s, i) => { const x = section(s, i); parts.push(x.el); items.push(...x.items); });

    const next = hook(h('button', 'p3-btn p3-btn-page p3-next'), 'interactive-continue');
    next.type = 'button';
    next.append(h('span', 'p3-btn-label', `Continue to ${NEXT.label}`), glyph('chevr'));
    next.onclick = () => setPage(NEXT.page);
    const nr = h('div', 'p3-nextrow');
    nr.append(next);
    parts.push(nr);
    root.replaceChildren(...parts);
    // A derived mode is read-only, every lever on the page, brand-wide ones included (owner decision Q59): every
    // control in a section is disabled. The info buttons only show a description, so they stay.
    if (derived) for (const n of root.querySelectorAll<HTMLButtonElement | HTMLSelectElement | HTMLInputElement>('.p3-lsec :is(button, select, input):not(.p3-info)')) n.disabled = true;
    markRefused();
    filter();
    if (focusKey) {
      const same = [...root.querySelectorAll<HTMLElement>(`[data-p3="${focusKey}"]`)];
      const pick = focusStep ? same.find((n) => n.dataset.step === focusStep) : same[Math.max(0, focusIndex)];
      (pick ?? same[0])?.focus({ preventScroll: true });
      if (!root.contains(document.activeElement) && openRole) pickers.get(openRole)?.();
    }
    if (host.scrollTop !== scrollTop) host.scrollTop = scrollTop;
  };

  const markRefused = (): void => {
    for (const it of items) {
      const yes = !!lastError && !!lastEdited && it.key === lastEdited;
      it.block?.setRefused(yes);
      if (it.refmark) { it.refmark.hidden = !yes; if (yes) it.el.dataset.refused = 'true'; }
    }
  };

  /** Search (Q3): hide what does not match, report the count. A group or a section with nothing shown hides. */
  const filter = (): void => {
    const q = searchQuery.trim().toLowerCase();
    const shown = items.filter((it) => it.said);
    for (const it of shown) it.el.hidden = !!q && !it.said.includes(q);
    for (const g of root.querySelectorAll<HTMLElement>('.p3-irow-group')) g.hidden = !!q && !g.querySelector('.p3-fillrow-wrap:not([hidden])');
    for (const g of root.querySelectorAll<HTMLElement>('.p3-icol')) g.hidden = !!q && !g.querySelector(':is(.p3-fillrow-wrap, .p3-lever):not([hidden])');
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) {
      s.hidden = !!q && !s.querySelector(':is(.p3-lever[data-p3]:not([data-p3="lever-interactive-palettes"]), .p3-fillrow-wrap):not([hidden])');
    }
    const cols = root.querySelector<HTMLElement>('[data-p3="lever-interactive-palettes"]');
    const colsItem = items.find((it) => it.key === 'interactivePalettes');
    if (cols && colsItem?.block) cols.hidden = !!q && !colsItem.block.said.includes(q) && !cols.querySelector(':is(.p3-fillrow-wrap, .p3-lever):not([hidden])');
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro, .p3-nextrow, .p3-jump, .p3-icol-add')) n.hidden = !!q;
    setSearchHits(q ? shown.filter((it) => !it.el.hidden).length : null);
  };

  cleanups.push(subscribe('brand', render), subscribe('mode', () => { openRole = null; adding = false; render(); }), subscribe('search', filter));
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  render();
};
