/**
 * Prism3 engine — MATERIALISE-TO-FIGMA (the round-trip payload generator).
 *
 * Turns the emitted raw-figma export (`out/figma/<brand>/`) into the deterministic
 * plugin-JS payloads you paste into `figma_execute` to build the variables in a real
 * Figma file. It exists because the two "smart" paths both drop the semantics the
 * docs/10 §3 contract enforces:
 *   - `figma_import_tokens` is DTCG-only — our export is raw-figma-shaped.
 *   - `figma_batch_create_variables` can't set scopes / description / hiddenFromPublishing.
 * So the only faithful path is executing the Variables plugin API directly, which is
 * fiddly to hand-roll — this shell makes it one deterministic `tsx` invocation.
 *
 * It encodes the hard-won materialisation rules (see docs/10 §3 + the #84 round-trip):
 *   - **Collection ordering** — `core-palette` (primitives) first; the `color` collection's
 *     aliases can only bind once the palette var IDs exist.
 *   - **Two-pass colour write** — pass A creates every var + literal fallback values in all
 *     modes; pass B rebinds aliases. Alias targets must exist before binding.
 *   - **PER-MODE alias binding** — pass B binds *each mode to its own target* (the #84
 *     round-trip caught a hand-rolled script that bound light's target to all four modes,
 *     collapsing every mode to identical values). This generator reads each mode file's own
 *     alias target, so the collapse can't happen.
 *   - **Payload budget** — data is embedded compactly (scope codes, array rows); each pass is
 *     a separate `figma_execute` call so no single payload blows the budget.
 *   - **NO async IIFE — emit top-level `await`.** Every pass used to wrap its body in
 *     `(async()=>{...})()`. `figma_execute` does not await or unwrap the returned Promise, so the
 *     pasting agent got `success:true, result:undefined` and could not see the created / bound /
 *     skipped / miss counts each pass computes — a silent write path that only looked verified.
 *     `figma_execute` supports top-level `await` directly, so the wrapper was pure loss.
 *   - **Load each distinct font face once.** The `text-styles` pass has a hard 5s execution
 *     ceiling to live inside; per-style `loadFontAsync` meant 38 sequential awaits for 4 real
 *     faces and overran it. Faces are loaded up front into a ledger the style loop reads.
 *   - **API-probe verification** — the `verify` pass reads back via `getLocalVariablesAsync`
 *     (authoritative for scopes / aliases / modes / hidden), and asserts **modes are distinct**
 *     (the collapse guard) + reports the interactive/disabled slot scopes.
 *   - **Prune REPORT, never prune (#479)** — `verify` also diffs each collection the plan owns
 *     against what the live file actually contains and names the remainder as orphans, because
 *     create-or-update-by-name is structurally blind to a rename (the new name is created, the old
 *     one is simply never touched again). This is the paste path's half of #479 — the plugin
 *     executor (`apps/plugin/src/write-figma.ts` `orphansOf`) has reported orphans on every apply since
 *     #529, but that path is only reachable from inside Figma; the paste path is the ONLY write path
 *     an MCP-driven session can use, and it read back nothing about drift until now. Report only —
 *     deleting a variable a designer may have bound to a layer is destructive and unrecoverable from
 *     the engine's side, and that decision is explicitly NOT this pass's to make (see `pruneReport`).
 *
 * SHELL (not pure): reads `out/figma/<brand>/`, prints plugin JS to stdout. No Figma I/O
 * here — the emitter lane pastes the output into `figma_execute`.
 *
 *   npx tsx packages/engine/materialise-to-figma.ts <brand>            # manifest: passes + byte sizes
 *   npx tsx packages/engine/materialise-to-figma.ts <brand> --pass palette
 *   npx tsx packages/engine/materialise-to-figma.ts <brand> --pass color-create
 *   npx tsx packages/engine/materialise-to-figma.ts <brand> --pass color-aliases
 *   npx tsx packages/engine/materialise-to-figma.ts <brand> --pass verify
 *
 * Scope: ALL FIVE write axes the plugin executor writes — colour (`core-palette` + `color`), the ten
 * FLOAT collections (#342), and as of #464 the typography variables (`core-font` + `type-sets`), the
 * Text Styles, and the Effect/Paint styles. The five-vs-two asymmetry is the reason the last three
 * landed: this CLI is the ONLY write path an MCP-driven session can use, so an agent could theme a
 * file over MCP and get every colour and dimension and no typography at all. `test.ts` now asserts
 * axis parity between the two paths, so the gap can't silently reopen.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { FigmaCollectionFile } from './emit-figma';
import { buildWritePlan, floatPlanFor, fontVarPlanFrom, stylesPlanFromFiles, textStylePlanFromFiles } from './write-plan';
import type { WritePlan, FloatCollectionPlan, VarCollectionPlan, StylesPlan, TextStylePlan } from './write-plan';
import type { FigmaEffectStylesFile, FigmaPaintStylesFile } from './emit-figma-styles';
import type { FigmaTextStylesFile } from './emit-figma-font';

const HERE = dirname(fileURLToPath(import.meta.url));

// Canonical mode order (matches emit-figma's COLOR_MODES); wireframe is opt-in and only
// present for brands that generate it.
const MODE_ORDER = ['light', 'dark', 'hc-light', 'hc-dark', 'wireframe'] as const;

// Compact scope codes — keep the colour payload inside the figma_execute budget. Decoded
// back to the Figma enum inside the generated plugin JS (SC map below must mirror this).
const SCOPE_CODE: Record<string, string> = {
  FRAME_FILL: 'f', SHAPE_FILL: 's', TEXT_FILL: 't', STROKE_COLOR: 'k',
};
const encodeScopes = (scopes: string[]): string =>
  scopes.map((s) => SCOPE_CODE[s] ?? '?').sort().join('');

// FLOAT variables live in a DISJOINT scope namespace from colour — a float can be WIDTH_HEIGHT or
// GAP, never FRAME_FILL — so they get their own code map rather than sharing one. Keeping them
// separate is what makes an unknown scope decode to '?' loudly instead of quietly landing on a
// colour scope that happens to share a letter.
const FLOAT_SCOPE_CODE: Record<string, string> = {
  WIDTH_HEIGHT: 'w', GAP: 'g', CORNER_RADIUS: 'r', STROKE_FLOAT: 'k',
  OPACITY: 'o', FONT_SIZE: 'z', FONT_WEIGHT: 'e', LINE_HEIGHT: 'l',
  LETTER_SPACING: 'p', PARAGRAPH_SPACING: 'a', PARAGRAPH_INDENT: 'i', TEXT_CONTENT: 'c',
  ALL_SCOPES: '*',
};
const encodeFloatScopes = (scopes: string[]): string =>
  scopes.map((s) => FLOAT_SCOPE_CODE[s] ?? '?').sort().join('');

// `core-font` is the one collection that mixes types, so it's the one place a STRING scope appears.
// FONT_FAMILY belongs to neither the colour nor the float namespace — a STRING variable can be
// FONT_FAMILY or TEXT_CONTENT and never WIDTH_HEIGHT — so it gets its own entry rather than being
// folded into the float map, for the same reason the float map isn't folded into the colour one: an
// unknown scope must decode to '?' loudly instead of quietly landing on a scope that shares a letter.
// The font pass encodes across BOTH maps because one collection carries both types of row.
const FONT_SCOPE_CODE: Record<string, string> = { ...FLOAT_SCOPE_CODE, FONT_FAMILY: 'm' };
const encodeFontScopes = (scopes: string[]): string =>
  scopes.map((s) => FONT_SCOPE_CODE[s] ?? '?').sort().join('');

const load = (brand: string, file: string): FigmaCollectionFile => {
  const p = resolve(HERE, `out/figma/${brand}/${file}`);
  if (!existsSync(p)) throw new Error(`missing emitted file: ${p} — run \`npx tsx packages/engine/emit-figma.ts\` first`);
  return JSON.parse(readFileSync(p, 'utf8'));
};

// Which colour modes did this brand emit? (light/dark/hc-* always; wireframe if opted in.)
const colourModes = (brand: string): string[] =>
  MODE_ORDER.filter((m) => existsSync(resolve(HERE, `out/figma/${brand}/color.${m}.json`)));

// The disk-read SHELL: read the emitted raw-figma files → collections → the pure `buildWritePlan`.
// Every pass below (and `aliasRows`) projects THIS plan, so the CLI paste-path and the live plugin
// executor (`apps/plugin/src/write-figma.ts`) share one source of truth for scopes / values / per-mode
// aliases / hidden flags — they can't drift.
const planFor = (brand: string): WritePlan =>
  buildWritePlan({
    palette: load(brand, 'core-palette.json'),
    color: colourModes(brand).map((m) => load(brand, `color.${m}.json`)),
  });

// ---- the FLOAT axes (#342) -------------------------------------------------------------
// Everything that isn't colour: the dimension substrate, the space rhythm, and the component
// tier the anatomy projection (#327) actually binds — `size/*`, `radius/*`, `icon/size/*`.
//
// The plugin executor has written these since #108 (`applyFloatPlan`), but the CLI paste path
// never had a pass for them, so an MCP-driven session could materialise colour and nothing else.
// That asymmetry is the whole reason this exists: the two write paths are supposed to be
// projections of ONE plan, and one of them was missing two thirds of the axes.
//
// Reads the EMITTED files rather than rebuilding from a theme, like every other pass here — the
// emitted JSON is what the docs/10 §3 contract is written against, and a theme-rebuilt plan could
// silently disagree with the artifact under `--check`. `floatPlanFor` is the same pure reshape the
// plugin path uses, so the two still can't drift.
//
// Order matters for the same reason it does in colour: a collection whose aliases point at
// `core-dimension` / `space` can only bind once those variables exist.
const FLOAT_AXES: { collection: string; modes: string[] | null }[] = [
  { collection: 'core-dimension', modes: null },
  { collection: 'space', modes: null },
  { collection: 'radius', modes: ['Default', 'wireframe'] }, // per-mode only for a wireframe brand
  { collection: 'size', modes: null },
  { collection: 'icon', modes: null },
  { collection: 'control', modes: null },
  { collection: 'border-width', modes: null },
  { collection: 'focus', modes: null },
  { collection: 'opacity', modes: null },
  { collection: 'layout', modes: ['sm', 'md', 'lg', 'xl', '2xl'] },
];

/** The files backing one float axis, in mode order. A single-mode axis is `<name>.json`; a
 *  multi-mode axis is `<name>.<mode>.json` — except radius, which emits the single-file form when
 *  the brand hasn't opted into wireframe (docs/11 Pillar 1b), so BOTH shapes are probed. */
