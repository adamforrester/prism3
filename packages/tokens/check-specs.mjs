/**
 * SPECS GATE (#3425) — the component-defs export maps onto the published Specs format
 * (`@directededges/specs-schema`, `docs/13` §3: conformant-or-mappable), checked by a stock validator against the
 * schema as its authors publish it.
 *
 * Runs after `check-platforms.mjs` inside `npm run -w @prism3/tokens check:consumability`: this package is where a
 * stock tool proves an emitted file consumable without custom code, and a Specs reader is one more such consumer.
 *
 * INDEPENDENCE (docs/34). Nothing here imports the engine. The schema is the npm package, pinned exact in this
 * package's `package.json` and by integrity in the lockfile; the validator is stock Ajv (draft-07, the dialect the
 * schema declares). The engine writes `out/components/component-defs.specs.json` from `component-defs.json`. Neither
 * is committed since #3698 R3, so this file GENERATES both first, into a temp dir, by running the engine's own emitter
 * as a process (`emit-component-docs.ts --uncommitted --out`), the step regen runs. It still imports nothing from the
 * engine. This file holds the first to the published schema and to the second,
 * reading both as plain JSON with its own walk. A projection that drops a component, a prop, a part or a token, or
 * invents one, fails here by name, whatever the projector's code says.
 *
 *   [PIN]          the installed Specs schema is the version `package.json` pins.
 *   [VALID]        every component validates against the published `components.schema.json`, one by one, so a
 *                  failure names the component and the path.
 *   [REPRESENTED]  the projection carries every component of the export; per component, every code prop and every
 *                  variant axis as a Specs prop (an axis as an enum of its values), one anatomy element per part,
 *                  the default configuration at each axis's first value, and exactly the token names the export's
 *                  spec binds (gradients aside: Specs has no home for a gradient's token list, and the mapping table
 *                  says so).
 *   [PLACED]       every binding lands where the mapping table names it: each export binding (a color role, a text
 *                  style, a padding side, a gap or size) is read at the Specs key a literal register below names, on
 *                  the element for its part, in the default when its row's coordinate is the default's and in the
 *                  variant whose configuration is that coordinate otherwise. [REPRESENTED] compares token sets, so a
 *                  fill written to `textColor` or a left padding written to `end` passes it; this arm is what fails.
 *                  The register is typed out here, not read from the projector (docs/34): it restates the PR's
 *                  mapping table, and a projector that drifts from the table fails here by name. A coordinate is
 *                  also one variant: two variants with the same configuration fail here.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
// #3698 R3: generated first, never read from `out/` (CI's checkout holds no copy, and a local one may be stale).
const genDir = mkdtempSync(resolve(tmpdir(), 'prism3-specs-'));
process.on('exit', () => rmSync(genDir, { recursive: true, force: true }));
const gen = spawnSync('npx', ['tsx', resolve(here, '..', 'engine', 'emit-component-docs.ts'), '--uncommitted', '--out', genDir], { cwd: resolve(here, '..', '..'), encoding: 'utf8' });
if (gen.status !== 0) {
  console.error(`✗ [GENERATE] emit-component-docs.ts --uncommitted exited ${gen.status}: ${(gen.stderr || gen.stdout || '').trim().split('\n').slice(-3).join(' / ')}`);
  process.exit(1);
}
const OUT = resolve(genDir, 'components');
const failures = [];
const fail = (label, msg) => failures.push(`${label} ${msg}`);
const pass = (label, msg) => console.log(`  ✓ ${label} ${msg}`);

// ---- [PIN] -------------------------------------------------------------------------------------
// The package exports its schemas, not its `package.json`: resolve a schema, and read the manifest beside its folder.
const pkgDir = resolve(dirname(require.resolve('@directededges/specs-schema/schema/component')), '..');
const installed = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf8')).version;
const pinned = JSON.parse(readFileSync(resolve(here, 'package.json'), 'utf8')).devDependencies['@directededges/specs-schema'];
if (installed !== pinned) fail('[PIN]', `installed @directededges/specs-schema ${installed} is not the pinned ${pinned} — run \`npm ci\``);
else pass('[PIN]', `@directededges/specs-schema ${installed}`);

// ---- [VALID] -----------------------------------------------------------------------------------
const schemaDir = resolve(pkgDir, 'schema');
const ajv = new Ajv({ strict: false, allErrors: true });   // strict off: the published schema carries a `version` annotation keyword
for (const f of readdirSync(schemaDir).filter((n) => n.endsWith('.json'))) {
  const s = JSON.parse(readFileSync(resolve(schemaDir, f), 'utf8'));
  ajv.addSchema({ ...s, $id: f }, f);                      // the schemas `$ref` each other by file name
}
const validateSet = ajv.getSchema('components.schema.json');
const specs = JSON.parse(readFileSync(resolve(OUT, 'component-defs.specs.json'), 'utf8'));
const prism = JSON.parse(readFileSync(resolve(OUT, 'component-defs.json'), 'utf8'));
const specIds = Object.keys(specs.components ?? {});
let invalid = 0;
for (const id of specIds) {
  if (validateSet({ components: { [id]: specs.components[id] } })) continue;
  invalid++;
  for (const e of validateSet.errors.slice(0, 3)) fail('[VALID]', `${id}: ${e.instancePath || '/'} ${e.message}`);
}
if (!validateSet(specs)) { if (!invalid) fail('[VALID]', `the set: ${validateSet.errors.slice(0, 3).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ')}`); }
else pass('[VALID]', `${specIds.length} components validate against components.schema.json`);

// ---- [REPRESENTED] -----------------------------------------------------------------------------
const exportIds = Object.keys(prism.components ?? {});
if (exportIds.length < 40) fail('[REPRESENTED]', `the export holds ${exportIds.length} components — fewer than the 40 a catalogue this size must; is it empty?`);
for (const id of exportIds) if (!specs.components[id]) fail('[REPRESENTED]', `${id}: in component-defs.json, missing from the Specs projection`);
for (const id of specIds) if (!prism.components[id]) fail('[REPRESENTED]', `${id}: in the Specs projection, not in component-defs.json`);

/** Every `$token` under a node, as written. */
const specsTokens = (node, out = new Set()) => {
  if (Array.isArray(node)) node.forEach((x) => specsTokens(x, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) (k === '$token' ? out.add(v) : specsTokens(v, out));
  return out;
};
/** Every token name the export's spec binds, gradients aside. */
const exportTokens = (spec) => {
  const out = new Set();
  for (const r of spec.redlines) for (const p of r.parts) for (const v of Object.values(p.values)) if (v.token) out.add(v.token);
  for (const r of spec.type) for (const p of r.parts) out.add(p.textStyle);
  for (const r of spec.colors) for (const p of r.parts) for (const k of ['fill', 'stroke', 'ink', 'icon']) if (p[k]) out.add(p[k]);
  return out;
};

let checked = 0;
for (const id of exportIds) {
  const e = prism.components[id];
  const s = specs.components[id];
  if (!s) continue;
  checked++;
  const props = s.props ?? {};
  for (const p of e.def.props) if (!props[p.name]) fail('[REPRESENTED]', `${id}: code prop \`${p.name}\` has no Specs prop`);
  if (s.title !== e.def.name) fail('[REPRESENTED]', `${id}: title "${s.title}" is not the definition's name "${e.def.name}"`);
  if (!e.spec) continue;
  for (const a of e.spec.axes) {
    const p = props[a.name];
    if (!p) { fail('[REPRESENTED]', `${id}: axis \`${a.name}\` has no Specs prop`); continue; }
    if (p.enum && JSON.stringify([...p.enum].sort()) !== JSON.stringify([...a.values].sort()) && !e.def.props.some((q) => q.name === a.name))
      fail('[REPRESENTED]', `${id}: axis \`${a.name}\`'s enum ${JSON.stringify(p.enum)} is not its values ${JSON.stringify(a.values)}`);
    if (s.default?.configuration?.[a.name] !== a.values[0]) fail('[REPRESENTED]', `${id}: the default configures \`${a.name}\` as ${JSON.stringify(s.default?.configuration?.[a.name])}, not its first value "${a.values[0]}"`);
  }
  const parts = e.spec.anatomy.length;
  const elements = Object.keys(s.anatomy).length;
  if (parts !== elements) fail('[REPRESENTED]', `${id}: ${parts} parts in the export, ${elements} anatomy elements in the projection`);
  const want = exportTokens(e.spec);
  const root = prism.brand ? `${prism.brand.root}.` : '';
  const got = new Set([...specsTokens(s)].map((t) => (root && t.startsWith(root) ? t.slice(root.length) : t)));
  for (const t of want) if (!got.has(t)) fail('[REPRESENTED]', `${id}: token \`${t}\` is bound in the export and absent from the projection`);
  for (const t of got) if (!want.has(t)) fail('[REPRESENTED]', `${id}: token \`${t}\` is in the projection and bound nowhere in the export`);
}
if (!failures.some((f) => f.startsWith('[REPRESENTED]'))) pass('[REPRESENTED]', `${checked} components: every prop, axis, part and token of the export is in the projection, and nothing else`);

// ---- [PLACED] ----------------------------------------------------------------------------------
// The mapping table, typed out: export field → path under an element's `styles`. Not imported, not derived.
const PLACE = {
  fill: ['backgroundColor'], stroke: ['strokes'], ink: ['textColor'], icon: ['fillColor'],   // spec.colors[].parts[]
  textStyle: ['typography'],                                                                // spec.type[].parts[]
  paddingTop: ['padding', 'top'], paddingRight: ['padding', 'end'],                         // spec.redlines[].parts[].values
  paddingBottom: ['padding', 'bottom'], paddingLeft: ['padding', 'start'],
  gap: ['itemSpacing'], height: ['height'], minHeight: ['minHeight'],
  width: ['width'], minWidth: ['minWidth'], maxWidth: ['maxWidth'],
};
const leafOf = (p) => p.slice(p.lastIndexOf('/') + 1);
const sameCoord = (a, b) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every((k) => a[k] === b[k]); };
let placed = 0;
const placedBefore = failures.length;
for (const id of exportIds) {
  const e = prism.components[id];
  const s = specs.components[id];
  if (!s || !e.spec) continue;
  const root = prism.brand ? `${prism.brand.root}.` : '';
  const first = Object.fromEntries(e.spec.axes.map((a) => [a.name, a.values[0]]));
  const seen = [];
  for (const v of s.variants ?? []) {
    if (seen.some((c) => sameCoord(c, v.configuration ?? {}))) fail('[PLACED]', `${id}: two variants are configured ${JSON.stringify(v.configuration)} — a coordinate is one variant, or a reader keeps one and loses the other's styles`);
    seen.push(v.configuration ?? {});
  }
  const stylesAt = (where, part) => {
    const isDefault = Object.entries(where).every(([k, v]) => first[k] === v);
    const target = isDefault ? s.default : (s.variants ?? []).find((v) => sameCoord(v.configuration ?? {}, where));
    if (!target) return { miss: `no ${isDefault ? 'default' : `variant configured ${JSON.stringify(where)}`}` };
    const el = target.elements?.[part] ?? target.elements?.[leafOf(part)];
    if (!el) return { miss: `no element for part \`${part}\` in ${isDefault ? 'the default' : `the variant ${JSON.stringify(where)}`}` };
    return { styles: el.styles ?? {} };
  };
  const at = (styles, path) => path.reduce((n, k) => (n && typeof n === 'object' ? n[k] : undefined), styles);
  const check = (where, part, field, want) => {
    const { styles, miss } = stylesAt(where, part);
    const loc = `${id} ${part} ${JSON.stringify(where)}: ${field}`;
    if (miss) { fail('[PLACED]', `${loc} — ${miss}`); return; }
    const got = at(styles, PLACE[field]);
    const ok = typeof want === 'number' ? got === want : got?.$token === `${root}${want}`;
    if (!ok) {
      const elsewhere = Object.entries(PLACE).filter(([, p]) => { const v = at(styles, p); return typeof want === 'number' ? v === want : v?.$token === `${root}${want}`; }).map(([, p]) => p.join('.'));
      fail('[PLACED]', `${loc} \`${want}\` belongs at styles.${PLACE[field].join('.')}, found ${JSON.stringify(got?.$token ?? got)}${elsewhere.length ? ` (it sits at styles.${elsewhere.join(', styles.')})` : ''}`);
    } else placed++;
  };
  for (const r of e.spec.colors) for (const p of r.parts) for (const k of ['fill', 'stroke', 'ink', 'icon']) if (p[k]) check(r.where, p.part, k, p[k]);
  for (const r of e.spec.type) for (const p of r.parts) check(r.where, p.part, 'textStyle', p.textStyle);
  for (const r of e.spec.redlines) for (const p of r.parts) for (const [k, v] of Object.entries(p.values)) {
    if (!PLACE[k] || !v) continue;                       // rowGap, build sizes…: omitted from Specs, by the table
    if (v.token) check(r.where, p.part, k, v.token);
    else if (typeof v.px === 'number') check(r.where, p.part, k, v.px);
  }
}
if (placed < 1000) fail('[PLACED]', `only ${placed} bindings placed — the walk found too little to mean anything`);
if (failures.length === placedBefore) pass('[PLACED]', `${placed} bindings, each at the Specs key the mapping table names`);

if (failures.length) {
  console.error(`\n✗ check-specs: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('✓ check-specs: the component-defs export maps onto the published Specs schema');
