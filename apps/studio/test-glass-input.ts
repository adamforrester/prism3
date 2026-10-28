/**
 * Color › Surfaces & fills › Glass: how an added glass fill is named (#3106, owner decision Q827 A), in Node, against the
 * real store and the real engine.
 *
 *   npx tsx apps/studio/test-glass-input.ts
 *
 * Q827 A: the designer types the name, in a field that starts empty and is required; it is a token-safe slug
 * (lowercase, hyphens), unique in the brand and never `surface`, the shipped glass; and nothing is named for them (no
 * `card`, `card-2`). Held here, by name:
 *   1. THE REFUSALS: `glassNameRefusal` refuses an empty name, a name that isn't a slug, `surface` and a name the
 *      brand already has, each with its own line, and takes a slug. Every line is a literal typed here.
 *   2. THE ENGINE AGREES: every name the page takes, the engine takes as `glassRoles.<name>`, and every name the page
 *      refuses as not a slug or as `surface`, the engine refuses too, so the page never offers a name the build refuses.
 *   3. THE WRITE: Add writes the typed name and nothing else (the card color at 70%, the lever's start), appends it in
 *      order, and writes nothing for a refused name; there is no name the page picks.
 *   4. EXISTING NAMES: the reference brand's `card` reads back as its row shows it (Glass card, glass.card, Card color,
 *      70%), and the readable name of a hyphenated name.
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34): the expected lines, names and writes are literals typed here, and (2)'s other
 * side is the engine's own `brandTheme`, not the page's rule.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import { parseDesignMd } from '@prism3/engine/design-md';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as G from './src/state/glass-input';

let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const prism3 = (exampleBrands as Record<string, BrandInput>).prism3;
const reset = (input: BrandInput = prism3): void => store.initSession(structuredClone(input), { kind: 'example', id: 'prism3' });

// ── 1. the refusals, each a literal ──────────────────────────────────────────────────────────────
const REQUIRED = 'A glass fill needs a name, such as card.';
const NOT_SLUG = 'A name is lowercase letters, digits and hyphens, starting with a letter, such as top-bar.';
const SHIPPED = "surface is the shipped glass fill, so another fill can't use its name.";
const TAKEN = (n: string): string => `This brand already has glass.${n}. Each glass fill needs its own name.`;
const CASES: [what: string, typed: string, taken: string[], want: string | null][] = [
  ['an empty name', '', [], REQUIRED],
  ['only spaces', '   ', [], REQUIRED],
  ['a capital letter', 'Card', [], NOT_SLUG],
  ['an underscore', 'top_bar', [], NOT_SLUG],
  ['a space inside', 'top bar', [], NOT_SLUG],
  ['a leading digit', '2up', [], NOT_SLUG],
  ['a trailing hyphen', 'card-', [], NOT_SLUG],
  ['a double hyphen', 'top--bar', [], NOT_SLUG],
  ['a dot', 'card.dark', [], NOT_SLUG],
  ['the shipped glass', 'surface', [], SHIPPED],
  ['the shipped glass, spaced', ' surface ', [], SHIPPED],
  ['a duplicate', 'card', ['card'], TAKEN('card')],
  ['a duplicate, spaced', ' header ', ['card', 'header'], TAKEN('header')],
  ['a slug', 'card', [], null],
  ['a hyphenated slug', 'top-bar', ['card'], null],
  ['a slug with digits', 'card2', ['card'], null],
  ['a slug, spaced', '  overlay  ', ['card'], null],
];
for (const [what, typed, taken, want] of CASES) {
  const got = G.glassNameRefusal(typed, taken);
  ok(got === want, `#3106 Q827 A: ${what} (${JSON.stringify(typed)}, taken ${JSON.stringify(taken)}) is ${want === null ? 'taken' : 'refused'} — ${JSON.stringify(got)}`);
}
ok(G.GLASS_NAME_HINT === 'e.g. card, header, overlay', `#3106 Q827 A: the name field's hint is the owner's example list (${JSON.stringify(G.GLASS_NAME_HINT)})`);

// ── 2. the engine agrees ─────────────────────────────────────────────────────────────────────────
const engineTakes = (name: string): boolean => {
  try { brandTheme({ ...structuredClone(prism3), glassRoles: { [name]: { role: 'foreground.primary', alpha: 70 } } } as BrandInput); return true; } catch { return false; }
};
// A duplicate is the page's alone to refuse (a map can't hold one name twice); an empty name never reaches the engine.
const disagree = CASES.filter(([, typed, , want]) => {
  const name = typed.trim();
  if (want === null) return !engineTakes(name);
  if (want === NOT_SLUG || want === SHIPPED) return engineTakes(name);
  return false;
}).map(([what]) => what);
ok(disagree.length === 0, `#3106: every name the page takes the engine takes, and every slug or shipped-name refusal the engine makes too${disagree.length ? ` — DISAGREE: ${disagree.join(', ')}` : ''}`);

// ── 3. the write ─────────────────────────────────────────────────────────────────────────────────
reset();
ok(!('glassRoles' in store.brandState), '#3106: the prism3 example starts with no glass fill of its own');
ok(G.addGlassRole('') === false && !('glassRoles' in store.brandState), '#3106 Q827 A: Add with no name writes nothing (nothing is named for the designer)');
ok(G.addGlassRole('Header') === false && G.addGlassRole('surface') === false && !('glassRoles' in store.brandState),
  `#3106: Add under a refused name writes nothing (${JSON.stringify(store.brandState.glassRoles)})`);
ok(G.addGlassRole(' header ') === true && JSON.stringify(store.brandState.glassRoles) === JSON.stringify({ header: { role: 'foreground.primary', alpha: 70 } }),
  `#3106 Q827 A: Add writes glassRoles under the typed name, trimmed, as the card color at 70% (${JSON.stringify(store.brandState.glassRoles)})`);
ok(G.addGlassRole('header') === false && Object.keys(store.brandState.glassRoles ?? {}).join() === 'header',
  `#3106 Q827 A: a second header is refused and the first is kept (${JSON.stringify(store.brandState.glassRoles)})`);
ok(G.addGlassRole('top-bar') === true && Object.keys(store.brandState.glassRoles ?? {}).join() === 'header,top-bar',
  `#3106: a second fill is added after the first, under its own name, not card-2 (${JSON.stringify(Object.keys(store.brandState.glassRoles ?? {}))})`);
store.rebuild();
ok(store.lastError === null, `#3106: the engine takes the two added fills (${store.lastError})`);
G.removeGlassRole('header');
G.removeGlassRole('top-bar');
ok(!('glassRoles' in store.brandState), '#3106: removing both drops glassRoles, as before');

// ── 4. existing names: the reference brand's card ───────────────────────────────────────────────
const ref = parseDesignMd(readFileSync(join(REPO, 'packages/engine/examples/nb-redesign.design.md'), 'utf8')).input;
reset(ref);
const card = G.readGlassRoles().card;
ok(JSON.stringify(G.readGlassRoles()) === JSON.stringify({ card: { role: 'foreground.primary', alpha: 70 } }),
  `#3106: the reference brand's glass fill loads unchanged as glassRoles.card, the card color at 70% (${JSON.stringify(G.readGlassRoles())})`);
const source = card ? G.sourceOf(card) : null;
ok(source === 'role:foreground.primary' && G.GLASS_SOURCES.find((o) => o.v === source)?.l === 'Card color',
  `#3106: its color reads as "Card color", the stored role's option (${source}, ${G.GLASS_SOURCES.find((o) => o.v === source)?.l})`);
ok(G.glassLabel('card') === 'Glass card' && G.glassLabel('top-bar') === 'Glass top bar',
  `#3106: a fill's row reads as the shipped glass's does, "Glass card", and "Glass top bar" for top-bar (${G.glassLabel('card')}, ${G.glassLabel('top-bar')})`);
ok(G.glassNameRefusal('card', Object.keys(G.readGlassRoles())) === TAKEN('card'), '#3106: on the reference brand, a new fill can\'t take card, which it already has');

console.log(`\n${executed - failed}/${executed} glass fill name assertions passed.`);
if (failed) process.exit(1);
