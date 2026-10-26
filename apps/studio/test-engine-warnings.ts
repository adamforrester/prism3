/**
 * The engine's two warnings, moved onto their levers when the Decisions log was cut (#2909 Q2909.7 A),
 * `src/state/engine-warnings.ts`, in Node with no DOM.
 *
 *   npx tsx apps/studio/test-engine-warnings.ts
 *
 * INDEPENDENCE (docs/34). The notes are the ENGINE's, from `brandTheme` over brands planted here, never strings typed to
 * match the matcher: an anchor planted outside the sRGB gamut, a primary that is not red, a brand that sets danger
 * itself. What each brand should warn about is a literal read off the planting (which anchor is out of gamut, whether
 * the brand gave a danger hue), not off the module under test. So a change to the engine's words that the matcher no
 * longer reads fails here by name, instead of the line silently dropping off the lever.
 *
 * Mutations that fail here by name: the gamut lead matched on another word → `gamut: the out-of-gamut primary …`; the
 * brand's own danger hue read as a substitution → `danger: a brand that sets danger …`.
 */
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { dangerSubstitution, gamutWarning } from './src/state/engine-warnings';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const base = Object.values(exampleBrands as Record<string, BrandInput>)[0];
// A saturated green no sRGB display can show, and a brand color as far out; a primary nowhere near red.
const OUT = { l: 0.7, c: 0.37, h: 145 };
const planted: BrandInput = { ...base, primary: OUT, brandColors: [{ name: 'glow', oklch: { l: 0.65, c: 0.33, h: 300 } }], status: undefined, roleColors: undefined, gradients: undefined, interactivePalettes: undefined, overrides: undefined } as BrandInput;
const notes = brandTheme(planted).notes;

const g = gamutWarning(notes, 'primary');
ok(!!g && /sRGB/.test(g) && g.startsWith('Anchor'), `gamut: the out-of-gamut primary gets the engine's sentence, its first letter raised (${g ?? 'none'})`);
ok(!!gamutWarning(notes, 'glow'), 'gamut: an out-of-gamut brand color gets its line, by its name');
ok(gamutWarning(notes, 'neutral') === null, 'gamut: an anchor the brand did not pin gets no line');
const inside = brandTheme({ ...planted, primary: { l: 0.55, c: 0.12, h: 250 }, brandColors: [] }).notes;
ok(gamutWarning(inside, 'primary') === null, 'gamut: an anchor inside the gamut gets no line');

const d = dangerSubstitution(notes);
ok(d.length >= 1 && d.every((x) => !x.startsWith('danger:')) && d.some((x) => /red/.test(x)), `danger: a primary that is not red gets the engine's substituted red, said under Danger (${d.join(' | ')})`);
const own = brandTheme({ ...planted, status: { danger: { h: 20, chroma: 0.2 } } } as BrandInput).notes;
ok(own.some((n) => n.startsWith('danger: ')) && dangerSubstitution(own).length === 0, 'danger: a brand that sets danger itself gets no substitution line, though the engine still notes its hue');

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
