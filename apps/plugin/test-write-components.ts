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
 *
 * SINCE #827 THE SHIM ALSO STORES SHARED PLUGIN DATA, per node, and that is a load-bearing addition rather
 * than a convenience: the member stamp is written on one run and READ on the next, so a shim that merely
 * counted the write would leave every re-run reporting the whole set stale and the idempotence arms above
 * could never be green. The arms it enables are the ones that distinguish "already built and still correct"
 * from "built by an earlier plan and now wrong" — the second of which a name match cannot see, and which
 * this build reports rather than repairs, because a rebuild replaces the component node and an instance
 * tracks its main component by ID. That last claim is checked by node IDENTITY, not by a count.
 *
 * ON THE #684 CHUNKING, THE LIMIT IS WORTH STATING BEFORE THE ASSERTIONS: this harness has no event loop
 * to starve, no Figma heartbeat, no socket to drop and no scenegraph to reconcile. So it cannot verify the
 * thing #684 is actually about — that the host stays responsive — and it cannot tell a good chunk size
 * from a bad one. Nor can it tell a macrotask yield from a microtask one, for the same missing-host reason:
 * `realYield`'s `setTimeout` could be swapped for `Promise.resolve()` and every assertion here would still
 * pass, which is stated at `realYield` itself so the silence is not read as coverage.
 * What it CAN verify is the arithmetic around the yielding: that a yield happens, that it
 * happens at the boundaries claimed, that it still happens in the cases where the loop body does almost
 * nothing, and that the fractions reported are monotonic within a phase and end at the total. Those are
 * exactly the parts that were wrong in draft and that a live run would not isolate — a build that freezes
 * tells you nothing about which of the two loops did it. The responsiveness itself is verified by running
 * it in Figma, and the chunk size is set from `chunkMs` off that run. See `CHUNK` in `write-components.ts`.
 */
import { figmaAnatomyPlan, figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, planSetProperties, planSetLayout, planComponentName, planStamp } from '@prism3/engine/anatomy-figma';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { button } from '@prism3/engine/components/button';
import { fieldLabel } from '@prism3/engine/components/field-label';
import { componentDefs } from '@prism3/engine/components/index';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { applyComponentPlan, CHUNK, partialWriteOf } from './src/write-components';
import { partialWriteHeadline, partialWriteNote, componentHeadline, staleNote } from './src/apply-summary';
import type { ComponentApplyOptions, ComponentProgress } from './src/write-components';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/**
 * A KNOWN DEFECT, PINNED — reproduced here, deliberately not fixed here.
 *
 * `cond` states the WRONG behavior the executor has today, so the pin passes while the defect is
 * present and goes RED the day it is fixed, naming the issue and the assertion to flip. That is the
 * opposite polarity from `ok` and the sign is the whole point: a test left genuinely red cannot be told
 * apart from a broken build, and CI would refuse the PR that makes the defect reproducible at all.
 *
 * Same shape as `packages/tokens`' consumer-side count: a MEMORY of what is true rather than a RULE
 * about what should be. The pin is what forces the fixing PR to touch this file — it cannot land a fix
 * and leave the reproduction claiming the old behavior.
 */
