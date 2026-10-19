/**
 * REPEATING ROWS INTO A NATIVE SLOT, CARRIED ACROSS AN UPDATE (#2649, owner decision Q307 A).
 *
 * Checkbox group, Radio group, Tabs, List and Segmented control used to hold their repeating children as a fixed
 * stack of rows behind Figma-only BOOLEAN properties (#2344). They now hold them in a native `items` slot (#2417),
 * which a designer fills on an instance. An in-place update replaces the rows in every member with the slot, and
 * Figma carries nothing from the old rows to the new slot by itself: the rows' layers are gone, so every override a
 * designer made on them goes with them, and each placed instance would fall back to the slot's three default items.
 *
 * So the update carries the placed instances across itself, in two steps around the set's own update:
 *
 *   capture  BEFORE the set is touched, every instance of one of its members in the file (`getInstancesAsync` on each
 *            member) is read: its VISIBLE rows in the member's order (`slot` entry `rows` in `component-renames.ts`),
 *            and for each row the variant it points at, its own component property values (a label's text) and its
 *            exposed instances' values (a checkbox's checked state). A hidden row is not an item: it is listed and
 *            left out, never resurrected.
 *   fill     AFTER the set is updated, each instance's `items` slot is emptied of its default items and filled with
 *            one new instance per captured row, in order, made from the row's own variant, its values written back
 *            with `setProperties`. The new items take the layout the default items had (they stretch or grow as the
 *            plan's do). Read back after: the count, the order, the variant and every value written, and a slot whose
 *            contents break its limits (`limitViolations`) is named.
 *
 * NOTHING IS SILENT. What cannot carry over is named per instance, in the dry run and in the verdict:
 *   · an override on a row that no component property carries (a fill changed by hand, a text with no property, a
 *     resize), read off `InstanceNode.overrides` against each layer's own `componentPropertyReferences`;
 *   · an override on the layer that held the rows, where the plan no longer has that layer (Tabs' `list`);
 *   · an instance inside another instance: its layers are its holder's, so it follows that component and is not
 *     filled here;
 *   · a host that cannot list an instance's overrides, which is named rather than read as "none".
 *
 * A SLOT INSIDE A NESTED INSTANCE (#2661, the entry's `within`). Dialog's footer buttons moved into a nested Button.Group,
 * whose `items` slot already holds the same buttons by default (Cancel and Save, Cancel a Button.Neutral when the file
 * has it). So nothing is replaced: the capture keeps only the values a designer CHANGED on each row (a label typed over
 * the set's default), and the fill writes them onto the slot's default items in the same positions, by property name.
 * A row swapped to another component or hidden by hand does not carry and is named; an instance with nothing changed
 * is left out, since its new defaults are already right.
 *
 * MEASURED ON THE SHIM, NOT ON A REAL HOST: the fill writes children into a SLOT sublayer of an INSTANCE, which is
 * what a designer does by hand, and `setProperties` on a fresh instance. Neither has been probed through the plugin
 * API on a real file yet; the first run on the master file is that probe, and a refusal there is a miss by name.
 */
import type { ComponentRename } from '@prism3/engine/component-renames';

type SlotEntry = Extract<ComponentRename, { kind: 'slot' }>;
type Val = string | boolean;
/** The structural reads this module makes on the host. `figma`'s own nodes satisfy it. */
export type MigNode = {
  id?: string; name?: string; type?: string; visible?: boolean; parent?: MigNode | null; children?: readonly MigNode[];
  key?: string;
  /** On a set (#2661): the definitions, whose defaults tell a changed row value from the set's own. */
  componentPropertyDefinitions?: Record<string, { type?: string; defaultValue?: unknown }>;
  componentProperties?: Record<string, { type?: string; value?: unknown }>;
  componentPropertyReferences?: Record<string, string> | null;
  exposedInstances?: readonly MigNode[];
  overrides?: readonly { id: string; overriddenFields: readonly string[] }[];
  limitViolations?: readonly string[];
  getMainComponentAsync?(): Promise<MigNode | null>;
  getInstancesAsync?(): Promise<readonly MigNode[]>;
  createInstance?(): MigNode;
  setProperties?(p: Record<string, Val>): void;
  appendChild?(n: MigNode): void;
  remove?(): void;
  layoutAlign?: string; layoutGrow?: number; layoutSizingHorizontal?: string; layoutSizingVertical?: string;
};

