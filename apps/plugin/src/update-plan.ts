/**
 * THE UPDATE DRY RUN (#2265, owner decision Q85 A) — what an in-place update of an existing component set
 * would change, add, deprecate and report, worked out without writing anything.
 *
 * Build stays add-only (#827, §10 Q6). This module is the first half of the separate update: it reads a
 * set as the file holds it and lays it against the plan the engine would build today. The apply half is
 * PR 2; until it lands, nothing here writes, and `update-components` with `confirm: true` is refused.
 *
 * ── MATCHING: THE COORDINATE, CANONICALIZED (§2) ─────────────────────────────────────────────────────
 *
 * A member is the same member when its variant coordinate, the `axis=value` segments of its name, sorted
 * (`coordKey`), lands on a planned coordinate. Before the comparison an existing coordinate goes through
 * the declared renames (`COMPONENT_RENAMES`), then gains any axis the plan added at the set's default
 * value, then loses any axis the plan removed. The member stamp does not match a member; it says whether
 * a matched member is current.
 *
 * ── READING A MATCHED MEMBER ─────────────────────────────────────────────────────────────────────────
 *
 * In this order, the first that applies:
 *
 *   unstamped        no stamp: built by hand, by paste, or before #827. Skipped and reported (§10 Q4).
 *
 * AN UNSTAMPED MEMBER IS NEVER A DROP (#2283). A coordinate the plan does not have is a drop, a member an
 * update would mark deprecated, only when Prism3 built it. One with no stamp is a designer's own member,
 * so it is skipped and listed under `unstamped`, wherever it lands: off the plan, on a planned coordinate,
 * or onto a coordinate a removed axis collapses. Where it shares a coordinate with a stamped member, the
 * stamped one is the match. `adoptSet` is the one-time Adopt that claims such a member (§10 Q4).
 *   noBaseline       no as-built record, so a hand edit cannot be told from an engine change.
 *   handEdited       the as-built record differs from the node now: someone edited it.
 *   update           the plan stamp differs, or the executor revision does.
 *   revisionUnknown  the plan stamp agrees, but the stamp predates the executor revision (#1098).
 *   current          nothing to do.
 *
 * A member can be hand-edited AND out of date. It reads `handEdited`, and its field changes are still
 * listed, each hand-edited node marked as a conflict when the plan would change it too.
 *
 * ── WHAT THE FIELD CHANGES ARE, AND ARE NOT ──────────────────────────────────────────────────────────
 *
 * `diffAnatomy`, the read-back the build already trusts, run on a snapshot of the member against the plan,
 * plus the one direction it does not report: a child the host has and the plan does not, which an update
 * would remove. Its blind spots are this module's (`anatomy-readback.ts` lists them). A member whose stamp
 * moved and that shows no field difference is listed as re-applied rather than left out.
 */
import { planComponentName, planSetProperties } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { diffAnatomy, type HostNode, type ReadPorts } from '@prism3/engine/anatomy-readback';
import { COMPONENT_RENAMES, coordKey, coordPairs, renameCoordinate, type ComponentRename } from '@prism3/engine/component-renames';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { EXECUTOR_REVISION } from './executor-revision';
import { memberStamp, planHalf, revHalf, STAMP_KEY } from './write-components';
import { NS } from './persist-figma';
import { baselineDiff, baselineOf, readBaseline, snapshotMember, writeBaseline, type Baseline, type SnapNode } from './member-baseline';

/** One member of a set as the dry run reads it. */
export type HostMember = { name: string; id: string; stamp: string; baseline: Baseline | null; snap: SnapNode };

/** A set as the dry run reads it: plain data, so the comparison below is pure. */
export type HostSetView = {
  name: string;
  id: string;
  key: string;
  page: string;
  /** Children whose names are coordinates. */
  members: HostMember[];
  /** Children whose names are not: a designer's copies, left alone. */
  others: string[];
  /** The set's property definitions, or `null` when the host would not give them (#1780). */
  definitions: Record<string, { type?: string; defaultValue?: unknown }> | null;
};

export type MemberState = 'current' | 'update' | 'handEdited' | 'unstamped' | 'noBaseline' | 'revisionUnknown';

type Change = { part: string; field: string; from: string; to: string; members: number; sample: string[] };
type Prop = { name: string; type: string; from?: string; to?: string };
type Choice = 'drops' | 'handEdits' | 'noBaseline' | 'axisCollapse';

export type SetPreview = {
  set: string;
  page: string;
  setKey: string;
  previewHash: string;
  counts: { members: number; current: number; update: number; add: number; drop: number; rename: number; handEdited: number; noBaseline: number; unstamped: number; revisionUnknown: number; reapplied: number };
  blockers: string[];
  axes: { from: string[]; to: string[]; renames: { from: string; to: string }[] };
  properties: { add: Prop[]; edit: Prop[]; rename: Prop[]; retype: Prop[]; remove: Prop[] };
  changes: Change[];
  replacements: { member: string; path: string; reason: string }[];
  adds: string[];
  drops: string[];
  /** Every coordinate member with no stamp, by name: skipped by the update, never a drop (#2283). */
  unstamped: string[];
  /** The unstamped members Adopt may claim: each is the match for a planned coordinate (renames and axis changes
   *  applied, as for every member), with no other member landing there ahead of it. */
  adoptable: string[];
  /** The unstamped members on a planned coordinate another member is the match for, and whether that member is
   *  Prism3's. Adopt leaves them as they are: claiming one would put two members on one coordinate. */
  held: { member: string; byPrism3: boolean }[];
  renames: { from: string; to: string }[];
  possibleRenames: { from: string; to: string }[];
  handEdits: { member: string; path: string; conflict: boolean; structural: boolean }[];
  needsChoice: Choice[];
  /** Entries left out of a list past `LIST_CAP`, per list. Absent when nothing was. */
  truncated?: Record<string, number>;
};

