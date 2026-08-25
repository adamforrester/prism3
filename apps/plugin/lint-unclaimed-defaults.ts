/**
 * THE SECOND DIRECTION (#865).
 *
 * The executor already verifies everything it WRITES: `applyComponentPlan` reads a value back after
 * setting it and reports a miss when the host did not keep it. Nothing verified what it did NOT write.
 * A property no def mentioned has no plan entry to read back against, so it kept whatever Figma chose —
 * and Figma chooses an opaque white fill on a fresh frame, a 5px radius and a purple dashed border on a
 * set from `combineAsVariants`, and top-left alignment on a text node. Those arrived wearing our name,
 * on every component, and were found by eye four separate times (`icon`, `field-label`, `field-message`,
 * `checkbox`) before anybody looked for the class.
 *
 * So this gate asserts the direction a read-back structurally cannot: **every visually-significant
 * property a built node carries was explicitly decided by this executor.** Not "decided correctly" —
 * that is the read-back's job and the def author's job. Decided at all, by somebody, so that the value
 * has an address to argue with instead of being Figma's opinion by default.
 *
 * ── HOW IT COMPARES TWO INDEPENDENT THINGS (docs/34) ───────────────────────────────────────────────
 *
 * ACTUAL — recorded, not read. Every node the real `applyComponentPlan` creates is a `Proxy` whose `set`
 * trap records the property name. That is what the executor demonstrably assigned on this plan, and it
 * is immune to the failure mode that made three drafts of this table wrong: a reader deciding that a
 * mechanism which *could* carry a property does carry it. `setTextStyleIdAsync()` looks like it should
 * supply `textAlignVertical`; `interface TextStyle` has no alignment field on either axis.
 *
 * EXPECTED — authored below, from `@figma/plugin-typings` and Figma's documented defaults. It is NOT
 * imported from `write-components.ts`, and `claimDefaults`'s table carries a comment forbidding exactly
 * that. A gate whose expected list is the subject's own list asserts `table === table`: it cannot fail,
 * and it reports that as a pass. The duplication is the gate. Do not tidy it up.
 *
 * ── THE THREE CARVE-OUTS ARE ASSERTED, NOT ASSUMED ─────────────────────────────────────────────────
 *
 * Each exemption below is a claim about the PLAN, so each one is checked rather than trusted:
 *
 *   A6  An INSTANCE is claimed by its nomination — its appearance is the main component that a plan
 *       node's `swapTarget`/`nestTarget` named, and writing `fills = []` on it is not a neutral value
 *       but a local override that erases that component's design. The gate therefore requires every
 *       INSTANCE to trace to a name some plan actually nominated. An instance from nowhere fails —
 *       and so does a sweep that built no instance at all, which is the weaker half this arm has and
 *       the reason it says so out loud. See its comment for the shared derivation behind that.
 *   A4  Parent-side auto-layout properties are INAPPLICABLE on a frame with no `layoutMode`, not
 *       unclaimed — Figma documents them as auto-layout-only, and with no auto layout there is no gap
 *       and no padding to see. A blanket skip would let a mutation that deletes the `layoutMode` write
 *       silence the padding checks too, so the arm must be shown to have both applied and skipped.
 *   A5  An imported glyph's ink and constraints are claimed by `glyphSvg` — a plan field — and by the
 *       GLYPH branch's deliberate `SCALE` write. Blanking them would erase the outline the SVG drew.
 *       The arm must be shown to have applied to at least one node.
 *
 * ── AND EVERY ARM HAS TO BE SHOWN TO RUN ────────────────────────────────────────────────────────────
 *
 * A0 corpus reach · A2 node-type coverage · A3 row coverage. A gate that sweeps zero defs, never sees a
 * VECTOR, or carries a row that applies to nothing is a gate reporting a hole as a clean pass — the
 * most-repeated defect shape in this repo's history. Each assertion prints its own name so a mutation
 * test can grep for THAT arm rather than for a failure count (#986).
 *
 * ── WHAT THIS SHIM CANNOT SEE, stated rather than implied ───────────────────────────────────────────
 *
 *   · `createNodeFromSvg` here returns an artboard frame holding ONE vector, because that is the shape
 *     of `glyphDocument`'s output (one `<path>`, no strokes, no opacity). Figma's real importer may
 *     return a deeper tree; nodes this shim never creates are nodes this gate never checks.
 *   · `createComponentFromNode` returns the same node, which is faithful to how the executor treats it:
 *     the member root is neutralized as the FRAME that call consumes, one step earlier, and promotion
 *     writes nothing visual. So COMPONENT never appears as a built type and is not a required type.
 *   · Values are not checked. `fills: []` and `fills: [white]` are both "decided" here.
 *
 *   npx tsx apps/plugin/lint-unclaimed-defaults.ts
 */
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '../../packages/engine/anatomy-figma.ts';
import type { AnatomyPlan } from '../../packages/engine/anatomy-figma.ts';
import { applyComponentPlan } from './src/write-components.ts';
import { componentDefs } from '../../packages/engine/components/index.ts';

