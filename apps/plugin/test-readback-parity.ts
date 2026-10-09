/**
 * READ-BACK PARITY GATE (#2351, gap 2, offline) — after the plugin's Apply Theme writes a brand into a file, the
 * file exports to the same DTCG as the engine's Figma emission of that brand, path by path.
 *
 *   npx tsx apps/plugin/test-readback-parity.ts
 *
 * ── the two sides ─────────────────────────────────────────────────────────────────────────────────
 *
 *   ACTUAL    the brand's design.md → `runApplyTheme` (`src/apply-theme.ts`, the sequence `main.ts` runs on
 *             Apply Theme) → the variables and styles it leaves in `FileShim` (`file-shim.ts`, the one file
 *             model, shared with `test-mcp-paste.ts`) → TokenPress's real `TokenExporter`, reading the shim
 *             as its host.
 *   EXPECTED  the committed `packages/engine/out/figma/<brand>/*.json` → the exporter-comparison adapter
 *             (`tools/exporter-comparison/adapt-figma-emission.ts`) → the same `TokenExporter`, same options.
 *
 * The exporter is held constant on purpose: both sides go through it, so what differs is the FILE, and the file is
 * the subject. A defect in the exporter moves both sides together and is `tools/exporter-comparison/gate.ts`'s to
 * find; that gate is also what holds the expected side to the engine's DTCG (`out/<brand>.base` + overlays) on the
 * arms where a difference is a defect: types, unpaired paths, the namespace, opacity scale. So the chain is
 *     Apply Theme's file  ⇐ this gate ⇒  the Figma emission  ⇐ gate.ts ⇒  the engine's DTCG.
 * Value agreement between the emission and the engine's DTCG is gate.ts's category 3, deliberately unpinned
 * (#697: two valid serializations), so this gate does not claim it.
 *
 * ── independence (docs/34) ────────────────────────────────────────────────────────────────────────
 *
 * The expected side never runs the plugin. It is the emission `regen.ts` writes through `figmaArtifacts(theme)` and
 * `regen --check` holds, read from disk. The actual side never reads that emission: Apply Theme builds its plans
 * from the BrandInput through `write-plan.ts` and writes them with the plugin's executors. The two share the
 * engine's theme and its color projection (`buildFigmaColor`), which is the point of comparing them: the subject is
 * the WRITE (plans, executors, renames, the styles writers), not the theme.
 *
 * ── the rule, stated ──────────────────────────────────────────────────────────────────────────────
 *
 * Each exported leaf is keyed by `<zip file>#<token path>`. A difference is printed by key, as one of:
 *   ADDED      in the shim's export, not the emission's;
 *   REMOVED    in the emission's export, not the shim's;
 *   RETYPED    the same key, a different `$type`;
 *   VALUE      the same key and type, a different `$value` beyond the tolerance below;
 *   DESCRIPTION the same key, a different `$description`.
 * Every count is asserted at 0. `$extensions` is not compared: it carries the host's variable ids, which differ
 * between any two files by construction.
 *
 * THE TOLERANCE, the only one: a number inside a COLOR (a `components` entry or an `alpha`) may differ by up to
 * HALF AN 8-BIT STEP, 0.5/255. The emission stores a channel as the float32 Figma returns (0.1725490242242813), the
 * shim keeps the float64 the executor wrote (0.17254901960784313), and the exporter rounds each to four places,
 * which can land them 0.0001 apart. Half a step is the largest difference that cannot change the 8-bit color a
 * designer sees. Every other number (a dimension, a weight, a duration, a ratio) and every string, alias included,
 * must be equal.
 *
 * ── the one value shape the exporter cannot read: the tinted wash (#2365) ──────────────────────────
 *
 * Since #1646 Apply Theme writes a tinted wash as an ALIAS WITH OPACITY (`{ color: alias, opacity: alias }`). TokenPress
 * does not read that shape and exports a color with null components; the adapter on the expected side drops the
 * opacity and exports a plain alias. So for exactly those leaves the export comparison would compare two wrong
 * answers. They are carved out as a MEMORY, not a count: the carved set is the emission's own `aliasOpacity`
 * variables × their modes (read from the emission, never from either export), every one of them must show the
 * VALUE difference (a bijection, so a wash TokenPress learns to read fails here and the carve-out is removed with
 * #2365), and each wash is then checked AS WRITTEN in the file: its color alias and its opacity alias, by name, in
 * every mode, against the emission's.
 *
 * ── the two style channels no exporter reads ──────────────────────────────────────────────────────
 *
 * TokenPress reads variables, text styles and effect styles. It reads no paint styles (#731) and no grid styles, so
 * the gradients and grids Apply Theme writes would pass any export comparison by being absent from both sides.
 * They are compared AS WRITTEN instead, shim against emission: the same style names, descriptions, grids, and
 * gradient stops (position, color within the tolerance above, and the variable each stop is bound to). Not
 * compared: a gradient's transform matrix, which the emission states as an angle in its description.
 *
 * ── motion: the round trip to the engine's DTCG (#2394) ─────────────────────────────────────────────
 *
 * Figma has no time scope, so motion goes into the file as plain FLOAT milliseconds, and the export is what turns
 * them back into DTCG durations. The two exports above are compared with each other, so a motion value both sides
 * carry wrong would pass. This arm takes its expected side from neither: every `duration` leaf under `<root>.motion`
 * in `out/<brand>.tokens.json`, the DTCG the engine writes through `emit-dtcg.ts`/`cli.ts`, which runs no Figma
 * emitter, no write plan and no executor. Each motion leaf in an export (`<mode>/motion.json`, or
 * `shared/motion.json` for one mode) must be one of those paths, typed `duration`, and hold the same value: the
 * same alias, or the same milliseconds. TokenPress writes `{ value: 200, unit: "ms" }` by default and the engine
 * writes `"200ms"`; both spell one duration (#697), so the comparison is in milliseconds, with no tolerance. A
 * mode other than `Default` reads the leaf's `$extensions.prism3.modes.<mode>` re-point, as the emitter does.
 * It runs on the shim's export for every applied brand, and on the emission's export for every brand, nb included.
 *
 * ── which brands ──────────────────────────────────────────────────────────────────────────────────
 *
 * Every brand with a Figma emission, discovered by listing `out/figma/`, each placed in SOURCES (its design.md) or
 * EXCLUDED (with why), and each entry checked against the listing in both directions. `nb` is excluded: its
 * emission is built from `nbTheme()` and the measured reference rather than a BrandInput, so there is no brief to
 * apply. A floor on the gated count stops an empty listing from passing.
 *
 * ── follow-ups, not built here (#2351) ─────────────────────────────────────────────────────────────
 *
 *   · the LIVE read-back: the same diff over a real Figma file through the agent link's `readback`, as a script the
 *     owner or an agent runs;
 *   · the product question of what TokenPress is for, which decides whether this exporter stays the plugin's.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BrandInput } from '@prism3/engine/theme';
import { FileShim } from './file-shim';
import { runApplyTheme, themePlans } from './src/apply-theme';
import { brandFromDesignMd } from './mcp-paste';
import { adaptBrand } from '../../tools/exporter-comparison/adapt-figma-emission.ts';
import type { Adapted } from '../../tools/exporter-comparison/adapt-figma-emission.ts';
import { runTokenPress } from '../../tools/exporter-comparison/run-tokenpress.ts';

const REPO = join(import.meta.dirname, '..', '..');
const FIGMA_OUT = join(REPO, 'packages/engine/out/figma');
const EXAMPLES = join(REPO, 'packages/engine/examples');

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/** The brief each brand's emission was compiled from (`emit-figma.ts`), applied here the way a person would. */
const SOURCES: Record<string, string> = { prism3: 'prism3.design.md', aurora: 'aurora.design.md', wendys: 'wendys.design.md' };
const EXCLUDED: Record<string, string> = {
  nb: 'the regression fixture: its emission is built from nbTheme() and the measured reference, not from a BrandInput, so there is no brief to apply',
};
const MIN_BRANDS = 3;
/** Half an 8-bit step: the largest channel difference that cannot change the color a designer sees. */
const COLOR_TOL = 0.5 / 255;
/** How many differences of each kind to print before summarizing. */
const SHOW = 12;

