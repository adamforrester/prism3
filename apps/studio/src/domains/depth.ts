/**
 * Depth & motion, the levers panel (UI redesign S9.2; concept v6's Depth & motion page, V4).
 *
 * WHAT IT DRAWS: the intro; **Elevation**: the shadow softness slider, on the manifest's range and named stops, and,
 * behind its own Show advanced, **Shadow tint**'s hue and amount sliders (owner decision D8 A: tint is part of the
 * shadow, so it sits inside Elevation rather than after Motion); **Motion**: the tempo chips, then one value picker per
 * motion role (default, enter, exit, emphasized), each listing the six fixed curves, drawn (D10 A, D15). Last, the way
 * on to Layout. Each manifest key homed here draws its `lever-*` block exactly once; the easing rows draw the schema
 * input `motionPersonality.easingRoles`.
 *
 * WHICH MODE A CONTROL EDITS (owner decision Q22): the mode the preview shows, for every control here (softness, tint,
 * tempo and easing are all per mode). Previewing Light writes the brand value; previewing Dark or a custom mode writes
 * `modeLevers[mode].*`, and the control says "Auto: follows Light (‹value›)" until it is set, with Return to Auto once it
 * is. Auto names LIGHT's value in every mode, a custom mode included: the engine resolves these levers from the brand
 * value, never from a custom mode's base (the S9 scoping report, finding 7). A derived mode (HC light, HC dark,
 * wireframe) is read-only: every control is disabled under S4a's line, and the preview is still drawn (Q59). A brand
 * with one mode picks its easing per role here too: the legacy table that did it sat inside `rp.modes.length > 1`
 * (#2046).
 *
 * BEHAVIOR-NEUTRAL (the S2 rule). Every write goes through `state/depth-motion-input.ts`, which writes what the legacy
 * Elevation and Motion pages wrote, byte for byte, its traps included: Light's tint is written one key at a time, a
 * mode's shadow slider landing exactly on the brand value clears the override, and Light's easing always writes the
 * curve (#2051 changes that separately). In a mode, picking Light's own curve for a role is Auto: the legacy table never
 * offered that self-map, and Auto stands for it.
 *
 * HOW IT REPAINTS: by store subscription only (plan §5): `brand`, `mode` and `search`. A control writes, notes the edit
 * for the preview's reveal (`noteSectionEdit`, QA-B9) and calls `rebuild()`. The panel redraws itself whole only when
 * its shape changes (the mode, a picker opened, Show advanced, a tempo or easing edit, a search); a shadow slider's
 * edit updates the sliders, their readouts and their Auto lines in place, so a drag survives every repaint. Tempo
 * commits through the same `rebuild()`, and the preview repaints its durations from the store (#800's trap is gone:
 * nothing here has a volatile region to leave stale). It never names a legacy repaint tier and never imports `main.ts`
 * (`test-shell-imports.ts`).
 */
import { brandState, currentMode, getPath, lastError, rebuild, searchQuery, setPage, setSearchHits, subscribe, theme } from '../state/store';
import { isDerived } from '../state/verdict';
import {
  authoredTint, brandShadowValue, easingOverride, setEasingRole, setShadow, shadowOverride, setTempo, tempoOverride, type ShadowKey,
} from '../state/depth-motion-input';
import { noteSectionEdit } from '../preview/follow-edit';
import { DOMAINS, pageOfTab, type Host, type PageData } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import { glyph, h, hook } from '../shell/dom';
import { valuePicker } from '../ui/value-picker';
import { choice, leverBlock, leverOf, setText, slider, sliderReadout, stateLine, subLine, tokenLabel, type LeverBlock } from '../ui/lever-kit';

const PAGE = DOMAINS.find((d) => d.id === 'depth') as PageData;
const section = (title: string) => PAGE.sections.find((s) => s.title === title)!;
const HOST: Host = PRISM3_HOST === 'figma' ? 'figma' : 'web';

/** The page's own copy. APPROVED (owner, 2026-10-04) unless marked DRAFT; the DRAFT strings are in the S9.2
 *  fragment's "Copy for owner approval" block. */
