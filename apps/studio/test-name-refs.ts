/**
 * The name cascades (#3697 H3, M1), in Node, against the real store, the real writers and the real engine.
 *
 *   npx tsx apps/studio/test-name-refs.ts
 *
 * `BrandInput` names a brand color, an interactive column (a button set) and a mode by a string, and every writer that
 * renames or removes one must carry every field that holds it, or the field keeps an orphan: it comes back when the name
 * is reused (#3549), or leaves a shape the engine refuses (#3613, #3678, #3697). The writers read one table
 * (`src/state/name-refs.ts`).
 *
 * INDEPENDENT OF THE TABLE (docs/34). The fields seeded here come from the `BrandInput` type's own text in
 * `packages/engine/theme.ts`, parsed at run time, and each is classified BY HAND below: a seed that writes the field
 * naming `acc` (a brand color, and the unnamed column it draws), `promo` (a custom mode) or `dark`, or a reason it names
 * none of them. A field added to `BrandInput` and classified nowhere fails by name. The table is never read. What is
 * asserted is the engine's answer (the brand resolves, as the store's rebuild asks it), the writer's (the edit was
 * taken, or refused byte for byte where #3391 holds a reference), and a scan of the brand for the old name, which knows
 * nothing of which field held it.
 *
 * NESTED TYPES. The classification walks `BrandInput`'s top-level keys, then by hand the named object types its naming
 * fields hold (`NESTED` below: the surface mode, the glass role, the outline hover pick, the gradient and its stop), so
 * a naming sub-field added to one of them fails by name too (the #3710 review found `glassRoles.<name>.role` naming a
 * column one level down). The walk goes no deeper than that list: a type outside it (`ModeLevers`, `TypographyInput`)
 * is classified only as a whole, by its `BrandInput` key.
 *
 * THE CONFIRM. A seed that writes a palette reference the removal changes (not one keyed by the column, which the
 * column's own line covers) carries `confirms`: the count of lines, typed here, that the removal confirm must add
 * against the unseeded fixture's. A row whose line goes missing or merges fails by name.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import { resolvePreview } from '@prism3/engine/resolve-preview';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as P from './src/state/palette-input';
import * as I from './src/state/interactive-input';
import * as B from './src/state/brand-input';

let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};

// ── the fields, from the type's own text ────────────────────────────────────────────────────────
const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, '../../packages/engine/theme.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
/** The top-level keys of `export type <name> = { … }`, read from the source with comments stripped. */
const keysOf = (name: string): string[] => {
  const at = SRC.indexOf(`export type ${name} = {`);
  if (at < 0) return [];
  let depth = 0, body = '';
  for (let i = SRC.indexOf('{', at); i < SRC.length; i++) {
    const ch = SRC[i];
    if (ch === '{') { depth++; if (depth === 1) continue; }
    if (ch === '}') { depth--; if (depth === 0) break; }
    body += depth === 1 ? ch : ' ';
  }
  return [...body.matchAll(/(?:^|[;\n])\s*([A-Za-z_]\w*)\??\s*:/g)].map((m) => m[1]);
};

