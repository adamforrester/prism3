/**
 * Plugin COMPONENT write-adapter test (#487 step 5) — drives the REAL `applyComponentPlan` executor
 * against an in-memory `ComponentsApi` shim, so the whole component-set assembly is verified with no
 * live Figma.
 *
 *   npx tsx apps/plugin/test-write-components.ts
 *
 * The shim is modelled on the engine's `figmaStub` (`packages/engine/test.ts`), which is what gates the
 * PASTE path against the same plans — deliberately so, because the parity gate in `test.ts` compares
 * the two executors' results and a shim that modelled a different Figma would make that comparison
 * meaningless. Everything it models, it models because a permissive stub let a real defect pass:
 *
 *   · width/height are DERIVED (fixed-when-bound, else hug + padding + border on the hug axis only).
 *     A constant-measuring stub cannot catch an arithmetic error — a 4x4 focus ring on a real button
 *     passed the engine's entire suite green, including the assertion written to catch it.
 *   · a TEXT node measures its CHARACTERS, so the centering offset is non-zero and a spinner CENTERED
 *     is distinguishable from a spinner PINNED TO A CORNER.
 *   · `layoutPositioning` is SILENTLY REJECTED outside an auto-layout parent, which is the only part
 *     of it worth modelling — a stub that stored the value would let the read-back be deleted green.
 *   · a set's box does NOT follow its members, which is the entire reason the executor calls `resize`.
 *   · `addComponentProperty` RENAMES a duplicate rather than refusing it, and refuses a non-node-id
 *     `INSTANCE_SWAP` default; `componentPropertyDefinitions` THROWS on duplicate member names while
 *     `addComponentProperty` keeps succeeding.
 *   · `componentPropertyReferences` naming an unknown property throws.
 *   · `strokesIncludedInLayout` starts TRUE (Figma's default), so border-box has something to prove.
 *
 * Asserts: the 21-variant button grid assembles into one set with the right axes, grid and box; every
 * binding, paint, text style and swap lands; the focus ring is absolute and 2px larger on every side;
 * the pending spinner is absolute and centered; the footprint is stable across `state`/`appearance`;
 * properties are declared on the set after combining and wired to EVERY member; a re-run is idempotent;
 * and the degraded cases (missing variables, missing swap target, missing shared component, a stray
 * member, a duplicate member name) are reported as misses rather than thrown or silently dropped.
 */
import { figmaAnatomyPlan, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, planSetProperties, planComponentName } from '@prism3/engine/anatomy-figma';
import { button } from '@prism3/engine/components/button';
import { applyComponentPlan } from './src/write-components';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ---- the in-memory components shim --------------------------------------------------------
type Node = Record<string, unknown>;
/** A PAGE that outlives one run, because idempotency's whole premise is that run 2 finds what run 1
 *  left in the file. A shim that forgot between runs could not exercise it at all. */
type Page = { children: Node[] };

/** A NUMERIC value per variable, deterministic from the name, non-zero, and DIFFERENT per name — the
 *  last part is not cosmetic: equal values would let the executor bind the wrong variable and still
 *  measure right. Same function the engine's stub uses, so the two paths measure identically. */
