/**
 * REPEATING ROWS INTO A NATIVE SLOT, CARRIED ACROSS AN UPDATE (#2649, owner decision Q307 A) — against the shim.
 *
 *   npx tsx apps/plugin/test-slot-migration.ts
 *
 * A Checkbox group, Tabs and List are BUILT the old way (#2344: rows behind Figma-only booleans) by the real executor
 * into the in-memory shim, from LEGACY defs typed here as fixtures (today's def with its `items` slot taken back out
 * into rows, the booleans' names and defaults typed from #2344 and Q179). Designers' instances of their members are
 * placed in the file. Then the update runs exactly as `main.ts` runs it (`previewUpdate`, then `applyUpdate` with the
 * preview's hash) with today's plans, and every expectation is read off the instances' own nodes after it.
 *
 * THE PLACED INSTANCES are a model of Figma's, written here, and it is the one thing this suite supplies rather than
 * the shim: an instance's layers are a LIVE VIEW of its member (an update to the member reaches it, and an override
 * on a layer the member no longer has goes with the layer, as on a real host), a row's visibility follows the
 * instance's boolean property, and a SLOT layer holds the member's default items until the instance's own content
 * is written. The rows' components are a small library of the same model: `createInstance`, `setProperties`, an
 * exposed control with a VARIANT `selection`. What the real host does on the two writes the fill makes (children into
 * an instance's slot, `setProperties` on a fresh instance) is not measured here; `slot-migration.ts` says so.
 *
 *   carry/…     a 5-visible-row instance becomes 5 items in order, each its own variant, label and checked state;
 *               a row hidden on the instance is not resurrected, nor are the rows its booleans left off.
 *   dry run/…   the dry run names every instance, what moves in order, what is hidden and what can't carry over.
 *   lost/…      an override no component property carries is a named line, never silent.
 *   tabs/…      a Tabs instance with four tabs, the third selected, keeps the count, order and selection.
 *   list/…      a List instance with every item on carries all eight.
 *   segmented/… rows that sat in a layer the update keeps (`track`): four options, the second selected, each growing.
 *   converge/…  the next dry run has nothing to carry: the set reads current, and no old boolean is left to remove.
 *   untouched/… an instance left at its defaults carries its three default rows as three items.
 *   stopped/…   #3697 H1 — a set that stops at member N fills the instances of the members it reached, and leaves the
 *               rest with their rows for the next run.
 *   stopped/text/… #3697 H1, the #3225 half: a Banner set that stops after its properties exist fills every edited
 *               body; one that stops inside its member pass names each body it could not carry, and the next run
 *               carries it from the capture kept on the set (#3761).
 *   closed/…    #3762 — a run closed part-way (its member yield never resolves): the next run carries the rows of the
 *               members it reached, and, for Banner, every edited body, from the capture kept on the set.
 *   closed after/… #3762 — closed after the set's write but before its fill: the set is not up to date, and the next
 *               run fills it without writing a member.
 *   kept/…      #3796 review B1, B2 — a capture too large to keep, or refused by the host, carries in memory and is
 *               named, and the run goes on; an entry this version can't read is ignored, named and cleared.
 *   failed/…    #3697 L1 — a throw after the set's write (its fill) returns the set's outcome and why the run ended,
 *               and its verdict is not `completed` (#3758).
 *   finished/…  #3763 N1 — on a finished set, an instance with no slot after the update is a named miss.
 *   refused/…   #3763 R2 — a set the update refuses carries nothing and changes no instance.
 *   dialog/…    #2661 — the footer's two fixed Buttons move into a nested Button.Group's slot, which holds the same two by
 *               default: a designer's changed labels land on those defaults in order, an unchanged instance is left
 *               out, and a swapped or hidden button is named. Driven on a hand-built model of the placed instances
 *               (a Dialog member before and after), since the shim's placed-instance model has no nested slot.
 *
 * Mutations, each failing by name:
 *   · the capture keeps hidden rows (`r.visible === false` check dropped) → `carry/hidden not resurrected`;
 *   · the fill drops `setProperties` → `carry/labels`, `carry/checked`;
 *   · the apply's capture-then-fill removed (`o.carried` not set) → `carry/count`, `tabs/carried`;
 *   · the dry run's migration lines dropped → `dry run/lines`;
 *   · the lost-override read dropped → `lost/named`.
 *   · the apply stops deleting removed properties → `converge/booleans gone`.
 *   · the capture keeps values equal to the set default (the `defaultValue` filter dropped) → `dialog/only changes`;
 *   · the within fill removes the slot's defaults and remakes them → `dialog/defaults kept`.
 *   · a stopped set skips the fill again (`!o.stopped` back on `fillSlots`, #3697 H1) → `stopped/earlier kept`;
 *   · the stopped fill reports every unreached instance (`reachedOnly` dropped) → `stopped/no false miss`.
 *   · a stopped Banner set skips the text fill again (`!o.stopped` back on `fillSlotText`) → `stopped/text after the pass filled`;
 *   · the text fill skips an instance with none of the new properties → `stopped/text inside the pass named`.
 *   · applyUpdate's catch around its writes rethrows (#3697 L1) → `failed/returned`, `failed/partial`.
 *   · the capture not kept on the set (`keepCarry` a no-op, #3761/#3762) → `closed/reached carried`,
 *     `stopped/text inside the pass carried next run`, `closed/text carried next run`;
 *   · the kept capture never narrowed after a fill (`only` ignored) → `closed/converge`;
 *   · a kept carry not counted as work (`carryDue` false) → `closed after/due`, `closed after/carried`.
 *   · the members an update configures not marked in progress before the set's first write (#3797) →
 *     `closed/no false hand edit`; marked only after the set's own writes, just before the executor's pass (#3809 review) →
 *     `refused/mid no false hand edit`, `refused/no false hand edit`.
 *   · the size bound dropped from `keepCarry` → `kept/too large not written`, `kept/too large named`;
 *   · the try around `keepCarry`'s write dropped → `kept/refused run completes`, `kept/refused filled`, `kept/refused named`;
 *   · the kept entry's validation back to `Array.isArray(instances)` → `kept/malformed preview (…)`, `kept/malformed apply (…)`,
 *     `kept/malformed up to date`, `kept/malformed text read`;
 *   · the apply's clear of an unreadable entry dropped → `kept/malformed cleared alone`;
 *   · the apply's clear of one on a set with no write dropped (#3803) → `kept/malformed up to date cleared`.
 *   · the thrown run's verdict says `completed: true` (#3758) → `failed/not completed`;
 *   · the rows fill's `reachedOnly` passed as `true` on a finished set (#3763 N1) → `finished/missing slot named`;
 *   · the apply's preflight refusal not skipping the set (#3763 R2) → `refused/rows kept`.
 *   NOT a mutation any arm can catch: `!o.refused` on the two fills. `applySet` never returns a refused outcome (a set
 *   is refused before the loop, above), so the guard is unreachable; `refused/…` pins the refusal that does run.
 */
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, type AnatomyPlan, type ComponentDef, type PartDef, componentDefs } from '@prism3/engine/components';
import { COMPONENT_RENAMES, slotMigrationOf, slotTextMigrationOf } from '@prism3/engine';
import { applyComponentPlan, STAMP_KEY } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { makeShim, type Node, type Page } from './component-shim';
import { previewUpdate, previewVerdict, setUpToDate, type UpdateTarget } from './src/update-plan';
import { applyUpdate, applyVerdict, previewHashOf, type ApplyHost } from './src/update-apply';
import { captureSlotMigration, fillSlots, migrationLines, type MigNode } from './src/slot-migration';
import { slotMigrationFor } from './src/update-plan';
import { CARRY_MAX_BYTES, keepCarry, readCarry } from './src/slot-carry';
import { UPDATING_KEY } from './src/member-baseline';
import { materializeForBrand } from './src/brand-def';

let failed = 0, executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const section = (s: string) => console.log(`\n${s}`);
const defOf = (id: string): ComponentDef => componentDefs.find((d) => d.id === id)!;

// ---- the legacy defs (#2344), typed here as fixtures ------------------------------------------------------------

/** Today's def with its `items` slot taken back out: the slot's children become `n` rows under `from`, rows after the
 *  first `optional`, each behind a Figma-only boolean `${label} ${i}` that is on for the first `on` rows. */
const legacy = (id: string, from: string, row: (i: number) => string, n: number, label: string, on: number, firstToggle: number, keepFromLayer: boolean): ComponentDef => {
  const d = defOf(id);
  const parts = { ...d.anatomy!.parts } as Record<string, PartDef>;
  const items = parts.items;
  const proto = parts[items.children![0]];
  const second = parts[items.children![1]];
  const rows: Record<string, PartDef> = {};
  // A ROW CARRIES NO PER-INSTANCE OVERRIDE (#2645). The sets this migrates were built from the defs before #2645, and
  // the stand-in rows here declare none of the properties an override names, so carrying today's (List's numbers)
  // would make the premise build fail on a property the legacy host never had. A row's own property values, an
  // override's number included, reach the update as the row instance's `componentProperties`, which `props` models.
  for (let i = 1; i <= n; i++) {
    const { overrides: _o, ...p } = (i === 1 ? proto : second) as PartDef & { overrides?: unknown };
    rows[row(i)] = { ...p, ...(i >= firstToggle ? { optional: true } : {}) } as PartDef;
  }
  delete parts.items;
  for (const c of items.children!) delete parts[c];
  const rowNames = Object.keys(rows);
  if (keepFromLayer) {
    // Tabs: the row layer was `list`, a plain frame, where the slot `items` is now.
    const { contentSlot: _c, ...frame } = items;
    parts[from] = { ...frame, children: rowNames } as PartDef;
    const root = parts[d.anatomy!.root];
    parts[d.anatomy!.root] = { ...root, children: root.children!.map((c) => (c === 'items' ? from : c)) } as PartDef;
  } else if (from === d.anatomy!.root) {
    const root = parts[from];
    parts[from] = { ...root, children: root.children!.flatMap((c) => (c === 'items' ? rowNames : [c])), ...(items.gap && !root.gap ? { gap: items.gap } : {}) } as PartDef;
  } else {
    // Segmented: the rows sat straight in `track`.
    const host = parts[from];
    parts[from] = { ...host, children: host.children!.flatMap((c) => (c === 'items' ? rowNames : [c])) } as PartDef;
  }
  Object.assign(parts, rows);
  const booleans: Record<string, { part: string; default: boolean; figmaName: string; figmaOnly: true }> = { ...((d.figmaProperties!.booleans ?? {}) as never) };
  for (let i = firstToggle; i <= n; i++) booleans[`toggle${i}`] = { part: row(i), default: i <= on, figmaName: `${label} ${i}`, figmaOnly: true };
  return { ...d, anatomy: { ...d.anatomy!, parts }, figmaProperties: { ...d.figmaProperties!, booleans } };
};
const LEGACY = {
  // #2344, owner decision Q156 A: eight rows, row 1 always shown, "Option 2"-"Option 8", rows 2 and 3 on.
  'checkbox-group': () => legacy('checkbox-group', 'container', (i) => `row${i}`, 8, 'Option', 3, 2, false),
  // #2416 Q179 A: six tabs, tabs 4-6 behind "Tab 4"-"Tab 6", off, in a `list` frame.
  tabs: () => legacy('tabs', 'list', (i) => `tab${i}`, 6, 'Tab', 3, 4, true),
  // #2319 Q273: eight items, 4-8 behind "Item 4"-"Item 8", off.
  list: () => legacy('list', 'container', (i) => `item${i}`, 8, 'Item', 3, 4, false),
  // #2418 Q269.7/Q269.8: five segments straight in `track`, 3-5 behind "Segment 3"-"Segment 5", 3 on.
  'segmented-control': () => legacy('segmented-control', 'track', (i) => `segment${i}`, 5, 'Segment', 3, 3, false),
};

