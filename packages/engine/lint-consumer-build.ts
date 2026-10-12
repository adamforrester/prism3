/**
 * Prism3 engine — THE CONSUMER SET CARRIES NO BUILD METADATA (#2552, owner decision Q250 A).
 *
 *   npx tsx packages/engine/lint-consumer-build.ts
 *
 * The conforming projection — `out/<brand>.base.tokens.json` plus one `out/<brand>.<mode>.overlay.tokens.json` per
 * mode (#609) — is what a client is handed, and since #2552 it carries nothing of ours. Before, every token held
 * `$extensions.prism3` (provenance, contrast, binding data) and each base file held the generator stamp and the
 * internal `decisions` log; DTCG §5.2.3 says a tool MUST preserve what it does not understand, so all of it would
 * travel into a client's pipeline. `lint-tool-neutral-prose.ts` (#2411) keeps consumer PROSE free of tool names but
 * never looked at `$extensions`. This gate holds the consumer files to the one shape the owner decided. The
 * single-file `<brand>.tokens.json` is NOT a consumer file — it keeps every non-default mode inside `$extensions`,
 * because DTCG has no modes — so it is out of scope here and stays internal.
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────
 *
 *   EXTENSIONS   No key named `$extensions` anywhere in any consumer file, at any depth.
 *   EXTRA-KEY    A token (an object carrying `$value`) has no key but `$value`, `$type` and
 *                `$description`. A group has no `$`-prefixed key at all, the root included.
 *   TOOL-NAME    No string value and no key in any consumer file names a design or delivery tool, or the
 *                product itself. The whole file, not chosen fields: a consumer file holds nothing a client
 *                is not meant to read.
 *   EQUALS       Each consumer file is, byte for byte, what THIS file derives from the committed CANONICAL tree:
 *                the base is every token of a DTCG type, with its `$type`, `$value` and `$description`, empty
 *                groups pruned; a mode's overlay is every such token whose `modes.<mode>` value or description
 *                differs from the default, carrying that mode's value and description. Serialized as the engine
 *                serializes (2-space indent, trailing newline). So nothing moved but the metadata: no value, no
 *                description, no order.
 *   ALIAS        Every `{…}` reference in every consumer file names a token its brand's BASE defines, an overlay
 *                defines no token its base lacks, and each brand's set holds at least one reference (a check
 *                over none passes vacuously).
 *   SCOPE        Every brand with a canonical tree has its whole set: a base, and one overlay per mode its
 *                canonical tree declares; and the totals clear the floors below (`docs/34` shapes 9, 13, 15).
 *
 * ── INDEPENDENCE (`docs/34`) ────────────────────────────────────────────────────────────────────
 *
 * The word list, the allowed keys, the DTCG type list, the derivation and the serialization are TYPED here and
 * import nothing from the engine, so `emit-dtcg-overlay.ts` could change what it writes and this file would not
 * move with it (shape 2). EQUALS compares the committed projection against a DIFFERENT committed artifact, the
 * canonical tree that `tree.ts` writes and the projector only reads; it never calls the projector (shape 1). The
 * brand list and each brand's modes are discovered from the canonical trees, never from the projection, so a
 * missing overlay cannot remove itself from the scope. A self-check feeds each matcher known-bad and known-good
 * input before the real scan (shape 9).
 *
 * Stated limits: a tool not on the list is not seen. EQUALS re-derives the projection's RULE (#609, #642, #1623)
 * from the canonical tree; whether the canonical tree's values are right is every other gate's question.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const TAG = 'lint-consumer-build';

// TYPED, never imported (see the header). The same names #2411 keeps out of consumer prose.
const TOOL_WORDS: readonly string[] = [
  'Figma', 'FigJam', 'Dev\\s+Mode', 'Code\\s+Connect', 'Style\\s+Dictionary', 'Tokens\\s+Studio', 'TokenPress',
  'Penpot', 'Sketch', 'Plugin\\s+API', 'plugins?', 'exporters?', 'MCP',
  'Prism\\s?3',
];
const TOOL_PHRASES: readonly string[] = ['engine-generated'];
const TOOL_RE = new RegExp(`\\b(?:${TOOL_WORDS.join('|')})\\b|${TOOL_PHRASES.join('|')}`, 'i');
const TOKEN_KEYS: ReadonlySet<string> = new Set(['$value', '$type', '$description']);
/** The types the DTCG spec defines (typed from the spec, not imported; see `emit-dtcg-overlay.ts` #642 for why a
 *  leaf of any other type is absent from the projection). */
