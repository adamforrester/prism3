/**
 * Prism3 engine — THE DESIGNER GUIDES STILL DESCRIBE THE APP (#3264, owner decision 3 A).
 *
 *   npx tsx packages/engine/lint-guide-claims.ts
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
 *             lines are inside it. Then the cited lines must still hold what the claim quotes: the claim is the text
 *             before the citation on its line (or, for a citation on a line of its own, the block above it), its
 *             ANCHORS are its "quoted strings", `code spans` and **bold labels**, and at least one anchor must appear
 *             in the cited lines, read with their comments removed (in TS/JS, HTML and CSS), so a comment that keeps
 *             the old words cannot hold a claim for code that changed. A quoted string is an example the app composes,
 *             so a number or `…` in it is a placeholder, and it may fill a cited template's holes with sample values.
 *             A claim that quotes nothing is checked for existence and range only, and the summary line says how
 *             many were.
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
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
const fileLines = new Map<string, string[]>();
const linesOf = (p: string): string[] => {
  if (!fileLines.has(p)) fileLines.set(p, readFileSync(join(ROOT, p), 'utf8').split('\n'));
  return fileLines.get(p)!;
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
/** A file's lines with its comments removed, for CITE (S1 on #3270): a comment on a cited line that keeps the old
 *  words must not hold a claim. TS/JS through the same tokenizer the labels use, so `//` inside a string stays;
 *  HTML's `<!-- -->` and its inline scripts' comments; CSS's block comments. Any other file is read as it is. */
const codeLines = new Map<string, string[]>();
/** The literals of every cited file, read in the same pass, so a cited engine file (outside the three trees the
 *  labels read) still offers its templates to an anchor. */
const citedLits = new Map<string, Lit[]>();
const codeLinesOf = (p: string): string[] => {
  if (codeLines.has(p)) return codeLines.get(p)!;
  const src = readFileSync(join(ROOT, p), 'utf8');
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

const CITE = /<!--\s*src:\s*([^\s:]+(?: [^\s:]+)*):(\d+)(?:-(\d+))?\s*-->/g;
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

let labels = 0;
let cites = 0;
let unanchored = 0;
const counts: { file: string; n: number }[] = [];

for (const g of guideFiles) {
  const rel = `${GUIDES}/${g}`;
  const lines = readFileSync(join(guideDir, g), 'utf8').split('\n');
  let guideCites = 0;
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

    // CITE
    let last = 0;
    let claim = '';
    for (const m of raw.matchAll(CITE)) {
      cites++; guideCites++;
      const [whole, path, a, b] = m;
      const seg = raw.slice(last, m.index).replace(/<!--[\s\S]*?-->/g, ' ');
      last = (m.index ?? 0) + whole.length;
      if (seg.trim()) claim = seg;
      if (!claim.trim()) {
        // A citation on a line of its own: the block above it.
        const block: string[] = [];
        for (let j = k - 1; j >= 0 && lines[j].trim() && !lines[j].startsWith('#'); j--) block.unshift(lines[j]);
        claim = block.join('\n');
      }
      const first = Number(a);
      const end = b ? Number(b) : first;
      if (!tracked.has(path)) { fail('CITE', `${at}: ${path} is not a file git tracks.`); continue; }
      const src = linesOf(path);
      if (first < 1 || end < first || end > src.length) { fail('CITE', `${at}: ${path}:${a}${b ? `-${b}` : ''} is outside the file (${src.length} lines).`); continue; }
      const anchors = anchorsOf(claim);
      if (!anchors.length) { unanchored++; continue; }
      const text = norm(codeLinesOf(path).slice(first - 1, end).join('\n'));
      const inRange = (citedLits.get(path) ?? []).filter((l) => l.line >= first && l.line <= end);
      if (!anchors.some((x) => anchorIn(x, text, inRange))) fail('CITE', `${at}: ${path}:${a}${b ? `-${b}` : ''} holds none of what the claim quotes (${anchors.map((x) => JSON.stringify(x)).join(', ')}). The code moved: cite where it is now, or correct the claim.`);
    }
  });
  if (listed.includes(g) && !guideCites) fail('SCOPE', `${rel} carries no src citation, so nothing in it is checked against the code.`);
}

// COUNT
const defs = componentDefs.length;
if (!counts.length) fail('COUNT', `no guide says how many component sets the engine defines, so this arm checked nothing (componentDefs holds ${defs}).`);
for (const c of counts) if (c.n !== defs) fail('COUNT', `${c.file}: says ${c.n} component sets; componentDefs holds ${defs}.`);

if (fails.length) {
  console.error(`❌ ${TAG}: ${fails.length} failure${fails.length === 1 ? '' : 's'}\n${fails.map((f) => `  ✗ ${f}`).join('\n')}`);
  process.exit(1);
}
console.log(`✅ ${TAG}: ${guideFiles.length} guides; ${labels} bold labels, each a string in the app source (${SOURCE_TREES.map((t) => `${t} ${perTree.get(t)}`).join(', ')} literals); ${cites} citations resolve, ${cites - unanchored} of them still holding what their claim quotes (${unanchored} quote nothing and are checked for range only); ${counts.length} component-set counts equal componentDefs (${defs}).`);