// ---- the rows' components, and the placed instances (a model of Figma's, see the header) ------------------------

type Val = string | boolean;
type Model = Record<string, unknown> & { id: string; name: string; type: string; children: Model[]; parent: Model | null };
let seq = 0;
/** A row component (a variant of `set`), instanced as Figma does: its own TEXT property, an exposed control. */
const library = new Map<string, Model>();
const rowMain = (set: string, variant: string): Model => {
  const k = `${set}/${variant}`;
  if (library.has(k)) return library.get(k)!;
  const main: Model = { id: `R:${k}`, name: variant, type: 'COMPONENT', children: [], parent: { id: `RS:${set}`, name: set, type: 'COMPONENT_SET', children: [], parent: null } as Model };
  main.createInstance = () => rowInstance(main, set);
  library.set(k, main);
  return main;
};
/** One row instance: `Label#1:0` (TEXT) and, for a checkbox row, an exposed `control` whose `selection` is a VARIANT. */
const rowInstance = (main: Model, set: string, props: Record<string, Val> = {}, control?: string): Model => {
  const values: Record<string, { type: string; value: Val }> = { 'Label#1:0': { type: 'TEXT', value: 'Option' } };
  for (const [k, v] of Object.entries(props)) values[k] = { type: typeof v === 'boolean' ? 'BOOLEAN' : 'TEXT', value: v };
  const inst: Model = { id: `I:${++seq}`, name: String(main.name), type: 'INSTANCE', children: [], parent: null };
  const exposed: Model[] = set === 'checkbox-row' ? [ctl(control ?? 'unchecked')] : [];
  Object.defineProperties(inst, {
    componentProperties: { get: () => JSON.parse(JSON.stringify(values)) },
    exposedInstances: { get: () => exposed },
  });
  inst.getMainComponentAsync = async () => main;
  inst.setProperties = (p: Record<string, Val>) => { for (const [k, v] of Object.entries(p)) { if (!values[k]) throw new Error(`no property ${k}`); values[k].value = v; } };
  inst.remove = () => { const p = inst.parent as Model | null; if (p) p.children.splice(p.children.indexOf(inst), 1); inst.parent = null; };
  return inst;
};
const ctl = (selection: string): Model => {
  const values: Record<string, { type: string; value: Val }> = { selection: { type: 'VARIANT', value: selection } };
  const c: Model = { id: `C:${++seq}`, name: 'control', type: 'INSTANCE', children: [], parent: null };
  Object.defineProperty(c, 'componentProperties', { get: () => JSON.parse(JSON.stringify(values)) });
  c.setProperties = (p: Record<string, Val>) => { for (const [k, v] of Object.entries(p)) values[k].value = v; };
  return c;
};

type RowState = { props?: Record<string, Val>; control?: string; visible?: boolean; variant?: string };
type Placed = Model & { _rows: Map<string, Model>; _slots: Map<string, Model[]>; _overrides: { id: string; overriddenFields: string[] }[] };
const DESIGNS: Model = { id: 'P:designs', name: 'Designs', type: 'PAGE', children: [], parent: null };
/**
 * An instance of `member`, its layers a live view of the member. `booleans` are the instance's boolean values by panel
 * name; `rows` the designer's per-row overrides by layer name. Each overridden row is listed in `overrides`, as Figma
 * lists it; `extra` adds an override field no property carries.
 */
const place = (name: string, member: Node, set: Node, booleans: Record<string, boolean>, rows: Record<string, RowState>, extra: { row: string; field: string }[] = []): Placed => {
  const inst = { id: `PI:${++seq}`, name, type: 'INSTANCE', children: [], parent: DESIGNS, _rows: new Map(), _slots: new Map(), _overrides: [] } as unknown as Placed;
  const defs = (set.componentPropertyDefinitions ?? {}) as Record<string, { type: string; defaultValue: unknown }>;
  const boolOf = (ref: string): boolean => {
    const nm = ref.split('#')[0];
    return nm in booleans ? booleans[nm] : defs[ref]?.defaultValue !== false;
  };
  // `inSlot`: a layer inside a SLOT is a layer the update made, so it carries none of the overrides made on the old rows.
  const view = (n: Node, path: string, parent: Model, inSlot = false): Model => {
    // A nested instance (a row) is the instance's OWN object per path, made once: the designer's overrides live on it.
    if (n.type === 'INSTANCE') {
      const key = path;
      if (!inst._rows.has(key)) {
        // The shim's nested rows point at a plain component named for the row's def (`checkbox-row`); a set's member
        // points at its set. Either way the row's own library entry is keyed by the def.
        const mc = (n as { mainComponent?: { name: string; parent?: { name: string; type: string } } }).mainComponent;
        const inSet = mc?.parent?.type === 'COMPONENT_SET';
        const setName = String(inSet ? mc?.parent?.name : mc?.name);
        const st = inSlot ? {} : rows[String(n.name)] ?? {};
        const main = rowMain(setName, st.variant ?? (inSet ? String(mc?.name) : 'default'));
        const r = rowInstance(main, setName, st.props, st.control);
        r.id = `${inst.id};${String(n.id)}`;
        r.name = String(n.name);
        // A layer of an instance reads its member's layout, as on a real host.
        for (const f of ['layoutAlign', 'layoutGrow']) if ((n as Record<string, unknown>)[f] !== undefined) r[f] = (n as Record<string, unknown>)[f];
        const ref = (n.componentPropertyReferences as Record<string, string> | undefined)?.visible;
        Object.defineProperty(r, 'visible', { configurable: true, get: () => (st.visible === false ? false : ref ? boolOf(ref) : n.visible !== false) });
        inst._rows.set(key, r);
        if (st.props || st.control || st.variant) inst._overrides.push({ id: r.id, overriddenFields: ['componentProperties', ...(st.variant ? ['mainComponent'] : [])] });
        if (st.visible === false) inst._overrides.push({ id: r.id, overriddenFields: ['visible'] });
        for (const x of extra.filter((e) => e.row === String(n.name))) inst._overrides.push({ id: r.id, overriddenFields: [x.field] });
      }
      const r = inst._rows.get(key)!;
      r.parent = parent;
      // Removed from a slot, a default item leaves the instance's own content (written then, as a designer's edit is).
      r.remove = () => { const own = (r.parent as { _own?: () => Model[] } | null)?._own; if (own) { const l = own(); const i = l.indexOf(r); if (i >= 0) l.splice(i, 1); } r.parent = null; };
      return r;
    }
    const v: Model = { id: `${inst.id};${String(n.id)}`, name: String(n.name), type: String(n.type), children: [], parent };
    Object.defineProperty(v, 'children', {
      get: () => {
        if (n.type === 'SLOT' && inst._slots.has(path)) return inst._slots.get(path)!;
        return ((n.children as Node[]) ?? []).map((c) => view(c, `${path}/${String(c.name)}`, v, inSlot || n.type === 'SLOT'));
      },
    });
    if (n.type === 'SLOT') {
      // The instance's own content, written the first time it changes, as a designer's edit makes it.
      const own = (): Model[] => { if (!inst._slots.has(path)) inst._slots.set(path, ((n.children as Node[]) ?? []).map((c) => view(c, `${path}/${String(c.name)}`, v, true))); return inst._slots.get(path)!; };
      v.appendChild = (c: Model) => { const list = own(); c.parent = v; list.push(c); };
      Object.defineProperty(v, '_own', { value: own });
    }
    return v;
  };
  Object.defineProperty(inst, 'children', { get: () => ((member.children as Node[]) ?? []).map((c) => view(c, String(c.name), inst)) });
  Object.defineProperty(inst, 'overrides', { get: () => inst._overrides.filter((o) => [...inst._rows.values()].some((r) => r.id === o.id)) });
  inst.getMainComponentAsync = async () => member as unknown as Model;
  return inst;
};
/** The instance's slot layer, by name. */
const slotOf = (inst: Placed, name = 'items'): Model | undefined => {
  const find = (n: Model): Model | undefined => (n.type === 'SLOT' && n.name === name ? n : n.children.map(find).find(Boolean));
  return find(inst as unknown as Model);
};

// ---- the world ---------------------------------------------------------------------------------------------------

const planComps = (n: { swapTarget?: string; nestTarget?: string; children?: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []), ...((n.children ?? []) as (typeof n)[]).flatMap(planComps),
];
/** `extra.comps`: library components the plans reach only through an override (Banner's close glyph). `extra.harness`:
 *  a build miss the shim owns, not the set (a nested instance's override it does not declare), named by the caller. */
const world = async (oldDef: ComponentDef, newPlans: AnatomyPlan[], extra: { comps?: string[]; harness?: (m: string) => boolean } = {}) => {
  const oldPlans = figmaAnatomySet(oldDef, { swapTarget: SWAP_TARGET });
  const all = [...oldPlans, ...newPlans];
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set([...all.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0'])],
    styles: [...new Set(all.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(all.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...(extra.comps ?? []), ...all.flatMap((p) => planComps(p.root))])],
    page, liveRoot: true, identities: true, scaleConstrained: true,
  }) as any;
  const built = await applyComponentPlan(oldPlans, api);
  const misses = built.misses.filter((m) => !extra.harness?.(m));
  if (misses.length) throw new Error(`premise: the legacy set built with ${misses.length} miss(es): ${misses[0]}`);
  // #3762: the row components are the fixture's own library, which the host finds by id as `figma.getNodeByIdAsync` does.
  const byId = async (id: string) => [...library.values()].find((m) => m.id === id) ?? (await api.getNodeByIdAsync?.(id)) ?? null;
  const host = { ...api, getNodeByIdAsync: byId, root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) } } as unknown as ApplyHost;
  const set = () => page.children.find((n) => n.type === 'COMPONENT_SET') as Node;
  const placed: Placed[] = [];
  // Each member lists the placed instances of it, as `ComponentNode.getInstancesAsync` does.
  for (const m of set().children as Node[]) (m as Record<string, unknown>).getInstancesAsync = async () => placed.filter((p) => (p as unknown as { _member: Node })._member === m);
  const put = (p: Placed, member: Node) => { (p as unknown as { _member: Node })._member = member; placed.push(p); return p; };
  return { host, api, page, set, put, oldPlans };
};
const memberNamed = (set: Node, name: string): Node => (set.children as Node[]).find((m) => m.name === name)!;
// ---- checkbox group ----------------------------------------------------------------------------------------------

