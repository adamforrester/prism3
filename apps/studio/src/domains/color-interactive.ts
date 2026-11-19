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
 * held by the frame: the whole levers panel is inert and disabled under one line (N-3 A, #1984).
 *
 * BEHAVIOR-NEUTRAL (the S2 rule). Every write goes through `state/interactive-input.ts`, which writes what the
 * legacy page wrote, byte for byte on the persisted brand. The option sets are the legacy page's (owner
 * decision Q35): every anchor step, the promotable palettes without Primary. The action palette offers Neutral
 * since #3365 (it did not before, #1811). Two writes the legacy page had no control for: the link palette's Auto (Q36), which UNSETS
 * the key, and the strict contrast switch, whose off UNSETS it, so an untouched brand stays byte-identical.
 *
 * HOW IT REPAINTS: by store subscription only (plan §5), as `domains/color-fills.ts`: a control writes and
 * calls `rebuild()`; the panel is redrawn whole, keeping focus on the element that had it. It never names a
 * legacy repaint tier and never imports `main.ts` (`test-shell-imports.ts`).
 */
import { normalizeDisabledStrategy, contrast, hexToRgb } from '@prism3/engine';
import { brandState, currentMode, getPath, searchQuery, setPage, setSearchHits, subscribe, theme } from '../state/store';
import { isDerived, resolvedModes } from '../state/verdict';
import { rolesIn, stepHex, stepOfPath, stepsOf } from '../state/fills-input';
import {
  BUILT_IN_COLUMNS, LINK_ROWS, addAccent, addSetOptions, isTextLinkRow, linkSurfacesOf, anchorOf, baselineAnchorStepOf, baselineStepOf, interactivePaletteOf, interactiveRowsFor,
  REST_LABEL, overrideHeldOf, overrideLabel, pickerPalettesOf, removeAccent, setLever, setLinkPalette, setLinkRung, setStrictInteractiveContrast, stepKeyOf, writeInteractiveRow,
  type InteractiveRow, type LinkRungState,
} from '../state/interactive-input';
import { paletteRefOptions } from '../levers/controls';
import { DOMAINS, type PageData, type Section } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { glyph, h, hook } from '../shell/dom';
import { addRowButton, choice, jumpLabel, leverBlock, leverOf, selectField, stateLine, subLine, switchButton, tokenLabel, type LeverBlock, keepFocus, pageEdit, markRefused } from '../ui/lever-kit';
import { scrollToStart } from '../preview/follow-edit';
import { fmtRatio, stepPicker, worstRatio, type PickerPalette } from '../ui/step-picker';
import { WASH_HOVER_STEPS, WASH_PRESSED_STEPS, readOutlineHoverFill, readOutlineWash, setOutlineHoverSetStep, setOutlineInteraction, setOutlineWashStep } from '../state/outline-hover-input';

/** #3335 (the proposal's §4, DRAFT for the owner's final read): the per-set card's title, the Primary card's first lever,
 *  the Solid fill group's title, and the Wash opacity lever. */
export const SET_CARD_TITLE = (name: string): string => `${name} Interactive Colors`;
export const PRIMARY_ACTION_PALETTE = 'Primary Action Palette';
export const HOVER_FILL_GROUP = 'Outline & text hover';
export const WASH_COPY = {
  label: 'Wash opacity',
  info: 'How strong the hover and pressed wash is on outline and text controls, as a step of the opacity scale. Pressed sits above hover; selected follows pressed.',
  option: (n: number, tinted: boolean): string => (tinted ? `${n}%, stepped per set where needed` : `${n}%`),
  hint: {
    'overlay-neutral': 'A black wash on light grounds, a white one on dark. Tags, segmented controls and pagination hover with it too.',
    'solid-tint': 'Each set\u2019s own fill at this opacity. A set steps it where its label would drop below 4.5:1, or where the hover would not show.',
    'opaque-fill': 'Buttons take the hover fills set in each color below. Tags, segmented controls and pagination keep this wash.',
  },
} as const;
/** #3116 (the owner's Q3116.2 A, 2026-11-19; labels DRAFT): the outline hover method as two short choices. "Hover fill"
 *  picks whether there is a fill and which kind; "Wash color", drawn only under Wash, picks the wash. Together they write
 *  the same four `outlineInteraction` values as the four chips they replace. */
export const METHOD_COPY = {
  label: 'Hover fill',
  fill: [['wash', 'Wash'], ['solid', 'Solid'], ['none', 'None']],
  washLabel: 'Wash color',
  wash: [['neutral', 'Neutral'], ['tinted', 'Tinted']],
} as const;
type HoverFillChoice = typeof METHOD_COPY.fill[number][0];
type WashColorChoice = typeof METHOD_COPY.wash[number][0];
/** A method's two choices, and back. A method the chooser does not know reads as the neutral wash, the lever's default. */
export const choicesOf = (method: string): { fill: HoverFillChoice; wash: WashColorChoice } => ({
  fill: method === 'opaque-fill' ? 'solid' : method === 'none' ? 'none' : 'wash',
  wash: method === 'solid-tint' ? 'tinted' : 'neutral',
});
export const methodOf = (fill: HoverFillChoice, wash: WashColorChoice): string =>
  fill === 'solid' ? 'opaque-fill' : fill === 'none' ? 'none' : wash === 'tinted' ? 'solid-tint' : 'overlay-neutral';
