/**
 * Prism3 engine — A PAYMENT-TILE SLOT HOLDS PAYMENT TILES, AND STARTS AT THE GENERIC ONE (#2343 PR 4, #2429).
 *
 *   npx tsx packages/engine/lint-mark-slots.ts
 *
 * The Card number field's trailing cell is a swap slot for a brand mark. Three promises make it a payment field and
 * not a box that happens to hold a logo, and each is checked here against the marks FOLDER, never against the set
 * or the def that produced the plan:
 *
 *   (a) TILES ONLY — the code prop that names the mark (`brand`) offers exactly the tiles the folder holds: every
 *       file drawn on the 32×20 tile artboard, in the one folder that holds them, and nothing else. A square sign-in
 *       glyph, a logo or a social mark named there fails, and so does a tile the prop forgot.
 *   (b) GENERIC FIRST — the prop defaults to `generic`, and on every projected member the slot's swap, and the set's
 *       swap property, start at `brand-mark/<tile folder>/generic`, a file that exists. The generic tile is what the
 *       field shows before the number tells the network.
 *   (c) A TILE'S SHAPE — on every member the slot binds its height alone, to the icon rung the field's size takes (20
 *       at small and medium, 24 at large), and carries the aspect lock, so the width follows the tile and the tile is
 *       never squared. That the slot never RETINTS the tile is `lint-mark-colors.ts`'s host arm.
 *
 * REPRESENTATION (docs/34 shape 9): every def whose plan swaps in a tile must be a host listed below, and every listed
 * host must project a slot that swaps in a tile, so a second tile slot cannot arrive unchecked and a renamed part
 * cannot leave this gate reading nothing.
 *
 * ── INDEPENDENCE (docs/34) ──────────────────────────────────────────────────────────────────────────
 *
 * The tile set is read from the folder with this file's own `viewBox` reader; it never imports `brand-mark-set.ts` or
 * `brand-mark-glyphs.ts`, which the def reads to build the prop. The tile artboard (32×20), the generic name, the hosts,
 * their part and prop names and the height rungs are literals typed here. The def and its projected plans are the
 * subjects. Reading the tile list off the set would only prove the def agrees with the set it was built from.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components';
import { figmaAnatomySet, planSetProperties, type FigmaNodePlan } from './anatomy-figma';

const here = dirname(fileURLToPath(import.meta.url));
const marksDir = resolve(here, 'marks');

/** The tile artboard (owner decisions Q720 A, Q780 A): 32 wide, 20 high. */
const TILE_VIEWBOX = '0 0 32 20';
/** The tile a payment field shows before it knows the network (owner, 2026-10-27). */
const GENERIC = 'generic';
const MARK_PREFIX = 'brand-mark/';
/** Every def with a payment-tile slot, its slot part, the code prop that names the tile, and the variable its slot's
 *  height binds at each size. */
const HOSTS: Record<string, { part: string; prop: string; height: Record<string, string> }> = {
  'card-number-field': { part: 'cardMark', prop: 'brand', height: { small: 'icon/size/sm', medium: 'icon/size/sm', large: 'icon/size/md' } },
};

/** A document's `viewBox`, normalized to single spaces, or undefined. Pure. */
export const viewBoxOf = (svg: string): string | undefined => {
  const v = /<svg\b[^>]*\sviewBox="([^"]*)"/.exec(svg)?.[1];
  return v === undefined ? undefined : v.trim().split(/[\s,]+/).join(' ');
};
const walk = (n: FigmaNodePlan, f: (n: FigmaNodePlan) => void): void => { f(n); for (const c of n.children ?? []) walk(c, f); };
/** What is wrong with a tile slot's node, given the tile folder and the height it should bind. Empty when right. Pure. */
export const slotErrors = (n: FigmaNodePlan | undefined, folder: string, height: string): string[] => {
  if (!n) return ['is not built at this member'];
  const out: string[] = [];
  const start = `${MARK_PREFIX}${folder}/${GENERIC}`;
  if (n.type !== 'INSTANCE_SWAP') out.push(`is a ${n.type}, not a swap`);
  if (n.swapTarget !== start) out.push(`starts at '${String(n.swapTarget)}', not the generic tile '${start}'`);
  if (n.propertyRef?.field !== 'mainComponent') out.push('carries no swap property, so a designer cannot set the network');
  const bound = Object.keys(n.bound ?? {});
  if (bound.length !== 1 || bound[0] !== 'height') out.push(`binds ${JSON.stringify(bound)}, and a tile slot binds its height alone`);
  else if ((n.bound as Record<string, unknown>).height !== height) out.push(`binds its height to '${String((n.bound as Record<string, unknown>).height)}', not '${height}'`);
  if (n.aspectLock !== true) out.push('carries no aspect lock, so the tile would be squared');
  return out;
};

