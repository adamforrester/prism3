/**
 * The component catalog, checked (UI redesign S8.1, T1).
 *
 *   npx tsx apps/studio/test-component-catalog.ts
 *
 * Two subjects. `src/state/component-catalog.ts`'s `catalogOf` is the pure function both hosts use (the plugin
 * live, from the definitions it bundles; the web through the generator). `src/state/component-catalog-data.ts` is
 * the web's GENERATED copy, imported here as the bundle imports it.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The oracle is the engine's own projector, `figmaAnatomySet`, RUN
 * HERE per definition, with the member count read off its result; the nested sets are read off those plans by the
 * PLUGIN's dependency code (`apps/plugin/src/build-deps.ts`: `planTargets` and `defForTarget`, the functions a build
 * runs to decide what to make first), not by `catalogOf`'s own walk; the summaries and categories are read off the
 * definitions directly. None of it goes through the generated module or the generator. The staleness arm is the
 * `regen --check` shape: the committed copy against a fresh computation, so a definition whose member count moves
 * makes the copy stale until it is rewritten. The literal arms are typed from the definitions' documented shape
 * (Button is 432 variants since the #1223 split and nests Icon, FocusRing and Spinner; Icon and Spinner build as
 * separate components, #1623), so a generator that agreed with itself while reading the wrong field still fails by
 * name. The two reasons a set is not offered have no subject in the corpus today (all build), so they are held on
 * planted definitions.
 *
 * Mutations this fails by name: the committed copy edited (Button's `members` 432 → 648) → `the committed catalog
 * matches the component definitions — stale: button.members`; the member count hard-coded in `catalogOf` →
 * `button: the catalog says 648 members, the projector builds 432`.
 */
import { componentDefs } from '@prism3/engine/components/index';
import { figmaAnatomySet } from '@prism3/engine/anatomy-figma';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { planTargets, defForTarget, SWAP_TARGET } from '../plugin/src/build-deps';
import { COMPONENT_CATALOG_DATA } from './src/state/component-catalog-data';
import { catalogOf, buildableSets, unbuildableSets, CATALOG_SWAP_TARGET, type CatalogEntry } from './src/state/component-catalog';
import { computeCatalog, render } from './gen-component-catalog';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log('\n1. The committed web copy is current');
const live = computeCatalog();
const committed = JSON.parse(JSON.stringify(COMPONENT_CATALOG_DATA)) as CatalogEntry[];
const stale: string[] = [];
for (const e of live) {
  const c = committed.find((x) => x.id === e.id);
  if (!c) { stale.push(`${e.id} (missing)`); continue; }
  for (const k of Object.keys(e) as (keyof CatalogEntry)[]) if (JSON.stringify(c[k]) !== JSON.stringify(e[k])) stale.push(`${e.id}.${k}`);
}
for (const c of committed) if (!live.some((e) => e.id === c.id)) stale.push(`${c.id} (no such definition)`);
if (!stale.length && JSON.stringify(committed.map((c) => c.id)) !== JSON.stringify(live.map((e) => e.id))) stale.push('(order)');
ok(stale.length === 0, `the committed catalog matches the component definitions${stale.length ? ` — stale: ${stale.slice(0, 6).join(', ')}; run npx tsx apps/studio/gen-component-catalog.ts --write` : ''}`);
ok(render(live).includes('export const COMPONENT_CATALOG_DATA'), 'the generator renders a module that exports COMPONENT_CATALOG_DATA');