const floatFiles = (brand: string, axis: { collection: string; modes: string[] | null }): string[] => {
  const at = (f: string) => resolve(HERE, `out/figma/${brand}/${f}`);
  const single = `${axis.collection}.json`;
  if (!axis.modes) return existsSync(at(single)) ? [single] : [];
  const perMode = axis.modes.map((m) => `${axis.collection}.${m}.json`).filter((f) => existsSync(at(f)));
  if (perMode.length) return perMode;
  return existsSync(at(single)) ? [single] : [];
};

const floatPlans = (brand: string): FloatCollectionPlan[] =>
  FLOAT_AXES.map((axis) => ({ axis, files: floatFiles(brand, axis) }))
    .filter(({ files }) => files.length > 0)
    .map(({ axis, files }) => floatPlanFor(axis.collection, files.map((f) => load(brand, f))));

/** Exported so the suite can assert the paste path covers every axis the plugin path writes —
 *  the drift check that would have caught this gap when it opened. */
export const floatCollections = (brand: string): string[] => floatPlans(brand).map((p) => p.name);

// ---- the TYPOGRAPHY + STYLE axes (#464) ------------------------------------------------
// The same asymmetry #342 closed for floats, closed for the remaining three axes. The plugin has
// written all five since #237 (`applyVarCollectionPlan` / `applyTextStylePlan` / `applyStylesPlan`),
// while the paste path — the ONLY one an MCP-driven session can use — had colour and floats, so
// `core-font`, `type-sets`, all 38 Text Styles and all 14 Effect Styles were unreachable. An agent
// could theme a file over MCP and get every colour and dimension and no typography at all.
//
// Reads the EMITTED files for the same reason the float lane does: the emitted JSON is what the
// docs/10 §3 contract is written against, and the `*FromFiles` reshapes are the same pure functions
// the plugin path calls, so the two still can't drift.
//
// Ordering: `font-vars` before `text-styles`, for the reason create-before-alias holds everywhere
// here — a Text Style's `setBoundVariable` needs `font/family/*`, `font/weight-role/*` and
// `font-fluid/*` to already exist. `styles` is independent (Effect/Paint styles bind no variables),
// so its position is a convention.