type Brand = BrandInput & Record<string, unknown>;
/** A field that names something: how to seed it, and whether a removal of `acc` is HELD (#3391: refused, not cascaded). */
type Seed = { seed: (b: Brand) => void; heldOnRemove?: boolean; heldOnColumnRemove?: boolean; confirms?: number };
/** Every `BrandInput` field, by hand. A string is why the field names no palette, column or mode. */
const FIELDS: Record<string, Seed | Seed[] | string> = {
  id: 'the export slug', name: 'the display name', root: 'the token namespace',
  modes: { seed: () => {} },            // the fixture ships dark
  customModes: { seed: () => {} },      // the fixture's `promo`
  brandColors: { seed: () => {} },      // the fixture's `acc`
  primary: 'a color', neutral: 'a color', status: 'keyed by status role, valued by color',
  actionPalette: { confirms: 1, seed: (b) => { b.actionPalette = 'acc'; delete b.interactivePalettes; } },
  linkPalette: { confirms: 1, seed: (b) => { b.linkPalette = 'acc'; } },
  roleColors: { confirms: 1, seed: (b) => { b.roleColors = { success: 'acc' }; } },
  surfaces: { confirms: 4, seed: (b) => {
    b.surfaces = {
      light: { inverseBase: { palette: 'acc', step: 900 }, inverseSecondary: { palette: 'acc', step: 800 }, inverseTertiary: { palette: 'acc', step: 700 } },
      dark: { inverseBase: { palette: 'acc', step: 800 } },
    };
  } },
  overrides: [
    { seed: (b) => {   // keyed by the column and the modes, valued by a palette that stays
      b.overrides = {
        light: { 'interactive.acc.fill.hover': { palette: 'primary', step: '600' } },
        dark: { 'inverse.interactive.acc.text.rest': { palette: 'primary', step: '200' }, 'interactive.primary.text.rest': { palette: 'primary', step: '200' } },
        promo: { 'interactive.acc.border.rest': { palette: 'acc', step: '700' } },
      } as BrandInput['overrides'];
    } },
    { heldOnRemove: true, seed: (b) => {   // valued by the color, on a role of another column: #3391 holds it
      b.overrides = { light: { 'interactive.primary.border.rest': { palette: 'acc', step: '600' } } } as BrandInput['overrides'];
    } },
  ],
  modeAnchors: { seed: (b) => { b.modeAnchors = { dark: { acc: 400 }, promo: { acc: 500 } } as BrandInput['modeAnchors']; } },
  modeLevers: { seed: (b) => { b.modeLevers = { dark: { tempo: 'relaxed' }, promo: { tempo: 'snappy' } } as BrandInput['modeLevers']; } },
  disabledStrategy: 'an enum', disabledMin: 'a number', iconContrast: 'an enum', outlineInteraction: 'an enum',
  outlineHoverFill: { confirms: 3, seed: (b) => {   // light's mode-wide pick, light's and dark's primary set; the acc sets are the column's
    b.outlineInteraction = 'opaque-fill';
    b.outlineHoverFill = {
      light: { hover: 'acc.100', pressed: 'acc.200', sets: { acc: { hover: 'neutral.100' }, primary: { hover: 'acc.100', pressed: 'neutral.200' } } },
      dark: { hover: 'neutral.900', sets: { primary: { hover: 'neutral.800', pressed: 'acc.800' } } },
      promo: { sets: { acc: { hover: 'neutral.100' } } },
    } as BrandInput['outlineHoverFill'];
  } },
  outlineWash: 'numbers', neutralEmphasis: 'an enum', raisedSurface: 'an enum', scrimStrength: 'an enum', secondaryTextGround: 'an enum',
  glassRoles: [
    { heldOnRemove: true, seed: (b) => { b.glassRoles = { card: { palette: 'acc.100', alpha: 60 } }; } },
    // A semantic role path under the color's column (#3710 review): it names the column, so it follows a rename and
    // holds both removals, the color's and the column's.
    { heldOnRemove: true, heldOnColumnRemove: true, seed: (b) => { b.glassRoles = { card: { role: 'interactive.acc.fill.rest', alpha: 60 } }; } },
  ],
  radioDot: 'an enum', strictInteractiveContrast: 'a flag',
  accentPalette: { confirms: 1, seed: (b) => { b.accentPalette = 'acc'; delete b.interactivePalettes; b.modeAnchors = { dark: { accent: 400 } } as BrandInput['modeAnchors']; } },
  interactivePalettes: [
    { seed: () => {} },   // the fixture's unnamed `acc` column
    { seed: (b) => {      // a column with its own name, drawn from the color
      b.interactivePalettes = [{ name: 'cta', palette: 'acc' }];
      b.modeAnchors = { dark: { cta: 400 } } as BrandInput['modeAnchors'];
      b.overrides = { light: { 'interactive.cta.fill.hover': { palette: 'primary', step: '600' } } } as BrandInput['overrides'];
      b.outlineInteraction = 'opaque-fill';
      b.outlineHoverFill = { light: { sets: { cta: { hover: 'neutral.100' } } } } as BrandInput['outlineHoverFill'];
    } },
  ],
  actionAnchorStep: 'a number', destructiveAnchorStep: 'a number', linkStateRungs: 'numbers', motionPersonality: 'a motion setting',
  typography: 'type settings (font names, not palettes)', shadow: 'numbers', layout: 'numbers keyed by breakpoint',
  gradients: { confirms: 1, seed: (b) => { b.gradients = [{ name: 'hero', stops: [{ palette: 'acc', step: 500, position: 0 }, { palette: 'primary', step: 500, position: 1 }] }]; } },
  density: 'an enum', radiusScale: 'a number', baseMd: 'a number', controlShape: 'an enum', fieldStyle: 'an enum', searchFieldStyle: 'an enum',
  tagStyle: 'an enum', dialogTitleSize: 'an enum', bannerStyle: 'an enum', currentIndicator: 'an enum', radiusHairline: 'a flag',
  buttonIcons: 'an enum', buttonContentSize: 'an enum', buttonMinWidthMultiplier: 'a number', buttonLabelWeight: 'an enum', buttonTextHover: 'an enum',
};
/** `surfaces.<mode>`'s keys, by hand: the inverse band and tiers may be `{ palette, step }`; the page tiers are neutral steps. */
const SURFACE_NAMING = ['inverseBase', 'inverseSecondary', 'inverseTertiary'];
const SURFACE_PLAIN = ['base', 'floorStep', 'secondary', 'tertiary'];
/** The named object types a naming field holds, each key by hand: the seed that writes it naming `acc`, or why it names
 *  nothing. `SurfaceMode` is the lists above. */
