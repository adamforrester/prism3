/**
 * Layout's writes (UI redesign S10), in Node, against the real store and the real engine.
 *
 *   npx tsx apps/studio/test-layout-input.ts
 *
 * `src/state/layout-input.ts` holds every edit the Layout page makes to the working brand: the breakpoint list and
 * owner decision D13's re-keying (#2045), the grid columns, each breakpoint's column, gutter and margin override, and
 * the two container widths. This holds each write where no DOM is needed, so one can fail here by name before the
 * browser suites run.
 *
 * INDEPENDENT OF WHAT IT CHECKS (docs/34). Every expected write is a literal typed here: the breakpoint list, which
 * name each setting lands under, the map deleted rather than left `{}`. The names are the engine's, written out by hand
 * from its documented rule (up to five breakpoints run sm…2xl, six xs…2xl, seven xs…3xl), never read from the module's
 * `namesFor`; and "the setting stays with its breakpoint" is checked against the ENGINE's own resolution (`brandTheme`'s
 * grid at that width), never the module's opinion of itself.
 *
 * Mutations this fails by name (each run after a commit):
 *   · `setOverride`'s emptied-map delete removed (an emptied map left as `{}`) →
 *     `setGapOverride(gutter, md, auto) on the last entry deletes layout.gutterOverrides`;
 *   · D13's re-keying removed from `commitBreakpoints` (each map left as it was) →
 *     `D13: adding a breakpoint keeps md's 6 columns on the 768px breakpoint, now sm`;
 *   · `editBreakpoint`'s two-breakpoint refusal removed (the merge allowed) →
 *     `D13: at two breakpoints, an edit onto the other's width is refused and the list is unchanged (two to seven)`.
 */
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import * as store from './src/state/store';
import * as L from './src/state/layout-input';

let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};
const prism3 = (exampleBrands as Record<string, BrandInput>).prism3;
const reset = (layout?: BrandInput['layout']): void => {
  const b = structuredClone(prism3);
  if (layout) b.layout = structuredClone(layout);
  store.initSession(b, { kind: 'example', id: 'prism3' });
};
const J = (v: unknown): string => JSON.stringify(v);
const lay = (): BrandInput['layout'] => store.brandState.layout;
/** The engine's grid entry at the breakpoint that starts at `px`, from the working brand as it stands. */
const gridAt = (px: number): { bp: string; columns: number; gutterPx: number; marginPx: number } | undefined => {
  const t = brandTheme(structuredClone(store.brandState));
  const bp = t.layout.breakpoints.find((b) => b.px === px);
  return bp ? t.layout.grid.find((g) => g.bp === bp.name) : undefined;
};
const takes = (): boolean => { try { brandTheme(structuredClone(store.brandState)); return true; } catch { return false; } };

console.log('\n1. Grid columns, the per-breakpoint overrides and the containers write what the legacy page wrote');
reset();
L.setColumns(10);
ok(lay()?.columns === 10 && takes() && brandTheme(structuredClone(store.brandState)).layout.baseColumns === 10, `setColumns(10) writes layout.columns 10, off the offered list, and the engine takes it (#2047) — ${J(lay())}`);
reset();
L.setColumnOverride('md', 6);
ok(J(lay()) === J({ columnOverrides: { md: 6 } }) && gridAt(768)?.columns === 6, `setColumnOverride(md, 6) writes columnOverrides.md 6 and the engine's 768px grid has 6 columns — ${J(lay())}`);
L.setColumnOverride('md', undefined);
ok(J(lay()) === '{}', `setColumnOverride(md, auto) on the last entry deletes layout.columnOverrides (the legacy page left layout as {}) — ${J(lay())}`);
L.setGapOverride('gutterOverrides', 'md', 4);
L.setGapOverride('marginOverrides', 'lg', 40);
ok(J(lay()) === J({ gutterOverrides: { md: 4 }, marginOverrides: { lg: 40 } }) && gridAt(768)?.gutterPx === 4 && gridAt(1024)?.marginPx === 40,
  `setGapOverride writes a spacing step per breakpoint, and the engine's grid takes it — ${J(lay())}`);
