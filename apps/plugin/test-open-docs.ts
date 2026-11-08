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
 * #2069 (Q116 A): `open-issue`, Report a problem's link, opens only this repo's issue form. Mutations: the `isIssueUrl`
 * check dropped → `#2069 open-issue opens nothing but this repo's issue form`; the case dropped → `#2069 open-issue opens
 * the prefilled issue form in the browser`; `isIssueUrl`'s length bound dropped, or `URL_LIMIT` raised → `#3522 R3
 * open-issue opens no issue URL over 7000 characters`.
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

// ── #2069 (Q116 A): Report a problem's prefilled issue. The panel builds the address; the main thread opens it only when
// it is the issue form on this repo. The prefix is a literal typed here.
const ISSUE = 'https://github.com/adamforrester/prism3/issues/new?title=Problem%20report&body=Build%3A%20x';
opened.length = 0;
send({ type: 'open-issue', url: ISSUE });
await settle();
ok(JSON.stringify(opened) === JSON.stringify([ISSUE]), `#2069 open-issue opens the prefilled issue form in the browser (opened ${JSON.stringify(opened)})`);
for (const bad of ['https://example.com/collect?d=1', 'https://github.com/someone-else/repo/issues/new?body=x', 'javascript:alert(1)', 42, undefined]) {
  send({ type: 'open-issue', url: bad });
}
await settle();
ok(JSON.stringify(opened) === JSON.stringify([ISSUE]), `#2069 open-issue opens nothing but this repo's issue form (opened ${JSON.stringify(opened)})`);
// #3522 review R3: an over-long address on the form is not opened. 7000 is a literal: under the roughly 8 KB at which
// GitHub refuses a prefilled issue URL (observed, not documented), never read from report.ts.
const OVER = `${ISSUE}`.padEnd(7001, 'x');
opened.length = 0;
send({ type: 'open-issue', url: OVER });
await settle();
ok(OVER.length === 7001 && opened.length === 0, `#3522 R3 open-issue opens no issue URL over 7000 characters (opened ${opened.length})`);

console.log(`\n${executed - failed}/${executed} open-docs assertions passed.`);
if (failed) process.exit(1);
process.exit(0);