section('carry — a Checkbox group instance with five visible rows becomes five items, in order');
{
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY['checkbox-group'](), target.plans);
  const medium = memberNamed(w.set(), 'status=default, size=medium');
  // Rows 1-6 on through booleans, row 3 hidden by hand: rows 1, 2, 4, 5 and 6 are visible, five in all.
  const five = w.put(place('Shipping filters', medium, w.set(), { 'Option 4': true, 'Option 5': true, 'Option 6': true }, {
    row1: { props: { 'Label#1:0': 'Email' }, control: 'checked' },
    row2: { props: { 'Label#1:0': 'SMS' } },
    row3: { props: { 'Label#1:0': 'Hidden by hand' }, visible: false },
    row4: { props: { 'Label#1:0': 'Push' }, control: 'checked' },
    row5: { props: { 'Label#1:0': 'Post' } },
    row6: { props: { 'Label#1:0': 'Phone' }, control: 'indeterminate' },
  }, [{ row: 'row5', field: 'opacity' }]), medium);
  const plain = w.put(place('Defaults', medium, w.set(), {}, {}), medium);
  ok(five.children.filter((c) => c.name.startsWith('row') && c.visible !== false).length === 5, 'premise: the placed instance shows five rows before the update');

  const pre = await previewUpdate(w.host, [target]);
  const p = pre.sets[0];
  const mig = p.slotMigration;
  const cap = mig?.instances.find((c) => c.name === 'Shipping filters');
  ok(!!cap && JSON.stringify(cap.rows.map((r) => r.row)) === JSON.stringify(['row1', 'row2', 'row4', 'row5', 'row6']),
    `carry/order: the dry run reads the five visible rows in the member's order (${JSON.stringify(cap?.rows.map((r) => r.row))})`);
  ok(!!cap && JSON.stringify(cap.hidden) === JSON.stringify(['row3', 'row7', 'row8']),
    `carry/hidden listed: row 3 (hidden by hand) and rows 7 and 8 (off) are listed as hidden (${JSON.stringify(cap?.hidden)})`);
  const lines = previewVerdict(pre).lines;
  const line = lines.find((l) => l.startsWith('checkbox-group instance "Shipping filters"'));
  ok(!!line && line.includes('5 rows become 5 items in the slot, in order ("Email" selection=checked; "SMS" selection=unchecked; "Push" selection=checked; "Post" selection=unchecked; "Phone" selection=indeterminate)') && line.includes('Hidden, so left out: row3, row7, row8.'),
    `dry run/lines: the instance's line names what moves, in order, and what is hidden (${line})`);
  ok(lines.some((l) => l === 'checkbox-group: the rows move into the "items" slot. 2 instances in this file carried across, 8 items in all, 1 with something that can\'t carry over.'),
    `dry run/summary: the set's migration line counts instances and items (${lines.filter((l) => l.includes('"items" slot')).join(' | ')})`);
  ok(!!line && line.includes("Can't carry over: row5: opacity changed by hand."),
    `lost/named: an override no component property carries is named (${line})`);

  const res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre));
  const v = applyVerdict(res);
  const o = res.outcomes[0];
  ok(!!o?.carried && o.carried.instances === 2 && o.carried.items === 8 && o.carried.misses.length === 0,
    `carry/count: two instances carried, eight items, no miss (${JSON.stringify(o?.carried)}; ${v.lines.join(' | ').slice(0, 400)})`);
  const items = slotOf(five)?.children ?? [];
  ok(items.length === 5, `carry/five items: the slot holds five items (${items.length})`);
  ok(JSON.stringify(items.map((x) => (x.componentProperties as Record<string, { value: Val }>)['Label#1:0'].value)) === JSON.stringify(['Email', 'SMS', 'Push', 'Post', 'Phone']),
    `carry/labels: each item keeps its row's label, in order (${JSON.stringify(items.map((x) => (x.componentProperties as Record<string, { value: Val }>)['Label#1:0'].value))})`);
  ok(JSON.stringify(items.map((x) => ((x.exposedInstances as Model[])[0].componentProperties as Record<string, { value: Val }>).selection.value)) === JSON.stringify(['checked', 'unchecked', 'checked', 'unchecked', 'indeterminate']),
    `carry/checked: each item keeps its checked state (${JSON.stringify(items.map((x) => ((x.exposedInstances as Model[])[0].componentProperties as Record<string, { value: Val }>).selection.value))})`);
  ok(!items.some((x) => (x.componentProperties as Record<string, { value: Val }>)['Label#1:0'].value === 'Hidden by hand'),
    'carry/hidden not resurrected: the row hidden on the instance is not an item');
  ok(items.every((x) => x.layoutAlign === 'STRETCH'), `carry/layout: every carried item stretches across the slot as the default items do (${items.map((x) => String(x.layoutAlign)).join(',')})`);
  const plainItems = slotOf(plain)?.children ?? [];
  ok(plainItems.length === 3, `untouched/three: an instance at its defaults carries its three default rows as three items (${plainItems.length})`);
  ok(v.lines.includes('checkbox-group: 2 instances carried into the slot, 8 items in all.'), `carry/verdict: the apply's line counts what it carried (${v.lines.join(' | ').slice(0, 400)})`);
  const again = await previewUpdate(w.host, [target]);
  ok(!again.sets[0].slotMigration && again.sets[0].counts.current === again.sets[0].counts.members,
    `converge/checkbox: the next dry run has nothing to carry and every member reads current (${JSON.stringify(again.sets[0].counts)})`);
  const rawRows = (w.set().getSharedPluginData as (ns: string, k: string) => string)('prism3', 'slotCarry');
  ok(rawRows === '', `converge/no kept capture: a finished run leaves no capture on the set (${rawRows.length} chars)`);
  ok(again.sets[0].properties.remove.length === 0,
    `converge/booleans gone: the next dry run has no property left to remove (${again.sets[0].properties.remove.map((p) => p.name).join(', ')})`);
}

// ---- stopped ------------------------------------------------------------------------------------------------------

section('stopped — a set that stops at member N still fills the instances of the members it reached (#3697 H1)');
{
  // The host throws as the update marks member N in progress, the first write of its update, so the members before it
  // are finished (they hold the slot, and have lost their rows) and member N and those after it are untouched. The
  // capture is in memory only: a fill skipped on the stop is content the next run can no longer read. Mutation: the
  // stopped set not filled (`!o.stopped` back on the fill) → `stopped/earlier kept`.
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY['checkbox-group'](), target.plans);
  const members = w.set().children as Node[];
  // #3797: the apply marks every member it configures before the set's first write, so the executor's mark as it reaches
  // a member is that member's second; the stop is on the third member the executor reaches.
  const marks: Node[] = [];
  const premarked = new Set<Node>();
  for (const m of members) {
    const real = m.setSharedPluginData as (ns: string, k: string, v: string) => void;
    m.setSharedPluginData = (ns: string, k: string, v: string) => {
      if (k === UPDATING_KEY && v && !premarked.has(m)) premarked.add(m);
      else if (k === UPDATING_KEY && v) { marks.push(m); if (marks.length === 3) throw new Error('in setSharedPluginData: the host stopped'); }
      real.call(m, ns, k, v);
    };
  }
  // Which members are marked first is the executor's order: read it from a dry pass of the marks, by placing an
  // instance on every member and naming the earliest and the last after the run.
  const placedOn = new Map<Node, Placed>();
  for (const [i, m] of members.entries()) {
    placedOn.set(m, w.put(place(`Filters ${i + 1}`, m, w.set(), {}, {
      row1: { props: { 'Label#1:0': `Email ${i + 1}` }, control: 'checked' },
      row2: { props: { 'Label#1:0': `SMS ${i + 1}` } },
    }), m));
  }
  const pre = await previewUpdate(w.host, [target]);
  const res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre));
  const o = res.outcomes[0];
  ok(!!o?.stopped && /the host stopped/.test(o.stopped) && marks.length === 3,
    `premise: the set stopped as the update marked its third member (${o?.stopped}; ${marks.length} marks of ${members.length} members)`);
  // A broken premise fails above by name; the rest is skipped rather than thrown, so the arms after it still run.
  if (marks.length === 3) {
    const first = placedOn.get(marks[0])!, stoppedAt = placedOn.get(marks[2])!;
    const labels = (inst: Placed): unknown[] => (slotOf(inst)?.children ?? []).map((x) => (x.componentProperties as Record<string, { value: Val }>)['Label#1:0']?.value);
    ok(!!slotOf(first) && JSON.stringify(labels(first).slice(0, 2)) === JSON.stringify([`Email ${members.indexOf(marks[0]) + 1}`, `SMS ${members.indexOf(marks[0]) + 1}`]),
      `stopped/earlier kept: an instance of a member finished before the stop holds its rows' content in the slot (${JSON.stringify(labels(first))})`);
    const checked = (slotOf(first)?.children ?? []).map((x) => ((x.exposedInstances as Model[] | undefined)?.[0]?.componentProperties as Record<string, { value: Val }> | undefined)?.selection?.value);
    ok(checked[0] === 'checked', `stopped/earlier state: its first item keeps the row's checked state (${JSON.stringify(checked)})`);
    ok(!slotOf(stoppedAt) && stoppedAt.children.some((c) => c.name === 'row1'),
      `stopped/later untouched: an instance of the member the stop hit still has its rows, for the next run to read (${stoppedAt.children.map((c) => c.name).join(',')})`);
    ok(!!o.carried && !o.carried.misses.some((m) => m.includes('after the update')),
      `stopped/no false miss: an unreached instance is not reported as missing its slot (${JSON.stringify(o.carried?.misses ?? [])})`);
    const again = await previewUpdate(w.host, [target]);
    const caps = again.sets[0].slotMigration?.instances.map((c) => c.name) ?? [];
    ok(!caps.includes(first.name) && caps.includes(stoppedAt.name),
      `stopped/rerun: the next dry run reads the untouched instance's rows, and has nothing left to read on the filled one (${JSON.stringify(caps)})`);
  }
}

// ---- closed ---------------------------------------------------------------------------------------------------------

section('closed — a set the plugin is closed in part-way keeps the rows of the members it reached for the next run (#3762)');
{
  // #3697 H1's second cause. A close is modelled as the run's member yield never resolving: the run goes no further, so
  // neither its fill nor anything after the pass ever runs, which is what a closed plugin does. The members before the
  // close hold the slot and have lost their rows; the next run must still carry their content. Mutation: the capture
  // not kept on the set (`keepCarry` a no-op) → `closed/reached carried`, `closed/reached state`.
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY['checkbox-group'](), target.plans);
  const members = w.set().children as Node[];
  const placed = members.map((m, i) => w.put(place(`Closed ${i + 1}`, m, w.set(), {}, {
    row1: { props: { 'Label#1:0': `Email ${i + 1}` }, control: 'checked' },
    row2: { props: { 'Label#1:0': `SMS ${i + 1}` } },
  }), m));
  const pre = await previewUpdate(w.host, [target]);
  let yields = 0;
  const never = new Promise<void>(() => {});
  void applyUpdate(w.host, w.api as any, [target], previewHashOf(pre), { chunk: 1, yieldTo: async () => { if (++yields >= 3) await never; } });
  for (let i = 0; i < 500 && yields < 3; i++) await new Promise((r) => setTimeout(r, 0));
  const labels = (inst: Placed): unknown[] => (slotOf(inst)?.children ?? []).map((x) => (x.componentProperties as Record<string, { value: Val }>)['Label#1:0']?.value);
  const reached = placed.filter((p) => !!slotOf(p));
  ok(yields >= 3 && reached.length > 0 && reached.length < placed.length && reached.every((p) => !p.children.some((c) => c.name === 'row1')),
    `premise: the run was closed part-way, with ${reached.length} of ${placed.length} instances' members holding the slot and their rows gone (${yields} yields)`);
  const again = await previewUpdate(w.host, [target]);
  const res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(again));
  const o = res.outcomes[0];
  const wrong = reached.filter((p) => { const i = placed.indexOf(p) + 1; return JSON.stringify(labels(p).slice(0, 2)) !== JSON.stringify([`Email ${i}`, `SMS ${i}`]); }).map((p) => `${p.name}=${JSON.stringify(labels(p))}`);
  ok(!o?.stopped && wrong.length === 0,
    `closed/reached carried: the next run fills each reached instance's slot with its own rows' labels (${o?.stopped ?? 'finished'}; wrong: ${wrong.join(', ') || 'none'})`);
  const states = reached.map((p) => ((slotOf(p)?.children ?? [])[0]?.exposedInstances as Model[] | undefined)?.[0]?.componentProperties as Record<string, { value: Val }> | undefined).map((c) => c?.selection?.value);
  ok(states.every((v) => v === 'checked'), `closed/reached state: each reached instance's first item keeps its row's checked state (${JSON.stringify(states)})`);
  const unreached = placed.filter((p) => !reached.includes(p));
  ok(unreached.every((p) => { const i = placed.indexOf(p) + 1; return JSON.stringify(labels(p).slice(0, 2)) === JSON.stringify([`Email ${i}`, `SMS ${i}`]); }),
    `closed/rest carried: the instances the first run never reached are carried by the second as usual (${unreached.map((p) => JSON.stringify(labels(p))).join(' ')})`);
  const third = await previewUpdate(w.host, [target]);
  const keptNow = (w.set().getSharedPluginData as (ns: string, k: string) => string)('prism3', 'slotCarry');
  ok(!third.sets[0].slotMigration && keptNow === '',
    `closed/converge: once filled, the set keeps no capture and the next dry run has nothing left to carry (${JSON.stringify(third.sets[0].slotMigration?.instances.map((c) => c.name))}; kept ${keptNow.length} chars)`);
  // #3797: the close came after the set's own writes (its old booleans removed), before the pass reached every member.
  // The members it never reached changed under those writes, and must read as the update's, not as hand edits: every
  // member it configures is marked in progress before the set's first write (`applySet`). Mutation: that mark dropped →
  // `closed/no false hand edit`.
  const c3 = third.sets[0].counts;
  ok(c3.handEdited === 0 && c3.current === c3.members,
    `closed/no false hand edit: after the close and a full run, no member reads as edited by hand and every one reads current (${JSON.stringify(c3)})`);
}

