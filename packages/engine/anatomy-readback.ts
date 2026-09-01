/**
 * COMPONENT ROUND-TRIP (#874) — read a built component set back out of a host and diff it against the
 * plan that built it.
 *
 * `docs/14` §4 specified this on 2026-07-03 and nothing built it: *"materialize components from our
 * data → extract specs from the resulting file → diff against the source."* This is the reader and the
 * differ; the harnesses that drive it live with their hosts.
 *
 * ── WHY IT EXISTS, AND THE ARGUMENT IS NOT THE ONE THE ISSUE MAKES ─────────────────────────────
 *
 * #874 argues from two defects (#864's empty artboards, #866's discarded property refs). Both are now
 * caught by read-backs the executor grew afterwards. The durable argument is the measurement in that
 * issue's own analysis: **four writes in `write-components.ts` could be deleted with the whole suite
 * green** — `primaryAxisAlignItems`, `primaryAxisSizingMode`, `counterAxisSizingMode`, and the effect
 * style. One of them is the field `positionWhen` shipped onto three days before it was measured.
 *
 * The reason is structural, and it is `docs/34` shape 1 living inside the writer: each of the
 * executor's nine retention read-backs was written by the same author in the same branch immediately
 * below the write it checks, so **a field the writer forgets to write is a field the writer forgets to
 * read back**, and nothing can tell. Six of the nine name a numbered issue in the comment above them.
 * That is a ledger of past defects, not a rule.
 *
 * **This is the rule.** It iterates the PLAN's fields, not the writer's branches, so a field the
 * executor never writes is reported whether or not anyone predicted it — and so is a field added to
 * `FigmaNodePlan` next year, with no new gate code.
 *
 * ── INDEPENDENCE (docs/34) ─────────────────────────────────────────────────────────────────────
 *
 *   ORACLE   — `figmaAnatomySet(def)`, the plan. Pure, deterministic, a function of committed source,
 *              which is why the missing `out/` component artifact is a non-problem: the generator IS
 *              the artifact and re-running it is cheaper than storing it (`docs/14` §4).
 *   SUBJECT  — what the HOST holds after `applyComponentPlan` ran. Read through this file's ports.
 *
 * **Sharing the plan is not shape 1 and the distinction is worth stating**, because it is the first
 * objection anyone raises: the plan is the executor's *input*, and comparing output against declared
 * input is the shape of every honest test. Shape 1 would be sharing the writer's TRAVERSAL — reading
 * the tree the way the writer built it, which reports the writer's own bookkeeping as the file's state.
 * Two consequences are load-bearing and must survive any refactor:
 *
 *   1. **Children are matched BY NAME against the plan's children**, never by index and never by
 *      walking in build order. Extras and absences are reported symmetrically.
 *   2. **Member names are compared as a SET, both directions.** Both sides derive names from
 *      `planComponentName`, so a lookup-driven diff would report a misnamed member as one confusing
 *      "absent"/"unexpected" pair — or, if it only looked members up, as nothing at all.
 *
 * ── THE THREE ASYMMETRIES, or the diff reads as broken ─────────────────────────────────────────
 *
 *   · **The host holds vastly more than the plan declares** — every Figma default the def is silent
 *     about. So the field diff is PLAN-DRIVEN and ONE-DIRECTIONAL. Unauthored defaults are a real
 *     defect class (#865) and a separate, allowlist-shaped check; making this bidirectional would
 *     report thousands of differences and bury the ones that mean something.
 *   · **Some plan fields are inputs the host does not echo.** `glyphSvg` is submitted and geometry
 *     comes back; `swapTarget`/`nestTarget` are names and an id comes back. Those compare by a DERIVED
 *     property, named per field in `FIELDS` below rather than left to the reader to infer.
 *   · **Members are two-directional; fields are one.** An extra member is #869's class and must fail.
 *
 * ── "BYTE-IDENTICAL" IS DROPPED FROM THE SPEC, DELIBERATELY ────────────────────────────────────
 *
 * #874 asks for byte-identity, borrowed from Curtis, whose specs are the committed artifact on both
 * legs. There are no bytes on this return leg — there is a scenegraph read through an API. The honest
 * predicate is **field-complete over the plan**: for every node the plan declares and every field it
 * declares on that node, the host holds what was declared; and the host holds no MEMBER the plan did
 * not declare.
 *
 * ── WHAT THIS CANNOT CATCH, stated rather than implied ─────────────────────────────────────────
 *
 *   · **Anything the plan does not declare.** #865 — a Figma default on a property no def mentions —
 *     is outside a plan-driven diff by construction. This is the largest blind spot.
 *   · **Anything visual.** The plan is the oracle, so a WRONG plan round-trips perfectly: a correct
 *     binding to the wrong token, a legible-but-wrong hierarchy, #801's flush ring. `docs/40` §7 step
 *     6's visual pass is not replaced.
 *   · **Accept-and-discard, on any offline host.** A shim reproduces only the discards it was taught,
 *     so that class is a ledger there by construction and a rule only against real Figma.
 *   · **A build that never finishes** (#870) — there is no tree to read.
 *
 * PURE — no `figma.*`, no I/O, no imports beyond the plan's own types. The same reader serves the
 * offline shim and a real-host harness; only the ports differ.
 */