// ── ACTUAL: a recording host ────────────────────────────────────────────────────────────────────────

type Rec = {
  type: string;
  name: string;
  /** Nodes the shim invents to model a file that already holds the swap/nest targets. Not this
   *  executor's output, so counting them would invent a finding. */
  shim: boolean;
  /** Created by Figma's SVG importer, below the artboard it returns. The artboard itself is NOT
   *  imported in this sense: it is a wrapper the importer fills with white and the executor handles as
   *  the created node of its GLYPH plan. */
  imported: boolean;
  /** For an INSTANCE, the name of the main component it was instantiated from — which is how A6 checks
   *  the nomination instead of trusting the node's type. */
  instanceOf: string | null;
  props: Set<string>;
  bound: Set<string>;
  calls: Set<string>;
};

let nodes: Rec[] = [];
let makingShimNodes = false;
let makingImported = false;

const mkNode = (type: string, instanceOf: string | null = null): any => {
  const rec: Rec = {
    type, name: '', shim: makingShimNodes, imported: makingImported, instanceOf,
    props: new Set(), bound: new Set(), calls: new Set(),
  };
  nodes.push(rec);
  const store: Record<string, any> = {
    type, name: '', boundVariables: {}, fills: [], strokes: [], children: [], characters: '',
    opacity: 1, width: 24, height: 24, x: 0, y: 0, parent: null,
    componentPropertyReferences: null, constraints: null,
    ...(type === 'FRAME' ? { strokeWeight: 0, strokesIncludedInLayout: true } : {}),
    _plugin: new Map<string, string>(),
  };
  const proxy: any = new Proxy(store, {
    has: (t, p) => p in t,
    get(t, p: string) {
      if (p in t) return t[p];
      switch (p) {
        case 'unlockAspectRatio': return () => rec.calls.add('unlockAspectRatio()');
        case 'setBoundVariable': return (prop: string, v: { id: string; value?: number }) => {
          rec.bound.add(prop);
          (t.boundVariables as Record<string, unknown>)[prop] = { id: v.id, value: v.value };
        };
        case 'resize': return (w: number, h: number) => { rec.calls.add('resize()'); t.width = w; t.height = h; };
        case 'appendChild': return (c: any) => { (t.children as any[]).push(c); c.parent = proxy; };
        case 'insertChild': return (_i: number, c: any) => { (t.children as any[]).push(c); };
        case 'findAll': return (pred?: (n: any) => boolean) => {
          const all: any[] = [];
          const walk = (n: any): void => { for (const k of (n.children ?? [])) { all.push(k); walk(k); } };
          walk(proxy);
          return pred ? all.filter(pred) : all;
        };
        case 'findOne': return (pred: (n: any) => boolean) => {
          const all: any[] = [];
          const walk = (n: any): void => { for (const k of (n.children ?? [])) { all.push(k); walk(k); } };
          walk(proxy);
          return all.find(pred) ?? null;
        };
        case 'setTextStyleIdAsync': return async () => { rec.calls.add('setTextStyleIdAsync()'); };
        case 'setEffectStyleIdAsync': return async () => { rec.calls.add('setEffectStyleIdAsync()'); };
        case 'getSharedPluginData': return (ns: string, k: string) => (t._plugin as Map<string, string>).get(`${ns}|${k}`) ?? '';
        case 'setSharedPluginData': return (ns: string, k: string, v: string) => { (t._plugin as Map<string, string>).set(`${ns}|${k}`, v); };
        // The source component's own name travels onto the instance, so A6 can check the nomination.
        case 'createInstance': return () => mkNode('INSTANCE', rec.name || '(unnamed source)');
        case 'clone': return () => mkNode(type, rec.instanceOf);
        case 'remove': return () => {};
        default: return undefined;
      }
    },
    set(t, p: string, v) {
      if (!p.startsWith('_')) rec.props.add(p);
      if (p === 'name') rec.name = String(v);
      t[p] = v;
      return true;
    },
  });
  return proxy;
};

