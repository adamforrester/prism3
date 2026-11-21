/**
 * #4206: a brand stored in a file before a validation tightened loads, migrated, with a note (`src/state/legacy-input.ts`).
 *
 *   npx tsx apps/studio/test-legacy-input.ts
 *
 * INDEPENDENCE (docs/34). Each legacy shape is a literal planted on the aurora example, and the premise of each arm is the
 * ENGINE's own refusal of it, asked directly. "It loads" is the engine's `brandTheme` taking the migrated brand, and the
 * restore's own check, `reduce` in `host-session.ts`, accepting it. Every expected value (the step an anchor moves to, the
 * keys left) is a literal typed here, read off the aurora ramps (25, 50, 100, …, 950 by 50), never off the module.
 *
 * Mutations that fail here by name: drop the `links` fix → `#4206 links: …`; drop the unknown-column fix → `#4206
 * modeAnchors column: …`; drop the off-ramp loop → `#4206 off-ramp …`; let the loop move a step the refusal does not name
 * (a different regex group) → `#4206 off-ramp …: … moves to`.
 */
import { brandTheme, type BrandInput } from '@prism3/engine';
import { EXAMPLE_BRANDS_JSON as exampleBrands } from '@prism3/engine';
import { migrateStoredInput, migratedLine } from './src/state/legacy-input';
import { initialHostSession, reduce } from './src/state/host-session';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const aurora = (exampleBrands as Record<string, BrandInput>).aurora;
const plant = (patch: Record<string, unknown>): Record<string, unknown> => ({ ...structuredClone(aurora), ...patch });
const refusal = (b: unknown): string | null => { try { brandTheme(structuredClone(b) as BrandInput); return null; } catch (e) { return (e as Error).message; } };
/** The restore's own check: `reduce` returns a new session for a blob it accepts, the same one for a refusal. */
const restores = (input: unknown): boolean => { const s0 = initialHostSession(); return reduce(s0, { kind: 'restore-input', input }) !== s0; };

console.log('\n1. #4206: a current brand comes through untouched');
{
  const b = plant({});
  const m = migrateStoredInput(b);
  ok(m.input === b && m.notes.length === 0, `#4206 current: the aurora example is returned as given, with no note (${m.notes.length} notes)`);
  const junk = { name: 'b' };
  const j = migrateStoredInput(junk);
  ok(j.input === junk && j.notes.length === 0, '#4206 current: a blob the engine refuses for another reason is returned as given');
  const other = plant({ surfaces: { light: { base: 'grey' } } });
  const o = migrateStoredInput(other);
  ok(o.input === other && o.notes.length === 0 && refusal(o.input) !== null, '#4206 current: a brand refused for a reason no migration covers stays refused, unchanged');
  // Review S1 (#4285): a current brand with something for each fix to touch. An unnamed interactive column is named after its
  // palette, and a named one by its name; both key a valid modeAnchors entry, so a migration that misreads either column
  // drops a valid anchor from a brand the engine accepts.
  const cols = plant({
    brandColors: [...(aurora.brandColors ?? []), { name: 'teal', oklch: { l: 0.6, c: 0.11, h: 190 } }, { name: 'coral', oklch: { l: 0.65, c: 0.15, h: 30 } }],
    interactivePalettes: [{ palette: 'teal' }, { name: 'promo', palette: 'coral' }],
    modeAnchors: { dark: { teal: 400, promo: 300 } },
  });
  ok(refusal(cols) === null, `#4206 current columns premise: the engine accepts the brand with an unnamed and a named interactive column (${refusal(cols)})`);
  const c = migrateStoredInput(cols);
  ok(c.input === cols && c.notes.length === 0, `#4206 current columns: a brand whose anchors key an unnamed and a named interactive column is returned as given, with no note (${JSON.stringify(c.notes)})`);
}

console.log('\n2. #4206: typography.links: [] (written by the Studio before #3707)');
{
  const b = plant({ typography: { ...(aurora as { typography?: object }).typography, links: [] } });
  ok(/typography\.links is empty/.test(refusal(b) ?? ''), `#4206 links premise: the engine refuses the stored brand, as #3707 made it (${refusal(b)})`);
  ok(!restores(b), '#4206 links premise: the restore refuses it as stored');
  const m = migrateStoredInput(b);
  const t = (m.input as { typography?: Record<string, unknown> }).typography ?? {};
  ok(!('links' in t) && refusal(m.input) === null && restores(m.input), `#4206 links: the migrated brand drops the empty list and loads (${refusal(m.input)})`);
  ok(m.notes.length === 1 && /Link styles/.test(m.notes[0]), `#4206 links: one note names the link styles (${JSON.stringify(m.notes)})`);
  ok(JSON.stringify((b as { typography: { links: unknown } }).typography.links) === '[]', '#4206 links: the stored blob itself is not changed');
}

