/**
 * THE "AS BUILT" BASELINE (#2265, owner decision Q85 A, §4 of the design note) — what each node of a set
 * member looked like when Prism3 last wrote it, so an in-place update can tell a hand edit from an
 * engine change.
 *
 * The member stamp says which PLAN wrote a member. It cannot say whether someone has edited the member
 * since: an edited member and an untouched one carry the same stamp. So each member also carries, under
 * `prism3/memberAsBuilt`, one short hash per node of what the node held right after the build.
 * The dry run reads the node again, hashes it the same way, and compares:
 *
 *   - equal: nobody changed it since Prism3 did, so an update may overwrite it.
 *   - different: someone did, so it is a hand edit, and the update reports it rather than overwriting.
 *
 * ── READ OFF THE NODE, NEVER OFF THE PLAN ────────────────────────────────────────────────────────────
 *
 * The baseline is a record of the HOST, written after the executor's own read-backs, so a value the host
 * refused or rounded is recorded as the host holds it. A baseline computed from the plan would agree with
 * any plan and see no hand edit at all: the dry run would compare the plan with itself. `docs/34` shape 11.
 *
 * ── WHAT THE HASH COVERS ─────────────────────────────────────────────────────────────────────────────
 *
 * What a designer can change and the executor writes: the node's type and its children's names in order;
 * its auto-layout modes and alignment; every bindable number as its BINDING when bound and as its value
 * when not; each paint as its bound variable or its rounded color; its text style, or its font settings
 * when it has none; its effect style, or its effects; its text, when no component property owns it; its
 * visibility and opacity; its component-property references; and, on an instance, which component it
 * instantiates and the property values it was given.
 *
 * A BINDING CONTRIBUTES ITS ID, NEVER ITS VALUE. That is what lets Apply Theme run between two dry runs
 * without every member reading as hand-edited: a theme change moves the variable's value, and the node
 * still holds the same binding.
 *
 * NOT COVERED, stated because the boundary is invisible from the call site: width, height, x and y when
 * unbound. Auto-layout derives them, so they move whenever text or a theme does. A designer who resizes a
 * fixed-size node by hand is not seen. An instance's children are not walked either: they belong to the
 * main component, and the main is a member of its own set with its own baseline.
 *
 * `v` is the format's version. A change to what is hashed changes every hash, so it raises `v`, and a
 * dry run that reads an older `v` reports the member as having no baseline rather than as hand-edited.
 */
import { NS } from './persist-figma';

export const BASELINE_KEY = 'memberAsBuilt';
export const BASELINE_V = 1;

/** A node as the snapshot holds it: plain data, read once, so the hash and the read-back both read the
 *  same values, and nothing reads a getter Figma forbids under `documentAccess: dynamic-page`. */
export type SnapNode = Record<string, unknown> & { name: string; type: string; children?: SnapNode[] };

/** The record stored on a member. */
export type Baseline = { v: number; nodes: Record<string, string> };

/** The node fields the snapshot copies: everything the hash reads and everything `diffAnatomy` reads. */
const SNAP_KEYS = [
  'visible', 'opacity', 'layoutMode', 'layoutWrap', 'primaryAxisSizingMode', 'counterAxisSizingMode',
  'primaryAxisAlignItems', 'counterAxisAlignItems', 'itemSpacing', 'counterAxisSpacing',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius',
  'strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'strokeAlign',
  'layoutGrow', 'layoutAlign', 'layoutPositioning', 'layoutSizingHorizontal', 'layoutSizingVertical', 'constraints',
  'clipsContent', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'width', 'height', 'x', 'y', 'targetAspectRatio',
  'characters', 'fontSize', 'lineHeight', 'fontName', 'letterSpacing', 'textAutoResize', 'textAlignHorizontal', 'textAlignVertical',
  'textStyleId', 'effectStyleId', 'effects', 'fills', 'strokes', 'boundVariables', 'componentPropertyReferences',
  'isExposedInstance', 'componentProperties',
] as const;

/** Plain data out of a host value. `figma.mixed` is a symbol, which JSON drops, so it reads as `'MIXED'`. */
const plain = (v: unknown): unknown => {
  if (typeof v === 'symbol') return 'MIXED';
  if (v === undefined || v === null || typeof v !== 'object') return v;
  try { return JSON.parse(JSON.stringify(v)); } catch { return undefined; }
};

type LiveNode = Record<string, unknown> & {
  name?: unknown; type?: unknown; children?: unknown; parent?: unknown;
  getMainComponentAsync?: () => Promise<unknown>;
};

/** The main component an instance points at, as plain data. `getMainComponentAsync` first: the plugin
 *  runs under `documentAccess: dynamic-page`, where the sync `mainComponent` getter throws. The sync
 *  property is the fallback for the shim, which models it as a plain descriptor. */
