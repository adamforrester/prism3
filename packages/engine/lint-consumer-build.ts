/**
 * Prism3 engine — THE CONSUMER SET CARRIES NO BUILD METADATA (#2552, owner decision Q250 A).
 *
 *   npx tsx packages/engine/lint-consumer-build.ts
 *
 * `out/consumer/` is what a client is handed: per brand, the base and one overlay per mode, as DTCG with
 * nothing of ours in it. `lint-tool-neutral-prose.ts` (#2411) keeps consumer PROSE free of tool names but
 * never looked at `$extensions`, and every token in the projected base still carried `$extensions.prism3`
 * (provenance, contrast, binding data) while each base file carried the generator stamp and the internal
 * `decisions` log. DTCG §5.2.3 says a tool MUST preserve what it does not understand, so all of that would
 * travel into a client's pipeline. This gate holds the consumer files to the one shape the owner decided.
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────
 *
 *   EXTENSIONS   No key named `$extensions` anywhere in any consumer file, at any depth.
 *   EXTRA-KEY    A token (an object carrying `$value`) has no key but `$value`, `$type` and
 *                `$description`. A group has no `$`-prefixed key at all, the root included.
 *   TOOL-NAME    No string value and no key in any consumer file names a design or delivery tool, or the
 *                product itself. The whole file, not chosen fields: a consumer file holds nothing a client
 *                is not meant to read.
 *   EQUALS       Each consumer file is, byte for byte, its committed projection (`out/<brand>.base…`,
 *                `out/<brand>.<mode>.overlay…`) with every `$extensions` deleted, by THIS file's own strip
 *                and serialized as the engine serializes (2-space indent, trailing newline). So nothing
 *                else moved: no value, no description, no order.
 *   ALIAS        Every `{…}` reference in every consumer file names a token its brand's consumer BASE
 *                defines, and each brand's set holds at least one reference (a check over none passes
 *                vacuously).
 *   SCOPE        Every brand with a canonical tree has its whole set: a base, and one overlay for each
 *                committed overlay; nothing else sits in `out/consumer/`; and the totals clear the floors
 *                below (`docs/34` shapes 9, 13 and 15).
 *
 * ── INDEPENDENCE (`docs/34`) ────────────────────────────────────────────────────────────────────
 *
 * The word list, the three allowed keys, the strip and the serialization are TYPED here and import
 * nothing from the engine, so `emit-dtcg-consumer.ts` could change what it removes and this file would
 * not move with it (shape 2). EQUALS compares the committed consumer file against a DIFFERENT committed
 * artifact, the projection, which `regen --check`, `check:consumability` and the overlay gates already
 * hold on their own terms; it never calls the emitter under test (shape 1). The brand list is discovered
 * from the canonical trees and the expected overlays from the committed projection, never from
 * `out/consumer/` itself, so a missing consumer file cannot remove itself from the scope. A self-check
 * feeds each matcher known-bad and known-good input before the real scan (shape 9).
 *
 * Stated limits: a tool not on the list is not seen. EQUALS proves the consumer set is the projection
 * minus `$extensions`; whether the projection itself is right is the overlay gates' question.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const CONSUMER = join(OUT, 'consumer');
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
/** Floors on what was read (measured on the commit that added this gate, then set below it). */
const FLOOR = { brands: 5, files: 20, tokens: 6500, strings: 30000, refs: 6000 };

const problems: string[] = [];
const fail = (s: string) => problems.push(s);
const clip = (s: string) => (s.length > 120 ? `${s.slice(0, 120)}…` : s);

const toolNameIn = (text: string): string | undefined => TOOL_RE.exec(text)?.[0];
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** This gate's own strip: every `$extensions` key removed, at any depth, key order otherwise kept. */
const strip = (n: unknown): unknown => {
  if (Array.isArray(n)) return n.map(strip);
  if (!isObj(n)) return n;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(n)) if (k !== '$extensions') out[k] = strip(v);
  return out;
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
  if (serialize(strip({ a: 1, $extensions: { b: 2 }, c: [{ $extensions: 1, d: 2 }] })) !== serialize({ a: 1, c: [{ d: 2 }] })) fail('SELF-CHECK the strip left an $extensions behind');
}