/** #3116 (the owner's Q3116.3 A and Q3116.1 A; DRAFT copy): the "Outline & text hover" group, under Fill in every set's
 *  card, under every method. Its Rest row (outline and text buttons have no fill at rest), the line under a wash that
 *  says where the wash changes, the one line under No hover fill, and why Pressed waits for Hover under Solid. */
export const HOVER_COPY = {
  rest: 'No fill at rest',
  wash: {
    'overlay-neutral': 'Neutral wash. Change it, and its opacity, in Interactive settings.',
    'solid-tint': 'Tinted wash. Change it, and its opacity, in Interactive settings.',
  },
  none: 'No hover fill. Outline and text buttons keep their rest fill on hover and press. Change it in Interactive settings.',
  locked: 'Follows Hover until Hover is picked',
} as const;
/** The button sets lever's info text (owner-approved, 2026-10-02). Since #3335 (Q3335.2 A) a visible line above Add
 *  button set. */
export const BUTTON_SET_TOOLTIP = 'Add a button set from any brand color on Palettes. Each set gets fill, text, border and state colors in every mode.';

const PAGE = (DOMAINS.find((d) => d.id === 'color') as { subpages: readonly PageData[] }).subpages.find((p) => p.id === 'interactive')!;
/** The page the Continue button opens: the next tab, Type, by the store's page key (moved in S6.2). */
const NEXT = { label: 'Type', page: 'type' } as const;

/** Owner decision Q38, verbatim (APPROVED). */
export const STRICT_CAPTION = 'Off: inverse button labels clear 4.5:1 at rest and may dip on hover and pressed. On: they clear 4.5:1 in every state.';
/** Owner decisions Q40 and Q53, verbatim (APPROVED). */
export const ADD_COLUMN_HINT = 'Add a brand color on Palettes to use it for another button set.';
/** Why "Add button set" lists a brand color disabled: a button set already carries its name, and a new set would take
 *  the same name, which the engine refuses (#3608, the owner's Q-AB1 B). Owner decision Q-AB1 B copy, verbatim (APPROVED 2026-11-17). */
