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
 * than the code: it needs to survive a designer pressing the button twice, which the single-shot payload
 * does not (a second paste combines a second set beside the first). So this is find-or-create the set by
 * name, skip members already present, append, re-lay-out the UNION and resize. Re-running is idempotent
 * and says what it skipped.
 *
 * AND IT CHUNKS ITS OWN EXECUTION TOO (#684) — which this file's header previously denied, in a sentence
 * worth quoting because it is the exact confusion to avoid: *"a plugin has no 45KB transport ceiling, so
 * it never needs to chunk."* That conflates TRANSPORT SIZE with EXECUTION TIME. The paste path chunks
 * because a `figma_execute` payload has a byte ceiling; a plugin chunks because it runs on Figma's MAIN
 * THREAD, and the question is not how much data moves but how long the event loop is held. With one
 * unbounded chunk, the first live 648-member build left the file unresponsive for **1 min 10 s** after
 * the pill said done, dropped Figma's own Livegraph socket with code 1006, and failed the multiplayer
 * connection — while the file sat in an unsaved state with its sync channel dead. That last part is a
 * data-safety property, not an ergonomic one.
 *
 * So both long loops here — building members, and wiring property references across them — run in chunks
 * with a `yieldTo` between them, and report progress at every boundary. See `ComponentApplyOptions`.
 *
 * UNDO IS ONE STEP FOR THE WHOLE SET, and we get that by NOT calling `figma.commitUndo()` anywhere: by
 * Figma's own default, plugin actions are not committed to undo history individually, so the entire run
 * collapses into a single undo entry. Chunking would let us commit per chunk and it is deliberately not
 * done — a designer who did not mean to build presses ⌘Z once and the set is gone, because "Build Button
 * set" was one action from where they were standing. This is the one host behavior here that is a
 * DECISION rather than a measurement, so it is stated rather than left to be inferred from an absence.
 *
 * MISS STRINGS ARE DELIBERATELY BYTE-IDENTICAL to the paste payload's for every condition both paths
 * can hit while BUILDING a node. That is not tidiness: it is what lets the parity gate compare the two
 * executors' `misses` as sets rather than merely counting them, so a path that reports the wrong CAUSE
 * fails. The set-level messages diverge where the hosts genuinely do (a plugin has no chunk index).
 *
 * Compiled under `tsconfig.main.json` — has `figma.*`, NO `document`. The `ComponentsApi` port is the
 * minimal slice of `figma` the executor touches, so it is unit-testable against an in-memory shim (see
 * `plugin/test-write-components.ts`); the real `figma` structurally satisfies it, which `main.ts`'s
 * `buildComponents` proves on every typecheck by passing the global straight in — the same way the three
 * sibling lanes are proven. Until #483 wired that call site this file carried an explicit `PortHolds`
 * assertion instead, because with no caller the port could have drifted out of satisfaction with the
 * whole suite green; the trigger retired it rather than leaving two mechanisms for one guarantee.
 */
import { planSetLayout, nestMissAdvice, nestVariantMatch, nestVariantMissAdvice, planComponentName, planStamp } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan, FigmaNodePlan } from '@prism3/engine/anatomy-figma';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { tailOf } from '@prism3/engine/figma-names';
import { NS } from './persist-figma';
import type { PartialWriteFacts } from './apply-summary';

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

/** A component SET already in the file, resolved by NAME — a `nest-fixed` part's target (#681).
 *
 *  `children` rather than `componentPropertyDefinitions`, and that is the whole of the resolution rule:
 *  the members' NAMES are the coordinates, and matching against them is order-independent in a way that
 *  matching against Figma's property order is not. `defaultVariant` is deliberately NOT in this port —
 *  Figma offers it, and reading it is `#656`: its value is the set's first child, an artifact of creation
 *  order. A port that cannot name it cannot accidentally fall back to it. */
