/**
 * THE PLUGIN'S MAIN-THREAD WORK, HELD BY COUNTS RATHER THAN TIMINGS (#4230, #4237).
 *
 *   npx tsx apps/plugin/test-main-thread.ts
 *
 * Figma runs the plugin's main thread on its own: while it works, the panel and the canvas cannot answer. The
 * performance audit found two places where the same expensive value was rebuilt in one turn. A timing in CI moves with
 * the runner, so each arm here counts the rebuilds instead, and prints the time beside it as measured, not asserted.
 *
 *   #4230  Apply Theme's plans (`themePlans`) share one token tree: `treeBuilds()` moves by one per call, not about nine.
 *   #4160  A run's read of the file searches for components with `figma.skipInvisibleInstanceChildren` on, read off the
 *          host at the moment each search runs, and puts it back after; a search for anything else runs with it off.
 *   #4237  `updateTargets` works out the brand's levers once per run and hands the thread back as it projects. The
 *          stand-in suite (`test-open-large-file.ts`) prints the stalls, measured, and holds "once per run" by a count
 *          (`update/levers-once`); this suite's source arms are pointers only.
 *
 * INDEPENDENCE (docs/34). The plans built with the shared tree are compared with the same plans built one emitter at a
 * time, each building its own tree, as on main: the sharing must change no plan. The brands are the committed examples.
 *
 * Mutations that fail here by name:
 *   · `themePlans` without `withSharedTree` (`apply-theme.ts`) → `#4230 <brand>: themePlans builds the token tree once`;
 *   · `buildTree` sharing a tree outside `withSharedTree` (`tree.ts`) → `#4230 outside withSharedTree, each buildTree
 *     builds its own tree`;
 *   · `searchComponents` dropped from `run-read.ts`'s page search → `#4160 a component search runs with hidden instance
 *     children skipped`; `onlyComponents` admitting any type → `#4160 an instance search runs with them read`; the
 *     `finally` dropped → `#4160 a search that throws puts the flag back`;
 *   · `materializeForBrand` put back in `updateTargets`' loop, or its `await tick()` dropped (`main.ts`) → `#4237 …`.
 */
import { EXAMPLE_BRANDS_JSON as exampleBrands, brandTheme, buildTree, type BrandInput } from '@prism3/engine';
import {
  buildFigmaColor, buildFloatWritePlan, buildFontVarPlan, buildGridStylePlan, buildMotionVarPlan, buildStylesPlan,
  buildTextStylePlan, buildWritePlan, treeBuilds, withSharedTree,
} from '@prism3/engine/figma';
import { themePlans } from './src/apply-theme';
import { readRun } from './src/run-read';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const brands = Object.entries(exampleBrands as Record<string, BrandInput>);
ok(brands.length >= 3, `premise: the committed example brands (${brands.map(([k]) => k).join(', ')})`);

