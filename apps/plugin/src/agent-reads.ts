/**
 * THE AGENT LINK'S READ-ONLY NODE COMMANDS (#3147 Phase 2a, Q3147.10 A and Q3147.14 A): `inspect`, `component-keys`,
 * `audit-frames` and `snapshot`. They let an agent read the master (keys, instance properties, bindings) and check a
 * rebuild, so a file where Prism3 is open needs no second plugin for those reads.
 *
 * WRITE NOTHING. Every function below only reads: no property is assigned and no method that changes the file is
 * called, not even plugin data. Pages are LOADED (`loadAsync`), never switched to, so the owner's view does not move.
 * `test-agent-link.ts` and `test-agent-bridge.ts` run each command against `NodeShim` (`file-shim.ts`), whose write log
 * records every assignment and every call outside its read list, and require that log to stay empty.
 *
 * BOUNDED, because a crash here cannot be interrupted (the Mac mini's queue saw a slot walk crash a plugin twice): every
 * walk has a depth cap and a node cap, each node is read inside its own try/catch, and a node that cannot be read is
 * listed `unreadable` with the host's error while its siblings are still read. A cap that cuts a walk says
 * `truncated: true`; nothing is dropped silently.
 *
 * MAIN THREAD, but no plugin typings: the host is the structural `ReadHost` below (`figma` in `main.ts`, the shim in
 * the tests), and `figma.mixed` is read as "any symbol", so this file compiles under either tsconfig.
 *
 * NAMES NO BRAND. The legacy lists `audit-frames` checks against are the agent's data, passed in its args.
 */
import { INSPECT_FIELDS } from './agent-protocol';
import type { InspectArgs, ComponentKeysArgs, AuditFramesArgs, SnapshotArgs, InspectField } from './agent-protocol';

/** The defaults of the args an agent may leave out (their ranges are checked in `parseCommand`). */
export const READ_DEFAULTS = { depth: 1, maxNodes: 500, scale: 1 } as const;

/** The slice of a node these commands read. Every field is optional: a node of another type simply lacks it. */
export type ReadNode = {
  id: string;
  type: string;
  name: string;
  parent?: ReadNode | null;
  children?: readonly ReadNode[];
  width?: number;
  height?: number;
  locked?: boolean;
  visible?: boolean;
  key?: string;
  remote?: boolean;
  fills?: unknown;
  fillStyleId?: unknown;
  textStyleId?: unknown;
  characters?: string;
  boundVariables?: Record<string, unknown>;
  componentProperties?: Record<string, { type: string; value: unknown }>;
  componentPropertyDefinitions?: Record<string, { type: string; variantOptions?: string[] }>;
  layoutMode?: string;
  itemSpacing?: number;
  paddingTop?: number; paddingRight?: number; paddingBottom?: number; paddingLeft?: number;
  layoutSizingHorizontal?: string; layoutSizingVertical?: string;
  getMainComponentAsync?(): Promise<ReadNode | null>;
  getPublishStatusAsync?(): Promise<string>;
  getStyledTextSegments?(fields: string[]): Array<{ textStyleId?: unknown }>;
  findAllWithCriteria?(c: { types: string[] }): ReadNode[];
  exportAsync?(s: { format: 'PNG'; constraint: { type: 'SCALE'; value: number } }): Promise<Uint8Array>;
  loadAsync?(): Promise<void>;
};
export type ReadHost = {
  root: { children: readonly ReadNode[] };
  getNodeByIdAsync(id: string): Promise<ReadNode | null>;
  getStyleByIdAsync?(id: string): Promise<{ name: string } | null>;
  variables: { getVariableByIdAsync?(id: string): Promise<{ name: string } | null> };
};

/** A read whose args cannot be served by this file (a snapshot of a node that is not in it). The dispatcher answers
 *  it as a failed result with this code, not as `handler-threw`, which means a defect in the plugin. */
export class ReadRefusal extends Error {
  readonly code = 'bad-args' as const;
}

type Unreadable = { id: string; error: string };
const errText = (e: unknown): string => (e as Error)?.message ?? String(e);
/** A node's id, or `?` when even that read throws. */
const idOf = (n: ReadNode): string => { try { return String(n.id); } catch { return '?'; } };

/** Caches the name lookups one command makes, so a style or variable used a thousand times is read once. */
const namer = (host: ReadHost) => {
  const styles = new Map<string, Promise<string | null>>();
  const vars = new Map<string, Promise<string | null>>();
  const look = (cache: Map<string, Promise<string | null>>, id: string, get?: (id: string) => Promise<{ name: string } | null>) => {
    if (!cache.has(id)) cache.set(id, (async () => { try { return (await get?.(id))?.name ?? null; } catch { return null; } })());
    return cache.get(id)!;
  };
  return {
    style: (id: string) => look(styles, id, host.getStyleByIdAsync?.bind(host)),
    variable: (id: string) => look(vars, id, host.variables.getVariableByIdAsync?.bind(host.variables)),
  };
};