export const DEPTH_COPY = {
  /** A per-mode control's Auto, previewing another mode (Q22, APPROVED; Type's wording). */
  autoLight: (v: string): string => `Auto: follows Light (${v})`,
  toAuto: 'Return to Auto',
  editing: (m: string): string => `Editing ${m}, the mode the preview shows.`,
  derived: (m: string): string => `${m} is auto-derived — read-only. Edit Light or Dark and it follows.`,
  easingRow: (role: string): string => `Easing for ${role}`,
  easingHint: 'The six curves are fixed. Each role picks one.',
  next: 'Continue to Layout',
  /** DRAFT: the easing rows' group label (concept v6's), and the tempo and tint info text, in D16's plain words. */
  easingLabel: 'Easing per motion role',
  easingTip: 'Which of the six curves each kind of motion follows. Transitions name a role, so changing a role changes every transition that uses it.',
  tempoTip: 'How fast every duration runs: Snappy is 0.8×, Standard 1×, Relaxed 1.3×. Reduced motion is set for you.',
  tintTip: 'How far the shadow color moves off pure black, and toward which hue. Amount 0 is pure black.',
  /** The two tint sliders' names (the legacy page's). */
  hue: 'Tint hue',
  amount: 'Tint amount',
  /** The hue slider's readout, and the line under it, when the shadow has no hue to follow: the neutral ramp is gray
   *  and no tint hue is set (#2184). The pinned form is approved (owner Q58 B, Q72 A); the general form, for a Custom
   *  tint or Follow primary at chroma 0 (Q73 A), is a DRAFT for owner approval. */
  noHue: 'None',
  noHuePinned: 'The pinned gray has no hue, so shadows are untinted.',
  noHueGray: 'The neutral is gray, so shadows are untinted.',
} as const;

/** The tempo chips, from the manifest's options (the legacy page's three). */
const tempoOptions = (): { v: string; l: string }[] => (leverOf('motionPersonality.tempo')?.options ?? []).map((o) => ({ v: String(o.value), l: String(o.label) }));
const tempoName = (v: string): string => tempoOptions().find((o) => o.v === v)?.l ?? v;


/** A cubic-bezier, drawn: the curve a value picker row shows (D10). Inline SVG, stroked in the row's ink. */
const SVGNS = 'http://www.w3.org/2000/svg';
const curveSvg = (b: readonly number[]): SVGElement => {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '-6 -6 112 112');
  svg.setAttribute('class', 'p3-curve');
  svg.setAttribute('aria-hidden', 'true');
  const axis = document.createElementNS(SVGNS, 'path');
  axis.setAttribute('d', 'M0,0 L0,100 L100,100');
  axis.setAttribute('fill', 'none');
  axis.setAttribute('stroke', 'currentColor');
  axis.setAttribute('stroke-opacity', '0.35');
  axis.setAttribute('stroke-width', '3');
  const line = document.createElementNS(SVGNS, 'path');
  line.setAttribute('d', `M0,100 C${b[0] * 100},${100 - b[1] * 100} ${b[2] * 100},${100 - b[3] * 100} 100,0`);
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', '7');
  line.setAttribute('stroke-linecap', 'round');
  svg.append(axis, line);
  return svg;
};

/** Something drawn that search can hide and a refusal can mark. */
type Item = { el: HTMLElement; said: string; key: string; block: LeverBlock };
/** A shadow slider drawn this render, synced in place on every brand change. */
type ShadowCtl = { key: ShadowKey; set: (v: number) => void; readout: (t: string) => void; auto: HTMLElement; reset: HTMLButtonElement; fmt: (v: number) => string;
  /** The hue slider only: disabled, its readout and hint saying so, while the shadow has no hue (#2184 Q58 B). */
  noHue?: (none: boolean) => void };