/** One visible row of a placed instance, as it moves into the slot. */
export type RowCapture = {
  row: string;
  /** The variant the row points at, by its name and its set's name. */
  main: { id: string; name: string; set: string };
  /** The row's own non-variant component property values, keyed as the host keys them (`Label#12:3`). */
  props: Record<string, Val>;
  /** Each exposed instance's values, VARIANT ones included (a checked state), by the exposed instance's name. */
  exposed: { name: string; props: Record<string, Val> }[];
  /** #2661 — the row's position among its layer's rows, the slot item it lands on when the slot keeps its defaults. */
  at?: number;
};
/** One placed instance of a migrating set. */
export type InstanceCapture = {
  id: string; name: string; page: string; member: string;
  rows: RowCapture[];
  /** Rows hidden on this instance: not items, never resurrected. */
  hidden: string[];
  /** What cannot carry over, each a short phrase naming the layer and the field. */
  lost: string[];
  /** Inside another instance: follows the component that holds it, not filled here. */
  nested?: true;
};
export type SlotMigration = { slot: string; instances: InstanceCapture[]; /** #2661 — the nested def whose slot keeps its defaults. */ within?: string };

/** Fields an override can carry on a row that the fill carries too: the row's own property values and variant. */
const ROW_CARRIED = new Set(['componentProperties', 'mainComponent', 'visible', 'name']);
/** A descendant's override field is carried when a component property drives it (`componentPropertyReferences`). */
const REF_FIELD: Record<string, string> = { characters: 'characters', visible: 'visible', mainComponent: 'mainComponent' };

const pageOf = (n: MigNode): string => {
  let p = n.parent;
  try { while (p && p.type !== 'PAGE') p = p.parent; } catch { return ''; }
  return String(p?.name ?? '');
};
const insideInstance = (n: MigNode): boolean => {
  let p = n.parent;
  try { while (p) { if (p.type === 'INSTANCE') return true; p = p.parent; } } catch { return false; }
  return false;
};
const walk = (n: MigNode, path: string, out: Map<string, { layer: MigNode; path: string }>): void => {
  if (n.id !== undefined) out.set(String(n.id), { layer: n, path });
  for (const k of n.children ?? []) walk(k, path ? `${path}/${k.name}` : String(k.name), out);
};
const valuesOf = (n: MigNode, variants: boolean): Record<string, Val> => {
  const out: Record<string, Val> = {};
  for (const [k, v] of Object.entries(n.componentProperties ?? {})) {
    if (!variants && v?.type === 'VARIANT') continue;
    if (typeof v?.value === 'string' || typeof v?.value === 'boolean') out[k] = v.value;
  }
  return out;
};
const find = (n: MigNode, pred: (x: MigNode) => boolean): MigNode | undefined => {
  if (pred(n)) return n;
  for (const k of n.children ?? []) { const f = find(k, pred); if (f) return f; }
  return undefined;
};

/** The instances of a set's members in the file, each once. */
const instancesOf = async (set: MigNode, breathe?: () => Promise<void>): Promise<MigNode[]> => {
  const out: MigNode[] = [];
  const seen = new Set<string>();
  let k = 0;
  for (const m of set.children ?? []) {
    if (breathe && ++k % 24 === 0) await breathe();
    const list = m.getInstancesAsync ? await m.getInstancesAsync() : [];
    for (const i of list) { const id = String(i.id); if (!seen.has(id)) { seen.add(id); out.push(i); } }
  }
  return out;
};

