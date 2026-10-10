/**
 * The levers panel's controls (UI redesign S2, concept v6's lever vocabulary): one lever block per manifest
 * key, and the controls a block holds. Shared by every page the levers panel draws, from Color › Palettes on.
 *
 * ONE BLOCK PER KEY. `leverBlock(key)` carries the key's `data-p3` hook (`leverHook`, `levers/controls.ts`),
 * so `test:chrome` can check that each manifest key homed on a page renders exactly once. The label and
 * the description are the manifest's own (`@prism3/engine/levers`) unless the page hands its own in
 * (`label`, `desc`): the page's words then win for this surface only, and the manifest's stay as they are.
 *
 * NO REPAINT OF ITS OWN. Each control calls the handler its page hands it, and that handler writes the
 * brand and calls `rebuild()`. A control's `set` updates it in place from the store, and never touches a
 * field that has focus, so a caret or a drag survives every repaint.
 *
 * Classes take the shell's `p3-` scope (`shell/dom.ts`). State is in ARIA attributes, never in a class.
 */
import { leverManifest } from '@prism3/engine/levers';
import type { Lever } from '@prism3/engine/levers';
import { leverHook } from '../levers/controls';
import { glyph, h, hook, switchEl } from '../shell/dom';
import { holdPersist, releasePersist } from '../state/store';

export const leverOf = (key: string): Lever | undefined => leverManifest.find((l) => l.key === key);
const slug = (k: string): string => leverHook(k).slice('lever-'.length);

export type LeverBlock = {
  readonly el: HTMLElement;
  readonly ctl: HTMLElement;
  /** The name the head draws (the page's, or the manifest's). */
  readonly label: string;
  readonly setReadout: (text: string) => void;
  readonly setState: (node: HTMLElement | null) => void;
  readonly setRefused: (yes: boolean) => void;
  /** The words search matches against: the label, the description and the key. */
  readonly said: string;
};

/** One lever: its label (a legend when the control is a group), an info button with the manifest's
 *  description as a toggletip, an optional readout, the control, an optional state line, and the refused
 *  mark an engine refusal shows. */
export const leverBlock = (key: string, opts: { label?: string; group?: boolean; forId?: string; desc?: string; alsoSays?: string } = {}): LeverBlock => {
  const L = leverOf(key);
  const label = opts.label ?? L?.label ?? key;
  // A schema input that is not a manifest lever (Brand's name, namespace, personality and modes, S3) has no
  // manifest description, so its page hands one in (concept v6's words) or shows no info button. A page may
  // also hand one in over a manifest lever's (Surfaces & fills' Background fills, S4c): the Studio's words
  // for that page, while the engine's description stays what MCP, the manifest and the emission read.
  const desc = opts.desc ?? L?.description ?? '';
  const el = hook(h(opts.group ? 'fieldset' : 'div', 'p3-lever'), leverHook(key));
  el.id = `p3-lv-${slug(key)}`;
  const head = h(opts.group ? 'legend' : 'div', 'p3-lever-head');
  const name = opts.forId && !opts.group ? h('label', 'p3-lever-name', label) : h('span', 'p3-lever-name', label);
  if (opts.forId && name instanceof HTMLLabelElement) name.htmlFor = opts.forId;
  head.append(name);
  let tip: HTMLElement | null = null;
  if (desc) {
    const info = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon p3-info'), 'lever-info');
    info.type = 'button';
    info.setAttribute('aria-label', `About ${label}`);
    info.setAttribute('aria-expanded', 'false');
    info.setAttribute('aria-controls', `p3-tip-${slug(key)}`);
    info.append(glyph('info'));
    tip = h('p', 'p3-tip', desc);
    tip.id = `p3-tip-${slug(key)}`;
    tip.hidden = true;
    info.onclick = () => { const open = tip!.hidden; tip!.hidden = !open; info.setAttribute('aria-expanded', String(open)); };
    head.append(info);
  }
  const readout = h('span', 'p3-readout');
  readout.hidden = true;
  head.append(readout);
  const ctl = h('div', 'p3-lever-ctl');
  const state = h('div', 'p3-lever-state');
  const refused = h('p', 'p3-refmark');
  refused.setAttribute('role', 'note');
  refused.append(glyph('x'), h('span', undefined, 'Refused. The preview keeps the last valid theme.'));
  refused.hidden = true;
  el.append(head, ...(tip ? [tip] : []), ctl, state, refused);
  noteBlock(key, el);
  return {
    el, ctl, label,
    setReadout: (t) => { setText(readout, t); if (readout.hidden !== !t) readout.hidden = !t; },
    // A state line is replaced only when its words change.
    setState: (n) => { if ((state.textContent ?? '') !== (n?.textContent ?? '')) state.replaceChildren(...(n ? [n] : [])); },
    setRefused: (yes) => { if (refused.hidden !== !yes) refused.hidden = !yes; if (yes) el.dataset.refused = 'true'; else if (el.dataset.refused) delete el.dataset.refused; },
    // `alsoSays`: searchable text only, never drawn (#2175: a lever whose control lives in another lever's block).
    said: `${label} ${desc} ${key}${opts.alsoSays ? ` ${opts.alsoSays}` : ''}`.toLowerCase(),
  };
};