// ── the comparison ──────────────────────────────────────────────────────────────────────────────────
type Leaf = { $type?: string; $value: unknown; $description?: string };

/** Every token leaf in the export, keyed `<zip file>#<dotted path>`. */
const leavesOf = (files: Map<string, unknown>): Map<string, Leaf> => {
  const out = new Map<string, Leaf>();
  const walk = (file: string, node: unknown, path: string[]): void => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if ('$value' in (node as object)) { out.set(`${file}#${path.join('.')}`, node as Leaf); return; }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(file, v, [...path, k]);
  };
  for (const [file, json] of files) walk(file, json, []);
  return out;
};

/** Equal, under the one tolerance: numbers under a color key (`components`, `alpha`, `r`/`g`/`b`/`a`) within half
 *  an 8-bit step, everything else exactly. `inColor` is set by the leaf's type or by a `color` key on the way down. */
const same = (a: unknown, b: unknown, inColor: boolean): boolean => {
  if (typeof a === 'number' && typeof b === 'number') return inColor ? Math.abs(a - b) <= COLOR_TOL : a === b;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i], inColor));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    return ka.join() === kb.join() && ka.every((k) => same((a as any)[k], (b as any)[k], inColor || k === 'color'));
  }
  return a === b;
};

type Diff = { kind: 'ADDED' | 'REMOVED' | 'RETYPED' | 'VALUE' | 'DESCRIPTION'; key: string; detail: string };
const J = (x: unknown): string => { const s = JSON.stringify(x); return s && s.length > 140 ? `${s.slice(0, 140)}…` : String(s); };

