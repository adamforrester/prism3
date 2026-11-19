/**
 * #3770 — A FILE BUILT BEFORE BRANDMARK WAS PROVIDERLOGO (#3148), THROUGH THE REAL `main.ts`: Update file's read, its
 * check scoped as the panel scopes it, then `update-sets`, each posted as the panel posts it.
 *
 *   npx tsx apps/plugin/test-update-renamed-main.ts
 *
 * THE OWNER'S REPORT (the template file, 2026-11-13, and again after a rebuild on 2026-11-17): Wallet button and Sign-in
 * button read "Can't update yet — it needs Provider logo, which this file doesn't have", and Card number field "it swaps
 * to Provider logo", in a file that holds the provider logos. #3772 fixed a theme-blocked provider; this is the other
 * way to those three rows. The file's marks were built before #3148, so they are `brand-mark/<kind>/<name>`. The update
 * finds them under that id and renames them in place (`readSingleView`), but only when provider-logo is in the run, and
 * Update file runs only the sets its read calls due. That read found no component named `provider-logo/…`, so the set
 * read as absent, and the ledger's entry under `brand-mark` named no current def. Provider logo was never due, never
 * checked, and nothing in the run added the names the three sets nest or swap to.
 *
 * THE WORLD, the file as it stood between #2343 PR 3 (2026-10-27) and #3148 (2026-10-30): every provider mark there was
 * then, `brand-mark/<value>` (no `button/` mark yet: #3174 added those on 2026-10-31); Wallet button nesting the wallet
 * logos, Sign-in button its provider glyphs and Card number field swapping to the generic card, each by its
 * `brand-mark/` name. The ledger records all four as built then, provider-logo under `brand-mark`.
 *
 * THE HOST is `test-update-kept-main.ts`'s: the shared component shim, strict (#3215), plus the document's pages, data and
 * UI channel as new properties. Each page searches its own nodes, so the run's read is a page at a time, as Figma's.
 *
 * INDEPENDENCE (docs/34): the names the file lacks and the rows are literals; the panel's own functions scope the check
 * (`dueSetsOf`) and word the rows (`UPDATE_COPY.checked`), over what `main.ts` posted. What is read after the run is the
 * shim's own nodes, never the apply's report.
 *
 * Mutations this fails by name:
 *   · `readPresent` back to the current id alone (`[d.id, ...formerDefIds(d.id)]` → `[d.id]`) → `renamed/present`;
 *   · `dueOf`'s former-id arm removed → `renamed/at open`, `renamed/due`, and through them `renamed/check` and `renamed/one run`;
 *   · `ledgerDue`'s `formerEntry` dropped → `renamed/at open`;
 *   · `readPresent`'s rename for one def alone (`formerDefIds(d.id)` → `d.id === 'provider-logo' ? formerDefIds(d.id) : []`)
 *     → `renamed/tab present` (#2759's `tab` → `tab-item`, the other def rename the ledger declares).
 *
 * THE TAB SET: beside the marks the file holds today's Tab item drawn under the name it had before #2759, `tab`, a
 * component set, recorded in the ledger under `tab`. It is the second def rename `formerDefIds` walks, and the one shaped
 * as a set (`names.has(id)`), where provider-logo's marks are standalone components (`${id}/` prefix).
 */
import { makeShim } from './component-shim';
import type { Node } from './component-shim';
import { componentDefs, figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, type AnatomyPlan } from '@prism3/engine/components';
import { SWAP_TARGET } from './src/build-deps';
import { materializeForBrand } from './src/brand-def';
import { applyComponentPlan } from './src/write-components';
import { entryFor, recordSets } from './src/as-built-ledger';
import { catalogOf, CATALOG_SWAP_TARGET } from '../studio/src/state/component-catalog';
import { displayNameOf } from '../studio/src/state/component-groups';
import { dueSetsOf, UPDATE_COPY, type FileSets } from '../studio/src/state/update-file';
import { leafForDef } from './src/file-taxonomy';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log('Update file on a file built before BrandMark was ProviderLogo, through the real main.ts (#3770)');

