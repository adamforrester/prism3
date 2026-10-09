/**
 * THE IN-PLACE UPDATE, APPLIED (#2265 PR 2, owner decision Q85 A, every §10 recommendation).
 *
 * `update-plan.ts` says what an update would do; this does it, and only what that says. The confirm carries the
 * dry run's `previewHash`, and the file is read again here and refused unless it still hashes the same, so the
 * update acts on the file the designer (or agent) was shown, not on a file that moved since (§6).
 *
 * ── WHAT IS KEPT, ALWAYS ─────────────────────────────────────────────────────────────────────────────────
 *
 * The set node, every member node (so its component key, which every instance in a file using the library
 * follows) and every child the plan still has (so its id, which an override on a nested layer is tied to). The
 * member is configured by the build's own `build`, given the node the file already holds, so the update writes
 * exactly what a build writes and in the same order (`write-components.ts`, `ComponentApplyOptions.update`).
 * Only three plan changes make a new node, each listed by the dry run: a child whose type changed, a renamed
 * part (the old one is removed, the new one built), and a property whose type changed (deleted, then added).
 *
 * ── THE DEFAULTS, NEVER A SILENT CHOICE ──────────────────────────────────────────────────────────────────
 *
 *   hand edits         kept and reported (Q1). A node a designer edited keeps every field of its own, and its
 *                      record keeps its old hash, so the next dry run still reports it.
 *   dropped members    kept in the set and marked deprecated, never deleted (Q2). Their names are recorded on the
 *                      set (`RETAINED_KEY`), and the description says so.
 *   unstamped          skipped (Q4); `adopt-members` is the one-time claim.
 *   no record          updated by default and named in the verdict, never read as having no hand edits; without a
 *                      record one cannot be told from the plan (Q113 A). `choices.noBaseline: 'skip'` leaves it.
 *   structural edit    the whole member skipped: its paths can no longer be trusted node by node (§5).
 *   collapse           a set an axis removal would collapse is refused: those members cannot stay in the set,
 *                      and deleting them is never the default.
 *
 * ── THE ORDER (§7) ────────────────────────────────────────────────────────────────────────────────────────
 *
 * Preflight first, writing nothing: the hash, every font the plans' text styles and the members' text nodes
 * need, and every variable, style and nested or swapped component the plans name. A set that fails any of it is
 * refused by name. Then a named version (Q7), once, before the first write; if the host refuses it, nothing is
 * written. Then each set, nested sets first (Q8): member renames in one synchronous block (the set never holds
 * two axis lists at a host boundary, #1780), property deletes and default edits, the deprecation marks, and the
 * build's own pass, which configures the members, builds the new ones, declares and wires properties, lays out
 * the grid and reads everything back. Each member's stamp is written LAST, after its record, so a run that stops
 * part-way leaves its finished members current and the rest out of date, and running the update again finishes
 * it. One undo reverts the whole run: nothing here calls `commitUndo`.
 *
 * ── VERIFY, READ OFF THE HOST (§7) ────────────────────────────────────────────────────────────────────────
 *
 * Identity: the set's key, every surviving member's key and id, and every surviving child's id, captured in
 * preflight, compared after the run. A difference is a failure naming the member, apart from the children the
 * dry run said would be replaced. Content: `diffAnatomy` of every updated member against its plan, apart from
 * the nodes kept as hand edits. Either failing makes the verdict a failure.
 */
import { diffAnatomy, type HostNode } from '@prism3/engine/anatomy-readback';
import { planBoundVars, planComponentName, planEffectStyles, planPaintVars, planSetProperties, planTextStyles, type AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { tailOf } from '@prism3/engine/figma-names';
import type { ComponentRename } from '@prism3/engine/component-renames';
import { applyComponentPlan, memberStamp, STAMP_KEY, type ComponentApplyResult, type ComponentsApi, type CompPageTarget } from './write-components';
import { planTargets, presentNames } from './build-deps';
import { NS } from './persist-figma';
import { baselineDiff, baselineOf, readBaseline, snapshotMember } from './member-baseline';
import { drawnFaults, faultLine, varsById } from './drawn';
import { hostPorts, previewUpdate, readSetView, type SetPreview, type UpdateHost, type UpdatePreview, type UpdateTarget } from './update-plan';

/** The set's record of the members an update kept and marked deprecated (Q2): a JSON list of member names. */
export const RETAINED_KEY = 'retained';
/** What a deprecated member's description starts with (owner decision Q104 A). */
export const DEPRECATED_PREFIX = 'Deprecated — no longer generated by Prism3. ';
/** The named version saved before an update writes anything (Q7). Approved wording (Q114 A). */
export const versionTitle = (sets: readonly string[]): string => `Before Prism3 updated ${sets.join(', ')}`;

const fnv = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
};

