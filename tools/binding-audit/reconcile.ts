/**
 * LIVE-FILE RECONCILE (#1511) — diff a real Figma file's ACTUAL bindings against the expected ledger.
 *
 *   npx tsx tools/binding-audit/audit.ts --reconcile <export.json>   # the reconcile report, exit 0
 *   npx tsx tools/binding-audit/reconcile.ts <export.json>           # same, run directly
 *   npx tsx tools/binding-audit/reconcile.ts <export.json> --json    # findings + coverage as JSON
 *   npx tsx tools/binding-audit/reconcile.ts --selftest              # fixture round-trip (exit 1 on fail)
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
 *
 * `audit.ts` audits the ENGINE's emission — it is correct by construction. The real QA risk is a LIVE
 * file drifting from that intent: a manual rebind, a stale projection, a wrong swap. A console pass the
 * owner ran during QA found nodes with NO variable bound, but never checked whether the bound ones
 * point at the RIGHT variable. This closes that: it ingests a small, versioned JSON export of the
 * file's ACTUAL per-node bindings (the console snippet the README documents) and diffs it against the
 * expected `--ledger`, reporting per (component, member, node, slot):
 *
 *   MATCH        — bound to the expected variable.
 *   WRONG-TOKEN  — bound, but to a different variable than the ledger expects (reports got X / want Y).
 *                  THIS is the check that did not exist before.
 *   UNBOUND      — the ledger expects a bind; the file reports none (the class the console script found).
 *   EXTRA        — the file binds a field the ledger does not cover at that node.
 *   UNKNOWN-NODE — a node in the export the ledger cannot place (renamed set, stray node, stale member).
 *
 * plus a COVERAGE summary: which ledger coordinates the export did / did not touch. PARTIAL EXPORTS
 * ARE NORMAL — a QA file may hold only some components — so a ledger coordinate simply ABSENT from the
 * export is reported as *not covered*, NEVER as UNBOUND. Only a node the export actually carries, with
 * that field reported as `UNBOUND`, is an UNBOUND finding.
 *
 * ── THE MATCHING KEY ────────────────────────────────────────────────────────────────────────────
 *
 * `(component, member, node, field)`, all from the projection's DETERMINISTIC name-path:
 *   - component = the Figma SET name = the engine's `def.id` (`set.name = plan.component`).
 *   - member    = the variant-COORDINATE string ("appearance=filled, size=small, …"), which is both
 *                 `planComponentName`'s output and Figma's own member name.
 *   - node      = the name-path of a node WITHIN the member, MEMBER-RELATIVE: the member root is `/`,
 *                 its child `foo` is `/foo`, and so on. This is load-bearing: the plugin converts the
 *                 plan's root frame (named `container`/`glyph`) IN PLACE into the member COMPONENT and
 *                 renames it to the coordinate (`createComponentFromNode` + `comp.name = spec.name` in
 *                 apps/plugin/src/write-components.ts), so the live member IS the plan root. The ledger
 *                 stores the root name as the first path segment (`/container/icon`); the reconciler
 *                 STRIPS that first segment (`memberRelative`) so it lines up with a live walk that
 *                 starts AT the member. The console export snippet emits member-relative paths directly.
 *   - field     ∈ {fills, strokes, descendantFills} — the same three the export snippet reports.
 * A file projected from this engine carries these verbatim, so the diff is a plain key join. A
 * coordinate the ledger cannot place (a renamed set, a hand-added node) becomes UNKNOWN-NODE, not a crash.
 *
 * ── COVERAGE EXTENSIONS (#1523) — three REACH limits found in owner QA, all correct-by-hand ───────
 *
 * A live NB reconcile surfaced three coordinate shapes the diff could not place. None was a file
 * defect (every one was hand-checked correct); each was the instrument failing to line the two sides
 * up. Two are fixed here as pre-diff normalizations (`mapLooseComponents`, `foldDescendantInk` above),
 * the third is an investigation whose conclusion is recorded and pinned by the selftest:
 *
 *   1. GLYPH-CONTAINER INK reported one level down (82 binds). The export snippet emits
 *      `descendantFills` only for `INSTANCE` slots; a glyph container that is a `FRAME`/`GROUP` in the
 *      live file has its ink reported on the child shape's `descendantFills`. `foldDescendantInk` lifts
 *      that child ink onto the ledger's container coordinate so it is MATCHed, not skipped.
 *   2. LOOSE `icon/<name>` COMPONENTS (43 binds). A loose icon ships as `icon/arrow-down` with no
 *      variantProperties; the ledger keys it as component `icon`, member `name=arrow-down`.
 *      `mapLooseComponents` remaps the loose naming onto that coordinate so the ink reconciles instead
 *      of scoring UNKNOWN-NODE (its `/Vector` ink then folds onto the container via gap 1).
 *   3. GROUP SETS (checkbox-group / radio-group) carry `bindings: []` in the ledger yet the live file
 *      binds `/label/text`, each row's `/label` and each row's `/controlBox/control` stroke. INVESTIGATED and
 *      CONFIRMED EXPECTED, no coverage hole: the group defs declare NO paint slots of their own (see
 *      `components/checkbox-group.ts` — "THE GROUP PAINTS NOTHING OF ITS OWN", no `paintKeys`); every
 *      one of those binds is painted by a NESTED instance from its OWN definition — the group label is
 *      a nested `field-label`, each row a nested `checkbox-row` (which nests `checkbox-control`). So the
 *      binds are audited under the `field-label` / `checkbox-row` / `checkbox-control` sets, never the
 *      group set, and the empty group ledger is correct — the same mechanism behind ~500 of the run's
 *      UNKNOWN-NODE entries (a bind reached through a group set belongs to the nested set that paints
 *      it). No reconciler change: an empty ledger means the group has nothing OF ITS OWN to reconcile.
 *      The selftest's group-set arm pins this both ways — the group ledgers are empty, and the roles
 *      the live group carries are covered under the atom/row sets. (Were the group defs ever to gain a
 *      paint slot of their own, that would be an ENGINE projection change, not a reconciler one.)
 *
 * ── IT IS A TOOL, NOT A GATE (tools/CLAUDE.md) ──────────────────────────────────────────────────
 *
 * A live file is not in CI, so this answers a question and exits 0. The `--selftest` fixture round-trip
 * asserts the RECONCILE LOGIC (independent of any live file, built from the current ledger), but it is
 * a self-check the author runs, not a wired gate — the gate count stays 60.
 */