/** `core-font` emits one file per mode (Phase D — same convention as `radius`), so BOTH the
 *  single-file `core-font.json` and the per-mode `core-font.<mode>.json` shapes are probed. A brand
 *  with no per-mode typography emits only the former. */
const fontFiles = (brand: string): { font: FigmaCollectionFile[]; fluid: FigmaCollectionFile[] } => {
  const at = (f: string) => resolve(HERE, `out/figma/${brand}/${f}`);
  const single = 'core-font.json';
  // Mode names aren't known ahead of time here (they're the brand's appearance modes), so read the
  // per-mode files by the same MODE_ORDER the colour lane uses, then fall back to the single file.
  const perMode = MODE_ORDER.map((m) => `core-font.${m}.json`).filter((f) => existsSync(at(f)));
  const font = perMode.length ? perMode : existsSync(at(single)) ? [single] : [];
  const fluid = FONT_FLUID_MODES.map((m) => `type-sets.${m}.json`).filter((f) => existsSync(at(f)));
  return { font: font.map((f) => load(brand, f)), fluid: fluid.map((f) => load(brand, f)) };
};

// The viewport modes `type-sets` emits (mirrors `emit-figma-font.ts` FONT_FLUID_MODES). Kept as a
// local list rather than imported so this shell stays a reader of the ARTIFACTS, not of the emitter's
// internals — and the suite asserts the two agree.
const FONT_FLUID_MODES = ['mobile', 'desktop'] as const;

const fontVarPlans = (brand: string): VarCollectionPlan[] => {
  const { font, fluid } = fontFiles(brand);
  return fontVarPlanFrom(font, fluid).filter((p) => p.rows.length > 0);
};

/** Exported for the same drift assertion `floatCollections` carries. */
export const fontCollections = (brand: string): string[] => fontVarPlans(brand).map((p) => p.name);

const stylesPlan = (brand: string): StylesPlan => {
  const at = (f: string) => resolve(HERE, `out/figma/${brand}/${f}`);
  const empty = <T,>(collection: string): T => ({ $collection: collection, styles: [] }) as T;
  const shadow = existsSync(at('shadow-styles.json'))
    ? (load(brand, 'shadow-styles.json') as unknown as FigmaEffectStylesFile)
    : empty<FigmaEffectStylesFile>('shadow-styles');
  const gradient = existsSync(at('gradient-styles.json'))
    ? (load(brand, 'gradient-styles.json') as unknown as FigmaPaintStylesFile)
    : empty<FigmaPaintStylesFile>('gradient-styles');
  return stylesPlanFromFiles(shadow, gradient);
};

const textStylePlan = (brand: string): TextStylePlan => {
  const at = (f: string) => resolve(HERE, `out/figma/${brand}/${f}`);
  if (!existsSync(at('text-styles.json'))) return [];
  const { font } = fontFiles(brand);
  if (!font.length) return [];
  return textStylePlanFromFiles(load(brand, 'text-styles.json') as unknown as FigmaTextStylesFile, font[0]);
};

// ---- the SC decode map + shared helpers, injected into every plugin payload -----------
const PRELUDE = `const SC={f:'FRAME_FILL',s:'SHAPE_FILL',t:'TEXT_FILL',k:'STROKE_COLOR'};
const decode=(c)=>[...c].map(x=>SC[x]);
const cols=async()=>figma.variables.getLocalVariableCollectionsAsync();
const findCol=async(n)=>(await cols()).find(c=>c.name===n);`;

// ---- pass: palette (core-palette, one Default mode, literal values, hidden primitives) --
const palettePass = (brand: string): string => {
  // row: [name, scopeCode, description, value, hidden]
  const P = planFor(brand).palette.map((r) => [r.name, encodeScopes(r.scopes), r.description, r.value, r.hidden ? 1 : 0]);
  return `${PRELUDE}
const P=${JSON.stringify(P)};
let col=await findCol('core-palette');
if(!col)col=figma.variables.createVariableCollection('core-palette');
const mode=col.modes[0].modeId;
const have=new Map((await figma.variables.getLocalVariablesAsync()).filter(v=>v.variableCollectionId===col.id).map(v=>[v.name,v]));
let created=0;
for(const [name,sc,desc,val,hidden] of P){
  let v=have.get(name);
  if(!v){v=figma.variables.createVariable(name,col,'COLOR');created++;}
  v.scopes=decode(sc);v.description=desc;v.hiddenFromPublishing=!!hidden;
  v.setValueForMode(mode,val);
}
return {collection:'core-palette',total:P.length,created};
`;
};

// ---- pass: color-create (color collection, N modes, literal fallback values) -----------

/**
 * The byte budget one `color-create` payload is packed to.
 *
 * 42,000 against the transport's ~45KB — the same numbers and the same margin as `SET_CHUNK_BYTES`,
 * deliberately, because it is the same transport and the same failure: an over-budget payload is
 * rejected AFTER the chunks before it have already pasted, leaving a half-built collection.
 *
 * WHY THIS EXISTS (#906). This pass was a single payload with **1,222 bytes of headroom** — 97.3%
 * of budget — and nothing said so, because the only signal was a `> BUDGET` flag that fires once the
 * wall is already hit. #892's first four tokens cost ~1,360. The lesson is not "raise the number";
 * it is that **a budget only speaks when it is crossed**, so the manifest reports fullness on every
 * run now, and the gate bounds the one quantity chunking cannot rescue.
 */
export const COLOR_CHUNK_BYTES = 42_000;

/** One create row: `[name, scopeCode, description, [value per mode, in `modes` order]]`. */
type ColorRow = [string, string, string, unknown[]];

const colorRows = (brand: string): ColorRow[] =>
  planFor(brand).color.create.map((r) => [r.name, encodeScopes(r.scopes), r.description, r.valuesByMode] as ColorRow);