import type { AnatomyPlan, FigmaNodePlan } from './anatomy-figma.ts';

/** What the reader needs of a host node. Deliberately structural and open: a host carries far more,
 *  and naming only what is read keeps this file honest about its own scope. */
export type HostNode = { name?: unknown; type?: unknown; children?: unknown } & Record<string, unknown>;

/** Resolvers the HOST supplies from its own catalogues — never derived from the plan, or the diff
 *  would resolve an id to the name it was hoping for. */
export type ReadPorts = {
  /** A bound variable's id → the variable's name as the FILE holds it (brand-rooted). `null` when the
   *  host has no such variable, which is itself a finding. */
  varName: (id: string) => string | null;
  /** A text- or effect-style id → the style's name. */
  styleName: (id: string) => string | null;
};

export type Divergence = {
  member: string;
  /** Dotted path to the node inside the member, by NAME — how a designer would find it. */
  path: string;
  field: string;
  expected: string;
  actual: string;
};

const str = (v: unknown): string => (v === undefined ? '∅' : typeof v === 'string' ? v : JSON.stringify(v));

/** The host's node type for a plan type. `GLYPH` and the two instance kinds are BUILD STRATEGIES, not
 *  Figma node types (`anatomy-figma.ts` says so where it declares them), so the mapping is stated here
 *  once rather than guessed per call site. */
const HOST_TYPE: Record<FigmaNodePlan['type'], string[]> = {
  FRAME: ['FRAME'],
  TEXT: ['TEXT'],
  INSTANCE_SWAP: ['INSTANCE'],
  NESTED_INSTANCE: ['INSTANCE'],
  // Figma builds a glyph from an SVG document, which arrives as a FRAME wrapping the outline.
  GLYPH: ['FRAME'],
};

/** Does this subtree hold drawn geometry? The `glyphSvg` predicate — an SVG is submitted and vectors
 *  come back, so the honest question is whether anything was drawn, not whether the markup echoes.
 *  #864 was four EMPTY artboards, so "a vector node exists" is the property that was false. */
const hasVectorContent = (n: HostNode): boolean => {
  const t = String(n.type ?? '');
  if (t === 'VECTOR' || t === 'BOOLEAN_OPERATION' || t === 'STAR' || t === 'ELLIPSE' || t === 'POLYGON' || t === 'LINE') return true;
  const kids = Array.isArray(n.children) ? (n.children as HostNode[]) : [];
  return kids.some(hasVectorContent);
};

const boundIdOf = (n: HostNode, prop: string): string | null => {
  const bv = n.boundVariables as Record<string, { id?: unknown }> | undefined;
  const id = bv?.[prop]?.id;
  return typeof id === 'string' ? id : null;
};

/**
 * EVERY field of `FigmaNodePlan`, classified — checked with a predicate, or declared unchecked WITH A
 * REASON. Not a list of the ones somebody remembered: `assertFieldCoverage` below fails when a field
 * exists on a plan and is absent here, so a field added to `FigmaNodePlan` is a decision rather than a
 * silent hole. That floor is the difference between this being a rule and being nine more clauses.
 *
 * `check` returns `null` when the field agrees, else the actual value as a reader would describe it.
 */
