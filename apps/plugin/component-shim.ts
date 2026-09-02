/**
 * The in-memory `ComponentsApi` SHIM — one model of the Figma host, shared by every offline component
 * suite (#874).
 *
 * MOVED HERE, UNCHANGED, from `test-write-components.ts`, which is still its principal consumer. The
 * move is the whole reason it is a module: the round-trip gate in `test-roundtrip.ts` drives the same
 * executor against the same host, and a SECOND shim would be a second mental model of Figma — two
 * places for a permissive stub to let the same defect pass, and no way to tell which one was wrong.
 * This file's own governing rule makes that concrete, and it is unchanged by the move:
 *
 *   **Everything it models, it models because a permissive stub let a real defect pass.**
 *
 * So a quirk added here for one suite is a quirk the other inherits, which is the point. What it does
 * NOT model is stated where it is modelled, per quirk, and the largest of those limits — that
 * accept-and-discard is only reproduced for the one case it was taught — belongs to any gate that
 * drives it, including the round-trip.
 *
 * Nothing here imports the executor, and nothing imports a suite: the shim is a HOST, and a host that
 * knew what was being asserted about it would be a different kind of object.
 */

export type Node = Record<string, unknown>;
/** A PAGE that outlives one run, because idempotency's whole premise is that run 2 finds what run 1
 *  left in the file. A shim that forgot between runs could not exercise it at all. */
export type Page = { children: Node[] };

/** A NUMERIC value per variable, deterministic from the name, non-zero, and DIFFERENT per name — the
 *  last part is not cosmetic: equal values would let the executor bind the wrong variable and still
 *  measure right. Same function the engine's stub uses, so the two paths measure identically. */