const NESTED: Record<string, Record<string, string>> = {
  GlassRoleInput: { role: 'seeded: glassRoles #2 (a column)', palette: 'seeded: glassRoles #1 (a palette step)', alpha: 'a number' },
  OutlineHoverPick: { hover: 'seeded: outlineHoverFill (a palette step)', pressed: 'seeded: outlineHoverFill (a palette step)' },
  GradientInput: { name: 'the gradient\'s own name', kind: 'an enum', angle: 'a number', center: 'numbers', shape: 'an enum', interpolation: 'an enum', samples: 'a number', stops: 'the stops, below' },
  GradientStopInput: { palette: 'seeded: gradients', step: 'a number', position: 'a number' },
};

console.log('\n0. Every BrandInput field is classified by hand, read from the type');
const typeKeys = keysOf('BrandInput');
ok(typeKeys.length > 40, `the BrandInput type is read from packages/engine/theme.ts (${typeKeys.length} fields)`);
for (const k of typeKeys) ok(k in FIELDS, `BrandInput.${k} is classified: it names a palette, column or mode and is seeded, or it says why not`);
for (const k of Object.keys(FIELDS)) ok(typeKeys.includes(k), `the classification's ${k} is still a BrandInput field`);
const surfaceKeys = keysOf('SurfaceMode');
for (const k of surfaceKeys) ok(SURFACE_NAMING.includes(k) || SURFACE_PLAIN.includes(k), `surfaces.<mode>.${k} is classified`);
for (const [type, by] of Object.entries(NESTED)) {
  const keys = keysOf(type);
  ok(keys.length > 0, `the ${type} type is read from packages/engine/theme.ts (${keys.length} fields)`);
  for (const k of keys) ok(k in by, `${type}.${k} is classified: it names a palette, column or mode and is seeded, or it says why not`);
  for (const k of Object.keys(by)) ok(keys.includes(k), `the classification's ${type}.${k} is still a field`);
}

// ── the fixture, the scan and the engine's answer ───────────────────────────────────────────────
const fixture = (): Brand => {
  const b = structuredClone((exampleBrands as Record<string, BrandInput>).harbor) as Brand;
  b.modes = ['light', 'dark', 'hc-light', 'hc-dark', 'wireframe'];
  b.customModes = [{ name: 'promo', base: 'light' }];
  b.brandColors = [{ name: 'acc', oklch: { l: 0.55, c: 0.15, h: 300 } }];
  b.interactivePalettes = [{ palette: 'acc' }];
  return b;
};
const load = (b: Brand): void => { store.initSession(b, { kind: 'example', id: 'harbor' }); store.rebuild(); };
const resolves = (): string | null => {
  try { resolvePreview(brandTheme(structuredClone(store.brandState))); return null; } catch (e) { return (e as Error).message; }
};
/** Where `token` survives in the brand as a dotted segment: in a key (`keys`), or in a key or a string value (`all`). */
const survivors = (token: string, where: 'keys' | 'all'): string[] => {
  const out: string[] = [];
  const hit = (s: string): boolean => s.split('.').includes(token);
  const walk = (v: unknown, path: string): void => {
    if (typeof v === 'string') { if (where === 'all' && hit(v)) out.push(`${path} = ${v}`); return; }
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) { if (hit(k)) out.push(`${path}.${k}`); walk(x, `${path}.${k}`); }
  };
  walk(store.brandState, 'brand');
  return out;
};

