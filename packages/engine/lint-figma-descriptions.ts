/**
 * FIGMA-DESCRIPTION GATE (#1623 sign-off) — every description the engine writes into a Figma file is in
 * the plugin register: short, plain, and naming only things a designer can find.
 *
 *   npx tsx packages/engine/lint-figma-descriptions.ts
 *
 * ── WHAT THE OWNER DECIDED, AND WHAT THIS HOLDS ─────────────────────────────────────────────────
 *
 * The #1623 audit found 22% of Figma descriptions over the plugin register's length, all 72 control
 * variables at 201–339 characters, dotted DTCG paths and backticks in the Variables panel, all-caps
 * emphasis, and issue numbers. The owner chose "about 90 characters for Figma descriptions; the full
 * detail stays in the DTCG description and the `.ai.json`". `figma-description.ts` builds that register
 * from structured data. This gate is the rule held against the OUTPUT, so a template that grows, a new
 * token family, or a builder bypassed at a call site fails here by name. Each rule:
 *
 *   LENGTH     ≤ CEILING characters. See THE CEILING below.
 *   EMPTY      a description is present — an empty one is a variable with no explanation at all.
 *   BACKTICK   no backticks: Figma renders them literally (FG/F-12).
 *   DOTTED     no dotted token path (`background.secondary`). Figma names use slashes, and a dotted path
 *              cannot be pasted into the variables search (FG/F-12).
 *   ALL-CAPS   no all-caps emphasis words (`PAGE`, `CLAMPED`) — acronyms of standards excepted (FG/F-12).
 *   ISSUE-REF  no `#NNNN` issue reference — internal bookkeeping, not designer text (FG/F-8).
 *   PRISM2     no "Prism 2" / "Prism2": the predecessor is an input, not an authority (owner direction).
 *
 * And one rule on the DTCG side, where the same owner direction applies and the full prose lives:
 *
 *   DTCG-PRISM2    no DTCG `$description` (canonical, or any mode's) names Prism 2 or Prism2.
 *   DTCG-ISSUE-REF no DTCG `$description` carries a `#NNNN` issue reference.
 *
 * ── THE CEILING — DERIVED, NOT TYPED HERE ───────────────────────────────────────────────────────
 *
 * The target is read out of `docs/voice-standard.md` §4, the plugin register's Length cell ("~90 chars
 * for a `desc`"), so the gate and the standard cannot disagree without the gate failing on the parse.
 * The target is approximate by its own wording ("~", and the owner's "about 90"), so the hard ceiling
 * is the target plus TOLERANCE = 10: one short clause of slack — a ratio and its ground, or a mode
 * parenthetical — and no more. 100 for a 90 target. The number is NOT imported from the builder:
 * `figma-description.ts` never measures its own output against a limit (it composes, it does not
 * truncate), so there is no shared constant for the two to agree on by construction (docs/34 shape 2).
 * Over-target lines are REPORTED but do not fail — they are the "about" the owner allowed.
 *
 * ── WHAT IS READ ────────────────────────────────────────────────────────────────────────────────
 *
 *   COMMITTED — every `out/figma/<brand>/*.json` row: variables (`variables[]`) and styles (`styles[]`).
 *   BUILT     — every example brand WITHOUT a committed Figma emission (harbor, #1119) is built in memory
 *               through the same `figmaArtifacts` shell the committed files come from, because the
 *               plugin can still apply it and a designer would read its descriptions.
 *   DTCG      — every `out/<brand>.tokens.json`, `.base.tokens.json` and `.<mode>.overlay.tokens.json`.
 *
 * REPRESENTATION: the run fails unless it read ≥3 committed brands, ≥1 built brand, and every collection
 * KIND below in every committed brand, so a directory that silently stopped emitting a kind is a failure
 * rather than a smaller clean sweep.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { figmaArtifacts } from './emit-figma';
import { brandTheme, BrandInput } from './theme';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
const FIGMA = join(OUT, 'figma');

// ── the ceiling, from the voice standard ─────────────────────────────────────────────────────────
const TOLERANCE = 10;
const standard = readFileSync(join(here, '../../docs/voice-standard.md'), 'utf8');
const targetMatch = /~(\d+) chars for a `desc`/.exec(standard);
if (!targetMatch) {
  console.error('✗ lint-figma-descriptions: docs/voice-standard.md no longer states the plugin register length as "~N chars for a `desc`" — the ceiling cannot be derived. Update this parse together with the standard.');
  process.exit(1);
}
const TARGET = Number(targetMatch[1]);
const CEILING = TARGET + TOLERANCE;

// ── the rules ────────────────────────────────────────────────────────────────────────────────────
/** Acronyms of standards and units a description may spell in capitals. Everything else in capitals is emphasis. */
const ACRONYMS = new Set(['WCAG', 'AAA', 'CSS', 'RGB', 'HSL', 'OKLCH']);
const PRISM2 = /prism\s*2/i;
const ISSUE_REF = /#\d+/;
type Rule = { name: string; test: (d: string) => string | undefined };
const FIGMA_RULES: Rule[] = [
  { name: 'EMPTY', test: (d) => (d.trim() === '' ? 'no description' : undefined) },
  { name: 'LENGTH', test: (d) => (d.length > CEILING ? `${d.length} characters, over the ${CEILING} ceiling (~${TARGET} target)` : undefined) },
  { name: 'BACKTICK', test: (d) => (d.includes('`') ? 'a backtick, which Figma renders literally' : undefined) },
  { name: 'DOTTED', test: (d) => { const m = /\b[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\b/.exec(d); return m ? `the dotted path '${m[0]}' — name it with slashes or in plain words` : undefined; } },
  { name: 'ALL-CAPS', test: (d) => { const w = (d.match(/\b[A-Z]{3,}\b/g) ?? []).filter((x) => !ACRONYMS.has(x)); return w.length ? `all-caps ${w.join(', ')}` : undefined; } },
  { name: 'ISSUE-REF', test: (d) => (ISSUE_REF.test(d) ? `an issue reference (${ISSUE_REF.exec(d)![0]})` : undefined) },
  { name: 'PRISM2', test: (d) => (PRISM2.test(d) ? 'names Prism 2' : undefined) },
];

const failures: string[] = [];
const overTarget: string[] = [];
let checked = 0;
const checkFigma = (where: string, description: unknown): void => {
  checked++;
  const d = typeof description === 'string' ? description : '';
  for (const r of FIGMA_RULES) {
    const why = r.test(d);
    if (why) failures.push(`${r.name}  ${where} — ${why}\n      "${d}"`);
  }
  if (d.length > TARGET && d.length <= CEILING) overTarget.push(where);
};

/** Every described row in one emitted Figma file, variables and styles alike. */
const rowsOf = (file: any): Array<{ name: string; description: unknown }> =>
  [...(Array.isArray(file.variables) ? file.variables : []), ...(Array.isArray(file.styles) ? file.styles : [])];

/** The KIND of a Figma file — its name with the mode suffix dropped (`color.dark.json` → `color`). */
const kindOf = (file: string): string => file.replace(/\.json$/, '').split('.')[0];
const KINDS = ['color', 'core', 'control', 'focus', 'space', 'radius', 'size', 'icon', 'border-width', 'opacity', 'layout', 'type-sets', 'text-styles', 'shadow-styles', 'grid-styles'];

// ── COMMITTED ────────────────────────────────────────────────────────────────────────────────────
const committed = existsSync(FIGMA) ? readdirSync(FIGMA).filter((b) => existsSync(join(FIGMA, b, 'color.light.json'))) : [];
const represented: string[] = [];
for (const brand of committed) {
  const seen = new Set<string>();
  for (const f of readdirSync(join(FIGMA, brand)).filter((x) => x.endsWith('.json'))) {
    const rows = rowsOf(JSON.parse(readFileSync(join(FIGMA, brand, f), 'utf8')));
    if (rows.length) seen.add(kindOf(f));
    for (const r of rows) checkFigma(`figma/${brand}/${f} ${r.name}`, r.description);
  }
  const missing = KINDS.filter((k) => !seen.has(k));
  if (missing.length) failures.push(`REPRESENTATION  figma/${brand} — no described rows of kind ${missing.join(', ')}`);
  represented.push(brand);
}

// ── BUILT (example brands with no committed emission) ──────────────────────────────────────────
const examples = JSON.parse(readFileSync(join(here, 'schema/example-brands.json'), 'utf8')) as Record<string, unknown>;
const built: string[] = [];
for (const [id, input] of Object.entries(examples)) {
  if (committed.includes(id)) continue;
  for (const a of figmaArtifacts(brandTheme(input as BrandInput)).artifacts) {
    if (!a.path.endsWith('.json')) continue;
    for (const r of rowsOf(JSON.parse(a.content))) checkFigma(`figma/${id} (built) ${a.path} ${r.name}`, r.description);
  }
  built.push(id);
}

// ── DTCG ─────────────────────────────────────────────────────────────────────────────────────────
let dtcgChecked = 0;
const dtcgFiles = readdirSync(OUT).filter((f) => /\.tokens\.json$/.test(f));
const walk = (node: any, path: string[], file: string): void => {
  if (!node || typeof node !== 'object') return;
  if ('$value' in node) {
    const texts: Array<[string, unknown]> = [['', node.$description]];
    for (const [m, e] of Object.entries(node.$extensions?.prism3?.modes ?? {})) if ((e as any)?.description) texts.push([` [${m}]`, (e as any).description]);
    for (const [tag, t] of texts) {
      if (typeof t !== 'string') continue;
      dtcgChecked++;
      if (PRISM2.test(t)) failures.push(`DTCG-PRISM2  ${file} ${path.join('.')}${tag} — names Prism 2\n      "${t}"`);
      if (ISSUE_REF.test(t)) failures.push(`DTCG-ISSUE-REF  ${file} ${path.join('.')}${tag} — ${ISSUE_REF.exec(t)![0]}\n      "${t}"`);
    }
    return;
  }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...path, k], file);
};
for (const f of dtcgFiles) walk(JSON.parse(readFileSync(join(OUT, f), 'utf8')), [], f);

