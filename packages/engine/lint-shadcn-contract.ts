/**
 * Prism3 — THE SHADCN MAP IS DOWNSTREAM OF THE COMPONENT CONTRACT (#2997 gate 4, #1325).
 *
 *   npx tsx packages/engine/lint-shadcn-contract.ts
 *
 * The shadcn theme is meant to give a stock shadcn component the role a Prism3 component contract binds for the same
 * job: shadcn's `primary` is what Prism3's Button fills with, its `input` what Text Field strokes with. This gate holds
 * the map (`projections/shadcn.ts`) to the published contract, so when a contract rebinds, the projection fails until
 * the map follows. Four arms:
 *
 *   1. ANCHORED. Each row in `ANCHORS` below must map to the role the contract binds at that (def, variant, part,
 *      channel). A different role fails `<var>: <role> ≠ <label> (<binding>)`; a binding the contract no longer has
 *      fails `ANCHOR GONE`; an anchored name the map lacks fails `UNMAPPED ANCHOR`.
 *   2. DECIDED. Every map key is anchored here or listed in the map's `SHADCN_UNANCHORED`, never both and never
 *      neither: `UNDECIDED <var>`, `ANCHORED AND UNANCHORED <var>`, `STALE UNANCHORED <var>`.
 *   3. GUARANTEED. Every role the map names (the `:root`/`.dark` rows and the `@theme` rows) is in the guaranteed set of
 *      `schema/token-contract.json`, so every brand emits it: `NOT GUARANTEED <var> → <role>`.
 *   4. REPRESENTED. Each def an anchor names is in the contract export, so a renamed def cannot leave its anchors
 *      silently unread.
 *
 * WHERE THE EXPECTATION COMES FROM (docs/34). `ANCHORS` is typed here, from #2997 §7, never read from the map: a row
 * the map stops anchoring cannot remove its own check. The bindings are read from the published contract export
 * (`out/components/component-contracts.json`, rendered fresh because it is never committed, #3698 R3), the same file a
 * consumer reads, not from the def source. The guaranteed set is the committed baseline only `token-contract.ts
 * --accept` writes.
 *
 * MUTATIONS, each failing by name: map `primary` → `color.foreground.brand` fails `primary: color.foreground.brand ≠
 * Button filled.fill (color.interactive.primary.fill.rest)`; map `accent` → `color.interactive.neutral.overlay.hover`
 * fails `NOT GUARANTEED accent → color.interactive.neutral.overlay.hover`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHADCN_THEME_VARS, SHADCN_UNANCHORED, SHADCN_VARS } from './projections/shadcn.ts';
import { renderUncommitted, UNCOMMITTED_OUT } from './regen.ts';

const here = dirname(fileURLToPath(import.meta.url));

type Channel = 'fill' | 'ink' | 'stroke' | 'icon';
type Anchor = { def: string; where: Record<string, string>; part: string; channel: Channel; label: string };

const FILLED_REST = { appearance: 'filled', surface: 'default', inset: 'default', state: 'rest' };
const FIELD_REST = { status: 'default', state: 'rest' };

/** #2997 §7: the shadcn variables whose job a Prism3 component contract already binds. Typed, not derived. */
export const ANCHORS: Readonly<Record<string, readonly Anchor[]>> = {
  'primary': [{ def: 'button', where: FILLED_REST, part: 'container', channel: 'fill', label: 'Button filled.fill' }],
  'primary-foreground': [{ def: 'button', where: FILLED_REST, part: 'container/label', channel: 'ink', label: 'Button filled.label' }],
  'secondary': [{ def: 'button-neutral', where: FILLED_REST, part: 'container', channel: 'fill', label: 'Neutral Button filled.fill' }],
  'secondary-foreground': [{ def: 'button-neutral', where: FILLED_REST, part: 'container/label', channel: 'ink', label: 'Neutral Button filled.label' }],
  'destructive': [{ def: 'button-destructive', where: FILLED_REST, part: 'container', channel: 'fill', label: 'Destructive Button filled.fill' }],
  'destructive-foreground': [{ def: 'button-destructive', where: FILLED_REST, part: 'container/label', channel: 'ink', label: 'Destructive Button filled.label' }],
  'input': [
    { def: 'text-field', where: FIELD_REST, part: 'container/control', channel: 'stroke', label: 'Text Field control stroke (rest)' },
    { def: 'select', where: FIELD_REST, part: 'container/control', channel: 'stroke', label: 'Select control stroke (rest)' },
  ],
  'ring': [{ def: 'focus-ring', where: { surface: 'default' }, part: 'ring', channel: 'stroke', label: 'Focus Ring stroke' }],
};