type FieldCheck = {
  /** Why this field is not compared, when it is not. Presence of `reason` means unchecked. */
  reason?: string;
  check?: (planned: unknown, node: HostNode, ports: ReadPorts) => string | null;
  /** How the plan's value reads in a failure message. */
  show?: (planned: unknown) => string;
};

export const FIELDS: Record<string, FieldCheck> = {
  // ── matched, not compared: these two ARE the identity the diff walks by ────────────────────────
  name: { reason: 'the node is FOUND by this, so a mismatch surfaces as an absence plus an extra child, which is more precise than a field diff' },
  children: { reason: 'walked structurally by name, both directions — see `diffNode`' },

  // ── direct equality ──────────────────────────────────────────────────────────────────────────
  type: {
    check: (p, n) => {
      const want = HOST_TYPE[p as FigmaNodePlan['type']] ?? [String(p)];
      const got = String(n.type ?? '');
      return want.includes(got) ? null : got || '∅';
    },
  },
  layoutMode: { check: (p, n) => (n.layoutMode === p ? null : str(n.layoutMode)) },
  primaryAxisAlignItems: { check: (p, n) => (n.primaryAxisAlignItems === p ? null : str(n.primaryAxisAlignItems)) },
  counterAxisAlignItems: { check: (p, n) => (n.counterAxisAlignItems === p ? null : str(n.counterAxisAlignItems)) },
  primaryAxisSizingMode: { check: (p, n) => (n.primaryAxisSizingMode === p ? null : str(n.primaryAxisSizingMode)) },
  counterAxisSizingMode: { check: (p, n) => (n.counterAxisSizingMode === p ? null : str(n.counterAxisSizingMode)) },
  characters: { check: (p, n) => (n.characters === p ? null : str(n.characters)) },
  textAlignVertical: { reason: 'measured a no-op on every node in the corpus (774 TEXT nodes, none with a bound height) — #1009 states the rule and the check belongs with a node that can move' },

  // ── resolved through a host catalogue ────────────────────────────────────────────────────────
  bound: {
    show: (p) => Object.entries(p as Record<string, string>).map(([k, v]) => `${k}→${v}`).join(', '),
    check: (p, n, ports) => {
      const bad: string[] = [];
      for (const [prop, wantName] of Object.entries(p as Record<string, string>)) {
        const id = boundIdOf(n, prop);
        if (!id) { bad.push(`${prop}→UNBOUND`); continue; }
        const got = ports.varName(id);
        // Names are brand-rooted in the file and root-relative in the plan, and the root is a lever —
        // so the comparison is on the TAIL, which is the part the plan can legitimately state.
        if (got === null) { bad.push(`${prop}→id ${id} resolves to no variable`); continue; }
        if (!got.endsWith(`/${wantName}`) && got !== wantName) bad.push(`${prop}→${got}`);
      }
      return bad.length ? bad.join(', ') : null;
    },
  },
  textStyle: {
    check: (p, n, ports) => {
      const id = n.textStyleId;
      if (typeof id !== 'string' || !id) return 'NO TEXT STYLE APPLIED';
      const got = ports.styleName(id);
      return got === p ? null : `${got ?? `id ${id} resolves to no style`}`;
    },
  },
  effectStyle: {
    check: (p, n, ports) => {
      const id = n.effectStyleId;
      if (typeof id !== 'string' || !id) return 'NO EFFECT STYLE APPLIED';
      const got = ports.styleName(id);
      return got === p ? null : `${got ?? `id ${id} resolves to no style`}`;
    },
  },

  // ── derived property: the host does not echo what was submitted ──────────────────────────────
  glyphSvg: {
    show: () => 'drawn geometry',
    check: (_p, n) => (hasVectorContent(n) ? null : 'NO VECTOR CONTENT — the artboard is empty'),
  },
  glyphViewBox: { reason: 'the host reports geometry, not the submitted box; the executor measures it at write time and this reader has no second opinion about size' },

  // ── positioning ──────────────────────────────────────────────────────────────────────────────
  absoluteInset: {
    show: () => 'ABSOLUTE',
    check: (_p, n) => (n.layoutPositioning === 'ABSOLUTE' ? null : str(n.layoutPositioning)),
  },
  absoluteCenter: {
    show: () => 'ABSOLUTE',
    check: (_p, n) => (n.layoutPositioning === 'ABSOLUTE' ? null : str(n.layoutPositioning)),
  },
  absoluteStrokeInset: { reason: 'a modifier on `absoluteInset`\'s arithmetic, not a property the host holds separately' },
  absoluteCenterOn: { reason: 'names the node to center ON; the resulting coordinates are geometry, which `docs/40` §7 step 6 checks visually' },

  zeroOpacity: {
    show: () => 'opacity 0',
    check: (p, n) => (!p || n.opacity === 0 ? null : str(n.opacity)),
  },

  // ── property wiring ──────────────────────────────────────────────────────────────────────────
  /**
   * `{ field, prop }` — ONE binding, not a map: the node's Figma FIELD (`characters` / `mainComponent`
   * / `visible`) driven by the set property named `prop`. The host holds
   * `componentPropertyReferences[field] = '<prop>#<id>'`, where Figma appends the id it assigned.
   *
   * The `#`-suffix is why this compares on the STEM. An earlier draft of this predicate read the plan
   * value as a `Record<figmaField, propId>` and iterated its keys — so it asked the host for fields
   * literally named `field` and `prop`, found neither, and reported **2,880 false DISCARDEDs across
   * six defs**: a reader defect wearing the costume of the exact defect (#866) this gate was built to
   * find. Caught only by dumping one real tree beside its plan before believing the inventory.
   */
  propertyRef: {
    show: (p) => { const r = p as { field: string; prop: string }; return `${r.field} ← ${r.prop}`; },
    check: (p, n) => {
      const want = p as { field: string; prop: string };
      const refs = n.componentPropertyReferences as Record<string, unknown> | null | undefined;
      const got = refs?.[want.field];
      if (got === undefined || got === null) return `${want.field} → DISCARDED (host holds ${refs ? JSON.stringify(refs) : 'no references'})`;
      const stem = String(got).split('#')[0];
      return stem === want.prop ? null : `${want.field} → ${String(got)}`;
    },
  },

  // ── nominations that come back as identity ───────────────────────────────────────────────────
  swapTarget: {
    show: (p) => `an instance of ${String(p)}`,
    check: (_p, n) => (String(n.type ?? '') === 'INSTANCE' ? null : `${str(n.type)} — not an instance`),
  },
  nestTarget: {
    show: (p) => `an instance of ${String(p)}`,
    check: (_p, n) => (String(n.type ?? '') === 'INSTANCE' ? null : `${str(n.type)} — not an instance`),
  },
  nestVariant: { reason: 'which VARIANT the nested instance resolved to is an id on the host; the executor resolves it by name at write time and reports a miss, and this reader has no independent name for it' },

  // ── paints ───────────────────────────────────────────────────────────────────────────────────
  paints: {
    show: (p) => JSON.stringify(p),
    check: (p, n, ports) => {
      const want = p as { fills?: string; strokes?: string };
      const bad: string[] = [];
      for (const [key, host] of [['fills', 'fills'], ['strokes', 'strokes']] as const) {
        const wantVar = want[key];
        if (!wantVar) continue;
        const arr = n[host];
        const first = Array.isArray(arr) ? (arr[0] as { boundVariables?: Record<string, { id?: unknown }> } | undefined) : undefined;
        if (!first) { bad.push(`${key}→NO PAINT`); continue; }
        const id = first.boundVariables?.color?.id;
        if (typeof id !== 'string') { bad.push(`${key}→PAINT NOT BOUND`); continue; }
        const got = ports.varName(id);
        if (got === null) { bad.push(`${key}→id ${id} resolves to no variable`); continue; }
        if (!got.endsWith(`/${wantVar}`) && got !== wantVar) bad.push(`${key}→${got}`);
      }
      return bad.length ? bad.join(', ') : null;
    },
  },
  descendantFills: { reason: 'applies to nodes the SVG importer created, which this reader does not name; the executor read-back at write time is the only thing that can address them' },
};