const pinned = (cond: boolean, issue: string, label: string): void => {
  if (cond) console.log(`  ⊗ ${issue} PINNED (defect still present, as expected): ${label}`);
  else { failed++; console.error(`  ✗ ${issue} is FIXED — flip this pin to a positive assertion: ${label}`); }
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

/** The two halves of a focus ring's coordinate: the visible GAP the brand asks for and the width of the
 *  stroke the ring draws INSIDE its own bounds. Both are `focus.ring.*` values and both are 2 in every
 *  emitted brand, which is why these numbers are 2 rather than arbitrary probes.
 *
 *  NAMED rather than inlined at the shim, because they are the harness's INPUT and the ring assertions'
 *  EXPECTED — constants read by two places that must not derive them from each other. Before #801 a
 *  literal `2` sat in the shim and the ring check read its expectation off the built NODE, so the two
 *  could never disagree and a flush ring passed.
 *
 *  SPLIT IN TWO by #801's fix, and that split is the correction rather than a refactor. One constant was
 *  enough while the coordinate was believed to BE the gap; it is not — the stroke is drawn inward across
 *  the gap, so the coordinate is the sum and the gap is what a designer sees. A harness carrying only the
 *  offset can state the coordinate it expects and cannot state the property that matters. */
const SHIM_GAP = 2;
const SHIM_STROKE = 2;
/** What the executor must write: the gap plus the stroke that eats it. Derived here, once, so the
 *  assertions below quote the formula rather than restating a number. */
const SHIM_COORD = SHIM_GAP + SHIM_STROKE;

type FontName = { family: string; style: string };
const fontKey = (f: FontName): string => `${f.family}|${f.style}`;
/** The font every text style in this shim names, unless a case overrides it. Semi Bold rather than
 *  Regular so a style's font is DIFFERENT from the font a fresh `createText` node starts on — equal
 *  fonts would make the loaded-font model below unfalsifiable. */
const STYLE_FONT: FontName = { family: 'Inter', style: 'Semi Bold' };

/**
 * A node in the FILE the executor searches, beyond the plain components `comps` names.
 *
 * Its `type` is the whole of #681: `findAllWithCriteria({ types: ['COMPONENT'] })` matches
 * `ComponentNode` and never `ComponentSetNode`, so a `focus-ring` that is a component SET is absent
 * from the lookup while its CHILDREN are present under their variant coordinates (`state=default`).
 * A flat name→component map cannot express that, which is why the live defect had no test.
 */
type FileNode =
  /** A component SET. Its `variants` become child COMPONENTs named by their variant coordinate — which
   *  is what a criteria search actually returns, and why the set's own name never enters the map. */
  | { name: string; type: 'COMPONENT_SET'; variants: string[] }
  /** An INSTANCE of a component, the shape a designer produces by duplicating a variant out of a set or
   *  dragging one in from a library. Its `main` is reachable only THROUGH the instance: an instance of a
   *  library component has no main in this file, so a criteria search cannot find it. */
  | { name: string; type: 'INSTANCE'; main: string }
  /** A FRAME or GROUP someone named the same thing — the third row of #681's message table. */
  | { name: string; type: 'FRAME' | 'GROUP' };

type ShimOpts = {
  vars?: string[]; styles?: string[]; effects?: string[]; comps?: string[]; page?: Page; insetValue?: unknown;
  /** Per-NAME resolved values, where `insetValue` overrides every name at once. Both exist because they
   *  answer different questions: `insetValue` reaches the not-a-number case, and this gives the ring's two
   *  halves DIFFERENT values, which is the only way to tell a sum from a doubling (#801). */
  varOverrides?: Record<string, unknown>;
  /** Nodes in the file that are NOT plain components (#681). Kept separate from `comps` so every
   *  existing case reads unchanged: `comps` still means "a plain COMPONENT of this name". */
  fileNodes?: FileNode[];
  /** Fonts `loadFontAsync` REFUSES — a family/style that is not installed. Figma fails this at the load
   *  call, which is a different failure from a font that exists but has not been loaded this run; both
   *  are modelled, and the executor's `catch` around the load was unreachable until now. */
  unavailableFonts?: FontName[];
  /** The font every text style names. Overridable so a case can put a font the run cannot load behind
   *  a style the plan does resolve. */
  styleFont?: FontName;
  /** DELIBERATE COST, in ms, charged to a named host call — the only way this harness can gate a rule
   *  about WHEN the clock starts. Everything else here is synchronous, so every `chunkMs` is 0 and the
   *  strongest available assertion is `>= 0`, which no clock rule can fail. `setup` burns inside
   *  `loadAllPagesAsync` (pre-build-loop work) and `combine` inside `combineAsVariants` (between-loops
   *  work); the yield's own burn is injected at `yieldTo` by `instrumented`. Busy-wait rather than a
   *  timer because `Date.now()` is what the executor reads, and a `setTimeout` would advance the clock
   *  while handing control away — which is the very thing being distinguished. Opt-in per run, so only
   *  the one block below pays for it. */
  burn?: { setup?: number; combine?: number };
  /**
   * A CALL COUNTER ON THE HOST BOUNDARY — every subtree `findOne` a node actually receives (#701).
   *
   * THE ORACLE FOR `refsSearched`, and it has to be observed out here rather than read off the result,
   * for the reason `docs/34` names and `yieldCalls` below already demonstrates: a counter incremented by
   * the code under test is not an independent witness of that code's behavior. `refsRetained` /
   * `refsKnownAbsent` / `refsSearched` are bookkeeping on WHICH BRANCH THE EXECUTOR BELIEVES IT TOOK; this
   * is a record of WHAT THE HOST WAS ACTUALLY ASKED. They coincide in correct code and nothing structural
   * forces them to — the increment and the lookup are two independent statements inside one `if`.
   *
   * MEASURED, not hypothesized. Changing only `node = kept` to `node = member.findOne(...)` INSIDE the
   * `builtFor` branch — leaving every increment untouched, so the map still populates and still decides
   * which counter moves — passed all 133 assertions of this suite including `r1.refsSearched === 0`, while
   * the wire loop hit the scenegraph on every one of its 63 lookups. Host calls on the first run: 42
   * clean, 105 mutated. The fix was completely inert, at full cold cost, and the counters actively vouched
   * for it — a worse failure mode than an honest miss.
   *
   * SCOPE: `mkNode`'s `findOne`, which is the descendant search the cold ~18ms cost was measured on and the only
   * population the #701 claim is about. `currentPage.findOne` (the once-per-run lookup for the set itself)
   * is a different closure and deliberately outside this count — it is one call, not 63.
   *
   * Opt-in per run, so only the block that asserts on it pays the increment.
   */
  hostSearches?: { n: number };
  /**
   * HOST CALLS THAT REFUSE (#913) — the two throws that leave nodes in the file, and the failure path's
   * own failure.
   *
   * `combine` reaches the large regime: every member has been created, named, and appended to the page,
   * and then the one call that would gather them refuses.
   *
   * `createFrame` has TWO settings because it is reached twice, and the difference is what each arm needs.
   * `'on-failure-path'` is latched to a refusal that already happened, and reaches the case the whole
   * design turns on — the marking runs on a host that has just rejected a call, so it has to be able to
   * reject the next one too, and the verdict must still name the nodes rather than report a clean file.
   * `'always'` refuses the BUILD's first frame instead, so nothing is ever written: that is the third
   * state, where a throw leaves the file untouched and the verdict must not invent a count for it. The two
   * are not interchangeable, which is measured rather than assumed — `'always'` on the marking arm strands
   * nothing at all, so all three of its assertions passed on an empty set.
   *
   * Opt-in per run: every other case in this file drives a host that accepts everything.
   */
  refuse?: { combine?: boolean; createFrame?: 'always' | 'on-failure-path' };
};

/** A blocking burn. Deliberately holds the thread: the executor measures with `Date.now()`, so cost it
 *  cannot observe is cost this harness cannot charge. */
const burnMs = (ms: number): void => { const t0 = Date.now(); while (Date.now() - t0 < ms) { /* hold */ } };

const makeShim = (opts: ShimOpts = {}) => {
  const names = new Set(opts.vars ?? []);
  const page = opts.page;
  /**
   * FIGMA'S FONT-LOADED STATE — per plugin RUN, and the host behavior no shim modelled (#680).
   *
   * A font must be loaded before any write that resolves text in it, and nothing a previous run loaded
   * is loaded in this one. Modelled here because the alternative — an unconditional no-op
   * `loadFontAsync` — makes the executor's whole font path unfalsifiable: it can never throw, so the
   * `catch` that reports it is a check that runs and cannot fire.
   */
  const loadedFonts = new Set<string>();
  /** THE HOST HAS ALREADY REFUSED SOMETHING (#913) — latched, never reset. What `frameOnFailurePath`
   *  hangs off, so the marking meets a host in the state it is actually written for. */
  let hostRefusing = false;
  const unavailable = new Set((opts.unavailableFonts ?? []).map(fontKey));
  const textStyles = (opts.styles ?? []).map((name) => ({ id: `S:${name}`, name, fontName: opts.styleFont ?? STYLE_FONT }));
  const fontOfStyle = (id: string): FontName | undefined => textStyles.find((s) => s.id === id)?.fontName;
  // Members LEAVE the page when they join a set, as they do live — otherwise `set.children` and the
  // page disagree about who owns what, which is the state the skip-by-name check reads.
  const takeFromPage = (kids: Node[]): void => {
    if (!page) return;
    for (const k of kids) { const i = page.children.indexOf(k); if (i >= 0) page.children.splice(i, 1); }
  };
  // PER NAME (#801). The ring's coordinate is the sum of two resolved variables, so a resolver answering
  // one number for every name would make `gap + stroke` indistinguishable from `2 × gap` and the formula
  // under test would be satisfied by the wrong arithmetic. Mirrors the engine stub's `resolved`.
  const resolvedValue = (name: string): unknown =>
    opts.varOverrides && name in opts.varOverrides ? opts.varOverrides[name]
      : opts.insetValue !== undefined ? opts.insetValue
      : name === 'focus/ring/width' ? SHIM_STROKE
      : name === 'focus/ring/offset' ? SHIM_GAP
      : SHIM_GAP;
  const mkVar = (name: string) => ({ id: `V:${name}`, name, value: varValue(name), resolveForConsumer: () => ({ value: resolvedValue(name) }) });

  const mkNode = (type: string): Node => {
    const node: Node = {
      type, name: '', boundVariables: {} as Record<string, unknown>,
      // #682: the aspect-ratio lock STARTS ENGAGED and only `unlockAspectRatio()` releases it, which is
      // the whole reason the call is load-bearing. A shim that started unlocked would pass whether the
      // executor called it or not. `_unlocks` counts the calls, because the port field is optional and
      // the call site is `?.()` — an absent method skips silently, so "nothing threw" is not evidence.
      _aspectLocked: true, _unlocks: 0,
      fills: [] as unknown[], strokes: [] as unknown[], children: [] as Node[],
      // `strokeWeight` starts at 0 so the executor's `if(!node.strokeWeight)` default fires as it does
      // live; `strokesIncludedInLayout` starts TRUE because that is Figma's default and the thing
      // border-box has to override.
      ...(type === 'FRAME' ? { strokeWeight: 0, strokesIncludedInLayout: true } : {}),
      characters: '',
      opacity: 1,
      componentPropertyReferences: null as Record<string, string> | null,
      constraints: null as unknown,
      parent: null as Node | null,
      _absolute: false,
      // THE FIFTH TIME A SHIM HERE HAS HAD TO STOP MEASURING A CONSTANT (#848) — see the `width`, `height`
      // and eviction notes above for the earlier ones, all the same finding from a different direction.
      // `x`/`y` were plain `0` fields, so EVERY flow child reported the same position and the executor's
      // centering arithmetic was unfalsifiable: centering a spinner on its PARENT and centering it on a
      // SIBLING give identical coordinates when every sibling sits at 0, which is exactly the defect #848
      // fixes. The gate for it could not have been written against this shim.
      //
      // So a flow child's `x` is DERIVED — the parent's left padding plus the widths and gaps of the flow
      // siblings ahead of it, which is what a HORIZONTAL auto-layout does. An ABSOLUTE child keeps what the
      // executor wrote, since that is the position under test. Mirrors the engine stub deliberately: the
      // parity gate compares the two executors, so a shim modelling a different Figma would make that
      // comparison meaningless.
      _x: 0, _y: 0,
      get x() {
        const p = node.parent as Node | null;
        if (node._absolute || !p || !p.layoutMode) return node._x as number;
        const bv = p.boundVariables as Record<string, { value?: number }>;
        const gap = bv.itemSpacing?.value ?? 0;
        let at = bv.paddingLeft?.value ?? 0;
        for (const c of ((p.children as Node[]) ?? [])) {
          if (c === node) return at;
          if (c.layoutPositioning === 'ABSOLUTE') continue;   // takes no cell, contributes no offset
          at += ((c.width as number) || 0) + gap;
        }
        return at;
      },
      set x(v: number) { node._x = v; },
      // The cross axis, same shape. `counterAxisAlignItems` is CENTER on every row this projects, so a
      // flow child is vertically centered rather than top-stacked — asserting a spinner's `y` against a
      // top-aligned model would demand the wrong number and make the gate wrong the other way.
      get y() {
        const p = node.parent as Node | null;
        if (node._absolute || !p || !p.layoutMode) return node._y as number;
        if (p.counterAxisAlignItems !== 'CENTER') return (p.boundVariables as Record<string, { value?: number }>).paddingTop?.value ?? 0;
        return (((p.height as number) || 0) - ((node.height as number) || 0)) / 2;
      },
      set y(v: number) { node._y = v; },
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
      // Releases the aspect-ratio lock (#682). Counted as well as applied: the port field is optional and
      // the executor calls it `?.()`, so a port that lost the method would skip the unlock in silence.
      unlockAspectRatio() { node._aspectLocked = false; (node._unlocks as number)++; },
      // The VALUE alongside the id, because a bound dimension is what SIZES the node live — the getters
      // above read it. Without it the binding is bookkeeping and every node measures the same.
      //
      // AND THE EVICTION IS MODELLED (#682). While the aspect ratio is LOCKED, a node cannot hold two
      // independent dimension bindings: the second setter silently evicts the first, last-write-wins,
      // with no throw and nothing in `misses[]`. That is the defect the unlock exists to prevent, so the
      // shim reproduces it rather than merely counting the call — without this, `unlockAspectRatio()`
      // could be deleted from the executor and every geometry assertion here would still pass.
      setBoundVariable(prop: string, v: { id: string; value?: number }) {
        const bv = node.boundVariables as Record<string, unknown>;
        if (node._aspectLocked && (prop === 'width' || prop === 'height')) {
          delete bv[prop === 'width' ? 'height' : 'width'];
        }
        bv[prop] = { id: v.id, value: v.value };
      },
      // APPLYING A STYLE RE-RESOLVES THE TEXT, so Figma demands the style's font be loaded FIRST — and
      // nothing a previous run loaded counts (#680). Modelled because an unconditional success makes the
      // executor's `loadFontAsync` call deletable with the whole suite green: the `catch` that reports a
      // font it could not load is a check that runs and cannot fire. The message is Figma's own.
      setTextStyleIdAsync: async (id: string) => {
        const fn = fontOfStyle(id);
        if (fn && !loadedFonts.has(fontKey(fn)))
          throw new Error(`in setTextStyleIdAsync: unloaded font "${fn.family} ${fn.style}". Please call figma.loadFontAsync({ family: "${fn.family}", style: "${fn.style}" }) and await the returned promise first.`);
        node._textStyleId = id;
      },
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
      // COUNTED AT THE HOST BOUNDARY, and that is the whole point of the counter rather than a
      // convenience (#701). The executor reports `refsSearched` from the branch it *believes* it took;
      // this records the calls Figma *actually received*. Two independent facts, so an assertion can hold
      // them against each other — see `hostSearches` in `ShimOpts` for the mutation that made it necessary.
      findOne(pred: (n: unknown) => boolean) {
        if (opts.hostSearches) opts.hostSearches.n++;
        return (node.findAll as (p?: unknown) => Node[])(pred)[0] ?? null;
      },
      // PER-NODE SHARED PLUGIN DATA (#827) — a real store, not a recorder. The stamp is the only thing that
      // distinguishes "already built and correct" from "built by an older plan and now wrong", and it is
      // written on one run and READ on the next: a shim that only counted the write would leave the read
      // arm reading `''` forever, so every re-run would report STALE and the idempotence arms could never
      // go green. So the two halves have to compose, across runs, on a node that outlives one run.
      //
      // Keyed `namespace|key` because Figma scopes an entry by both, and returning `''` for an unset key is
      // Figma's documented behaviour rather than a convenience — `undefined` would let `planHalf(got)` throw
      // instead of comparing, and the executor's "unstamped reads as stale" branch depends on the empty
      // string specifically. Per node, because that is the storage shape this build chose (a set-level map of
      // 648 member names against their hashes measures 66.9 kB in a single entry, against a documented 100 kB
      // per-entry ceiling; 16 B on each of 648 nodes is the cheap side of that).
      _pluginData: new Map<string, string>(),
      getSharedPluginData(namespace: string, key: string) {
        return (node._pluginData as Map<string, string>).get(`${namespace}|${key}`) ?? '';
      },
      setSharedPluginData(namespace: string, key: string, value: string) {
        (node._pluginData as Map<string, string>).set(`${namespace}|${key}`, value);
      },
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
    getLocalTextStylesAsync: async () => textStyles,
    getLocalEffectStylesAsync: async () => (opts.effects ?? []).map((name: string) => ({ id: `E:${name}`, name })),
    // TWO failure modes, and they are different (#680): a font that is not INSTALLED fails here, at the
    // load; a font that exists but has not been loaded THIS RUN fails later, at the write. An
    // unconditional no-op models neither.
    loadFontAsync: async (fn: FontName) => {
      if (unavailable.has(fontKey(fn))) throw new Error(`Cannot load font "${fn.family} ${fn.style}": it is not available.`);
      loadedFonts.add(fontKey(fn));
    },
    // Zero-cost unless a run asks for the burn (`opts.burn.setup`). This is the last of the pre-build-loop
    loadAllPagesAsync: async () => { if (opts.burn?.setup) burnMs(opts.burn.setup); },
    // WHAT A CRITERIA SEARCH ACTUALLY RETURNS (#681). `types: ['COMPONENT']` matches `ComponentNode`
    // only, so this honors the criteria rather than ignoring them — the previous flat map returned every
    // entry as a bare COMPONENT whatever it was, which is exactly why the live defect could not be
    // reproduced. `comps` are plain components; `fileNodes` are everything else in the file, and each
    // contributes what a real search would see:
    //   · COMPONENT_SET — its CHILDREN, named by variant coordinate. The set's own name never appears,
    //     which is the whole defect: the lookup misses a `focus-ring` that is in the file.
    //   · INSTANCE — nothing. An instance is not a COMPONENT, and its main component is reachable only
    //     through the instance (for a library instance, not at all).
    //   · FRAME/GROUP — nothing, for the same reason.
    root: {
      findAllWithCriteria: (criteria?: { types?: string[] }) => {
        const types = criteria?.types ?? ['COMPONENT'];
        const mkRef = (name: string, i: number) => ({
          name, id: `73:${37 + i}`,
          createInstance: () => { const inst = mkNode('INSTANCE'); const vec = mkNode('VECTOR'); inst.findAll = () => [vec]; inst.findOne = () => null; return inst; },
        });
        const found: { name: string; id: string; createInstance: () => Node; children?: { name: string }[] }[] = [];
        let seq = 0;
        for (const name of opts.comps ?? []) if (types.includes('COMPONENT')) found.push(mkRef(name, seq++));
        for (const fn of opts.fileNodes ?? []) {
          if (fn.type === 'COMPONENT_SET') {
            // The SET, carrying its `children` — which is the only thing a `nest-fixed` resolution reads,
            // and was missing here until #681's consumer side. Without it the executor could FIND the set
            // and then see an empty member list, so every coordinate reported the fifth miss and the
            // success path was unreachable while looking exercised: the assertions about a wrong
            // coordinate would all have passed against a shim that had no right answer to give.
            if (types.includes('COMPONENT_SET')) found.push({ ...mkRef(fn.name, seq++), children: fn.variants.map((v) => ({ name: v })) });
            // The members, under their variant coordinates — the names a COMPONENT search really returns.
            if (types.includes('COMPONENT')) for (const v of fn.variants) found.push(mkRef(v, seq++));
          } else if (types.includes(fn.type)) found.push(mkRef(fn.name, seq++));
        }
        return found;
      },
      // What a NAME-based search over the whole file sees, which is a different question from a criteria
      // search and the one the miss message has to ask (#681). It was `_allNamed`, test-only, when the
      // reproduction landed without a fix; now that the executor diagnoses its own miss it IS the port's
      // `findAll`, so the shim answers the same question the live host does.
      //
      // Returns the file's nodes irrespective of type — a COMPONENT_SET under its OWN name (unlike the
      // criteria search above, which only ever yields its children), an INSTANCE, a FRAME. That
      // difference between the two searches is the entire defect, so the shim has to hold both.
      findAll: (predicate: (n: { name: string; type: string }) => boolean): { name: string; type: string }[] =>
        [
          ...(opts.comps ?? []).map((c) => ({ name: c, type: 'COMPONENT' })),
          ...(opts.fileNodes ?? []).map((f) => ({ name: f.name, type: f.type })),
        ].filter(predicate),
      /** Kept as the REACHABILITY probe, distinct from `findAll` above on purpose: the assertions below
       *  state what the file holds, and reading them off the same method the executor now calls would be
       *  reading the subject. Two spellings of one question is the point, not duplication. */
      _allNamed: (name: string): { name: string; type: string }[] => [
        ...(opts.comps ?? []).filter((c) => c === name).map((c) => ({ name: c, type: 'COMPONENT' })),
        ...(opts.fileNodes ?? []).filter((f) => f.name === name).map((f) => ({ name: f.name, type: f.type })),
      ],
    },
    createText: () => mkNode('TEXT'),
    createFrame: () => {
      // #913: either the BUILD's first frame or the MARKING's, depending on the setting. Figma's message
      // for a file the plugin may not write to.
      if (opts.refuse?.createFrame === 'always' || (opts.refuse?.createFrame === 'on-failure-path' && hostRefusing))
        throw new Error('in createFrame: The document is not editable');
      return mkNode('FRAME');
    },
    // THE SVG IMPORTER (#864) — a FRAME on the document's artboard, wrapping the outline it drew.
    // Mirrors the engine stub's, deliberately and for the reason stated on that one: the parity gate
    // drives both executors against one host model, so two different models would turn its comparison
    // into a comparison of models. Read that copy for what this can and cannot be evidence about —
    // there is no SVG importer in Node, so the shape is the typings' claim rather than a measurement,
    // and only the executor's runtime misses can catch the live host disagreeing.
    createNodeFromSvg: (svg: string) => {
      const attr = (name: string) => Number(new RegExp(`${name}="([0-9.]+)"`).exec(svg)?.[1] ?? 0);
      const frame = mkNode('FRAME');
      (frame.resize as (w: number, h: number) => void)(attr('width'), attr('height'));
      const d = /<path[^>]*\bd="([^"]*)"/.exec(svg)?.[1] ?? '';
      const nums = (d.match(/-?[0-9]*\.?[0-9]+/g) ?? []).map(Number);
      const span = (v: number[]) => (v.length ? Math.max(...v) - Math.min(...v) : 0);
      const vec = mkNode('VECTOR');
      (vec.resize as (w: number, h: number) => void)(span(nums.filter((_, i) => i % 2 === 0)), span(nums.filter((_, i) => i % 2 === 1)));
      (frame.appendChild as (c: Node) => void)(vec);
      return frame;
    },
    createComponentFromNode: (n: Node) => n,
    combineAsVariants: (members: Node[]) => {
      // Between the build loop's last boundary and the wire loop's first — the window the wire re-stamp
      // excludes. Charged here rather than in `resize` or `addComponentProperty` because this is the
      // single most expensive of the set-level calls live.
      if (opts.burn?.combine) burnMs(opts.burn.combine);
      // #913: refuses AFTER every member is built, named and on the page — the large regime, and the one
      // call in the run whose failure strands the most. Figma's own message for the case it rejects.
      if (opts.refuse?.combine) { hostRefusing = true; throw new Error('in combineAsVariants: The nodes must all have the same parent'); }
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
const run = (plans: AnatomyPlan[], opts: ShimOpts = {}, apply: ComponentApplyOptions = {}) =>
  applyComponentPlan(plans, makeShim(opts) as any, apply);

/** A run that RECORDS its yields and its progress reports (#684).
 *
 *  The injected `yieldTo` is what makes the yield observable at all — it resolves immediately rather than
 *  through a real timer, which is the point twice over: the suite does not pay 54 timer ticks per run, and
 *  a yield that happened is distinguishable from one that did not. With the production `setTimeout(0)`
 *  there is nothing to assert against; the only evidence would be that the run finished, which it does
 *  either way.
 *
 *  It resolves via `Promise.resolve()` — a MICROTASK — and that is a deliberate difference from
 *  production, not an oversight. A microtask yields nothing to a host event loop, which is exactly why
 *  `realYield` uses `setTimeout`; but this harness has no host to yield to, so what is being measured here
 *  is the executor's control flow, and a microtask measures that identically while keeping the test
 *  synchronous-fast. The macrotask requirement is a property of the production path and is NOT currently
 *  assertable here: swapping `realYield`'s `setTimeout` for `Promise.resolve()` passes this whole suite,
 *  because a harness with no event loop cannot tell the two apart. Only the live run can.
 *
 *  `yieldCalls` AND `progress` ARE COUNTED SEPARATELY, AND THAT SEPARATION IS THE GATE — docs/34 §2, an
 *  oracle and its subject sharing a dependency. For one commit `yields` was pushed from inside
 *  `onProgress`, so every "the executor yields on every boundary" assertion below was reading the
 *  REPORTING cadence and calling it yielding: deleting `await yieldTo()` from `breathe` left the suite
 *  fully green (mutation M6, verified). A report and a yield are two facts, so they are recorded by two
 *  callbacks that cannot substitute for one another, and asserted to agree. */
const instrumented = async (plans: AnatomyPlan[], opts: ShimOpts = {}, chunk?: number, burnYield = 0) => {
  const yieldCalls = { n: 0 };
  const yields: string[] = [];
  const progress: ComponentProgress[] = [];
  const r = await run(plans, opts, {
    chunk,
    // Recorded in the order they fire, tagged with the phase and fraction that was current — so an
    // assertion can check ORDER, not just counts. `onProgress` fires immediately before the yield in
    // `breathe`, so the two arrays are index-parallel.
    onProgress: (p) => { progress.push({ ...p }); yields.push(`${p.phase}:${p.done}/${p.total}`); },
    // The ONLY witness that control was handed back. Nothing else in this file increments it.
    // `burnYield` charges the YIELD's own duration, which is the third clock rule: `breathe` re-stamps
    // AFTER awaiting, so a yield that took 40ms must not be billed to the chunk that follows it. Live,
    // that time is the host doing its own work — the entire point of yielding — so counting it as chunk
    // cost would make every chunk look worse the more politely the executor behaved.
    yieldTo: () => { yieldCalls.n++; if (burnYield) burnMs(burnYield); return Promise.resolve(); },
  });
  return { r, yields, progress, yieldCalls: yieldCalls.n };
};

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
// GUARDED, because a stack trace is not a test result: it names a line rather than a claim, and it
// aborts every assertion below it — including the ones a reader would go looking for. This became a real
// possibility once the shim started modelling Figma's font-loaded state (#680): deleting this lane's
// `loadFontAsync` call makes `setTextStyleIdAsync` throw from here, and that must read as the failure of
// a named claim, not as a crash.
const page: Page = { children: [] };
let r1Threw = '';
let r1!: Awaited<ReturnType<typeof run>>;
// The host-boundary counter for #701's route assertions. ONE counter across both runs, read by snapshot,
// and that is forced rather than chosen: the second run appends into the set the FIRST run built, so its
// members are nodes `r1`'s shim created and their `findOne` closes over `r1`'s counter. A fresh counter
// handed to the second run would sit at 0 no matter what that run did — vacuous, and it would read as
// "zero searches" precisely when the searching route is the one under test. Measured: 0 while the executor
// reported 63. So it is installed once, before the run it first measures, and each phase takes a delta.
const hostFinds = { n: 0 };
try { r1 = await run(grid, { ...full(), page, hostSearches: hostFinds }); } catch (e) { r1Threw = (e as Error).message; }
// SNAPSHOT IMMEDIATELY, before any assertion helper walks the tree: `partOf` below uses `findAll`, not
// `findOne`, so it does not perturb this — but a later helper that reached for `findOne` would silently
// inflate the figure, and the delta would be attributed to the executor.
const hostAfterR1 = hostFinds.n;
ok(r1Threw === '', `the fully-resolved run COMPLETES rather than throwing${r1Threw ? ` — ${r1Threw.slice(0, 110)}` : ''}`);
if (r1Threw) {
  console.error('\n  (every assertion below depends on that run, so the suite stops here)');
  console.log(`\nplugin COMPONENT write-adapter: ${failed} FAILED`);
  process.exit(1);
}

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

/**
 * THE RING GEOMETRY, and this block is the way it is because of #801 — which it passed while broken.
 *
 * Its previous form derived the expected offset FROM THE NODE UNDER TEST and skipped itself whenever the
 * ring was flush:
 *
 *     if ((ring.x as number) >= 0) continue;      // the flush case skips its own check
 *     const off = -(ring.x as number);            // EXPECTED read off ACTUAL
 *
 * Both lines are `docs/34` shape 1. The `continue` was there to tell an INSET part from a CENTERED one
 * (#612's spinner) and used the negative origin as the discriminator — so the one state worth catching
 * was classified as "not my subject". Then `off` came off the node, making `width === parent + off*2` a
 * comparison of the node with itself: at offset 0 it asserts `0 === 0`. Measured, not inferred — with
 * the shim's inset at 0, a ring sitting exactly on the border it must be distinguishable from, this
 * whole suite stayed green and this line printed a ✓ claiming the ring was "2px larger on EVERY side".
 *
 * Two changes, and each closes one of those:
 *
 *   1. INSET vs CENTERED is read from the PLAN's `absoluteInset`, which is the field that actually
 *      means it — not from a coordinate the executor wrote. A centered part has `absoluteCenter` and no
 *      inset; the plan states which is which before the run, so the classification cannot be moved by
 *      the very write under test.
 *   2. EXPECTED is what the SHIM WAS TOLD to resolve (`SHIM_GAP` / `SHIM_STROKE`, the harness's INPUT),
 *      not what was read back out. Input vs output is the #708 shape, and it is the only version of this
 *      assertion that can fail.
 *
 * AND THEN THAT FIXED VERSION WAS STILL WRONG, which is the part worth reading before trusting anything
 * below. Both changes above are real and neither was sufficient: the repaired assertion took ONE number
 * and asserted the ring's origin was `-that`, which at the shipped 2px offset expected exactly -2 — the
 * flush geometry. It was independent, falsifiable, and measuring the wrong quantity. The ring draws its
 * stroke INSIDE its own bounds, so the coordinate is `gap + stroke` and the property WCAG 1.4.11 is about
 * is the GAP; a checker holding one number can state the coordinate and cannot state the gap. Found by
 * comparing a built file against the Prism2 reference (-4 for the same 2px stroke), not by any gate.
 * `docs/34`'s newest shape is this: a fully independent gate can measure the wrong quantity, and the
 * aggravating detail is that the parity gate confirmed both executors agreed — on one wrong formula.
 *
 * So the checker takes the gap and the stroke separately, asserts the gap is positive OUTRIGHT, and
 * derives it from the built node's own origin. Positive outright because that is #801's actual defect: a
 * gap of 0 resolves cleanly, writes without throwing, reports no miss and produces a structurally perfect
 * component — there is no layer below this one at which it looks like an error. TWO negative controls
 * follow, and the second is the one that matters: a zero offset (never the live symptom) and a correct
 * offset with the stroke unmodeled (what actually shipped). The old single-number checker passes the
 * second one.
 */
const focusName = grid.map(planComponentName).find((n) => n.includes('state=focus'))!;
const focusMember = memberByName.get(focusName)!;
const focusPlan = grid.find((p) => planComponentName(p) === focusName)!;
/** Part names the PLAN marks inset / centered — the independent classification point 1 above needs. */
const planParts = (n: { name: string; absoluteInset?: string; absoluteCenter?: boolean; children: unknown[] }): Array<{ name: string; inset?: string; centered?: boolean }> => [
  { name: n.name, inset: n.absoluteInset, centered: n.absoluteCenter },
  ...(n.children as typeof n[]).flatMap(planParts),
];
const planInset = new Map(planParts(focusPlan.root).filter((p) => p.inset).map((p) => [p.name, p.inset!] as const));
const ringNames = (focusMember.findAll as () => Node[])().filter((n) => n._absolute).map((n) => String(n.name));
ok(ringNames.length > 0, `the focus variant carries an absolutely-positioned part (${ringNames.join(', ')})`);
ok(planInset.size > 0 && ringNames.some((n) => planInset.has(n)),
  `the PLAN marks at least one of them inset, so the geometry below is classified independently of what the executor wrote (${[...planInset].map(([n, v]) => `${n}→${v}`).join(', ')})`);

/** Every way the built ring can disagree with the values the run was TOLD to resolve. Returns the
 *  complaints so both the main case and the negative control below can read the same checker.
 *
 *  TAKES THE GAP AND THE STROKE SEPARATELY, which is #801's correction to this very function. Its first
 *  form took one `wantOff` and asserted the ring's origin was `-wantOff` — a check that was independent,
 *  falsifiable, and measuring the wrong quantity. The ring draws its stroke INSIDE its own bounds, so the
 *  coordinate is `gap + stroke` while the property a designer sees is the GAP, and a checker holding one
 *  number can state the first and cannot state the second. Both are asserted below, separately, because
 *  they fail in different ways: the coordinate catches an executor that forgot the stroke, and the gap
 *  catches an offset that resolved to something that leaves no sliver at all. */
const ringProblems = (member: Node, insetOf: Map<string, string>, wantGap: number, wantStroke: number): string[] => {
  const bad: string[] = [];
  const wantCoord = wantGap + wantStroke;
  for (const [rn] of insetOf) {
    const ring = partOf(member, rn);
    if (!ring) { bad.push(`${rn}: the plan marks it inset and no such node was built`); continue; }
    if (ring.layoutPositioning !== 'ABSOLUTE') { bad.push(`${rn}: reads ${ring.layoutPositioning}, so it would take a cell in the row`); continue; }
    // #801, and the ONLY line here stated in the terms WCAG 1.4.11 is written in: how much background a
    // designer can see between the host's border and the ring. Every other check is arithmetic about the
    // coordinate, and the coordinate was never the property that mattered. Derived from the built node's
    // own origin rather than from `wantCoord`, so an executor writing the right coordinate by the wrong
    // route still has to leave a real sliver.
    const gap = -(ring.x as number) - wantStroke;
    if (!(gap > 0)) bad.push(`${rn}: the visible gap is ${gap} — the ring is drawn ${wantStroke}px inside its own bounds, so an origin of ${ring.x} puts its outer edge ${gap === 0 ? 'FLUSH AGAINST' : 'INSIDE'} the border it exists to be distinguishable from (#801)`);
    else if (gap !== wantGap) bad.push(`${rn}: the visible gap is ${gap}, and the run was told to resolve a gap of ${wantGap}`);
    if (ring.x !== -wantCoord || ring.y !== -wantCoord) bad.push(`${rn}: origin ${JSON.stringify([ring.x, ring.y])}, expected ${JSON.stringify([-wantCoord, -wantCoord])} — a gap of ${wantGap} plus the ${wantStroke}px stroke drawn inside it`);
    if ((ring.width as number) !== (member.width as number) + wantCoord * 2 || (ring.height as number) !== (member.height as number) + wantCoord * 2)
      bad.push(`${rn}: ${ring.width}x${ring.height} against a ${member.width}x${member.height} target at a coordinate of ${wantCoord}`);
    const con = ring.constraints as { horizontal?: string; vertical?: string } | null;
    if (con?.horizontal !== 'STRETCH' || con?.vertical !== 'STRETCH') bad.push(`${rn}: constraints ${JSON.stringify(con)} — it would not track a resized variant`);
  }
  return bad;
};
const ringBad = ringProblems(focusMember, planInset, SHIM_GAP, SHIM_STROKE);
ok(ringBad.length === 0, `the focus ring is absolute, at origin [-${SHIM_COORD},-${SHIM_COORD}] (a ${SHIM_GAP}px visible gap plus its own ${SHIM_STROKE}px stroke), ${SHIM_COORD}px larger on EVERY side, and STRETCHed`
  + (ringBad.length ? ` — ${ringBad.join('; ')}` : ''));

// ---- the negative control: THIS CHECKER MUST FAIL ON A FLUSH RING ---------------------------
// The assertion above is the one that reported a pass on #801, so its replacement does not get to be
// taken on trust. Build the same set with the offset resolving to 0 — the exact #801 symptom — and
// require the checker to complain. `docs/34`: the test of a gate is not that the suite goes red, it is
// that THIS check is among the failures. Here that is asserted in the suite itself rather than left to
// whoever next runs a mutation by hand.
const flushPage: Page = { children: [] };
const flush = await run(grid, { ...full(), page: flushPage, insetValue: 0 });
const flushMember = (flushPage.children[0].children as Node[]).find((m) => String(m.name) === focusName)!;
ok(flush.misses.length === 0,
  `a zero offset is reported by NOTHING — the flush run is clean at every layer below this assertion (${flush.misses.length} misses), which is why #801 needed a check of its own`);
const flushBad = ringProblems(flushMember, planInset, 0, SHIM_STROKE);
ok(flushBad.some((b) => b.includes('#801')),
  `and the ring checker CATCHES it: a flush ring is a failure, not a skipped case (${flushBad[0] ?? 'NOTHING REPORTED — the check is self-disarming again'})`);

// ---- the SECOND negative control: the defect that actually shipped -------------------------------
// A zero offset was never the live symptom. What shipped was a CORRECT offset of 2 with the ring's stroke
// unmodeled, so the executor wrote -2, the stroke was drawn back across the whole gap, and the ring
// landed flush while every number in the plan was right. That is a different mutation from `insetValue: 0`
// and the checker has to catch it too — the version of this function that took a single `wantOff` could
// not, because -2 was exactly what it expected. Reproduced by resolving the stroke width to 0, which is
// what "ignoring the stroke" means arithmetically, then asking the checker for the gap it leaves against
// the REAL 2px stroke the ring draws.
const noStrokePage: Page = { children: [] };
const noStroke = await run(grid, { ...full(), page: noStrokePage, varOverrides: { 'focus/ring/width': 0 } });
const noStrokeMember = (noStrokePage.children[0].children as Node[]).find((m) => String(m.name) === focusName)!;
ok(noStroke.misses.length === 0,
  `an unmodeled stroke is reported by NOTHING either — the run is clean at every layer (${noStroke.misses.length} misses), which is how a flush ring shipped with 0 misses and a green suite`);
const noStrokeRing = partOf(noStrokeMember, [...planInset.keys()][0])!;
ok(noStrokeRing.x === -SHIM_GAP,
  `...and it really does reproduce the shipped geometry: the ring sits at exactly -${SHIM_GAP}, the number the old assertion expected and passed on (${noStrokeRing.x})`);
const noStrokeBad = ringProblems(noStrokeMember, planInset, SHIM_GAP, SHIM_STROKE);
ok(noStrokeBad.some((b) => b.includes('#801')),
  `and the ring checker CATCHES the shipped defect: an offset of ${SHIM_GAP} that ignores the ${SHIM_STROKE}px stroke leaves no sliver (${noStrokeBad[0] ?? 'NOTHING REPORTED — the check measures the coordinate again and not the gap'})`);

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

// ---- WHICH BOX the centering is measured on (#848) -------------------------------------------
// Everything above measures the spinner against the BUTTON'S box, and at this coordinate that is also the
// label's box — the label is the only flow child, so the two centers coincide to the pixel. Which means
// none of it can tell `absoluteCenterOn` from the old unconditional parent-centering, and deleting the
// field would leave every assertion above green (doc 34 shape 4).
//
// Button no longer REACHES an asymmetric case, because that is what #848 fixed: wherever a visual cell
// exists the spinner takes it in the flow and centers nothing. So the geometry runs on a HAND-BUILT plan —
// the label-only pending tree with a trailing visual spliced in beside the label, pushing it left of the
// container's center while the spinner still overlays it. That is the shape the live defect rendered.
const pendPlan = labelOnly.find((p) => p.coord.state === 'pending')!;
const trailingKid = (figmaAnatomyPlan(button, 'medium', { leading: false, trailing: true, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: 'filled', state: 'rest' })
  .root.children ?? []).find((c) => c.name === 'trailingVisual')!;
const pendLabel = (pendPlan.root.children ?? []).find((c) => c.name === 'label')!;
const pendSpin = (pendPlan.root.children ?? []).find((c) => c.name === 'spinner')!;
// The absolute child stays LAST, for the z-order reason the engine's plan gate states.
const askew = { ...pendPlan, root: { ...pendPlan.root, children: [pendLabel, trailingKid, pendSpin] } };
const askewPage: Page = { children: [] };
const askewRun = await run([askew], { ...fullFor([askew]), page: askewPage });
ok(askewRun.misses.length === 0, `the asymmetric pending tree writes CLEAN${askewRun.misses.length ? ` — ${askewRun.misses.join('; ')}` : ''}`);
const askewMember = (askewPage.children[0].children as Node[])[0];
const aSpin = partOf(askewMember, 'spinner')!, aLabel = partOf(askewMember, 'label')!;
const onLabel = (aLabel.x as number) + ((aLabel.width as number) - (aSpin.width as number)) / 2;
const onParent = ((askewMember.width as number) - (aSpin.width as number)) / 2;
// THE GUARD FIRST: if the two candidate boxes agree, the assertion below is vacuous and passes against
// either implementation — which is the state the block above is in, and why this one exists.
ok(Math.abs(onLabel - onParent) > 1,
  `the two candidate boxes give DIFFERENT answers here (${onLabel} vs ${onParent}) — without that gap the assertion below cannot tell them apart`);
ok(aSpin.x === onLabel,
  `the spinner is centered on the LABEL it stands in for, not on the button — a trailing cell holds the right side, so the container's center is ${onParent - onLabel}px off the text (${aSpin.x})`);
// A NAMED BOX THAT IS NOT THERE is reported rather than silently swapped for the parent, because the
// silent swap IS the defect. Drop the label from the tree and keep the reference.
const orphan = { ...pendPlan, root: { ...pendPlan.root, children: [trailingKid, pendSpin] } };
const orphanRun = await run([orphan], fullFor([orphan]));
ok(orphanRun.misses.some((m) => /spinner\.absoluteCenterOn -> label/.test(m)),
  `an absoluteCenterOn naming a part that was not built is REPORTED — a quiet fallback to the parent is the off-center spinner this field prevents (${orphanRun.misses.join('; ')})`);

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
const r2 = await run(grid, { ...full(), page, hostSearches: hostFinds });
const hostInR2 = hostFinds.n - hostAfterR1;   // the second run's own host calls, by delta
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

// ---- #827: A NAME MATCH IS NOT PROOF THE MEMBER IS CORRECT ---------------------------------
// The defect: `have.has(spec.name)` cannot distinguish "already built, and still what this build plans"
// from "built by an older engine, and now wrong". Both read as `ALREADY PRESENT`, so a designer who
// re-runs after the engine moved is told the file holds what they asked for and it does not.
//
// The fix REPORTS rather than repairs, and that choice is asserted below rather than merely commented:
// rebuilding means `createComponentFromNode` + a replacement node, and an instance tracks its main
// component by ID — so an auto-rebuild silently orphans every instance a designer had already placed.
// That is a worse outcome than a stale member, so the arms here check BOTH halves: that the staleness is
// named, and that the member node is the same object afterwards.
//
// THE NAMESPACE IS HARDCODED, not imported from `persist-figma`. It is the storage contract with files
// written by earlier builds: change it and every stamp already in the wild becomes unreadable, so every
// existing set silently reports stale. Importing `NS` would make that migration invisible to this gate;
// spelling it out means the rename has to come past an assertion (docs/34 shape 16).
const STAMP_NS = 'prism3';
const STAMP_K = 'memberStamp';
const stampOf = (n: Node): string => (n.getSharedPluginData as (ns: string, k: string) => string)(STAMP_NS, STAMP_K);

// (1) THE STAMP IS WRITTEN AT BUILD TIME, on the member the next run will read. Read off the shim's own
// store rather than from anything the executor returns — a `stale` count derived from a stamp the
// executor also produced would agree with itself.
const r1Members = page.children[0].children as Node[];
const r1Stamps = r1Members.map(stampOf);
ok(r1Stamps.every((s) => s !== ''), `every member built by the first run carries a stamp (${r1Stamps.filter((s) => s === '').length} of ${r1Stamps.length} unstamped)`);
ok(new Set(r1Stamps).size === 21,
  `the 21 stamps are DISTINCT — a constant would make every member look correct against every plan (${new Set(r1Stamps).size} distinct)`);
ok(r1Stamps.every((s) => s.split('|')[0] === ENGINE_VERSION && /^[0-9a-f]{16}$/.test(s.split('|')[1] ?? '')),
  `each stamp reads '<engine version>|<64-bit plan hash>', so a human reading the panel can tell which half moved (${r1Stamps[0]})`);
// The idempotent re-run above is therefore a round-trip claim as well as a skip claim: `ALREADY PRESENT`
// is now reachable ONLY through a stamp that was written on one run and read back on the next.
ok(r2.stale === 0, `a genuinely unchanged re-run reports NOTHING stale — the false-positive direction, and the one that would make this feature useless (${r2.stale})`);

// (2) THE PERTURBED PLAN. `derived` is plan metadata a later engine legitimately rewrites; it does not
// enter `planComponentName`, which is exactly the case the name-match check is blind to.
const laterGrid = grid.map((p) => ({ ...p, derived: { ...p.derived, minTapTarget: 'moved-by-a-later-engine' } }));
// GUARD FIRST — without both of these the arms below pass against any implementation. The names must be
// IDENTICAL (otherwise this is the ordinary add-a-member path, not the stale path) and the stamps must
// have MOVED (otherwise `STALE` is unreachable and the assertion is vacuous, #969).
ok(laterGrid.map(planComponentName).join('|') === grid.map(planComponentName).join('|'),
  'the perturbed plans carry the SAME 21 member names — so what follows exercises the name match, not a fresh build');
ok(laterGrid.every((p, i) => planStamp(p) !== planStamp(grid[i])),
  `...and a DIFFERENT plan stamp on every one of them (${laterGrid.filter((p, i) => planStamp(p) !== planStamp(grid[i])).length}/21 moved)`);

const stalePage: Page = { children: [] };
await run(grid, { ...full(), page: stalePage });
const staleSet = stalePage.children[0];
const beforeNodes = [...(staleSet.children as Node[])];
const beforeStamps = beforeNodes.map(stampOf);
const rStale = await run(laterGrid, { ...fullFor(laterGrid), page: stalePage });

ok(rStale.stale === 21 && rStale.skipped === 0 && rStale.added === 0,
  `every member built from an earlier plan is counted STALE and NOT as a skip (stale=${rStale.stale}, skipped=${rStale.skipped}, added=${rStale.added})`);
ok(rStale.misses.filter((m) => m.includes('-> STALE')).length === 21 && !rStale.misses.some((m) => m.includes('ALREADY PRESENT')),
  `...and each one is NAMED, with nothing reported as already present (${rStale.misses.length} misses; ${rStale.misses[0]})`);
ok(rStale.misses.every((m) => !m.includes('-> STALE') || (/built by engine [^,]+, plan [0-9a-f]{16}/.test(m) && /this build plans [0-9a-f]{16}/.test(m))),
  'every STALE line carries BOTH hashes — the one in the file and the one this build wanted — because "stale" with no pair of values is unactionable');
// THE ORPHANING CLAIM, checked by identity rather than by count: a rebuild would replace the node, and
// every instance a designer placed points at the OLD id. Same objects, in the same order.
ok((staleSet.children as Node[]).length === 21 && (staleSet.children as Node[]).every((c, i) => c === beforeNodes[i]),
  'a stale member is left in place — the SAME node object, so no instance a designer placed is orphaned');
ok(stalePage.children.length === 1, `and no second set is combined beside it (${stalePage.children.length} node on the page)`);
// AND THE RUN DOES NOT QUIETLY RE-STAMP WHAT IT DID NOT REBUILD. Re-stamping would make the next run
// report the set clean while the file still holds the old members — the original defect, self-inflicted.
ok((staleSet.children as Node[]).map(stampOf).join('|') === beforeStamps.join('|'),
  'the stale members keep their OLD stamps — re-stamping a member this build declined to rebuild would launder the defect into a clean verdict');
// `main.ts` flips `ok` off `misses.length === skipped`, so a stale run is already not-ok with no change
// there. Stated as the property rather than trusted, since the two counts move independently.
ok(rStale.misses.length !== rStale.skipped,
  `the result is NOT-ok by main.ts's own test (misses ${rStale.misses.length} vs skipped ${rStale.skipped}) — a stale set must not reach the pill as a success`);
ok(componentHeadline(rStale.added, rStale.skipped, rStale.misses.length - rStale.skipped - rStale.stale, rStale.stale) === '⚠ 21 stale',
  `the pill says so too, rather than '✓ already built' (${componentHeadline(rStale.added, rStale.skipped, rStale.misses.length - rStale.skipped - rStale.stale, rStale.stale)})`);
const note = staleNote(rStale.stale, ENGINE_VERSION);
ok(note !== null && note.includes('orphan') && note.includes('id'),
  'and the note gives the REASON in the same clause as the remedy, so declining the rebuild does not read as the tool failing');

// (3) AN UNSTAMPED MEMBER READS AS STALE. This is not an edge case — it is every set in every file
// written before this lands, and it is also the paste-payload route, which builds members without ever
// running this executor. Reported stale rather than assumed correct: the build has no way to know what
// plan produced it, and claiming it is current is the one thing this must not do.
const oldPage: Page = { children: [] };
await run(grid, { ...full(), page: oldPage });
const oldSet = oldPage.children[0];
const unstamped = (oldSet.children as Node[])[7];
(unstamped.setSharedPluginData as (ns: string, k: string, v: string) => void)(STAMP_NS, STAMP_K, '');
ok(stampOf(unstamped) === '', 'reachable: the member really is unstamped now, so the arms below are about the empty-stamp branch');
const rOld = await run(grid, { ...full(), page: oldPage });
ok(rOld.stale === 1 && rOld.skipped === 20,
  `one unstamped member among 20 stamped ones is the ONLY one reported stale (stale=${rOld.stale}, skipped=${rOld.skipped})`);
ok(rOld.misses.some((m) => m.includes(String(unstamped.name)) && m.includes('plan unstamped')),
  `...named as unstamped rather than as a hash mismatch, because those have different remedies (${rOld.misses.find((m) => m.includes('-> STALE'))})`);

// (4) THE HASH ITSELF, from the engine side — the two directions that decide whether any of the above
// means anything. Authored here against `planStamp` directly rather than through the executor.
ok(planStamp(grid[0]) === planStamp(figmaAnatomyPlan(button, 'medium', { leading: true, swapTarget: 'FPO-default-icon', intent: 'primary', appearance: button.variants!.appearance![0], state: button.states![0] })),
  'the same def and the same coordinate hash to the same stamp — a stamp that moved on every regeneration would report every member stale forever');
ok(new Set(grid.map(planStamp)).size === 21, `21 distinct coordinates give 21 distinct stamps (${new Set(grid.map(planStamp)).size})`);
// The REVERSE pass earns its keep here: a single-pass 32-bit FNV-1a returns the same digest for two
// strings that differ only by a transposition often enough to matter, and a collision reports a stale
// member as correct — a false negative, in the direction that hides the defect.
const swapped = { ...grid[0], derived: { ...grid[0].derived, a: 'xy', b: 'yx' } };
const swappedBack = { ...grid[0], derived: { ...grid[0].derived, a: 'yx', b: 'xy' } };
ok(planStamp(swapped) !== planStamp(swappedBack),
  'a transposition inside the plan moves the stamp — the second, reversed pass is what makes that true, and a collision here would report a stale member as correct');

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

// ---- #701: the wire pass REUSES what the build pass built, instead of re-finding it ----------
// The cold wire pass cost 46,375ms of a ~151s live run doing 2,592 `findOne` calls at ~18ms each, on a
// scenegraph Figma was still reconciling. The fix is to not search: `build` registers each child it makes
// and the wire loop reads that map.
//
// 2,592 = 648 members x 4 deduped ref parts. FOUR, not the three this comment said until the live run
// reported the real figure: `spinner` shares the `leadingVisual` PROPERTY but is its own PART, so it is
// its own lookup. And the ~18ms is a cold-build price only — the warm re-run searched all 2,592 in 185ms
// (~0.07ms each), so what is expensive is reconciliation, not search.
//
// WHAT THIS SUITE CAN AND CANNOT GATE, stated because the gap is the whole reason these assertions are
// counts rather than timings. It CANNOT gate the speedup: there is no scenegraph here, so `findOne` is a
// cheap array walk and the fix saves nothing measurable — a version whose map never populated would run
// identically fast and wire every reference correctly, passing every other assertion in this file. What it
// CAN gate, by value, is WHICH PATH each lookup took. That is the difference between "the references are
// right" (already covered above, and still true either way) and "the search was actually avoided".
//
// THE EXPECTED NUMBERS COME FROM THE PLANS, NOT FROM THE RESULT (docs/34): `planSetLayout` derives `refs`
// from the plan trees, so `21 × refs.length` is an independent count of the lookups a 21-member first run
// must make. Comparing against `r1.refs` instead would compare the subject with itself — and would also be
// simply wrong, which is how this shape got found. `refs` is deduped ACROSS the set (3 parts) while `r1.refs`
// counts references actually WRITTEN (42), because a third of the lookups legitimately find nothing:
// `leadingVisual` is absent on `state=pending` and `spinner` is absent on the other six states.
const refParts = planSetLayout(grid, 'test-701').refs;
const wantLookups = 21 * refParts.length;
ok(refParts.length === 3 && wantLookups === 63,
  `the fixture makes ${wantLookups} lookups — 21 members × ${refParts.length} deduped ref parts (${refParts.map((r) => r.part).join(', ')})`);
// PIN THE SPLIT, because it is what makes `refsKnownAbsent` a real category rather than a rounding error:
// 42 of the 63 find a node and 21 do not, and that 21 is a third of the cold pass's round-trips.
ok(r1.refs === 42 && wantLookups - r1.refs === 21,
  `and only ${r1.refs} of them find a node — the other ${wantLookups - r1.refs} are parts this variant does not build (the spinner off pending, the leading visual on it)`);
// THE THREE ROUTES ARE EXHAUSTIVE. Asserted as a sum against the independent total, so a route that stopped
// being counted cannot hide inside another.
ok(r1.refsRetained + r1.refsKnownAbsent + r1.refsSearched === wantLookups,
  `every lookup takes exactly one of the three routes — ${r1.refsRetained} + ${r1.refsKnownAbsent} + ${r1.refsSearched} = ${wantLookups}`);
// THE CLAIM ITSELF: on a first run the build pass built every member, so NOT ONE lookup may reach the
// scenegraph — including the ones that find nothing, which is the half a `kept ?? findOne` version would
// have sent back to the host at full cold price. Asserted as `=== 0` rather than "mostly avoided", because a
// partial rate is the signature of the map being keyed wrong for some members and would read as a pass.
ok(r1.refsSearched === 0 && r1.refsRetained === r1.refs && r1.refsKnownAbsent === wantLookups - r1.refs,
  `a cold run searches the scenegraph ZERO times — ${r1.refsRetained} nodes handed over by the build pass and ${r1.refsKnownAbsent} known absent without asking`);
// AND THE CONVERSE, which is what stops the assertion above from being satisfiable by a constant: the
// idempotent re-run builds nothing, so it has no map, retains nothing and searches everything. Both runs are
// pinned, so a `refsRetained` hard-coded to the total fails here and a `refsSearched` hard-coded to 0 does too.
ok(r2.refsRetained === 0 && r2.refsKnownAbsent === 0 && r2.refsSearched === wantLookups,
  `and a re-run that built nothing has no map to read, so all ${r2.refsSearched} lookups search — the fast route is a fact about this run, not a constant`);
// The references still land, on the same members, by the fallback route — the fallback is not a silent
// downgrade to wiring less. This is the assertion that would catch `refsKnownAbsent` swallowing a part that
// really was there: skipping a search for a node the member HAS would show up here as a lost reference.
ok(r2.refs === r1.refs && r2.wiredMembers === r1.wiredMembers,
  `both routes wire the SAME references across the SAME members (${r1.refs}/${r1.wiredMembers} retained vs ${r2.refs}/${r2.wiredMembers} searched)`);
// The read-back is what makes the retained path safe to trust, so pin that it is still SEARCHING rather
// than reading back through the reference the setter used. If `createComponentFromNode` ever stops
// preserving children, this is the check that reports it — and it can only report it while independent.
// A retained-reference read-back would assert our own variable and pass regardless.
ok(r1.misses.length === 0 && r2.misses.filter((m) => !m.includes('ALREADY PRESENT')).length === 0,
  'the independent read-back agrees with every retained-path write — no DISCARDED reference on either run');

// ---- THE HOST BOUNDARY: what Figma was ACTUALLY asked, not what the executor believes it asked -------
// EVERY ASSERTION ABOVE READS COUNTERS THE SUBJECT INCREMENTS ITSELF, and that is not enough. The three
// counters and the lookup are two independent statements inside one `if`:
//
//     if (builtFor) { node = kept;                 if (kept) refsRetained++; else refsKnownAbsent++; }
//     else          { node = member.findOne(...);  refsSearched++; }
//
// so they are free to drift apart. Changing ONLY `node = kept` to `node = member.findOne(...)` — inside the
// `builtFor` branch, every increment untouched, the map still populated and still deciding which counter
// moves — is a version of this fix that is completely INERT: it pays the full ~46s cold cost, reports
// "ZERO searches" in the live `[prism3 #701]` line, and passed every one of the 133 assertions above.
// Verified as a mutation. That is worse than an honest miss, because the counters actively vouch for a fix
// that is not happening. `docs/34`: an oracle sharing its subject cannot disagree with it.
//
// So this counts calls the HOST received. The two numbers now have independent sources — one from the
// branch the code took, one from the shim's own `findOne` — and are asserted to agree.
//
// THE READ-BACK LOOP SEARCHES BY DESIGN (deliberately, see above), so a bare total proves nothing: it
// would be satisfied by a wire loop that searched everything and a read-back that searched nothing. The
// expected figure is therefore decomposed by loop, and each term is derived from the plans rather than from
// the result: the read-back re-finds exactly the references it WROTE (`r1.refs`), and the wire loop must
// add nothing on a cold run.
ok(hostAfterR1 === r1.refs + r1.refsSearched,
  `the host received exactly ${r1.refs} subtree searches on the cold run — one per reference the read-back verifies, and NOT ONE from the wire loop (${hostAfterR1} actual vs ${r1.refs} read-back + ${r1.refsSearched} reported wire)`);
// AND THE CONVERSE RUN, which is what makes the assertion above falsifiable rather than a coincidence of
// small numbers: the re-run has no map, so its wire loop really does search all 63, and the host must see
// those 63 ON TOP of the read-back's. A `refsSearched` that under-reported would fail here, not above.
ok(hostInR2 === r2.refs + r2.refsSearched && r2.refsSearched === wantLookups,
  `and the searching run's ${r2.refsSearched} wire lookups all reach the host too — ${hostInR2} calls = ${r2.refs} read-back + ${r2.refsSearched} wire, so the counter tracks reality in BOTH directions`);
// THE COUNTER IS NOT DEAD, stated separately because the two assertions above are equalities and an
// always-zero counter satisfies neither honestly but a reader cannot tell at a glance. If `hostSearches`
// were never threaded through `mkNode`, both sides would read 0 and the assertions would be vacuous.
ok(hostAfterR1 > 0 && hostInR2 > hostAfterR1,
  `the boundary counter is live and discriminating — ${hostAfterR1} calls on the retained run, ${hostInR2} on the searching one`);

// THE MAP'S REACH MUST EQUAL `findOne`'S REACH, and this is the assertion that makes that claim more than a
// comment. `build` registers each child from inside its PARENT's append loop, deliberately, because Figma's
// `findOne` searches descendants and excludes the node it is called on: a `propertyRef` on a member's ROOT
// is therefore unwireable today. Registering at the top of `build` instead — the obvious simplification,
// one line shorter — would put that root in the map and the retained route would start honouring a
// reference the search route silently drops. Both routes would still be self-consistent, so nothing else
// here notices; verified as a mutation, which passed the whole suite before this block existed.
//
// The real Button cannot reach it (its `container` root carries no `propertyRef`), so the fixture puts one
// there. `rootText` is then a property Figma would declare and no node would reference — an ORPHAN — and
// that miss is the observable: it must appear on BOTH routes, because "the root is not wireable" is a fact
// about Figma, not a difference between our two ways of finding a node.
const rootRef = grid.map((p) => ({ ...p, root: { ...p.root, characters: 'Root', propertyRef: { field: 'characters' as const, prop: 'rootText' } } }));
ok(planSetLayout(rootRef, 'test-701-root').refs.some((r) => r.part === String(grid[0].root.name)),
  `reachability: the fixture really does declare a reference on the member ROOT ('${grid[0].root.name}'), which the real Button does not — so the assertions below are not vacuous`);
const rootPage: Page = { children: [] };
const rr1 = await run(rootRef, { ...fullFor(rootRef), page: rootPage });
const rr2 = await run(rootRef, { ...fullFor(rootRef), page: rootPage });
const orphaned = (res: typeof rr1): boolean => res.misses.some((m) => m.includes('rootText') && m.includes('ORPHAN'));
ok(orphaned(rr1) && orphaned(rr2),
  'a reference on the member ROOT is wired by NEITHER route — the retained map registers children only, so it cannot honour what a subtree search cannot reach');
// And stated as the counts, which is where a root leaking into the map shows up directly: the root is one
// extra lookup per member that must be known-absent, never retained.
ok(rr1.refsSearched === 0 && rr1.refsRetained === r1.refsRetained && rr1.refsKnownAbsent === r1.refsKnownAbsent + 21,
  `the root accounts for exactly 21 more known-absent lookups and not one more retained (${rr1.refsRetained} retained, ${rr1.refsKnownAbsent} known absent)`);

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

// ---- #684: the executor YIELDS, in both loops, at the boundaries it claims -------------------
// What is being gated is control flow, not responsiveness — see the note in this file's header. The
// fixture is 21 members, so a chunk of 5 gives 5 boundaries per phase (4 full + 1 partial) and the
// partial one is the case a naive `i % chunk === 0` drops.
const yPage: Page = { children: [] };
const y = await instrumented(grid, { ...full(), page: yPage }, 5);

// THE EXECUTOR HANDS CONTROL BACK, counted at the yield itself. Every other assertion in this block reads
// `progress`, which is the REPORTING cadence — and reporting is not yielding: with the yield deleted from
// `breathe` and this line absent, all of them passed. So this is the one that has to come from `yieldTo`.
ok(y.yieldCalls > 0, `the executor hands control back at all (${y.yieldCalls} yields over ${grid.length} members)`);
// AND AS OFTEN AS IT REPORTS. Equality, not `>= 1`: the pairing is what makes the cadence assertions below
// mean anything about yielding. A `breathe` that reported on every boundary and yielded once — which is a
// plausible way to write it, hoisting the yield out of the loop — satisfies `> 0` and fails here.
ok(y.yieldCalls === y.progress.length,
  `and once per report, so a boundary that reports is a boundary that yields (${y.yieldCalls} yields, ${y.progress.length} reports)`);
ok(y.yields.length > 0, `the executor yields at all (${y.yields.length} yields over ${grid.length} members)`);
// BOTH phases, and this is the assertion that would have caught the draft. #684 names the member loop;
// the reference-wiring loop walks every member with a subtree search per reference, and on an idempotent
// re-run it is essentially the whole cost. Chunking only the first would look fixed and freeze the re-run.
const buildYields = y.progress.filter((p) => p.phase === 'build');
const wireYields = y.progress.filter((p) => p.phase === 'wire');
ok(buildYields.length > 0 && wireYields.length > 0,
  `both long loops yield — building members AND wiring references (build ${buildYields.length}, wire ${wireYields.length})`);

// The boundaries are the ones a chunk of 5 over 21 implies, INCLUDING the trailing partial chunk. Written
// out rather than recomputed from the executor's own arithmetic: an expectation derived by re-running
// `(i + 1) % chunk` would agree with a broken chunker by construction (docs/34).
const wantBoundaries = ['5/21', '10/21', '15/21', '20/21', '21/21'];
ok(JSON.stringify(buildYields.map((p) => `${p.done}/${p.total}`)) === JSON.stringify(wantBoundaries),
  `build yields land on every chunk boundary and on the final partial one (${buildYields.map((p) => p.done).join(',')})`);
ok(JSON.stringify(wireYields.map((p) => `${p.done}/${p.total}`)) === JSON.stringify(wantBoundaries),
  `wire yields land on the same boundaries (${wireYields.map((p) => p.done).join(',')})`);
// Reaching the total is the property the UI depends on: the pill shows the fraction, and a loop whose last
// partial chunk is silent leaves it reading "20 of 21" under a pill that says built.
ok(buildYields[buildYields.length - 1].done === grid.length && wireYields[wireYields.length - 1].done === grid.length,
  `each phase's last report equals the total, so the fraction never stalls short (${grid.length})`);
// Monotonic WITHIN a phase. Across phases it resets, by design — which is why the phase is on the wire at
// all, and why the UI names it rather than showing a bare fraction.
const nonMonotonic = (ps: ComponentProgress[]): boolean => ps.some((p, i) => i > 0 && p.done <= ps[i - 1].done);
ok(!nonMonotonic(buildYields) && !nonMonotonic(wireYields), 'reported progress is strictly increasing within each phase');
ok(y.progress.every((p) => p.total === grid.length), `every report carries the same total, so the denominator never moves (${grid.length})`);
ok(y.progress.every((p) => typeof p.chunkMs === 'number' && p.chunkMs >= 0),
  'every report carries a non-negative chunkMs — the calibration signal, whose VALUE only a live run can judge');
// Chunking must not change the outcome. The clean-run assertions above ran at the default chunk size, so
// this compares a 5-chunk run against them: same members, same misses, same set.
ok(y.r.added === 21 && y.r.misses.length === 0 && y.r.set === 'button',
  `chunking does not change what gets built (added=${y.r.added}, misses=${y.r.misses.length}, set=${y.r.set})`);

// THE IDEMPOTENT RE-RUN YIELDS ON THE SAME BOUNDARIES. This is the case a `fresh.length`-keyed chunker
// gets wrong, and the failure is not the obvious one: `fresh.length` stays 0 through a full-skip run, so
// `0 % chunk === 0` is true on EVERY iteration — it yields 21 times and reports `0 of 21` each time.
// Measured by mutation, which is also how the direction was corrected: the guess was that it would never
// yield. Either way the fraction is a lie and the yields are unbounded, hence keying on the cell index.
const reRun = await instrumented(grid, { ...full(), page: yPage }, 5);
ok(reRun.r.added === 0 && reRun.r.skipped === 21, `the re-run skips every member (added=${reRun.r.added}, skipped=${reRun.r.skipped})`);
ok(reRun.progress.filter((p) => p.phase === 'build').length === wantBoundaries.length,
  `and still yields on every build boundary while building nothing (${reRun.progress.filter((p) => p.phase === 'build').length})`);
ok(reRun.progress.filter((p) => p.phase === 'wire').length > 0,
  `and still yields while wiring, which is where a re-run spends its time (${reRun.progress.filter((p) => p.phase === 'wire').length})`);
// Counted at the yield on the re-run too, because the re-run is the case that matters most for
// responsiveness: it skips every member and spends its whole time in the wire loop.
ok(reRun.yieldCalls === reRun.progress.length && reRun.yieldCalls > 0,
  `the re-run hands control back on every boundary as well (${reRun.yieldCalls} yields, ${reRun.progress.length} reports)`);

// ---- #684: a `chunkMs` measures ITS CHUNK, and nothing that happened before it ----------------
// THE ONE NUMBER THE LIVE 648 RUN EXISTS TO PRODUCE, and until this block no committed assertion protected
// it: the three clock re-stamps in `breathe`/the two loop heads could all be deleted with the suite green at
// 249. The reason is structural rather than an oversight — the shim is synchronous, so every `chunkMs` is 0
// and the strongest assertion available is `chunkMs >= 0`, which no clock rule can fail. A rule about WHEN a
// clock starts cannot be gated by a harness in which no clock advances. So the harness charges deliberate,
// opt-in cost to the three windows the re-stamps exclude (`ShimOpts.burn`, and `instrumented`'s
// `burnYield`), which makes the rule reachable using the very calls the source comments already name.
//
// EACH BURN GETS A POSITIVE CONTROL, and that is not belt-and-braces: "the first chunk is 0ms" also passes
// when the burn silently never happened — a renamed shim method, an `opts.burn` that stopped being threaded
// through — and then the assertion measures nothing while reading as coverage. So every case below asserts
// BOTH that the cost is excluded where the re-stamp puts it AND that this harness could see that cost at
// all. Without the paired control this whole block is the same defect it was written to fix — which it was,
// for one of the three burns, until the control loop below was derived from the burn list instead of written
// out by hand. A rule stated in a comment and applied two-thirds of the time is worth less than the comment
// implies, so the enforcement is now structural: see THE POSITIVE CONTROLS.
const BURN = 120;
const YIELD_BURN = 40;
const firstOf = (ps: ComponentProgress[], ph: string): number => ps.find((p) => p.phase === ph)!.chunkMs;

// 1. PRE-BUILD-LOOP SETUP. `planSetLayout`, three `getLocal*Async` fetches, `loadAllPagesAsync()` and a
//    document-wide `findAllWithCriteria` run before the first member is touched. Charged to the last of
//    them. Live this was measured at 121ms in chunk 1 against 1ms in its neighbours.
const burnSetupPage: Page = { children: [] };
const burnSetup = await instrumented(grid, { ...full(), page: burnSetupPage, burn: { setup: BURN } }, 5);
ok(firstOf(burnSetup.progress, 'build') < BURN / 2,
  `the first build chunk excludes the ${BURN}ms of setup that preceded the loop (${firstOf(burnSetup.progress, 'build')}ms)`);

// 2. BETWEEN THE LOOPS. `combineAsVariants`, the measured layout pass, the `resize`, the definitions read
//    and one `addComponentProperty` per property sit between the build loop's last boundary and the wire
//    loop's first. #684 does not name this loop at all, which is why the gap was here twice.
const burnCombinePage: Page = { children: [] };
const burnCombine = await instrumented(grid, { ...full(), page: burnCombinePage, burn: { combine: BURN } }, 5);
ok(firstOf(burnCombine.progress, 'wire') < BURN / 2,
  `the first wire chunk excludes the ${BURN}ms of set-level work between the loops (${firstOf(burnCombine.progress, 'wire')}ms)`);

// 3. THE YIELD ITSELF. `breathe` re-stamps AFTER awaiting, so the yield's own duration is never billed to
//    the chunk after it. Live, that time is the host doing the work yielding exists to let it do — so
//    counting it would make every chunk look worse the more politely the executor behaved, and would push
//    the calibration toward a smaller `CHUNK` for having yielded more often.
const burnYieldPage: Page = { children: [] };
const burnYield = await instrumented(grid, { ...full(), page: burnYieldPage }, 5, YIELD_BURN);
const secondBuild = burnYield.progress.filter((p) => p.phase === 'build')[1].chunkMs;
ok(secondBuild < YIELD_BURN / 2,
  `a chunk excludes the ${YIELD_BURN}ms yield that preceded it (2nd build chunk ${secondBuild}ms)`);

// THE POSITIVE CONTROLS, ONE PER BURN AND DERIVED FROM THE BURN LIST SO THERE CANNOT BE TWO OF THREE.
// Each burn is proven VISIBLE — otherwise the exclusions above are satisfied by a burn that never ran, which
// is this block's own thesis used against it. The first version of this block controlled `setup` and the
// yield and NOT `combine`, and the cost of that asymmetry was exact: neutering the one unasserted line
// (`if (opts.burn?.combine) …`) left case 2 reporting a green tick at 0ms, and with the wire re-stamp then
// also deleted the suite stayed at ALL PASS — the gate resting on an unasserted line in a shim method this
// PR edited twice. So the two shim-charged burns are controlled by MAPPING over their names rather than by
// two hand-written blocks: adding a fourth burn without a control is then a missing key, not a missing
// paragraph someone has to notice.
//
// A burn's cost is excluded from every `chunkMs` by the very re-stamp under test, so the witness is WALL
// CLOCK, measured as the DELTA against an un-burned baseline. The delta rather than a bare `>= BURN`: an
// absolute bound is also satisfiable by a slow machine, and what needs proving is that the burn is the
// difference between the two runs.
const timeRun = async (burn?: ShimOpts['burn']): Promise<number> => {
  const t0 = Date.now();
  await instrumented(grid, { ...fullFor(grid), page: { children: [] }, burn }, 5);
  return Date.now() - t0;
};
const ctlBase = await timeRun();
for (const key of ['setup', 'combine'] as const) {
  const elapsed = await timeRun({ [key]: BURN });
  ok(elapsed - ctlBase >= BURN * 0.5,
    `CONTROL: the ${key} burn really costs wall-clock this harness can measure (${elapsed}ms vs ${ctlBase}ms un-burned, +${elapsed - ctlBase}ms)`);
}
const ctlNoBurn = await instrumented(grid, { ...fullFor(grid), page: { children: [] } }, 5);
ok(ctlNoBurn.progress.length > 0 && firstOf(ctlNoBurn.progress, 'build') >= 0,
  'CONTROL: the un-burned run reports as usual, so the burn is the only difference between them');
// And the yield burn: 10 boundaries at 40ms each is ~400ms of wall clock that `chunkMs` must not have
// absorbed — so the SUM of every reported chunk stays far below the run's own duration.
const ybT0 = Date.now();
const ybRun = await instrumented(grid, { ...fullFor(grid), page: { children: [] } }, 5, YIELD_BURN);
const ybElapsed = Date.now() - ybT0;
const ybReported = ybRun.progress.reduce((a, p) => a + p.chunkMs, 0);
ok(ybElapsed >= YIELD_BURN * ybRun.yieldCalls * 0.5,
  `CONTROL: ${ybRun.yieldCalls} yields at ${YIELD_BURN}ms cost real wall-clock (${ybElapsed}ms elapsed)`);
ok(ybReported < ybElapsed / 2,
  `and the reported chunk time is a fraction of it, so yield time is excluded rather than redistributed (${ybReported}ms reported of ${ybElapsed}ms elapsed)`);

// ---- #684 follow-up: `elapsedMs` INCLUDES the yields, which is why it exists -------------------
// THE ONE TIMING FIELD THIS HARNESS CAN GATE BY VALUE. Every `chunkMs` is 0 here because the shim is
// synchronous — that is the whole reason the block above needed burns. But `elapsedMs` spans the yields, and
// the yield IS injectable, so the yield burn gives this harness a real interval to measure for once.
//
// What it protects: `elapsedMs` was added because the live run could price the chunks and not the yielding,
// while `CHUNK` dropped 24 → 4 and multiplied the yield count by six. If it were stamped from `mark` (the
// per-chunk clock) instead of `phaseStart`, it would exclude the yields exactly as `chunkMs` does — the
// field would duplicate `chunkMs`, the summary's "yields Xms" would read 0 on every run, and the term the
// next CHUNK change has to be argued against would be invisible again. Asserted per phase, because
// `phaseStart` is re-stamped at each loop head and a missing re-stamp there charges the whole build phase
// to the wire phase's first reading.
for (const ph of ['build', 'wire'] as const) {
  const ps = ybRun.progress.filter((p) => p.phase === ph);
  const last = ps[ps.length - 1];
  const sumChunks = ps.reduce((a, p) => a + p.chunkMs, 0);
  // n-1 yields inside the window: the last boundary's yield lands after its own report (see `elapsedMs`).
  const want = YIELD_BURN * (ps.length - 1) * 0.5;
  ok(last.elapsedMs - sumChunks >= want,
    `${ph}: elapsedMs spans the ${ps.length - 1} yields inside the phase that chunkMs excludes ` +
    `(${last.elapsedMs}ms elapsed − ${sumChunks}ms of chunks = ${last.elapsedMs - sumChunks}ms of yielding, ≥ ${want}ms)`);
  // MONOTONIC AND PER-PHASE. A cumulative field must never go backwards, and each phase must start its own
  // count from ~0 — if `phaseStart` were stamped once at the top of the run, the wire phase's first reading
  // would already carry the entire build phase and this would catch it.
  ok(ps.every((p, i) => i === 0 || p.elapsedMs >= ps[i - 1].elapsedMs),
    `${ph}: elapsedMs is cumulative and never decreases across the phase`);
  ok(ps[0].elapsedMs < YIELD_BURN,
    `${ph}: the phase's FIRST reading starts near zero, so the clock was re-stamped at this loop head rather than at the run's (${ps[0].elapsedMs}ms)`);
}
// The un-burned control: with a free yield, elapsed and total agree — so the assertions above are reading
// the burn and not some constant offset the executor adds regardless.
for (const ph of ['build', 'wire'] as const) {
  const ps = ctlNoBurn.progress.filter((p) => p.phase === ph);
  const last = ps[ps.length - 1];
  ok(last.elapsedMs - ps.reduce((a, p) => a + p.chunkMs, 0) < YIELD_BURN / 2,
    `CONTROL: ${ph} with a free yield shows almost no gap between elapsed and Σ chunkMs (${last.elapsedMs - ps.reduce((a, p) => a + p.chunkMs, 0)}ms)`);
}

// A run with NO options is the production call shape — it must still complete, and must yield without
// anyone passing a yield in. `realYield` is not injected here, so this genuinely goes through
// `setTimeout(0)`: proof the default path is wired, not merely that the injected one works.
const defPage: Page = { children: [] };
const defRun = await run(grid, { ...full(), page: defPage });
ok(defRun.added === 21 && defRun.misses.length === 0,
  `the no-options call shape still builds the whole set through the real setTimeout yield (added=${defRun.added})`);

// A single member is the degenerate chunk case: one boundary, at 1/1. A chunker that only fires on the
// modulo would report nothing at all here, and the pill would sit at "Building the Button set…" forever.
const onePage: Page = { children: [] };
const one = await instrumented([grid[0]], { ...fullFor([grid[0]]), page: onePage });
ok(one.progress.filter((p) => p.phase === 'build').map((p) => `${p.done}/${p.total}`).join() === '1/1',
  `a one-member set reports exactly one build boundary, at 1/1 (${one.progress.filter((p) => p.phase === 'build').map((p) => `${p.done}/${p.total}`).join() || 'none'})`);

// A chunk of 0 or a negative would make `i % chunk` NaN-or-never and silently stop all reporting; the
// executor clamps to 1. Asserted because the value comes from a caller, and the failure is invisible.
const clampPage: Page = { children: [] };
const clamped = await instrumented(grid, { ...full(), page: clampPage }, 0);
ok(clamped.progress.filter((p) => p.phase === 'build').length === grid.length,
  `a chunk size of 0 clamps to 1 rather than disabling reporting (${clamped.progress.filter((p) => p.phase === 'build').length} of ${grid.length})`);

// The default is a real number in a plausible range — a pin, not a derivation. It is deliberately loose:
// this cannot judge the value (no event loop), so it only catches a `CHUNK` left at 0, at 1, or set to
// something that would make the whole set one chunk again, which is the regression that matters.
ok(Number.isInteger(CHUNK) && CHUNK > 1 && CHUNK < 200, `CHUNK is a plausible chunk size, not the whole set (${CHUNK})`);

// =============================================================================================
// #681 — A NEST TARGET THAT *IS* IN THE FILE. FIXED: THE MISS NAMES WHAT IT FOUND.
// =============================================================================================
// The live 648-variant build reported 108 identical misses — exactly 648 / 6, every `state=focus-visible`
// member — saying `focus-ring` was "not in this file; publish the shared component first". It WAS in the
// file, as a component SET. `types: ['COMPONENT']` matches `ComponentNode` and never `ComponentSetNode`,
// so the criteria search returned the set's CHILDREN under their variant coordinates and the set's own
// name never entered the map.
//
// This had no test because the old shim ignored its criteria and returned every `comps` entry as a bare
// COMPONENT: the distinction between "absent" and "present but the wrong node type" could not exist. The
// shim now honors the criteria, which is what makes the four cases below reachable at all — and
// reachability is the point, per docs/34: a check that runs but cannot fire is reported as a pass.
//
// THE PINS BELOW WERE FLIPPED when the fix landed, which is the polarity working as designed: the fixing
// PR could not leave this file claiming the old behavior. The executor now runs a second, name-based
// search on the failure path only and reports through the shared `nestMissAdvice`.
//
// NOW DECIDED, and this is what changed under these assertions (#681's consumer side). A part declaring
// `nesting: nest-fixed` names a variant COORDINATE, `component-schema.ts` carries it, the plan projects it
// as `nestVariant`, and both executors resolve it to a MEMBER of the set and nest that. So a set is no
// longer a dead end — which means the four-way table below no longer reaches its own COMPONENT_SET row
// through these plans: `button`'s ring part names `color=default`, so a file holding a set gets RESOLVED
// (or gets the fifth miss) and never the "found a COMPONENT_SET" sentence.
//
// The row is still reachable, and still worth gating, for the case that is now its only one: a def that
// named NO coordinate — `nest-exposed`, whose coordinate is the consumer's to drive per instance and which
// needs an exposed nested property this write does not create yet. So the table below is driven by plans
// with the coordinate STRIPPED, and the resolution cases get their own block after it. Two blocks rather
// than one widened one, because they are two different questions: what the message says when the def chose
// nothing, and what gets built when it chose.
//
// WHAT DID NOT CHANGE: nothing is nested by guess. The fifth miss drops the ring exactly as these four do.

const NEST = 'focus-ring';
const withoutRing = full().comps!.filter((c) => c !== NEST);

/**
 * The same plans with every `nestVariant` REMOVED — a `nest-exposed` part's projection.
 *
 * Derived from the real plans rather than hand-built for the reason `full()` derives its variables: a
 * hand-built tree stops resembling the def the moment a part changes, and this block would keep passing
 * against a shape the engine no longer emits. Stripping models the one difference that matters here —
 * `figmaAnatomyPlan` omits `nestVariant` for anything that is not `nest-fixed`, so this is that omission
 * applied to a tree whose every other field is exactly what the engine produced.
 */
const withoutCoordinate = (plans: AnatomyPlan[]): AnatomyPlan[] => {
  const strip = (n: Record<string, unknown>): Record<string, unknown> => {
    const { nestVariant: _dropped, ...rest } = n as { nestVariant?: unknown };
    return { ...rest, children: ((n.children ?? []) as Record<string, unknown>[]).map(strip) };
  };
  return plans.map((p) => ({ ...p, root: strip(p.root as unknown as Record<string, unknown>) })) as unknown as AnatomyPlan[];
};
const gridNoCoord = withoutCoordinate(grid);

/** The four files, differing ONLY in what they hold under the name `focus-ring`. */
const nestCases: { label: string; opts: ShimOpts }[] = [
  { label: 'nothing of that name', opts: { ...full(), comps: withoutRing } },
  { label: 'a COMPONENT_SET', opts: { ...full(), comps: withoutRing, fileNodes: [{ name: NEST, type: 'COMPONENT_SET', variants: ['state=default', 'state=error'] }] } },
  { label: 'an INSTANCE', opts: { ...full(), comps: withoutRing, fileNodes: [{ name: NEST, type: 'INSTANCE', main: NEST }] } },
  { label: 'a FRAME', opts: { ...full(), comps: withoutRing, fileNodes: [{ name: NEST, type: 'FRAME' }] } },
];

// ---- REACHABILITY FIRST: the shim really models each file, or every pin below is vacuous -------
// Asserted against the shim's OWN search, because the executor's map is what is under test — reading
// the map back would be reading the subject.
for (const c of nestCases.slice(1)) {
  const api = makeShim(c.opts) as unknown as {
    root: { findAllWithCriteria: (crit: { types: string[] }) => { name: string }[]; _allNamed: (n: string) => { type: string }[] };
  };
  const held = api.root._allNamed(NEST).map((n) => n.type);
  ok(held.length === 1, `#681 reachable: the file holds exactly one node named ${NEST}, ${c.label} (${held.join(', ')})`);
  const searched = api.root.findAllWithCriteria({ types: ['COMPONENT'] }).map((n) => n.name);
  ok(!searched.includes(NEST),
    `#681 reachable: a COMPONENT search does NOT return ${NEST} when it is ${c.label} — the lookup is genuinely blind to it (${searched.filter((n) => n.indexOf('state=') === 0 || n === NEST).join(', ') || 'nothing of that name'})`);
}
// And the COMPONENT_SET case specifically returns the MEMBERS, which is the misleading part live: the
// search comes back non-empty, just never under the name asked for.
const setApi = makeShim(nestCases[1].opts) as unknown as { root: { findAllWithCriteria: (c: { types: string[] }) => { name: string }[] } };
const setSearched = setApi.root.findAllWithCriteria({ types: ['COMPONENT'] }).map((n) => n.name);
ok(setSearched.includes('state=default') && setSearched.includes('state=error'),
  `#681 reachable: the set's MEMBERS come back under their variant coordinates (${setSearched.filter((n) => n.indexOf('state=') === 0).join(', ')})`);

// And the STRIPPER really stripped — asserted in both directions, because a `withoutCoordinate` that
// silently did nothing would drive this whole table with `nest-fixed` plans, resolve the set, and report
// four vacuous passes. The positive half is what makes the negative half mean something: the real plans
// DO carry a coordinate, so its absence below is this function's work and not the def's.
const coordCount = (plans: AnatomyPlan[]): number => {
  const walk = (n: Record<string, unknown>): number =>
    (n.nestVariant ? 1 : 0) + ((n.children ?? []) as Record<string, unknown>[]).reduce((a, k) => a + walk(k), 0);
  return plans.reduce((a, p) => a + walk(p.root as unknown as Record<string, unknown>), 0);
};
ok(coordCount(grid) > 0, `#681 reachable: the real plans DO project a nestVariant coordinate (${coordCount(grid)} parts)`);
ok(coordCount(gridNoCoord) === 0, `#681 reachable: the stripped plans project NONE — the four-way table below is really driven by a nest-exposed shape (${coordCount(gridNoCoord)})`);

// ---- the four runs, and the miss each one reports ---------------------------------------------
const nestMiss = (misses: string[]): string | undefined => misses.find((m) => m.indexOf(`nestTarget -> ${NEST}`) >= 0);
const nestResults: { label: string; miss: string | undefined; built: number }[] = [];
for (const c of nestCases) {
  const r = await run(gridNoCoord, { ...c.opts, page: { children: [] } });
  nestResults.push({ label: c.label, miss: nestMiss(r.misses), built: r.variants });
}
// The ABSENT case was the one row of #681's table the old message got right, so it was a positive
// assertion before the fix and is UNCHANGED by it — which is the point of having written it that way:
// it is the regression guard on the fix, not a claim the fix delivers.
ok(nestResults[0].miss !== undefined && nestResults[0].miss!.indexOf('not in this file') >= 0,
  `#681 with nothing of that name, the original message survived the fix verbatim (${nestResults[0].miss})`);
// Every case still BUILDS its whole set — the ring is dropped, not the run. True before the fix and after.
ok(nestResults.every((r) => r.built === 21), `#681 every case still assembles all 21 members (${nestResults.map((r) => r.built).join('/')})`);

// FLIPPED (was two pins per case): a node PRESENT at the wrong type is no longer described as absent, and
// no longer told to publish a library it already has.
for (const r of nestResults.slice(1)) {
  ok(r.miss !== undefined && r.miss.indexOf('not in this file') < 0,
    `#681 with ${r.label} named ${NEST} in the file, the miss no longer claims it is "not in this file" — ${r.miss}`);
  ok(r.miss !== undefined && r.miss.indexOf('publish the shared component first') < 0,
    `#681 ...and no longer advises publishing a library, which is irrelevant when the node is present at the wrong type (${r.label})`);
}
// FLIPPED, and this is the expensive half: four file states, four DISTINGUISHABLE messages. Was pinned at
// `size === 1` — one string carrying no information a designer could act on.
ok(new Set(nestResults.map((r) => r.miss)).size === 4, '#681'
  + ` all four file states report a DIFFERENT message, so the miss names what was actually found (${new Set(nestResults.map((r) => r.miss)).size}/4 distinct)`);
// Each message names the node type it found, checked one at a time rather than by counting distinctness —
// four distinct strings could still all be wrong.
ok(nestResults[1].miss!.indexOf('COMPONENT_SET') >= 0, `#681 the COMPONENT_SET case says so by name — ${nestResults[1].miss}`);
ok(nestResults[2].miss!.indexOf('INSTANCE') >= 0, `#681 the INSTANCE case says so by name — ${nestResults[2].miss}`);
ok(nestResults[3].miss!.indexOf('not a component') >= 0, `#681 the FRAME case says it is not a component — ${nestResults[3].miss}`);
// FLIPPED. The INSTANCE row had its own pin because duplicating a variant out of a set is the obvious
// manual workaround for the COMPONENT_SET case, so a designer following the old advice landed exactly
// here — and got told the node they had just made did not exist.
ok(nestResults[2].miss !== nestResults[0].miss,
  '#681 an INSTANCE — what duplicating a variant out of a set produces — is now distinguishable from nothing at all');
// And the ADVICE differs, not merely the diagnosis: the set case points at nesting a variant, the instance
// case at nesting the main. A message that named the type but gave one generic instruction would pass
// every assertion above.
// The SET's advice moved when resolution landed (#681): it used to say "nest a specific variant", which
// was advice about a capability that did not exist. Reaching this row now means the def named no
// coordinate, so the action is to name one — or to publish a single variant as its own component.
ok(nestResults[1].miss!.indexOf('nest-fixed') >= 0 && nestResults[2].miss!.indexOf('main component') >= 0,
  `#681 each case carries the action for THAT case, not one generic instruction — set: ${nestResults[1].miss}`);
// THE POLICY BOUNDARY, asserted: diagnosis only. Every case still drops the ring rather than guessing a
// variant to nest, because a wrong ring that builds looks like success. This is what must not change
// without the owner's decision on #681.
ok(nestResults.slice(1).every((r) => r.built === 21 && r.miss !== undefined),
  '#681 no case silently nests a substitute — each reports and drops the ring, which is the policy #681 leaves to the owner');

// ---- #681 RESOLUTION: the def named a coordinate, so a MEMBER gets nested -----------------------
// The other half of #681, and the half the four cases above cannot reach. `button`'s ring part declares
// `nesting: { kind: 'nest-fixed', variant: { color: 'default' } }`, the plan projects that as
// `nestVariant`, and this executor resolves it against the set's members instead of reporting.
//
// Driven by `grid` — the REAL plans, coordinate included — where the table above needed `gridNoCoord`.
// Both fixtures exist for that reason: one file state means two different things depending on whether the
// def chose, and one plan cannot exercise both readings.
//
// Gated here AND on the paste path in `packages/engine/test.ts` because the two executors reach the same
// behavior by different mechanisms — this one imports `nestVariantMatch`, the payload interpolates its
// SOURCE and calls it in the file. A single gate could pass while the other path was silently wrong.
const ringSetRun = async (variants: string[]) => {
  const page: Page = { children: [] };
  const r = await run(grid, {
    ...full(), comps: withoutRing,
    fileNodes: [{ name: NEST, type: 'COMPONENT_SET', variants }], page,
  });
  return {
    miss: r.misses.find((m) => m.indexOf('focusRing.nest') >= 0),
    built: r.variants,
    // Whether ring nodes exist in what was actually BUILT — the only evidence a member was instantiated.
    // An empty `misses` proves nothing on its own: an executor that silently skipped the ring reports
    // nothing either, which is exactly the difference between resolution and a quiet drop.
    //
    // Walked to full depth rather than one level down, because the page holds the SET, the set holds the
    // members, and the ring is a child of a member — three levels. A one-level scan reads 0 on a correct
    // run, and measured that way this assertion failed against a working executor.
    rings: ((): number => {
      const walk = (n: { name?: string; children?: unknown[] }): number =>
        (n.name === 'focusRing' ? 1 : 0)
        + ((n.children ?? []) as { name?: string; children?: unknown[] }[]).reduce((a, k) => a + walk(k), 0);
      return (page.children as unknown as { name?: string; children?: unknown[] }[]).reduce((a, c) => a + walk(c), 0);
    })(),
  };
};

// THE SUCCESS CASE. The set carries `color=default`, so the member is nested and no miss is reported.
const resolvedRun = await ringSetRun(['color=default', 'color=inverse']);
ok(resolvedRun.miss === undefined && resolvedRun.rings > 0 && resolvedRun.built === 21,
  `#681 a coordinate the set CARRIES resolves, and the member is nested — ${resolvedRun.rings} ring nodes built, no miss (${resolvedRun.miss ?? 'none'})`);

// THE FIFTH MISS, wrong coordinate. Members exist and none carries `color=default`; the tempting behavior
// is to nest the first child, which is #656. Nothing is built, and the message names the coordinate AND
// the members — a rename in the file and a typo in the def produce the same lookup failure and different
// fixes, so a message carrying only one of the two is unactionable.
const wrongRun = await ringSetRun(['color=brand', 'color=inverse']);
ok(wrongRun.miss !== undefined && wrongRun.miss.indexOf('no member matching color=default') >= 0
  && wrongRun.miss.indexOf('color=brand') >= 0 && wrongRun.rings === 0 && wrongRun.built === 21,
  `#681 a coordinate the set does NOT carry reports the fifth miss, names the coordinate and the members, and nests nothing (${wrongRun.miss})`);

// THE FIFTH MISS, UNDER-SPECIFIED. `{color:'default'}` against a color×size set would match two members,
// and every rule for choosing between them reduces to creation order — #656 one layer in from where
// `nesting` was added to stop it. Refused rather than resolved, and the printed members are what show the
// designer which axis the def forgot.
const ambiguousRun = await ringSetRun(['color=default, size=md', 'color=default, size=lg']);
ok(ambiguousRun.miss !== undefined && ambiguousRun.miss.indexOf('no member matching color=default') >= 0
  && ambiguousRun.miss.indexOf('size=lg') >= 0 && ambiguousRun.rings === 0,
  `#681 an UNDER-SPECIFIED coordinate is refused rather than resolved by creation order, and the members show the missing axis (${ambiguousRun.miss})`);

// AND THE FIFTH MISS IS A DIFFERENT SENTENCE from the four above — it diagnoses the DEF where they
// diagnose the FILE, and the remedy points the opposite way (edit the coordinate, not the document). One
// message covering both would be the state #681 started in, at a different address.
ok(wrongRun.miss !== nestResults[1].miss && (wrongRun.miss ?? '').indexOf('nestVariant ->') >= 0,
  '#681 the fifth miss is distinguishable from the four file-state messages, and is reported against nestVariant rather than nestTarget');

// =============================================================================================
// #680 — FIGMA'S FONT-LOADED STATE, NOW MODELLED. The components lane already loads; it does not degrade.
// =============================================================================================
// The live failure was in `write-figma.ts` (the variable writer, which loads no fonts at all) — see
// `test-write.ts` for the reproduction at the site of the defect. What the shim's new font state buys
// HERE is different and worth having on its own: this lane's `loadFontAsync` call and the `catch` around
// it were both unfalsifiable while the shim's load was an unconditional no-op.

// The POSITIVE half, now reachable: the style's font is loaded BEFORE the style is applied. `r1` above
// ran clean against a shim that throws from `setTextStyleIdAsync` on an unloaded font, so deleting the
// load call now fails the fully-resolved run instead of passing it. Stated explicitly because "some
// other assertion happens to cover it" is not a gate anyone can find later.
const fontPage: Page = { children: [] };
const loadedRun = await run(grid, { ...full(), page: fontPage });
ok(loadedRun.misses.length === 0 && loadedRun.variants === 21,
  `#680 the style's own font is loaded before the style is applied — an unloaded font now THROWS from setTextStyleIdAsync (${loadedRun.misses.length} misses)`);
ok(!loadedRun.misses.some((m) => m.indexOf('.font ->') >= 0), '#680 ...and nothing was reported as unloadable when every font is available');

// The OTHER failure mode: a font that is not INSTALLED. Figma fails that at the load call, and this lane
// catches it and reports a miss — then applies the style anyway, which throws, and nothing catches THAT.
const missingFont: FontName = { family: 'Clash Display', style: 'Semi Bold' };
let unavailThrew = '';
let unavailMisses: string[] = [];
try {
  const r = await run(grid, { ...full(), page: { children: [] }, styleFont: missingFont, unavailableFonts: [missingFont] });
  unavailMisses = r.misses;
} catch (e) { unavailThrew = (e as Error).message; }
// The load failure IS reported — the `catch` at write-components.ts:296 works, and is now exercised.
// (Only reachable when the run survives to return; pinned below is the case where it does not.)
pinned(unavailThrew.indexOf('unloaded font') >= 0, '#680',
  `a brand whose typeface is not installed loses the WHOLE component build rather than degrading — the load miss is reported, then the style is applied anyway and the throw escapes (${unavailThrew.slice(0, 80)}…)`);
ok(unavailMisses.length === 0, '#680 (bookkeeping) the unavailable-font run returned nothing, because it threw — see the pin above');
// #680's stated posture is `write-text-styles`': report what was skipped, write everything else. That is
// what the fix must give this lane too, and this is the assertion that will invert.

// =============================================================================================
// #682 — THE DEPRECATED PROPORTION LOCK, MIGRATED TO `unlockAspectRatio()`
// =============================================================================================
// Figma's typings mark `constrainProportions` `@deprecated` in favour of `targetAspectRatio` /
// `lockAspectRatio` / `unlockAspectRatio`. The migration is mechanical, but the thing it must not break
// is subtle, so it is asserted three ways rather than one.
//
// Reachability first, and it is the whole reason these assertions can fail: the shim's nodes now START
// aspect-LOCKED, and while locked `setBoundVariable` EVICTS the opposite dimension — the silent
// last-write-wins the unlock exists to prevent. A shim whose nodes started unlocked would pass these
// whether the executor called anything or not.
const unlockPage: Page = { children: [] };
const unlockRun = await run(grid, { ...full(), page: unlockPage });
const allNodes = (n: Node): Node[] => [n, ...(((n.children as Node[]) ?? []).flatMap(allNodes))];
const built = unlockPage.children.flatMap(allNodes);
ok(built.length > 0, `#682 reachable: the run produced nodes to inspect (${built.length})`);

// 1. THE CALL HAPPENS, on every node `build()` produces. `?.()` at the call site means an absent port
//    method skips in silence, so a call COUNT is the only thing that distinguishes "unlocked" from
//    "never asked".
//
//    Scoped to built nodes, and the exclusion is stated rather than silent: the COMPONENT_SET itself is
//    created by `combineAsVariants`, never passes through `build()`, and so is never unlocked. That is
//    correct and not an oversight — the set is `resize()`d and binds NO dimension variable, so it has no
//    second binding to evict. `every built node` was the first form of this assertion and it failed
//    66/67 on exactly that node, which is how the distinction got established instead of assumed.
const buildable = built.filter((n) => n.type !== 'COMPONENT_SET');
ok(buildable.length === built.length - 1,
  `#682 reachable: exactly one node is not build()-produced — the set (${built.length - buildable.length})`);
const unlocked = buildable.filter((n) => (n._unlocks as number) > 0);
ok(unlocked.length === buildable.length,
  `#682 every built node had unlockAspectRatio() called on it (${unlocked.length}/${buildable.length}) — counted, because the call site is optional-chained`);
ok(buildable.every((n) => n._aspectLocked === false), '#682 ...and every one ended up actually unlocked, not merely called');
// The set keeps its lock, and that is safe ONLY while it binds no dimensions. Asserted, so the day
// something binds a dimension on the set this fails rather than silently losing one.
const setNodes = built.filter((n) => n.type === 'COMPONENT_SET');
ok(setNodes.every((n) => {
  const bv = (n.boundVariables as Record<string, unknown>) ?? {};
  return !bv.width && !bv.height;
}), '#682 the un-unlocked set binds no dimension variable, which is what makes leaving it locked harmless');

// 2. IT PRECEDED THE BINDINGS — the ordering claim, checked through its CONSEQUENCE rather than a
//    timestamp: a slot binds width AND height to the same square-artboard variable, and both survive
//    only if the unlock came first. This is the assertion that fails if the unlock is moved after the
//    binds, which a call count alone would not catch.
const slots = built.filter((n) => {
  const bv = n.boundVariables as Record<string, unknown>;
  return bv && (bv.width || bv.height);
});
ok(slots.length > 0, `#682 reachable: some node binds a dimension at all (${slots.length})`);
const bothAxes = slots.filter((n) => {
  const bv = n.boundVariables as Record<string, unknown>;
  return bv.width && bv.height;
});
ok(bothAxes.length > 0,
  `#682 a node holds BOTH dimension bindings at once (${bothAxes.length}/${slots.length}) — while locked, the second bind evicts the first, so this is the unlock's real effect`);
// ...AND THE SHIM'S LOCK REALLY EVICTS — the negative control for the assertion above, read off the shim
// directly rather than through the executor. Without it, `bothAxes` passes both when the executor unlocked
// and when the shim never locked at all: mutating `_aspectLocked: true` to `false` in `mkNode` left both
// suites 100% green, which is the docs/34 shape — a check that runs but cannot fire. Re-engaging the lock
// on an already-built node and driving it by hand is the one probe that tells those two worlds apart.
// A node straight from the shim's own factory, NOT one the executor touched — so it reports the state a
// node STARTS in, which is the half of the model M8 breaks and re-locking an existing node cannot see.
const fresh = (makeShim({}) as unknown as { createFrame(): Node }).createFrame();
ok(fresh._aspectLocked === true, '#682 reachable: a fresh shim node starts aspect-LOCKED');
(fresh as unknown as { setBoundVariable(p: string, v: { id: string; value?: number }): void })
  .setBoundVariable('width', { id: 'V:control', value: 10 });
(fresh as unknown as { setBoundVariable(p: string, v: { id: string; value?: number }): void })
  .setBoundVariable('height', { id: 'V:control', value: 10 });
const ctlBv = fresh.boundVariables as Record<string, unknown>;
ok(!!ctlBv.height && !ctlBv.width,
  '#682 reachable: ...and while locked it really evicts the opposite axis — so the both-axes claim above is about the unlock, not about a shim that never locked');

// 3. THE DEPRECATED PROPERTY IS GONE, not merely joined by the new call. Without this the migration
//    would pass on an executor that set both and left the old one doing the work.
ok(!built.some((n) => 'constrainProportions' in n),
  '#682 no node carries constrainProportions any more — the deprecated setter is gone, not shadowed');
ok(unlockRun.misses.length === 0 && unlockRun.variants === 21,
  `#682 ...and the migrated build is still clean (${unlockRun.variants} members, ${unlockRun.misses.length} misses)`);

// ---- #804: the action builds a def the CALLER names, and a small one executes ---------------------
//
// WHAT THIS CANNOT COVER, STATED FIRST. `buildComponents` reads the `figma` global, so the dispatch
// itself (`msg.def` → def → plans) is not reachable from this harness. What IS reachable is the pair of
// claims the change actually rests on, and they are the pair worth having independently: that a def
// resolves from an id the way the main thread resolves it, and that the executor produces a correct set
// for a def two orders of magnitude smaller than Button. The wiring between them is verified by the live
// run, same standing limit as the chunking above.
//
// FIELD-LABEL SPECIFICALLY, because 4 members is the case Button's 648 hid: every count in this harness
// is a multiple of 21, and an executor bug that only appears when a set has fewer members than a chunk
// (`CHUNK = 4`) would pass every assertion above.
const byId = (id: string): ComponentDef | undefined => componentDefs.find((d) => d.id === id);
ok(byId('field-label') === fieldLabel && byId('button') === button,
  '#804 a def resolves from its id through `componentDefs` — the same lookup the main thread does');
ok(byId('feild-label') === undefined,
  '#804 ...and a misspelled id resolves to nothing rather than to a neighbouring def, which is what makes the failed result reachable');
// EVERY def the picker offers, not just the one being materialized: the UI derives its list by calling
// `figmaAnatomySet` and keeping what does not throw, so an id it offers that this cannot project would be
// a disagreement between the two sides that the designer sees as a build that fails.
const offerable = componentDefs.filter((d) => { try { figmaAnatomySet(d, { swapTarget: 'FPO-default-icon' }); return true; } catch { return false; } });
ok(offerable.length >= 4 && offerable.some((d) => d.id === 'field-label') && offerable.some((d) => d.id === 'button'),
  `#804 every def the UI can offer projects here too (${offerable.map((d) => d.id).join(', ')})`);

const labelPlans = figmaAnatomySet(fieldLabel, { swapTarget: 'FPO-default-icon' });
// SWAP TARGET PASSED AND INERT, which is what lets the main thread pass it unconditionally rather than
// branching per def. Asserted by comparing the two projections, not by reading the def: a def that gains a
// swap part later makes this fail, which is the correct outcome — the branch would then be needed.
ok(JSON.stringify(labelPlans) === JSON.stringify(figmaAnatomySet(fieldLabel, {})),
  '#804 `swapTarget` is inert for a def with no swap parts, so the caller need not know whether to pass it');

// `fullFor(labelPlans)` rather than `full()`, and the distinction matters: `full()` seeds Button's names,
// so a `field-label` run against it would report every binding as a miss and the assertion below would be
// measuring the seed rather than the executor. Derived from these plans for the reason `fullFor` exists.
const labelRun = await run(labelPlans, fullFor(labelPlans));
ok(labelRun.set === 'field-label' && labelRun.variants === 4 && labelRun.added === 4,
  `#804 a 4-member set assembles under one set of its own name (set=${labelRun.set}, variants=${labelRun.variants}, added=${labelRun.added})`);
ok(labelRun.misses.length === 0, `#804 ...with no misses (${labelRun.misses.join('; ') || 'none'})`);
// REACHABILITY, so the line above cannot pass vacuously: a plan set that binds nothing has nothing to
// miss. Same guard the Button block opens with, for the same reason.
const labelSeed = fullFor(labelPlans);
ok((labelSeed.vars ?? []).length >= 4 && (labelSeed.styles ?? []).length >= 2,
  `#804 reachable: these plans DO reach for variables and text styles (${(labelSeed.vars ?? []).length} vars, ${(labelSeed.styles ?? []).length} styles)`);
// THE TWO TEXT PROPERTIES, which is the #798 fix reaching the canvas rather than only the plan. A set with
// one TEXT property here is the blank-indicator defect back, and it would otherwise be invisible: the node
// exists, is painted, is the right size, and holds no characters.
ok(labelRun.properties.filter((p) => p.indexOf('TEXT') >= 0).length === 2,
  `#798/#804 both text parts are declared as TEXT properties on the set, so neither projects blank (${labelRun.properties.join('/')})`);
// A SET NO LARGER THAN ONE CHUNK still yields and still ends at its total — the edge Button's 648 never
// exercised, since every count in this file is a multiple of 21 and `CHUNK` is 4. Through `instrumented`
// so the YIELD is witnessed separately from the REPORT: at this size the two could not be told apart by
// counting reports alone, which is the substitution docs/34 §2 records.
const labelInstr = await instrumented(labelPlans, fullFor(labelPlans));
ok(labelInstr.progress.length > 0 && labelInstr.yieldCalls > 0,
  `#804 a set no larger than one chunk still yields and still reports (${labelInstr.yieldCalls} yields, ${labelInstr.progress.length} reports)`);
ok(labelInstr.progress.every((p) => p.done <= p.total) && labelInstr.progress.some((p) => p.done === p.total),
  `#804 ...and the fractions are bounded and end at the total (${labelInstr.yields.join(', ')})`);

// =============================================================================================
// #913 — A PARTIAL WRITE IS MARKED, AND THE MARKING CANNOT MAKE THINGS WORSE
// =============================================================================================
// A throw mid-build leaves what it already wrote in the designer's file: Figma parents a created node to
// the current page the moment it exists, so the leftovers are objects on a canvas, not local variables.
// #913's decision is to MARK them — gather them under one visibly labelled frame and name them in the
// verdict — rather than delete them, because `figma.commitUndo()` is called nowhere in this plugin, so the
// whole run is a single undo entry and the unwind already exists.
//
// WHAT IS READ HERE, AND WHY IT IS NOT THE TRAIL. The executor keeps bookkeeping (`WriteTrail.loose`) and
// reports it in `PartialWriteFacts`. Asserting that against itself would be docs/34 shape 1, so every
// assertion below reads the HOST instead: the frame the shim actually holds, its actual children, and the
// `parent` each parked node actually ended up with. The two derivations are then asserted to AGREE — a
// marking that reported 648 parked while parenting 3 is the failure this arrangement exists to catch.
//
// AND WHAT THIS HARNESS CANNOT SEE, stated because it is the reason no existing gate caught the litter in
// the first place: `mkNode` never appends to `page`, so a node created here is not on the shim's page the
// way it is on Figma's. The page-parenting premise is measured in the standalone instrument
// (`measure-913.ts`, attached to the filed issue), not here. The consequence shows up below — after a
// refused `combineAsVariants` the shim's page array still lists the members it re-parented — so the
// re-parenting is read off `node.parent`, which the shim does model, rather than off the page.

// ---- REGIME 1: the small one, and the ORDINARY client failure -------------------------------
// A brand whose typeface is not installed (#680, pinned above as unfixed). The throw lands inside the
// FIRST member's build, before anything reaches the page at all — which is exactly why the count is small
// and why it is the one that gets overlooked and then re-run on top of. Two nodes is not a dramatic
// number; it is the number a designer meets most often.
const smallPage: Page = { children: [] };
let smallErr: unknown = null;
try {
  await run(grid, { ...full(), page: smallPage, styleFont: missingFont, unavailableFonts: [missingFont] });
} catch (e) { smallErr = e; }
const smallFacts = partialWriteOf(smallErr);
ok(smallErr !== null && (smallErr as Error).message.indexOf('unloaded font') >= 0,
  `#913 the HOST'S OWN ERROR still escapes, unwrapped and unreplaced — the throw is what the designer needs to see (${(smallErr as Error)?.message?.slice(0, 52)}…)`);
ok(smallFacts !== null, '#913 ...and it carries the facts about what was left behind, attached rather than substituted');
// The FRAME, read off the page — the independent half. `findOne` is the shim's, so this is the same
// question a designer's eye asks: is there one labelled thing on this page?
const smallFrames = smallPage.children.filter((c) => c.type === 'FRAME' && String(c.name).startsWith('⚠ Prism3 partial build'));
ok(smallFrames.length === 1, `#913 exactly one marking frame reached the page (${smallFrames.length})`);
const smallFrame = smallFrames[0];
ok(smallFacts!.loose > 0,
  `#913 reachable: the build really did leave nodes behind before it threw (${smallFacts!.loose}) — a zero here would make every assertion in this block vacuous`);
ok(smallFrame !== undefined && (smallFrame.children as Node[]).length === smallFacts!.loose,
  `#913 the frame HOLDS what the verdict claims: ${(smallFrame?.children as Node[])?.length} children against ${smallFacts!.loose} reported`);
ok(smallFacts!.parked === smallFacts!.loose && smallFacts!.markError === null,
  `#913 ...and the marking is reported as complete, with no failure of its own (parked ${smallFacts!.parked}/${smallFacts!.loose})`);
// RE-PARENTED, not merely listed. `appendChild` sets `parent`, and a frame whose `children` array holds
// nodes still parented elsewhere would be a frame a designer could not use to find them.
ok((smallFrame.children as Node[]).every((c) => c.parent === smallFrame),
  '#913 every parked node is really parented to the frame, not just listed in its children array');
// The COUNT IS IN THE NAME, and the name is built from the bookkeeping while the children are host state —
// so a marking that lied about how many it gathered fails here rather than reading plausibly.
ok(String(smallFrame.name).indexOf(`(${smallFacts!.loose} node`) >= 0,
  `#913 the frame's own label states the count it holds, so the litter is findable by reading it (${smallFrame.name})`);
ok(String(smallFrame.name).indexOf('button') >= 0 && String(smallFrame.name).indexOf('undo') >= 0,
  '#913 ...and names the component it was building and the way out');
// THE PROSE THE DESIGNER ACTUALLY READS, in both halves. The pill has to carry the number: two nodes and
// 648 both reading `✗ write failed` is the defect this closes, and the small case is the one it matters for.
ok(partialWriteHeadline(smallFacts!).indexOf(String(smallFacts!.loose)) >= 0,
  `#913 the verdict pill carries the count in the SMALL regime (${partialWriteHeadline(smallFacts!)})`);
ok(partialWriteNote(smallFacts!).indexOf(String(smallFrame.name)) >= 0,
  '#913 ...and the note names the frame, which is the only pointer the panel can give');

// ---- REGIME 2: the large one --------------------------------------------------------------
// Every member built, named and on the page, and then the single call that would gather them refuses. The
// count here is the whole set: 648 for the full Button grid live, 21 for the grid this harness drives.
const bigPage: Page = { children: [] };
let bigErr: unknown = null;
try {
  await run(grid, { ...full(), page: bigPage, refuse: { combine: true } });
} catch (e) { bigErr = e; }
const bigFacts = partialWriteOf(bigErr);
ok((bigErr as Error)?.message?.indexOf('combineAsVariants') >= 0,
  `#913 the refusal itself still reaches the user (${(bigErr as Error)?.message?.slice(0, 52)}…)`);
// EXPECTED from the PLANS, not from the executor's count: `grid.length` is what was asked for, and every
// member is loose once the combine refuses. This is the arm that would catch the trail losing members.
ok(bigFacts !== null && bigFacts.loose === grid.length,
  `#913 the large regime strands the whole set — one loose node per member asked for (${bigFacts?.loose} of ${grid.length})`);
const bigFrame = bigPage.children.find((c) => c.type === 'FRAME' && String(c.name).startsWith('⚠ Prism3 partial build'));
ok(bigFrame !== undefined && (bigFrame.children as Node[]).length === grid.length,
  `#913 ...and all of them are gathered under one frame (${(bigFrame?.children as Node[])?.length})`);
ok((bigFrame!.children as Node[]).every((c) => c.parent === bigFrame), '#913 ...each really re-parented to it');
// THE PARKED NODES ARE THE MEMBERS, checked by NAME against what the plans asked for. This is the arm that
// catches the trail holding the wrong objects — a pre-conversion root, a part, a stale duplicate — which a
// count alone cannot see. (The frame-vs-component distinction is NOT observable here: this shim's
// `createComponentFromNode` is the identity, deliberately, so the two are one object. Only the live host
// can tell them apart, which is why the executor's own delete-then-add ordering is written for both.)
const bigNames = new Set((bigFrame!.children as Node[]).map((c) => String(c.name)));
const wantNames = new Set(grid.map(planComponentName));
ok(bigNames.size === wantNames.size && [...wantNames].every((n) => bigNames.has(n)),
  `#913 ...and they are the members the plans named, not some other nodes that happen to number ${grid.length}`);
ok(partialWriteHeadline(bigFacts!).indexOf(String(grid.length)) >= 0,
  `#913 the verdict pill carries the count in the LARGE regime too — same shape, one number (${partialWriteHeadline(bigFacts!)})`);
// The two regimes must produce the same SHAPE of verdict. Tuning the reporting for the dramatic case is
// how the two-node case ends up invisible, so the pills are compared by form rather than by content.
ok(/^✗ failed, \d+ parked$/.test(partialWriteHeadline(smallFacts!)) && /^✗ failed, \d+ parked$/.test(partialWriteHeadline(bigFacts!)),
  '#913 both regimes render the same verdict shape, so neither is the special case');

// ---- THE MARKING'S OWN FAILURE -------------------------------------------------------------
// The premise of the whole design: this runs on a host that has just refused a call, so it must be able to
// refuse the next one. Two things are then required, and the second is the load-bearing one — the nodes
// are still in the file, so the verdict must still say so. A marking that reported a clean file here would
// be worse than no marking at all.
const cannotMarkPage: Page = { children: [] };
let cannotMarkErr: unknown = null;
try {
  await run(grid, { ...full(), page: cannotMarkPage, refuse: { combine: true, createFrame: 'on-failure-path' } });
} catch (e) { cannotMarkErr = e; }
const cmFacts = partialWriteOf(cannotMarkErr);
ok((cannotMarkErr as Error)?.message?.indexOf('combineAsVariants') >= 0,
  `#913 a marking that fails does NOT mask the original cause — the refusal is still the message (${(cannotMarkErr as Error)?.message?.slice(0, 52)}…)`);
ok(cmFacts !== null && cmFacts.loose === grid.length && cmFacts.parked === 0 && cmFacts.frame === null,
  `#913 ...and the nodes are still reported as present, unparked (loose ${cmFacts?.loose}, parked ${cmFacts?.parked}, frame ${String(cmFacts?.frame)})`);
ok(cmFacts!.markError !== null && cmFacts!.markError!.indexOf('not editable') >= 0,
  `#913 ...with the marking's own failure named beside the cause rather than swallowed (${cmFacts?.markError})`);
ok(!cannotMarkPage.children.some((c) => String(c.name).startsWith('⚠ Prism3 partial build')),
  '#913 reachable: no frame was made, so the assertions above are about the unparked path');
ok(partialWriteNote(cmFacts!).indexOf('loose on this page') >= 0 && partialWriteNote(cmFacts!).indexOf(String(grid.length)) >= 0,
  '#913 the note tells the designer the nodes are loose and how many — the one thing it must never get wrong');

// ---- AND NOTHING IS MARKED WHEN NOTHING FAILED ---------------------------------------------
// The cost of this feature is a write on the failure path. It must be exactly zero on the success path:
// a marking frame appearing on a clean build would be litter created by the litter-detector.
const cleanPage: Page = { children: [] };
const cleanRun = await run(grid, { ...full(), page: cleanPage });
ok(cleanRun.variants === grid.length && !cleanPage.children.some((c) => String(c.name).startsWith('⚠')),
  `#913 a clean build creates no marking frame at all (${cleanPage.children.length} page child/children, ${cleanRun.variants} members)`);
// A run that fails WITHOUT writing keeps its old verdict, which is the third state. Two hosts, because one
// of them cannot see the defect and it took a mutation to notice:
//
//  · `planSetLayout` refuses an incoherent plan set (two components at one coordinate) on a host that
//    ACCEPTS EVERYTHING. This is the case that matters, and the one the first version of this block
//    missed: nothing was written, so nothing may be marked, and a frame reading "(0 nodes; undo to
//    remove)" would be litter produced by the litter-collector. Measured — deleting the executor's
//    `nodes.length === 0` short-circuit left this whole block green, because the only host it drove was
//    one that refuses `createFrame` and therefore could not have produced a frame either way. A right
//    comparison over a set that excludes the failing case (docs/34 shape 15).
//  · the host refusing the build's very first node, which is the same terminal state reached a different
//    way and is kept because it is the one a client meets.
const refusedPage: Page = { children: [] };
let refusedErr: unknown = null;
try { await run([grid[0], { ...grid[0] }], { ...full(), page: refusedPage }); } catch (e) { refusedErr = e; }
ok(refusedErr !== null && (refusedErr as Error).message.indexOf('share a component name') >= 0,
  '#913 reachable: an incoherent plan set is refused before the first create, on a host that accepts everything');
ok(partialWriteOf(refusedErr) === null,
  '#913 a throw before the first write attaches no partial-write facts, so its verdict is unchanged');
ok(refusedPage.children.length === 0,
  `#913 ...and NO marking frame is created for a file nothing reached, on a host that would have accepted one (${refusedPage.children.length} page children)`);

const nothingPage: Page = { children: [] };
let earlyErr: unknown = null;
try { await run(grid, { ...full(), page: nothingPage, refuse: { createFrame: 'always' } }); } catch (e) { earlyErr = e; }
const earlyFacts = partialWriteOf(earlyErr);
ok(earlyErr !== null && (earlyFacts === null || earlyFacts.loose === 0),
  `#913 the same holds when it is the HOST that refused the first node (${earlyFacts === null ? 'no facts' : earlyFacts.loose + ' loose'})`);
ok(nothingPage.children.length === 0, `#913 ...and nothing was put on that page either (${nothingPage.children.length})`);

console.log(`\nplugin COMPONENT write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
