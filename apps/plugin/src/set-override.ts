/**
 * THE AGENT LINK'S ONE THEME WRITE (#3394, owner decisions Q3394.1–.7 all A): `set-override`, the plan behind it.
 *
 * An agent sends a list of 1 to 32 color override changes, each `{ mode, role, palette, step }` (point the role at that
 * palette step in that mode) or `{ mode, role, clear: true }` (drop the override, so the engine derives the role again).
 * This module turns that list and the brand the file holds into a PLAN: the brand after the changes, every change's
 * before and after, every contracted pair whose ratio moved, and every reason the list is refused. It writes nothing;
 * `main.ts` previews the plan, or, confirmed, hands the plan's brand to the same Theme write the panel's Apply reaches.
 *
 * ALL OR NOTHING, JUDGED ON THE FINAL STATE (Q3394.4 A). Every change is applied to one copy of the brand and the engine
 * resolves that copy once: a later override reads an earlier one's color as its ground (#964), and a fill change can
 * rescue or break its `on-fill` ink, so judging each change alone would judge it against a half-migrated brand. Any
 * refusal refuses the whole list, and every refusal is returned, not only the first.
 *
 * THE CONTRAST RULE (Q3394.3 A). A pair that was at or above its minimum before and is below it after refuses the list,
 * in any mode, the changed role's dependents included. A pair already below before is reported in `stillBelow` and does
 * not refuse. The pairs are the set Studio's verdict counts (every role with a minimum that is measured against
 * something other than itself), plus each role's second pair (`alsoAgainst`) and the fill tier checks, all read off the
 * engine's own resolution (`resolveAllModes`). This is stricter than Studio, which marks a failing override and keeps it.
 *
 * THE REAL PALETTE (#3391). `before.override` is the stored brand's own ref, and `resolved` is read off the role's
 * emitted path. Neither is ever a row's family: an override on `brand-neutral` reads `brand-neutral`.
 *
 * The copy below is the owner's, as drafted on #3394 (Q3394.5 A), except where a comment marks it DRAFT.
 */
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import { resolveAllModes, withIconTwins, GROUND_INPUT } from '@prism3/engine/modes';
import type { ModeResult, PrimitiveRef } from '@prism3/engine/modes';
import { contrast, formatRatio, hexToRgb } from '@prism3/engine/color';
import { canon } from './persist-figma';

/** The most changes one call takes. A migration like #3336 is 13. */
export const MAX_CHANGES = 32;

export type OverrideChange =
  | { readonly mode: string; readonly role: string; readonly palette: string; readonly step: string }
  | { readonly mode: string; readonly role: string; readonly clear: true };

/** Why one change, or the whole list, is refused. The first group is per change; the last four refuse the whole run. */
export type OverrideRefusalReason =
  | 'below-minimum' | 'clamped' | 'unknown-role' | 'unknown-palette' | 'unknown-step' | 'ground' | 'follows-source' | 'locked'
  | 'nothing-to-clear' | 'unknown-mode' | 'not-customizable'
  | 'theme-unsaved' | 'no-brand' | 'unreadable-brand' | 'brand-moved';

/** A refusal. `index` is the change it is about, or null when no one change owns it (a whole-run refusal, or a pair that
 *  went below its minimum on a role no change named). A `below-minimum` refusal carries the pair. */
export type OverrideRefusal = {
  readonly index: number | null; readonly mode: string | null; readonly role: string | null; readonly reason: OverrideRefusalReason; readonly line: string;
  readonly ratio?: number; readonly min?: number; readonly against?: string;
};

/** One side of a change: what is stored, what the engine emitted, and the role's own pair. */
export type OverrideSide = {
  readonly override: PrimitiveRef | null; readonly resolved: PrimitiveRef | null; readonly hex: string;
  readonly ratio: number; readonly min: number; readonly against: string;
};
export type OverridePair = { readonly mode: string; readonly role: string; readonly against: string; readonly ratio: number; readonly min: number };
export type OverrideMove = OverridePair & { readonly before: number };

export type OverridePlan = {
  readonly ok: boolean;
  /** What a confirm must echo: the stored brand and the changes, hashed. */
  readonly previewHash: string;
  /** The brand after the changes. Only written when `ok`. */
  readonly input: BrandInput;
  readonly changes: readonly { readonly index: number; readonly mode: string; readonly role: string; readonly before: OverrideSide | null; readonly after: OverrideSide | null }[];
  /** Every other pair whose ratio moved: on-fill inks, twins, second pairs, tier checks. */
  readonly moved: readonly OverrideMove[];
  /** Pairs below their minimum after that were not before. Non-empty means refused. */
  readonly newMisses: readonly OverridePair[];
  /** Pairs already below their minimum before. Reported, never refused. */
  readonly stillBelow: readonly OverridePair[];
  readonly contrast: { readonly before: { readonly total: number; readonly fail: number }; readonly after: { readonly total: number; readonly fail: number } };
  readonly refusals: readonly OverrideRefusal[];
};

