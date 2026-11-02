/**
 * The in-memory FILE MODEL — one Figma file's variables, its four style kinds, its fonts and its shared plugin
 * data — shared by every offline suite that runs the plugin's Apply Theme against a host.
 *
 * MOVED HERE, UNCHANGED, from `test-mcp-paste.ts`, which is still its principal consumer (the same move
 * `component-shim.ts` made for #874, for the same reason). `test-export-parity.ts` (#2351 gap 2) runs the
 * plugin's Apply Theme into this model and exports what it holds; a second file model would be a second mental
 * model of Figma, two places for a permissive stub to let the same defect pass. So a quirk added here for one
 * suite is a quirk the other inherits, which is the point.
 *
 * Nothing here imports the executor, and nothing imports a suite: the shim is a HOST.
 */
import { deadOnRemove } from './removal-shim';

export type VarType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'TIMING' | 'EASING';
export type FileShimOpts = { refuseSharedData?: boolean };

/**
 * One Figma file: variables, the four style kinds, fonts, and shared plugin data on the root and on each
 * collection. What it models, it models because an executor depends on it:
 *   · `setValueForMode` enforces the variable's type (the #506 throw);
 *   · `createVariable` REFUSES a collection object it did not mint — the host validates that argument, and
 *     the ledger wrapper's `unwrap` exists for exactly this; a shim that accepted anything would let a
 *     wrapper reach the host and pass;
 *   · shared plugin data can be REFUSED (`refuseSharedData`), which is the ledger fallback's whole premise;
 *   · a font-family write re-resolves the text styles bound to it and throws on a face this RUN has not
 *     loaded (#680) — with `runScript` starting every script as a fresh run, which is what `use_figma` is;
 *   · TIMING and EASING (#2412) hold what the live host held in spike #2403, and refuse what it refused: a
 *     `scopes` write throws on both ("Cannot set scopes on this variable type"); TIMING takes a number only;
 *     EASING takes a cubic bezier `{x1,y1,x2,y2}` or a spring with `bounce` and no other key; and an alias
 *     touching either type must land on the same type (TIMING → FLOAT is refused);
 *   · a REMOVED style, variable or collection is DEAD (#1790, `removal-shim.ts`): any read or write of it
 *     but `id` and `removed` throws the host's error, so a second `remove()` throws too, and removing a
 *     collection kills its variables — including the objects an executor fetched before the removal.
 */
export class FileShim {
  collections: any[] = [];
  vars: any[] = [];
  styles: Record<'effect' | 'paint' | 'grid' | 'text', any[]> = { effect: [], paint: [], grid: [], text: [] };
  private seq = 0;
  private minted = new WeakSet<object>();
  private rootData = new Map<string, string>();
  /** #3208: every host call made so far — a method called on the file, a collection, a variable or a style, or a property
   *  of one written. A test reads it at each hand-back to count the calls a write makes between two. */
  calls = 0;
  private use = (): void => { this.calls++; };
  constructor(private opts: FileShimOpts = {}) {
    // The file's own methods count as calls too; a method the file calls on itself (`style` from `createTextStyle`) not.
    let inside = 0;
    for (const k of Object.getOwnPropertyNames(FileShim.prototype)) {
      const d = Object.getOwnPropertyDescriptor(FileShim.prototype, k)!;
      if (['constructor', 'id', 'shared', 'style', 'rootRecord'].includes(k) || typeof d.value !== 'function') continue;
      const f = d.value as (...a: unknown[]) => unknown;
      Object.defineProperty(this, k, { configurable: true, writable: true, value: (...a: unknown[]) => {
        if (!inside) this.calls++;
        inside++;
        try { return f.apply(this, a); } finally { inside--; }
      } });
    }
  }
  private id(p: string): string { return `${p}:${++this.seq}`; }
  private shared(store: Map<string, string>) {
    const refuse = this.opts.refuseSharedData;
    return {
      getSharedPluginData: (ns: string, k: string): string => { this.calls++; if (refuse) throw new Error('not implemented'); return store.get(`${ns}/${k}`) ?? ''; },
      setSharedPluginData: (ns: string, k: string, v: string): void => {
        this.calls++;
        if (refuse) throw new Error('not implemented');
        if (v === '') store.delete(`${ns}/${k}`); else store.set(`${ns}/${k}`, v);
      },
    };
  }
  get root() { return this.shared(this.rootData); }
  rootRecord(): Record<string, string> { return Object.fromEntries(this.rootData); }
  get variables(): any { return this; }

