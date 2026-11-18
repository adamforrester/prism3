/**
 * The leave-page prompt and the confirm's downloads (#3982; owner decision Q-WS1 A, 2026-11-18).
 *
 *   npx tsx apps/studio/test-leave-guard.ts
 *
 * `src/state/leave-guard.ts` holds whether the `beforeunload` listener is on; `main.ts` syncs it from the replace
 * confirm's own rule (`needsOverwriteConfirm`). This drives the guard against a recorder in place of `window`, then
 * runs the rule over the store's real states (an example loaded, an edit, a reset), so the arms read what the browser
 * would be told at each step. The wiring in `main.ts` is held in the browser (`test:smoke` §5 E, `test:chrome`); this
 * file also reads it from the source, so a sync on a different rule fails here by name.
 *
 * INDEPENDENT (docs/34): the expected listener calls and armed states are typed below, never read from the guard.
 *
 * Mutations that fail here by name (each after a `wip:` commit):
 *   · `sync` adds on every call (no `dirty === on` return) → `#3982 arming twice adds one listener`;
 *   · `askBeforeLeaving` without `preventDefault` → `#3982 the armed listener cancels the leave`.
 */
import { readFileSync } from 'node:fs';
import { type BrandInput, EXAMPLE_BRANDS_JSON as exampleBrands } from '@prism3/engine';
import { askBeforeLeaving, leaveGuard, SAVE_FIRST } from './src/state/leave-guard';
import * as store from './src/state/store';
import { needsOverwriteConfirm } from './src/provenance';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ── the guard against a recorder ────────────────────────────────────────────────────────────────────
const calls: string[] = [];
const fns = new Set<unknown>();
const target = {
  addEventListener: (type: string, fn: unknown) => { calls.push(`add ${type}`); fns.add(fn); },
  removeEventListener: (type: string, fn: unknown) => { calls.push(`remove ${type}`); fns.delete(fn); },
};
const g = leaveGuard(target);
g.sync(false);
ok(calls.length === 0 && !g.armed(), `#3982 a clean brand adds no listener (${JSON.stringify(calls)})`);
g.sync(true);
g.sync(true);
ok(JSON.stringify(calls) === JSON.stringify(['add beforeunload']) && g.armed(), `#3982 arming twice adds one listener (${JSON.stringify(calls)})`);
g.sync(false);
ok(JSON.stringify(calls) === JSON.stringify(['add beforeunload', 'remove beforeunload']) && !g.armed() && fns.size === 0,
  `#3982 disarming removes the same listener it added (${JSON.stringify(calls)}; ${fns.size} left)`);

const ev = { prevented: false, returnValue: 'unset', preventDefault() { this.prevented = true; } };
askBeforeLeaving(ev as unknown as BeforeUnloadEvent);
ok(ev.prevented && ev.returnValue === '', `#3982 the armed listener cancels the leave (prevented ${ev.prevented}, returnValue ${JSON.stringify(ev.returnValue)})`);

// ── the rule over the store's real states ───────────────────────────────────────────────────────────
const brands = exampleBrands as Record<string, BrandInput>;
const name = Object.keys(brands)[0];
const real = leaveGuard(target);
const sync = (): void => real.sync(needsOverwriteConfirm(store.brandState, store.provenance));
store.loadInput(brands[name], { kind: 'example', id: name });
sync();
ok(!real.armed(), `#3982 an example just loaded (${name}) leaves the prompt off`);
store.setPath(store.brandState, 'id', 'edited-in-test');
store.syncIdentity();
sync();
ok(real.armed(), '#3982 an edit to it arms the prompt');
store.loadInput(brands[name], { kind: 'example', id: name });
sync();
ok(!real.armed(), '#3982 loading over the edit, the untouched brand disarms it');

// ── the wiring and the draft copy, read from the source ─────────────────────────────────────────────
const main = readFileSync(new URL('./src/main.ts', import.meta.url), 'utf8');
ok(/leaving\?\.sync\(needsOverwriteConfirm\(brandState, provenance\)\)/.test(main), '#3982 main.ts syncs the prompt on the replace confirm\'s own rule');
const subs = ['brand', 'identity', 'origin'].filter((t) => main.includes(`subscribe('${t}', syncLeaving)`));
ok(subs.length === 3, `#3982 main.ts re-syncs the prompt on every topic that moves the brand or its origin (${JSON.stringify(subs)})`);
ok(/const leaving = commit\.isFigma \? null : leaveGuard\(window\)/.test(main), '#3982 the prompt is the web\'s only');
const bar = readFileSync(new URL('./src/shell/bar.ts', import.meta.url), 'utf8');
ok(bar.includes('SAVE_FIRST.brief') && bar.includes('SAVE_FIRST.tokens'), '#3982 the confirm draws both download labels');
ok(SAVE_FIRST.brief === 'Download design.md' && SAVE_FIRST.tokens === 'Download tokens', `#3982 the draft labels (${JSON.stringify(SAVE_FIRST)})`);

console.log(`\n${failed ? '✗' : '✓'} leave guard (#3982): ${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
