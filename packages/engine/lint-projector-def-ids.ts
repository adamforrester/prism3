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
 *   LOOKUP     a def id is used to SELECT behavior: an index read by it (`X[def.id]`, `X[d.id]`, `X[defId]`; a write
 *              `X[d.id] = …` builds output), a membership test on it (`.includes(d.id)`, `.has(defId)`), `switch` on it,
 *              `def.id in X`, a string method or regex on it (`def.id.startsWith(…)`, `/^b/.test(def.id)`), any `.id`
 *              or `defId` compared to a string literal, a bare destructured `id` compared to a literal that is a
 *              registered def id, or `def.id` / `defId` compared to a CONSTANT (an upper-case name) outside
 *              `ALLOWED_ID_CONSTANTS`. Reported by line and the match. Scanned in `anatomy-figma.ts` and in the
 *              materializer chain's RESTATEMENTS (`component-specs.ts`, `component-defs-export.ts`, the plugin's
 *              `brand-def.ts`).
 *   TABLE      a top-level declaration in `anatomy-figma.ts` holds a registered def id as an object KEY (quoted or
 *              bare) or a `new Map([…])` entry key, or two or more as string ELEMENTS (an id list), outside
 *              `ALLOWED_TABLES`. One element alone is not a table: `'icon'` is a slot name as well as a def id.
 *              Reported by declaration name and the ids.
 *   ALLOWLIST  an allowlisted name no longer exists in the file, so a stale entry cannot cover a new table.
 *   REPRESENTED the scan read too few lines of the subject or of a restatement, or the def registry came back with too
 *              few ids to recognize a table.
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
 * not resolve, and `test.ts` holds each setting's reach to a typed list. Two evasions stay open (#3787):
 *   · a lookup keyed on ANOTHER carrier of the def's identity (`X.has(plan.component)`, the shape `CANVAS_FURNITURE`
 *     uses on purpose): the carriers are open-ended and mostly not ids. The TABLE rule still sees the table that
 *     such a lookup reads, when it holds a def id as a key or two as elements in `anatomy-figma.ts`.
 *   · a file outside `anatomy-figma.ts` and the RESTATEMENTS (a new shared materializer module): the TABLE rule
 *     misreads emitters' own keys, so widening it is not free. A new module would add a reader, which review sees.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components/index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const SUBJECT = 'packages/engine/anatomy-figma.ts';
/** The files that RESTATE the materializer chain (#3787, the #3785 review §5 item 8), scanned for LOOKUP only: each
 *  builds the record or object it emits under keys that can be def-id-shaped (`leversOf`'s `button` field), so the
 *  TABLE rule would misread them. `lint-lever-sweep.ts` restates the chain too, but it is a gate whose lists name
 *  defs on purpose. */
const RESTATEMENTS = ['packages/engine/component-specs.ts', 'packages/engine/component-defs-export.ts', 'apps/plugin/src/brand-def.ts'] as const;

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
/** A def id read off ANY receiver (`def.id`, `d.id`, `spec.def.id`) or `defId` (#3787, the #3785 review §5 item 1). */
const RECV_ID = String.raw`(?:(?<![\w$])(?:[A-Za-z_$][\w$]*\.)+id\b|\bdefId\b)`;
const ANY_ID = String.raw`(?:\.id\b|\bdefId\b)`;
const STR = String.raw`(?:'[^'\n]*'|"[^"\n]*"|\`[^\`\n]*\`)`;
const LOOKUPS: RegExp[] = [
  new RegExp(String.raw`\[\s*${RECV_ID}\s*\](?!\s*=(?!=))`, 'g'),                 // X[def.id], X[d.id]; not a write `X[d.id] = …`
  new RegExp(String.raw`\.(?:includes|has)\(\s*${RECV_ID}\s*\)`, 'g'),             // X.includes(def.id), X.has(d.id)
  new RegExp(String.raw`${ANY_ID}\s*[!=]==?\s*${STR}`, 'g'),                        // d.id === 'tag'
  new RegExp(String.raw`${STR}\s*[!=]==?\s*[\w.]*${ANY_ID}`, 'g'),                  // 'tag' === def.id
  new RegExp(String.raw`${ID}\s*[!=]==?\s*([A-Za-z_$][\w$.]*)`, 'g'),              // def.id === SOME_ID
  new RegExp(String.raw`\b([A-Za-z_$][\w$.]*)\s*[!=]==?\s*${ID}`, 'g'),            // SOME_ID === def.id
  // #3787, the #3785 review §5 items 2, 4 and 5: a switch on the id, an `in` test, a string method or a regex on it.
  new RegExp(String.raw`\bswitch\s*\(\s*${RECV_ID}\s*\)`, 'g'),                     // switch (def.id) { case 'tag': … }
  new RegExp(String.raw`${RECV_ID}\s+in\s+[A-Za-z_$]`, 'g'),                         // def.id in TABLE
  new RegExp(String.raw`${RECV_ID}\s*\.\s*(?:startsWith|endsWith|includes|indexOf|match|search)\s*\(`, 'g'), // def.id.startsWith('button')
  new RegExp(String.raw`\.(?:test|exec)\(\s*${RECV_ID}\s*\)`, 'g'),                  // /^button/.test(def.id)
];
/** A bare `id` (destructured: `({ id }) => …`) compared to a literal that IS a registered def id (#3787, §5 item 3).
 *  Only a registered id counts, because a bare `id` is also a Figma node id or a row key (`id !== ''`). */