/** Each list is capped so a whole-library preview stays a few mailbox chunks (§6). */
export const LIST_CAP = 500;

const fnv = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
};
const keyOf = (pairs: readonly (readonly [string, string])[]): string =>
  [...pairs].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([a, v]) => `${a}=${v}`).join(', ');

/** Children the host has and the plan does not, walked by name, each as a path relative to the member.
 *  A GLYPH's contents are not walked: they are what Figma's SVG importer made of `glyphSvg`, unnamed and
 *  never in the plan, so every glyph would otherwise read as carrying children the update must remove. */
const extraChildren = (plan: AnatomyPlan['root'], node: SnapNode, path: string, out: string[]): void => {
  if (plan.type === 'GLYPH') return;
  const planned = new Map((plan.children ?? []).map((c) => [c.name, c] as const));
  for (const k of node.children ?? []) {
    const p = path === '.' ? k.name : `${path}/${k.name}`;
    const cp = planned.get(k.name);
    if (!cp) out.push(p);
    else extraChildren(cp, k, p, out);
  }
};

/** A stamp Prism3 wrote (#2300): the engine version, a 16-hex plan stamp or `adopted`, and the executor revision
 *  (absent on a stamp from before #1098). Anything else is not Prism3's, however it got there. */
export const STAMP_SHAPE = /^[^|]+\|(?:[0-9a-f]{16}|adopted)(?:\|\d+)?$/;

/**
 * THE MEMBERS AS PRISM3 OWNS THEM (#2300): a member whose stamp is malformed, or whose as-built record names
 * ANOTHER member of the set (a Figma Duplicate copies both, so a copy's record names its original), reads as
 * not built by Prism3. Its stamp is blanked here, once, so every reading below (drops, matches, Adopt, the
 * capture) treats it as a designer's own member. A record naming a node that is not in the set is no evidence of a
 * copy: the host has reassigned member ids after set-level operations (#1473, #1516).
 */
export const ownedView = (host: HostSetView): HostSetView => {
  const ids = new Set(host.members.map((m) => m.id).filter(Boolean));
  const copied = (m: HostMember): boolean => !!m.baseline?.id && !!m.id && m.baseline.id !== m.id && ids.has(m.baseline.id);
  return { ...host, members: host.members.map((m) => (m.stamp && (!STAMP_SHAPE.test(m.stamp) || copied(m)) ? { ...m, stamp: '' } : m)) };
};

/**
 * The dry run of one set, pure: the plan for `defId` against the set as `host` holds it.
 * `ports` resolve the host's variable and style ids to names, from the host's own catalogues.
 */
