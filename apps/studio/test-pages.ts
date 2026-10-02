/**
 * The shell's page data, checked (UI redesign S1.3, `docs/superpowers/ui-redesign/implementation-plan.md`
 * §3.7). Concept v6's `build-v6.mjs` checks 1–3, ported to Node against the product's `src/shell/pages.ts`.
 *
 *   npx tsx apps/studio/test-pages.ts
 *
 *   1. COVERAGE. Every manifest lever has exactly one home row; no row names a key the manifest lacks; a
 *      lever's tier (a section marked `advanced`, or not) follows the manifest's `advanced` flag, except
 *      on the pages that show every lever, `FIRST_CLASS` below (Layout from Q4; Surfaces & fills and
 *      Interactive from V10 and the v6 review's #2).
 *   2. HOME VIEWS (V1, V12, IA-1). Every tab without sub-pages and every sub-page declares exactly one
 *      home view, from `VIEWS`; a tab with sub-pages declares none and has no sections of its own; no
 *      section declares one; no home is an Inspect view; and every view is some page's home.
 *   3. ROLES (V2, the v6 review's #3). Every color role the default theme emits belongs to exactly one
 *      Color sub-page's Roles families, by the longest prefix that matches it; no prefix is declared
 *      twice, and none matches nothing. Surfaces & fills and Interactive carry families; Palettes does not.
 *
 * The duplicate-key check `build-v6.mjs` ran with a second JSON parser is `typecheck`'s here: a key
 * written twice in one object literal is TS1117.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is `DOMAINS`, `VIEWS` and `INSPECT` in
 * `src/shell/pages.ts`. The oracles are read from the ENGINE, never from the page data: the lever list
 * from the committed `packages/engine/schema/lever-manifest.json`, the color roles from the committed
 * `packages/engine/out/prism3.tokens.json`. The decisions are literals typed here: `FIRST_CLASS`,
 * `ROLES_PAGES`, `NO_ROLES`, and the tab and sub-page lists IA-1 names. A page's own data cannot widen
 * any of them.
 *
 * Mutations this fails by name (each run after a commit):
 *   · `radiusHairline` removed from the data → `manifest keys with no home: radiusHairline`;
 *   · a `home` given to the Motion section → `section declares a home view: Depth & motion › Motion`;
 *   · `veil` dropped from Surfaces & fills' roles → `color roles in no Color sub-page's Roles matrix: veil…`;
 *   · `field` put back on Interactive (S4c, owner decision Q29) → `every emitted field.* role (4) belongs to
 *     Surfaces & fills — on another page: field.border.hover → Interactive, …`;
 *   · `strictInteractiveContrast` put behind Show advanced →
 *     `strictInteractiveContrast: … placed advanced in Color › Interactive › … (every lever on this page is shown)`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMAINS, INSPECT, VIEWS, type Domain, type PageData } from './src/shell/pages';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = JSON.parse(readFileSync(join(REPO, 'packages/engine/schema/lever-manifest.json'), 'utf8')) as { levers: { key: string; advanced?: boolean }[] };
const tokens = JSON.parse(readFileSync(join(REPO, 'packages/engine/out/prism3.tokens.json'), 'utf8'));

// ── the decisions, as literals ─────────────────────────────────────────────────────────────────────
/** IA-1's tabs and Color's sub-pages, in order. */
const IA_TABS = ['brand', 'color', 'type', 'shape', 'depth', 'layout', 'components'];
const IA_COLOR = ['palettes', 'fills', 'interactive'];
/** Pages where the manifest flag does not decide the tier: every lever is shown (Q4, V10, v6 review #2). */
const FIRST_CLASS = ['layout', 'color/fills', 'color/interactive'];
/** Which Color sub-pages carry role families, and which must not (v6 review #3: palettes are primitives). No
 *  Roles toggle is drawn from them (owner decision Q31); they hold the one-page-per-role coverage below. */
const ROLES_PAGES = ['fills', 'interactive'];
const NO_ROLES = ['palettes'];

