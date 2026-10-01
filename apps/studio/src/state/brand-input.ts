/**
 * The Brand writes (UI redesign S3): every edit the Brand page makes to the working brand — its name, its
 * namespace, its personality words and the modes it ships — and the readings its levers need, held in one
 * module with no DOM, so a Node test can import it.
 *
 * WHY HERE AND NOT IN `main.ts`. The name and namespace fields lived in the legacy brand menu
 * (`renderBrandMenu`), and the mode set beside them (`renderModeSetMenu`). The new page must not import
 * `main.ts` (plan §3.10), so what it needs moved here: the namespace rule (`ROOT_RE`, which the legacy
 * field tested per keystroke), the per-keystroke name write through `syncIdentity` (#1196: no rebuild, so
 * the caret holds), and the mode rules concept v6 decided (Q3: high contrast dark follows dark).
 *
 * A writer here edits `brandState` and calls nothing, except the name, which syncs the identity itself
 * (it never rebuilds). The caller calls `rebuild()`, which re-resolves and tells the `brand` topic.
 */
import { TRAITS } from '@prism3/engine/vocabulary';
import { ALL_MODES, brandTheme, type BrandInput } from '@prism3/engine/theme';
import { brandState, syncIdentity } from './store';

// ── identity ────────────────────────────────────────────────────────────────────────────────────
/** A namespace the engine accepts as a token root: lowercase, starting with a letter (the legacy field's
 *  rule, `main.ts`'s `ROOT_RE`, which stays there for the import path). */
export const ROOT_RE = /^[a-z][a-z0-9-]*$/;
/** The namespaces that warn before export (T2, F5): concept v6's two, in its words. */
export const RESERVED_NAMESPACES: Readonly<Record<string, string>> = {
  prism: 'is reserved for the shipped catalog',
  pds3: 'is the default theme’s placeholder',
};

/** The namespace the brand emits under now. */
export const currentRoot = (): string => brandState.root ?? 'prism';

/** What the namespace field says about a draft: a warning for a reserved or placeholder value, a refusal
 *  for one the engine would not take, or the path it produces (concept v6's `rootNotes`). */
export const namespaceNote = (draft: string): { kind: 'warn' | 'bad' | 'hint'; text: string } => {
  const clean = draft.trim();
  const why = RESERVED_NAMESPACES[clean];
  if (why) return { kind: 'warn', text: `${clean} ${why}. Set your brand’s namespace before you export.` };
  if (!ROOT_RE.test(clean)) return { kind: 'bad', text: 'A namespace is lowercase letters, digits and hyphens, and starts with a letter.' };
  return { kind: 'hint', text: `Token paths start with ${clean}, for example ${clean}.color.text.primary.` };
};

/** The name, per keystroke: written to the working brand and synced to the last-good input without a
 *  rebuild (#1196), so the field's caret holds and Apply, persist and the export filename read it at once. */
export const setName = (v: string): void => {
  brandState.id = v.trim() || 'untitled';
  syncIdentity();
};

/** Rename the namespace to `next`. Refused (false, nothing written) when it is not a namespace the engine
 *  takes or does not change anything. The caller rebuilds: a namespace is in every token path. */
export const renameNamespace = (next: string): boolean => {
  const t = next.trim();
  if (!ROOT_RE.test(t) || t === currentRoot()) return false;
  brandState.root = t;
  return true;
};

// ── personality ────────────────────────────────────────────────────────────────────────────────
/** The words the engine knows, in its order (`TRAITS`, `packages/engine/vocabulary.ts`). */
export const PERSONALITY_WORDS: readonly string[] = Object.keys(TRAITS);
/** The levers a word fills, as [lever key, value] (concept v6 shows them under the chips). */
export const traitLevers = (word: string): readonly [string, string][] =>
  Object.entries(TRAITS[word]?.levers ?? {}).map(([k, v]) => [k, String(v)]);

/** `personality` is an authored field (`BrandInputAuthored`): the engine resolves it into lever values, so
 *  the resolved `BrandInput` type does not carry it. The working brand is the authored input. */
const authored = (): { personality?: string[] } => brandState as unknown as { personality?: string[] };
/** The personality words the brand sets, in the engine's order. */
export const personality = (): readonly string[] => PERSONALITY_WORDS.filter((w) => (authored().personality ?? []).includes(w));