// ── A choice row's state lines, announced (#2233) ─────────────────────────────────────────────────
/** ONE POLITE REGION PER CHOICE ROW, updated in place. A lever block that holds a choice (`choice` or `chipChoice`) has
 *  one live region, and it says the block's WARNING lines (`stateLine(…, 'warn')`: a clash, a refusal), each as its own
 *  paragraph, word for word: a line that appears is announced, one that stays is not said again, and one that goes is
 *  removed from the region, which a polite region does not announce. Hint lines stay visible and are never sent to
 *  the region (owner decision Q184 B, 2026-10-10).
 *
 *  WHY OUTSIDE THE PANEL. An edit redraws a page's levers whole (`root.replaceChildren`), or, on Palettes and Brand
 *  while the page keeps its shape, updates its blocks in place. Under a redraw a region inside a block would be a new
 *  node, or the same node detached and put back, on every edit, and a screen reader cannot be relied on to hear a
 *  change to either. The regions sync after each redraw (`leverBlock` notes the blocks it makes). No warning line in a
 *  choice row changes in place today (#2233 checked: Palettes' pinned-neutral line, the one `setState` an in-place
 *  sync makes in a choice row, is a hint), so an in-place update needs no sync of its own.
 *  The regions sit in one visually hidden holder on `<body>`, as the style guides' run line does (#2171), and are never
 *  touched by a redraw. A row that leaves the page is dropped with its region; drawn again, it gets a new region that
 *  already holds its words when it is put in the document, which is not announced, so a page drawn again says nothing
 *  until something on it changes.
 *
 *  The words are the visible line's own: no new text is announced. A line inside a block's own live region (Brand's
 *  namespace notes) is left to that region. */
const LIVE: Map<string, { region: HTMLElement; block: HTMLElement }> = new Map();
let fresh: [string, HTMLElement][] = [];
let liveHolder: HTMLElement | null = null;
const noteBlock = (key: string, el: HTMLElement): void => {
  if (!fresh.length) queueMicrotask(syncLive);
  fresh.push([key, el]);
};
const linesOf = (block: HTMLElement): string[] =>
  [...block.querySelectorAll<HTMLElement>('.p3-state-warn')]
    .filter((n) => !n.closest('[hidden]') && !n.parentElement?.closest('[aria-live]'))
    .map((n) => (n.textContent ?? '').trim())
    .filter(Boolean);
