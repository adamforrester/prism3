/**
 * Prism3 engine — THE FIGMA PROJECTION DOES NOT KEY ON DEF IDS (#3698 F4, R5 refactor 4).
 *
 *   npx tsx packages/engine/lint-projector-def-ids.ts
 *
 * WHAT CHANGED. `anatomy-figma.ts` held each component's brand-style reach in tables keyed by def id
 * (`FIELD_FRAME_PARTS`, `TAG_STYLE_PARTS`, `DIALOG_TITLE_TYPE_KEYS`, `BANNER_STYLE_FILL_KEYS`, `CURRENT_INDICATOR_PARTS`,
 * `FIELD_CORNER_REFS`, `SEARCH_FIELD_STYLE_DEFS`, `OPAQUE_FILL_DEFS`). A new styled component had to edit the projector,
 * and a code or Storybook projection would have had to copy each table. Since #3698 R5 refactor 4 that reach is
 * data on the def (`ComponentDef.levers`), and the projector reads it with no def id in sight. This gate keeps it
 * that way.
 *
 * WHAT IT ASSERTS, each failure prefixed by the name a mutation must produce. The scan reads `anatomy-figma.ts` with
 * its comments blanked (prose may name a def; code may not key on one):
 *   LOOKUP     a def id is used to SELECT behavior: an index by it (`X[def.id]`, `X[defId]`), a membership test on it
 *              (`.includes(def.id)`, `.has(defId)`), any `.id` or `defId` compared to a string literal, or `def.id` /
 *              `defId` compared to a CONSTANT (an upper-case name) outside `ALLOWED_ID_CONSTANTS`. Reported by line and the match.
 *   TABLE      a top-level declaration holds a registered def id as an object KEY (quoted or bare), or two or more as
 *              string ELEMENTS (an id list), outside `ALLOWED_TABLES`. One element alone is not a table: `'icon'` is a
 *              slot name as well as a def id. Reported by declaration name and the ids.
 *   ALLOWLIST  an allowlisted name no longer exists in the file, so a stale entry cannot cover a new table.
 *   REPRESENTED the scan read too few lines, or the def registry came back with too few ids to recognize a table.
 *   SELF-CHECK the detector, run on planted source typed below, does not flag exactly what is planted (and none of
 *              the decoys). A pattern that stopped matching would otherwise read as clean.
 *
 * WHAT IS ALLOWED, and why, typed here (never read from the file it checks):
 *   · `ICON_DEF_ID`, `PROVIDER_LOGO_DEF_ID`: the icon and provider-logo defs ARE the glyph and mark libraries other
 *     defs instance, so the projector compares a def against them by identity. Not style.
 *   · `CANVAS_FURNITURE`: the canvas-layout rollout list (labels, inverse backdrop). Its header says it is held by id
 *     on purpose, so a set laid out by an earlier plugin can still be planned the old way. Not style.
 *
 * INDEPENDENCE (docs/34). The SUBJECT is `anatomy-figma.ts`'s source text. The REFERENCE is the def ids in
 * `componentDefs` (the registry, not the projector) and the allowlists typed here.
 *
 * WHAT IT DOES NOT ASSERT. That each def's `levers` is right: the validator (`leverErrors`) refuses a name that does
 * not resolve, and `test.ts` holds each setting's reach to a typed list. Other files are not scanned: the materializers
 * live in `anatomy-figma.ts`, and a table moved to a new file would still need a LOOKUP there or a new reader, which
 * review sees.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components/index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const SUBJECT = 'packages/engine/anatomy-figma.ts';

/** Identifiers `def.id` may be compared to: the glyph-library defs (see the header). */
const ALLOWED_ID_CONSTANTS = ['ICON_DEF_ID', 'PROVIDER_LOGO_DEF_ID'] as const;
/** Top-level declarations that may hold def ids: the two constants above, and the canvas-furniture rollout list. */
const ALLOWED_TABLES = ['ICON_DEF_ID', 'PROVIDER_LOGO_DEF_ID', 'CANVAS_FURNITURE'] as const;