// ---- SELF-CHECK -----------------------------------------------------------------------------------
const self: string[] = [];
{
  if (viewBoxOf('<svg width="32" height="20" viewBox="0  0 32  20" fill="none">') !== TILE_VIEWBOX) self.push('viewBoxOf misreads a tile artboard');
  if (viewBoxOf('<svg viewBox="0 0 24 24">') === TILE_VIEWBOX) self.push('viewBoxOf reads a square as a tile');
  const good = { name: 'cardMark', type: 'INSTANCE_SWAP', swapTarget: 'brand-mark/t/generic', propertyRef: { field: 'mainComponent', prop: 's' }, bound: { height: 'icon/size/sm' }, aspectLock: true } as unknown as FigmaNodePlan;
  if (slotErrors(good, 't', 'icon/size/sm').length) self.push(`slotErrors rejects a good slot: ${slotErrors(good, 't', 'icon/size/sm').join('; ')}`);
  if (slotErrors({ ...good, swapTarget: 'brand-mark/provider/google' } as FigmaNodePlan, 't', 'icon/size/sm').length !== 1) self.push('slotErrors misses a slot that starts at a non-tile');
  if (slotErrors({ ...good, aspectLock: undefined } as FigmaNodePlan, 't', 'icon/size/sm').length !== 1) self.push('slotErrors misses a missing aspect lock');
  if (slotErrors({ ...good, bound: { height: 'icon/size/sm', width: 'icon/size/sm' } } as unknown as FigmaNodePlan, 't', 'icon/size/sm').length !== 1) self.push('slotErrors misses a second dimension');
  if (slotErrors({ ...good, bound: { height: 'icon/size/md' } } as unknown as FigmaNodePlan, 't', 'icon/size/sm').length !== 1) self.push('slotErrors misses a wrong height rung');
  if (slotErrors(undefined, 't', 'icon/size/sm').length !== 1) self.push('slotErrors misses an absent slot');
}
if (self.length) {
  console.error("\n❌ lint-mark-slots' own detection is broken — it cannot see what it claims to:\n");
  for (const s of self) console.error(`    ${s}`);
  process.exit(1);
}

// ---- THE TILES, FROM THE FOLDER ----------------------------------------------------------------------
const failures: string[] = [];
const tiles = new Map<string, string[]>();
for (const kind of readdirSync(marksDir).filter((d) => statSync(join(marksDir, d)).isDirectory()).sort())
  for (const f of readdirSync(join(marksDir, kind)).filter((f) => f.endsWith('.svg')).sort())
    if (viewBoxOf(readFileSync(join(marksDir, kind, f), 'utf8')) === TILE_VIEWBOX) tiles.set(kind, [...tiles.get(kind) ?? [], f.slice(0, -4)]);
const folders = [...tiles.keys()];
if (folders.length !== 1) {
  console.error(`\n❌ the marks folder holds ${TILE_VIEWBOX} tiles in ${folders.length} folders (${JSON.stringify(folders)}); a payment-tile slot needs exactly one tile kind`);
  process.exit(1);
}
const folder = folders[0];
const tileNames = tiles.get(folder)!;
if (!tileNames.includes(GENERIC)) failures.push(`marks/${folder}/ holds no ${GENERIC}.svg, the tile a payment field shows before it knows the network`);

