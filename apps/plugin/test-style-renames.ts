/**
 * THE STYLE RENAME RECORD REACHES THE FILE (#1040, `docs/44` §10.1) — a recorded style rename renames the existing
 * text, effect and paint style IN PLACE, by id, through both real call sites: Apply Theme (`runApplyTheme`) and the
 * paste steps (`runStyles`, `runText`).
 *
 * WHY THE CALL SITES AND NOT ONLY THE HELPER. The rename pass is a pre-pass each caller runs before its writer
 * (`rename-styles.ts`). A test of the helper alone stays green when a caller stops calling it, and the writer then
 * creates the new style beside the old one, which is the exact defect #1040 decided against. So each arm drives the
 * caller, against the shared file model (`file-shim.ts`), and reads the result off the file: the style under the new
 * name must be the SAME OBJECT ID the old name had, and no style may be left under the old name.
 *
 * THE RULES ARE FIXTURES PUSHED INTO THE LIVE REGISTER. `STYLE_RENAMES` ships empty (no style has been renamed since
 * #1040), and the call sites read the register itself, so the test pushes three fixture rules into it for the run and
 * empties it in a `finally`. A fixture moves `was/<name>` to `<name>`: the file is first applied normally, then each
 * chosen style is renamed BACK to `was/<name>` in the shim, which is what a file built before a rename looks like.
 *
 * Mutations, each failing here by name: drop `renameStylesForPlan` from `apply-theme.ts` (the effect and paint arms
 * of "Apply Theme"); drop `renameTextStylesForPlan` from it (the text arm); drop either from `mcp-steps.ts` (the
 * "paste" arms); make `renameStyles` ignore ownership (the client-style arm); drop the client-at-target guard in
 * `renameStyles` (the "client at target" arm).
 *
 * Run: `npx tsx apps/plugin/test-style-renames.ts`
 */
import { readFileSync } from 'node:fs';
import { STYLE_RENAMES, type StyleRule } from '@prism3/engine/materialization-renames';
import type { BrandInput } from '@prism3/engine/theme';
import { runApplyTheme, themePlans } from './src/apply-theme';
import { pack, runStyles, runText } from './src/mcp-steps';
import { brandFromDesignMd } from './mcp-paste';
import { FileShim } from './file-shim';
import { renameStyles } from './src/rename-styles';
import { isMarkedOwned, markOwned } from './src/provenance';

let failed = 0;
let passed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.error(`  ✗ ${label}`); }
};

const EXAMPLES = new URL('../../packages/engine/examples/', import.meta.url);
const input: BrandInput = brandFromDesignMd(readFileSync(new URL('aurora.design.md', EXAMPLES), 'utf8'));
const plans = themePlans(input);
const faces = [...new Map(plans.textPlan.map((r) => [`${r.fontFamilyPrimary}|${r.fontStyle}`, { family: r.fontFamilyPrimary, style: r.fontStyle }])).values()];

const OLD = 'was/';
const fixture = (collection: string): StyleRule => ({
  id: `fixture-${collection}`,
  since: '0.0.0',
  why: 'test fixture',
  domain: (c, n) => c === collection && n.startsWith(OLD),
  map: (_c, n) => n.slice(OLD.length),
});
const RULES = [fixture('text-styles'), fixture('shadow-styles'), fixture('gradient-styles')];

type Kind = 'text' | 'effect' | 'paint';
/** A file Apply Theme has written once, with one style of each kind moved back to its pre-rename name. */
const builtThenRenamedBack = async () => {
  const f = new FileShim();
  f.faces = faces;
  const first = await runApplyTheme(input, f as any);
  if (!first.guarded.ok) throw new Error('the first Apply Theme did not apply — the fixture is broken, not the rename');
  const picked = {
    text: plans.textPlan[0].name,
    effect: plans.stylesPlan.effects[0].name,
    paint: plans.stylesPlan.paints[0]?.name,
  } as Record<Kind, string>;
  const ids = {} as Record<Kind, string>;
  for (const k of ['text', 'effect', 'paint'] as Kind[]) {
    const s = f.styles[k].find((x: any) => x.name === picked[k]);
    if (!s) throw new Error(`no ${k} style named ${picked[k]} after the first apply`);
    ids[k] = s.id;
    s.name = OLD + s.name;
  }
  const counts = { text: f.styles.text.length, effect: f.styles.effect.length, paint: f.styles.paint.length };
  return { f, picked, ids, counts };
};

const withRules = async <T>(fn: () => Promise<T>): Promise<T> => {
  STYLE_RENAMES.push(...RULES);
  try { return await fn(); } finally { STYLE_RENAMES.length = 0; }
};

const reached = (label: string, f: FileShim, picked: Record<Kind, string>, ids: Record<Kind, string>, counts: Record<Kind, number>, kinds: Kind[]) => {
  for (const k of kinds) {
    const now = f.styles[k].filter((x: any) => x.name === picked[k]);
    const left = f.styles[k].filter((x: any) => x.name === OLD + picked[k]);
    ok(now.length === 1 && now[0].id === ids[k] && left.length === 0 && f.styles[k].length === counts[k],
      `${label}: a recorded rename reaches the existing ${k} style by id — ${OLD}${picked[k]} → ${picked[k]} keeps ${ids[k]} `
      + `(now ${now.map((x: any) => x.id).join(', ') || 'none'}; left under the old name: ${left.length}; ${k} styles ${counts[k]} → ${f.styles[k].length})`);
  }
};