export interface CompSetRef { id: string; name: string; children?: readonly { name?: string }[] }

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
  strokesIncludedInLayout?: boolean;
  readonly width?: number;
  readonly height?: number;
  /** The scenegraph id (`14:6004`), stable across a node's life. Read-only, and read only to tell one
   *  node from another: #866's identity check compares the node the wire loop wrote to against the one
   *  the read-back finds live in the set, and a name is not unique enough (two members carry a part of
   *  the same name). Absent on the offline shim, where objects are their own identity. */
  readonly id?: string;
  readonly boundVariables?: unknown;
  fills?: unknown;
  /** NO GEOMETRY FIELD, and the absence is deliberate (#864). Figma's SVG importer owns a glyph's
   *  outline, so this executor never writes path data — and it does not READ it either: what it asks of
   *  an imported glyph is whether a VECTOR came back with a non-zero box, which `type` and `width` /
   *  `height` above already answer. A `vectorPaths` port would be a surface for the `createVector` route
   *  the plan's `glyphSvg` field records two measurements against. */
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
  /** THE #865 SURFACE — properties this executor writes only to state Figma's default EXPLICITLY, so
   *  that nothing a built node carries is a default nobody decided. None of these existed on the port
   *  before, and their absence is why the defect was invisible from inside the type: a port that cannot
   *  name `cornerRadius` cannot be reviewed for whether it sets one.
   *
   *  `layoutSizingHorizontal` / `layoutSizingVertical` are deliberately NOT here. Figma documents them
   *  as "a shorthand for setting layoutGrow, layoutAlign, primaryAxisSizingMode, and
   *  counterAxisSizingMode", and: "`HUG` is only valid on auto-layout frames and text nodes. `FILL` is
   *  only valid on auto-layout children. Setting these values when they don't apply will throw." The
   *  four primitives carry the same state and throw on nothing, so the shorthand is a strictly worse
   *  way to say the same thing here. */
  cornerRadius?: unknown;
  dashPattern?: unknown;
  itemSpacing?: unknown;
  paddingLeft?: unknown;
  paddingRight?: unknown;
  paddingTop?: unknown;
  paddingBottom?: unknown;
  layoutAlign?: unknown;
  layoutGrow?: unknown;
  blendMode?: unknown;
  effects?: unknown;
  visible?: boolean;
  rotation?: number;
  /** TYPED, not `unknown`, unlike its neighbours here: #1009 gives it a plan field, so the executor both
   *  writes it and READS IT BACK, and a read-back cannot compare `unknown` to a string. */
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  textAlignHorizontal?: unknown;
  textAutoResize?: unknown;
  textTruncation?: unknown;
  paragraphSpacing?: unknown;
  leadingTrim?: unknown;
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
  /** Releases the node's `targetAspectRatio` — the replacement for the deprecated
   *  `constrainProportions = false` (#682). Optional like every other field here, for the reason the
   *  header gives; but unlike `constrainProportions`, which lives on `LayoutMixin` and so is genuinely
   *  absent from some node types, this rides on `AspectRatioLockMixin`, which EVERY type this executor
   *  creates carries — FrameNode and TextNode declare it directly, InstanceNode and ComponentNode
   *  inherit it through `DefaultFrameMixin` → `BaseFrameMixin`. That is why the call below needs no
   *  presence guard. */
  unlockAspectRatio?(): void;
  /** THE #827 STAMP, read and written on a MEMBER. Shared rather than private plugin data for the reason
   *  `persist-figma.ts` gives: the namespace is the collision boundary, and a stamp a second tool can
   *  read is a stamp a second tool can honor.
   *
   *  Optional like every other field here — but note that a HOST that does not implement these is
   *  indistinguishable from a member that was never stamped, and the executor treats both the same way
   *  (as unknown provenance, which is stale). That is the safe reading in both cases. */
  getSharedPluginData?(namespace: string, key: string): string;
  setSharedPluginData?(namespace: string, key: string, value: string): void;
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
 *  can drive it with a shim. The real `figma` satisfies it structurally, checked on every typecheck by
 *  `main.ts`'s `buildComponents` passing the global in (see the header). */
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
   *  `types` is the LITERAL union of the two node types this lane instantiates from rather than `string[]`,
   *  for the same variance reason: Figma constrains this to its `NodeType` union, so a port asking for any
   *  `string` is not satisfied.
   *
   *  TWO SEARCHES, not one widened search, and the reason is the cast each one licenses (#681). The
   *  `COMPONENT` search's results are cast to `CompRef` and INSTANTIATED; the `COMPONENT_SET` search's are
   *  cast to `CompSetRef` and read for their children's names. A single `types: ['COMPONENT',
   *  'COMPONENT_SET']` call would return a union and put a `ComponentSetNode` — which has no
   *  `createInstance` — inside the map the swap path instantiates from. One criteria list per cast keeps
   *  each cast true at its own call site, which is the property the original comment here was making.
   *
   *  `findAll` is the DIAGNOSTIC half, and it is separate from both on purpose: it is by NAME across every
   *  node type, is called only on the failure path, and its results are read for `type` alone, never
   *  instantiated. */
  root: {
    findAllWithCriteria(criteria: { types: ('COMPONENT' | 'COMPONENT_SET')[] }): readonly unknown[];
    findAll(predicate: (node: { name: string; type: string }) => boolean): readonly { name: string; type: string }[];
  };
  createText(): CompNode;
  createFrame(): CompNode;
  /** A GLYPH, built from the complete SVG document the plan carries (#864) — Figma's own SVG importer,
   *  which returns a FRAME sized to the document's artboard with the outline inside it.
   *
   *  `createVector()` + `vectorPaths` was the alternative, was built first on this branch, and is
   *  deliberately not used. Its two measurements are recorded on `FigmaNodePlan.glyphSvg`: Figma's
   *  `vectorPaths` grammar excludes `H`/`V` (22 of 39 glyphs use them), and a `VectorNode`'s box is its
   *  INK, so `minus` would be a 14×2 main component stretching non-uniformly into the square every host
   *  binds. The extra level the frame adds is the artboard, which is what makes that binding uniform.
   *
   *  **WHAT THIS CANNOT BE CHECKED FOR OFFLINE, stated rather than implied.** `createNodeFromSvg` parses
   *  SVG inside Figma; there is no importer in Node, so no gate in this repo verifies the child structure
   *  it returns. The harness shim below models a frame wrapping a sized vector because that is what the
   *  typings and the editor's own import feature describe, and a model is not evidence. The only
   *  mechanism that can catch the real host disagreeing is the runtime `NO VECTOR` miss at the build
   *  branch — same posture as `lint-absolute-inset.ts`'s header naming what it cannot see. That
   *  mechanism became reliable only with #907, which fixed the build hanging before its summary — the
   *  surface where a miss is read — so a miss reported here is now actually seen. */
  createNodeFromSvg(svg: string): CompNode;
  createComponentFromNode(node: CompNode): CompNode;
  combineAsVariants(nodes: readonly CompNode[], parent: unknown): CompSet;
  currentPage: {
    appendChild(child: CompNode): void;
    findOne(predicate: (node: CompNode) => boolean): unknown;
  };
}

/** What the component executor did — surfaced to the UI + asserted by the harness. Deliberately the
 *  same field set the paste payload returns, so the parity gate compares like with like rather than
 *  translating between two report shapes — with ONE addition, `skipped`, documented on the field. */
export type ComponentApplyResult = {
  /** The set's name, or `null` when nothing could be assembled (the one hard failure here). */
  set: string | null;
  id: string;
  /** Members in the set AFTER this run, and members this run actually built. Both, because a run that
   *  skipped everything and a run that built its whole set are indistinguishable from the total alone —
   *  and the first is the one worth noticing, since it means the set was already there. */
  variants: number;
  added: number;
  /** Members that were ALREADY in the set and were skipped by name — the idempotent re-run's whole
   *  story, as a COUNT.
   *
   *  It is already in `misses` as one `ALREADY PRESENT` line per member, and that is exactly why this
   *  field exists rather than a caller counting those lines: a re-run of the full Button set puts 648
   *  strings in `misses`, and the UI's verdict pill must not read "⚠ 648 misses" for a run that did
   *  precisely what it was asked to. Deriving the count by matching the miss PROSE would make that
   *  wording load-bearing — the same trap `apply-summary.ts` records for the theme write's summary. The
   *  lines stay in `misses` for the parity gate, which compares the two executors' causes as sets.
   *
   *  The one field the paste payload does not return: a CHUNK cannot report this meaningfully, since it
   *  sees only its own slice of the set. */
  skipped: number;
  /** Members that were already in the set under the right name and were built from a DIFFERENT plan than
   *  this build would write — or from no recorded plan at all (#827). Skipped like the above, and counted
   *  apart from it for the reason that field's note gives one step further: `skipped` and `stale` are both
   *  "this run wrote nothing here", and only one of them means the file holds what was asked for.
   *
   *  Kept out of `skipped` rather than folded in, because the verdict has to distinguish them: `✓ already
   *  built` over a stale set is the exact false green this field exists to prevent.
   *
   *  Second plugin-only field, same reason as `skipped`. */
  stale: number;
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
  /**
   * WHICH ROUTE each wire-pass lookup took to its node (#701) — the three are exhaustive and sum to one
   * per (member × declared reference), so they decompose a total rather than counting three things.
   *
   *   `refsRetained`     the build pass built this part and handed the node over — no host round-trip
   *   `refsKnownAbsent`  the build pass built this MEMBER and this part was not among its nodes, so it is
   *                      absent and no search could find it. A real third of the work: `refs` is deduped
   *                      across the set, so every member is checked for every part ANY member declares,
   *                      and on the Button `spinner` exists only on `state=pending`.
   *   `refsSearched`     no map for this member (the build pass skipped it — an idempotent re-run), so the
   *                      scenegraph was searched. Expensive ONLY on a cold build (~18ms per lookup, while
   *                      Figma is still reconciling); on a warm re-run the same search costs ~0.07ms, which
   *                      is why a high count here is not by itself a cost. See the header note.
   *
   * They exist because the fix they measure is invisible to everything else. Every correctness assertion
   * passes either way (the same references get wired), and the harness's clock cannot see it (no scenegraph
   * to be slow), so a version whose map silently never populated would ship green and unchanged. These make
   * "the search was avoided" checkable by value, offline.
   *
   * Plugin-only, like `skipped`: a paste CHUNK has no build phase of its own to retain anything from.
   */
  refsRetained: number;
  refsKnownAbsent: number;
  refsSearched: number;
  /** Non-fatal: a name that did not resolve, a write Figma discarded, a read-back that disagreed. */
  misses: string[];
};

/**
 * How far through a build we are — posted at every chunk boundary (#684).
 *
 * `phase` rather than one flat percentage, because the two long loops are not interchangeable work: a
 * designer watching "412/648" during `wire` needs to know the members already exist and it is the
 * property references being attached, or the second pass reads as the first one having restarted.
 *
 * `done`/`total` are MEMBER counts in both phases, which is what makes them comparable across the two —
 * and `total` is the full set, not the chunk, so the number never resets mid-run.
 */
export type ComponentProgress = {
  phase: 'build' | 'wire';
  done: number;
  total: number;
  /** Wall-clock ms this chunk's work took, EXCLUDING the yield — the calibration signal. Reported per
   *  chunk rather than accumulated because the useful question is "did any single chunk hold the thread
   *  too long", and a total cannot answer it. */
  chunkMs: number;
  /**
   * Wall-clock ms since this PHASE's loop head, INCLUDING every yield taken so far — and the reason it
   * exists is that `chunkMs` alone cannot price the fix (#684 calibration, run of 2026-08-10).
   *
   * The first live run reported `build: total 105171ms` as the sum of 27 `chunkMs`, which by construction
   * excludes the yields. So the run could say what the work cost and could NOT say what the yielding cost
   * — while the decision it was gathered for, lowering `CHUNK` from 24 to 4, multiplies the number of
   * yields by six. Calibrating a knob without measuring the thing the knob multiplies is how a fix gets
   * shipped on an assumption; `elapsedMs − Σ chunkMs` is that cost, in the same run that argues for it.
   *
   * MEASURED AT THE SAME INSTANT as `chunkMs`, before the yield, so the difference at the LAST reading is
   * every yield in the phase but its final one. That off-by-one is deliberate rather than a rounding: the
   * report has to be posted before control leaves, or the host would not receive it until the next chunk
   * boundary and the pill would trail a chunk behind (see `breathe`).
   */
  elapsedMs: number;
};

/** Yield to the host between chunks — and the reason this is INJECTED rather than called directly.
 *
 *  `setTimeout` exists in the Figma sandbox (declared globally by `plugin-typings`), and `await
 *  new Promise(r => setTimeout(r, 0))` is what actually returns control to Figma so it can service its
 *  own heartbeats, repaint, and let the socket breathe. But a test harness that awaited a real timer for
 *  every one of 648 members would trade the defect for a slow suite, and — more to the point — a harness
 *  cannot ASSERT that a yield happened if the yield is invisible to it. Passing it in makes the yield an
 *  observable event: the shim counts calls, so "does it yield, and at the right boundaries" is checkable.
 *
 *  What the shim still cannot prove is anything about the HOST: it has no event loop, no heartbeat and no
 *  scenegraph reconciliation. Chunk SIZE is therefore calibrated live and cannot be gated here — see
 *  `CHUNK` below. */
export type YieldFn = () => Promise<void>;

/** Options the plugin passes and the harness overrides — every field optional, so the executor's
 *  contract with `main.ts` is unchanged for callers that want the defaults. */
export type ComponentApplyOptions = {
  /** Called at every chunk boundary. Synchronous by design: it posts a message and returns, and an
   *  awaited reporter would add an unbounded amount of unmeasured time to the loop it is measuring. */
  onProgress?: (p: ComponentProgress) => void;
  /** How control returns to the host. Defaults to a real `setTimeout(0)` when absent. */
  yieldTo?: YieldFn;
  /** Members per chunk. Named `chunk` rather than baked in so the live calibration run can sweep it
   *  without a rebuild, and so the harness can force many small chunks over a small plan set. */
  chunk?: number;
};

/**
 * Members per chunk. **This is now a measurement** — from the live 648-member Button build of 2026-08-10,
 * the run the previous version of this comment asked for. What it measured, per member, cold:
 *
 *   build   105,171ms over 648 members  →  ~162ms/member   (worst chunk at CHUNK=24: 4,952ms)
 *   wire     46,375ms over 648 members  →   ~72ms/member   (worst chunk at CHUNK=24: 1,870ms)
 *   wire, warm re-run  557ms            →  ~0.86ms/member  (worst chunk: 22ms)
 *
 * 4, because 162ms/member × 4 ≈ 650ms puts the worst chunk under a second, where a stall is perceived as
 * a stutter rather than a freeze. That is a 7.6× improvement on the measured 4,952ms.
 *
 * READ THE LIMIT OF THIS KNOB BEFORE TURNING IT, because the run also established what it cannot do: at
 * ~162ms per member, `SLOW_CHUNK_FRAMES`' 4-frame (~64ms) target is UNREACHABLE AT ANY CHUNK SIZE. Even
 * `CHUNK = 1` holds the thread for ~162ms, ~10 frames. The readout flagged every cold chunk `⚠ SLOW` and
 * it was right to; the honest response is to leave the target where it is and record that this constant
 * cannot meet it, rather than to raise the threshold until the report goes green. Getting under it needs
 * the per-member cost to come down — filed separately, along with the cold-wire finding below.
 *
 * AND WHY NOT LOWER STILL: each chunk costs a yield, and 4 already takes 162 of them per phase. The
 * measured price of a yield is what `elapsedMs` was added to report (see `ComponentProgress`) — the run
 * that set this number could not see it, because `chunkMs` excludes the yield by construction. A future
 * sweep below 4 should read that figure first; it is the term that starts to dominate.
 *
 * THE COLD/WARM GAP IS THE LARGER LEVER AND IS NOT THIS CONSTANT'S TO FIX: cold wire cost 83× warm wire
 * for identical work over identical members (46,375ms vs 557ms), because the cold pass walks a scenegraph
 * Figma is still reconciling after 648 `createComponentFromNode` calls and a `combineAsVariants`. That is
 * ~46s of a ~151s run and no chunk size touches it. **Addressed since, in the only way that gap admits —
 * by not walking it** (#701, `builtParts`): the wire loop reuses the nodes the build loop already holds
 * instead of re-finding each by name. The wire figure in the table above therefore describes the code as
 * it was, and re-measuring it is the point of the next live run — see `refsRetained`.
 */
export const CHUNK = 4;

/** The default yield: a real macrotask. `setTimeout(0)` rather than a resolved promise, and the
 *  difference is the whole mechanism — `await Promise.resolve()` is a MICROtask, so it runs before the
 *  host gets control back and yields nothing at all. A build "chunked" with microtasks holds the event
 *  loop exactly as long as one that never yielded, which is a fix that measures as no fix.
 *
 *  NOT ASSERTED ANYWHERE, and it is worth being blunt about that rather than leaving it implied by the
 *  tests' silence: swapping this line for `Promise.resolve()` leaves `test-write-components.ts` entirely
 *  green. A harness with no event loop cannot distinguish a task from a microtask — there is no host to
 *  hand control to, so both "yield" identically. What the suite gates is that a yield HAPPENS at every
 *  boundary (counted at `yieldTo`); that it is a macrotask is gated only by the live run, which is why
 *  the 1m10s / Livegraph-1006 measurement in the header is cited rather than a test name. */
const realYield: YieldFn = () => new Promise<void>((resolve) => { setTimeout(resolve, 0); });

/**
 * THE MEMBER STAMP (#827) — what a member records about the build that wrote it, so a re-run has
 * something to compare that is not the member's NAME.
 *
 * Shape: `<engine version>|<plan stamp>`. Two fields, and only ONE of them is compared.
 *
 * THE PLAN STAMP IS THE DECISION. It moves exactly when the plan this executor would write moves, which
 * is the question the skip branch is actually asking.
 *
 * THE ENGINE VERSION IS REPORTED AND NEVER COMPARED, and that asymmetry is the design rather than an
 * oversight. `ENGINE_VERSION` bumps on any behavior change including a pure token-value change — so
 * comparing it would mark all 913 members of the library stale every time a brand's hue moved, which is
 * both wrong (a bound paint re-themes; the geometry did not move) and useless (a verdict that always
 * fires is not a verdict). It is stored because the one thing a human asks on being told a member is
 * stale is *how old is it*, and a bare hash cannot answer that.
 *
 * NO BUILD IDENTITY IN IT YET, and this is the honest boundary rather than a gap I am papering over.
 * A plan stamp cannot see a change that lives only in this file: 7 of the 22 commits touching the
 * component pipeline since 2026-07-01 changed `write-components.ts` alone and moved no plan bytes. The
 * field that would close that is the bundle's identity.
 *
 * WHAT #836 CHANGED, AND WHAT IT DID NOT. This paragraph used to say the identity was not AVAILABLE here
 * — `build.mjs` defined `PRISM3_BUILD` only for the entry bundling `studio/src`, and naming it in this
 * context was a bare identifier that throws at load. That is no longer true: #836 defines it on both
 * entries and declares it in `figma-env.d.ts`, so `PRISM3_BUILD` is a legal reference on this line today.
 * What #836 deliberately did NOT do is put it in the stamp. Adding a third field changes a format already
 * persisted on every member in every themed file, and the question of what a per-member build identity
 * should be compared against — nothing, like the engine version? or something? — is a staleness decision,
 * not a reporting one. #836 answered "which build is running", which is a live question about a process;
 * this is "which build wrote this node", a durable question about a file. Filed as **#1098** rather than
 * carried here, because a note in a comment is not a tracked piece of work. Were it added it would go
 * here as a third field, still unread by the comparison for the same reason the engine version is —
 * `planHalf` reads the segment between the first and second `|`, so a third field appended after it would
 * not move the comparison. It would, though, break the separator's premise below: a filesystem path CAN
 * contain a `|`, which is the first thing that design has to answer and a second reason not to guess here.
 *
 * `|` as the separator because neither field can contain one: a semver is `[0-9.]` and a plan stamp is
 * 16 hex characters. A JSON blob would be the general answer and buys nothing at 26 bytes.
 */
const STAMP_KEY = 'memberStamp';
const memberStamp = (plan: AnatomyPlan): string => `${ENGINE_VERSION}|${planStamp(plan)}`;

/** The plan-stamp half — the only half the staleness decision reads. `''` for an unstamped member, which
 *  is what an empty `getSharedPluginData` and a host with no plugin-data surface both produce, and which
 *  never equals a real 16-hex stamp. That is the intended reading: unknown provenance is stale. */
const planHalf = (stamp: string): string => stamp.split('|')[1] ?? '';

/** The engine-version half, for the report only. `'unknown'` rather than `''` so the miss line reads as
 *  a fact about the member instead of as a missing interpolation. */
const engineHalf = (stamp: string): string => stamp.split('|')[0] || 'unknown';

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

// ── CLAIM THE DEFAULTS (#865) ──────────────────────────────────────────────────────────────────
//
// Every write above this point sets what a plan DECLARES. Nothing set what a plan is silent about, and a
// Figma node is never silent: `createFrame()` hands back an opaque white box, `combineAsVariants()` hands
// back a set with a 5px radius and a purple dashed border, and a text node starts top-left aligned. So
// every property no def mentioned survived as a Figma default wearing our name — and no read-back could
// see it, because a read-back verifies that a write was retained and there was no write.
//
// MEASURED before it was fixed, on `checkbox` (54 members, 244 nodes) and `switch` (24 members, 101),
// by recording every property the executor actually assigns and diffing against Figma's own defaults:
// 11 unclaimed properties on the COMPONENT_SET, 9 on every FRAME plus 10 more on some, 15 on every TEXT,
// 6 on every VECTOR. Corpus-wide, 523 of 973 member root frames carried the white fill. The issue
// predicted "probably longer than two entries" and the list is nineteen at its longest.
//
// WHY THE WIDE LIST RATHER THAN THE VISIBLE ONE. A list of "the properties that show up in today's
// corpus" is chosen by a judgment that expires the first time a def carries a shadow, and it expires
// SILENTLY — the same silence this function exists to end. `blendMode` and `rotation` are invisible on
// every component that exists right now; they are on the list because the cost of including them is one
// line each and the cost of omitting them is another round of QA finding it by eye.
//
// THE VALUES ARE FIGMA'S OWN DEFAULTS, not our preferences — with two exceptions, both deliberate:
// `fills`/`strokes` neutralize to `[]` (Figma's default frame fill is white, and "nobody asked for a
// fill" means no fill, not a white one), and `clipsContent` to `false` (already the generic branch's
// choice; stated here for the branches that never made it). Writing a default EXPLICITLY is not a no-op
// even where the value matches: it moves the property from "whatever Figma happened to do" to a decision
// recorded in one place, which is what makes #1009's `textAlignVertical: 'TOP'` a named hole that can be
// argued with rather than a silence nobody can find.
//
// DO NOT ROUTE THE GATE THROUGH THIS TABLE. `apps/plugin/lint-unclaimed-defaults.ts` authors its own
// list of visually-significant properties, from the Figma typings, and that duplication IS the gate
// (docs/34): a gate importing this table would assert `table === table` and pass on any hole the table
// itself has. This comment exists because the duplication looks exactly like something to tidy up.
type ClaimMode = 'created' | 'imported';

/** Write Figma's default EXPLICITLY for every visually-significant property this node's plan did not
 *  claim. Runs LAST, after every plan-driven write, so a declared value is never clobbered — and the
 *  plan is what decides "claimed", never the live node, because a node cannot tell a value we chose
 *  from a value Figma chose, which is the entire defect.
 *
 *  `n` is null for the COMPONENT_SET, which has no plan node — every visual property on a set is
 *  unclaimed by construction, which is why it carried all eleven.
 *
 *  Each write is guarded and reports a miss rather than throwing. Not defensive padding: the text
 *  properties genuinely require the node's font to be loaded, and a TEXT plan with no `textStyle` never
 *  loaded one. A throw here would lose a member that had otherwise built correctly, to fix its
 *  alignment. */
const claimDefaults = (node: Wr, n: FigmaNodePlan | null, misses: string[], mode: ClaimMode): void => {
  const where = n?.name ?? 'set';
  const set = (prop: keyof CompNode, value: unknown): void => {
    try { (node as Record<string, unknown>)[prop as string] = value; }
    catch (err) { misses.push(`${where}.${String(prop)} -> UNCLAIMED and could not be neutralized (${(err as Error).message}); it keeps Figma's default — #865`); }
  };

  // AN INSTANCE IS CLAIMED BY ITS NOMINATION, and nothing here may touch one. Its appearance comes from
  // the main component `swapTarget`/`nestTarget` named — itself built by this executor, or authored by a
  // designer — so `fills = []` on an instance is not a neutral value, it is a LOCAL OVERRIDE that erases
  // the component's design. On a `nest-fixed` focus ring that means deleting the ring. Same for a
  // COMPONENT, whose properties came from the frame `createComponentFromNode` consumed — already
  // neutralized here, one call earlier, as that frame.
  const t = node.type;
  if (t === 'INSTANCE' || t === 'COMPONENT') return;

  // Universal — every node type Figma lets us create carries all five, on SceneNodeMixin, BlendMixin
  // and LayoutMixin.
  set('visible', true);
  // `zeroOpacity` is applied by the PARENT after this returns, so writing 1 here would be overwritten
  // anyway. Skipped rather than relied on: a claim the plan makes should not depend on write order.
  if (!n?.zeroOpacity) set('opacity', 1);
  set('blendMode', 'PASS_THROUGH');
  if (!n?.effectStyle) set('effects', []);
  set('rotation', 0);
  // Child-side layout properties. Settable on any node — outside an auto-layout parent Figma ignores
  // them rather than throwing, which is why these two need no applicability test while the parent-side
  // ones below do.
  set('layoutAlign', 'INHERIT');
  set('layoutGrow', 0);
  // Claimed by the PARENT for an absolute or centered part (`STRETCH` / `CENTER`), and by the glyph
  // branch for a drawn outline (`SCALE`) — all of which run after this, except the glyph one, which is
  // why an imported subtree skips it.
  if (mode === 'created') set('constraints', { horizontal: 'MIN', vertical: 'MIN' });

  // INK. An imported glyph's fills and strokes are declared by `glyphSvg` — a plan field, so they are
  // claimed, and blanking them would erase the outline the SVG drew. The artboard the importer returns
  // is NOT an imported node in this sense: it is a wrapper, it carries the white, and it arrives here
  // as the `created` node of its GLYPH plan.
  if (mode === 'created') {
    if (t === 'TEXT') {
      // NO NEUTRAL VALUE EXISTS for a text fill: `[]` is invisible text, which is a worse defect than
      // an unclaimed one and would be found by eye just as late. So an unpainted label is REPORTED.
      if (!n?.paints?.fills) misses.push(`${where}.fills -> UNCLAIMED on a TEXT node (a label with no paint is invisible, so this is reported rather than neutralized — the def must declare a text paint) — #865`);
    } else if (!n?.paints?.fills) set('fills', []);
    if (!n?.paints?.strokes) {
      set('strokes', []);
      // Both are set by the paints branch when it strokes; neutralized together with `strokes` so the
      // three never disagree. Figma's own defaults, and invisible without a stroke to draw.
      set('strokeWeight', 1);
      set('strokeAlign', 'INSIDE');
    }
    set('dashPattern', []);
  }

  // FRAME-SHAPED — a COMPONENT_SET included, and that inclusion is half the fix. `ComponentSetNode
  // extends BaseFrameMixin`, which carries GeometryMixin, CornerMixin, BlendMixin and AutoLayoutMixin,
  // so a set has every one of these and `combineAsVariants` sets three of them to values nobody chose.
  if (t === 'FRAME' || t === 'COMPONENT_SET') {
    // The four corners individually rather than `cornerRadius`, because that is what the plan binds and
    // the two must be compared on the same footing: a def binding `topLeftRadius` has claimed the
    // corner, and neutralizing the shorthand would undo it.
    const bound = n?.bound ?? {};
    for (const corner of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const)
      if (!(corner in bound)) set(corner as keyof CompNode, 0);
    set('clipsContent', false);
    set('strokesIncludedInLayout', false);
    // PARENT-SIDE auto-layout properties, and these DO need the applicability test: Figma documents them
    // as "applicable only on auto-layout frames". Gated on the plan's `layoutMode` rather than a live
    // read for the reason in the header — and when there is no auto-layout there is no gap and no
    // padding to see, so this is an inapplicable property rather than an unclaimed one.
    if (n?.layoutMode) {
      if (!('itemSpacing' in bound)) set('itemSpacing', 0);
      for (const pad of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const)
        if (!(pad in bound)) set(pad as keyof CompNode, 0);
      // The alignment and sizing four are written unconditionally by the `layoutMode` branch above, so
      // they are claimed whenever they apply and there is nothing to neutralize.
    }
  }

  // TEXT-ONLY. Every one of these requires the node's font to be loaded — the guard above is what makes
  // a TEXT plan with no `textStyle` report instead of losing the member.
  //
  // `textAlignVertical` WAS the example this block used for "a default with an address, changing no pixel
  // today", and #1009 has since made both halves of that sentence wrong. The plan now claims it — at
  // `CENTER` — so the line moves a pixel wherever a text node has a height, and it is a NEUTRALIZATION
  // only where the plan stays silent. The other half was a conflation worth naming, because it is the one
  // #1009's own correction untangled: `components/checkbox.ts` argues for TOP on its ROW, which is the
  // parent frame's `counterAxisAlignItems` and a different property on a different node. It never argued
  // anything about the text node's own box.
  if (t === 'TEXT') {
    // GUARDED, like `effects` and `opacity` above and unlike its five neighbours below (#1009). This
    // function's own contract is that "a declared value is never clobbered", and this is the first
    // property to which the plan can say anything — so the guard is what keeps that sentence true. Left
    // unguarded it wrote `'TOP'` over every claim, AFTER the plan-driven write, and the parity gate is
    // what caught it: the paste path had no neutralizer and still read CENTER.
    if (!n?.textAlignVertical) set('textAlignVertical', 'TOP');
    set('textAlignHorizontal', 'LEFT');
    set('textAutoResize', 'WIDTH_AND_HEIGHT');
    set('textTruncation', 'DISABLED');
    set('paragraphSpacing', 0);
    set('leadingTrim', 'NONE');
  }
};