export const dryRunSet = (defId: string, plans: AnatomyPlan[], read: HostSetView, ports: ReadPorts, ledger: readonly ComponentRename[] = COMPONENT_RENAMES): SetPreview => {
  // Copies and malformed stamps read as not built by Prism3 (#2300). The hash below still reads the file as it is.
  const host = ownedView(read);
  const blockers: string[] = [];
  const planned = new Map<string, AnatomyPlan>();
  for (const p of plans) {
    const k = coordKey(planComponentName(p));
    if (k === null) { blockers.push(`the plan names a member that is not a coordinate: ${planComponentName(p)}`); continue; }
    planned.set(k, p);
  }
  const planAxes = [...new Set([...planned.keys()].flatMap((k) => coordPairs(k).map(([a]) => a)))].sort();
  // The set's default variant is its first member (Figma's rule), so an axis the plan adds lands on the
  // value the FIRST plan carries.
  const firstPlan = plans[0] ? coordKey(planComponentName(plans[0])) : null;
  const planDefault = new Map(firstPlan ? coordPairs(firstPlan) : []);

  // ---- the existing members' coordinates --------------------------------------------------------------
  const byKey = new Map<string, HostMember[]>();
  for (const m of host.members) {
    const k = coordKey(m.name)!;
    byKey.set(k, [...(byKey.get(k) ?? []), m]);
  }
  for (const [k, ms] of byKey)
    if (ms.length > 1) blockers.push(`${ms.length} members share the coordinate ${k} (${ms.map((m) => m.id).join(', ')}) — the set is refused rather than one picked`);
  const axisLists = new Set(host.members.map((m) => coordPairs(coordKey(m.name)!).map(([a]) => a).sort().join(',')));
  if (axisLists.size > 1) blockers.push(`the members disagree on the axis list (${[...axisLists].map((l) => `[${l}]`).join(' vs ')}), so Figma cannot read the set's properties (#1780)`);
  const hostAxes = [...new Set(host.members.flatMap((m) => coordPairs(coordKey(m.name)!).map(([a]) => a)))].sort();
  const firstHost = host.members[0] ? coordKey(host.members[0].name)! : null;
  const hostDefault = new Map(firstHost ? coordPairs(firstHost) : []);

  // ---- where each lands -----------------------------------------------------------------------------------
  type Landing = { m: HostMember; from: string; target: string; exact: boolean };
  const landings: Landing[] = [];
  const axisRenames = ledger.filter((r) => r.def === defId && r.kind === 'axis' && hostAxes.includes((r as { from: string }).from)).map((r) => ({ from: (r as { from: string }).from, to: (r as { to: string }).to }));
  for (const [k, ms] of byKey) {
    let renamed: string;
    try { renamed = renameCoordinate(defId, k, ledger).key; }
    catch (err) { blockers.push(String((err as Error).message)); renamed = k; }
    let pairs = coordPairs(renamed);
    const removed = pairs.filter(([a]) => !planAxes.includes(a));
    pairs = pairs.filter(([a]) => planAxes.includes(a));
    for (const a of planAxes) if (!pairs.some(([x]) => x === a) && planDefault.has(a)) pairs.push([a, planDefault.get(a)!]);
    // A removed axis keeps the member on the set's default value of it; the rest collapse (§4).
    const exact = removed.every(([a, v]) => hostDefault.get(a) === v);
    landings.push({ m: ms[0], from: k, target: keyOf(pairs), exact });
  }
  const byTarget = new Map<string, Landing[]>();
  for (const l of landings) byTarget.set(l.target, [...(byTarget.get(l.target) ?? []), l]);

  const matched: Landing[] = [];
  const drops: string[] = [];
  const collapse: string[] = [];
  const unstamped: string[] = [];
  const adoptable: string[] = [];
  const held: SetPreview['held'] = [];
  for (const [target, ls] of byTarget) {
    const ours = ls.filter((l) => l.m.stamp);
    for (const l of ls) if (!l.m.stamp) unstamped.push(l.m.name);
    if (!planned.has(target)) { for (const l of ours) drops.push(l.m.name); continue; }
    // Prism3's own member is the match where there is one; an unstamped member only holds a coordinate
    // nothing stamped lands on, so the plan does not add a second member there.
    const keep = ours.find((l) => l.exact) ?? ours[0] ?? ls.find((l) => l.exact) ?? ls[0];
    matched.push(keep);
    if (!keep.m.stamp) adoptable.push(keep.m.name);
    for (const l of ls) if (!l.m.stamp && l !== keep) held.push({ member: l.m.name, byPrism3: !!keep.m.stamp });
    for (const l of ours) if (l !== keep) collapse.push(l.m.name);
  }
  const adds = [...planned.keys()].filter((k) => !byTarget.has(k)).map((k) => planComponentName(planned.get(k)!));
  const renames = matched.filter((l) => l.m.stamp && l.target !== l.from).map((l) => ({ from: l.m.name, to: planComponentName(planned.get(l.target)!) }));

  // An undeclared rename shows as a drop beside an add that differs in one value: a suggestion only.
  const possibleRenames: { from: string; to: string }[] = [];
  for (const d of drops) {
    const dp = new Map(coordPairs(coordKey(d)!));
    for (const a of adds) {
      const ap = coordPairs(coordKey(a)!);
      if (ap.length !== dp.size || ap.some(([x]) => !dp.has(x))) continue;
      if (ap.filter(([x, v]) => dp.get(x) !== v).length === 1) possibleRenames.push({ from: d, to: a });
    }
  }

  // ---- each matched member ------------------------------------------------------------------------------
  const counts = { members: host.members.length, current: 0, update: 0, add: adds.length, drop: drops.length + collapse.length, rename: renames.length, handEdited: 0, noBaseline: 0, unstamped: unstamped.length, revisionUnknown: 0, reapplied: 0 };
  const changes = new Map<string, Change>();
  const replacements: SetPreview['replacements'] = [];
  const handEdits: SetPreview['handEdits'] = [];
  const rev = String(EXECUTOR_REVISION);
  for (const l of matched) {
    const plan = planned.get(l.target)!;
    const { m } = l;
    if (!m.stamp) continue;
    const now = baselineOf(m.snap);
    const edit = m.baseline ? baselineDiff(m.baseline, now) : null;
    const edited = !!edit && (edit.changed.length + edit.added.length + edit.removed.length > 0);
    const planMoved = planHalf(m.stamp) !== planHalf(memberStamp(plan));
    const revField = m.stamp.split('|').length >= 3 ? revHalf(m.stamp) : null;
    const state: MemberState = !m.baseline ? 'noBaseline'
      : edited ? 'handEdited'
      : planMoved || (revField !== null && revField !== rev) ? 'update'
      : revField === null ? 'revisionUnknown'
      : 'current';
    counts[state]++;
    if (state === 'current' || state === 'revisionUnknown') continue;

    // The field changes, from the host's snapshot. `member` divergences are the set-level match's own
    // business (adds and drops above), not this member's.
    const rootName = plan.root.name;
    const rel = (p: string): string => (p === rootName ? '.' : p.startsWith(`${rootName}/`) ? p.slice(rootName.length + 1) : p);
    const touched = new Set<string>();
    const divs = diffAnatomy([plan], [m.snap as unknown as HostNode], () => m.name, ports).filter((d) => d.field !== 'member');
    for (const d of divs) {
      const part = rel(d.path);
      if (d.field === 'type') {
        replacements.push({ member: m.name, path: part, reason: part === '.'
          ? `the member itself would need replacing (${d.actual} → ${d.expected}); the update refuses this member`
          : `${d.actual} → ${d.expected}` });
        touched.add(part);
        continue;
      }
      // A planned child the host lacks changes its PARENT's child list.
      touched.add(d.field === 'children' ? (part.includes('/') ? part.slice(0, part.lastIndexOf('/')) : '.') : part);
      const k = `${part}\u0000${d.field}\u0000${d.actual}\u0000${d.expected}`;
      const c = changes.get(k) ?? { part, field: d.field, from: d.actual, to: d.expected, members: 0, sample: [] };
      c.members++;
      if (c.sample.length < 3) c.sample.push(m.name);
      changes.set(k, c);
    }
    const extras: string[] = [];
    extraChildren(plan.root, m.snap, '.', extras);
    for (const part of extras) {
      const parent = part.includes('/') ? part.slice(0, part.lastIndexOf('/')) : '.';
      touched.add(parent);
      const k = `${part}\u0000children\u0000present\u0000removed`;
      const c = changes.get(k) ?? { part, field: 'children', from: 'present', to: 'removed — not in the plan', members: 0, sample: [] };
      c.members++;
      if (c.sample.length < 3) c.sample.push(m.name);
      changes.set(k, c);
    }
    if (state === 'update' && divs.length === 0 && extras.length === 0) {
      counts.reapplied++;
      const k = '.\u0000stamp\u0000\u0000';
      const c = changes.get(k) ?? { part: '.', field: 'stamp', from: planMoved ? 'an earlier plan' : 'an earlier executor revision', to: 're-applied — no field-level difference visible', members: 0, sample: [] };
      c.members++;
      if (c.sample.length < 3) c.sample.push(m.name);
      changes.set(k, c);
    }
    if (edit) {
      // A child added or removed by hand makes the member's paths unreliable, so an update skips the
      // whole member rather than going node by node (§4).
      const structural = edit.added.length + edit.removed.length > 0;
      // A CONFLICT is a hand-edited node the update would also write. Where neither the plan nor the
      // executor moved, the update writes nothing, so nothing conflicts: the node differs from the plan
      // only because of the edit itself. Where one moved, the baseline holds hashes, not values, so a
      // difference on an edited node cannot be split into the edit's part and the plan's part, and it is
      // reported as a conflict. That can over-report; it never hides one.
      const moved = planMoved || (revField !== null && revField !== rev);
      for (const p of [...edit.changed, ...edit.added, ...edit.removed])
        handEdits.push({ member: m.name, path: p, conflict: moved && touched.has(p.replace(/#\d+$/, '')), structural });
    }
  }

  // ---- the set's properties ------------------------------------------------------------------------------
  const properties: SetPreview['properties'] = { add: [], edit: [], rename: [], retype: [], remove: [] };
  if (host.definitions === null) {
    if (!blockers.some((b) => b.includes('#1780'))) blockers.push("the set's property definitions could not be read");
  } else {
    let wanted: ReturnType<typeof planSetProperties> = [];
    try { wanted = planSetProperties(plans); } catch (err) { blockers.push(`the plan's properties contradict each other: ${(err as Error).message}`); }
    const have = new Map<string, { type: string; defaultValue?: unknown }>();
    for (const [k, d] of Object.entries(host.definitions)) {
      if (d.type === 'VARIANT') continue;
      have.set(k.replace(/#[^#]*$/, ''), { type: String(d.type ?? ''), defaultValue: d.defaultValue });
    }
    for (const w of wanted) {
      const h = have.get(w.name);
      if (!h) { properties.add.push({ name: w.name, type: w.type }); continue; }
      if (h.type !== w.type) { properties.retype.push({ name: w.name, type: w.type, from: h.type, to: w.type }); continue; }
      // An INSTANCE_SWAP default is a node id the host chose; it has no plan-side value to compare.
      if (w.type === 'INSTANCE_SWAP') continue;
      if (h.defaultValue !== w.default) properties.edit.push({ name: w.name, type: w.type, from: String(h.defaultValue), to: String(w.default) });
    }
    for (const [name, h] of have) if (!wanted.some((w) => w.name === name)) properties.remove.push({ name, type: h.type });
  }

  const needsChoice: Choice[] = [];
  if (drops.length) needsChoice.push('drops');
  if (handEdits.length) needsChoice.push('handEdits');
  if (counts.noBaseline) needsChoice.push('noBaseline');
  if (collapse.length) needsChoice.push('axisCollapse');

  const truncated: Record<string, number> = {};
  const cap = <T>(name: string, list: T[]): T[] => {
    if (list.length <= LIST_CAP) return list;
    truncated[name] = list.length - LIST_CAP;
    return list.slice(0, LIST_CAP);
  };
  const body = {
    set: host.name,
    page: host.page,
    setKey: host.key,
    counts,
    blockers,
    axes: { from: hostAxes, to: planAxes, renames: axisRenames },
    properties,
    changes: cap('changes', [...changes.values()]),
    replacements: cap('replacements', replacements),
    adds: cap('adds', adds),
    drops: cap('drops', [...drops, ...collapse]),
    unstamped: cap('unstamped', unstamped),
    adoptable,
    held,
    renames: cap('renames', renames),
    possibleRenames: cap('possibleRenames', possibleRenames),
    handEdits: cap('handEdits', handEdits),
    needsChoice,
    ...(Object.keys(truncated).length ? { truncated } : {}),
  };
  // THE PREVIEW HASH covers what the preview says AND the file state it was read from — each member's id,
  // stamp and current node hashes — so a confirm (PR 2) can refuse an apply over a file that moved after
  // the preview even where the preview's own text would not have changed.
  const fingerprint = read.members.map((m) => [m.id, m.name, m.stamp, baselineOf(m.snap).nodes]);
  const previewHash = fnv(JSON.stringify([body, fingerprint]));
  return { ...body, previewHash };
};

// ---- reading the host --------------------------------------------------------------------------------------

type LiveSet = { name?: unknown; id?: unknown; key?: unknown; parent?: unknown; children?: readonly unknown[]; componentPropertyDefinitions?: unknown };

/** The page a node sits on, by walking up. */
const pageOf = (n: unknown): string => {
  let p: unknown = n;
  for (let i = 0; i < 64 && p; i++) {
    const q = p as { type?: unknown; name?: unknown; parent?: unknown };
    if (q.type === 'PAGE') return String(q.name ?? '');
    try { p = q.parent; } catch { return ''; }
  }
  return '';
};

/** A set as plain data: every coordinate child snapshotted with its stamp and stored baseline. Reads
 *  only; each host read is guarded, so a getter that throws is a fact in the view rather than a crash. */
export const readSetView = async (set: LiveSet, breathe?: () => Promise<void>): Promise<HostSetView> => {
  const members: HostMember[] = [];
  const others: string[] = [];
  let n = 0;
  for (const raw of set.children ?? []) {
    // A 432-member set is about 13,000 nodes to read; handing the thread back every few members keeps
    // Figma responsive while it runs (#684's reason).
    if (breathe && ++n % 24 === 0) await breathe();
    const c = raw as { name?: unknown; id?: unknown; getSharedPluginData?: (ns: string, k: string) => string };
    const name = String(c.name ?? '');
    if (coordKey(name) === null) { others.push(name); continue; }
    let stamp = '';
    try { stamp = c.getSharedPluginData?.(NS, STAMP_KEY) ?? ''; } catch { stamp = ''; }
    members.push({ name, id: String(c.id ?? ''), stamp, baseline: readBaseline(c), snap: await snapshotMember(c) });
  }
  let definitions: HostSetView['definitions'] = null;
  try { definitions = (set.componentPropertyDefinitions ?? {}) as HostSetView['definitions']; } catch { definitions = null; }
  let key = '';
  try { key = typeof set.key === 'string' ? set.key : ''; } catch { key = ''; }
  return { name: String(set.name ?? ''), id: String(set.id ?? ''), key, page: pageOf(set), members, others, definitions };
};

/** The reason a member is left out when its node moved between the read and the write (#2301). DRAFT. */
export const MOVED = 'it moved or is gone since it was read';

/** The live child a member was read from, by its node id, or `null` when that node is gone or renamed since. */
const liveNode = (set: LiveSet, m: HostMember): { name?: unknown; setSharedPluginData?: (ns: string, k: string, v: string) => void } | null => {
  if (!m.id) return null;
  const node = (set.children ?? []).find((c) => String((c as { id?: unknown }).id ?? '') === m.id) as { name?: unknown } | undefined;
  return node && String(node.name ?? '') === m.name ? node : null;
};

/** What `capture-baseline` decides for one member, pure. It records a baseline only where the member is
 *  stamped by the CURRENT plan, has none yet, and reads back with no field difference against that plan:
 *  then the member as it stands is what Prism3 built, and recording it launders nothing. */
/** One field where a member differs from its plan, NAMED (#2295): the part, the property, the plan's value and the
 *  file's. A count alone ("differs in 1 place") leaves nobody able to tell a hand edit from an engine change. */
export type Difference = { part: string; field: string; plan: string; file: string };

/** Every field a member's snapshot differs from its plan in, by part (`.` for the member itself). */
export const differencesOf = (plan: AnatomyPlan, m: HostMember, ports: ReadPorts): Difference[] => {
  const rootName = plan.root.name;
  const rel = (p: string): string => (p === rootName ? '.' : p.startsWith(`${rootName}/`) ? p.slice(rootName.length + 1) : p);
  const out: Difference[] = diffAnatomy([plan], [m.snap as unknown as HostNode], () => m.name, ports)
    .filter((d) => d.field !== 'member')
    .map((d) => ({ part: rel(d.path), field: d.field, plan: d.expected, file: d.actual }));
  const extras: string[] = [];
  extraChildren(plan.root, m.snap, '.', extras);
  for (const part of extras) out.push({ part, field: 'children', plan: 'absent', file: 'present' });
  return out;
};

export const captureVerdict = (plan: AnatomyPlan | undefined, m: HostMember, ports: ReadPorts): { record: boolean; reason: string; differences?: Difference[] } => {
  if (!plan) return { record: false, reason: 'not in the plan' };
  if (!m.stamp) return { record: false, reason: 'unstamped' };
  if (m.baseline) return { record: false, reason: 'already has a baseline' };
  if (planHalf(m.stamp) !== planHalf(memberStamp(plan))) return { record: false, reason: 'built from an earlier plan' };
  const differences = differencesOf(plan, m, ports);
  if (differences.length) return { record: false, reason: `differs from the plan in ${differences.length} place(s)`, differences };
  return { record: true, reason: 'recorded' };
};

/** `capture-baseline` over one set: a baseline written on every member `captureVerdict` clears, each
 *  other member reported with its reason. Matching is by coordinate against the plan as it stands; a
 *  member the ledger would rename is not current, so it is not captured. The stamp is never rewritten. */
export const captureSet = async (set: LiveSet, plans: AnatomyPlan[], ports: ReadPorts, breathe?: () => Promise<void>): Promise<{ recorded: number; skipped: { member: string; reason: string; differences?: Difference[] }[] }> => {
  const planned = new Map(plans.map((p) => [coordKey(planComponentName(p)), p] as const));
  // A copy or a malformed stamp is not Prism3's (#2300), so its member is not captured: Adopt is its path.
  const view = ownedView(await readSetView(set, breathe));
  let recorded = 0;
  const skipped: { member: string; reason: string; differences?: Difference[] }[] = [];
  for (const m of view.members) {
    const v = captureVerdict(planned.get(coordKey(m.name)), m, ports);
    if (!v.record) { skipped.push({ member: m.name, reason: v.reason, ...(v.differences ? { differences: v.differences } : {}) }); continue; }
    // BY THE NODE ID IT WAS READ FROM (#2301), so a set reordered while it was read cannot put the record on another
    // member. A node that is gone, or no longer carries the name it was read under, is left out.
    const node = liveNode(set, m);
    if (!node) { skipped.push({ member: m.name, reason: MOVED }); continue; }
    await writeBaseline(node);
    recorded++;
  }
  return { recorded, skipped };
};

/** The plan field an adopted member's stamp carries. It is no plan's stamp, so an adopted member reads `update`,
 *  never `current`: the member is the designer's as they made it, recorded, and the next update brings it to the
 *  plan in place (#2283). */
export const ADOPTED = 'adopted';

/**
 * ADOPT (§10 Q4, #2283): the one-time claim of a member Prism3 did not build. An unstamped member on a planned
 * coordinate gets its as-built record as it stands, then a stamp, written last, whose plan field is `ADOPTED`.
 * From then on it is an ordinary out-of-date member: a later hand edit is told from the update's own writes,
 * and the update keeps its node, so instances of it keep their link.
 *
 * Only a member the plan has a coordinate for, and no stamped member holds, is adopted. Any other is left as it
 * is with its reason: one off the plan would only be marked deprecated, and one sharing a stamped member's
 * coordinate is a duplicate, which blocks the set.
 */
export const adoptSet = async (
  defId: string, set: LiveSet, plans: AnatomyPlan[], ports: ReadPorts, breathe?: () => Promise<void>, ledger: readonly ComponentRename[] = COMPONENT_RENAMES,
): Promise<{ adopted: number; skipped: { member: string; reason: string }[]; refused?: string }> => {
  const view = ownedView(await readSetView(set, breathe));
  // THE DRY RUN DECIDES (#2299 review): which members Adopt may claim is the dry run's own matching, renames and axis
  // changes applied, and a set the dry run refuses (two members on one coordinate, two axis lists) is refused here
  // too, whole, with nothing written. Claiming members of a set the update cannot touch would only stamp them.
  const p = dryRunSet(defId, plans, view, ports, ledger);
  if (p.blockers.length) return { adopted: 0, skipped: [], refused: p.blockers.join('; ') };
  const adoptable = new Set(p.adoptable);
  const held = new Map(p.held.map((h) => [h.member, h.byPrism3] as const));
  const rev = String(EXECUTOR_REVISION);
  let adopted = 0;
  const skipped: { member: string; reason: string }[] = [];
  for (const m of view.members) {
    if (m.stamp) continue;
    if (!adoptable.has(m.name)) {
      skipped.push({ member: m.name, reason: held.has(m.name) ? (held.get(m.name) ? 'a Prism3 member has this coordinate' : 'another member has this coordinate') : 'not in the plan' });
      continue;
    }
    // By node id, not by position (#2301).
    const node = liveNode(set, m);
    if (!node) { skipped.push({ member: m.name, reason: MOVED }); continue; }
    await writeBaseline(node);
    node.setSharedPluginData?.(NS, STAMP_KEY, `${ENGINE_VERSION}|${ADOPTED}|${rev}`);
    adopted++;
  }
  return { adopted, skipped };
};

// ---- over a file ---------------------------------------------------------------------------------------------

/** The host the two commands read: the file's sets and its own variable and style catalogues. */
export type UpdateHost = {
  root: { findAllWithCriteria(c: { types: string[] }): readonly unknown[] };
  variables: { getLocalVariablesAsync(): Promise<readonly { id: string; name: string }[]> };
  getLocalTextStylesAsync(): Promise<readonly { id: string; name: string }[]>;
  getLocalEffectStylesAsync(): Promise<readonly { id: string; name: string }[]>;
};

/** One def to check: its id and the plans the engine would build for it today. */
export type UpdateTarget = { def: string; plans: AnatomyPlan[] };

/** The ports, from the FILE's catalogues. A resolver built from the plan would map every id to the name
 *  the comparison hopes for, and see no difference anywhere (`test-roundtrip.ts` says the same). */
export const hostPorts = async (host: UpdateHost): Promise<ReadPorts> => {
  const vars = await host.variables.getLocalVariablesAsync();
  const styles = [...await host.getLocalTextStylesAsync(), ...await host.getLocalEffectStylesAsync()];
  const v = new Map(vars.map((x) => [x.id, x.name] as const));
  const st = new Map(styles.map((x) => [x.id, x.name] as const));
  return { varName: (id) => v.get(id) ?? null, styleName: (id) => st.get(id) ?? null };
};

type Located = { found: LiveSet[]; name: string };
const locate = (host: UpdateHost, t: UpdateTarget): Located => {
  const name = t.plans[0]?.component ?? t.def;
  const found = host.root.findAllWithCriteria({ types: ['COMPONENT_SET'] })
    .filter((n) => (n as { name?: unknown }).name === name) as LiveSet[];
  return { found, name };
};

export type UpdatePreview = { sets: SetPreview[]; missing: string[]; refused: { def: string; reason: string }[] };

/** `update-components` in its dry-run mode: every target's set read and laid against its plans. Writes
 *  nothing. A def with no set in the file is `missing`; a def with two sets of its name is `refused`,
 *  because which one an update should touch is not this command's call. */
export const previewUpdate = async (host: UpdateHost, targets: readonly UpdateTarget[], breathe?: () => Promise<void>): Promise<UpdatePreview> => {
  const ports = await hostPorts(host);
  const out: UpdatePreview = { sets: [], missing: [], refused: [] };
  for (const t of targets) {
    const { found, name } = locate(host, t);
    if (found.length === 0) { out.missing.push(t.def); continue; }
    if (found.length > 1) { out.refused.push({ def: t.def, reason: `${found.length} sets are named ${name}` }); continue; }
    out.sets.push(dryRunSet(t.def, t.plans, await readSetView(found[0], breathe), ports));
  }
  return out;
};

export type CaptureResult = { sets: { def: string; set: string; recorded: number; skipped: { member: string; reason: string; differences?: Difference[] }[] }[]; missing: string[]; refused: { def: string; reason: string }[] };

/** `capture-baseline`: the one-time record for sets built before the baseline existed (§4). */
export const captureBaselines = async (host: UpdateHost, targets: readonly UpdateTarget[], breathe?: () => Promise<void>): Promise<CaptureResult> => {
  const ports = await hostPorts(host);
  const out: CaptureResult = { sets: [], missing: [], refused: [] };
  for (const t of targets) {
    const { found, name } = locate(host, t);
    if (found.length === 0) { out.missing.push(t.def); continue; }
    if (found.length > 1) { out.refused.push({ def: t.def, reason: `${found.length} sets are named ${name}` }); continue; }
    out.sets.push({ def: t.def, set: name, ...await captureSet(found[0], t.plans, ports, breathe) });
  }
  return out;
};

export type AdoptResult = { sets: { def: string; set: string; adopted: number; skipped: { member: string; reason: string }[] }[]; missing: string[]; refused: { def: string; reason: string }[] };

/** `capture-baseline` with `adopt: true`: Adopt over every target's set (#2283). */
export const adoptMembers = async (host: UpdateHost, targets: readonly UpdateTarget[], breathe?: () => Promise<void>, ledger: readonly ComponentRename[] = COMPONENT_RENAMES): Promise<AdoptResult> => {
  const ports = await hostPorts(host);
  const out: AdoptResult = { sets: [], missing: [], refused: [] };
  for (const t of targets) {
    const { found, name } = locate(host, t);
    if (found.length === 0) { out.missing.push(t.def); continue; }
    if (found.length > 1) { out.refused.push({ def: t.def, reason: `${found.length} sets are named ${name}` }); continue; }
    const r = await adoptSet(t.def, found[0], t.plans, ports, breathe, ledger);
    if (r.refused) { out.refused.push({ def: t.def, reason: r.refused }); continue; }
    out.sets.push({ def: t.def, set: name, adopted: r.adopted, skipped: r.skipped });
  }
  return out;
};

// ---- the words (DRAFT, for the owner: #2265) --------------------------------------------------------------

const n = (k: number, one: string, many = `${one}s`): string => `${k} ${k === 1 ? one : many}`;

const propChanges = (p: SetPreview): number => Object.values(p.properties).reduce((k, l) => k + l.length, 0);
/** Nothing an update would change: every member current or from an earlier plugin, nothing to add, and the
 *  set's properties as planned. A member from an earlier plugin (`revisionUnknown`) matches its plan and has no
 *  hand edit. Its stamp just predates the executor revision, so it can't say which executor wrote it. That is
 *  not a difference (owner decision Q91 B, #2282), and the verdict flags those members on a line of their own. */
const noChanges = (p: SetPreview): boolean => p.counts.current + p.counts.revisionUnknown === p.counts.members && !p.counts.add && !propChanges(p);
/** No changes, and every member current. */
const upToDate = (p: SetPreview): boolean => noChanges(p) && !p.counts.revisionUnknown;

/** How many named differences each set's lines carry, so a set that differs everywhere stays a few lines long. */
export const DIFFERENCE_LINES = 8;
const partName = (part: string): string => (part === '.' ? 'the member' : part);
/** One named difference, as a line. DRAFT. */
export const differenceLine = (where: string, d: { part: string; field: string; plan: string; file: string }, members?: number): string =>
  `${where} · ${partName(d.part)} · ${d.field}: the plan says ${d.plan}, the file has ${d.file}${members && members > 1 ? ` (${members} members)` : ''}.`;
/** A set's named differences, capped, with what was left out counted. */
const namedLines = (where: string, list: { part: string; field: string; plan: string; file: string; members?: number }[]): string[] => [
  ...list.slice(0, DIFFERENCE_LINES).map((d) => differenceLine(where, d, d.members)),
  ...(list.length > DIFFERENCE_LINES ? [`${where}: ${list.length - DIFFERENCE_LINES} more differences not listed.`] : []),
];

/** One set's dry run, as one line. */
export const previewLine = (p: SetPreview): string => {
  if (p.blockers.length) return `${p.set}: can't be checked. ${p.blockers.join('; ')}.`;
  const c = p.counts;
  const parts = [
    c.update ? `${c.update} to update` : '',
    c.add ? `${c.add} to add` : '',
    c.drop ? `${c.drop} to mark deprecated` : '',
    c.rename ? `${c.rename} to rename` : '',
    c.handEdited ? `${n(c.handEdited, 'member')} edited by hand` : '',
    c.noBaseline ? `${c.noBaseline} with no as-built record` : '',
    c.unstamped ? `${c.unstamped} not built by Prism3` : '',
  ].filter(Boolean);
  if (propChanges(p)) parts.push(n(propChanges(p), 'property change'));
  if (upToDate(p)) return `${p.set}: up to date (${n(c.members, 'member')}).`;
  if (noChanges(p)) return `${p.set}: no changes (${n(c.members, 'member')}).`;
  return `${p.set}: ${n(c.members, 'member')}. ${parts.join(', ')}.`;
};

/** The verdict for a dry run. `ok` is false only where a set could not be checked. `lines` is the Activity drawer's
 *  copy (#2177): one per set, then the closing lines, the same list `summary` is joined from. */
export const previewVerdict = (r: UpdatePreview): { ok: boolean; headline: string; summary: string; lines: string[] } => {
  const changing = r.sets.filter((p) => !p.blockers.length && !noChanges(p)).length;
  const earlier = r.sets.filter((p) => !p.blockers.length).reduce((k, p) => k + p.counts.revisionUnknown, 0);
  const blocked = r.sets.filter((p) => p.blockers.length).length + r.refused.length;
  const headline = r.sets.length + r.refused.length === 0 ? 'No sets to check'
    : blocked ? `✗ ${n(blocked, 'set')} can't be checked`
      : changing ? `Would change ${changing} of ${r.sets.length}` : earlier ? '✓ No changes found' : '✓ All sets up to date';
  const lines = [
    // Each set's line, then each field it differs from its plan in, NAMED (#2295): where, what, the plan's value and
    // the file's. `changes` is grouped by part, field and both values, so one engine change over 432 members is one
    // line. A bare re-apply (no field moved) is not a difference and is left to the set's own line.
    ...r.sets.flatMap((p) => [previewLine(p), ...namedLines(p.set, p.changes.filter((c) => c.field !== 'stamp').map((c) => ({ part: c.part, field: c.field, plan: c.to, file: c.from, members: c.members })))]),
    ...r.refused.map((x) => `${x.def}: can't be checked. ${x.reason}.`),
    r.missing.length ? `Not in this file: ${r.missing.join(', ')}.` : '',
    earlier ? `${earlier} built by an earlier plugin. Update ${earlier === 1 ? 'it to bring it' : 'them to bring them'} current.` : '',
    'This was a check only. Nothing in the file changed.',
  ].filter(Boolean);
  return { ok: blocked === 0, headline, summary: lines.join('\n'), lines };
};

/** The verdict for a capture. `lines`, as for the dry run: one per set, the list `summary` is joined from. */
export const captureVerdictText = (r: CaptureResult): { ok: boolean; headline: string; summary: string; lines: string[] } => {
  const recorded = r.sets.reduce((k, x) => k + x.recorded, 0);
  const lines = [
    ...r.sets.flatMap((x) => {
      const why = [...new Set(x.skipped.map((s) => s.reason))];
      const head = x.skipped.length
        ? `${x.set}: ${n(x.recorded, 'member')} recorded, ${x.skipped.length} left as they are (${why.slice(0, 3).join('; ')}${why.length > 3 ? '; …' : ''}).`
        : `${x.set}: ${n(x.recorded, 'member')} recorded.`;
      // Each member left out because it differs from its plan, with what differs, NAMED (#2295).
      return [head, ...namedLines(x.set, x.skipped.flatMap((s) => (s.differences ?? []).map((d) => ({ ...d, part: d.part === '.' ? s.member : `${s.member} / ${d.part}` }))))];
    }),
    ...r.refused.map((x) => `${x.def}: not recorded. ${x.reason}.`),
    r.missing.length ? `Not in this file: ${r.missing.join(', ')}.` : '',
  ].filter(Boolean);
  return { ok: r.refused.length === 0, headline: r.sets.length ? `✓ ${recorded} recorded` : 'No sets to record', summary: lines.join('\n'), lines };
};

/** The verdict for Adopt (#2283). `lines`, as for the others: one per set, the list `summary` is joined from. */
export const adoptVerdictText = (r: AdoptResult): { ok: boolean; headline: string; summary: string; lines: string[] } => {
  const adopted = r.sets.reduce((k, x) => k + x.adopted, 0);
  const lines = [
    ...r.sets.map((x) => {
      const why = [...new Set(x.skipped.map((s) => s.reason))];
      return x.skipped.length
        ? `${x.set}: ${n(x.adopted, 'member')} adopted, ${x.skipped.length} left as they are (${why.join('; ')}).`
        : `${x.set}: ${n(x.adopted, 'member')} adopted.`;
    }),
    ...r.refused.map((x) => `${x.def}: not adopted. ${x.reason}.`),
    r.missing.length ? `Not in this file: ${r.missing.join(', ')}.` : '',
    adopted ? `Run an update to bring ${adopted === 1 ? 'it' : 'them'} in line with the plan.` : '',
  ].filter(Boolean);
  return { ok: r.refused.length === 0, headline: r.sets.length ? `✓ ${adopted} adopted` : 'No sets to adopt from', summary: lines.join('\n'), lines };
};
