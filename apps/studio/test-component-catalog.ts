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
 * (Button is 576 variants since #2350's flush text members, 432 after the #1223 split, and nests Icon, FocusRing and Spinner; Icon and Spinner build as
 * separate components, #1623), so a generator that agreed with itself while reading the wrong field still fails by
 * name. The two reasons a set is not offered have no subject in the corpus today (all build), so they are held on
 * planted definitions.
 *
 * Mutations this fails by name: the committed copy edited (Button's `members` 576 → 648) → `the committed catalog
 * matches the component definitions — stale: button.members`; the member count hard-coded in `catalogOf` →
 * `button: the catalog says 648 members, the projector builds 576`; `padding-x-visual` added to `SPACING_SHOWN` →
 * `C2: button at comfortable shows the engine's padding and gap px`; the spacing read at comfortable whatever the
 * density → `C2: button at compact shows the engine's padding and gap px`.
 */
import { componentDefs } from '@prism3/engine/components/index';
import { figmaAnatomySet, applySpacingDensity } from '@prism3/engine/anatomy-figma';
import { densitySpacingKeys, type ComponentDef } from '@prism3/engine/component-schema';
import { sizeRefPx, componentSizes } from '@prism3/engine/scale';
import { planTargets, defForTarget, SWAP_TARGET } from '../plugin/src/build-deps';
import { COMPONENT_CATALOG_DATA } from './src/state/component-catalog-data';
import { catalogOf, buildableSets, unbuildableSets, CATALOG_SWAP_TARGET, type CatalogEntry } from './src/state/component-catalog';
import { computeCatalog, render } from './gen-component-catalog';
import { chosenOf, setsView } from './src/preview/sections/component-sets';
import type { SetBuild } from './src/state/host-session';

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
ok(by('button')?.members === 576 && by('button')?.unit === 'variants', `button: 576 variants since #2350's flush text members (${by('button')?.members} ${by('button')?.unit})`);
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
ok(planted[2].buildable && planted[2].members === 576, 'the rest of the list is unaffected');
ok(JSON.stringify(unbuildableSets(planted).map((e) => e.id)) === '["planted-declared","planted-thrower"]', 'unbuildableSets lists both, in definition order');

console.log('\n5. The spacing each set states (UI redesign S8.2): its density-following keys and their comfortable steps');
// Oracle: the schema's own `densitySpacingKeys` (the expansion `applySpacingDensity` builds with) and the definition's
// `tokens`, read here; the catalog restates the expansion so the web bundle never carries the schema module.
for (const d of componentDefs) {
  const e = by(d.id);
  const want = densitySpacingKeys(d).map((key) => ({ key, ref: String(d.tokens[key]) }));
  ok(JSON.stringify(e?.spacing) === JSON.stringify(want), `${d.id}: states ${want.length} density-following spacing key(s), as the schema expands them — the catalog says ${e?.spacing.length ?? 'nothing'}`);
}
ok(JSON.stringify(by('button')?.spacing.find((x) => x.key === 'size.medium.padding-x')) === '{"key":"size.medium.padding-x","ref":"space.200"}',
  `button: medium padding-x is space.200 at comfortable (${JSON.stringify(by('button')?.spacing.find((x) => x.key === 'size.medium.padding-x'))})`);

console.log('\n6. What the Components page says of each set (setsView, S8.2), and what it offers for building (G4, G9)');
// The px are the space ladder's own (8px base: space.200 = 16, space.150 = 12, space.100 = 8, space.075 = 6), typed
// here; density moves each step one along the ladder (compact: 16 → 12).
const spacePx = sizeRefPx(componentSizes('comfortable', 8));
const last = new Map<string, SetBuild>([['button', 'ok'], ['tag', 'issues'], ['badge', 'failed']]);
const view = setsView(committed, { density: 'comfortable', spacePx, plugin: true, lastOf: (id) => last.get(id) });
const v = (id: string) => view.find((x) => x.id === id);
ok(v('button')?.parts === '576 parts' && v('icon')?.parts === '44 components' && v('spinner')?.parts === '4 components',
  `parts: Button "${v('button')?.parts}", Icon "${v('icon')?.parts}", Spinner "${v('spinner')?.parts}" (want 576 parts, 44 components, 4 components)`);
ok(v('button')?.contains === 'Contains Icon, FocusRing, Spinner' && v('focus-ring')?.contains === 'Contains no other set',
  `contains: by the nested sets' names ("${v('button')?.contains}", "${v('focus-ring')?.contains}")`);
ok(JSON.stringify(v('button')?.spacing) === JSON.stringify(['Small: padding-x 16 · padding-y 6 · gap 8', 'Medium: padding-x 16 · padding-y 8 · gap 8', 'Large: padding-x 24 · padding-y 8 · gap 12']),
  `spacing at comfortable: Button's three sizes in px (${JSON.stringify(v('button')?.spacing)})`);
const compact = setsView(committed, { density: 'compact', spacePx, plugin: true, lastOf: () => undefined }).find((x) => x.id === 'button');
ok(compact?.spacing[1] === 'Medium: padding-x 12 · padding-y 6 · gap 6',
  `spacing at compact: one step down the ladder, gaps floored at 4 (${JSON.stringify(compact?.spacing[1])})`);
ok(JSON.stringify(v('focus-ring')?.spacing) === '[]', 'a set whose spacing follows no density states none');
ok(v('button')?.last === 'Built just now' && v('tag')?.last === 'Built with problems' && v('badge')?.last === 'Build failed' && v('select')?.last === 'Not built in this session',
  `G9, C1: this session's result per set — Button "${v('button')?.last}", Tag "${v('tag')?.last}", Badge "${v('badge')?.last}", Select "${v('select')?.last}"`);
const web = setsView(committed, { density: 'comfortable', spacePx, plugin: false, lastOf: (id) => last.get(id) });
ok(web.every((x) => x.last === null), 'the web states no build result: nothing builds there');
ok(view.every((x) => x.offered === committed.find((e) => e.id === x.id)?.buildable), 'every set that builds is offered, and only those');
// G4, on the planted catalog (section 4): listed, with its reason, and never offered.
const pv = setsView(planted, { density: 'comfortable', spacePx, plugin: true, lastOf: () => 'ok' });
ok(pv.length === 3 && pv[0].offered === false && pv[1].offered === false,
  `G4: a set that can't be built is listed and not offered — planted-declared offered ${pv[0].offered}, planted-thrower offered ${pv[1].offered}`);
ok(pv[0].reason === "Can't be built yet: it binds no geometry of its own." && pv[1].reason === "Can't be built yet: the Figma build can't read its definition yet",
  `G4: each says why, the definition's own words with the id lead stripped, or the page's (${JSON.stringify(pv[0].reason)}, ${JSON.stringify(pv[1].reason)})`);
ok(pv[0].parts === null && pv[0].last === null, 'G4: a set that can\'t be built states no part count and no build result');
ok(chosenOf(pv, 'planted-declared') === 'button' && chosenOf(pv, null) === 'button' && chosenOf(pv.slice(0, 2), 'planted-declared') === null,
  `G4: the Build button never names a set that can't be built (chose ${chosenOf(pv, 'planted-declared')}, then ${chosenOf(pv.slice(0, 2), 'planted-declared')} with none offered)`);
ok(chosenOf(view, 'tag') === 'tag', 'the chosen set holds while it is offered');

console.log('\n7. C2: the set list shows each size\'s padding and gap only, at the px the ENGINE builds at each density');
// Oracle: the engine's own density output, `applySpacingDensity(def, density)` (the def a build projects), read over
// the schema's expansion and resolved on the space ladder; NOT `densitySpacingStep`, which setsView calls. The keys
// shown are typed here as the owner's decision words them (C2 A, "only the padding and gap values"); every leaf name
// the corpus uses is classified below, so a def adding a new spacing name fails here until it is placed.
const SHOWN = ['gap', 'pad-x', 'pad-y', 'padding-x', 'padding-y'];
const HIDDEN = ['check-gap', 'dismissible.visible-gap', 'padding-x-visual', 'select.gap', 'select.padding-end'];
const leaf = (k: string): [string, string] => { const m = /^size\.([^.]+)\.(.+)$/.exec(k); return m ? [m[1][0].toUpperCase() + m[1].slice(1), m[2]] : ['', k]; };
const names = new Set(componentDefs.flatMap((d) => densitySpacingKeys(d).map((k) => leaf(k)[1])));
ok([...names].every((n) => SHOWN.includes(n) || HIDDEN.includes(n)), `C2: every spacing name is classified shown or hidden (unclassified: ${JSON.stringify([...names].filter((n) => !SHOWN.includes(n) && !HIDDEN.includes(n)))})`);
for (const density of ['comfortable', 'compact', 'spacious'] as const) {
  const shown = setsView(committed, { density, spacePx, plugin: true, lastOf: () => undefined });
  for (const d of componentDefs) {
    const built = applySpacingDensity(d, density);
    const lines = new Map<string, string[]>();
    for (const k of densitySpacingKeys(d)) {
      const [size, n] = leaf(k);
      if (!SHOWN.includes(n)) continue;
      lines.set(size, [...(lines.get(size) ?? []), `${n} ${spacePx(String(built.tokens[k]))}`]);
    }
    const want = [...lines].map(([size, parts]) => `${size ? `${size}: ` : ''}${parts.join(' · ')}`);
    const got = shown.find((x) => x.id === d.id)?.spacing;
    ok(JSON.stringify(got) === JSON.stringify(want), `C2: ${d.id} at ${density} shows the engine's padding and gap px (${JSON.stringify(got)} vs ${JSON.stringify(want)})`);
  }
}

console.log(`\n${executed - failed}/${executed} component catalog assertions passed.`);
if (failed) process.exit(1);