// ── A PARTIAL WRITE, MARKED (#913) ─────────────────────────────────────────────────────────────
//
// A mid-run throw is reachable and it is not exotic: the ORDINARY client case reaches it. A brand whose
// typeface is not installed on the machine running the build throws inside `setTextStyleIdAsync` — the
// `loadFontAsync` above it is guarded and that one is not (#680) — after Figma has already created the
// member's frame and its label. Measured against this executor over the real 648-member Button set:
//
//   • the typeface case leaves 3 nodes created and 2 parented to the page, on the FIRST member;
//   • a refused `combineAsVariants` leaves 1,971 created and 648 loose COMPONENTS on the page.
//
// Both numbers matter and the small one matters more. 648 loose components are alarming enough that
// nobody mistakes them for their own work; TWO are easy to miss entirely, and the next thing a designer
// does is press the button again — on top of them.
//
// WHY MARK RATHER THAN DELETE, since deleting is the obvious repair. `figma.commitUndo()` is called
// nowhere in this plugin (see the header), so the whole run is ONE undo entry and a single undo already
// unwinds a partial write completely. A cleanup pass would therefore duplicate an unwind that exists,
// spend hundreds of host calls on the least reliable code path available — a host that has just refused a
// call — and destroy the evidence a designer or an agent needs to diagnose the failure. So the nodes stay
// and become findable instead: one named frame, and a verdict that says the number out loud.
//
// TWO PROPERTIES THIS PATH MUST HAVE, both of them consequences of running after a refusal:
//
//   1. THE MARKING MUST NOT THROW, and must not mask the cause if it does. It is a write on the failure
//      path; a host that refused the last call may refuse this one. So every call here is guarded, the
//      original error is what gets rethrown (never a wrapper around it), and the marking's own failure
//      travels beside the cause rather than replacing it — `markError`, reported after it.
//   2. THE COUNT MUST REACH THE VERDICT IN BOTH SIZE REGIMES. `partialWriteHeadline` puts the number in
//      the pill for exactly the two-node case; see `apply-summary.ts`.

