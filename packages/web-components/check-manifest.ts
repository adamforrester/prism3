/**
 * `custom-elements.json` is what `@custom-elements-manifest/analyzer` writes from the committed elements (`p3-button.js`, and the
 * fields since S4 for the fields) (#3408 S4). Runs the analyzer into a temp dir and compares, so a hand edit to the manifest, or an element regenerated
 * without its manifest, fails by name. Regenerate both with `npm run -w @prism3/web-components generate`.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// The analyzer joins --outdir onto its cwd, so it is given the temp dir relative to this folder.
const dir = mkdtempSync(resolve(tmpdir(), 'prism3-cem-'));
try {
  const r = spawnSync('npx', ['cem', 'analyze', '--outdir', relative(HERE, dir)], { cwd: HERE, encoding: 'utf8' });
  if (r.status !== 0) { console.error(`FAIL manifest: the analyzer exited ${r.status}: ${(r.stderr || r.stdout).trim()}`); process.exit(1); }
  const fresh = readFileSync(resolve(dir, 'custom-elements.json'), 'utf8');
  const committed = readFileSync(resolve(HERE, 'custom-elements.json'), 'utf8');
  if (fresh !== committed) { console.error('FAIL manifest: custom-elements.json is not what the analyzer writes from the p3-*.js elements. Run: npm run -w @prism3/web-components generate'); process.exit(1); }
  console.log('OK manifest: custom-elements.json matches the analyzer\'s reading of the p3-*.js elements');
} finally { rmSync(dir, { recursive: true, force: true }); }
