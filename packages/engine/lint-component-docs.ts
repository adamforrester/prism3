/**
 * COMPONENT-DOCS GATE (#1701) — every registered def reaches its documentation, whole, and its maintainer
 * record reaches nothing that ships.
 *
 *   npx tsx packages/engine/lint-component-docs.ts
 *
 * `emit-component-docs.ts` projects each def three ways: `out/components/components.ai.json` and
 * `out/components/<id>.md` (PAYLOAD — the shipped fields only) and `schema/component-maintainer.json` (NOT
 * payload — `anatomy.codeOnly` and `notes.*`, which #1623 ruled maintainer-only). This gate reads those
 * COMMITTED files — never the projector's return value — and holds them against the def objects, the
 * authored schema and the authored payload manifest.
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────
 *
 *   A  REPRESENTATION, both directions. Every registered def has a JSON entry, a page AND a maintainer
 *      entry; none of the three holds an id the registry does not. Floor: at least `DEF_FLOOR` defs, so an
 *      empty registry and an empty projection cannot agree their way to a pass.
 *   B  SCHEMA. The JSON validates against `schema/component-docs.schema.json` (authored, closed objects),
 *      its `$schema` names the schema's `$id`, and EVERY field the schema declares on a component — nested
 *      ones included — is carried with a non-empty value by at least one component.
 *   C  ROUND-TRIP, each value to its own place. Every string, number and boolean leaf of a def's
 *      documentation fields is at the same path in the JSON, and every one the page renders is in the
 *      page SECTION that owns it — not merely somewhere on the page (docs/34 shape 13: a short value such
 *      as `small` or `filled` is on every page several times, so a page-wide search could not see one go
 *      missing from its own table). Table values are held to their ROW and COLUMN: a variant value to the
 *      Variants table's `Values` cell on its axis's row, a prop's fields to their cells on its row. A value
 *      the page writes as a CODE SPAN (ids, states, axis values, defaults, partner and composition lists) is
 *      matched as a whole span — `small` is not satisfied by `xsmall` — and a span the def does not have
 *      fails as `EXTRA VALUE` (review of #1705: substring matching passed both). Each
 *      axis's `kind` is checked in the JSON and in the Variants table's `Changes` cell, against the def's
 *      own `axisKinds` read here. `codeOnly` and `notes` are checked, by index, in the maintainer record.
 *   D  MAINTAINER PROSE DOES NOT SHIP. No `codeOnly` or `notes` entry is in either payload form (a
 *      `codeOnly` entry's tail half, as `apps/plugin/lint-bundle-prose.ts` probes the bundles; BOTH halves of
 *      a `notes` entry, whose head is its most internal part; the whole entry when short; an entry whose text a shipped field of the same def already carries is
 *      counted as shared, not as a leak), the page carries none of the agent-only `ai` labels, and the maintainer
 *      record is classified `ours` in `payload-manifest.json`, by its literal path.
 *   E  NO PRISM 2 (owner rule) in either payload form. The detector is self-checked on literal samples
 *      first, so a pattern that stopped matching fails rather than reporting a clean corpus.
 *
 * ── INDEPENDENCE (docs/34) ──────────────────────────────────────────────────────────────────────
 *
 * EXPECTED comes from the def objects (the registry), the authored schema and the authored manifest.
 * ACTUAL is the three committed files on disk. The projector is not imported, and neither is
 * `axisKindOf`: the kind rule below (`KIND`) and the section map (`SECTION`, the headings and table
 * columns) are written in this file, so a projector that renders a value under the wrong heading, drops
 * a column, or hard-codes a kind fails here by name instead of agreeing with itself. `DOC_FIELDS` is the
 * one list this gate authors about the def shape; a field missing from it is caught from the other side
 * by arm B (the schema declares it, so some component must carry it), and a field in it with no entry in
 * `SECTION` fails as `NO SECTION`.
 *
 * MUTATIONS VERIFIED (each fails by name, exit 1): one def dropped from the projection (arm A, all three
 * files) · `accessibility.keyboard` dropped from the projector's mapping (arm B names the field; arm C each
 * def) · every page's Variants `Values` cell replaced with `x` (arm C, page, one per variant value — and
 * with the section scoping neutralized to a page-wide search, the same mutation passes: the scoping is
 * why) · `button`'s size values written `xsmall`/`xmedium`/`xlarge`, and a States span `hover-ish` (arm C,
 * `ROUND-TRIP (page cell)`/`(page token)` + `EXTRA VALUE`) · the first half of a `notes` entry pasted on a
 * page (arm D, `(its first half)`) · every axis projected as `runtime` (arm C, `KIND`, JSON and page) · `codeOnly` rendered back onto
 * the page (arm D) · a Prism 2 entry let through (arm E).
 *
 * WHAT THIS DOES NOT CHECK: that the committed forms match what the projector emits NOW — that is
 * `regen.ts --check`'s job — and whether a sentence reads well; the prose gates own that for the payload.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComponentDef } from './component-schema';
import { componentDefs } from './components/index';
import { validate } from './json-schema-lite';

const here = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(here, 'out', 'components');
const JSON_FILE = resolve(DIR, 'components.ai.json');
const MAINTAINER_FILE = resolve(here, 'schema', 'component-maintainer.json');
const SCHEMA_PATH = resolve(here, 'schema', 'component-docs.schema.json');
const MANIFEST_PATH = resolve(here, 'schema', 'payload-manifest.json');
/** The maintainer record's path as `payload-manifest.json` spells it. Written here, not derived. */
const MAINTAINER_MANIFEST_PATTERN = 'schema/component-maintainer.json';