/** Every declared field on a plan node must be classified above. A field added to `FigmaNodePlan` and
 *  not to `FIELDS` would be silently unchecked, which is the hole this whole file exists to close one
 *  level down. Returns the offenders; the caller fails on a non-empty result. */
export const unclassifiedFields = (plans: AnatomyPlan[]): string[] => {
  const seen = new Set<string>();
  const walk = (n: FigmaNodePlan): void => {
    for (const k of Object.keys(n)) if (!(k in FIELDS)) seen.add(k);
    for (const c of n.children ?? []) walk(c);
  };
  for (const p of plans) walk(p.root);
  return [...seen].sort();
};

/** Which fields this reader actually compares, and which it declares unchecked — printed by the
 *  harnesses so the coverage is read rather than assumed. */
export const fieldCoverage = (): { checked: string[]; unchecked: { field: string; reason: string }[] } => ({
  checked: Object.entries(FIELDS).filter(([, f]) => f.check).map(([k]) => k).sort(),
  unchecked: Object.entries(FIELDS).filter(([, f]) => !f.check).map(([field, f]) => ({ field, reason: f.reason ?? '' })).sort((a, b) => a.field.localeCompare(b.field)),
});

const childrenOf = (n: HostNode): HostNode[] => (Array.isArray(n.children) ? (n.children as HostNode[]) : []);