const diffExports = (actual: Map<string, Leaf>, expected: Map<string, Leaf>): Diff[] => {
  const out: Diff[] = [];
  for (const [k, a] of actual) if (!expected.has(k)) out.push({ kind: 'ADDED', key: k, detail: `${a.$type} ${J(a.$value)}` });
  for (const [k, e] of expected) {
    const a = actual.get(k);
    if (!a) { out.push({ kind: 'REMOVED', key: k, detail: `${e.$type} ${J(e.$value)}` }); continue; }
    if (a.$type !== e.$type) { out.push({ kind: 'RETYPED', key: k, detail: `shim ${a.$type}, emission ${e.$type}` }); continue; }
    if (!same(a.$value, e.$value, a.$type === 'color')) out.push({ kind: 'VALUE', key: k, detail: `shim ${J(a.$value)}, emission ${J(e.$value)}` });
    if ((a.$description ?? '') !== (e.$description ?? '')) out.push({ kind: 'DESCRIPTION', key: k, detail: `shim ${J(a.$description)}, emission ${J(e.$description)}` });
  }
  return out;
};

// ── the tinted washes (#2365) ───────────────────────────────────────────────────────────────────────
type Wash = { name: string; mode: string; color: string; opacity: string };
/** Every alias-with-opacity value the emission plans, per mode, read from its own color files. */
const washesOf = (brand: string): Wash[] => {
  const out: Wash[] = [];
  for (const f of readdirSync(join(FIGMA_OUT, brand)).filter((x) => x.endsWith('.json')).sort()) {
    const j = JSON.parse(readFileSync(join(FIGMA_OUT, brand, f), 'utf8')) as { $mode?: string; variables?: any[] };
    for (const v of j.variables ?? []) if (v.aliasOpacity) out.push({ name: v.name, mode: j.$mode ?? '', color: v.alias?.name, opacity: v.aliasOpacity.name });
  }
  return out;
};
/** The export key a wash lands on: TokenPress writes a collection's mode as `<mode>/<collection>.json`. */
const washKey = (w: Wash, collection: string): string => `${w.mode}/${collection}.json#${w.name.replace(/\//g, '.')}`;

// ── the style channels no exporter reads ───────────────────────────────────────────────────────────
type EmissionStyles = { styles: Record<string, any>[] };
const readStyles = (brand: string, file: string): Record<string, any>[] => {
  try { return (JSON.parse(readFileSync(join(FIGMA_OUT, brand, file), 'utf8')) as EmissionStyles).styles; } catch { return []; }
};

/** A grid style as both sides can state it. */
const gridShape = (s: any) => ({ name: s.name, description: s.description ?? '', layoutGrids: s.layoutGrids });
/** A gradient as both sides can state it: name, description, and per stop its position, color and bound variable. */
const gradientFromShim = (s: any, varName: (id: string) => string | undefined) => ({
  name: s.name, description: s.description ?? '',
  stops: (s.paints?.[0]?.gradientStops ?? []).map((g: any) => ({ position: g.position, color: g.color, alias: g.boundVariables?.color ? varName(g.boundVariables.color.id) ?? null : null })),
});
const gradientFromEmission = (s: any) => ({
  name: s.name, description: s.description ?? '',
  stops: (s.stops ?? []).map((g: any) => ({ position: g.position, color: g.color, alias: g.alias ?? null })),
});