/** The one hash a confirm echoes: every set's own hash, and what was missing or refused. */
export const previewHashOf = (r: UpdatePreview): string =>
  fnv(JSON.stringify([r.sets.map((s) => [s.set, s.previewHash]), r.missing, r.refused]));

/** The host an apply needs: the file the dry run reads, and the executor's port, which are the same `figma` in
 *  the plugin. Two parameters because they are two surfaces, and the offline host models each separately. */
export type ApplyHost = UpdateHost & { saveVersionHistoryAsync?(title: string, description?: string): Promise<unknown> };

/**
 * WHAT TO DO WITH HAND EDITS (design note §5, owner decision Q1). `keep`, the default: the node keeps the edit,
 * its record keeps the old hash, and the next dry run still lists it. `overwrite`: the plan's values are written
 * over it and the record is reset. `accept`: the edit stays and becomes the record, so it stops being listed. A
 * member with a layer added or removed by hand is skipped under all three: its paths are not to be trusted.
 */
export type HandEditChoice = 'keep' | 'overwrite' | 'accept';
/**
 * WHAT TO DO WITH A MEMBER THAT HAS NO AS-BUILT RECORD. Without one, a hand edit cannot be told from the plan, so
 * the update never assumes there is none: it says which members it could not check. `update`, the default:
 * the member is brought to the plan and named in the verdict as updated without a record (an edit on it, if any,
 * is overwritten; the named version saved first holds it). `skip`: the member is left as it is and listed.
 * The NB master's field-label members are this case: out of date when the record was captured, so never recorded.
 */
export type NoRecordChoice = 'update' | 'skip';
/** The choices a confirm carries: one for every set, and any set by name in place of it. */
export type UpdateChoices = {
  handEdits?: HandEditChoice; noBaseline?: NoRecordChoice;
  sets?: Record<string, { handEdits?: HandEditChoice; noBaseline?: NoRecordChoice }>;
};
const choiceFor = (c: UpdateChoices | undefined, set: string): HandEditChoice => c?.sets?.[set]?.handEdits ?? c?.handEdits ?? 'keep';
const noRecordFor = (c: UpdateChoices | undefined, set: string): NoRecordChoice => c?.sets?.[set]?.noBaseline ?? c?.noBaseline ?? 'update';

export type SetOutcome = {
  def: string;
  set: string;
  /** Why the set was not touched, when it was not. */
  refused?: string;
  updated: string[];
  added: number;
  renamed: number;
  deprecated: string[];
  /** Members left as they are, each with its reason. */
  skipped: { member: string; reason: string }[];
  /** Members updated with no as-built record, so with no hand-edit check (`choices.noBaseline`, default `update`). */
  unrecorded: string[];
  /** Of `unrecorded`, those whose record was from an earlier format (#2379 review). */
  earlierRecord?: string[];
  /** Hand edits, by member and path, and what this run did with them (`choices.handEdits`). */
  kept: { member: string; path: string }[];
  handEdits: HandEditChoice;
  /** Verify (a): every identity change the dry run did not list. */
  identity: string[];
  /** Verify (b): every field the updated members still differ from their plans in. */
  content: string[];
  /** The build pass's own misses, apart from its notes on members it was told to leave alone. */
  misses: string[];
  /** Set when the run stopped in this set. */
  stopped?: string;
  /** Members the dry run read as built by an earlier plugin and otherwise unchanged (`revisionUnknown`): given the
   *  current stamp and nothing else (#2379). */
  restamped?: string[];
};

export type ApplyResult = {
  /** `null` when the confirm was refused before anything was read for writing. */
  outcomes: SetOutcome[];
  refusedAll?: string;
  version?: string;
  missing: string[];
  refused: { def: string; reason: string }[];
};

type LiveNode = { id?: unknown; key?: unknown; name?: unknown; type?: unknown; children?: readonly unknown[]; parent?: unknown };
type LiveSet = LiveNode & {
  componentPropertyDefinitions?: Record<string, { type?: string; defaultValue?: unknown }>;
  editComponentProperty?(key: string, edit: { defaultValue?: string | boolean }): string;
  deleteComponentProperty?(key: string): void;
  getSharedPluginData?(ns: string, k: string): string;
  setSharedPluginData?(ns: string, k: string, v: string): void;
};