/**
 * Every placed instance of `set` that still holds its rows the old way, read as it stands. `rootPart` is the plan's
 * root part name (the member itself); `planParts` are the part names the plan has, so an override on a layer the
 * update removes is named. Instances already holding the slot read no rows and are left out.
 */
export const captureSlotMigration = async (set: MigNode, entry: SlotEntry, rootPart: string, planParts: ReadonlySet<string>, breathe?: () => Promise<void>): Promise<{ migration: SlotMigration; live: Map<string, { inst: MigNode; rows: { layer: MigNode; main: MigNode }[] }> }> => {
  const instances: InstanceCapture[] = [];
  const live = new Map<string, { inst: MigNode; rows: { layer: MigNode; main: MigNode }[] }>();
  for (const inst of await instancesOf(set, breathe)) {
    const froms = typeof entry.from === 'string' ? [entry.from] : [...entry.from];
    const from = froms.includes(rootPart) ? inst : find(inst, (x) => x !== inst && froms.includes(String(x.name)));
    const kids = (from?.children ?? []).filter((c) => entry.rows.includes(String(c.name)));
    if (!from || !kids.length) continue;
    kids.sort((a, b) => entry.rows.indexOf(String(a.name)) - entry.rows.indexOf(String(b.name)));
    const member = await inst.getMainComponentAsync?.();
    const cap: InstanceCapture = { id: String(inst.id), name: String(inst.name ?? ''), page: pageOf(inst), member: String(member?.name ?? ''), rows: [], hidden: [], lost: [] };
    if (insideInstance(inst)) {
      cap.nested = true;
      cap.lost.push('inside another instance, so it follows the component that holds it and is not filled here');
      instances.push(cap);
      continue;
    }
    // What the instance overrides, by layer id, read once.
    const byId = new Map<string, { layer: MigNode; path: string }>();
    walk(inst, '', byId);
    let overrides: readonly { id: string; overriddenFields: readonly string[] }[] | null = null;
    try { overrides = Array.isArray(inst.overrides) ? inst.overrides : null; } catch { overrides = null; }
    if (!overrides) cap.lost.push('this host does not list overrides, so any on its rows beyond labels and states are not known and would not carry');
    const rows: { layer: MigNode; main: MigNode }[] = [];
    const swapped = new Set((overrides ?? []).filter((o) => o.overriddenFields.map(String).includes('mainComponent')).map((o) => String(o.id)));
    for (const [at, r] of kids.entries()) {
      if (r.visible === false) {
        // Onto kept defaults (#2661) a hidden row has no item to leave out: the slot's default button stays, and says so.
        if (entry.within) cap.lost.push(`${r.name}: hidden by hand, and the slot keeps its default button there`);
        else cap.hidden.push(String(r.name));
        continue;
      }
      const main = await r.getMainComponentAsync?.();
      if (!main) { cap.lost.push(`${r.name}: its component could not be read, so it can't become an item`); continue; }
      let props = valuesOf(r, false);
      if (entry.within) {
        if (swapped.has(String(r.id))) cap.lost.push(`${r.name}: swapped to ${String(main.name ?? 'another component')} by hand, and the slot keeps its default button there`);
        // Only what the designer changed: a value equal to its set's default is the old default, not a label to keep.
        let defs: Record<string, { defaultValue?: unknown }> | undefined;
        try { defs = main.parent?.type === 'COMPONENT_SET' ? main.parent.componentPropertyDefinitions : undefined; } catch { defs = undefined; }
        if (defs) props = Object.fromEntries(Object.entries(props).filter(([k, v]) => defs![k]?.defaultValue !== v));
      }
      cap.rows.push({
        row: String(r.name),
        main: { id: String(main.id), name: String(main.name ?? ''), set: String(main.parent?.type === 'COMPONENT_SET' ? main.parent.name : '') },
        props,
        exposed: (r.exposedInstances ?? []).map((e) => ({ name: String(e.name), props: valuesOf(e, true) })),
        ...(entry.within ? { at } : {}),
      });
      rows.push({ layer: r, main });
    }
    // THE OVERRIDES NOTHING CARRIES. On a visible row: any field no component property drives. On the layer that held
    // the rows, where the plan drops it: every field. A hidden row's overrides go with it, as the row does.
    const rowIds = new Map<string, MigNode>();
    for (const { layer } of rows) { const sub = new Map<string, { layer: MigNode; path: string }>(); walk(layer, '', sub); for (const id of sub.keys()) rowIds.set(id, layer); }
    const exposedIds = new Set(rows.flatMap(({ layer }) => (layer.exposedInstances ?? []).map((e) => String(e.id))));
    for (const o of overrides ?? []) {
      const at = byId.get(String(o.id));
      if (!at) continue;
      const row = rowIds.get(String(o.id));
      const fromGone = from !== inst && at.layer === from && !planParts.has(String(from.name));
      if (!row && !fromGone) continue;
      for (const f of o.overriddenFields) {
        const field = String(f);
        if (row && at.layer === row && ROW_CARRIED.has(field)) continue;
        if (row && exposedIds.has(String(o.id)) && (field === 'componentProperties' || field === 'mainComponent')) continue;
        const ref = REF_FIELD[field];
        if (row && ref && at.layer.componentPropertyReferences?.[ref]) continue;
        // Onto kept defaults (#2661), the row's own swap and visibility are already named above.
        if (entry.within && row && at.layer === row && (field === 'mainComponent' || field === 'visible')) continue;
        cap.lost.push(`${at.path || String(inst.name)}: ${field} changed by hand`);
      }
    }
    // Onto kept defaults (#2661), an instance that changed nothing is already right after the update: left out.
    if (entry.within) cap.rows = cap.rows.filter((r) => Object.keys(r.props).length > 0 || r.exposed.some((e) => Object.keys(e.props).length > 0));
    if (entry.within && !cap.rows.length && !cap.lost.length) continue;
    instances.push(cap);
    live.set(cap.id, { inst, rows });
  }
  return { migration: { slot: entry.slot, instances, ...(entry.within ? { within: entry.within } : {}) }, live };
};