/** The region's paragraphs made to say `lines`, in order, keeping every paragraph that already says one. */
const sayLines = (region: HTMLElement, lines: readonly string[]): void => {
  const keep = new Set<Element>();
  let at: Element | null = null;
  for (const t of lines) {
    const old = [...region.children].find((c) => !keep.has(c) && c.textContent === t);
    const p = old ?? h('p', undefined, t);
    keep.add(p);
    if (!old) { if (at) at.after(p); else region.prepend(p); }
    at = p;
  }
  for (const c of [...region.children]) if (!keep.has(c)) c.remove();
};
function syncLive(): void {
  const batch = fresh;
  fresh = [];
  const seen = new Map<string, number>();
  for (const [key, block] of batch) {
    if (!block.querySelector('.p3-choice, .p3-chips')) continue;
    // A key drawn twice in one redraw keeps a region per drawing.
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    const k = n > 1 ? `${key}#${n}` : key;
    const had = LIVE.get(k);
    let region = had?.region;
    if (!region) {
      region = hook(h('div'), 'choice-live');
      region.dataset.key = k;
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      // A status is atomic by default: then a new line would re-read every line beside it.
      region.setAttribute('aria-atomic', 'false');
    }
    LIVE.set(k, { region, block });
  }
  for (const [k, { region, block }] of [...LIVE]) {
    // A row that left the page is dropped, region and all: a page drawn again makes it anew, already holding its words.
    if (!block.isConnected) { region.remove(); LIVE.delete(k); continue; }
    sayLines(region, linesOf(block));
    if (!region.isConnected) {
      if (!liveHolder) { liveHolder = hook(h('div', 'p3-sr'), 'choice-live-holder'); }
      if (!liveHolder.isConnected) document.body.append(liveHolder);
      liveHolder.append(region);
    }
  }
  // The rows held, for `test:chrome` §42 to read against the regions in the document (a dropped row is not kept).
  if (liveHolder) liveHolder.dataset.rows = String(LIVE.size);
}

/** BG1 A and HP5 (heading pass 2, owner approval 2026-10-06): a lever named exactly as its section says its name once,
 *  in the section's title. Its head row goes; its ⓘ moves beside the section title, `space-050` after it, and anything
 *  else its head held (a switch, a shown readout) moves to the far end of the title's row. Its tip opens under the
 *  section's head, and its own one-line lead (the editing-mode line) joins the head as its last description line. The
 *  lever's group or control is then named by the section title, so nothing loses its accessible name. Called by a
 *  page once the lever is in its section; `section` is the `.p3-lsec`. */
export const promoteLever = (section: HTMLElement, b: LeverBlock): void => {
  const head = section.querySelector<HTMLElement>(':scope > .p3-lsec-head');
  const title = head?.querySelector<HTMLElement>('.p3-lsec-title');
  const lhead = b.el.querySelector<HTMLElement>(':scope > .p3-lever-head');
  if (!head || !title || !lhead) return;
  let row = head.querySelector<HTMLElement>(':scope > .p3-lsec-titlerow');
  if (!row) {
    row = h('div', 'p3-lsec-titlerow');
    title.replaceWith(row);
    row.append(title);
  }
  const info = lhead.querySelector<HTMLElement>(':scope > .p3-info');
  if (info) row.append(info);
  const rest = [...lhead.children].filter((c) => !c.matches('.p3-lever-name, .p3-info') && !(c.matches('.p3-readout') && (c as HTMLElement).hidden));
  if (rest.length) {
    const end = h('span', 'p3-lsec-end');
    end.append(...rest);
    row.append(end);
  }
  const lead = b.ctl.querySelector<HTMLElement>(':scope > .p3-sub:first-child, :scope > .p3-modegroup:first-child > .p3-sub:first-child');
  if (lead) { lead.classList.add('p3-lsec-desc', 'p3-lsec-lead'); head.append(lead); }
  const tip = b.el.querySelector<HTMLElement>(':scope > .p3-tip');
  if (tip) head.append(tip);
  lhead.hidden = true;
  if (!title.id) title.id = `${b.el.id}-t`;
  // A fieldset's name was its legend; a control its head's <label> named takes the title instead, unless it names itself.
  if (b.el instanceof HTMLFieldSetElement) b.el.setAttribute('aria-labelledby', title.id);
  const name = lhead.querySelector('.p3-lever-name');
  if (name instanceof HTMLLabelElement && name.htmlFor) {
    const ctl = b.el.querySelector<HTMLElement>(`#${CSS.escape(name.htmlFor)}`);
    if (ctl && !ctl.hasAttribute('aria-label') && !ctl.hasAttribute('aria-labelledby')) ctl.setAttribute('aria-labelledby', title.id);
  }
  b.el.dataset.promoted = 'true';
};

