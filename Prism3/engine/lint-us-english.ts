/**
 * US-English gate for SHIPPED text (#162 → #260 → #302 → #310 → this).
 *
 * CLAUDE.md scopes the rule to *visible UI text* and *emitted artifact prose*; code comments and
 * identifiers are a deliberate carve-out. This encodes exactly that scope so the rule stops being
 * something each pass has to remember — four PRs in a row re-derived it and three of them missed
 * something.
 *
 * Two traps, both of which caught a previous pass, are handled here rather than left to the reader:
 *
 *  1. A FIXED WORD LIST UNDER-COUNTS. `colour|grey|behaviour` misses `generalised`, `tokenisation`,
 *     `synthesising`. So this scans the `-is(e|ed|es|ing|ation)` and `-our` PATTERNS and subtracts a
 *     false-positive list (`otherwise`, `precise`, `source`, `hour`, …) — the inverse of a word list,
 *     and it fails toward reporting too much rather than too little.
 *  2. SOURCE GREPS MISS WHAT SHIPS. `engine/levers.ts` prose is inlined into `web/dist/main.js`, so
 *     the built bundle is scanned directly. A `.ts` grep would have called the bundle clean.
 *
 * SCOPE. Everything shipped is gated, and as of this pass that includes the two surfaces previously
 * carried as "reported, never fatal": the hand-authored `theme-schema.json` contract and the engine
 * README. Both are now converted (owner decision), so the open-decision carve-out that CLAUDE.md
 * recorded is closed and there is nothing left to merely count — a surface that is clean and NOT
 * gated is just a surface waiting to regress quietly.
 *
 * Run: `npx tsx Prism3/engine/lint-us-english.ts`  (exit 1 = a gated surface regressed)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ENGINE_ARTIFACTS, SCHEMA_ARTIFACTS } from './regen';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

// The pattern, not a word list. `[A-Za-z]{3,}` keeps `is`/`our` themselves out.
const PATTERN = /\b[A-Za-z]{3,}(?:is(?:e|ed|es|ing|ation)|our)\b/g;
// Ordinary English that merely ENDS in those letters. Subtracting these is what makes a pattern scan
// usable; adding to this list is the correct fix for a false positive, never narrowing the pattern.
const NOT_EN_GB = new Set([
  'surprise', 'surprises', 'surprised', 'surprising', 'wise', 'otherwise', 'likewise', 'rise', 'rises',
  'arise', 'arises', 'arising', 'promise', 'promises', 'promised', 'precise', 'concise', 'exercise',
  'exercises', 'compromise', 'compromises', 'revise', 'revised', 'revises', 'devise', 'devised',
  'devises', 'supervise', 'enterprise', 'expertise', 'noise', 'raise', 'raises', 'raised', 'advertise',
  'advertised', 'advertises', 'praise', 'praised', 'cruise', 'paradise', 'franchise', 'merchandise',
  'poise', 'poised', 'guise', 'disguise', 'excise', 'incise', 'anise', 'demise', 'chastise', 'baptise',
  'your', 'yours', 'our', 'ours', 'four', 'hour', 'hours', 'pour', 'pours', 'tour', 'tours', 'detour',
  'source', 'sources', 'sourced', 'sourcing', 'resource', 'resources', 'outsource', 'flour', 'devour',
  'contour', 'contours', 'velour', 'dour', 'scour', 'sour',
]);

type Hit = { file: string; line: number; word: string; context: string };

const scan = (abs: string): Hit[] => {
  let txt: string;
  try { txt = readFileSync(abs, 'utf8'); } catch { return []; }
  const hits: Hit[] = [];
  for (const m of txt.matchAll(PATTERN)) {
    const w = m[0];
    if (NOT_EN_GB.has(w.toLowerCase())) continue;
    const line = txt.slice(0, m.index).split('\n').length;
    const from = Math.max(0, (m.index ?? 0) - 55);
    hits.push({ file: relative(repo, abs), line, word: w, context: txt.slice(from, (m.index ?? 0) + 45).replace(/\s+/g, ' ') });
  }
  return hits;
};

const walk = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
};

// ---- GATED: visible UI text + emitted artifact prose. A hit here fails the build. ----
// Scope is IMPORTED from regen.ts rather than restated, so adding an emitted artifact there brings it
// under this gate automatically instead of quietly widening the blind spot.
const gated: string[] = [
  ...walk(join(repo, 'Prism3/engine/out')),
  ...SCHEMA_ARTIFACTS.map((f) => join(repo, 'Prism3/schema', f)),
  ...ENGINE_ARTIFACTS.map((f) => join(repo, 'Prism3/engine', f)),
  ...walk(join(repo, 'web/dist')).filter((f) => f.endsWith('.js')),   // trap 2: what actually ships
  // Converted and folded in (owner decision) — previously reported-but-not-fatal because CLAUDE.md
  // held their conversion open. Gated now: leaving a clean surface ungated only defers the regression.
  join(repo, 'Prism3/schema/theme-schema.json'),
  join(repo, 'Prism3/engine/README.md'),
];

const gatedHits = gated.flatMap(scan);
const byFile = new Map<string, Hit[]>();
for (const h of gatedHits) byFile.set(h.file, [...(byFile.get(h.file) ?? []), h]);

console.log(`US-English gate — ${gated.length} shipped files scanned (out/, emitted schema, reports, built bundle).`);
if (gatedHits.length) {
  console.error(`\n❌ ${gatedHits.length} en-GB spelling(s) in SHIPPED text:\n`);
  for (const [f, hs] of byFile) {
    console.error(`  ${f}`);
    for (const h of hs.slice(0, 8)) console.error(`    ${h.line}: ${h.word}  …${h.context}…`);
    if (hs.length > 8) console.error(`    … and ${hs.length - 8} more`);
  }
} else {
  console.log('  ✓ clean — no en-GB spellings in any shipped surface.');
}

process.exit(gatedHits.length ? 1 : 0);
