/**
 * Type, the levers panel (UI redesign S6.2; concept v6's Type page, scope option (b)).
 *
 * WHAT IT DRAWS: the intro; **Faces** (the section the preview's Faces section mirrors, Q23): the typeface
 * library, each face by its token first (`font.typeface.<slug>`, in mono) and its name under it (owner decision
 * Q68), with whether it is available here (on this device on the web, in this Figma in the plugin) and what uses
 * it, then the Add face field (in the plugin, a type-ahead over the fonts this Figma can load) and a spelling
 * note; then the face for each text type, `font.family.<type>` first and its plain name under it ("Body face"),
 * code's None — no code styles included (Q75), and a line naming any bound face that is not available. Behind
 * Show advanced (Q64, Q69): Apply to all, and the remove button on a face nothing uses. Then a temporary **Scale
 * and weights** section that LENDS the legacy page's other controls (`lend.typeStyles`, `main.ts`), so nothing
 * stops working until S6.3 replaces it. Last, the way on to Shape. The four-tab bar is gone.
 *
 * WHICH MODE A FACE SELECT EDITS (owner decisions Q22, Q62 option A): the mode the preview shows. Light writes
 * the brand value (`typography.families.<type>`); any other editable mode writes `modeLevers[mode].families`,
 * shown as "Auto: follows Light (‹face›)" until set, with Return to Auto. A derived mode (HC light, HC dark,
 * wireframe) is read-only, EVERY control on the page, the lent ones included (Q59, Q74), under S4a's line. The
 * library is brand-wide, so a face is added or removed from any editable mode and writes the same bytes from
 * each. Apply to all writes the Light faces (the legacy page's bytes), so it is offered while previewing Light.
 *
 * BEHAVIOR-NEUTRAL (the S2 rule). Every write goes through `state/type-input.ts`, which writes what the legacy
 * page wrote, byte for byte on the persisted brand.
 *
 * HOW IT REPAINTS: by store subscription only (plan §5): `brand`, `mode`, and `fonts` (the host's font list,
 * lent as `lend.fonts`). A control writes and calls `rebuild()`; the panel is redrawn whole, keeping focus on
 * the element that had it. The lent legacy region repaints the same way: its controls still commit through
 * `applyFull()` or `apply()`, both of which rebuild and so notify `brand`. It never names a legacy repaint tier
 * and never imports `main.ts` (`test-shell-imports.ts`).
 */
import { brandState, currentMode, getModeLever, getPath, lastError, rebuild, searchQuery, setPage, setSearchHits, subscribe, theme } from '../state/store';
import { isDerived } from '../state/verdict';
import { TYPE_GROUP_ORDER, addLibraryFace, inLibrary, removeLibraryFace, setAllFamilies, setFamily } from '../state/type-input';
import { faceStatus, type HostFonts } from '../ui/fonts';
import { DOMAINS, type PageData, type Section } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { glyph, h, hook } from '../shell/dom';
import { leverBlock, selectField, stateLine, subLine, textField, tokenLabel, type LeverBlock } from '../ui/lever-kit';
import type { PageLends } from '../preview/brand';

const PAGE = DOMAINS.find((d) => d.id === 'type') as PageData;
/** The page the Continue button opens: the next tab, Shape, by the store's page key (its legacy page until S7). */
const NEXT = { label: 'Shape', page: 'sizeRadius' } as const;

