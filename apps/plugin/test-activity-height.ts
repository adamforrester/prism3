/**
 * The Activity drawer's height, kept per person, through the REAL `main.ts` (#2176, the owner's AD1, 2026-10-05).
 *
 *   npx tsx apps/plugin/test-activity-height.ts
 *
 * The open drawer drags taller at the wide tier, and the height is remembered. The plugin's iframe has no storage of its
 * own, so the UI posts `set-activity-height` and the main thread keeps the height in `figma.clientStorage` under
 * `prism3:activity-height` (per person, per machine, like `prism3:theme` and `prism3:ui-size`), then answers each
 * `ui-ready` with it as `activity-height`. `test:chrome` §31 proves the panel posts the height and draws the reply; this
 * proves the main thread keeps it and sends it back. It drives `main.ts` exactly as `test-theme-pref.ts` does: the shared
 * component host (`component-shim.ts`) as the global `figma`, with a `clientStorage` that is a plain map.
 *
 * INDEPENDENCE (docs/34): the expected key and values are literals typed here; the actual side is what `main.ts`
 * wrote to the map and posted back.
 *
 * Mutation this fails by name: the `set-activity-height` case emptied in `main.ts` → `a height is kept in
 * clientStorage under prism3:activity-height`.
 */
import { makeShim } from './component-shim';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const KEY = 'prism3:activity-height';
const posted: any[] = [];
const kept = new Map<string, unknown>();
const shim = makeShim() as Record<string, any>;
Object.assign(shim.root as Record<string, unknown>, {
  name: 'activity-height test file', type: 'DOCUMENT', children: [],
  getSharedPluginData: () => '', setSharedPluginData: () => undefined, getPluginData: () => '', setPluginData: () => undefined,
});
const empty = async () => [];
Object.assign(shim, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async (k: string) => kept.get(k), setAsync: async (k: string, v: unknown) => { kept.set(k, v); } },
  on: () => undefined,
  listAvailableFontsAsync: empty,
  getLocalPaintStylesAsync: shim.getLocalPaintStylesAsync ?? empty,
  getLocalGridStylesAsync: shim.getLocalGridStylesAsync ?? empty,
});
const g = globalThis as Record<string, unknown>;
g.figma = shim;
g.__html__ = '';
g.PRISM3_BUILD = '2026-10-06T00:00:00Z tree-test0000';

await import('./src/main');

const send = (m: unknown): void => (shim.ui as { onmessage: (m: unknown) => void }).onmessage(m);
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 30));
const replies = (): unknown[] => posted.filter((m) => m?.type === 'activity-height').map((m) => m.px);

console.log('the Activity drawer height, kept per person (main.ts)');

// 1. Nothing kept: ui-ready sends no height, so the drawer opens at its own.
send({ type: 'ui-ready' });
await settle();
ok(replies().length === 0, `with nothing kept, ui-ready sends no activity-height (sent ${JSON.stringify(replies())})`);

// 2. A height is kept, under the plugin's own key.
send({ type: 'set-activity-height', px: 312 });
await settle();
ok(kept.get(KEY) === 312, `a height is kept in clientStorage under ${KEY} (kept ${JSON.stringify(kept.get(KEY))})`);

// 3. The next launch's ui-ready sends it back.
posted.length = 0;
send({ type: 'ui-ready' });
await settle();
ok(JSON.stringify(replies()) === '[312]', `the next ui-ready sends the kept height back (sent ${JSON.stringify(replies())})`);

// 4. A later height replaces it.
send({ type: 'set-activity-height', px: 480 });
await settle();
ok(kept.get(KEY) === 480, `a later height replaces the kept one (kept ${JSON.stringify(kept.get(KEY))})`);

// 5. Anything that is not a height is refused, and a bad kept value is never sent.
for (const bad of [0, -40, Number.NaN, '300', null]) {
  send({ type: 'set-activity-height', px: bad });
  await settle();
}
ok(kept.get(KEY) === 480, `a height that is not a positive number is not kept (kept ${JSON.stringify(kept.get(KEY))})`);
kept.set(KEY, 'tall');
posted.length = 0;
send({ type: 'ui-ready' });
await settle();
ok(replies().length === 0, `a kept value that is not a height is not sent (sent ${JSON.stringify(replies())})`);

console.log(`\n${executed - failed}/${executed} activity-height assertions passed.`);
if (failed) process.exit(1);
process.exit(0);