/** The registry held 24 defs when this gate landed. Raise it as the catalogue grows; lower it only with a reason. */
const DEF_FLOOR = 24;
const PRISM2 = /prism\s*2/i;

/** The def's documentation fields — everything a Figma builder or code author reads. Paint and Figma-plan
 *  fields (`tokens`, `paintKeys`, `anatomy.parts`, `figmaProperties`, `weightIntent`) are not docs. */
const DOC_FIELDS = ['id', 'name', 'aliases', 'category', 'status', 'summary', 'description', 'inherits', 'props', 'states',
  'variants', 'accessibility', 'content', 'docs', 'ai', 'motion', 'composition'] as const;

/** The maintainer-only fields (#1623): in the maintainer record, and in neither payload form. */
const MAINTAINER_NOTES = ['contested', 'unverified', 'evolution'] as const;

type Path = (string | number)[];
/** Where a def value lives on its page. `heading` null is the preamble (above the first `##`). A `table`
 *  place names the row (by the first column's code span) and the column (by its header). */
type Place =
  | { kind: 'none' }
  | { kind: 'text'; heading: string | null }
  | { kind: 'list'; heading: string | null; label?: string }
  | { kind: 'cell'; heading: string; row: string; column: string; tokens?: true };
/** A `list` place, and a cell with `tokens`, hold CODE SPANS — ids, states, axis values, defaults — and are
 *  compared token for token: `small` matches the span `` `small` ``, never `` `xsmall` ``, and a span the
 *  def does not have is flagged as extra (review of #1705: a substring check passed both). A `list` with a
 *  `label` reads only the one bullet line that starts with it. */

/** The bullet each id list sits on, as the page spells it. Written here, like the headings. */
const LABEL: Record<string, string> = {
  id: '- **ID:**',
  inherits: '- **Builds on:**',
  commonPartners: '- **Often used with:**',
  composesWith: '- **Composes with:**',
  alternativeTo: '- **Alternative to:**',
  supersedes: '- **Supersedes:**',
  supersededBy: '- **Superseded by:**',
  planned: '- **Planned:**',
};

/** THE SECTION MAP — written here, never read from the projector. Each value's own section, and for a
 *  table its own row and column. `none` is a field the page deliberately leaves out. */
