/**
 * KPI 2 API PARITY AGAINST FIGMA, AS MISMATCHES (#3408, owner decision on #4424 → A): for each component an arm ships
 * as an element, the props the Figma component exposes that the element lacks, one per prop per component.
 *
 *   npx tsx tools/poc-scorecard/api-mismatches.ts --manifest <custom-elements.json> [--defs <component-defs.json>]
 *
 * THE TWO SIDES (`docs/34`), neither derived from the other:
 *   - EXPECTED is the engine's emission, `component-defs.json`: a def's Figma-exposed props are its own props
 *     (`def.props`) plus, for each nesting in its spec, the nested component's props it `exposes` (S6-2 A: the fields'
 *     nested label exposes `emphasis` and `weight`). Without `--defs` it is emitted fresh, uncommitted, from the engine,
 *     which is the same for every arm.
 *   - ACTUAL is the arm's Custom Elements Manifest, written by the analyzer from the element's source: a prop is on the
 *     element when the manifest has it as an attribute's field or as a public field (a property with no attribute, such
 *     as a controlled `value` or an `onChange` handler, is still on the element).
 * A manifest element is matched to a def by its tag name less the first segment (`p3-text-field` → `text-field`), so any
 * prefix works. Defs with no element are listed, not counted: this measures the elements an arm ships.
 *
 * A measurement, not a gate: it exits 0 whatever the count, and the count is the card's value. It exits 1 only when it
 * cannot measure: an unreadable input, or no manifest element matching any def (a count of 0 there would be a vacuous one).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readUncommitted } from '../../packages/css/emission';

type Prop = { name: string };
type Def = { def: { props?: Prop[] }; spec?: { nesting?: { exposes?: string[] }[] } };
type Decl = { tagName?: string; attributes?: { name: string; fieldName?: string }[]; members?: { kind: string; name: string; privacy?: string; static?: boolean }[] };
export type Manifest = { modules: { declarations?: Decl[] }[] };
export type Result = { count: number; compared: string[]; missing: Record<string, string[]>; unmatched: string[] };

/** The Figma-exposed props of one def: its own, then each nesting's `exposes`, deduplicated. */
export const exposed = (d: Def): string[] => [...new Set([...(d.def.props ?? []).map((p) => p.name), ...(d.spec?.nesting ?? []).flatMap((n) => n.exposes ?? [])])];

/** The props one manifest element offers: every attribute's field (or name) and every public, non-static field. */
const offered = (x: Decl): Set<string> => new Set([
  ...(x.attributes ?? []).map((a) => a.fieldName ?? a.name),
  ...(x.members ?? []).filter((m) => m.kind === 'field' && m.privacy !== 'private' && m.privacy !== 'protected' && !m.static && !m.name.startsWith('#')).map((m) => m.name),
]);

/** A DOM property's name for a kebab-case prop, as the platform spells them (`aria-label` → `ariaLabel`). */
const camel = (p: string) => p.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

export const mismatches = (defs: Record<string, Def>, manifest: Manifest): Result => {
  const out: Result = { count: 0, compared: [], missing: {}, unmatched: [] };
  for (const x of manifest.modules.flatMap((m) => m.declarations ?? []).filter((d) => d.tagName)) {
    const id = x.tagName!.split('-').slice(1).join('-');
    if (!defs[id]) { out.unmatched.push(x.tagName!); continue; }
    out.compared.push(id);
    const has = offered(x);
    const lack = exposed(defs[id]).filter((p) => !has.has(p) && !has.has(camel(p)));
    if (lack.length) out.missing[id] = lack;
    out.count += lack.length;
  }
  return out;
};

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.dirname ?? '', 'api-mismatches.ts')) {
  const arg = (n: string) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
  const mf = arg('--manifest');
  if (!mf) { console.error('FAIL api mismatches: --manifest <custom-elements.json> is required'); process.exit(1); }
  const defsFile = arg('--defs');
  const defs = (defsFile ? JSON.parse(readFileSync(resolve(defsFile), 'utf8')) : readUncommitted('component-defs.json')).components as Record<string, Def>;
  const r = mismatches(defs, JSON.parse(readFileSync(resolve(mf), 'utf8')) as Manifest);
  if (!r.compared.length) { console.error(`FAIL api mismatches: no element in ${mf} matches a def (tags: ${r.unmatched.join(', ') || 'none'})`); process.exit(1); }
  for (const [id, ps] of Object.entries(r.missing)) console.log(`  ${id}: exposed in Figma, not on the element: ${ps.join(', ')}`);
  if (r.unmatched.length) console.log(`  not a def, not compared: ${r.unmatched.join(', ')}`);
  console.log(`OK api mismatches: ${r.count} mismatches across ${r.compared.length} elements (${r.compared.join(', ')})`);
}
