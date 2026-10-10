/**
 * Prism3 engine — CONSUMER PROSE NAMES NO TOOL (#2411, owner decision Q167; closes #2422).
 *
 *   npx tsx packages/engine/lint-tool-neutral-prose.ts
 *
 * DTCG §5.2.1 says any tool MAY show a token's `$description` — a style-guide generator, an IDE tooltip,
 * a design tool, a comment in translated code. Measured: Style Dictionary 5.5.0, the version the
 * consumability gate pins, writes `$description` as the comment above every generated variable. So a
 * sentence naming one tool lands in every consumer's CSS, Swift and Kotlin. And `$extensions` data
 * travels everywhere too (§5.2.3: tools MUST preserve what they do not understand), so a free-text note
 * under our key is copied into every pipeline, stale or not. The #2411 audits measured both: tool names
 * in the grid descriptions, the strikethrough guidance, the defaulted-hue ramps, six decisions and about
 * twenty component strings; 1,794 `figma.note` strings per tree set, one carrying a roadmap claim; and a
 * gradient `a11y.note` that was simply FALSE (#2422).
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────
 *
 *   TOOL-NAME        No consumer-prose field names a design or delivery tool, or the product itself
 *                    (owner Q167 calls 4 and 5: platform names such as iOS, Safari or HTML stay allowed;
 *                    "Prism3" does not). Consumer prose is, by PATH:
 *                      · every DTCG file (full, base, each overlay): every `$description`, token or
 *                        group; `$extensions.prism3.modes.<mode>.description`; the root `decisions[]`
 *                        (owner Q167 call 6);
 *                      · every `<brand>.ai.json`: `$description`, `meaning`, `when_to_use`, `avoid_when`,
 *                        `intent`, `consume`, `requirement`, and the file `note`;
 *                      · `components/components.ai.json`: the file `note`, and every string under each
 *                        component's `summary`, `description`, `props[].description`, `docs`,
 *                        `accessibility`, `ai`, `content` and `motion`;
 *                      · every `components/<id>.md` page, whole.
 *   NOTE-KEY         No key named `note` anywhere under any `$extensions` in any DTCG file (owner Q167
 *                    call 1). Structural, so no wording can slip past it: every fact a note held is now a
 *                    field, or was dropped.
 *   GRADIENT-CLEARS  Each gradient's `a11y.clears.<ink>` is TRUE exactly when that ink's worst contrast
 *                    over the gradient clears `a11y.floor`, recomputed HERE from the sampled stops — and
 *                    the floor is the WCAG 1.4.3 body-text 4.5, typed here. This is #2422's arm: the note it
 *                    replaces tested min(white, black), so it said "neither clears" whenever either side
 *                    failed, while white measured 5.36:1. Read in every DTCG tree that carries the token and
 *                    in each `out/figma/<brand>/gradient-styles.json` copy.
 *   UNREPRESENTED    Every promised surface was READ, not merely scanned: each brand has all five DTCG
 *                    files, each listed field yields at least one value in each file it is promised in,
 *                    every component has its page, and the totals clear the floors below (`docs/34`
 *                    shapes 9, 13 and 15). A field renamed in an emitter therefore fails here, by name,
 *                    rather than silently leaving the scope.
 *
 * ── INDEPENDENCE (`docs/34`) ────────────────────────────────────────────────────────────────────
 *
 * The word list, the field paths and the 4.5 floor are TYPED in this file and import nothing from the
 * engine — the emitters could change every string they write and this file would not move with them
 * (shape 2). The gate reads the COMMITTED `out/` files, never an emitter's return value. The contrast
 * arm recomputes luminance from the stop colors with its own WCAG formula and never reads `worstOnWhite`
 * or `worstOnBlack`, which are the emitter's own report of the same fact (shape 1). A self-check feeds
 * the matcher known-bad strings and the measured false-positive traps before the real scan (shape 9).
 *
 * ── EXEMPT BY PATH, NEVER BY WORD ───────────────────────────────────────────────────────────────
 *
 * A field whose audience IS the named tool says so in its key, so it is out of scope by construction:
 * `$extensions.prism3.figma.*`, `responsive.figma.*`, everything in `out/figma/**` (its descriptions have
 * their own gate, `lint-figma-descriptions.ts`), `$extensions.prism3.css`, `responsive.web`,
 * `$extensions.generator.*`, and the `.ai.json` surface-keyed `modifiers.*` (owner Q167 call 3: a
 * per-surface instruction under a key named for the surface). Those keys are simply never read by the
 * TOOL-NAME arm; nothing is allow-listed by word. One textual carve-out, stated rather than hidden: a
 * FILE NAME (`<brand>.tokens.json`) is removed before matching, because the `.ai.json` file note names its
 * companion tree and one example brand's id is the product's own name.
 *
 * ── THE WORD LIST, AND ITS TRAPS ────────────────────────────────────────────────────────────────
 *
 * Whole-word, case-insensitive; a multi-word name matches across any run of whitespace. Traps measured
 * by the #2411 audits and kept OFF the list: bare "Compose" (the verb, 93 hits in `consume`), "Chrome"
 * ("field chrome"), "variable" ("variable font"), "web" and "engine" (too ambiguous). The audits' one
 * engine-specific leak, the defaulted-hue ramp's "engine-generated", is pinned as a phrase instead.
 *
 * Stated limits: a tool not on the list is not seen; a FACT about one surface, written without the tool's
 * name, is not seen either. The contrast recompute uses the emitted sampled stops, the same samples the
 * engine measured, so it proves the verdict matches the measurement, not that five samples are enough.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const TAG = 'lint-tool-neutral-prose';

// TYPED, never imported (see the header). Each entry is a regex SOURCE matched whole-word.
const TOOL_WORDS: readonly string[] = [
  'Figma', 'FigJam', 'Dev\\s+Mode', 'Code\\s+Connect', 'Style\\s+Dictionary', 'Tokens\\s+Studio', 'TokenPress',
  'Penpot', 'Sketch', 'Plugin\\s+API', 'plugins?', 'exporters?', 'MCP',
  'Prism\\s?3',                      // owner Q167 call 5 — the product does not name itself in a client's files
];
const TOOL_PHRASES: readonly string[] = ['engine-generated'];
const TOOL_RE = new RegExp(`\\b(?:${TOOL_WORDS.join('|')})\\b|${TOOL_PHRASES.join('|')}`, 'i');
const FILE_NAME_RE = /[\w.-]+\.json\b/g;
/** WCAG 1.4.3 body text. Typed here; the emitter's own constant is not read. */
const BODY_TEXT_FLOOR = 4.5;
/** Floors on what was read (measured on the commit that added this gate, then set below it). */
const FLOOR = { brands: 5, dtcgStrings: 10000, aiStrings: 12000, componentStrings: 1000, pages: 24, gradients: 4 };