type ColorRow = { where: Record<string, string>; parts: Array<{ part: string } & Partial<Record<Channel, string>>> };
type Contract = { components: Record<string, { spec?: { colors?: ColorRow[] } }> };

const sameWhere = (a: Record<string, string>, b: Record<string, string>): boolean => {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};

export const bindingOf = (contract: Contract, a: Anchor): string | undefined =>
  contract.components[a.def]?.spec?.colors?.find((r) => sameWhere(r.where, a.where))?.parts.find((p) => p.part === a.part)?.[a.channel];

export const contractFailures = (
  contract: Contract, map: Readonly<Record<string, string>>, themeMap: Readonly<Record<string, string>>,
  unanchored: readonly string[], guaranteed: ReadonlySet<string>, anchors = ANCHORS,
): string[] => {
  const out: string[] = [];
  for (const def of new Set(Object.values(anchors).flat().map((a) => a.def))) {
    if (!contract.components[def]) out.push(`DEF NOT IN CONTRACT ${def} (an anchor reads it)`);
  }
  for (const [v, list] of Object.entries(anchors)) {
    const role = map[v];
    if (role === undefined) { out.push(`UNMAPPED ANCHOR ${v}`); continue; }
    for (const a of list) {
      const bound = bindingOf(contract, a);
      if (bound === undefined) out.push(`ANCHOR GONE ${v}: ${a.label} — ${a.def} ${JSON.stringify(a.where)} ${a.part}.${a.channel} not in the contract`);
      else if (bound !== role) out.push(`${v}: ${role} ≠ ${a.label} (${bound})`);
    }
  }
  const un = new Set(unanchored);
  for (const k of Object.keys(map)) {
    const anchored = k in anchors;
    if (anchored && un.has(k)) out.push(`ANCHORED AND UNANCHORED ${k}`);
    if (!anchored && !un.has(k)) out.push(`UNDECIDED ${k} (anchor it to a contract binding here, or list it in SHADCN_UNANCHORED)`);
  }
  for (const k of un) if (!(k in map)) out.push(`STALE UNANCHORED ${k} (not a map key)`);
  for (const [k, role] of [...Object.entries(map), ...Object.entries(themeMap)]) {
    if (!guaranteed.has(role)) out.push(`NOT GUARANTEED ${k} → ${role}`);
  }
  return out;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = renderUncommitted();
  if ('error' in r) { console.error(`✗ cannot read the component contract: ${r.error}`); process.exit(1); }
  const file = r.files[UNCOMMITTED_OUT.indexOf('components/component-contracts.json')]!;
  const contract = JSON.parse(readFileSync(file, 'utf8')) as Contract;
  const guaranteed = new Set(Object.keys((JSON.parse(readFileSync(resolve(here, 'schema', 'token-contract.json'), 'utf8')) as { guaranteed: Record<string, string> }).guaranteed));
  const failures = contractFailures(contract, SHADCN_VARS, SHADCN_THEME_VARS, SHADCN_UNANCHORED, guaranteed);
  if (failures.length) {
    console.error(`✗ shadcn map vs the component contract: ${failures.length} failure(s)`);
    for (const f of failures) console.error(`    ${f}`);
    console.error('\n  Fix: the map follows the contract — remap the row in projections/shadcn.ts to the binding named, or, when the');
    console.error('  contract moved on purpose, follow it here too. A role outside the guaranteed set is not emitted by every brand.');
    process.exit(1);
  }
  const bindings = Object.values(ANCHORS).flat().length;
  const roles = Object.keys(SHADCN_VARS).length + Object.keys(SHADCN_THEME_VARS).length;
  console.log(`✓ shadcn map vs the component contract — ${Object.keys(ANCHORS).length} anchored variables held to ${bindings} contract bindings, ` +
    `${SHADCN_UNANCHORED.length} declared unanchored, ${roles} mapped roles all guaranteed.`);
}