export const ADD_SET_TAKEN = 'This name is already a button set.';
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
/** The text-link rows' added lines (#2990; owner decision Q2990 A, APPROVED as drafted). */
export const LINK_COPY = {
  modes: 'Contrast in every mode',
  follow: 'Hover, visited and pressed follow this step:',
} as const;
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

  /** A button set whose removal the engine refused before it reached the brand (a glass still drawn from the set, #3697
   *  M1): the brand is untouched, so `lastError` stays clear, and the card says it was refused, as the brand color's and
   *  the custom mode's removals do. Cleared by the next edit. */
  let refusedHere: string | null = null;
  const edit = pageEdit((k) => { lastEdited = k; refusedHere = null; });   // the shared edit (#2487 B5)

  /** Which mode the rows edit; nothing in a derived mode, whose panel the frame holds read-only under its one line
   *  (Q59; N-3 A, #1984). */
  const editingLine = (): HTMLElement | null => isDerived(currentMode) ? null : subLine(`Editing ${modeLabel(currentMode)}, the mode the preview shows.`);

  // ── an enum lever as chips (#1675's rule: two to four options) ──────────────────────────────────
  const enumLever = (key: string): Item => {
    if (key === 'outlineInteraction') return methodLever();
    const L = leverOf(key)!;
    const b = leverBlock(key, { group: true });
    const role = `${b.el.getAttribute('data-p3')!.slice('lever-'.length)}-chips`;
    const c = choice(L.label, role, (L.options ?? []).map((o) => ({ v: String(o.value), l: o.label })), (v) => edit(key, () => setLever(key, v)));
    c.set(String(getPath(brandState, key) ?? L.default));
    b.ctl.append(c.el);
    return { el: b.el, said: b.said, key, block: b };
  };

  // ── The outline hover method, as two short choices (#3116, the owner's Q3116.2 A; labels DRAFT) ─────────────
  /** The wash color last shown, so Solid or None and back to Wash returns to it within the session. */
  let lastWash: WashColorChoice = 'neutral';
  const methodLever = (): Item => {
    const L = leverOf('outlineInteraction')!;
    const now = choicesOf(String(getPath(brandState, 'outlineInteraction') ?? L.default));
    if (now.fill === 'wash') lastWash = now.wash;
    const words = [...METHOD_COPY.fill.map(([, l]) => l), METHOD_COPY.washLabel, ...METHOD_COPY.wash.map(([, l]) => l)].join(' ');
    const b = leverBlock('outlineInteraction', { group: true, label: METHOD_COPY.label, alsoSays: words });
    // #3071: leaving the opaque fill drops its step picks, which the engine refuses under another method.
    const write = (m: string): void => edit('outlineInteraction', () => setOutlineInteraction(m));
    const fill = choice(METHOD_COPY.label, 'outline-method-chips', METHOD_COPY.fill.map(([v, l]) => ({ v, l })), (v) => write(methodOf(v, lastWash)));
    fill.set(now.fill);
    b.ctl.append(fill.el);
    if (now.fill === 'wash') {
      const f = hook(h('div', 'p3-field'), 'outline-wash-color');
      const lab = h('span', 'p3-field-label', METHOD_COPY.washLabel);
      lab.id = 'p3-outline-wash-color-label';
      const wash = choice(METHOD_COPY.washLabel, 'outline-wash-color-chips', METHOD_COPY.wash.map(([v, l]) => ({ v, l })), (v) => write(methodOf('wash', v)));
      wash.set(now.wash);
      f.append(lab, wash.el);
      b.ctl.append(f);
    }
    return { el: b.el, said: b.said, key: 'outlineInteraction', block: b };
  };

  // ── Wash opacity (#3335, the owner's Q3335.3 A and Q3335.4 A; every string a DRAFT for the owner) ─────────
  /** The wash's Hover and Pressed steps, brand-wide, under every method that draws a wash (the tinted wash, the neutral
   *  wash, and Solid fill, whose tags, segmented controls and pagination keep the neutral wash). Each method's hint says
   *  what the wash reaches. Pressed offers only the steps above hover (the engine refuses one on or under it). */
  const washOpacity = (): Item[] => {
    const method = String(getPath(brandState, 'outlineInteraction') ?? theme.outlineInteraction);
    if (method === 'none') return [];
    // One block draws both steps, so search finds it by the pressed lever's words too (`alsoSays`, #2175).
    const P = leverOf('outlineWash.pressed');
    const b = leverBlock('outlineWash.hover', { group: true, label: WASH_COPY.label, desc: WASH_COPY.info, alsoSays: `${P?.label ?? ''} ${P?.description ?? ''} outlineWash.pressed` });
    const now = readOutlineWash(method);
    const said: string[] = [];
    const grid = h('div', 'p3-fieldgrid p3-irungs');
    for (const [st, offered] of [['hover', WASH_HOVER_STEPS], ['pressed', WASH_PRESSED_STEPS.filter((x) => x > now.hover)]] as const) {
      const f = hook(h('div', 'p3-field'), `outline-wash-${st}`);
      const id = `p3-outline-wash-${st}`;
      const lab = h('label', 'p3-field-label', capWord(st));
      lab.htmlFor = id;
      const sel = selectField(id, `${WASH_COPY.label}: ${capWord(st)}`, `outline-wash-${st}-select`, (v) => edit('outlineWash', () => setOutlineWashStep(method, st, Number(v))));
      sel.set(offered.map((x) => ({ v: String(x), l: WASH_COPY.option(x, method === 'solid-tint') })), String(now[st]));
      f.append(lab, sel.el);
      grid.append(f);
      said.push(capWord(st));
    }
    b.ctl.append(grid, hook(subLine(WASH_COPY.hint[method as keyof typeof WASH_COPY.hint] ?? WASH_COPY.hint['overlay-neutral']), 'outline-wash-hint'));
    return [{ el: b.el, said: `${b.said} ${said.join(' ')}`.toLowerCase(), key: 'outlineWash', block: b }];
  };

  // ── Outline & text hover, per button set (#3071; per set since #3335, Q3335.5 A; under Fill since #3116; DRAFT copy) ──
  /** #3116 (the owner's Q3116.3 A and Q3116.1 A, 2026-11-19): one group, always titled "Outline & text hover", directly
   *  under Fill in every set's card, under every method, set up as every other color group is: a Rest row, with Hover and
   *  Pressed inset under it. Outline and text buttons have no fill at rest, so Rest reads that. Under Solid fill, Hover and
   *  Pressed are the set's own fills, picked with the card's step picker in the mode the preview shows (Pressed follows
   *  Hover until Hover is picked), and the set's worst label and icon line follows. Under a wash, the same rows read the
   *  wash out, and a line says where it changes. Under No hover fill, one line. The fill only is customizable here: the
   *  label and border keep their shared rows in Text and Border. */
  const hoverGroup = (col: string, method: string): { el: HTMLElement; items: Item[] } => {
    const items: Item[] = [];
    const list = h('div', 'p3-fillrows');
    if (method === 'none') {
      list.append(hook(subLine(HOVER_COPY.none), 'outline-hover-none'));
      return { el: stateGroup(HOVER_FILL_GROUP, list), items };
    }
    const g = hook(h('div', 'p3-irow-group'), 'int-row-group');
    g.dataset.group = HOVER_FILL_GROUP;
    g.dataset.rest = 'true';
    // The Rest row: no role and no picker, since there is no fill at rest to pick.
    const restWrap = h('div', 'p3-fillrow-wrap');
    const rest = hook(h('div', 'p3-fillrow'), 'outline-hover-rest');
    const sw = h('span', 'p3-fill-sw');
    sw.dataset.content = '';
    // No mono line under the label: that line is always a token path (QA-B2), and Rest has no token.
    const nm = h('div', 'p3-fill-name');
    nm.append(h('b', 'p3-fill-label', REST_LABEL));
    rest.append(sw, nm, hook(h('span', 'p3-pick-read', HOVER_COPY.rest), 'int-readout'));
    restWrap.append(rest);
    g.append(restWrap);
    items.push({ el: restWrap, said: `${HOVER_FILL_GROUP} ${REST_LABEL} ${HOVER_COPY.rest} outline hover fill`.toLowerCase(), key: `row:${col}.hover-rest` });
    const states = hook(h('div', 'p3-irow-states'), 'int-row-states');
    g.append(states);
    const solid = method === 'opaque-fill';
    const part = solid ? 'hover-fill' : method === 'solid-tint' ? 'subtle-fill' : 'overlay';
    for (const st of ['hover', 'pressed'] as const) {
      const r: InteractiveRow = { role: `interactive.${col}.${part}.${st}`, group: HOVER_FILL_GROUP, label: capWord(st),
        paletteKey: 'neutral', write: solid ? 'override' : 'readout', column: col };
      const it = rowOf(r, true, solid ? { col, st } : undefined);
      if (!it) continue;
      states.append(it.el);
      items.push(it);
    }
    list.append(g);
    if (solid) {
      const roles = rolesIn(currentMode);
      const worst = (st: string): number | undefined => {
        const fill = roles[`interactive.${col}.hover-fill.${st}`];
        const rs = ['text', 'icon'].map((p) => roles[`interactive.${col}.${p}.${st}`]).filter((ink) => fill && ink).map((ink) => contrast(hexToRgb(ink!.hex), hexToRgb(fill!.hex)));
        return rs.length ? Math.min(...rs) : undefined;
      };
      const wh = worst('hover'), wp = worst('pressed');
      if (wh !== undefined && wp !== undefined) list.append(hook(subLine(`Labels and icons on it, at worst: ${fmtRatio(wh)} hover, ${fmtRatio(wp)} pressed. They shift where they need to, to stay legible.`), 'outline-hover-fill-ratio'));
    } else {
      list.append(hook(subLine(HOVER_COPY.wash[method as keyof typeof HOVER_COPY.wash] ?? HOVER_COPY.wash['overlay-neutral']), 'outline-hover-wash-line'));
    }
    return { el: stateGroup(HOVER_FILL_GROUP, list), items };
  };

  // ── Actions ────────────────────────────────────────────────────────────────────────────────────
  const actionPalette = (): Item => {
    const L = leverOf('actionPalette')!;
    // #3335 (§4, DRAFT): the Studio's label only; the manifest's "Action palette" stays for MCP and the emission.
    const b = leverBlock('actionPalette', { forId: 'p3-action-palette', label: PRIMARY_ACTION_PALETTE });
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
  /** A text-link row's two added lines (#2990): its worst ratio across its surfaces in every mode, each against
   *  that mode's floor, and the steps its hover, visited and pressed land on in the mode the preview shows. */
  const linkLines = (r: InteractiveRow): HTMLElement[] => {
    const strip = hook(h('div', 'p3-linkmodes'), 'link-modes');
    strip.setAttribute('role', 'group');
    strip.setAttribute('aria-label', `${r.label}: ${LINK_COPY.modes}`);
    strip.append(h('span', 'p3-linkmodes-title', LINK_COPY.modes));
    for (const { mode: m } of resolvedModes(theme)) {
      const rs = rolesIn(m) as Record<string, IRole | undefined>;
      const x = rs[r.role];
      if (!x?.against || !(x.min ?? 0)) continue;
      const g = [x.against, ...linkSurfacesOf(r.role)].map((k) => rs[k]?.hex ?? (() => { const d = k.lastIndexOf('.'); return stepHex(k.slice(0, d), k.slice(d + 1)); })()).filter((v): v is string => !!v);
      const w = worstRatio(x.hex, { hex: g[0], name: x.against, floor: x.min!, also: g.slice(1) });
      const cell = hook(h('span', 'p3-linkmode'), 'link-mode');
      cell.dataset.mode = m;
      const rr = h('span', 'p3-linkmode-ratio', fmtRatio(w));
      if (w + 1e-9 < x.min!) { cell.dataset.below = 'true'; rr.append(glyph('x')); }
      cell.append(h('span', 'p3-linkmode-name', modeLabel(m)), rr);
      cell.title = `Floor ${x.min}:1`;
      strip.append(cell);
    }
    const roles = rolesIn(currentMode) as Record<string, IRole | undefined>;
    const prefix = r.role.slice(0, -'.default'.length);
    const follow = hook(h('p', 'p3-linkfollow'), 'link-follow');
    follow.append(h('span', undefined, LINK_COPY.follow));
    for (const st of ['hover', 'visited', 'pressed']) {
      const x = roles[`${prefix}.${st}`];
      const at = stepOfPath(x?.path);
      if (!x || !at) continue;
      const s = h('span', 'p3-linkfollow-step');
      const sw = h('span', 'p3-linkfollow-sw');
      sw.dataset.content = '';
      sw.style.background = x.hex;
      s.append(sw, h('span', undefined, `${st} ${at.step}`));
      follow.append(s);
    }
    return [strip, follow];
  };

  /** One row: the swatch, the name and role, and the picker button, or a read-out for a wash. `hf` (#3116) makes it a
   *  Solid fill row of the Outline & text hover group: its pick writes the set's own `outlineHoverFill` step in the mode,
   *  from any palette, and its Pressed waits for its Hover. */
  const rowOf = (r: InteractiveRow, nested: boolean, hf?: { col: string; st: 'hover' | 'pressed' }): Item | null => {
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
    const nm = tokenLabel(r.role, label);
    const wrap = h('div', 'p3-fillrow-wrap');
    const said = `${r.group} ${label} ${r.role}${hf ? ` ${hf.col} outline hover fill` : ''}`.toLowerCase();

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
    const at = stepOfPath(res.path);
    // A Solid fill row's pick, as `palette.step`, and whether its Pressed still follows its Hover (#3116).
    const hfOwn = hf ? readOutlineHoverFill()[mode]?.sets?.[hf.col] : undefined;
    const hfHeld = hf ? (hf.st === 'hover' ? hfOwn?.hover : hfOwn?.pressed) : undefined;
    const locked = !!hf && hf.st === 'pressed' && !hfOwn;
    const palette = hf ? (hfHeld ? hfHeld.slice(0, hfHeld.lastIndexOf('.')) : at?.palette ?? theme.roleToPalette.neutral) : interactivePaletteOf(r);
    const steps = stepsOf(palette);
    if (!steps.length) return null;
    // What the row holds now, and what its Auto names.
    let overridden: boolean;
    let current: { palette: string; step: string } | null;
    let autoName: string;
    if (hf) {
      overridden = !!hfHeld;
      current = hfHeld ? { palette, step: hfHeld.slice(hfHeld.lastIndexOf('.') + 1) } : at;
      autoName = at ? `${at.palette} ${at.step}` : 'default';
    } else if (r.write === 'anchor') {
      const v = anchorOf(mode, r.column!);
      overridden = v !== undefined;
      current = overridden ? { palette, step: steps.find((k) => Number(k) === v) ?? String(v) } : at && at.palette === palette ? at : null;
      autoName = `${palette} ${baselineAnchorStepOf(r.role, mode, r.column!)}`;
    } else if (r.write === 'inverse-fill') {
      const held = overrideHeldOf(mode, r);
      overridden = held !== null;
      current = held ?? at;
      autoName = `${baselineStepOf(r.role, mode)} (crisp)`;
    } else {
      // By the palette the override names (#3391), not this row's family: the engine resolves the one it names.
      const held = overrideHeldOf(mode, r);
      overridden = held !== null;
      current = held ?? at;
      autoName = at && !overridden ? `${at.palette} ${at.step}` : `${palette} ${baselineStepOf(r.role, mode)}`;
    }
    const textLink = isTextLinkRow(r);
    // The ground the role is measured on: a role in the mode, or a palette step (a link's contrast floor).
    const againstHex = (role: IRole, rs: Record<string, IRole | undefined>): string =>
      rs[role.against!]?.hex ?? (() => { const d = role.against!.lastIndexOf('.'); return stepHex(role.against!.slice(0, d), role.against!.slice(d + 1)) ?? '#ffffff'; })();
    /** A text link's floor ground and the surfaces it sits on, in a mode (#2990). */
    const linkGround = (role: IRole, rs: Record<string, IRole | undefined>) => ({
      hex: againstHex(role, rs), name: role.against!, floor: role.min!,
      also: linkSurfacesOf(r.role).map((g) => rs[g]?.hex).filter((x): x is string => !!x),
    });
    const measured = res.against && res.against !== 'self' && typeof res.ratio === 'number';
    const ratio = !measured ? null : textLink && (res.min ?? 0) > 0 ? worstRatio(res.hex, linkGround(res, roles)) : res.ratio!;
    const below = ratio !== null && (res.min ?? 0) > 0 && ratio + 1e-9 < res.min!;
    const now = overridden ? overrideLabel(current) : `Auto · ${autoName}`;
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
    btn.setAttribute('aria-label', `${label}: ${now}${ratio !== null ? `, ${fmtRatio(ratio)}` : ''}${below ? ', below floor' : ''}. ${locked ? HOVER_COPY.locked : 'Pick a step'}`);
    if (locked) { btn.disabled = true; btn.title = HOVER_COPY.locked; }
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
      // The row's own ramp, the inverse fill's neutral one (#1384), and the palette a held override names (#3406). A Solid
      // fill row offers every palette, the one it holds first (#3071's select did).
      const palettes = (hf ? [palette, ...theme.palettes.map((x) => x.palette).filter((x) => x !== palette)] : pickerPalettesOf(mode, r)).map(palOf);
      const against = res.against && res.against !== 'self' && (res.min ?? 0) > 0
        ? textLink ? linkGround(res, roles) : { hex: againstHex(res, roles), name: res.against, floor: res.min! }
        : null;
      const pk = stepPicker({
        role: r.role,
        modeLabel: modeLabel(mode),
        palettes,
        current,
        against,
        // A text link can't be pinned below its floor (#2990, Q2990.5 A): the engine would move the pick (#1510).
        blockBelow: textLink,
        overridden,
        onPick: (p, step) => edit(key, () => hf ? setOutlineHoverSetStep(mode, hf.col, hf.st, `${p}.${step}`) : writeInteractiveRow(mode, r, r.write === 'inverse-fill' || p !== palette ? `${p}::${step}` : step)),
        onAuto: () => edit(key, () => hf ? setOutlineHoverSetStep(mode, hf.col, hf.st, undefined) : writeInteractiveRow(mode, r, undefined)),
        onClose: () => { openRole = null; render(); root.querySelector<HTMLElement>(`#${btn.id}`)?.focus(); },
      });
      wrap.append(pk.el);
      pickers.set(r.role, pk.focusCurrent);
    }
    if (textLink) wrap.append(...linkLines(r));
    return { el: wrap, said, key: `row:${r.role}`, refmark };
  };

  /** One state group of a set's card (#3335, the owner's Q3335.7 A and amendment): a small title, then its rows. A group
   *  with a rest row draws Rest, then its Hover and Pressed nested under it (Q33); since #3116 the Outline & text hover
   *  group is one, under every method. A group with no rest row (On-fill text) draws its rows at the group's own level. */
  const stateGroup = (title: string, body: HTMLElement): HTMLElement => {
    const g = hook(h('section', 'p3-icol p3-igroup'), 'int-group');
    g.dataset.group = title;
    const head = h('div', 'p3-icol-head');
    head.append(h('h3', 'p3-icol-title', title));
    g.append(head, body);
    return g;
  };
  const rowsInGroups = (rows: readonly InteractiveRow[], col: string, out: Item[]): HTMLElement[] => {
    const groups: HTMLElement[] = [];
    const method = String(getPath(brandState, 'outlineInteraction') ?? theme.outlineInteraction);
    let at: { name: string; list: HTMLElement; group: HTMLElement; states: HTMLElement | null } | null = null;
    let hover: Item[] = [];
    for (const r of rows) {
      // #3116 (Q3116.3 A): the two washes fold into the Outline & text hover group, drawn under Fill below.
      if (/\.(overlay|subtle-fill)\./.test(r.role)) continue;
      const child = r.label === 'Hover' || r.label === 'Pressed';
      const nested = child && !!at?.states && at.name === r.group;
      const it = rowOf(r, nested);
      if (!it) continue;
      out.push(it);
      if (at && at.name === r.group) { (nested ? at.states! : at.group).append(it.el); continue; }
      const list = h('div', 'p3-fillrows');
      const g = hook(h('div', 'p3-irow-group'), 'int-row-group');
      g.dataset.group = r.group;
      g.dataset.rest = String(r.label === REST_LABEL);
      let states: HTMLElement | null = null;
      g.append(it.el);
      if (r.label === REST_LABEL) { states = hook(h('div', 'p3-irow-states'), 'int-row-states'); g.append(states); }
      else g.classList.add('p3-irow-flat');
      list.append(g);
      groups.push(stateGroup(r.group, list));
      at = { name: r.group, list, group: g, states };
      // #3116 (Q3116.3 A): the Outline & text hover group sits directly under Fill, under every method.
      if (r.group === 'Fill') { const x = hoverGroup(col, method); groups.push(x.el); hover = x.items; }
    }
    // Its items follow Fill's rows, in the order drawn.
    if (hover.length) { const i = out.findIndex((it) => it.key.startsWith(`row:interactive.${col}.fill.pressed`)); out.splice(i < 0 ? out.length : i + 1, 0, ...hover); }
    return groups;
  };

  // ── The button sets: one card each (#3335, the owner's Q3335.1 A), then Add button set ──────────────────────────
  const setCards = (): { els: HTMLElement[]; items: Item[] } => {
    const out: Item[] = [];
    const els: HTMLElement[] = [];
    // The mode line, once, above the cards it describes (Q3335.2 A): the settings above it are brand-wide.
    const line = editingLine();
    if (line) els.push(hook(line, 'interactive-mode-line'));
    (columnsInOrder()).forEach(([col, pk, name]) => {
      const rows = interactiveRowsFor(col, pk);
      const roles = rolesIn(currentMode);
      if (!roles[`interactive.${col}.fill.rest`]) return;
      const card = hook(h('section', 'p3-lsec p3-icard'), 'interactive-column');
      card.id = idOf(col);
      card.tabIndex = -1;
      card.dataset.column = col;
      const head = h('div', 'p3-lsec-head p3-icard-head');
      // The palette sits inside the title, as Components' counts do (TY2 A): at 380 it wraps under the name inside the
      // heading, so the space after the title stays the level's space-300.
      const pal = interactivePaletteOf(rows[0]);
      const t = h('h2', 'p3-lsec-title', SET_CARD_TITLE(name));
      t.append(' ', h('span', 'p3-icard-pal', `palette ${pal}`));
      t.id = `${card.id}-t`;
      // No name, so not a landmark: only Inspect and Activity carry landmark names (Q197, #2487).
      const line1 = h('div', 'p3-icard-line');
      line1.append(t, h('span', 'p3-spacer'));
      const i = (brandState.interactivePalettes ?? []).findIndex((e) => (e.name ?? e.palette) === col);
      // A button set exists across every mode, so it is removed from any editable mode (owner decision Q54).
      if (i >= 0) {
        const rm = hook(h('button', 'p3-btn p3-btn-page'), 'column-remove');
        rm.type = 'button';
        rm.append(h('span', 'p3-btn-label', BUTTON_SET_COPY.remove));
        rm.setAttribute('aria-label', BUTTON_SET_COPY.removeLabel(name));
        rm.onclick = () => {
          // Atomic (#3697 M1): a removal the engine refuses leaves the brand as it was, and the card says so.
          if (removeAccent(i) === null) { edit('interactivePalettes', () => {}); return; }
          lastEdited = 'interactivePalettes';
          refusedHere = `column:${col}`;
          render();
        };
        line1.append(rm);
      }
      // The refused mark sits inside the head, under the line with Remove button set, so the card's own children keep
      // the owner's QA-I6 order (the neutral emphasis right under the head).
      const refmark = hook(h('p', 'p3-refmark'), 'column-refused');
      refmark.setAttribute('role', 'note');
      refmark.append(glyph('x'), h('span', undefined, 'Refused. The preview keeps the last valid theme.'));
      refmark.hidden = true;
      head.append(line1, refmark);
      card.append(head);
      out.push({ el: card, said: '', key: `column:${col}`, refmark });
      // The Primary Action Palette opens the Primary card, as the neutral emphasis opens Neutral's (the owner's QA-I6).
      if (col === 'primary') { const ap = actionPalette(); card.append(ap.el); out.push(ap); }
      if (col === 'neutral') { const ne = enumLever('neutralEmphasis'); card.append(ne.el); out.push(ne); }
      const groups = h('div', 'p3-icols');
      groups.append(...rowsInGroups(rows, col, out));
      card.append(groups);
      els.push(card);
    });
    // The add row, in every mode (Q54): the list is mode-independent. The promotable list is the legacy page's (Q35).
    // S5.3 (the owner's QA-I4): the dashed Add button set first; the color select only once it is clicked, with the
    // add and Cancel beside it. Cancel, or Escape in the form, writes nothing and puts the dashed button back.
    {
      const add = hook(h('div', 'p3-icol-add'), 'column-add');
      const listed = addSetOptions(theme.roleToPalette.action);
      const promotable = listed.filter((o) => !o.taken).map((o) => o.palette);
      // #3608 (the owner's Q-AB1 B): a brand color a button set already carries the name of is listed disabled, its
      // reason in the option's title (#2044's pattern) and in a visible line per color that the select names in its
      // `aria-describedby`, so the reason is read with the select, not on hover only.
      const taken = listed.filter((o) => o.taken).map((o) => o.palette);
      const takenLines = (): HTMLElement[] => taken.map((p) => {
        const line = hook(subLine(`${capWord(p)}: ${ADD_SET_TAKEN}`), 'column-promote-taken');
        line.id = `p3-promote-taken-${p.replace(/[^a-z0-9-]/gi, '-')}`;
        line.dataset.palette = p;
        return line;
      });
      const reopen = (): void => root.querySelector<HTMLElement>('[data-p3="column-add-open"]')?.focus();
      // Nothing left to add: the hint, after the reason any taken color is listed with (#3608).
      if (!promotable.length) { adding = false; add.append(...takenLines(), hook(subLine(ADD_COLUMN_HINT), 'column-promote-hint')); }
      else {
        // #3335 (Q3335.2 A): the approved tooltip, now a visible line above the button.
        add.append(hook(subLine(BUTTON_SET_TOOLTIP), 'column-add-line'));
        if (!adding) {
          add.append(addRowButton('column-add-open', BUTTON_SET_COPY.add, () => {
            adding = true;
            render();
            root.querySelector<HTMLElement>('#p3-promote')?.focus();
          }));
        } else {
          const form = hook(h('div', 'p3-icol-addform'), 'column-add-form');
          const lab = h('label', 'p3-field-label', BUTTON_SET_COPY.select);
          lab.htmlFor = 'p3-promote';
          const sel = selectField('p3-promote', BUTTON_SET_COPY.select, 'column-promote-select', () => {});
          sel.set(listed.map((o) => ({ v: o.palette, l: capWord(o.palette), off: o.taken ? ADD_SET_TAKEN : undefined })), promotable[0]);
          const why = takenLines();
          if (why.length) sel.select.setAttribute('aria-describedby', why.map((w) => w.id).join(' '));
          const go = hook(h('button', 'p3-btn p3-btn-page'), 'column-promote');
          go.type = 'button';
          go.append(glyph('plus'), h('span', 'p3-btn-label', BUTTON_SET_COPY.add));
          // After the add, focus goes back to Add button set. When that color was the last one to add, the button gives
          // way to the hint, so focus goes to the new set's card instead, as its jump link does.
          go.onclick = () => {
            const v = sel.select.value;
            if (!promotable.includes(v)) return; // a taken color is never added (#3608)
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
          row.append(sel.el, go, cancel);
          form.append(lab, row, ...why);
          add.append(form);
        }
      }
      els.push(add);
    }
    return { els, items: out };
  };
  const strict = (): Item => {
    const L = leverOf('strictInteractiveContrast')!;
    const b = leverBlock('strictInteractiveContrast', { forId: 'p3-strict-switch' });
    const sw = switchButton('p3-strict-switch', L.label, 'strict-contrast-switch',
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
    const sw = switchButton('p3-disabled-switch', DISABLED_SWITCH.label, 'disabled-full-switch',
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
    outlineWash: washOpacity,
    toggle: one(strict),
    linkStateRungs: one(rungs),
    linkFamilies,
    disabledSwitch: one(disabledSwitch),
    disabledMin,
  };

  // ── the page ──────────────────────────────────────────────────────────────────────────────────
  const section = (s: Section, i: number): { els: HTMLElement[]; items: Item[] } => {
    // #3335: the button sets' section draws as one card per set, its own title not drawn.
    if (s.cards) return setCards();
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-interactive-${i}`;
    const head = h('div', 'p3-lsec-head');
    const title = h('h2', 'p3-lsec-title', s.title);
    title.id = `${el.id}-t`;
    // No name, so not a landmark: only Inspect and Activity carry landmark names (Q197, #2487).
    head.append(title);
    if (s.desc) head.append(h('p', 'p3-lsec-desc', s.desc));
    el.append(head);
    const out: Item[] = [];
    for (const r of s.rows) {
      const its = ROWS[r.ctl]?.(r) ?? [];
      if (its[0]) el.append(its[0].el);
      out.push(...its);
    }
    return { els: [el], items: out };
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
    // What had focus, found again after the redraw (`keepFocus`, #2487 B5).
    const { had, key: focusKey, again } = keepFocus(root);
    const focusStep = had?.dataset.step ?? null;
    const scrollTop = host.scrollTop;
    items = [];
    pickers.clear();
    const parts: HTMLElement[] = [h('p', 'p3-intro', PAGE.intro), jumps()];
    PAGE.sections.forEach((s, i) => { const x = section(s, i); parts.push(...x.els); items.push(...x.items); });

    const next = hook(h('button', 'p3-btn p3-btn-page p3-next'), 'interactive-continue');
    next.type = 'button';
    next.append(h('span', 'p3-btn-label', `Continue to ${NEXT.label}`), glyph('chevr'));
    next.onclick = () => setPage(NEXT.page);
    const nr = h('div', 'p3-nextrow');
    nr.append(next);
    parts.push(nr);
    root.replaceChildren(...parts);
    markRefused(items, lastEdited);   // the shared mark (#2487 B5)
    for (const it of items) if (refusedHere && it.key === refusedHere && it.refmark) { it.refmark.hidden = false; it.el.dataset.refused = 'true'; }
    filter();
    if (focusKey) {
      again(focusStep ? (same) => same.find((n) => n.dataset.step === focusStep) : undefined)?.focus({ preventScroll: true });
      if (!root.contains(document.activeElement) && openRole) pickers.get(openRole)?.();
    }
    if (host.scrollTop !== scrollTop) host.scrollTop = scrollTop;
  };


  /** Search (Q3): hide what does not match, report the count. A group or a section with nothing shown hides. */
  const filter = (): void => {
    const q = searchQuery.trim().toLowerCase();
    const shown = items.filter((it) => it.said);
    for (const it of shown) it.el.hidden = !!q && !it.said.includes(q);
    for (const g of root.querySelectorAll<HTMLElement>('.p3-irow-group')) g.hidden = !!q && !g.querySelector('.p3-fillrow-wrap:not([hidden])');
    for (const g of root.querySelectorAll<HTMLElement>('.p3-icol')) g.hidden = !!q && !g.querySelector(':is(.p3-fillrow-wrap, .p3-lever):not([hidden])');
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) {
      s.hidden = !!q && !s.querySelector(':is(.p3-lever[data-p3], .p3-fillrow-wrap):not([hidden])');
    }
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro, .p3-nextrow, .p3-jump, [data-p3="interactive-mode-line"]')) n.hidden = !!q;
    // #3335 (Q3335.2 A): the button sets lever draws no block of its own; it is the set cards and Add button set. A search
    // in its words (the manifest's, the page's line) shows the add row as its stand-in.
    const L = leverOf('interactivePalettes');
    const setsHit = !!q && `${L?.label ?? ''} ${L?.description ?? ''} interactivePalettes ${BUTTON_SET_TOOLTIP} ${BUTTON_SET_COPY.add}`.toLowerCase().includes(q);
    for (const n of root.querySelectorAll<HTMLElement>('.p3-icol-add')) n.hidden = !!q && !setsHit;
    setSearchHits(q ? shown.filter((it) => !it.el.hidden).length + (setsHit ? 1 : 0) : null);
  };

  cleanups.push(subscribe('brand', render), subscribe('mode', () => { openRole = null; adding = false; render(); }), subscribe('search', filter));
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  render();
};