const colorCreateJs = (modes: string[], C: ColorRow[]): string => `${PRELUDE}
const MODES=${JSON.stringify(modes)};
const C=${JSON.stringify(C)};
let col=await findCol('color');
if(!col)col=figma.variables.createVariableCollection('color');
col.renameMode(col.modes[0].modeId,MODES[0]);
const modeIds={[MODES[0]]:col.modes[0].modeId};
for(let i=1;i<MODES.length;i++){const m=col.modes.find(x=>x.name===MODES[i]);modeIds[MODES[i]]=m?m.modeId:col.addMode(MODES[i]);}
const have=new Map((await figma.variables.getLocalVariablesAsync()).filter(v=>v.variableCollectionId===col.id).map(v=>[v.name,v]));
let created=0;
for(const [name,sc,desc,vals] of C){
  let v=have.get(name);
  if(!v){v=figma.variables.createVariable(name,col,'COLOR');created++;}
  v.scopes=decode(sc);v.description=desc;
  MODES.forEach((m,i)=>v.setValueForMode(modeIds[m],vals[i]));
}
return {collection:'color',modes:MODES,total:C.length,created};
`;

/**
 * `color-create` -> N payloads, packed by BYTES.
 *
 * Simpler than `planSetChunks`, and the difference is worth stating because it is why this one is
 * safe to split plainly: a component set has LAYOUT (a chunk handed a slice would place its members
 * as though the slice were the whole set) and PROPERTIES (declarable only once the last member has
 * joined). A variable collection has neither. Every chunk carries the same idempotent preamble —
 * find-or-create the collection, rename mode 0, add any missing modes — then creates its own rows.
 * Order BETWEEN chunks does not matter; order against `color-aliases` does, and is unchanged, since
 * every chunk of this pass still precedes it.
 *
 * The repeated preamble costs its ~1KB in every chunk rather than only the first. Bought
 * deliberately: a chunk that assumes a previous one ran fails differently depending on paste order,
 * and paste order is the thing a human is holding.
 */
export const colorCreateChunks = (
  brand: string,
  budgetBytes: number = COLOR_CHUNK_BYTES,
): { index: number; total: number; js: string; bytes: number; rows: number }[] => {
  const { modes } = planFor(brand).color;
  const rows = colorRows(brand);
  // Packed against the size of the FINISHED payload, not a sum of row sizes: the shell is ~1KB and
  // `JSON.stringify` adds separators, so a row-sum estimate packs against a string that never ships.
  // The rule `planSetChunks` states — every byte the loop reasons about has to be a byte that ships.
  const slices: ColorRow[][] = [];
  let cur: ColorRow[] = [];
  for (const row of rows) {
    const next = [...cur, row];
    if (cur.length && Buffer.byteLength(colorCreateJs(modes, next), 'utf8') > budgetBytes) {
      slices.push(cur);
      cur = [row];
    } else {
      cur = next;
    }
  }
  if (cur.length) slices.push(cur);
  return slices.map((slice, i) => {
    const js = colorCreateJs(modes, slice);
    return { index: i, total: slices.length, js, bytes: Buffer.byteLength(js, 'utf8'), rows: slice.length };
  });
};

/**
 * The ceiling that means something, and the reason it is not chunk fullness.
 *
 * `tools/nest-exposed-cost/measure.ts` learned this the hard way and records it: **worst-chunk
 * fullness is near-budget BY CONSTRUCTION** — the packer adds rows until the next will not fit, so a
 * healthy system and a doomed one both report ~99%. Disqualified as a health metric, and a reviewer
 * on #761 was right to refuse it.
 *
 * What chunking cannot rescue is a SINGLE ROW too big for one payload. So the number to watch is the
 * largest indivisible unit against the room a payload has for rows (budget minus shell). At 100% one
 * variable cannot be pasted at all, and no amount of splitting helps.
 */
export const colorIndivisibleUnit = (brand: string, budgetBytes: number = COLOR_CHUNK_BYTES): {
  worstRow: string; worstBytes: number; shellBytes: number; capacity: number; pct: number;
} => {
  const { modes } = planFor(brand).color;
  const rows = colorRows(brand);
  const shellBytes = Buffer.byteLength(colorCreateJs(modes, []), 'utf8');
  // Each row's true marginal cost, measured the way the packer measures: the finished payload with
  // the row, minus the finished payload without it.
  const cost = (r: ColorRow) => Buffer.byteLength(colorCreateJs(modes, [r]), 'utf8') - shellBytes;
  let worstRow = '', worstBytes = 0;
  for (const r of rows) { const c = cost(r); if (c > worstBytes) { worstBytes = c; worstRow = r[0]; } }
  const capacity = budgetBytes - shellBytes;
  return { worstRow, worstBytes, shellBytes, capacity, pct: worstBytes / capacity };
};

// The per-mode alias targets for the colour collection: one row per variable,
// `[name, [target-name per mode, in `modes` order]]`. Exported + pure so the suite can
// assert the rows are DISTINCT per mode — locking the collapse-proofing (each mode binds
// its OWN target, not light's for all four) into the gate without needing a live Figma.
export type AliasRow = [string, (string | null)[]];
export const aliasRows = (brand: string): { modes: string[]; rows: AliasRow[] } => {
  const { modes, aliases } = planFor(brand).color;
  const rows: AliasRow[] = aliases.map((r) => [r.name, r.targetsByMode]);
  return { modes, rows };
};

// ---- pass: color-aliases (rebind PER MODE — the collapse-proof pass) --------------------
const colorAliasesPass = (brand: string): string => {
  const { modes, rows: A } = aliasRows(brand);
  return `${PRELUDE}
const MODES=${JSON.stringify(modes)};
const A=${JSON.stringify(A)};
const vars=await figma.variables.getLocalVariablesAsync();
const byName=new Map(vars.map(v=>[v.name,v]));
const col=await findCol('color');
const modeIds={};for(const m of MODES){const mm=col.modes.find(x=>x.name===m);modeIds[m]=mm&&mm.modeId;}
let bound=0;const misses=[];
for(const [name,targets] of A){
  const v=byName.get(name);
  if(!v){misses.push('var:'+name);continue;}
  MODES.forEach((m,i)=>{
    const t=targets[i];if(!t)return;
    const tv=byName.get(t);
    if(!tv){misses.push(name+' @'+m+' -> '+t);return;}
    v.setValueForMode(modeIds[m],figma.variables.createVariableAlias(tv));bound++;
  });
}
return {bound,expected:A.length*MODES.length,misses};
`;
};