/** An info button and the toggletip it opens, as a lever's head draws them, for a control INSIDE a lever that has
 *  its own note (S4f, QA-B6: Surfaces & fills' contrast floor row). The same classes and the same hook as the
 *  lever's (`lever-info`): it opens help and edits nothing. The caller places the tip. */
export const infoTip = (id: string, label: string, text: string): { button: HTMLButtonElement; tip: HTMLElement } => {
  const button = hook(h('button', 'p3-btn p3-btn-ghost p3-btn-icon p3-info'), 'lever-info');
  button.type = 'button';
  button.setAttribute('aria-label', `About ${label}`);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', id);
  button.append(glyph('info'));
  const tip = h('p', 'p3-tip', text);
  tip.id = id;
  tip.hidden = true;
  button.onclick = () => { const open = tip.hidden; tip.hidden = !open; button.setAttribute('aria-expanded', String(open)); };
  return { button, tip };
};

/** A plain note under a control (`hint`), or a warning. A hint draws no glyph: the ⓘ is only ever a button (the
 *  heading pass, TY2 A and HP3), so a hint reads as a plain description. A warning keeps its warning glyph. */
export const stateLine = (text: string, kind: 'hint' | 'warn' = 'hint'): HTMLElement => {
  const p = h('p', kind === 'hint' ? 'p3-state p3-state-hint' : 'p3-state p3-state-warn');
  if (kind === 'warn') p.append(glyph('warn'));
  p.append(h('span', undefined, text));
  return p;
};
export const subLine = (text: string): HTMLElement => h('p', 'p3-sub', text);

/** A control's name and the token it sets (the owner's QA-B2, 2026-10-02): the label first, so it is read first,
 *  and the token under it, in mono. Every fill row, every Surfaces & fills field and every Type family row draws
 *  its name through this one helper, so the order is decided once. It reverses #1980's "token first" (and Type's
 *  Q68 order with it). A `forId` makes it the control's `<label>`. `onLine` (#2217, heading pass 2): a label stacked
 *  over its control, with nothing on its right, puts the token flush right on its own line, wrapping under it when the
 *  two do not fit (and always at the narrow tier); the DOM order stays label, then token. */
export const tokenLabel = (token: string, label: string, forId?: string, opts: { onLine?: boolean } = {}): HTMLElement => {
  const l = h(forId ? 'label' : 'div', opts.onLine ? 'p3-fill-name p3-fill-name-online' : 'p3-fill-name');
  if (forId && l instanceof HTMLLabelElement) l.htmlFor = forId;
  l.dataset.role = token;
  l.append(h('b', 'p3-fill-label', label), h('span', 'p3-fill-tok', token));
  return l;
};

/** The jump links' visible label (QA-B17, APPROVED copy). The links' landmark keeps its own accessible name. */
export const JUMP_TO = 'Jump to:';
/** The label, drawn first in a page's jump links. */
export const jumpLabel = (): HTMLElement => hook(h('span', 'p3-jump-label', JUMP_TO), 'jump-label');

const focused = (n: Element): boolean => document.activeElement === n;

/** Commit a text field on `change`, and only there (#2487 A1, A2). The browser already fires `change` on Enter, so a
 *  second Enter listener committed twice, and the second commit, from the field the first one's redraw had replaced,
 *  could delete a different breakpoint. And the commit waits one task: Tab's `change` fires before focus moves, so a
 *  commit made then redraws the page while focus is still on the old field, and the browser's Tab target is gone
 *  (focus lands on BODY). A microtask runs too early for that; a task runs after focus has moved, so the redraw keeps
 *  focus where Tab sent it. `textField` uses it, and so does a page's own field that commits on `change` and redraws.
 *  (`colorField` keeps its Enter: its page repaints it in place, and its `cur` guard drops the second commit.) */
export const onCommitted = (el: HTMLInputElement, commit: (value: string) => void): void => {
  // The value is the one `change` fired with, captured then: a repaint inside that one task must not change what is
  // committed (#2487 PR 1's review).
  el.addEventListener('change', () => { const v = el.value; setTimeout(() => commit(v)); });
};

