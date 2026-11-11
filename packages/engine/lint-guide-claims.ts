/**
 * Prism3 engine — THE DESIGNER GUIDES STILL DESCRIBE THE APP (#3264, owner decision 3 A).
 *
 *   npx tsx packages/engine/lint-guide-claims.ts
 *   npx tsx packages/engine/lint-guide-claims.ts --stamp   # fingerprint each range-only citation that has none
 *
 * `docs/public/guides/*.md` are hand-written: a designer reads them to find a control and learn what it does. They
 * went stale once already, silently: drafted on 2026-10-16 (#2656), they still sent readers to the Figma menu, the top
 * bar's Apply Theme and the Prune dialog two weeks after IA v2 removed all three, and nothing failed. The guides are the
 * SUBJECT here and the code is the ORACLE: every arm reads its expected value from the app source or the engine, never
 * from a guide, so a stale guide cannot agree with itself (`docs/34` shape 1).
 *
 * ── THE ARMS, each named in its failure lines ──────────────────────────────────────────────────────
 *
 *   LABEL     Every **bold** span in a guide is a UI label, and each one is a string in the app source: a string
 *             literal (or an HTML text node) in `apps/studio/src`, `apps/plugin/src` or `apps/tokenpress/src`. Comments
 *             do not count, so renaming a label's literal fails here even while a comment still says the old words.
 *             A label matches a literal whole, not as a substring of a longer one, so **Theme** is not satisfied by
 *             "Theme applied". A label with no placeholder must equal a plain literal exactly; no template can
 *             satisfy it. An italic part of a label is a placeholder (**Delete *N* items**): it matches a template
 *             literal's `${…}`, the template must have exactly as many `${…}` as the label has placeholders, its
 *             static chunks keep their spaces (so `${a} and ${b}` needs " and ", not "and" inside a word), and it must
 *             carry LABEL_MIN_STATIC letters of its own so a bare `${x}` cannot match everything. A bold span that ends
 *             in a period or a colon is a lead sentence, not a label, and is skipped. HTML counts its text nodes and the
 *             attributes a reader sees (`aria-label`, `title`, `placeholder`, `alt`), never a class or an id.
 *             LIMIT: a label is checked for existing SOMEWHERE in the three trees, so a label drawn in several places
 *             (**Set up file** is in five files) does not fail when one copy is renamed; CITE is the backstop there.
 *   CITE      Every `<!-- src: path:line -->` or `path:first-last` resolves: the path is a file git tracks, and the
 *             lines are inside it, counted as the file's lines, so a file's closing newline is not one more (#3456). Then
 *             the cited lines must still hold what the claim quotes: the claim is the text before the citation on its
 *             line (or, for a citation on a line of its own, the block above it, stepping over one blank line, so a
 *             citation set under a table after a blank line claims the table: #3457), its
 *             ANCHORS are its "quoted strings", `code spans` and **bold labels**, and at least one anchor must appear
 *             in the cited lines, read with their comments removed (in TS/JS, HTML and CSS), so a comment that keeps
 *             the old words cannot hold a claim for code that changed. A quoted string is an example the app composes,
 *             so a number or `…` in it is a placeholder, and it may fill a cited template's holes with sample values.
 *             A claim that quotes nothing is checked by FINGERPRINT instead (below), and the summary line says how
 *             many were.
 *   FINGERPRINT (#3417)  A citation whose claim quotes nothing has no anchor to look for, so before this arm it was
 *             checked for range only: a PR that inserted lines above it left it pointing at other code, and the gate
 *             stayed green while the line number still existed (eleven such on one PR's head). So each one carries
 *             the fingerprint of the block it cites, `<!-- src: path:a-b#1a2b3c4d -->`: the first 8 hex digits of
 *             the SHA-256 of lines a..b as the file holds them, joined by `\n`. The gate hashes the cited lines and
 *             fails by name when they differ, and says where the block now sits when it finds it once elsewhere in
 *             the file. A range-only citation with no fingerprint fails. A quoting citation may carry one too, and
 *             it is checked the same way.
 *             WHY IT IS INDEPENDENT (`docs/34`). The fingerprint is written into the guide once, when someone reads
 *             the cited block and stamps it. The gate compares it with the file as it is now. Neither is derived from
 *             the other at check time, and the line numbers are not the oracle: a shift moves the hashed lines and
 *             changes the hash. `--stamp` writes a fingerprint only where a citation has none and NEVER rewrites one,
 *             because a gate allowed to rewrite what it reads has no memory: when the cited code changes, fix the
 *             numbers by hand, or delete the old fingerprint and stamp again once you have read the block.
 *             LIMIT: a fingerprint proves the cited lines have not changed since they were stamped, not that they
 *             were the right lines then. That judgment is review's, as the migration's content audit was (#3417).
 *   ORDER (#3519)  A claim that lists two or more **bold labels** joined only by commas and "and" (a page's sections,
 *             a dialog's tabs) says what order the code holds them in, and CITE alone cannot see a reorder: every
 *             anchor is still in the range, and a quoting claim carries no fingerprint (#3517 swapped two sections
 *             and the guide's row kept the old order, green). So each label of the list is placed where the cited
 *             lines hold it as a string of its own (`'Grid'`, `>Grid<`), and each must sit after the one before it.
 *             The order is read from the cited code, never from the guide. A list whose last join is "or" names
 *             alternatives and is not checked, whatever its length: the whole run is dropped, not just its last label. LIMIT: a label the lines do not hold as a whole string is not placed, so a list
 *             is held only as far as its labels are placed; the summary line counts the lists with two or more.
 *   SELF-CHECK  Each gap CITE, FINGERPRINT and ORDER once had is planted in a small in-memory tree and run through the
 *             function the guides run through: a citation one line past a file's end (#3456), a table's citation after
 *             a blank line whose cited lines hold none of its quotes (#3457), and a range-only citation whose block a
 *             PR moved down a line (#3417), and a bold list whose cited lines hold every label in another order
 *             (#3519). Each must fail by name, and a CONTROL with the same shapes cited correctly
 *             must pass, so a gate that fails everything cannot satisfy them.
 *   COUNT     "<n> component sets" in a guide equals `componentDefs.length`, read from the engine. At least one guide
 *             makes the claim, so the arm cannot pass by having nothing to check.
 *   SCOPE     Represented, not counted (`docs/34` shape 13): every guide `index.md` lists is read, every guide carries
 *             at least one citation, and each of the three source trees yielded string literals. A moved guides
 *             folder or source tree fails here instead of passing with nothing read (`docs/34` shape 9).
 *
 * WHY THE SCANNER IS ITS OWN. The labels are read with a small tokenizer below rather than by importing the copy
 * objects (`UPDATE_COPY` and the rest): an import would only find labels someone had already put in a copy object,
 * and the guides quote labels from wherever they are drawn. It is deliberately not shared with any other gate.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components';

const TAG = 'lint-guide-claims';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GUIDES = 'docs/public/guides';
const SOURCE_TREES = ['apps/studio/src', 'apps/plugin/src', 'apps/tokenpress/src'] as const;
const LABEL_MIN_STATIC = 3;

const fails: string[] = [];
const fail = (arm: string, msg: string): void => { fails.push(`${arm}: ${msg}`); };

/** Curly apostrophes and quotes read as straight ones, and runs of space as one, on both sides. A leading `↳ ` is
 *  dropped: the guides write a page as Figma shows it, and the code adds the prefix when it names the page
 *  (`file-taxonomy.ts`), so the page's own name is what the source holds. */
