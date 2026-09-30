/**
 * Write-adapter test (#1720) — drives the REAL `cssVarAdapter` from `src/write-adapter.ts` over a fake
 * scope, with a model from the real `resolvePreview`.
 *
 *   npx tsx apps/studio/test-write-adapter.ts
 *
 * The defect this guards: a type binding the brand does not emit is absent from `model.type` (named in
 * `model.unresolvedType`), and the adapter used to only SKIP it. A property an earlier apply had set
 * stayed on the scope, so switching to a brand without the style kept painting the previous brand's
 * value. The adapter now removes the three atoms of every unresolved ref.
 *
 * docs/34 (gate independence): the property names are LITERALS written out here, never built with the
 * adapter's own `typeAtomName`, so a change to the naming scheme cannot move the test along with it.
 * Mutation that drops the removal loop from `cssVarAdapter` fails `displayCeiling 'md' apply removes
 * --type-display-lg-strong-{family,weight,size}` BY NAME.
 */
import { cssVarAdapter } from './src/write-adapter';
import { resolvePreview } from '@prism3/engine/resolve-preview';
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// A fake scope: the adapter only calls `style.setProperty` / `style.removeProperty`.
const props = new Map<string, string>();
const scope = {
  style: {
    setProperty: (k: string, v: string) => { props.set(k, v); },
    removeProperty: (k: string) => { const v = props.get(k) ?? ''; props.delete(k); return v; },
  },
} as unknown as HTMLElement;
const adapter = cssVarAdapter(scope);

const harbor = (exampleBrands as Record<string, unknown>)['harbor'] as BrandInput;
const ceilingMd = { ...harbor, typography: { ...harbor.typography, displayCeiling: 'md' } } as BrandInput;

const DISPLAY_LG = ['--type-display-lg-strong-family', '--type-display-lg-strong-weight', '--type-display-lg-strong-size'];
const TITLE_MD = ['--type-title-md-strong-family', '--type-title-md-strong-weight', '--type-title-md-strong-size'];
const present = (keys: string[]) => keys.filter((k) => (props.get(k) ?? '') !== '');

adapter.apply(resolvePreview(brandTheme(harbor)), 'light');
ok(present(DISPLAY_LG).length === 3, `harbor apply sets --type-display-lg-strong-{family,weight,size} (set: ${present(DISPLAY_LG).join(', ') || 'none'})`);

const second = resolvePreview(brandTheme(ceilingMd));
ok(JSON.stringify(second.unresolvedType) === JSON.stringify(['type.display.lg.strong']),
  `premise: displayCeiling 'md' leaves type.display.lg.strong unresolved (got ${second.unresolvedType.join(', ') || 'none'})`);
adapter.apply(second, 'light');
const stale = DISPLAY_LG.filter((k) => props.has(k));
ok(stale.length === 0, `displayCeiling 'md' apply removes --type-display-lg-strong-{family,weight,size}` + (stale.length ? ` — STILL SET: ${stale.map((k) => `${k}=${props.get(k)}`).join(', ')}` : ''));
ok(present(TITLE_MD).length === 3, `displayCeiling 'md' apply keeps --type-title-md-strong-{family,weight,size} (set: ${present(TITLE_MD).join(', ') || 'none'})`);

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