const SECTION = (path: Path): Place | undefined => {
  const [f, a, b] = path;
  switch (f) {
    case 'id':
      return { kind: 'list', heading: null, label: LABEL.id };
    case 'inherits':
      return { kind: 'list', heading: null, label: LABEL.inherits };
    case 'name': case 'aliases': case 'category': case 'status': case 'summary': case 'description':
      return { kind: 'text', heading: null };
    case 'docs':
      return a === 'usage' ? { kind: 'text', heading: '## Usage' }
        : a === 'do' ? { kind: 'text', heading: '### Do' }
        : a === 'dont' ? { kind: 'text', heading: "### Don't" }
        : a === 'contentGuidelines' ? { kind: 'text', heading: '### Content guidelines' }
        : undefined;
    case 'content':
      return { kind: 'text', heading: '### Copy patterns' };
    case 'ai':
      // Agent-only metadata stays in the JSON (owner decision, 2026-09-27); the page is written for people.
      if (a === 'triggerKeywords' || a === 'generationPriority') return { kind: 'none' };
      if (a === 'commonPartners') return { kind: 'list', heading: '## Choosing it', label: LABEL.commonPartners };
      return { kind: 'text', heading: '## Choosing it' };
    case 'props': {
      const column = b === 'name' ? 'Name' : b === 'type' || b === 'values' ? 'Type' : b === 'default' ? 'Default'
        : b === 'required' ? 'Required' : b === 'description' ? 'Description' : b === 'deprecated' ? 'Name' : undefined;
      if (column === 'Default') return { kind: 'cell', heading: '## Props', row: '', column, tokens: true };
      return column ? { kind: 'cell', heading: '## Props', row: '', column } : undefined; // row filled by the caller
    }
    case 'states':
      return { kind: 'list', heading: '## States' };
    case 'variants':
      return { kind: 'cell', heading: '## Variants', row: String(a), column: 'Values', tokens: true };
    case 'accessibility':
      return { kind: 'text', heading: '## Accessibility' };
    case 'motion':
      return { kind: 'text', heading: '## Motion' };
    case 'composition':
      return a === 'replacesPatterns' ? { kind: 'text', heading: '## Composition' }
        : LABEL[a as string] ? { kind: 'list', heading: '## Composition', label: LABEL[a as string] } : undefined;
    default:
      return undefined;
  }
};

/** WHEN an axis changes — the def's `axisKinds` (#1611), read here rather than through `axisKindOf`. The
 *  state axis is runtime by definition; an unclassified axis is runtime. The page's `Changes` cell spells
 *  each kind with the literal beside it. */
const KIND = (def: ComponentDef, axis: string): 'runtime' | 'authoring' => {
  if (axis === (def.figmaProperties?.stateAxis?.name ?? 'state')) return 'runtime';
  return ((def as unknown as { axisKinds?: Record<string, 'runtime' | 'authoring'> }).axisKinds?.[axis]) ?? 'runtime';
};
const KIND_ON_PAGE = { runtime: 'at runtime', authoring: 'once, when authored' } as const;

const fail: string[] = [];
const note = (m: string) => { fail.push(m); };

// ---- read the committed files, failing closed ------------------------------------------------
for (const f of [JSON_FILE, MAINTAINER_FILE]) {
  if (!existsSync(f)) {
    console.error(`✗ ${f} does not exist — run \`npx tsx packages/engine/regen.ts\`. A missing projection is not a clean one.`);
    process.exit(1);
  }
}
const jsonText = readFileSync(JSON_FILE, 'utf8');
const doc = JSON.parse(jsonText);
const maint = JSON.parse(readFileSync(MAINTAINER_FILE, 'utf8'));
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const pages = new Map(readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => [f.replace(/\.md$/, ''), readFileSync(resolve(DIR, f), 'utf8')]));
const entries: Record<string, any> = doc.components ?? {};
const maintEntries: Record<string, any> = maint.components ?? {};

// ---- ARM A: representation -------------------------------------------------------------------
const ids = componentDefs.map((d) => d.id);
if (ids.length < DEF_FLOOR) note(`FLOOR: the registry holds ${ids.length} defs, below the floor of ${DEF_FLOOR} — a shrinking catalogue is a decision; lower DEF_FLOOR with it`);
for (const id of ids) {
  if (!entries[id]) note(`MISSING FROM JSON: def \`${id}\` is registered but has no entry in components.ai.json`);
  if (!pages.has(id)) note(`MISSING PAGE: def \`${id}\` is registered but out/components/${id}.md does not exist`);
  if (!maintEntries[id]) note(`MISSING FROM MAINTAINER RECORD: def \`${id}\` is registered but has no entry in schema/component-maintainer.json`);
}
for (const id of Object.keys(entries)) if (!ids.includes(id)) note(`STALE JSON ENTRY: \`${id}\` is in components.ai.json but no registered def has that id`);
for (const id of pages.keys()) if (!ids.includes(id)) note(`STALE PAGE: out/components/${id}.md exists but no registered def has that id`);
for (const id of Object.keys(maintEntries)) if (!ids.includes(id)) note(`STALE MAINTAINER ENTRY: \`${id}\` is in schema/component-maintainer.json but no registered def has that id`);

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
const at = (o: any, path: Path): any => path.reduce((x, k) => (x == null ? undefined : x[k]), o);
/** Fields the def schema offers and no def in the corpus uses yet, measured when this gate landed. Checked
 *  both ways: an entry here that a component now carries fails, so the exemption cannot outlive its reason. */