console.log('\n2. Against the projector, run here (the oracle)');
ok(CATALOG_SWAP_TARGET === SWAP_TARGET, `the catalog projects with the plugin's swap target (${CATALOG_SWAP_TARGET}, build-deps.ts says ${SWAP_TARGET})`);
ok(committed.length === componentDefs.length && committed.length >= 20, `the catalog lists every definition (${committed.length} of ${componentDefs.length}, floor 20)`);
const project = (d: ComponentDef) => figmaAnatomySet(d, { swapTarget: SWAP_TARGET });
let projected = 0;
for (const d of componentDefs) {
  const e = committed.find((x) => x.id === d.id);
  if (!e) { ok(false, `${d.id}: listed in the catalog`); continue; }
  ok(e.name === d.name && e.category === d.category && e.summary === d.summary,
    `${d.id}: name, category and summary are the definition's own (${e.name}, ${e.category})`);
  ok(e.unit === (d.figmaProperties?.emitAsComponents ? 'components' : 'variants'), `${d.id}: counted in ${e.unit}`);
  let plans: ReturnType<typeof figmaAnatomySet> | null = null;
  try { plans = d.figmaProperties?.notStandalone ? null : project(d); } catch { plans = null; }
  if (!plans) {
    ok(!e.buildable && e.members === null, `${d.id}: not offered, as the projector or the definition says (reason ${JSON.stringify(e.reason)})`);
    continue;
  }
  projected++;
  ok(e.buildable && e.reason === null, `${d.id}: offered, with no reason`);
  ok(e.members === plans.length, `${d.id}: the catalog says ${e.members} members, the projector builds ${plans.length}`);
  // Nested sets, by the plugin's own reading of the plans.
  const want = [...new Set(planTargets(plans).map((t) => defForTarget(t, componentDefs)?.id).filter((x): x is string => !!x && x !== d.id))];
  ok(JSON.stringify(e.nests) === JSON.stringify(want), `${d.id}: nests ${want.join(', ') || 'nothing'}, as the plugin's dependency pre-build reads the plans — the catalog says ${e.nests.join(', ') || 'nothing'}`);
}
ok(projected >= 20, `the projector built ${projected} definitions here (floor 20)`);
// Legacy's projection used `FPO-default-icon` with no prefix; the swap name does not change a count.
const legacyButton = figmaAnatomySet(componentDefs.find((d) => d.id === 'button')!, { swapTarget: 'FPO-default-icon' }).length;
ok(committed.find((e) => e.id === 'button')?.members === legacyButton, `Button's count is the one the legacy picker showed (${legacyButton})`);

console.log('\n3. Literal arms, from the definitions\' documented shape');
const by = (id: string): CatalogEntry | undefined => committed.find((e) => e.id === id);
ok(by('button')?.members === 432 && by('button')?.unit === 'variants', `button: 432 variants since the #1223 split (${by('button')?.members} ${by('button')?.unit})`);
ok(JSON.stringify(by('button')?.nests) === '["icon","focus-ring","spinner"]', `button nests Icon, FocusRing and Spinner (${JSON.stringify(by('button')?.nests)})`);
ok(by('icon')?.unit === 'components' && by('spinner')?.unit === 'components', 'Icon and Spinner build as separate components (#1623)');
ok(JSON.stringify(by('focus-ring')?.nests) === '[]', 'FocusRing nests nothing');
ok((by('checkbox-group')?.nests ?? []).includes('checkbox-row') && !(by('checkbox-group')?.nests ?? []).includes('checkbox-control'),
  `CheckboxGroup nests CheckboxRow directly, not CheckboxControl (direct nests only: ${JSON.stringify(by('checkbox-group')?.nests)})`);
ok(committed.every((e) => e.nests.every((n) => n !== e.id && committed.some((x) => x.id === n))), 'no set nests itself, and every nested id is a set in the catalog');
ok(buildableSets(committed).length + unbuildableSets(committed).length === committed.length, 'buildable and not-offered partition the catalog');

console.log('\n4. The two reasons a set is not offered (planted: the corpus has no subject today)');
const button = componentDefs.find((d) => d.id === 'button')!;
const declared = { ...button, id: 'planted-declared', name: 'Planted', figmaProperties: { ...button.figmaProperties!, notStandalone: 'planted-declared: it binds no geometry of its own.' } } as ComponentDef;
const thrower = { ...button, id: 'planted-thrower', name: 'Thrower' } as ComponentDef;
const calls: string[] = [];
const planted = catalogOf([declared, thrower, button], (d) => { calls.push(d.id); if (d.id === 'planted-thrower') throw new Error('no anatomy'); return project(d); });
ok(planted[0].buildable === false && planted[0].reason === 'planted-declared: it binds no geometry of its own.' && planted[0].members === null,
  `a definition declaring notStandalone is not offered, with its own string as the reason (${JSON.stringify(planted[0].reason)})`);
ok(!calls.includes('planted-declared'), 'a definition declaring notStandalone is withheld BEFORE projecting (the projection would succeed)');
ok(planted[1].buildable === false && planted[1].reason === null && planted[1].nests.length === 0, 'a definition the projector cannot build is not offered, with a null reason');
ok(planted[2].buildable && planted[2].members === 432, 'the rest of the list is unaffected');
ok(JSON.stringify(unbuildableSets(planted).map((e) => e.id)) === '["planted-declared","planted-thrower"]', 'unbuildableSets lists both, in definition order');

console.log(`\n${executed - failed}/${executed} component catalog assertions passed.`);
if (failed) process.exit(1);