const mainOf = async (n: LiveNode): Promise<Record<string, unknown> | null> => {
  let main: unknown = null;
  try { if (typeof n.getMainComponentAsync === 'function') main = await n.getMainComponentAsync(); } catch { main = null; }
  if (!main) { try { main = n.mainComponent; } catch { main = null; } }
  if (!main || typeof main !== 'object') return null;
  const m = main as Record<string, unknown>;
  let parent: { name: string; type: string } | null = null;
  try {
    const p = m.parent as Record<string, unknown> | null | undefined;
    if (p) parent = { name: String(p.name ?? ''), type: String(p.type ?? '') };
  } catch { parent = null; }
  let key: string | undefined;
  try { key = typeof m.key === 'string' && m.key ? m.key : undefined; } catch { key = undefined; }
  return { name: String(m.name ?? ''), type: String(m.type ?? ''), ...(key ? { key } : {}), parent };
};

/**
 * A member as plain data: one object per node, the fields above copied once, each read in its own
 * `try` because a host getter can throw on a node type that lacks the field. Children are walked, except
 * an instance's (see the header). `parent.width` is kept, non-enumerable, for the one read-back predicate
 * that measures against the parent.
 */
export const snapshotMember = async (root: unknown): Promise<SnapNode> => {
  const walk = async (raw: unknown, parentWidth: unknown): Promise<SnapNode> => {
    const n = raw as LiveNode;
    const out: SnapNode = { name: String(n.name ?? ''), type: String(n.type ?? '') };
    for (const k of SNAP_KEYS) {
      let v: unknown;
      try { v = n[k]; } catch { continue; }
      if (v === undefined) continue;
      const p = plain(v);
      if (p !== undefined) out[k] = p;
    }
    Object.defineProperty(out, 'parent', { enumerable: false, value: { width: parentWidth } });
    if (out.type === 'INSTANCE') {
      const main = await mainOf(n);
      if (main) out.mainComponent = main;
      return out;
    }
    let kids: unknown[] = [];
    try { kids = Array.isArray(n.children) ? (n.children as unknown[]) : []; } catch { kids = []; }
    if (kids.length) {
      out.children = [];
      for (const k of kids) out.children.push(await walk(k, out.width));
    }
    return out;
  };
  return walk(root, undefined);
};

// ---- the hash -------------------------------------------------------------------------------------------

/** FNV-1a, 32 bits, as 8 hex characters. Collisions only cost a missed hand edit on one node, and at
 *  ~30 nodes a member the 32-bit space is ample. */
const fnv = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
};

const round = (v: unknown): unknown => (typeof v === 'number' ? Math.round(v * 10000) / 10000 : v);

const idOf = (v: unknown): string | null => {
  const id = (v as { id?: unknown } | null | undefined)?.id;
  return typeof id === 'string' ? id : null;
};

/** The numbers a variable can bind. Bound, each reads as its binding; unbound, as its value. `width` and
 *  `height` are bindable too, and read ONLY when bound: unbound they are derived (see the header). */
const BINDABLE = [
  'itemSpacing', 'counterAxisSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius',
  'strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight',
  'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'opacity',
] as const;
const BOUND_ONLY = ['width', 'height'] as const;

/** Plain properties hashed as they are. */
const AS_IS = [
  'visible', 'layoutMode', 'layoutWrap', 'primaryAxisSizingMode', 'counterAxisSizingMode', 'primaryAxisAlignItems',
  'counterAxisAlignItems', 'strokeAlign', 'layoutGrow', 'layoutAlign', 'layoutPositioning', 'layoutSizingHorizontal',
  'layoutSizingVertical', 'constraints', 'clipsContent', 'textAutoResize', 'textAlignHorizontal', 'textAlignVertical',
  'targetAspectRatio', 'isExposedInstance',
] as const;

const paintSig = (p: unknown): unknown => {
  const q = p as Record<string, unknown>;
  const bound = idOf((q.boundVariables as Record<string, unknown> | undefined)?.color);
  const stops = Array.isArray(q.gradientStops)
    ? (q.gradientStops as Record<string, unknown>[]).map((s) => {
      const sid = idOf((s.boundVariables as Record<string, unknown> | undefined)?.color);
      return [round(s.position), sid ? `@${sid}` : JSON.stringify(s.color, (_k, v) => round(v))];
    })
    : undefined;
  return [q.type, q.visible ?? true, bound ? `@${bound}` : JSON.stringify(q.color ?? null, (_k, v) => round(v)), round(q.opacity ?? 1), q.blendMode ?? 'NORMAL', stops];
};

/** The signature of one node: the string its hash is taken over. Exported for the tests, which assert
 *  what moves it and what does not. */