section('refused/set write — a host refusal inside the set\'s own writes leaves no member read as edited by hand (#3797, #3809 review)');
{
  // The mark's placement, pinned. The close above lands inside the executor's pass, after every set-level write, so a
  // mark placed anywhere before the pass passes it. A throw inside the set writes does not: the layer renames and the
  // property removals before it have already changed every member. Modelled as the set's third `deleteComponentProperty`
  // refused. Marked before the set's first write, the members read as to update, and the next run finishes them.
  // Mutation: the mark block moved to just before `applyComponentPlan` → `refused/mid no false hand edit`,
  // `refused/no false hand edit`.
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY['checkbox-group'](), target.plans);
  const set = w.set() as unknown as Record<string, unknown>;
  const realDel = set.deleteComponentProperty as (k: string) => void;
  let dels = 0;
  set.deleteComponentProperty = (k: string) => { if (++dels === 3) throw new Error('the host refused'); realDel.call(set, k); };
  const pre = await previewUpdate(w.host, [target]);
  let threw = '', stopped = '';
  try { const r = await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre)); stopped = r.failed ?? r.outcomes[0]?.stopped ?? ''; } catch (e) { threw = (e as Error).message; }
  set.deleteComponentProperty = realDel;
  ok(dels >= 3 && /the host refused/.test(threw || stopped),
    `premise: the host refused the set's third property removal (${dels} removals; ${threw ? `threw ${threw}` : `ended ${stopped || 'no'}`})`);
  const mid = (await previewUpdate(w.host, [target])).sets[0].counts;
  ok(mid.handEdited === 0 && mid.update === mid.members,
    `refused/mid no false hand edit: the next dry run reads every member as to update, none as edited by hand (${JSON.stringify(mid)})`);
  const again = await previewUpdate(w.host, [target]);
  const res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(again));
  const after = (await previewUpdate(w.host, [target])).sets[0].counts;
  ok(!res.outcomes[0]?.stopped && after.handEdited === 0 && after.current === after.members,
    `refused/no false hand edit: after a full run, no member reads as edited by hand and every one reads current (${res.outcomes[0]?.stopped ?? 'finished'}; ${JSON.stringify(after)})`);
}

section('closed after the write — a set closed after its write but before its fill is not up to date, and the next run fills it (#3762)');
{
  // The window between the set's write returning and its fill: every member is current, so without the kept capture the
  // set reads up to date and the next run never reaches it. Modelled from a finished run: the capture its dry run read
  // is put back on the set as the apply keeps it, and each instance's slot emptied, as the fill never ran. Mutation: the
  // kept carry not counted as work (`carryDue` false) → `closed after/due`, `closed after/carried`.
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY['checkbox-group'](), target.plans);
  const members = w.set().children as Node[];
  const placed = members.map((m, i) => w.put(place(`Late ${i + 1}`, m, w.set(), {}, {
    row1: { props: { 'Label#1:0': `Email ${i + 1}` }, control: 'checked' },
  }), m));
  const pre = await previewUpdate(w.host, [target]);
  await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre));
  (w.set().setSharedPluginData as (ns: string, k: string, v: string) => void)('prism3', 'slotCarry', JSON.stringify(pre.sets[0].slotMigration));
  for (const p of placed) slotOf(p)?.children.splice(0);
  const due = await previewUpdate(w.host, [target]);
  ok(!setUpToDate(due.sets[0]) && due.sets[0].slotMigration?.instances.length === placed.length,
    `closed after/due: the set is not up to date while its kept capture waits, and the dry run lists every instance (${due.sets[0].slotMigration?.instances.length ?? 0} of ${placed.length})`);
  const res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(due));
  const labels = placed.map((p) => (slotOf(p)?.children ?? []).map((x) => (x.componentProperties as Record<string, { value: Val }>)['Label#1:0']?.value)[0]);
  ok(labels.every((l, i) => l === `Email ${i + 1}`) && res.outcomes[0]?.updated.length === 0,
    `closed after/carried: the next run fills each slot from the kept capture and writes no member (${JSON.stringify(labels)}; ${res.outcomes[0]?.updated.length} updated)`);
  const settled = await previewUpdate(w.host, [target]);
  ok(setUpToDate(settled.sets[0]), `closed after/settled: once filled, the set reads up to date (${JSON.stringify(settled.sets[0].counts)})`);
}

section('kept/edges — a kept instance gone from the file, and a row component the host can\'t find, are named misses (#3796 review)');
{
  // The review's proofs D and E, folded in. Modelled as `closed after`: every instance comes from the kept capture, plus
  // one whose instance was deleted since, and the host finds no row component by id.
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY['checkbox-group'](), target.plans);
  const members = w.set().children as Node[];
  const placed = members.map((m, i) => w.put(place(`Edge ${i + 1}`, m, w.set(), {}, { row1: { props: { 'Label#1:0': `Email ${i + 1}` } } }), m));
  const pre = await previewUpdate(w.host, [target]);
  await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre));
  const cap = pre.sets[0].slotMigration!;
  const gone = { ...cap.instances[0], id: 'GONE:1', name: 'Gone' };
  (w.set().setSharedPluginData as (ns: string, k: string, v: string) => void)('prism3', 'slotCarry', JSON.stringify({ ...cap, instances: [...cap.instances, gone] }));
  for (const p of placed) slotOf(p)?.children.splice(0);
  const blind = { ...(w.host as object), getNodeByIdAsync: async () => null } as unknown as ApplyHost;
  let threw = '', res: Awaited<ReturnType<typeof applyUpdate>> | null = null;
  try { const due = await previewUpdate(blind, [target]); res = await applyUpdate(blind, w.api as any, [target], previewHashOf(due)); } catch (e) { threw = (e as Error).message; }
  const content = res?.outcomes[0]?.content ?? [];
  ok(!threw && content.includes('checkbox-group instance "Gone": no longer in the file'),
    `kept/edges gone: a kept instance no longer in the file is a named miss, not a throw (${threw || JSON.stringify(content.filter((l) => l.includes('Gone')))})`);
  const notMade = placed.filter((p) => content.includes(`checkbox-group instance "${p.name}": row1 -> NOT MADE (its component can't be instanced here)`)).length;
  ok(notMade === placed.length, `kept/edges no component: a kept row whose component the host can't find is named NOT MADE (${notMade} of ${placed.length})`);
  const left = (w.set().getSharedPluginData as (ns: string, k: string) => string)('prism3', 'slotCarry');
  ok(left === '', `kept/edges removed: once tried, the kept entry is removed, so the misses are not repeated every run (${left.length} chars left)`);
}

// ---- stopped, slot text (#3225) ------------------------------------------------------------------------------------

