/**
 * The "used by" index, checked (UI redesign S7, T4). `src/preview/used-by.ts` is GENERATED data: which component
 * definitions bind each radius size (per Control shape) and each control height. The web bundle reads it so it
 * never imports the definitions (`gen-used-by.ts`'s header says why).
 *
 *   npx tsx apps/studio/test-used-by.ts
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is the COMMITTED file, imported as the bundle
 * imports it. The oracle is the engine's own definitions and its own Control shape materialization
 * (`applyControlShape`), run live here. The two meet only through the regenerate-and-compare arm, the
 * `regen --check` shape: a definition that starts binding a new radius, or a shape whose repoint moves, makes the
 * committed table stale, and this fails until it is rewritten. The literal arms below are typed from the
 * definitions' documented bindings (Button's rounded radius is `radius.md`; a pill brand repoints it to
 * `radius.capsule`; Tag and the switch and radio controls bind `radius.round`), so a generator that agreed with
 * itself while reading the wrong field still fails by name.
 *
 * Mutations this fails by name: a definition's radius changed (`textField.tokens.radius` → `radius.md`) →
 * `the committed index matches the component definitions — stale: radius.rounded…`; the shape repoint skipped in
 * the generator → `under Control shape pill, Button uses radius.capsule …`.
 */
import { componentDefs } from '@prism3/engine/components/index';
import { USED_BY } from './src/preview/used-by';
import { computeUsedBy, render } from './gen-used-by';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const live = computeUsedBy();
const committed = JSON.parse(JSON.stringify(USED_BY)) as typeof live;
const diff = (a: unknown, b: unknown, path = ''): string[] => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b)) return [path || '(root)'];
  const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
  return [...keys].flatMap((k) => diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k));
};
const stale = diff(committed, live);
ok(stale.length === 0, `the committed index matches the component definitions${stale.length ? ` — stale: ${stale.slice(0, 6).join(', ')}; run npx tsx apps/studio/gen-used-by.ts --write` : ''}`);
ok(render(live).includes('export const USED_BY'), 'the generator renders a module that exports USED_BY');

// Floors, so an empty read fails by name.
ok(committed.defs === componentDefs.length && committed.defs >= 20, `the index counts every definition (${committed.defs} of ${componentDefs.length}, floor 20)`);
for (const shape of ['rounded', 'pill', 'boxed', 'hairline']) ok(Object.keys(committed.radius[shape] ?? {}).length >= 3, `Control shape ${shape} lists at least three radius sizes (${Object.keys(committed.radius[shape] ?? {}).join(', ')})`);
ok(Object.keys(committed.height).length >= 3, `at least three control heights are bound (${Object.keys(committed.height).join(', ')})`);

// The literal arms, typed from the definitions' documented bindings.
const uses = (shape: string, ref: string, name: string): boolean => (committed.radius[shape]?.[ref] ?? []).includes(name);
ok(uses('rounded', 'radius.md', 'Button') && !uses('rounded', 'radius.capsule', 'Button'), 'under Control shape rounded, Button uses radius.md');
ok(uses('pill', 'radius.capsule', 'Button') && !uses('pill', 'radius.md', 'Button'), `under Control shape pill, Button uses radius.capsule and not radius.md (${JSON.stringify(committed.radius.pill)})`);
ok(uses('boxed', 'radius.none', 'Button'), 'under Control shape boxed, Button uses radius.none');
ok(uses('hairline', 'radius.hairline', 'Button'), 'under Control shape hairline, Button uses radius.hairline');
for (const shape of ['rounded', 'pill', 'boxed', 'hairline']) ok(uses(shape, 'radius.round', 'Tag') && uses(shape, 'radius.round', 'Switch.Control'), `under every Control shape, Tag and Switch.Control use radius.round (${shape})`);
ok(!Object.values(committed.radius).some((m) => Object.values(m).some((l) => l.includes('Button.Destructive'))), 'intent variants fold into their definition (no Button.Destructive)');
ok((committed.height['size.md.height'] ?? []).includes('Button'), 'Button uses size.md.height');
ok(JSON.stringify(committed.buttonSizes) === JSON.stringify({ 'size.sm.height': 'Small', 'size.md.height': 'Medium', 'size.lg.height': 'Large' }),
  `the button sizes are Small, Medium and Large on size.sm, size.md and size.lg (${JSON.stringify(committed.buttonSizes)})`);

console.log(`\n${executed - failed}/${executed} used-by assertions passed.`);
if (failed) process.exit(1);
