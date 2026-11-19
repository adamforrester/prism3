/**
 * Report a problem's redaction over the lines the plugin really posts (#3697 H4).
 *
 *   npx tsx apps/plugin/test-report-redaction.ts
 *
 * WHY THIS EXISTS. `apps/studio/test-report.ts` feeds `buildReport` lines typed by hand, so a NEW line carrying a new
 * kind of brand string passes it: the review at d773b85 found `typefaces unavailable (<face>, …)` (`main.ts`), printed
 * exactly when a brand's licensed typeface is not installed, going into a report untouched, and raw host messages
 * (`write failed: …`, `prune failed: …`) going in as the host wrote them. Here the lines come from the plugin itself:
 * its Apply Theme and Prune run over the file shim (`file-shim.ts`), the same host the export-parity suites write
 * into, and each posted verdict goes through `buildReport` as the panel's Activity drawer hands it over.
 *
 * INDEPENDENCE (docs/34). Every brand string the fixture authors is a LITERAL below (`AUTHORED`), and the fixture is
 * built from those literals. The check reads the report for each literal — never `brandWords`' own list, which is the
 * subject. A premise arm proves each scenario's raw lines DO carry the strings it checks, so a pass is not a run that
 * printed nothing. The host messages are literals too (`HOST_SECRET`), and name nothing in the brand input, so only
 * the report's failure rule (`reduceFailure`) can take them out, not the word list. D3703.1 B: the Activity drawer keeps
 * the host's message, so each thrown arm also holds the posted line, typed whole, to carry it.
 *
 * Mutations that fail here by name:
 *   · typefaces left out of `brandWords` (`report.ts`) → `#3697 H4 a missing licensed typeface: no brand string survives
 *     … LEAKED Calibre Office`;
 *   · `reduceFailure` dropped from `buildReport` (`report.ts`) → `#3697 H4 a thrown write: the host's message is not in
 *     the report` and `#3697 H4 a thrown prune: the host's message is not in the report`;
 *   · `write failed:` carrying the class alone again (`main.ts`) → `#3697 H4 D3703.1 B a thrown write: the drawer line
 *     keeps the host's message`; the same at `prune failed:` → `#3697 H4 D3703.1 B a thrown prune: …`;
 *   · #3702: the `DETAIL` rule dropped from `reduceLine` (`report.ts`) → `#3702 Build components: the report keeps the
 *     error's class, not the host's message`, and the same for Set up file, Style guide, Clean up style guide and Read
 *     from file; `file setup failed:` carrying the class alone (`main.ts`) → `#3702 D3703.1 B Set up file: the drawer
 *     line keeps the host's message, its class in front`.
 *   · #3702 review: `failureDetail` keeping a host message's line breaks (`apply-summary.ts`) → `#3702 Set up file, a
 *     two-line host message: the report keeps the error's class, not the host's message`; `HEAD_DETAIL`'s class back to
 *     `…Error` → `#3702 Style guide, a DOMException: …` and `#3702 Build components, an invariant: …`; a head dropped
 *     from `DETAIL_HEADS` → `#3702 review: every head main.ts posts a failureDetail after is one the report cuts at`.
 *   · #3702 second review: `failureDetail` collapsing `[\r\n]` only → `#3702 D3703.1 B Set up file, a host message
 *     split by U+2028: the drawer line keeps the host's message, its class in front` (and U+2029). The report arm holds
 *     under it: the report's own cut (`test-report.ts`) closes the same leak a second time.
 *   · #4205: any one of Update file's sites put back to `(e as Error)?.message` (`update-apply.ts`, `canvas-furniture.ts`,
 *     `main.ts`) → `#4205 <site>: the site posts failureDetail`, and for the four `main.ts` catches `#4205 Update check: …`
 *     (and Record as built, Adopt); `': stopped ('` or `'The update failed: '` dropped from `DETAIL_HEADS` →
 *     `#4205 Update file, a stopped set: the report keeps the class, …` (and the run that threw).
 */