L.setGapOverride('gutterOverrides', 'md', undefined);
ok(lay()?.gutterOverrides === undefined && 'gutterOverrides' in (lay() ?? {}) === false, `setGapOverride(gutter, md, auto) on the last entry deletes layout.gutterOverrides — ${J(lay())}`);
L.setGapOverride('marginOverrides', 'lg', undefined);
ok(J(lay()) === '{}', `setGapOverride(margin, lg, auto) on the last entry deletes layout.marginOverrides — ${J(lay())}`);
L.setGapOverride('gutterOverrides', 'md', 5);
ok(!takes(), 'an off-scale gutter (5px) is refused by the engine, which is why the page offers only spacing steps (#1593)');
reset();
L.setContainer('containerMax', 1600);
L.setContainer('containerNarrow', 640);
ok(J(lay()) === J({ containerMax: 1600, containerNarrow: 640 }) && takes(), `setContainer writes both widths — ${J(lay())}`);

console.log('\n2. Breakpoints: the legacy clean-up');
reset();
let r = L.addBreakpoint();
ok(J(lay()?.breakpoints) === J([0, 768, 1024, 1440, 1920, 2176]) && r.dropped.length === 0, `addBreakpoint adds the widest plus 256 — ${J(lay()?.breakpoints)}`);
r = L.removeBreakpoint(5);
ok(J(lay()?.breakpoints) === J([0, 768, 1024, 1440, 1920]), `removeBreakpoint(5) takes it back off — ${J(lay()?.breakpoints)}`);
L.editBreakpoint(1, 800);
ok(J(lay()?.breakpoints) === J([0, 800, 1024, 1440, 1920]), `editBreakpoint(1, 800) moves md — ${J(lay()?.breakpoints)}`);
L.editBreakpoint(1, 1500);
ok(J(lay()?.breakpoints) === J([0, 1024, 1440, 1500, 1920]), `editBreakpoint past its neighbors sorts the list — ${J(lay()?.breakpoints)}`);
L.editBreakpoint(3, 1024);
ok(J(lay()?.breakpoints) === J([0, 1024, 1440, 1920]), `an edit onto another breakpoint's width merges the two (the legacy de-duplication) — ${J(lay()?.breakpoints)}`);

console.log('\n3. D13 (#2045): a per-breakpoint setting stays with its breakpoint when the names move');
reset({ columnOverrides: { md: 6 } });
r = L.addBreakpoint();
ok(J(lay()?.columnOverrides) === J({ sm: 6 }) && gridAt(768)?.columns === 6 && r.dropped.length === 0,
  `D13: adding a breakpoint keeps md's 6 columns on the 768px breakpoint, now sm — ${J(lay()?.columnOverrides)}, the engine's 768px grid ${J(gridAt(768))}`);
r = L.removeBreakpoint(5);
ok(J(lay()?.columnOverrides) === J({ md: 6 }) && gridAt(768)?.columns === 6, `D13: removing it again brings the 6 columns back under md, still at 768px — ${J(lay()?.columnOverrides)}`);
reset({ columnOverrides: { lg: 16 }, gutterOverrides: { xl: 32 }, marginOverrides: { '2xl': 64 } });
r = L.removeBreakpoint(1);
ok(J(lay()?.breakpoints) === J([0, 1024, 1440, 1920])
  && J(lay()?.columnOverrides) === J({ md: 16 }) && J(lay()?.gutterOverrides) === J({ lg: 32 }) && J(lay()?.marginOverrides) === J({ xl: 64 })
  && gridAt(1024)?.columns === 16 && gridAt(1440)?.gutterPx === 32 && gridAt(1920)?.marginPx === 64 && r.dropped.length === 0,
  `D13: removing md moves every other breakpoint's setting to its new name, each still at its width — ${J(lay())}`);
reset({ gutterOverrides: { md: 4 }, columnOverrides: { md: 6, lg: 8 } });
r = L.removeBreakpoint(1);
ok(J(r.dropped) === J(['md']) && lay()?.gutterOverrides === undefined && J(lay()?.columnOverrides) === J({ md: 8 }) && gridAt(1024)?.columns === 8,
  `D13: removing md drops md's settings (the emptied gutter map deleted, never {}), reports md, and lg's 8 columns follow lg to its new name — dropped ${J(r.dropped)}, ${J(lay())}`);
