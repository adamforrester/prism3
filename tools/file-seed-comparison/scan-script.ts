/**
 * The external rows' read-only capture (#2075 part 2): a `use_figma` script that runs part 1's OWN scan
 * (`scanOpenFile`, apps/plugin/src/file-facts-figma.ts, bundled with the engine's `file-facts.ts`) inside the open
 * file and returns the facts report, plus the join that reassembles it. Running the shipped scan rather than a
 * hand-written serializer keeps the external rows on the exact code the plugin carries.
 *
 *   npx tsx tools/file-seed-comparison/scan-script.ts print <chunk>         # the script for chunk <chunk> (0, 1, …)
 *   npx tsx tools/file-seed-comparison/scan-script.ts join <dir> --out <report.json>
 *
 * WHY CHUNKS. A report can run to a megabyte and one `use_figma` result cannot. Each call scans the whole file (the
 * scan is deterministic, so every call produces the same bytes) and returns one 40,000-character slice, with the
 * chunk count, the full length and an FNV-1a hash of the whole text. `join` reads `<dir>/chunk-<n>.json` for every
 * chunk, checks they agree on length and hash, concatenates, and refuses (exit 1) when the result does not hash to
 * the stated value: a half-captured report is worse than none.
 *
 * READ-ONLY. The scan loads pages and reads; part 1's plugin suite runs it under a write-logging shim and fails on
 * any write. The script adds nothing that writes: it holds the report in a local and returns a slice.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
export const CHUNK = 40000;
export const CHUNK_FORMAT = 'prism3-file-facts-chunk/1';

/** FNV-1a over UTF-16 code units, as hex: the same function in the script and in `join`. */
export const fnv = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
};

export const scanScript = async (chunk: number): Promise<string> => {
  const out = await build({
    stdin: { contents: `export { scanOpenFile as run } from './src/file-facts-figma';`, resolveDir: join(repo, 'apps/plugin'), loader: 'ts' },
    bundle: true, minify: true, format: 'iife', globalName: '__p3', platform: 'neutral', target: 'es2020',
    mainFields: ['module', 'main'], write: false, legalComments: 'none',
  });
  return [
    `const __I=${chunk},__N=${CHUNK};`,
    out.outputFiles[0].text.trim(),
    `const __fnv=${fnv.toString()};`,
    'const __r=JSON.stringify(await __p3.run(figma));',
    `return {format:${JSON.stringify(CHUNK_FORMAT)},chunk:__I,chunks:Math.ceil(__r.length/__N),length:__r.length,fnv:__fnv(__r),text:__r.slice(__I*__N,(__I+1)*__N)};`,
  ].join('\n');
};

type Chunk = { format: string; chunk: number; chunks: number; length: number; fnv: string; text: string };
export const joinChunks = (chunks: Chunk[]): { text: string } | { error: string } => {
  if (!chunks.length) return { error: 'no chunks' };
  const [first] = chunks;
  if (chunks.some((c) => c.format !== CHUNK_FORMAT)) return { error: `a chunk is not ${CHUNK_FORMAT}` };
  if (chunks.some((c) => c.chunks !== first.chunks || c.length !== first.length || c.fnv !== first.fnv)) return { error: 'the chunks disagree on count, length or hash: the file changed between calls' };
  const byIndex = new Map(chunks.map((c) => [c.chunk, c.text]));
  const missing = Array.from({ length: first.chunks }, (_, i) => i).filter((i) => !byIndex.has(i));
  if (missing.length) return { error: `missing chunk(s) ${missing.join(', ')} of ${first.chunks}` };
  const text = Array.from({ length: first.chunks }, (_, i) => byIndex.get(i)!).join('');
  if (text.length !== first.length || fnv(text) !== first.fnv) return { error: 'the joined report does not match its stated length and hash' };
  return { text };
};

/**
 * The author's self-check (not a CI step): run the printed script for every chunk against a host built from the
 * prism2 export (`snapshots.ts`), join the chunks, and compare with the engine scanning the same snapshot directly.
 * Then drop one chunk and corrupt another, and expect `join` to refuse each by name.
 */
const selftest = async (): Promise<void> => {
  const { snapshotFromExport } = await import('./snapshots');
  const { scanFileFacts, sourceFromSnapshot } = await import('../../packages/engine/file-facts');
  const snap = snapshotFromExport(join(repo, 'reference/Prism2/tokens/raw-figma'));
  const src = sourceFromSnapshot(snap);
  const host = {
    variables: {
      getLocalVariableCollectionsAsync: async () => snap.collections, getLocalVariablesAsync: async () => snap.variables,
      getVariableByIdAsync: src.variableById, getVariableCollectionByIdAsync: src.collectionById,
    },
    getLocalPaintStylesAsync: async () => snap.styles.paint, getLocalTextStylesAsync: async () => snap.styles.text,
    getLocalEffectStylesAsync: async () => snap.styles.effect, getLocalGridStylesAsync: async () => snap.styles.grid,
    getStyleByIdAsync: src.styleById, root: { children: snap.pages },
  };
  const AsyncFn = Object.getPrototypeOf(async () => {}).constructor;
  const run = async (i: number): Promise<Chunk> => new AsyncFn('figma', await scanScript(i))(host);
  const first = await run(0);
  const chunks = [first, ...(await Promise.all(Array.from({ length: first.chunks - 1 }, (_, i) => run(i + 1))))];
  const joined = joinChunks(chunks);
  const direct = JSON.stringify(await scanFileFacts(src));
  const results = [
    ['joined report equals the direct scan', 'text' in joined && joined.text === direct],
    ['more than one chunk was exercised', first.chunks > 1],
    ['a missing chunk is refused', 'error' in joinChunks(chunks.slice(1)) && /missing chunk/.test((joinChunks(chunks.slice(1)) as { error: string }).error)],
    ['a corrupted chunk is refused', 'error' in joinChunks(chunks.map((c, i) => (i === 1 ? { ...c, text: `${c.text.slice(0, -1)}x` } : c)))],
  ] as const;
  for (const [label, ok] of results) console.log(`${ok ? '✓' : '✗'} ${label}`);
  console.log(`script: ${(await scanScript(0)).length} characters; report: ${first.length} characters in ${first.chunks} chunk(s)`);
  if (results.some(([, ok]) => !ok)) process.exit(1);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, a, ...rest] = process.argv.slice(2);
  if (cmd === 'print' && /^\d+$/.test(a ?? '')) process.stdout.write(`${await scanScript(Number(a))}\n`);
  else if (cmd === 'selftest') await selftest();
  else if (cmd === 'join' && a && rest[0] === '--out' && rest[1]) {
    const chunks = readdirSync(a).filter((f) => /^chunk-\d+\.json$/.test(f)).map((f) => JSON.parse(readFileSync(join(a, f), 'utf8')) as Chunk);
    const r = joinChunks(chunks);
    if ('error' in r) { console.error(`join refused: ${r.error}`); process.exit(1); }
    writeFileSync(rest[1], `${JSON.stringify(JSON.parse(r.text), null, 2)}\n`);
    console.log(`wrote ${rest[1]} (${chunks.length} chunk(s), ${r.text.length} characters, fnv ${fnv(r.text)})`);
  } else {
    console.error('usage: scan-script.ts print <chunk> | join <dir> --out <report.json> | selftest');
    process.exit(2);
  }
}