export const varValue = (name: string): number => 8 + ([...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 7) * 4;
/** The brand root the shim's FILE carries (#1097) — see `mkVar`. Foreign on purpose. */
export const SHIM_ROOT = 'zzclient';

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
export const SHIM_GAP = 2;
export const SHIM_STROKE = 2;
/** What the executor must write: the gap plus the stroke that eats it. Derived here, once, so the
 *  assertions below quote the formula rather than restating a number. */
export const SHIM_COORD = SHIM_GAP + SHIM_STROKE;

export type FontName = { family: string; style: string };
export const fontKey = (f: FontName): string => `${f.family}|${f.style}`;
/** The font every text style in this shim names, unless a case overrides it. Semi Bold rather than
 *  Regular so a style's font is DIFFERENT from the font a fresh `createText` node starts on — equal
 *  fonts would make the loaded-font model below unfalsifiable. */
export const STYLE_FONT: FontName = { family: 'Inter', style: 'Semi Bold' };

/**
 * A node in the FILE the executor searches, beyond the plain components `comps` names.
 *
 * Its `type` is the whole of #681: `findAllWithCriteria({ types: ['COMPONENT'] })` matches
 * `ComponentNode` and never `ComponentSetNode`, so a `focus-ring` that is a component SET is absent
 * from the lookup while its CHILDREN are present under their variant coordinates (`state=default`).
 * A flat name→component map cannot express that, which is why the live defect had no test.
 */
export type FileNode =
  /** A component SET. Its `variants` become child COMPONENTs named by their variant coordinate — which
   *  is what a criteria search actually returns, and why the set's own name never enters the map. */
  | { name: string; type: 'COMPONENT_SET'; variants: string[] }
  /** An INSTANCE of a component, the shape a designer produces by duplicating a variant out of a set or
   *  dragging one in from a library. Its `main` is reachable only THROUGH the instance: an instance of a
   *  library component has no main in this file, so a criteria search cannot find it. */
  | { name: string; type: 'INSTANCE'; main: string }
  /** A FRAME or GROUP someone named the same thing — the third row of #681's message table. */
  | { name: string; type: 'FRAME' | 'GROUP' };

export type ShimOpts = {
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
export const burnMs = (ms: number): void => { const t0 = Date.now(); while (Date.now() - t0 < ms) { /* hold */ } };

export const makeShim = (opts: ShimOpts = {}) => {
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
  /**
   * THE FILE'S VARIABLES ARE ROOTED; THE PLAN'S BINDING NAMES ARE NOT (#1097). A plan is brand-agnostic
   * — `figmaVarName` keeps it that way deliberately — so `applyComponentPlan` resolves a binding by
   * TAIL, via `figma-names.ts`'s `tailOf`. That is the only reason one plan can bind into a `prism/` file
   * and an `nbds/` one.
   *
   * So the shim presents `<root>/size/md/gap` while `opts.vars` holds the plan's `size/md/gap`, and the
   * root is `zzclient` — DELIBERATELY FOREIGN, a root no corpus brand uses. `prism/` would work here and
   * prove less: it cannot tell tail-keyed resolution apart from a read path that happens to recognise the
   * engine's own default. A foreign root fails on anything that spells one.
   *
   * The ID stays keyed on the UNROOTED name, because the assertions downstream read `V:<name>` back out
   * of `boundVariables` and compare it against what the PLAN asked for. Rooting the id too would just
   * re-add the root on both sides of every one of those comparisons and cancel out.
   */
  const mkVar = (name: string) => ({ id: `V:${name}`, name: `${SHIM_ROOT}/${name}`, value: varValue(name), resolveForConsumer: () => ({ value: resolvedValue(name) }) });

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
      // #1009: `textAlignVertical` is a `TextNode` property. A TEXT node starts at Figma's default
      // `'TOP'` — so a node that reads back `CENTER` proves the executor WROTE it, rather than the shim
      // having defaulted helpfully — and every other node type THROWS on the write, which is what Figma
      // does. Without the throw this port would accept the property on a frame, the executor's
      // try/catch would never fire, and a plan claiming it on the wrong node type would pass the one
      // test written to catch that. Same argument as `_aspectLocked` above: a shim that cannot refuse
      // cannot witness a refusal.
      ...(type === 'TEXT'
        ? { textAlignVertical: 'TOP' as string }
        : {
            get textAlignVertical(): string | undefined { return undefined; },
            set textAlignVertical(_v: string | undefined) {
              throw new Error(`in set_textAlignVertical: Cannot write to node with unsupported type: ${type}`);
            },
          }),
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
        node.textStyleId = id;
      },
      // #1007 — WRITTEN UNDER FIGMA'S OWN PROPERTY NAMES as well as the private ones.
      //
      // The private `_textStyleId`/`_effectStyleId` are what this file's own assertions read, and they
      // stay. What was missing is the name a READER uses: Figma exposes the applied style as
      // `node.textStyleId` / `node.effectStyleId`, and a reader written against the real host read
      // `undefined` from this shim and reported every styled node as unstyled — a harness defect
      // presenting as a subject defect, which is the worst shape a false positive can take. Both names
      // are set from the one setter, so they cannot disagree.
      setEffectStyleIdAsync: async (id: string) => { node._effectStyleId = id; node.effectStyleId = id; },
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
      // `vectorPaths`, THE SIXTH TIME A SHIM HERE HAS STOPPED MEASURING SOMETHING IT COULD NOT DISTINGUISH
      // (#1010) — and the first where the missing property is one a real VectorNode carries. The box above
      // is not a fingerprint of the DRAWING: `error-circle` and `check-circle` are the same 20px ring with
      // different marks inside it, so both measure 20x20 here AND in Figma. Any assertion that two tones
      // draw different glyphs, written against the box, passes on a set where all three tones share one
      // outline — which is #1010's shipped defect exactly, in a different costume.
      //
      // Split on the move commands, which is what Figma's own `vectorPaths` gives you: one entry per
      // subpath, `data` being that subpath's path data. Modelled because the assertion needs it, and
      // faithful in shape rather than in the network Figma actually builds — see the header's standing
      // limit on this importer having no live SVG parser behind it.
      vec.vectorPaths = (d.match(/[Mm][^Mm]*/g) ?? []).map((sub) => ({ windingRule: 'NONZERO', data: sub.trim() }));
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