section('stopped/text — a Banner set that stops part-way still fills each body whose properties exist, and names the rest (#3697 H1)');
{
  // The slot-text half of H1. The new properties (`body text`, `rich body`, `body`) are the SET's, added after the member
  // pass, and the `body` slot is renamed `richBody` in every member BEFORE that pass. So a stop either comes after the
  // properties exist, and every captured instance is filled (one skipped is content lost: the capture is in memory
  // only), or comes inside the pass, and none can be: each is then a named miss, never silent. Carrying the second
  // case's text is #3761. Mutations: the stopped set not filled (`!o.stopped` back on the text fill) →
  // `stopped/text after the pass filled`; an instance with no property skipped silently → `stopped/text inside the pass named`.
  const banner = materializeForBrand(defOf('banner'), null);
  const P = banner.anatomy!.parts;
  // The base's banner (#3225), as `test-roundtrip.ts` types it: the body a native slot holding one text, `placeholder`.
  const { bodyRow: _r, bodyText: _t, link: _l, richBody: _s, ...keep } = P;
  const OLD_COPY = 'Body text. Say what happened and what to do next.';
  const old: ComponentDef = {
    ...banner,
    props: banner.props.filter((x) => x.name !== 'link'),
    anatomy: { ...banner.anatomy!, parts: {
      ...keep,
      content: { ...P.content, children: ['titleBox', 'body', 'actions'] },
      body: { kind: 'box', role: 'presentation', contentSlot: true, layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } }, crossAxisFill: true, children: ['placeholder'] },
      placeholder: { kind: 'text', type: 'body-type', paintSlot: 'body', wrap: true, characters: OLD_COPY },
    } as Record<string, PartDef> },
    composition: { ...banner.composition!, composesWith: ['button', 'flush-icon-button-neutral'] },
    figmaProperties: { ...banner.figmaProperties!, texts: { title: banner.figmaProperties!.texts!.title }, booleans: { title: { part: 'titleBox', default: true }, icon: banner.figmaProperties!.booleans!.icon, actions: { part: 'actions', default: false }, dismissible: { part: 'close', default: false, figmaName: 'close' } } as never },
  };
  // The shim declares no property on the base's nested Button and FlushIconButton, so their overrides report themselves.
  const harness = (m: string): boolean => /^(close|action)\.nestOverrides -> (swap icon|label) \(no (INSTANCE_SWAP|TEXT) property/.test(m);
  /** One run: every member holds one placed instance whose body text was edited, and the host throws on the third write
   *  of `key` (the in-progress mark: inside the pass; the stamp: after the properties). */
  const run = async (key: string, opts: { hangAt?: number } = {}) => {
    const target: UpdateTarget = { def: 'banner', plans: figmaAnatomySet(banner, { swapTarget: SWAP_TARGET }) };
    const w = await world(old, target.plans, { comps: ['icon/close'], harness });
    const members = w.set().children as Node[];
    const defs = () => (w.set().componentPropertyDefinitions ?? {}) as Record<string, { type: string; defaultValue: unknown }>;
    const findSlot = (n: Node): Node | undefined => (n.type === 'SLOT' ? n : ((n.children as Node[] | undefined) ?? []).map(findSlot).find(Boolean));
    // A placed instance: its slot a live view of its member's (renamed with it), holding the instance's own text; its
    // properties the set's definitions, as on a real host, each holding the instance's value or the default.
    const placed = members.map((m, i) => {
      const own: Model[] = [];
      const t = { id: `BT:${i}`, name: 'placeholder', type: 'TEXT', characters: `Edited ${i + 1}`, children: [], parent: null } as unknown as Model;
      t.remove = () => { own.splice(own.indexOf(t), 1); };
      own.push(t);
      const vals: Record<string, Val> = {};
      const inst = { id: `BI:${i}`, name: `Banner ${i + 1}`, type: 'INSTANCE', parent: DESIGNS } as unknown as Model & { _vals: Record<string, Val>; _own: Model[] };
      Object.defineProperties(inst, {
        children: { get: () => { const sl = findSlot(m); return sl ? [{ type: 'SLOT', name: String(sl.name), children: own }] : []; } },
        componentProperties: { get: () => Object.fromEntries(Object.entries(defs()).filter(([, d]) => d.type !== 'VARIANT' && d.type !== 'SLOT').map(([k, d]) => [k, { type: d.type, value: k in vals ? vals[k] : d.defaultValue }])) },
      });
      inst.setProperties = (p: Record<string, Val>) => { for (const [k, v] of Object.entries(p)) { if (!defs()[k] || defs()[k].type === 'SLOT') throw new Error(`no property ${k}`); vals[k] = v; } };
      inst.getMainComponentAsync = async () => m;
      inst._vals = vals; inst._own = own;
      (m as Record<string, unknown>).getInstancesAsync = async () => [inst];
      return inst;
    });
    let hits = 0;
    for (const m of members) {
      const real = m.setSharedPluginData as (ns: string, k: string, v: string) => void;
      m.setSharedPluginData = (ns: string, k: string, v: string) => {
        if (k === key && v && ++hits === 3) throw new Error('in setSharedPluginData: the host stopped');
        real.call(m, ns, k, v);
      };
    }
    const pre = await previewUpdate(w.host, [target]);
    const bodyText = (inst: (typeof placed)[number]): Val | undefined => Object.entries(inst._vals).find(([k]) => k.split('#')[0] === 'body text')?.[1];
    const hasProp = (): boolean => Object.keys(defs()).some((k) => k.split('#')[0] === 'body text');
    // A close (#3762): the member yield never resolves, so the run goes no further and nothing after the pass runs.
    if (opts.hangAt) {
      let yields = 0;
      const never = new Promise<void>(() => {});
      void applyUpdate(w.host, w.api as any, [target], previewHashOf(pre), { chunk: 1, yieldTo: async () => { if (++yields >= opts.hangAt!) await never; } });
      for (let i = 0; i < 500 && yields < opts.hangAt; i++) await new Promise((r) => setTimeout(r, 0));
      return { pre, o: undefined, placed, bodyText, hasProp: hasProp(), w, target, yields };
    }
    const res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre));
    return { pre, o: res.outcomes[0], placed, bodyText, hasProp: hasProp(), w, target, yields: 0 };
  };

  // After the pass: the stop lands on the third member's stamp, which is written after the set's properties.
  const after = await run(STAMP_KEY);
  ok(after.pre.sets[0].slotTextMigration?.instances.length === after.placed.length && !!after.o?.stopped && after.hasProp,
    `premise: the dry run captured every edited body, and the set stopped after its properties were added (${after.pre.sets[0].slotTextMigration?.instances.length} captured of ${after.placed.length}; ${after.o?.stopped}; body text ${after.hasProp ? 'present' : 'absent'})`);
  const wrong = after.placed.filter((p, i) => after.bodyText(p) !== `Edited ${i + 1}` || p._own.length !== 0).map((p) => p.name);
  ok(wrong.length === 0 && after.o?.carriedText?.moved === after.placed.length && after.o.carriedText.misses.length === 0,
    `stopped/text after the pass filled: every instance's edited text is in "body text" and its old slot copy cleared (${JSON.stringify(after.o?.carriedText)}; wrong: ${wrong.join(', ') || 'none'})`);

  const rawText = (after.w.set().getSharedPluginData as (ns: string, k: string) => string)('prism3', 'slotTextCarry');
  ok(rawText === '', `stopped/text after the pass keeps nothing: every body filled, so no capture is left on the set (${rawText.length} chars)`);

  // Inside the pass: the stop lands on the third member's in-progress mark, before the set has any of the new properties.
  const inside = await run(UPDATING_KEY);
  ok(!!inside.o?.stopped && !inside.hasProp, `premise: the set stopped inside its member pass, before "body text" was added (${inside.o?.stopped})`);
  const named = inside.placed.filter((p) => (inside.o?.content ?? []).some((l) => l.startsWith(`banner instance "${p.name}": has no "body text" property`))).length;
  ok(named === inside.placed.length && inside.o?.carriedText?.moved === 0,
    `stopped/text inside the pass named: each instance whose body could not be carried is a miss naming it, not skipped silently (${named} of ${inside.placed.length} named; ${JSON.stringify(inside.o?.carriedText?.misses.slice(0, 2))})`);
  // #3761: the next run carries those bodies. Every member's slot is already renamed, so only a capture kept on the set
  // can. Mutation: the capture not kept on the set (`keepCarry` a no-op) → `stopped/text inside the pass carried next run`.
  const rerun = async (r: Awaited<ReturnType<typeof run>>) => {
    const again = await previewUpdate(r.w.host, [r.target]);
    const res = await applyUpdate(r.w.host, r.w.api as any, [r.target], previewHashOf(again));
    return { again, o: res.outcomes[0], wrong: r.placed.filter((p, i) => r.bodyText(p) !== `Edited ${i + 1}`).map((p) => `${p.name}=${JSON.stringify(r.bodyText(p))}`) };
  };
  const next = await rerun(inside);
  ok(!next.o?.stopped && next.wrong.length === 0 && (next.o?.carriedText?.moved ?? 0) === inside.placed.length,
    `stopped/text inside the pass carried next run: the next run puts each instance's edited text into "body text" (${next.o?.stopped ?? 'finished'}; ${JSON.stringify(next.o?.carriedText)}; wrong: ${next.wrong.join(', ') || 'none'})`);
  const settled = await previewUpdate(inside.w.host, [inside.target]);
  ok(!settled.sets[0].slotTextMigration, `stopped/text converge: once carried, the next dry run has nothing left to carry (${settled.sets[0].slotTextMigration?.instances.length ?? 0})`);

  // #3762, the text half: the plugin closed inside the member pass. Mutation: as above → `closed/text carried next run`.
  const closed = await run(UPDATING_KEY + ':never', { hangAt: 3 });
  ok(closed.yields >= 3 && !closed.hasProp, `premise: the run was closed inside its member pass, before "body text" was added (${closed.yields} yields)`);
  const after2 = await rerun(closed);
  ok(!after2.o?.stopped && after2.wrong.length === 0,
    `closed/text carried next run: after a close, the next run puts each instance's edited text into "body text" (${after2.o?.stopped ?? 'finished'}; ${JSON.stringify(after2.o?.carriedText)}; wrong: ${after2.wrong.join(', ') || 'none'})`);
}

// ---- kept: the size bound and a malformed entry (#3796 review B1, B2) -------------------------------------------------

section('kept/bound — a capture too large to keep, or one the host refuses, carries in memory and the run goes on (#3796 review B1)');
{
  // Figma refuses a plugin-data entry over 100 kB. The keep is written before the set's write, so an unguarded refusal
  // stopped that set and every set after it on every run, where main carried in memory. Mutations: the size check
  // dropped → `kept/too large named`, `kept/too large not written`; the try around the write dropped →
  // `kept/refused run completes`, `kept/refused filled`, `kept/refused named`.
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const labelsOf = (inst: Placed): unknown[] => (slotOf(inst)?.children ?? []).map((x) => (x.componentProperties as Record<string, { value: Val }>)['Label#1:0']?.value);
  const setUp = async (label: (i: number) => string) => {
    const w = await world(LEGACY['checkbox-group'](), target.plans);
    const placed = (w.set().children as Node[]).map((m, i) => w.put(place(`Big ${i + 1}`, m, w.set(), {}, { row1: { props: { 'Label#1:0': label(i) } } }), m));
    return { w, placed };
  };
  const raw = (w: Awaited<ReturnType<typeof world>>): string => (w.set().getSharedPluginData as (ns: string, k: string) => string)('prism3', 'slotCarry');

  // Too large: each instance's label alone is 20 000 characters, so the capture is far over the bound.
  const big = await setUp((i) => `${i + 1}`.padEnd(20_000, 'x'));
  const writes: number[] = [];
  const realSet = big.w.set().setSharedPluginData as (ns: string, k: string, v: string) => void;
  (big.w.set() as Record<string, unknown>).setSharedPluginData = (ns: string, k: string, v: string) => { if (k === 'slotCarry') writes.push(v.length); realSet.call(big.w.set(), ns, k, v); };
  const preBig = await previewUpdate(big.w.host, [target]);
  const resBig = await applyUpdate(big.w.host, big.w.api as any, [target], previewHashOf(preBig));
  const oBig = resBig.outcomes[0];
  const wrongBig = big.placed.filter((p, i) => labelsOf(p)[0] !== `${i + 1}`.padEnd(20_000, 'x')).map((p) => p.name);
  ok(!resBig.failed && !!oBig && !oBig.stopped && wrongBig.length === 0,
    `kept/too large run completes: the run finishes and fills every instance in memory (${resBig.failed ?? 'finished'}; wrong: ${wrongBig.join(', ') || 'none'})`);
  ok(!writes.some((n) => n > CARRY_MAX_BYTES) && raw(big.w) === '',
    `kept/too large not written: no write over the bound reaches the host, and the set keeps no entry (${JSON.stringify(writes)})`);
  const vBig = applyVerdict(resBig);
  ok(oBig?.unkept?.length === 1 && oBig.unkept[0].kind === 'rows' && !oBig.unkept[0].refused && oBig.unkept[0].bytes > CARRY_MAX_BYTES
    && vBig.lines.some((l) => l.startsWith('checkbox-group: its placed instances\' slot content is too large to save on the set (') && l.endsWith('so only this run carries it.')),
    `kept/too large named: the set's outcome names the capture it carried in memory only (${JSON.stringify(oBig?.unkept)}; ${vBig.lines.filter((l) => l.includes('too large')).join(' | ')})`);

  // Refused: the host throws on any non-empty slotCarry write, as Figma does over its own limit (proof G, scaled).
  const ref = await setUp((i) => `Email ${i + 1}`);
  const realRef = ref.w.set().setSharedPluginData as (ns: string, k: string, v: string) => void;
  (ref.w.set() as Record<string, unknown>).setSharedPluginData = (ns: string, k: string, v: string) => { if (k === 'slotCarry' && v) throw new Error('plugin data too large'); realRef.call(ref.w.set(), ns, k, v); };
  const preRef = await previewUpdate(ref.w.host, [target]);
  let resRef: Awaited<ReturnType<typeof applyUpdate>> | null = null, threw = '';
  try { resRef = await applyUpdate(ref.w.host, ref.w.api as any, [target], previewHashOf(preRef)); } catch (e) { threw = (e as Error).message; }
  ok(!!resRef && !threw && !resRef.failed && resRef.outcomes.length === 1 && !resRef.outcomes[0].stopped,
    `kept/refused run completes: a refused keep neither throws nor ends the run (${threw || resRef?.failed || `${resRef?.outcomes.length} outcome(s)`})`);
  const wrongRef = ref.placed.filter((p, i) => labelsOf(p)[0] !== `Email ${i + 1}`).map((p) => p.name);
  ok(wrongRef.length === 0, `kept/refused filled: every instance is filled from the in-memory capture (${ref.placed.length - wrongRef.length}/${ref.placed.length})`);
  const oRef = resRef?.outcomes[0];
  const vRef = resRef ? applyVerdict(resRef) : null;
  ok(oRef?.unkept?.[0]?.refused === 'Error: plugin data too large'
    && !!vRef?.lines.includes('checkbox-group: Figma refused to save its placed instances\' slot content on the set (Error: plugin data too large), so only this run carries it.'),
    `kept/refused named: the set's outcome names the refusal and that only this run carried it (${JSON.stringify(oRef?.unkept)})`);
  const settled = await previewUpdate(ref.w.host, [target]);
  ok(setUpToDate(settled.sets[0]), `kept/refused settles: the next dry run reads the set up to date (${JSON.stringify(settled.sets[0].counts)})`);

  // The write itself, directly: never throws, and a capture over the bound is not written.
  const calls: string[] = [];
  const node = { setSharedPluginData: (_ns: string, _k: string, v: string) => { calls.push(v); if (v) throw new Error('refused'); } };
  const cap = { slot: 'items', instances: [{ id: 'I:1', name: 'x', page: '', member: '', rows: [], hidden: [], lost: [] }] };
  let u: ReturnType<typeof keepCarry> = null, threwDirect = '';
  try { u = keepCarry(node, 'rows', cap); } catch (e) { threwDirect = (e as Error).message; }
  ok(!threwDirect && u?.refused === 'Error: refused' && calls.at(-1) === '', `kept/refused direct: a refused write is caught, reported and the entry cleared (${threwDirect || JSON.stringify(u)}; ${JSON.stringify(calls.map((c) => c.length))})`);
}