const problems: string[] = [];
const fail = (s: string) => problems.push(s);

const toolNameIn = (text: string): string | undefined => TOOL_RE.exec(text.replace(FILE_NAME_RE, ''))?.[0];

// ── self-check (docs/34 shape 9): the matcher fires on known-bad text and stays quiet on the traps ──
{
  const mustFire = ['a strikethrough override on the style in Figma.', 'built by the Style  Dictionary exporter',
    'Prism3 has none', 'the Plugin API only', 'danger status, engine-generated red ramp', 'see the MCP tool'];
  const mustPass = ['Compose the label beside the field.', 'the field chrome', 'a variable font', 'on the web',
    'Companion to prism3.tokens.json.', 'iOS Safari zooms a field under 16px', 'a `<del>` in HTML'];
  for (const s of mustFire) if (!toolNameIn(s)) fail(`SELF-CHECK the matcher missed a tool name in "${s}"`);
  for (const s of mustPass) { const w = toolNameIn(s); if (w) fail(`SELF-CHECK the matcher fired on "${w}" in allowed text "${s}"`); }
}

const readJson = (path: string): any => JSON.parse(readFileSync(path, 'utf8'));
const counts = { dtcg: 0, ai: 0, component: 0, pages: 0, gradients: 0, figmaGradients: 0 };