/**
 * A drag's writes, once per frame (#2487 B1). An `input` that fires on every pointer move ran the page's whole edit, a
 * full re-resolve and a `localStorage` write, per tick. `perFrame` hands `run` the latest value once per animation
 * frame, and holds the store's persist from the first `input` until the control is released, so a drag stores once.
 * The release (`change`, `pointerup`, `pointercancel`, `blur`, or `QUIET_MS` with no `input`) runs a value still waiting first. The control's own
 * readout (`aria-valuetext`) stays the caller's to write at once.
 */
/** How long a held control may sit with no `input` before its value is stored anyway. */
const QUIET_MS = 400;
export const perFrame = <T>(el: HTMLElement, run: (v: T) => void): ((v: T) => void) => {
  let raf = 0;
  let next: T;
  let held = false;
  let quiet = 0;
  const flush = (): void => { if (raf) { cancelAnimationFrame(raf); raf = 0; run(next); } };
  const release = (): void => { clearTimeout(quiet); flush(); if (held) { held = false; releasePersist(); } };
  for (const t of ['change', 'pointerup', 'pointercancel', 'blur']) el.addEventListener(t, release);
  return (v) => {
    next = v;
    if (!held) {
      held = true;
      holdPersist();
      // A control a repaint replaced mid-drag gets no release of its own; the pointer's, anywhere, is the drag's end.
      for (const t of ['pointerup', 'pointercancel']) window.addEventListener(t, release, { once: true, capture: true });
    }
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; run(next); if (!el.isConnected) release(); });
    // And a value set with no release at all (an `input` and nothing after it) is stored once things go quiet.
    clearTimeout(quiet);
    quiet = window.setTimeout(release, QUIET_MS);
  };
};
/** Write text only when it changed: a same-value write still replaces the text node and costs a layout. */
export const setText = (n: Node, t: string): void => { if (n.textContent !== t) n.textContent = t; };

/** A color field (concept v6's): the native picker, the hex as text, and the OKLCH readout. The picker
 *  writes as it moves; the text writes on Enter or blur, and a value that is not a hex is put back. */
export const colorField = (id: string, label: string, role: string, onPick: (hex: string) => void): {
  el: HTMLElement; picker: HTMLInputElement; set: (hex: string, meta: string) => void;
} => {
  const el = h('div', 'p3-colorfield');
  const picker = hook(h('input', 'p3-color-input'), `${role}-color`);
  picker.type = 'color';
  picker.id = id;
  picker.setAttribute('aria-label', label);
  picker.dataset.content = '';
  const text = hook(h('input', 'p3-hex-input'), `${role}-hex`);
  text.type = 'text';
  text.spellcheck = false;
  text.setAttribute('aria-label', `${label} hex`);
  const meta = h('span', 'p3-colorfield-meta');
  el.append(picker, text, meta);
  let cur = '';
  const pick = perFrame(picker, onPick);
  picker.addEventListener('input', () => { text.value = picker.value; pick(picker.value); });
  const commit = (): void => {
    const m = /^#?([0-9a-f]{6})$/i.exec(text.value.trim());
    if (!m) { text.value = cur; return; }
    const v = `#${m[1].toLowerCase()}`;
    if (v !== cur) { picker.value = v; onPick(v); }
  };
  text.addEventListener('change', commit);
  text.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
  return {
    el, picker,
    set: (hx, m) => {
      cur = hx;
      if (!focused(picker) && picker.value !== hx) picker.value = hx;
      if (!focused(text) && text.value !== hx) text.value = hx;
      setText(meta, m);
    },
  };
};

/** The readout a slider shows: its value, unit and the named stop it sits on (the manifest's stops). */
export const sliderReadout = (L: Lever, v: number): string => {
  const unit = L.unit ? (L.unit === '°' ? '°' : ` ${L.unit}`) : '';
  const dp = String(L.step ?? 1).includes('.') ? String(L.step).split('.')[1].length : 0;
  const stop = Object.entries(L.stops ?? {}).find(([, x]) => Math.abs(x - v) < (L.step ?? 1e-6) / 2)?.[0];
  return `${Number(v).toFixed(dp)}${unit}${stop ? ` · ${stop}` : ''}`;
};