/** Every name any plan nominates as a swap or nest target. A6 compares against this, so it is a
 *  statement about the PLAN — not about which node types the executor happens to leave alone. */
const nominated = (plans: AnatomyPlan[]): Set<string> => {
  const walk = (n: any): string[] => [
    ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []),
    ...n.children.flatMap(walk),
  ];
  return new Set(plans.flatMap((p) => walk(p.root)));
};

const makeShim = (plans: AnatomyPlan[], page: { children: any[] }) => {
  const varNames = [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))];
  const styleNames = [...new Set(plans.flatMap((p) => planTextStyles(p.root)))];
  const effectNames = [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))];
  const mkVar = (name: string) => ({ id: `V:${name}`, name, value: 2, resolveForConsumer: () => ({ value: 2 }) });
  makingShimNodes = true;
  const comps = [...nominated(plans)].map((n) => { const c = mkNode('COMPONENT'); c.name = n; return c; });
  makingShimNodes = false;
  return {
    variables: {
      getLocalVariablesAsync: async () => varNames.map(mkVar),
      setBoundVariableForPaint: (paint: unknown) => paint,
    },
    getLocalTextStylesAsync: async () => styleNames.map((n) => ({ id: `S:${n}`, name: n, fontName: { family: 'Inter', style: 'Regular' } })),
    getLocalEffectStylesAsync: async () => effectNames.map((n) => ({ id: `E:${n}`, name: n })),
    loadFontAsync: async () => {},
    loadAllPagesAsync: async () => {},
    root: {
      findAllWithCriteria: (crit: { types: string[] }) => (crit.types.includes('COMPONENT') ? comps : []),
      findAll: () => [],
    },
    createText: () => mkNode('TEXT'),
    createFrame: () => mkNode('FRAME'),
    createNodeFromSvg: (svg: string) => {
      const attr = (n: string) => Number(new RegExp(`${n}="([0-9.]+)"`).exec(svg)?.[1] ?? 0);
      const f = mkNode('FRAME');
      f.resize(attr('width'), attr('height'));
      makingImported = true;
      const v = mkNode('VECTOR');
      makingImported = false;
      v.resize(10, 10);
      f.appendChild(v);
      return f;
    },
    createComponentFromNode: (n: any) => n,
    combineAsVariants: (members: any[]) => {
      const set = mkNode('COMPONENT_SET');
      set.children = members;
      const defs: Record<string, unknown> = {};
      let seq = 100;
      Object.defineProperty(set, 'componentPropertyDefinitions', {
        configurable: true,
        get: () => {
          const out: Record<string, { type: string; variantOptions: string[] }> = {};
          for (const m of set.children as any[])
            for (const kv of String(m.name).split(', ')) {
              const [k, v] = kv.split('=');
              const d = (out[k] ??= { type: 'VARIANT', variantOptions: [] });
              if (!d.variantOptions.includes(v)) d.variantOptions.push(v);
            }
          return Object.assign(out, defs);
        },
      });
      (set as any).addComponentProperty = (name: string, type: string, dv: unknown) => {
        const key = `${name}#103:${seq++}`;
        defs[key] = { type, defaultValue: dv };
        return key;
      };
      page.children.push(set);
      return set;
    },
    currentPage: {
      appendChild: (c: any) => { page.children.push(c); },
      get children() { return page.children; },
      findOne: (pred: (n: any) => boolean) => page.children.find(pred) ?? null,
    },
  } as any;
};