  async getLocalVariableCollectionsAsync(): Promise<any[]> { return [...this.collections]; }
  async getLocalVariablesAsync(type?: string): Promise<any[]> { return type ? this.vars.filter((v) => v.resolvedType === type) : [...this.vars]; }
  createVariableCollection(name: string): any {
    const shim = this;
    const data = new Map<string, string>();
    const c: any = deadOnRemove({
      id: this.id('VariableCollectionId'), name, modes: [{ modeId: this.id('mode'), name: 'Mode 1' }], data,
      renameMode(modeId: string, n: string) { const m = this.modes.find((x: any) => x.modeId === modeId); if (!m) throw new Error('no mode'); m.name = n; },
      addMode(n: string) { const modeId = shim.id('mode'); this.modes.push({ modeId, name: n }); return modeId; },
      removeMode(modeId: string) { this.modes = this.modes.filter((m: any) => m.modeId !== modeId); },
      // The cascade: the host removes a collection's variables with it, and a variable object an executor
      // read before the removal is then as dead as the collection.
      remove() {
        c.removed = true;
        for (const v of shim.vars) if (v.variableCollectionId === c.id) v.removed = true;
        shim.collections = shim.collections.filter((x) => x !== c);
        shim.vars = shim.vars.filter((v) => !v.removed);
      },
      ...this.shared(data),
    }, 'variable collection', this.use);
    this.minted.add(c);
    this.collections.push(c);
    return c;
  }
  createVariable(name: string, collection: any, resolvedType: VarType): any {
    if (!this.minted.has(collection)) throw new Error('in createVariable: Expected a VariableCollection node');
    const shim = this;
    const motion = resolvedType === 'TIMING' || resolvedType === 'EASING';
    let scopes: string[] = ['ALL_SCOPES'];
    const v: any = deadOnRemove({
      id: this.id('VariableID'), name, variableCollectionId: collection.id, resolvedType, description: '',
      get scopes(): string[] { return scopes; },
      set scopes(next: string[]) {
        if (motion) throw new Error('in set_scopes: Cannot set scopes on this variable type');
        scopes = next;
      },
      hiddenFromPublishing: false, valuesByMode: {} as Record<string, unknown>,
      setValueForMode(modeId: string, value: any) {
        const alias = value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS';
        if (alias) {
          const target = shim.vars.find((x) => x.id === value.id);
          const tt = target?.resolvedType;
          if ((motion || tt === 'TIMING' || tt === 'EASING') && tt !== this.resolvedType) {
            throw new Error(`in setValueForMode: Mismatched variable resolved type (${this.resolvedType}) and alias type (${tt})`);
          }
        }
        if (!alias && this.resolvedType === 'EASING') {
          const keys = (o: unknown): string[] => (o && typeof o === 'object' ? Object.keys(o) : []);
          const ok = value && typeof value === 'object' && (
            (value.type === 'CUSTOM_CUBIC_BEZIER' && ['x1', 'y1', 'x2', 'y2'].every((k) => typeof value.easingFunctionCubicBezier?.[k] === 'number'))
            || (value.type === 'CUSTOM_SPRING' && typeof value.easingFunctionSpring?.bounce === 'number'));
          const extra = keys(value.easingFunctionSpring).filter((k) => k !== 'bounce');
          if (!ok || extra.length) throw new Error(`in setValueForMode: Invalid easing value${extra.length ? ` — Unrecognized key(s) in object: ${extra.join(', ')}` : ''}`);
          this.valuesByMode[modeId] = value;
          return;
        }
        const t = typeof value === 'number' ? (this.resolvedType === 'TIMING' ? 'TIMING' : 'FLOAT') : typeof value === 'string' ? 'STRING' : typeof value === 'boolean' ? 'BOOLEAN' : 'COLOR';
        if (!alias && t !== this.resolvedType) throw new Error(`in setValueForMode: Mismatched variable resolved type (${this.resolvedType}) and value type (${t})`);
        // #680: writing a family a text style is bound to makes the host re-resolve that style, and a face
        // not loaded IN THIS RUN throws. This is why every paste step preloads fonts: a `use_figma` call is
        // a fresh run (`runScript` clears `loaded`), so a face loaded by an earlier script does not count.
        if (!alias && t === 'STRING') {
          for (const st of shim.styles.text) {
            if (st.boundVariables.fontFamily?.id !== this.id) continue;
            const face = `${value}|${st.fontName.style}`;
            if (!shim.loaded.has(face)) throw new Error(`in setValueForMode: Cannot write to node with unloaded font "${value} ${st.fontName.style}"`);
          }
        }
        this.valuesByMode[modeId] = value;
      },
      remove() { v.removed = true; shim.vars = shim.vars.filter((x) => x !== v); },
    }, 'variable', this.use);
    this.vars.push(v);
    return v;
  }
  createVariableAlias(target: any) { return { type: 'VARIABLE_ALIAS', id: target.id }; }
  // Figma returns a bound COPY of the effect (#2869, the `glass` blur radius); the alias carries the id, as Figma's does.
  setBoundVariableForEffect(effect: any, field: string, target: any): any { return { ...effect, boundVariables: { ...(effect.boundVariables ?? {}), [field]: { type: 'VARIABLE_ALIAS', id: target.id } } }; }