/* ── the copy (Q3394.5 A) ─────────────────────────────────────────────────────────────────────────────────── */

const MODE_LABEL: Readonly<Record<string, string>> = { light: 'Light', dark: 'Dark', 'hc-light': 'High contrast light', 'hc-dark': 'High contrast dark', wireframe: 'Wireframe' };
/** A mode as the copy names it: `Light`, `Dark`, a custom mode by its own name with a capital. */
export const modeLabel = (mode: string): string => MODE_LABEL[mode] ?? (mode ? mode[0].toUpperCase() + mode.slice(1) : mode);
// The engine's one formatter (#3697 L3): floored, so a ratio below its minimum never reads as the minimum.
const fmtRatio = formatRatio;
const fmtMin = (m: number): string => `${m}:1`;
const ref = (r: PrimitiveRef | null): string => (r ? `${r.palette} ${r.step}` : 'none');
const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

export const OVERRIDE_COPY = {
  belowMinimum: (mode: string, role: string, to: PrimitiveRef | null, ratio: number, min: number, against: string): string =>
    `${modeLabel(mode)} · ${role}${to ? ` → ${ref(to)}` : ''}: ${fmtRatio(ratio)} against ${against} — below the ${fmtMin(min)} minimum.`,
  clamped: (mode: string, role: string, asked: PrimitiveRef, got: PrimitiveRef, min: number): string =>
    `${modeLabel(mode)} · ${role} → ${ref(asked)} resolves to ${ref(got)} — links hold ${fmtMin(min)}. Pick ${ref(got)} or a step with more contrast.`,
  ground: (mode: string, role: string): string => `${modeLabel(mode)} · ${role} is a ground — set it in Surfaces, so the roles measured on it follow.`,
  followsSource: (mode: string, role: string): string => `${modeLabel(mode)} · ${role} follows its source color — change the source instead.`,
  locked: (mode: string, icon: string, text: string): string => `${modeLabel(mode)} · ${icon} follows ${text} while icons match text.`,
  /** DRAFT (OWNER DECISION on #3394's PR): the focus rings, read-only in Theme (#1966). */
  lockedFocus: (mode: string, role: string): string => `${modeLabel(mode)} · ${role} isn't editable in Theme yet.`,
  unknownRole: (mode: string, role: string): string => `${modeLabel(mode)} has no role ${role}.`,
  unknownPalette: (mode: string, role: string, palette: string): string => `${modeLabel(mode)} · ${role}: ${palette} is not a palette in this brand.`,
  unknownStep: (mode: string, role: string, palette: string, step: string): string => `${modeLabel(mode)} · ${role}: ${palette} has no step ${step}.`,
  nothingToClear: (mode: string, role: string): string => `${modeLabel(mode)} · ${role} has no override to clear.`,
  /** DRAFT (OWNER DECISION on #3394's PR): a mode the brand does not generate. */
  unknownMode: (mode: string): string => `This brand has no ${mode} mode.`,
  /** DRAFT (OWNER DECISION on #3394's PR): a high contrast or wireframe mode, generated from light or dark. */
  notCustomizable: (mode: string): string => `${modeLabel(mode)} is generated, not edited — override Light or Dark instead.`,
  themeUnsaved: "Not saved — Theme has changes that aren't in the file yet. Run Update file or discard them, then send this again.",
  brandMoved: "Not saved — the file's brand changed after the preview. Preview again.",
  noBrand: 'Not saved — this file holds no Prism3 brand. Write a theme first.',
  /** DRAFT (OWNER DECISION on #3394's PR): a stored brand this build can't read (`restoreInput` throws). */
  unreadableBrand: "Not saved — this file's brand was saved by a build this plugin can't read.",
  headlineBelow: (n: number): string => `Not saved — ${n} ${plural(n, 'change puts', 'changes put')} a pair below its minimum.`,
  /** DRAFT (OWNER DECISION on #3394's PR): a list refused for any reason other than contrast alone. */
  headlineRefused: (n: number): string => `Not saved — ${n} ${plural(n, 'change', 'changes')} can't be made as sent.`,
  headlinePreview: (n: number): string => `Preview — ${n} ${plural(n, 'change', 'changes')}; no pair moves below its minimum.`,
  headlineSaved: (n: number, at: number, total: number): string =>
    `Saved ${n} color ${plural(n, 'override', 'overrides')} — ${at} of ${total} pairs at or above their minimum.`,
  activity: (mode: string, role: string, from: string, to: string, r0: number, r1: number): string =>
    `${modeLabel(mode)} · ${role}: ${from} → ${to} (${fmtRatio(r0)} → ${fmtRatio(r1)})`,
} as const;