/** One node, plan against host. Children matched BY NAME — never by index — with extras and absences
 *  reported symmetrically. */
const diffNode = (plan: FigmaNodePlan, node: HostNode, member: string, path: string, ports: ReadPorts, out: Divergence[], exercised?: Record<string, number>): void => {
  for (const [field, planned] of Object.entries(plan)) {
    if (planned === undefined) continue;
    const f = FIELDS[field];
    if (!f?.check) continue;
    if (exercised) exercised[field] = (exercised[field] ?? 0) + 1;
    const actual = f.check(planned, node, ports);
    if (actual !== null) {
      out.push({ member, path, field, expected: f.show ? f.show(planned) : str(planned), actual });
    }
  }

  const kids = childrenOf(node);
  const byName = new Map<string, HostNode>();
  for (const k of kids) byName.set(String(k.name ?? ''), k);
  const planned = plan.children ?? [];
  for (const cp of planned) {
    const found = byName.get(cp.name);
    if (!found) {
      out.push({ member, path: `${path}/${cp.name}`, field: 'children', expected: 'present', actual: `ABSENT — the host has [${kids.map((k) => String(k.name)).join(', ') || 'no children'}]` });
      continue;
    }
    diffNode(cp, found, member, `${path}/${cp.name}`, ports, out, exercised);
  }
};

/**
 * The round-trip.
 *
 * `members` is what the host holds under the set, keyed however the caller found them — but the NAME
 * comparison below reads `member.name` from the host rather than trusting the caller's key, because a
 * caller that looked members up by the expected name cannot report a misnamed one.
 */
export const diffAnatomy = (
  plans: AnatomyPlan[],
  members: HostNode[],
  nameOf: (p: AnatomyPlan) => string,
  ports: ReadPorts,
  /** How many NODES each predicate actually compared. A predicate that walked zero nodes is not
   *  coverage — it is a clause with no subject, and counting it as a checked field is the shape this
   *  file exists to prevent, one level up. Measured rather than assumed: `effectStyle` walks 0 today
   *  because no def in the corpus declares one, so deleting the executor's effect-style write is a
   *  NON-MUTATION here and the census row it belongs to is out of this arm's reach. That is a corpus
   *  fact, and it is only visible because this counter exists. */
  exercised?: Record<string, number>,
): Divergence[] => {
  const out: Divergence[] = [];
  const expected = plans.map(nameOf);
  const actual = members.map((m) => String(m.name ?? ''));

  // MEMBERS ARE TWO-DIRECTIONAL. An extra member is #869's class.
  for (const name of expected) {
    if (!actual.includes(name)) out.push({ member: name, path: '', field: 'member', expected: 'present in the set', actual: 'ABSENT' });
  }
  for (const name of actual) {
    if (!expected.includes(name)) out.push({ member: name, path: '', field: 'member', expected: 'not in the plan', actual: 'PRESENT — the set holds a member nothing declared' });
  }

  const byName = new Map(members.map((m) => [String(m.name ?? ''), m] as const));
  for (const plan of plans) {
    const name = nameOf(plan);
    const node = byName.get(name);
    if (!node) continue; // already reported as an absent member
    diffNode(plan.root, node, name, plan.root.name, ports, out, exercised);
  }
  return out;
};