// ── the DTCG trees ────────────────────────────────────────────────────────────────────────────
const brands = readdirSync(OUT).filter((f) => /^[a-z0-9-]+\.tokens\.json$/.test(f)).map((f) => f.replace('.tokens.json', '')).sort();
if (brands.length < FLOOR.brands) fail(`UNREPRESENTED out/: ${brands.length} brand tree(s), floor ${FLOOR.brands}`);
const KINDS = ['tokens', 'base.tokens', 'dark.overlay.tokens', 'hc-light.overlay.tokens', 'hc-dark.overlay.tokens'] as const;

type Seen = Record<string, number>;
const relLum = (r: number, g: number, b: number): number => {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (l1: number, l2: number) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
const hexRgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!m) throw new Error(`not a hex color: ${hex}`);
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
};
/** The worst ratio of white and of black text over a set of stop colors (0–1 sRGB channels). */
const worstOver = (stops: [number, number, number][]) => ({
  white: Math.min(...stops.map(([r, g, b]) => ratio(relLum(r, g, b), 1))),
  black: Math.min(...stops.map(([r, g, b]) => ratio(relLum(r, g, b), 0))),
});
const checkClears = (where: string, a11y: any, worst: { white: number; black: number }) => {
  if (!a11y || typeof a11y !== 'object') { fail(`GRADIENT-CLEARS ${where}: no a11y block`); return; }
  if (a11y.floor !== BODY_TEXT_FLOOR) fail(`GRADIENT-CLEARS ${where}: a11y.floor is ${JSON.stringify(a11y.floor)}, not the body-text ${BODY_TEXT_FLOOR}`);
  for (const ink of ['white', 'black'] as const) {
    const want = worst[ink] >= BODY_TEXT_FLOOR;
    const got = a11y.clears?.[ink];
    if (got !== want) fail(`GRADIENT-CLEARS ${where} ${ink}: measured ${worst[ink].toFixed(2)}:1 against the ${BODY_TEXT_FLOOR} floor, so clears.${ink} must be ${want}, but it is ${JSON.stringify(got)}`);
  }
};