/** Mount the Depth & motion levers into `host`. Subscriptions are released through `cleanups`. */
export const mountDepthLevers = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const root = hook(h('div', 'p3-levers-body'), 'depth-levers');
  host.replaceChildren(root);
  /** Elevation's own Show advanced (Shadow tint, D8 A). */
  let tintOpen = false;
  /** The value picker that is open, by its role, or null; one at a time, under its row (v6). */
  let openPick: string | null = null;
  let focusPick = false;
  let pickFocus: (() => void) | null = null;
  /** The key the last edit wrote, so an engine refusal marks the lever that caused it. */
  let lastEdited: string | null = null;
  let items: Item[] = [];
  let shadows: ShadowCtl[] = [];
  /** The brand value each shadow slider lands against, as it was drawn (the legacy closure's `global`). */
  const drawnBrand: Partial<Record<ShadowKey, number | null>> = {};
  let shapeKey = '';

  const edit = (key: string, write: () => void): void => {
    lastEdited = key;
    write();
    noteSectionEdit();   // QA-B9: the edit, and only an edit, reveals its preview section
    rebuild();
  };
  const light = (): boolean => currentMode === 'light';
  const derived = (): boolean => isDerived(currentMode);

  /** Auto and Return to Auto, both drawn and one shown, so the line flips in place while a slider is dragged. */
  const autoPair = (role: string, onReset: () => void): { el: HTMLElement; auto: HTMLElement; reset: HTMLButtonElement } => {
    const el = h('div', 'p3-autorow');
    const auto = hook(h('p', 'p3-sub', ''), `${role}-auto`);
    const reset = hook(h('button', 'p3-btn p3-btn-page'), `${role}-reset`);
    reset.type = 'button';
    reset.append(h('span', 'p3-btn-label', DEPTH_COPY.toAuto));
    reset.onclick = onReset;
    el.append(auto, reset);
    return { el, auto, reset };
  };

  // ── Elevation ─────────────────────────────────────────────────────────────────────────────────
  /** One shadow slider for the previewed mode. Light: the brand value (the tint one key at a time). Another mode: its
   *  override, or the brand value under Auto; landing on the brand value clears it (`setShadow`). */
  const shadowSlider = (key: ShadowKey, role: string, label: string | null, b: LeverBlock,
    part?: { id: string; min: number; max: number; step: number; unit?: string }): HTMLElement => {
    const L = leverOf('shadow.softness')!;
    const fmt = (v: number): string => (part ? `${Number(v).toFixed(String(part.step).includes('.') ? String(part.step).split('.')[1].length : 0)}${part.unit ?? ''}` : sliderReadout(L, v));
    const wrap = h('div', 'p3-field');
    const lever = part ? 'shadow.tint' : 'shadow.softness';
    const name = label ?? L.label;
    const s = slider(lever, role, `${name}, ${modeLabel(currentMode)}`, (v) => {
      edit(lever, () => { setShadow(currentMode, key, v, drawnBrand[key]); });
    }, part);
    // Softness is its lever block's one control, so the block's own name labels it and its readout sits in the head;
    // the tint's two sliders each carry a name and a readout of their own.
    let readout: (t: string) => void = b.setReadout;
    if (label) {
      const head = h('div', 'p3-slider-head');
      const lab = h('label', 'p3-field-label', label);
      lab.htmlFor = s.el.id;
      const read = h('span', 'p3-readout');
      head.append(lab, read);
      wrap.append(head);
      readout = (t) => setText(read, t);
    }
    wrap.append(s.el);
    // No hue to follow (a pure-gray pin, no tint hue set): the hue slider is disabled, reads None, and says why
    // (#2184, owner Q58 B). The engine reports it as `tint.hue: null`; it never shows the converter's noise hue.
    let noHue: ShadowCtl['noHue'];
    if (key === 'tint.hue') {
      const why = stateLine(DEPTH_COPY.noHuePinned);
      why.hidden = true;
      wrap.append(why);
      noHue = (none) => {
        if (s.el.disabled !== none) s.el.disabled = none;
        if (none) {
          s.el.setAttribute('aria-valuetext', DEPTH_COPY.noHue);
          // The reason names the source: a pinned gray, or a hue-and-chroma neutral at chroma 0 (Q73 A).
          setText(why.querySelector('span')!, brandState.neutral?.anchor ? DEPTH_COPY.noHuePinned : DEPTH_COPY.noHueGray);
        }
        if (why.hidden === none) why.hidden = !none;
      };
    }
    const pair = autoPair(role, () => edit(lever, () => { setShadow(currentMode, key, undefined, drawnBrand[key]); }));
    if (!light() && !derived()) wrap.append(pair.el);
    shadows.push({ key, set: s.set, readout, auto: pair.auto, reset: pair.reset, fmt, noHue });
    return wrap;
  };
  const softness = (): Item => {
    const b = leverBlock('shadow.softness', { forId: 'p3-shadow-softness' });
    b.ctl.append(shadowSlider('softness', 'shadow-softness', null, b));
    return { el: b.el, said: b.said, key: 'shadow.softness', block: b };
  };
  const tint = (): Item => {
    const s = section('Shadow tint');
    const b = leverBlock('shadow.tint', { label: s.title, desc: DEPTH_COPY.tintTip, group: true });
    b.ctl.append(subLine(s.desc ?? ''));
    b.ctl.append(
      shadowSlider('tint.hue', 'shadow-tint-hue', DEPTH_COPY.hue, b, { id: 'hue', min: 0, max: 360, step: 1, unit: '°' }),
      shadowSlider('tint.amount', 'shadow-tint-amount', DEPTH_COPY.amount, b, { id: 'amount', min: 0, max: 1, step: 0.05 }),
    );
    return { el: b.el, said: `${b.said} ${DEPTH_COPY.hue} ${DEPTH_COPY.amount}`.toLowerCase(), key: 'shadow.tint', block: b };
  };
  /** The value a shadow slider shows: the brand's in Light (the authored tint key, else the resolved), the mode's
   *  override or the brand's elsewhere. */
  const shadowShown = (key: ShadowKey): number | null => {
    if (light()) {
      if (key === 'softness') return (getPath(brandState, 'shadow.softness') as number | undefined) ?? theme.shadow.softness;
      const k = key === 'tint.hue' ? 'hue' : 'amount';
      return authoredTint()?.[k] ?? theme.shadow.tint[k];
    }
    return shadowOverride(currentMode, key) ?? brandShadowValue(key);
  };
  const syncShadows = (): void => {
    for (const c of shadows) {
      drawnBrand[c.key] = brandShadowValue(c.key);
      const v = shadowShown(c.key);
      const show = (x: number | null): string => (x === null ? DEPTH_COPY.noHue : c.fmt(x));
      if (v !== null) c.set(v);
      c.noHue?.(v === null);
      c.readout(show(v));
      const set = !light() && shadowOverride(currentMode, c.key) !== undefined;
      setText(c.auto, DEPTH_COPY.autoLight(show(brandShadowValue(c.key))));
      if (c.auto.hidden !== set) c.auto.hidden = set;
      if (c.reset.hidden !== !set) c.reset.hidden = !set;
    }
  };

  // ── Motion ────────────────────────────────────────────────────────────────────────────────────
  /** Tempo, as chips (D15). Light writes `motionPersonality.tempo`; another mode `modeLevers[mode].tempo`. */
  const tempo = (): Item => {
    const b = leverBlock('motionPersonality.tempo', { desc: DEPTH_COPY.tempoTip, group: true });
    const mode = currentMode;
    const brandV = theme.motion.tempo;
    const ov = light() ? undefined : tempoOverride(mode);
    const c = choice(`${leverOf('motionPersonality.tempo')?.label ?? 'Motion tempo'}, ${modeLabel(mode)}`, 'tempo', tempoOptions(),
      (v) => edit('motionPersonality.tempo', () => setTempo(mode, v)));
    c.set((light() ? (getPath(brandState, 'motionPersonality.tempo') as string | undefined) : ov) ?? brandV);
    b.ctl.append(c.el);
    if (!light() && !derived()) {
      const pair = autoPair('tempo', () => edit('motionPersonality.tempo', () => setTempo(mode, undefined)));
      pair.auto.textContent = DEPTH_COPY.autoLight(tempoName(brandV));
      pair.auto.hidden = ov !== undefined;
      pair.reset.hidden = ov === undefined;
      b.ctl.append(pair.el);
    }
    return { el: b.el, said: b.said, key: 'motionPersonality.tempo', block: b };
  };

  const pickButton = (role: string, id: string, now: string, set: boolean): HTMLButtonElement => {
    const btn = hook(h('button', 'p3-btn p3-btn-page p3-pick'), 'easing-pick');
    btn.type = 'button';
    btn.id = id;
    btn.dataset.role = role;
    if (set) btn.dataset.set = 'true';
    btn.setAttribute('aria-expanded', String(openPick === role));
    btn.setAttribute('aria-label', `${DEPTH_COPY.easingRow(role)}, ${modeLabel(currentMode)}: ${now}. Pick a value`);
    btn.append(h('span', 'p3-btn-label', now), glyph('chev'));
    btn.onclick = () => {
      const opening = openPick !== role;
      openPick = opening ? role : null;
      focusPick = opening;
      render();
    };
    return btn;
  };
  /** Easing per motion role (D10 A): a value picker per role, each of the six curves drawn. */
  const easing = (): Item => {
    const b = leverBlock('motionPersonality.easingRoles', { label: DEPTH_COPY.easingLabel, desc: DEPTH_COPY.easingTip, group: true });
    const mode = currentMode;
    const curves = Object.entries(theme.motion.easing);
    const names = curves.map(([n]) => n);
    const rows = hook(h('div', 'p3-fillrows'), 'easing-rows');
    for (const r of theme.motion.easingRoles) {
      const brandCurve = r.curve;
      const ov = light() ? undefined : easingOverride(mode, r.role);
      const cur = ov ?? brandCurve;
      const id = `p3-easing-${r.role}`;
      const row = hook(h('div', 'p3-tweight'), 'easing-row');
      row.dataset.role = r.role;
      const now = !light() && ov === undefined ? DEPTH_COPY.autoLight(brandCurve) : cur;
      row.append(tokenLabel(`motion.easing-role.${r.role}`, DEPTH_COPY.easingRow(r.role), id), pickButton(r.role, id, now, ov !== undefined));
      rows.append(row);
      if (openPick === r.role && !derived()) {
        const pk = valuePicker({
          name: DEPTH_COPY.easingRow(r.role), modeLabel: modeLabel(mode), hint: DEPTH_COPY.easingHint,
          current: names.indexOf(cur),
          values: curves.map(([n, bez], i) => ({
            v: i, label: n,
            sample: (e: HTMLElement) => { e.dataset.curve = n; e.append(curveSvg(bez)); },
          })),
          ...(light() ? {} : { reset: { label: DEPTH_COPY.toAuto, enabled: ov !== undefined } }),
          // In a mode, Light's own curve is Auto: the legacy table never offered the self-map.
          onPick: (i) => edit('motionPersonality.easingRoles', () => setEasingRole(mode, r.role, light() || names[i] !== brandCurve ? names[i] : undefined)),
          onReset: () => edit('motionPersonality.easingRoles', () => setEasingRole(mode, r.role, undefined)),
          onClose: () => { openPick = null; render(); root.querySelector<HTMLElement>(`#${id}`)?.focus(); },
        });
        pickFocus = pk.focusCurrent;
        rows.append(pk.el);
      }
    }
    b.ctl.append(rows);
    return { el: b.el, said: `${b.said} ${theme.motion.easingRoles.map((r) => `${DEPTH_COPY.easingRow(r.role)} motion.easing-role.${r.role}`).join(' ')}`.toLowerCase(), key: 'motionPersonality.easingRoles', block: b };
  };

  // ── the sections ──────────────────────────────────────────────────────────────────────────────
  const sectionShell = (title: string, desc: string | undefined, i: number): HTMLElement => {
    const el = hook(h('section', 'p3-lsec'), 'lever-section');
    el.id = `p3-lsec-depth-${i}`;
    const head = h('div', 'p3-lsec-head');
    const t = h('h3', 'p3-lsec-title', title);
    t.id = `${el.id}-t`;
    el.setAttribute('aria-labelledby', t.id);
    head.append(t);
    if (desc) head.append(h('p', 'p3-lsec-desc', desc));
    el.append(head);
    // Q22: every control on this page edits the mode the preview shows, so a section says which, once.
    if (!light() && !derived()) el.append(hook(subLine(DEPTH_COPY.editing(modeLabel(currentMode))), 'depth-editing'));
    return el;
  };
  /** Elevation's own Show advanced (S6.2's form): a disclosure button and the Shadow tint block it opens. */
  const tintFold = (open: boolean): { el: HTMLElement; item: Item | null } => {
    const row = h('div', 'p3-advrow');
    const btn = hook(h('button', 'p3-btn p3-btn-page'), 'depth-tint-advanced');
    btn.type = 'button';
    btn.id = 'p3-adv-depth-tint';
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-controls', 'p3-advb-depth-tint');
    const n = section('Shadow tint').rows.length;
    btn.append(glyph(open ? 'chev' : 'chevr'), h('span', 'p3-btn-label', `${open ? 'Hide' : 'Show'} ${n} advanced`));
    btn.onclick = () => { tintOpen = !tintOpen; render(); };
    const body = h('div', 'p3-advbody');
    body.id = 'p3-advb-depth-tint';
    body.hidden = !open;
    let item: Item | null = null;
    if (open) { item = tint(); body.append(item.el); }
    row.append(btn, body);
    return { el: row, item };
  };

  const shape = (): string => JSON.stringify([currentMode, tintOpen || !!searchQuery.trim(), openPick, lastError && lastEdited,
    getPath(brandState, 'motionPersonality'), light() ? null : [tempoOverride(currentMode), getPath(brandState, `modeLevers.${currentMode}.easings`)]]);

  const render = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const focusKey = had && root.contains(had) ? had.getAttribute('data-p3') : null;
    const focusIndex = focusKey ? [...root.querySelectorAll(`[data-p3="${focusKey}"]`)].indexOf(had!) : -1;
    const scrollTop = host.scrollTop;
    shapeKey = shape();
    items = [];
    shadows = [];
    pickFocus = null;
    const parts: HTMLElement[] = [h('p', 'p3-intro', PAGE.intro)];
    if (derived()) parts.push(hook(stateLine(DEPTH_COPY.derived(modeLabel(currentMode))), 'depth-derived'));
    // Elevation, with Shadow tint behind its own Show advanced (D8 A); a search opens it.
    const elev = section('Elevation');
    const e = sectionShell(elev.title, elev.desc, 0);
    const soft = softness();
    const fold = tintFold(tintOpen || !!searchQuery.trim());
    e.append(soft.el, fold.el);
    items.push(soft, ...(fold.item ? [fold.item] : []));
    // Motion.
    const mot = section('Motion');
    const m = sectionShell(mot.title, mot.desc, 1);
    const t = tempo();
    const ez = easing();
    m.append(t.el, ez.el);
    items.push(t, ez);
    parts.push(e, m);
    const next = hook(h('button', 'p3-btn p3-btn-page p3-next'), 'depth-continue');
    next.type = 'button';
    next.append(h('span', 'p3-btn-label', DEPTH_COPY.next), glyph('chevr'));
    next.onclick = () => setPage(pageOfTab('layout', HOST));   // by tab (S7's pageOfTab): Layout's legacy page until S10
    const nr = h('div', 'p3-nextrow');
    nr.append(next);
    parts.push(nr);
    root.replaceChildren(...parts);
    syncShadows();
    // A derived mode is read-only, every control on the page (Q59). The info buttons only show a description, and
    // Elevation's Show advanced only discloses the tint sliders, so both stay live; what it opens is held.
    if (derived()) for (const n of root.querySelectorAll<HTMLButtonElement | HTMLInputElement>('.p3-lsec :is(button, input, select):not(.p3-info, [data-p3="depth-tint-advanced"])')) n.disabled = true;
    for (const it of items) it.block.setRefused(!!lastError && !!lastEdited && it.key === lastEdited);
    filter();
    if (focusPick && pickFocus) { focusPick = false; (pickFocus as () => void)(); }
    else if (focusKey) {
      const same = [...root.querySelectorAll<HTMLElement>(`[data-p3="${focusKey}"]`)];
      (same[Math.max(0, focusIndex)] ?? same[0])?.focus({ preventScroll: true });
    }
    if (host.scrollTop !== scrollTop) host.scrollTop = scrollTop;
  };

  /** Search (Q3): hide what does not match, report the count. */
  const filter = (): void => {
    const q = searchQuery.trim().toLowerCase();
    for (const it of items) it.el.hidden = !!q && !it.said.includes(q);
    for (const s of root.querySelectorAll<HTMLElement>('.p3-lsec')) s.hidden = !!q && !s.querySelector('.p3-lever:not([hidden])');
    for (const n of root.querySelectorAll<HTMLElement>('.p3-intro, .p3-nextrow, .p3-advrow > .p3-btn')) n.hidden = !!q;
    setSearchHits(q ? items.filter((it) => !it.el.hidden).length : null);
  };

  cleanups.push(subscribe('brand', () => {
    if (shape() !== shapeKey) { render(); return; }
    syncShadows();
    for (const it of items) it.block.setRefused(!!lastError && !!lastEdited && it.key === lastEdited);
  }));
  cleanups.push(subscribe('mode', () => { openPick = null; render(); }));
  cleanups.push(subscribe('search', () => { if (shape() !== shapeKey) render(); else filter(); }));
  cleanups.push(() => { if (searchQuery.trim()) setSearchHits(null); });
  render();
};
