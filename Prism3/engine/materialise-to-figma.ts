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
 *   - **API-probe verification** — the `verify` pass reads back via `getLocalVariablesAsync`
 *     (authoritative for scopes / aliases / modes / hidden), and asserts **modes are distinct**
 *     (the collapse guard) + reports the interactive/disabled slot scopes.
 *
 * SHELL (not pure): reads `out/figma/<brand>/`, prints plugin JS to stdout. No Figma I/O
 * here — the emitter lane pastes the output into `figma_execute`.
 *
 *   npx tsx Prism3/engine/materialise-to-figma.ts <brand>            # manifest: passes + byte sizes
 *   npx tsx Prism3/engine/materialise-to-figma.ts <brand> --pass palette
 *   npx tsx Prism3/engine/materialise-to-figma.ts <brand> --pass color-create
 *   npx tsx Prism3/engine/materialise-to-figma.ts <brand> --pass color-aliases
 *   npx tsx Prism3/engine/materialise-to-figma.ts <brand> --pass verify
 *
 * Scope today: the `core-palette` + `color` collections (what the round-trip re-test needs).
 * Other axes (dims / layout / font / shadow) can be added the same way when needed.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { FigmaCollectionFile } from './emit-figma';
import { buildWritePlan, floatPlanFor } from './write-plan';
import type { WritePlan, FloatCollectionPlan } from './write-plan';

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

const load = (brand: string, file: string): FigmaCollectionFile => {
  const p = resolve(HERE, `out/figma/${brand}/${file}`);
  if (!existsSync(p)) throw new Error(`missing emitted file: ${p} — run \`npx tsx Prism3/engine/emit-figma.ts\` first`);
  return JSON.parse(readFileSync(p, 'utf8'));
};

// Which colour modes did this brand emit? (light/dark/hc-* always; wireframe if opted in.)
const colourModes = (brand: string): string[] =>
  MODE_ORDER.filter((m) => existsSync(resolve(HERE, `out/figma/${brand}/color.${m}.json`)));

// The disk-read SHELL: read the emitted raw-figma files → collections → the pure `buildWritePlan`.
// Every pass below (and `aliasRows`) projects THIS plan, so the CLI paste-path and the live plugin
// executor (`plugin/src/write-figma.ts`) share one source of truth for scopes / values / per-mode
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

// ---- the SC decode map + shared helpers, injected into every plugin payload -----------
const PRELUDE = `const SC={f:'FRAME_FILL',s:'SHAPE_FILL',t:'TEXT_FILL',k:'STROKE_COLOR'};
const decode=(c)=>[...c].map(x=>SC[x]);
const cols=async()=>figma.variables.getLocalVariableCollectionsAsync();
const findCol=async(n)=>(await cols()).find(c=>c.name===n);`;

// ---- pass: palette (core-palette, one Default mode, literal values, hidden primitives) --
const palettePass = (brand: string): string => {
  // row: [name, scopeCode, description, value, hidden]
  const P = planFor(brand).palette.map((r) => [r.name, encodeScopes(r.scopes), r.description, r.value, r.hidden ? 1 : 0]);
  return `(async()=>{
${PRELUDE}
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
})()`;
};

// ---- pass: color-create (color collection, N modes, literal fallback values) -----------
const colorCreatePass = (brand: string): string => {
  const { modes, create } = planFor(brand).color;
  // row: [name, scopeCode, description, [value per mode, in `modes` order]]
  const C = create.map((r) => [r.name, encodeScopes(r.scopes), r.description, r.valuesByMode]);
  return `(async()=>{
${PRELUDE}
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
})()`;
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
  return `(async()=>{
${PRELUDE}
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
})()`;
};