for (const b of brands) {
  for (const kind of KINDS) {
    const file = `${b}.${kind}.json`;
    const path = join(OUT, file);
    if (!existsSync(path)) { fail(`UNREPRESENTED out/${file}: missing — every brand ships all five DTCG files`); continue; }
    const tree = readJson(path);
    const seen: Seen = { $description: 0, 'modes.*.description': 0, 'decisions[]': 0 };
    const scan = (text: unknown, at: string, field: string) => {
      if (typeof text !== 'string') return;
      seen[field]++; counts.dtcg++;
      const w = toolNameIn(text);
      if (w) fail(`TOOL-NAME ${file} ${at}: "${w}" in "${text.length > 140 ? `${text.slice(0, 140)}…` : text}"`);
    };
    const walk = (node: any, path: string, inExt: boolean): void => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach((x, i) => walk(x, `${path}[${i}]`, inExt)); return; }
      for (const [k, v] of Object.entries(node)) {
        const at = path ? `${path}.${k}` : k;
        if (inExt && k === 'note') fail(`NOTE-KEY ${file} ${at}: a free-text note under $extensions`);
        if (k === '$description') scan(v, at, '$description');
        walk(v, at, inExt || k === '$extensions');
      }
      // Consumer prose inside our own extension, by path: per-mode descriptions and the decision record.
      const p3 = node.$extensions?.prism3;
      if (p3?.modes && typeof p3.modes === 'object') {
        for (const [m, mv] of Object.entries(p3.modes)) scan((mv as any)?.description, `${path}.$extensions.prism3.modes.${m}.description`, 'modes.*.description');
      }
      if (Array.isArray(p3?.decisions)) p3.decisions.forEach((d: unknown, i: number) => scan(d, `${path || '(root)'}.$extensions.prism3.decisions[${i}]`, 'decisions[]'));
      if (node.$type === 'gradient' && p3) {
        counts.gradients += kind === 'tokens' ? 1 : 0;
        const sampled = p3.figma?.sampledStops;
        if (!Array.isArray(sampled) || sampled.length === 0) fail(`GRADIENT-CLEARS ${file} ${path}: no sampled stops to measure`);
        else checkClears(`${file} ${path}`, p3.a11y, worstOver(sampled.map((s: any) => hexRgb(String(s.hex)))));
      }
    };
    walk(tree, '', false);
    // What each file kind promises (measured on the commit that added this gate).
    const promised = kind === 'tokens' ? ['$description', 'modes.*.description', 'decisions[]']
      : kind === 'base.tokens' ? ['$description', 'decisions[]'] : ['$description'];
    for (const f of promised) if (seen[f] === 0) fail(`UNREPRESENTED ${file} ${f}: 0 values read`);
  }

  // ── the agent sidecar ──
  const aiFile = `${b}.ai.json`;
  const aiPath = join(OUT, aiFile);
  if (!existsSync(aiPath)) { fail(`UNREPRESENTED out/${aiFile}: missing`); continue; }
  const AI_FIELDS = ['$description', 'meaning', 'when_to_use', 'avoid_when', 'intent', 'consume', 'requirement'] as const;
  const aiSeen: Seen = Object.fromEntries([...AI_FIELDS, 'note'].map((f) => [f, 0]));
  const ai = readJson(aiPath);
  const aiScan = (text: string, at: string, field: string) => {
    aiSeen[field]++; counts.ai++;
    const w = toolNameIn(text);
    if (w) fail(`TOOL-NAME ${aiFile} ${at}: "${w}" in "${text.length > 140 ? `${text.slice(0, 140)}…` : text}"`);
  };
  if (typeof ai.note === 'string') aiScan(ai.note, 'note', 'note');
  const aiWalk = (node: any, path: string): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((x, i) => aiWalk(x, `${path}[${i}]`)); return; }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'modifiers') continue;                 // surface-keyed by design (owner Q167 call 3) — exempt by path
      const at = path ? `${path}.${k}` : k;
      if (typeof v === 'string' && (AI_FIELDS as readonly string[]).includes(k)) aiScan(v, at, k);
      else aiWalk(v, at);
    }
  };
  for (const [k, v] of Object.entries(ai)) if (k !== 'note' && !k.startsWith('$')) aiWalk(v, k);
  for (const f of Object.keys(aiSeen)) if (aiSeen[f] === 0) fail(`UNREPRESENTED ${aiFile} ${f}: 0 values read`);
}

// ── the Figma gradient copies (#2422 spread there through emit-figma-styles) ──
for (const b of brands) {
  const path = join(OUT, 'figma', b, 'gradient-styles.json');
  if (!existsSync(path)) continue;                     // a brand with no committed Figma output (one has none)
  for (const s of readJson(path).styles ?? []) {
    counts.figmaGradients++;
    const where = `figma/${b}/gradient-styles.json ${s.name}`;
    if (s.a11y && 'note' in s.a11y) fail(`NOTE-KEY ${where}: a11y.note — a free-text note`);
    const stops = (s.sampledStops ?? []).map((x: any) => [x.color.r, x.color.g, x.color.b] as [number, number, number]);
    if (stops.length === 0) fail(`GRADIENT-CLEARS ${where}: no sampled stops to measure`);
    else checkClears(where, s.a11y, worstOver(stops));
  }
}