// ---- THE HOSTS ------------------------------------------------------------------------------------
const swapsTile = (n: FigmaNodePlan): boolean => typeof n.swapTarget === 'string' && n.swapTarget.startsWith(`${MARK_PREFIX}${folder}/`);
let members = 0;
for (const def of componentDefs) {
  if (!def.figmaProperties || def.figmaProperties.emitAsComponents) continue;
  const host = HOSTS[def.id];
  const plans = figmaAnatomySet(def);
  const carrying = plans.some((p) => { let hit = false; walk(p.root, (n) => { if (swapsTile(n)) hit = true; }); return hit; });
  if (!host) {
    if (carrying) failures.push(`${def.id}: swaps in a payment tile and is not a host listed in this gate — list it in HOSTS with its slot part, prop and height rungs`);
    continue;
  }
  if (!carrying) failures.push(`${def.id}: is listed as a payment-tile host and no member swaps in a tile — the slot arm would check nothing`);
  // (a) the code prop offers the tiles, and only the tiles; (b) it starts at generic.
  const prop = def.props?.find((p) => p.name === host.prop);
  const values = [...(prop?.values ?? [])].sort();
  const want = [...tileNames].sort();
  if (!prop) failures.push(`${def.id}: TILES ONLY — has no '${host.prop}' prop to name the tile`);
  else {
    if (JSON.stringify(values) !== JSON.stringify(want)) {
      const extra = values.filter((v) => !want.includes(v)), missing = want.filter((v) => !values.includes(v));
      failures.push(`${def.id}: TILES ONLY — '${host.prop}' offers ${JSON.stringify(values)}, and marks/${folder}/ holds the tiles ${JSON.stringify(want)}${extra.length ? `; not tiles: ${JSON.stringify(extra)}` : ''}${missing.length ? `; tiles missing: ${JSON.stringify(missing)}` : ''}`);
    }
    if (prop.default !== GENERIC) failures.push(`${def.id}: GENERIC FIRST — '${host.prop}' defaults to ${JSON.stringify(prop.default)}, not '${GENERIC}'`);
  }
  // (b), (c) on every member.
  for (const plan of plans) {
    members++;
    let node: FigmaNodePlan | undefined;
    walk(plan.root, (n) => { if (n.name === host.part) node = n; });
    const size = String(plan.size ?? '');
    const height = host.height[size];
    if (!height) { failures.push(`${def.id} ${JSON.stringify({ size: plan.size, ...plan.coord })}: A TILE'S SHAPE — no height rung is listed for size '${size}'`); continue; }
    for (const e of slotErrors(node, folder, height)) failures.push(`${def.id} ${JSON.stringify({ size: plan.size, ...plan.coord })}: ${/starts at|no swap/.test(e) ? 'GENERIC FIRST' : 'A TILE\'S SHAPE'} — '${host.part}' ${e}`);
  }
  const swapProp = planSetProperties(plans).find((p) => p.type === 'INSTANCE_SWAP' && 'swapTarget' in p && p.swapTarget.startsWith(MARK_PREFIX));
  const start = `${MARK_PREFIX}${folder}/${GENERIC}`;
  if (!swapProp || !('swapTarget' in swapProp) || swapProp.swapTarget !== start)
    failures.push(`${def.id}: GENERIC FIRST — the set's tile swap property starts at ${swapProp && 'swapTarget' in swapProp ? `'${swapProp.swapTarget}'` : 'nothing'}, not '${start}'`);
}
for (const id of Object.keys(HOSTS)) if (!componentDefs.some((d) => d.id === id)) failures.push(`${id}: listed as a payment-tile host and no such component is registered`);

console.log(`Mark slots — ${tileNames.length} tile(s) in marks/${folder}/, ${Object.keys(HOSTS).length} host(s), ${members} member(s) checked.`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} payment-tile slot problem(s):\n`);
  for (const f of failures) console.error(`    ${f}`);
  console.error('\n  A payment-tile slot names tiles only, starts at the generic tile, and keeps the tile\'s proportion.');
  process.exit(1);
}
console.log('  ✓ clean — every payment-tile slot offers exactly the folder\'s tiles, starts at the generic tile on every');
console.log('    member and in its swap property, and binds its height alone under the aspect lock.');
