/**
 * The plugin's Docs, through the REAL `main.ts` (#2637, owner decision Q384 A).
 *
 *   npx tsx apps/plugin/test-open-docs.ts
 *
 * The bar's Docs posts `open-docs`; the iframe cannot open a page, so the main thread calls `figma.openExternal` on the
 * studio's web `/docs/`. `test:chrome` proves the panel posts the message; this proves the main thread opens the page.
 * It installs the shared component host (`component-shim.ts`) as the global `figma`, with an `openExternal` that
 * records its argument, imports `main.ts`, and talks to it through `figma.ui.onmessage`, as `test-theme-pref.ts` does.
 *
 * INDEPENDENCE (docs/34): the expected address is a literal typed here; the actual side is what `main.ts` handed to
 * `openExternal`.
 *
 * Mutations this fails by name: the `open-docs` case dropped from `main.ts` → `open-docs opens the docs landing page
 * in the browser`; `DOCS_URL` pointed anywhere else → the same arm, naming the address it opened.
 */
import { makeShim } from './component-shim';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/** The studio's web address, `/docs/` (apps/studio/README.md, "Production"). Literal. */
const EXPECTED = 'https://prism3-ds.vercel.app/docs/';

const opened: unknown[] = [];
const posted: any[] = [];
const shim = makeShim() as Record<string, any>;
Object.assign(shim.root as Record<string, unknown>, {
  name: 'open-docs test file', type: 'DOCUMENT', children: [],
  getSharedPluginData: () => '', setSharedPluginData: () => undefined, getPluginData: () => '', setPluginData: () => undefined,
});
const empty = async () => [];
Object.assign(shim, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  openExternal: (url: unknown) => { opened.push(url); },
  on: () => undefined,
  listAvailableFontsAsync: empty,
  getLocalPaintStylesAsync: shim.getLocalPaintStylesAsync ?? empty,
  getLocalGridStylesAsync: shim.getLocalGridStylesAsync ?? empty,
});
const g = globalThis as Record<string, unknown>;
g.figma = shim;
g.__html__ = '';
g.PRISM3_BUILD = '2026-10-16T00:00:00Z tree-test0000';

await import('./src/main');

const send = (m: unknown): void => (shim.ui as { onmessage: (m: unknown) => void }).onmessage(m);
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 30));

console.log('the plugin Docs, opened by the main thread (main.ts)');

send({ type: 'ui-ready' });
await settle();
ok(opened.length === 0, `nothing is opened until Docs is chosen (opened ${JSON.stringify(opened)})`);

send({ type: 'open-docs' });
await settle();
ok(JSON.stringify(opened) === JSON.stringify([EXPECTED]), `open-docs opens the docs landing page in the browser, ${EXPECTED} (opened ${JSON.stringify(opened)})`);

// An address in the message is not followed: the main thread holds the only one.
send({ type: 'open-docs', url: 'https://example.com/' });
await settle();
ok(JSON.stringify(opened) === JSON.stringify([EXPECTED, EXPECTED]), `an address sent with open-docs is ignored, and the docs page opens again (opened ${JSON.stringify(opened)})`);

console.log(`\n${executed - failed}/${executed} open-docs assertions passed.`);
if (failed) process.exit(1);
process.exit(0);