/** Turn a personality word on or off. An empty set is written as no personality at all. */
export const setPersonality = (word: string, on: boolean): void => {
  const cur = new Set(authored().personality ?? []);
  if (on) cur.add(word); else cur.delete(word);
  const order = PERSONALITY_WORDS.filter((w) => cur.has(w));
  if (order.length) authored().personality = order;
  else delete authored().personality;
};

// ── modes ──────────────────────────────────────────────────────────────────────────────────────
type BuiltIn = 'light' | 'dark' | 'hc-light' | 'hc-dark' | 'wireframe';
/** The built-in modes in the engine's order (docs/11 Pillar 1). Light is always on. */
export const BUILTIN_ORDER: readonly BuiltIn[] = ['light', 'dark', 'hc-light', 'hc-dark', 'wireframe'];
/** The modes a brand can turn on or off, with concept v6's names and notes. */
export const MODE_ROWS: readonly { mode: Exclude<BuiltIn, 'light'>; name: string; note: string }[] = [
  { mode: 'dark', name: 'Dark', note: 'Customizable: per-mode values and role overrides.' },
  { mode: 'hc-light', name: 'High contrast light', note: 'Derived: follows light.' },
  { mode: 'hc-dark', name: 'High contrast dark', note: 'Derived: follows dark.' },
  { mode: 'wireframe', name: 'Wireframe', note: 'Derived: follows light.' },
];
export const MODE_NAME: Readonly<Record<string, string>> = { light: 'Light', ...Object.fromEntries(MODE_ROWS.map((r) => [r.mode, r.name])) };

/** The built-in modes on, as the input says (absent: the engine's default set, `ALL_MODES`). */
export const modesOn = (): readonly string[] => (brandState.modes ?? ALL_MODES) as readonly string[];

/** Q3: high contrast dark follows dark, so it is off, and cannot be turned on, while dark is off. */
export const hcDarkLocked = (): boolean => !modesOn().includes('dark');

/** What turning `mode` off drops from the brand: its role overrides, per-mode settings, anchors and surfaces
 *  (concept v6's `modeDrops`), in its words. */
export const modeDrops = (mode: string): string[] => {
  const out: string[] = [];
  for (const r of Object.keys((brandState.overrides as Record<string, object> | undefined)?.[mode] ?? {})) out.push(`Role override: ${r}`);
  const walk = (o: Record<string, unknown>, p: string): void => {
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v as Record<string, unknown>, `${p}${k}.`);
      else out.push(`Setting: ${p}${k} = ${String(v)}`);
    }
  };
  walk(((brandState.modeLevers as Record<string, Record<string, unknown>> | undefined)?.[mode]) ?? {}, '');
  for (const [c, v] of Object.entries((brandState.modeAnchors as Record<string, Record<string, unknown>> | undefined)?.[mode] ?? {})) out.push(`Anchor: ${c} at ${String(v)}`);
  for (const [k, v] of Object.entries((brandState.surfaces as Record<string, Record<string, unknown>> | undefined)?.[mode] ?? {})) {
    const x = v as { palette?: string; step?: number } | string;
    out.push(`Surface: ${k} = ${typeof x === 'object' && x ? `${x.palette} ${x.step}` : String(x)}`);
  }
  return out;
};

/** Turning `mode` off, planned: the modes that go (dark takes high contrast dark with it, Q3) and what each
 *  drops. `confirm` says whether it needs a confirm first (concept v6: when it takes another mode with it or
 *  drops anything). */
export const planModeOff = (mode: string): { off: string[]; drops: string[]; confirm: boolean } => {
  const on = modesOn();
  const off = [mode, ...(mode === 'dark' && on.includes('hc-dark') ? ['hc-dark'] : [])];
  const drops = off.flatMap((x) => modeDrops(x).map((d) => (x === mode ? d : `${MODE_NAME[x] ?? x}: ${d}`)));
  return { off, drops, confirm: off.length > 1 || drops.length > 0 };
};

/** Drop a mode's per-mode data from `input` (the working brand unless given), and any container that empties. */
const dropModeData = (mode: string, input: BrandInput = brandState): void => {
  const b = input as unknown as Record<string, Record<string, unknown> | undefined>;
  for (const k of ['overrides', 'modeLevers', 'modeAnchors', 'surfaces']) {
    const o = b[k];
    if (!o || typeof o !== 'object' || !(mode in o)) continue;
    delete o[mode];
    if (!Object.keys(o).length) delete b[k];
  }
};

