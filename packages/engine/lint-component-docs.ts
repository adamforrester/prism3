/**
 * COMPONENT-DOCS GATE (#1701) — every registered def reaches both documentation forms, whole.
 *
 *   npx tsx packages/engine/lint-component-docs.ts
 *
 * `emit-component-docs.ts` projects each def into `out/components/components.ai.json` (machine-readable)
 * and `out/components/<id>.md` (one page per def). This gate reads those COMMITTED files — never the
 * projector's return value — and holds them against the def objects and the authored schema.
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────
 *
 *   A  REPRESENTATION, both directions. Every registered def has a JSON entry AND a page; no entry and no
 *      page exists for an id the registry does not hold. Floor: at least `DEF_FLOOR` defs, so an empty
 *      registry and an empty projection cannot agree their way to a pass.
 *   B  SCHEMA. The JSON validates against `schema/component-docs.schema.json` (authored, closed objects),
 *      its `$schema` names the schema's `$id`, and EVERY field the schema declares on a component — nested
 *      ones included — is carried with a non-empty value by at least one component. A declared field no
 *      component carries is a field the projector stopped writing (or the schema over-promises).
 *   C  ROUND-TRIP. Every string, number and boolean leaf of a def's documentation fields is found in the
 *      JSON at the same path, and every string leaf is found in the page. The walk is GENERIC over the def
 *      object — it does not know which fields exist — and the only path knowledge here is the three renames
 *      in `JSON_PATH`, authored in this file, not imported from the projector.
 *   D  NO PRISM 2 (owner rule). Neither form contains it anywhere, and the JSON's per-component `withheld`
 *      equals the number of that def's `codeOnly`/`notes` entries that name it, counted here from the def.
 *
 * ── INDEPENDENCE (docs/34) ──────────────────────────────────────────────────────────────────────
 *
 * EXPECTED comes from the def objects (the registry) and the authored schema. ACTUAL is the two committed
 * forms on disk. The projector is not imported, so a projector that drops a def or a field fails here by
 * name instead of agreeing with itself. `DOC_FIELDS` below is the one list this gate authors about the def
 * shape; it names the def's documentation fields, and a field missing from it is caught from the other
 * side by arm B (the schema declares it, so some component must carry it).
 *
 * MUTATIONS VERIFIED (each fails by name, exit 1): one def dropped from the projection (arm A, both forms)
 * · `accessibility.keyboard` dropped from the projector's mapping (arm B names the field; arm C names each
 * def and path) · the same field dropped from the page only (arm C, page side, per def) · a Prism 2 entry
 * let through (arm D, naming the file and each page).
 *
 * WHAT THIS DOES NOT CHECK: that the committed forms match what the projector emits NOW — that is
 * `regen.ts --check`'s job — and whether a sentence reads well; the prose gates own that.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComponentDef } from './component-schema';
import { componentDefs } from './components/index';
import { validate } from './json-schema-lite';

const here = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(here, 'out', 'components');
const JSON_PATH_FILE = resolve(DIR, 'components.ai.json');
const SCHEMA_PATH = resolve(here, 'schema', 'component-docs.schema.json');

/** The registry held 24 defs when this gate landed. Raise it as the catalogue grows; lower it only with a reason. */
const DEF_FLOOR = 24;
const PRISM2 = /prism\s*2/i;

/** The def's documentation fields — everything a Figma builder or code author reads. Paint and Figma-plan
 *  fields (`tokens`, `paintKeys`, `anatomy.parts`, `figmaProperties`, `weightIntent`) are not docs. */
const DOC_FIELDS = ['id', 'name', 'aliases', 'category', 'status', 'summary', 'description', 'inherits', 'props', 'states',
  'variants', 'accessibility', 'content', 'docs', 'ai', 'motion', 'composition', 'notes'] as const;

/** Def path → JSON path, for the three places the projection does not mirror the def. */
const JSON_PATH = (path: (string | number)[]): (string | number)[] => {
  if (path[0] === 'notes') return ['maintainer', 'notes', ...path.slice(1)];
  if (path[0] === 'anatomy' && path[1] === 'codeOnly') return ['codeOnly', ...path.slice(2)];
  if (path[0] === 'variants') return ['variants', path[1], 'values', ...path.slice(2)];
  return path;
};
/** Arrays whose entries may be withheld, so their indices do not survive — compared by membership. */
const FILTERED = (path: (string | number)[]): boolean => path[0] === 'notes' || (path[0] === 'anatomy' && path[1] === 'codeOnly');
/** Def fields the page deliberately leaves out: the maintainer record (see the projector's header). */
const NOT_ON_PAGE = (path: (string | number)[]): boolean => path[0] === 'notes';

