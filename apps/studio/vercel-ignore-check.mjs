/**
 * Gate for `apps/studio/vercel-ignore.sh` (#474 follow-on).
 *
 * That script skips the Vercel build when a commit touches no file the deployed bundle depends on.
 * Its exclusion list — the engine files the bundle does NOT import — is the one part that can rot:
 * the day someone imports `ai-metadata.ts` into `apps/studio/src`, that file becomes a real bundle input
 * while still sitting on the skip list, and every change to it would quietly ship nothing. The site
 * would go stale with all gates green, which is the exact failure #474 cost a rebuild to diagnose.
 *
 * So the list is not trusted, it is CHECKED: esbuild reports the bundle's true inputs via its
 * metafile, and this asserts the intersection with the exclusion list is empty. The list is read
 * out of the shell script itself rather than duplicated here — two copies of a list is just a
 * slower way to have a stale one.
 *
 * Run: `node apps/studio/vercel-ignore-check.mjs`   (exits non-zero on drift; wired into CI)
 */
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(root, 'vercel-ignore.sh');

// The single source of truth is the shell array, parsed between its delimiters.
const sh = readFileSync(SCRIPT, 'utf8');
const block = /# --- begin excluded[\s\S]*?EXCLUDED=\(([\s\S]*?)\)\n/.exec(sh);
if (!block) {
  console.error('✗ could not find the EXCLUDED=( ... ) block in apps/studio/vercel-ignore.sh — did its shape change?');
  process.exit(1);
}
const excluded = new Set(block[1].split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));

const res = await build({
  entryPoints: [resolve(root, 'src/main.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  metafile: true,
  logLevel: 'silent',
  define: { PRISM3_HOST: "'web'", PRISM3_BUILD: "'check'" },
});

const bundled = new Set(
  Object.keys(res.metafile.inputs)
    .filter((p) => p.includes('Prism3/engine/'))
    .map((p) => basename(p)),
);

const leaked = [...bundled].filter((f) => excluded.has(f)).sort();

console.log(`Vercel ignore gate — ${bundled.size} engine files in the bundle, ${excluded.size} on the skip list.`);
if (leaked.length) {
  console.error(`\n✗ ${leaked.length} file(s) are BOTH bundled and excluded — changes to them would skip the deploy and ship nothing:`);
  for (const f of leaked) console.error(`    Prism3/engine/${f}`);
  console.error('\n  Remove them from EXCLUDED in apps/studio/vercel-ignore.sh.');
  process.exit(1);
}
console.log('  ✓ no bundled engine file is on the skip list.');