const norm = (s: string): string => s.replace(/^↳ /, '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

// ── THE SOURCE'S STRINGS ────────────────────────────────────────────────────────────────────────────

/** One string the source holds: its static chunks (one for a plain literal; a template's parts around each `${…}`),
 *  the file and the line it starts on. */
type Lit = { readonly chunks: readonly string[]; readonly file: string; readonly line: number };

/** `${n === 1 ? '' : 's'}`, and the same with `!== 1` and the branches swapped: a plural suffix. Group 3 is the plural. */
const PLURAL_HOLE = /^\s*[\w.$()[\]]+\s*(?:===\s*1\s*\?\s*(['"])\1\s*:|!==\s*1\s*\?)\s*(['"])(s|es)\2(?:\s*:\s*(['"])\4)?\s*$/;

/** The string literals of a TS/JS file, comments skipped. Template literals keep their static chunks; a nested
 *  template inside `${…}` is read as a literal of its own. Regex literals are skipped where a regex can start. */
const scanScript = (src: string, file: string, out: Lit[], comments?: [number, number][]): void => {
  let i = 0;
  let line = 1;
  const n = src.length;
  let prev = ''; // the last significant character, to tell a regex from a division
  const adv = (k = 1): void => { for (let j = 0; j < k && i < n; j++) { if (src[i] === '\n') line++; i++; } };
  const quoted = (q: string): string => {
    let s = '';
    adv();
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') { s += src[i + 1] === 'n' ? '\n' : src[i + 1] ?? ''; adv(2); continue; }
      if (src[i] === '\n') break; // an unterminated string ends at the line, as the parser would refuse it
      s += src[i]; adv();
    }
    adv();
    return s;
  };
  const template = (): void => {
    const at = line;
    const chunks: string[] = [];
    let cur = '';
    adv();
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { cur += src[i + 1] ?? ''; adv(2); continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        adv(2);
        const from = i;
        code(1);
        // A plural suffix (`item${n === 1 ? '' : 's'}`) is static text, read in its plural form as the guides write
        // it: it is no value hole, so it neither splits a chunk nor counts against a label's placeholders.
        const plural = PLURAL_HOLE.exec(src.slice(from, i - 1));
        if (plural) { cur += plural[3]; continue; }
        chunks.push(cur); cur = '';
        continue;
      }
      cur += src[i]; adv();
    }
    adv();
    chunks.push(cur);
    out.push({ chunks, file, line: at });
  };
  /** Code until the brace depth returns to zero, inside a template's `${…}` (`depth` 1); the top level (`depth` 0)
   *  reads to the end of the file. */
  const code = (depth: number): void => {
    const nested = depth > 0;
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { const at = i; while (i < n && src[i] !== '\n') adv(); comments?.push([at, i]); continue; }
      if (c === '/' && src[i + 1] === '*') { const at = i; adv(2); while (i < n && !(src[i] === '*' && src[i + 1] === '/')) adv(); adv(2); comments?.push([at, i]); continue; }
      if (c === "'" || c === '"') { const at = line; out.push({ chunks: [quoted(c)], file, line: at }); prev = 'a'; continue; }
      if (c === '`') { template(); prev = 'a'; continue; }
      if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev))) {
        adv();
        let cls = false;
        while (i < n && src[i] !== '\n' && (cls || src[i] !== '/')) { if (src[i] === '\\') adv(); else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; adv(); }
        adv();
        while (i < n && /[a-z]/i.test(src[i])) adv();
        prev = 'a';
        continue;
      }
      if (c === '{') depth++;
      if (c === '}') { depth--; if (depth === 0 && nested) { adv(); return; } }
      if (!/\s/.test(c)) prev = c;
      adv();
    }
  };
  code(0);
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', rarr: '→', larr: '←', darr: '↓', uarr: '↑' };
const decode = (s: string): string => s.replace(/&(#\d+|[a-z]+);/gi, (m, e: string) => (e[0] === '#' ? String.fromCodePoint(Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m));

/** The attributes whose values a reader sees or hears. A class, an id or a data attribute is not a label (N1). */
const LABEL_ATTRS = /\s(?:aria-label|title|placeholder|alt)="([^"]+)"/g;