const fail: string[] = [];
const note = (m: string) => { fail.push(m); };

// ---- read the committed forms, failing closed ------------------------------------------------
if (!existsSync(JSON_PATH_FILE)) {
  console.error(`✗ ${JSON_PATH_FILE} does not exist — run \`npx tsx packages/engine/regen.ts\`. A missing projection is not a clean one.`);
  process.exit(1);
}
const doc = JSON.parse(readFileSync(JSON_PATH_FILE, 'utf8'));
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
const pages = new Map(readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => [f.replace(/\.md$/, ''), readFileSync(resolve(DIR, f), 'utf8')]));
const entries: Record<string, any> = doc.components ?? {};

// ---- ARM A: representation -------------------------------------------------------------------
const ids = componentDefs.map((d) => d.id);
if (ids.length < DEF_FLOOR) note(`FLOOR: the registry holds ${ids.length} defs, below the floor of ${DEF_FLOOR} — a shrinking catalogue is a decision; lower DEF_FLOOR with it`);
for (const id of ids) {
  if (!entries[id]) note(`MISSING FROM JSON: def \`${id}\` is registered but has no entry in components.ai.json`);
  if (!pages.has(id)) note(`MISSING PAGE: def \`${id}\` is registered but out/components/${id}.md does not exist`);
}
for (const id of Object.keys(entries)) if (!ids.includes(id)) note(`STALE JSON ENTRY: \`${id}\` is in components.ai.json but no registered def has that id`);
for (const id of pages.keys()) if (!ids.includes(id)) note(`STALE PAGE: out/components/${id}.md exists but no registered def has that id`);

// ---- ARM B: schema, and every declared field represented -------------------------------------
for (const e of validate(schema, doc)) note(`SCHEMA: ${e}`);
if (doc.$schema !== schema.$id) note(`SCHEMA: the file's $schema (${doc.$schema}) does not name the schema's $id (${schema.$id}) — bump both together`);

const nonEmpty = (v: unknown): boolean =>
  v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length) && !(typeof v === 'object' && !Array.isArray(v) && !Object.keys(v as object).length);
const resolveRef = (s: any): any => (s?.$ref ? schema.$defs[s.$ref.split('/').pop()] : s);
/** Every property path the schema declares on a component, walking nested closed objects. */
const declared: string[][] = [];
const walkSchema = (node: any, at: string[]) => {
  const n = resolveRef(node);
  for (const [k, sub] of Object.entries<any>(n?.properties ?? {})) {
    declared.push([...at, k]);
    const r = resolveRef(sub);
    if (r?.type === 'object' && r.properties) walkSchema(r, [...at, k]);
  }
};
walkSchema(schema.$defs.component, []);
const at = (o: any, path: (string | number)[]): any => path.reduce((x, k) => (x == null ? undefined : x[k]), o);
/** Fields the def schema offers and no def in the corpus uses yet, measured when this gate landed. Checked
 *  both ways: an entry here that a component now carries fails, so the exemption cannot outlive its reason. */
const UNUSED_IN_CORPUS = new Set(['composition.supersedes', 'composition.supersededBy']);
for (const path of declared) {
  const carried = Object.values(entries).some((e) => nonEmpty(at(e, path)));
  if (UNUSED_IN_CORPUS.has(path.join('.'))) {
    if (carried) note(`STALE EXEMPTION: \`${path.join('.')}\` is in UNUSED_IN_CORPUS but a component now carries it — remove the exemption`);
    continue;
  }
  if (!carried) note(`FIELD NOT REPRESENTED: the schema declares \`${path.join('.')}\` on a component and no component carries it — the projector dropped it, or the schema promises a field nothing has`);
}
if (declared.length < 40) note(`SCHEMA WALK: only ${declared.length} declared component fields found — the walk is not reaching the schema`);