reset({ columnOverrides: { md: 6, lg: 8 } });
r = L.editBreakpoint(1, 1500);
ok(J(lay()?.columnOverrides) === J({ xl: 6, md: 8 }) && gridAt(1500)?.columns === 6 && gridAt(1024)?.columns === 8 && r.dropped.length === 0,
  `D13: an edited breakpoint keeps its settings under its new name, and the others follow theirs — ${J(lay()?.columnOverrides)}`);
reset({ columnOverrides: { md: 6, lg: 8 } });
r = L.editBreakpoint(2, 768);
ok(J(lay()?.breakpoints) === J([0, 768, 1440, 1920]) && J(lay()?.columnOverrides) === J({ md: 6 }) && J(r.dropped) === J(['lg']),
  `D13: an edit onto md's width merges lg into md; md keeps its setting, lg's is dropped and reported — ${J(lay())}, dropped ${J(r.dropped)}`);
reset({ columnOverrides: { xs: 6 } });
r = L.addBreakpoint();
ok(lay()?.columnOverrides === undefined && gridAt(0)?.columns === 4 && r.dropped.length === 0,
  `D13: an entry under a name no breakpoint has (xs, on five) is dropped, so it never lands on the new xs at 0px — ${J(lay())}, the engine's 0px grid ${J(gridAt(0))}`);
reset({ columnOverrides: { xl: 6, md: 8 } });
L.editBreakpoint(4, 2000);
ok(J(Object.keys(lay()?.columnOverrides ?? {})) === J(['xl', 'md']), `a change that renames nothing keeps the map's own key order (the legacy bytes) — ${J(lay()?.columnOverrides)}`);
reset({ breakpoints: [0, 480, 768, 1024, 1440, 1920], columnOverrides: { xs: 4, '2xl': 16 } });
r = L.removeBreakpoint(1);
ok(J(lay()?.columnOverrides) === J({ sm: 4, '2xl': 16 }) && gridAt(0)?.columns === 4 && gridAt(1920)?.columns === 16,
  `D13: six to five breakpoints renames xs to sm and keeps 2xl, each setting at its width — ${J(lay()?.columnOverrides)}`);
reset({ breakpoints: [0, 768], columnOverrides: { md: 6 } });
r = L.editBreakpoint(1, 0);
ok(r.refused === true && J(lay()?.breakpoints) === J([0, 768]) && J(lay()?.columnOverrides) === J({ md: 6 }) && r.dropped.length === 0,
  `D13: at two breakpoints, an edit onto the other's width is refused and the list is unchanged (two to seven) — ${J(r)}, ${J(lay())}`);
reset({ breakpoints: [0, 768, 1024] });
r = L.editBreakpoint(2, 768);
ok(!r.refused && J(lay()?.breakpoints) === J([0, 768]), `at three breakpoints the same merge is allowed and leaves two — ${J(lay()?.breakpoints)}`);
reset();
for (let i = 0; i < 2; i++) L.addBreakpoint();
ok(J(lay()?.breakpoints) === J([0, 768, 1024, 1440, 1920, 2176, 2432]) && brandTheme(structuredClone(store.brandState)).layout.breakpoints.at(-1)?.name === '3xl',
  `seven breakpoints run xs to 3xl in the engine — ${J(lay()?.breakpoints)}`);

console.log('\n4. #2146: the first breakpoint is 0 (after #2139). The state refuses to write a list that starts above 0, and one that arrives that way is explained, not thrown');
// The engine's approved sentence (#2139), restated as a literal so a change to it fails here by name.
const FIRST_MUST_BE_0 = (n: number): string => `The first breakpoint must be 0px. This brand starts at ${n}px.`;
reset({ breakpoints: [0, 768, 1024] });
let before = J(store.brandState);
r = L.removeBreakpoint(0);
ok(r.refused === true && r.dropped.length === 0 && J(store.brandState) === before,
  `removeBreakpoint(0) would leave [768, 1024], so it is refused and the brand is byte-identical — ${J(r)}, ${J(lay())}`);
r = L.editBreakpoint(0, 320);
ok(r.refused === true && J(store.brandState) === before,
  `editBreakpoint(0, 320) moves the first off 0, so it is refused and nothing is written — ${J(r)}, ${J(lay())}`);