/** `src` with every comment replaced by spaces, newlines kept (so line numbers hold) and string contents kept. */
export const blankComments = (src: string): string => {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') { out += n ?? ''; i += 2; continue; }
      if (c === quote) quote = null;
      i++; continue;
    }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      for (; i < stop; i++) out += src[i] === '\n' ? '\n' : ' ';
      continue;
    }
    if (c === '\'' || c === '"' || c === '`') quote = c;
    out += c; i++;
  }
  return out;
};

type Hit = { rule: 'LOOKUP' | 'TABLE'; where: string; what: string };

const ID = String.raw`(?:\bdef\.id\b|\bdefId\b)`;
const ANY_ID = String.raw`(?:\.id\b|\bdefId\b)`;
const STR = String.raw`(?:'[^'\n]*'|"[^"\n]*"|\`[^\`\n]*\`)`;
const LOOKUPS: RegExp[] = [
  new RegExp(String.raw`\[\s*${ID}\s*\]`, 'g'),                                   // X[def.id]
  new RegExp(String.raw`\.(?:includes|has)\(\s*${ID}\s*\)`, 'g'),                  // X.includes(def.id)
  new RegExp(String.raw`${ANY_ID}\s*[!=]==?\s*${STR}`, 'g'),                        // d.id === 'tag'
  new RegExp(String.raw`${STR}\s*[!=]==?\s*[\w.]*${ANY_ID}`, 'g'),                  // 'tag' === def.id
  new RegExp(String.raw`${ID}\s*[!=]==?\s*([A-Za-z_$][\w$.]*)`, 'g'),              // def.id === SOME_ID
  new RegExp(String.raw`\b([A-Za-z_$][\w$.]*)\s*[!=]==?\s*${ID}`, 'g'),            // SOME_ID === def.id
];