const UNUSED_IN_CORPUS = new Set(['composition.supersedes']);
for (const path of declared) {
  const carried = Object.values(entries).some((e) => nonEmpty(at(e, path)));
  if (UNUSED_IN_CORPUS.has(path.join('.'))) {
    if (carried) note(`STALE EXEMPTION: \`${path.join('.')}\` is in UNUSED_IN_CORPUS but a component now carries it — remove the exemption`);
    continue;
  }
  if (!carried) note(`FIELD NOT REPRESENTED: the schema declares \`${path.join('.')}\` on a component and no component carries it — the projector dropped it, or the schema promises a field nothing has`);
}
if (declared.length < 40) note(`SCHEMA WALK: only ${declared.length} declared component fields found — the walk is not reaching the schema`);

// ---- the page, read as sections and tables ---------------------------------------------------
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
/** Page text as a reader sees it: the projector's `\|` and `\<` escapes undone, whitespace folded. */
const unescape = (md: string) => norm(md.replace(/\\([|<])/g, '$1'));

type Page = {
  preamble: string; preambleRaw: string[];
  sections: Map<string, string>; raw: Map<string, string[]>;
  tables: Map<string, { header: string[]; rows: string[][] }>;
};
/** The code spans in a stretch of page text, verbatim, with the projector's `\|` escape undone. */
const spans = (text: string): string[] => [...text.replace(/\\\|/g, '|').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
/** Split a page on its headings. A section is its heading's OWN body — up to the next heading of any
 *  level — so `## Usage` does not reach into `### Do`. A table in a section is parsed into cells. */
const readPage = (md: string): Page => {
  const lines = md.split('\n');
  const sections = new Map<string, string>();
  const raw = new Map<string, string[]>();
  const tables = new Map<string, { header: string[]; rows: string[][] }>();
  const preamble: string[] = [];
  let current: string | null = null;
  let body: string[] = [];
  const close = () => {
    if (current === null) return;
    sections.set(current, unescape(body.join('\n')));
    raw.set(current, body);
    const t = body.filter((l) => l.startsWith('|'));
    if (t.length >= 2) {
      // Cells split on UNescaped pipes; the projector escapes a `|` inside a cell as `\|`.
      const cells = (l: string) => l.split(/(?<!\\)\|/).slice(1, -1).map(unescape);
      tables.set(current, { header: cells(t[0]), rows: t.slice(2).map(cells) });
    }
  };
  for (const l of lines) {
    if (/^#{2,3} /.test(l)) { close(); current = l.trim(); body = []; continue; }
    if (current === null) preamble.push(l); else body.push(l);
  }
  close();
  return { preamble: unescape(preamble.join('\n')), preambleRaw: preamble, sections, raw, tables };
};

/** The code spans at a `list` place: its labeled bullet line, or its whole section. `undefined` when the
 *  section itself is missing; `[]` when the section is there and the labeled line is not. */
const listSpans = (page: Page, place: { heading: string | null; label?: string }): string[] | undefined => {
  const lines = place.heading === null ? page.preambleRaw : page.raw.get(place.heading);
  if (!lines) return undefined;
  if (!place.label) return spans(lines.join('\n'));
  const line = lines.find((l) => l.startsWith(place.label!));
  return line === undefined ? [] : spans(line.slice(place.label.length));
};

// ---- ARM C: round-trip, def → JSON path, page section, maintainer record ----------------------
let jsonChecked = 0;
let pageChecked = 0;
let cellChecked = 0;
let kindChecked = 0;
let maintChecked = 0;
const missingSection = new Set<string>();
for (const def of componentDefs) {
  const entry = entries[def.id];
  const md = pages.get(def.id);
  const page = md === undefined ? undefined : readPage(md);
  const where = (path: Path) => `\`${def.id}\` ${path.join('.')}`;

  const onPage = (v: string | number | boolean, path: Path) => {
    if (!page) return; // arm A already named it
    const place = SECTION(path);
    if (!place) { note(`NO SECTION: ${where(path)} has no page section in this gate's SECTION map — add one, or \`none\` with a reason`); return; }
    if (place.kind === 'none') return;
    if (place.kind === 'text' && typeof v !== 'string') return; // numbers and booleans outside tables are JSON-only
    const want = norm(String(v));
    if (place.kind === 'list') {
      const got = listSpans(page, place);
      if (got === undefined) {
        const k = `${def.id} ${place.heading}`;
        if (!missingSection.has(k)) note(`SECTION MISSING: out/components/${def.id}.md has no \`${place.heading}\`, and ${where(path)} belongs there`);
        missingSection.add(k);
        return;
      }
      pageChecked++;
      if (!got.includes(String(v))) note(`ROUND-TRIP (page token): ${where(path)} = \`${String(v)}\` is not a code span ${place.label ? `on the \`${place.label}\` line` : ''} in the ${place.heading ?? 'opening'} section of out/components/${def.id}.md (spans: ${got.map((t) => `\`${t}\``).join(', ').slice(0, 80) || 'none'})`);
      return;
    }
    if (place.kind === 'text') {
      const text = place.heading === null ? page.preamble : page.sections.get(place.heading);
      if (text === undefined) {
        const k = `${def.id} ${place.heading}`;
        if (!missingSection.has(k)) note(`SECTION MISSING: out/components/${def.id}.md has no \`${place.heading}\`, and ${where(path)} belongs there`);
        missingSection.add(k);
        return;
      }
      pageChecked++;
      if (!text.includes(want)) note(`ROUND-TRIP (page): ${where(path)} = ${JSON.stringify(v).slice(0, 80)} is not in the ${place.heading ?? 'opening'} section of out/components/${def.id}.md`);
      return;
    }
    // A table cell: the row is the prop name or the axis, the column is named by the SECTION map.
    const row = place.heading === '## Props' ? String(def.props[path[1] as number]?.name) : place.row;
    const table = page.tables.get(place.heading);
    if (!table) {
      const k = `${def.id} ${place.heading}`;
      if (!missingSection.has(k)) note(`SECTION MISSING: out/components/${def.id}.md has no table under \`${place.heading}\`, and ${where(path)} belongs there`);
      missingSection.add(k);
      return;
    }
    const col = table.header.indexOf(place.column);
    const r = table.rows.find((cells) => cells[0]?.startsWith(`\`${row}\``));
    if (col < 0) { note(`TABLE: out/components/${def.id}.md's \`${place.heading}\` table has no \`${place.column}\` column (header: ${table.header.join(' | ')})`); return; }
    if (!r) { note(`TABLE: out/components/${def.id}.md's \`${place.heading}\` table has no row for \`${row}\``); return; }
    cellChecked++;
    const expected = path[2] === 'required' ? (v ? 'yes' : 'no') : path[2] === 'deprecated' ? (v ? '(deprecated)' : '') : want;
    const cellHas = place.tokens ? spans(r[col]).includes(String(v)) : r[col].includes(expected);
    if (expected && !cellHas) note(`ROUND-TRIP (page cell): ${where(path)} = ${JSON.stringify(v).slice(0, 80)} is not in the \`${place.column}\` cell of the \`${row}\` row under \`${place.heading}\` in out/components/${def.id}.md (the cell reads ${JSON.stringify(r[col].slice(0, 60))})`);
  };

  if (entry) {
    const visit = (v: unknown, path: Path) => {
      if (Array.isArray(v)) { v.forEach((x, i) => visit(x, [...path, i])); return; }
      if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) visit(x, [...path, k]); return; }
      if (v === undefined) return;
      // The one reshaping: `variants.<axis>` is `{ values, kind }` in the JSON.
      const jp = path[0] === 'variants' ? ['variants', path[1], 'values', ...path.slice(2)] : path;
      jsonChecked++;
      if (at(entry, jp) !== v) note(`ROUND-TRIP (json): ${where(path)} = ${JSON.stringify(v).slice(0, 80)} is not at ${jp.join('.')} in components.ai.json`);
      onPage(v as string | number | boolean, path);
    };
    const d = def as ComponentDef & Record<string, unknown>;
    for (const f of DOC_FIELDS) visit(d[f], [f]);

    // Each axis's kind — in the JSON, and in the page's `Changes` cell on that axis's row.
    for (const axis of Object.keys(def.variants)) {
      const want = KIND(def, axis);
      kindChecked++;
      if (entry.variants?.[axis]?.kind !== want) note(`KIND (json): \`${def.id}\` variants.${axis}.kind is ${JSON.stringify(entry.variants?.[axis]?.kind)}; the def's axisKinds make it \`${want}\``);
      const table = page?.tables.get('## Variants');
      const col = table?.header.indexOf('Changes') ?? -1;
      const r = table?.rows.find((cells) => cells[0]?.startsWith(`\`${axis}\``));
      if (page && (!r || col < 0 || r[col] !== KIND_ON_PAGE[want])) note(`KIND (page): \`${def.id}\` axis \`${axis}\` should read "${KIND_ON_PAGE[want]}" in the Variants table's \`Changes\` column of out/components/${def.id}.md (found ${JSON.stringify(r && col >= 0 ? r[col] : null)})`);
    }
  }

  // EXTRA spans: every code-span place holds the def's values and NOTHING ELSE. The per-value check above
  // proves each value is present; this proves no value the def lacks rides along (`hover-ish` in States).
  if (page) {
    const extra = (what: string, want: readonly string[], got: string[] | undefined) => {
      for (const t of got ?? []) if (!want.includes(t)) note(`EXTRA VALUE (page): out/components/${def.id}.md carries \`${t}\` in ${what}, and the def has no such value (def: ${want.map((w) => `\`${w}\``).join(', ') || 'none'})`);
    };
    const cell = (heading: string, row: string, column: string): string[] | undefined => {
      const t = page.tables.get(heading);
      const c = t?.header.indexOf(column) ?? -1;
      const r = t?.rows.find((cells) => cells[0]?.startsWith(`\`${row}\``));
      return r && c >= 0 ? spans(r[c]) : undefined;
    };
    extra('the ID line', [def.id], listSpans(page, { heading: null, label: LABEL.id }));
    extra('the Builds on line', def.inherits ? [def.inherits] : [], listSpans(page, { heading: null, label: LABEL.inherits }));
    extra('## States', def.states, listSpans(page, { heading: '## States' }));
    extra('the Often used with line', def.ai.commonPartners ?? [], listSpans(page, { heading: '## Choosing it', label: LABEL.commonPartners }));
    for (const k of ['composesWith', 'alternativeTo', 'supersedes', 'supersededBy', 'planned'] as const)
      extra(`the ${LABEL[k]} line`, def.composition?.[k] ?? [], listSpans(page, { heading: '## Composition', label: LABEL[k] }));
    for (const [axis, values] of Object.entries(def.variants)) extra(`the Variants \`Values\` cell of \`${axis}\``, values ?? [], cell('## Variants', axis, 'Values'));
    for (const pr of def.props) extra(`the Props \`Default\` cell of \`${pr.name}\``, pr.default === undefined ? [] : [String(pr.default)], cell('## Props', pr.name, 'Default'));
  }

  // The maintainer record: each `codeOnly` and `notes` entry at its own index, nothing else in the entry.
  const m = maintEntries[def.id];
  if (m) {
    const extra = Object.keys(m).filter((k) => k !== 'codeOnly' && k !== 'notes');
    const extraNotes = Object.keys(m.notes ?? {}).filter((k) => !(MAINTAINER_NOTES as readonly string[]).includes(k));
    if (extra.length || extraNotes.length) note(`MAINTAINER SHAPE: \`${def.id}\` carries ${[...extra, ...extraNotes.map((k) => `notes.${k}`)].join(', ')} — the record holds \`codeOnly\` and \`notes.{${MAINTAINER_NOTES.join(',')}}\` only`);
    const lists: [string, readonly string[] | undefined, unknown][] = [
      ['anatomy.codeOnly', def.anatomy?.codeOnly, m.codeOnly],
      ...MAINTAINER_NOTES.map((k): [string, readonly string[] | undefined, unknown] => [`notes.${k}`, def.notes?.[k], m.notes?.[k]]),
    ];
    for (const [label, want, got] of lists) {
      const w = want ?? [];
      const g = Array.isArray(got) ? got : [];
      if (!Array.isArray(got)) note(`MAINTAINER SHAPE: \`${def.id}\` has no ${label} list in schema/component-maintainer.json`);
      if (g.length !== w.length) note(`ROUND-TRIP (maintainer): \`${def.id}\` ${label} has ${w.length} entries in the def and ${g.length} in schema/component-maintainer.json`);
      w.forEach((s, i) => { maintChecked++; if (g[i] !== s) note(`ROUND-TRIP (maintainer): \`${def.id}\` ${label}.${i} = ${JSON.stringify(s).slice(0, 80)} is not at that index in schema/component-maintainer.json`); });
    }
  }
}
// Floors, about 85% of what this measured when it landed (2,832 JSON leaves, 1,334 section strings, 1,309
// table cells, 52 axis kinds, 440 maintainer entries). A walk that silently stopped descending would still
// "pass" every leaf it did not visit.
const FLOORS: [string, number, number][] = [
  ['def leaves against the JSON', jsonChecked, 2_400],
  ['strings against their page section', pageChecked, 1_100],
  ['values against their table cell', cellChecked, 1_100],
  ['axis kinds', kindChecked, 45],
  ['maintainer entries', maintChecked, 370],
];
for (const [what, n, floor] of FLOORS) if (n < floor) note(`ROUND-TRIP FLOOR: only ${n} ${what} were checked (floor ${floor}) — the walk is not reaching the defs`);

