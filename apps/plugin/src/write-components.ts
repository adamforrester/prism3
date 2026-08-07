/**
 * Prism3 Figma plugin — the MAIN-THREAD COMPONENT write adapter (#487 step 5).
 *
 * The component-tier sibling of `write-figma.ts` (variables), `write-styles.ts` (effect/paint styles)
 * and `write-text-styles.ts` (text styles), and the FIRST production consumer of `AnatomyPlan`: until
 * this file the engine's component lane had exactly one writer, the plugin-JS string
 * `anatomy-figma.ts` emits for `figma_execute`, and only the test suite ever drove it.
 *
 * ONE PLAN, TWO EXECUTORS — the same relationship `WritePlan` has to `applyWritePlan` and the token
 * paste passes, and the reason the token tier cannot drift. `planSetLayout` (the engine's offline half:
 * the three set-level guards, the variant grid, the derived component properties and the part→property
 * wiring) is SHARED with the paste path rather than reimplemented, because the alternative is two
 * copies of sixty lines of guarded grid arithmetic and the payload's own comments record what happens
 * to a second copy. What is NOT shared, and cannot be, is everything below: the node building, the
 * combine ordering, the position writing and every read-back. That is where the two paths are
 * independent implementations, and it is what `test.ts`'s parity gate compares.
 *
 * MODELLED ON THE CHUNKED PASTE, NOT THE SINGLE-SHOT ONE, for a reason that is about the host rather
 * than the code: a plugin has no 45KB transport ceiling, so it never needs to chunk — but it does need
 * to survive a designer pressing the button twice, which the single-shot payload does not (a second
 * paste combines a second set beside the first). So this is find-or-create the set by name, skip
 * members already present, append, re-lay-out the UNION and resize — i.e. the chunked shape with one
 * chunk of unbounded size. Re-running is idempotent and says what it skipped.
 *
 * MISS STRINGS ARE DELIBERATELY BYTE-IDENTICAL to the paste payload's for every condition both paths
 * can hit while BUILDING a node. That is not tidiness: it is what lets the parity gate compare the two
 * executors' `misses` as sets rather than merely counting them, so a path that reports the wrong CAUSE
 * fails. The set-level messages diverge where the hosts genuinely do (a plugin has no chunk index).
 *
 * Compiled under `tsconfig.main.json` — has `figma.*`, NO `document`. The `ComponentsApi` port is the
 * minimal slice of `figma` the executor touches, so it is unit-testable against an in-memory shim (see
 * `plugin/test-write-components.ts`); the real `figma` structurally satisfies it, asserted by
 * `PortHolds` below because — unlike every sibling executor — nothing in `main.ts` calls this lane yet
 * and so no call site would catch the port drifting out of satisfaction.
 */
import { planSetLayout } from '../../../Prism3/engine/anatomy-figma';
import type { AnatomyPlan, FigmaNodePlan } from '../../../Prism3/engine/anatomy-figma';

/** A Figma variable as this lane needs it: a name to index by, an id nothing here reads, and the
 *  consumer-resolver the one unbindable geometry value goes through (`absoluteInset` — `x`/`y` accept
 *  no binding, so the payload resolves the name to a VALUE; see `FigmaNodePlan.absoluteInset`). */
export interface CompVariable {
  id: string;
  name: string;
  /** `consumer` is typed as the WIDE `unknown` rather than `CompNode`, and that is a fact about
   *  variance rather than laziness: Figma declares this parameter as the full `SceneNode` union, and a
   *  port naming a NARROWER parameter type is not satisfied by a method taking a wider one. `unknown`
   *  is wider than `SceneNode`, so `Variable` satisfies this — and the executor passes a real node in,
   *  which is the only direction that matters here. */
  resolveForConsumer(consumer: unknown): { value: unknown };
}

/** A Figma style (text or effect) as this lane needs it — a name to find it by and the id the two
 *  async setters take. Both namespaces have the same shape here; they stay separate maps because they
 *  are separate namespaces in Figma (see `FigmaNodePlan.effectStyle`). */
export interface CompStyle { id: string; name: string; fontName?: { family: string; style: string } }

/** A component already in the file, resolved by NAME — the swap targets and the nested shared
 *  components a plan nominates. `id` because an `INSTANCE_SWAP` property's default must be a node id. */
export interface CompRef { id: string; name: string; createInstance(): CompNode }

/**
 * The node surface the executor writes.
 *
 * EVERY FIELD IS OPTIONAL, and that is a fact about Figma rather than a hedge: the nodes this port has
 * to accept are a union (FrameNode, TextNode, InstanceNode, and whatever `children` hands back), and
 * no single one of them carries all of these — `characters` is text-only, `clipsContent` and
 * `strokesIncludedInLayout` are frame-only, `findAll` exists only where children do. A port that
 * required any of them would stop being satisfiable by the real `figma`, which is the one property it
 * exists to have. The read surfaces are typed `unknown` for the same reason `write-styles.ts` types
 * its write surfaces loosely, in the other direction: Figma's `fills` is `Paint[] | typeof mixed`, and
 * naming our narrower shape here would make the global fail to satisfy the port.
 */