/** Every LOOKUP and TABLE hit in `src`, given the registered def ids. */
export const scan = (src: string, ids: ReadonlySet<string>): Hit[] => {
  const code = blankComments(src);
  const hits: Hit[] = [];
  const lineOf = (at: number) => code.slice(0, at).split('\n').length;
  for (const re of LOOKUPS) for (const m of code.matchAll(re)) {
    const other = m[1];
    // An identifier compare is a lookup only against a CONSTANT (an upper-case name holding a def id); a variable
    // (`id === defId`, a def refusing itself in its own slot) is not a table.
    if (other !== undefined && ((ALLOWED_ID_CONSTANTS as readonly string[]).includes(other) || !/^[A-Z_][A-Z0-9_]*$/.test(other.split('.').pop()!))) continue;
    hits.push({ rule: 'LOOKUP', where: `line ${lineOf(m.index!)}`, what: m[0] });
  }
  // Top-level declarations: from a column-0 `const`/`export const` to the next column-0 statement.
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const head = /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(lines[i]);
    if (!head) continue;
    let j = i + 1;
    while (j < lines.length && !/^\S/.test(lines[j])) j++;
    if (j < lines.length && /^[}\])]/.test(lines[j])) j++;
    const body = lines.slice(i, j).join('\n');
    const name = head[1];
    if ((ALLOWED_TABLES as readonly string[]).includes(name)) { i = j - 1; continue; }
    const keys = [...body.matchAll(/(?:^|[{,])\s*(['"]?)([_a-z][a-z0-9-]*)\1\s*:/gm)].map((m) => m[2]).filter((k) => ids.has(k));
    const elems = [...body.matchAll(/['"]([_a-z][a-z0-9-]*)['"](?!\s*:)/g)].map((m) => m[1]).filter((k) => ids.has(k));
    if (keys.length) hits.push({ rule: 'TABLE', where: `${name} (line ${i + 1})`, what: `def id key(s) ${[...new Set(keys)].join(', ')}` });
    else if (new Set(elems).size >= 2) hits.push({ rule: 'TABLE', where: `${name} (line ${i + 1})`, what: `def id list ${[...new Set(elems)].join(', ')}` });
    i = j - 1;
  }
  return hits;
};

const failures: string[] = [];
const fail = (tag: string, msg: string) => failures.push(`${tag}: ${msg}`);

// ── SELF-CHECK: planted source, typed here ──────────────────────────────────────────────────────────────────────────
const PLANT_IDS = new Set(['tag', 'dialog', 'text-field', 'select', 'icon']);
const PLANTED = [
  "export const STYLE_PARTS: Readonly<Record<string, string>> = { tag: 'container' };",   // TABLE: bare key
  "export const FRAMES = {",                                                              // TABLE: quoted key, multi-line
  "  'text-field': 'control',",
  "};",
  "const LIST: readonly string[] = ['dialog', 'select'];",                               // TABLE: id list
  "const f = (def) => STYLE_PARTS[def.id];",                                              // LOOKUP: index
  "const g = (defId) => LIST.includes(defId);",                                           // LOOKUP: membership
  "const h = (def) => def.id === 'tag';",                                                 // LOOKUP: literal
  "const k = (def) => SOME_OTHER_ID !== def.id;",                                         // LOOKUP: constant
].join('\n');
const DECOYS = [
  "const INK = new Set(['label', 'icon', 'indicator']);",              // one id element: a slot name, not a table
  "// TAG_PARTS[def.id] in a comment, and { tag: 'x' } too",           // comments are prose
  "/* def.id === 'dialog' */",
  "const msg = (def) => `${def.id}: no frame`;",                       // an id in a message is not a lookup
  "const m = (def) => def.id === ICON_DEF_ID;",                        // allowlisted constant
  "const r = (d, p) => d.id === p;",                                   // registry lookup by a variable
  "const q = (id, defId) => id === defId;",                             // a variable compare, not a constant
  "const s = { label: 'tag' };",                                       // an id as a VALUE is not a key
].join('\n');
{
  const got = scan(PLANTED, PLANT_IDS).map((h) => `${h.rule} ${h.where.replace(/ \(line \d+\)/, '')}`);
  const want = ['LOOKUP line 6', 'LOOKUP line 7', 'LOOKUP line 8', 'LOOKUP line 9', 'TABLE STYLE_PARTS', 'TABLE FRAMES', 'TABLE LIST'];
  if (JSON.stringify([...got].sort()) !== JSON.stringify([...want].sort()))
    fail('SELF-CHECK', `the planted source should flag exactly ${JSON.stringify(want)}, and flagged ${JSON.stringify(got)}`);
  const decoy = scan(DECOYS, PLANT_IDS);
  if (decoy.length) fail('SELF-CHECK', `a decoy was flagged: ${decoy.map((h) => `${h.rule} ${h.where} ${h.what}`).join('; ')}`);
}

// ── THE SUBJECT ─────────────────────────────────────────────────────────────────────────────────────────────────────
const src = readFileSync(resolve(here, 'anatomy-figma.ts'), 'utf8');
const ids = new Set(componentDefs.map((d) => d.id));
const lineCount = src.split('\n').length;
if (lineCount < 2000) fail('REPRESENTED', `${SUBJECT} read as ${lineCount} lines; the projector is several thousand, so the scan lost it`);
if (ids.size < 40) fail('REPRESENTED', `componentDefs gave ${ids.size} ids; too few to recognize a def-id table`);
for (const h of scan(src, ids)) fail(h.rule, `${SUBJECT} ${h.where}: ${h.what} — a projector that keys on a def id is per-component knowledge; put it on the def as data (\`ComponentDef.levers\`)`);
const code = blankComments(src);
for (const n of new Set<string>([...ALLOWED_ID_CONSTANTS, ...ALLOWED_TABLES]))
  if (!new RegExp(String.raw`\b${n}\b`).test(code)) fail('ALLOWLIST', `'${n}' is allowlisted but no longer in ${SUBJECT}; drop it`);

if (failures.length) {
  console.error(`✗ lint-projector-def-ids — ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`  ✓ ${SUBJECT}: no def-id lookup and no def-id-keyed table outside ${ALLOWED_TABLES.length} allowlisted names (${lineCount} lines, ${ids.size} registered ids; self-check: 7 planted hits found, 8 decoys clean)`);