// ---- pass: dims-create (every FLOAT collection, N modes, literal fallback values) -------
// One payload for all nine axes rather than nine payloads: floats are small (≈250 variables
// total against colour's thousands), and a single pass keeps the create/alias ordering honest
// without asking whoever pastes it to track nine separate steps.
const dimsCreatePass = (brand: string): string => {
  const FSC = JSON.stringify(Object.fromEntries(Object.entries(FLOAT_SCOPE_CODE).map(([k, v]) => [v, k])));
  // row: [collection, modes, [[name, scopeCode, description, hidden, [value per mode]]]]
  const D = floatPlans(brand).map((p) => [
    p.name, p.modes,
    p.create.map((r) => [r.name, encodeFloatScopes(r.scopes), r.description, r.hidden ? 1 : 0, r.valuesByMode]),
  ]);
  return `(async()=>{
${PRELUDE}
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
})()`;
};

// ---- pass: dims-aliases (rebind PER MODE — the same collapse-proofing as colour) --------
// The float axes alias across collections (`size/md/gap` → `space/100`, `icon/size/md` →
// `dimension/24`), which is why this is a second pass: a target in `space` cannot be bound until
// `space` exists, and dims-create builds all nine before anything binds.
const dimsAliasesPass = (brand: string): string => {
  const A = floatPlans(brand)
    .map((p) => [p.name, p.modes, p.aliases.filter((r) => r.targetsByMode.some((t) => t !== null)).map((r) => [r.name, r.targetsByMode])])
    .filter(([, , rows]) => (rows as unknown[]).length > 0);
  return `(async()=>{
${PRELUDE}
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
})()`;
};

// ---- pass: verify (API-probe read-back; the collapse guard lives here) ------------------
const verifyPass = (brand: string): string => {
  const modes = colourModes(brand);
  return `(async()=>{
${PRELUDE}
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
return {
  colorVars:cvars.length,
  modes:col.modes.map(m=>m.name),
  modesDistinct,
  backgroundPrimaryByMode:perMode,
  slotScopes:{
    'interactive/primary/text':scope('color/interactive/primary/text'),
    'interactive/primary/border':scope('color/interactive/primary/border'),
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
};
})()`;
};

// ---- CLI --------------------------------------------------------------------------------
const PASSES: Record<string, (b: string) => string> = {
  palette: palettePass, 'color-create': colorCreatePass, 'color-aliases': colorAliasesPass,
  'dims-create': dimsCreatePass, 'dims-aliases': dimsAliasesPass, verify: verifyPass,
};
// Colour first, then floats — the two lanes don't alias each other, so the order between them is
// a convention rather than a constraint; WITHIN each lane create-before-alias is a hard requirement.
const ORDER = ['palette', 'color-create', 'color-aliases', 'dims-create', 'dims-aliases', 'verify'];

/** The pass payloads, exposed so the suite can assert on what would actually be pasted rather than
 *  on a re-derivation of it. Byte-for-byte the same string the CLI prints. */
export const passJs = (brand: string, name: string): string => {
  const fn = PASSES[name];
  if (!fn) throw new Error(`unknown pass '${name}' — one of: ${ORDER.join(', ')}`);
  return fn(brand);
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
    process.stdout.write(fn(brand));
  } else {
    // manifest: byte size per pass + the paste order + a budget warning.
    const BUDGET = 45_000;
    console.log(`materialise-to-figma — brand '${brand}', colour modes: ${colourModes(brand).join(', ')}`);
    console.log('Paste each pass into figma_execute IN ORDER (palette first — the color aliases target it):\n');
    for (const name of ORDER) {
      const size = Buffer.byteLength(PASSES[name](brand), 'utf8');
      const flag = size > BUDGET ? '  ⚠ over budget — consider chunking' : '';
      console.log(`  ${name.padEnd(14)} ${String(size).padStart(7)} bytes${flag}`);
    }
    console.log(`\nEmit one pass:  npx tsx Prism3/engine/materialise-to-figma.ts ${brand} --pass <name>`);
    console.log('The `verify` pass reads back via getLocalVariablesAsync and asserts modes are distinct.');
  }
};

// Run the CLI only when invoked directly — not when test.ts imports `aliasRows`.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
