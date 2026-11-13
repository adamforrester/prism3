/**
 * AN INTERRUPTED APPLY THEME LEAVES NO "MATCHING" PRINT (#3697 M3) — against the file shim.
 *
 *   npx tsx apps/plugin/test-apply-interrupted.ts
 *
 * Apply Theme stores the brand input and the print of what it wrote (`theme-emission.ts`, #3422) only after its last
 * stage. A run that throws part-way, or a plugin closed mid-run, left new variables under the OLD stored brand and the
 * OLD print, so on reopen the recount (`themeDue`) read the file as matching the old brand, and Theme opened unticked
 * over a half-written variable layer. The print is now cleared before the first write and stamped again at the end.
 *
 * A fresh file takes brand A whole, then brand B, whose apply the host stops at stage 5 (`text-styles`, the sixth of
 * `APPLY_STAGES`, counted from 0) through the apply's own pace hook. Expectations are the recount's answers, read off
 * the file with `themeDue` as `main.ts` reads them, and the print each brand's plans make, worked out here from the
 * brand alone. Mutation: the clear before the first write dropped → `interrupted/A not matching`.
 */
import type { BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { FileShim } from './file-shim';
import { APPLY_STAGES, runApplyTheme, themePlans, type ThemePace } from './src/apply-theme';
import { themeDue, emissionOf, EMISSION_KEY } from './src/theme-emission';
import { NS } from './src/persist-figma';

let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};

const brands = exampleBrands as Record<string, BrandInput>;
const A = brands.harbor, B = brands.aurora ?? Object.values(brands).find((b) => b !== A)!;
const printOf = (b: BrandInput): string => emissionOf(themePlans(b));

const file = new FileShim();
const faces = new Map<string, { family: string; style: string }>();
for (const b of [A, B]) for (const r of themePlans(b).textPlan) faces.set(`${r.fontFamilyPrimary}|${r.fontStyle}`, { family: r.fontFamilyPrimary, style: r.fontStyle });
file.faces = [...faces.values()];
const root = file.root as any;

console.log('\npremise — brand A applied whole');
const a = await runApplyTheme(A, file as any);
ok(a.guarded.ok === true && !themeDue(root, A, () => printOf(A)), 'premise: after a whole Apply Theme the recount finds nothing to apply for brand A');

console.log('\ninterrupted — brand B stopped at stage 5');
const STOP_AT = 5;
const seen: string[] = [];
const pace: ThemePace = {
  check: () => {},
  stage: async (stage, done) => { seen.push(stage); if (done === STOP_AT) throw new Error('the plugin was closed'); },
  tick: async () => {},
};
let threw = '';
try { await runApplyTheme(B, file as any, undefined, pace); } catch (e) { threw = (e as Error).message; }
ok(threw === 'the plugin was closed' && seen.at(-1) === APPLY_STAGES[STOP_AT] && seen.length === STOP_AT + 1,
  `premise: the apply stopped as stage 5 (${APPLY_STAGES[STOP_AT]}) began, after ${STOP_AT} stages had written (${seen.join(', ')}; ${threw})`);
ok(themeDue(root, A, () => printOf(A)),
  'interrupted/A not matching: the file no longer reads as holding brand A, whose variables the stopped run half replaced');
ok(themeDue(root, B, () => printOf(B)), 'interrupted/B due: nor does it read as holding brand B, which never finished');
ok(!root.getSharedPluginData(NS, EMISSION_KEY), 'interrupted/no print: the stored print is cleared, not left at brand A\'s');

console.log('\nrerun — brand B applied whole');
const b = await runApplyTheme(B, file as any);
ok(b.guarded.ok === true && !themeDue(root, B, () => printOf(B)), 'rerun/stamped: a whole Apply Theme stamps the print again, and the recount finds nothing to apply for brand B');
ok(root.getSharedPluginData(NS, EMISSION_KEY) === printOf(B), 'rerun/print: the stored print is brand B\'s');

console.log(`\n${executed - failed}/${executed} interrupted Apply Theme assertions passed.`);
if (failed) process.exit(1);