const pageOf = (n: ReadNode): string | null => {
  let p: ReadNode | null | undefined = n;
  for (let i = 0; p && i < 500; i++) { if (p.type === 'PAGE') return p.name; p = p.parent; }
  return null;
};

/** The main component's identity, with its set's name when it is a variant. */
const mainOf = async (n: ReadNode) => {
  if (n.type !== 'INSTANCE' || !n.getMainComponentAsync) return null;
  const m = await n.getMainComponentAsync();
  if (!m) return null;
  const set = m.parent && m.parent.type === 'COMPONENT_SET' ? m.parent.name : null;
  return { key: m.key ?? null, name: m.name, remote: m.remote === true, set };
};

/** `boundVariables` with each alias turned into the variable's name (its id when the variable cannot be read). */
const bindingsOf = async (n: ReadNode, names: ReturnType<typeof namer>): Promise<Record<string, string | string[]> | null> => {
  const b = n.boundVariables;
  if (!b || typeof b !== 'object') return null;
  const one = async (a: unknown): Promise<string> => {
    const id = a && typeof a === 'object' ? String((a as { id?: unknown }).id ?? '') : '';
    return (await names.variable(id)) ?? id;
  };
  const out: Record<string, string | string[]> = {};
  for (const [field, a] of Object.entries(b)) {
    if (Array.isArray(a)) out[field] = await Promise.all(a.map(one));
    else if (a && typeof a === 'object' && 'id' in a) out[field] = await one(a);
    else if (a && typeof a === 'object') {
      // A nested record (a text node's per-field bindings): flattened as `<field>.<sub>`.
      for (const [sub, v] of Object.entries(a as Record<string, unknown>)) {
        out[`${field}.${sub}`] = Array.isArray(v) ? await Promise.all(v.map(one)) : await one(v);
      }
    }
  }
  return Object.keys(out).length ? out : null;
};

/** A text node's style: its name, `mixed` across several, or null when it has none. */
const textStyleOf = async (n: ReadNode, names: ReturnType<typeof namer>): Promise<string | null> => {
  if (n.type !== 'TEXT') return null;
  const s = n.textStyleId;
  if (typeof s === 'symbol') return 'mixed';
  if (typeof s !== 'string' || !s) return null;
  return (await names.style(s)) ?? s;
};

const readOne = async (n: ReadNode, parentId: string | null, fields: readonly InspectField[], names: ReturnType<typeof namer>) => {
  const has = (f: InspectField) => fields.includes(f);
  const entry: Record<string, unknown> = {
    id: n.id, parentId, type: n.type, name: n.name, page: pageOf(n),
    size: typeof n.width === 'number' && typeof n.height === 'number' ? { width: n.width, height: n.height } : null,
    locked: n.locked === true,
    mainComponent: await mainOf(n),
    childCount: n.children?.length ?? 0,
  };
  if (has('props')) {
    const p = n.type === 'INSTANCE' ? n.componentProperties : undefined;
    entry.componentProperties = p ? Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { type: v.type, value: v.value }])) : null;
  }
  if (has('bindings')) entry.boundVariables = await bindingsOf(n, names);
  if (has('styles')) entry.textStyle = await textStyleOf(n, names);
  if (has('layout')) {
    entry.layout = typeof n.layoutMode === 'string' ? {
      mode: n.layoutMode, itemSpacing: n.itemSpacing ?? null,
      padding: { top: n.paddingTop ?? 0, right: n.paddingRight ?? 0, bottom: n.paddingBottom ?? 0, left: n.paddingLeft ?? 0 },
      sizing: { horizontal: n.layoutSizingHorizontal ?? null, vertical: n.layoutSizingVertical ?? null },
    } : null;
  }
  if (has('text')) entry.characters = n.type === 'TEXT' ? n.characters ?? null : null;
  return entry;
};