const DTCG_TYPES: ReadonlySet<string> = new Set(['color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number',
  'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography']);
/** Floors on what was read (measured on the commit that added this gate, then set below it). */
const FLOOR = { brands: 5, files: 20, tokens: 6500, strings: 30000, refs: 6000 };

const problems: string[] = [];
const fail = (s: string) => problems.push(s);
const clip = (s: string) => (s.length > 120 ? `${s.slice(0, 120)}…` : s);

const toolNameIn = (text: string): string | undefined => TOOL_RE.exec(text)?.[0];
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** The leaf as a consumer reads it, in the canonical key order: `$type`, `$value`, `$description` where present. */
const pick = (leaf: Record<string, unknown>, value: unknown, description: unknown): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(leaf)) {
    if (k === '$value') out.$value = value;
    else if (k === '$description') out.$description = description;
    else if (k === '$type') out.$type = leaf.$type;
  }
  return out;
};
/** This gate's own derivation of one consumer file from the canonical tree. `mode` undefined is the base. */
const derive = (canonical: unknown, mode?: string): unknown => {
  const walk = (n: unknown): unknown => {
    if (!isObj(n)) return undefined;
    if ('$value' in n) {
      if (typeof n.$type !== 'string' || !DTCG_TYPES.has(n.$type)) return undefined;
      if (mode === undefined) return pick(n, n.$value, n.$description);
      const m = ((n.$extensions as any)?.prism3?.modes ?? {})[mode];
      if (!isObj(m)) return undefined;
      const desc = typeof m.description === 'string' ? m.description : n.$description;
      if (JSON.stringify(m.$value) === JSON.stringify(n.$value) && desc === n.$description) return undefined;
      return pick(n, m.$value, desc);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(n)) {
      if (k.startsWith('$')) continue;
      const c = walk(v);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).length ? out : undefined;
  };
  return walk(canonical) ?? {};
};
/** Every mode the canonical tree declares on any leaf. */
const modesOf = (canonical: unknown): string[] => {
  const found = new Set<string>();
  const walk = (n: unknown): void => {
    if (!isObj(n)) return;
    if ('$value' in n) { for (const m of Object.keys((n.$extensions as any)?.prism3?.modes ?? {})) found.add(m); return; }
    for (const [k, v] of Object.entries(n)) if (!k.startsWith('$')) walk(v);
  };
  walk(canonical);
  return [...found].sort();
};
const serialize = (v: unknown): string => JSON.stringify(v, null, 2) + '\n';