section('kept/malformed — an entry this version can\'t read is ignored, named, and cleared by the set\'s next write (#3796 review B2)');
{
  // `keptCarry` checked only that `instances` was an array, so `{"instances":[null]}` threw inside `previewUpdate`, outside
  // `applyUpdate`'s #3697 L1 catch, and nothing cleared it. Mutation: the validation back to `Array.isArray(instances)` →
  // `kept/malformed preview` and `kept/malformed apply` for the null, no-rows and wrong-typed cases.
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const good = { id: 'I:9', name: 'Old', page: 'Designs', member: 'm', rows: [], hidden: [], lost: [] };
  const CASES: [string, string][] = [
    ['unparsable', '{"instances":[{'],
    ['null instance', '{"slot":"items","instances":[null]}'],
    ['no rows', JSON.stringify({ slot: 'items', instances: [{ ...good, rows: undefined }] })],
    ['wrong-typed id', JSON.stringify({ slot: 'items', instances: [{ ...good, id: 9 }] })],
    ['null row', JSON.stringify({ slot: 'items', instances: [{ ...good, rows: [null] }] })],
    ['wrong-typed row main', JSON.stringify({ slot: 'items', instances: [{ ...good, rows: [{ row: 'row1', main: { id: 1 }, props: {}, exposed: [] }] }] })],
  ];
  for (const [what, bad] of CASES) {
    const w = await world(LEGACY['checkbox-group'](), target.plans);
    const members = w.set().children as Node[];
    const placed = members.map((m, i) => w.put(place(`Mal ${i + 1}`, m, w.set(), {}, { row1: { props: { 'Label#1:0': `Email ${i + 1}` } } }), m));
    (w.set().setSharedPluginData as (ns: string, k: string, v: string) => void)('prism3', 'slotCarry', bad);
    let pre: Awaited<ReturnType<typeof previewUpdate>> | null = null, threw = '';
    try { pre = await previewUpdate(w.host, [target]); } catch (e) { threw = (e as Error).message; }
    let lines: string[] = [];
    try { lines = pre ? previewVerdict(pre).lines : []; } catch (e) { threw ||= (e as Error).message; }
    const named = lines.includes('checkbox-group: slot content saved by an earlier update can\'t be read, so this update ignores it. The set\'s next update clears it.');
    ok(!!pre && !threw && named && JSON.stringify(pre.sets[0].carryUnreadable) === '["rows"]' && pre.sets[0].slotMigration?.instances.length === placed.length,
      `kept/malformed preview (${what}): the dry run doesn't throw, names the entry, and reads the instances afresh (${threw || `${pre?.sets[0].slotMigration?.instances.length} read; named ${named}`})`);
    if (!pre) continue;
    let res: Awaited<ReturnType<typeof applyUpdate>> | null = null;
    try { res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre)); } catch (e) { threw = (e as Error).message; }
    const wrong = placed.filter((p, i) => (slotOf(p)?.children ?? []).map((x) => (x.componentProperties as Record<string, { value: Val }>)['Label#1:0']?.value)[0] !== `Email ${i + 1}`).length;
    const left = (w.set().getSharedPluginData as (ns: string, k: string) => string)('prism3', 'slotCarry');
    ok(!!res && !threw && !res.failed && wrong === 0 && left === '',
      `kept/malformed apply (${what}): the apply doesn't throw, carries every instance and clears the entry (${threw || res?.failed || `${wrong} wrong; ${left.length} chars left`})`);
  }

  // A malformed entry of a kind this set has nothing to carry for (a text entry on a Checkbox group): the set's write
  // clears it all the same. Mutation: the apply's clear of an unreadable entry dropped → `kept/malformed cleared alone`.
  {
    const w = await world(LEGACY['checkbox-group'](), target.plans);
    const m0 = (w.set().children as Node[])[0];
    w.put(place('Alone', m0, w.set(), {}, { row1: { props: { 'Label#1:0': 'Email' } } }), m0);
    (w.set().setSharedPluginData as (ns: string, k: string, v: string) => void)('prism3', 'slotTextCarry', '{"instances":[null]}');
    const pre = await previewUpdate(w.host, [target]);
    const res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre));
    const left = (w.set().getSharedPluginData as (ns: string, k: string) => string)('prism3', 'slotTextCarry');
    ok(JSON.stringify(pre.sets[0].carryUnreadable) === '["text"]' && !res.failed && left === '',
      `kept/malformed cleared alone: an unreadable entry with nothing of its kind to carry is cleared by the set's write (${JSON.stringify(pre.sets[0].carryUnreadable)}; ${res.failed ?? 'finished'}; ${left.length} chars left)`);
    // On a set already up to date (proof H): the dry run and the apply read it without a throw, and it stays up to date.
    (w.set().setSharedPluginData as (ns: string, k: string, v: string) => void)('prism3', 'slotCarry', '{"instances":[null]}');
    let threw = '', again: Awaited<ReturnType<typeof previewUpdate>> | null = null, res2: Awaited<ReturnType<typeof applyUpdate>> | null = null;
    try { again = await previewUpdate(w.host, [target]); res2 = await applyUpdate(w.host, w.api as any, [target], previewHashOf(again)); } catch (e) { threw = (e as Error).message; }
    ok(!threw && !!again && setUpToDate(again.sets[0]) && JSON.stringify(again.sets[0].carryUnreadable) === '["rows"]' && !res2?.failed,
      `kept/malformed up to date: on an up-to-date set the dry run and the apply don't throw, and the set still reads up to date (${threw || JSON.stringify(again?.sets[0].counts)})`);
    // #3803: the apply clears it although the set has no other work, so the next check no longer names it, and the set
    // still reads up to date. Mutation: the apply's clear of an unreadable entry on a set with no write dropped
    // (`clearUnread` a no-op) → `kept/malformed up to date cleared`.
    const leftU = (w.set().getSharedPluginData as (ns: string, k: string) => string)('prism3', 'slotCarry');
    const third = await previewUpdate(w.host, [target]);
    const namedU = previewVerdict(third).lines.some((l) => l.includes("slot content saved by an earlier update can't be read"));
    ok(leftU === '' && !third.sets[0].carryUnreadable && !namedU && setUpToDate(third.sets[0]),
      `kept/malformed up to date cleared: the apply clears the entry on a set with no other work, and the next check reads it up to date and names nothing (${leftU.length} chars left; ${JSON.stringify(third.sets[0].carryUnreadable)}; named ${namedU}; ${previewVerdict(third).headline})`);
  }

  // The read itself, for both kinds, every field: a wrong type anywhere is unreadable, never a throw.
  const at = (v: string) => ({ getSharedPluginData: () => v });
  const t0 = { id: 'T:1', name: 'b', page: '', member: '', case: { kind: 'move', characters: 'Hi' } };
  const text = (inst: unknown, top: Record<string, unknown> = {}) => JSON.stringify({ slot: 'body', property: 'body text', show: 'rich body', hide: 'body', instances: [inst], ...top });
  const TEXT: [string, string, boolean][] = [
    ['valid', text(t0), true],
    ['null instance', text(null), false],
    ['unknown case', text({ ...t0, case: { kind: 'other' } }), false],
    ['characters a number', text({ ...t0, case: { kind: 'move', characters: 3 } }), false],
    ['rich without layers', text({ ...t0, case: { kind: 'rich' } }), false],
    ['property missing', text(t0, { property: undefined }), false],
    ['nested not true', text({ ...t0, nested: 'yes' }), false],
    ['unparsable', '{', false],
  ];
  const wrongText = TEXT.filter(([, v, readable]) => { try { const r = readCarry(at(v), 'text'); return readable ? !r.capture || r.unreadable : !!r.capture || !r.unreadable; } catch { return true; } }).map(([n]) => n);
  ok(wrongText.length === 0, `kept/malformed text read: every text field is checked, and a bad one reads as unreadable, never a throw (wrong: ${wrongText.join(', ') || 'none'})`);
}

// ---- failed --------------------------------------------------------------------------------------------------------

section('failed — a throw outside the set\'s write returns what was done, not nothing (#3697 L1)');
{
  // The set's write finishes; then the slot fill throws (an instance whose layers can no longer be read), outside the
  // build's pass and outside the fill's own catches. `applyUpdate` used to throw, so the caller wrote no ledger for the
  // set and the verdict was one "update failed" line. Mutation: the catch around the writes dropped → `failed/returned`.
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY['checkbox-group'](), target.plans);
  const medium = memberNamed(w.set(), 'status=default, size=medium');
  const inst = w.put(place('Broken', medium, w.set(), {}, { row1: { props: { 'Label#1:0': 'Email' } } }), medium);
  const pre = await previewUpdate(w.host, [target]);
  // Armed once the dry run has read it: from then on, reading the instance's layers throws.
  const real = Object.getOwnPropertyDescriptor(inst, 'children')!.get!;
  let armed = false;
  for (const m of w.set().children as Node[]) {
    const set = m.setSharedPluginData as (ns: string, k: string, v: string) => void;
    m.setSharedPluginData = (ns: string, k: string, v: string) => { if (k === UPDATING_KEY && v) armed = true; set.call(m, ns, k, v); };
  }
  Object.defineProperty(inst, 'children', { configurable: true, get: () => { if (armed && !w.set().children.some((m) => (m.getSharedPluginData as (a: string, b: string) => string)('prism3', UPDATING_KEY))) throw new Error('the instance could not be read'); return real.call(inst); } });
  let res: Awaited<ReturnType<typeof applyUpdate>> | null = null, threw = '';
  try { res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre)); } catch (e) { threw = (e as Error).message; }
  ok(!!res && !threw, `failed/returned: the run returns its result rather than throwing (${threw || 'returned'})`);
  // #4205: as `failureDetail` gives it, the class in front, so Report a problem keeps the class alone.
  ok(res?.failed === 'Error: the instance could not be read', `failed/why: the result says why the run ended (${res?.failed})`);
  const o = res?.outcomes[0];
  ok(!!o && o.set === 'checkbox-group' && o.updated.length > 0 && !o.stopped,
    `failed/partial: the set written before the throw is in the result, with its members updated (${o?.updated.length ?? 0})`);
  const v = res ? applyVerdict(res) : null;
  ok(!!v && !v.ok && v.headline === '✗ update failed' && v.lines[0].startsWith('The update failed: Error: the instance could not be read.') && v.lines.slice(1).some((l) => l.startsWith('checkbox-group:')),
    `failed/verdict: the verdict fails, says why first, and keeps the set's line for what was done (${v?.headline}; ${JSON.stringify(v?.lines.slice(0, 2))})`);
  // #3758: a run that threw did not go through every set, so Update file's run must stop there, not go on as a warning.
  ok(v?.completed === false, `failed/not completed: a thrown update's verdict says the run did not complete (completed ${String(v?.completed)})`);
}