/** `inspect`: each listed node and its descendants to `depth`, depth first, at most `maxNodes` entries. */
export const inspect = async (host: ReadHost, args: InspectArgs) => {
  const a = { ids: args.ids, depth: args.depth ?? READ_DEFAULTS.depth, maxNodes: args.maxNodes ?? READ_DEFAULTS.maxNodes, fields: args.fields ?? [...INSPECT_FIELDS] };
  const names = namer(host);
  const nodes: Record<string, unknown>[] = [];
  const unreadable: Unreadable[] = [];
  const seen = new Set<string>();
  let truncated = false;
  const visit = async (n: ReadNode, parentId: string | null, level: number): Promise<void> => {
    const id = idOf(n);
    if (seen.has(id)) return;
    if (nodes.length >= a.maxNodes) { truncated = true; return; }
    seen.add(id);
    let kids: readonly ReadNode[] = [];
    try {
      nodes.push(await readOne(n, parentId, a.fields, names));
      if (level < a.depth) kids = n.children ?? [];
    } catch (e) { unreadable.push({ id, error: errText(e) }); return; }
    for (const k of kids) { await visit(k, id, level + 1); if (truncated) return; }
  };
  for (const id of a.ids) {
    let n: ReadNode | null = null;
    try { n = await host.getNodeByIdAsync(id); } catch (e) { unreadable.push({ id, error: errText(e) }); continue; }
    if (!n) { unreadable.push({ id, error: 'no node with this id in the file' }); continue; }
    await visit(n, null, 0);
    if (truncated) break;
  }
  return { nodes, unreadable, truncated };
};

/** `component-keys`: every local component set and standalone component, page by page, with its key. */
export const componentKeys = async (host: ReadHost, a: ComponentKeysArgs) => {
  const components: Record<string, unknown>[] = [];
  const unreadable: Unreadable[] = [];
  const want = a.names ? new Set(a.names) : null;
  const matched = new Set<string>();
  for (const page of host.root.children) {
    let found: ReadNode[];
    try {
      await page.loadAsync?.();
      found = page.findAllWithCriteria?.({ types: ['COMPONENT_SET', 'COMPONENT'] }) ?? [];
    } catch (e) { unreadable.push({ id: idOf(page), error: errText(e) }); continue; }
    for (const n of found) {
      try {
        // A variant is its set's member, not an entry of its own.
        if (n.type === 'COMPONENT' && n.parent?.type === 'COMPONENT_SET') continue;
        if (want && !want.has(n.name)) continue;
        matched.add(n.name);
        let published: boolean | null = null;
        try { published = n.getPublishStatusAsync ? (await n.getPublishStatusAsync()) !== 'UNPUBLISHED' : null; } catch { published = null; }
        const isSet = n.type === 'COMPONENT_SET';
        const variantProperties = isSet
          ? Object.fromEntries(Object.entries(n.componentPropertyDefinitions ?? {}).filter(([, d]) => d.type === 'VARIANT').map(([k, d]) => [k, d.variantOptions ?? []]))
          : null;
        components.push({
          name: n.name, key: n.key ?? null, kind: isSet ? 'set' : 'component', published, variantProperties,
          ...(isSet && a.sets ? { members: (n.children ?? []).filter((m) => m.type === 'COMPONENT').map((m) => ({ name: m.name, key: m.key ?? null })) } : {}),
        });
      } catch (e) { unreadable.push({ id: idOf(n), error: errText(e) }); }
    }
  }
  return { components, missing: a.names ? a.names.filter((x) => !matched.has(x)) : [], unreadable };
};

/** The categories `audit-frames` counts, in the order its result lists them. */
export const AUDIT_COUNTS = ['legacyInstances', 'unstyledText', 'rawFills', 'standInDividers', 'badName'] as const;
type AuditCount = (typeof AUDIT_COUNTS)[number];
/** Figma's own default layer names: a frame still called this was never named. */
const DEFAULT_NAME = /^(Frame|Group|Section|Rectangle)( \d+)?$/;
/** A walk stops here and says `truncated`. */
const AUDIT_NODE_CAP = 20_000;

/**
 * `audit-frames`, the rebuild's done check. For each frame, the layers in it that are still:
 *   · `legacyInstances` — an instance whose main component, or its set, is named in `legacy.components`;
 *   · `unstyledText` — a text layer with no text style on some of its text, or a style named in `legacy.textStyles`;
 *   · `rawFills` — a visible solid fill bound to no variable and no paint style, or bound to a variable whose name
 *     starts with one of `legacy.variablePrefixes`;
 *   · `standInDividers` — a line, or a rectangle 2 px thin or less: a hand-drawn rule where a Divider instance belongs;
 *   · `badName` — the frame, or a frame or section in it, whose name fails `nameRule` (a regular expression), or with
 *     no rule, still has one of Figma's default names.
 * An instance's own layers are the component's, so the walk counts the instance and does not go inside it.
 */
