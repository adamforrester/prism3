/**
 * The plugin's Theme choice, kept per person, through the REAL `main.ts` (the owner's top-bar decision, 2026-10-05).
 *
 *   npx tsx apps/plugin/test-theme-pref.ts
 *
 * The Theme menu offers Match Figma (the default), Light and Dark. The iframe has no storage of its own, so the UI
 * posts `set-theme-pref` and the main thread keeps the choice in `figma.clientStorage` (per person, per machine),
 * then answers each `ui-ready` with it as `theme-pref`. `test:chrome` §27 proves the panel posts the choice and
 * applies the reply; this proves the main thread keeps it and sends it back. It installs the shared component host
 * (`component-shim.ts`) as the global `figma`, with a `clientStorage` that is a plain map, imports `main.ts`, and
 * talks to it through `figma.ui.onmessage`, as `test-build-completed.ts` does.
 *
 * INDEPENDENCE (docs/34): the expected key and values are literals typed here; the actual side is what `main.ts`
 * wrote to the map and posted back.
 *
 * Mutation this fails by name: the `set-theme-pref` case dropped from `main.ts` → `a choice is kept in clientStorage
 * under prism3:theme`.
 */
import { makeShim } from './component-shim';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const posted: any[] = [];
const kept = new Map<string, unknown>();
const shim = makeShim() as Record<string, any>;
Object.assign(shim.root as Record<string, unknown>, {
  name: 'theme-pref test file', type: 'DOCUMENT', children: [],
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
g.PRISM3_BUILD = '2026-10-05T00:00:00Z tree-test0000';

await import('./src/main');

const send = (m: unknown): void => (shim.ui as { onmessage: (m: unknown) => void }).onmessage(m);
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 30));
const themeReplies = (): unknown[] => posted.filter((m) => m?.type === 'theme-pref').map((m) => m.pref);

console.log('the plugin Theme choice, kept per person (main.ts)');

// 1. Nothing kept: ui-ready sends no choice, so the panel stays on Match Figma.
send({ type: 'ui-ready' });
await settle();
ok(themeReplies().length === 0, `with nothing kept, ui-ready sends no theme-pref (sent ${JSON.stringify(themeReplies())})`);

// 2. A choice is kept, under the plugin's own key.
send({ type: 'set-theme-pref', pref: 'dark' });
await settle();
ok(kept.get('prism3:theme') === 'dark', `a choice is kept in clientStorage under prism3:theme (kept ${JSON.stringify(kept.get('prism3:theme'))})`);

// 3. The next launch's ui-ready sends it back.
posted.length = 0;
send({ type: 'ui-ready' });
await settle();
ok(JSON.stringify(themeReplies()) === '["dark"]', `the next ui-ready sends the kept choice back (sent ${JSON.stringify(themeReplies())})`);

// 4. Match Figma is a choice too, and replaces Dark.
send({ type: 'set-theme-pref', pref: 'figma' });
await settle();
ok(kept.get('prism3:theme') === 'figma', `Match Figma is kept as "figma" (kept ${JSON.stringify(kept.get('prism3:theme'))})`);

// 5. Anything else is refused, and a bad kept value is never sent.
send({ type: 'set-theme-pref', pref: 'purple' });
await settle();
ok(kept.get('prism3:theme') === 'figma', `an unknown choice is not kept (kept ${JSON.stringify(kept.get('prism3:theme'))})`);
kept.set('prism3:theme', 'purple');
posted.length = 0;
send({ type: 'ui-ready' });
await settle();
ok(themeReplies().length === 0, `an unknown kept value is not sent (sent ${JSON.stringify(themeReplies())})`);

console.log(`\n${executed - failed}/${executed} theme-pref assertions passed.`);
if (failed) process.exit(1);
process.exit(0);