/* ── the plan ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** FNV-1a, 32-bit, as 8 hex digits: a change signal for the preview, as `update-components`' hash is. */
const fnv1a = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
};
export const overrideHash = (stored: BrandInput, changes: readonly OverrideChange[]): string => fnv1a(`${canon(stored)}\n${canon(changes)}`);

const round = (x: number): number => Math.round(x * 100) / 100;
const below = (ratio: number, min: number): boolean => ratio + 1e-9 < min;
/** The focus rings: Studio shows them read-only (#1966). */
const FOCUS_ROLES: ReadonlySet<string> = new Set(['border.focus', 'inverse.border.focus']);
const TEXT_SEGMENT = /(^|\.)icon\./;

/** Every contracted pair in every mode, keyed `mode|role|against`. */
const pairsOf = (all: readonly ModeResult[]): Map<string, OverridePair> => {
  const out = new Map<string, OverridePair>();
  for (const m of all) {
    for (const [role, r] of Object.entries(m.roles)) {
      if (r.min > 0 && r.against !== 'self') out.set(`${m.mode}|${role}|${r.against}`, { mode: m.mode, role, against: r.against, ratio: r.ratio, min: r.min });
      const a = r.alsoAgainst, partner = a ? m.roles[a.against] : undefined;
      if (a && partner) out.set(`${m.mode}|${role}|${a.against}`, { mode: m.mode, role, against: a.against, ratio: contrast(hexToRgb(r.hex), hexToRgb(partner.hex)), min: a.min });
    }
    for (const t of m.tierChecks ?? []) out.set(`${m.mode}|${t.role}|${t.against}`, { mode: m.mode, role: t.role, against: t.against, ratio: t.ratio, min: t.min });
  }
  return out;
};
const totals = (p: Map<string, OverridePair>) => ({ total: p.size, fail: [...p.values()].filter((x) => below(x.ratio, x.min)).length });
const shown = (p: OverridePair): OverridePair => ({ mode: p.mode, role: p.role, against: p.against, ratio: round(p.ratio), min: p.min });

/** The palette and step a role's emitted path names, under the brand's namespace; null for a fixed primitive. */
const resolvedOf = (path: string, ns: string): PrimitiveRef | null => {
  if (!path.startsWith(`${ns}.`)) return null;
  const rest = path.slice(ns.length + 1);
  const dot = rest.lastIndexOf('.');
  return dot > 0 ? { palette: rest.slice(0, dot), step: rest.slice(dot + 1) } : null;
};

const sideOf = (all: readonly ModeResult[], ns: string, mode: string, role: string, stored: PrimitiveRef | undefined): OverrideSide | null => {
  const r = all.find((m) => m.mode === mode)?.roles[role];
  if (!r) return null;
  return { override: stored ? { palette: stored.palette, step: stored.step } : null, resolved: resolvedOf(r.path, ns), hex: r.hex, ratio: round(r.ratio), min: r.min, against: r.against };
};

const isClear = (c: OverrideChange): c is Extract<OverrideChange, { clear: true }> => 'clear' in c && c.clear === true;

/**
 * Plan `changes` against `stored`, the brand the file holds. Pure: reads nothing but its arguments.
 */