// ---- pass: dims-create (every FLOAT collection, N modes, literal fallback values) -------
// One payload for all ten axes rather than ten payloads: floats are small (≈250 variables
// total against colour's thousands), and a single pass keeps the create/alias ordering honest
// without asking whoever pastes it to track ten separate steps.
const dimsCreatePass = (brand: string): string => {
  const FSC = JSON.stringify(Object.fromEntries(Object.entries(FLOAT_SCOPE_CODE).map(([k, v]) => [v, k])));
  // row: [collection, modes, [[name, scopeCode, description, hidden, [value per mode]]]]
  const D = floatPlans(brand).map((p) => [
    p.name, p.modes,
    p.create.map((r) => [r.name, encodeFloatScopes(r.scopes), r.description, r.hidden ? 1 : 0, r.valuesByMode]),
  ]);
  return `${PRELUDE}
const FSC=${FSC};
const dec=(c)=>[...c].map(x=>FSC[x]);
const D=${JSON.stringify(D)};
const out=[];
for(const [cname,MODES,rows] of D){
  let col=await findCol(cname);
  if(!col)col=figma.variables.createVariableCollection(cname);
  col.renameMode(col.modes[0].modeId,MODES[0]);
  const modeIds={[MODES[0]]:col.modes[0].modeId};
  for(let i=1;i<MODES.length;i++){const m=col.modes.find(x=>x.name===MODES[i]);modeIds[MODES[i]]=m?m.modeId:col.addMode(MODES[i]);}
  const have=new Map((await figma.variables.getLocalVariablesAsync()).filter(v=>v.variableCollectionId===col.id).map(v=>[v.name,v]));
  let created=0;
  for(const [name,sc,desc,hidden,vals] of rows){
    let v=have.get(name);
    if(!v){v=figma.variables.createVariable(name,col,'FLOAT');created++;}
    v.scopes=dec(sc);v.description=desc;v.hiddenFromPublishing=!!hidden;
    MODES.forEach((m,i)=>v.setValueForMode(modeIds[m],vals[i]));
  }
  out.push({collection:cname,modes:MODES,total:rows.length,created});
}
return out;
`;
};

// ---- pass: dims-aliases (rebind PER MODE — the same collapse-proofing as colour) --------
// The float axes alias across collections (`size/md/gap` → `space/100`, `icon/size/md` →
// `dimension/24`), which is why this is a second pass: a target in `space` cannot be bound until
// `space` exists, and dims-create builds all nine before anything binds.
const dimsAliasesPass = (brand: string): string => {
  const A = floatPlans(brand)
    .map((p) => [p.name, p.modes, p.aliases.filter((r) => r.targetsByMode.some((t) => t !== null)).map((r) => [r.name, r.targetsByMode])])
    .filter(([, , rows]) => (rows as unknown[]).length > 0);
  return `${PRELUDE}
const A=${JSON.stringify(A)};
const vars=await figma.variables.getLocalVariablesAsync();
const byName=new Map(vars.map(v=>[v.name,v]));
let bound=0;const misses=[];
for(const [cname,MODES,rows] of A){
  const col=await findCol(cname);
  if(!col){misses.push('collection:'+cname);continue;}
  const modeIds={};for(const m of MODES){const mm=col.modes.find(x=>x.name===m);modeIds[m]=mm&&mm.modeId;}
  for(const [name,targets] of rows){
    const v=byName.get(name);
    if(!v){misses.push('var:'+name);continue;}
    MODES.forEach((m,i)=>{
      const t=targets[i];if(!t)return;
      const tv=byName.get(t);
      if(!tv){misses.push(name+' @'+m+' -> '+t);return;}
      v.setValueForMode(modeIds[m],figma.variables.createVariableAlias(tv));bound++;
    });
  }
}
return {bound,misses};
`;
};

// ---- pass: font-vars (core-font + type-sets; MIXED type in one collection) ---------------
// One payload for both collections and both their passes: 50 variables total, and `core-font`'s
// weight-role aliases target `font/weight/N` in the SAME collection, so create-then-bind can be two
// loops in one payload rather than two paste steps. (Colour needs two payloads only because of size.)
//
// The per-row `resolvedType` is the thing that makes this pass distinct from `dims-create`:
// `core-font` mixes STRING (family) and FLOAT (size/weight) in ONE collection. Creating a family var
// as FLOAT would accept no string value and fail only when a Text Style tried to bind it — so the
// type travels per row, encoded 's'/'f', and an unknown code throws at paste time rather than
// defaulting to either.
const fontVarsPass = (brand: string): string => {
  // row: [name, typeCode, scopes, description, hidden, [value per mode], [alias per mode]]
  const F = fontVarPlans(brand).map((p) => [
    p.name, p.modes,
    p.rows.map((r) => [
      r.name, r.resolvedType === 'STRING' ? 's' : 'f', encodeFontScopes(r.scopes),
      r.description, r.hidden ? 1 : 0, r.valuesByMode, r.aliasByMode,
    ]),
  ]);
  const FSC = JSON.stringify(Object.fromEntries(Object.entries(FONT_SCOPE_CODE).map(([k, v]) => [v, k])));
  return `${PRELUDE}
const FSC=${FSC};
const dec=(c)=>[...c].map(x=>{const s=FSC[x];if(!s)throw new Error('unknown scope code: '+x);return s;});
const TY={s:'STRING',f:'FLOAT'};
const F=${JSON.stringify(F)};
const out=[];const byNameGlobal=new Map();const modeIdsByCol={};
// pass A: create/update every var with its literal per-mode value (aliases bind in pass B below,
// once every target exists — the same ordering rule the colour and float lanes follow).
for(const [cname,MODES,rows] of F){
  let col=await findCol(cname);
  if(!col)col=figma.variables.createVariableCollection(cname);
  col.renameMode(col.modes[0].modeId,MODES[0]);
  const modeIds={[MODES[0]]:col.modes[0].modeId};
  for(let i=1;i<MODES.length;i++){const m=col.modes.find(x=>x.name===MODES[i]);modeIds[MODES[i]]=m?m.modeId:col.addMode(MODES[i]);}
  modeIdsByCol[cname]=modeIds;
  const have=new Map((await figma.variables.getLocalVariablesAsync()).filter(v=>v.variableCollectionId===col.id).map(v=>[v.name,v]));
  let created=0;
  for(const [name,ty,sc,desc,hidden,vals] of rows){
    let v=have.get(name);
    if(!v){v=figma.variables.createVariable(name,col,TY[ty]);created++;}
    v.scopes=dec(sc);v.description=desc;v.hiddenFromPublishing=!!hidden;
    MODES.forEach((m,i)=>v.setValueForMode(modeIds[m],vals[i]));
    byNameGlobal.set(name,v);
  }
  out.push({collection:cname,modes:MODES,total:rows.length,created});
}
// pass B: the weight-role -> font/weight/N links, per mode.
let bound=0;const misses=[];
for(const [cname,MODES,rows] of F){
  const modeIds=modeIdsByCol[cname];
  for(const [name,,,,,,aliases] of rows){
    const v=byNameGlobal.get(name);
    if(!v){misses.push('var:'+name);continue;}
    MODES.forEach((m,i)=>{
      const t=aliases[i];if(!t)return;
      const tv=byNameGlobal.get(t);
      if(!tv){misses.push(name+' @'+m+' -> '+t);return;}
      v.setValueForMode(modeIds[m],figma.variables.createVariableAlias(tv));bound++;
    });
  }
}
return {collections:out,bound,misses};
`;
};