/** A slider over the manifest's range and step, named, with its readout as the value text. A key that is one part
 *  of an object lever (Depth & motion's tint hue and amount, S9.2) hands its own range in `part`, with the id
 *  suffix that keeps the two sliders apart; its readout is the value and the unit. */
export const slider = (key: string, role: string, label: string, onInput: (v: number) => void,
  part?: { readonly id: string; readonly min: number; readonly max: number; readonly step: number; readonly unit?: string }): {
  el: HTMLInputElement; set: (v: number) => void;
} => {
  const L: Lever = part ? { ...leverOf(key)!, min: part.min, max: part.max, step: part.step, unit: part.unit, stops: undefined } : leverOf(key)!;
  const el = hook(h('input', 'p3-range'), role);
  el.type = 'range';
  el.id = part ? `p3-${slug(key)}-${part.id}` : `p3-${slug(key)}`;
  el.min = String(L.min ?? 0); el.max = String(L.max ?? 1); el.step = String(L.step ?? 1);
  el.setAttribute('aria-label', label);
  const drag = perFrame(el, onInput);
  el.addEventListener('input', () => { el.setAttribute('aria-valuetext', sliderReadout(L, Number(el.value))); drag(Number(el.value)); });
  return {
    el,
    set: (v) => {
      if (!focused(el) && el.value !== String(v)) el.value = String(v);
      const t = sliderReadout(L, v);
      if (el.getAttribute('aria-valuetext') !== t) el.setAttribute('aria-valuetext', t);
    },
  };
};

/** A choice of two to four, as concept v6's chips: a radio group of segment buttons, arrow keys between. */
export const choice = <V extends string>(label: string, role: string, options: readonly { v: V; l: string }[], onPick: (v: V) => void): {
  el: HTMLElement; set: (v: V) => void;
} => {
  const el = hook(h('div', 'p3-seg p3-choice'), role);
  el.setAttribute('role', 'radiogroup');
  el.setAttribute('aria-label', label);
  const btns = options.map((o) => {
    const b = hook(h('button', 'p3-seg-tab'), `${role}-${o.v}`);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.dataset.value = o.v;
    b.textContent = o.l;
    b.onclick = () => { if (b.getAttribute('aria-checked') !== 'true') onPick(o.v); };
    return b;
  });
  el.append(...btns);
  el.addEventListener('keydown', (e) => {
    const i = btns.indexOf(e.target as HTMLButtonElement);
    if (i < 0) return;
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    // A disabled option is passed over, as a radio group does (#2233); with none other enabled, nothing moves.
    let j = i;
    do j = (j + step + btns.length) % btns.length; while (j !== i && btns[j].disabled);
    if (j === i) return;
    const to = btns[j];
    to.focus();
    to.click();
  });
  return {
    el,
    set: (v) => { for (const b of btns) { const on = b.dataset.value === v; if (b.getAttribute('aria-checked') !== String(on)) { b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; } } },
  };
};

/** One option of a `choice` or `chipChoice` the engine would refuse: disabled, its reason in `title` for a pointer.
 *  A disabled button takes no focus, so when the reason is also drawn as a line (`reasonId`, that line's id), the line
 *  describes the GROUP, which a keyboard reaches through its other options (#2233). With no line drawn, `title` is
 *  the only place the reason is said. */
export const refuseOption = (group: HTMLElement, value: string, why: string, reasonId?: string): void => {
  const b = group.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(value)}"]`);
  if (!b) return;
  b.disabled = true;
  b.title = why;
  if (!reasonId) return;
  const ids = (group.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
  if (!ids.includes(reasonId)) group.setAttribute('aria-describedby', [...ids, reasonId].join(' '));
};

