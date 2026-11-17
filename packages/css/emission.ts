/**
 * The three component exports this package reads, generated fresh, never read from `out/`.
 *
 * Since #3698 R3 the engine no longer commits `out/components/specs.json`, `component-defs.json` or
 * `component-defs.specs.json` (`UNCOMMITTED_OUT` in `packages/engine/regen.ts`): CI's checkout holds no copy, and a
 * local copy may be stale. So the generator and the parity check run the step regen runs,
 * `emit-component-docs.ts --uncommitted --out <dir>`, as a process into a temp dir, the same way
 * `packages/tokens/check-specs.mjs` does. Running it as a process keeps the parity check's EXPECTED an emitted file,
 * not an engine import (docs/34). The temp dir is removed when the process exits.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
let dir: string | undefined;

/** Reads one uncommitted component export by its name under `out/components/` (e.g. `specs.json`). */
export const readUncommitted = (name: 'specs.json' | 'component-defs.json' | 'component-defs.specs.json') => {
  if (!dir) {
    const d = mkdtempSync(resolve(tmpdir(), 'prism3-css-emission-'));
    process.on('exit', () => rmSync(d, { recursive: true, force: true }));
    const r = spawnSync('npx', ['tsx', resolve(HERE, '../engine/emit-component-docs.ts'), '--uncommitted', '--out', d], { cwd: resolve(HERE, '../..'), encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(`FAIL emission: emit-component-docs.ts --uncommitted exited ${r.status}: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' / ')}`);
      process.exit(1);
    }
    dir = d;
  }
  return JSON.parse(readFileSync(resolve(dir, 'components', name), 'utf8'));
};