// ---- pass: styles (Effect Styles = shadows, Paint Styles = gradients) --------------------
// The only pass that writes NO variables — Effect/Paint styles hold resolved values, so there's no
// alias graph and no ordering constraint against the other passes. Both style sets are written
// (`shadow/*` light + `shadow-dark/*` dark) because Effect Styles can't carry Figma modes; a
// component swaps the pair by mode instead (the lane decision in `write-plan.ts`).
const stylesPass = (brand: string): string => {
  const { effects, paints } = stylesPlan(brand);
  const E = effects.map((r) => [r.name, r.description, r.effects]);
  const P = paints.map((r) => [r.name, r.description, r.paintType, r.gradientTransform, r.stops]);
  return `const E=${JSON.stringify(E)};
const P=${JSON.stringify(P)};
const effectByName=new Map((await figma.getLocalEffectStylesAsync()).map(s=>[s.name,s]));
let effectsCreated=0;
for(const [name,desc,effects] of E){
  let s=effectByName.get(name);
  if(!s){s=figma.createEffectStyle();s.name=name;effectByName.set(name,s);effectsCreated++;}
  s.description=desc;s.effects=effects;
}
const paintByName=new Map((await figma.getLocalPaintStylesAsync()).map(s=>[s.name,s]));
let paintsCreated=0;
for(const [name,desc,paintType,gradientTransform,stops] of P){
  let s=paintByName.get(name);
  if(!s){s=figma.createPaintStyle();s.name=name;paintByName.set(name,s);paintsCreated++;}
  s.description=desc;
  s.paints=[{type:paintType,gradientTransform:gradientTransform,gradientStops:stops}];
}
return {effects:{total:E.length,created:effectsCreated},paints:{total:P.length,created:paintsCreated}};
`;
};

// ---- pass: text-styles (the only pass that must LOAD a resource) ------------------------
// Text Styles are a third API surface (`figma.createTextStyle`), and the first write that must
// `loadFontAsync` before `fontName` can be set. FONT FALLBACK = SKIP-WITH-WARNING (the #237 owner
// decision, mirrored from `apps/plugin/src/write-text-styles.ts`): a family/style that won't load is
// recorded in `skipped[]`, never substituted with a wrong face and never thrown — so one missing
// weight costs one style rather than the whole paste.
//
// The loads are HOISTED and DE-DUPED by face, which is a budget fix rather than a tidy-up: the live
// drive found 38 styles resolving to 4 distinct faces (Inter Bold/Regular/Semi Bold, JetBrains Mono
// Regular), and 38 sequential awaits tripped `figma_execute`'s 5s ceiling on re-paste. Loading each
// face once keeps the pass well inside it. Skip-with-warning is preserved exactly: a face that fails
// to load is recorded `false` in the ledger, and every style wanting it lands in `skipped[]`.
//
// Must be pasted AFTER `font-vars`: the three bound props resolve their targets by name, and the
// name map is built from an UNFILTERED `getLocalVariablesAsync()` (the #146 lesson — a type-filtered
// fetch would miss the STRING family var alongside the FLOAT size/weight vars).
const textStylesPass = (brand: string): string => {
  const T = textStylePlan(brand).map((r) => [
    r.name, r.description, r.fontFamilyVar, r.fontFamilyPrimary, r.fontSizeVar,
    r.fontWeightVar, r.fontStyle, r.lineHeightPct, r.letterSpacingPct, r.textCase, r.textDecoration,
  ]);
  return `const T=${JSON.stringify(T)};
const byName=new Map((await figma.getLocalTextStylesAsync()).map(s=>[s.name,s]));
const varByName=new Map((await figma.variables.getLocalVariablesAsync()).map(v=>[v.name,v]));
let created=0,bound=0;const skipped=[],misses=[];
// load each DISTINCT face once, up front: 38 styles resolve to 4 faces, and 38 sequential
// awaits overran figma_execute's 5s ceiling. \`faces\` doubles as the skip ledger below.
const faces=new Map();
for(const r of T){
  const key=r[3]+'\\u0000'+r[6];
  if(faces.has(key))continue;
  try{await figma.loadFontAsync({family:r[3],style:r[6]});faces.set(key,true);}
  catch(e){faces.set(key,false);}
}
for(const [name,desc,famVar,face,sizeVar,weightVar,style,lhPct,lsPct,tCase,tDec] of T){
  if(!faces.get(face+'\\u0000'+style)){skipped.push({name:name,reason:'font unavailable: '+face+' '+style});continue;}
  let s=byName.get(name);
  if(!s){s=figma.createTextStyle();s.name=name;byName.set(name,s);created++;}
  s.description=desc;
  s.fontName={family:face,style:style};
  s.lineHeight={unit:'PERCENT',value:lhPct};
  s.letterSpacing={unit:'PERCENT',value:lsPct};
  s.textCase=tCase;s.textDecoration=tDec;
  for(const [field,target] of [['fontFamily',famVar],['fontSize',sizeVar],['fontWeight',weightVar]]){
    if(!target)continue;
    const v=varByName.get(target);
    if(!v){misses.push(name+'.'+field+' -> '+target);continue;}
    s.setBoundVariable(field,v);bound++;
  }
}
return {total:T.length,created,bound,skipped,misses};
`;
};