// ---- the words (DRAFT, for the owner: #2649) -------------------------------------------------------------------

const quoted = (r: RowCapture): string => {
  const text = Object.entries(r.props).filter(([, v]) => typeof v === 'string').map(([, v]) => `"${v}"`);
  const states = r.exposed.flatMap((e) => Object.entries(e.props).filter(([k]) => !k.includes('#')).map(([k, v]) => `${k}=${String(v)}`));
  const own = /(^|, )selection=([^,]+)/.exec(r.main.name)?.[2];
  return [...text, ...(own ? [`selection=${own}`] : []), ...states].join(' ') || r.row;
};

/** One instance's line: what moves, in order, and what is left out. DRAFT. */
export const instanceLine = (set: string, c: InstanceCapture): string => {
  const where = `${set} instance "${c.name}"${c.page ? ` on ${c.page}` : ''}`;
  if (c.nested) return `${where}: ${c.lost[0]}.`;
  if (c.rows.some((r) => r.at !== undefined) || (!c.rows.length && c.lost.length)) {
    const kept = c.rows.length ? `${c.rows.length} button${c.rows.length === 1 ? '' : 's'} keep${c.rows.length === 1 ? 's' : ''} ${c.rows.length === 1 ? 'its' : 'their'} changes on the slot's default buttons, in order (${c.rows.map(quoted).join('; ')})` : 'nothing carries';
    const lost = c.lost.length ? ` Can't carry over: ${c.lost.join('; ')}.` : '';
    return `${where}: ${kept}.${lost}`;
  }
  const moves = `${c.rows.length} row${c.rows.length === 1 ? '' : 's'} become${c.rows.length === 1 ? 's' : ''} ${c.rows.length} item${c.rows.length === 1 ? '' : 's'} in the slot, in order (${c.rows.map(quoted).join('; ')})`;
  const hidden = c.hidden.length ? ` Hidden, so left out: ${c.hidden.join(', ')}.` : '';
  const lost = c.lost.length ? ` Can't carry over: ${c.lost.join('; ')}.` : '';
  return `${where}: ${moves}.${hidden}${lost}`;
};