const scenarios = Object.entries(FIELDS).flatMap(([field, c]) => (typeof c === 'string' ? [] : (Array.isArray(c) ? c : [c]).map((s, n) => ({ field: `${field}${Array.isArray(c) ? ` #${n + 1}` : ''}`, ...s }))));
const fixtureEffects = (): string[] => { load(fixture()); return P.removalEffects('acc'); };
const seeded = (s: { seed: (b: Brand) => void }): boolean => {
  const b = fixture();
  s.seed(b);
  load(b);
  return store.lastError === null;
};

for (const s of scenarios) {
  console.log(`\n${s.field}`);
  ok(seeded(s), `${s.field}: the seeded brand resolves (${store.lastError ?? 'yes'})`);
  for (const k of SURFACE_NAMING) if (s.field === 'surfaces') ok(!!store.brandState.surfaces?.light?.[k as 'inverseBase'], `surfaces: surfaces.light.${k} is seeded`);

  // Rename the color. Nothing may still say `acc`.
  seeded(s);
  ok(P.renameBrandColor(0, 'acx'), `${s.field}: renaming acc to acx is taken`);
  ok(resolves() === null, `${s.field}: after the rename the brand resolves (${resolves() ?? 'yes'})`);
  ok(!survivors('acc', 'all').length, `${s.field}: after the rename nothing names acc (${survivors('acc', 'all').join(', ') || 'none'})`);

  // Remove the color. Held: refused whole. Otherwise: nothing may still name it, or the column it drew.
  seeded(s);
  const before = JSON.stringify(store.brandState);
  const why = P.removeBrandColor(0);
  if (s.heldOnRemove) {
    ok(why !== null && JSON.stringify(store.brandState) === before, `${s.field}: removing acc is refused whole while it is held, the brand byte for byte (${why ?? 'it was taken'})`);
    ok(P.removalEffects('acc').some((e) => e.includes('can’t be removed') || e.includes("can't be removed")), `${s.field}: the confirm says the held color can't be removed (${JSON.stringify(P.removalEffects('acc'))})`);
  } else {
    ok(why === null, `${s.field}: removing acc is taken (${why ?? 'yes'})`);
    ok(resolves() === null, `${s.field}: after the removal the brand resolves (${resolves() ?? 'yes'})`);
    const left = [...survivors('acc', 'all'), ...survivors('cta', 'all'), ...survivors('accent', 'keys')];
    ok(!left.length, `${s.field}: after the removal nothing names acc or its column (${left.join(', ') || 'none'})`);
  }
  if (s.confirms !== undefined) {
    const base = new Set(fixtureEffects());
    seeded(s);
    const added = [...new Set(P.removalEffects('acc'))].filter((e) => e.trim() && !base.has(e));
    ok(added.length === s.confirms, `${s.field}: the removal confirm adds ${s.confirms} line(s) to the fixture's (${JSON.stringify(added)})`);
  }

  // Remove the color's column, where it has one. The color stays, so only a key may not name the column.
  seeded(s);
  const ci = (store.brandState.interactivePalettes ?? []).findIndex((e) => e.palette === 'acc');
  if (ci >= 0) {
    const col = store.brandState.interactivePalettes![ci].name ?? 'acc';
    const was = JSON.stringify(store.brandState);
    const whyCol = I.removeAccent(ci);
    if (s.heldOnColumnRemove) {
      ok(whyCol !== null && JSON.stringify(store.brandState) === was, `${s.field}: removing the ${col} column is refused whole while it is held, the brand byte for byte (${whyCol ?? 'it was taken'})`);
    } else {
      ok(whyCol === null, `${s.field}: removing the ${col} column is taken (${whyCol ?? 'yes'})`);
      ok(resolves() === null, `${s.field}: after the column's removal the brand resolves (${resolves() ?? 'yes'})`);
      ok(!survivors(col, 'keys').length, `${s.field}: after the column's removal no key names ${col} (${survivors(col, 'keys').join(', ') || 'none'})`);
    }
  }

  // Rename and remove the custom mode, and turn Dark off.
  seeded(s);
  ok(B.renameCustomMode(0, 'prx'), `${s.field}: renaming promo to prx is taken`);
  ok(resolves() === null && !survivors('promo', 'all').length, `${s.field}: after the mode's rename the brand resolves and nothing names promo (${resolves() ?? survivors('promo', 'all').join(', ') ?? ''})`);
  seeded(s);
  ok(B.removeCustomMode(0) === null, `${s.field}: removing promo is taken`);
  ok(resolves() === null && !survivors('promo', 'all').length, `${s.field}: after the mode's removal the brand resolves and nothing names promo (${resolves() ?? survivors('promo', 'all').join(', ') ?? ''})`);
  seeded(s);
  ok(B.setModeOff('dark') === null, `${s.field}: turning Dark off is taken`);
  ok(resolves() === null && !survivors('dark', 'keys').length, `${s.field}: with Dark off the brand resolves and no key names dark (${resolves() ?? survivors('dark', 'keys').join(', ') ?? ''})`);
}

console.log('\nM1: a refused removal leaves the brand, the last-good input and storage together');
{
  const writes: BrandInput[] = [];
  store.setPersist((b) => writes.push(structuredClone(b)));
  const s = (FIELDS.overrides as Seed[])[1];
  seeded(s);
  const good = JSON.stringify(store.lastGoodInput);
  const why = P.removeBrandColor(0);
  store.rebuild();
  ok(why !== null && JSON.stringify(store.brandState) === good && JSON.stringify(store.lastGoodInput) === good,
    `the brand and the last-good input still hold acc (${JSON.stringify(store.brandState.brandColors)})`);
  ok(writes.every((w) => JSON.stringify(w) === good), `storage was only ever written the brand with acc (${writes.length} writes)`);
  store.setPersist(null);
}

console.log(`\n${executed - failed}/${executed} name cascade assertions passed.`);
if (failed) process.exit(1);