// ── EXPECTED: Figma's own defaults, authored here ───────────────────────────────────────────────────
//
// One row per property a created node carries a value for before anything writes to it, restricted to
// those that change what a designer SEES. `claimedBy` names the writes that count as a decision — a
// bound variable and a direct assignment both count, and a method call is written with parentheses.
//
// THE FOUR CORNERS ARE FOUR ROWS, not one `cornerRadius` row with five aliases. A def that binds only
// `topLeftRadius` has claimed one corner; a row satisfied by any of the five would call the other three
// claimed and pass on a partial neutralization, which is the same union-across-things error that made a
// first draft of this measurement report `fills` as claimed on frames because 1 of 144 carried a paint.
//
// `arm` tags a row whose applicability is conditional, so A4/A5 can prove the condition both fires and
// does not. A row with no `arm` applies to every node of its listed types.

type Row = {
  prop: string;
  types: readonly string[];
  deflt: string;
  seen: string;
  claimedBy: readonly string[];
  /** 'autolayout' — parent-side auto layout, applicable only with a `layoutMode`.
   *  'ink'        — fills/strokes/constraints, claimed by `glyphSvg` on an imported node. */
  arm?: 'autolayout' | 'ink';
};

const BOXES = ['FRAME', 'COMPONENT_SET'] as const;
const ALL = ['FRAME', 'COMPONENT_SET', 'TEXT', 'VECTOR'] as const;