export const planOverride = (stored: BrandInput, changes: readonly OverrideChange[]): OverridePlan => {
  const previewHash = overrideHash(stored, changes);
  const theme0 = brandTheme(stored);
  const ns = theme0.namespace;
  const all0 = resolveAllModes(theme0);
  const modes0 = new Set(all0.map((m) => m.mode as string));
  const customizable = new Set(['light', 'dark', ...(theme0.customModes ?? []).map((c) => c.name)].filter((m) => modes0.has(m)));
  /** The overrides after the changes, per mode, built on a copy of the stored ones. */
  const ov = JSON.parse(JSON.stringify(stored.overrides ?? {})) as Record<string, Record<string, PrimitiveRef>>;
  const storedOv = (stored.overrides ?? {}) as Record<string, Record<string, PrimitiveRef> | undefined>;
  const refusals: OverrideRefusal[] = [];
  const refuse = (index: number, c: OverrideChange, reason: OverrideRefusalReason, line: string): void => {
    refusals.push({ index, mode: c.mode, role: c.role, reason, line });
  };
  /** The changes that passed every check made before the engine runs, which are the ones the copy is resolved with. */
  const kept: number[] = [];
  changes.forEach((c, i) => {
    if (!modes0.has(c.mode)) { refuse(i, c, 'unknown-mode', OVERRIDE_COPY.unknownMode(c.mode)); return; }
    if (!customizable.has(c.mode)) { refuse(i, c, 'not-customizable', OVERRIDE_COPY.notCustomizable(c.mode)); return; }
    const had = storedOv[c.mode]?.[c.role];
    if (isClear(c)) {
      if (!had) { refuse(i, c, 'nothing-to-clear', OVERRIDE_COPY.nothingToClear(c.mode, c.role)); return; }
      delete ov[c.mode][c.role];
      if (!Object.keys(ov[c.mode]).length) delete ov[c.mode];
      kept.push(i);
      return;
    }
    const roles = all0.find((m) => m.mode === c.mode)!.roles;
    // The engine refuses these by throwing, or puts them after the override layer, where an override is skipped.
    const glass = c.role.startsWith('glass.') ? theme0.glassRoles?.[c.role.slice('glass.'.length)] : undefined;
    if (glass || /^(?:inverse\.)?interactive\.[^.]+\.hover-fill\./.test(c.role)) { refuse(i, c, 'follows-source', OVERRIDE_COPY.followsSource(c.mode, c.role)); return; }
    if (!(c.role in roles)) { refuse(i, c, 'unknown-role', OVERRIDE_COPY.unknownRole(c.mode, c.role)); return; }
    if (GROUND_INPUT[c.role]) { refuse(i, c, 'ground', OVERRIDE_COPY.ground(c.mode, c.role)); return; }
    if (FOCUS_ROLES.has(c.role)) { refuse(i, c, 'locked', OVERRIDE_COPY.lockedFocus(c.mode, c.role)); return; }
    // An icon the engine carries its text's override to (#1968), and that holds no override of its own: Studio locks
    // its row to the text row, so the agent link does too. Read off the engine's own carry rule, never a list.
    if (TEXT_SEGMENT.test(c.role) && !had) {
      const text = c.role.replace(TEXT_SEGMENT, '$1text.');
      const carried = text in roles ? withIconTwins({ [text]: { palette: c.palette, step: c.step } }, roles, theme0.iconContrast) : undefined;
      if (carried && c.role in carried) { refuse(i, c, 'locked', OVERRIDE_COPY.locked(c.mode, c.role, text)); return; }
    }
    const steps = theme0.palettes.find((p) => p.palette === c.palette)?.steps;
    if (!steps) { refuse(i, c, 'unknown-palette', OVERRIDE_COPY.unknownPalette(c.mode, c.role, c.palette)); return; }
    if (!steps.some((s) => s.key === c.step)) { refuse(i, c, 'unknown-step', OVERRIDE_COPY.unknownStep(c.mode, c.role, c.palette, c.step)); return; }
    ov[c.mode] = { ...(ov[c.mode] ?? {}), [c.role]: { palette: c.palette, step: c.step } };
    kept.push(i);
  });
  // The brand after the changes: the stored one with its overrides replaced, and none at all when none are left.
  const { overrides: _was, ...rest } = stored;
  const next: BrandInput = Object.keys(ov).length ? { ...rest, overrides: ov as BrandInput['overrides'] } : rest;
  // The kept changes, resolved once, together. A list with refusals above is still resolved, so its contrast refusals
  // come back in the same round.
  const all1 = resolveAllModes(brandTheme(next));
  const nextOv = ov as Record<string, Record<string, PrimitiveRef> | undefined>;
  for (const i of kept) {
    const c = changes[i];
    if (isClear(c)) continue;
    const r = all1.find((m) => m.mode === c.mode)?.roles[c.role];
    const got = r ? resolvedOf(r.path, ns) : null;
    // The engine's link clamp (#1510) moves a sub-floor link pick to another step: the stored override and the emitted
    // step would disagree, so the change is refused rather than stored.
    if (r && got && (got.palette !== c.palette || got.step !== c.step)) refuse(i, c, 'clamped', OVERRIDE_COPY.clamped(c.mode, c.role, { palette: c.palette, step: c.step }, got, r.min));
  }
  const p0 = pairsOf(all0), p1 = pairsOf(all1);
  const own = new Set(kept.map((i) => {
    const c = changes[i];
    const a = all1.find((m) => m.mode === c.mode)?.roles[c.role]?.against;
    return `${c.mode}|${c.role}|${a}`;
  }));
  const newMisses: OverridePair[] = [], stillBelow: OverridePair[] = [], moved: OverrideMove[] = [];
  for (const [key, p] of p1) {
    const was = p0.get(key);
    if (below(p.ratio, p.min)) (was && below(was.ratio, was.min) ? stillBelow : newMisses).push(shown(p));
    if (was && !own.has(key) && Math.abs(was.ratio - p.ratio) >= 0.005) moved.push({ ...shown(p), before: round(was.ratio) });
  }
  for (const miss of newMisses) {
    const i = kept.find((k) => changes[k].mode === miss.mode && changes[k].role === miss.role);
    const c = i === undefined ? undefined : changes[i];
    const to = c && !isClear(c) ? { palette: c.palette, step: c.step } : null;
    // A clamped change already says why; its pair is not refused twice.
    if (i !== undefined && refusals.some((r) => r.index === i && r.reason === 'clamped')) continue;
    refusals.push({ index: i ?? null, mode: miss.mode, role: miss.role, reason: 'below-minimum', line: OVERRIDE_COPY.belowMinimum(miss.mode, miss.role, to, miss.ratio, miss.min, miss.against),
      ratio: miss.ratio, min: miss.min, against: miss.against });
  }
  refusals.sort((a, b) => (a.index ?? Infinity) - (b.index ?? Infinity));
  return {
    ok: refusals.length === 0, previewHash, input: next,
    changes: changes.map((c, index) => ({ index, mode: c.mode, role: c.role,
      before: modes0.has(c.mode) ? sideOf(all0, ns, c.mode, c.role, storedOv[c.mode]?.[c.role]) : null,
      after: kept.includes(index) ? sideOf(all1, ns, c.mode, c.role, nextOv[c.mode]?.[c.role]) : null })),
    moved, newMisses, stillBelow, contrast: { before: totals(p0), after: totals(p1) }, refusals,
  };
};