// ---- ARM D: maintainer prose does not ship ---------------------------------------------------
/** The parts of an entry that must be absent. A `codeOnly` entry leads with the name it admits (`size — …`),
 *  and that name is legitimately on the page, so only its TAIL half is searched — the rule
 *  `apps/plugin/lint-bundle-prose.ts` uses, restated rather than imported. A `notes` entry has no such
 *  lead, and its head is the most internal part (`THE DECOMPOSITION IS UNVERIFIED…`), so BOTH halves are
 *  searched (review of #1705: a leaked first half passed). A short entry is searched whole. */
const probes = (s: string, isNote: boolean): string[] => {
  if (s.length < 40) return [norm(s)];
  const mid = Math.floor(s.length / 2);
  return isNote ? [norm(s.slice(0, mid)), norm(s.slice(mid))] : [norm(s.slice(mid))];
};
const jsonStrings: string[] = [];
const collect = (v: unknown) => { if (typeof v === 'string') jsonStrings.push(norm(v)); else if (v && typeof v === 'object') Object.values(v).forEach(collect); };
collect(doc);
const jsonHay = jsonStrings.join('\n');
let probed = 0;
let shared = 0;
for (const def of componentDefs) {
  const md = pages.get(def.id);
  const pageHay = md === undefined ? '' : unescape(md);
  // The def's own SHIPPED text, read from the def: a note may restate a sentence a shipped field already
  // carries (switch-row's read-only reasoning is both a `notes.contested` entry and a prop description).
  // That text ships because of the shipped field, not the note, so it is not a leak.
  const own: string[] = [];
  const gather = (v: unknown) => { if (typeof v === 'string') own.push(norm(v)); else if (v && typeof v === 'object') Object.values(v).forEach(gather); };
  const d = def as ComponentDef & Record<string, unknown>;
  for (const f of DOC_FIELDS) gather(d[f]);
  const ownHay = own.join('\n');
  const maintainerOnly: [string, string][] = [
    ...(def.anatomy?.codeOnly ?? []).map((s, i): [string, string] => [`anatomy.codeOnly.${i}`, s]),
    ...MAINTAINER_NOTES.flatMap((k) => (def.notes?.[k] ?? []).map((s, i): [string, string] => [`notes.${k}.${i}`, s])),
  ];
  for (const [path, s] of maintainerOnly) {
    probed++;
    const ps = probes(s, path.startsWith('notes.'));
    // A half a shipped field of the same def carries verbatim ships through that field; the other half is
    // still searched.
    if (ps.some((p) => ownHay.includes(p))) shared++;
    const half = (p: string) => (ps.length === 2 ? (p === ps[0] ? ' (its first half)' : ' (its second half)') : '');
    for (const p of ps.filter((q) => !ownHay.includes(q))) {
      if (jsonHay.includes(p)) note(`MAINTAINER PROSE SHIPPED (json): \`${def.id}\` ${path}${half(p)} is in components.ai.json — #1623 ruled it maintainer-only`);
      if (pageHay.includes(p)) note(`MAINTAINER PROSE SHIPPED (page): \`${def.id}\` ${path}${half(p)} is on out/components/${def.id}.md — #1623 ruled it maintainer-only`);
    }
  }
}
if (probed < 370) note(`MAINTAINER PROBE FLOOR: only ${probed} codeOnly/notes entries were probed — the walk is not reaching the defs`);
for (const [id, md] of pages) {
  for (const label of ['**Keywords:**', '**Generation priority:**']) {
    if (md.includes(label)) note(`AGENT-ONLY ON PAGE: out/components/${id}.md carries \`${label}\` — the page is written for people; that metadata stays in the JSON's \`ai\` block`);
  }
}
const oursRule = (manifest.ours ?? []).some((r: { pattern: string }) => r.pattern === MAINTAINER_MANIFEST_PATTERN);
const payloadRule = (manifest.payload ?? []).some((r: { pattern: string }) => r.pattern === MAINTAINER_MANIFEST_PATTERN);
if (!oursRule || payloadRule) note(`MAINTAINER RECORD CLASS: payload-manifest.json must list \`${MAINTAINER_MANIFEST_PATTERN}\` under \`ours\` and not under \`payload\` (ours: ${oursRule}, payload: ${payloadRule})`);