// ---- #479: prune REPORT (plan-vs-file diff, never a delete) -----------------------------
// One orphan the diff can name: a variable present in a live collection but absent from the
// current plan. `reason` is a cheap, deterministic classification from the two name sets alone —
// no extra reads, since the live drive that opened #479 found both shapes fell out of the name
// sets by construction:
//   - a name that is now a PATH PREFIX of a planned name (`color/interactive/primary/text` beside
//     `.../text/rest`) is a flat leaf stranded when that path became a stateful group.
//   - anything else is simply gone from the plan with no structural relation left (an entire
//     pre-rename palette generation — `palette/accent/*` after the rename to `red`).
// PURE — exported so `test.ts` can assert the algorithm against synthetic file/plan name sets with
// no live Figma. `verifyPass` below inlines the SAME two functions as generated JS rather than
// importing this one: the pass runs inside Figma's execution sandbox pasted via `figma_execute`,
// not Node, so it can no more `import` this than `colorAliasesPass` can import `aliasRows` — every
// pass in this file re-states its own logic as a string for that reason. Kept side by side with the
// inline copy below so a change to one is a change you're looking at making to the other.
export type OrphanInfo = { name: string; reason: string };
export const pruneReport = (existing: Iterable<string>, planned: Iterable<string>): OrphanInfo[] => {
  const plannedArr = [...planned];
  const keep = new Set(plannedArr);
  return [...existing]
    .filter((n) => !keep.has(n))
    .sort()
    .map((name) => ({
      name,
      reason: plannedArr.some((p) => p.startsWith(`${name}/`))
        ? 'path now used as a group prefix, not a leaf'
        : 'no longer referenced by any current plan',
    }));
};

// ---- pass: verify (API-probe read-back; the collapse guard + the #479 prune report live here) --
const verifyPass = (brand: string): string => {
  const modes = colourModes(brand);
  const plan = planFor(brand);
  const PLANNED_PALETTE = plan.palette.map((r) => r.name);
  const PLANNED_COLOR = plan.color.create.map((r) => r.name);
  return `${PRELUDE}
const MODES=${JSON.stringify(modes)};
const vars=await figma.variables.getLocalVariablesAsync();
const col=await findCol('color');
const cvars=vars.filter(v=>v.variableCollectionId===col.id);
const byName=new Map(cvars.map(v=>[v.name,v]));
const modeIds={};MODES.forEach(m=>{const mm=col.modes.find(x=>x.name===m);modeIds[m]=mm&&mm.modeId;});
const targetOf=(val)=>val&&val.type==='VARIABLE_ALIAS'?(vars.find(x=>x.id===val.id)||{}).name:JSON.stringify(val);
// modes-distinct guard: background/primary must NOT be identical across modes (the collapse bug)
const probe=byName.get('color/background/primary');
const perMode=Object.fromEntries(MODES.map(m=>[m,targetOf(probe&&probe.valuesByMode[modeIds[m]])]));
const modesDistinct=new Set(Object.values(perMode)).size>1;
const scope=(n)=>{const v=byName.get(n);return v?[...v.scopes].sort().join(','):'ABSENT';};
const absent=(n)=>!byName.has(n);
// #479 — plan-vs-file diff, REPORT ONLY: a name present in the file's collection but absent from
// this plan is an orphan, most often a rename create-or-update-by-name can never detect on its own.
// Nothing here deletes anything — see \`pruneReport\` in materialise-to-figma.ts for why that stays a
// separate, ungranted decision.
const PLANNED_PALETTE=${JSON.stringify(PLANNED_PALETTE)};
const PLANNED_COLOR=${JSON.stringify(PLANNED_COLOR)};
const palCol=await findCol('core-palette');
const palVars=palCol?vars.filter(v=>v.variableCollectionId===palCol.id):[];
const orphanReason=(name,planned)=>planned.some(p=>p.indexOf(name+'/')===0)?'path now used as a group prefix, not a leaf':'no longer referenced by any current plan';
const pruneReport=(existingNames,planned)=>{const keep=new Set(planned);return existingNames.filter(n=>!keep.has(n)).sort().map(n=>({name:n,reason:orphanReason(n,planned)}));};
const orphans={
  'core-palette':pruneReport(palVars.map(v=>v.name),PLANNED_PALETTE),
  'color':pruneReport(cvars.map(v=>v.name),PLANNED_COLOR),
};
return {
  colorVars:cvars.length,
  modes:col.modes.map(m=>m.name),
  modesDistinct,
  backgroundPrimaryByMode:perMode,
  slotScopes:{
    'interactive/primary/text':scope('color/interactive/primary/text'),
    'interactive/primary/border/rest':scope('color/interactive/primary/border/rest'),
    'interactive/primary/border/hover':scope('color/interactive/primary/border/hover'),
    'interactive/primary/border/pressed':scope('color/interactive/primary/border/pressed'),
    'disabled/fill':scope('color/disabled/fill'),
    'disabled/on-fill':scope('color/disabled/on-fill'),
    'disabled/text':scope('color/disabled/text'),
    'disabled/icon':scope('color/disabled/icon'),
    'disabled/border':scope('color/disabled/border'),
    'field/fill':scope('color/field/fill'),
    'field/border/rest':scope('color/field/border/rest'),
    'field/border/hover':scope('color/field/border/hover'),
    'field/placeholder':scope('color/field/placeholder'),
  },
  fieldFamilyPresent:['color/field/fill','color/field/border/rest','color/field/border/hover','color/field/placeholder'].every(n=>byName.has(n)),
  retiredRolesAbsent:['color/action/default','color/text/on-action','color/text/on-disabled','color/foreground/danger/default'].every(absent),
  // renamed by #86 (.surface -> .fill / .on-disabled -> .on-fill) + field never used .surface — all must be gone.
  // field/border also went flat-leaf -> border/{rest,hover} (stateful slot), so the flat leaf must be gone too.
  renamedRolesAbsent:['color/disabled/surface','color/disabled/on-disabled','color/field/surface','color/field/border'].every(absent),
  bareDangerPresent:byName.has('color/foreground/danger'),
  orphans,
};
`;
};