export interface CompNode {
  readonly type?: string;
  name?: string;
  x?: number;
  y?: number;
  opacity?: number;
  characters?: string;
  clipsContent?: boolean;
  constrainProportions?: boolean;
  strokesIncludedInLayout?: boolean;
  readonly width?: number;
  readonly height?: number;
  readonly boundVariables?: unknown;
  fills?: unknown;
  strokes?: unknown;
  strokeWeight?: unknown;
  strokeAlign?: unknown;
  layoutMode?: unknown;
  primaryAxisAlignItems?: unknown;
  counterAxisAlignItems?: unknown;
  primaryAxisSizingMode?: unknown;
  counterAxisSizingMode?: unknown;
  layoutPositioning?: unknown;
  constraints?: unknown;
  componentPropertyReferences?: unknown;
  resize?(width: number, height: number): void;
  appendChild?(child: CompNode): void;
  findAll?(predicate?: (node: CompNode) => boolean): unknown[];
  findOne?(predicate: (node: CompNode) => boolean): unknown;
  /** `| null` is not an option the executor uses — it is what makes the real `figma` satisfy this port.
   *  Figma's `setBoundVariable` is OVERLOADED (`variableId: string | null` and `variable: Variable |
   *  null`), and a port omitting the `null` matches neither overload. */
  setBoundVariable?(field: string, variable: CompVariable | null): void;
  setTextStyleIdAsync?(id: string): Promise<void>;
  setEffectStyleIdAsync?(id: string): Promise<void>;
}

/** A COMPONENT_SET, which has a surface no ordinary node does. `componentPropertyDefinitions` is a
 *  getter that THROWS on a set with duplicate member names — see the guarded read below. */
export interface CompSet extends CompNode {
  readonly id?: string;
  readonly children?: readonly CompNode[];
  readonly componentPropertyDefinitions?: Record<string, { type?: string; variantOptions?: readonly string[] }>;
  addComponentProperty?(name: string, type: string, defaultValue: string | boolean): string;
}

/** The minimal `figma` surface the component executor needs — declared as a port so the Node harness
 *  can drive it with a shim. The real `figma` satisfies it structurally (asserted by `PortHolds`). */
export interface ComponentsApi {
  variables: {
    getLocalVariablesAsync(type?: string): Promise<CompVariable[]>;
    /** Returns a NEW paint rather than mutating the node, so the result has to be assigned back into a
     *  `fills`/`strokes` array — forgetting that assignment is a no-op that throws nothing.
     *
     *  `variable: unknown` for the variance reason `CompVariable.resolveForConsumer` documents: Figma's
     *  parameter is the full `Variable | null`, and a port naming the narrower `CompVariable` is not
     *  satisfied by it. The executor only ever passes a `CompVariable` in. */
    setBoundVariableForPaint(
      paint: { type: 'SOLID'; color: { r: number; g: number; b: number } },
      field: 'color',
      variable: unknown,
    ): unknown;
  };
  getLocalTextStylesAsync(): Promise<CompStyle[]>;
  getLocalEffectStylesAsync(): Promise<CompStyle[]>;
  loadFontAsync(fontName: { family: string; style: string }): Promise<void>;
  /** Required under `documentAccess:"dynamic-page"` before `figma.root` may be searched. */
  loadAllPagesAsync(): Promise<void>;
  /** Swap and nest targets are resolved across the WHOLE file, not the current page — the FPO icon
   *  lives wherever the file's author put it, and a `currentPage` search would miss it silently.
   *
   *  Typed as `readonly unknown[]` and narrowed at the call site, which is the only shape the real
   *  `figma` satisfies: Figma's `findAllWithCriteria` is generic over `NodeType[]` and its return type
   *  is a union INCLUDING `PageNode`, which has no `createInstance`. Return types are covariant, so
   *  there is no port-side narrowing that a `PageNode`-carrying union satisfies. We ask for `COMPONENT`
   *  and cast once, next to the criteria that make the cast true.
   *
   *  `types` is the LITERAL `'COMPONENT'[]` rather than `string[]` for the same variance reason: Figma
   *  constrains this to its `NodeType` union, so a port asking for any `string` is not satisfied. This
   *  lane only ever searches for components, so naming that is no loss. */
  root: { findAllWithCriteria(criteria: { types: 'COMPONENT'[] }): readonly unknown[] };
  createText(): CompNode;
  createFrame(): CompNode;
  createComponentFromNode(node: CompNode): CompNode;
  combineAsVariants(nodes: readonly CompNode[], parent: unknown): CompSet;
  currentPage: {
    appendChild(child: CompNode): void;
    findOne(predicate: (node: CompNode) => boolean): unknown;
  };
}