/** The set's summary line, then one line per instance, every one listed. DRAFT. */
export const migrationLines = (set: string, m: SlotMigration): string[] => {
  if (m.within) {
    const head = `${set}: the buttons move into the "${m.slot}" slot of a nested ${m.within}, which holds the same buttons by default.`;
    if (!m.instances.length) return [`${head} No instance in this file changed them, so none needs carrying.`];
    return [`${head} ${m.instances.length} instance${m.instances.length === 1 ? '' : 's'} in this file keep${m.instances.length === 1 ? 's' : ''} what was changed on them.`, ...m.instances.map((c) => instanceLine(set, c))];
  }
  if (!m.instances.length) return [`${set}: the rows move into the "${m.slot}" slot. No instance in this file to carry across.`];
  const items = m.instances.reduce((k, c) => k + c.rows.length, 0);
  const lossy = m.instances.filter((c) => c.lost.length).length;
  return [
    `${set}: the rows move into the "${m.slot}" slot. ${m.instances.length} instance${m.instances.length === 1 ? '' : 's'} in this file carried across, ${items} item${items === 1 ? '' : 's'} in all${lossy ? `, ${lossy} with something that can't carry over` : ''}.`,
    ...m.instances.map((c) => instanceLine(set, c)),
  ];
};

// ---- the fill -------------------------------------------------------------------------------------------------

export type FillOutcome = { instances: number; items: number; misses: string[]; limits: string[] };

/**
 * Fill each captured instance's slot, after the set was updated. `live` is the capture's own node references, read
 * just before the set's update. Each instance is read back after its fill; a difference is a miss naming it.
 */