const VISUALLY_SIGNIFICANT: readonly Row[] = [
  // SceneNodeMixin · BlendMixin · LayoutMixin — carried by every node type this executor creates.
  { prop: 'visible', types: ALL, deflt: 'true', seen: 'whether the layer renders at all', claimedBy: ['visible'] },
  { prop: 'opacity', types: ALL, deflt: '1', seen: 'transparency', claimedBy: ['opacity'] },
  { prop: 'blendMode', types: ALL, deflt: "'PASS_THROUGH'", seen: 'how the layer composites onto what is behind it', claimedBy: ['blendMode'] },
  { prop: 'effects', types: ALL, deflt: '[]', seen: 'shadows and blurs', claimedBy: ['effects', 'setEffectStyleIdAsync()'] },
  { prop: 'rotation', types: ALL, deflt: '0', seen: 'rotation', claimedBy: ['rotation'] },
  { prop: 'layoutAlign', types: ALL, deflt: "'INHERIT'", seen: 'whether the node stretches on its parent’s cross axis', claimedBy: ['layoutAlign'] },
  { prop: 'layoutGrow', types: ALL, deflt: '0', seen: 'whether the node absorbs its parent’s free space', claimedBy: ['layoutGrow'] },

  // GeometryMixin + ConstraintMixin — the ink, and where the node sits when its parent resizes. Claimed
  // by `glyphSvg` on an imported node, whose outline `[]` would erase.
  { prop: 'fills', types: ALL, deflt: 'one opaque white SOLID on a frame or a set', seen: 'an opaque white box behind the content — the defect QA found four times', claimedBy: ['fills'], arm: 'ink' },
  { prop: 'strokes', types: ALL, deflt: '[] on a frame · a purple dashed stroke on a set from combineAsVariants', seen: 'the variant-set border', claimedBy: ['strokes'], arm: 'ink' },
  { prop: 'strokeWeight', types: ALL, deflt: '1', seen: 'border thickness, once there is a stroke to draw', claimedBy: ['strokeWeight'], arm: 'ink' },
  { prop: 'strokeAlign', types: ALL, deflt: "'INSIDE'", seen: 'which side of the edge the border sits on', claimedBy: ['strokeAlign'], arm: 'ink' },
  { prop: 'dashPattern', types: ALL, deflt: '[] on a frame · dashed on a set', seen: 'the dash rhythm of that border', claimedBy: ['dashPattern'], arm: 'ink' },
  { prop: 'constraints', types: ALL, deflt: '{ horizontal: MIN, vertical: MIN }', seen: 'how the node moves and scales when its parent resizes', claimedBy: ['constraints'], arm: 'ink' },

  // CornerMixin · RectangleCornerMixin · BaseFrameMixin — a COMPONENT_SET included, because
  // `ComponentSetNode extends BaseFrameMixin` and `combineAsVariants` sets three of these to values
  // nobody chose. Leaving the set out is what left it carrying eleven.
  { prop: 'topLeftRadius', types: BOXES, deflt: '0 on a frame · 5 on a set from combineAsVariants', seen: 'a rounded corner nobody authored', claimedBy: ['topLeftRadius', 'cornerRadius'] },
  { prop: 'topRightRadius', types: BOXES, deflt: '0 on a frame · 5 on a set from combineAsVariants', seen: 'a rounded corner nobody authored', claimedBy: ['topRightRadius', 'cornerRadius'] },
  { prop: 'bottomLeftRadius', types: BOXES, deflt: '0 on a frame · 5 on a set from combineAsVariants', seen: 'a rounded corner nobody authored', claimedBy: ['bottomLeftRadius', 'cornerRadius'] },
  { prop: 'bottomRightRadius', types: BOXES, deflt: '0 on a frame · 5 on a set from combineAsVariants', seen: 'a rounded corner nobody authored', claimedBy: ['bottomRightRadius', 'cornerRadius'] },
  { prop: 'clipsContent', types: BOXES, deflt: 'true', seen: 'children cropped at the frame edge', claimedBy: ['clipsContent'] },
  { prop: 'strokesIncludedInLayout', types: BOXES, deflt: 'false', seen: 'whether a border pushes the auto-layout box outwards', claimedBy: ['strokesIncludedInLayout'] },

  // AutoLayoutMixin, parent side. Figma documents these as applicable only on an auto-layout frame, so
  // with no `layoutMode` there is no gap and no padding to see.
  { prop: 'itemSpacing', types: BOXES, deflt: '0', seen: 'the gap between auto-layout children', claimedBy: ['itemSpacing'], arm: 'autolayout' },
  { prop: 'paddingLeft', types: BOXES, deflt: '0', seen: 'inner padding', claimedBy: ['paddingLeft'], arm: 'autolayout' },
  { prop: 'paddingRight', types: BOXES, deflt: '0', seen: 'inner padding', claimedBy: ['paddingRight'], arm: 'autolayout' },
  { prop: 'paddingTop', types: BOXES, deflt: '0', seen: 'inner padding', claimedBy: ['paddingTop'], arm: 'autolayout' },
  { prop: 'paddingBottom', types: BOXES, deflt: '0', seen: 'inner padding', claimedBy: ['paddingBottom'], arm: 'autolayout' },
  { prop: 'primaryAxisAlignItems', types: BOXES, deflt: "'MIN'", seen: 'children packed to the start instead of spread or centered', claimedBy: ['primaryAxisAlignItems'], arm: 'autolayout' },
  { prop: 'counterAxisAlignItems', types: BOXES, deflt: "'MIN'", seen: 'children top-aligned instead of centered (#1009 half 1)', claimedBy: ['counterAxisAlignItems'], arm: 'autolayout' },
  { prop: 'primaryAxisSizingMode', types: BOXES, deflt: "'AUTO'", seen: 'hug versus fixed along the layout direction', claimedBy: ['primaryAxisSizingMode', 'layoutSizingHorizontal', 'layoutSizingVertical'], arm: 'autolayout' },
  { prop: 'counterAxisSizingMode', types: BOXES, deflt: "'AUTO'", seen: 'hug versus fixed across the layout direction', claimedBy: ['counterAxisSizingMode', 'layoutSizingHorizontal', 'layoutSizingVertical'], arm: 'autolayout' },

  // TEXT. `interface TextStyle` in @figma/plugin-typings carries fontSize, textDecoration, fontName,
  // letterSpacing, lineHeight, leadingTrim, paragraphIndent, paragraphSpacing, listSpacing,
  // hangingPunctuation, hangingList and textCase — and NO alignment field on either axis. So applying
  // our style cannot claim the first two rows, and `write-text-styles.ts` sets neither `leadingTrim` nor
  // `paragraphSpacing`, so a style does not claim those either. A mechanism that COULD carry a property
  // is not a claim on it; three drafts of this table were wrong in exactly that way.
  { prop: 'textAlignVertical', types: ['TEXT'], deflt: "'TOP'", seen: 'the label sitting at the top of its own box (#1009 half 2)', claimedBy: ['textAlignVertical'] },
  { prop: 'textAlignHorizontal', types: ['TEXT'], deflt: "'LEFT'", seen: 'the label’s alignment inside its box', claimedBy: ['textAlignHorizontal'] },
  { prop: 'textAutoResize', types: ['TEXT'], deflt: "'WIDTH_AND_HEIGHT'", seen: 'whether the text box hugs its glyphs, wraps, or stays fixed', claimedBy: ['textAutoResize'] },
  { prop: 'textTruncation', types: ['TEXT'], deflt: "'DISABLED'", seen: 'whether overflowing text ellipsises', claimedBy: ['textTruncation'] },
  { prop: 'paragraphSpacing', types: ['TEXT'], deflt: '0', seen: 'space between paragraphs', claimedBy: ['paragraphSpacing'] },
  { prop: 'leadingTrim', types: ['TEXT'], deflt: "'NONE'", seen: 'whether the box trims to the cap height — the property that expresses cap-height centering, which textAlignVertical cannot at any of its three values', claimedBy: ['leadingTrim'] },
  { prop: 'typeface', types: ['TEXT'], deflt: "Inter Regular at 16/auto", seen: 'the font, size, line height and case of the label', claimedBy: ['setTextStyleIdAsync()', 'fontName', 'fontSize'] },
];