/** What this run has put in the file, so the failure path can say so. `loose` holds the OUTERMOST nodes
 *  only — a child is removed the moment it is appended to its parent, and a member the moment it joins a
 *  set — because parking a node that already has a parent would rip it out of the tree it belongs to.
 *
 *  Bookkeeping, deliberately, rather than a question asked of the host: there is no `parent` in the
 *  `CompNode` port and adding one would put a second host call on the failure path to learn something
 *  this side already knows. The gate for it is in `test-write-components.ts` and reads the FRAME rather
 *  than this set — see that block's note on why. */
type WriteTrail = {
  loose: Set<CompNode>;
  /** Members appended into a set that was already in the file, which is a partial write that is not
   *  loose. Counted so the verdict can name it; never marked, because it is where it belongs. */
  intoExistingSet: number;
  /** The set's name, learned from `planSetLayout` — so the frame can say WHICH build failed. */
  component: string;
};

/** The frame a designer will meet in the layers panel. Says what it is, how much is in it, and what to
 *  do about it — with no keyboard shortcut, because the panel runs on macOS and Windows and naming one
 *  key would be wrong for half the audience. */
const parkFrameName = (component: string, n: number): string =>
  `⚠ Prism3 partial build — ${component} (${n} node${n === 1 ? '' : 's'}; undo to remove)`;

/** Gather what is loose under one named frame. NEVER THROWS — the whole function is the failure path.
 *
 *  NO AUTO-LAYOUT and no resize on the frame, which is a choice about evidence rather than about looks: an
 *  auto-layout parent rewrites its children's sizing, and the geometry of a half-built member is the thing
 *  a diagnosis reads. `clipsContent = false` so the contents are visible outside the frame's own box —
 *  the members were never positioned (the layout pass runs after the combine), so they all sit at the
 *  origin and a clipping 100×100 frame would hide 647 of them.
 *
 *  The frame is named for the number of nodes it was ASKED to hold, before the appends run. A name written
 *  after the loop would be absent from a frame whose naming threw, and an unnamed frame is the litter this
 *  exists to prevent; the verdict carries the authoritative count either way. */
const markPartialWrite = (api: ComponentsApi, trail: WriteTrail): PartialWriteFacts => {
  const nodes = [...trail.loose];
  const facts: PartialWriteFacts = {
    loose: nodes.length, parked: 0, frame: null, intoExistingSet: trail.intoExistingSet, markError: null,
  };
  // NOTHING WRITTEN, NOTHING MARKED. A frame created here would be the only thing this run put in the
  // file — litter produced by the litter-collector, on the path where the verdict is already complete.
  if (nodes.length === 0) return facts;
  const name = parkFrameName(trail.component || 'component set', nodes.length);
  try {
    const frame = api.createFrame();
    frame.name = name;
    frame.clipsContent = false;
    api.currentPage.appendChild(frame);
    facts.frame = name;
    // PER NODE, so one refusal does not abandon the rest — 647 gathered and one loose is a far better
    // outcome than 648 loose, and the count the verdict reports is the number that actually moved.
    for (const n of nodes) {
      try { frame.appendChild?.(n); facts.parked++; }
      catch (err) { facts.markError ??= (err as Error)?.message ?? String(err); }
    }
  } catch (err) {
    facts.markError = (err as Error)?.message ?? String(err);
  }
  return facts;
};

/** The property key the facts ride on. Attached to the error the HOST threw rather than wrapped in a new
 *  one, and that is the "must not mask" property in code: a wrapper replaces the stack, which is what a
 *  live diagnosis reads in the plugin console, and forces every caller to unwrap to reach the message the
 *  designer needs. Attaching is additive — the error rethrown is the same object, with the same message
 *  and the same stack.
 *
 *  A non-object throw (a bare string) carries no property, so the verdict falls back to naming no partial
 *  write. The durable half survives that: the frame is IN the document, under a name that explains
 *  itself. */
const PARTIAL_WRITE = '__prism3PartialWrite';

/** Read the facts back off a thrown error, or `null` if this throw left nothing in the file. */
export const partialWriteOf = (e: unknown): PartialWriteFacts | null => {
  const f = (e as Record<string, unknown> | null | undefined)?.[PARTIAL_WRITE];
  return f ? (f as PartialWriteFacts) : null;
};