export const fillSlots = async (setName: string, entry: SlotEntry, live: Map<string, { inst: MigNode; rows: { layer: MigNode; main: MigNode }[] }>, captured: SlotMigration, breathe?: () => Promise<void>): Promise<FillOutcome> => {
  const out: FillOutcome = { instances: 0, items: 0, misses: [], limits: [] };
  let k = 0;
  for (const c of captured.instances) {
    if (c.nested) continue;
    if (breathe && ++k % 24 === 0) await breathe();
    const l = live.get(c.id);
    const where = `${setName} instance "${c.name}"`;
    if (!l) { out.misses.push(`${where}: no longer in the file`); continue; }
    const slot = find(l.inst, (x) => x.type === 'SLOT' && x.name === entry.slot);
    if (!slot) { out.misses.push(`${where}: has no "${entry.slot}" slot after the update`); continue; }
    if (entry.within) {
      // ONTO THE KEPT DEFAULTS (#2661): each changed value, by property name before Figma's `#id`, onto the slot's item at
      // the row's position. Nothing is removed or made. Read back after.
      let carried = 0;
      for (const r of c.rows) {
        const x = (slot.children ?? [])[r.at ?? -1];
        if (!x) { out.misses.push(`${where}: ${r.row} -> the slot has no button at position ${(r.at ?? -1) + 1} to carry it onto`); continue; }
        const keys = Object.keys(x.componentProperties ?? {});
        const write: Record<string, Val> = {};
        for (const [k, v] of Object.entries(r.props)) {
          const to = keys.find((y) => y.split('#')[0] === k.split('#')[0]);
          if (to) write[to] = v; else out.misses.push(`${where}: ${r.row} ${k.split('#')[0]} -> the slot's button has no such property`);
        }
        if (!Object.keys(write).length) continue;
        try { x.setProperties?.(write); } catch (err) { out.misses.push(`${where}: ${r.row} values -> REFUSED (${(err as Error)?.message ?? String(err)})`); continue; }
        const got = valuesOf(x, false);
        for (const [k, v] of Object.entries(write)) if (got[k] !== v) out.misses.push(`${where}: ${r.row} ${k.split('#')[0]} reads ${JSON.stringify(got[k])}, expected ${JSON.stringify(v)}`);
        carried++;
      }
      out.instances++;
      out.items += carried;
      continue;
    }
    if (!slot.appendChild) { out.misses.push(`${where}: its slot takes no content on this host`); continue; }
    // The layout the default items had, so a carried item stretches or grows as they do.
    const model = slot.children?.[0];
    const layout = model ? { layoutAlign: model.layoutAlign, layoutGrow: model.layoutGrow, layoutSizingHorizontal: model.layoutSizingHorizontal, layoutSizingVertical: model.layoutSizingVertical } : {};
    for (const d of [...(slot.children ?? [])]) d.remove?.();
    let made = 0;
    for (const [i, r] of c.rows.entries()) {
      const main = l.rows[i]?.main;
      if (!main?.createInstance) { out.misses.push(`${where}: ${r.row} -> NOT MADE (its component can't be instanced here)`); continue; }
      let x: MigNode;
      try { x = main.createInstance(); } catch (err) { out.misses.push(`${where}: ${r.row} -> NOT MADE (${(err as Error)?.message ?? String(err)})`); continue; }
      x.name = r.row;
      try { slot.appendChild(x); } catch (err) { out.misses.push(`${where}: ${r.row} -> REFUSED by the slot (${(err as Error)?.message ?? String(err)})`); x.remove?.(); continue; }
      for (const [f, v] of Object.entries(layout)) if (v !== undefined) (x as Record<string, unknown>)[f] = v;
      if (Object.keys(r.props).length) {
        try { x.setProperties?.(r.props); } catch (err) { out.misses.push(`${where}: ${r.row} values -> REFUSED (${(err as Error)?.message ?? String(err)})`); }
      }
      for (const e of r.exposed) {
        const target = (x.exposedInstances ?? []).find((y) => y.name === e.name);
        if (!target) { out.misses.push(`${where}: ${r.row} has no exposed ${e.name} to set`); continue; }
        try { target.setProperties?.(e.props); } catch (err) { out.misses.push(`${where}: ${r.row}/${e.name} values -> REFUSED (${(err as Error)?.message ?? String(err)})`); }
      }
      made++;
    }
    // READ BACK: the count, the order, each item's variant and every value written.
    const now = slot.children ?? [];
    if (now.length !== c.rows.length) out.misses.push(`${where}: the slot holds ${now.length} item(s), ${c.rows.length} were carried`);
    for (const [i, r] of c.rows.entries()) {
      const x = now[i];
      if (!x) continue;
      const main = await x.getMainComponentAsync?.();
      if (main && String(main.id) !== r.main.id) out.misses.push(`${where}: item ${i + 1} is ${String(main.name)}, expected ${r.main.name}`);
      const got = valuesOf(x, false);
      for (const [p, v] of Object.entries(r.props)) if (got[p] !== v) out.misses.push(`${where}: item ${i + 1} ${p.split('#')[0]} reads ${JSON.stringify(got[p])}, expected ${JSON.stringify(v)}`);
      for (const e of r.exposed) {
        const ex = (x.exposedInstances ?? []).find((y) => y.name === e.name);
        const g = ex ? valuesOf(ex, true) : {};
        for (const [p, v] of Object.entries(e.props)) if (g[p] !== v) out.misses.push(`${where}: item ${i + 1} ${e.name} ${p.split('#')[0]} reads ${JSON.stringify(g[p])}, expected ${JSON.stringify(v)}`);
      }
    }
    const lim = slot.limitViolations ?? [];
    if (lim.length) out.limits.push(`${where}: ${lim.join(', ')}`);
    out.instances++;
    out.items += made;
  }
  return out;
};
