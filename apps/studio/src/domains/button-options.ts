/**
 * Button options (UI redesign S8.2; moved by #2700). The way to Shape › Density, then Button icons, Button label & icon,
 * Button label weight and text-button hover as chips, and Button minimum width as a slider.
 *
 * WHERE THEY ARE DRAWN (#2700, call 9 A). They used to be the Components levers panel's Button section. With the list in
 * the levers pane, the options sit with the family they shape: the preview pane's Buttons block, and at the narrow tier
 * the same block opened inline under the Buttons row. One builder, so the two places cannot drift.
 *
 * WHICH MODE A CONTROL EDITS. None of the options has a per-mode value (no `ModeLevers` field), so each writes the same
 * bytes from any editable mode (Q54). A derived mode (HC light, HC dark, wireframe) is read-only (Q59): the writes refuse
 * (`edit` below, #2096), and since these controls are no longer in the levers pane the frame holds, the block holds its
 * own controls and says why, in the frame's own words (N-3 A); the Components page is not held by the frame (#2700).
 *
 * BEHAVIOR-NEUTRAL (the S2 rule). Every write goes through `state/button-input.ts`, which writes what the legacy Size &
 * radius page wrote, byte for byte, its traps included.
 *
 * HOW IT REPAINTS: by store subscription only (`brand` and `mode`), keeping focus on the element that had it, except
 * while the slider is being dragged, which updates in place.
 */
import type { ButtonContentSize, ButtonIcons, ButtonLabelWeight, ButtonTextHover } from '@prism3/engine/scale';
import { brandState, currentMode, getPath, lastError, rebuild, setPage, subscribe, theme } from '../state/store';
import { isDerived } from '../state/verdict';
import { contentSizeOf, setButtonContentSize, setButtonIcons, setButtonLabelWeight, setButtonMinWidth, setButtonTextHover, type ContentSizeView } from '../state/button-input';
import { brandDensity } from '../state/shape-input';
import { pageOfTab } from '../shell/pages';
import { glyph, h, hook } from '../shell/dom';
import { choice, leverBlock, leverOf, slider, sliderReadout, stateLine, subLine, keepFocus, type LeverBlock } from '../ui/lever-kit';

/** The options' copy (S8.2). DRAFT, pending the owner (the S8.2 PR's "Copy for owner approval" block). */
export const BUTTON_OPTIONS_COPY = {
  title: 'Button options',
  densityLabel: 'Density',
  density: 'Density sets component heights and spacing.',
  densityLink: 'Set it in Shape › Density',
  /** What the chosen Button label & icon gives a medium button, in the brand's sizes (#2918). DRAFT, option A. */
  contentSize: (c: ContentSizeView): string => c.rung === 'sm'
    ? `Medium button label: ${c.labelPx}px, the small button's (label/sm). Icon: ${c.iconPx}px.`
    : `Medium button label: ${c.labelPx}px (label/md). Icon: ${c.iconPx}px.`,
  /** The derived-mode line, as the frame words it (N-3 A, RO1 A). */
  derived: (mode: string): string => `${mode} is auto-derived and can't be edited here. Switch the preview to Light or Dark to edit.`,
} as const;

/** The option writes, by key, each through `state/button-input.ts`. */
const WRITES: Readonly<Record<string, (v: string) => void>> = {
  buttonIcons: (v) => setButtonIcons(v as ButtonIcons),
  buttonContentSize: (v) => setButtonContentSize(v as ButtonContentSize),
  buttonLabelWeight: (v) => setButtonLabelWeight(v as ButtonLabelWeight),
  buttonTextHover: (v) => setButtonTextHover(v as ButtonTextHover),
};

/** The chip options, in the order the page has always drawn them. */
export const BUTTON_OPTION_KEYS = ['buttonIcons', 'buttonContentSize', 'buttonLabelWeight', 'buttonTextHover'] as const;

/** Everything a pointer or keyboard can operate, held in a derived mode. */
const OPERABLE = 'button, input, select, [role="radio"], [role="slider"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';

/** Mount the Button options into `hostEl`. `modeName` names a mode as the mode control shows it. Subscriptions are
 *  released through `cleanups`. */