/** Every node type the table promises to cover. A2 requires each one to be REPRESENTED by a built node
 *  — a promise kept by a table entry and by nothing in the sweep is a hole reported as a pass. */
const PROMISED_TYPES = [...new Set(VISUALLY_SIGNIFICANT.flatMap((r) => r.types))].sort();

// ── THE SWEEP ───────────────────────────────────────────────────────────────────────────────────────

type Miss = { def: string; type: string; name: string; prop: string; deflt: string; seen: string };

/** How many individual misses to print before summarizing. Stated out loud and reported when it bites:
 *  a cap that truncates in silence reads as "that was all of them". */
const PRINT_CAP = 40;

const claimed = (n: Rec, r: Row): boolean =>
  r.claimedBy.some((c) => n.props.has(c) || n.bound.has(c) || n.calls.has(c));

const main = async (): Promise<void> => {
  const misses: Miss[] = [];
  const failures: string[] = [];
  const typesSeen = new Set<string>();
  const rowsExercised = new Set<string>();
  const armCounts = { autolayoutApplied: 0, autolayoutSkipped: 0, inkApplied: 0, inkExempt: 0 };
  let defsSwept = 0, nodesChecked = 0, instancesChecked = 0;

  for (const def of componentDefs) {
    let plans: AnatomyPlan[];
    try { plans = figmaAnatomySet(def, { swapTarget: 'FPO-default-icon' }); }
    catch { continue; }  // a def that projects no Figma set has no nodes to check
    defsSwept++;
    nodes = [];
    const page = { children: [] as any[] };
    await applyComponentPlan(plans, makeShim(plans, page), {});
    const nominatedHere = nominated(plans);
    const built = nodes.filter((n) => !n.shim);

    for (const n of built) {
      typesSeen.add(n.type);

      // A6 — the INSTANCE carve-out, checked against the plan rather than assumed from the type. An
      // instance's appearance belongs to the main component a def nominated; a local `fills = []` on one
      // erases that design, and on a `nest-fixed` focus ring it deletes the ring.
      if (n.type === 'INSTANCE' || n.type === 'COMPONENT') {
        instancesChecked++;
        if (!n.instanceOf || !nominatedHere.has(n.instanceOf))
          failures.push(`A6 instance-nomination: ${def.id} built ${n.type} "${n.name}" from ${n.instanceOf ?? '(no recorded source)'}, which no plan node nominated as a swapTarget or nestTarget. Its appearance is exempt from the default claim BECAUSE a def chose it; an instance from nowhere is exempt from nothing.`);
        continue;
      }

      nodesChecked++;
      const hasAutoLayout = n.props.has('layoutMode');
      if (n.type === 'FRAME' || n.type === 'COMPONENT_SET') {
        if (hasAutoLayout) armCounts.autolayoutApplied++; else armCounts.autolayoutSkipped++;
      }
      if (n.imported) armCounts.inkExempt++; else armCounts.inkApplied++;

      for (const r of VISUALLY_SIGNIFICANT) {
        if (!r.types.includes(n.type)) continue;
        if (r.arm === 'autolayout' && !hasAutoLayout) continue;
        if (r.arm === 'ink' && n.imported) continue;
        rowsExercised.add(r.prop);
        if (!claimed(n, r))
          misses.push({ def: def.id, type: n.type, name: n.name || '(never named)', prop: r.prop, deflt: r.deflt, seen: r.seen });
      }
    }
  }

  // A0 — the sweep has to have swept something. A gate over an empty corpus passes every assertion.
  if (defsSwept === 0) failures.push('A0 corpus-reach: no def projected a Figma set, so nothing was checked. Every assertion below passed vacuously.');
  if (nodesChecked === 0) failures.push('A0 corpus-reach: zero nodes were checked.');

  // A2 — every type the table promises must be represented by a real built node. Counting rows is not
  // coverage; a VECTOR row with no VECTOR in the sweep is a hole wearing a pass.
  for (const t of PROMISED_TYPES)
    if (!typesSeen.has(t))
      failures.push(`A2 node-type coverage: the table carries rows for ${t} but the sweep built none, so those rows were never evaluated. Either the corpus stopped producing that type or the shim stopped modeling it — both make this gate quieter than it reads.`);

  // A3 — and every row must have been evaluated at least once. A row that applies to nothing asserts
  // nothing, and it looks identical to a row that passes.
  for (const r of VISUALLY_SIGNIFICANT)
    if (!rowsExercised.has(r.prop))
      failures.push(`A3 row coverage: row "${r.prop}" was never evaluated on any node. It contributes no assertion; delete it or fix its types/arm.`);

  // A4 — the auto-layout arm must be shown to do both things. If it never applied, every parent-side
  // property is unchecked; if it never skipped, the applicability test is dead code that a future
  // mutation could delete without any gate noticing.
  if (armCounts.autolayoutApplied === 0)
    failures.push('A4 autolayout arm: the arm never applied — no built frame carried a layoutMode, so itemSpacing, the four paddings, both alignments and both sizing modes were never checked on anything.');
  if (armCounts.autolayoutSkipped === 0)
    failures.push('A4 autolayout arm: the arm never skipped — every frame carried a layoutMode, so the inapplicability branch is untested and a mutation deleting it would pass.');

  // A6's OWN NON-VACUITY, and it is here because a mutation found the hole rather than because the
  // shape was foreseen. Emptying `nominated()` made every arm above pass: with no nominated names the
  // shim seeds no components, so the executor's swap path finds no target, falls back to
  // `api.createFrame()`, and builds zero instances — leaving A6 with nothing to disagree about and a
  // clean exit. That is `docs/34` shape 2 inside this gate: the expected set and the shim's component
  // list are ONE derivation, so A6 cannot catch a nomination that is merely wrong.
  //
  // Stated as a limit rather than argued away. What A6 does still hold is the case that derivation
  // cannot reach — an INSTANCE arriving from somewhere other than a nominated main component, whose
  // source is null or unknown (a `clone()`, or a future `setByName` member path the shim does not seed
  // from nominations) — plus this count, which is the arm refusing to report a carve-out it never
  // exercised. The corpus nominates swap and nest targets today, so zero is a broken harness.
  if (instancesChecked === 0)
    failures.push('A6 instance-nomination: the sweep built no INSTANCE or COMPONENT at all, so the nomination carve-out covered nothing and could not have failed. The corpus nominates swap and nest targets, so zero means the shim stopped seeding them or the executor stopped instantiating them — either way this arm is decoration until it is fixed.');

  // A5 — same for the imported-glyph exemption.
  if (armCounts.inkExempt === 0)
    failures.push('A5 imported-ink arm: no node was recorded as imported, so the glyphSvg exemption is untested. Either the corpus has no GLYPH or the shim stopped marking the importer’s descendants.');
  if (armCounts.inkApplied === 0)
    failures.push('A5 imported-ink arm: every node was exempt, so fills, strokes and constraints were never checked on anything.');

  // ── report ────────────────────────────────────────────────────────────────────────────────────────
  const banner = 'lint-unclaimed-defaults';
  console.log(`${banner}: swept ${defsSwept} defs, ${nodesChecked} built nodes checked, ${instancesChecked} instances exempt by nomination.`);
  console.log(`${banner}: ${VISUALLY_SIGNIFICANT.length} rows over ${PROMISED_TYPES.join(', ')}; auto-layout arm applied ${armCounts.autolayoutApplied} / skipped ${armCounts.autolayoutSkipped}; ink arm applied ${armCounts.inkApplied} / exempt ${armCounts.inkExempt}.`);

  if (misses.length) {
    // Grouped by def + type + property, because 288 identical misses across one variant grid are one
    // defect and printing them 288 times buries the other ones.
    const groups = new Map<string, { m: Miss; n: number }>();
    for (const m of misses) {
      const k = `${m.def}|${m.type}|${m.prop}`;
      const g = groups.get(k);
      if (g) g.n++; else groups.set(k, { m, n: 1 });
    }
    const rows = [...groups.values()].sort((a, b) => b.n - a.n);
    console.log(`\nA1 unclaimed-property: ${misses.length} node/property pairs across ${groups.size} def/type/property groups carry a value this executor never decided.\n`);
    for (const g of rows.slice(0, PRINT_CAP))
      console.log(`  A1 unclaimed-property: ${g.m.def} · ${g.m.type} · ${g.m.prop} — ${g.n} node${g.n === 1 ? '' : 's'} (e.g. "${g.m.name}") keep Figma's default ${g.m.deflt} → ${g.m.seen}`);
    if (rows.length > PRINT_CAP)
      console.log(`  ... ${rows.length - PRINT_CAP} further groups not printed (cap ${PRINT_CAP}); total is the ${groups.size} above.`);
    failures.push(`A1 unclaimed-property: ${misses.length} unclaimed node/property pairs in ${groups.size} groups. Every visually-significant property a built node carries must be written by this executor — from a plan entry, or explicitly as Figma's own default (#865).`);
  }

  if (failures.length) {
    console.log(`\n${banner}: FAIL — ${failures.length} assertion${failures.length === 1 ? '' : 's'}`);
    for (const f of failures) console.log(`  ${f}`);
    process.exit(1);
  }
  console.log(`${banner}: PASS — every visually-significant property on every built node traces to a decision.`);
};

await main();