/** Replace the working brand's fields with `next`'s, in place (the store's binding cannot be reassigned
 *  from here, and every reader holds that one object). */
const replaceBrand = (next: BrandInput): void => {
  const b = brandState as unknown as Record<string, unknown>;
  for (const k of Object.keys(b)) delete b[k];
  Object.assign(b, next);
};

/** The custom modes based on `mode`. Turning that mode off is refused by the engine while any is (a custom
 *  mode's base must be a mode the brand ships), so the Dark-off confirm names them. */
export const customModesBasedOn = (mode: string): readonly string[] => customModes().filter((c) => c.base === mode).map((c) => c.name);

/** Turn a built-in mode on. Never brings high contrast dark back by itself: it starts from Auto, off. */
export const setModeOn = (mode: Exclude<BuiltIn, 'light'>): void => {
  if ((mode === 'hc-dark' && hcDarkLocked()) || modesOn().includes(mode)) return;
  const cur = new Set(modesOn());
  cur.add(mode);
  brandState.modes = BUILTIN_ORDER.filter((m) => cur.has(m)) as typeof brandState.modes;
};

/** Turn a built-in mode off, with what `planModeOff` names going with it and their per-mode data dropped (the
 *  confirm listed it). ATOMIC (orchestrator review of #1939): the whole change is built on a copy and asked of
 *  the engine first; only an input the engine takes replaces the working brand. A refused one (a custom mode
 *  still based on dark) returns the engine's message and leaves the brand exactly as it was, byte for byte,
 *  as the legacy toggle did. The caller rebuilds on success. */
export const setModeOff = (mode: Exclude<BuiltIn, 'light'>): string | null => {
  const next = structuredClone(brandState);
  const cur = new Set(modesOn());
  for (const x of planModeOff(mode).off) { cur.delete(x); dropModeData(x, next); }
  next.modes = BUILTIN_ORDER.filter((m) => cur.has(m)) as typeof next.modes;
  try { brandTheme(structuredClone(next)); } catch (e) { return (e as Error).message; }
  replaceBrand(next);
  return null;
};

// ── custom modes ───────────────────────────────────────────────────────────────────────────────
/** A custom mode's name: lowercase, starting with a letter or digit (the legacy add form's rule). */
export const MODE_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
type CustomMode = NonNullable<typeof brandState.customModes>[number];
export const customModes = (): readonly CustomMode[] => brandState.customModes ?? [];

/** Add a custom mode based on light, named `custom-‹n›` with the first free number (concept v6). */
export const addCustomMode = (): string => {
  const taken = new Set([...BUILTIN_ORDER, ...customModes().map((c) => c.name)]);
  let n = customModes().length + 1;
  while (taken.has(`custom-${n}`)) n++;
  const name = `custom-${n}`;
  brandState.customModes = [...customModes(), { name, base: 'light' }];
  return name;
};

/** Remove custom mode `i` and its per-mode data. */
export const removeCustomMode = (i: number): void => {
  const c = customModes()[i];
  if (!c) return;
  dropModeData(c.name);
  const next = customModes().filter((_, j) => j !== i);
  if (next.length) brandState.customModes = next; else delete brandState.customModes;
};

/** Rename custom mode `i`. Refused (false, nothing written) for a name that is not a mode name, is a
 *  built-in's, or is another custom mode's. Its per-mode data moves with it. */
export const renameCustomMode = (i: number, next: string): boolean => {
  const c = customModes()[i];
  const t = next.trim();
  if (!c || t === c.name || !MODE_NAME_RE.test(t)) return false;
  if ((BUILTIN_ORDER as readonly string[]).includes(t) || customModes().some((x, j) => j !== i && x.name === t)) return false;
  const b = brandState as unknown as Record<string, Record<string, unknown> | undefined>;
  for (const k of ['overrides', 'modeLevers', 'modeAnchors', 'surfaces']) {
    const o = b[k];
    if (o && c.name in o) { o[t] = o[c.name]; delete o[c.name]; }
  }
  brandState.customModes = customModes().map((x, j) => (j === i ? { ...x, name: t } : x));
  return true;
};

/** Base custom mode `i` on light or dark. */
export const setCustomBase = (i: number, base: 'light' | 'dark'): void => {
  brandState.customModes = customModes().map((x, j) => (j === i ? { ...x, base } : x));
};
