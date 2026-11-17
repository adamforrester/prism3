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
import type { BrandInput } from '@prism3/engine';
import { EXAMPLE_BRANDS_JSON as exampleBrands } from '@prism3/engine';
import { FileShim } from './file-shim';
import { APPLY_STAGES, runApplyTheme, themePlans, type ThemePace } from './src/apply-theme';
import { themeDue, emissionOf, EMISSION_KEY } from './src/theme-emission';
import { NS } from './src/persist-figma';
import { resolveCutPlan } from './src/preload-fonts';

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

// #1728 — THE CUT VARIABLE HOLDS THE FAMILY'S OWN SPELLING BEFORE THE TEXT-STYLE STAGE. The engine names a cut one way
// per weight (`Semi Bold Italic`); a family can spell it its own way (this Figma's Playfair has `SemiBold Italic`). The
// text-style stage corrects the cut variable (#1296), but the variable stage before it wrote the engine's spelling on
// every apply, so a run stopped between the two left the variable naming a style the family does not have, and a
// re-apply put the wrong spelling back each time. Here the prism3 brand runs on a host whose Playfair spells it
// `SemiBold Italic` and whose Inter lacks `Semi Bold Italic` under any spelling. Expected values are typed, not read
// off the resolver. Mutation: `runApplyTheme` passing the unresolved font plan to the variable stage →
// `#1728 interrupted/fresh` and `#1728 interrupted/re-apply`.
console.log('\n#1728 — the cut variable is resolved before the variable stage writes it');
{
  const P = brands.prism3;
  const plans = themePlans(P);
  const f2 = new FileShim();
  const hostFaces = new Map<string, { family: string; style: string }>();
  for (const r of plans.textPlan) {
    if (r.fontFamilyPrimary === 'Inter' && r.fontStyle === 'Semi Bold Italic') continue;
    const style = r.fontFamilyPrimary === 'Playfair Display' && r.fontStyle === 'Semi Bold Italic' ? 'SemiBold Italic' : r.fontStyle;
    hostFaces.set(`${r.fontFamilyPrimary}|${style}`, { family: r.fontFamilyPrimary, style });
  }
  f2.faces = [...hostFaces.values()];
  const cutVar = (family: string, style: string): string => plans.textPlan.find((r) => r.fontFamilyPrimary === family && r.fontStyle === style)?.fontStyleVar ?? '';
  const PLAYFAIR = cutVar('Playfair Display', 'Semi Bold Italic');
  const INTER = cutVar('Inter', 'Semi Bold Italic');
  if (!PLAYFAIR || !INTER) throw new Error(`premise: the prism3 plan binds no cut variable for Playfair or Inter Semi Bold Italic (${PLAYFAIR}, ${INTER})`);
  const valueOf = (name: string): unknown => {
    const v = (f2 as any).vars.find((x: any) => x.name === name);
    return v ? Object.values(v.valuesByMode)[0] : undefined;
  };
  const stopAt5: ThemePace = { check: () => {}, stage: async (_s, done) => { if (done === STOP_AT) throw new Error('the plugin was closed'); }, tick: async () => {} };
  const stopped = async (): Promise<string> => { try { await runApplyTheme(P, f2 as any, undefined, stopAt5); return ''; } catch (e) { return (e as Error).message; } };

  const t1 = await stopped();
  ok(t1 === 'the plugin was closed' && valueOf(PLAYFAIR) === 'SemiBold Italic',
    `#1728 interrupted/fresh: a fresh apply stopped before the text-style stage leaves ${PLAYFAIR} at the family's own "SemiBold Italic" (${JSON.stringify(valueOf(PLAYFAIR))}; ${t1})`);
  const whole = await runApplyTheme(P, f2 as any);
  ok(whole.guarded.ok === true && valueOf(PLAYFAIR) === 'SemiBold Italic'
    && !whole.pf.unavailable.some((u) => u.face.startsWith('Playfair Display|')),
    `#1728 whole: a whole apply ends at "SemiBold Italic" and reports no Playfair face unavailable (${JSON.stringify(valueOf(PLAYFAIR))}; ${JSON.stringify(whole.pf.unavailable.map((u) => u.face))})`);
  ok(valueOf(INTER) === 'Semi Bold Italic' && whole.pf.unavailable.some((u) => u.face === 'Inter|Semi Bold Italic'),
    `#1728 missing cut left alone: a cut the family lacks under every spelling keeps the engine's "Semi Bold Italic", and the apply warns (${JSON.stringify(valueOf(INTER))}; ${JSON.stringify(whole.pf.unavailable.map((u) => u.face))})`);
  const t2 = await stopped();
  ok(t2 === 'the plugin was closed' && valueOf(PLAYFAIR) === 'SemiBold Italic',
    `#1728 interrupted/re-apply: a re-apply stopped before the text-style stage does not put the engine's spelling back (${JSON.stringify(valueOf(PLAYFAIR))}; ${t2})`);
}

// #1728 — PER MODE, by mode name. Every committed brand has one font mode, so the arm above cannot see a cut whose family
// differs by mode. Two modes here, the family row listing them in the other order: `a` reads Playfair, `b` reads Inter,
// and a third cut aliases in `b`, so that mode is left to the alias. Typed expectations; no host.
{
  const row = (name: string, values: string[], alias: (string | null)[] = values.map(() => null)) =>
    ({ name, resolvedType: 'STRING', scopes: [], description: '', hidden: false, valuesByMode: values, aliasByMode: alias }) as any;
  const plan = [
    { name: 'core', modes: ['a', 'b'], rows: [row('cut/x', ['Semi Bold Italic', 'Semi Bold Italic']), row('cut/y', ['Semi Bold', 'Semi Bold'], [null, 'cut/x'])] },
    { name: 'fam', modes: ['b', 'a'], rows: [row('fam/x', ['Inter', 'Playfair Display'])] },
  ] as any;
  const text = [{ fontStyleVar: 'cut/x', fontFamilyVar: 'fam/x' }, { fontStyleVar: 'cut/y', fontFamilyVar: 'fam/x' }] as any;
  const host = new Map([['Playfair Display', ['SemiBold Italic', 'SemiBold']], ['Inter', ['Semi Bold Italic', 'Semi Bold']]]);
  const r = resolveCutPlan(plan, text, host);
  const vx = r.plans[0].rows[0].valuesByMode, vy = r.plans[0].rows[1].valuesByMode;
  ok(JSON.stringify(vx) === JSON.stringify(['SemiBold Italic', 'Semi Bold Italic']) && JSON.stringify(vy) === JSON.stringify(['SemiBold', 'Semi Bold']) && r.resolved === 2,
    `#1728 per mode: each mode's cut resolves against the family that mode reads, matched by mode name, and an aliased mode is left alone (x ${JSON.stringify(vx)}, y ${JSON.stringify(vy)}, ${r.resolved} resolved)`);
  const none = resolveCutPlan(plan, text, undefined);
  ok(none.resolved === 0 && JSON.stringify(none.plans[0].rows[0].valuesByMode) === JSON.stringify(['Semi Bold Italic', 'Semi Bold Italic']),
    `#1728 no host list: every cut is written as planned (${none.resolved} resolved)`);
}

console.log(`\n${executed - failed}/${executed} interrupted Apply Theme assertions passed.`);
if (failed) process.exit(1);
