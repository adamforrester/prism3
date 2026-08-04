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
import { listFamilies } from './src/list-fonts';
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

console.log(failed === 0 ? '\nplugin FONT-LIST reader: ALL PASS' : `\nplugin FONT-LIST reader: ${failed} FAILED`);
if (failed > 0) process.exit(1);
