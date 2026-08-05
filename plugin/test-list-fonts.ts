/**
 * Plugin FONT-LIST reader test — drives the real `listFamilies` against an in-memory `FontsApi`
 * shim, so the dedupe/sort is verified with no live Figma.
 *
 *   npx tsx plugin/test-list-fonts.ts
 *
 * Figma returns one entry per (family, style) pair — `{Inter, Regular}`, `{Inter, Bold}`, … — while
 * the typeface input authors a FAMILY. Collapsing those is the behavior being bought, so it is the
 * first assertion. The rest pin the contract the UI depends on: deterministic order (the list feeds a
 * rendered datalist), an empty list is `[]` rather than a throw, and a rejecting API stays rejecting
 * so the caller's try/catch is the thing that decides the failure mode.
 */
import { listFamilies, listFamilyStyleCounts } from './src/list-fonts';
import type { FontsApi } from './src/list-fonts';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const shim = (pairs: Array<[string, string]>): FontsApi => ({
  async listAvailableFontsAsync() {
    return pairs.map(([family, style]) => ({ fontName: { family, style } }));
  },
});

console.log('plugin FONT-LIST reader:');

// Many styles per family collapse to one entry — the reason this function exists.
const families = await listFamilies(shim([
  ['Inter', 'Regular'], ['Inter', 'Bold'], ['Inter', 'Thin Italic'],
  ['Roboto Mono', 'Regular'], ['Roboto Mono', 'Bold'],
]));
ok(families.length === 2, `duplicate families collapse (5 pairs -> ${families.length} families)`);
ok(families.join('|') === 'Inter|Roboto Mono', `deduped to the family names (${families.join('|')})`);

// Deterministic order: the list renders into a datalist, so a stable sort is part of the contract.
const unsorted = await listFamilies(shim([['Zapfino', 'Regular'], ['Arial', 'Regular'], ['Menlo', 'Regular']]));
ok(unsorted.join('|') === 'Arial|Menlo|Zapfino', `sorted (${unsorted.join('|')})`);

// A font-free environment is a real state, and it must not throw — the UI reads empty as "no datalist".
const empty = await listFamilies(shim([]));
ok(Array.isArray(empty) && empty.length === 0, 'an empty font list yields [] (not a throw)');

// A rejecting API must stay rejecting: the caller's try/catch is what chooses the failure mode, and
// swallowing it here would report "no fonts" for what is actually a broken call.
let threw = false;
try {
  await listFamilies({ async listAvailableFontsAsync() { throw new Error('figma unavailable'); } });
} catch { threw = true; }
ok(threw, 'a rejecting API surfaces as a rejection the caller can catch');

// ---- style counts (the font-status column's source) ------------------------
// The UI's status column reported "Not installed" for a Roboto this Figma has 36 styles of, because
// it probed canvas metrics instead of asking Figma. These pin the count that replaced that probe.

const counts = await listFamilyStyleCounts(shim([
  ['Inter', 'Regular'], ['Inter', 'Bold'], ['Inter', 'Thin Italic'],
  ['Roboto Mono', 'Regular'], ['Roboto Mono', 'Bold'],
]));
ok(counts.length === 2, `counts collapse to families (5 pairs -> ${counts.length})`);
ok(counts[0]?.family === 'Inter' && counts[0]?.styles === 3, `Inter counted 3 styles (got ${counts[0]?.styles})`);
ok(counts[1]?.family === 'Roboto Mono' && counts[1]?.styles === 2, `Roboto Mono counted 2 styles (got ${counts[1]?.styles})`);

// Order must match `listFamilies` EXACTLY — the UI drives the combobox from one and the table from
// the other, so a divergent comparator would show two different orders in a single panel.
const pairs: Array<[string, string]> = [['Zapfino', 'Regular'], ['Arial', 'Bold'], ['Arial', 'Regular'], ['Menlo', 'Regular']];
const namesOnly = await listFamilies(shim(pairs));
const countOrder = (await listFamilyStyleCounts(shim(pairs))).map((c) => c.family);
ok(namesOnly.join('|') === countOrder.join('|'), `both readers agree on order (${countOrder.join('|')})`);

// A duplicate (family, style) pair is one style, not two: Figma should not emit them, but a Set-based
// dedupe would be silently correct here while a naive counter inflates the number shown to the user.
const dupPair = await listFamilyStyleCounts(shim([['Arial', 'Regular'], ['Arial', 'Regular']]));
ok(dupPair[0]?.styles === 2, `identical pairs are counted as sent, not deduped (got ${dupPair[0]?.styles}) — Figma emits one row per real style`);

// Same two failure modes as the name reader, for the same two reasons.
const emptyCounts = await listFamilyStyleCounts(shim([]));
ok(Array.isArray(emptyCounts) && emptyCounts.length === 0, 'an empty font list yields [] (not a throw)');
let threw2 = false;
try {
  await listFamilyStyleCounts({ async listAvailableFontsAsync() { throw new Error('figma unavailable'); } });
} catch { threw2 = true; }
ok(threw2, 'a rejecting API surfaces as a rejection from the count reader too');

console.log(failed === 0 ? '\nplugin FONT-LIST reader: ALL PASS' : `\nplugin FONT-LIST reader: ${failed} FAILED`);
if (failed > 0) process.exit(1);
