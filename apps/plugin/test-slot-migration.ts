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
 *
 * Mutations, each failing by name:
 *   · the capture keeps hidden rows (`r.visible === false` check dropped) → `carry/hidden not resurrected`;
 *   · the fill drops `setProperties` → `carry/labels`, `carry/checked`;
 *   · the apply's capture-then-fill removed (`o.carried` not set) → `carry/count`, `tabs/carried`;
 *   · the dry run's migration lines dropped → `dry run/lines`;
 *   · the lost-override read dropped → `lost/named`.
 *   · the apply stops deleting removed properties → `converge/booleans gone`.
 */
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import type { ComponentDef, PartDef } from '@prism3/engine/component-schema';
import { componentDefs } from '@prism3/engine/components/index';
import { applyComponentPlan } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { makeShim, type Node, type Page } from './component-shim';
import { previewUpdate, previewVerdict, type UpdateTarget } from './src/update-plan';
import { applyUpdate, applyVerdict, previewHashOf, type ApplyHost } from './src/update-apply';

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
const world = async (oldDef: ComponentDef, newPlans: AnatomyPlan[]) => {
  const oldPlans = figmaAnatomySet(oldDef, { swapTarget: SWAP_TARGET });
  const all = [...oldPlans, ...newPlans];
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set([...all.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0'])],
    styles: [...new Set(all.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(all.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...all.flatMap((p) => planComps(p.root))])],
    page, liveRoot: true, identities: true, scaleConstrained: true,
  }) as any;
  const built = await applyComponentPlan(oldPlans, api);
  if (built.misses.length) throw new Error(`premise: the legacy set built with ${built.misses.length} miss(es): ${built.misses[0]}`);
  const host = { ...api, root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) } } as unknown as ApplyHost;
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
  const medium = memberNamed(w.set(), 'size=medium');
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
  ok(again.sets[0].properties.remove.length === 0,
    `converge/booleans gone: the next dry run has no property left to remove (${again.sets[0].properties.remove.map((p) => p.name).join(', ')})`);
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

console.log(`\n${failed ? `✗ ${failed} of ${executed} failed` : `✓ slot migration: all ${executed} pass`}`);
if (failed) process.exit(1);