// ---- ARM C: round-trip, def → both forms -----------------------------------------------------
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const pageText = (md: string) => norm(md.replace(/\\([|<])/g, '$1'));
let jsonChecked = 0;
let pageChecked = 0;
for (const def of componentDefs) {
  const entry = entries[def.id];
  const page = pages.has(def.id) ? pageText(pages.get(def.id)!) : undefined;
  if (!entry) continue; // arm A already named it
  const visit = (v: unknown, path: (string | number)[]) => {
    if (Array.isArray(v)) { v.forEach((x, i) => visit(x, [...path, i])); return; }
    if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) visit(x, [...path, k]); return; }
    if (v === undefined) return;
    const where = `\`${def.id}\` ${path.join('.')}`;
    if (typeof v === 'string' && PRISM2.test(v) && FILTERED(path)) return; // arm D owns withheld entries
    const jp = JSON_PATH(path);
    const found = FILTERED(path) && typeof jp[jp.length - 1] === 'number'
      ? (at(entry, jp.slice(0, -1)) ?? []).includes(v)
      : at(entry, jp) === v;
    jsonChecked++;
    if (!found) note(`ROUND-TRIP (json): ${where} = ${JSON.stringify(v).slice(0, 80)} is not at ${jp.join('.')} in components.ai.json`);
    if (typeof v === 'string' && page && !NOT_ON_PAGE(path)) {
      pageChecked++;
      if (!page.includes(norm(v))) note(`ROUND-TRIP (page): ${where} = ${JSON.stringify(v).slice(0, 80)} is not on out/components/${def.id}.md`);
    }
  };
  const d = def as ComponentDef & Record<string, unknown>;
  for (const f of DOC_FIELDS) visit(d[f], [f]);
  visit(def.anatomy?.codeOnly, ['anatomy', 'codeOnly']);
}
// Floors, measured when this landed (2,951 JSON leaves, 2,562 page strings). A walk that silently
// stopped descending would still "pass" every leaf it did not visit.
if (jsonChecked < 2_000) note(`ROUND-TRIP FLOOR: only ${jsonChecked} def leaves were checked against the JSON — the walk is not reaching the defs`);
if (pageChecked < 1_800) note(`ROUND-TRIP FLOOR: only ${pageChecked} def strings were checked against the pages — the walk is not reaching the defs`);

// ---- ARM D: no Prism 2 in either form, and every withheld entry counted ------------------------
if (PRISM2.test(readFileSync(JSON_PATH_FILE, 'utf8'))) note('PRISM 2: components.ai.json names Prism 2 — no shipped artifact may cite it');
for (const [id, md] of pages) if (PRISM2.test(md)) note(`PRISM 2: out/components/${id}.md names Prism 2 — no shipped artifact may cite it`);
let withheldTotal = 0;
for (const def of componentDefs) {
  const expected = [...(def.anatomy?.codeOnly ?? []), ...(def.notes?.contested ?? []), ...(def.notes?.unverified ?? []), ...(def.notes?.evolution ?? [])]
    .filter((s) => PRISM2.test(s)).length;
  withheldTotal += expected;
  const got = entries[def.id]?.maintainer?.withheld;
  if (entries[def.id] && got !== expected) note(`WITHHELD COUNT: \`${def.id}\` withholds ${expected} entries that name Prism 2, but its maintainer.withheld says ${got}`);
}
// The self-check: the detector has something real to find, so a regex that stopped matching fails here.
// When #1703 rewords the last entry, delete this check and the projector's withholding in that PR.
if (withheldTotal === 0) note('PRISM 2 DETECTOR: no def entry names Prism 2 — either they were all reworded (#1703: remove this check and the withholding with that PR) or the pattern stopped matching');

// ---- report ----------------------------------------------------------------------------------
if (fail.length) {
  console.error(`\n✗ component docs — ${fail.length} problem(s):\n`);
  for (const f of fail.slice(0, 60)) console.error(`  • ${f}`);
  if (fail.length > 60) console.error(`  … and ${fail.length - 60} more`);
  process.exit(1);
}
console.log(`  ✓ clean — ${ids.length} defs in both forms; ${declared.length - UNUSED_IN_CORPUS.size} schema fields represented (${UNUSED_IN_CORPUS.size} unused in the corpus, exempt); ${jsonChecked} def leaves round-trip to the JSON and ${pageChecked} strings to the pages; ${withheldTotal} Prism 2 entries withheld and counted, none shipped.`);
