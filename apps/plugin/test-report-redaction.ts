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
 *     keeps the host's message`; the same at `prune failed:` → `#3697 H4 D3703.1 B a thrown prune: …`.
 */
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import { buildReport, type ReportEntry } from '../studio/src/state/report';
import { themePlans } from './src/apply-theme';
import { FileShim } from './file-shim';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
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
  buildReport({ stamp: 'stamp', engine: '0.0.0', host: 'figma', includeBrand: false, brand: BRAND as unknown as Record<string, unknown>, activity: ms.map((m) => entry(title, m)) });
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

console.log = log;
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