const NESTING = ['wallet-button', 'sign-in-button', 'card-number-field'] as const;
const IDS = ['provider-logo', ...NESTING] as const;
const TAB = 'tab-item';
const plansNow = new Map(IDS.map((id) => [id, figmaAnatomySet(materializeForBrand(componentDefs.find((d) => d.id === id)!, null), { swapTarget: SWAP_TARGET })] as const));
type PlanNode = AnatomyPlan['root'];
/** A plan as it was drawn before #3148: each provider mark it names under `brand-mark/`, and (before #3174) each wallet
 *  button's styled mark the wallet's own logo. */
const LOGO_OF: Record<string, string> = { 'apple-pay': 'logo/apple-pay', 'google-pay': 'logo/google-pay', paypal: 'logo/paypal-wordmark', venmo: 'logo/venmo', 'shop-pay': 'logo/shop-pay' };
const logoFor = (button: string): string => {
  const key = Object.keys(LOGO_OF).find((k) => button.startsWith(`provider-logo/button/${k}`));
  if (!key) throw new Error(`fixture: no wallet logo for ${button}`);
  return `provider-logo/${LOGO_OF[key]}`;
};
const olden = (n: PlanNode): PlanNode => {
  const nest = n.nestTarget?.startsWith('provider-logo/button/') ? logoFor(n.nestTarget) : n.nestTarget;
  return JSON.parse(JSON.stringify({ ...n, ...(nest ? { nestTarget: nest } : {}), children: n.children?.map(olden) }).replaceAll('"provider-logo/', '"brand-mark/')) as PlanNode;
};
const isButton = (p: AnatomyPlan): boolean => String(p.coord.name).startsWith('button/');
const marksWas = plansNow.get('provider-logo')!.filter((p) => !isButton(p)).map((p) => ({ ...p, component: 'brand-mark', root: olden(p.root) }));
const plansWas = new Map<string, AnatomyPlan[]>(NESTING.map((id) => [id, plansNow.get(id)!.map((p) => ({ ...p, root: olden(p.root) }))]));
/** Tab item as the file holds it: a set named `tab`, its def's id before #2759 (the set's name in Figma is the def id). */
const tabWas = figmaAnatomySet(materializeForBrand(componentDefs.find((d) => d.id === TAB)!, null), { swapTarget: SWAP_TARGET }).map((p) => ({ ...p, component: 'tab' }));
const all = [...plansNow.values(), ...plansWas.values(), marksWas, tabWas].flat();

// What the three sets need, read off today's plans, against the literal list below.
const planComps = (n: PlanNode): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.nestOverrides ?? []).filter((o) => o.type === 'INSTANCE_SWAP').map((o) => o.value),
  ...((n.children ?? []) as PlanNode[]).flatMap(planComps),
];
const needs = (id: string): string[] => [...new Set(plansNow.get(id)!.flatMap((p) => planComps(p.root)))].filter((n) => n.startsWith('provider-logo/')).sort();
ok(needs('sign-in-button').join(',') === 'provider-logo/provider/apple,provider-logo/provider/facebook,provider-logo/provider/facebook-blue,provider-logo/provider/google'
  && needs('card-number-field').join(',') === 'provider-logo/payment/generic' && needs('wallet-button').filter((n) => n.startsWith('provider-logo/button/')).length === 11,
  `fixture: Sign-in button nests 4 provider glyphs, Card number field swaps to the generic card, Wallet button nests 11 button marks (${JSON.stringify(NESTING.map((id) => needs(id).length))})`);

/* ── the host ─────────────────────────────────────────────────────────────────────────────────────────────── */