// ---- ARM E: no Prism 2 in either payload form --------------------------------------------------
// The detector first, on literal samples: a pattern that stopped matching would otherwise report every
// payload clean.
const SAMPLES: [string, boolean][] = [['as in Prism 2', true], ['PRISM2 parity', true], ['prism  2', true], ['Prism3 engine', false]];
for (const [s, want] of SAMPLES) if (PRISM2.test(s) !== want) note(`PRISM 2 DETECTOR: the pattern ${want ? 'misses' : 'matches'} ${JSON.stringify(s)} — the scan below cannot be trusted`);
if (PRISM2.test(jsonText)) note('PRISM 2: components.ai.json names Prism 2 — no shipped artifact may cite it');
for (const [id, md] of pages) if (PRISM2.test(md)) note(`PRISM 2: out/components/${id}.md names Prism 2 — no shipped artifact may cite it`);
const keptInRecord = componentDefs.reduce((n, d) => n + [...(d.anatomy?.codeOnly ?? []), ...MAINTAINER_NOTES.flatMap((k) => d.notes?.[k] ?? [])].filter((s) => PRISM2.test(s)).length, 0);

// ---- report ----------------------------------------------------------------------------------
if (fail.length) {
  console.error(`\n✗ component docs — ${fail.length} problem(s):\n`);
  for (const f of (process.argv.includes('--all') ? fail : fail.slice(0, 60))) console.error(`  • ${f}`);
  if (fail.length > 60 && !process.argv.includes('--all')) console.error(`  … and ${fail.length - 60} more (\`--all\` lists every one)`);
  process.exit(1);
}
console.log(`  ✓ clean — ${ids.length} defs in all three files; ${declared.length - UNUSED_IN_CORPUS.size} schema fields represented (${UNUSED_IN_CORPUS.size} unused in the corpus, exempt); ` +
  `${jsonChecked} def leaves round-trip to the JSON, ${pageChecked} strings to their page section, ${cellChecked} values to their table cell, ${kindChecked} axis kinds to both; ` +
  `${maintChecked} maintainer entries in the record and none of ${probed} in either payload form (${shared} shared verbatim with a shipped field of the same def); no Prism 2 in the payload (${keptInRecord} maintainer entries name it, kept in the record only).`);