/** A side as the Activity line names it: the stored override's real palette, else the step the engine emitted. */
const named = (s: OverrideSide | null): string => (s ? ref(s.override ?? s.resolved) : 'none');

/** The plan's verdict: its headline and one line per change, or per refusal. `applied`: the Theme write ran and stored it. */
export const overrideVerdict = (plan: OverridePlan, applied: boolean): { ok: boolean; headline: string; lines: string[] } => {
  if (!plan.ok) {
    const owned = new Set(plan.refusals.map((r) => r.index).filter((i): i is number => i !== null));
    // A miss on a dependent or a twin names no one change: the changes in the modes it is in are the ones that could.
    const missModes = new Set(plan.refusals.filter((r) => r.index === null && r.mode !== null).map((r) => r.mode));
    // Only when no change owns a refusal: read once, before the loop adds to `owned`.
    const none = owned.size === 0;
    for (const c of plan.changes) if (none && missModes.has(c.mode)) owned.add(c.index);
    const n = owned.size || plan.changes.length;
    const contrastOnly = plan.refusals.every((r) => r.reason === 'below-minimum');
    return { ok: false, headline: contrastOnly ? OVERRIDE_COPY.headlineBelow(n) : OVERRIDE_COPY.headlineRefused(n), lines: plan.refusals.map((r) => r.line) };
  }
  const lines = plan.changes.map((c) => OVERRIDE_COPY.activity(c.mode, c.role, named(c.before), named(c.after), c.before?.ratio ?? 0, c.after?.ratio ?? 0));
  const n = plan.changes.length;
  const { total, fail } = plan.contrast.after;
  return { ok: true, headline: applied ? OVERRIDE_COPY.headlineSaved(n, total - fail, total) : OVERRIDE_COPY.headlinePreview(n), lines };
};

/** A whole-run refusal: one reason, no change owns it. */
export const wholeRunRefusal = (reason: 'theme-unsaved' | 'no-brand' | 'unreadable-brand' | 'brand-moved'): OverrideRefusal => ({
  index: null, mode: null, role: null, reason,
  line: reason === 'theme-unsaved' ? OVERRIDE_COPY.themeUnsaved : reason === 'brand-moved' ? OVERRIDE_COPY.brandMoved : reason === 'no-brand' ? OVERRIDE_COPY.noBrand : OVERRIDE_COPY.unreadableBrand,
});

/** The structured facts an agent reads beside the verdict (`data`). The brand itself is not repeated. */
export const overrideData = (plan: OverridePlan): Record<string, unknown> => ({
  previewHash: plan.previewHash, changes: plan.changes, moved: plan.moved, newMisses: plan.newMisses, stillBelow: plan.stillBelow,
  contrast: plan.contrast, refusals: plan.refusals,
});