/** The shape arms over one parsed file. Returns the problems found, so the self-check can call it too. */
type Read = { tokens: number; strings: number; refs: string[]; paths: Set<string> };
const shapeDefects = (file: string, tree: unknown, read: Read): string[] => {
  const out: string[] = [];
  const scan = (text: string, at: string, what: string) => {
    read.strings++;
    const w = toolNameIn(text);
    if (w) out.push(`TOOL-NAME ${file} ${at}: "${w}" in ${what} "${clip(text)}"`);
  };
  const walkValue = (v: unknown, at: string): void => {
    if (typeof v === 'string') {
      scan(v, at, 'a value');
      for (const m of v.matchAll(/\{([^{}]+)\}/g)) read.refs.push(m[1]);
    } else if (Array.isArray(v)) v.forEach((x, i) => walkValue(x, `${at}[${i}]`));
    else if (isObj(v)) for (const [k, x] of Object.entries(v)) {
      if (k === '$extensions') out.push(`EXTENSIONS ${file} ${at}.${k}`);
      scan(k, `${at}.${k}`, 'a key');
      walkValue(x, `${at}.${k}`);
    }
  };
  const walk = (node: unknown, path: string): void => {
    if (!isObj(node)) { out.push(`EXTRA-KEY ${file} ${path || '(root)'}: a ${Array.isArray(node) ? 'list' : typeof node} where a group or token belongs`); return; }
    if ('$value' in node) {
      read.tokens++;
      read.paths.add(path);
      for (const [k, v] of Object.entries(node)) {
        if (k === '$extensions') out.push(`EXTENSIONS ${file} ${path}.$extensions`);
        else if (!TOKEN_KEYS.has(k)) out.push(`EXTRA-KEY ${file} ${path}: the token carries "${k}" — only $value, $type and $description travel`);
        if (k === '$value') walkValue(v, `${path}.$value`);
        else if (typeof v === 'string') scan(v, `${path}.${k}`, k);
        else walkValue(v, `${path}.${k}`);
      }
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      const at = path ? `${path}.${k}` : k;
      if (k === '$extensions') { out.push(`EXTENSIONS ${file} ${at}`); continue; }
      if (k.startsWith('$')) { out.push(`EXTRA-KEY ${file} ${at}: a group carries "${k}" — a group carries no $-key`); continue; }
      scan(k, at, 'a key');
      walk(v, at);
    }
  };
  walk(tree, '');
  return out;
};

// ── self-check (docs/34 shape 9): each arm fires on the leak it exists for, and stays quiet on clean input ──
{
  const fresh = (): Read => ({ tokens: 0, strings: 0, refs: [], paths: new Set() });
  const clean = { r: { a: { $type: 'color', $value: '#fff', $description: 'Page background' }, b: { $type: 'color', $value: '{r.a}', $description: 'Ink on a fill' } } };
  const mustFire: Array<[string, unknown, string]> = [
    ['a token $extensions', { r: { a: { $type: 'color', $value: '#fff', $extensions: { x: { y: 1 } } } } }, 'EXTENSIONS'],
    ['a root $extensions', { r: { a: { $type: 'color', $value: '#fff' } }, $extensions: { generator: {} } }, 'EXTENSIONS'],
    ['an extra token key', { r: { a: { $type: 'color', $value: '#fff', $deprecated: true } } }, 'EXTRA-KEY'],
    ['a group $-key', { r: { $type: 'color', a: { $value: '#fff' } } }, 'EXTRA-KEY'],
    ['a tool name in a description', { r: { a: { $type: 'color', $value: '#fff', $description: 'Bound in Figma' } } }, 'TOOL-NAME'],
    ['the product name in a value', { r: { a: { $type: 'fontFamily', $value: ['Prism3 Sans'] } } }, 'TOOL-NAME'],
    ['a tool name in a key', { r: { figma: { $type: 'color', $value: '#fff' } } }, 'TOOL-NAME'],
  ];
  for (const [what, tree, arm] of mustFire) {
    const d = shapeDefects('self-check', tree, fresh());
    if (!d.some((x) => x.startsWith(arm))) fail(`SELF-CHECK ${arm} missed ${what}`);
  }
  const quiet = shapeDefects('self-check', clean, fresh());
  if (quiet.length) fail(`SELF-CHECK fired on a clean file: ${quiet[0]}`);
  const canon = { r: {
    a: { $type: 'color', $value: '#fff', $description: 'Light', $extensions: { prism3: { modes: { dark: { $value: '#000', description: 'Dark' } } } } },
    b: { $type: 'color', $value: '#111', $description: 'Same', $extensions: { prism3: { modes: { dark: { $value: '#111' } } } } },
    s: { $type: 'spring', $value: { stiffness: 1 } } } };
  if (serialize(derive(canon)) !== serialize({ r: { a: { $type: 'color', $value: '#fff', $description: 'Light' }, b: { $type: 'color', $value: '#111', $description: 'Same' } } })) fail('SELF-CHECK the base derivation is wrong');
  if (serialize(derive(canon, 'dark')) !== serialize({ r: { a: { $type: 'color', $value: '#000', $description: 'Dark' } } })) fail('SELF-CHECK the overlay derivation is wrong');
}