// ── the component documentation ──────────────────────────────────────────────────────────────
{
  const file = 'components/components.ai.json';
  const docs = readJson(join(OUT, file));
  const COMPONENT_FIELDS = ['summary', 'description', 'props[].description', 'docs', 'accessibility', 'ai', 'content', 'motion'] as const;
  const seen: Seen = Object.fromEntries([...COMPONENT_FIELDS, 'note'].map((f) => [f, 0]));
  const scan = (text: unknown, at: string, field: string): void => {
    if (typeof text === 'string') {
      seen[field]++; counts.component++;
      const w = toolNameIn(text);
      if (w) fail(`TOOL-NAME ${file} ${at}: "${w}" in "${text.length > 140 ? `${text.slice(0, 140)}…` : text}"`);
    } else if (Array.isArray(text)) text.forEach((x, i) => scan(x, `${at}[${i}]`, field));
    else if (text && typeof text === 'object') for (const [k, v] of Object.entries(text)) scan(v, `${at}.${k}`, field);
  };
  scan(docs.note, 'note', 'note');
  const ids = Object.keys(docs.components ?? {});
  for (const id of ids) {
    const c = docs.components[id];
    for (const f of ['summary', 'description', 'docs', 'accessibility', 'ai', 'content', 'motion'] as const) scan(c[f], `${id}.${f}`, f);
    (c.props ?? []).forEach((p: any, i: number) => scan(p?.description, `${id}.props[${i}].description`, 'props[].description'));
    const page = join(OUT, 'components', `${id}.md`);
    if (!existsSync(page)) { fail(`UNREPRESENTED components/${id}.md: missing`); continue; }
    counts.pages++;
    readFileSync(page, 'utf8').split('\n').forEach((line, i) => {
      const w = toolNameIn(line);
      if (w) fail(`TOOL-NAME components/${id}.md:${i + 1}: "${w}" in "${line.length > 140 ? `${line.slice(0, 140)}…` : line}"`);
    });
  }
  for (const f of Object.keys(seen)) if (seen[f] === 0) fail(`UNREPRESENTED ${file} ${f}: 0 values read`);
}

// ── floors ──
if (counts.dtcg < FLOOR.dtcgStrings) fail(`UNREPRESENTED DTCG prose: ${counts.dtcg} string(s) read, floor ${FLOOR.dtcgStrings}`);
if (counts.ai < FLOOR.aiStrings) fail(`UNREPRESENTED .ai.json prose: ${counts.ai} string(s) read, floor ${FLOOR.aiStrings}`);
if (counts.component < FLOOR.componentStrings) fail(`UNREPRESENTED component prose: ${counts.component} string(s) read, floor ${FLOOR.componentStrings}`);
if (counts.pages < FLOOR.pages) fail(`UNREPRESENTED component pages: ${counts.pages}, floor ${FLOOR.pages}`);
if (counts.gradients < FLOOR.gradients) fail(`UNREPRESENTED gradients: ${counts.gradients} in the full trees, floor ${FLOOR.gradients} — the GRADIENT-CLEARS arm would measure nothing`);

if (problems.length) {
  console.error(`✗ ${TAG} — ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  console.error('  Consumer prose says what a thing is for and names no tool (#2411). A per-surface instruction goes in a field keyed by its surface; a Figma-only mechanic goes in structured `figma` data or in a def\'s maintainer-only `notes.projection`.');
  process.exit(1);
}
console.log(`✓ ${TAG} — clean: ${brands.length} brands × 5 DTCG files (${counts.dtcg} prose strings), ${counts.ai} .ai.json strings, ${counts.component} component strings + ${counts.pages} pages; 0 tool names, 0 $extensions notes; ${counts.gradients} gradients (+ ${counts.figmaGradients} Figma copies) whose per-ink verdict matches the recomputed worst case (self-check ok).`);