const idOf = (n: unknown): string => { try { return String((n as LiveNode).id ?? ''); } catch { return ''; } };
const keyOf = (n: unknown): string => { try { const k = (n as LiveNode).key; return typeof k === 'string' ? k : ''; } catch { return ''; } };
const kidsOf = (n: unknown): LiveNode[] => { try { return [...((n as LiveNode).children ?? [])] as LiveNode[]; } catch { return []; } };

/** Every child's id the plan names, by path, walking plan and host together. A glyph's contents are Figma's
 *  import (replaced on purpose) and an instance's are its main's, so neither is walked. */
const childIds = (plan: AnatomyPlan['root'], node: unknown, path: string, out: Map<string, string>): void => {
  if (plan.type === 'GLYPH' || plan.type === 'INSTANCE_SWAP' || plan.type === 'NESTED_INSTANCE') return;
  const kids = kidsOf(node);
  for (const c of plan.children ?? []) {
    const k = kids.find((x) => String(x.name ?? '') === c.name);
    if (!k) continue;
    const p = path === '.' ? c.name : `${path}/${c.name}`;
    out.set(p, idOf(k));
    childIds(c, k, p, out);
  }
};

/** The page a set sits on, as the executor's placement target. */
const pageOf = (n: unknown): CompPageTarget | undefined => {
  let p: unknown = n;
  for (let i = 0; i < 64 && p; i++) {
    const q = p as { type?: unknown; parent?: unknown };
    if (q.type === 'PAGE') return p as CompPageTarget;
    try { p = q.parent; } catch { return undefined; }
  }
  return undefined;
};

/** Nested sets first (Q8): a def whose plans nest or swap another target's set comes after that target. */
export const nestedFirst = (targets: readonly UpdateTarget[]): UpdateTarget[] => {
  const nameOf = (t: UpdateTarget): string => t.plans[0]?.component ?? t.def;
  const out: UpdateTarget[] = [];
  const seen = new Set<string>();
  const visit = (t: UpdateTarget, depth: number): void => {
    if (seen.has(t.def) || depth > targets.length) return;
    seen.add(t.def);
    for (const n of planTargets(t.plans)) {
      const dep = targets.find((x) => x !== t && nameOf(x) === n);
      if (dep) visit(dep, depth + 1);
    }
    out.push(t);
  };
  for (const t of targets) visit(t, 0);
  return out;
};

/**
 * PREFLIGHT, one set, writing nothing. `null` when the set can be updated; otherwise the reason it cannot.
 */
const preflight = async (api: ComponentsApi, t: UpdateTarget, p: SetPreview, live: LiveSet, present: Set<string>): Promise<string | null> => {
  if (p.blockers.length) return p.blockers.join('; ');
  if (p.needsChoice.includes('axisCollapse')) return 'an axis the plan removed would collapse members onto one coordinate, and they cannot stay in the set';
  const hostAxes = p.axes.from.join(',');
  if (hostAxes !== p.axes.to.join(',') && p.unstamped.length)
    return `the axes change, and ${p.unstamped.length} member${p.unstamped.length === 1 ? '' : 's'} not built by Prism3 would be left on the old ones (${p.unstamped.slice(0, 3).join('; ')})`;
  const names = live.children ? kidsOf(live).map((c) => String(c.name ?? '')) : [];
  const after = new Map(names.map((n) => [n, n] as const));
  for (const m of p.moves) { after.delete(m.from); }
  for (const m of p.moves) {
    if (after.has(m.to)) return `renaming ${m.from} would give it the name of another member (${m.to})`;
    after.set(m.to, m.to);
  }
  // EVERY NAME THE PLANS REACH FOR, resolved in this file before anything is written. A build would report each
  // as a miss and write the rest; an update would leave a published set half-changed, which is worse (§7).
  const roots = t.plans.map((x) => x.root);
  const vars = new Set((await api.variables.getLocalVariablesAsync()).map((v) => tailOf(v.name)).filter(Boolean) as string[]);
  const wantVars = [...new Set(roots.flatMap((r) => [...planBoundVars(r), ...planPaintVars(r)]))];
  const noVar = wantVars.filter((v) => !vars.has(v));
  if (noVar.length) return `${noVar.length} variable${noVar.length === 1 ? '' : 's'} the plan binds ${noVar.length === 1 ? 'is' : 'are'} not in this file (${noVar.slice(0, 3).join(', ')})`;
  const styles = await api.getLocalTextStylesAsync();
  const byName = new Map(styles.map((s) => [s.name, s] as const));
  const wantStyles = [...new Set(roots.flatMap(planTextStyles))];
  const noStyle = wantStyles.filter((s) => !byName.has(s));
  if (noStyle.length) return `text style${noStyle.length === 1 ? '' : 's'} not in this file: ${noStyle.slice(0, 3).join(', ')}`;
  const effects = new Set((await api.getLocalEffectStylesAsync()).map((s) => s.name));
  const noEffect = [...new Set(roots.flatMap(planEffectStyles))].filter((s) => !effects.has(s));
  if (noEffect.length) return `effect style${noEffect.length === 1 ? '' : 's'} not in this file: ${noEffect.slice(0, 3).join(', ')}`;
  const noComp = planTargets(t.plans).filter((n) => !present.has(n));
  if (noComp.length) return `component${noComp.length === 1 ? '' : 's'} the plan nests or swaps ${noComp.length === 1 ? 'is' : 'are'} not in this file: ${noComp.slice(0, 3).join(', ')}`;
  // FONTS, the two failures seen in practice (#913, #1599): a style's typeface that is not installed, and a text
  // node's own font. Every one is loaded now; any that will not load refuses the set.
  const fonts = new Map<string, { family: string; style: string }>();
  for (const s of wantStyles) { const f = byName.get(s)?.fontName; if (f) fonts.set(`${f.family}|${f.style}`, f); }
  const walk = (n: unknown): void => {
    const x = n as { type?: unknown; fontName?: unknown };
    if (x.type === 'TEXT' && x.fontName && typeof x.fontName === 'object') {
      const f = x.fontName as { family: string; style: string };
      fonts.set(`${f.family}|${f.style}`, f);
    }
    if (x.type !== 'INSTANCE') for (const k of kidsOf(n)) walk(k);
  };
  for (const c of kidsOf(live)) walk(c);
  const failed: string[] = [];
  for (const f of fonts.values()) {
    try { await api.loadFontAsync(f); } catch { failed.push(`${f.family} ${f.style}`); }
  }
  if (failed.length) return `fonts: ${failed.join(', ')} will not load, so text could not be written`;
  return null;
};