// ── the scan ────────────────────────────────────────────────────────────────────────────────────
const brands = readdirSync(OUT).filter((f) => /^[a-z0-9-]+\.tokens\.json$/.test(f)).map((f) => f.replace('.tokens.json', '')).sort();
if (brands.length < FLOOR.brands) fail(`SCOPE out/: ${brands.length} brand tree(s), floor ${FLOOR.brands}`);
const totals = { files: 0, tokens: 0, strings: 0, refs: 0 };

for (const b of brands) {
  const canonical = JSON.parse(readFileSync(join(OUT, `${b}.tokens.json`), 'utf8'));
  const modes = modesOf(canonical);
  if (modes.length === 0) fail(`SCOPE ${b}: the canonical tree declares no mode — nothing to hold an overlay against`);
  const files: Array<[string, string | undefined]> = [[`${b}.base.tokens.json`, undefined], ...modes.map((m): [string, string] => [`${b}.${m}.overlay.tokens.json`, m])];
  let basePaths: Set<string> | undefined;
  let brandRefs = 0;
  for (const [f, mode] of files) {
    const path = join(OUT, f);
    if (!existsSync(path)) { fail(`SCOPE out/${f}: missing — every brand ships its base and one overlay per mode`); continue; }
    const text = readFileSync(path, 'utf8');
    const tree = JSON.parse(text);
    const read: Read = { tokens: 0, strings: 0, refs: [], paths: new Set() };
    for (const d of shapeDefects(f, tree, read)) fail(d);
    totals.files++; totals.tokens += read.tokens; totals.strings += read.strings; totals.refs += read.refs.length;
    brandRefs += read.refs.length;
    if (read.tokens === 0) fail(`SCOPE ${f}: 0 tokens read`);

    const want = serialize(derive(canonical, mode));
    if (text !== want) {
      const x = text.split('\n'), y = want.split('\n');
      const i = x.findIndex((l, k) => l !== y[k]);
      fail(`EQUALS ${f}: differs from its derivation from ${b}.tokens.json — first at line ${i + 1}: ${JSON.stringify(clip(x[i] ?? ''))} vs ${JSON.stringify(clip(y[i] ?? ''))}`);
    }

    if (mode === undefined) basePaths = read.paths;
    else if (basePaths) for (const p of read.paths) if (!basePaths.has(p)) fail(`ALIAS ${f} ${p}: an overlay token the base does not define`);
    if (basePaths) for (const r of read.refs) if (!basePaths.has(r)) fail(`ALIAS ${f}: {${r}} resolves to nothing in ${b}.base.tokens.json`);
  }
  if (brandRefs === 0) fail(`ALIAS ${b}: no references found to resolve — the arm ran on nothing`);
}

if (totals.files < FLOOR.files) fail(`SCOPE consumer files: ${totals.files} read, floor ${FLOOR.files}`);
if (totals.tokens < FLOOR.tokens) fail(`SCOPE tokens: ${totals.tokens} read, floor ${FLOOR.tokens}`);
if (totals.strings < FLOOR.strings) fail(`SCOPE strings: ${totals.strings} scanned, floor ${FLOOR.strings}`);
if (totals.refs < FLOOR.refs) fail(`SCOPE references: ${totals.refs} resolved, floor ${FLOOR.refs}`);

if (problems.length) {
  console.error(`✗ ${TAG} — ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 60)) console.error(`  ${p}`);
  if (problems.length > 60) console.error(`  … and ${problems.length - 60} more`);
  console.error('  A consumer file (base or overlay) carries no $extensions: a token keeps $value, $type and $description, and no file names a tool (#2552). Fix the projector (`emit-dtcg-overlay.ts`), then run regen.');
  process.exit(1);
}
console.log(`✓ ${TAG} — clean: ${brands.length} brands, ${totals.files} consumer files, ${totals.tokens} tokens; 0 $extensions, 0 extra keys, 0 tool names in ${totals.strings} strings; every file equals its derivation from the canonical tree; ${totals.refs} references resolve against their base (self-check ok).`);
