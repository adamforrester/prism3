/**
 * The Button option writes (UI redesign S8.1): every edit the legacy Size & radius page's Button options make to the
 * working brand, and the reader the button specimen is drawn from, in one module with no DOM.
 *
 * WHY HERE AND NOT IN `main.ts`. The four controls are the generic lever knob (`renderControl`), whose default write is
 * `setPath(brandState, lever.key, v)`. The Components page (S8.2) must not import `main.ts` (plan §3.10), so the writes
 * moved out first, UNCHANGED IN WHAT THEY WRITE (the S2 rule: behavior-neutral, byte for byte on the persisted brand
 * input), and the legacy page hands them to the knob in place. What changed is only who writes: these call nothing,
 * and the caller repaints through the tier it always used (`apply()`).
 *
 * ALL FOUR ARE BRAND-WIDE. The engine has no per-mode value for any of them (no `ModeLevers` field), so each writes
 * the same bytes from any editable mode (the Q54 rule), and none takes a mode.
 *
 * TWO BYTE-LEVEL TRAPS, KEPT ON PURPOSE (the S8 scoping report; changing either is a behavior change):
 *   · THE DEFAULT IS WRITTEN, NOT UNSET. Choosing `attached`, `match` or `emphasis` (each lever's default) writes the
 *     key with that value, as the legacy chips did; a brand that never touched the lever has no key at all, so
 *     choosing the default moves the persisted brand;
 *   · THE SLIDER WRITES PER STEP. The legacy minimum-width slider commits on every `input` event, so dragging from
 *     2.25 to 3 writes 2.5, 2.75 and 3 in turn. `setButtonMinWidth` is called once per step by the caller; it does
 *     not debounce, and a caller that wrote on release only would persist fewer states.
 */
import { DEFAULT_MIN_WIDTH_MULTIPLIER, ICON_SIZES, type ButtonContentSize, type ButtonIcons, type ButtonLabelWeight, type ButtonTextHover } from '@prism3/engine/scale';
import type { Theme } from '@prism3/engine/theme';
import { brandState, getPath, setPath } from './store';

/** Button icons: `attached` (the default, written when chosen) or `edges`. */
export const setButtonIcons = (v: ButtonIcons): void => { setPath(brandState, 'buttonIcons', v); };
/** Button label & icon: `match` (the default, written when chosen) or `smaller`. */
export const setButtonContentSize = (v: ButtonContentSize): void => { setPath(brandState, 'buttonContentSize', v); };
/** Control label weight (`buttonLabelWeight`; buttons and, since #2945, tags): `emphasis` (the default, written when chosen) or `default`. */
export const setButtonLabelWeight = (v: ButtonLabelWeight): void => { setPath(brandState, 'buttonLabelWeight', v); };
/** Text button hover (#2324): `text` (the default, "Text & icon only", written when chosen) or `fill`. */
export const setButtonTextHover = (v: ButtonTextHover): void => { setPath(brandState, 'buttonTextHover', v); };
/** Button minimum width, as a multiple of the button's height. One call per slider step (see the header). */
export const setButtonMinWidth = (v: number): void => { setPath(brandState, 'buttonMinWidthMultiplier', v); };

/** The four options as the button specimen reads them, each with the legacy fallback when the brand sets none. */
export type ButtonLayoutView = {
  /** Button icons is `edges` (Locked to edges). */
  edges: boolean;
  /** Button label & icon is `smaller` (the medium size takes the small label and icon). */
  smaller: boolean;
  /** The minimum-width multiplier. */
  mult: number;
  /** The weight role the label takes. */
  labelRole: 'default' | 'emphasis';
};
/** The brand's four Button options, read exactly as the legacy specimen read them. */
export const buttonLayout = (): ButtonLayoutView => ({
  edges: (getPath(brandState, 'buttonIcons') ?? 'attached') === 'edges',
  smaller: (getPath(brandState, 'buttonContentSize') ?? 'match') === 'smaller',
  mult: Number(getPath(brandState, 'buttonMinWidthMultiplier') ?? DEFAULT_MIN_WIDTH_MULTIPLIER),
  labelRole: (getPath(brandState, 'buttonLabelWeight') ?? 'emphasis') === 'default' ? 'default' : 'emphasis',
});

/** What a medium button's label and icon are under one Button label & icon value, in the brand's own sizes (#2918):
 *  the label rung it binds, that rung's px from the brand's type scale, and the icon size and its px. */
export type ContentSizeView = { rung: 'md' | 'sm'; labelPx: number; icon: 'sm' | 'xs'; iconPx: number };
/** Read from the theme the preview is drawn from, never restated: `match` binds the medium label and icon (`label.md`,
 *  `icon.size.sm`), `smaller` the small button's (`label.sm`, `icon.size.xs`), as `applyButtonLayout` materializes them.
 *  A rung the brand does not emit reads `null`, so the readout says nothing rather than a made-up number. */
export const contentSizeOf = (theme: Theme, v: ButtonContentSize): ContentSizeView | null => {
  const rung = v === 'smaller' ? 'sm' : 'md';
  const icon = v === 'smaller' ? 'xs' : 'sm';
  const labelPx = theme.typography.composites.find((c) => c.group === 'label' && c.variant === rung)?.sizePx;
  const iconPx = ICON_SIZES.find((i) => i.name === icon)?.px;
  return labelPx === undefined || iconPx === undefined ? null : { rung, labelPx, icon, iconPx };
};