console.log('\n3. #4206: a modeAnchors column that is no interactive column (ignored before #3873)');
{
  const b = plant({ modeAnchors: { dark: { secondary: 500, primary: 400 }, light: { ghost: 300 } } });
  ok(/'secondary' is not an interactive column/.test(refusal(b) ?? ''), `#4206 modeAnchors column premise: the engine refuses it, as #3873 made it (${refusal(b)})`);
  const m = migrateStoredInput(b);
  ok(JSON.stringify((m.input as { modeAnchors?: unknown }).modeAnchors) === JSON.stringify({ dark: { primary: 400 } }) && refusal(m.input) === null && restores(m.input),
    `#4206 modeAnchors column: secondary and ghost go, primary stays, an emptied mode goes, and it loads (${JSON.stringify((m.input as { modeAnchors?: unknown }).modeAnchors)})`);
  ok(m.notes.length === 2 && m.notes.every((n) => /no button set has that name/.test(n)), `#4206 modeAnchors column: one note per column dropped (${JSON.stringify(m.notes)})`);
  const legacy = plant({ brandColors: [...(aurora.brandColors ?? []), { name: 'teal', oklch: { l: 0.6, c: 0.11, h: 190 } }], accentPalette: 'teal', modeAnchors: { dark: { accent: 400 } } });
  const lm = migrateStoredInput(legacy);
  ok(refusal(legacy) === null && lm.input === legacy && lm.notes.length === 0, `#4206 modeAnchors column: the legacy accentPalette's own 'accent' column is a column, and stays (${refusal(legacy)})`);
}

console.log('\n4. #4206: an anchor step off its ramp (fell back to 500 before #3873)');
{
  const b = plant({ actionAnchorStep: 333, destructiveAnchorStep: 777, modeAnchors: { dark: { primary: 520 } } });
  ok(/the nearest step is/.test(refusal(b) ?? ''), `#4206 off-ramp premise: the engine refuses it (${refusal(b)})`);
  const m = migrateStoredInput(b);
  const mi = m.input as { actionAnchorStep?: number; destructiveAnchorStep?: number; modeAnchors?: { dark?: { primary?: number } } };
  ok(mi.actionAnchorStep === 350, `#4206 off-ramp actionAnchorStep: 333 moves to 350 (${mi.actionAnchorStep})`);
  ok(mi.destructiveAnchorStep === 800, `#4206 off-ramp destructiveAnchorStep: 777 moves to 800 (${mi.destructiveAnchorStep})`);
  ok(mi.modeAnchors?.dark?.primary === 500, `#4206 off-ramp modeAnchors.dark.primary: 520 moves to 500 (${mi.modeAnchors?.dark?.primary})`);
  ok(refusal(m.input) === null && restores(m.input), `#4206 off-ramp: the migrated brand loads (${refusal(m.input)})`);
  ok(m.notes.length === 3 && m.notes.some((n) => /from 333 to 350/.test(n)) && m.notes.some((n) => /dark anchor for 'primary' moved from 520 to 500/.test(n)),
    `#4206 off-ramp: one note per anchor moved, naming both steps (${JSON.stringify(m.notes)})`);
  const ip = plant({ brandColors: [...(aurora.brandColors ?? []), { name: 'teal', oklch: { l: 0.6, c: 0.11, h: 190 } }], interactivePalettes: [{ palette: 'teal', anchorStep: 610 }] });
  const im = migrateStoredInput(ip);
  ok(/interactivePalettes\[0\]\.anchorStep/.test(refusal(ip) ?? '') && (im.input as { interactivePalettes: { anchorStep: number }[] }).interactivePalettes[0].anchorStep === 600 && refusal(im.input) === null,
    `#4206 off-ramp interactivePalettes[0].anchorStep: 610 moves to 600 and loads (${JSON.stringify((im.input as { interactivePalettes: unknown }).interactivePalettes)})`);
}

console.log('\n5. #4206: every legacy shape at once, and the strip line');
{
  const b = plant({ typography: { ...(aurora as { typography?: object }).typography, links: [] }, modeAnchors: { dark: { secondary: 500, primary: 520 } } });
  const m = migrateStoredInput(b);
  ok(refusal(m.input) === null && restores(m.input) && m.notes.length === 3, `#4206 all: the three fixes together load, with three notes (${JSON.stringify(m.notes)})`);
  const line = migratedLine(m.notes);
  ok(line.startsWith("This file's saved brand was updated to load") && m.notes.every((n) => line.includes(n)) && /Update file/.test(line),
    `#4206 all: the strip line carries every note and names Update file ("${line}")`);
}

console.log(`\n${executed - failed}/${executed} legacy-input assertions passed.`);
if (failed) process.exit(1);