// ---- CLI --------------------------------------------------------------------------------
// Every pass returns a LIST of payloads. All but `color-create` return exactly one, and the list is
// the point: a pass that outgrows the transport becomes N payloads without changing what it is
// called, so `ORDER` stays the paste order a human follows rather than growing a name each time a
// lane fills up.
const PASSES: Record<string, (b: string) => string[]> = {
  palette: (b) => [palettePass(b)],
  'color-create': (b) => colorCreateChunks(b).map((c) => c.js),
  'color-aliases': (b) => [colorAliasesPass(b)],
  'dims-create': (b) => [dimsCreatePass(b)], 'dims-aliases': (b) => [dimsAliasesPass(b)],
  'font-vars': (b) => [fontVarsPass(b)], 'text-styles': (b) => [textStylesPass(b)],
  styles: (b) => [stylesPass(b)], verify: (b) => [verifyPass(b)],
};
// Colour, then floats, then typography, then styles — the lanes don't alias each other, so the order
// BETWEEN them is a convention; WITHIN each lane create-before-alias is a hard requirement. The one
// cross-lane constraint that IS real: `text-styles` after `font-vars`, because a Text Style's
// `setBoundVariable` resolves `font/family/*`, `font/weight-role/*` and `font-fluid/*` by name.
const ORDER = [
  'palette', 'color-create', 'color-aliases', 'dims-create', 'dims-aliases',
  'font-vars', 'text-styles', 'styles', 'verify',
];

/** The pass payloads, exposed so the suite can assert on what would actually be pasted rather than
 *  on a re-derivation of it. Byte-for-byte the same string the CLI prints. */
export const passPayloads = (brand: string, name: string): string[] => {
  const fn = PASSES[name];
  if (!fn) throw new Error(`unknown pass '${name}' — one of: ${ORDER.join(', ')}`);
  return fn(brand);
};
/** One payload. `index` selects among a chunked pass's payloads; out of range throws rather than
 *  returning `undefined`, because a caller asking for chunk 4 of 3 is holding a stale count. */
export const passJs = (brand: string, name: string, index = 0): string => {
  const all = passPayloads(brand, name);
  if (index < 0 || index >= all.length) throw new Error(`pass '${name}' has ${all.length} payload(s); no index ${index}`);
  return all[index];
};
export const passOrder = (): string[] => [...ORDER];

// CLI — wrapped so importing `aliasRows` into the test suite is side-effect-free.
const runCli = (): void => {
  const argv = process.argv.slice(2);
  const brand = argv.find((a) => !a.startsWith('--')) ?? 'nb';
  const passIdx = argv.indexOf('--pass');
  const pass = passIdx >= 0 ? argv[passIdx + 1] : undefined;

  if (pass) {
    const fn = PASSES[pass];
    if (!fn) { console.error(`unknown --pass '${pass}' — one of: ${ORDER.join(', ')}`); process.exit(1); }
    const chunkIdx = argv.indexOf('--chunk');
    const all = fn(brand);
    if (chunkIdx >= 0) {
      const i = Number(argv[chunkIdx + 1]) - 1;   // 1-based, because a human is pasting them in order
      if (!Number.isInteger(i) || i < 0 || i >= all.length) { console.error(`--chunk must be 1..${all.length} for pass '${pass}'`); process.exit(1); }
      process.stdout.write(all[i]);
    } else if (all.length > 1) {
      // NEVER concatenate. Two payloads joined are one over-budget payload — the exact failure this
      // change exists to prevent, and it would be discovered in Figma rather than here.
      console.error(`pass '${pass}' is ${all.length} payloads; ask for one: --pass ${pass} --chunk 1..${all.length}`);
      process.exit(1);
    } else {
      process.stdout.write(all[0]);
    }
  } else {
    // manifest: byte size per payload + the paste order + the number that means something.
    const BUDGET = 45_000;
    console.log(`materialise-to-figma — brand '${brand}', colour modes: ${colourModes(brand).join(', ')}`);
    console.log('Paste each pass into figma_execute IN ORDER (palette first — the color aliases target it):\n');
    for (const name of ORDER) {
      const all = PASSES[name](brand);
      if (all.length === 1) {
        const size = Buffer.byteLength(all[0], 'utf8');
        // FULLNESS ON EVERY RUN, not a flag that fires once the wall is hit (#906). `color-create`
        // sat at 97.3% and reported nothing, because the only signal was `> BUDGET`.
        const pct = Math.round((size / BUDGET) * 100);
        const flag = size > BUDGET ? '  ⚠ OVER BUDGET' : pct >= 80 ? '  ⚠ little headroom' : '';
        console.log(`  ${name.padEnd(14)} ${String(size).padStart(7)} bytes  ${String(pct).padStart(3)}% of ${BUDGET}${flag}`);
      } else {
        console.log(`  ${name.padEnd(14)} ${all.length} chunks — paste each with --chunk 1..${all.length}`);
        all.forEach((js, i) => {
          const size = Buffer.byteLength(js, 'utf8');
          console.log(`    L chunk ${i + 1}      ${String(size).padStart(7)} bytes  ${String(Math.round((size / BUDGET) * 100)).padStart(3)}% of ${BUDGET}${size > BUDGET ? '  ⚠ OVER BUDGET' : ''}`);
        });
      }
    }
    // The ceiling a human can act on. NOT worst-chunk fullness: the packer fills a chunk until the
    // next row will not fit, so that number reads ~99% whether the system is healthy or doomed — the
    // lesson `tools/nest-exposed-cost/measure.ts` records after a reviewer refused it on #761. What
    // chunking cannot rescue is one row too big for one payload, so that is what is reported.
    const u = colorIndivisibleUnit(brand);
    console.log(`\n  color-create headroom — the number that means something:`);
    console.log(`    largest single variable   ${u.worstBytes} bytes (${u.worstRow})`);
    console.log(`    room for rows per payload ${u.capacity} bytes (${COLOR_CHUNK_BYTES} budget minus ${u.shellBytes} shell)`);
    console.log(`    indivisible unit          ${(u.pct * 100).toFixed(1)}% of one payload${u.pct >= 0.5 ? '  ⚠ a single variable is approaching a whole payload' : ''}`);
    console.log(`    Adding variables adds CHUNKS, not risk. This percentage is the wall chunking cannot move.`);
    console.log(`\nEmit one pass:  npx tsx packages/engine/materialise-to-figma.ts ${brand} --pass <name> [--chunk N]`);
    console.log('The `verify` pass reads back via getLocalVariablesAsync, asserts modes are distinct,');
    console.log('and reports (never deletes) orphaned variables per collection — a plan-vs-file diff for renames (#479).');
  }
};

// Run the CLI only when invoked directly — not when test.ts imports `aliasRows`.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