import { EXAMPLE_BRANDS_JSON as exampleBrands } from '@prism3/engine';
import { brandTheme, type BrandInput } from '@prism3/engine';
import { buildReport, DETAIL_HEADS, type ReportEntry } from '../studio/src/state/report';
import { themePlans } from './src/apply-theme';
import { FileShim } from './file-shim';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/* ── the fixture brand: every string a brand author writes, as a literal ─────────────────────────────────────────── */

/** Each string the fixture authors. Fictional. `Calibre Office` is the licensed face the file does not have. */
const AUTHORED = {
  id: 'harbor-fleet', name: 'Harbor Fleet', root: 'hfs',
  palette: 'tidewater', mode: 'night-watch', interactive: 'seaside', glass: 'lagoon', gradient: 'sunrise',
  licensed: 'Calibre Office', display: 'Ivar Headline',
} as const;
const AURORA = (exampleBrands as Record<string, BrandInput>).aurora;
const BRAND = {
  ...AURORA, id: AUTHORED.id, name: AUTHORED.name, root: AUTHORED.root,
  brandColors: [{ name: AUTHORED.palette, oklch: { l: 0.6, c: 0.1, h: 200 } }], actionPalette: AUTHORED.palette,
  customModes: [{ name: AUTHORED.mode, base: 'dark' }],
  interactivePalettes: [{ palette: AUTHORED.palette, name: AUTHORED.interactive }],
  glassRoles: { [AUTHORED.glass]: { palette: `${AUTHORED.palette}.500`, alpha: 40 } },
  gradients: [{ name: AUTHORED.gradient, stops: [{ palette: AUTHORED.palette, step: 300, position: 0 }, { palette: 'primary', step: 600, position: 1 }] }],
  typography: {
    ...AURORA.typography,
    families: { ...AURORA.typography?.families, display: AUTHORED.display, title: AUTHORED.display, body: AUTHORED.licensed, label: AUTHORED.licensed, caption: AUTHORED.licensed },
  },
} as BrandInput;
brandTheme(BRAND);   // the fixture is a brand the engine accepts, or every arm below is about nothing

/** A host message naming what a file holds and the brand input does not (a page and a layer): only the class rule
 *  can take it out. */
const HOST_SECRET = 'in get_name: node "Checkout Hero / Q3 launch" on page "Unannounced"';

/* ── the host: a file shim as `figma`, with what `main.ts` reads at load ─────────────────────────────────────────── */

const file = new FileShim();
const API = ['getLocalEffectStylesAsync', 'getLocalPaintStylesAsync', 'getLocalGridStylesAsync', 'getLocalTextStylesAsync', 'createEffectStyle',
  'createPaintStyle', 'createGridStyle', 'createTextStyle', 'loadFontAsync', 'listAvailableFontsAsync'] as const;