  async getLocalEffectStylesAsync() { return [...this.styles.effect]; }
  async getLocalPaintStylesAsync() { return [...this.styles.paint]; }
  async getLocalGridStylesAsync() { return [...this.styles.grid]; }
  async getLocalTextStylesAsync() { return [...this.styles.text]; }
  private style(kind: 'effect' | 'paint' | 'grid' | 'text'): any {
    const shim = this;
    const s: any = deadOnRemove({
      id: this.id(`S:${kind}`), name: '', description: '', boundVariables: {} as Record<string, unknown>,
      ...(kind === 'text' ? { fontName: { family: 'Inter', style: 'Regular' }, fontSize: 12 } : {}),
      setBoundVariable(field: string, v: any) { if (v) this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id }; else delete this.boundVariables[field]; },
      remove() { s.removed = true; shim.styles[kind] = shim.styles[kind].filter((x) => x !== s); },
    }, 'style', this.use);
    this.styles[kind].push(s);
    return s;
  }
  createEffectStyle() { return this.style('effect'); }
  createPaintStyle() { return this.style('paint'); }
  createGridStyle() { return this.style('grid'); }
  createTextStyle() { return this.style('text'); }
  loaded = new Set<string>();
  faces: { family: string; style: string }[] = [];
  async loadFontAsync(f: { family: string; style: string }) {
    if (!this.faces.some((x) => x.family === f.family && x.style === f.style)) throw new Error(`The font "${f.family} ${f.style}" could not be loaded`);
    this.loaded.add(`${f.family}|${f.style}`);
  }
  async listAvailableFontsAsync() { return this.faces.map((fontName) => ({ fontName })); }
}

/* ── #3147 Phase 2a: NODES, with a WRITE LOG ───────────────────────────────────────────────────────────────────────── */

/** One node as a test describes it. `unreadable: true` makes every read but `id` throw, as a slot sublayer did on the
 *  Mac mini's bridge. `png` is what `exportAsync` returns; `publish` is what `getPublishStatusAsync` answers. */
export type NodeSpec = {
  id: string; type: string; name: string; children?: NodeSpec[];
  width?: number; height?: number; locked?: boolean; key?: string; remote?: boolean;
  /** An INSTANCE's main component, by its spec id. */
  main?: string;
  publish?: 'UNPUBLISHED' | 'CURRENT' | 'CHANGED';
  unreadable?: true;
  png?: Uint8Array;
  [field: string]: unknown;
};

/** The methods a node or page may be asked without changing the file. Any OTHER method call is logged as a write. */
const NODE_READS = new Set(['getMainComponentAsync', 'getPublishStatusAsync', 'getStyledTextSegments', 'findAllWithCriteria', 'findAll', 'findOne', 'exportAsync', 'loadAsync', 'getSharedPluginData', 'getPluginData', 'getSharedPluginDataKeys', 'getPluginDataKeys', 'toString', 'valueOf', 'toJSON', 'then', 'constructor', 'hasOwnProperty']);