// ── the scan ────────────────────────────────────────────────────────────────────────────────────
const brands = readdirSync(OUT).filter((f) => /^[a-z0-9-]+\.tokens\.json$/.test(f)).map((f) => f.replace('.tokens.json', '')).sort();
if (brands.length < FLOOR.brands) fail(`SCOPE out/: ${brands.length} brand tree(s), floor ${FLOOR.brands}`);
const totals = { files: 0, tokens: 0, strings: 0, refs: 0 };
const expected = new Set<string>();

for (const b of brands) {
  const modes = readdirSync(OUT).filter((f) => f.startsWith(`${b}.`) && f.endsWith('.overlay.tokens.json')).map((f) => f.slice(b.length + 1, -'.overlay.tokens.json'.length)).sort();
  if (modes.length === 0) fail(`SCOPE ${b}: no committed overlay to hold a consumer overlay against`);
  const files = [`${b}.base.tokens.json`, ...modes.map((m) => `${b}.${m}.overlay.tokens.json`)];
  let basePaths: Set<string> | undefined;
  let brandRefs = 0;
  for (const f of files) {
    expected.add(f);
    const path = join(CONSUMER, f);
    const projected = join(OUT, f);
    if (!existsSync(path)) { fail(`SCOPE out/consumer/${f}: missing — every brand ships its base and one overlay per mode`); continue; }
    if (!existsSync(projected)) { fail(`SCOPE out/${f}: missing — nothing to hold the consumer file against`); continue; }
    const text = readFileSync(path, 'utf8');
    const tree = JSON.parse(text);
    const read: Read = { tokens: 0, strings: 0, refs: [], paths: new Set() };
    for (const d of shapeDefects(`consumer/${f}`, tree, read)) fail(d);
    totals.files++; totals.tokens += read.tokens; totals.strings += read.strings; totals.refs += read.refs.length;
    brandRefs += read.refs.length;
    if (read.tokens === 0) fail(`SCOPE consumer/${f}: 0 tokens read`);

    const want = serialize(strip(JSON.parse(readFileSync(projected, 'utf8'))));
    if (text !== want) {
      const x = text.split('\n'), y = want.split('\n');
      const i = x.findIndex((l, k) => l !== y[k]);
      fail(`EQUALS consumer/${f}: differs from out/${f} with $extensions removed — first at line ${i + 1}: ${JSON.stringify(clip(x[i] ?? ''))} vs ${JSON.stringify(clip(y[i] ?? ''))}`);
    }

    if (f.endsWith('.base.tokens.json')) basePaths = read.paths;
    else if (basePaths) for (const p of read.paths) if (!basePaths.has(p)) fail(`ALIAS consumer/${f} ${p}: an overlay token the base does not define`);
    if (basePaths) for (const r of read.refs) if (!basePaths.has(r)) fail(`ALIAS consumer/${f}: {${r}} resolves to nothing in consumer/${b}.base.tokens.json`);
  }
  if (brandRefs === 0) fail(`ALIAS ${b}: no references found to resolve — the arm ran on nothing`);
}

const present = existsSync(CONSUMER) ? readdirSync(CONSUMER).sort() : [];
for (const f of present) if (!expected.has(f)) fail(`SCOPE out/consumer/${f}: a file no brand's projection accounts for`);

if (totals.files < FLOOR.files) fail(`SCOPE consumer files: ${totals.files} read, floor ${FLOOR.files}`);
if (totals.tokens < FLOOR.tokens) fail(`SCOPE tokens: ${totals.tokens} read, floor ${FLOOR.tokens}`);
if (totals.strings < FLOOR.strings) fail(`SCOPE strings: ${totals.strings} scanned, floor ${FLOOR.strings}`);
if (totals.refs < FLOOR.refs) fail(`SCOPE references: ${totals.refs} resolved, floor ${FLOOR.refs}`);

if (problems.length) {
  console.error(`✗ ${TAG} — ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 60)) console.error(`  ${p}`);
  if (problems.length > 60) console.error(`  … and ${problems.length - 60} more`);
  console.error('  A consumer file is the projection with every $extensions removed: a token keeps $value, $type and $description, and no file names a tool (#2552). Fix the emitter (`emit-dtcg-consumer.ts`), then run regen.');
  process.exit(1);
}
console.log(`✓ ${TAG} — clean: ${brands.length} brands, ${totals.files} consumer files, ${totals.tokens} tokens; 0 $extensions, 0 extra keys, 0 tool names in ${totals.strings} strings; every file equals its projection minus $extensions; ${totals.refs} references resolve against their base (self-check ok).`);