import { readFileSync } from 'node:fs';
import { componentDefs } from '../../packages/engine/components/index';
import type { ComponentDef } from '../../packages/engine/component-schema';
import { buildLedger, type BindField, type Ledger } from './ledger';

// ── THE EXPORT FORMAT — small, stable, versioned (README documents the console snippet that emits it) ─
export const EXPORT_FORMAT = 'prism3-binding-export';
export const EXPORT_VERSION = 1;

/** The sentinel a bindable field carries when the live node has no variable bound to it. */
export const UNBOUND = 'UNBOUND';

/** One node the console snippet visited: its deterministic name-path plus, per bindable field, the
 *  ACTUAL bound variable NAME (slash-pathed, e.g. `color/interactive/primary/on-fill`) or `UNBOUND`.
 *  A field the snippet did not inspect on this node is simply absent (→ not covered, never UNBOUND). */
export type ExportNode = {
  component: string;
  member: string;
  node: string;
  fields: Partial<Record<BindField, string>>;
};

export type BindingExport = {
  format: typeof EXPORT_FORMAT;
  version: number;
  /** Free-form provenance the snippet may add (file name, timestamp). Ignored by the reconciler. */
  capturedFrom?: string;
  nodes: ExportNode[];
};

// ── FINDINGS ────────────────────────────────────────────────────────────────────────────────────
export type Verdict = 'MATCH' | 'WRONG-TOKEN' | 'UNBOUND' | 'EXTRA' | 'UNKNOWN-NODE';

export type Finding = {
  verdict: Verdict;
  component: string;
  member: string;
  node: string;
  field?: BindField;
  /** The variable the file actually binds (WRONG-TOKEN / EXTRA / UNKNOWN-NODE). */
  got?: string;
  /** The variable the ledger expects (WRONG-TOKEN / UNBOUND). */
  want?: string;
};

export type Coverage = {
  expectedBindings: number;
  evaluatedBindings: number;
  expectedMembers: number;
  coveredMembers: number;
  components: { component: string; expectedMembers: number; coveredMembers: number }[];
  /** Ledger members the export never touched — sampled/capped for the report (not a defect). */
  untouchedMembers: string[];
};

export type ReconcileResult = {
  counts: Record<Verdict, number>;
  findings: Finding[]; // every non-MATCH verdict, individually (MATCH is counted, not listed)
  coverage: Coverage;
};

const coordKey = (component: string, member: string, node: string): string =>
  JSON.stringify([component, member, node]);

/** Drop the ledger path's FIRST segment — the plan root's name (`container`/`glyph`) — because the
 *  plugin renames that root to the member coordinate, so a live walk starting at the member sees it as
 *  `/`. `/container/icon` → `/icon`; `/container` → `/`. The export snippet emits paths in this same
 *  member-relative form, so this is applied to the LEDGER side only. */
const memberRelative = (fullPath: string): string => {
  const segs = fullPath.split('/').filter(Boolean);
  return `/${segs.slice(1).join('/')}`;
};

/** DERIVE THE BRAND ROOT the live file materialized under (#1522). The ledger is built from
 *  `figmaAnatomyPlan`, which is PRE-materialization — its variable names are root-less (`color/...`).
 *  The live file is POST-materialization: `materialization-renames.ts:228` (#1097) prepends `${root}/`
 *  to every variable name (`test.ts:120` asserts it), so a CLEAN file's bound names are exactly
 *  `${root}/${ledgerName}`. Comparing the two sides raw reports 100% false WRONG-TOKEN differing only by
 *  that leading segment. The root is a configurable LEVER (ads/hds/wds/nbds/prism/…), so we DERIVE it —
 *  never hardcode `ads` — the same way #1097 defines it: the leading segment the materialization ADDED,
 *  i.e. present on the file's bound names but ABSENT from the ledger's own top-level groups (`color`).
 *  Keying off the ledger's groups is what tells a real brand root (`ads`) apart from a ledger group a
 *  root-less export leads with (`color`), so a root-less export derives NO root and normalizes to a
 *  no-op — which is why the pre-existing root-less selftest arms still hold. Modal among the candidates,
 *  so a lone drifted bind pointing under a different first segment cannot outvote the real root and its
 *  drift still surfaces. Returns null when the export binds nothing rooted (nothing to normalize). */
