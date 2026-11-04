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
 * schema declares). The engine writes `out/components/component-defs.specs.json` from `component-defs.json`;
 * `regen --check` holds both to the engine, and this file holds the first to the published schema and to the second,
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
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '..', 'engine', 'out', 'components');
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

if (failures.length) {
  console.error(`\n✗ check-specs: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('✓ check-specs: the component-defs export maps onto the published Specs schema');