const figmaShim: Record<string, unknown> = {
  variables: file,
  showUI: () => undefined,
  ui: { postMessage: () => undefined, onmessage: null, resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  notify: () => ({ cancel: () => undefined }),
  loadAllPagesAsync: async () => undefined,
  saveVersionHistoryAsync: async () => ({ id: "version" }),
  getNodeByIdAsync: async () => null,
  root: {
    name: 'redaction file', type: 'DOCUMENT', children: [],
    getSharedPluginData: () => '', setSharedPluginData: () => undefined, getPluginData: () => '', setPluginData: () => undefined,
    findAllWithCriteria: () => [], findAll: () => [], findOne: () => null,
  },
};
for (const k of API) figmaShim[k] = (...a: unknown[]) => (file as unknown as Record<string, (...b: unknown[]) => unknown>)[k](...a);
const g = globalThis as Record<string, unknown>;
g.figma = figmaShim; g.__html__ = ''; g.PRISM3_BUILD = '2026-11-12T00:00:00Z tree-test0000';
const log = console.log;
console.log = (...a: unknown[]) => { if (typeof a[0] === 'string' && a[0].startsWith('[prism3')) return; log(...a); };
const main = await import('./src/main');

type Posted = { type?: string; headline?: string; summary?: string; lines?: string[] };
/** Run one action as an agent would (its sink), and hand back what it posted. */
const run = async (f: (sink: unknown) => Promise<void>): Promise<Posted[]> => {
  const out: Posted[] = [];
  await f({ post: (m: Posted) => { out.push(m); }, data: () => undefined });
  return out;
};
/** A posted verdict as the Activity drawer gives it to the report (`studio/src/main.ts`, `reportLend`): the headline
 *  as the verdict, the lines, or the summary when there are none. The summary goes in as a line too, so nothing the
 *  plugin posted is left out of the check. */
const entry = (title: string, m: Posted): ReportEntry => ({
  title, verdict: m.headline ?? m.summary ?? '', lines: [...(m.lines ?? []), ...(m.summary ? [m.summary] : [])], agent: false,
});
const rawText = (ms: readonly Posted[]): string => ms.map((m) => [m.headline, m.summary, ...(m.lines ?? [])].join('\n')).join('\n');
const report = (title: string, ms: readonly Posted[]): string =>
  buildReport({ stamp: 'stamp', engine: '0.0.0', host: 'figma', includeBrand: false, seen: [], brand: BRAND as unknown as Record<string, unknown>, activity: ms.map((m) => entry(title, m)) });
/** A literal survives when it is in the text as a whole segment (no letter or digit on either side), in any case. */
const survives = (text: string, word: string): boolean =>
  new RegExp(`(^|[^A-Za-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z0-9])`, 'i').test(text);
const leaked = (text: string): string[] => Object.values(AUTHORED).filter((w) => survives(text, w));

/* ── 1. Apply Theme, with the licensed typeface not installed ─────────────────────────────────────────────────────── */

console.log('Report a problem over the plugin\'s own lines (#3697 H4)\n');
{
  // Every face the brand's text styles ask for, less the licensed family: the file has the other faces installed.
  const faces = [...new Map(themePlans(BRAND).textPlan.map((r) => [`${r.fontFamilyPrimary}|${r.fontStyle}`, { family: r.fontFamilyPrimary, style: r.fontStyle }])).values()];
  file.faces = faces.filter((f) => f.family !== AUTHORED.licensed);
  const posted = (await run((sink) => (main.ACTIONS.applyTheme as (...a: unknown[]) => Promise<void>)(BRAND, undefined, sink))).filter((m) => m.type === 'apply-result');
  const raw = rawText(posted);
  ok(posted.length === 1 && survives(raw, AUTHORED.licensed) && /typefaces? unavailable/.test(raw),
    `#3697 H4 premise: the apply posts its result, and its raw lines name the missing licensed typeface (${JSON.stringify(posted[0]?.lines?.filter((l) => /unavailable|skipped/.test(l)))})`);
  const text = report('Apply Theme', posted);
  const l = leaked(text);
  ok(l.length === 0 && text.includes('[brand]'),
    `#3697 H4 a missing licensed typeface: no brand string survives the report of the apply's own lines${l.length ? ` — LEAKED ${l.join(', ')}` : ''}`);
}

/* ── 2. Apply Theme that throws: the host's message ────────────────────────────────────────────────────────────────── */
{
  const real = figmaShim.getLocalTextStylesAsync;
  figmaShim.getLocalTextStylesAsync = async () => { throw new TypeError(HOST_SECRET); };
  const posted = (await run((sink) => (main.ACTIONS.applyTheme as (...a: unknown[]) => Promise<void>)(BRAND, undefined, sink))).filter((m) => m.type === 'apply-result');
  figmaShim.getLocalTextStylesAsync = real;
  const raw = rawText(posted);
  ok(posted.length === 1 && /write failed/.test(raw), `#3697 H4 premise: a thrown write posts its failure (${JSON.stringify(posted[0]?.summary)})`);
  // D3703.1 B: the Activity drawer shows the verdict's lines as posted, so the designer keeps Figma's reason. Typed whole.
  ok(posted[0]?.lines?.[0] === 'write failed: TypeError: in get_name: node "Checkout Hero / Q3 launch" on page "Unannounced"',
    `#3697 H4 D3703.1 B a thrown write: the drawer line keeps the host's message (${JSON.stringify(posted[0]?.lines?.[0])})`);
  const text = report('Apply Theme', posted);
  ok(!text.includes('Checkout Hero') && !text.includes('Unannounced') && !text.includes('get_name'),
    `#3697 H4 a thrown write: the host's message is not in the report (${JSON.stringify(posted[0]?.summary)})`);
  ok(text.includes('  - write failed: TypeError\n'), '#3697 H4 a thrown write: the report says the error\'s class');
}

/* ── 3. Prune that throws ───────────────────────────────────────────────────────────────────────────────────────── */
{
  const real = figmaShim.getLocalTextStylesAsync;
  figmaShim.getLocalTextStylesAsync = async () => { throw new Error(HOST_SECRET); };
  const posted = (await run((sink) => (main.ACTIONS.prune as (...a: unknown[]) => Promise<void>)(BRAND, true, undefined, sink))).filter((m) => m.type === 'prune-result');
  figmaShim.getLocalTextStylesAsync = real;
  const raw = rawText(posted);
  ok(posted.length === 1 && /prune failed/.test(raw), `#3697 H4 premise: a thrown prune posts its failure (${JSON.stringify(posted[0]?.summary)})`);
  ok(posted[0]?.summary === 'prune failed: Error: in get_name: node "Checkout Hero / Q3 launch" on page "Unannounced"',
    `#3697 H4 D3703.1 B a thrown prune: the drawer line keeps the host's message (${JSON.stringify(posted[0]?.summary)})`);
  const text = report('Prune', posted);
  ok(!text.includes('Checkout Hero') && !text.includes('Unannounced') && !text.includes('get_name'),
    `#3697 H4 a thrown prune: the host's message is not in the report (${JSON.stringify(posted[0]?.summary)})`);
  ok(text.includes('  - prune failed: Error\n') || text.endsWith('  - prune failed: Error'), '#3697 H4 a thrown prune: the report says the error\'s class');
}

/* ── 4–9. #3702: every other action that posts a host's message (D3703.1 B: the drawer keeps it; the report cuts it) ── */

/** The drawer keeps the host's message with the class in front (`failureDetail`), and the report keeps the class. The
 *  posted line and the reported line are both typed whole, so a site that posts the raw message, or the class alone,
 *  fails by name here, and so does a report that keeps the message. */
const TE = `TypeError: ${HOST_SECRET}`;
const BUILT = 'Built from tree-test0000 at 2026-11-12T00:00:00Z.';
const thrown = (name: string, posted: readonly Posted[], line: string | undefined, want: string, reported: string): void => {
  ok(posted.length === 1, `#3702 premise: ${name} posts one result (${posted.length})`);
  ok(line === want, `#3702 D3703.1 B ${name}: the drawer line keeps the host's message, its class in front (${JSON.stringify(line)})`);
  const text = report(name, posted);
  ok(!/Checkout Hero|Unannounced|get_name/.test(text) && text.includes(`  - ${reported}`),
    `#3702 ${name}: the report keeps the error's class, not the host's message (${JSON.stringify(text.split('\n').filter((l) => l.startsWith('  - ')))})`);
};
const A = main.ACTIONS as unknown as Record<string, (...a: unknown[]) => Promise<void>>;
const boom = async (): Promise<never> => { throw new TypeError(HOST_SECRET); };
{
  const real = figmaShim.loadAllPagesAsync;
  figmaShim.loadAllPagesAsync = boom;
  const built = await run((sink) => A.buildComponents('button', sink));
  thrown('Build components', built, built[0]?.lines?.[0], `component build failed: ${TE}`, 'component build failed: TypeError');
  const setup = await run((sink) => A.fileSetup(sink));
  thrown('Set up file', setup, setup[0]?.summary, `file setup failed: ${TE}. ${BUILT}`, 'file setup failed: TypeError');
  const guide = await run((sink) => A.styleGuide({}, sink));
  thrown('Style guide', guide, guide[0]?.lines?.[0], `style guide failed: ${TE}`, 'style guide failed: TypeError');
  // Cleanup is reached only from the panel's message (`style-guide-cleanup`), so it goes in that way.
  const ui = figmaShim.ui as { postMessage: (m: unknown) => void; onmessage: ((m: unknown) => unknown) | null };
  const cleaned: Posted[] = [];
  const realPost = ui.postMessage;
  ui.postMessage = (m) => { if ((m as Posted).type === 'style-guide-cleanup-result') cleaned.push(m as Posted); };
  await ui.onmessage?.({ type: 'style-guide-cleanup', ids: ['tables'] });
  for (let i = 0; i < 50 && !cleaned.length; i++) await new Promise((r) => setTimeout(r, 10));
  ui.postMessage = realPost;
  thrown('Clean up style guide', cleaned, cleaned[0]?.summary, `Cleanup failed: ${TE}`, 'Cleanup failed: TypeError');
  figmaShim.loadAllPagesAsync = real;
}
{
  const f = file as unknown as { getLocalVariableCollectionsAsync: () => Promise<unknown[]> };
  const real = f.getLocalVariableCollectionsAsync;
  f.getLocalVariableCollectionsAsync = boom;
  const seeded = await run((sink) => A.seedFromFile(sink));
  f.getLocalVariableCollectionsAsync = real;
  thrown('Read from file', seeded, seeded[0]?.summary, `read-back failed: ${TE}`, 'read-back failed: TypeError');
}
{
  // A per-value write the host refuses (`setSurviving`, `write-figma.ts`): recorded with the host's reason, not thrown.
  // The shim refuses exactly the writes that path makes (read off the call's stack), so the apply still runs.
  // The earlier arms' applies already created the variables, so the ones there are refused too, and any created now.
  type Var = { setValueForMode: (m: string, v: unknown) => void };
  const f = file as unknown as { vars: Var[]; createVariable: (...a: unknown[]) => Var };
  const refuse = (v: Var): Var => {
    const write = v.setValueForMode;
    v.setValueForMode = function (this: unknown, m, x) { if (String(new Error().stack).includes('setSurviving')) throw new Error(HOST_SECRET); write.call(this, m, x); };
    return v;
  };
  const kept = f.vars.map((v) => [v, v.setValueForMode] as const);
  f.vars.forEach(refuse);
  const real = f.createVariable;
  f.createVariable = (...a) => refuse(real.apply(file, a));
  const applied = (await run((sink) => (main.ACTIONS.applyTheme as (...a: unknown[]) => Promise<void>)(BRAND, undefined, sink))).filter((m) => m.type === 'apply-result');
  f.createVariable = real;
  for (const [v, w] of kept) v.setValueForMode = w;
  const line = applied[0]?.lines?.find((l) => l.includes('variable writes refused by Figma'));
  ok(applied.length === 1 && !!line && line.endsWith(`: ${HOST_SECRET.slice(0, 60)})`),
    `#3702 premise and D3703.1 B a refused variable write: the drawer line keeps the host's reason (${JSON.stringify(line)})`);
  const text = report('Apply Theme', applied);
  const out = text.split('\n').find((l) => l.includes('variable writes refused by Figma')) ?? '';
  ok(!/Checkout Hero|Unannounced|get_name/.test(text) && /^ {2}- ⚠ \d+ variable writes refused by Figma \([^:()]+\)$/.test(out),
    `#3702 a refused variable write: the report keeps the variable's name, not the host's reason (${JSON.stringify(out)})`);
}

/* ── 9b. #3702 review: host messages `reduceFailure` cut short of the end ──────────────────────────────────────────── */
// A host message over two lines (the report cuts a detail to the end of its LINE, so the second line got through), and
// a class `errorClass` admits that is not an `…Error` (`DOMException`, a lowercase `invariant`). Thrown from the host,
// through the real actions; the drawer line and the reported line are both typed whole.
{
  const SECOND = 'page "Unannounced" is locked by Checkout Hero';
  const twoLines = async (): Promise<never> => { throw new Error(`in loadAllPagesAsync: failed\n${SECOND}`); };
  const named = (name: string) => async (): Promise<never> => { throw Object.assign(new Error(HOST_SECRET), { name }); };
  const real = figmaShim.loadAllPagesAsync;
  figmaShim.loadAllPagesAsync = twoLines;
  const setup = await run((sink) => A.fileSetup(sink));
  thrown('Set up file, a two-line host message', setup, setup[0]?.summary,
    `file setup failed: Error: in loadAllPagesAsync: failed ${SECOND}. ${BUILT}`, 'file setup failed: Error');
  // Every other line terminator JS knows (CR, CRLF, U+2028, U+2029): `failureDetail` puts the message on one line.
  for (const [label, t] of [['CR', '\r'], ['CRLF', '\r\n'], ['U+2028', '\u2028'], ['U+2029', '\u2029']] as const) {
    figmaShim.loadAllPagesAsync = async (): Promise<never> => { throw new Error(`in loadAllPagesAsync: failed${t}${SECOND}`); };
    const s = await run((sink) => A.fileSetup(sink));
    thrown(`Set up file, a host message split by ${label}`, s, s[0]?.summary,
      `file setup failed: Error: in loadAllPagesAsync: failed ${SECOND}. ${BUILT}`, 'file setup failed: Error');
  }
  figmaShim.loadAllPagesAsync = named('DOMException');
  const guide = await run((sink) => A.styleGuide({}, sink));
  thrown('Style guide, a DOMException', guide, guide[0]?.lines?.[0], `style guide failed: DOMException: ${HOST_SECRET}`, 'style guide failed: DOMException');
  figmaShim.loadAllPagesAsync = named('invariant');
  const built = await run((sink) => A.buildComponents('button', sink));
  thrown('Build components, an invariant', built, built[0]?.lines?.[0], `component build failed: invariant: ${HOST_SECRET}`, 'component build failed: invariant');
  figmaShim.loadAllPagesAsync = real;
}

/* ── 9c. #3702 review: the report's heads are every head the plugin posts a `failureDetail` after ─────────────────── */
// `reduceFailure` admits any class only after a head it knows (`DETAIL_HEADS`), so a new site would leak a
// `DOMException`'s message. Read from the plugin's source, independent of the list: every `${failureDetail(` in a
// template is preceded by one of the report's heads, or by `write failed: ` (cut by its own rule). The two calls
// outside a template are named: prune's (`prune failed: ${why}`, its own rule; `PRUNE_COPY.stopped`, filed as #3865)
// and its version note (`PRUNE_COPY.noVersion`, whose head is checked in `prune-figma.ts`), and since #4205 the four
// Update file catches (`const why = failureDetail(e)`: the check or apply, Record, Adopt, Draw specs), held in 11.
{
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('./src/main.ts', import.meta.url), 'utf8');
  const heads = [...DETAIL_HEADS, 'write failed: '];
  const sites = [...src.matchAll(/\$\{failureDetail\(/g)].map((m) => src.slice(Math.max(0, m.index - 60), m.index));
  const unheaded = sites.filter((before) => !heads.some((h) => before.endsWith(h)));
  const outside = [...src.matchAll(/failureDetail\(/g)].length - sites.length;
  const prune = fs.readFileSync(new URL('./src/prune-figma.ts', import.meta.url), 'utf8');
  ok(sites.length >= 12 && unheaded.length === 0 && outside === 6 && /noVersion: \(why: string\): string => `[^`]*the named version could not be saved \(\$\{why\}\)/.test(prune),
    `#3702 review: every head main.ts posts a failureDetail after is one the report cuts at (${sites.length} sites; unheaded ${JSON.stringify(unheaded.map((b) => b.slice(-40)))}; ${outside} outside a template)`);
}

/* ── 10. #3702: the sites no shim here reaches post `failureDetail` too ─────────────────────────────────────────── */
// Canvas labels, the usage and spec panels, the cover, the version save and the engine's plan refusal need a file this
// shim does not model (a built set, a cover page, a saved version). Their report rule is held line by line in
// `apps/studio/test-report.ts` (#3702); here each site's template is read from `main.ts`, so a site put back to the raw
// message fails by name. The phrases are literals typed here.
{
  const src = (await import('node:fs')).readFileSync(new URL('./src/main.ts', import.meta.url), 'utf8');
  for (const phrase of ['No canvas labels for ${defId}: Figma refused the write (', 'No usage panel for ${defId}: Figma refused the write (',
    'No spec panel for ${def.id}: Figma refused the write (', 'not drawn, Figma refused the write (', 'the named version could not be saved (',
    'the engine could not plan it (']) {
    const at = src.indexOf(phrase);
    ok(at >= 0 && src.startsWith('${failureDetail(e)})', at + phrase.length),
      `#3702 ${phrase.replace(/\$\{[^}]+\}/g, '…').replace(/ \($/, '')}: the site posts failureDetail(e) (${at < 0 ? 'phrase not found' : JSON.stringify(src.slice(at + phrase.length, at + phrase.length + 40))})`);
  }
}

/* ── 11. #4205: Update file's lines carry a host message as `failureDetail` does ───────────────────────────────── */
// The #3702 arms above read `main.ts` and `prune-figma.ts` only, so Update file's own lines (`update-apply.ts`) and the
// canvas labels it redraws (`canvas-furniture.ts`) went into the report with Figma's message whole: Figma's own read
// `in <method>: …`, a shape `reduceFailure` does not cut. 11a runs the real actions, thrown by the host, through the
// report; 11b and 11c read every plugin source file (listed from the folder, not from a list here), so a new file or a
// site put back to the raw message fails by name; 11d holds Update file's verdict lines over the report's heads.
{
  // 11a. The Update check, the host throwing as it reads the file's pages. Record as built and Adopt read the pages
  // through `run-read.ts`, which takes a refused read as no pages, so their catches are held by their text below.
  const root = figmaShim.root as object;
  const own = Object.getOwnPropertyDescriptor(root, 'children');
  const proto = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(root), 'children');
  Object.defineProperty(root, 'children', { configurable: true, get: () => { throw new TypeError(HOST_SECRET); } });
  const runs: [string, (sink: unknown) => Promise<void>][] = [
    ['Update check', (sink) => A.updateComponents(undefined, null, undefined, undefined, sink)],
  ];
  for (const [name, f] of runs) {
    const posted = (await run(f)).filter((m) => m.type === 'component-update-result');
    thrown(`#4205 ${name}`, posted, posted[0]?.lines?.[0], TE, 'TypeError');
  }
  if (own) Object.defineProperty(root, 'children', own); else delete (root as { children?: unknown }).children;
  ok(!!(own ?? proto) && Array.isArray((root as { children?: unknown }).children), '#4205 premise: the file reads its pages again after 11a');
}
{
  const fs = await import('node:fs');
  const dir = new URL('./src/', import.meta.url);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts')).sort();
  const read = (f: string): string => fs.readFileSync(new URL(f, dir), 'utf8');
  ok(files.includes('update-apply.ts') && files.includes('canvas-furniture.ts') && files.includes('main.ts') && files.length > 40,
    `#4205 premise: the scan reads every plugin source file (${files.length})`);
  // 11b. Every `${failureDetail(` in a template, in any file, follows a head the report cuts at (9c held main.ts only).
  const heads = [...DETAIL_HEADS, 'write failed: '];
  const unheaded = files.flatMap((f) => { const src = read(f); return [...src.matchAll(/\$\{failureDetail\(/g)]
    .map((m) => src.slice(Math.max(0, m.index - 60), m.index)).filter((b) => !heads.some((h) => b.endsWith(h))).map((b) => `${f}: …${b.slice(-40)}`); });
  ok(!unheaded.length, `#4205 every file: each failureDetail in a template follows a head the report cuts at (${JSON.stringify(unheaded)})`);
  // 11c. A head the report cuts at, followed in any file by anything but `failureDetail(`: the raw message after it.
  // Heads that name a value of their own (`stopped (${o.stopped})`, `The update failed: ${r.failed}`) are held in 11d.
  const cutAt = DETAIL_HEADS.filter((h) => !/stopped|update failed/.test(h));
  // One is named: prune's version note (`PRUNE_COPY.noVersion`, `${why}`), which `main.ts` calls with `failureDetail` (9c).
  const raw = files.flatMap((f) => { const src = read(f); return cutAt.flatMap((h) => [...src.matchAll(new RegExp(`${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\$\\{(?!failureDetail\\()`, 'g'))]
    .map((m) => `${f}: ${src.slice(m.index, m.index + h.length + 30)}`)); })
    .filter((x) => !x.startsWith('prune-figma.ts: the named version could not be saved (${why})'));
  ok(!raw.length, `#4205 every file: no head the report cuts at is followed by a raw host message (${JSON.stringify(raw)})`);
  // The six sites #4205 names, and the four Update-file catches in main.ts, each by its own text.
  const ua = read('update-apply.ts'), cf = read('canvas-furniture.ts'), mn = read('main.ts');
  const site = (name: string, src: string, re: RegExp): void => ok(re.test(src), `#4205 ${name}: the site posts failureDetail`);
  site('update-apply.ts the cover', ua, /skipped: `not updated, Figma refused the write \(\$\{failureDetail\(e\)\}\)`/);
  site('update-apply.ts the About frame', ua, /skipped: `Figma refused the write \(\$\{failureDetail\(e\)\}\)`/);
  site('update-apply.ts the version save', ua, /refusedAll = `the named version could not be saved \(\$\{failureDetail\(err\)\}\)/);
  ok((ua.match(/out\.stopped = failureDetail\(err\);/g) ?? []).length === 2 && !/out\.stopped = \(/.test(ua), '#4205 update-apply.ts a stopped set (both sites): the site posts failureDetail');
  site('update-apply.ts the run that threw', ua, /res\.failed = failureDetail\(err\);/);
  site('canvas-furniture.ts the canvas labels', cf, /No canvas labels for \$\{o\.def\}: Figma refused the write \(\$\{failureDetail\(e\)\}\)/);
  ok((mn.match(/const why = failureDetail\(e\);/g) ?? []).length >= 5 && !/const why = \(e as Error\)/.test(mn), '#4205 main.ts Update, Record, Adopt and Draw specs: each catch posts failureDetail');
  // No raw host message read is left in update-apply.ts: Update file's write path posts each through failureDetail.
  const code = ua.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const rawReads = [...code.matchAll(/\((?:e|err)\s+as\s+Error\)\??\.message|\b(?:e|err)\.message\b/g)].length;
  ok(rawReads === 0, `#4205 update-apply.ts reads no host message raw (${rawReads})`);
}
{
  // 11d. Update file's verdict over those values (`applyVerdict`), thrown as a class `…Error` does not name: the
  // report cuts at the head and keeps the class.
  const { applyVerdict } = await import('./src/update-apply');
  const { failureDetail } = await import('./src/apply-summary');
  const dom = Object.assign(new Error(HOST_SECRET), { name: 'DOMException' });
  const set = { set: 'Button', def: 'button', updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], identity: [], content: [], misses: [], unrecorded: [], kept: [], handEdits: 'keep' };
  const base = { outcomes: [], missing: [], refused: [] };
  const cases: [string, Record<string, unknown>][] = [
    ['a stopped set', { ...base, outcomes: [{ ...set, stopped: failureDetail(dom) }] }],
    ['the run that threw', { ...base, failed: failureDetail(dom) }],
    ['the version save', { ...base, refusedAll: `the named version could not be saved (${failureDetail(dom)}), so nothing was written` }],
  ];
  for (const [name, r] of cases) {
    const v = applyVerdict(r as never);
    const posted = [{ headline: v.headline, lines: v.lines }];
    const text = report('Update file', posted);
    ok(rawText(posted).includes(HOST_SECRET) && !/Checkout Hero|Unannounced|get_name/.test(text) && text.includes('DOMException'),
      `#4205 Update file, ${name}: the report keeps the class, not the host's message (${JSON.stringify(text.split('\n').filter((l) => l.startsWith('  - ')))})`);
  }
}

console.log = log;
console.log(`${failed ? `\n${failed} failed` : '\nall passed'} — ${executed} assertions executed`);
process.exit(failed ? 1 : 0);