export const deriveRoot = (ledger: Ledger, exp: BindingExport): string | null => {
  const ledgerGroups = new Set<string>();
  for (const members of Object.values(ledger.components))
    for (const m of members) for (const b of m.bindings) ledgerGroups.add(b.variable.split('/')[0]);
  const tally = new Map<string, number>();
  for (const en of exp.nodes)
    for (const v of Object.values(en.fields)) {
      if (!v || v === UNBOUND) continue;
      const seg = v.split('/')[0];
      if (!ledgerGroups.has(seg)) tally.set(seg, (tally.get(seg) ?? 0) + 1);
    }
  let root: string | null = null;
  let best = 0;
  for (const [seg, n] of tally) if (n > best) { best = n; root = seg; }
  return root;
};

/** Strip the derived brand root from one bound variable name so it lines up with the root-less ledger.
 *  A name that does NOT wear the root is left intact — so a bind un-rooted or rooted differently than
 *  the file's own root still mismatches and surfaces, rather than being silently normalized away. */
const stripRoot = (variable: string, root: string | null): string =>
  root && variable.startsWith(`${root}/`) ? variable.slice(root.length + 1) : variable;

/** GAP 2 (#1523) — MAP LOOSE-ICON NAMING to the ledger's `name=` coordinate. A loose icon ships as a
 *  standalone `COMPONENT` named `icon/arrow-down` with NO variantProperties, so the export snippet
 *  reports both its `component` (the selection name) and its `member` (the component's own name, since
 *  it has no variant coordinate) as `icon/arrow-down`. The ledger keys the icon set as component `icon`
 *  with members `name=arrow-down`, so a raw diff cannot place either coordinate and all 43 loose icons
 *  score UNKNOWN-NODE despite correct ink. This remaps an export node whose `component` is `<base>/<slug>`
 *  — where `<base>` is a real ledger component whose members are `name=<slug>` coordinates — onto that
 *  `(base, name=<slug>)` coordinate. Guarded on the base being a ledger component AND carrying the exact
 *  `name=<slug>` member, so it only fires on the loose-icon shape and never rewrites a set the ledger
 *  already knows (a component the ledger keys directly is returned untouched). */
export const mapLooseComponents = (ledger: Ledger, exp: BindingExport): BindingExport => {
  const nodes = exp.nodes.map((en) => {
    if (ledger.components[en.component]) return en; // a set the ledger keys directly — leave it
    const slash = en.component.indexOf('/');
    if (slash < 0) return en;
    const base = en.component.slice(0, slash); // 'icon'
    const slug = en.component.slice(slash + 1); // 'arrow-down'
    const members = ledger.components[base];
    if (!members) return en;
    const coord = `name=${slug}`;
    if (!members.some((m) => m.member === coord)) return en; // base is not a `name=`-keyed set
    return { ...en, component: base, member: coord, fields: { ...en.fields } };
  });
  return { ...exp, nodes };
};

/** GAP 1 (#1523) — LIFT GLYPH-CONTAINER INK reported one level down. The export snippet emits
 *  `descendantFills` only for `INSTANCE` glyph slots (via its descendant walk) and reports a plain
 *  `SHAPE`'s own fill under `descendantFills` at the shape itself. So where the ledger expects
 *  glyph ink on a container that is NOT an instance in the live file (a `FRAME`/`GROUP` — spinner,
 *  checkbox mark/dash, switch glyphs, the loose-icon root, …), the snippet reports the container as a
 *  surface (`fills`/`strokes`, both UNBOUND) and the ink one level down on the child shape's
 *  `descendantFills` — 82 such binds in the live NB run, all correct by hand but unevaluated, plus the
 *  child scoring UNKNOWN-NODE. This folds a child's `descendantFills` up onto the ledger's container
 *  coordinate so the expected bind is evaluated, and removes the child copy so it is not double-counted
 *  as UNKNOWN-NODE. It fires ONLY when the container itself reports NO `descendantFills` (an INSTANCE or
 *  a shape-at-the-node still reconciles directly, untouched), takes the NEAREST descendant, and never
 *  steals a descendant that is itself an expected `descendantFills` coordinate. */