r = L.editBreakpoint(1, 900);
ok(!r.refused && J(lay()?.breakpoints) === J([0, 900, 1024]), `an edit that keeps the first at 0 still writes — ${J(lay()?.breakpoints)}`);
// Loading a brand that starts above 0 refuses, in the engine's words (the import and restore paths catch this).
let loadErr = '';
try { reset({ breakpoints: [320, 768] }); } catch (e) { loadErr = (e as Error).message; }
ok(loadErr === FIRST_MUST_BE_0(320), `loading [320, 768] refuses with the approved sentence: "${loadErr}"`);
// An agent's live write mid-session: the store keeps the last good theme and the error line carries the sentence.
reset({ breakpoints: [0, 768] });
store.brandState.layout = { ...(store.brandState.layout ?? {}), breakpoints: [320, 768] };
store.rebuild();
ok(store.lastError === FIRST_MUST_BE_0(320) && J(store.theme.layout.breakpoints.map((b) => b.px)) === J([0, 768]),
  `a live write of [320, 768] keeps the last good theme ([0, 768]) and sets lastError to the approved sentence: "${store.lastError}"`);
let names: readonly string[] = [];
let threw = '';
try { names = L.namesFor(L.breakpointsOf()); } catch (e) { threw = (e as Error).message; }
ok(threw === '' && J(names) === J(['sm', 'md']), `namesFor([320, 768]) names it by its count (sm, md) instead of throwing while the page draws it — ${threw || J(names)}`);
before = J(store.brandState);
threw = '';
try { r = L.addBreakpoint(); } catch (e) { threw = (e as Error).message; }
ok(threw === '' && r.refused === true && J(store.brandState) === before,
  `on that state, Add would keep the first above 0, so it is refused without throwing — ${threw || J(r)}`);

console.log('\n5. Owner Q189 A (#2146): the error line offers "Add a 0px breakpoint" for a brand that arrives starting above 0. One click inserts 0px first; nothing else changes');
reset({ breakpoints: [0, 768] });
ok(L.needsZeroBreakpoint() === false, 'a brand that starts at 0 is not offered the action');
store.brandState.layout = { ...(store.brandState.layout ?? {}), breakpoints: [320, 768], columnOverrides: { sm: 6, md: 10 } };
store.rebuild();
ok(L.needsZeroBreakpoint() === true, `a live write of [320, 768] is offered the action — lastError: "${store.lastError}"`);
r = L.addZeroBreakpoint();
ok(!r.refused && r.dropped.length === 0 && J(lay()?.breakpoints) === J([0, 320, 768]),
  `addZeroBreakpoint inserts 0 in front and keeps 320 and 768 exactly — ${J(r)}, ${J(lay()?.breakpoints)}`);
ok(J(lay()?.columnOverrides) === J({ md: 6, lg: 10 }),
  `each column setting follows its breakpoint to its new name (320: sm → md, 768: md → lg) — ${J(lay()?.columnOverrides)}`);
store.rebuild();
ok(store.lastError === null && J(store.theme.layout.breakpoints.map((b) => b.px)) === J([0, 320, 768]) && L.needsZeroBreakpoint() === false,
  `after the click the brand resolves at [0, 320, 768], the error line clears and the action goes — "${store.lastError}"`);
before = J(store.brandState);
r = L.addZeroBreakpoint();
ok(r.refused === true && J(store.brandState) === before, `on a list that already starts at 0 the action is refused and writes nothing — ${J(r)}`);

console.log('\n6. #2482 review: a refusal writes nothing, the names come before the write, and seven breakpoints starting above 0 (owner Q206 A)');
// The names are worked out BEFORE the write: a list the engine can't name (eight) is refused, writing nothing, never
// stored half-done with its settings left under the old names.
reset({ breakpoints: [0, 480, 768, 1024, 1440, 1920, 2560], columnOverrides: { xs: 4, '3xl': 16 } });
before = J(store.brandState);
threw = '';
try { r = L.addBreakpoint(); } catch (e) { threw = (e as Error).message; }
ok(threw === '' && r.refused === true && J(store.brandState) === before,
  `an eighth breakpoint is refused before anything is written, the seven and their settings byte-identical — ${threw || J(r)}, ${J(lay())}`);