// ---- finished, slot missing (#3763 N1) ------------------------------------------------------------------------------

section('finished/missing slot — on a set that finished, an instance with no slot after the update is a named miss (#3763)');
{
  // `reachedOnly` (#3697 H1) silences the miss only on a STOPPED set, where an unreached instance has no slot yet. On a
  // finished set every member was reached, so an instance still with no slot is content not carried, and is named.
  // Mutation: the fill's `reachedOnly` passed as `true` on every set → `finished/missing slot named`.
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY['checkbox-group'](), target.plans);
  const medium = memberNamed(w.set(), 'status=default, size=medium');
  const fine = w.put(place('Carried', medium, w.set(), {}, { row1: { props: { 'Label#1:0': 'Email' } } }), medium);
  const hidden = w.put(place('Slotless', medium, w.set(), {}, { row1: { props: { 'Label#1:0': 'SMS' } } }), medium);
  // This instance never shows a slot: its layers are its member's, with any SLOT left out.
  const real = Object.getOwnPropertyDescriptor(hidden, 'children')!.get!;
  Object.defineProperty(hidden, 'children', { configurable: true, get: () => (real.call(hidden) as Model[]).filter((c) => c.type !== 'SLOT') });
  const pre = await previewUpdate(w.host, [target]);
  const res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre));
  const o = res.outcomes[0];
  ok(!o?.stopped && !!slotOf(fine) && !slotOf(hidden),
    `premise: the set finished, one instance holds its slot and the other shows none (${o?.stopped ?? 'finished'}; ${!!slotOf(fine)}, ${!!slotOf(hidden)})`);
  ok((o?.content ?? []).includes('checkbox-group instance "Slotless": has no "items" slot after the update'),
    `finished/missing slot named: the instance with no slot is a miss naming it (${JSON.stringify(o?.carried?.misses)})`);
}

// ---- refused (#3763 R2) --------------------------------------------------------------------------------------------

section('refused — a set the update refuses carries nothing and changes no instance (#3763)');
{
  // A set the dry run blocks is refused before anything is written, and its instances keep their rows: no fill runs.
  // The host here lists none of the variables the plans bind, so the dry run lists them as blockers and the apply
  // refuses the set. Mutation: the apply's preflight refusal not skipping the set (its `continue` dropped) →
  // `refused/rows kept`.
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY['checkbox-group'](), target.plans);
  const host = { ...w.host, variables: { ...(w.host as any).variables, getLocalVariablesAsync: async () => [] } } as unknown as typeof w.host;
  const medium = memberNamed(w.set(), 'status=default, size=medium');
  const inst = w.put(place('Blocked', medium, w.set(), {}, { row1: { props: { 'Label#1:0': 'Email' }, control: 'checked' } }), medium);
  const pre = await previewUpdate(host, [target]);
  ok(pre.sets[0]?.blockers.length > 0 && !!pre.sets[0].slotMigration?.instances.length,
    `premise: the dry run blocks the set and still lists the instance it would carry (${pre.sets[0]?.blockers.length} blockers)`);
  const res = await applyUpdate(host, w.api as any, [target], previewHashOf(pre));
  const o = res.outcomes[0];
  ok(!!o?.refused && !o.carried && !o.carriedText && o.updated.length === 0,
    `refused/nothing carried: the set is refused and no fill runs (${o?.refused}; carried ${JSON.stringify(o?.carried)}; ${o?.updated.length} updated)`);
  const label = (inst.children.find((c) => c.name === 'row1')?.componentProperties as Record<string, { value: Val }> | undefined)?.['Label#1:0']?.value;
  ok(!slotOf(inst) && label === 'Email', `refused/rows kept: the instance keeps its rows and its label, with no slot (${label}; slot ${!!slotOf(inst)})`);
}

// ---- tabs ----------------------------------------------------------------------------------------------------

section('tabs — four tabs, the third selected, keep their count, order and selection');
{
  const target: UpdateTarget = { def: 'tabs', plans: figmaAnatomySet(defOf('tabs'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY.tabs(), target.plans);
  const member = memberNamed(w.set(), 'size=medium, alignment=start') ?? (w.set().children as Node[])[0];
  const four = w.put(place('Account tabs', member, w.set(), { 'Tab 4': true }, {
    tab1: { variant: 'selection=unselected, size=medium, state=rest', props: { 'Label#1:0': 'Profile' } },
    tab2: { props: { 'Label#1:0': 'Security' } },
    tab3: { variant: 'selection=selected, size=medium, state=rest', props: { 'Label#1:0': 'Billing' } },
    tab4: { props: { 'Label#1:0': 'Team' } },
  }), member);
  const pre = await previewUpdate(w.host, [target]);
  const cap = pre.sets[0].slotMigration?.instances[0];
  ok(!!cap && cap.rows.length === 4 && JSON.stringify(cap.hidden) === JSON.stringify(['tab5', 'tab6']), `tabs/dry run: four tabs carried, tabs 5 and 6 hidden (${JSON.stringify(cap)})`.slice(0, 600));
  const res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre));
  const o = res.outcomes[0];
  ok(!!o?.carried && o.carried.items === 4 && !o.carried.misses.length, `tabs/carried: four items (${JSON.stringify(o?.carried)})`);
  const items = slotOf(four)?.children ?? [];
  const sel = await Promise.all(items.map(async (x) => String((await (x.getMainComponentAsync as () => Promise<Model>)()).name)));
  ok(JSON.stringify(items.map((x) => (x.componentProperties as Record<string, { value: Val }>)['Label#1:0'].value)) === JSON.stringify(['Profile', 'Security', 'Billing', 'Team'])
    && sel[2].startsWith('selection=selected') && sel.filter((s) => s.startsWith('selection=selected')).length === 1,
    `tabs/selection: the four tabs in order, the third the one selected (${JSON.stringify(sel)})`);
}

// ---- list -----------------------------------------------------------------------------------------------------

section('list — every item on carries all eight');
{
  const target: UpdateTarget = { def: 'list', plans: figmaAnatomySet(defOf('list'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY.list(), target.plans);
  const member = (w.set().children as Node[])[0];
  const on = Object.fromEntries([4, 5, 6, 7, 8].map((i) => [`Item ${i}`, true]));
  const rows = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [`item${i}`, { props: { 'Label#1:0': `Rule ${i}` } }]));
  const eight = w.put(place('Password rules', member, w.set(), on, rows), member);
  const pre = await previewUpdate(w.host, [target]);
  const res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre));
  const items = slotOf(eight)?.children ?? [];
  ok(items.length === 8 && items.every((x, i) => (x.componentProperties as Record<string, { value: Val }>)['Label#1:0'].value === `Rule ${i + 1}`) && !res.outcomes[0].carried?.misses.length,
    `list/eight: all eight items carried in order (${items.length}; ${JSON.stringify(res.outcomes[0].carried)})`);
}

// ---- segmented control ------------------------------------------------------------------------------------------

section('segmented — rows that sat in a kept `track` layer: four options, the second selected, with the label on');
{
  const target: UpdateTarget = { def: 'segmented-control', plans: figmaAnatomySet(defOf('segmented-control'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY['segmented-control'](), target.plans);
  const member = (w.set().children as Node[])[0];
  const four = w.put(place('View switcher', member, w.set(), { 'Segment 4': true }, {
    segment1: { variant: 'selection=unselected, size=medium, state=rest', props: { 'Label#1:0': 'List' } },
    segment2: { variant: 'selection=selected, size=medium, state=rest', props: { 'Label#1:0': 'Grid' } },
    segment3: { props: { 'Label#1:0': 'Board' } },
    segment4: { props: { 'Label#1:0': 'Map' } },
  }), member);
  const pre = await previewUpdate(w.host, [target]);
  const cap = pre.sets[0].slotMigration?.instances[0];
  ok(!!cap && JSON.stringify(cap.rows.map((r) => r.row)) === JSON.stringify(['segment1', 'segment2', 'segment3', 'segment4']) && JSON.stringify(cap.hidden) === JSON.stringify(['segment5']),
    `segmented/dry run: four options carried, the fifth hidden (${JSON.stringify(cap?.rows.map((r) => r.row))}, hidden ${JSON.stringify(cap?.hidden)})`);
  const res = await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre));
  const items = slotOf(four)?.children ?? [];
  const sel = await Promise.all(items.map(async (x) => String((await (x.getMainComponentAsync as () => Promise<Model>)()).name)));
  ok(items.length === 4 && JSON.stringify(items.map((x) => (x.componentProperties as Record<string, { value: Val }>)['Label#1:0'].value)) === JSON.stringify(['List', 'Grid', 'Board', 'Map'])
    && sel[1].startsWith('selection=selected') && sel.filter((x) => x.startsWith('selection=selected')).length === 1 && !res.outcomes[0].carried?.misses.length,
    `segmented/carried: four options in order, the second the one selected (${JSON.stringify(sel)}; ${JSON.stringify(res.outcomes[0].carried)})`);
  ok(items.every((x) => x.layoutGrow === 1), `segmented/layout: every carried option grows along the slot as the default options do (${items.map((x) => String(x.layoutGrow)).join(',')})`);
}

// ---- dialog (#2661): onto the nested Button.Group's kept defaults ---------------------------------------------------