export const nodeSignature = (n: SnapNode): string => {
  const bv = (n.boundVariables ?? {}) as Record<string, unknown>;
  const sig: Record<string, unknown> = { type: n.type, kids: (n.children ?? []).map((c) => c.name) };
  for (const k of AS_IS) if (n[k] !== undefined) sig[k] = round(n[k]);
  for (const k of BINDABLE) {
    const b = idOf(bv[k]);
    if (b) sig[k] = `@${b}`;
    else if (n[k] !== undefined) sig[k] = round(n[k]);
  }
  for (const k of BOUND_ONLY) { const b = idOf(bv[k]); if (b) sig[k] = `@${b}`; }
  for (const k of ['fills', 'strokes'] as const) {
    const v = n[k];
    if (Array.isArray(v)) sig[k] = v.map(paintSig);
    else if (v !== undefined) { const b = (bv[k] as unknown[] | undefined)?.map(idOf); sig[k] = b ?? v; }
  }
  if (typeof n.textStyleId === 'string' && n.textStyleId) sig.textStyle = n.textStyleId;
  else for (const k of ['fontSize', 'lineHeight', 'fontName', 'letterSpacing'] as const) if (n[k] !== undefined) sig[k] = JSON.stringify(n[k], (_k, v) => round(v));
  if (typeof n.effectStyleId === 'string' && n.effectStyleId) sig.effectStyle = n.effectStyleId;
  else if (Array.isArray(n.effects) && n.effects.length) sig.effects = JSON.stringify(n.effects, (_k, v) => round(v));
  const refs = (n.componentPropertyReferences ?? null) as Record<string, string> | null;
  if (refs && Object.keys(refs).length) sig.refs = Object.entries(refs).sort(([a], [b]) => (a < b ? -1 : 1));
  if (typeof n.characters === 'string' && !refs?.characters) sig.characters = n.characters;
  if (n.type === 'INSTANCE') {
    const m = n.mainComponent as { name?: string; key?: string; parent?: { name?: string; type?: string } | null } | undefined;
    sig.main = m?.key ?? (m?.parent?.type === 'COMPONENT_SET' ? `${m.parent.name}/${m.name}` : m?.name ?? null);
    const props = n.componentProperties as Record<string, { type?: unknown; value?: unknown }> | undefined;
    if (props) sig.props = Object.entries(props).map(([k, p]) => [k, p?.type, p?.value]).sort(([a], [b]) => (String(a) < String(b) ? -1 : 1));
  }
  return JSON.stringify(sig);
};

/** Every node of a snapshot under its path: `.` for the member root, then child names joined by `/`, and
 *  `#2`, `#3` … on a sibling whose name an earlier sibling already used. By name, so a reordered child
 *  keeps its path and its own hash; the reorder shows in the parent's child list instead. */
export const nodesByPath = (root: SnapNode): Map<string, SnapNode> => {
  const out = new Map<string, SnapNode>();
  const walk = (n: SnapNode, path: string): void => {
    out.set(path, n);
    const seen = new Map<string, number>();
    for (const c of n.children ?? []) {
      const k = (seen.get(c.name) ?? 0) + 1;
      seen.set(c.name, k);
      const seg = k === 1 ? c.name : `${c.name}#${k}`;
      walk(c, path === '.' ? seg : `${path}/${seg}`);
    }
  };
  walk(root, '.');
  return out;
};

/** The baseline of a snapshot. The root's own NAME is not hashed (its type and contents are): a rename in
 *  place is the update's own business, through the rename ledger, and must not read as a hand edit. */
export const baselineOf = (snap: SnapNode): Baseline => {
  const nodes: Record<string, string> = {};
  for (const [path, n] of nodesByPath(snap)) nodes[path] = fnv(nodeSignature(n));
  return { v: BASELINE_V, nodes };
};

type DataNode = { getSharedPluginData?: (ns: string, k: string) => string; setSharedPluginData?: (ns: string, k: string, v: string) => void };

/** The stored baseline, or `null` for a member that has none, an unreadable one, or one in another `v`. */
export const readBaseline = (node: unknown): Baseline | null => {
  let raw = '';
  try { raw = (node as DataNode).getSharedPluginData?.(NS, BASELINE_KEY) ?? ''; } catch { return null; }
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as Baseline;
    return b && b.v === BASELINE_V && b.nodes && typeof b.nodes === 'object' ? b : null;
  } catch { return null; }
};

/** Snapshot the member as it stands, and store that as its baseline. Returns the baseline written. */
export const writeBaseline = async (node: unknown): Promise<Baseline> => {
  const b = baselineOf(await snapshotMember(node));
  (node as DataNode).setSharedPluginData?.(NS, BASELINE_KEY, JSON.stringify(b));
  return b;
};

/** The paths whose hash differs between a stored baseline and a current one, and the paths present in
 *  only one of them. A child a designer added appears as `added`; one they deleted, as `removed`. */
export const baselineDiff = (stored: Baseline, now: Baseline): { changed: string[]; added: string[]; removed: string[] } => {
  const changed: string[] = [], added: string[] = [], removed: string[] = [];
  for (const [p, h] of Object.entries(stored.nodes)) {
    if (!(p in now.nodes)) removed.push(p);
    else if (now.nodes[p] !== h) changed.push(p);
  }
  for (const p of Object.keys(now.nodes)) if (!(p in stored.nodes)) added.push(p);
  return { changed, added, removed };
};
