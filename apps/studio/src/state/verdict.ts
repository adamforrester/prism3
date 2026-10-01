/**
 * The contrast verdict (UI redesign S1.3, `docs/superpowers/ui-redesign/implementation-plan.md` §3.5).
 * DOM-free, so `test-verdict-count.ts` imports it in Node.
 *
 * WHAT IT COUNTS (v4 review Q2): every role with a floor, in every mode the brand ships. A role "has a
 * floor" when the engine resolved it against something other than itself with a minimum above zero, the
 * way concept v6 counts it (`statsOf` in `concept-v6.src.html`). A role fails when its ratio is below
 * that minimum. For the default theme that is 221 roles in each of 4 modes, 884 in all.
 *
 * WHICH MODES ARE DERIVED: the engine's own mode registry (`BUILTIN_MODES`) says. A built-in mode whose
 * kind is not `standard` (high contrast and wireframe) is generated from light or dark and never edited
 * by hand; the mode control hatches it. A custom mode is customizable, so it is not derived.
 *
 * COST. One `resolveAllModes` per resolved theme. It is cached by the theme object's identity, and the
 * store makes a new theme object on every successful rebuild, so the bar and Inspect share one count
 * per edit.
 */
import { BUILTIN_MODES, resolveAllModes } from '@prism3/engine/modes';
import type { Theme } from '@prism3/engine/theme';

export type ModeCount = { readonly mode: string; readonly n: number; readonly f: number };
export type Verdict = {
  /** Gated roles summed over every mode. */
  readonly total: number;
  /** Of those, how many sit below their floor. */
  readonly fail: number;
  /** Per mode, in the order asked for. */
  readonly per: readonly ModeCount[];
  /** How many modes have at least one role below its floor. */
  readonly modesFailing: number;
};

let cache: { theme: Theme; modes: string; v: Verdict } | null = null;

/** The verdict for `theme`, over `modes` in that order (the order the mode control shows). */
export const verdictOf = (theme: Theme, modes: readonly string[]): Verdict => {
  const key = modes.join(' ');
  if (cache && cache.theme === theme && cache.modes === key) return cache.v;
  const byMode = new Map(resolveAllModes(theme).map((m) => [m.mode as string, m]));
  const per = modes.map((mode) => {
    let n = 0, f = 0;
    for (const r of Object.values(byMode.get(mode)?.roles ?? {})) {
      if (!(r.min > 0) || r.against === 'self') continue;
      n++;
      if (r.ratio + 1e-9 < r.min) f++;
    }
    return { mode, n, f };
  });
  const v: Verdict = {
    total: per.reduce((s, m) => s + m.n, 0),
    fail: per.reduce((s, m) => s + m.f, 0),
    per,
    modesFailing: per.filter((m) => m.f > 0).length,
  };
  cache = { theme, modes: key, v };
  return v;
};

/** Is `mode` generated from another (high contrast, wireframe) rather than edited? */
export const isDerived = (mode: string): boolean => BUILTIN_MODES.some((d) => d.name === mode && d.kind !== 'standard');

const plural = (n: number, one: string): string => `${n} ${n === 1 ? one : `${one}s`}`;

/** The verdict's line on the top bar (concept v6's `verdictText`, verbatim). */
export const verdictLine = (v: Verdict): string =>
  v.fail ? `${v.fail} of ${v.total} below floor, ${plural(v.modesFailing, 'mode')}` : `All ${v.total} pairs at or above floor`;

/** Health's summary sentence (concept v6's `healthHtml`, verbatim). */
export const healthLine = (v: Verdict): string =>
  v.fail ? `${v.fail} of ${v.total} pairs below floor in ${plural(v.modesFailing, 'mode')}.` : `All ${v.total} pairs at or above floor.`;

/** Health's breadth note: "221 per mode × 4 modes" when every mode gates the same count (v5 Q2). */
export const breadthLine = (v: Verdict, label: (m: string) => string): string => {
  const counts = [...new Set(v.per.map((m) => m.n))];
  return counts.length === 1 ? `${counts[0]} per mode × ${plural(v.per.length, 'mode')}` : v.per.map((m) => `${label(m.mode)} ${m.n}`).join(' · ');
};

/** One mode's line in Health. */
export const modeLine = (m: ModeCount, name: string): string =>
  m.f ? `${name}: ${m.f} of ${m.n} below` : `${name}: ${m.n} of ${m.n} at or above`;