type Page = PageData & { key: string; name: string };
const pagesOf = (d: Domain): Page[] => ('subpages' in d
  ? d.subpages.map((sp) => ({ ...sp, key: `${d.id}/${sp.id}`, name: `${d.label} › ${sp.label}` }))
  : [{ ...d, key: d.id, name: d.label }]);
const DATA = DOMAINS as readonly Domain[];
const PAGES = DATA.flatMap(pagesOf);

ok(JSON.stringify(DATA.map((d) => d.id)) === JSON.stringify(IA_TABS), `the tabs are IA-1's, in order: ${IA_TABS.join(', ')} — read ${DATA.map((d) => d.id).join(', ')}`);
const color = DATA.find((d) => d.id === 'color');
const colorSubs = color && 'subpages' in color ? color.subpages.map((s) => s.id) : [];
ok(JSON.stringify(colorSubs) === JSON.stringify(IA_COLOR), `Color's sub-pages are IA-1's, in order: ${IA_COLOR.join(', ')} — read ${colorSubs.join(', ')}`);

// ── 1. coverage ────────────────────────────────────────────────────────────────────────────────────
console.log('\n1. Coverage (oracle: packages/engine/schema/lever-manifest.json)');
const manifestKeys = manifest.levers.map((l) => l.key);
ok(manifestKeys.length >= 40, `the manifest lists ${manifestKeys.length} levers (floor 40, so an empty read fails)`);
const seen = new Map<string, string[]>();
const tierWrong: string[] = [];
for (const p of PAGES) {
  for (const s of p.sections) for (const row of s.rows) for (const k of row.keys ?? []) {
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k)!.push(`${p.name} › ${s.title}`);
    const lev = manifest.levers.find((l) => l.key === k);
    if (!lev) continue;
    const wantAdv = FIRST_CLASS.includes(p.key) ? false : !!lev.advanced;
    if (!!s.advanced !== wantAdv) tierWrong.push(`${k}: manifest advanced=${!!lev.advanced}, placed ${s.advanced ? 'advanced' : 'everyday'} in ${p.name} › ${s.title}${FIRST_CLASS.includes(p.key) ? ' (every lever on this page is shown)' : ''}`);
  }
}
const missing = manifestKeys.filter((k) => !seen.has(k));
const dup = [...seen].filter(([, where]) => where.length > 1);
const unknown = [...seen.keys()].filter((k) => !manifestKeys.includes(k));
ok(missing.length === 0, `every manifest lever has a home${missing.length ? ` — manifest keys with no home: ${missing.join(', ')}` : ` (${manifestKeys.length} placed)`}`);
ok(dup.length === 0, `no manifest lever has two homes${dup.length ? ` — manifest keys with more than one home: ${dup.map(([k, w]) => `${k} → ${w.join(' + ')}`).join('; ')}` : ''}`);
ok(unknown.length === 0, `no row names a key the manifest lacks${unknown.length ? ` — homes naming keys the manifest does not have: ${unknown.join(', ')}` : ''}`);
ok(tierWrong.length === 0, `each lever's tier follows the manifest flag, outside ${FIRST_CLASS.join(', ')}${tierWrong.length ? ` — advanced tier disagrees with the manifest flag: ${tierWrong.join('; ')}` : ''}`);
for (const k of FIRST_CLASS) ok(PAGES.some((p) => p.key === k), `FIRST_CLASS names a page the data has: ${k}`);

