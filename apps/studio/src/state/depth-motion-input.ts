/**
 * The Depth & motion writes (UI redesign S9.1): every edit the legacy Elevation and Motion pages make to the
 * working brand, and the readers their controls are drawn from, in one module with no DOM.
 *
 * WHY HERE AND NOT IN `main.ts`. These were closures inside the legacy pages (`renderShadowEditor`'s `mkPer`
 * and `mk`, the generic lever knob on Elevation's softness and Motion's tempo, `renderPerModeTempo`, and the
 * Easing per mode table's Light and mode cells). The new Depth & motion page (S9.2) must not import `main.ts`
 * (plan §3.10), so the writes moved out first, UNCHANGED IN WHAT THEY WRITE (the S2 rule: behavior-neutral,
 * byte for byte on the persisted brand input), and the legacy pages call them in place. What changed is only who
 * repaints: these call nothing, and the caller repaints through the tier it always used (`apply()` for the
 * shadow sliders, `applyFull()` for tempo, the shadow Auto reset and easing).
 *
 * THE MODE A WRITE TARGETS IS AN ARGUMENT, as in `type-input.ts`. `'light'` writes the brand-wide value; any
 * other mode writes `modeLevers[mode]` through the store's pruning helper.
 *
 * THREE BYTE-LEVEL TRAPS, KEPT ON PURPOSE (the S9 scoping report; changing any is a behavior change):
 *   · Light's shadow tint is written ONE KEY AT A TIME (`shadow.tint.hue`, then `shadow.tint.amount`), so a
 *     brand can hold a partial `{ hue }` and the engine fills the other key from its default;
 *   · outside Light, a shadow slider that lands EXACTLY on the brand value it was drawn against clears the
 *     mode's override (pruned), so no redundant "equals the brand" override lingers;
 *   · Light's easing select always WRITES the curve, the default included, where a mode's Auto unsets
 *     (`#2051` changes that, not this module). Tempo commits through `applyFull()` at the caller (#800).
 */
import { brandState, theme, getPath, setPath, getModeLever, setModeLever } from './store';

/** The tempo choices, in the order the legacy controls list them. */
export type Tempo = 'snappy' | 'standard' | 'relaxed';
/** One shadow key a slider edits: softness, or one of the tint's two numbers. */
export type ShadowKey = 'softness' | 'tint.hue' | 'tint.amount';
export type TintKey = 'hue' | 'amount';

// ── shadow (legacy `renderShadowEditor`: the Light knob and `mk`, the per-mode `mkPer`) ───────────────

/** The resolved brand value a mode's shadow slider inherits under Auto (`theme.shadow`). `null` only for
 *  `tint.hue`, when the shadow has no hue to follow (a pure-gray pin, #2184 Q58 B). */
export const brandShadowValue = (key: ShadowKey): number | null =>
  key === 'softness' ? theme.shadow.softness : theme.shadow.tint[key === 'tint.hue' ? 'hue' : 'amount'];
/** A mode's own shadow value for `key`, or `undefined` when it follows the brand (Auto). */
export const shadowOverride = (mode: string, key: ShadowKey): number | undefined =>
  getModeLever(mode, `shadow.${key}`) as number | undefined;
/** The brand's AUTHORED tint (`shadow.tint`), possibly partial, or `undefined`. */
export const authoredTint = (): { hue?: number; amount?: number } | undefined => brandState.shadow?.tint;

/** One shadow key. In Light: writes `shadow.<key>` (the tint one key at a time, so a partial tint stays
 *  partial). In another mode: writes `modeLevers[mode].shadow.<key>`, or clears it (pruned) when `v` is
 *  `undefined` (the Auto reset) or lands exactly on `brandValue`, the brand value the slider was drawn against
 *  (`brandShadowValue(key)` unless the caller passes the one it drew). Returns whether the mode holds an
 *  override after the write; always `false` in Light, which IS the brand value. */
export const setShadow = (mode: string, key: ShadowKey, v: number | undefined, brandValue: number | null = brandShadowValue(key)): boolean => {
  if (mode === 'light') { setPath(brandState, `shadow.${key}`, v); return false; }
  const overriding = v !== undefined && v !== brandValue;
  setModeLever(mode, `shadow.${key}`, overriding ? v : undefined);
  return overriding;
};
/** Shadow softness (Elevation's blur dial). See `setShadow`. */
export const setShadowSoftness = (mode: string, v: number | undefined, brandValue?: number): boolean =>
  setShadow(mode, 'softness', v, brandValue);
/** One tint key, `hue` or `amount`. See `setShadow`: Light writes this key ALONE. */
export const setShadowTint = (mode: string, key: TintKey, v: number | undefined, brandValue?: number): boolean =>
  setShadow(mode, `tint.${key}`, v, brandValue);

// ── tempo (legacy: the generic lever knob in Light, `renderPerModeTempo` in a mode) ───────────────────

/** The brand's authored tempo, or `undefined` (the engine default applies). */
export const brandTempo = (): string | undefined => getPath(brandState, 'motionPersonality.tempo');
/** A mode's own tempo, or `undefined` when it follows the brand (Auto). */
export const tempoOverride = (mode: string): string | undefined => getModeLever(mode, 'tempo') as string | undefined;
/** Tempo. Light writes `motionPersonality.tempo`; another mode writes `modeLevers[mode].tempo`, and
 *  `undefined` or `''` (Auto) clears it, pruned. The caller commits through `applyFull()` (#800). */
export const setTempo = (mode: string, v: string | undefined): void => {
  if (mode === 'light') setPath(brandState, 'motionPersonality.tempo', v);
  else setModeLever(mode, 'tempo', v);
};

// ── easing per motion role (legacy: the Easing per mode table's Light select and mode cells) ──────────

/** A mode's own curve for `role`, or `undefined` when it follows the brand (Auto). */
export const easingOverride = (mode: string, role: string): string | undefined =>
  getModeLever(mode, `easings.${role}`) as string | undefined;
/** The curve a motion role uses. Light ALWAYS writes `motionPersonality.easingRoles.<role>`, the default curve
 *  included (the legacy bytes; #2051). Another mode writes `modeLevers[mode].easings.<role>`, and `undefined`
 *  or `''` (Auto) clears it, pruned. */
export const setEasingRole = (mode: string, role: string, curve: string | undefined): void => {
  if (mode === 'light') setPath(brandState, `motionPersonality.easingRoles.${role}`, curve);
  else setModeLever(mode, `easings.${role}`, curve || undefined);
};
