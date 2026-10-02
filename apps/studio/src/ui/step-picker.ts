/**
 * The step picker (concept v6's V9, which the owner asked to keep): a swatch grid of one palette's steps,
 * each with its contrast ratio against what the role is measured on, a below-floor mark, the current step
 * checked, a palette select, Return to Auto and Close.
 *
 * SHIPPED UNMOUNTED IN S2. The plan lists it under Color › Palettes, but concept v6 gives Palettes no
 * use for it: its home is the Surfaces & fills rows (the Roles matrix cells v6 also drew are not built,
 * owner decision Q31), which write a role override (`overrides[mode][role] = { palette, step }`). So S2 ships the shared component and its
 * tests, and S4's fill rows are its first product mount. `test:chrome` drives it on a fixture page built
 * from this file, never from a shipped route.
 *
 * WHAT IT WRITES: nothing itself. A chosen step calls `onPick(palette, step)`, Return to Auto calls
 * `onAuto()`, and the host writes the brand and repaints by store subscription, as every new control does.
 * Escape and Close call `onClose()`; the host returns focus to the control that opened it.
 *
 * KEYBOARD: arrow keys move along the grid (Up and Down by a row), Home and End go to the first and last
 * step, Enter or Space chooses, Escape closes. A choice does not move the picker's focus.
 */
import { contrast, hexToRgb } from '@prism3/engine/color';
import { glyph, h, hook } from '../shell/dom';

export type PickerStep = { readonly key: string; readonly hex: string };
export type PickerPalette = { readonly palette: string; readonly steps: readonly PickerStep[] };
export type StepPickerOpts = {
  /** The role being picked for, shown as the picker's title. */
  readonly role: string;
  /** The mode, in words (`Light (base)`). */
  readonly modeLabel: string;
  readonly palettes: readonly PickerPalette[];
  /** The step the role resolves to now. */
  readonly current: { readonly palette: string; readonly step: string } | null;
  /** The color the role is measured against, its name, and its floor; null when the role has no floor. */
  readonly against: { readonly hex: string; readonly name: string; readonly floor: number } | null;
  /** True when the role is overridden now, so Return to Auto has something to undo. */
  readonly overridden: boolean;
  /** False for a control with no Auto to return to (the page surface, Q21 and Q45): no Return to Auto. */
  readonly auto?: boolean;
  readonly onPick: (palette: string, step: string) => void;
  readonly onAuto: () => void;
  readonly onClose: () => void;
};

/** A ratio as the chrome prints one: two decimals, floored, so a pick never reads above what it measures. */
export const fmtRatio = (r: number): string => `${(Math.floor(r * 100) / 100).toFixed(2)}:1`;

/** The picker. `el` is the group; `focusCurrent` puts focus on the current step (or the first). */
export const stepPicker = (o: StepPickerOpts): { el: HTMLElement; focusCurrent: () => void } => {
  const el = hook(h('div', 'p3-picker'), 'step-picker');
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', `Pick a step for ${o.role} in ${o.modeLabel}`);
  let shown = o.palettes.find((p) => p.palette === o.current?.palette) ?? o.palettes[0];

  const head = h('div', 'p3-picker-head');
  head.append(h('b', 'p3-picker-role p3-value', o.role), h('span', 'p3-picker-mode', o.modeLabel), h('span', 'p3-spacer'));
  const close = hook(h('button', 'p3-btn p3-btn-page p3-btn-ghost'), 'step-picker-close');
  close.type = 'button';
  close.append(glyph('x'), h('span', 'p3-btn-label', 'Close'));
  close.onclick = () => o.onClose();
  head.append(close);
  const hint = h('p', 'p3-picker-hint', o.against
    ? `Floor ${o.against.floor}:1 against ${o.against.name}. Each step shows its ratio before you choose.`
    : 'No contrast floor on this role.');

  const tools = h('div', 'p3-picker-tools');
  const selWrap = h('label', 'p3-picker-pal');
  selWrap.append(h('span', 'p3-picker-pal-name', 'Palette'));
  const sw = h('div', 'p3-selwrap');
  const sel = hook(h('select', 'p3-select'), 'step-picker-palette');
  sel.setAttribute('aria-label', 'Palette');
  for (const p of o.palettes) { const x = h('option', undefined, p.palette); x.value = p.palette; sel.append(x); }
  sel.value = shown.palette;
  sw.append(sel, glyph('chev'));
  selWrap.append(sw);
  const auto = hook(h('button', 'p3-btn p3-btn-page'), 'step-picker-auto');
  auto.type = 'button';
  auto.textContent = 'Return to Auto';
  auto.disabled = !o.overridden;
  auto.onclick = () => o.onAuto();
  tools.append(selWrap, h('span', 'p3-spacer'));
  if (o.auto !== false) tools.append(auto);

  const grid = hook(h('div', 'p3-picker-steps'), 'step-picker-steps');
  let buttons: HTMLButtonElement[] = [];
  const drawSteps = (): void => {
    buttons = shown.steps.map((s) => {
      const ratio = o.against ? contrast(hexToRgb(s.hex), hexToRgb(o.against.hex)) : null;
      const below = !!o.against && ratio !== null && ratio + 1e-9 < o.against.floor;
      const cur = o.current?.palette === shown.palette && o.current.step === s.key;
      const b = hook(h('button', 'p3-step'), 'step-picker-step');
      b.type = 'button';
      b.dataset.step = s.key;
      b.dataset.palette = shown.palette;
      if (below) b.dataset.below = 'true';
      b.setAttribute('aria-pressed', String(cur));
      b.setAttribute('aria-label', `${shown.palette} ${s.key}${ratio !== null ? `, ${fmtRatio(ratio)}` : ''}${below ? ', below floor' : ''}${cur ? ', current' : ''}`);
      b.tabIndex = -1;
      const chip = h('span', 'p3-step-chip');
      chip.dataset.content = '';
      chip.style.background = s.hex;
      const key = h('span', 'p3-step-key', s.key);
      if (cur) key.append(glyph('check'));
      const r = h('span', 'p3-step-ratio', ratio !== null ? fmtRatio(ratio) : '');
      if (below) r.append(glyph('x'));
      b.append(chip, key, r);
      b.onclick = () => o.onPick(shown.palette, s.key);
      return b;
    });
    const start = buttons.find((b) => b.getAttribute('aria-pressed') === 'true') ?? buttons[0];
    if (start) start.tabIndex = 0;
    grid.replaceChildren(...buttons);
  };
  sel.onchange = () => { shown = o.palettes.find((p) => p.palette === sel.value) ?? shown; drawSteps(); };

  /** The grid's column count, as laid out (it fills its width with steps of a fixed minimum). */
  const columns = (): number => {
    const tops = buttons.map((b) => b.offsetTop);
    const n = tops.filter((t) => t === tops[0]).length;
    return Math.max(1, n);
  };
  grid.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(e.target as HTMLButtonElement);
    if (i < 0) return;
    const c = columns();
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'ArrowDown' ? i + c : e.key === 'ArrowUp' ? i - c
      : e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const t = buttons[Math.max(0, Math.min(buttons.length - 1, to))];
    for (const b of buttons) b.tabIndex = b === t ? 0 : -1;
    t.focus();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    o.onClose();
  });

  drawSteps();
  el.append(head, hint, tools, grid);
  return {
    el,
    focusCurrent: () => (buttons.find((b) => b.tabIndex === 0) ?? buttons[0])?.focus(),
  };
};
