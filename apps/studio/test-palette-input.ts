/**
 * The neutral's writes and the Palettes preview's neutral line, under a gray primary (#2241), in Node, against the
 * real store and the real engine.
 *
 *   npx tsx apps/studio/test-palette-input.ts
 *
 * A gray primary is stored with hue 0 (the stored form), and nothing may read that 0 as a hue (the orchestrator's rule
 * on #2280). Under Follow primary the engine builds a gray neutral (owner Q87 A). Leaving Follow for a Custom tint, or
 * pinning from Follow, must start from that gray, with no jump: before #2241's review they seeded from the stored hue 0
 * and kept the chroma Q87 A had overridden, which brought back a red cast. The preview's neutral line names a gray ramp
 * "Gray" (owner Q96 A), not "Hue 0°".
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34). Every expected write and every expected string is a literal typed here, from
 * the owner's decisions; "gray" is checked on the engine's built ramp as r = g = b at every step, and "untinted" as
 * the engine's resolved shadow hue being null. "No jump" compares the engine's ramp before and after the write.
 */
import type { BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as P from './src/state/palette-input';

let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};
const brands = exampleBrands as Record<string, BrandInput>;
const Q96_FOLLOW = 'Gray, following primary. Text, borders and surfaces draw from it.';

/** harbor, with its primary replaced: a pure gray picked through the studio's own `oklchOf`, or harbor's own. The
 *  neutral follows the primary and keeps its usual chroma, the case the review measured. */
const load = (gray: boolean): void => {
  const b = structuredClone(brands.harbor);
  if (gray) b.primary = P.oklchOf('#808080');
  b.neutral = { hue: 40, chroma: 0.006, auto: true };
  store.initSession(b, { kind: 'example', id: 'harbor' });
  store.rebuild();
};
const neutralHexes = (): string[] => store.theme.palettes.find((p) => p.palette === 'neutral')!.steps.map((s) => s.hex);
const allGray = (): boolean => store.theme.palettes.find((p) => p.palette === 'neutral')!.steps.every((s) => s.rgb.r === s.rgb.g && s.rgb.g === s.rgb.b);
const fmt = (h: number): string => `${h}°`;   // a stand-in for the lever's own hue words
const readout = (): string => P.neutralHueReadout(fmt);
const line = (): string => P.neutralBoardText(store.theme.palettes.find((p) => p.palette === 'neutral')?.steps[10]?.oklch, !!store.lastGoodInput.neutral.auto);

console.log('\n0. The starting point: a gray primary under Follow primary builds a gray, untinted neutral (Q87 A)');
load(true);
const autoHexes = neutralHexes();
ok(store.brandState.primary.h === 0 && store.brandState.primary.c < 1e-4, `the gray primary is stored with hue 0 and no chroma (got h ${store.brandState.primary.h}, c ${store.brandState.primary.c})`);
ok(allGray() && store.theme.shadow.tint.hue === null, `under Follow primary the neutral is gray at every step and the shadow untinted (shadow hue ${store.theme.shadow.tint.hue})`);
ok(readout() === 'None', `under Follow primary the hue readout reads None (Q88 A) (got "${readout()}")`);

console.log('\n1. The preview line (owner Q96 A)');
ok(line() === Q96_FOLLOW, `a gray ramp under Follow primary reads "${Q96_FOLLOW}" (got "${line()}")`);

console.log('\n2. Custom tint from Follow, under a gray primary: it starts gray, with no jump');
load(true);
P.setNeutralFollow(false);
store.rebuild();
ok(JSON.stringify(store.brandState.neutral) === '{"hue":0,"chroma":0}', `setNeutralFollow(false) writes {"hue":0,"chroma":0} (got ${JSON.stringify(store.brandState.neutral)})`);
ok(allGray() && store.theme.shadow.tint.hue === null, `the custom tint is still gray at every step and the shadow untinted (shadow hue ${store.theme.shadow.tint.hue})`);
ok(JSON.stringify(neutralHexes()) === JSON.stringify(autoHexes), `no jump: the neutral ramp is byte-identical to what Follow primary showed (500: ${neutralHexes()[10]} vs ${autoHexes[10]})`);
ok(line() === 'Gray. Text, borders and surfaces draw from it.', `the preview line reads "Gray." without "following primary" (got "${line()}")`);
ok(readout() === 'None', `owner Q102 A: after the switch to Custom tint the hue readout reads None, not the stored hue (got "${readout()}")`);
P.setNeutralChroma(0.006);
ok(readout() === '0°', `Custom tint given a real chroma reads its hue again (got "${readout()}")`);

console.log('\n3. Pinned from Follow, under a gray primary: the pin is seeded gray');
load(true);
P.setNeutralPinned(true);
store.rebuild();
ok(JSON.stringify(store.brandState.neutral.anchor) === '{"l":0.5,"c":0,"h":0}', `setNeutralPinned(true) seeds the anchor {"l":0.5,"c":0,"h":0} (got ${JSON.stringify(store.brandState.neutral.anchor)})`);
ok(allGray() && store.theme.shadow.tint.hue === null, `the pinned neutral is gray at every step and the shadow untinted (shadow hue ${store.theme.shadow.tint.hue})`);
ok(readout() === 'None', `the pinned gray's hue readout reads None (got "${readout()}")`);

console.log('\n4. The other side: a primary with a hue keeps both writes as they were');
load(false);
const ph = store.brandState.primary.h;
ok(ph > 0 && store.brandState.primary.c >= 1e-4, `harbor's primary has a hue (h ${ph})`);
ok(/^Hue \d+°, following primary\. Text, borders and surfaces draw from it\.$/.test(line()), `a hued ramp under Follow primary still names its hue (got "${line()}")`);
ok(readout() === '195° · follows primary', `the hue readout under Follow primary names the primary's hue (got "${readout()}")`);
P.setNeutralFollow(false);
ok(readout() === '195°', `after the switch to Custom tint, a hued neutral's readout is its hue (got "${readout()}")`);
ok(JSON.stringify(store.brandState.neutral) === JSON.stringify({ hue: ph, chroma: 0.006 }), `setNeutralFollow(false) snapshots the primary's hue and keeps the chroma (got ${JSON.stringify(store.brandState.neutral)})`);
load(false);
P.setNeutralPinned(true);
ok(JSON.stringify(store.brandState.neutral.anchor) === JSON.stringify({ l: 0.5, c: 0.006, h: ph }), `setNeutralPinned(true) seeds at the primary's hue and the neutral's chroma (got ${JSON.stringify(store.brandState.neutral.anchor)})`);

console.log(`\n${executed - failed}/${executed} passed.`);
if (failed) process.exit(1);