console.log('Style rename record (#1040) — a recorded rename renames the existing style in place\n');

// The register ships empty, so the fixture must start from nothing and leave nothing behind.
ok(STYLE_RENAMES.length === 0, `the shipped style register is empty before the run (${STYLE_RENAMES.length})`);
ok(plans.stylesPlan.paints.length > 0, `the fixture brand emits gradient paint styles (${plans.stylesPlan.paints.length}), so the paint arm has something to reach`);

/* ── Apply Theme ───────────────────────────────────────────────────────────────────────────────────── */
{
  const { f, picked, ids, counts } = await builtThenRenamedBack();
  // A client's own text style under a name the fixture rule claims, with a description that is not the engine's.
  const client = f.createTextStyle();
  client.name = `${OLD}${plans.textPlan[1].name}`;
  client.description = 'our own heading style';
  const clientId = client.id;
  const run = await withRules(() => runApplyTheme(input, f as any));
  ok(run.guarded.ok, 'Apply Theme: the second apply ran (control)');
  reached('Apply Theme', f, picked, ids, { ...counts, text: counts.text + 1 }, ['text', 'effect', 'paint']);
  const result = run.guarded.ok ? run.guarded.result.styleRenames : [];
  ok(result.filter((o) => o.applied).length === 3,
    `Apply Theme: its result reports the three renames it applied (${result.filter((o) => o.applied).map((o) => `${o.from}→${o.to}`).join(', ')})`);
  ok(client.name === `${OLD}${plans.textPlan[1].name}` && f.styles.text.some((x: any) => x.id === clientId)
    && result.some((o) => o.notOurs && o.from === client.name && !o.applied),
    `Apply Theme: a client's style a rule would move is reported and left as it is (${client.name})`);
  // With the register empty again, a re-apply renames nothing and creates nothing: the pass is a no-op.
  const again = await runApplyTheme(input, f as any);
  ok(again.guarded.ok && again.guarded.result.styleRenames.length === 0 && f.styles.text.length === counts.text + 1,
    `Apply Theme: with the shipped (empty) register the pass does nothing (${again.guarded.ok ? again.guarded.result.styleRenames.length : 'refused'} outcomes)`);
}

/* ── the paste steps ───────────────────────────────────────────────────────────────────────────────── */
{
  const { f, picked, ids, counts } = await builtThenRenamedBack();
  (globalThis as any).figma = f;
  try {
    const fonts = plans.textPlan.map((r) => ({ fontFamilyPrimary: r.fontFamilyPrimary, fontStyle: r.fontStyle }));
    const [rs, rt] = await withRules(async () => [
      await runStyles(pack({ step: 1, of: 2, label: 'styles', plan: plans.stylesPlan })),
      await runText(pack({ step: 2, of: 2, label: 'text', fonts, plan: plans.textPlan })),
    ]);
    ok(rs.ok && rt.ok, `paste: both steps report ok (styles ${rs.threw ?? 'ok'}, text ${rt.threw ?? 'ok'})`);
    reached('paste', f, picked, ids, counts, ['text', 'effect', 'paint']);
    ok(rs.renamed === 2 && rt.renamed === 1, `paste: each step reports what it renamed (styles ${rs.renamed}, text ${rt.renamed})`);
  } finally {
    delete (globalThis as any).figma;
  }
}

/* ── a client's style under a rule's TARGET name ───────────────────────────────────────────────────── */
// `planStyleRenames` is offered only Prism3's own names, so its `target-exists` arm cannot see a client's style
// sitting under the target. The plugin-side guard in `renameStyles` is the only thing that refuses that rename;
// without it both styles end up under one name and the writer's by-name map picks one of them.
{
  const marks = new Map<string, Map<string, string>>();
  const style = (id: string, name: string, description: string) => ({
    id, name, description,
    getSharedPluginData: (ns: string, key: string) => marks.get(id)?.get(`${ns}/${key}`) ?? '',
    setSharedPluginData: (ns: string, key: string, v: string) => {
      if (!marks.has(id)) marks.set(id, new Map());
      marks.get(id)!.set(`${ns}/${key}`, v);
    },
  });
  const target = plans.stylesPlan.effects[0].name;
  const prism = style('S:prism', `${OLD}${target}`, '');
  markOwned(prism);
  const client = style('S:client', target, 'our own shadow');
  const live = [prism, client];
  const out = renameStyles('shadow-styles', 'effect', live, plans.stylesPlan.effects.map((r) => r.name), [fixture('shadow-styles')]);
  const row = out.find((o) => o.from === `${OLD}${target}`);
  ok(isMarkedOwned(prism) && !isMarkedOwned(client), 'client at target: the fixture marks only the Prism3 style (control)');
  ok(row?.status === 'target-exists' && row.applied === false
    && prism.name === `${OLD}${target}` && prism.id === 'S:prism'
    && client.name === target && client.id === 'S:client'
    && new Set(live.map((s) => s.name)).size === live.length,
    `client at target: a rename onto a client's style is refused as target-exists and both styles keep their names and ids `
    + `(status ${row?.status ?? 'none'}, applied ${row?.applied}; names ${live.map((s) => `${s.id}=${s.name}`).join(', ')})`);
}

console.log(`\n${failed ? '✗' : '✓'} style renames: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