export const foldDescendantInk = (ledger: Ledger, exp: BindingExport): BindingExport => {
  const nodes = exp.nodes.map((en) => ({ ...en, fields: { ...en.fields } }));
  const byCoord = new Map<string, ExportNode>();
  for (const en of nodes) byCoord.set(coordKey(en.component, en.member, en.node), en);

  // Every ledger coordinate that expects glyph ink — a descendant that is itself one is never lifted.
  const expectedDF = new Set<string>();
  for (const [component, members] of Object.entries(ledger.components))
    for (const m of members)
      for (const b of m.bindings)
        if (b.field === 'descendantFills') expectedDF.add(coordKey(component, m.member, memberRelative(b.node)));

  for (const [component, members] of Object.entries(ledger.components)) {
    for (const m of members) {
      for (const b of m.bindings) {
        if (b.field !== 'descendantFills') continue;
        const N = memberRelative(b.node);
        const ck = coordKey(component, m.member, N);
        const container = byCoord.get(ck);
        if (container && container.fields.descendantFills !== undefined) continue; // reported directly
        const prefix = N === '/' ? '/' : `${N}/`;
        let best: ExportNode | null = null;
        for (const en of nodes) {
          if (en.component !== component || en.member !== m.member) continue;
          if (en.node === N || !en.node.startsWith(prefix)) continue;
          const v = en.fields.descendantFills;
          if (v === undefined || v === UNBOUND) continue;
          if (expectedDF.has(coordKey(component, m.member, en.node))) continue; // a descendant's OWN bind
          if (best === null || en.node.length < best.node.length) best = en;
        }
        if (!best) continue;
        const lifted = best.fields.descendantFills!;
        if (container) container.fields.descendantFills = lifted;
        else {
          const c: ExportNode = { component, member: m.member, node: N, fields: { descendantFills: lifted } };
          nodes.push(c);
          byCoord.set(ck, c);
        }
        delete best.fields.descendantFills; // consumed — not a stray UNKNOWN-NODE
      }
    }
  }
  return { ...exp, nodes };
};

/** THE DIFF. Pure: a ledger + an export in, a result out — the whole reason it is fixture-testable
 *  apart from the reporter and from any live file. */
export const reconcile = (ledger: Ledger, rawExp: BindingExport): ReconcileResult => {
  // COORDINATE NORMALIZATION (#1523), before the diff: map loose-icon naming onto the ledger's `name=`
  // coordinate, then fold a non-INSTANCE glyph container's ink up from the child shape the snippet
  // reports it on. Order matters — the fold keys on ledger coordinates, so the loose icon must already
  // be remapped onto `icon`/`name=<slug>` for its `/Vector` ink to fold onto the container.
  const exp = foldDescendantInk(ledger, mapLooseComponents(ledger, rawExp));
  // INDEX THE LEDGER by (component, member, node) → field → expected variable, and by member so a node
  // whose member coordinate is known but whose path is not can be told apart in the report if wanted.
  const expected = new Map<string, Map<BindField, string>>();
  const expectedMemberKeys = new Set<string>(); // JSON([component, member])
  let expectedBindings = 0;
  for (const [component, members] of Object.entries(ledger.components)) {
    for (const m of members) {
      expectedMemberKeys.add(JSON.stringify([component, m.member]));
      for (const b of m.bindings) {
        const k = coordKey(component, m.member, memberRelative(b.node));
        let fields = expected.get(k);
        if (!fields) expected.set(k, (fields = new Map()));
        fields.set(b.field, b.variable);
        expectedBindings++;
      }
    }
  }

  // Normalize the brand root the materialization ADDED (#1522) so the root-less ledger and the rooted
  // live file compare like-for-like. Derived from this export, never hardcoded — see `deriveRoot`.
  const root = deriveRoot(ledger, exp);

  const counts: Record<Verdict, number> = { MATCH: 0, 'WRONG-TOKEN': 0, UNBOUND: 0, EXTRA: 0, 'UNKNOWN-NODE': 0 };
  const findings: Finding[] = [];
  const evaluated = new Set<string>();          // "coordKey|field" of expected binds an export node reported
  const coveredMemberKeys = new Set<string>();  // JSON([component, member]) an export node landed on

  for (const en of exp.nodes) {
    const k = coordKey(en.component, en.member, en.node);
    const memberKey = JSON.stringify([en.component, en.member]);
    const expFields = expected.get(k);

    if (!expFields) {
      // The ledger has no binding at this coordinate. If the node carries a real bind, the ledger
      // cannot place it (renamed set, hand-added node, stale member) → UNKNOWN-NODE, reported once with
      // its bound fields. A node with only UNBOUND fields is an uncovered structural node, not a defect.
      const boundFields = (Object.entries(en.fields) as [BindField, string][]).filter(([, v]) => v !== UNBOUND);
      if (boundFields.length > 0) {
        counts['UNKNOWN-NODE']++;
        findings.push({
          verdict: 'UNKNOWN-NODE',
          component: en.component,
          member: en.member,
          node: en.node,
          got: boundFields.map(([f, v]) => `${f}=${v}`).join(', '),
        });
      }
      continue;
    }

    coveredMemberKeys.add(memberKey);

    // Expected fields at this node, compared against what the export reports. The file's bound name is
    // root-normalized (#1522) so a materialized `${root}/color/...` lines up with the root-less ledger.
    for (const [field, want] of expFields) {
      const actual = en.fields[field];
      if (actual === undefined) continue; // field not inspected by the snippet here → not covered
      evaluated.add(`${k}|${field}`);
      if (actual === UNBOUND) {
        counts.UNBOUND++;
        findings.push({ verdict: 'UNBOUND', component: en.component, member: en.member, node: en.node, field, want });
      } else if (stripRoot(actual, root) === want) {
        counts.MATCH++;
      } else {
        counts['WRONG-TOKEN']++;
        findings.push({ verdict: 'WRONG-TOKEN', component: en.component, member: en.member, node: en.node, field, got: stripRoot(actual, root), want });
      }
    }

    // A field the export binds that the ledger does not cover at this node → EXTRA.
    for (const [field, got] of Object.entries(en.fields) as [BindField, string][]) {
      if (got === UNBOUND) continue;
      if (!expFields.has(field)) {
        counts.EXTRA++;
        findings.push({ verdict: 'EXTRA', component: en.component, member: en.member, node: en.node, field, got });
      }
    }
  }

  // COVERAGE — what the export did / did not reach. Absent ≠ unbound.
  const components = Object.entries(ledger.components)
    .map(([component, members]) => {
      const covered = members.filter((m) => coveredMemberKeys.has(JSON.stringify([component, m.member]))).length;
      return { component, expectedMembers: members.length, coveredMembers: covered };
    })
    .sort((a, b) => a.component.localeCompare(b.component));
  const untouched: string[] = [];
  for (const [component, members] of Object.entries(ledger.components))
    for (const m of members)
      if (!coveredMemberKeys.has(JSON.stringify([component, m.member]))) untouched.push(`${component} | ${m.member}`);

  const coverage: Coverage = {
    expectedBindings,
    evaluatedBindings: evaluated.size,
    expectedMembers: expectedMemberKeys.size,
    coveredMembers: coveredMemberKeys.size,
    components,
    untouchedMembers: untouched,
  };

  return { counts, findings, coverage };
};

