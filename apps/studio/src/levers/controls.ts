/**
 * The lever control descriptor (#1675, UI redesign F4): which control a manifest lever renders as,
 * decided in one place and without a DOM, so the rule can be tested in Node over the real manifest.
 *
 * THE RULE.
 *   - `enum` with 2 to 4 options, and no Auto choice → **chips** (a native radio group).
 *   - `enum` with 5 or more options, or whose choice set includes an Auto entry → **select**.
 *     An Auto entry is either an option the manifest itself labels "Auto…", or one the caller adds
 *     (a caller may pass `{ auto: true }`; none does yet, because the per-mode "Auto — follows global"
 *     selects are still hand-built in main.ts's `PER_MODE_SELECTS`).
 *   - `palette-ref` → **select** always: its options come from the brand (`paletteRefOptions`), so
 *     their count is not known here and can grow past 4.
 *   - `slider`, `toggle`, `color` map to themselves; `list`, `object` and `text` are **readonly**
 *     in the generic path (their editors are bespoke).
 *
 * Option labels are the manifest's own. Nothing here restates a lever's options.
 *
 * This module is DOM-free on purpose, like `state/store.ts`: `test-lever-controls.ts` imports it
 * under `tsx` with no `document`.
 */
import type { Lever } from '@prism3/engine/levers';

/** The chip range. Below 2 there is no choice; above 4 a row of chips stops reading at a glance. */
export const CHIPS_MIN = 2;
export const CHIPS_MAX = 4;

export type ControlOption = { value: string | number; label: string };

export type ControlDescriptor =
  | { kind: 'chips'; key: string; label: string; options: ControlOption[] }
  | { kind: 'select'; key: string; label: string; options: ControlOption[]; why: 'many-options' | 'auto' | 'palette-ref' }
  | { kind: 'slider'; key: string; label: string; min?: number; max?: number; step?: number; unit?: string }
  | { kind: 'toggle'; key: string; label: string }
  | { kind: 'color'; key: string; label: string }
  | { kind: 'readonly'; key: string; label: string };

const AUTO_LABEL = /^auto\b/i;

/** The control a lever renders as. `auto` says the caller adds an Auto entry to the choice set. */
export const describeControl = (lever: Lever, ctx: { auto?: boolean } = {}): ControlDescriptor => {
  const { key, label } = lever;
  switch (lever.control) {
    case 'enum': {
      const options = (lever.options ?? []).map((o) => ({ value: o.value, label: o.label }));
      const auto = !!ctx.auto || options.some((o) => AUTO_LABEL.test(o.label));
      if (auto) return { kind: 'select', key, label, options, why: 'auto' };
      if (options.length >= CHIPS_MIN && options.length <= CHIPS_MAX) return { kind: 'chips', key, label, options };
      return { kind: 'select', key, label, options, why: 'many-options' };
    }
    case 'palette-ref': return { kind: 'select', key, label, options: [], why: 'palette-ref' };
    case 'slider': return { kind: 'slider', key, label, min: lever.min, max: lever.max, step: lever.step, unit: lever.unit };
    case 'toggle': return { kind: 'toggle', key, label };
    case 'color': return { kind: 'color', key, label };
    default: return { kind: 'readonly', key, label };
  }
};

/** The one list of palettes a palette-ref picker offers (#1835): `primary`, `neutral`, then the
 *  brand colors in their declared order. Every palette picker in the studio reads this.
 *
 *  One exception, kept so this change moves no behavior: the Action palette select has never offered
 *  `neutral`. #1811 decides that it should, and its fix (#1827) lands as the removal of this line. */
export const paletteRefOptions = (key: string, brandColorNames: readonly string[]): string[] => {
  const neutral = key === 'actionPalette' ? [] : ['neutral'];
  return ['primary', ...neutral, ...brandColorNames];
};

/** The `data-p3` hook for a lever's control group: `lever-<key>` in kebab-case, so
 *  `motionPersonality.tempo` is `lever-motion-personality-tempo`. */
export const leverHook = (key: string): string =>
  `lever-${key.replace(/\./g, '-').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
