/**
 * The levers panel's controls (UI redesign S2, concept v6's lever vocabulary): one lever block per manifest
 * key, and the controls a block holds. Shared by every page the levers panel draws, from Color › Palettes on.
 *
 * ONE BLOCK PER KEY. `leverBlock(key)` carries the key's `data-p3` hook (`leverHook`, `levers/controls.ts`),
 * so `test:chrome` can check that each manifest key homed on a page renders exactly once. The label and
 * the description are the manifest's own (`@prism3/engine/levers`); nothing here restates one.
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
import { glyph, h, hook } from '../shell/dom';

export const leverOf = (key: string): Lever | undefined => leverManifest.find((l) => l.key === key);
const slug = (k: string): string => leverHook(k).slice('lever-'.length);

export type LeverBlock = {
  readonly el: HTMLElement;
  readonly ctl: HTMLElement;
  readonly setReadout: (text: string) => void;
  readonly setState: (node: HTMLElement | null) => void;
  readonly setRefused: (yes: boolean) => void;
  /** The words search matches against: the label, the description and the key. */
  readonly said: string;
};

/** One lever: its label (a legend when the control is a group), an info button with the manifest's
 *  description as a toggletip, an optional readout, the control, an optional state line, and the refused
 *  mark an engine refusal shows. */
export const leverBlock = (key: string, opts: { label?: string; group?: boolean; forId?: string } = {}): LeverBlock => {
  const L = leverOf(key);
  const label = opts.label ?? L?.label ?? key;
  const desc = L?.description ?? '';
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
  return {
    el, ctl,
    setReadout: (t) => { setText(readout, t); if (readout.hidden !== !t) readout.hidden = !t; },
    // A state line is replaced only when its words change.
    setState: (n) => { if ((state.textContent ?? '') !== (n?.textContent ?? '')) state.replaceChildren(...(n ? [n] : [])); },
    setRefused: (yes) => { if (refused.hidden !== !yes) refused.hidden = !yes; if (yes) el.dataset.refused = 'true'; else if (el.dataset.refused) delete el.dataset.refused; },
    said: `${label} ${desc} ${key}`.toLowerCase(),
  };
};

/** A plain note under a control (`hint`), or a warning. */
export const stateLine = (text: string, kind: 'hint' | 'warn' = 'hint'): HTMLElement => {
  const p = h('p', kind === 'hint' ? 'p3-state p3-state-hint' : 'p3-state p3-state-warn');
  p.append(glyph(kind === 'hint' ? 'info' : 'x'), h('span', undefined, text));
  return p;
};
export const subLine = (text: string): HTMLElement => h('p', 'p3-sub', text);

const focused = (n: Element): boolean => document.activeElement === n;
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
  picker.addEventListener('input', () => { text.value = picker.value; onPick(picker.value); });
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

/** A slider over the manifest's range and step, named, with its readout as the value text. */
export const slider = (key: string, role: string, label: string, onInput: (v: number) => void): {
  el: HTMLInputElement; set: (v: number) => void;
} => {
  const L = leverOf(key)!;
  const el = hook(h('input', 'p3-range'), role);
  el.type = 'range';
  el.id = `p3-${slug(key)}`;
  el.min = String(L.min ?? 0); el.max = String(L.max ?? 1); el.step = String(L.step ?? 1);
  el.setAttribute('aria-label', label);
  el.addEventListener('input', () => { el.setAttribute('aria-valuetext', sliderReadout(L, Number(el.value))); onInput(Number(el.value)); });
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
    const to = btns[(i + step + btns.length) % btns.length];
    to.focus();
    to.click();
  });
  return {
    el,
    set: (v) => { for (const b of btns) { const on = b.dataset.value === v; if (b.getAttribute('aria-checked') !== String(on)) { b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; } } },
  };
};

/** A select in the chrome's style, its options given as value and label. */
export const selectField = (id: string, label: string, role: string, onChange: (v: string) => void): {
  el: HTMLElement; select: HTMLSelectElement; set: (opts: readonly { v: string; l: string }[], cur: string) => void;
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
      const sig = opts.map((o) => `${o.v}=${o.l}`).join('|');
      if (select.dataset.sig !== sig) {
        select.dataset.sig = sig;
        select.replaceChildren(...opts.map((o) => { const x = h('option', undefined, o.l); x.value = o.v; return x; }));
      }
      if (select.value !== cur) select.value = cur;
    },
  };
};

/** A switch: a button with `role="switch"`, a dot and its state in words (the S1.4 Agent switch's form). */
export const switchButton = (id: string, label: string, role: string, words: { on: string; off: string }, onToggle: (on: boolean) => void): {
  el: HTMLButtonElement; set: (on: boolean) => void;
} => {
  const el = hook(h('button', 'p3-btn p3-btn-page p3-switch'), role);
  el.type = 'button';
  el.id = id;
  el.setAttribute('role', 'switch');
  el.setAttribute('aria-label', label);
  const dot = h('span', 'p3-dot p3-switch-dot');
  dot.setAttribute('aria-hidden', 'true');
  const text = h('span', 'p3-btn-label');
  el.append(dot, text);
  el.onclick = () => onToggle(el.getAttribute('aria-checked') !== 'true');
  return {
    el,
    set: (on) => { el.setAttribute('aria-checked', String(on)); el.dataset.on = String(on); setText(text, on ? words.on : words.off); },
  };
};