export const mountButtonOptions = (hostEl: HTMLElement, cleanups: (() => void)[], modeName: (m: string) => string): void => {
  const root = hook(h('div', 'p3-bopts'), 'button-options');
  hostEl.replaceChildren(root);
  let lastEdited: string | null = null;
  let dragging: { sync: () => void } | null = null;
  let sliding = false;
  let blocks: { key: string; block: LeverBlock }[] = [];

  const edit = (key: string, write: () => void): void => {
    // A derived mode is read-only (Q59), enforced at the write (#2096), whatever the controls show.
    if (isDerived(currentMode)) return;
    lastEdited = key;
    write();
    // No edit-reveal (QA-B9): the options are drawn in the preview itself, beside what they change.
    rebuild();
  };

  const densityLink = (): HTMLElement => {
    const box = hook(h('div', 'p3-lever'), 'components-density');
    const head = h('div', 'p3-lever-head');
    const d = brandDensity();
    const label = (leverOf('density')?.options ?? []).find((o) => String(o.value) === d)?.label ?? d;
    head.append(h('span', 'p3-lever-name', BUTTON_OPTIONS_COPY.densityLabel), h('span', 'p3-readout', label));
    const go = hook(h('button', 'p3-btn p3-btn-ghost p3-deplink'), 'components-density-link');
    go.type = 'button';
    go.append(h('span', 'p3-btn-label', BUTTON_OPTIONS_COPY.densityLink), glyph('chevr'));
    go.onclick = () => setPage(pageOfTab('shape'));
    const ctl = h('div', 'p3-lever-ctl');
    ctl.append(subLine(BUTTON_OPTIONS_COPY.density), go);
    box.append(head, ctl);
    return box;
  };
  const chips = (key: string): HTMLElement => {
    const L = leverOf(key);
    const b = leverBlock(key, { group: true });
    const opts = (L?.options ?? []).map((o) => ({ v: String(o.value), l: o.label }));
    const role = `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}-choice`;
    const c = choice(L?.label ?? key, role, opts, (v) => edit(key, () => WRITES[key](v)));
    const v = String(getPath(brandState, key) ?? L?.default ?? '');
    c.set(v);
    b.ctl.append(c.el);
    // The readout (#2918): the label and icon sizes the brand's medium button gets under the chosen value.
    if (key === 'buttonContentSize') {
      const cs = contentSizeOf(theme, v as ButtonContentSize);
      b.setState(cs ? hook(stateLine(BUTTON_OPTIONS_COPY.contentSize(cs)), 'button-content-size-readout') : null);
    }
    blocks.push({ key, block: b });
    return b.el;
  };
  const minWidth = (): HTMLElement => {
    const key = 'buttonMinWidthMultiplier';
    const L = leverOf(key)!;
    const b = leverBlock(key, { forId: 'p3-button-min-width-multiplier' });
    const s = slider(key, 'button-min-width-slider', L.label, (v) => {
      sliding = true;
      try { edit(key, () => setButtonMinWidth(v)); } finally { sliding = false; }
    });
    const sync = (): void => {
      const v = Number(getPath(brandState, key) ?? L.default);
      s.set(v);
      b.setReadout(sliderReadout(L, v));
      b.setRefused(!!lastError && lastEdited === key);
    };
    sync();
    b.ctl.append(s.el);
    dragging = { sync };
    blocks.push({ key, block: b });
    return b.el;
  };

  const render = (): void => {
    const { key: focusKey, again } = keepFocus(root);
    blocks = [];
    dragging = null;
    const parts: HTMLElement[] = [];
    const derived = isDerived(currentMode);
    if (derived) parts.push(hook(h('p', 'p3-sg-note p3-sg-warn'), 'button-options-derived'));
    // #2905 Q10 A: the block's description says icon buttons are not affected, so no scope line closes it.
    parts.push(densityLink(), ...BUTTON_OPTION_KEYS.map(chips), minWidth());
    root.replaceChildren(...parts);
    if (derived) {
      const note = parts[0];
      note.append(glyph('warn'), h('span', 'p3-sg-warn-text', BUTTON_OPTIONS_COPY.derived(modeName(currentMode))));
      // Held as the frame holds the levers panel (N-3 A): native controls disabled, any other widget aria-disabled and
      // out of the tab order. Help (the ⓘ) and the way to Shape stay live (RX1 A: neither edits anything).
      for (const n of root.querySelectorAll<HTMLElement>(OPERABLE)) {
        if (n.closest('.p3-deplink, .p3-info')) continue;
        if (n instanceof HTMLButtonElement || n instanceof HTMLInputElement || n instanceof HTMLSelectElement) n.disabled = true;
        else { n.setAttribute('aria-disabled', 'true'); n.tabIndex = -1; }
      }
    }
    for (const x of blocks) x.block.setRefused(!!lastError && !!lastEdited && x.key === lastEdited);
    if (focusKey) again()?.focus({ preventScroll: true });
  };

  cleanups.push(subscribe('brand', () => { if (sliding && dragging) dragging.sync(); else render(); }));
  cleanups.push(subscribe('mode', render));
  render();
};