/**
 * The real `figma` satisfies the port — a COMPILE-TIME assertion, and the only one of the four write
 * lanes that needs one written out.
 *
 * The others are proven at their call site: `main.ts` passes `figma` / `figma.variables` straight into
 * `applyStylesPlan` and friends, so tsc checks satisfaction on every typecheck. This lane has no such
 * call site yet — materialising a component set is a designer ACTION with its own trigger, not part of
 * `apply-theme`, so wiring it is a separate concern (#483). Without this line the port could drift out
 * of structural satisfaction and the whole suite would stay green, with the failure surfacing the day
 * the lane is wired, inside Figma. `typeof figma` is a type position, so nothing here runs in Node.
 */
type Assert<T extends true> = T;
export type PortHolds = Assert<typeof figma extends ComponentsApi ? true : false>;

/** What the component executor did — surfaced to the UI + asserted by the harness. Deliberately the
 *  same field set the paste payload returns, so the parity gate compares like with like rather than
 *  translating between two report shapes. */
export type ComponentApplyResult = {
  /** The set's name, or `null` when nothing could be assembled (the one hard failure here). */
  set: string | null;
  id: string;
  /** Members in the set AFTER this run, and members this run actually built. Both, because a run that
   *  skipped everything and a run that built its whole set are indistinguishable from the total alone —
   *  and the first is the one worth noticing, since it means the set was already there. */
  variants: number;
  added: number;
  size: [number, number];
  /** rows × cols of the computed grid. */
  grid: [number, number];
  /** The axes Figma actually DERIVED from the member names, as `key:valueCount`. */
  axes: string[];
  /** The component properties on the set, as `name:TYPE`. */
  properties: string[];
  /** References written, and the number of MEMBERS they were spread across. Both, because `refs` is a
   *  write count: 42 writes onto one member satisfies it as readily as 42 across twenty-one, and the
   *  whole point of the per-member loop is that references do NOT propagate. */
  refs: number;
  wiredMembers: number;
  /** Non-fatal: a name that did not resolve, a write Figma discarded, a read-back that disagreed. */
  misses: string[];
};

/** The node as the executor USES it — every field present, none of them narrowed. The cast happens
 *  once per created node rather than per field, because the PLAN decided the node kind: a TEXT node's
 *  `characters` is not in doubt. The two genuine runtime forks Figma does have keep their `in` checks
 *  below, since those are facts about the host and not about the plan. */
type Wr = { -readonly [K in keyof CompNode]-?: CompNode[K] };
const wr = (node: CompNode): Wr => node as Wr;

/** A paint reads back as bound only via `.color` on the paint OBJECT — `node.boundVariables.fills` is
 *  not where a paint binding lives, so a read-back looking there would silently always pass. */
const boundPaint = (arr: unknown): boolean => {
  const first = (arr as { boundVariables?: { color?: unknown } }[] | null | undefined)?.[0];
  return !!(first && first.boundVariables && first.boundVariables.color);
};

/**
 * Materialise a plan set into a live Figma COMPONENT_SET.
 *
 * Idempotent: find the set by name, skip members already present, append the rest, re-lay-out and
 * resize the union. Every behaviour here was measured live against Figma while writing the paste path
 * (`anatomy-figma.ts`'s `PAYLOAD_*` constants carry the measurements); the ones the obvious
 * implementation gets wrong, and which this therefore states explicitly:
 *
 *  - `constrainProportions = false` BEFORE any dimension binding. A proportion-locked node keeps only
 *    the last of two dimension bindings — the second setter evicts the first, silently. An instance
 *    inherits the lock from its main component, and every slot binds width AND height.
 *  - NO `resize()` after binding: it CLEARS every dimension binding. The one `resize` here is on an
 *    absolute part, which binds no dimensions by construction.
 *  - Properties on the SET and only AFTER combining. `addComponentProperty` throws on a member, and
 *    `combineAsVariants` REWRITES the ids of anything declared before it.
 *  - `componentPropertyReferences` do not propagate: wiring one member leaves the others inert.
 *  - Appending does NOT grow the set's frame, hence the explicit `resize`.
 */