/** A select in the chrome's style, its options given as value and label. */
export const selectField = (id: string, label: string, role: string, onChange: (v: string) => void): {
  el: HTMLElement; select: HTMLSelectElement; set: (opts: readonly { v: string; l: string; off?: string }[], cur: string) => void;
} => {
  const wrap = h('div', 'p3-selwrap');
  const select = hook(h('select', 'p3-select'), role);
  select.id = id;
  select.setAttribute('aria-label', label);
  select.onchange = () => onChange(select.value);
  wrap.append(select, glyph('chev'));
  return {
    el: wrap, select,
    set: (opts, cur) => {
      const sig = opts.map((o) => `${o.v}=${o.l}${o.off ? `!${o.off}` : ''}`).join('|');
      if (select.dataset.sig !== sig) {
        select.dataset.sig = sig;
        // `off`: the option is offered disabled, its reason in the title (#2044).
        select.replaceChildren(...opts.map((o) => { const x = h('option', undefined, o.l); x.value = o.v; if (o.off) { x.disabled = true; x.title = o.off; } return x; }));
      }
      if (select.value !== cur) select.value = cur;
    },
  };
};

/** A lever's switch: the chrome's one track-and-knob switch (`switchEl`, #2183), with the `id` its lever's label
 *  points at. It replaced the dot-and-word switch (the S1.4 Agent switch's form); its state is no longer in words. */
export const switchButton = (id: string, label: string, role: string, onToggle: (on: boolean) => void): {
  el: HTMLButtonElement; set: (on: boolean) => void;
} => {
  const sw = switchEl(role, label, onToggle);
  sw.el.id = id;
  return sw;
};

/** The add button a growing list ends on (V7's dashed add row; the owner's QA-I4, 2026-10-02): full width, a
 *  dashed edge, a plus and its label. One helper so every list draws one control: Interactive's Add button set
 *  first, and Brand's Add custom mode and Gradients' Add gradient when they move onto it (QA-R1, QA-B15). */
export const addRowButton = (role: string, label: string, onClick: () => void): HTMLButtonElement => {
  const el = hook(h('button', 'p3-btn p3-addrow'), role);
  el.type = 'button';
  el.append(glyph('plus'), h('span', 'p3-btn-label', label));
  el.onclick = onClick;
  return el;
};

/** A one-line text field with its own edge (B1), labeled by its lever (`forId`) or by `label`. Writes on
 *  every keystroke when `onInput` is given, and on Enter or blur through `onCommit`. `set` never touches a
 *  focused field, so a caret survives every repaint. */
export const textField = (id: string, role: string, opts: { label?: string; mono?: boolean; describedBy?: string;
  onInput?: (v: string) => void; onCommit?: (v: string, field: HTMLInputElement) => void }): { el: HTMLInputElement; set: (v: string) => void } => {
  const el = hook(h('input', opts.mono ? 'p3-text-input p3-value' : 'p3-text-input'), role);
  el.type = 'text';
  el.id = id;
  el.spellcheck = false;
  el.autocomplete = 'off';
  if (opts.label) el.setAttribute('aria-label', opts.label);
  if (opts.describedBy) el.setAttribute('aria-describedby', opts.describedBy);
  if (opts.onInput) { const f = opts.onInput; el.addEventListener('input', () => f(el.value)); }
  if (opts.onCommit) { const f = opts.onCommit; onCommitted(el, (v) => f(v, el)); }
  return { el, set: (v) => { if (!focused(el) && el.value !== v) el.value = v; } };
};

/** A check: a button with `role="checkbox"`, a box that shows the check glyph when on, its name and a note
 *  (concept v6's mode rows). Unavailable is `aria-disabled`, so it keeps its focus stop and says why in its
 *  note, which is its description. */
export const checkRow = (id: string, role: string, name: string, onToggle: (on: boolean) => void): {
  el: HTMLButtonElement; set: (on: boolean, note: string, locked?: boolean) => void;
} => {
  const el = hook(h('button', 'p3-btn p3-btn-page p3-check'), role);
  el.type = 'button';
  el.id = id;
  el.setAttribute('role', 'checkbox');
  const box = h('span', 'p3-check-box');
  box.setAttribute('aria-hidden', 'true');
  box.append(glyph('check'));
  const text = h('span', 'p3-check-text');
  const nm = h('span', 'p3-check-name', name);
  const note = h('span', 'p3-check-note');
  note.id = `${id}-note`;
  text.append(nm, note);
  el.setAttribute('aria-describedby', note.id);
  el.append(box, text);
  el.onclick = () => { if (el.getAttribute('aria-disabled') !== 'true') onToggle(el.getAttribute('aria-checked') !== 'true'); };
  return {
    el,
    set: (on, n, locked = false) => {
      if (el.getAttribute('aria-checked') !== String(on)) el.setAttribute('aria-checked', String(on));
      if (locked) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
      setText(note, n);
    },
  };
};