section('dialog — the footer buttons move into the nested Button.Group slot, keeping only what a designer changed');
{
  const entry = slotMigrationOf('dialog', COMPONENT_RENAMES)!;
  ok(!!entry && entry.within === 'button-group' && entry.slot === 'items' && JSON.stringify(entry.from) === JSON.stringify(['footerInline', 'footerStacked'])
    && JSON.stringify(entry.rows) === JSON.stringify(['cancelInline', 'confirmInline', 'confirmStacked', 'cancelStacked']) && entry.booleans.length === 0 && entry.issue === 2661,
    `dialog/ledger: one slot entry, within button-group, from the two old footer layers, its four old buttons in order (${JSON.stringify(entry)})`);
  // THE MODEL. The old Button set (its label default "Button"), a Dialog member's old footer, and placed instances whose
  // tree switches to the new shape once the "update" has run: footer/actionsInline/items, holding Cancel and Save.
  let updated = false;
  const mk = (o: Record<string, unknown>): MigNode => o as MigNode;
  const btnSet = mk({ id: 'S:button', name: 'button', type: 'COMPONENT_SET', componentPropertyDefinitions: { 'label#1:1': { type: 'TEXT', defaultValue: 'Button' } } });
  const btnMain = (appearance: string) => mk({ id: `M:${appearance}`, name: `appearance=${appearance}, size=medium`, type: 'COMPONENT', parent: btnSet });
  const oldButton = (id: string, name: string, appearance: string, label: string): MigNode => {
    const main = btnMain(appearance);
    return mk({ id, name, type: 'INSTANCE', visible: true, componentProperties: { 'label#1:1': { type: 'TEXT', value: label } }, getMainComponentAsync: async () => main });
  };
  const newItem = (name: string, key: string, label: string): MigNode => {
    const values: Record<string, { type: string; value: string }> = { [key]: { type: 'TEXT', value: label } };
    const n = mk({ id: `N:${name}:${Math.random()}`, name, type: 'INSTANCE' });
    Object.defineProperty(n, 'componentProperties', { get: () => JSON.parse(JSON.stringify(values)) });
    n.setProperties = (p) => { for (const [k, v] of Object.entries(p)) { if (!values[k]) throw new Error(`no property ${k}`); values[k].value = String(v); } };
    return n;
  };
  const placed: MigNode[] = [];
  const dialogInstance = (name: string, oldRows: () => MigNode[], overrides: { id: string; overriddenFields: string[] }[]): MigNode => {
    const old = oldRows();
    // The new defaults: Cancel a Button.Neutral (its own label key), Save a Button.
    const items = [newItem('cancel', 'label#7:7', 'Cancel'), newItem('save', 'label#1:1', 'Save')];
    const slot = mk({ id: `${name}:slot`, name: 'items', type: 'SLOT', children: items, appendChild: () => { throw new Error('the within fill appends nothing'); } });
    for (const it of items) (it as Record<string, unknown>).remove = () => { throw new Error('the within fill removes nothing'); };
    const inst = mk({ id: `PI:${name}`, name, type: 'INSTANCE', parent: mk({ type: 'PAGE', name: 'Designs' }), overrides });
    Object.defineProperty(inst, 'children', { get: () => (updated
      ? [mk({ name: 'footer', type: 'FRAME', children: [mk({ name: 'actionsInline', type: 'INSTANCE', children: [slot] })] })]
      : [mk({ name: 'footerInline', type: 'FRAME', children: old })]) });
    for (const r of old) (r as Record<string, unknown>).parent = inst;
    placed.push(inst);
    return inst;
  };
  const typed = dialogInstance('Delete address', () => [oldButton('a1', 'cancelInline', 'outline', 'Keep'), oldButton('a2', 'confirmInline', 'filled', 'Delete')], [{ id: 'a1', overriddenFields: ['componentProperties'] }, { id: 'a2', overriddenFields: ['componentProperties'] }]);
  dialogInstance('Untouched', () => [oldButton('b1', 'cancelInline', 'outline', 'Button'), oldButton('b2', 'confirmInline', 'filled', 'Button')], []);
  const swappedInst = dialogInstance('Swapped', () => [oldButton('c1', 'cancelInline', 'outline', 'Button'), oldButton('c2', 'confirmInline', 'filled', 'Remove')], [{ id: 'c1', overriddenFields: ['mainComponent'] }, { id: 'c2', overriddenFields: ['componentProperties'] }]);
  const member = mk({ id: 'DM:1', name: 'placement=center, footer=inline, size=medium', type: 'COMPONENT', getInstancesAsync: async () => placed });
  const set = mk({ id: 'DS', name: 'dialog', type: 'COMPONENT_SET', children: [member] });
  const { migration, live } = await captureSlotMigration(set, entry, 'panel', new Set(['panel', 'footer', 'actionsInline']));
  const byName = (n: string) => migration.instances.find((c) => c.name === n);
  ok(migration.within === 'button-group' && !byName('Untouched') && JSON.stringify(byName('Delete address')?.rows.map((r) => [r.row, r.at, r.props])) === JSON.stringify([['cancelInline', 0, { 'label#1:1': 'Keep' }], ['confirmInline', 1, { 'label#1:1': 'Delete' }]]),
    `dialog/only changes: the typed instance carries "Keep" and "Delete" at positions 1 and 2, and the untouched one (still "Button") is left out (${JSON.stringify(migration.instances.map((c) => [c.name, c.rows.map((r) => r.props)]))})`);
  const sw = byName('Swapped');
  ok(!!sw && sw.lost.some((l) => /cancelInline: swapped to appearance=outline/.test(l)) && JSON.stringify(sw.rows.map((r) => r.props)) === JSON.stringify([{}, { 'label#1:1': 'Remove' }].filter((p) => Object.keys(p).length)),
    `dialog/swapped named: a button swapped by hand is named as not carried, and the other's label still carries (${JSON.stringify(sw)})`.slice(0, 600));
  const lines = migrationLines('dialog', migration);
  ok(/moves? into the "items" slot of a nested button-group/.test(lines[0]) && lines.some((l) => /"Delete address".*keep their changes.*"Keep"; "Delete"/.test(l)) && lines.some((l) => /"Swapped".*Can't carry over: cancelInline: swapped/.test(l)),
    `dialog/dry run: the lines name the nested slot, what each instance keeps, and what can't carry over (${JSON.stringify(lines)})`.slice(0, 700));
  updated = true;
  const out = await fillSlots('dialog', entry, live, migration);
  const labels = (inst: MigNode) => (((inst.children ?? [])[0]?.children ?? [])[0]?.children?.[0]?.children ?? []).map((x) => Object.values(x.componentProperties ?? {})[0]?.value);
  ok(out.misses.length === 0 && JSON.stringify(labels(typed)) === JSON.stringify(['Keep', 'Delete']) && JSON.stringify(labels(swappedInst)) === JSON.stringify(['Cancel', 'Remove']) && out.items === 3,
    `dialog/defaults kept: the slot's default buttons stay and take the changed labels by name, across label keys ("Keep", "Delete"; "Cancel" kept, "Remove") (${JSON.stringify({ misses: out.misses, typed: labels(typed), swapped: labels(swappedInst), items: out.items })})`);
  // THE UPDATE FINDS THE OLD SHAPE in either footer layer: a set whose only member holds `footerStacked` still migrates.
  const stackedOnly = mk({ id: 'DS2', name: 'dialog', type: 'COMPONENT_SET', children: [mk({ id: 'DM:2', name: 'm', type: 'COMPONENT', getInstancesAsync: async () => [], children: [mk({ name: 'footerStacked', type: 'FRAME', children: [mk({ name: 'confirmStacked' }), mk({ name: 'cancelStacked' })] })] })] });
  const plans = figmaAnatomySet(defOf('dialog'), { swapTarget: SWAP_TARGET });
  const found = await slotMigrationFor({ def: 'dialog', plans }, stackedOnly);
  const current = await slotMigrationFor({ def: 'dialog', plans }, mk({ id: 'DS3', name: 'dialog', type: 'COMPONENT_SET', children: [mk({ id: 'DM:3', name: 'm', type: 'COMPONENT', children: [mk({ name: 'footer', type: 'FRAME', children: [] })] })] }));
  ok(!!found && current === null, `dialog/old shape: a set with the stacked footer's old buttons migrates, and one already holding the group does not (${!!found}, ${current === null})`);
}

section('report — a placed instance\'s name, page and text stay out of Report a problem (#4351)');
{
  // The slot migrations name each placed instance by the client's own layer and page names, and the line carries the
  // client's own text (the rows' labels, the body that moves). The drawer keeps it; Report a problem must not. The
  // names and labels are literals typed here, and the lines come from the plugin's own dry run and builders, so only the
  // report's rule (`reduceInstance`, studio `report.ts`) can take them out. Mutation: `reduceInstance` dropped from
  // `reduceFailure` → `#4351 report/instance: … the check's line` and the others below, by name.
  const { buildReport } = await import('../studio/src/state/report');
  const { slotTextLine, fillSlotText } = await import('./src/slot-text-migration');
  const SECRET = /Checkout Hero|Unannounced|Spring Sale|Members only/;
  const report = (lines: string[]): string => buildReport({ stamp: 's', engine: 'e', host: 'figma', includeBrand: false, seen: [], brand: null,
    activity: [{ title: 'Update file', verdict: '⚠ check', lines, agent: false }] });
  const target: UpdateTarget = { def: 'checkbox-group', plans: figmaAnatomySet(defOf('checkbox-group'), { swapTarget: SWAP_TARGET }) };
  const w = await world(LEGACY['checkbox-group'](), target.plans);
  const medium = memberNamed(w.set(), 'status=default, size=medium');
  const hero = w.put(place('Checkout Hero', medium, w.set(), {}, { row1: { props: { 'Label#1:0': 'Spring Sale' } } }), medium);
  const pre = await previewUpdate(w.host, [target]);
  const check = previewVerdict(pre).lines;
  const named = check.filter((l) => l.includes('Checkout Hero'));
  // The fills' own misses (#4393 review, should-fix 1): `fillSlots` and `fillSlotText` write their own `<set> instance
  // "<name>"`, apart from the dry run's, so each comes from the fill itself, never a typed copy of its wording. The rows
  // fill runs as `kept/edges` does: the next run reads the kept capture, plus one instance gone since, on a host that
  // finds no row component. The text fill reads back a value the host did not take, and an instance gone since.
  // Mutation: either fill's `where` copy changed (`instance '${c.name}'`) → `#4351 report/instance: … the rows fill's misses`
  // or `… the text fill's misses`, by name.
  await applyUpdate(w.host, w.api as any, [target], previewHashOf(pre));
  const cap = pre.sets[0].slotMigration!;
  const gone = { ...cap.instances[0], id: 'GONE:1', name: 'Unannounced' };
  (w.set().setSharedPluginData as (ns: string, k: string, v: string) => void)('prism3', 'slotCarry', JSON.stringify({ ...cap, instances: [...cap.instances, gone] }));
  slotOf(hero)?.children.splice(0);
  const blind = { ...(w.host as object), getNodeByIdAsync: async () => null } as unknown as ApplyHost;
  const rows = applyVerdict(await applyUpdate(blind, w.api as any, [target], previewHashOf(await previewUpdate(blind, [target])))).lines;
  const textEntry = slotTextMigrationOf('banner', COMPONENT_RENAMES)!;
  const bodies = await fillSlotText('banner', textEntry, 'richBody', new Map([['T:1', { id: 'T:1', name: 'Checkout Hero', setProperties: () => {},
    componentProperties: { 'body text#9:0': { type: 'TEXT', value: 'Members only' } } }]]), { slot: textEntry.slot, property: textEntry.property, show: textEntry.show, hide: textEntry.hide,
    instances: [{ id: 'T:1', name: 'Checkout Hero', page: 'Unannounced', member: 'm', case: { kind: 'move', characters: 'Spring Sale' } },
      { id: 'T:2', name: 'Unannounced', page: '', member: 'm', case: { kind: 'empty' } }] });
  const filled = (lines: string[]): boolean => lines.some((l) => l.includes('instance') && SECRET.test(l));
  ok(filled(rows) && filled(bodies.misses), `#4351 report/instance premise: each fill names the instance in its own misses (${JSON.stringify([rows.filter((l) => SECRET.test(l)), bodies.misses])})`.slice(0, 600));
  const cases: [string, string[]][] = [
    ['the check\'s line', check],
    ['the rows fill\'s misses', rows],
    ['the text fill\'s misses', bodies.misses],
    ['the slot text\'s line, with its page', [slotTextLine('banner', { property: 'body text', show: 'Show body', hide: 'Hide body' },
      { id: 'T:1', name: 'Checkout Hero', page: 'Unannounced', member: 'm', case: { kind: 'move', characters: 'Spring Sale' } })]],
    ['a name holding a quote and a line break', ['checkbox-group instance "Checkout "Hero"\nUnannounced": no longer in the file']],
  ];
  ok(named.length > 0 && named.some((l) => l.includes('Spring Sale')), `#4351 report/instance premise: the dry run names the instance and its label (${JSON.stringify(named)})`);
  for (const [name, lines] of cases) {
    const text = report(lines);
    const kept = text.split('\n').filter((l) => /\binstance ["'\[]/.test(l));
    ok(lines.some((l) => SECRET.test(l)) && !SECRET.test(text) && kept.length > 0 && kept.every((l) => l.endsWith(' instance [removed]')),
      `#4351 report/instance: the report keeps the set and cuts the instance's name, page and text, ${name} (${JSON.stringify(kept)})`);
  }
}

console.log(`\n${failed ? `✗ ${failed} of ${executed} failed` : `✓ slot migration: all pass — ${executed} assertions executed`}`);
if (failed) process.exit(1);