type Criteria = { types?: string[]; sharedPluginData?: { namespace: string; keys: string[] } };
type ShimPage = { id: string; name: string; type: 'PAGE'; isPageDivider: boolean; parent: unknown; children: Node[]; appendChild(c: Node): void; insertChild(i: number, c: Node): void; findOne(p: (n: unknown) => boolean): unknown; findAllWithCriteria(c: Criteria): Node[] };
const below = (n: { children?: unknown }): Node[] => ((n.children as Node[] | undefined) ?? []).flatMap((c) => [c, ...below(c)]);
const pages: ShimPage[] = [];
const detach = (c: Node): void => { const p = c.parent as { children?: Node[] } | null | undefined; const i = p?.children?.indexOf(c) ?? -1; if (i >= 0) p!.children!.splice(i, 1); };
const mkPage = (name: string): ShimPage => {
  const p: ShimPage = {
    id: `PAGE:${pages.length + 1}`, name, type: 'PAGE', isPageDivider: false, parent: null, children: [],
    appendChild(c) { detach(c); this.children.push(c); c.parent = this as unknown as Node; },
    insertChild(at, c) { detach(c); c.parent = this as unknown as Node; this.children.splice(Math.max(0, Math.min(at, this.children.length)), 0, c); },
    findOne(pred) { return this.children.find(pred) ?? null; },
    // A page's own search, as Figma's: its real nodes, by type. A COMPONENT is handed out instanceable, as every Figma
    // ComponentNode is: the shim installs `createInstance` on a live component as its root search finds it, so that
    // search runs first. Without it a mark the update adds mid-run (provider-logo's button marks) could not be swapped
    // to by the set after it, an artifact of the shim, not the host.
    findAllWithCriteria(c) {
      if (c.types?.includes('COMPONENT')) shim.root.findAllWithCriteria({ types: ['COMPONENT'] });
      return below(this).filter((n) => (!c.types || c.types.includes(String(n.type)))
        && (!c.sharedPluginData || c.sharedPluginData.keys.some((k) => !!(n as any).getSharedPluginData?.(c.sharedPluginData!.namespace, k))));
    },
  };
  pages.push(p);
  return p;
};
const page = mkPage('Components');
const shim = makeShim({
  vars: [...new Set([...all.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0'])],
  styles: [...new Set(all.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(all.flatMap((p) => planEffectStyles(p.root)))],
  page, pages: () => pages, liveRoot: true, liveComponents: true, identities: true, scaleConstrained: true,
}) as Record<string, any>;
const root = shim.root as Record<string, unknown>;
const pluginData = new Map<string, string>();
const sharedData = new Map<string, string>();
Object.defineProperty(root, 'children', { get: () => pages });
Object.assign(root, {
  name: 'template file', type: 'DOCUMENT',
  insertChild: (index: number, child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.splice(Math.max(0, Math.min(index, pages.length)), 0, child); child.parent = root; },
  appendChild: (child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.push(child); child.parent = root; },
  getSharedPluginData: (ns: string, k: string) => sharedData.get(`${ns}:${k}`) ?? '',
  setSharedPluginData: (ns: string, k: string, v: string) => { sharedData.set(`${ns}:${k}`, v); },
  getPluginData: (k: string) => pluginData.get(k) ?? '',
  setPluginData: (k: string, v: string) => { pluginData.set(k, v); },
});
for (const p of pages) p.parent = root;
const posted: any[] = [];
const empty = async () => [];
Object.assign(shim, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  createPage: () => { const p = mkPage(''); p.parent = root; return p; },
  setCurrentPageAsync: async () => undefined,
  listAvailableFontsAsync: empty,
  getLocalPaintStylesAsync: empty,
  getLocalGridStylesAsync: empty,
});

// What the sets nest or swap to that is not a provider mark (the focus ring, the icons), as live components on a page of
// their own, as `test-update-kept-main.ts` holds them.
const deps = mkPage('Dependencies');
for (const name of [...new Set([SWAP_TARGET, 'focus-ring', ...all.flatMap((p) => planComps(p.root))])].filter((n) => !n.startsWith('provider-logo/') && !n.startsWith('brand-mark/'))) {
  const c = shim.createComponentFromNode(shim.createFrame());
  c.name = name;
  deps.appendChild(c);
}
deps.parent = root;

// The file as it stood: the marks first, on a page of their own (the sets nest them), then the three sets.
const comps = (): string[] => pages.flatMap((p) => below(p)).filter((n) => n.type === 'COMPONENT' && n.parent?.type !== 'COMPONENT_SET').map((n) => String(n.name));
const icons = mkPage('↳ Icons & assets');
icons.parent = root;
{
  const r = await applyComponentPlan(marksWas, shim as never, { emitAsComponents: true });
  if (r.misses.length) throw new Error(`premise: the marks built with ${r.misses.length} miss(es): ${r.misses[0]}`);
  const built = page.children.filter((n) => n.type === 'COMPONENT' && String(n.name).startsWith('brand-mark/'));
  page.children.splice(0, page.children.length, ...page.children.filter((n) => !built.includes(n)));
  for (const c of built) { icons.children.push(c); c.parent = icons as unknown as Node; }
}
for (const [id, plans] of [...NESTING.map((id) => [id, plansWas.get(id)!] as const), ['tab', tabWas] as const]) {
  const r = await applyComponentPlan(plans, shim as never);
  if (r.misses.length) throw new Error(`premise: ${id} built with ${r.misses.length} miss(es): ${r.misses[0]}`);
}
const setNames = (): string[] => pages.flatMap((p) => below(p)).filter((n) => n.type === 'COMPONENT_SET').map((n) => String(n.name));
const inSets = (): string[] => pages.flatMap((p) => below(p)).filter((n) => n.type === 'COMPONENT' && n.parent?.type === 'COMPONENT_SET').map((n) => String(n.name));
// As the template file holds them (read 2026-11-17): the marks are standalone components, not a set, and none is in one;
// `button/apple-pay-black` is under neither name, so the update adds it.
ok(comps().filter((n) => n.startsWith('brand-mark/')).length === 75 && !comps().some((n) => n.startsWith('provider-logo/'))
  && !setNames().some((n) => /^(brand-mark|provider-logo)\b/.test(n)) && !inSets().some((n) => /^(brand-mark|provider-logo)\//.test(n))
  && !comps().some((n) => /^(brand-mark|provider-logo)\/button\/apple-pay-black$/.test(n)),
  `fixture: the file holds 75 standalone marks, every one named brand-mark/…, none provider-logo/…, none in a set, no button/apple-pay-black under either name (${comps().filter((n) => n.startsWith('brand-mark/')).length})`);
ok(setNames().includes('tab') && !setNames().includes(TAB), `fixture: the file holds Tab item as a set named tab, none named tab-item (${JSON.stringify(setNames())})`);
// The ledger as the builds then recorded it: provider-logo under the id it had, `brand-mark`; the three sets each under
// a def that has moved since (their own drawing changed too, #3174 and after).
const moved = (id: string) => ({ ...entryFor(materializeForBrand(componentDefs.find((d) => d.id === id)!, null)), def: 'built-before-3148' });
recordSets(root as never, { 'brand-mark': moved('provider-logo'), tab: moved(TAB), ...Object.fromEntries(NESTING.map((id) => [id, moved(id)])) });

const g = globalThis as Record<string, unknown>;
g.figma = shim; g.__html__ = ''; g.PRISM3_BUILD = '2026-11-17T00:00:00Z tree-test0000';
const log = console.log;
console.log = (...a: unknown[]) => { if (typeof a[0] === 'string' && a[0].startsWith('[prism3')) return; log(...a); };

await import('./src/main');

const realTimeout = globalThis.setTimeout;
const send = async (msg: unknown, kinds: readonly string[], ms = 120_000): Promise<any> => {
  posted.length = 0;
  (shim.ui as { onmessage: (m: unknown) => void }).onmessage(msg);
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = posted.find((m) => m?.type === 'refused' || kinds.includes(m?.type));
    if (r) return r;
    await new Promise((res) => realTimeout(res, 2));
  }
  return null;
};
/** The reads `main.ts` posts as the plugin opens (#3110): the ledger's alone first (`partial`), then the file's, then the
 *  hand-edit pass. Waited out whole, so no later request meets the open's work part way. */
posted.length = 0;
(shim.ui as { onmessage: (m: unknown) => void }).onmessage({ type: 'ui-ready' });
const atOpen = await (async () => {
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) {
    if (posted.some((m) => m?.type === 'hand-edits' && m.done === true)) return posted.find((m) => m?.type === 'file-sets' && m.partial === true) ?? null;
    await new Promise((res) => realTimeout(res, 2));
  }
  return null;
})();
ok(atOpen?.present?.includes('provider-logo') && atOpen.due?.['provider-logo']?.state === 'due',
  `renamed/at open: the read at open, from the ledger alone, names provider-logo and reads it due by its entry under brand-mark (${JSON.stringify([atOpen?.present, atOpen?.due?.['provider-logo']])})`);

const placeOf = (id: string) => { const at = leafForDef(id); return at ? { page: at.leaf.page, section: at.section.header } : null; };
const catalog = catalogOf(componentDefs, (d) => figmaAnatomySet(d, { swapTarget: CATALOG_SWAP_TARGET }), placeOf);
const nameOf = (id: string): string => displayNameOf(catalog, id);

// 1. The full read: provider-logo is in the file, under its earlier id, and due, since the update renames it.
const f0 = await send({ type: 'file-sets-request' }, ['file-sets']) as FileSets & { type: string };
ok(!!f0?.present?.includes('provider-logo'), `renamed/present: main.ts reads provider-logo as in the file, its marks under brand-mark/ (${JSON.stringify(f0?.present)})`);
ok(f0?.due?.['provider-logo']?.state === 'due', `renamed/due: main.ts reads provider-logo due, its ledger entry under brand-mark (${JSON.stringify(f0?.due?.['provider-logo'])})`);
ok(!!f0?.present?.includes(TAB) && f0?.due?.[TAB]?.state === 'due',
  `renamed/tab present: main.ts reads tab-item as in the file, its set named tab, and due by its entry under tab (${JSON.stringify([f0?.present?.includes(TAB), f0?.due?.[TAB]])})`);

// 2. The check, scoped as Update file scopes it: the due sets.
const scope = f0 ? dueSetsOf(catalog, f0) : [];
const c0 = await send({ type: 'update-check-request', defs: scope }, ['update-check']);
const row = (def: string): string => { const c = (c0?.sets ?? []).find((x: any) => x.def === def); return c ? UPDATE_COPY.checked(c, true, nameOf) : 'not checked'; };
// The owner's rows, literal: none of the three may read these.
const NEEDS = 'Can’t update yet — it needs Provider logo, which this file doesn’t have. Tick Provider logo on Components first.';
const SWAPS = 'Can’t update yet — it swaps to Provider logo, which this file doesn’t have. Tick Provider logo on Components first.';
const blocked = (c0?.sets ?? []).filter((c: any) => c.blocked).map((c: any) => [c.def, row(c.def)]);
ok(scope.includes('provider-logo') && [...NESTING, TAB].every((id) => scope.includes(id)) && blocked.length === 0 && ![row('wallet-button'), row('sign-in-button')].includes(NEEDS) && row('card-number-field') !== SWAPS,
  `renamed/check: the check takes provider-logo with the three sets, and none of the five reads blocked (${JSON.stringify({ scope, blocked })})`);

// 3. The update, as Update file posts it, then the file as it stands.
const u = await send({ type: 'update-sets', defs: scope, previewHash: c0?.previewHash, handEdits: 'keep' }, ['component-update-result']);
const after = comps();
const want = ['provider-logo/payment/generic', 'provider-logo/provider/apple', 'provider-logo/provider/facebook-blue', 'provider-logo/button/apple-pay-black'];
// The one warning allowed is the shim's own: it sizes a vector from the path's numbers read as alternating x and y, so a
// non-square mark reads back as drift Figma's importer does not have (`test-update-apply.ts`, THE PROVIDER LOGOS).
const lines: string[] = u?.lines ?? [];
const shimDrift = (l: string): boolean => /^provider-logo: \d+ fields still differ from what Prism3 expects — /.test(l);
ok(/^[✓⚠] Updated 5 sets/.test(String(u?.headline)) && lines.includes('provider-logo: 75 updated in place, 11 added.')
  && [...NESTING, TAB].every((id) => lines.some((l) => new RegExp(`^${id}: \\d+ updated in place\\.$`).test(l)))
  && !lines.some((l) => /stopped|refused|can’t|not in this file/i.test(l)) && lines.filter((l) => / still differ /.test(l)).every(shimDrift)
  && !after.some((n) => n.startsWith('brand-mark/')) && setNames().includes(TAB) && !setNames().includes('tab') && want.every((n) => after.includes(n)) && after.filter((n) => n.startsWith('provider-logo/')).length === 86,
  `renamed/one run: one update renames the 75 marks in place, adds the 11 button marks, then updates the three sets and renames the tab set to tab-item in place, no brand-mark/ or tab left (${JSON.stringify({ headline: u?.headline, lines: lines.slice(0, 5).map((l) => l.slice(0, 80)), brandMark: after.filter((n) => n.startsWith('brand-mark/')).length, sets: setNames(), providerLogo: after.filter((n) => n.startsWith('provider-logo/')).length })})`);
const f1 = await send({ type: 'file-sets-request' }, ['file-sets']);
ok([...IDS, TAB].every((id) => f1?.due?.[id]?.state === 'current'),
  `renamed/settled: after the run main.ts reads all five sets current (${JSON.stringify(Object.fromEntries([...IDS, TAB].map((id) => [id, f1?.due?.[id]?.state])))})`);

console.log(`${failed ? `\n${failed} failed` : '\nall passed'} — ${executed} assertions executed`);
process.exit(failed ? 1 : 0);