/** Which members this update configures, which it leaves, and why, from the dry run alone. */
const plan = (p: SetPreview, choice: HandEditChoice, noRecord: NoRecordChoice): { members: Map<string, { keep: Set<string>; accept?: boolean }>; skipped: { member: string; reason: string }[]; kept: { member: string; path: string }[]; unrecorded: string[]; restamp: string[]; earlierRecord: string[] } => {
  const byMember = new Map<string, SetPreview['handEdits']>();
  for (const h of p.handEdits) byMember.set(h.member, [...(byMember.get(h.member) ?? []), h]);
  const members = new Map<string, { keep: Set<string>; accept?: boolean }>();
  const skipped: { member: string; reason: string }[] = [];
  const kept: { member: string; path: string }[] = [];
  const unrecorded: string[] = [];
  const restamp: string[] = [];
  const earlierRecord: string[] = [];
  const moved = new Map(p.moves.map((m) => [m.from, m.to] as const));
  const rootReplaced = new Set(p.replacements.filter((r) => r.path === '.').map((r) => r.member));
  for (const s of p.states) {
    const at = moved.get(s.member) ?? s.member;
    const edits = byMember.get(s.member) ?? [];
    if (s.state === 'unstamped') { skipped.push({ member: s.member, reason: 'not built by Prism3' }); continue; }
    // NO CHANGES (#2379): a member the dry run reads as built by an earlier plugin matches its plan and its record.
    // The build's pass is never run over it: on the NB master that pass, over 16 such sets, is what broke them. It
    // takes the current stamp, and nothing else is written.
    if (s.state === 'revisionUnknown') { restamp.push(at); continue; }
    if (s.state === 'noBaseline') {
      // NEVER READ AS "NO HAND EDITS": with no record there is no check, and the verdict says so by name.
      if (noRecord === 'skip') { skipped.push({ member: s.member, reason: 'no as-built record' }); continue; }
      unrecorded.push(at);
      if (s.earlierRecord) earlierRecord.push(at);
      members.set(at, { keep: new Set<string>() });
      continue;
    }
    if (edits.some((e) => e.structural)) { skipped.push({ member: s.member, reason: 'a layer was added or removed by hand' }); continue; }
    if (rootReplaced.has(s.member)) { skipped.push({ member: s.member, reason: 'the member itself would need replacing' }); continue; }
    // `overwrite` writes over every edited node; `keep` and `accept` leave them, and differ only in the record.
    const keep = choice === 'overwrite' ? new Set<string>() : new Set(edits.map((e) => e.path.replace(/#\d+$/, '')));
    for (const e of edits) kept.push({ member: at, path: e.path });
    members.set(at, { keep, ...(choice === 'accept' ? { accept: true } : {}) });
  }
  return { members, skipped, kept, unrecorded, restamp, earlierRecord };
};

/** The members `plan` left for the current stamp alone (#2379). Each is checked against its record first, and again
 *  after: a member that differs from it is not stamped, and anything written to one while it was stamped is a
 *  content failure, by name. */
const restampMembers = async (live: LiveSet, names: readonly string[], plans: ReadonlyMap<string, AnatomyPlan>, out: SetOutcome): Promise<void> => {
  out.restamped = [];
  const byName = new Map(kidsOf(live).map((c) => [String(c.name ?? ''), c as LiveNode & { setSharedPluginData?(ns: string, k: string, v: string): void }] as const));
  for (const name of names) {
    const m = byName.get(name);
    const pl = plans.get(name);
    if (!m || !pl) { out.skipped.push({ member: name, reason: 'not in the set to stamp' }); continue; }
    const rec = readBaseline(m);
    const now = baselineOf(await snapshotMember(m));
    const d = rec ? baselineDiff(rec, now) : null;
    if (!d || d.changed.length + d.added.length + d.removed.length) {
      out.content.push(`${name}: differs from its record (${d ? [...d.changed, ...d.added, ...d.removed].slice(0, 3).join(', ') : 'no record'}), so it was not stamped`);
      continue;
    }
    m.setSharedPluginData?.(NS, STAMP_KEY, memberStamp(pl));
    const after = baselineDiff(rec!, baselineOf(await snapshotMember(m)));
    if (after.changed.length + after.added.length + after.removed.length) out.content.push(`${name}: changed while it was stamped (${[...after.changed, ...after.added, ...after.removed].slice(0, 3).join(', ')})`);
    out.restamped.push(name);
  }
};

/** One set: renames, property changes, deprecations, then the build's own pass in update mode, then verify. */
const applySet = async (host: ApplyHost, api: ComponentsApi, t: UpdateTarget, p: SetPreview, live: LiveSet, opts: { description?: string; yieldTo?: () => Promise<void>; handEdits: HandEditChoice; noBaseline: NoRecordChoice }): Promise<SetOutcome> => {
  const out: SetOutcome = { def: t.def, set: p.set, updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: opts.handEdits, identity: [], content: [], misses: [] };
  const work = plan(p, opts.handEdits, opts.noBaseline);
  out.skipped = work.skipped;
  out.unrecorded = work.unrecorded;
  if (work.earlierRecord.length) out.earlierRecord = work.earlierRecord;
  out.kept = work.kept;
  const plans = new Map(t.plans.map((x) => [planComponentName(x), x] as const));

  // ── THE IDENTITY BEFORE ─────────────────────────────────────────────────────────────────────────────────
  const setKey = keyOf(live);
  const setId = idOf(live);
  const moved = new Map(p.moves.map((m) => [m.from, m.to] as const));
  const before = new Map<string, { id: string; key: string; ref: unknown; kids: Map<string, string> }>();
  for (const c of kidsOf(live)) {
    const name = String(c.name ?? '');
    const at = moved.get(name) ?? name;
    const kids = new Map<string, string>();
    const pl = plans.get(at);
    if (pl && work.members.has(at)) childIds(pl.root, c, '.', kids);
    before.set(at, { id: idOf(c), key: keyOf(c), ref: c, kids });
  }
  const replaced = new Set(p.replacements.map((r) => `${moved.get(r.member) ?? r.member}\u0000${r.path}`));

  // ── RENAMES, ONE SYNCHRONOUS BLOCK (#1780): no `await` between the first and the last ─────────────────────
  const byName = new Map(kidsOf(live).map((c) => [String(c.name ?? ''), c] as const));
  for (const m of p.moves) {
    const n = byName.get(m.from) as { name?: string } | undefined;
    if (n) { n.name = m.to; out.renamed++; }
  }

  // ── PROPERTIES: a retype or a removal deletes (the build's pass adds the retyped one back); a default is edited
  const defs = live.componentPropertyDefinitions ?? {};
  const keyByBare = new Map(Object.keys(defs).filter((k) => defs[k].type !== 'VARIANT').map((k) => [k.replace(/#[^#]*$/, ''), k] as const));
  for (const x of [...p.properties.retype, ...p.properties.remove]) {
    const k = keyByBare.get(x.name);
    if (k) live.deleteComponentProperty?.(k);
  }
  for (const x of p.properties.edit) {
    const k = keyByBare.get(x.name);
    if (!k) continue;
    const want = x.type === 'BOOLEAN' ? x.to === 'true' : String(x.to);
    live.editComponentProperty?.(k, { defaultValue: want });
  }
  // AN INSTANCE_SWAP DEFAULT is a node id, which the dry run cannot compare (it has no plan-side id). The plan names
  // its target; where the set's default points elsewhere, it is moved to that target's id, so an instance placed
  // fresh shows what the members now show.
  const comps = new Map((api.root.findAllWithCriteria({ types: ['COMPONENT'] }) as readonly { name?: string; id?: string }[]).map((c) => [String(c.name ?? ''), String(c.id ?? '')] as const));
  for (const w of planSetProperties(t.plans)) {
    if (w.type !== 'INSTANCE_SWAP') continue;
    const k = keyByBare.get(w.name);
    const id = comps.get((w as { swapTarget?: string }).swapTarget ?? '');
    if (k && id && defs[k]?.type === 'INSTANCE_SWAP' && defs[k].defaultValue !== id) live.editComponentProperty?.(k, { defaultValue: id });
  }

  // ── DROPS: kept, marked deprecated, recorded on the set (Q2) ───────────────────────────────────────────────
  const dropNames = p.drops.map((d) => moved.get(d) ?? d);
  let retained: string[] = [];
  try { retained = JSON.parse(live.getSharedPluginData?.(NS, RETAINED_KEY) || '[]') as string[]; } catch { retained = []; }
  for (const d of dropNames) {
    const n = kidsOf(live).find((c) => String(c.name ?? '') === d) as { description?: string } | undefined;
    if (!n) continue;
    if (!String(n.description ?? '').startsWith(DEPRECATED_PREFIX)) n.description = DEPRECATED_PREFIX + String(n.description ?? '');
    if (!retained.includes(d)) retained.push(d);
    out.deprecated.push(d);
  }
  if (out.deprecated.length) live.setSharedPluginData?.(NS, RETAINED_KEY, JSON.stringify(retained));

  // ── THE BUILD'S OWN PASS, IN UPDATE MODE ────────────────────────────────────────────────────────────────────
  let r: ComponentApplyResult;
  try {
    r = await applyComponentPlan(t.plans, api, {
      ...(opts.description ? { description: opts.description } : {}),
      ...(opts.yieldTo ? { yieldTo: opts.yieldTo } : {}),
      ...(pageOf(live) ? { targetPage: pageOf(live) } : {}),
      update: { members: work.members, retained: new Set(retained) },
    });
  } catch (err) {
    out.stopped = (err as Error)?.message ?? String(err);
    return out;
  }
  out.updated = r.updatedInPlace ?? [];
  out.added = r.added;
  // The build's notes on the members it was told to leave alone are this run's skips, already reported above.
  out.misses = r.misses.filter((x) => !/^member .* -> (ALREADY PRESENT|STALE) /.test(x));

  // ── VERIFY (a): IDENTITY, OFF THE HOST ─────────────────────────────────────────────────────────────────────
  const now = (host.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as LiveSet[]).find((s) => idOf(s) === setId || (setKey && keyOf(s) === setKey)) ?? live;
  if (keyOf(now) !== setKey || idOf(now) !== setId) out.identity.push(`the set: key ${setKey} → ${keyOf(now)}, id ${setId} → ${idOf(now)}`);
  const after = new Map(kidsOf(now).map((c) => [String(c.name ?? ''), c] as const));
  for (const [name, b] of before) {
    const a = after.get(name);
    if (!a) { out.identity.push(`${name}: no longer in the set`); continue; }
    if (idOf(a) !== b.id || keyOf(a) !== b.key) { out.identity.push(`${name}: replaced (key ${b.key} → ${keyOf(a)}, id ${b.id} → ${idOf(a)})`); continue; }
    if (!b.kids.size) continue;
    const kidsNow = new Map<string, string>();
    childIds(plans.get(name)!.root, a, '.', kidsNow);
    for (const [path, id] of b.kids) {
      if (replaced.has(`${name}\u0000${path}`)) continue;
      const got = kidsNow.get(path);
      if (got === undefined) { if (!replaced.has(`${name}\u0000${path}`)) out.identity.push(`${name}/${path}: gone`); continue; }
      if (got !== id) out.identity.push(`${name}/${path}: replaced (id ${id} → ${got})`);
    }
  }

  // ── VERIFY (b): CONTENT, every updated member against its plan, apart from the hand edits kept ──────────────
  const ports = await hostPorts(host);
  const varById = await varsById(api as unknown as Parameters<typeof varsById>[0]);
  for (const name of out.updated) {
    const a = after.get(name);
    const pl = plans.get(name);
    if (!a || !pl) continue;
    const snap = await snapshotMember(a);
    const keep = work.members.get(name)?.keep ?? new Set<string>();
    const rootName = pl.root.name;
    const rel = (x: string): string => (x === rootName ? '.' : x.startsWith(`${rootName}/`) ? x.slice(rootName.length + 1) : x);
    for (const d of diffAnatomy([pl], [snap as unknown as HostNode], () => name, ports)) {
      if (d.field === 'member') continue;
      const at = rel(d.path);
      if ([...keep].some((k) => at === k || at.startsWith(`${k}/`))) continue;
      out.content.push(`${name}/${at}.${d.field}: ${d.actual} (the plan says ${d.expected})`);
    }
    // WHAT THE HOST DRAWS (#2379): the paint's stored color and alpha, and a glyph's vectors where they sit, which
    // `diffAnatomy` does not read. The dry run judges a member by the same check (`drawn.ts`).
    for (const f of drawnFaults(a, varById, (part) => [...keep].some((k) => part === k || part.startsWith(`${k}/`)))) out.content.push(faultLine(name, f));
  }
  if (work.restamp.length) await restampMembers(now, work.restamp, plans, out);
  return out;
};

/**
 * `update-components` with `confirm: true`: the update, applied, over the targets the dry run checked.
 * `host` reads the file as the dry run does; `api` is the executor's port. Both are `figma` in the plugin.
 */
export const applyUpdate = async (
  host: ApplyHost,
  api: ComponentsApi,
  targets: readonly UpdateTarget[],
  previewHash: string,
  /** `ledger` is the engine's `COMPONENT_RENAMES` unless a test passes its own. */
  opts: { descriptionOf?: (def: string) => string | undefined; breathe?: () => Promise<void>; yieldTo?: () => Promise<void>; ledger?: readonly ComponentRename[]; choices?: UpdateChoices } = {},
): Promise<ApplyResult> => {
  const preview = await previewUpdate(host, targets, opts.breathe, opts.ledger);
  const res: ApplyResult = { outcomes: [], missing: preview.missing, refused: preview.refused };
  if (previewHashOf(preview) !== previewHash) {
    res.refusedAll = 'the file changed since the check. Run the check again, then confirm the new one';
    return res;
  }
  // PREFLIGHT EVERY SET, before anything is written anywhere.
  const present = presentNames(api as unknown as Parameters<typeof presentNames>[0]);
  const liveOf = new Map<string, LiveSet>();
  for (const s of host.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as LiveSet[]) liveOf.set(String(s.name ?? ''), s);
  const ordered = nestedFirst(targets);
  const ready: { t: UpdateTarget; p: SetPreview; live: LiveSet; stampOnly?: boolean }[] = [];
  for (const t of ordered) {
    const p = preview.sets.find((s) => s.set === (t.plans[0]?.component ?? t.def));
    const live = p ? liveOf.get(p.set) : undefined;
    if (!p || !live) continue;
    const why = await preflight(api, t, p, live, present);
    if (why) { res.outcomes.push({ def: t.def, set: p.set, refused: why, updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: choiceFor(opts.choices, p.set), identity: [], content: [], misses: [] }); continue; }
    // Nothing for the build's pass to do. A member from an earlier plugin (`revisionUnknown`) is not work for it
    // (#2379): it takes only the current stamp, so a set of nothing else is stamped and never built over.
    const nothing = p.counts.update + p.counts.handEdited + p.counts.add + p.counts.drop + p.counts.rename === 0
      && Object.values(p.properties).every((l) => l.length === 0);
    if (nothing && p.counts.revisionUnknown) { ready.push({ t, p, live, stampOnly: true }); continue; }
    if (nothing) { res.outcomes.push({ def: t.def, set: p.set, updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: choiceFor(opts.choices, p.set), identity: [], content: [], misses: [] }); continue; }
    ready.push({ t, p, live });
  }
  if (!ready.length) return res;
  // A NAMED VERSION, ONCE, BEFORE THE FIRST WRITE (Q7). Refused or unavailable, nothing is written.
  const title = versionTitle(ready.map((x) => x.p.set));
  try {
    if (!host.saveVersionHistoryAsync) throw new Error('this host cannot save a version');
    await host.saveVersionHistoryAsync(title);
    res.version = title;
  } catch (err) {
    res.refusedAll = `the named version could not be saved (${(err as Error)?.message ?? String(err)}), so nothing was written`;
    return res;
  }
  for (const { t, p, live, stampOnly } of ready) {
    // Re-read: a nested set updated just before this one changed what this one's instances point at.
    const fresh = (host.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as LiveSet[]).find((s) => String(s.name ?? '') === p.set) ?? live;
    if (stampOnly) {
      const o: SetOutcome = { def: t.def, set: p.set, updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: choiceFor(opts.choices, p.set), identity: [], content: [], misses: [] };
      const w = plan(p, choiceFor(opts.choices, p.set), noRecordFor(opts.choices, p.set));
      await restampMembers(fresh, w.restamp, new Map(t.plans.map((x) => [planComponentName(x), x] as const)), o);
      res.outcomes.push(o);
      continue;
    }
    const o = await applySet(host, api, t, p, fresh, { description: opts.descriptionOf?.(t.def), yieldTo: opts.yieldTo, handEdits: choiceFor(opts.choices, p.set), noBaseline: noRecordFor(opts.choices, p.set) });
    res.outcomes.push(o);
    if (o.stopped) break;
  }
  return res;
};

// ---- the words (approved, Q114 A; #2265 §8) -----------------------------------------------------------------

const n = (k: number, one: string, many = `${one}s`): string => `${k} ${k === 1 ? one : many}`;

/** The verdict for an applied update. `lines` is the Activity drawer's copy (#2177). */
export const applyVerdict = (r: ApplyResult): { ok: boolean; headline: string; summary: string; lines: string[] } => {
  if (r.refusedAll) {
    const lines = [`Nothing was updated: ${r.refusedAll}.`];
    return { ok: false, headline: '✗ update refused', summary: lines.join('\n'), lines };
  }
  const stopped = r.outcomes.find((o) => o.stopped);
  const failed = r.outcomes.filter((o) => o.identity.length || o.content.length);
  const refused = r.outcomes.filter((o) => o.refused).length + r.refused.length;
  const updated = r.outcomes.reduce((k, o) => k + o.updated.length, 0);
  const added = r.outcomes.reduce((k, o) => k + o.added, 0);
  const deprecated = r.outcomes.reduce((k, o) => k + o.deprecated.length, 0);
  const renamed = r.outcomes.reduce((k, o) => k + o.renamed, 0);
  const lines: string[] = [];
  for (const o of r.outcomes) {
    if (o.refused) { lines.push(`${o.set}: not updated. ${o.refused}.`); continue; }
    if (o.stopped) {
      lines.push(`${o.set}: stopped (${o.stopped}). ${n(o.updated.length, 'member')} updated; the rest are unchanged and still read as out of date. Run the update again to finish, or undo once to revert it.`);
      continue;
    }
    const parts = [
      o.updated.length ? `${o.updated.length} updated in place` : '',
      o.added ? `${o.added} added` : '',
      o.renamed ? `${o.renamed} renamed` : '',
      o.deprecated.length ? `${o.deprecated.length} marked deprecated` : '',
      o.kept.length ? `${n(o.kept.length, 'hand edit')} ${o.handEdits === 'overwrite' ? 'overwritten' : o.handEdits === 'accept' ? 'accepted as built' : 'kept'}` : '',
      o.unrecorded.length - (o.earlierRecord?.length ?? 0) ? `${o.unrecorded.length - (o.earlierRecord?.length ?? 0)} of them without an as-built record` : '',
      // The owner's wording (2026-10-09).
      o.earlierRecord?.length ? `${o.earlierRecord.length} of them recorded by an earlier plugin version` : '',
      o.skipped.length ? `${o.skipped.length} left as they are` : '',
    ].filter(Boolean);
    lines.push(parts.length ? `${o.set}: ${parts.join(', ')}.` : `${o.set}: already up to date.`);
    if (o.identity.length) lines.push(`${o.set}: component IDs changed — ${o.identity.slice(0, 3).join('; ')}${o.identity.length > 3 ? '; …' : ''}.`);
    if (o.content.length) lines.push(`${o.set}: ${n(o.content.length, 'field')} still differ from the plan — ${o.content.slice(0, 3).join('; ')}${o.content.length > 3 ? '; …' : ''}.`);
  }
  for (const x of r.refused) lines.push(`${x.def}: not updated. ${x.reason}.`);
  if (r.missing.length) lines.push(`Not in this file: ${r.missing.join(', ')}.`);
  if (r.version) lines.push(`Saved a version first: "${r.version}".`);
  const headline = stopped ? `✗ update stopped at ${stopped.set}`
    : failed.length ? `⚠ ${n(failed.length, 'set')} not verified`
      : refused ? `✗ ${n(refused, 'set')} not updated`
        : updated ? `✓ updated ${updated} in place`
          : added ? `✓ added ${added}`
            : deprecated ? `✓ ${deprecated} marked deprecated`
              : renamed ? `✓ renamed ${renamed}` : '✓ already up to date';
  return { ok: !stopped && !failed.length && !refused, headline, summary: lines.join('\n'), lines };
};