/**
 * Materialise a plan set into a live Figma COMPONENT_SET.
 *
 * Idempotent: find the set by name, skip members already present, append the rest, re-lay-out and
 * resize the union. Every behaviour here was measured live against Figma while writing the paste path
 * (`anatomy-figma.ts`'s `PAYLOAD_*` constants carry the measurements); the ones the obvious
 * implementation gets wrong, and which this therefore states explicitly:
 *
 *  - `unlockAspectRatio()` BEFORE any dimension binding. A proportion-locked node keeps only
 *    the last of two dimension bindings — the second setter evicts the first, silently. An instance
 *    inherits the lock from its main component, and every slot binds width AND height. (Was
 *    `constrainProportions = false`, which Figma's typings now mark `@deprecated` in favour of this —
 *    #682. Same effect, and it drops the `in` guard: see `CompNode.unlockAspectRatio`.)
 *  - NO `resize()` after binding: it CLEARS every dimension binding. The one `resize` here is on an
 *    absolute part, which binds no dimensions by construction.
 *  - Properties on the SET and only AFTER combining. `addComponentProperty` throws on a member, and
 *    `combineAsVariants` REWRITES the ids of anything declared before it.
 *  - `componentPropertyReferences` do not propagate: wiring one member leaves the others inert.
 *  - Appending does NOT grow the set's frame, hence the explicit `resize`.
 *  - A subtree search on a scenegraph Figma is still RECONCILING costs ~18ms to find one node among four
 *    (measured, #701), so the wire pass reuses the nodes the build pass built rather than re-finding them.
 *    The emphasis is load-bearing: the same 2,592 searches cost ~0.07ms each on a warm re-run (185ms total,
 *    live), so the price is reconciliation, not search. Only the cold build — the one case that matters —
 *    pays it.
 *
 * A THROW FROM ANYWHERE INSIDE IS MARKED RATHER THAN SWALLOWED (#913). This is the entry point;
 * `writeComponentSet` below is the whole of the write, unmoved. The split buys two things: ONE guard
 * around the write instead of one per host call, and a trail that is created outside the code that fills
 * it, so the marking reads a record the failing code cannot have skipped writing.
 */
export const applyComponentPlan = async (
  plans: AnatomyPlan[],
  api: ComponentsApi,
  opts: ComponentApplyOptions = {},
): Promise<ComponentApplyResult> => {
  const trail: WriteTrail = { loose: new Set(), intoExistingSet: 0, component: '' };
  try {
    return await writeComponentSet(plans, api, opts, trail);
  } catch (err) {
    // MARK, THEN RETHROW THE ORIGINAL — in that order, and with the original object. Attached only when
    // something actually reached the file, so `partialWriteOf` answering non-null means "there is a
    // partial write" rather than "a build failed"; the throw-before-anything-is-written case (
    // `planSetLayout` refusing an incoherent set) keeps the verdict it has always had.
    const facts = markPartialWrite(api, trail);
    if ((facts.loose > 0 || facts.intoExistingSet > 0) && typeof err === 'object' && err !== null)
      (err as Record<string, unknown>)[PARTIAL_WRITE] = facts;
    throw err;
  }
};