// ── REPORT ──────────────────────────────────────────────────────────────────────────────────────
export const formatReport = (r: ReconcileResult): string => {
  const L: string[] = [];
  L.push('Prism3 binding reconcile (#1511) — live file vs. expected ledger\n');

  const cov = r.coverage;
  const pct = cov.expectedBindings ? Math.round((cov.evaluatedBindings / cov.expectedBindings) * 100) : 0;
  L.push('── Coverage ' + '─'.repeat(67));
  L.push(`  ${cov.coveredMembers}/${cov.expectedMembers} ledger members touched · ${cov.evaluatedBindings}/${cov.expectedBindings} expected binds evaluated (${pct}%).`);
  L.push('  Partial exports are normal — a coordinate absent from the export is NOT counted as unbound.');
  const touchedComps = cov.components.filter((c) => c.coveredMembers > 0);
  if (touchedComps.length) {
    L.push('  Components present in the export:');
    for (const c of touchedComps) L.push(`    ${c.component.padEnd(24)} ${c.coveredMembers}/${c.expectedMembers} members`);
  } else {
    L.push('  No exported node matched any ledger component (every node reported UNKNOWN-NODE, or the export was empty).');
  }

  L.push('\n── Verdicts ' + '─'.repeat(67));
  L.push(`  ${r.counts.MATCH} MATCH · ${r.counts['WRONG-TOKEN']} WRONG-TOKEN · ${r.counts.UNBOUND} UNBOUND · ${r.counts.EXTRA} EXTRA · ${r.counts['UNKNOWN-NODE']} UNKNOWN-NODE`);

  const problems = r.findings; // MATCH is not listed individually
  if (problems.length === 0) {
    L.push('\n  No drift — every evaluated binding matches the ledger. (Check Coverage for what was reached.)');
  } else {
    L.push('\n── Findings (drift from the ledger) ' + '─'.repeat(43));
    const order: Verdict[] = ['WRONG-TOKEN', 'UNBOUND', 'EXTRA', 'UNKNOWN-NODE'];
    const rank = (v: Verdict): number => order.indexOf(v);
    const sorted = [...problems].sort(
      (a, b) => rank(a.verdict) - rank(b.verdict) || a.component.localeCompare(b.component) || a.node.localeCompare(b.node),
    );
    for (const f of sorted) {
      const where = `${f.component} · ${f.member} · ${f.node}${f.field ? ` [${f.field}]` : ''}`;
      if (f.verdict === 'WRONG-TOKEN') L.push(`  ✗ WRONG-TOKEN   ${where}\n                   got ${f.got}  ·  want ${f.want}`);
      else if (f.verdict === 'UNBOUND') L.push(`  · UNBOUND       ${where}\n                   want ${f.want}  ·  file binds nothing`);
      else if (f.verdict === 'EXTRA') L.push(`  + EXTRA         ${where}\n                   binds ${f.got}  ·  ledger covers no binding here`);
      else L.push(`  ? UNKNOWN-NODE  ${where}\n                   binds ${f.got}  ·  ledger cannot place this node`);
    }
  }

  L.push('\n  Measurement harness — reports and exits 0 (tools/CLAUDE.md). A live file is not in CI.');
  return L.join('\n');
};

// ── INGEST ──────────────────────────────────────────────────────────────────────────────────────
export const parseExport = (raw: string): BindingExport => {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    throw new Error(`export is not valid JSON: ${(e as Error).message}`);
  }
  const d = doc as Partial<BindingExport>;
  if (!d || d.format !== EXPORT_FORMAT)
    throw new Error(`export.format must be '${EXPORT_FORMAT}' (got ${JSON.stringify(d?.format)}) — is this the console snippet's output?`);
  if (typeof d.version !== 'number')
    throw new Error(`export.version must be a number (got ${JSON.stringify(d?.version)})`);
  if (d.version !== EXPORT_VERSION)
    console.error(`  note: export.version ${d.version} ≠ reconciler ${EXPORT_VERSION} — re-run the current snippet if the diff looks off.`);
  if (!Array.isArray(d.nodes)) throw new Error('export.nodes must be an array of { component, member, node, fields }');
  return d as BindingExport;
};