const BARE_ID_COMPARES: RegExp[] = [
  new RegExp(String.raw`(?<![\w$.])id\s*[!=]==?\s*(['"\`])([^'"\`\n]*)\1`, 'g'),     // id === 'tag'
  new RegExp(String.raw`(['"\`])([^'"\`\n]*)\1\s*[!=]==?\s*id(?![\w$])`, 'g'),       // 'tag' === id
];

/** The argument text of each `new Map(…)` in `body`, brackets balanced (a string holding a bracket is rare in a
 *  table and only makes the span longer). */
const mapArgs = (body: string): string[] => {
  const out: string[] = [];
  for (const m of body.matchAll(/\bnew\s+Map\s*(?:<[^>]*>)?\s*\(/g)) {
    let depth = 1, k = m.index! + m[0].length;
    const start = k;
    for (; k < body.length && depth; k++) { if ('([{'.includes(body[k])) depth++; else if (')]}'.includes(body[k])) depth--; }
    out.push(body.slice(start, k - 1));
  }
  return out;
};

/** Every LOOKUP hit in `src`, and every TABLE hit when `tables`, given the registered def ids. */
export const scan = (src: string, ids: ReadonlySet<string>, tables = true): Hit[] => {
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
  for (const re of BARE_ID_COMPARES) for (const m of code.matchAll(re)) if (ids.has(m[2])) hits.push({ rule: 'LOOKUP', where: `line ${lineOf(m.index!)}`, what: m[0] });
  if (!tables) return hits;
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
    // A `new Map([['tag', …]])` entry's key is a key like an object's, so one is a table (#3787, §5 item 6).
    for (const arg of mapArgs(body)) for (const m of arg.matchAll(/\[\s*(['"])([_a-z][a-z0-9-]*)\1\s*,/g)) if (ids.has(m[2])) keys.push(m[2]);
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
  "const p1 = (d) => STYLE_PARTS[d.id];",                                                 // LOOKUP: index, another receiver (#3787)
  "const p2 = (d) => LIST.includes(d.id);",                                               // LOOKUP: membership, another receiver
  "const p3 = (def) => { switch (def.id) { case 'tag': return 1; } };",                  // LOOKUP: switch
  "const p4 = ({ id }) => id === 'dialog';",                                              // LOOKUP: destructured id
  "const p5 = (def) => def.id in STYLE_PARTS;",                                           // LOOKUP: in
  "const p6 = (def) => def.id.startsWith('select');",                                     // LOOKUP: string method
  "const p7 = (def) => /^text/.test(def.id);",                                            // LOOKUP: regex test
  "const ONE = new Map([['tag', 'container']]);",                                         // TABLE: one Map entry
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
  "const r2 = ({ id }) => id !== '';",                                 // a bare id against a non-id literal (#3787)
  "const r3 = (id) => id.startsWith('_');",                            // a bare id's method: a row key or a node id
  "const r4 = new Map([['label', 1], ['tone', 2]]);",                  // a Map keyed by names that are not def ids
  "const r5 = new Map(axis.map((v) => [v, 1]));",                      // a Map built from data, no literal key
  "const r6 = (n) => seen.has(n.name);",                               // membership on another field
  "const r7 = (d) => { out[d.id] = 1; };",                             // a record written by id is output, not a lookup
].join('\n');
{
  const got = scan(PLANTED, PLANT_IDS).map((h) => `${h.rule} ${h.where.replace(/ \(line \d+\)/, '')}`);
  const want = ['LOOKUP line 6', 'LOOKUP line 7', 'LOOKUP line 8', 'LOOKUP line 9', 'TABLE STYLE_PARTS', 'TABLE FRAMES', 'TABLE LIST',
    ...[10, 11, 12, 13, 14, 15, 16].map((n) => `LOOKUP line ${n}`), 'TABLE ONE'];
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
for (const f of RESTATEMENTS) {
  const text = existsSync(resolve(repo, f)) ? readFileSync(resolve(repo, f), 'utf8') : '';
  if (text.split('\n').length < 50) { fail('REPRESENTED', `${f} read as ${text.split('\n').length} lines; it restates the materializer chain, so the scan lost it (moved? update RESTATEMENTS)`); continue; }
  for (const h of scan(text, ids, false)) fail(h.rule, `${f} ${h.where}: ${h.what} — a restated materializer that keys on a def id is per-component knowledge; put it on the def as data (\`ComponentDef.levers\`)`);
}
const code = blankComments(src);
for (const n of new Set<string>([...ALLOWED_ID_CONSTANTS, ...ALLOWED_TABLES]))
  if (!new RegExp(String.raw`\b${n}\b`).test(code)) fail('ALLOWLIST', `'${n}' is allowlisted but no longer in ${SUBJECT}; drop it`);

if (failures.length) {
  console.error(`✗ lint-projector-def-ids — ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`  ✓ ${SUBJECT}: no def-id lookup and no def-id-keyed table outside ${ALLOWED_TABLES.length} allowlisted names (${lineCount} lines, ${ids.size} registered ids); no def-id lookup in ${RESTATEMENTS.length} restatements; self-check: the planted source flagged as typed, ${DECOYS.split("\n").length} decoys clean`);