// ── representation ───────────────────────────────────────────────────────────────────────────────
if (represented.length < 3) failures.push(`REPRESENTATION  expected ≥3 committed Figma brands, read ${represented.join(', ') || 'none'}`);
if (built.length < 1) failures.push('REPRESENTATION  expected ≥1 example brand built in memory (harbor has no committed Figma emission), built none');
if (dtcgFiles.length < 16 || dtcgChecked < 5000) failures.push(`REPRESENTATION  expected ≥16 DTCG files and ≥5000 descriptions, read ${dtcgFiles.length} files / ${dtcgChecked} descriptions`);

if (failures.length) {
  console.error(`✗ lint-figma-descriptions: ${failures.length} failure(s) — ${checked} Figma descriptions, ${dtcgChecked} DTCG descriptions checked (ceiling ${CEILING}, from the ~${TARGET}-character plugin register in docs/voice-standard.md):`);
  for (const f of failures.slice(0, 40)) console.error(`  ✗ ${f}`);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`✓ lint-figma-descriptions: all ${checked} Figma descriptions are within ${CEILING} characters (~${TARGET} target; ${overTarget.length} between the two) with no backtick, dotted path, all-caps emphasis, issue reference or Prism 2 — ${represented.length} committed brands (${represented.join(', ')}) + ${built.length} built (${built.join(', ')}); and none of ${dtcgChecked} DTCG descriptions names Prism 2 or an issue`);