/** An HTML file's text nodes and the values of LABEL_ATTRS; its inline scripts are read as scripts. */
const scanHtml = (src: string, file: string, out: Lit[]): void => {
  const lineAt = (k: number): number => src.slice(0, k).split('\n').length;
  const scripts: [number, number][] = [];
  for (const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const start = (m.index ?? 0) + m[0].indexOf('>') + 1;
    scripts.push([start, start + m[1].length]);
    const lits: Lit[] = [];
    scanScript(m[1], file, lits);
    const base = lineAt(start) - 1;
    for (const l of lits) out.push({ ...l, line: l.line + base });
  }
  const inScript = (k: number): boolean => scripts.some(([a, b]) => k >= a && k < b);
  for (const m of src.matchAll(/>([^<>]+)</g)) {
    const k = (m.index ?? 0) + 1;
    if (!inScript(k) && m[1].trim()) out.push({ chunks: [decode(m[1])], file, line: lineAt(k) });
  }
  for (const m of src.matchAll(LABEL_ATTRS)) if (!inScript(m.index ?? 0)) out.push({ chunks: [decode(m[1])], file, line: lineAt(m.index ?? 0) });
};

const walk = (dir: string): string[] => readdirSync(dir).flatMap((e) => {
  const p = join(dir, e);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const lits: Lit[] = [];
const perTree = new Map<string, number>();
for (const tree of SOURCE_TREES) {
  const abs = join(ROOT, tree);
  let files: string[] = [];
  try { files = walk(abs).filter((f) => /\.(ts|tsx|js|mjs|html)$/.test(f)); } catch { /* reported by SCOPE below */ }
  const before = lits.length;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const rel = relative(ROOT, f);
    if (f.endsWith('.html')) scanHtml(src, rel, lits); else scanScript(src, rel, lits);
  }
  perTree.set(tree, lits.length - before);
}
for (const tree of SOURCE_TREES) if (!perTree.get(tree)) fail('SCOPE', `${tree} yielded no string literals: was it moved? The label arm reads it.`);

// ── MATCHING A LABEL ────────────────────────────────────────────────────────────────────────────────

/** A label's parts: fixed text and placeholders (an italic part, `<…>`, or a bare N). */
const PLACEHOLDER = /\*[^*]+\*|<[^>]+>|\bN\b/g;
/** The fixed text between placeholders, with the punctuation that joins it to them trimmed (`Update file, <n> to add`
 *  reads as "Update file" and "to add"). */
const fixedParts = (label: string): string[] => norm(label).split(PLACEHOLDER).map((s) => s.replace(/^[\s,;:·—]+|[\s,;:·—]+$/g, '')).filter(Boolean);
const placeholders = (label: string): number => label.match(PLACEHOLDER)?.length ?? 0;
const hasPlaceholder = (label: string): boolean => placeholders(label) > 0;
const sample = (label: string): string => norm(label.replace(PLACEHOLDER, '7'));
const reEsc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const templateRe = new Map<Lit, RegExp | null>();
/** A static chunk as `norm` reads text, but untrimmed: the spaces around a `${…}` are part of what it says. */
const normChunk = (s: string): string => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');
/** A template literal as a pattern: its static chunks in order, anything between them. Only the template's own ends
 *  are trimmed, as `norm` trims a plain literal. Null when the static text is too thin to mean anything. */
const patternOf = (l: Lit): RegExp | null => {
  if (templateRe.has(l)) return templateRe.get(l)!;
  const letters = l.chunks.join('').replace(/[^a-z]/gi, '').length;
  const chunks = l.chunks.map(normChunk);
  chunks[0] = chunks[0].replace(/^\s+/, '').replace(/^↳ /, '');
  chunks[chunks.length - 1] = chunks[chunks.length - 1].replace(/\s+$/, '');
  const re = l.chunks.length < 2 || letters < LABEL_MIN_STATIC ? null : new RegExp(`^${chunks.map(reEsc).join('(.*?)')}$`, 's');
  templateRe.set(l, re);
  return re;
};
const plainOf = (l: Lit): string | null => (l.chunks.length === 1 ? norm(l.chunks[0]) : null);

const exact = new Set<string>();
for (const l of lits) { const p = plainOf(l); if (p) exact.add(p); }

/** Whether `label` is a string the given literals hold, whole. A label with no placeholder is a plain literal or
 *  nothing (B1 on #3270: a template's fallback let **Brand settings** pass on `${a} and ${b}`). One with placeholders
 *  matches only a template with the same number of `${…}`. */
const labelIn = (label: string, pool: readonly Lit[], plain: ReadonlySet<string> | null): boolean => {
  const want = norm(label);
  const holes = placeholders(label);
  if (!holes) return plain ? plain.has(want) : pool.some((l) => plainOf(l) === want);
  const s = sample(label);
  return pool.some((l) => { if (l.chunks.length - 1 !== holes) return false; const re = patternOf(l); return re !== null && re.test(s); });
};

// ── THE GUIDES ──────────────────────────────────────────────────────────────────────────────────────

const guideDir = join(ROOT, GUIDES);
let guideFiles: string[] = [];
try { guideFiles = readdirSync(guideDir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort(); } catch { /* SCOPE below */ }
const index = guideFiles.includes('index.md') ? readFileSync(join(guideDir, 'index.md'), 'utf8') : '';
const listed = [...index.matchAll(/^\d+\.\s+\[[^\]]+\]\(([^)#]+\.md)/gm)].map((m) => m[1]);
if (!listed.length) fail('SCOPE', `${GUIDES}/index.md lists no guides: was the folder moved? Every guide it lists is read here.`);
for (const g of listed) if (!guideFiles.includes(g)) fail('SCOPE', `${GUIDES}/index.md lists ${g}, which is not in ${GUIDES}.`);

const tracked = new Set(spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).stdout.split('\n').filter(Boolean));
if (!tracked.size) fail('SCOPE', 'git ls-files returned nothing, so no citation could be checked.');
/** A file's lines, as many as it has (#3456). `split('\n')` gives a file that ends in `\n` one empty element more
 *  than it has lines, and the range check read that as a line, so `provenance.ts:1-58` passed on a 57-line file. */
const linesIn = (src: string): string[] => {
  if (src === '') return [];
  const out = src.split('\n');
  if (src.endsWith('\n')) out.pop();
  return out;
};
/** Each span blanked, its newlines kept, so line numbers still line up. */
const blank = (src: string, spans: readonly [number, number][]): string => {
  let out = '';
  let at = 0;
  for (const [a, b] of [...spans].sort((x, y) => x[0] - y[0])) {
    if (a < at) continue;
    out += src.slice(at, a) + src.slice(a, b).replace(/[^\n]/g, ' ');
    at = b;
  }
  return out + src.slice(at);
};

/** Where CITE reads the cited files: the repo for the guides, or the in-memory tree of the SELF-CHECK fixtures. */
type Tree = { readonly tracked: (p: string) => boolean; readonly read: (p: string) => string };
type Reader = {
  readonly tracked: (p: string) => boolean;
  readonly linesOf: (p: string) => string[];
  readonly codeLinesOf: (p: string) => string[];
  readonly litsOf: (p: string) => Lit[];
};
const readerOf = (tree: Tree): Reader => {
  const fileLines = new Map<string, string[]>();
  const linesOf = (p: string): string[] => {
    if (!fileLines.has(p)) fileLines.set(p, linesIn(tree.read(p)));
    return fileLines.get(p)!;
  };
  /** A file's lines with its comments removed, for CITE (S1 on #3270): a comment on a cited line that keeps the old
   *  words must not hold a claim. TS/JS through the same tokenizer the labels use, so `//` inside a string stays;
   *  HTML's `<!-- -->` and its inline scripts' comments; CSS's block comments. Any other file is read as it is. */
  const codeLines = new Map<string, string[]>();
  /** The literals of every cited file, read in the same pass, so a cited engine file (outside the three trees the
   *  labels read) still offers its templates to an anchor. */
  const citedLits = new Map<string, Lit[]>();
  const codeLinesOf = (p: string): string[] => {
    if (codeLines.has(p)) return codeLines.get(p)!;
    const src = tree.read(p);
    const spans: [number, number][] = [];
    const own: Lit[] = [];
    citedLits.set(p, own);
    if (/\.(ts|tsx|js|mjs|cjs)$/.test(p)) scanScript(src, p, own, spans);
    else if (/\.html?$/.test(p)) {
      scanHtml(src, p, own);
      for (const m of src.matchAll(/<!--[\s\S]*?-->/g)) spans.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
      for (const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
        const start = (m.index ?? 0) + m[0].indexOf('>') + 1;
        const inner: [number, number][] = [];
        scanScript(m[1], p, [], inner);
        for (const [a, b] of inner) spans.push([a + start, b + start]);
      }
    } else if (/\.css$/.test(p)) for (const m of src.matchAll(/\/\*[\s\S]*?\*\//g)) spans.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
    const lines = blank(src, spans).split('\n');
    codeLines.set(p, lines);
    return lines;
  };
  const litsOf = (p: string): Lit[] => { codeLinesOf(p); return citedLits.get(p) ?? []; };
  return { tracked: tree.tracked, linesOf, codeLinesOf, litsOf };
};

const CITE = /<!--\s*src:\s*([^\s:]+(?: [^\s:]+)*):(\d+)(?:-(\d+))?(?:#([0-9a-f]{8}))?\s*-->/g;
/** FINGERPRINT: the first 8 hex digits of the SHA-256 of the cited lines, joined by `\n`, exactly as the file holds them. */
const fingerprint = (lines: readonly string[]): string => createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 8);
const STAMP = process.argv.includes('--stamp');
/** `--stamp`'s edits, by guide: each citation's own text and the text it becomes. */
const stamps = new Map<string, { line: number; from: string; to: string }[]>();
const BOLD = /\*\*((?:[^*\n]|\*(?!\*)[^*\n]+\*)+?)\*\*/g;
/** A claim's anchors: its quoted strings, code spans and bold labels. A quoted string is an example of a message the
 *  app composes at run time, so a number or an ellipsis in it stands for a value (`<n>`, a placeholder): "Built 3
 *  sets" is `Built ${…}`. A code span or a bold label keeps its digits as written. */
const anchorsOf = (claim: string): string[] => {
  const c = claim.replace(/<!--[\s\S]*?-->/g, ' ');
  const out: string[] = [];
  for (const m of c.matchAll(/"([^"\n]{2,})"|“([^”\n]{2,})”/g)) out.push((m[1] ?? m[2]).replace(/…|\b\d+\b/g, '<n>'));
  for (const m of c.matchAll(/`([^`\n]+)`/g)) out.push(m[1]);
  for (const m of c.matchAll(BOLD)) if (!/[.:]$/.test(m[1].trim())) out.push(m[1]);
  return out;
};
/** Whether the cited lines hold the anchor: every fixed part appears in their code, or a literal that starts in them
 *  matches it whole. Unlike a LABEL, a quoted example may fill a template's holes with sample values ("Stop after
 *  Button" is `Stop after ${what}`), so the hole count is not compared here; only templates in the cited lines are
 *  tried, and their static chunks keep their spaces. */
const anchorIn = (anchor: string, text: string, inRange: readonly Lit[]): boolean => {
  const parts = fixedParts(anchor);
  if (parts.length && parts.every((p) => text.includes(p))) return true;
  if (labelIn(anchor, inRange, null)) return true;
  const s = sample(anchor);
  return inRange.some((l) => { const re = patternOf(l); return re !== null && re.test(s); });
};

/** ORDER (#3519): the runs of two or more **bold labels** in a claim joined only by `, `, ` and ` or `, and `. A run
 *  like that reads as the code's order (a page's sections, a dialog's tabs), so it can go stale by a reorder alone,
 *  which every anchor surviving cannot see. A list whose last join is "or" (`, or `, ` or `) names alternatives, not an
 *  order, and is dropped whole, not just its last label (#3542 review: `build-components.md:18`'s statuses). */
const SEQ_SEP = /^(?:,\s*|,?\s+and\s+)$/;
const OR_SEP = /^,?\s+or\s+$/;
const sequencesOf = (claim: string): string[][] => {
  const c = claim.replace(/<!--[\s\S]*?-->/g, ' ');
  const out: string[][] = [];
  let run: string[] = [];
  let alt = false;  // the run's last join was "or"
  const flush = (): void => { if (run.length > 1 && !alt) out.push(run); run = []; alt = false; };
  let end = -1;
  for (const m of c.matchAll(BOLD)) {
    const label = m[1].trim();
    const at = m.index ?? 0;
    const sep = end >= 0 && !/[.:]$/.test(label) ? c.slice(end, at) : null;
    const or = sep !== null && OR_SEP.test(sep);
    if (!(or || (sep !== null && SEQ_SEP.test(sep)))) flush();
    else alt = or;
    if (!/[.:]$/.test(label)) run.push(label);
    end = at + m[0].length;
  }
  flush();
  return out;
};
/** Where the cited lines hold each label of a run as a string of its own (`'Grid'`, `>Grid<`), walked in the claim's
 *  order: each label must sit after the one before it. Returns the first pair found the other way round, or null. A
 *  label the lines do not hold as a whole string is not placed (whether every anchor is held is a different question
 *  from order), and neither is one with a placeholder. This reads the cited code, never the claim, for the order. */
const outOfOrder = (seq: readonly string[], text: string): { placed: number; wrong: [string, string] | null } => {
  let pos = -1;
  let placed = 0;
  let prev: string | null = null;
  for (const label of seq) {
    if (hasPlaceholder(label)) continue;
    const re = new RegExp(`(?<=['"\`>])${reEsc(norm(label))}(?=['"\`<])`, 'g');
    const at = [...text.matchAll(re)].map((m) => m.index ?? 0);
    if (!at.length) continue;
    const next = at.find((i) => i > pos);
    if (next === undefined) return { placed: placed + 1, wrong: [prev!, label] };
    pos = next;
    prev = label;
    placed++;
  }
  return { placed, wrong: null };
};

/** The claim of a citation on a line of its own: the block above it, up to a blank line or a heading. One blank line
 *  between them is stepped over (#3457): a citation set under a table after a blank line cites the table, and read
 *  without the step its claim was empty, so the table's quotes were never held to the cited lines. */
const blockAbove = (lines: readonly string[], k: number): string => {
  let j = k - 1;
  if (j >= 0 && !lines[j].trim()) j--;
  const block: string[] = [];
  for (; j >= 0 && lines[j].trim() && !lines[j].startsWith('#'); j--) block.unshift(lines[j]);
  return block.join('\n');
};

type CiteStats = { cites: number; unanchored: number; fingerprinted: number; ordered: number };
type Fail = (arm: string, msg: string) => void;

/** CITE and FINGERPRINT for the citations on one line of a guide. The guides and the SELF-CHECK fixtures run
 *  through this one function, so a fixture tests the arm the guides are held by, not a copy of it. */
const citeLine = (rel: string, lines: readonly string[], k: number, r: Reader, stats: CiteStats, fail: Fail, stamp: boolean): void => {
  const raw = lines[k];
  const at = `${rel}:${k + 1}`;
  let last = 0;
  let claim = '';
  for (const m of raw.matchAll(CITE)) {
    stats.cites++;
    const [whole, path, a, b, hash] = m;
    const seg = raw.slice(last, m.index).replace(/<!--[\s\S]*?-->/g, ' ');
    last = (m.index ?? 0) + whole.length;
    if (seg.trim()) claim = seg;
    if (!claim.trim()) claim = blockAbove(lines, k);
    const first = Number(a);
    const end = b ? Number(b) : first;
    if (!r.tracked(path)) { fail('CITE', `${at}: ${path} is not a file git tracks.`); continue; }
    const src = r.linesOf(path);
    if (first < 1 || end < first || end > src.length) { fail('CITE', `${at}: ${path}:${a}${b ? `-${b}` : ''} is outside the file (${src.length} lines).`); continue; }
    const anchors = anchorsOf(claim);
    const range = `${path}:${a}${b ? `-${b}` : ''}`;
    if (hash) {
      stats.fingerprinted++;
      const now = fingerprint(src.slice(first - 1, end));
      if (now !== hash) {
        const n = end - first + 1;
        const at2: number[] = [];
        for (let s = 1; s + n - 1 <= src.length && at2.length < 2; s++) if (s !== first && fingerprint(src.slice(s - 1, s - 1 + n)) === hash) at2.push(s);
        const where = at2.length === 1 ? ` The block now sits at ${path}:${at2[0]}${n > 1 ? `-${at2[0] + n - 1}` : ''}: cite that.` : ' The cited code changed: read it, correct the claim if it no longer holds, then re-cite it and delete the fingerprint so --stamp writes a new one.';
        fail('FINGERPRINT', `${at}: ${range}#${hash} now hashes to #${now}, so those lines are not the block this citation was stamped on.${where}`);
      }
    }
    if (!anchors.length) {
      stats.unanchored++;
      if (!hash) {
        if (stamp) {
          const to = whole.replace(/\s*-->$/, `#${fingerprint(src.slice(first - 1, end))} -->`);
          if (!stamps.has(rel)) stamps.set(rel, []);
          stamps.get(rel)!.push({ line: k, from: whole, to });
        } else fail('FINGERPRINT', `${at}: ${range} quotes nothing, so only a fingerprint can tell when its code moves, and it has none. Read the cited lines, then run lint-guide-claims.ts --stamp.`);
      }
      continue;
    }
    const text = norm(r.codeLinesOf(path).slice(first - 1, end).join('\n'));
    const inRange = r.litsOf(path).filter((l) => l.line >= first && l.line <= end);
    if (!anchors.some((x) => anchorIn(x, text, inRange))) fail('CITE', `${at}: ${path}:${a}${b ? `-${b}` : ''} holds none of what the claim quotes (${anchors.map((x) => JSON.stringify(x)).join(', ')}). The code moved: cite where it is now, or correct the claim.`);
    for (const seq of sequencesOf(claim)) {
      const { placed, wrong } = outOfOrder(seq, text);
      if (placed > 1) stats.ordered++;
      if (wrong) fail('ORDER', `${at}: ${range} lists ${seq.map((x) => `**${x}**`).join(', ')}, but the cited lines hold **${wrong[1]}** before **${wrong[0]}**. Write the list in the order the code holds it.`);
    }
  }
};

// ── SELF-CHECK: each gap CITE and FINGERPRINT once had, planted, and the failure that must name it ──────────────
//
// Every fixture runs through `citeLine`, the function the guides run through, over a small in-memory tree. Each gap
// fixture is a case the gate once passed; the CONTROL holds the same four shapes written correctly and must pass,
// so a gate that fails everything cannot satisfy the gap fixtures. The cited files and their fingerprints are
// written here by hand (the hashes by `printf '%s' <line> | sha256sum`), never computed by the gate (`docs/34`).
const FIXTURE_FILES: Record<string, string> = {
  // Two lines, ending in a newline: `split('\n')` reads three elements.
  'fixture/end.ts': 'const a = 1;\nconst b = 2;\n',
  'fixture/tools.ts': "export const tools = ['list_levers'];\n",
  // `figma.on('close', done);` was line 2 when it was stamped (#8ac7ac65); a PR has since inserted line 1.
  'fixture/shift.ts': "// a line a PR inserted above the cited block\nconst x = 1;\nfigma.on('close', done);\n",
  // A page's sections, which a PR reordered from Breakpoints, Grid, Containers (#3517).
  'fixture/order.ts': "const sections = [\n  { title: 'Grid' },\n  { title: 'Breakpoints' },\n  { title: 'Containers' },\n];\n",
  // A lookup map of a set's statuses, whose key order means nothing: a guide that lists them joined by "or" names
  // alternatives, so it is not held to this order (#3542 review).
  'fixture/status.ts': "const label = {\n  due: 'Due',\n  needed: 'Needed',\n  kept: 'Kept edits',\n};\n",
};
const fixtureReader = readerOf({ tracked: (p) => p in FIXTURE_FILES, read: (p) => FIXTURE_FILES[p] });
const FIXTURES: readonly { readonly name: string; readonly gap: string; readonly guide: readonly string[]; readonly want: RegExp | null }[] = [
  {
    name: '3456', gap: 'a citation naming the line after the last one, in a file that ends in a newline',
    guide: ['`const b` is the second line. <!-- src: fixture/end.ts:1-3 -->'],
    want: /^CITE: fixture\/3456\.md:1: fixture\/end\.ts:1-3 is outside the file \(2 lines\)\.$/,
  },
  {
    name: '3457', gap: 'a citation under a table after a blank line, whose cited lines hold none of the table\'s quotes',
    guide: ['| Tool |', '|---|', '| `theme_from_brief` |', '', '<!-- src: fixture/tools.ts:1#4eedf20f -->'],
    want: /^CITE: fixture\/3457\.md:5: fixture\/tools\.ts:1 holds none of what the claim quotes \("theme_from_brief"\)\./,
  },
  {
    name: '3417', gap: 'a range-only citation whose block a PR moved down a line',
    guide: ['The plugin stops when its window closes. <!-- src: fixture/shift.ts:2#8ac7ac65 -->'],
    want: /^FINGERPRINT: fixture\/3417\.md:1: fixture\/shift\.ts:2#8ac7ac65 now hashes to #[0-9a-f]{8}, .* The block now sits at fixture\/shift\.ts:3: cite that\.$/,
  },
  {
    name: '3519', gap: 'a bold list whose cited lines hold every label, in another order',
    guide: ['| **Layout** | **Breakpoints**, **Grid** and **Containers**. <!-- src: fixture/order.ts:2-4 -->'],
    want: /^ORDER: fixture\/3519\.md:1: fixture\/order\.ts:2-4 lists \*\*Breakpoints\*\*, \*\*Grid\*\*, \*\*Containers\*\*, but the cited lines hold \*\*Grid\*\* before \*\*Breakpoints\*\*\./,
  },
  {
    name: 'control', gap: 'the same four shapes, cited correctly, and an "or" list of three in an order its lines do not hold',
    guide: [
      '`const b` is the second line. <!-- src: fixture/end.ts:1-2 -->',
      '',
      '| Tool |', '|---|', '| `list_levers` |',
      '',
      '<!-- src: fixture/tools.ts:1#4eedf20f -->',
      '',
      'The plugin stops when its window closes. <!-- src: fixture/shift.ts:3#8ac7ac65 -->',
      '',
      '| **Layout** | **Grid**, **Breakpoints** and **Containers**. <!-- src: fixture/order.ts:2-4 -->',
      '',
      'A set reads **Needed**, **Due** or **Kept edits**. <!-- src: fixture/status.ts:2-4 -->',
    ],
    want: null,
  },
];
for (const f of FIXTURES) {
  const got: string[] = [];
  const st: CiteStats = { cites: 0, unanchored: 0, fingerprinted: 0, ordered: 0 };
  f.guide.forEach((_, k) => citeLine(`fixture/${f.name}.md`, f.guide, k, fixtureReader, st, (arm, msg) => got.push(`${arm}: ${msg}`), false));
  const seen = got.length ? got.join(' | ') : 'no failure';
  if (f.want && !got.some((g) => f.want!.test(g))) fail('SELF-CHECK', `#${f.name} (${f.gap}) was not named. Expected ${f.want}; got ${seen}.`);
  // The control's table citation must count as quoting (`list_levers`): read as quoting nothing, it is #3457 again.
  // Its list must be placed and checked (`ordered`): a list the arm never placed would pass in any order. Its "or"
  // list must not be (#3542 review): checked, it fails ORDER, as its head did when only its last label was dropped.
  if (!f.want && (got.length || st.cites !== 5 || st.unanchored !== 1 || st.ordered !== 1)) fail('SELF-CHECK', `the control (${f.gap}) must pass with 5 citations, 1 of them quoting nothing and 1 list checked for order; got ${seen}, ${st.cites} citations, ${st.unanchored} quoting nothing, ${st.ordered} lists checked.`);
}

// ── THE GUIDES, through the same arms ───────────────────────────────────────────────────────────────

const repo = readerOf({ tracked: (p) => tracked.has(p), read: (p) => readFileSync(join(ROOT, p), 'utf8') });
const stats: CiteStats = { cites: 0, unanchored: 0, fingerprinted: 0, ordered: 0 };
let labels = 0;
const counts: { file: string; n: number }[] = [];

for (const g of guideFiles) {
  const rel = `${GUIDES}/${g}`;
  const lines = readFileSync(join(guideDir, g), 'utf8').split('\n');
  const before = stats.cites;
  let fence = false;
  lines.forEach((raw, k) => {
    if (raw.startsWith('```')) fence = !fence;
    if (fence) return;
    const at = `${rel}:${k + 1}`;
    const prose = raw.replace(/<!--[\s\S]*?-->/g, ' ');

    // LABEL
    for (const m of prose.matchAll(BOLD)) {
      const label = m[1].trim();
      if (/[.:]$/.test(label)) continue;
      labels++;
      if (!labelIn(label, lits, exact)) fail('LABEL', `${at}: **${label}** is not a string in ${SOURCE_TREES.join(', ')}. Rename it in the guide to what the app draws, or unbold it if it is not a label.`);
    }

    // COUNT
    for (const m of prose.matchAll(/\b(\d+) component sets\b/g)) counts.push({ file: at, n: Number(m[1]) });

    // CITE, FINGERPRINT
    citeLine(rel, lines, k, repo, stats, fail, STAMP);
  });
  if (listed.includes(g) && stats.cites === before) fail('SCOPE', `${rel} carries no src citation, so nothing in it is checked against the code.`);
}

// --stamp: each citation's text replaced on its own line, in order, so two identical citations on one line each get
// their own. Nothing else in the guide moves.
if (STAMP) {
  let n = 0;
  for (const [rel, edits] of stamps) {
    const lines = readFileSync(join(ROOT, rel), 'utf8').split('\n');
    for (const e of edits) {
      const i = lines[e.line].indexOf(e.from);
      if (i < 0 || !e.to.includes('#')) throw new Error(`${TAG} --stamp: ${rel}:${e.line + 1} lost its citation mid-run`);
      lines[e.line] = lines[e.line].slice(0, i) + e.to + lines[e.line].slice(i + e.from.length);
      n++;
    }
    writeFileSync(join(ROOT, rel), lines.join('\n'));
  }
  console.log(`${TAG} --stamp: fingerprinted ${n} range-only citation(s) in ${stamps.size} guide(s). Each fingerprint is a claim that you have read its block: review the diff.`);
}

// COUNT
const defs = componentDefs.length;
if (!stats.ordered) fail('SCOPE', 'no guide lists two or more bold labels the ORDER arm could place in their cited lines, so it checked nothing.');
if (!counts.length) fail('COUNT', `no guide says how many component sets the engine defines, so this arm checked nothing (componentDefs holds ${defs}).`);
for (const c of counts) if (c.n !== defs) fail('COUNT', `${c.file}: says ${c.n} component sets; componentDefs holds ${defs}.`);

if (fails.length) {
  console.error(`❌ ${TAG}: ${fails.length} failure${fails.length === 1 ? '' : 's'}\n${fails.map((f) => `  ✗ ${f}`).join('\n')}`);
  process.exit(1);
}
console.log(`✅ ${TAG}: ${guideFiles.length} guides; ${labels} bold labels, each a string in the app source (${SOURCE_TREES.map((t) => `${t} ${perTree.get(t)}`).join(', ')} literals); ${stats.cites} citations resolve, ${stats.cites - stats.unanchored} of them still holding what their claim quotes (${stats.unanchored} quote nothing and are held by their fingerprint; ${stats.fingerprinted} fingerprints match; ${stats.ordered} bold lists in the order their cited lines hold them; ${FIXTURES.length - 1} planted gaps named and the control clean); ${counts.length} component-set counts equal componentDefs (${defs}).`);