/** Code's opt-out (owner decision Q75, APPROVED: today's wording, the em dash kept). */
export const CODE_NONE = 'None — no code styles';
/** A face select's Auto in a mode other than Light (owner decision Q62). DRAFT: pending the owner. */
export const familyAuto = (face: string): string => `Auto: follows Light (${face})`;
/** The page's own copy. Every string here is DRAFT, pending the owner, unless marked otherwise. */
export const TYPE_COPY = {
  libraryLabel: 'Typeface library',
  libraryTip: 'The font families this brand can use. A family is in the library while a text type uses it, or once you add it.',
  familiesLabel: 'Font family for each text type',
  familiesTip: 'Each text type’s font.family token names one family from the library. Swapping the family keeps every reference to the token.',
  faceHead: 'Family',
  addPlaceholder: 'Font family name',
  addLabel: 'Add a font family to the library',
  add: 'Add font family',
  remove: (face: string): string => `Remove ${face} from the library`,
  spellWeb: 'Type the name exactly as the font names itself. A name this device lacks still saves, and the preview shows a fallback.',
  spellFigma: (n: number): string => `Pick one of the ${n.toLocaleString('en-US')} fonts this Figma can load, or type any name. A name not on the list still saves, but its text styles can’t apply here.`,
  missingWeb: (faces: readonly string[]): string => `Not installed on this device: ${faces.join(', ')}. The preview shows a fallback.`,
  missingFigma: (faces: readonly string[]): string => `Not in this Figma: ${faces.join(', ')}. Text styles using it can’t apply.`,
  allLabel: 'Set every text type to',
  allChoose: 'Choose a font family…',
  allApply: 'Apply to all',
  allNote: 'Code keeps its own font family.',
  allLightOnly: 'Apply to all sets the Light font families. Preview Light to use it.',
  usedBy: (types: readonly string[]): string => `Used by ${types.join(', ')}`,
  unused: 'Not used',
  lentTitle: 'Scale and weights',
  lentDesc: 'The heading scale, weights, line height and letter spacing, as the earlier Type page drew them.',
  next: 'Continue to Shape',
} as const;
/** The plain name under each `font.family.<type>` token (owner decision Q68's example, "Body face"). DRAFT. */
const FACE_NAME: Record<string, string> = {
  display: 'Display family', title: 'Title family', body: 'Body family', label: 'Label family',
  caption: 'Caption family', eyebrow: 'Eyebrow family', code: 'Code family',
};
/** How many controls Show advanced holds (Q64): Apply to all, and the remove button on an unused face. */
const ADVANCED_COUNT = 2;
const NONE = '__none__';   // a sentinel no font family can be called (the legacy page's)

/** Something drawn that search can hide and a refusal can mark. */
type Item = { el: HTMLElement; said: string; key: string; block?: LeverBlock };