/** Shared entry point `audit.ts --reconcile` and this file's own `main` both call. */
export const runReconcile = (
  exportPath: string,
  defs: readonly ComponentDef[],
  opts: { asJson?: boolean } = {},
): void => {
  let raw: string;
  try {
    raw = readFileSync(exportPath, 'utf8');
  } catch (e) {
    console.error(`cannot read export '${exportPath}': ${(e as Error).message}`);
    process.exitCode = 2;
    return;
  }
  let exp: BindingExport;
  try {
    exp = parseExport(raw); // a malformed/mismatched FILE is a usage error, cleanly reported (not a crash)
  } catch (e) {
    console.error(`bad export: ${(e as Error).message}`);
    process.exitCode = 2;
    return;
  }
  // A node the ledger cannot place is handled gracefully INSIDE reconcile (UNKNOWN-NODE), never thrown.
  const result = reconcile(buildLedger(defs), exp);
  if (opts.asJson) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else console.log(formatReport(result));
  process.exitCode = 0; // a valid export always answers and exits 0 — drift is the answer, not an error
};

// ── SELF-TEST — the fixture round-trip (#1511 acceptance), built from the live ledger ──────────────
// Not a wired gate; a self-check the author runs. It proves the RECONCILE LOGIC over four scenarios
// synthesized from the current ledger, so it never goes stale against a hand-written fixture.
const selftest = (): void => {
  const ledger = buildLedger(componentDefs);

  // Pick a member with at least two distinct expected variables, so a WRONG-TOKEN swap has a real
  // alternative to point at — deterministic (first such member in ledger order).
  let picked: { component: string; member: string; bindings: { node: string; field: BindField; variable: string }[] } | null = null;
  for (const [component, members] of Object.entries(ledger.components)) {
    for (const m of members) {
      const vars = new Set(m.bindings.map((b) => b.variable));
      if (m.bindings.length >= 2 && vars.size >= 2) { picked = { component, member: m.member, bindings: m.bindings }; break; }
    }
    if (picked) break;
  }
  if (!picked) { console.error('SELFTEST: no ledger member with ≥2 distinct binds — cannot build scenarios'); process.exit(1); }

  // All-correct export: one node per (node, field) expected bind, actual = expected. Paths are
  // member-relative (`memberRelative`), exactly as the console snippet emits them from a live walk.
  const rel = (p: string): string => { const s = p.split('/').filter(Boolean); return `/${s.slice(1).join('/')}`; };
  const allCorrectNodes: ExportNode[] = [];
  const byNode = new Map<string, ExportNode>();
  for (const b of picked.bindings) {
    const node = rel(b.node);
    let en = byNode.get(node);
    if (!en) { en = { component: picked.component, member: picked.member, node, fields: {} }; byNode.set(node, en); allCorrectNodes.push(en); }
    en.fields[b.field] = b.variable;
  }
  const clone = (nodes: ExportNode[]): ExportNode[] => nodes.map((n) => ({ ...n, fields: { ...n.fields } }));
  const mk = (nodes: ExportNode[]): BindingExport => ({ format: EXPORT_FORMAT, version: EXPORT_VERSION, nodes });

  const allVars = [...new Set(picked.bindings.map((b) => b.variable))];
  const first = picked.bindings[0];
  const firstNode = rel(first.node);
  const otherVar = allVars.find((v) => v !== first.variable)!; // a DIFFERENT but valid ledger variable

  // Prepend a brand root to every bound value, exactly as #1097 materialization does to the plan's
  // root-less names — a synthetic stand-in for the live NB `ads/` root. `ROOT` is not a ledger group,
  // so `deriveRoot` picks it up; a clean rooted export must now normalize back to all-MATCH (it was
  // 100% WRONG-TOKEN before #1522), and a rooted export with one wrong bind must still surface it.
  const ROOT = 'ads';
  const rooted = (nodes: ExportNode[]): ExportNode[] =>
    clone(nodes).map((n) => ({ ...n, fields: Object.fromEntries(Object.entries(n.fields).map(([f, v]) => [f, `${ROOT}/${v}`])) as ExportNode['fields'] }));

  const scenarios: { name: string; exp: BindingExport; expect: Partial<Record<Verdict, number>> }[] = [
    { name: 'all-correct → all MATCH', exp: mk(clone(allCorrectNodes)), expect: { MATCH: picked.bindings.length, 'WRONG-TOKEN': 0, UNBOUND: 0, EXTRA: 0, 'UNKNOWN-NODE': 0 } },
    { name: 'root-prefixed but correct → all MATCH (#1522, was 100% WRONG-TOKEN)', exp: mk(rooted(allCorrectNodes)), expect: { MATCH: picked.bindings.length, 'WRONG-TOKEN': 0, UNBOUND: 0, EXTRA: 0, 'UNKNOWN-NODE': 0 } },
    {
      name: 'root-prefixed with one wrong → exactly one WRONG-TOKEN (#1522 — normalization must not mask drift)',
      exp: (() => { const n = rooted(allCorrectNodes); n.find((x) => x.node === firstNode)!.fields[first.field] = `${ROOT}/${otherVar}`; return mk(n); })(),
      expect: { 'WRONG-TOKEN': 1, MATCH: picked.bindings.length - 1, UNBOUND: 0, EXTRA: 0, 'UNKNOWN-NODE': 0 },
    },
    {
      name: 'one wrong-but-valid → exactly one WRONG-TOKEN',
      exp: (() => { const n = clone(allCorrectNodes); n.find((x) => x.node === firstNode)!.fields[first.field] = otherVar; return mk(n); })(),
      expect: { 'WRONG-TOKEN': 1, MATCH: picked.bindings.length - 1, UNBOUND: 0, EXTRA: 0, 'UNKNOWN-NODE': 0 },
    },
    {
      name: 'one blanked → exactly one UNBOUND',
      exp: (() => { const n = clone(allCorrectNodes); n.find((x) => x.node === firstNode)!.fields[first.field] = UNBOUND; return mk(n); })(),
      expect: { UNBOUND: 1, MATCH: picked.bindings.length - 1, 'WRONG-TOKEN': 0, EXTRA: 0, 'UNKNOWN-NODE': 0 },
    },
    {
      name: 'one stray node → exactly one UNKNOWN-NODE',
      exp: (() => { const n = clone(allCorrectNodes); n.push({ component: picked.component, member: picked.member, node: '/__stray__', fields: { fills: first.variable } }); return mk(n); })(),
      expect: { 'UNKNOWN-NODE': 1, MATCH: picked.bindings.length, 'WRONG-TOKEN': 0, UNBOUND: 0, EXTRA: 0 },
    },
  ];

  let failed = 0;
  console.log(`SELFTEST — scenarios over ${picked.component} · ${picked.member} (${picked.bindings.length} expected binds)\n`);
  for (const s of scenarios) {
    const r = reconcile(ledger, s.exp);
    const bad = Object.entries(s.expect).filter(([v, want]) => r.counts[v as Verdict] !== want);
    if (bad.length === 0) console.log(`  ✓ ${s.name}`);
    else {
      failed++;
      console.log(`  ✗ ${s.name}`);
      for (const [v, want] of bad) console.log(`      ${v}: expected ${want}, got ${r.counts[v as Verdict]}`);
    }
  }
  // EXTRA gets its own scenario: an expected node reporting a real bind on a field the ledger does not
  // cover there. Use a node that has `fills` expected and add `strokes` the ledger has no binding for.
  const fillsNode = allCorrectNodes.find((n) => n.fields.fills !== undefined && n.fields.strokes === undefined);
  if (fillsNode) {
    const n = clone(allCorrectNodes);
    n.find((x) => x.node === fillsNode.node)!.fields.strokes = first.variable;
    const r = reconcile(ledger, mk(n));
    if (r.counts.EXTRA === 1 && r.counts.MATCH === picked.bindings.length) console.log('  ✓ one uncovered field → exactly one EXTRA');
    else { failed++; console.log(`  ✗ one uncovered field → exactly one EXTRA (got EXTRA=${r.counts.EXTRA}, MATCH=${r.counts.MATCH})`); }
  }

  // ── #1523 COVERAGE ARMS — one per reach limit closed; each fails BY NAME when its fix is reverted ──
  const check = (name: string, exp: BindingExport, want: Partial<Record<Verdict, number>>): void => {
    const r = reconcile(ledger, exp);
    const bad = Object.entries(want).filter(([v, n]) => r.counts[v as Verdict] !== n);
    if (bad.length === 0) console.log(`  ✓ ${name}`);
    else {
      failed++;
      console.log(`  ✗ ${name}`);
      for (const [v, n] of bad) console.log(`      ${v}: expected ${n}, got ${r.counts[v as Verdict]}`);
    }
  };

  // GAP 1 — glyph-container ink the snippet reports on a NON-INSTANCE child shape (the FRAME/GROUP case)
  // must FOLD onto the ledger's container coordinate and MATCH, not skip the expected bind and score the
  // child UNKNOWN-NODE. Pick a NON-`icon` descendantFills bind at a non-root node so this arm is
  // independent of the loose-icon remap. Revert `foldDescendantInk` → MATCH 0, UNKNOWN-NODE 1.
  let df1: { component: string; member: string; node: string; variable: string } | null = null;
  for (const [component, members] of Object.entries(ledger.components)) {
    if (component === 'icon') continue;
    for (const m of members) {
      const b = m.bindings.find((x) => x.field === 'descendantFills' && rel(x.node) !== '/');
      if (b) { df1 = { component, member: m.member, node: rel(b.node), variable: b.variable }; break; }
    }
    if (df1) break;
  }
  if (!df1) { console.error('SELFTEST: no non-icon descendantFills bind at a non-root node — cannot build gap-1 arm'); process.exit(1); }
  check(
    '(#1523 gap 1) non-INSTANCE glyph-container ink folds up from the child shape → MATCH, not skipped + UNKNOWN-NODE',
    mk([
      { component: df1.component, member: df1.member, node: df1.node, fields: { fills: UNBOUND, strokes: UNBOUND } }, // FRAME container, no own descendantFills
      { component: df1.component, member: df1.member, node: `${df1.node}/Vector`, fields: { descendantFills: df1.variable } }, // ink one level down
    ]),
    { MATCH: 1, 'UNKNOWN-NODE': 0, UNBOUND: 0, 'WRONG-TOKEN': 0, EXTRA: 0 },
  );

  // GAP 2 — a loose `icon/<slug>` component with no variantProperties must REMAP onto `icon`/`name=<slug>`
  // and MATCH (its `/Vector` ink then folding onto the container via gap 1), not score UNKNOWN-NODE.
  // Revert `mapLooseComponents` → the coordinate cannot be placed and the ink is UNKNOWN-NODE.
  const iconMembers = ledger.components['icon'];
  const iconB = iconMembers?.[0]?.bindings.find((b) => b.field === 'descendantFills');
  if (!iconMembers?.length || !iconB) { console.error('SELFTEST: icon set / descendantFills bind missing — cannot build gap-2 arm'); process.exit(1); }
  const iconSlug = iconMembers[0].member.slice('name='.length); // 'arrow-down'
  check(
    '(#1523 gap 2) loose icon/<slug> with no variantProperties maps to name=<slug> → MATCH, not UNKNOWN-NODE',
    mk([
      { component: `icon/${iconSlug}`, member: `icon/${iconSlug}`, node: '/', fields: { fills: UNBOUND, strokes: UNBOUND } }, // COMPONENT root
      { component: `icon/${iconSlug}`, member: `icon/${iconSlug}`, node: '/Vector', fields: { descendantFills: iconB.variable } }, // the shape's own ink
    ]),
    { MATCH: 1, 'UNKNOWN-NODE': 0, UNBOUND: 0, 'WRONG-TOKEN': 0, EXTRA: 0 },
  );

  // GAP 3 — the group SETS carry an EMPTY ledger BY DESIGN: they declare no paint of their own, so the
  // label and rows paint from their NESTED defs. Pin that conclusion both ways: (a) checkbox-group /
  // radio-group have zero bindings, so a group-tagged bind is UNKNOWN-NODE (blind by design, NOT a hole);
  // (b) the same roles reconcile as MATCH under the atom/row sets that actually paint them. A paint slot
  // ever added to a group def would break (a); losing the atom/row coverage would break (b).
  const groupBindCount = ['checkbox-group', 'radio-group'].reduce(
    (n, id) => n + (ledger.components[id] ?? []).reduce((s, m) => s + m.bindings.length, 0), 0);
  const rowM = ledger.components['checkbox-row'][0];
  const rowB = rowM.bindings.find((b) => b.field === 'fills'); // /row/label → text ink
  const ctlM = ledger.components['checkbox-control'][0];
  const ctlB = ctlM.bindings.find((b) => b.field === 'strokes'); // /control → field border stroke
  const grpM = ledger.components['checkbox-group'][0];
  if (!rowB || !ctlB || !grpM) { console.error('SELFTEST: checkbox row/control/group members missing — cannot build gap-3 arm'); process.exit(1); }
  // (b) those binds under their real home — the atom/row sets — MATCH.
  const rCovered = reconcile(ledger, mk([
    { component: 'checkbox-row', member: rowM.member, node: rel(rowB.node), fields: { fills: rowB.variable } },
    { component: 'checkbox-control', member: ctlM.member, node: rel(ctlB.node), fields: { strokes: ctlB.variable } },
  ]));
  // (a) the SAME binds, tagged to the empty group set, are UNKNOWN-NODE — the group has nothing of its own.
  const rGroup = reconcile(ledger, mk([
    { component: 'checkbox-group', member: grpM.member, node: '/label/text', fields: { fills: rowB.variable } },
    { component: 'checkbox-group', member: grpM.member, node: '/row1/controlBox/control', fields: { strokes: ctlB.variable } },
  ]));
  const gap3ok = groupBindCount === 0 && rCovered.counts.MATCH === 2
    && rGroup.counts['UNKNOWN-NODE'] === 2 && rGroup.counts.MATCH === 0;
  if (gap3ok) console.log('  ✓ (#1523 gap 3) group ledgers empty by design; nested binds MATCH under the atom/row sets, UNKNOWN-NODE under the group');
  else {
    failed++;
    console.log('  ✗ (#1523 gap 3) group-set conclusion');
    console.log(`      group bindings expected 0, got ${groupBindCount}; atom/row MATCH expected 2, got ${rCovered.counts.MATCH}; group UNKNOWN-NODE expected 2, got ${rGroup.counts['UNKNOWN-NODE']} & MATCH expected 0, got ${rGroup.counts.MATCH}`);
  }

  console.log(`\n${failed === 0 ? 'SELFTEST PASSED' : `SELFTEST FAILED (${failed})`}`);
  process.exit(failed === 0 ? 0 : 1);
};

// ── ENTRY (guarded so `audit.ts` can import runReconcile without triggering this main) ─────────────
const isEntry = !!process.argv[1] && /reconcile\.ts$/.test(process.argv[1]);
if (isEntry) {
  if (process.argv.includes('--selftest')) {
    selftest();
  } else {
    const asJson = process.argv.includes('--json');
    const path = process.argv.slice(2).find((a) => !a.startsWith('--'));
    if (!path) {
      console.error('usage: npx tsx tools/binding-audit/reconcile.ts <export.json> [--json]');
      console.error('   or: npx tsx tools/binding-audit/reconcile.ts --selftest');
      process.exit(2);
    }
    runReconcile(path, componentDefs, { asJson });
  }
}
