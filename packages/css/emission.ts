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

// ------------------------------------------------------------------------------------------------ emitted bindings
// Q142 A (#3506, #3839): `specs.json` carries each component's corner, stroke, focus ring and motion bindings. These
// read them, and refuse anything that would make one CSS value a guess (a binding that differs where the CSS has one rule).

/**
 * The one token a redline key binds on one part, across every row a filter keeps. Throws when the rows bind more than
 * one, because the CSS writes the value once, on the part's base rule.
 */
export const uniformRedline = (spec: any, part: string, key: string, keep: (where: Record<string, string>) => boolean = () => true): string => {
  const seen = new Set<string>();
  for (const row of spec.redlines) {
    if (!keep(row.where)) continue;
    const val = row.parts.find((p: any) => p.part === part)?.values?.[key];
    if (val === undefined) continue;
    if (!val.token) throw new Error(`${spec.id} ${part}.${key}: ${JSON.stringify(val)} is not a token`);
    seen.add(val.token);
  }
  if (seen.size !== 1) throw new Error(`${spec.id} ${part}.${key}: ${seen.size ? `binds ${[...seen].join(', ')} across its rows, not one token` : 'no row binds it'}`);
  return [...seen][0];
};

/** The shared focus ring's own line style: every host's `focusRing` row names it, and they must agree. */
export const ringStyle = (specs: Record<string, any>): string => {
  const styles = new Set(Object.values(specs).flatMap((s: any) => (s.focusRing ?? []).map((r: any) => r.style)));
  if (styles.size !== 1) throw new Error(`the focus ring's style is ${styles.size ? [...styles].join(', ') : 'in no focusRing row'}, not one token`);
  return [...styles][0];
};

/** One of a component's motion bindings by its key in the def (`specs.json`'s `motion`). */
export const motionBinding = (spec: any, key: string): string => {
  const t = spec.motion?.[key];
  if (!t) throw new Error(`${spec.id} has no motion binding "${key}" in the emission`);
  return t;
};