export const applyComponentPlan = async (plans: AnatomyPlan[], api: ComponentsApi): Promise<ComponentApplyResult> => {
  // The OFFLINE half, shared with the paste path: the three set-level guards (one component, one axis
  // shape, no duplicate coordinate), the grid, the derived properties and the part→property refs. It
  // THROWS on a set that could not be assembled coherently, which is the right moment to fail — before
  // anything reaches the file.
  const { cells, props, refs, axes, rows, cols, component } = planSetLayout(plans, 'applyComponentPlan');
  const misses: string[] = [];

  // Four namespaces, four name→object maps. Unfiltered variable fetch, the #146 lesson: a
  // type-filtered call returns only that type, and a plan binds FLOAT dimensions and COLOR paints.
  const byName = new Map((await api.variables.getLocalVariablesAsync()).map((v) => [v.name, v] as const));
  const styleByName = new Map((await api.getLocalTextStylesAsync()).map((s) => [s.name, s] as const));
  const effectByName = new Map((await api.getLocalEffectStylesAsync()).map((s) => [s.name, s] as const));
  await api.loadAllPagesAsync();
  // The cast lives HERE, next to the criteria that make it true: `types: ['COMPONENT']` is what
  // guarantees every result is a `CompRef` (see the port's note on why the port itself cannot say so).
  const compByName = new Map((api.root.findAllWithCriteria({ types: ['COMPONENT'] }) as readonly CompRef[]).map((c) => [c.name, c] as const));

  /** Build one node and its subtree. Returns `null` for a NESTED_INSTANCE whose shared component is
   *  absent — no placeholder, deliberately: an unstroked frame in a focus ring's place is invisible and
   *  reads as a ring that built fine, where a slot's placeholder is a box a designer can still fill. */
  const build = async (n: FigmaNodePlan): Promise<Wr | null> => {
    let node: Wr;
    if (n.type === 'TEXT') node = wr(api.createText());
    else if (n.type === 'INSTANCE_SWAP') {
      const target = n.swapTarget ? compByName.get(n.swapTarget) : undefined;
      if (!n.swapTarget) misses.push(`${n.name}.swapTarget -> (none nominated; built as a placeholder frame)`);
      else if (!target) misses.push(`${n.name}.swapTarget -> ${n.swapTarget}`);
      node = wr(target ? target.createInstance() : api.createFrame());
    } else if (n.type === 'NESTED_INSTANCE') {
      const nested = n.nestTarget ? compByName.get(n.nestTarget) : undefined;
      if (!nested) {
        misses.push(`${n.name}.nestTarget -> ${n.nestTarget} (not in this file; nothing built — publish the shared component first)`);
        return null;
      }
      node = wr(nested.createInstance());
    } else {
      node = wr(api.createFrame());
      node.clipsContent = false;
    }
    node.name = n.name;
    // Before ANY dimension binding — see the header note. `in` rather than unconditional because an
    // instance and a frame differ here, which is a fact about the host.
    if ('constrainProportions' in node) node.constrainProportions = false;

    if (n.textStyle) {
      const st = styleByName.get(n.textStyle);
      if (!st) misses.push(`${n.name}.textStyle -> ${n.textStyle}`);
      else {
        // The STYLE'S OWN font, loaded before the style is applied: `setTextStyleIdAsync` pulls in a
        // family/style pair that need not be the one `createText` starts on, and Figma requires a font
        // to be loaded before any text write. A hard-coded `Inter Regular` would be a guess about a
        // brand's typography.
        if (st.fontName) {
          try { await api.loadFontAsync(st.fontName); }
          catch (err) { misses.push(`${n.name}.font -> ${st.fontName.family} ${st.fontName.style} (${(err as Error).message})`); }
        }
        await node.setTextStyleIdAsync?.(st.id);
      }
    }
    // The PLACEHOLDER copy, after the style so it is written on a node already carrying the right font.
    // Both orders work (measured); this one is chosen for reading order.
    if (typeof n.characters === 'string') {
      try { node.characters = n.characters; }
      catch (err) { misses.push(`${n.name}.characters -> ${JSON.stringify(n.characters)} (${(err as Error).message})`); }
      // READ BACK: a text node that silently kept nothing is the empty-label set #510 shipped.
      if (node.characters !== n.characters)
        misses.push(`${n.name}.characters -> DISCARDED (set ${JSON.stringify(n.characters)}, reads ${JSON.stringify(node.characters)})`);
    }
    if (n.effectStyle) {
      const ef = effectByName.get(n.effectStyle);
      if (!ef) misses.push(`${n.name}.effectStyle -> ${n.effectStyle}`);
      else await node.setEffectStyleIdAsync?.(ef.id);
    }
    if (n.layoutMode) {
      node.layoutMode = n.layoutMode;
      node.primaryAxisAlignItems = n.primaryAxisAlignItems;
      node.counterAxisAlignItems = n.counterAxisAlignItems;
      node.primaryAxisSizingMode = n.primaryAxisSizingMode;
      node.counterAxisSizingMode = n.counterAxisSizingMode;
    }

    // `wrote` is what was ACTUALLY set, not what the plan declared — a name that does not resolve is
    // skipped. The read-back iterates this so an unresolved name reports its one true cause instead of
    // also claiming Figma discarded a write that was never attempted.
    const wrote: string[] = [];
    for (const [prop, varName] of Object.entries(n.bound)) {
      const v = byName.get(varName);
      if (!v) { misses.push(`${n.name}.${prop} -> ${varName}`); continue; }
      node.setBoundVariable?.(prop, v);
      wrote.push(prop);
    }

    // PAINTS — a fourth API shape, and the returned paint must be assigned BACK into the array.
    const paint = (varName: string, where: string): unknown => {
      const v = byName.get(varName);
      if (!v) { misses.push(`${n.name}.${where} -> ${varName}`); return null; }
      return api.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v);
    };
    // Same reason as `wrote`: only a paint that was actually assigned can have been discarded.
    let paintedFills = false;
    let paintedStrokes = false;
    if (n.paints?.fills) {
      const p = paint(n.paints.fills, 'fills');
      if (p) { node.fills = [p]; paintedFills = true; }
    }
    if (n.paints?.strokes) {
      const p = paint(n.paints.strokes, 'strokes');
      if (p) {
        node.strokes = [p];
        paintedStrokes = true;
        // A stroke variable with no weight binds correctly and paints nothing visible.
        if (!node.strokeWeight) node.strokeWeight = 1;
        node.strokeAlign = 'INSIDE';
        // BORDER-BOX, and Figma defaults the other way: left alone, the stroke is ADDED to the
        // auto-layout size, so an outline button measured 62 where its filled sibling measured 60 —
        // swapping `appearance` moved the footprint, the one thing a variant axis must not do.
        if ('strokesIncludedInLayout' in node) node.strokesIncludedInLayout = false;
      }
    }
    if (n.descendantFills) {
      // The ink lives on the VECTORs inside the swapped instance; an instance fill paints a square
      // behind the glyph.
      const vecs = node.findAll ? node.findAll((x) => x.type === 'VECTOR') : [];
      if (vecs.length === 0)
        misses.push(`${n.name}.descendantFills -> ${n.descendantFills} (no VECTOR inside the instance to paint)`);
      for (const vec of vecs) {
        const p = paint(n.descendantFills, 'descendantFills');
        if (p) wr(vec as CompNode).fills = [p];
      }
    }

    // READ BACK. The name resolved and the setter did not throw, which is not the same as the binding
    // being there — a Figma setter that accepts a call is not a Figma setter that honoured it.
    const got = (node.boundVariables ?? {}) as Record<string, unknown>;
    for (const prop of wrote)
      if (!got[prop]) misses.push(`${n.name}.${prop} -> DISCARDED (resolved, set, not retained)`);
    if (paintedFills && !boundPaint(node.fills)) misses.push(`${n.name}.fills -> DISCARDED (paint set, not retained)`);
    if (paintedStrokes && !boundPaint(node.strokes)) misses.push(`${n.name}.strokes -> DISCARDED (paint set, not retained)`);

    // FLOW CHILDREN FIRST, absolute ones after — three passes, because an absolute child is positioned
    // against its parent's FINAL size and the parent hugs its flow content. One loop would read
    // `node.width` mid-append and make the result depend on the part's ORDER in the def.
    const absolutes: [FigmaNodePlan, Wr][] = [];
    const centered: [FigmaNodePlan, Wr][] = [];
    for (const c of n.children) {
      const kid = await build(c);
      if (!kid) continue;   // a missing shared component — one precise miss, the rest still builds
      node.appendChild?.(kid);
      if (c.absoluteInset) absolutes.push([c, kid]);
      if (c.absoluteCenter) centered.push([c, kid]);
      // Written straight rather than bound: a brand does not get to theme a label under a spinner to
      // half-visible. `visible:false` would yield the cell and collapse the button.
      if (c.zeroOpacity) kid.opacity = 0;
    }
    // A CENTERED absolute child (#612's pending spinner with no leading cell to take). NOT resized:
    // unlike the ring it keeps its own square size, and its `size` binding is already on it — `resize`
    // would clear that binding.
    for (const [c, kid] of centered) {
      kid.layoutPositioning = 'ABSOLUTE';
      kid.x = ((node.width ?? 0) - (kid.width ?? 0)) / 2;
      kid.y = ((node.height ?? 0) - (kid.height ?? 0)) / 2;
      kid.constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
      // READ BACK: a centered child that quietly stayed in the flow ADDS a cell, which is the precise
      // defect this mechanism exists to prevent.
      if (kid.layoutPositioning !== 'ABSOLUTE')
        misses.push(`${c.name}.layoutPositioning -> DISCARDED (set ABSOLUTE, reads ${kid.layoutPositioning}; the spinner would take a cell and the button would grow on pending)`);
    }
    // Applied by the PARENT, because every fact here is about the child's relationship to it:
    // `layoutPositioning` only means anything inside an auto-layout parent, and the parent's size is
    // what the inset is measured from.
    for (const [c, kid] of absolutes) {
      const v = byName.get(c.absoluteInset!);
      if (!v) { misses.push(`${c.name}.absoluteInset -> ${c.absoluteInset}`); continue; }
      kid.layoutPositioning = 'ABSOLUTE';
      // The VALUE, because `x`/`y` accept no binding — the one place a resolved number is written
      // instead of a binding, and why the plan carries a name (it stays brand-invariant; the freeze
      // happens here, per file). `resolveForConsumer` rather than `valuesByMode`: the value is itself
      // an alias to a dimension primitive, so the raw map hands back a VARIABLE_ALIAS object.
      const off = v.resolveForConsumer(kid).value;
      if (typeof off !== 'number') {
        misses.push(`${c.name}.absoluteInset -> ${c.absoluteInset} resolved to ${JSON.stringify(off)}, not a number`);
        continue;
      }
      // Grown on every side: a ring at offset 2 sits 2px OUTSIDE its target. `resize` is safe HERE and
      // nowhere else — an absolute part binds no dimensions by construction (gated in the validator).
      kid.resize?.((node.width ?? 0) + off * 2, (node.height ?? 0) + off * 2);
      kid.x = -off;
      kid.y = -off;
      // STRETCH so the ring tracks its target when a designer resizes a variant; without it the ring
      // keeps the size it was pasted at, silently, because it looks right at that one size.
      kid.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
      if (kid.layoutPositioning !== 'ABSOLUTE')
        misses.push(`${c.name}.layoutPositioning -> DISCARDED (set ABSOLUTE, reads ${kid.layoutPositioning}; the ring would take a cell in the row)`);
    }
    return node;
  };

  // ---- assemble the SET ---------------------------------------------------------------------
  // FIND OR CREATE, by what is in the FILE rather than by a flag: a second run must append into the
  // set the first one made (and then skip everything by name) rather than combine a second set beside
  // it. This is the one behaviour the single-shot paste payload does not have and a plugin needs, since
  // a designer can press the button twice.
  let set = api.currentPage.findOne((n) => n.type === 'COMPONENT_SET' && n.name === component) as CompSet | null;
  const have = new Set((set?.children ?? []).map((c) => c.name));
  const byCell = new Map(cells.map((c) => [c.name, c] as const));

  const fresh: CompNode[] = [];
  for (const spec of cells) {
    if (have.has(spec.name)) { misses.push(`member ${spec.name} -> ALREADY PRESENT (skipped; this set has been written before)`); continue; }
    const root = await build(spec.root);
    if (!root) continue;   // its own miss is already recorded, precisely
    api.currentPage.appendChild(root);
    const comp = wr(api.createComponentFromNode(root));
    comp.name = spec.name;
    fresh.push(comp);
  }
  if (!set) {
    if (fresh.length === 0) {
      misses.push('set -> nothing to combine (no members built)');
      return { set: null, id: '', variants: 0, added: 0, size: [0, 0], grid: [rows, cols], axes: [], properties: [], refs: 0, wiredMembers: 0, misses };
    }
    // COMBINE, once. Every later member joins by `appendChild`, which re-derives the axes correctly —
    // measured: appending `state=pressed` to a `state=rest|hover` set extends that axis.
    set = api.combineAsVariants(fresh, api.currentPage);
    wr(set).name = component;
  } else for (const c of fresh) set.appendChild?.(c);
  const members = [...(set.children ?? [])];

  // LAY OUT. Column pitch is MEASURED, not computed: a hug-width button is as wide as its label and
  // only Figma knows that, so a fixed pitch either overlaps the long ones or strands the short ones.
  // The whole union is measured and repositioned, not just this run's members, so the layout is correct
  // for whatever is present and self-correcting as a later run widens a column.
  const GAP = 24;
  const cellOf = members.map((c) => byCell.get(String(c.name)));
  const colW: number[] = [];
  const rowH: number[] = [];
  members.forEach((c, i) => {
    const cell = cellOf[i];
    if (!cell) return;
    colW[cell.col] = Math.max(colW[cell.col] ?? 0, c.width ?? 0);
    rowH[cell.row] = Math.max(rowH[cell.row] ?? 0, c.height ?? 0);
  });
  const at = (arr: number[], n: number): number => arr.slice(0, n).reduce((a, b) => a + (b || 0) + GAP, 0);
  const stray: string[] = [];
  members.forEach((c, i) => {
    const cell = cellOf[i];
    // A member whose name is not a coordinate this generator emits — someone's manual copy. Left where
    // it is and reported, because silently relocating it to a guessed cell is worse than visible.
    if (!cell) { stray.push(`member ${c.name} -> NOT A GENERATED VARIANT (left in place; it will not follow the grid)`); return; }
    const m = wr(c);
    m.x = at(colW, cell.col);
    m.y = at(rowH, cell.row);
  });
  // RESIZE, because appending does NOT grow the set's frame: a member appended at x=208 to a 184-wide
  // set leaves it 184 wide, with the member outside its own box, and nothing throws.
  const wantW = Math.max(1, at(colW, colW.length) - GAP);
  const wantH = Math.max(1, at(rowH, rowH.length) - GAP);
  if (colW.length && rowH.length) set.resize?.(wantW, wantH);
  // READ BACK THE BOX, because `resize` is the one call here with no other witness. Compared against
  // the offline expectation rather than against the members, so a resize that ran and landed somewhere
  // else is caught too.
  const boxMiss: string[] = [];
  if (colW.length && rowH.length && (Math.round(set.width ?? 0) < Math.round(wantW) || Math.round(set.height ?? 0) < Math.round(wantH)))
    boxMiss.push(`set -> BOX ${Math.round(set.width ?? 0)}x${Math.round(set.height ?? 0)} does not contain its ${members.length} members (${Math.round(wantW)}x${Math.round(wantH)} needed; appending does NOT grow the frame)`);

  // READ BACK the definitions, GUARDED. A duplicate member name poisons this getter live ("Component
  // set has existing errors") while `addComponentProperty` keeps succeeding, so an unguarded read
  // throws with no indication of which member caused it — and takes the whole report with it.
  let defs: Record<string, { type?: string; variantOptions?: readonly string[] }> = {};
  let readable = false;
  try { defs = set.componentPropertyDefinitions ?? {}; readable = true; }
  catch (err) { misses.push(`set -> UNREADABLE (${(err as Error).message}) — two members almost certainly share a name, which combineAsVariants accepts silently`); }

  // VARIANT ONLY, and load-bearing rather than tidy: non-variant properties come back with a NODE-ID
  // SUFFIX (`children#104:25`) while variant keys do not, so comparing all keys reports an axis
  // mismatch on a perfectly correct set the moment one TEXT property exists.
  const derived = readable ? Object.keys(defs).filter((k) => defs[k].type === 'VARIANT').sort() : [];
  const expected = axes.split(',').slice().sort();
  const axisMiss = readable && JSON.stringify(derived) !== JSON.stringify(expected)
    ? [`axes -> derived [${derived.join(',')}] but the names declared [${expected.join(',')}]`]
    : [];

  // ---- COMPONENT PROPERTIES, on the set and only after combining -----------------------------
  // Emptied rather than skipped on an unreadable set: the UNREADABLE miss above is the single cause,
  // and declaring properties on a poisoned set would bury it under a dozen consequences.
  // SKIP BY NAME: re-declaring an existing property does NOT throw — Figma silently creates a SECOND
  // property (`leadingVisual2#113:102`) and hands back an id whose own name does not match the key it
  // just made. A re-run would double every property and wire the refs to the copies.
  const byBareName = new Map<string, string>();
  for (const k of Object.keys(defs)) if (defs[k].type !== 'VARIANT') byBareName.set(k.split('#')[0], k);
  const propIds = new Map<string, string>();
  for (const p of readable ? props : []) {
    const already = byBareName.get(p.name);
    if (already) {
      if (defs[already].type === p.type) { propIds.set(p.name, already); continue; }
      misses.push(`property ${p.name} -> ALREADY on the set as ${defs[already].type} but this paste declares ${p.type} (left alone; declaring it again would silently create a second property called ${p.name}2)`);
      continue;
    }
    let def: string | boolean;
    if (p.type === 'INSTANCE_SWAP') {
      // Figma demands a NODE ID. The component `key`, `''`, `null` and `undefined` are each rejected,
      // so an unresolvable target is not a missing default — it is a property that cannot be created.
      const target = compByName.get(p.swapTarget);
      if (!target) { misses.push(`property ${p.name} -> swap target ${p.swapTarget} (not found; property not created)`); continue; }
      def = target.id;
    } else def = p.default;
    try {
      const id = set.addComponentProperty?.(p.name, p.type, def);
      if (id) propIds.set(p.name, id);
    } catch (err) { misses.push(`property ${p.name} -> ${p.type} REFUSED (${(err as Error).message})`); }
  }

  // WIRE the references, per MEMBER. They do NOT propagate: setting one on the first variant leaves
  // every sibling's `componentPropertyReferences` empty, so a set wired once looks correct on whichever
  // variant a designer inspects and is inert on the other twenty.
  const wiredRefs: [string, string, string, string][] = [];
  for (const member of readable ? members : []) {
    for (const r of refs) {
      const node = member.findOne?.((x) => x.name === r.part) as CompNode | null | undefined;
      // An optional part absent from THIS variant builds no node, so there is nothing to wire — the
      // legitimate case. `planSetProperties` only declares a property some node references.
      if (!node) continue;
      const id = propIds.get(r.prop);
      if (!id) continue;   // the property itself failed above and reported its own cause
      try {
        wr(node).componentPropertyReferences = Object.assign({}, (node.componentPropertyReferences ?? {}) as object, { [r.field]: id });
        wiredRefs.push([String(member.name), r.part, r.field, id]);
      } catch (err) { misses.push(`ref ${member.name}/${r.part}.${r.field} -> ${r.prop} (${(err as Error).message})`); }
    }
  }
  // READ BACK every reference. Figma throws on a reference naming an unknown property, so this covers
  // the other direction — one the setter ACCEPTED and did not retain.
  for (const [mName, part, field, id] of wiredRefs) {
    const member = members.find((c) => c.name === mName);
    const node = member?.findOne?.((x) => x.name === part) as CompNode | null | undefined;
    const held = (node?.componentPropertyReferences ?? undefined) as Record<string, string> | undefined;
    if (held?.[field] !== id) misses.push(`ref ${mName}/${part}.${field} -> DISCARDED (set ${id}, reads ${held?.[field]})`);
  }

  // RE-READ the definitions: the read above happened BEFORE the properties existed, and left stale it
  // reports every property "declared but absent from the set" on a perfectly correct run — noise that
  // masks the two checks below.
  try { defs = set.componentPropertyDefinitions ?? {}; } catch { /* already reported as UNREADABLE */ }
  const propMiss: string[] = [];
  // ONE: a DUPLICATE name is accepted silently and RENAMED (`children` → `children2`, no throw), so the
  // check is that each declared name came back VERBATIM, not that the count matches.
  const bare = new Map<string, string>();
  for (const k of Object.keys(defs)) if (defs[k].type !== 'VARIANT') bare.set(k.split('#')[0], k);
  for (const p of props)
    if (propIds.has(p.name) && !bare.has(p.name))
      propMiss.push(`property ${p.name} -> declared but absent from the set (Figma may have renamed it)`);
  // TWO: an ORPHAN — a property no node references. Figma shows it in the panel and changing it does
  // nothing, which is indistinguishable from a broken component to the designer holding it.
  const referenced = new Set<string>();
  for (const member of members)
    for (const n of [member, ...((member.findAll?.(() => true) ?? []) as CompNode[])])
      for (const id of Object.values((n.componentPropertyReferences ?? {}) as Record<string, string>)) referenced.add(id);
  for (const [name, key] of bare)
    if (!referenced.has(key))
      propMiss.push(`property ${name} -> ORPHAN (declared on the set, referenced by no node — it appears in the panel and does nothing)`);

  // READ BACK the LAYOUT. Two variants at one position is the signature of a set that combined
  // perfectly and is unusable, and it is invisible to every other check here.
  const seen = new Map<string, string>();
  const coincident: string[] = [];
  for (const c of members) {
    const pos = `${c.x},${c.y}`;
    if (seen.has(pos)) coincident.push(`layout -> ${c.name} sits on top of ${seen.get(pos)} at ${pos}`);
    else seen.set(pos, String(c.name));
  }
  // READ BACK the FOOTPRINT. `state` and `appearance` must not move the box: an outline button two
  // pixels wider than its filled sibling breaks a row of buttons, and both variants are individually
  // correct so nothing else notices.
  const sizeByGroup = new Map<string, { box: string; name: string }>();
  const footprint: string[] = [];
  members.forEach((c, i) => {
    const cell = cellOf[i];
    if (!cell) return;
    const box = `${Math.round(c.width ?? 0)}x${Math.round(c.height ?? 0)}`;
    const first = sizeByGroup.get(cell.group);
    if (!first) sizeByGroup.set(cell.group, { box, name: String(c.name) });
    else if (first.box !== box) footprint.push(`footprint -> ${c.name} measures ${box} but ${first.name} measures ${first.box} (same ${cell.group})`);
  });

  return {
    set: String(set.name ?? component),
    id: String(set.id ?? ''),
    variants: members.length,
    added: fresh.length,
    size: [set.width ?? 0, set.height ?? 0],
    grid: [rows, cols],
    axes: derived.map((k) => `${k}:${(defs[k]?.variantOptions ?? []).length}`),
    properties: [...bare.keys()].map((k) => `${k}:${defs[bare.get(k)!].type}`),
    refs: wiredRefs.length,
    wiredMembers: new Set(wiredRefs.map((r) => r[0])).size,
    misses: misses.concat(stray, boxMiss, axisMiss, coincident, footprint, propMiss),
  };
};