/** Name-keyed comparison of one style channel: missing, extra, and changed, each printed by name. */
const compareStyles = (label: string, actual: any[], expected: any[]): Diff[] => {
  const out: Diff[] = [];
  const A = new Map(actual.map((s) => [s.name, s])), E = new Map(expected.map((s) => [s.name, s]));
  for (const [n, s] of A) if (!E.has(n)) out.push({ kind: 'ADDED', key: `${label}#${n}`, detail: J(s) });
  for (const [n, e] of E) {
    const a = A.get(n);
    if (!a) out.push({ kind: 'REMOVED', key: `${label}#${n}`, detail: J(e) });
    else if (!same(a, e, false)) out.push({ kind: 'VALUE', key: `${label}#${n}`, detail: `shim ${J(a)}, emission ${J(e)}` });
  }
  return out;
};

/** Print a brand's differences grouped by kind, a few of each, and assert each kind at 0 by name. */
const report = (where: string, diffs: Diff[], kinds: Diff['kind'][]): void => {
  for (const kind of kinds) {
    const mine = diffs.filter((d) => d.kind === kind);
    ok(mine.length === 0, `${where}: ${kind} — ${mine.length}`);
    for (const d of mine.slice(0, SHOW)) console.error(`      ${kind} ${d.key}: ${d.detail}`);
    if (mine.length > SHOW) console.error(`      … and ${mine.length - SHOW} more`);
  }
};

// ── motion: the round trip to the engine's DTCG (#2394) ─────────────────────────────────────────────
/** Every DTCG `duration` leaf under `<root>.motion`, by dotted path, from the engine's own token tree. */
const dtcgDurations = (brand: string): Map<string, any> => {
  const tree = JSON.parse(readFileSync(join(REPO, 'packages/engine/out', `${brand}.tokens.json`), 'utf8'));
  const root = Object.keys(tree).find((k) => !k.startsWith('$'))!;
  const out = new Map<string, any>();
  const walk = (node: any, path: string[]): void => {
    if (!node || typeof node !== 'object') return;
    if ('$value' in node) { if (node.$type === 'duration') out.set(path.join('.'), node); return; }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...path, k]);
  };
  walk(tree[root]?.motion, [root, 'motion']);
  return out;
};
/** Milliseconds from either spelling of a duration — `"200ms"` or `{ value: 200, unit: "ms" }` — else undefined. */
const msOf = (v: unknown): number | undefined => {
  if (typeof v === 'string') { const m = /^(-?\d+(?:\.\d+)?)ms$/.exec(v); return m ? Number(m[1]) : undefined; }
  if (v && typeof v === 'object' && (v as any).unit === 'ms' && typeof (v as any).value === 'number') return (v as any).value;
  return undefined;
};
const isRef = (v: unknown): v is string => typeof v === 'string' && /^\{.+\}$/.test(v);
/** The export's motion leaves against the DTCG's: MISSING, EXTRA, RETYPED and VALUE, each by `<file>#<path>`. */
const motionRoundTrip = (exported: Map<string, Leaf>, dtcg: Map<string, any>): Diff[] => {
  const out: Diff[] = [];
  const files = new Set([...exported.keys()].filter((k) => k.split('#')[0].endsWith('/motion.json')).map((k) => k.split('#')[0]));
  if (!files.size) files.add('shared/motion.json'); // no motion file at all: every DTCG duration reads as missing
  for (const file of files) {
    // One mode exports as `shared/`; with more, the emitter's base mode is `Default` and the rest are re-points.
    const mode = file.split('/')[0];
    const first = mode === 'shared' || mode === 'Default';
    for (const [k, a] of exported) {
      const [f, path] = k.split('#');
      if (f !== file) continue;
      const leaf = dtcg.get(path);
      if (!leaf) { out.push({ kind: 'ADDED', key: k, detail: `${a.$type} ${J(a.$value)} — no duration at this path in the engine's DTCG` }); continue; }
      if (a.$type !== 'duration') { out.push({ kind: 'RETYPED', key: k, detail: `export ${a.$type}, engine duration` }); continue; }
      const want = first ? leaf.$value : leaf.$extensions?.prism3?.modes?.[mode]?.$value ?? leaf.$value;
      const agree = isRef(want) ? a.$value === want : msOf(a.$value) !== undefined && msOf(a.$value) === msOf(want);
      if (!agree) out.push({ kind: 'VALUE', key: k, detail: `export ${J(a.$value)}, engine ${J(want)}` });
    }
    for (const path of dtcg.keys()) if (!exported.has(`${file}#${path}`)) out.push({ kind: 'REMOVED', key: `${file}#${path}`, detail: `engine ${J(dtcg.get(path).$value)}, not in the export` });
  }
  return out;
};
/** The floor: a brand whose DTCG has no motion durations would make every arm above vacuous. */
const MIN_MOTION_DURATIONS = 20;