export const auditFrames = async (host: ReadHost, a: AuditFramesArgs) => {
  const names = namer(host);
  const rule = a.nameRule !== undefined ? new RegExp(a.nameRule) : null;
  const legacyComponents = new Set(a.legacy?.components ?? []);
  const legacyStyles = new Set(a.legacy?.textStyles ?? []);
  const prefixes = a.legacy?.variablePrefixes ?? [];
  const frames: Record<string, unknown>[] = [];
  const unreadable: Unreadable[] = [];
  let truncated = false;
  const isLegacyVar = async (alias: unknown): Promise<boolean> => {
    if (!prefixes.length || !alias || typeof alias !== 'object') return false;
    const name = await names.variable(String((alias as { id?: unknown }).id ?? ''));
    return name !== null && prefixes.some((p) => name.startsWith(p));
  };
  for (const id of a.ids) {
    let frame: ReadNode | null = null;
    try { frame = await host.getNodeByIdAsync(id); } catch (e) { unreadable.push({ id, error: errText(e) }); continue; }
    if (!frame) { unreadable.push({ id, error: 'no node with this id in the file' }); continue; }
    const layers: Record<AuditCount, string[]> = { legacyInstances: [], unstyledText: [], rawFills: [], standInDividers: [], badName: [] };
    let walked = 0;
    const check = async (n: ReadNode, top: boolean): Promise<void> => {
      const nid = idOf(n);
      if (++walked > AUDIT_NODE_CAP) { truncated = true; return; }
      try {
        if (n.type === 'INSTANCE' && legacyComponents.size) {
          const m = await n.getMainComponentAsync?.();
          const set = m?.parent?.type === 'COMPONENT_SET' ? m.parent.name : null;
          if (m && (legacyComponents.has(m.name) || (set !== null && legacyComponents.has(set)))) layers.legacyInstances.push(nid);
        }
        if (n.type === 'TEXT') {
          const s = n.textStyleId;
          const ids = typeof s === 'symbol' ? (n.getStyledTextSegments?.(['textStyleId']) ?? []).map((g) => g.textStyleId) : [s];
          let bad = ids.some((x) => typeof x !== 'string' || !x);
          if (!bad && legacyStyles.size) for (const x of ids) if (legacyStyles.has((await names.style(String(x))) ?? '')) bad = true;
          if (bad) layers.unstyledText.push(nid);
        }
        const fills = Array.isArray(n.fills) ? n.fills as Array<{ type?: string; visible?: boolean; boundVariables?: { color?: unknown } }> : [];
        const styled = typeof n.fillStyleId === 'string' && n.fillStyleId !== '';
        for (const f of fills) {
          if (f.type !== 'SOLID' || f.visible === false) continue;
          const bound = f.boundVariables?.color;
          if ((!bound && !styled) || (bound && await isLegacyVar(bound))) { layers.rawFills.push(nid); break; }
        }
        const thin = Math.min(n.width ?? Infinity, n.height ?? Infinity) <= 2;
        if (n.type === 'LINE' || (n.type === 'RECTANGLE' && thin)) layers.standInDividers.push(nid);
        if (top || n.type === 'FRAME' || n.type === 'SECTION') {
          if (rule ? !rule.test(n.name) : DEFAULT_NAME.test(n.name)) layers.badName.push(nid);
        }
      } catch (e) { unreadable.push({ id: nid, error: errText(e) }); return; }
      if (n.type === 'INSTANCE') return;
      let kids: readonly ReadNode[] = [];
      try { kids = n.children ?? []; } catch (e) { unreadable.push({ id: nid, error: errText(e) }); return; }
      for (const k of kids) { await check(k, false); if (truncated) return; }
    };
    await check(frame, true);
    const counts = Object.fromEntries(AUDIT_COUNTS.map((c) => [c, layers[c].length])) as Record<AuditCount, number>;
    frames.push({ id, counts, layers });
  }
  return { frames, unreadable, truncated };
};

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** Base64, hand-written: `btoa` is not promised in the plugin's main thread. */
export const base64 = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return s;
};

/** The pixel size a PNG says it is, from its IHDR chunk; null when the bytes are not a PNG. */
const pngSize = (b: Uint8Array): { width: number; height: number } | null => {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || sig.some((x, i) => b[i] !== x)) return null;
  const u32 = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  return { width: u32(16), height: u32(20) };
};

/** `snapshot`: one node rendered to PNG in this session. `local: true` says it is not the server's render. */
export const snapshot = async (host: ReadHost, a: SnapshotArgs) => {
  const n = await host.getNodeByIdAsync(a.id);
  if (!n) throw new ReadRefusal(`snapshot: no node with id ${a.id} in this file`);
  if (!n.exportAsync) throw new ReadRefusal(`snapshot: node ${a.id} (${n.type}) cannot be exported`);
  const bytes = await n.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: a.scale ?? READ_DEFAULTS.scale } });
  const size = pngSize(bytes);
  if (!size) throw new Error('snapshot: the export did not return a PNG');
  return { png: base64(bytes), width: size.width, height: size.height, local: true };
};
