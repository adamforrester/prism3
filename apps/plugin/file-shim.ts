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

export type VarType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
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
  constructor(private opts: FileShimOpts = {}) {}
  private id(p: string): string { return `${p}:${++this.seq}`; }
  private shared(store: Map<string, string>) {
    const refuse = this.opts.refuseSharedData;
    return {
      getSharedPluginData: (ns: string, k: string): string => { if (refuse) throw new Error('not implemented'); return store.get(`${ns}/${k}`) ?? ''; },
      setSharedPluginData: (ns: string, k: string, v: string): void => {
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
    }, 'variable collection');
    this.minted.add(c);
    this.collections.push(c);
    return c;
  }
  createVariable(name: string, collection: any, resolvedType: VarType): any {
    if (!this.minted.has(collection)) throw new Error('in createVariable: Expected a VariableCollection node');
    const shim = this;
    const v: any = deadOnRemove({
      id: this.id('VariableID'), name, variableCollectionId: collection.id, resolvedType, scopes: ['ALL_SCOPES'], description: '',
      hiddenFromPublishing: false, valuesByMode: {} as Record<string, unknown>,
      setValueForMode(modeId: string, value: any) {
        const alias = value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS';
        const t = typeof value === 'number' ? 'FLOAT' : typeof value === 'string' ? 'STRING' : typeof value === 'boolean' ? 'BOOLEAN' : 'COLOR';
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
    }, 'variable');
    this.vars.push(v);
    return v;
  }
  createVariableAlias(target: any) { return { type: 'VARIABLE_ALIAS', id: target.id }; }

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
    }, 'style');
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