/** Mount the Type levers into `host`. Subscriptions are released through `cleanups`. */
export const mountTypeLevers = (host: HTMLElement, cleanups: (() => void)[], lend: PageLends): void => {
  const root = hook(h('div', 'p3-levers-body'), 'type-levers');
  host.replaceChildren(root);
  let advOpen = false;
  /** The key the last edit wrote, so an engine refusal marks the lever that caused it. */
  let lastEdited: string | null = null;
  /** The Add face field's text and refusal, kept across a repaint. */
  let addError: string | null = null;
  let items: Item[] = [];

  const edit = (key: string, write: () => void): void => {
    lastEdited = key;
    write();
    rebuild();
  };
  const fonts = (): HostFonts => lend.fonts();

  /** A derived mode's one line, at the top of the levers: every control on the page is read-only (Q59). S4a's. */
  const derivedLine = (): HTMLElement | null =>
    isDerived(currentMode) ? hook(stateLine(`${modeLabel(currentMode)} is auto-derived — read-only. Edit Light or Dark and it follows.`), 'type-derived') : null;

  /** A plain name, and its token under it in mono (QA-B2, which reverses Q68's order), as Surfaces & fills' fields. */
  const tokenName = tokenLabel;

  // ── the library ───────────────────────────────────────────────────────────────────────────────
  const library = (): Item => {
    const ty = theme.typography;
    const b = leverBlock('typography.typefaceLibrary', { label: TYPE_COPY.libraryLabel, desc: TYPE_COPY.libraryTip, group: true });
    const f = fonts();
    const head = h('div', 'p3-facehead');
    // The source of the availability verdict, named because the two hosts answer from different ones (the
    // legacy column heading's words): the host's font list once it has sent one, this device otherwise.
    head.append(h('span', 'p3-field-label', TYPE_COPY.faceHead), hook(h('span', 'p3-field-label', f.hostFonts.length ? 'In this Figma' : 'On this device'), 'typeface-source'));
    const list = hook(h('div', 'p3-fillrows'), 'face-library');
    const used = (name: string): string[] => {
      const base = TYPE_GROUP_ORDER.filter((g) => ty.families.find((x) => x.group === g)?.stack[0] === name);
      const inModes = Object.entries(ty.familiesByMode ?? {}).flatMap(([, fams]) => fams.filter((x) => x.stack[0] === name).map((x) => x.group));
      return [...new Set([...base, ...inModes])];
    };
    for (const tf of ty.typefaces) {
      const row = hook(h('div', 'p3-facerow'), 'face-row');
      row.dataset.slug = tf.slug;
      const st = faceStatus(tf.name, f);
      const by = used(tf.name);
      const name = tokenName(`font.typeface.${tf.slug}`, tf.name);
      const meta = h('span', 'p3-sub', by.length ? TYPE_COPY.usedBy(by) : TYPE_COPY.unused);
      name.append(meta);
      const stat = hook(h('span', 'p3-face-stat', st.label), 'face-status');
      stat.title = st.title;
      if (!st.ok) stat.dataset.bad = 'true';
      row.append(name, stat);
      // Show advanced (Q64): a face nothing uses, staged in the library, can be removed. Brand-wide: any editable mode.
      if (advOpen && !by.length && inLibrary(tf.name)) {
        const rm = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon'), 'face-remove');
        rm.type = 'button';
        rm.setAttribute('aria-label', TYPE_COPY.remove(tf.name));
        rm.title = TYPE_COPY.remove(tf.name);
        rm.append(glyph('x'));
        rm.onclick = () => edit('typography.typefaceLibrary', () => removeLibraryFace(tf.slug));
        row.append(rm);
      }
      list.append(row);
    }
    b.ctl.append(head, list, addRow());
    b.ctl.append(subLine(f.hostFonts.length ? TYPE_COPY.spellFigma(f.hostFonts.length) : TYPE_COPY.spellWeb));
    return { el: b.el, said: `${b.said} ${ty.typefaces.map((t) => `${t.name} font.typeface.${t.slug}`).join(' ')}`.toLowerCase(), key: 'typography.typefaceLibrary', block: b };
  };

  /** Add face: a text field and a button; in the plugin the field is a combobox over the host's fonts (#113),
   *  page DOM rather than a datalist, so it scrolls and themes in Figma's iframe. A hint, not a constraint: an
   *  unlisted name still commits. Enter on a highlighted option fills the field; the next Enter adds it. */
  const addRow = (): HTMLElement => {
    const wrap = hook(h('div', 'p3-faceadd'), 'face-add-row');
    const field = textField('p3-face-add', 'face-add-input', { label: TYPE_COPY.addLabel });
    const input = field.el;
    input.placeholder = TYPE_COPY.addPlaceholder;
    const combo = h('div', 'p3-combo');
    combo.append(input);
    const f = fonts();
    let comboKey: ((e: KeyboardEvent) => boolean) | null = null;
    if (f.hostFonts.length) {
      const list = hook(h('div', 'p3-combo-list'), 'face-font-list');
      list.id = 'p3-face-font-list';
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', 'Font families this Figma can load');
      list.hidden = true;
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-controls', list.id);
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-expanded', 'false');
      let shown: string[] = [];
      let active = -1;
      const optId = (i: number): string => `p3-face-font-o${i}`;
      const setActive = (i: number): void => {
        const rows = [...list.children] as HTMLElement[];
        if (active >= 0 && rows[active]) rows[active].setAttribute('aria-selected', 'false');
        active = i;
        if (i < 0) { input.removeAttribute('aria-activedescendant'); return; }
        const row = rows[i];
        if (!row) return;
        row.setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', optId(i));
        row.scrollIntoView({ block: 'nearest' });
      };
      const close = (): void => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); setActive(-1); };
      const open = (): void => {
        if (!shown.length) { close(); return; }
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      };
      const paint = (q: string): void => {
        const needle = q.trim().toLowerCase();
        const pre: string[] = [], mid: string[] = [];
        for (const name of f.hostFonts) {
          if (!needle) { pre.push(name); continue; }
          const at = name.toLowerCase().indexOf(needle);
          if (at === 0) pre.push(name); else if (at > 0) mid.push(name);
        }
        shown = pre.concat(mid);
        list.replaceChildren(...shown.map((name, i) => {
          // textContent, never innerHTML: these names are the host's.
          const o = hook(h('div', 'p3-combo-opt', name), 'face-font-option');
          o.id = optId(i);
          o.setAttribute('role', 'option');
          o.setAttribute('aria-selected', 'false');
          // mousedown, not click: the field's blur closes the list before a click lands.
          o.onmousedown = (e) => { e.preventDefault(); input.value = name; close(); input.focus(); };
          return o;
        }));
        active = -1;
      };
      input.addEventListener('input', () => { paint(input.value); open(); });
      input.addEventListener('focus', () => { paint(input.value); open(); });
      input.addEventListener('blur', () => close());
      comboKey = (e) => {
        const isOpen = !list.hidden;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          if (!isOpen) { paint(input.value); open(); if (shown.length) setActive(0); return true; }
          if (!shown.length) return true;
          setActive(e.key === 'ArrowDown' ? (active + 1) % shown.length : (active <= 0 ? shown.length - 1 : active - 1));
          return true;
        }
        if (e.key === 'Escape') { if (!isOpen) return false; close(); return true; }
        if (e.key === 'Enter' && isOpen && active >= 0 && shown[active]) { input.value = shown[active]; close(); return true; }
        if (e.key === 'Tab' && isOpen) { close(); return false; }
        return false;
      };
      combo.append(list);
    }
    const go = hook(h('button', 'p3-btn p3-btn-page'), 'face-add');
    go.type = 'button';
    go.append(glyph('plus'), h('span', 'p3-btn-label', TYPE_COPY.add));
    const submit = (): void => {
      const refused = addLibraryFace(input.value, theme.typography.typefaces);
      if (refused) { addError = refused; render(); root.querySelector<HTMLElement>('#p3-face-add')?.focus(); return; }
      addError = null;
      input.value = '';
      edit('typography.typefaceLibrary', () => {});
    };
    go.onclick = submit;
    input.addEventListener('keydown', (e) => {
      if (comboKey && comboKey(e)) { e.preventDefault(); return; }
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    const line = h('div', 'p3-faceadd-row');
    line.append(combo, go);
    wrap.append(line);
    if (addError) wrap.append(hook(stateLine(addError, 'warn'), 'face-add-error'));
    return wrap;
  };

  // ── the face for each text type, for the previewed mode ────────────────────────────────────────
  const families = (): Item[] => {
    const ty = theme.typography;
    const mode = currentMode;
    const derived = isDerived(mode);
    const b = leverBlock('typography.families', { label: TYPE_COPY.familiesLabel, desc: TYPE_COPY.familiesTip, group: true });
    const out: Item[] = [];
    if (!derived) b.ctl.append(subLine(`Editing ${modeLabel(mode)}, the mode the preview shows.`));
    const rows = hook(h('div', 'p3-fillrows'), 'family-rows');
    const baseFace = (g: string): string => ty.families.find((f) => f.group === g)?.stack[0] ?? '';
    for (const g of TYPE_GROUP_ORDER) {
      const base = baseFace(g);
      const unbound = g === 'code' && getPath(brandState, 'typography.families.code') === null;
      const id = `p3-family-${g}`;
      const fld = hook(h('div', 'p3-field'), 'family-row');
      fld.dataset.group = g;
      const s = selectField(id, `${FACE_NAME[g]}, ${modeLabel(mode)}`, 'family-select', (v) => {
        if (mode === 'light') {
          if (v === NONE) edit('typography.families', () => setFamily('light', g, null));
          else if (v) edit('typography.families', () => setFamily('light', g, v));
          return;
        }
        edit('typography.families', () => setFamily(mode, g, v));
      });
      s.select.dataset.group = g;
      const line = h('div', 'p3-famrow');
      line.append(s.el);
      if (mode === 'light' || derived) {
        // Light writes the brand value. A derived mode carries no families of its own: it shows the brand
        // value, read-only (the legacy page's #423 rule).
        const opts = ty.typefaces.map((t) => ({ v: t.name, l: t.name }));
        if (base && !opts.some((o) => o.v === base)) opts.push({ v: base, l: base });
        if (g === 'code') opts.push({ v: NONE, l: CODE_NONE });
        s.set(opts, unbound ? NONE : base);
      } else if (unbound) {
        // Nothing to override: code ships no styles in any mode.
        s.set([{ v: '', l: familyAuto(CODE_NONE) }], '');
        s.select.disabled = true;
      } else {
        const raw = getModeLever(mode, `families.${g}`);
        const ov = Array.isArray(raw) ? raw[0] as string | undefined : raw as string | undefined;
        // An override equal to the brand value is inert (the engine drops it), so it reads as Auto.
        const name = ov && ov !== base ? ov : undefined;
        const opts = [{ v: '', l: familyAuto(base) }, ...ty.typefaces.filter((t) => t.name !== base).map((t) => ({ v: t.name, l: t.name }))];
        if (name && !ty.typefaces.some((t) => t.name === name)) opts.push({ v: name, l: name });
        s.set(opts, name ?? '');
        if (name) {
          s.select.dataset.set = 'true';
          const reset = hook(h('button', 'p3-btn p3-btn-page'), 'family-reset');
          reset.type = 'button';
          reset.dataset.group = g;
          reset.append(h('span', 'p3-btn-label', 'Return to Auto'));
          reset.setAttribute('aria-label', `${FACE_NAME[g]}: Return to Auto`);
          reset.onclick = () => edit('typography.families', () => setFamily(mode, g, undefined));
          line.append(reset);
        }
      }
      fld.append(tokenName(`font.family.${g}`, FACE_NAME[g], id), line);
      rows.append(fld);
      out.push({ el: fld, said: `${FACE_NAME[g]} font.family.${g} ${g}`.toLowerCase(), key: `family:${g}` });
    }
    b.ctl.append(rows);
    // Which faces this mode binds that are not available where the text styles are written.
    const f = fonts();
    const fams = ty.familiesByMode?.[mode] ?? ty.families;
    const missing = [...new Set(fams.map((x) => x.stack[0]).filter((x): x is string => !!x))].filter((x) => !faceStatus(x, f).ok);
    if (missing.length) b.setState(hook(stateLine(f.hostFonts.length ? TYPE_COPY.missingFigma(missing) : TYPE_COPY.missingWeb(missing), 'warn'), 'family-missing'));
    return [{ el: b.el, said: '', key: 'typography.families', block: b }, ...out];
  };

  // ── Show advanced (Q64, Q69): Apply to all ──────────────────────────────────────────────────────
  const applyAll = (): Item => {
    const ty = theme.typography;
    const box = hook(h('div', 'p3-field'), 'family-all');
    const lab = h('label', 'p3-field-label', TYPE_COPY.allLabel);
    lab.htmlFor = 'p3-family-all';
    const s = selectField('p3-family-all', TYPE_COPY.allLabel, 'family-all-select', () => {});
    s.set([{ v: '', l: TYPE_COPY.allChoose }, ...ty.typefaces.map((t) => ({ v: t.name, l: t.name }))], '');
    const go = hook(h('button', 'p3-btn p3-btn-page'), 'family-all-apply');
    go.type = 'button';
    go.append(h('span', 'p3-btn-label', TYPE_COPY.allApply));
    go.onclick = () => { const v = s.select.value; if (v) edit('typography.families', () => setAllFamilies(v)); };
    const line = h('div', 'p3-faceadd-row');
    line.append(s.el, go);
    box.append(lab, line, subLine(TYPE_COPY.allNote));
    // The legacy control wrote the Light faces only, so it is offered while previewing Light (Q22).
    if (currentMode !== 'light') {
      s.select.disabled = true;
      go.disabled = true;
      box.append(subLine(TYPE_COPY.allLightOnly));
    }
    return { el: box, said: `${TYPE_COPY.allLabel} ${TYPE_COPY.allApply}`.toLowerCase(), key: 'family-all' };
  };

  // ── the sections ──────────────────────────────────────────────────────────────────────────────
  const sectionShell = (title: string, desc: string | undefined, i: number): HTMLElement => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-type-${i}`;
    const head = h('div', 'p3-lsec-head');
    const t = h('h3', 'p3-lsec-title', title);
    t.id = `${el.id}-t`;
    el.setAttribute('aria-labelledby', t.id);
    head.append(t);
    if (desc) head.append(h('p', 'p3-lsec-desc', desc));
    el.append(head);
    return el;
  };
  const faces = (s: Section): { el: HTMLElement; items: Item[] } => {
    const el = sectionShell(s.title, s.desc, 0);
    const out: Item[] = [];
    const lib = library();
    el.append(lib.el);
    out.push(lib);
    const fams = families();
    el.append(fams[0].el);
    out.push(...fams);
    // Show advanced, at the end of Faces: the two controls it holds are both Faces' (Q64).
    const row = h('div', 'p3-advrow');
    const btn = hook(h('button', 'p3-btn p3-btn-page'), 'type-advanced');
    btn.type = 'button';
    btn.id = 'p3-adv-type';
    btn.setAttribute('aria-expanded', String(advOpen));
    btn.setAttribute('aria-controls', 'p3-advb-type');
    btn.append(glyph(advOpen ? 'chev' : 'chevr'), h('span', 'p3-btn-label', `${advOpen ? 'Hide' : 'Show'} ${ADVANCED_COUNT} advanced`));
    btn.onclick = () => { advOpen = !advOpen; render(); };
    const body = h('div', 'p3-advbody');
    body.id = 'p3-advb-type';
    body.hidden = !advOpen;
    if (advOpen) { const a = applyAll(); body.append(a.el); out.push(a); }
    row.append(btn, body);
    el.append(row);
    return { el, items: out };
  };

  /** The lent region (scope option (b)): the legacy page's other controls, until S6.3 replaces them. Pinned
   *  light, in `styles.css`, as every lent legacy view is (D2). */
  const lentCard = hook(h('div', 'p3-legacy-card'), 'type-lent');
  lentCard.dataset.theme = 'light';
  const paintLent = (): void => {
    // Focus is kept by position among the region's controls: the region is redrawn whole on every rebuild.
    const ctl = 'button, input, select, textarea';
    const had = document.activeElement;
    const at = had && lentCard.contains(had) ? [...lentCard.querySelectorAll(ctl)].indexOf(had) : -1;
    lentCard.replaceChildren();
    lend.typeStyles(lentCard, paintLent);
    if (isDerived(currentMode)) for (const n of lentCard.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(ctl)) n.disabled = true;
    if (at >= 0) lentCard.querySelectorAll<HTMLElement>(ctl)[at]?.focus({ preventScroll: true });
  };
  const lent = (): HTMLElement => {
    const el = sectionShell(TYPE_COPY.lentTitle, TYPE_COPY.lentDesc, 1);
    el.dataset.lent = 'true';
    el.append(lentCard);
    return el;
  };

  const render = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const inFaces = had && root.contains(had) && !lentCard.contains(had);
    const focusKey = inFaces ? had!.getAttribute('data-p3') : null;
    const focusIndex = focusKey ? [...root.querySelectorAll(`[data-p3="${focusKey}"]`)].indexOf(had!) : -1;
    const typed = root.querySelector<HTMLInputElement>('#p3-face-add')?.value ?? '';
    const scrollTop = host.scrollTop;
    items = [];
    const derived = derivedLine();
    const parts: HTMLElement[] = [h('p', 'p3-intro', PAGE.intro), ...(derived ? [derived] : [])];
    const fx = faces(PAGE.sections[0]);
    parts.push(fx.el, lent());
    items.push(...fx.items);
    const next = hook(h('button', 'p3-btn p3-btn-page p3-next'), 'type-continue');
    next.type = 'button';
    next.append(h('span', 'p3-btn-label', TYPE_COPY.next), glyph('chevr'));
    next.onclick = () => setPage(NEXT.page);
    const nr = h('div', 'p3-nextrow');
    nr.append(next);
    parts.push(nr);
    root.replaceChildren(...parts);
    const add = root.querySelector<HTMLInputElement>('#p3-face-add');
    if (add && typed && addError) add.value = typed;
    // A derived mode is read-only, every control on the page, brand-wide ones included (Q59, Q74). The info
    // buttons only show a description, so they stay; the lent region is held the same way in `paintLent`.
    if (derived) for (const n of root.querySelectorAll<HTMLButtonElement | HTMLSelectElement | HTMLInputElement>('.p3-lsec :is(button, select, input):not(.p3-info)')) n.disabled = true;
    for (const it of items) it.block?.setRefused(!!lastError && !!lastEdited && it.key === lastEdited);
    filter();
    if (focusKey) {
      const same = [...root.querySelectorAll<HTMLElement>(`[data-p3="${focusKey}"]`)];
      (same[Math.max(0, focusIndex)] ?? same[0])?.focus({ preventScroll: true });
    }
    if (host.scrollTop !== scrollTop) host.scrollTop = scrollTop;
  };
  /** Repaint both regions, keeping the levers pane's scroll: the lent region's height moves as it redraws. */
  const repaint = (): void => {
    const scrollTop = host.scrollTop;
    render();
    paintLent();
    if (host.scrollTop !== scrollTop) host.scrollTop = scrollTop;
  };

  /** Search (Q3): hide what does not match, report the count. The lent region is legacy markup and is hidden
   *  while a search runs, as the legacy frame hid bespoke editors. */
  const filter = (): void => {
    const q = searchQuery.trim().toLowerCase();
    const shown = items.filter((it) => it.said);
    for (const it of shown) it.el.hidden = !!q && !it.said.includes(q);
    const fam = root.querySelector<HTMLElement>('[data-p3="lever-typography-families"]');
    if (fam) fam.hidden = !!q && !fam.querySelector('[data-p3="family-row"]:not([hidden])');
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) {
      s.hidden = !!q && (s.dataset.lent === 'true' || !s.querySelector('.p3-lever:not([hidden])'));
    }
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro, .p3-nextrow, .p3-advrow')) n.hidden = !!q;
    setSearchHits(q ? shown.filter((it) => !it.el.hidden).length : null);
  };

  cleanups.push(subscribe('brand', repaint), subscribe('mode', repaint), subscribe('fonts', repaint), subscribe('search', filter));
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  repaint();
};