// Seven starting above 0 (an agent's live write): no action (Q206 A), the error stays, and Remove is the way out.
reset({ breakpoints: [0, 768] });
store.brandState.layout = { ...(store.brandState.layout ?? {}), breakpoints: [320, 480, 768, 1024, 1440, 1920, 2560], columnOverrides: { xs: 4, lg: 10, '3xl': 16 } };
store.rebuild();
ok(store.lastError === FIRST_MUST_BE_0(320) && L.needsZeroBreakpoint() === false && L.breakpointRefusal() === store.lastError,
  `Q206 A: seven breakpoints starting at 320px are not offered the action, and the error is the first-breakpoint one — needs ${L.needsZeroBreakpoint()}, "${store.lastError}"`);
before = J(store.brandState);
threw = '';
try { r = L.addZeroBreakpoint(); } catch (e) { threw = (e as Error).message; }
ok(threw === '' && r.refused === true && J(store.brandState) === before,
  `Q206 A: at seven, addZeroBreakpoint is refused without throwing and writes nothing — ${threw || J(r)}`);
r = L.removeBreakpoint(2);
// Seven run xs…3xl: 320 xs, 480 sm, 768 md, 1024 lg, 1440 xl, 1920 2xl, 2560 3xl. Six run xs…2xl.
ok(!r.refused && J(lay()?.breakpoints) === J([320, 480, 1024, 1440, 1920, 2560]) && r.dropped.length === 0 && J(lay()?.columnOverrides) === J({ xs: 4, md: 10, '2xl': 16 }),
  `Q206 A: Remove still works at seven (768 removed), and each setting follows its breakpoint (320 stays xs, 1024 lg → md, 2560 3xl → 2xl) — ${J(r)}, ${J(lay())}`);
ok(L.needsZeroBreakpoint() === true, 'Q206 A: at six, the action is offered');
r = L.addZeroBreakpoint();
store.rebuild();
ok(!r.refused && J(lay()?.breakpoints) === J([0, 320, 480, 1024, 1440, 1920, 2560]) && store.lastError === null && J(lay()?.columnOverrides) === J({ sm: 4, lg: 10, '3xl': 16 }),
  `then the action makes seven starting at 0, the brand resolves, and each setting is still on its width (320 xs → sm, 1024 md → lg, 2560 2xl → 3xl) — ${J(lay())}, "${store.lastError}"`);
// The action sits beside the first-breakpoint error only: with the list above 0 and another error reported first.
reset({ breakpoints: [0, 768] });
store.brandState.layout = { ...(store.brandState.layout ?? {}), breakpoints: [320, 768], columns: 99 };
store.rebuild();
ok(store.lastError !== null && store.lastError !== FIRST_MUST_BE_0(320) && L.breakpointRefusal() === FIRST_MUST_BE_0(320) && L.breakpointRefusal() !== store.lastError,
  `beside another error (the columns), the list's own refusal is not the line's, so no action is offered — line "${store.lastError}", list "${L.breakpointRefusal()}"`);

console.log('\n7. #2513: a brand that arrives with eight breakpoints (an agent\'s live write) is named, not thrown, and Remove takes it back to seven');
reset({ breakpoints: [0, 768] });
store.brandState.layout = { ...(store.brandState.layout ?? {}), breakpoints: [0, 320, 480, 768, 1024, 1440, 1920, 2560], columnOverrides: { md: 6 } };
store.rebuild();
ok(store.lastError === 'The brand can have at most seven breakpoints. This brand has 8.', `premise: the engine refuses eight, and the error line says so — "${store.lastError}"`);
let eight: readonly string[] = [];
let threw8 = '';
try { eight = L.namesFor(L.breakpointsOf()); } catch (e) { threw8 = (e as Error).message; }
ok(!threw8 && J(eight) === J(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '2560px']),
  `#2513: eight breakpoints are named without throwing: the first seven by the engine's names for seven, the eighth by its width — ${threw8 || J(eight)}`);
r = L.removeBreakpoint(3);
store.rebuild();
ok(!r.refused && J(lay()?.breakpoints) === J([0, 320, 480, 1024, 1440, 1920, 2560]) && store.lastError === null,
  `#2513: one Remove (768) leaves a valid seven, and the brand resolves — ${J(r)}, ${J(lay()?.breakpoints)}, "${store.lastError}"`);

console.log(`\n${executed - failed}/${executed} layout-input assertions passed.`);
if (failed) process.exit(1);