const writeComponentSet = async (
  plans: AnatomyPlan[],
  api: ComponentsApi,
  opts: ComponentApplyOptions,
  trail: WriteTrail,
): Promise<ComponentApplyResult> => {
  const yieldTo = opts.yieldTo ?? realYield;
  const chunkSize = Math.max(1, opts.chunk ?? CHUNK);
  const onProgress = opts.onProgress;
  // `Date.now` rather than `performance.now`: the sandbox is not a browser and this file compiles under a
  // `lib` without DOM, so `performance` is not declared. Millisecond resolution is ample — the quantity
  // being measured is "did this chunk hold the thread for tens of ms or hundreds".
  //
  // Declared here so `breathe` closes over it, but RE-STAMPED at each loop head (see both loops below) —
  // a `chunkMs` is only a chunk's cost if the clock started when the chunk did.
  let mark = Date.now();
  // The phase's OWN start, stamped at each loop head beside `mark` and never touched by `breathe`. Two
  // clocks because they answer different questions and one cannot serve both: `mark` restarts every chunk
  // (what did THIS chunk cost), `phaseStart` runs for the whole phase (what has the phase cost including
  // the yields). Subtracting one from the other is what prices a yield — see `elapsedMs`.
  let phaseStart = mark;
  /** End a chunk: report what it cost, hand control back, and restart the clock AFTER the yield so the
   *  yield's own duration is never counted as work. */
  const breathe = async (phase: 'build' | 'wire', done: number, total: number): Promise<void> => {
    // ONE `Date.now()` for both figures rather than one apiece. Two calls would put the reporter's own
    // cost between them, so `elapsedMs` would carry it and `chunkMs` would not — a systematic skew in
    // exactly the subtraction this field exists to make.
    const now = Date.now();
    onProgress?.({ phase, done, total, chunkMs: now - mark, elapsedMs: now - phaseStart });
    await yieldTo();
    mark = Date.now();
  };
  // The OFFLINE half, shared with the paste path: the three set-level guards (one component, one axis
  // shape, no duplicate coordinate), the grid, the derived properties and the part→property refs. It
  // THROWS on a set that could not be assembled coherently, which is the right moment to fail — before
  // anything reaches the file.
  const { cells, props, refs, axes, rows, cols, component } = planSetLayout(plans, 'applyComponentPlan');
  // AFTER the offline guards, because a throw from them leaves nothing to name (#913).
  trail.component = component;
  const misses: string[] = [];

  // Four namespaces, four name→object maps. Unfiltered variable fetch, the #146 lesson: a
  // type-filtered call returns only that type, and a plan binds FLOAT dimensions and COLOR paints.
  //
  // THE VARIABLE MAP IS KEYED BY TAIL, THE OTHER THREE BY NAME (#1097), and the asymmetry is real rather
  // than an inconsistency to tidy. Variables carry the brand namespace (`nbds/size/md/gap`); styles do
  // not (`label/md/emphasis` — a style drops both the root and the tier), and a component's name is not
  // a token path at all. A plan's bound variable names are root-relative — see `figmaVarName` for why the
  // plan stays brand-agnostic — so this is the place the two spaces meet on the plugin side.
  //
  // `tailOf` is imported rather than spelled: unlike the CLI's generated payload, this file can import,
  // and `figma-names.ts` exists precisely so no read path spells a root. A collision means the file holds
  // two brands under one tail; reported, not resolved, because binding the wrong brand's variable paints
  // and looks correct.
  const localVars = await api.variables.getLocalVariablesAsync();
  const byName = new Map<string, (typeof localVars)[number]>();
  const tailOwners = new Map<string, string[]>();
  for (const v of localVars) {
    const t = tailOf(v.name);
    if (!t) continue; // a variable with no root segment at all cannot satisfy a plan binding
    tailOwners.set(t, [...(tailOwners.get(t) ?? []), v.name]);
    byName.set(t, v);
  }
  for (const [t, names] of tailOwners)
    if (names.length > 1)
      misses.push(`AMBIGUOUS variable tail ${t} — the file carries it under ${names.length} brand roots (${names.join(', ')}), so a plan binding it cannot say which; remove or relink one of the sets`);
  const styleByName = new Map((await api.getLocalTextStylesAsync()).map((s) => [s.name, s] as const));
  const effectByName = new Map((await api.getLocalEffectStylesAsync()).map((s) => [s.name, s] as const));
  await api.loadAllPagesAsync();
  // The cast lives HERE, next to the criteria that make it true: `types: ['COMPONENT']` is what
  // guarantees every result is a `CompRef` (see the port's note on why the port itself cannot say so).
  const compByName = new Map((api.root.findAllWithCriteria({ types: ['COMPONENT'] }) as readonly CompRef[]).map((c) => [c.name, c] as const));
  // The SET map (#681). A second criteria call rather than a widened one — see the port's note on why
  // each cast needs its own criteria list. Sets only: a `nest-fixed` part resolves a MEMBER out of one,
  // and this is the only lookup in this file whose results are never instantiated directly.
  const setByName = new Map((api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly CompSetRef[]).map((s) => [s.name, s] as const));

  /** Build one node and its subtree. Returns `null` for a NESTED_INSTANCE whose shared component is
   *  absent — no placeholder, deliberately: an unstroked frame in a focus ring's place is invisible and
   *  reads as a ring that built fine, where a slot's placeholder is a box a designer can still fill.
   *
   *  `parts` is the #701 collector: every descendant the wire loop will later need, registered by name
   *  as it is built, so that loop does not have to search the scenegraph for a node this loop is holding.
   *  Optional, and threaded through the recursion rather than closed over, because it is PER MEMBER — one
   *  map shared across the whole set would collide on part names, which are unique within a member and
   *  identical across all 648 of them. */
  const build = async (n: FigmaNodePlan, parts?: Map<string, Wr>): Promise<Wr | null> => {
    let node: Wr;
    if (n.type === 'TEXT') node = wr(api.createText());
    else if (n.type === 'INSTANCE_SWAP') {
      const target = n.swapTarget ? compByName.get(n.swapTarget) : undefined;
      if (!n.swapTarget) misses.push(`${n.name}.swapTarget -> (none nominated; built as a placeholder frame)`);
      else if (!target) misses.push(`${n.name}.swapTarget -> ${n.swapTarget}`);
      node = wr(target ? target.createInstance() : api.createFrame());
    } else if (n.type === 'NESTED_INSTANCE') {
      // A PLAIN COMPONENT FIRST, then a SET the def named a coordinate in (#681). Order matters and is
      // not arbitrary: a file can hold both a component and a set under one name, and the plain component
      // is the unambiguous one — it needs no coordinate to identify a member, so a def carrying a
      // `nestVariant` against a file that has flattened its ring to a component still resolves rather
      // than reporting a coordinate the file no longer has axes for.
      const nested = n.nestTarget ? compByName.get(n.nestTarget) : undefined;
      const set = !nested && n.nestTarget && n.nestVariant ? setByName.get(n.nestTarget) : undefined;
      if (set) {
        // RESOLVE THE DEF'S COORDINATE against the members' own names. `nestVariantMatch` compares axis by
        // axis and returns null on "no match" AND on "more than one match" — see its own note for why the
        // second is refused rather than resolved by picking the first.
        const members = (set.children ?? []).map((c) => c.name ?? '');
        const hit = nestVariantMatch(n.nestVariant!, members);
        if (!hit) {
          // THE FIFTH MISS. A different sentence from the four below because it is a different mistake:
          // those four are "the file does not hold what this needs", this is "the def asks for a member
          // this set does not have". Nothing is nested — nesting the set's first child here would be
          // #656 exactly, and a valid wrong ring looks like a success.
          misses.push(`${n.name}.nestVariant -> ${n.nestTarget} (${nestVariantMissAdvice(n.nestVariant!, members)})`);
          return null;
        }
        // The MEMBER is what gets instantiated, not the set — Figma has no "instance of a set", and the
        // member is a plain COMPONENT, which is why the existing criteria search finds it under its
        // variant coordinate. That is the same lookup whose blindness to the set's own name WAS #681: the
        // members were always there, and nothing knew which one to ask for. Now the def says.
        const member = compByName.get(hit);
        if (!member) {
          // Unreachable in a coherent file — `hit` came from this set's children, and a set's children ARE
          // components, so the criteria search has them. Reported rather than asserted because the two
          // lookups are independent reads of a live document, and a host that disagrees with itself should
          // say so in the channel this build has rather than throw away 647 other members.
          misses.push(`${n.name}.nestVariant -> ${n.nestTarget} (matched member ${hit} is not instantiable; nothing built — the COMPONENT_SET and COMPONENT searches disagree about this file)`);
          return null;
        }
        node = wr(member.createInstance());
      } else if (!nested) {
        // DIAGNOSE, then report (#681). The criteria lookup above cannot tell "absent" from "present at a
        // type this search does not match", so the miss it produced said "not in this file" of a node the
        // designer was looking at. A second search — by name, every type, only on this path — is what
        // lets the message name what is actually there. `nestMissAdvice` is shared with the paste path so
        // the two cannot drift in wording.
        //
        // STILL REACHED FOR A SET, and that is the case above's complement rather than a leftover: a set
        // reaches here when the def named NO coordinate for it (`nest-exposed`, whose coordinate is the
        // consumer's), and the `COMPONENT_SET` sentence now says exactly that. A `nest-fixed` part with a
        // resolvable set never arrives here at all.
        const other = n.nestTarget ? api.root.findAll((x) => x.name === n.nestTarget)[0] : undefined;
        const found = !other ? 'ABSENT'
          : other.type === 'COMPONENT_SET' ? 'COMPONENT_SET'
          : other.type === 'INSTANCE' ? 'INSTANCE'
          : 'OTHER';
        misses.push(`${n.name}.nestTarget -> ${n.nestTarget} (${nestMissAdvice(found)})`);
        return null;
      } else {
        node = wr(nested.createInstance());
      }
    } else if (n.type === 'GLYPH') {
      // THE GLYPH (#864). The only node here whose content is geometry rather than a box, a binding or a
      // nomination — so it is also the only one that can be built successfully and contain nothing, which
      // is precisely what #864 was: four artboards created without throwing.
      //
      // Figma's OWN SVG importer, per the port's note. It returns a FRAME on the document's artboard with
      // the outline inside, so `node` here is the artboard and the glyph is its child.
      node = wr(api.createNodeFromSvg(n.glyphSvg ?? ''));
      // READ BACK THE GEOMETRY, and this is the read-back the whole issue turns on. Every other read-back
      // in this executor asks whether a write Figma ACCEPTED was retained; this one asks whether anything
      // was DRAWN, because a frame with a valid name and no outline inside is indistinguishable — from
      // every other check here — from a glyph that rendered.
      //
      // The quantity is the one a human would check, and #864's own Verify section is why it is stated
      // that way: "the node has children" passes on an empty group, and "a vector exists" passes on a
      // zero-area path. So: a VECTOR, with a non-zero box.
      const drawn = (node.findAll?.((x) => x.type === 'VECTOR') ?? []).filter((v) => {
        const box = v as CompNode;
        return (box.width ?? 0) > 0 && (box.height ?? 0) > 0;
      });
      if (drawn.length === 0)
        misses.push(`${n.name}.glyphSvg -> NO VECTOR (submitted ${n.glyphSvg?.length ?? 0} chars of SVG; the import produced no outline with area, so the member would be an empty artboard — #864)`);
      // THE ARTBOARD, read back as well, because an importer is free to size its result to the INK — and
      // that is #864's own class rather than a hypothetical: `minus` is 14×2 of drawing on a 24×24
      // artboard, and a member sized to its drawing distorts inside the square every host binds onto the
      // slot it swaps a glyph into (`size.{size}.icon`).
      if (n.glyphViewBox && (node.width !== n.glyphViewBox[0] || node.height !== n.glyphViewBox[1]))
        misses.push(`${n.name}.glyphViewBox -> ${n.glyphViewBox[0]}x${n.glyphViewBox[1]} (the imported frame reads ${node.width}x${node.height}; the glyph was sized to its ink rather than to its artboard, so every host binding a square would distort it)`);
      // SCALE, on the OUTLINE and not on the frame. The frame is resized by whoever instances it — a host
      // binds `size.{size}.icon` onto its own slot — and a child left at Figma's MIN/MIN default keeps the
      // 24px it was drawn at, so a 16px instance would show the glyph's top-left corner. This is the one
      // property of the import that gets overridden, which is why it is the only write in this branch.
      for (const v of drawn) wr(v as CompNode).constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    } else {
      node = wr(api.createFrame());
      node.clipsContent = false;
    }
    // LOOSE FROM THE MOMENT IT EXISTS (#913), one line for all six creation branches above. Figma parents
    // a created node to the current page immediately, so a node that exists is a node a designer can see —
    // and every line below this one can throw.
    trail.loose.add(node);
    node.name = n.name;
    // Before ANY dimension binding — see the header note. Unconditional, unlike the
    // `constrainProportions` form this replaced: that needed an `in` guard because it lives on
    // `LayoutMixin`, which not every node type has. `unlockAspectRatio` is on `AspectRatioLockMixin`,
    // which all four types built here carry, so a guard would only hide a port that had gone wrong.
    node.unlockAspectRatio?.();

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
    // AFTER the text style, because a text style does not carry it and could not overwrite it —
    // `TextStyle` in `@figma/plugin-typings` has no alignment field on either axis (#1009, measured).
    // READ BACK like `characters` above, and for the same reason: the executor is not the oracle for
    // what the node kept. `textAlignVertical` is a `TextNode` property, so a plan that ever carried it
    // on a frame would fail HERE, loudly and by name, rather than in the live file — `anatomyErrors`
    // refuses that plan first, and this is the second of the two directions.
    if (n.textAlignVertical) {
      try { node.textAlignVertical = n.textAlignVertical; }
      catch (err) { misses.push(`${n.name}.textAlignVertical -> ${n.textAlignVertical} (${(err as Error).message})`); }
      if (node.textAlignVertical !== undefined && node.textAlignVertical !== n.textAlignVertical)
        misses.push(`${n.name}.textAlignVertical -> DISCARDED (set ${n.textAlignVertical}, reads ${String(node.textAlignVertical)})`);
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
      // The ink lives on the VECTORs INSIDE the node, never on the node itself — a fill on the wrapper is
      // a painted square behind the glyph. True of a swapped instance, where a HOST is pushing ink down,
      // and true of a `GLYPH`, whose wrapper is the artboard Figma's importer returned. One field, one
      // meaning, from whichever side.
      const vecs = node.findAll ? node.findAll((x) => x.type === 'VECTOR') : [];
      if (vecs.length === 0)
        misses.push(`${n.name}.descendantFills -> ${n.descendantFills} (no VECTOR inside this node to paint)`);
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
    // This parent's DIRECT children by part name (#848) — the sibling boxes `absoluteCenterOn` measures
    // against. Sibling-scoped on purpose; see the centering loop for why the wider `parts` map is wrong.
    const byPart = new Map<string, Wr>();
    for (const c of n.children) {
      const kid = await build(c, parts);
      if (!kid) continue;   // a missing shared component — one precise miss, the rest still builds
      node.appendChild?.(kid);
      // NO LONGER LOOSE (#913): it has a parent, and its ancestor is what the marking would gather.
      trail.loose.delete(kid);
      // REGISTERED HERE AND NOWHERE ELSE (#701) — on the child, after it built, inside the parent's loop.
      // That placement is the whole correctness argument, because it makes this map's membership match
      // `findOne`'s reach EXACTLY, and the two must agree or the fast path is a behaviour change:
      //
      //   - Figma's `findOne` searches DESCENDANTS and excludes the node it is called on, so a
      //     `propertyRef` on a member's ROOT is not wireable today. Registering at the top of `build`
      //     would put that root in the map and the wire loop would start honouring a reference the
      //     search path silently drops — a divergence that would read as this optimisation "fixing" a
      //     bug it was not asked to fix, on the one path no test covers.
      //   - A `!kid` subtree is absent from both, for free: it never reaches this line.
      //
      // Every node is registered, not just the `propertyRef`-bearing ones. `refNodes` knows which parts
      // matter and this loop does not, and filtering here would mean importing that knowledge into the
      // executor to save a few dozen map entries per member.
      parts?.set(c.name, kid);
      byPart.set(c.name, kid);
      if (c.absoluteInset) absolutes.push([c, kid]);
      if (c.absoluteCenter) centered.push([c, kid]);
      // Written straight rather than bound: a brand does not get to theme a label under a spinner to
      // half-visible. `visible:false` would yield the cell and collapse the button.
      if (c.zeroOpacity) kid.opacity = 0;
    }
    // A CENTERED absolute child (#612's pending spinner with no visual cell to take). NOT resized:
    // unlike the ring it keeps its own square size, and its `size` binding is already on it — `resize`
    // would clear that binding.
    for (const [c, kid] of centered) {
      kid.layoutPositioning = 'ABSOLUTE';
      // THE BOX THE CENTERING IS MEASURED ON (#848) — the named sibling, or the parent when the plan
      // names none. Centering on the PARENT is right only if the overlaid part is itself centered in it,
      // and at `leading=false, trailing=true` the label is not: the trailing cell holds the right side,
      // so the label sits left of center and a spinner centered on the container landed 12px right of the
      // text it stands in for. Read from the LIVE node, because the label's width is the designer's text.
      //
      // `byPart` is the map this loop's own flow pass filled — a sibling of `kid`, so its `x`/`y` are in
      // the same parent-relative space and carry into the arithmetic with no conversion. Deliberately NOT
      // the shared `parts` map threaded through `build`: that one spans the WHOLE member tree, so a
      // same-named part in a different branch could answer, and centering would follow a box from another
      // subtree. Sibling scope is the correct scope, and it is narrower than what is already at hand.
      const on = c.absoluteCenterOn ? byPart.get(c.absoluteCenterOn) : undefined;
      // A named box that is not in the tree is REPORTED, not silently swapped for the parent — the
      // fallback would reproduce the exact off-center spinner this field exists to fix, and do it quietly.
      if (c.absoluteCenterOn && !on)
        misses.push(`${c.name}.absoluteCenterOn -> ${c.absoluteCenterOn} (not built; centered on the parent instead, so it will sit off-center wherever that part is not itself centered — #848)`);
      if (on) {
        kid.x = (on.x ?? 0) + ((on.width ?? 0) - (kid.width ?? 0)) / 2;
        kid.y = (on.y ?? 0) + ((on.height ?? 0) - (kid.height ?? 0)) / 2;
      } else {
        kid.x = ((node.width ?? 0) - (kid.width ?? 0)) / 2;
        kid.y = ((node.height ?? 0) - (kid.height ?? 0)) / 2;
      }
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
      const gap = v.resolveForConsumer(kid).value;
      if (typeof gap !== 'number') {
        misses.push(`${c.name}.absoluteInset -> ${c.absoluteInset} resolved to ${JSON.stringify(gap)}, not a number`);
        continue;
      }
      // THE STROKE THE GAP HAS TO CLEAR (#801). Strokes here are `strokeAlign: 'INSIDE'` — correct for a
      // border, since an outside stroke grows the auto-layout footprint — so the nested ring draws its own
      // stroke back inward across the gap. At the shipped 2px offset and 2px ring width the ring's outer
      // edge lands exactly on the host's border: gap ZERO, the position WCAG 1.4.11 forbids, reached by a
      // projection that applied its offset correctly. So the coordinate is `gap + strokeWidth` while only
      // the gap is the design value. Absent means the nested component draws nothing inside its own
      // bounds, which is right for every absolute part that is not a ring.
      let inset = gap;
      if (c.absoluteStrokeInset) {
        const sv = byName.get(c.absoluteStrokeInset);
        if (!sv) misses.push(`${c.name}.absoluteStrokeInset -> ${c.absoluteStrokeInset} (positioned at the offset alone; the ring will sit flush against the border it must be distinguishable from — #801)`);
        else {
          const sw = sv.resolveForConsumer(kid).value;
          if (typeof sw !== 'number') misses.push(`${c.name}.absoluteStrokeInset -> ${c.absoluteStrokeInset} resolved to ${JSON.stringify(sw)}, not a number (positioned at the offset alone — the ring will sit flush, #801)`);
          else inset = gap + sw;
        }
      }
      // Grown on every side by the full coordinate, which leaves `gap` of visible background once the
      // stroke is drawn inward. `resize` is safe HERE and nowhere else — an absolute part binds no
      // dimensions by construction (gated in the validator).
      kid.resize?.((node.width ?? 0) + inset * 2, (node.height ?? 0) + inset * 2);
      kid.x = -inset;
      kid.y = -inset;
      // STRETCH so the ring tracks its target when a designer resizes a variant; without it the ring
      // keeps the size it was pasted at, silently, because it looks right at that one size.
      kid.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
      if (kid.layoutPositioning !== 'ABSOLUTE')
        misses.push(`${c.name}.layoutPositioning -> DISCARDED (set ABSOLUTE, reads ${kid.layoutPositioning}; the ring would take a cell in the row)`);
    }
    // #865, AND IT HAS TO BE LAST. Every write above declares something; this one declares that nothing
    // else was declared. Placed after the child loop rather than beside `createFrame()` so that a value
    // the plan set is never overwritten by a default — the ordering is the whole correctness argument,
    // and putting it at creation time would have neutralized the plan instead of Figma.
    claimDefaults(node, n, misses, 'created');
    // THE IMPORTED SUBTREE (#865, second sub-cause). `createNodeFromSvg` bypasses `createFrame()`
    // entirely, so none of the frame configuration this executor does ever reached the nodes inside a
    // glyph — measured at 36 of `checkbox`'s 90 white frames, which is why a fix touching only the
    // `createFrame` path would have left a third of them in place. `imported` mode skips fills, strokes
    // and constraints: those three are claimed here by `glyphSvg` and by the `SCALE` write above.
    if (n.type === 'GLYPH')
      for (const d of node.findAll?.(() => true) ?? []) claimDefaults(wr(d as CompNode), n, misses, 'imported');
    return node;
  };

  // ---- assemble the SET ---------------------------------------------------------------------
  // FIND OR CREATE, by what is in the FILE rather than by a flag: a second run must append into the
  // set the first one made (and then skip everything by name) rather than combine a second set beside
  // it. This is the one behaviour the single-shot paste payload does not have and a plugin needs, since
  // a designer can press the button twice.
  let set = api.currentPage.findOne((n) => n.type === 'COMPONENT_SET' && n.name === component) as CompSet | null;
  // THE EXISTING MEMBERS BY NAME — a Map rather than the Set this was, because the skip branch now needs
  // the NODE and not just the fact of it: name-matching is what #827 is about, and the stamp it compares
  // instead lives on the member. `c.name` can be undefined on the port, so the entries are filtered
  // rather than keyed by `string | undefined` — an unnamed child cannot be matched by name anyway.
  const have = new Map((set?.children ?? []).flatMap((c) => (c.name ? [[c.name, c] as const] : [])));
  const byCell = new Map(cells.map((c) => [c.name, c] as const));
  // WHAT THIS BUILD WOULD WRITE, per member (#827). Derived here rather than carried on the cell for a
  // measured reason: `planSetLayout`'s cells are `JSON.stringify`d wholesale into the paste payload, so a
  // field added there costs ~19 KB of payload on Button for something the payload never reads. Both
  // derivations call `planComponentName`, so the key agrees with `spec.name` by construction.
  const stampByMember = new Map(plans.map((p) => [planComponentName(p), memberStamp(p)] as const));

  // CHUNKED (#684). The yield is on the CELL index, not on `fresh.length`, because `fresh.length` is not
  // monotonic with the loop — a run that skips every member by name leaves it at 0 for all 648 cells, so
  // `0 % chunkSize === 0` is true every time: it would yield on every single iteration and report `0 of
  // 648` at each one. Measured by mutating it back (see `test-write-components.ts`), and worth recording
  // because the intuition is that it would yield too RARELY there, not 27× too often with a frozen
  // numerator. The index advances in every case, built or skipped, which is what a boundary needs.
  //
  // RE-STAMP THE CLOCK HERE, and this is the fix to a reading that was confidently wrong. Between the
  // declaration of `mark` and this point sit `planSetLayout`, three `getLocal*Async` fetches,
  // `loadAllPagesAsync()` and a document-wide `findAllWithCriteria` — one-time setup, none of it chunk
  // work, all of it previously charged to chunk 1. Measured with a shim whose only cost was a 120ms
  // `loadAllPagesAsync`: the first chunk read 121ms against 1ms for its neighbours. Since the whole point
  // of `chunkMs` is to calibrate `CHUNK` from a live run, a first reading inflated by setup would have
  // argued for a smaller chunk than the per-member cost warrants. Same re-stamp before the wire loop.
  mark = phaseStart = Date.now();
  const fresh: CompNode[] = [];
  // THE #701 MAP: member name -> (part name -> the node this loop built). Keyed by the member's name
  // rather than by its node, because that is the key the wire loop has — it walks `set.children`, and
  // `combineAsVariants` hands back members whose identity relationship to `fresh` is Figma's business.
  //
  // POPULATED ONLY FOR MEMBERS THIS RUN BUILT, which is a limit worth stating rather than discovering:
  // the skip branch below never calls `build`, so an idempotent re-run reaches the wire loop with an
  // EMPTY map and searches for every part exactly as before. That is the right trade rather than a gap —
  // the cold run this fixes spends ~46s in that loop and the warm one spends ~0.6s (#684's measurements),
  // so the case with no fast path available is the case that does not need one.
  const builtParts = new Map<string, Map<string, Wr>>();
  let skipped = 0;
  let stale = 0;
  for (let i = 0; i < cells.length; i++) {
    const spec = cells[i];
    const existing = have.get(spec.name);
    if (existing) {
      // #827: A NAME MATCH IS NOT PROOF THE MEMBER IS CORRECT. Both branches skip — this build does not
      // rebuild either one, because rebuilding means replacing the component node, and instances track
      // their main component by id: a rebuild would orphan every instance a designer had already placed.
      // That is a worse outcome than the stale member, which is why the fix here is to REPORT rather than
      // to repair. So the only thing that changes between these two branches is what the run SAYS.
      const want = stampByMember.get(spec.name) ?? '';
      const got = existing.getSharedPluginData?.(NS, STAMP_KEY) ?? '';
      if (planHalf(got) === planHalf(want) && planHalf(want) !== '') {
        skipped++;
        misses.push(`member ${spec.name} -> ALREADY PRESENT (skipped; this set has been written before)`);
      } else {
        stale++;
        // TERSE, and the advice is NOT repeated here: this line appears once per member, so a 648-member
        // set would carry the same sentence 648 times. The reason and the remedy are stated once, in
        // `staleNote`, which is what the designer actually reads.
        misses.push(`member ${spec.name} -> STALE (built by engine ${engineHalf(got)}, plan ${planHalf(got) || 'unstamped'}; this build plans ${planHalf(want)})`);
      }
    } else {
      const parts = new Map<string, Wr>();
      const root = await build(spec.root, parts);
      // `!root` is a missing shared component — its own miss is already recorded, precisely. It must NOT
      // skip the boundary check below, which is why this is an else-branch rather than a `continue`: a
      // plan set whose every member failed to build would otherwise never yield at all.
      if (root) {
        api.currentPage.appendChild(root);
        const comp = wr(api.createComponentFromNode(root));
        // THE COMPONENT TAKES THE FRAME'S PLACE on the page, so it takes its place in the trail (#913).
        // Ordered delete-then-add rather than the reverse: the two are the same object on a host that
        // converts in place, and adding first would then remove the node this run is holding.
        trail.loose.delete(root);
        trail.loose.add(comp);
        comp.name = spec.name;
        // THE STAMP (#827), on the COMPONENT and not on the frame it was made from: the frame is consumed
        // by `createComponentFromNode`, and the node a later run reads is this one. Written here rather
        // than after the wire pass so a build that throws mid-wire still leaves every member it completed
        // truthfully stamped — an unstamped member reads as stale, which is the safe direction for a
        // partial write, but a member that was fully built and then reported stale is a false alarm the
        // designer would act on. `?.` because the port makes it optional; a host without plugin data
        // leaves every member unstamped, and every re-run then reports the whole set stale rather than
        // silently reporting it correct.
        comp.setSharedPluginData?.(NS, STAMP_KEY, stampByMember.get(spec.name) ?? '');
        fresh.push(comp);
        // AFTER the component exists and is named, under the name the wire loop will look it up by.
        // `createComponentFromNode` "preserv[es] all of its properties and children" (Figma's own words in
        // the typings), so these descendants are the same nodes now inside `comp` — the one host claim this
        // fast path rests on, and the read-back below is deliberately left able to catch it being false.
        builtParts.set(spec.name, parts);
      }
    }
    // Trailing boundary INCLUDED (`i + 1 === cells.length`), so the last partial chunk reports too —
    // without it a 648-member run reports 27 chunks of 24 and stays silent on the final 0-23 members,
    // and the pill's last progress reading would never equal the total.
    if ((i + 1) % chunkSize === 0 || i + 1 === cells.length) await breathe('build', i + 1, cells.length);
  }
  if (!set) {
    if (fresh.length === 0) {
      misses.push('set -> nothing to combine (no members built)');
      return { set: null, id: '', variants: 0, added: 0, skipped, stale, size: [0, 0], grid: [rows, cols], axes: [], properties: [], refs: 0, wiredMembers: 0, refsRetained: 0, refsKnownAbsent: 0, refsSearched: 0, misses };
    }
    // COMBINE, once. Every later member joins by `appendChild`, which re-derives the axes correctly —
    // measured: appending `state=pressed` to a `state=rest|hover` set extends that axis.
    set = api.combineAsVariants(fresh, api.currentPage);
    // THE SET IS NOW THE LOOSE THING (#913) — 648 members become one object on the page, and a throw from
    // any of the set-level calls below leaves that one object to gather rather than its members.
    for (const c of fresh) trail.loose.delete(c);
    trail.loose.add(set);
    wr(set).name = component;
    // #865 ON THE SET, which is the half a per-node fix cannot reach. `combineAsVariants` does not return
    // a neutral container: it returns one with a 5px corner radius, a purple dashed border and an opaque
    // white fill, none of which any def mentions and all of which a designer sees framing the grid. There
    // is no plan node for a set, so `null` — every visual property on it is unclaimed by construction.
    //
    // ONLY THE FRESH SET. The `else` branch below appends into a set the FILE already had, and that one
    // is the designer's: its fill and its radius are their decisions, and neutralizing them would be this
    // executor reaching outside what it built to normalize someone else's work.
    claimDefaults(wr(set), null, misses, 'created');
  } else for (const c of fresh) {
    set.appendChild?.(c);
    // INTO A SET THE FILE ALREADY HAD (#913). Not loose — it is exactly where a designer expects it — so
    // it is counted for the verdict and never moved. Marking these would tear this run's members out of
    // the designer's own set to make a point about a failure they can undo in one step.
    trail.loose.delete(c);
    trail.intoExistingSet++;
  }
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
  //
  // CHUNKED TOO (#684), and it is not the smaller of the two loops: this walks EVERY member in the set
  // (not just the ones this run built) doing a `findOne` subtree search per reference, so on an
  // idempotent re-run — where the build loop skips all 648 members and does nearly nothing — this is
  // essentially the whole cost of the run. A version that chunked only the build loop would leave the
  // re-run case exactly as unresponsive as before, while looking fixed.
  //
  // AND RE-STAMPED, same reason as the build loop: between that loop's last boundary and this one's first
  // sit `combineAsVariants`, the measured layout pass, the `resize`, the guarded definitions read and one
  // `addComponentProperty` per property. Set-level work, charged to wire chunk 1 unless the clock restarts.
  // The fifth element is the node the wire loop actually WROTE to (the #701 cached node for a built
  // member). #866 carries it so the read-back can tell an identity break — the write landed on a node no
  // longer live in the set — from a discard the live node simply did not keep.
  const wiredRefs: [string, string, string, string, CompNode | null | undefined][] = [];
  // WHICH ROUTE each reference took to its node, counted (#701). Not timing — the harness has no
  // scenegraph, so it can never gate the speedup this exists for; what it can gate, exactly and by value,
  // is that the fast route was actually taken. A version of this fix whose map never populated would be
  // silently as slow as before and pass every correctness assertion in the suite, which is the failure
  // these numbers make impossible. They also reach the console, so the live run reports its own hit rate
  // instead of leaving "did it work?" to be inferred from a stopwatch.
  let refsRetained = 0;
  let refsKnownAbsent = 0;
  let refsSearched = 0;
  mark = phaseStart = Date.now();
  const toWire = readable ? members : [];
  for (let i = 0; i < toWire.length; i++) {
    const member = toWire[i];
    // The map this run built for THIS member, or nothing if the build loop skipped it. Named for the
    // member rather than shadowing the read-back loop's `held`, which is a different thing entirely.
    const builtFor = builtParts.get(String(member.name));
    for (const r of refs) {
      // THE #701 FAST ROUTE, and it covers the misses as well as the hits — which is the half worth being
      // explicit about, because it is where a third of this fixture's lookups live. `refs` is deduped
      // across the whole set (every member is checked for every part any member declares), but the parts
      // are NOT uniform per member: on this Button, `leadingVisual` is absent on `state=pending` and
      // `spinner` is absent everywhere else, so 21 of 63 lookups legitimately find nothing.
      //
      // For a member THIS RUN BUILT, absent-from-the-map means absent-from-the-member — the registration
      // site is the append loop, so the map's membership is exactly `findOne`'s reach by construction.
      // Searching anyway would be a guaranteed-null host round-trip at the ~18ms cold price, which is the
      // most expensive way to learn nothing. So a built member skips the search on both outcomes and the
      // cold pass reaches zero searches, not two-thirds of zero.
      //
      // `builtFor` presence, NOT the node's: the distinction between "we know this member's parts" and
      // "this part is one of them". Keying off `kept` alone would send every legitimate absence back to
      // the scenegraph and quietly restore a third of the cost this exists to remove.
      const kept = builtFor?.get(r.part);
      let node: CompNode | null | undefined;
      if (builtFor) { node = kept; if (kept) refsRetained++; else refsKnownAbsent++; }
      else { node = member.findOne?.((x) => x.name === r.part) as CompNode | null | undefined; refsSearched++; }
      // An optional part absent from THIS variant builds no node, so there is nothing to wire — the
      // legitimate case. `planSetProperties` only declares a property some node references.
      if (!node) continue;
      const id = propIds.get(r.prop);
      if (!id) continue;   // the property itself failed above and reported its own cause
      try {
        wr(node).componentPropertyReferences = Object.assign({}, (node.componentPropertyReferences ?? {}) as object, { [r.field]: id });
        wiredRefs.push([String(member.name), r.part, r.field, id, node]);
      } catch (err) { misses.push(`ref ${member.name}/${r.part}.${r.field} -> ${r.prop} (${(err as Error).message})`); }
    }
    if ((i + 1) % chunkSize === 0 || i + 1 === toWire.length) await breathe('wire', i + 1, toWire.length);
  }
  // READ BACK every reference. Figma throws on a reference naming an unknown property, so this covers
  // the other direction — one the setter ACCEPTED and did not retain.
  //
  // AND IT KEEPS SEARCHING, deliberately, now that the wire loop above does not (#701). Reusing the
  // retained reference here would be the faster code and a strictly weaker check: it would read the
  // property back off the very object the setter just wrote to, which asserts our own variable rather
  // than the file's state. Re-finding by name asks Figma where that part is NOW, so the two things this
  // has to catch stay catchable — a reference Figma accepted and dropped, and the assumption the fast
  // path rests on (that `createComponentFromNode` keeps the child nodes) turning out to be false. If that
  // assumption ever breaks, it surfaces here as a loud `DISCARDED` miss per reference rather than as a set
  // that looks built and is inert. docs/34: the check must not share its subject with the thing it checks.
  // #866 — REPAIR AN IDENTITY BREAK, cause-independently. The fast path (#701) wired to `wrote`, the node
  // the build loop cached BEFORE `combineAsVariants`. If the node the set has live NOW is a different one
  // (`wrote.id !== live.id` — some transform between build and here moved the identity), the write never
  // reached the file and reads back undefined. When, and only when, they disagree, re-wire on the live
  // node — whatever moved the identity, that is where the reference must land. #701's fast path is
  // untouched for the common case (`wrote` IS live), and the search is one this loop already does. The
  // discard where `wrote` IS the live node is NOT an identity break (the leading other candidate is
  // ordering — the property unresolvable when the write ran); the re-wire would be inert there, so it is
  // left alone to report below, which is also what keeps the live probe able to tell the two apart.
  let refsRepaired = 0;
  for (const [mName, part, field, id, wrote] of wiredRefs) {
    const member = members.find((c) => c.name === mName);
    let node = member?.findOne?.((x) => x.name === part) as CompNode | null | undefined;
    if (node && wrote && node.id !== wrote.id && (node.componentPropertyReferences as Record<string, string> | null)?.[field] !== id) {
      try { wr(node).componentPropertyReferences = Object.assign({}, (node.componentPropertyReferences ?? {}) as object, { [field]: id }); refsRepaired++; }
      catch { /* surfaces in the independent verdict below */ }
      node = member?.findOne?.((x) => x.name === part) as CompNode | null | undefined; // fresh re-find, not the object just written — the verdict stays independent (docs/34)
    }
    const held = (node?.componentPropertyReferences ?? undefined) as Record<string, string> | undefined;
    if (held?.[field] !== id) misses.push(`ref ${mName}/${part}.${field} -> DISCARDED (set ${id}, reads ${held?.[field]})`);
  }
  // TELEMETRY, and the #866 merge probe in one line (the file already reports its wire hit rate here, per
  // the #701 counters). `refsRepaired > 0` on a live `field-label` build is the confirmation that the
  // discard was an identity break and this fix addresses it; `0` with misses still standing points the
  // diagnosis at ordering instead. Zero on every offline run, where nothing diverges.
  if (refsRepaired > 0) console.log(`[write-components] #866 repaired ${refsRepaired} reference(s) on the live post-combine node (fast-path node had diverged)`);

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
    skipped,
    stale,
    size: [set.width ?? 0, set.height ?? 0],
    grid: [rows, cols],
    axes: derived.map((k) => `${k}:${(defs[k]?.variantOptions ?? []).length}`),
    properties: [...bare.keys()].map((k) => `${k}:${defs[bare.get(k)!].type}`),
    refs: wiredRefs.length,
    wiredMembers: new Set(wiredRefs.map((r) => r[0])).size,
    refsRetained,
    refsKnownAbsent,
    refsSearched,
    misses: misses.concat(stray, boxMiss, axisMiss, coincident, footprint, propMiss),
  };
};