const varValue = (name: string): number => 8 + ([...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 7) * 4;

type ShimOpts = { vars?: string[]; styles?: string[]; effects?: string[]; comps?: string[]; page?: Page; insetValue?: unknown };

const makeShim = (opts: ShimOpts = {}) => {
  const names = new Set(opts.vars ?? []);
  const page = opts.page;
  // Members LEAVE the page when they join a set, as they do live — otherwise `set.children` and the
  // page disagree about who owns what, which is the state the skip-by-name check reads.
  const takeFromPage = (kids: Node[]): void => {
    if (!page) return;
    for (const k of kids) { const i = page.children.indexOf(k); if (i >= 0) page.children.splice(i, 1); }
  };
  const mkVar = (name: string) => ({ id: `V:${name}`, name, value: varValue(name), resolveForConsumer: () => ({ value: opts.insetValue ?? 2 }) });

  const mkNode = (type: string): Node => {
    const node: Node = {
      type, name: '', boundVariables: {} as Record<string, unknown>,
      constrainProportions: false, fills: [] as unknown[], strokes: [] as unknown[], children: [] as Node[],
      // `strokeWeight` starts at 0 so the executor's `if(!node.strokeWeight)` default fires as it does
      // live; `strokesIncludedInLayout` starts TRUE because that is Figma's default and the thing
      // border-box has to override.
      ...(type === 'FRAME' ? { strokeWeight: 0, strokesIncludedInLayout: true } : {}),
      characters: '',
      opacity: 1,
      componentPropertyReferences: null as Record<string, string> | null,
      x: 0, y: 0, constraints: null as unknown,
      parent: null as Node | null,
      _absolute: false,
      // FIXED-OR-HUG. A bound axis is FIXED at its variable's value; everything else hugs its FLOW
      // children plus its own padding, with the border term on the hug axis only (a fixed axis absorbs
      // a stroke silently — the #503 finding restated as a model). ABSOLUTE children are excluded from
      // the hug, as they are live: a ring that grew its own target would be circular.
      get width() {
        const bv = node.boundVariables as Record<string, { value?: number }>;
        const stroked = (node.strokes as unknown[]).length > 0 && node.strokesIncludedInLayout !== false;
        if (bv.width) return bv.width.value ?? 0;
        if (node.type === 'TEXT') return ((node.characters as string) || '').length * 6;
        const pad = (bv.paddingLeft?.value ?? 0) + (bv.paddingRight?.value ?? 0);
        const hug = ((node.children as Node[]) ?? []).filter((c) => c.layoutPositioning !== 'ABSOLUTE')
          .reduce((a, c) => a + ((c.width as number) || 0), 0);
        return pad + hug + (stroked ? 2 * (node.strokeWeight as number) : 0);
      },
      // BOTH axes, because a claim about only one is half-unfalsifiable: with `height` a plain 0, a ring
      // resized to `(node.width + off*2, off*2)` — its height ignoring its target entirely — passes the
      // geometry assertion written to catch it, since `0 + 4` and `4` are the same number.
      get height() {
        const bv = node.boundVariables as Record<string, { value?: number }>;
        const stroked = (node.strokes as unknown[]).length > 0 && node.strokesIncludedInLayout !== false;
        if (bv.height) return bv.height.value ?? 0;
        const pad = (bv.paddingTop?.value ?? 0) + (bv.paddingBottom?.value ?? 0);
        const flow = ((node.children as Node[]) ?? []).filter((c) => c.layoutPositioning !== 'ABSOLUTE');
        // Max, not sum: the row is HORIZONTAL, so the cross axis hugs the tallest child.
        return pad + flow.reduce((a, c) => Math.max(a, (c.height as number) || 0), 0) + (stroked ? 2 * (node.strokeWeight as number) : 0);
      },
      // The VALUE alongside the id, because a bound dimension is what SIZES the node live — the getters
      // above read it. Without it the binding is bookkeeping and every node measures the same.
      setBoundVariable(prop: string, v: { id: string; value?: number }) {
        (node.boundVariables as Record<string, unknown>)[prop] = { id: v.id, value: v.value };
      },
      setTextStyleIdAsync: async (id: string) => { node._textStyleId = id; },
      setEffectStyleIdAsync: async (id: string) => { node._effectStyleId = id; },
      // ABSOLUTE POSITIONING with its REJECTION CASE, which is the only part worth modelling: Figma
      // ignores `layoutPositioning` on a child of a non-auto-layout parent, and it ignores it SILENTLY.
      get layoutPositioning() {
        const p = node.parent as Node | null;
        return node._absolute && p && p.layoutMode ? 'ABSOLUTE' : 'AUTO';
      },
      set layoutPositioning(v: string) { node._absolute = v === 'ABSOLUTE'; },
      // Settable dimensions, because an absolute child is sized rather than bound — replaces BOTH
      // derived getters for any node actually resized, which is only the ring.
      resize(w: number, h: number) {
        Object.defineProperty(node, 'width', { configurable: true, value: w, writable: true });
        Object.defineProperty(node, 'height', { configurable: true, value: h, writable: true });
      },
      appendChild(c: Node) { c.parent = node; (node.children as Node[]).push(c); },
      // Walks descendants for real. The executor finds each part by NAME inside every member to wire its
      // property reference, so a stub finding nothing would let the whole wiring loop no-op with every
      // assertion below still passing.
      findAll(pred?: (n: unknown) => boolean) {
        const all: Node[] = [];
        const walk = (n: Node): void => { for (const c of (n.children as Node[]) ?? []) { all.push(c); walk(c); } };
        walk(node);
        return pred ? all.filter(pred) : all;
      },
      findOne(pred: (n: unknown) => boolean) { return (node.findAll as (p?: unknown) => Node[])(pred)[0] ?? null; },
    };
    return node;
  };

  // A reference naming a property that does not exist THROWS in real Figma. Installed per-set rather
  // than in `mkNode` because it needs the set that owns the definitions, which does not exist yet when
  // a node is built.
  const guardRefs = (set: Node): void => {
    for (const n of [set, ...(set.findAll as () => Node[])()]) {
      let held: Record<string, string> | null = null;
      Object.defineProperty(n, 'componentPropertyReferences', {
        configurable: true,
        get: () => held,
        set: (v: Record<string, string>) => {
          const known = (set.declaredIds as () => string[])();
          for (const id of Object.values(v ?? {}))
            if (!known.includes(id)) throw new Error(`in set_componentPropertyReferences: Could not find a component property with name: '${id}'`);
          held = v;
        },
      });
    }
  };

  const shim = {
    variables: {
      getLocalVariablesAsync: async () => [...names].map(mkVar),
      // Real Figma RETURNS a new paint rather than mutating — modelled, because the executor's
      // assignment back into the array is exactly what a forgotten `node.fills = [p]` would skip.
      setBoundVariableForPaint: (p: object, field: string, v: { id: string }) => ({ ...p, boundVariables: { [field]: { id: v.id } } }),
    },
    // `fontName` on every style, because the executor loads the STYLE'S font before writing text.
    getLocalTextStylesAsync: async () => (opts.styles ?? []).map((name) => ({ id: `S:${name}`, name, fontName: { family: 'Inter', style: 'Semi Bold' } })),
    getLocalEffectStylesAsync: async () => (opts.effects ?? []).map((name: string) => ({ id: `E:${name}`, name })),
    loadFontAsync: async () => {},
    loadAllPagesAsync: async () => {},
    // A COMPONENT the executor can instantiate, so the swap path is exercised rather than always
    // degrading to a placeholder. `createInstance` returns a node with a VECTOR inside, because the
    // icon ink routes to the vector and not the instance. `id` as well as `name`, because an
    // INSTANCE_SWAP default must be a node ID.
    root: { findAllWithCriteria: () => (opts.comps ?? []).map((name, i) => ({
      name, id: `73:${37 + i}`,
      createInstance: () => { const inst = mkNode('INSTANCE'); const vec = mkNode('VECTOR'); inst.findAll = () => [vec]; inst.findOne = () => null; return inst; },
    })) },
    createText: () => mkNode('TEXT'),
    createFrame: () => mkNode('FRAME'),
    createComponentFromNode: (n: Node) => n,
    combineAsVariants: (members: Node[]) => {
      const set = mkNode('COMPONENT_SET');
      set.id = 'SET:1';
      set.children = members;
      takeFromPage(members);
      // A SET RESIZES, and its box does NOT follow its members — the whole reason the executor calls
      // `resize` at all. A stub whose width tracked its children would let that call be deleted green.
      let w = 0, h = 0;
      Object.defineProperties(set, {
        width: { configurable: true, get: () => w },
        height: { configurable: true, get: () => h },
      });
      set.resize = (nw: number, nh: number) => { w = nw; h = nh; };
      set.appendChild = (c: Node) => {
        (set.children as Node[]).push(c);
        takeFromPage([c]);
        guardRefs({ ...set, declaredIds: set.declaredIds, findAll: () => [c, ...((c.findAll as () => Node[])?.() ?? [])] } as Node);
      };
      const defs: Record<string, { type: string; defaultValue?: unknown; variantOptions?: string[] }> = {};
      let seq = 100;
      // A GETTER, not a snapshot: the axes Figma derives come from the member NAMES, so a set that
      // gained members by `appendChild` must report the wider axis. And a DUPLICATE member name makes
      // this getter THROW live while `addComponentProperty` keeps succeeding — precisely the trap the
      // executor's try/catch exists for.
      Object.defineProperty(set, 'componentPropertyDefinitions', {
        configurable: true,
        get: () => {
          const kids = set.children as Node[];
          const kidNames = kids.map((m) => String(m.name));
          if (new Set(kidNames).size !== kidNames.length) throw new Error('in get_componentPropertyDefinitions: Component set has existing errors');
          const out: Record<string, { type: string; defaultValue?: unknown; variantOptions?: string[] }> = {};
          for (const n of kidNames)
            for (const kv of n.split(', ')) {
              const [k, v] = kv.split('=');
              const d = (out[k] ??= { type: 'VARIANT', variantOptions: [] });
              if (!d.variantOptions!.includes(v)) d.variantOptions!.push(v);
            }
          return Object.assign(out, defs);
        },
      });
      set.addComponentProperty = (name: string, type: string, defaultValue: unknown) => {
        if (type === 'INSTANCE_SWAP' && typeof defaultValue !== 'string')
          throw new Error('in addComponentProperty: Property value is incompatible with component property type');
        if (type === 'BOOLEAN' && typeof defaultValue !== 'boolean')
          throw new Error('in addComponentProperty: Property value is incompatible with component property type');
        // RENAMED, not refused — the behavior that makes a count-based read-back useless.
        let bare = name;
        while (Object.keys(defs).some((k) => k.split('#')[0] === bare)) bare = /\d$/.test(bare) ? bare.replace(/\d$/, (d) => String(+d + 1)) : `${bare}2`;
        const key = `${bare}#103:${seq++}`;
        defs[key] = { type, defaultValue };
        return key;
      };
      set.declaredIds = () => Object.keys(defs);
      guardRefs(set);
      page?.children.push(set);
      return set;
    },
    // A page the executor can SEARCH, not just append to. It finds its set here by name and type, so
    // `findOne` has to be real; a stub returning `null` would send every run down the combine branch and
    // build N separate sets while every assertion below still passed.
    currentPage: {
      appendChild: (c: Node) => { page?.children.push(c); },
      get children() { return page?.children ?? []; },
      findOne: (pred: (n: unknown) => boolean) => (page?.children ?? []).find(pred) ?? null,
    },
  } as ShimOpts & Record<string, unknown>;
  return shim;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
const run = (plans: AnatomyPlan[], opts: ShimOpts = {}) => applyComponentPlan(plans, makeShim(opts) as any);

// ---- the plans: the same 21-variant button grid the engine's set gates run on --------------
const grid = button.variants!.appearance!.flatMap((ap) => button.states!.map((st) =>
  figmaAnatomyPlan(button, 'medium', { leading: true, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: ap, state: st })));

/** Every component NAME a plan tree nominates — swap targets and nested shared components. Walked
 *  rather than hand-listed for the same reason `full()` derives its variables: a list drifts the moment
 *  a part is added, and the "fully resolved" run would quietly stop being fully resolved while passing. */
const planComps = (n: { swapTarget?: string; nestTarget?: string; children: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []),
  ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.children as typeof n[]).flatMap(planComps),
];

// Every name these plans reach for, DERIVED FROM THE PLANS rather than a hand-kept list.
const fullFor = (plans: AnatomyPlan[]): ShimOpts => ({
  vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
  styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
  comps: [...new Set(plans.flatMap((p) => planComps(p.root)))],
});
const full = (): ShimOpts => fullFor(grid);

console.log('plugin COMPONENT write-adapter (#487 step 5) — executor against in-memory shim\n');

// ---- PIN THE INPUT before asserting the output ---------------------------------------------
// Every assertion below is vacuously satisfiable by a plan set that carries nothing: no bindings ->
// nothing to resolve -> 0 misses -> "pass". So pin what the plans actually ask for first.
ok(grid.length === 21, `the fixture is the 21-variant grid (${grid.length})`);
ok(full().vars!.length > 15, `the plans carry variable bindings to resolve (${full().vars!.length} distinct)`);
ok(full().styles!.length > 0, `the plans carry text styles to resolve (${full().styles!.length})`);
ok(full().comps!.includes('FPO-default-icon') && full().comps!.includes('focus-ring'),
  `the plans nominate both a swap target and a nested shared component (${full().comps!.join(', ')})`);
ok(planSetProperties(grid).length > 0, `the plans derive component properties (${planSetProperties(grid).map((p) => `${p.name}:${p.type}`).join(', ')})`);

// ---- the fully-resolved run ----------------------------------------------------------------
const page: Page = { children: [] };
const r1 = await run(grid, { ...full(), page });

ok(r1.misses.length === 0, `fully-resolved run reports NO misses (${r1.misses.length}${r1.misses.length ? ` — ${r1.misses.slice(0, 3).join('; ')}` : ''})`);
ok(r1.set === 'button' && r1.variants === 21 && r1.added === 21, `one set named 'button' holding all 21 members, all newly built (set=${r1.set}, variants=${r1.variants}, added=${r1.added})`);
ok(page.children.length === 1 && page.children[0].type === 'COMPONENT_SET',
  `the page holds exactly ONE node — the set — with no loose components left behind (${page.children.length})`);
// The grid rule: only VARYING axes get a dimension, and the LAST varying axis becomes the columns. For
// this fixture that is appearance (3) down × state (7) across.
ok(JSON.stringify(r1.grid) === JSON.stringify([button.variants!.appearance!.length, button.states!.length]),
  `the grid is appearance × state, rows × cols = ${JSON.stringify(r1.grid)}`);
ok(JSON.stringify(r1.axes.slice().sort()) === JSON.stringify([`appearance:${button.variants!.appearance!.length}`, 'intent:1', 'leading:1', 'size:1', `state:${button.states!.length}`, 'trailing:1'].sort()),
  `Figma derives every axis from the member names (${r1.axes.join(', ')})`);
// The box is READ BACK from the set, and the set's box does not follow its members — so a non-zero box
// containing 21 members is a positive statement that `resize` ran and landed.
ok(r1.size[0] > 0 && r1.size[1] > 0, `the set's box was resized to contain its members (${r1.size[0]}x${r1.size[1]})`);

// ---- the properties, and that they are wired to EVERY member -------------------------------
const wantProps = planSetProperties(grid).map((p) => `${p.name}:${p.type}`).sort();
ok(JSON.stringify(r1.properties.slice().sort()) === JSON.stringify(wantProps),
  `every derived property is declared on the SET, verbatim and once (${r1.properties.join(', ')})`);
// SPREAD, not volume: `refs` is a write count, so 42 writes onto one member satisfies it as readily as
// 42 across twenty-one — and the whole point of the per-member loop is that references do NOT propagate.
ok(r1.wiredMembers === 21, `references are wired on EVERY member, not just the first (${r1.wiredMembers}/21)`);
ok(r1.refs === 21 * planSetProperties(grid).length, `every member carries every reference (${r1.refs} = 21 × ${planSetProperties(grid).length})`);

// ---- the geometry claims: the focus ring and the pending spinner ----------------------------
const set = page.children[0];
const members = set.children as Node[];
const memberByName = new Map(members.map((m) => [String(m.name), m] as const));
const partOf = (member: Node, name: string): Node | null =>
  ((member.findAll as () => Node[])().find((n) => n.name === name) as Node | undefined) ?? null;

// The ring is on the FOCUS variant, and it is the one part sized as `parent + 2 × inset`.
const focusName = grid.map(planComponentName).find((n) => n.includes('state=focus'))!;
const focusMember = memberByName.get(focusName)!;
const ringNames = (focusMember.findAll as () => Node[])().filter((n) => n._absolute).map((n) => String(n.name));
ok(ringNames.length > 0, `the focus variant carries an absolutely-positioned part (${ringNames.join(', ')})`);
const ringBad: string[] = [];
for (const rn of ringNames) {
  const ring = partOf(focusMember, rn)!;
  if (ring.layoutPositioning !== 'ABSOLUTE') { ringBad.push(`${rn}: reads ${ring.layoutPositioning}, so it would take a cell in the row`); continue; }
  // Centered parts keep their own size; only the INSET one is grown against its target. Told apart by
  // the negative origin the inset writes.
  if ((ring.x as number) >= 0) continue;
  const off = -(ring.x as number);
  if ((ring.width as number) !== (focusMember.width as number) + off * 2 || (ring.height as number) !== (focusMember.height as number) + off * 2)
    ringBad.push(`${rn}: ${ring.width}x${ring.height} against a ${focusMember.width}x${focusMember.height} target at offset ${off}`);
  if (ring.y !== -off) ringBad.push(`${rn}: y=${ring.y}, expected ${-off}`);
  const con = ring.constraints as { horizontal?: string; vertical?: string } | null;
  if (con?.horizontal !== 'STRETCH' || con?.vertical !== 'STRETCH') ringBad.push(`${rn}: constraints ${JSON.stringify(con)} — it would not track a resized variant`);
}
ok(ringBad.length === 0, 'the focus ring is absolute, 2px larger on EVERY side, at a negative origin, and STRETCHed'
  + (ringBad.length ? ` — ${ringBad.join('; ')}` : ''));

// The pending spinner takes the LEADING VISUAL'S CELL when there is one, so the grid above — which fills
// that slot — exercises the in-flow branch. Assert that, then take the centered branch on a LABEL-ONLY
// set, which is the only shape that reaches it (#612).
const gridPending = memberByName.get(grid.map(planComponentName).find((n) => n.includes('state=pending'))!)!;
const gridSpinner = partOf(gridPending, 'spinner');
ok(gridSpinner !== null && gridSpinner.layoutPositioning === 'AUTO' && !gridSpinner._absolute,
  `with a leading visual present the spinner stays IN FLOW and takes that cell — no lift, no overlay (${gridSpinner?.layoutPositioning})`);

// ---- the CENTERED overlay, on the set that actually reaches it -------------------------------
// A label-only button has no cell for the spinner to take, so it goes out of flow, centered, with the
// label held open at zero opacity. Its own set because the grid above cannot express it: the slot fill
// is not a variant axis in this def, so a set mixing filled and empty slots would be one footprint
// cohort measuring two different boxes.
const labelOnly = button.states!.map((st) =>
  figmaAnatomyPlan(button, 'medium', { leading: false, trailing: false, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: st }));
const loPage: Page = { children: [] };
const lo = await run(labelOnly, { ...fullFor(labelOnly), page: loPage });
ok(lo.misses.length === 0, `the label-only set runs CLEAN${lo.misses.length ? ` — ${lo.misses.slice(0, 3).join('; ')}` : ''}`);
const loMembers = (loPage.children[0].children as Node[]);
const pending = loMembers.find((m) => String(m.name).includes('state=pending'))!;
const spin = partOf(pending, 'spinner');
const lbl = partOf(pending, 'label');
ok(spin !== null && lbl !== null, `the label-only pending variant builds both a spinner and a label (${[spin?.name, lbl?.name].join(', ')})`);
// Read back through the shim's REJECTION model: if Figma discards the lift, the spinner takes a cell and
// the button grows — the #612 defect, restored at write time only.
ok(spin!.layoutPositioning === 'ABSOLUTE'
  && JSON.stringify(spin!.constraints) === JSON.stringify({ horizontal: 'CENTER', vertical: 'CENTER' }),
  `the spinner is lifted out of the flow and CENTER-constrained on both axes — STRETCH would distort a round spinner (${JSON.stringify([spin!.layoutPositioning, spin!.constraints])})`);
// The button must measure WIDER than the spinner before the centering is asserted, or the arithmetic is
// vacuous: a corner-pin and a center coincide at 0,0 (doc 34 shape 4).
ok((pending.width as number) > (spin!.width as number),
  `the button measures wider than the spinner, so the centering below is falsifiable (${pending.width} > ${spin!.width})`);
ok(spin!.x === ((pending.width as number) - (spin!.width as number)) / 2
  && spin!.y === ((pending.height as number) - (spin!.height as number)) / 2,
  `the spinner is centered on the button's measured box, not pinned to a corner (${JSON.stringify([spin!.x, spin!.y])} in ${JSON.stringify([pending.width, pending.height])})`);
// AND IT KEEPS ITS OWN SIZE. The ring is resized to its target; this must not be, because `resize` clears
// the size binding and a spinner stretched to the button's width is not a spinner.
ok((spin!.boundVariables as Record<string, unknown>).width !== undefined && (spin!.width as number) !== (pending.width as number),
  `the spinner keeps its own bound size rather than being resized to the button (${spin!.width} vs ${pending.width})`);
// THE LABEL IS STILL BUILT, still sized, merely transparent — which is exactly what `visible:false` or a
// dropped node would NOT give, and neither would report a miss.
ok(lbl!.opacity === 0 && (lbl!.width as number) > 0,
  `the label is built at zero opacity and still MEASURES — hidden or dropped, it yields its cell and the button collapses (${JSON.stringify([lbl!.opacity, lbl!.width])})`);
ok(spin!.opacity !== 0, `the spinner itself is fully opaque — the zero applies to the part being covered, not the coverer (${spin!.opacity})`);

// ---- the footprint: `state` and `appearance` must NOT move the box --------------------------
// Reported as a miss by the executor, so a zero-miss run above already covers it — but assert the
// mechanism has something to measure, because a stub where every member is the same size would satisfy
// it vacuously.
const boxes = new Set(members.map((m) => `${m.width}x${m.height}`));
ok(members.every((m) => (m.width as number) > 0 && (m.height as number) > 0), `every member measures non-zero (so the footprint check is falsifiable): ${[...boxes].join(', ')}`);
ok(boxes.size === 1, `every member in the cohort measures the SAME box — border-box holds across appearance (${[...boxes].join(', ')})`);
// And that the border-box override is what makes it so: the outlined members carry a stroke.
const strokedCount = members.filter((m) => (partOf(m, String(m.name)) ?? m) && ((m.findAll as () => Node[])().concat([m])).some((n) => (n.strokes as unknown[])?.length > 0)).length;
ok(strokedCount > 0, `some members carry a stroke, so \`strokesIncludedInLayout=false\` is load-bearing here (${strokedCount})`);
ok(members.concat((members.flatMap((m) => (m.findAll as () => Node[])()))).filter((n) => (n.strokes as unknown[])?.length > 0).every((n) => n.strokesIncludedInLayout === false),
  'every stroked node is set to BORDER-BOX, so an outline variant does not measure wider than its filled sibling');

// ---- layout: no two members at one position ------------------------------------------------
const positions = new Set(members.map((m) => `${m.x},${m.y}`));
ok(positions.size === members.length, `no two members share a position (${positions.size}/${members.length} distinct)`);

// ---- IDEMPOTENCY: a designer presses the button twice ---------------------------------------
const r2 = await run(grid, { ...full(), page });
ok(page.children.length === 1, `a second run appends into the SAME set rather than combining a second one beside it (${page.children.length} node on the page)`);
ok(r2.variants === 21 && r2.added === 0, `second run adds 0 and leaves 21 (added=${r2.added}, variants=${r2.variants})`);
ok(r2.misses.length === 21 && r2.misses.every((m) => m.includes('ALREADY PRESENT')),
  `every skip is REPORTED rather than silent — 21 'ALREADY PRESENT' misses and nothing else (${r2.misses.length})`);
// #483: the skips are also COUNTED, and that count is what stops the UI reading an idempotent re-run as
// 21 failures. The count and the prose must agree — a `skipped` derived from anything but the skip branch
// itself, or a branch that reports one and not the other, is the whole defect. Asserted on BOTH runs,
// because a `skipped` that is simply `variants - added` would satisfy the re-run and be wrong on the first.
ok(r2.skipped === 21, `every skip is counted, not just described (skipped=${r2.skipped})`);
ok(r1.skipped === 0, `the first run skips nothing, so the count is not just a restatement of the member total (skipped=${r1.skipped})`);
ok(r2.skipped === r2.misses.filter((m) => m.includes('ALREADY PRESENT')).length,
  'the skip COUNT and the skip PROSE agree — the UI subtracts one from the other to get real misses');
ok(r2.properties.length === r1.properties.length && r2.wiredMembers === 21,
  `re-running neither duplicates a property nor loses a reference (${r2.properties.length} props, ${r2.wiredMembers} wired members)`);
ok(JSON.stringify(r2.size) === JSON.stringify(r1.size), `the box is unchanged by a no-op re-run (${r2.size.join('x')})`);

// ---- DEGRADED: a file with no variables ----------------------------------------------------
// Reported, not thrown, and the set still assembles — a designer gets a structurally correct set they
// can theme, plus a list naming every variable their file is missing.
const bare = await run(grid, { comps: full().comps, page: { children: [] } });
ok(bare.variants === 21 && bare.set === 'button', `a file with no variables still assembles the whole set (${bare.variants} members)`);
ok(bare.misses.length > 0 && bare.misses.some((m) => m.includes(' -> ')), `every unresolved name is reported (${bare.misses.length} misses)`);
// The distinction that matters: a name that did not RESOLVE reports one cause, not two. A miss claiming
// Figma DISCARDED a write that was never attempted is the blind spot the `wrote[]` bookkeeping exists
// to close.
ok(!bare.misses.some((m) => m.includes('DISCARDED')),
  'an unresolved name reports its ONE true cause — never also "DISCARDED", which would name a write that was never attempted');

// ---- DEGRADED: the swap target is not in the file -------------------------------------------
const noComp = await run(grid, { ...full(), comps: [], page: { children: [] } });
ok(noComp.variants === 21, `a missing swap target still builds every member (as a placeholder frame) — ${noComp.variants}`);
ok(noComp.misses.some((m) => m.includes('.swapTarget -> FPO-default-icon')), 'the missing swap target is named as a miss');
ok(noComp.misses.some((m) => m.includes('swap target FPO-default-icon (not found; property not created)')),
  'and the INSTANCE_SWAP property is NOT created, because Figma demands a node id it cannot supply');
ok(!noComp.properties.some((p) => p.endsWith(':INSTANCE_SWAP')), `no INSTANCE_SWAP property is left half-declared (${noComp.properties.join(', ')})`);

// ---- DEGRADED: a stray member someone added by hand -----------------------------------------
const strayPage: Page = { children: [] };
await run(grid, { ...full(), page: strayPage });
const straySet = strayPage.children[0];
const handMade = { name: 'someone-copied-this', type: 'COMPONENT', x: 0, y: 0, width: 10, height: 10, children: [], findAll: () => [], findOne: () => null } as unknown as Node;
(straySet.children as Node[]).push(handMade);
const withStray = await run(grid, { ...full(), page: strayPage });
ok(withStray.misses.some((m) => m.includes('someone-copied-this') && m.includes('NOT A GENERATED VARIANT')),
  'a member whose name is not a generated coordinate is reported and left in place, not dragged to a guessed cell');
ok(handMade.x === 0 && handMade.y === 0, 'and it really is left where it was');

// ---- DEGRADED: a duplicate member name poisons the definitions getter -----------------------
// `combineAsVariants` accepts a duplicate silently and the set then THROWS on
// `componentPropertyDefinitions` while `addComponentProperty` keeps succeeding. The executor must report
// ONE legible cause rather than dying or burying it under a dozen consequences.
const dupPage: Page = { children: [] };
await run(grid, { ...full(), page: dupPage });
const dupSet = dupPage.children[0];
(dupSet.children as Node[]).push({ ...((dupSet.children as Node[])[0]) } as Node);
const withDup = await run(grid, { ...full(), page: dupPage });
ok(withDup.misses.some((m) => m.includes('UNREADABLE') && m.includes('share a name')),
  'a duplicate member name is reported as ONE cause naming the likely culprit, rather than throwing');
ok(withDup.properties.length === 0 && withDup.refs === 0,
  'and no properties are declared on a poisoned set, so the single cause is not buried under consequences');

// ---- the offline guards still fire, from this path too --------------------------------------
// `planSetLayout` throws on an incoherent set, which is the right moment to fail: before anything
// reaches the file. Asserted here because the plugin path is a second caller and a `try/catch` around
// the shared helper would silently turn a hard guard into a soft one.
const twoComponents = [grid[0], { ...grid[1], component: 'chip' }];
let threw = '';
try { await run(twoComponents, { ...full(), page: { children: [] } }); } catch (e) { threw = (e as Error).message; }
ok(threw.includes('same component'), `plans from two components are REFUSED before anything is written (${threw.slice(0, 60)}…)`);

const dupCoord = [grid[0], { ...grid[0] }];
threw = '';
try { await run(dupCoord, { ...full(), page: { children: [] } }); } catch (e) { threw = (e as Error).message; }
ok(threw.includes('share a component name'), `two plans at one coordinate are REFUSED (${threw.slice(0, 60)}…)`);

console.log(`\nplugin COMPONENT write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