/** A word that is on or off: a button with `aria-pressed`, the check glyph showing when it is on (concept
 *  v6's chips). */
export const toggleChip = (role: string, word: string, onToggle: (on: boolean) => void): { el: HTMLButtonElement; set: (on: boolean) => void } => {
  const el = hook(h('button', 'p3-btn p3-btn-page p3-chip'), role);
  el.type = 'button';
  el.dataset.word = word;
  el.append(glyph('check'), h('span', 'p3-btn-label', word));
  el.onclick = () => onToggle(el.getAttribute('aria-pressed') !== 'true');
  return { el, set: (on) => { if (el.getAttribute('aria-pressed') !== String(on)) el.setAttribute('aria-pressed', String(on)); } };
};

/** One of two to four words, as chips (#2192): `toggleChip`'s look, single-select. A `role="group"` named by
 *  `label`; each chip a button with `aria-pressed`, exactly one pressed. Keyboard as Personality's chips: each
 *  chip is a Tab stop, Enter or Space presses it. Pressing the pressed chip writes nothing. Same signature as
 *  `choice`, so a lever moves between the two without its writes changing. */
export const chipChoice = <V extends string>(label: string, role: string, options: readonly { v: V; l: string }[], onPick: (v: V) => void): {
  el: HTMLElement; set: (v: V) => void;
} => {
  const el = hook(h('div', 'p3-chips'), role);
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', label);
  const btns = options.map((o) => {
    const b = hook(h('button', 'p3-btn p3-btn-page p3-chip'), `${role}-${o.v}`);
    b.type = 'button';
    b.dataset.value = o.v;
    b.append(glyph('check'), h('span', 'p3-btn-label', o.l));
    b.onclick = () => { if (b.getAttribute('aria-pressed') !== 'true') onPick(o.v); };
    return b;
  });
  el.append(...btns);
  return {
    el,
    set: (v) => { for (const b of btns) { const on = String(b.dataset.value === v); if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on); } },
  };
};

/** A confirm drawn in place, under the control that asked for it (concept v6's confirm dialog, inline): a
 *  title, what the action changes, the action and Cancel. Focus moves to the action; Escape or Cancel
 *  closes it and returns focus to `back`. */
export const inlineConfirm = (role: string, opts: { title: string; body: readonly (string | HTMLElement)[]; action: string;
  onConfirm: () => void; onCancel: () => void; back: () => HTMLElement | null }): HTMLElement => {
  const el = hook(h('div', 'p3-confirm'), role);
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'false');
  const title = h('p', 'p3-confirm-title', opts.title);
  title.id = `p3-${role}-title`;
  el.setAttribute('aria-labelledby', title.id);
  el.append(title, ...opts.body.map((b) => (typeof b === 'string' ? h('p', 'p3-confirm-line', b) : b)));
  const row = h('div', 'p3-confirm-row');
  const go = hook(h('button', 'p3-btn p3-btn-page'), `${role}-go`);
  go.type = 'button';
  go.append(h('span', 'p3-btn-label', opts.action));
  const cancel = hook(h('button', 'p3-btn p3-btn-page'), `${role}-cancel`);
  cancel.type = 'button';
  cancel.append(h('span', 'p3-btn-label', 'Cancel'));
  // `back` is asked AFTER the action, since the action may redraw the lever the confirm sits in.
  const close = (f: () => void): void => { f(); opts.back()?.focus(); };
  go.onclick = () => close(opts.onConfirm);
  cancel.onclick = () => close(opts.onCancel);
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(opts.onCancel); } });
  row.append(go, cancel);
  el.append(row);
  queueMicrotask(() => { if (go.isConnected) go.focus(); });
  return el;
};