// ── 2. home views ──────────────────────────────────────────────────────────────────────────────────
console.log('\n2. Home views (V1, IA-1)');
const viewIds = new Set<string>(VIEWS.map(([id]) => id));
const inspectIds = new Set<string>(INSPECT.map(([id]) => id));
ok(viewIds.size >= 1 && inspectIds.size >= 1, `there are views (${viewIds.size}) and Inspect views (${inspectIds.size})`);
const homeCount = new Map<string, string[]>([...viewIds].map((v) => [v, []]));
const isHome = (h: unknown): boolean => h !== undefined && h !== null && h !== '';
for (const d of DATA) {
  const anyD = d as Record<string, unknown>;
  if ('subpages' in d) {
    ok(!isHome(anyD.home), `a tab with sub-pages declares no home of its own: ${d.label}${isHome(anyD.home) ? ` — tab with sub-pages that also declares a home: ${d.label} → ${JSON.stringify(anyD.home)}` : ''}`);
    ok(!('sections' in d), `a tab with sub-pages has no sections of its own: ${d.label}`);
    ok(d.subpages.length > 0, `a tab with sub-pages has at least one: ${d.label}`);
  }
}
const sectionHomes: string[] = [];
for (const p of PAGES) {
  const kind = p.key.includes('/') ? 'sub-page' : 'tab';
  for (const s of p.sections) if ('home' in s) sectionHomes.push(`section declares a home view: ${p.name} › ${s.title} → ${JSON.stringify((s as { home?: unknown }).home)}`);
  const h = p.home as unknown;
  if (!isHome(h)) { ok(false, `${kind} with no home view: ${p.name}`); continue; }
  if (typeof h !== 'string') { ok(false, `${kind} with more than one home view: ${p.name} → ${JSON.stringify(h)}`); continue; }
  if (inspectIds.has(h)) { ok(false, `${kind} whose home is an Inspect view: ${p.name} → ${h} (Inspect views are opened, never a home)`); continue; }
  if (!viewIds.has(h)) { ok(false, `${kind} whose home is not in VIEWS: ${p.name} → ${h}`); continue; }
  homeCount.get(h)!.push(p.name);
  ok(true, `${p.name} has one home: ${h}`);
}
ok(sectionHomes.length === 0, `no section declares a home view (V1: the preview does not change on scroll or focus)${sectionHomes.length ? ` — ${sectionHomes.join('; ')}` : ''}`);
const orphanViews = [...homeCount].filter(([, where]) => !where.length).map(([v]) => v);
ok(orphanViews.length === 0, `every view is some page's home${orphanViews.length ? ` — view that is no page's home: ${orphanViews.join(', ')} (V1: nothing else can reach it)` : ''}`);
const sharedViews = [...homeCount].filter(([, where]) => where.length > 1);
ok(sharedViews.length === 0, `no two pages share a home view${sharedViews.length ? ` — ${sharedViews.map(([v, w]) => `${v}: ${w.join(' + ')}`).join('; ')}` : ''}`);

// ── 3. roles ───────────────────────────────────────────────────────────────────────────────────────
console.log('\n3. Roles (V2, oracle: packages/engine/out/prism3.tokens.json)');
const rootKey = Object.keys(tokens).find((k) => !k.startsWith('$'))!;
const emitted: string[] = [];
const walk = (n: unknown, path: string[]): void => {
  if (!n || typeof n !== 'object') return;
  if ('$value' in (n as object)) { emitted.push(path.join('.')); return; }
  for (const [k, v] of Object.entries(n as object)) if (!k.startsWith('$')) walk(v, [...path, k]);
};
walk(tokens[rootKey].color, []);
ok(emitted.length >= 200, `the default theme emits ${emitted.length} color roles (floor 200, so an empty read fails)`);
const subs = color && 'subpages' in color ? color.subpages : [];
for (const id of [...ROLES_PAGES, ...NO_ROLES]) ok(subs.some((sp) => sp.id === id), `Color has the sub-page the v6 review names: ${id}`);
const owner = new Map<string, string>();
for (const sp of subs) {
  const roles = (sp as PageData).roles;
  if (NO_ROLES.includes(sp.id)) {
    ok(!roles, `a Color sub-page that must have no Roles toggle declares no roles: ${sp.label}${roles ? ` — Color sub-page that must have no Roles toggle declares roles: ${sp.label} → ${JSON.stringify(roles)}` : ''}`);
    continue;
  }
  ok(!!roles?.length, `Color sub-page carries Roles families: ${sp.label}`);
  for (const pre of roles ?? []) {
    ok(!owner.has(pre), `Roles prefix declared once: ${pre}${owner.has(pre) ? ` (${owner.get(pre)} and ${sp.label})` : ''}`);
    if (!owner.has(pre)) owner.set(pre, sp.label);
  }
}
const roleOwner = (role: string): string | null => {
  let best = '';
  for (const pre of owner.keys()) if ((role === pre || role.startsWith(`${pre}.`)) && pre.length > best.length) best = pre;
  return best ? owner.get(best)! : null;
};
const orphans = emitted.filter((r) => !roleOwner(r));
ok(orphans.length === 0, `every emitted color role is in exactly one Color sub-page's Roles matrix${orphans.length ? ` — color roles in no Color sub-page's Roles matrix: ${orphans.slice(0, 8).join(', ')}${orphans.length > 8 ? ` …and ${orphans.length - 8} more` : ''}` : ''}`);
const dead = [...owner.keys()].filter((pre) => !emitted.some((r) => r === pre || r.startsWith(`${pre}.`)));
ok(dead.length === 0, `every Roles prefix matches an emitted role${dead.length ? ` — Roles prefix that matches no emitted role: ${dead.join(', ')}` : ''}`);
/** Where a family lives, by the owner's decisions, literally: every field role, page and inverse, on Surfaces &
 *  fills (Q29, #1962: its Fields section edits them); the links and the interactive columns on Interactive
 *  (Q28: links are edited there only). Each family is checked on every emitted role it has, through the
 *  longest-prefix rule above, so a role the engine adds to a family is held too. */
const EXPECT_HOME: ReadonlyArray<readonly [string, string]> = [
  ['field', 'Surfaces & fills'], ['inverse.field', 'Surfaces & fills'],
  ['text.link', 'Interactive'], ['inverse.text.link', 'Interactive'], ['interactive', 'Interactive'],
];
for (const [fam, page] of EXPECT_HOME) {
  const members = emitted.filter((r) => r.startsWith(`${fam}.`));
  const wrong = members.filter((r) => roleOwner(r) !== page).map((r) => `${r} → ${roleOwner(r) ?? 'no page'}`);
  ok(members.length > 0 && wrong.length === 0, `every emitted ${fam}.* role (${members.length}) belongs to ${page}${!members.length ? ' — the emission has none, so this read nothing' : wrong.length ? ` — on another page: ${wrong.join(', ')}` : ''}`);
}
const perSub: Record<string, number> = {};
for (const r of emitted) { const o = roleOwner(r); if (o) perSub[o] = (perSub[o] ?? 0) + 1; }
console.log(`  ${Object.entries(perSub).map(([s, n]) => `${s} ${n}`).join(', ')}`);

// ── 4. moved pages (S2 on) ─────────────────────────────────────────────────────────────────────────
console.log('\n4. Moved pages (plan §4: a slice moves a page by emptying its legacy list)');
/** The pages the slices have moved so far, literally: a slice that moves one adds it here in the same change. */
const MOVED = ['brand', 'color/palettes', 'color/fills', 'color/interactive', 'type'];
const legacyEmpty = (p: Page): boolean => (Array.isArray(p.legacy) ? p.legacy.length === 0 : !(p.legacy as { web: unknown[]; figma: unknown[] }).web.length && !(p.legacy as { web: unknown[]; figma: unknown[] }).figma.length);
for (const p of PAGES) {
  const moved = MOVED.includes(p.key);
  ok(p.status === (moved ? 'new' : 'legacy'), `${p.name} is ${moved ? 'new' : 'legacy'} (status "${p.status}")`);
  ok(legacyEmpty(p) === (p.status === 'new'), `${p.name}: a new page names no legacy page, a legacy page names at least one (${JSON.stringify(p.legacy)})`);
}

console.log(`\n${executed - failed}/${executed} page-data assertions passed.`);
if (failed) process.exit(1);