/* ── #4230: Apply Theme's plans share one token tree ─────────────────────────────────────────────────────────────── */
console.log('\n#4230 themePlans');
for (const [name, input] of brands) {
  themePlans(input); // warm
  const before = treeBuilds();
  const t0 = performance.now();
  const plans = themePlans(input);
  const ms = performance.now() - t0;
  const n = treeBuilds() - before;
  ok(n === 1, `#4230 ${name}: themePlans builds the token tree once (${n} builds, ${ms.toFixed(0)} ms measured, not asserted)`);
  // The same plans, each emitter on its own tree, as every emitter built before #4230.
  const th = brandTheme(input);
  const apart = { theme: th, textPlan: buildTextStylePlan(th), colorFiles: buildFigmaColor(th), colorPlan: buildWritePlan(buildFigmaColor(th)),
    floatPlan: buildFloatWritePlan(th), fontPlan: buildFontVarPlan(th), motionPlan: buildMotionVarPlan(th), stylesPlan: buildStylesPlan(th), gridPlan: buildGridStylePlan(th) };
  ok(treeBuilds() - before > 5, `#4230 premise ${name}: the emitters apart build a tree each (${treeBuilds() - before - n})`);
  ok(JSON.stringify(plans) === JSON.stringify(apart), `#4230 ${name}: the shared tree changes no plan`);
}
{
  // A shared tree must not be changed by the plans that read it: each emitter run over a frozen one. A write into a
  // frozen object throws in a module (strict mode), so a plan that changed the tree it was given fails here.
  const freeze = (o: unknown, seen = new Set<unknown>()): void => {
    if (!o || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    for (const v of Object.values(o)) freeze(v, seen);
    Object.freeze(o);
  };
  for (const [name, input] of brands) {
    let threw = '';
    const before = treeBuilds();
    try {
      withSharedTree(() => {
        const th = brandTheme(input);
        freeze(buildTree(th));
        buildTextStylePlan(th); buildWritePlan(buildFigmaColor(th)); buildFloatWritePlan(th); buildFontVarPlan(th);
        buildMotionVarPlan(th); buildStylesPlan(th); buildGridStylePlan(th);
      });
    } catch (e) { threw = String(e); }
    ok(!threw && treeBuilds() - before === 1, `#4230 ${name}: no plan changes the shared tree it reads (${threw || 'none'}; ${treeBuilds() - before} builds)`);
  }
  // Outside the scope nothing is kept, so a caller that plants a fault in its tree (engine test.ts) changes no other.
  const th = brandTheme(brands[0][1]);
  const before = treeBuilds();
  const a = buildTree(th), b = buildTree(th);
  ok(a !== b && treeBuilds() - before === 2, `#4230 outside withSharedTree, each buildTree builds its own tree (${treeBuilds() - before} builds)`);
}

/* ── #4160: a run's component searches skip hidden instance children ────────────────────────────────────────────── */
console.log('\n#4160 skipInvisibleInstanceChildren');
{
  const g = globalThis as { figma?: { skipInvisibleInstanceChildren?: boolean } };
  const was = g.figma;
  const host = { skipInvisibleInstanceChildren: false };
  g.figma = host;
  // A paged root: each search records the flag as the host holds it at that moment.
  const seen: { types: string; flag: boolean }[] = [];
  let boom = false;
  const page = {
    id: 'p1', type: 'PAGE',
    findAllWithCriteria: (c: { types: string[] }) => {
      seen.push({ types: c.types.join('+'), flag: !!host.skipInvisibleInstanceChildren });
      if (boom) throw new Error('refused');
      return [];
    },
  };
  const root = { children: [page], findAllWithCriteria: () => [] };
  await readRun(root, [{ types: ['COMPONENT_SET', 'COMPONENT'] }, { types: ['INSTANCE'] }]);
  const comp = seen.find((x) => x.types === 'COMPONENT_SET+COMPONENT'), inst = seen.find((x) => x.types === 'INSTANCE');
  ok(!!comp && comp.flag, `#4160 a component search runs with hidden instance children skipped (${JSON.stringify(comp)})`);
  ok(!!inst && !inst.flag, `#4160 an instance search runs with them read, since an instance can sit inside one (${JSON.stringify(inst)})`);
  ok(host.skipInvisibleInstanceChildren === false, `#4160 the flag is off again after the read (${host.skipInvisibleInstanceChildren})`);
  boom = true;
  let threw = false;
  try { await readRun(root, [{ types: ['COMPONENT'] }]); } catch { threw = true; }
  ok(threw && host.skipInvisibleInstanceChildren === false, `#4160 a search that throws puts the flag back (threw ${threw}, flag ${host.skipInvisibleInstanceChildren})`);
  g.figma = was;
  // The read after open (`searchPagesYielding`, main.ts) searches each page for components through the same helper.
  const fs = await import('node:fs');
  const mn = fs.readFileSync(new URL('./src/main.ts', import.meta.url), 'utf8');
  ok(/keep\(searchComponents\(types, \(\) => p\.findAllWithCriteria!\(\{ types \}\)\)\)/.test(mn), '#4160 main.ts the read after open: each page\'s component search goes through searchComponents');
}

/* ── #4237: Update file's targets: the brand's levers once per run, the projection paced ─────────────────────────── */
console.log('\n#4237 updateTargets');
{
  const fs = await import('node:fs');
  const mn = fs.readFileSync(new URL('./src/main.ts', import.meta.url), 'utf8');
  const at = mn.indexOf('const updateTargets = ');
  const body = at < 0 ? '' : mn.slice(at, mn.indexOf('\n};\n', at));
  const loop = body.slice(body.indexOf('for (const d of defs)'));
  ok(at >= 0 && /const materialize = materializerFor\(brandInput\);/.test(body) && !/materializeForBrand\(/.test(body),
    `#4237 updateTargets works out the brand's levers once, before its loop (${at < 0 ? 'not found' : /materializeForBrand\(/.test(body) ? 'materializeForBrand in the body' : 'ok'})`);
  ok(/^for \(const d of defs\) \{\s*await tick\(\);/.test(loop) && /const tick = pacer\(breathe\);/.test(body),
    '#4237 updateTargets hands the thread back once PACE_MS of projection has run');
  const callers = [...mn.matchAll(/(\bawait )?updateTargets\(/g)].filter((m) => mn.slice(m.index - 30, m.index).includes('= '));
  ok(callers.length === 4 && callers.every((m) => !!m[1]), `#4237 every caller awaits updateTargets (${callers.length} callers)`);
}

console.log(`${failed ? `\n${failed} failed` : '\n✅ ALL PASS'} — ${executed} assertions executed`);
process.exit(failed ? 1 : 0);
