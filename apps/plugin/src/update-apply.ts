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
 *                      and deleting them is never the default. The dry run lists it as a blocker (`setRefusal`, #2592).
 *
 * ── THE ORDER (§7) ────────────────────────────────────────────────────────────────────────────────────────
 *
 * Preflight first, writing nothing: the hash, then the dry run's blockers, which include every font the plans' text
 * styles and the members' text nodes need, and every variable, style and nested or swapped component the plans name
 * (#2601). A set with any is refused by name, in the dry run's words. Then a named version (Q7), once, before the first write; if the host refuses it, nothing is
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
 * the nodes kept as hand edits, and its prototype reactions against the ones the plan gives it (#2466), unless they
 * were kept as a hand edit. Either failing makes the verdict a failure.
 */
import { diffAnatomy, type HostNode } from '@prism3/engine/anatomy-readback';
import { planComponentName, planSetProperties, type AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { partRenames, type ComponentRename } from '@prism3/engine/component-renames';
import { applyComponentPlan, emitCoordValue, memberStamp, STAMP_KEY, type ComponentApplyResult, type ComponentsApi, type CompPageTarget } from './write-components';
import { planTargets } from './build-deps';
import { NS } from './persist-figma';
import { baselineDiff, baselineOf, readBaseline, snapshotMember } from './member-baseline';
import { drawnFaults, faultLine, varsById } from './drawn';
import { reorderPages, stripNestPrefix } from './file-setup';
import { readTag, furnitureDueCount, type FurnitureDue } from './canvas-furniture';
import { docPanelReach, readPanelTag, type PanelApi, type PNode } from './doc-panel';
import { REACTIONS, breakingClause, breakingSection, furnitureParts, withSetSlots, hostPorts, locateSets, pageSetMoves, pageSnugSets, previewLine, previewUpdate, readSetView, readSingleView, setUpToDate, slotMigrationFor, type Breaking, type SetPreview, type UpdateHost, type UpdatePreview, type UpdateTarget } from './update-plan';
import { fillSlots, type FillOutcome, type MigNode } from './slot-migration';
import { slotMigrationOf } from '@prism3/engine/component-renames';
import { REACTIONS_PATH, plannedRead, reactionMap, reactionVerdict, reactionsText } from './reactions';
import { ABOUT_NAME, ABOUT_ONLY_DONE, aboutIsWork, aboutLine, drawAbout, type AboutApi, type AboutOutcome, type AboutRoot } from './about-frame';
import { publishDescription } from './library-about';

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
  // A set's move (#2542), the page list (#2568) and the set's blockers are in the hash, so a set or a page someone moves,
  // or a font or variable that comes or goes (#2601), between the check and the confirm refuses the apply.
  fnv(JSON.stringify([r.sets.map((s) => [s.set, s.previewHash, ...(s.setMove ? [s.setMove] : []), ...(s.blockers.length ? [s.blockers] : []), ...(s.furniture ? [s.furniture] : [])]), r.missing, r.refused, ...(r.pages ? [r.pages] : []),
    // #2858: the About frame, only while it is work, so a file whose frame is current hashes as it did before it.
    ...(aboutIsWork(r.about) ? [r.about] : [])]));

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
  /** For a set the apply entered with nothing to write: the dry run's own set line, and whether the dry run called the
   *  set up to date. The verdict says what the dry run said (#2495, owner Q205 A). */
  asPreviewed?: { line: string; upToDate: boolean };
  /** Set when the run stopped in this set. */
  stopped?: string;
  /** Members the dry run read as built by an earlier plugin and otherwise unchanged (`revisionUnknown`): given the
   *  current stamp and nothing else (#2379). */
  restamped?: string[];
  /** #2188 Q173 — members the build's pass moved to their place in the grid, measured off the host. Absent when none. */
  moved?: number;
  /** #2542 (owner decision Q245.2 A) — the whole set moved on its page, to where a fresh build would place it. */
  setMoved?: true;
  /** #2803 (owner decision Q379 A) — the canvas furniture the dry run listed for this set, drawn once the apply is
   *  done (`settle`, through `opts.furnish`). A set whose only work this is touches no member. */
  furniture?: FurnitureDue;
  /** #2649 — the placed instances whose rows were carried into the set's new slot. A miss is also in `content`. */
  carried?: FillOutcome;
  /** #2831 — what this update broke for library consumers, as its dry run listed it (`breakingOf`). Absent for a set
   *  that is not published, or where nothing broke. */
  breaking?: Breaking[];
};

export type ApplyResult = {
  /** `null` when the confirm was refused before anything was read for writing. */
  outcomes: SetOutcome[];
  refusedAll?: string;
  version?: string;
  missing: string[];
  refused: { def: string; reason: string }[];
  /** #2568 — the component pages the apply put in alphabetical order, by full page name. Absent when none. */
  reordered?: string[];
  /** #2858 — the Cover page's "About this library" frame, drawn after the sets. Absent when the run wrote nothing. */
  about?: AboutOutcome;
  /** #2858 — the library publish description, offered with a Copy button: no Plugin API call sets it. Absent when the
   *  run wrote nothing. */
  publish?: string;
  /** #2858, owner decision Q498 B — the About frame was the run's only work, so no named version was saved for it. */
  aboutOnly?: true;
};

type LiveNode = { id?: unknown; key?: unknown; name?: unknown; type?: unknown; children?: readonly unknown[]; parent?: unknown };
type LiveSet = LiveNode & {
  componentPropertyDefinitions?: Record<string, { type?: string; defaultValue?: unknown }>;
  editComponentProperty?(key: string, edit: { name?: string; defaultValue?: string | boolean }): string;
  deleteComponentProperty?(key: string): void;
  getSharedPluginData?(ns: string, k: string): string;
  setSharedPluginData?(ns: string, k: string, v: string): void;
};

const idOf = (n: unknown): string => { try { return String((n as LiveNode).id ?? ''); } catch { return ''; } };
const keyOf = (n: unknown): string => { try { const k = (n as LiveNode).key; return typeof k === 'string' ? k : ''; } catch { return ''; } };
const kidsOf = (n: unknown): LiveNode[] => { try { return [...((n as LiveNode).children ?? [])] as LiveNode[]; } catch { return []; } };

/**
 * A MEMBER'S TWO NAMES (#2296): its coordinate, which the dry run speaks (`name=check`), and the node's own, which the
 * file holds. The same for a set member; for a single component the node is `<component>/<value>`. `coordOf` reads a
 * node's name back to the coordinate, and `hostOf` the other way, so the renames, the deprecations and the verify
 * below find the node a coordinate names on either kind of def.
 */
const namesFor = (t: UpdateTarget): { coordOf: (host: string) => string; hostOf: (coord: string) => string } => {
  if (!t.single) return { coordOf: (h) => h, hostOf: (c) => c };
  const prefix = `${t.plans[0]?.component ?? t.def}/`;
  const first = t.plans[0] ? planComponentName(t.plans[0]) : 'name=';
  const axis = first.slice(0, first.indexOf('='));
  return {
    coordOf: (h) => (h.startsWith(prefix) ? `${axis}=${h.slice(prefix.length)}` : h),
    hostOf: (c) => `${prefix}${emitCoordValue(c)}`,
  };
};
/** The file's live "set" for a target: the set node, or for a single-component def (#2296) a stand-in whose
 *  children are its components, found anywhere in the file. */
const liveFor = async (host: ApplyHost, t: UpdateTarget, name: string, ledger?: readonly ComponentRename[]): Promise<LiveSet | undefined> => {
  if (t.single) return (await readSingleView(host, t)).set as LiveSet;
  const now = (host.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as LiveSet[]).find((s) => String(s.name ?? '') === name);
  // #2759 — before its rename, the set is under an earlier def id (the dry run's `setRename`).
  return now ?? (locateSets(host, t, ledger).found[0] as unknown as LiveSet | undefined);
};
/** The page a target's components sit on, for the build's placement: the set's, or the first single component's. */
const pageFor = (t: UpdateTarget, live: LiveSet): CompPageTarget | undefined => pageOf(t.single ? kidsOf(live)[0] : live);

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
 * PREFLIGHT, one set, writing nothing: the dry run's blockers, read again here. `null` when the set can be updated;
 * otherwise the reason it cannot. Every refusal is one the dry run lists (#2592, #2601): a collapse, an axis change
 * over members not built by Prism3 and a rename onto another member's name (`setRefusal`), and every variable, style,
 * nested or swapped component and font the plans need that the file lacks or will not load (`fileBlockers`).
 */
const preflight = (p: SetPreview): string | null => (p.blockers.length ? p.blockers.join('; ') : null);

/** Which members this update configures, which it leaves, and why, from the dry run alone. */
const plan = (p: SetPreview, choice: HandEditChoice, noRecord: NoRecordChoice): { members: Map<string, { keep: Set<string>; accept?: boolean; edited?: Set<string> }>; skipped: { member: string; reason: string }[]; kept: { member: string; path: string }[]; unrecorded: string[]; restamp: string[]; earlierRecord: string[] } => {
  const byMember = new Map<string, SetPreview['handEdits']>();
  for (const h of p.handEdits) byMember.set(h.member, [...(byMember.get(h.member) ?? []), h]);
  const members = new Map<string, { keep: Set<string>; accept?: boolean; edited?: Set<string> }>();
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
    if (edits.some((e) => e.structural)) {
      // DRAFT wording for the owner (#2413, the issue's option A): a skipped member that also draws wrong says so, in
      // the verify lines' `faultLine` form, so the reader knows it still draws other than its plan.
      const d = s.damaged ?? [];
      skipped.push({ member: s.member, reason: d.length
        ? `a layer was added or removed by hand, and it draws other than its plan (${d.slice(0, 3).join('; ')}${d.length > 3 ? '; …' : ''})`
        : 'a layer was added or removed by hand' });
      continue;
    }
    if (rootReplaced.has(s.member)) { skipped.push({ member: s.member, reason: 'the member itself would need replacing' }); continue; }
    // `overwrite` writes over every edited node; `keep` and `accept` leave them, and differ only in the record.
    const edited = new Set(edits.map((e) => e.path.replace(/#\d+$/, '')));
    const keep = choice === 'overwrite' ? new Set<string>() : edited;
    for (const e of edits) kept.push({ member: at, path: e.path });
    // `edited` whatever the choice (#2595): a node a designer edited is never moved into a new frame.
    members.set(at, { keep, edited, ...(choice === 'accept' ? { accept: true } : {}) });
  }
  // Every member the dry run read as not built by Prism3 is named, the ones off the plan too (a designer's own icon
  // under the def's prefix, #2296): the update never writes them, and the verdict says so rather than leaving them out.
  for (const u of p.unstamped) if (!skipped.some((x) => x.member === u)) skipped.push({ member: u, reason: 'not built by Prism3' });
  return { members, skipped, kept, unrecorded, restamp, earlierRecord };
};

/** The members `plan` left for the current stamp alone (#2379). Each is checked against its record first, and again
 *  after: a member that differs from it is not stamped, and anything written to one while it was stamped is a
 *  content failure, by name. */
const restampMembers = async (live: LiveSet, names: readonly string[], plans: ReadonlyMap<string, AnatomyPlan>, out: SetOutcome, hostOf: (coord: string) => string = (c) => c): Promise<void> => {
  out.restamped = [];
  const byName = new Map(kidsOf(live).map((c) => [String(c.name ?? ''), c as LiveNode & { setSharedPluginData?(ns: string, k: string, v: string): void }] as const));
  for (const name of names) {
    // A single component's node is named `<component>/<value>`, its coordinate `<axis>=<value>` (#2296).
    const m = byName.get(hostOf(name));
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
/** Does a build miss name `member` as a WHOLE member name (#2477 review)? A substring test is not enough: members are
 *  named `name=<glyph>`, and the shipped icon set has prefix pairs (`name=check` / `name=check-circle`, `name=eye` /
 *  `name=eye-off`), so a skipped `name=check` would swallow every miss about `name=check-circle`. A name counts where it
 *  starts the miss or follows a space, and ends it or meets a space, `.` or `/` — the ways a miss names a member
 *  (`<member>.asBuilt -> …`, `<member>/<part>.slot -> …`, `footprint -> <member> measures … but <member> measures …`).
 *  Where a longer name in `known` matches at the same place (a variant value with a dot, `size=1` / `size=1.5`), that
 *  longer name is the one named. */
export const namesMember = (miss: string, member: string, known: readonly string[]): boolean => {
  const bounded = (at: number, name: string): boolean =>
    (at === 0 || miss[at - 1] === ' ') && (at + name.length === miss.length || /[\s./]/.test(miss[at + name.length]));
  for (let at = miss.indexOf(member); at >= 0; at = miss.indexOf(member, at + 1)) {
    if (!bounded(at, member)) continue;
    if (known.some((k) => k.length > member.length && k.startsWith(member) && miss.startsWith(k, at) && bounded(at, k))) continue;
    return true;
  }
  return false;
};

const applySet = async (host: ApplyHost, api: ComponentsApi, t: UpdateTarget, p: SetPreview, live: LiveSet, opts: { description?: string; yieldTo?: () => Promise<void>; handEdits: HandEditChoice; noBaseline: NoRecordChoice; ledger?: readonly ComponentRename[] }): Promise<SetOutcome> => {
  const out: SetOutcome = { def: t.def, set: p.set, updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: opts.handEdits, identity: [], content: [], misses: [] };
  const work = plan(p, opts.handEdits, opts.noBaseline);
  out.skipped = work.skipped;
  out.unrecorded = work.unrecorded;
  if (work.earlierRecord.length) out.earlierRecord = work.earlierRecord;
  out.kept = work.kept;
  const plans = new Map(t.plans.map((x) => [planComponentName(x), x] as const));

  // ── LAYERS RENAMED IN PLACE (#2759), first, in every member this update configures: the dry run read them under
  // their new names, and the build's pass finds them by those names, so each keeps its id and every override on it.
  // The member itself and an instance's contents (its main's) are never renamed. Done before the identity is read,
  // so the verify below holds each renamed layer to the id it had.
  const layerMap = partRenames(t.def, opts.ledger);
  if (layerMap.size) {
    const rename = (n: LiveNode): void => {
      for (const c of kidsOf(n)) {
        const to = layerMap.get(String(c.name ?? ''));
        if (to !== undefined) c.name = to;
        if (c.type !== 'INSTANCE') rename(c);
      }
    };
    const toCoord = namesFor(t).coordOf;
    const movedTo = new Map(p.moves.map((m) => [m.from, m.to] as const));
    for (const c of kidsOf(live)) {
      const coord = toCoord(String(c.name ?? ''));
      if (work.members.has(movedTo.get(coord) ?? coord)) rename(c);
    }
  }

  // ── THE IDENTITY BEFORE ─────────────────────────────────────────────────────────────────────────────────
  // A single-component def (#2296) has no set: its key and id are empty on both sides, and identity is per member.
  const { coordOf, hostOf } = namesFor(t);
  const setKey = keyOf(live);
  const setId = idOf(live);
  const moved = new Map(p.moves.map((m) => [m.from, m.to] as const));
  const before = new Map<string, { id: string; key: string; ref: unknown; kids: Map<string, string> }>();
  for (const c of kidsOf(live)) {
    const name = coordOf(String(c.name ?? ''));
    const at = moved.get(name) ?? name;
    const kids = new Map<string, string>();
    const pl = plans.get(at);
    if (pl && work.members.has(at)) childIds(pl.root, c, '.', kids);
    before.set(at, { id: idOf(c), key: keyOf(c), ref: c, kids });
  }
  const replaced = new Set(p.replacements.map((r) => `${moved.get(r.member) ?? r.member}\u0000${r.path}`));
  // Where each member sat, so the moves the build's pass makes are counted off the host, not taken from the dry run.
  const posOf = (c: unknown): string => { const q = c as { x?: unknown; y?: unknown }; return `${Number(q.x)},${Number(q.y)}`; };
  const wasAt = new Map([...before].map(([name, b]) => [name, posOf(b.ref)] as const));

  // ── THE SET'S OWN NAME (#2759): a set under an earlier def id takes the current one, in place, so the set and every
  // member keep their ids and every placed instance keeps pointing at them.
  if (p.setRename && String(live.name ?? '') === p.setRename.from) live.name = p.set;

  // ── RENAMES, ONE SYNCHRONOUS BLOCK (#1780): no `await` between the first and the last ─────────────────────
  const byName = new Map(kidsOf(live).map((c) => [coordOf(String(c.name ?? '')), c] as const));
  for (const m of p.moves) {
    const n = byName.get(m.from) as { name?: string } | undefined;
    if (n) { n.name = hostOf(m.to); out.renamed++; }
  }

  // ── PROPERTIES: a rename first, in place (#2759), so the property keeps its id and every instance its value; then a
  // retype or a removal deletes (the build's pass adds the retyped one back), and a default is edited
  const before0 = live.componentPropertyDefinitions ?? {};
  const bare0 = new Map(Object.keys(before0).filter((k) => before0[k].type !== 'VARIANT').map((k) => [k.replace(/#[^#]*$/, ''), k] as const));
  for (const x of p.properties.rename) {
    const k = bare0.get(String(x.from));
    if (k) live.editComponentProperty?.(k, { name: String(x.to) });
  }
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
    const n = kidsOf(live).find((c) => coordOf(String(c.name ?? '')) === d) as { description?: string } | undefined;
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
      ...(pageFor(t, live) ? { targetPage: pageFor(t, live) } : {}),
      // A single-component def is built and updated as the build makes it: separate components, no set (#2296).
      ...(t.single ? { emitAsComponents: true } : {}),
      update: { members: work.members, retained: new Set(retained) },
    });
  } catch (err) {
    out.stopped = (err as Error)?.message ?? String(err);
    return out;
  }
  out.updated = r.updatedInPlace ?? [];
  out.added = r.added;
  // The build's notes on the members it was told to leave alone are this run's skips, already reported above. So is a
  // miss that names one (#2477): the build's footprint check comparing a designer's own member, which the update left
  // as it is, with a sibling is about that member, not about a write the update could not finish.
  const known = [...before.keys(), ...out.updated, ...out.skipped.map((k) => k.member)];
  out.misses = r.misses.filter((x) => !/^member .* -> (ALREADY PRESENT|STALE) /.test(x) && !out.skipped.some((k) => namesMember(x, k.member, known)));

  // ── VERIFY (a): IDENTITY, OFF THE HOST ─────────────────────────────────────────────────────────────────────
  const now = t.single ? (await liveFor(host, t, p.set)) ?? live
    : (host.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as LiveSet[]).find((s) => idOf(s) === setId || (setKey && keyOf(s) === setKey)) ?? live;
  if (keyOf(now) !== setKey || idOf(now) !== setId) out.identity.push(`the set: key ${setKey} → ${keyOf(now)}, id ${setId} → ${idOf(now)}`);
  const after = new Map(kidsOf(now).map((c) => [coordOf(String(c.name ?? '')), c] as const));
  // EVERY member whose place changed is counted, whether or not the dry run listed it (#2519): a move the dry run
  // could not predict (an update that resizes members re-lays the grid by their new sizes) is never silent.
  {
    const n = [...wasAt].filter(([name, at]) => after.has(name) && posOf(after.get(name)) !== at).length;
    if (n) out.moved = n;
  }
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
  // The set's own SLOT properties, read off it now, for the snapshots' slots (#2649).
  let setDefs: Record<string, unknown> | null = null;
  try { setDefs = t.single ? null : ((now as { componentPropertyDefinitions?: unknown }).componentPropertyDefinitions ?? null) as Record<string, unknown> | null; } catch { setDefs = null; }
  const ports = withSetSlots(await hostPorts(host), setDefs);
  const varById = await varsById(api as unknown as Parameters<typeof varsById>[0]);
  const plannedRx = reactionMap(t.plans.map((x) => planComponentName(x)), t.plans[0]?.pressState);
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
    // A PAINT THE PLAN DOES NOT GIVE (#2369). `diffAnatomy` reads the paints a plan declares, so a node the plan
    // leaves unpainted is never checked, and a fill a superseded plan gave it would pass. Read here off the live
    // node, by the build's own rule: a frame the plan gives no fill (and no gradient) or no stroke carries none.
    const unpainted = (pn: AnatomyPlan['root'], hn: (LiveNode & { fills?: unknown; strokes?: unknown }) | undefined, at: string): void => {
      if (!hn || pn.type !== 'FRAME' || [...keep].some((k) => at === k || at.startsWith(`${k}/`))) return;
      const shown = (ps: unknown): number => (Array.isArray(ps) ? ps.filter((x) => (x as { visible?: boolean })?.visible !== false).length : 0);
      if (!pn.paints?.fills && !pn.gradientFill && shown(hn.fills)) out.content.push(`${name}/${at}.fills: ${shown(hn.fills)} paint(s) (the plan says none)`);
      if (!pn.paints?.strokes && shown(hn.strokes)) out.content.push(`${name}/${at}.strokes: ${shown(hn.strokes)} paint(s) (the plan says none)`);
      const kids = (hn.children ?? []) as (LiveNode & { fills?: unknown; strokes?: unknown })[];
      for (const c of pn.children ?? []) unpainted(c, kids.find((k) => String(k.name ?? '') === c.name), at === '.' ? c.name : `${at}/${c.name}`);
    };
    unpainted(pl.root, a as LiveNode & { fills?: unknown; strokes?: unknown }, '.');
    // WHAT THE HOST DRAWS (#2379): the paint's stored color and alpha, and a glyph's vectors where they sit, which
    // `diffAnatomy` does not read. The dry run judges a member by the same check (`drawn.ts`).
    for (const f of drawnFaults(a, varById, (part) => [...keep].some((k) => part === k || part.startsWith(`${k}/`)))) out.content.push(faultLine(name, f));
    // ITS REACTIONS (#2466), read off the host with every destination resolved: written from the plan, or kept.
    const want = plannedRx.get(name);
    if (want && snap.reactions && !keep.has(REACTIONS_PATH)) {
      const planned = want.map((r) => plannedRead(name, r));
      if (reactionVerdict(planned, snap.reactions).differs) out.content.push(`${name}/${REACTIONS}: ${reactionsText(snap.reactions)} (the plan says ${reactionsText(planned)})`);
    }
  }
  if (work.restamp.length) await restampMembers(now, work.restamp, plans, out, hostOf);
  return out;
};

/** The canvas furniture's redraw for one set the update acted on (`main.ts`'s `furnishSet`, #2406). */
export type Furnish = (def: string, set: { id?: unknown }) => Promise<void>;

/**
 * THE PAGE'S SETS, RE-SPACED FROM WHAT IS ON IT NOW (#2542, #2723). The sets this update reads, each blocked when the
 * dry run named a blocker or the apply refused it, laid out by `pageSetMoves`. A set moves by `x` and `y` only, and
 * its own furniture (tagged with its id, `canvas-furniture.ts`) moves with it by the same amount, so labels already
 * drawn keep their place against the members. Returns the names of the sets it moved.
 */
const liveSets = async (host: ApplyHost, targets: readonly UpdateTarget[], preview: UpdatePreview, res: ApplyResult, opts: { ledger?: readonly ComponentRename[] } = {}): Promise<{ name: string; set: LiveSet; blocked: boolean }[]> => {
  const live: { name: string; set: LiveSet; blocked: boolean }[] = [];
  for (const t of targets) {
    if (t.single) continue;
    const p = preview.sets.find((s) => s.set === (t.plans[0]?.component ?? t.def));
    const set = p ? await liveFor(host, t, p.set, opts.ledger) : undefined;
    if (!p || !set) continue;
    live.push({ name: p.set, set, blocked: p.blockers.length > 0 || res.outcomes.some((o) => o.set === p.set && !!o.refused) });
  }
  return live;
};
const respaceLive = async (host: ApplyHost, targets: readonly UpdateTarget[], preview: UpdatePreview, res: ApplyResult, opts: { choices?: UpdateChoices; ledger?: readonly ComponentRename[] }, before?: (names: string[]) => Promise<boolean>, snug?: ReadonlySet<string>): Promise<string[]> => {
  const live = await liveSets(host, targets, preview, res, opts);
  const moves = pageSetMoves(live as never, snug, docPanelReach(host as unknown as Pick<PanelApi, 'root'>));
  if (!moves.size || (before && !await before([...moves.keys()]))) return [];
  const moved: string[] = [];
  for (const { name, set } of live) {
    const m = moves.get(name);
    if (!m) continue;
    const node = set as { x?: number; y?: number; parent?: { children?: readonly unknown[] } | null };
    const dx = m.to.x - Number(node.x ?? 0), dy = m.to.y - Number(node.y ?? 0);
    // Its usage panel too (#846), while it is the live one: a panel kept aside after a hand edit stays where it is.
    const own = (node.parent?.children ?? []).filter((k) => readTag(k as never)?.set === idOf(set) || (readPanelTag(k as PNode)?.state === 'live' && readPanelTag(k as PNode)?.set === idOf(set))) as { x?: number; y?: number }[];
    node.x = m.to.x;
    node.y = m.to.y;
    for (const f of own) { f.x = Number(f.x ?? 0) + dx; f.y = Number(f.y ?? 0) + dy; }
    moved.push(name);
    const t = targets.find((x) => (x.plans[0]?.component ?? x.def) === name)!;
    let o = res.outcomes.find((x) => x.set === name);
    if (!o) { o = { def: t.def, set: name, updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: choiceFor(opts.choices, name), identity: [], content: [], misses: [] }; res.outcomes.push(o); }
    o.setMoved = true;
    // A set whose only work was the move no longer reads as it was previewed: it changed.
    if (o.asPreviewed) delete o.asPreviewed;
  }
  return moved;
};

/**
 * ONE UPDATE SETTLES THE PAGE (owner decision Q358 A). The canvas furniture is redrawn for every set the update acted
 * on (`opts.furnish`), and a redraw can widen a set: its labels are measured as drawn, and #2705's columns grow to the
 * widest label. The re-spacing above ran before that, from the old labels, so the set to the right can now sit closer
 * than `SET_GAP`, its labels under the widened set's. So the re-spacing runs once more, from the furniture as now
 * drawn. It makes room (Q248 A): a set clear at a spacing a designer chose stays. Nothing runs without
 * `opts.furnish`, and nothing after a stop, as above.
 *
 * A REDRAW CAN NARROW A SET TOO (#2734). Labels that shrink leave the set to the right further than `SET_GAP` away, and
 * a wider spacing reads as the designer's. So the sets sitting at exactly `SET_GAP` just before the redraw
 * (`pageSnugSets`) are Prism3's spacing, and the second pass puts them back at exactly `SET_GAP`, nearer or further.
 *
 * A SECOND WRITE NEEDS THE NAMED VERSION TOO (Q7). When the update wrote nothing else, no version was saved yet, so one
 * is saved before the first move; refused or unavailable, the sets stay where they are, and the next dry run lists
 * the moves.
 */
const settle = async (host: ApplyHost, targets: readonly UpdateTarget[], preview: UpdatePreview, res: ApplyResult, opts: { furnish?: Furnish; choices?: UpdateChoices; ledger?: readonly ComponentRename[] }): Promise<void> => {
  if (!opts.furnish) return;
  // #2734: which sets sit at exactly `SET_GAP` now, before a redraw can narrow the labels beside them.
  const snug = pageSnugSets(await liveSets(host, targets, preview, res, opts) as never, docPanelReach(host as unknown as Pick<PanelApi, 'root'>));
  for (const o of res.outcomes) {
    const t = targets.find((x) => x.def === o.def);
    if (!t || t.single) continue;
    const set = await liveFor(host, t, o.set, opts.ledger);
    if (set) await opts.furnish(o.def, set);
  }
  if (res.outcomes.some((o) => o.stopped)) return;
  await respaceLive(host, targets, preview, res, opts, async (names) => {
    if (res.version) return true;
    try {
      if (!host.saveVersionHistoryAsync) return false;
      const title = versionTitle(names);
      await host.saveVersionHistoryAsync(title);
      res.version = title;
      return true;
    } catch { return false; }
  }, snug);
};

/**
 * THE ABOUT FRAME AND THE PUBLISH DESCRIPTION (#2858), once a run has written: `res.version` is set by whichever path
 * saved the named version first, the apply's or `settle`'s re-spacing. The frame is redrawn last, so its date is the
 * run's; a run that stopped in a set leaves it, and the next run finishes the sets and draws it. A host write refused
 * here is named, never thrown: the sets are already written. The description's first sentence is that version's title.
 */
const finishAbout = async (host: ApplyHost, api: ComponentsApi, preview: UpdatePreview, res: ApplyResult, today: string | undefined): Promise<void> => {
  if (!res.version && !res.aboutOnly) return;
  if (preview.about && !res.outcomes.some((o) => o.stopped)) {
    try {
      res.about = await drawAbout(api as unknown as AboutApi, host.root as AboutRoot, { updated: today ?? new Date().toISOString().slice(0, 10) });
    } catch (e) {
      res.about = { drawn: false, skipped: `Figma refused the write (${(e as Error)?.message ?? String(e)})`, fontMisses: [] };
    }
  }
  // With no version, no set changed: the library has nothing new to publish, and the description has no title.
  if (!res.version) return;
  const changed = res.outcomes.filter((o) => !o.refused && (o.updated.length || o.added || o.renamed || o.deprecated.length)).map((o) => o.set);
  res.publish = publishDescription({
    title: res.version, sets: changed, from: res.about?.from ?? (preview.about?.state === 'stale' ? preview.about.from.engine : null),
    consumerBreaks: res.outcomes.reduce((k, o) => k + (o.breaking?.length ?? 0), 0),
  });
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
  opts: { descriptionOf?: (def: string) => string | undefined; breathe?: () => Promise<void>; yieldTo?: () => Promise<void>; ledger?: readonly ComponentRename[]; choices?: UpdateChoices; furnish?: Furnish;
    /** The run's date for the About frame, `YYYY-MM-DD`; today, UTC, unless a test passes its own. */
    today?: string } = {},
): Promise<ApplyResult> => {
  const preview = await previewUpdate(host, targets, opts.breathe, opts.ledger);
  const res: ApplyResult = { outcomes: [], missing: preview.missing, refused: preview.refused };
  if (previewHashOf(preview) !== previewHash) {
    res.refusedAll = 'the file changed since the check. Run the check again, then confirm the new one';
    return res;
  }
  // PREFLIGHT EVERY SET, before anything is written anywhere.
  const ordered = nestedFirst(targets);
  const ready: { t: UpdateTarget; p: SetPreview; live: LiveSet; stampOnly?: boolean }[] = [];
  const furnishing: SetPreview[] = [];
  for (const t of ordered) {
    const p = preview.sets.find((s) => s.set === (t.plans[0]?.component ?? t.def));
    const live = p ? await liveFor(host, t, p.set, opts.ledger) : undefined;
    if (!p || !live) continue;
    const why = preflight(p);
    if (why) { res.outcomes.push({ def: t.def, set: p.set, refused: why, updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: choiceFor(opts.choices, p.set), identity: [], content: [], misses: [] }); continue; }
    // Nothing for the build's pass to do. `noBaseline` counts (#2364): a set whose members all lack a record reads no
    // `update`, and was called already up to date. A member from an earlier plugin (`revisionUnknown`) does not (#2379):
    // it takes only the current stamp, so a set of nothing else is stamped and never built over.
    // Members to move into the grid (#2188 Q173) are work: the build's pass re-lays the grid and rewrites no member.
    const nothing = p.counts.update + p.counts.handEdited + p.counts.noBaseline + p.counts.add + p.counts.drop + p.counts.rename + (p.counts.move ?? 0) === 0
      && Object.values(p.properties).every((l) => l.length === 0) && !p.setRename;
    if (nothing && p.counts.revisionUnknown) { ready.push({ t, p, live, stampOnly: true }); continue; }
    // A set whose only work is its canvas furniture (#2803) touches no member: it takes an outcome naming the furniture,
    // which `settle` draws through `opts.furnish` once the apply is done, and the named version below covers it.
    if (nothing && furnitureDueCount(p.furniture)) {
      res.outcomes.push({ def: t.def, set: p.set, updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: choiceFor(opts.choices, p.set), identity: [], content: [], misses: [], furniture: p.furniture });
      furnishing.push(p);
      continue;
    }
    if (nothing) {
      // A set left alone must not leave a difference the dry run named: each is a failure of this set, by name,
      // the way verify's content check names a field an applied member still holds. Never "already up to date".
      const left = p.changes.filter((c) => c.field !== 'stamp').map((c) => `${c.sample[0] ?? p.set}/${c.part}.${c.field}: ${c.from} (the plan says ${c.to})`);
      res.outcomes.push({ def: t.def, set: p.set, updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: choiceFor(opts.choices, p.set), identity: [], content: left, misses: [], asPreviewed: { line: previewLine(p), upToDate: setUpToDate(p) } });
      continue;
    }
    ready.push({ t, p, live });
  }
  // A set whose only work is its move on the page (#2542) is work too: the version is saved and the move made.
  const moving = preview.sets.filter((p) => p.setMove && !p.blockers.length);
  // THE PAGE ORDER (#2568) is work of its own: a file whose sets are all up to date can still have pages to reorder.
  const reorder = !!preview.pages?.length && typeof host.root.insertChild === 'function' && !!host.root.children;
  // THE ABOUT FRAME (#2858) is work of its own when it is missing or drawn for another engine.
  const about = aboutIsWork(preview.about);
  if (!ready.length && !moving.length && !reorder && !furnishing.length && !about) { await settle(host, targets, preview, res, opts); await finishAbout(host, api, preview, res, opts.today); return res; }
  // THE ABOUT FRAME ALONE SAVES NO VERSION (owner decision Q498 B): no set changes, so Q7's way back has nothing to
  // cover. `settle` still saves one before any re-spacing it finds, as for any other second write.
  if (!ready.length && !moving.length && !reorder && !furnishing.length) {
    res.aboutOnly = true;
    await settle(host, targets, preview, res, opts);
    if (res.version) delete res.aboutOnly;
    await finishAbout(host, api, preview, res, opts.today);
    return res;
  }
  // A NAMED VERSION, ONCE, BEFORE THE FIRST WRITE (Q7), for all of it: the sets updated or moved, then the page order.
  // Refused or unavailable, nothing is written.
  const title = versionTitle([...new Set([...ready.map((x) => x.p.set), ...moving.map((p) => p.set), ...furnishing.map((p) => p.set)]), ...(reorder ? ['the page order'] : []), ...(about ? [ABOUT_NAME] : [])]);
  try {
    if (!host.saveVersionHistoryAsync) throw new Error('this host cannot save a version');
    await host.saveVersionHistoryAsync(title);
    res.version = title;
  } catch (err) {
    res.refusedAll = `the named version could not be saved (${(err as Error)?.message ?? String(err)}), so nothing was written`;
    return res;
  }
  // First, before the sets: moving a page rewrites nothing on it, and a stop in a set below leaves the order done.
  if (reorder) {
    const root = host.root;
    const done = reorderPages({ root: { get children() { return root.children ?? []; }, insertChild: (i, p) => root.insertChild!(i, p) } });
    if (done.length) res.reordered = done;
  }
  for (const { t, p, live, stampOnly } of ready) {
    // Re-read: a nested set updated just before this one changed what this one's instances point at.
    const fresh = (await liveFor(host, t, p.set, opts.ledger)) ?? live;
    if (stampOnly) {
      const o: SetOutcome = { def: t.def, set: p.set, updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: choiceFor(opts.choices, p.set), identity: [], content: [], misses: [] };
      const w = plan(p, choiceFor(opts.choices, p.set), noRecordFor(opts.choices, p.set));
      await restampMembers(fresh, w.restamp, new Map(t.plans.map((x) => [planComponentName(x), x] as const)), o, namesFor(t).hostOf);
      if (p.furniture) o.furniture = p.furniture;
      res.outcomes.push(o);
      continue;
    }
    // REPEATING ROWS INTO A SLOT (#2649): the placed instances are read BEFORE the set changes under them, the same read
    // the dry run listed (its hash checked above), and filled after.
    const mig = p.slotMigration ? await slotMigrationFor(t, fresh as unknown as MigNode, opts.ledger, opts.breathe) : null;
    const o = await applySet(host, api, t, p, fresh, { description: opts.descriptionOf?.(t.def), yieldTo: opts.yieldTo, handEdits: choiceFor(opts.choices, p.set), noBaseline: noRecordFor(opts.choices, p.set), ledger: opts.ledger });
    if (p.furniture && !o.refused && !o.stopped) o.furniture = p.furniture;
    // #2831: the confirm names what it broke for library consumers, as the check listed it.
    if (p.breaking && !o.refused && !o.stopped) o.breaking = p.breaking;
    const entry = slotMigrationOf(t.def, opts.ledger);
    if (mig && entry && !o.stopped && !o.refused) {
      o.carried = await fillSlots(p.set, entry, mig.live, mig.migration, opts.breathe);
      o.content.push(...o.carried.misses);
    }
    res.outcomes.push(o);
    if (o.stopped) break;
  }
  // THE SETS MOVE ON THEIR PAGES LAST (#2542, owner decision Q245.2 A), once every set has its new size, so each sits
  // where a fresh build would place it. Read again from the live sets: the moves the dry run listed, plus any a resize
  // just made (as #2519 counts the member moves the dry run could not list). A set the apply refused or stopped in
  // holds its page still. Only `x` and `y` are written, so every set and member keeps its id.
  if (!res.outcomes.some((o) => o.stopped)) await respaceLive(host, targets, preview, res, opts);
  await settle(host, targets, preview, res, opts);
  await finishAbout(host, api, preview, res, opts.today);
  return res;
};

// ---- the words (approved, Q114 A; #2265 §8) -----------------------------------------------------------------

const n = (k: number, one: string, many = `${one}s`): string => `${k} ${k === 1 ? one : many}`;

const NOT_RECORDED = '.asBuilt -> NOT RECORDED';
/** The members the build wrote but could not finish: each one's as-built record was refused, so `finishUpdated` left its
 *  stamp as it was and the next dry run reads it out of date (#2477). Named only when the build also listed it as
 *  updated in place; any other miss is the set's `others`. */
const unfinishedOf = (o: SetOutcome): { members: string[]; others: string[] } => {
  const members: string[] = [];
  const others: string[] = [];
  for (const m of o.misses) {
    const at = m.lastIndexOf(NOT_RECORDED);
    if (at > 0 && o.updated.includes(m.slice(0, at))) members.push(m.slice(0, at));
    else others.push(m);
  }
  return { members, others };
};

/** The verdict for an applied update. `lines` is the Activity drawer's copy (#2177). */
export const applyVerdict = (r: ApplyResult): { ok: boolean; headline: string; summary: string; lines: string[] } => {
  if (r.refusedAll) {
    const lines = [`Nothing was updated: ${r.refusedAll}.`];
    return { ok: false, headline: '✗ update refused', summary: lines.join('\n'), lines };
  }
  const stopped = r.outcomes.find((o) => o.stopped);
  // A miss from the build's own pass is a set not verified, as an identity or content difference is (#2477): the set
  // holds a write the build could not finish, so no ✓ while it is left (#2364's rule).
  const failed = r.outcomes.filter((o) => o.identity.length || o.content.length || o.misses.length);
  // A set the apply entered and wrote nothing to, every member it would have written left as it is (`noBaseline:
  // 'skip'`, a layer added by hand, a member that would need replacing), still holds what its dry run listed. It is
  // NOT UPDATED, never "already up to date" (#2364 review; the owner's choice, 2026-10-08: the approved headline).
  // Furniture drawn for it does not change that (#2803 review): its members still hold what the dry run listed.
  const idle = r.outcomes.filter((o) => !o.refused && !o.stopped && o.skipped.length && !o.updated.length && !o.added && !o.renamed && !o.deprecated.length && !o.moved && !o.setMoved).length;
  const refused = r.outcomes.filter((o) => o.refused).length + r.refused.length + idle;
  // A member not finished is not counted as updated: the next dry run reads it out of date (#2477).
  const done = (o: SetOutcome): number => o.updated.length - unfinishedOf(o).members.length;
  const updated = r.outcomes.reduce((k, o) => k + done(o), 0);
  const added = r.outcomes.reduce((k, o) => k + o.added, 0);
  const deprecated = r.outcomes.reduce((k, o) => k + o.deprecated.length, 0);
  const renamed = r.outcomes.reduce((k, o) => k + o.renamed, 0);
  const moved = r.outcomes.reduce((k, o) => k + (o.moved ?? 0), 0);
  const setsMoved = r.outcomes.filter((o) => o.setMoved).length;
  const furnished = r.outcomes.filter((o) => !o.refused && !o.stopped && furnitureDueCount(o.furniture)).length;
  const reordered = r.reordered?.length ?? 0;
  const lines: string[] = [];
  for (const o of r.outcomes) {
    if (o.refused) { lines.push(`${o.set}: not updated. ${o.refused}.`); continue; }
    if (o.stopped) {
      lines.push(`${o.set}: stopped (${o.stopped}). ${n(o.updated.length, 'member')} updated; the rest are unchanged and still read as out of date. Run the update again to finish, or undo once to revert it.`);
      continue;
    }
    const parts = [
      done(o) ? `${done(o)} updated in place` : '',
      o.added ? `${o.added} added` : '',
      o.renamed ? `${o.renamed} renamed` : '',
      o.deprecated.length ? `${o.deprecated.length} marked deprecated` : '',
      // DRAFT wording for the owner (#2188 Q173), the dry run's "to move" as done.
      o.moved ? `${o.moved} moved` : '',
      // Wording approved, Q246 A (#2542, Q245.2 A), the dry run's "moves to its place on the page" as done.
      o.setMoved ? 'the set moved to its place on the page' : '',
      ...furnitureParts(o.furniture, 'drawn', 'cleared'),
      o.kept.length ? `${n(o.kept.length, 'hand edit')} ${o.handEdits === 'overwrite' ? 'overwritten' : o.handEdits === 'accept' ? 'accepted as built' : 'kept'}` : '',
      o.unrecorded.length - (o.earlierRecord?.length ?? 0) ? `${o.unrecorded.length - (o.earlierRecord?.length ?? 0)} of them without an as-built record` : '',
      // The owner's wording (2026-10-09).
      o.earlierRecord?.length ? `${o.earlierRecord.length} of them recorded by an earlier plugin version` : '',
      o.skipped.length ? `${o.skipped.length} left as they are` : '',
    ].filter(Boolean);
    // A set the apply entered with nothing to write reads as its dry run read it (Q205 A): never "already up to date"
    // for a set the dry run doesn't call up to date (one Adopt could claim a member of, #2495).
    lines.push(parts.length ? `${o.set}: ${parts.join(', ')}.` : o.asPreviewed && !o.asPreviewed.upToDate ? o.asPreviewed.line : `${o.set}: already up to date.`);
    // DRAFT wording for the owner (#2649): the placed instances whose rows became slot items.
    if (o.carried) lines.push(`${o.set}: ${n(o.carried.instances, 'instance')} carried into the slot, ${n(o.carried.items, 'item')} in all.${o.carried.limits.length ? ` Outside the slot's limits: ${o.carried.limits.join('; ')}.` : ''}`);
    if (o.identity.length) lines.push(`${o.set}: component IDs changed — ${o.identity.slice(0, 3).join('; ')}${o.identity.length > 3 ? '; …' : ''}.`);
    if (o.content.length) lines.push(`${o.set}: ${n(o.content.length, 'field')} still differ from the plan — ${o.content.slice(0, 3).join('; ')}${o.content.length > 3 ? '; …' : ''}.`);
    // DRAFT wording for the owner (#2477, the issue's option A): a member written but not finished, by name.
    const { members, others } = unfinishedOf(o);
    if (members.length) {
      lines.push(members.length === 1
        ? `${o.set}: 1 member not finished — ${members[0]} (its as-built record could not be written). It still reads as out of date; run the update again to finish it.`
        : `${o.set}: ${members.length} members not finished — ${members.join(', ')} (their as-built records could not be written). They still read as out of date; run the update again to finish them.`);
    }
    // DRAFT wording for the owner (#2477): any other miss the build's pass reported, with its own reason.
    if (others.length) lines.push(`${o.set}: ${n(others.length, 'part')} not written as planned — ${others.slice(0, 3).join('; ')}${others.length > 3 ? '; …' : ''}.`);
  }
  // #2831: what the update broke for library consumers, in its own section, as the dry run's.
  lines.push(...breakingSection(r.outcomes, true));
  for (const x of r.refused) lines.push(`${x.def}: not updated. ${x.reason}.`);
  // Owner-approved wording (#2568, Q264 A), the dry run's "to reorder" as done.
  if (reordered) lines.push(`Component pages: ${reordered} reordered (${r.reordered!.map(stripNestPrefix).join(', ')}).`);
  if (r.missing.length) lines.push(`Not in this file: ${r.missing.join(', ')}.`);
  // #2858: the Cover page's About frame, drawn last.
  if (r.about) lines.push(aboutLine(r.about));
  if (r.version) lines.push(`Saved a version first: "${r.version}".`);
  else if (r.aboutOnly && r.about?.drawn) lines.push(ABOUT_ONLY_DONE);
  const headline = stopped ? `✗ update stopped at ${stopped.set}`
    : failed.length ? `⚠ ${n(failed.length, 'set')} not verified`
      : refused ? `✗ ${n(refused, 'set')} not updated`
        : updated ? `✓ updated ${updated} in place`
          : added ? `✓ added ${added}`
            : deprecated ? `✓ ${deprecated} marked deprecated`
              : renamed ? `✓ renamed ${renamed}`
                : moved ? `✓ moved ${moved}`
                  // DRAFT wording for the owner: sets moved AND pages reordered in one run, the two approved headlines
                  // (Q246 A, Q264 A) joined, so neither hides the other.
                  : setsMoved && reordered ? `✓ ${n(setsMoved, 'set')} moved, reordered ${n(reordered, 'page')}`
                    : setsMoved ? `✓ ${n(setsMoved, 'set')} moved` : reordered ? `✓ reordered ${n(reordered, 'page')}`
                      // DRAFT wording for the owner (#2803, Q379 A): a run whose only work was the canvas furniture.
                      : furnished ? `✓ canvas furniture drawn for ${n(furnished, 'set')}`
                        // DRAFT wording for the owner (#2858): a run whose only work was the About frame.
                        : r.about?.drawn ? `✓ ${ABOUT_NAME} drawn` : r.outcomes.some((o) => o.asPreviewed && !o.asPreviewed.upToDate) ? '✓ No changes found' : '✓ already up to date';
  return { ok: !stopped && !failed.length && !refused, headline: `${headline}${breakingClause(r.outcomes)}`, summary: lines.join('\n'), lines };
};