/**
 * A page tree of nodes behind Proxies that LOG EVERY WRITE: an assignment, a `defineProperty` or a `delete` on a node,
 * and a call to any method outside `NODE_READS` (`remove`, `appendChild`, `setPluginData`, `swapComponent`, `resize`…),
 * each as `<what> <node id>.<name>`. A read-only command leaves `writes` empty; one that touches a single property
 * shows up here by name. Separate from `FileShim`: that models variables and styles, this the node tree, and a test may
 * use both.
 */
export class NodeShim {
  writes: string[] = [];
  /** Every proxied node by id, pages included. */
  byId = new Map<string, any>();
  pages: any[];
  /** `exportAsync`'s settings, per call, so a test can read the scale it was asked for. */
  exports: Array<{ id: string; settings: unknown }> = [];
  constructor(pages: NodeSpec[], private extra: { styles?: Record<string, string>; variables?: Record<string, string> } = {}) {
    this.pages = pages.map((p) => this.make({ ...p, type: 'PAGE' }, null));
  }
  private make(spec: NodeSpec, parent: any): any {
    const shim = this;
    const raw: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(spec)) if (!['children', 'main', 'publish', 'unreadable', 'png'].includes(k)) raw[k] = v;
    Object.defineProperty(raw, '__spec', { value: spec });
    raw.parent = parent;
    raw.getMainComponentAsync = async () => (spec.main ? shim.byId.get(spec.main) ?? null : null);
    raw.getPublishStatusAsync = async () => spec.publish ?? 'UNPUBLISHED';
    raw.exportAsync = async (settings: unknown) => { shim.exports.push({ id: spec.id, settings }); return spec.png ?? new Uint8Array(); };
    raw.loadAsync = async () => undefined;
    raw.getSharedPluginData = () => '';
    raw.getPluginData = () => '';
    raw.findAllWithCriteria = (c: { types: string[] }) => {
      const out: any[] = [];
      // Figma's own search is native and skips nothing; a node this shim makes unreadable is passed over, not thrown on.
      const walk = (n: any) => { for (const k of n.children ?? []) { let t: string; try { t = k.type; } catch { continue; } if (c.types.includes(t)) out.push(k); walk(k); } };
      walk(proxy);
      return out;
    };
    // Methods a real node has that change the file: present, so a command that calls one is logged, not crashed.
    for (const m of ['remove', 'appendChild', 'insertChild', 'setPluginData', 'setSharedPluginData', 'swapComponent', 'resize', 'setProperties', 'detachInstance', 'resetOverrides', 'setBoundVariable', 'setTextStyleIdAsync']) raw[m] = () => undefined;
    const proxy: any = new Proxy(raw, {
      get(t, prop, recv) {
        if (spec.unreadable && prop !== 'id' && prop !== '__spec' && typeof prop === 'string') throw new Error(`node ${spec.id} could not be read`);
        const v = Reflect.get(t, prop, recv);
        if (typeof v === 'function' && typeof prop === 'string' && !NODE_READS.has(prop)) {
          return (...a: unknown[]) => { shim.writes.push(`call ${spec.id}.${prop}`); return (v as (...x: unknown[]) => unknown).apply(t, a); };
        }
        return v;
      },
      set(t, prop, v) { shim.writes.push(`set ${spec.id}.${String(prop)}`); return Reflect.set(t, prop, v); },
      defineProperty(t, prop, d) { shim.writes.push(`define ${spec.id}.${String(prop)}`); return Reflect.defineProperty(t, prop, d); },
      deleteProperty(t, prop) { shim.writes.push(`delete ${spec.id}.${String(prop)}`); return Reflect.deleteProperty(t, prop); },
    });
    this.byId.set(spec.id, proxy);
    raw.children = (spec.children ?? []).map((c) => this.make(c, proxy));
    return proxy;
  }
  /** The host slice the read commands use: `getNodeByIdAsync`, `getStyleByIdAsync` and `variables.getVariableByIdAsync`. */
  async getNodeByIdAsync(id: string): Promise<any> { return this.byId.get(id) ?? null; }
  async getStyleByIdAsync(id: string): Promise<{ name: string } | null> { const n = this.extra.styles?.[id]; return n ? { name: n } : null; }
  async getVariableByIdAsync(id: string): Promise<{ name: string } | null> { const n = this.extra.variables?.[id]; return n ? { name: n } : null; }
}