// ── the brands: discovered, then placed ─────────────────────────────────────────────────────────────
console.log(`Read-back parity (#2351 gap 2, offline) — Apply Theme's file vs the engine's Figma emission\n${'='.repeat(78)}`);
const discovered = readdirSync(FIGMA_OUT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
for (const id of discovered) ok(id in SOURCES || id in EXCLUDED, `brands: ${id} is placed (a design.md to apply, or excluded with a reason)`);
for (const id of [...Object.keys(SOURCES), ...Object.keys(EXCLUDED)]) ok(discovered.includes(id), `brands: ${id} still has a Figma emission (out/figma/${id}/)`);
for (const [id, why] of Object.entries(EXCLUDED)) console.log(`  · ${id}: excluded — ${why}`);
const GATED = discovered.filter((id) => id in SOURCES);
ok(GATED.length >= MIN_BRANDS, `brands: ${GATED.length} gated (${GATED.join(', ')}), at least ${MIN_BRANDS}`);

for (const brand of GATED) {
  console.log(`\n${brand}`);
  try {
    const input: BrandInput = brandFromDesignMd(readFileSync(join(EXAMPLES, SOURCES[brand]), 'utf8'));
    // ACTUAL: a fresh file, every face the brand's text plan asks for available, then the plugin's Apply Theme.
    const file = new FileShim();
    const faces = new Map<string, { family: string; style: string }>();
    for (const r of themePlans(input).textPlan) faces.set(`${r.fontFamilyPrimary}|${r.fontStyle}`, { family: r.fontFamilyPrimary, style: r.fontStyle });
    file.faces = [...faces.values()];
    const applied = await runApplyTheme(input, file as any);
    ok(applied.guarded.ok === true, `${brand}: Apply Theme ran without a pre-flight refusal`);
    ok(file.vars.length > 0 && file.styles.text.length > 0 && file.styles.effect.length > 0,
      `${brand}: the file holds what Apply Theme wrote (${file.vars.length} variables, ${file.styles.text.length} text, ${file.styles.effect.length} effect, ${file.styles.grid.length} grid, ${file.styles.paint.length} paint styles)`);

    // The shim is a host: TokenPress reads its variables and styles directly, the way it reads Figma's.
    const fromShim: Adapted = { collections: file.collections, variables: file.vars, textStyles: file.styles.text, effectStyles: file.styles.effect } as unknown as Adapted;
    const actual = leavesOf((await runTokenPress(fromShim)).files);
    const expected = leavesOf((await runTokenPress(adaptBrand(brand, join(FIGMA_OUT, brand)))).files);
    ok(expected.size > 0 && actual.size > 0, `${brand}: both exports hold tokens (shim ${actual.size}, emission ${expected.size})`);
    // The washes: carved out of the export comparison as a bijection, then checked as written (#2365).
    const washes = washesOf(brand);
    const byName = new Map(file.vars.map((v: any) => [v.name, v]));
    const colName = (v: any) => file.collections.find((c: any) => c.id === v.variableCollectionId)?.name ?? '?';
    const washKeys = new Set(washes.map((w) => washKey(w, byName.has(w.name) ? colName(byName.get(w.name)) : '?')));
    const diffs = diffExports(actual, expected);
    const carved = diffs.filter((d) => d.kind === 'VALUE' && washKeys.has(d.key));
    ok(carved.length === washKeys.size, `${brand} washes (#2365): every one of the ${washKeys.size} planned wash leaves is the known unreadable export, and nothing else is carved (${carved.length} carved)`);
    for (const k of washKeys) if (!carved.some((d) => d.key === k)) console.error(`      not carved: ${k} — the export now agrees, so #2365's carve-out is obsolete`);
    const wrong: string[] = [];
    for (const w of washes) {
      const v: any = byName.get(w.name);
      const col: any = v && file.collections.find((c: any) => c.id === v.variableCollectionId);
      const modeId = col?.modes.find((m: any) => m.name === w.mode)?.modeId;
      const val = v && modeId ? v.valuesByMode[modeId] : undefined;
      const nameOf = (a: any) => (a && a.type === 'VARIABLE_ALIAS' ? file.vars.find((x: any) => x.id === a.id)?.name : undefined);
      if (!val || nameOf(val.color) !== w.color || nameOf(val.opacity) !== w.opacity) wrong.push(`${w.name} @${w.mode}: file ${J(val && { color: nameOf(val.color), opacity: nameOf(val.opacity) })}, emission ${J({ color: w.color, opacity: w.opacity })}`);
    }
    ok(wrong.length === 0, `${brand} washes (#2365): each of the ${washes.length} is written as its color alias at its opacity alias, as the emission plans${wrong.length ? ` — ${wrong.slice(0, 4).join('; ')}` : ''}`);
    report(`${brand} export`, diffs.filter((d) => !carved.includes(d)), ['ADDED', 'REMOVED', 'RETYPED', 'VALUE', 'DESCRIPTION']);

    // Motion, both exports against the engine's DTCG (#2394).
    const durations = dtcgDurations(brand);
    ok(durations.size >= MIN_MOTION_DURATIONS, `${brand} motion: the engine's DTCG holds ${durations.size} motion durations (at least ${MIN_MOTION_DURATIONS})`);
    report(`${brand} motion, Apply Theme's file → DTCG`, motionRoundTrip(actual, durations), ['ADDED', 'REMOVED', 'RETYPED', 'VALUE']);
    report(`${brand} motion, the emission → DTCG`, motionRoundTrip(expected, durations), ['ADDED', 'REMOVED', 'RETYPED', 'VALUE']);

    // The two channels no exporter reads, compared as written.
    const varName = (id: string) => file.vars.find((v: any) => v.id === id)?.name;
    const grids = readStyles(brand, 'grid-styles.json'), gradients = readStyles(brand, 'gradient-styles.json');
    report(`${brand} grid styles (${grids.length} emitted)`, compareStyles('grid-styles', file.styles.grid.map(gridShape), grids.map(gridShape)), ['ADDED', 'REMOVED', 'VALUE']);
    report(`${brand} gradient paint styles (${gradients.length} emitted)`,
      compareStyles('gradient-styles', file.styles.paint.map((s: any) => gradientFromShim(s, varName)), gradients.map(gradientFromEmission)), ['ADDED', 'REMOVED', 'VALUE']);
  } catch (e) {
    ok(false, `${brand}: the comparison threw — ${(e as Error)?.message ?? String(e)}`);
  }
}

// The excluded brands have no brief to apply, but their emission still exports: its motion is held to the DTCG too.
for (const brand of Object.keys(EXCLUDED).filter((id) => discovered.includes(id))) {
  console.log(`\n${brand} (emission only)`);
  try {
    const durations = dtcgDurations(brand);
    ok(durations.size >= MIN_MOTION_DURATIONS, `${brand} motion: the engine's DTCG holds ${durations.size} motion durations (at least ${MIN_MOTION_DURATIONS})`);
    const emitted = leavesOf((await runTokenPress(adaptBrand(brand, join(FIGMA_OUT, brand)))).files);
    report(`${brand} motion, the emission → DTCG`, motionRoundTrip(emitted, durations), ['ADDED', 'REMOVED', 'RETYPED', 'VALUE']);
  } catch (e) {
    ok(false, `${brand}: the motion comparison threw — ${(e as Error)?.message ?? String(e)}`);
  }
}

console.log(failed ? `\n✗ read-back parity: ${failed} assertion(s) failed` : '\nread-back parity: all assertions pass');
process.exit(failed ? 1 : 0);
