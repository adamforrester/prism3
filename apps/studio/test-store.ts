/**
 * Store test (#896) — imports the REAL `src/state/store.ts` in Node, with no DOM, no jsdom and no
 * browser, and asserts on the studio's session state directly.
 *
 *   npx tsx apps/studio/test-store.ts
 *
 * WHY THIS COULD NOT BE WRITTEN BEFORE. The session state — `brandState`, the resolved `theme`/`rp`,
 * `lastGoodInput`, `lastError` and `rebuild()`'s last-good rule — lived in `main.ts`, which created a
 * canvas, looked up `#app`, installed a stylesheet and rendered while it loaded. Nothing under `tsx`
 * could import it, so the last-good rule (M-15/M-16: a refused edit keeps the previous good theme, and
 * never reaches storage) was checked only by driving a browser.
 *
 * docs/34 (gate independence): every expected value comes from outside the store. The good theme is
 * the engine's own `brandTheme(input)`; the refusal message is what `brandTheme` throws when called
 * here directly; persistence is observed through a recorder this file injects. Nothing is compared
 * against a value the store computed and then read back.
 *
 * Mutations that fail here BY NAME (measured): take the last-good copy in `rebuild` before the
 * resolve can throw → `refused edit leaves lastGoodInput at the previous good input`; persist before
 * the resolve → `refused edit is not persisted`; make `invalidate` notify every topic →
 * `invalidate('mode') notifies mode subscribers only`; point `syncIdentity`'s persist at the live
 * `brandState` instead of `lastGoodInput` → `a refused edit never reaches storage, even through
 * syncIdentity` (#1846).
 */
import { type BrandInput, brandTheme, typefaceSlug } from '@prism3/engine';
import { EXAMPLE_BRANDS_JSON as exampleBrands } from '@prism3/engine';
import * as store from './src/state/store';
import { editCount, isDirty, needsOverwriteConfirm } from './src/provenance';
import { BRAND_KEY, ORIGIN_KEY, persistInput, restoreSession, type LocalStore } from './src/persist-local';
import { stashBefore, stillOffered } from './src/state/undo-load';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// ---- the premise: there is no DOM here -----------------------------------------------------------------
// If one of these ever reads true, the rest of the file proves nothing about DOM-freedom.
ok(typeof (globalThis as { document?: unknown }).document === 'undefined', 'premise: no `document` in this process');
ok(typeof (globalThis as { window?: unknown }).window === 'undefined', 'premise: no `window` in this process');
ok(typeof (globalThis as { localStorage?: unknown }).localStorage === 'undefined', 'premise: no `localStorage` in this process');

const harbor = structuredClone((exampleBrands as Record<string, BrandInput>)['harbor']);
const persisted: BrandInput[] = [];
store.setPersist((input) => { persisted.push(structuredClone(input)); });

// ---- boot ---------------------------------------------------------------------------------------------
store.initSession(structuredClone(harbor), { kind: 'example', id: 'harbor' });
ok(same(store.theme, brandTheme(harbor)), 'initSession resolves the theme the engine resolves for the same input');
ok(store.currentMode === store.rp.modes[0], `initSession views the first mode (${store.rp.modes[0]})`);
ok(store.lastError === null, 'initSession starts with no error');
ok(store.provenance === store.bootProvenance, 'initSession records the boot provenance by identity');
ok(!store.firstRun(), 'an example origin is not a first run');
ok(persisted.length === 0, 'initSession persists nothing');

// ---- the last-good rule --------------------------------------------------------------------------------
// A good edit first, so "the previous good value" is one the store produced from an edit, not from boot.
store.brandState.modes = ['light', 'dark'];
store.rebuild();
const goodInput = structuredClone(store.brandState);
const goodTheme = store.theme;
const goodRp = store.rp;
ok(store.lastError === null && same(store.theme, brandTheme(goodInput)), 'good edit: the theme is the engine\'s resolve of the edited input');
ok(same(store.lastGoodInput, goodInput) && store.lastGoodInput !== store.brandState, 'good edit: lastGoodInput is a copy of the edited input, not the live object');
ok(persisted.length === 1 && same(persisted[0], goodInput), 'good edit: persisted exactly once, with the edited input');

// The refused edit. The expected message is what the engine throws for this input, asked directly.
store.brandState.actionPalette = 'not-a-palette';
let engineSays = '';
try { brandTheme(store.brandState); } catch (e) { engineSays = (e as Error).message; }
ok(engineSays !== '', `premise: the engine refuses actionPalette 'not-a-palette' (${engineSays})`);
store.rebuild();
ok(store.lastError === engineSays, 'refused edit records the engine\'s message in lastError');
ok(store.theme === goodTheme && store.rp === goodRp, 'refused edit keeps the last-good theme and resolved preview');
ok(same(store.lastGoodInput, goodInput), 'refused edit leaves lastGoodInput at the previous good input');
ok(store.brandState.actionPalette === 'not-a-palette', 'refused edit stays in the live input, where the field still shows it');
ok(persisted.length === 1, 'refused edit is not persisted');

// Recovery: undo the edit and the error clears.
delete store.brandState.actionPalette;
store.rebuild();
ok(store.lastError === null && store.theme !== goodTheme, 'undoing the refused edit clears the error and resolves again');
ok(persisted.length === 2, 'the recovered input is persisted');

// syncIdentity: identity reaches the last-good input and storage with no re-resolve.
const themeBefore = store.theme;
store.brandState.id = 'renamed';
store.syncIdentity();
ok(store.lastGoodInput.id === 'renamed' && store.theme === themeBefore, 'syncIdentity copies the name into lastGoodInput without re-resolving');
ok(persisted.length === 3 && persisted[2].id === 'renamed', 'syncIdentity persists the renamed last-good input');

// #1846: the docblock's promise, tested. A rename while a refused lever edit is still in the live input
// must persist the rename and NOT the refused value — the M-15/M-16 last-good rule, on syncIdentity's path.
// The refused value is the one the engine was shown refusing above (`engineSays`), not one the store rated.
store.brandState.actionPalette = 'not-a-palette';
store.rebuild();
ok(store.lastError === engineSays && persisted.length === 3, 'premise: the refused edit is live, flagged and not yet persisted');
store.brandState.id = 'renamed-again';
store.syncIdentity();
const lastBlob = persisted[persisted.length - 1];
ok(persisted.length === 4 && lastBlob.id === 'renamed-again', 'syncIdentity persists a rename made while a refused edit is live');
ok(lastBlob.actionPalette !== 'not-a-palette', `a refused edit never reaches storage, even through syncIdentity (persisted actionPalette ${JSON.stringify(lastBlob.actionPalette)})`);
delete store.brandState.actionPalette;
store.rebuild();

// ---- invalidation ----------------------------------------------------------------------------------------
// The brand topics only: the host topics (P2) are invalidated by `main.ts` from `topicsFor`, never by a
// setter here, and `test-host-session.ts` asserts which a message names.
type BrandTopic = 'brand' | 'origin' | 'mode' | 'page';
const heard: Record<BrandTopic, number> = { brand: 0, origin: 0, mode: 0, page: 0 };
const offs = (Object.keys(heard) as BrandTopic[]).map((t) => store.subscribe(t, () => { heard[t]++; }));
const reset = (): void => { for (const t of Object.keys(heard) as BrandTopic[]) heard[t] = 0; };

store.invalidate('mode');
ok(same(heard, { brand: 0, origin: 0, mode: 1, page: 0 }), `invalidate('mode') notifies mode subscribers only (heard ${JSON.stringify(heard)})`);
reset();
store.rebuild();
ok(same(heard, { brand: 1, origin: 0, mode: 0, page: 0 }), `rebuild() invalidates brand only (heard ${JSON.stringify(heard)})`);
reset();
// A refused edit still fires `brand`: the field shows the refused value and the error bar has to repaint.
store.brandState.actionPalette = 'not-a-palette';
store.rebuild();
ok(store.lastError !== null && same(heard, { brand: 1, origin: 0, mode: 0, page: 0 }), `a refused rebuild() still invalidates brand (heard ${JSON.stringify(heard)})`);
delete store.brandState.actionPalette;
store.rebuild();
reset();
store.setCurrentMode('dark');
ok(store.currentMode === 'dark' && same(heard, { brand: 0, origin: 0, mode: 1, page: 0 }), 'setCurrentMode sets the mode and invalidates mode only');
reset();
store.setPage('typography');
ok(store.page === 'typography' && same(heard, { brand: 0, origin: 0, mode: 0, page: 1 }), 'setPage sets the page and invalidates page only');

// A second subscriber on the same topic hears it too; an unsubscribed one does not.
let second = 0;
const offSecond = store.subscribe('page', () => { second++; });
reset();
store.invalidate('page');
ok(heard.page === 1 && second === 1, 'two subscribers on one topic are both notified');
offSecond();
store.invalidate('page');
ok(heard.page === 2 && second === 1, 'an unsubscribed function is not notified again');

// ---- a wholesale load ----------------------------------------------------------------------------------
reset();
const aurora = (exampleBrands as Record<string, BrandInput>)['aurora'];
store.loadInput(aurora, { kind: 'example', id: 'aurora' });
ok(store.brandState !== aurora && same(store.brandState, aurora), 'loadInput works on a copy of the input it is given');
ok(store.page === 'palettes' && store.currentMode === store.rp.modes[0], 'loadInput resets the view to the first page and mode');
ok(store.provenance !== store.bootProvenance && store.provenance.origin.kind === 'example', 'loadInput assigns a new provenance from its origin');
ok(heard.origin === 1 && heard.brand === 1 && heard.page === 1 && heard.mode === 1, `loadInput invalidates origin, brand, page and mode once each (heard ${JSON.stringify(heard)})`);
// #2487 A13: the load is one batch, told in the order resolve, mode, page, and nobody is told before the new brand is
// resolved. A subscriber on each topic records what it saw; the expected order and theme are typed here.
{
  reset();
  // Start from a different brand, so a subscriber told before the new brand resolves reads the OLD theme.
  store.loadInput(harbor, { kind: 'example', id: 'harbor' });
  const seen: string[] = [];
  const auroraTheme = brandTheme(aurora);
  ok(!same(store.theme, auroraTheme), 'premise: the store holds another brand\'s theme before the load');
  const offs2 = (['origin', 'brand', 'mode', 'page'] as const).map((t) => store.subscribe(t, () => seen.push(`${t}:${same(store.theme, auroraTheme) ? 'new' : 'old'}:${store.page}:${store.currentMode}`)));
  store.loadInput(aurora, { kind: 'example', id: 'aurora' });
  const mode0 = store.rp.modes[0];
  const want = ['origin', 'brand', 'mode', 'page'].map((t) => `${t}:new:palettes:${mode0}`);
  ok(JSON.stringify(seen) === JSON.stringify(want), `#2487 A13 loadInput tells origin, brand, mode and page once each, in that order, each against the new brand already resolved, its first mode and the first page (heard ${JSON.stringify(seen)})`);
  for (const off of offs2) off();
}
store.clearOrigin();
ok(store.firstRun() && same(store.brandState, aurora), 'clearOrigin returns to the start moment and leaves the working brand in place');
for (const off of offs) off();

// ---- #2487 B1: a held persist (a drag) writes once, on release ------------------------------------------
{
  const writes: BrandInput[] = [];
  store.setPersist((input) => { writes.push(structuredClone(input)); });
  store.holdPersist();
  for (const m of [['light'], ['light', 'dark'], ['light', 'dark', 'hc-light']] as const) { store.brandState.modes = [...m]; store.rebuild(); }
  ok(writes.length === 0, `#2487 B1 a held persist writes nothing during the drag's rebuilds (${writes.length} written)`);
  store.releasePersist();
  ok(writes.length === 1 && JSON.stringify(writes[0].modes) === JSON.stringify(['light', 'dark', 'hc-light']), `#2487 B1 the release writes the last-good brand once (${writes.length} written, modes ${JSON.stringify(writes[0]?.modes)})`);
  store.releasePersist();
  store.rebuild();
  ok(writes.length === 2, `#2487 B1 after the release, a rebuild writes at once again, and a second release is a no-op (${writes.length} written)`);
  store.setPersist(null);
}

// ---- per-mode lever I/O --------------------------------------------------------------------------------
// The prune-to-byte-identical invariant: an all-cleared mode is indistinguishable from never set.
const beforeLevers = JSON.stringify(store.brandState);
store.setModeLever('dark', 'shadow.tint.hue', 200);
ok(store.getModeLever('dark', 'shadow.tint.hue') === 200, 'setModeLever writes a nested per-mode path, getModeLever reads it');
store.setModeLever('dark', 'shadow.tint.hue', undefined);
ok(JSON.stringify(store.brandState) === beforeLevers, 'clearing the only per-mode override leaves the input byte-identical to before');

// ---- paths ----------------------------------------------------------------------------------------------
const o: Record<string, unknown> = {};
store.setPath(o, 'a.b.c', 3);
ok(store.getPath(o, 'a.b.c') === 3 && store.getPath(o, 'a.x.c') === undefined, 'setPath creates intermediate objects; getPath reads through a missing one as undefined');

// ---- Undo load (#1037, owner decision Q319.2): the replaced brand comes back with its edits, still guarded ----------
// EXPECTED from outside the module: the brands are the engine's examples, the edit is a rename typed here, and "still
// guarded" is the provenance module's own `needsOverwriteConfirm` over the restored state, never the stash's flag.
// Mutations that fail here BY NAME: `restoreInput` taking a fresh provenance from the input (`provenanceOf`) →
// `#1037 restoreInput: the edits come back still unsaved`; `stashBefore` keeping a stash with no edits to lose →
// `#1037 stashBefore: a load over an untouched brand keeps nothing`.
{
  const ids = Object.keys(exampleBrands);
  const [mine, other] = [ids[0], ids[1]];
  store.initSession(structuredClone((exampleBrands as Record<string, BrandInput>)[mine]), { kind: 'example', id: mine });
  ok(stashBefore(store.brandState, store.provenance, 'x', store.lastGoodInput) === null, '#1037 stashBefore: a load over an untouched brand keeps nothing');
  store.brandState.name = 'work in progress';
  const u = stashBefore(store.brandState, store.provenance, 'work in progress', store.lastGoodInput);
  ok(u !== null && u.input.name === 'work in progress' && u.input !== store.brandState, '#1037 stashBefore: a load over edits keeps a copy of the edited brand');
  store.loadInput((exampleBrands as Record<string, BrandInput>)[other], { kind: 'example', id: other });
  ok(stillOffered(u, store.brandState, store.provenance), '#1037 stillOffered: offered while the loaded example is untouched');
  store.brandState.name = 'edited after the load';
  ok(!stillOffered(u, store.brandState, store.provenance), '#1037 stillOffered: the first edit to the loaded brand ends the offer');
  store.restoreInput(u!.input, u!.provenance, u!.lastGood);
  ok(store.brandState.name === 'work in progress' && store.brandState.id === (exampleBrands as Record<string, BrandInput>)[mine].id,
    `#1037 restoreInput: the replaced brand is back, its edit included (${store.brandState.name})`);
  ok(isDirty(store.brandState, store.provenance) && needsOverwriteConfirm(store.brandState, store.provenance) && store.provenance.origin.kind === 'example',
    '#1037 restoreInput: the edits come back still unsaved, and a next load asks first');
  // The restored brand's root (`pds3`, the first example's) is typed here, and differs from the loaded one's (`ads`), so
  // a restore that skips the resolve leaves the loaded example's theme and fails BY NAME (review of 6e73dba1, item 3).
  ok(store.page === 'palettes' && store.lastError === null && store.theme.root === 'pds3' && store.lastGoodInput.name === 'work in progress',
    `#1037 restoreInput: it resolves the restored brand and resets the view, as a load does (theme root ${store.theme.root}, last good ${store.lastGoodInput.name})`);
}

// ---- Undo load over a brand whose live edit fails (review of 6e73dba1, item 2) --------------------------------------
// The replaced brand held a refused edit, so its last-good input was an earlier state, not the live one. Undo puts the
// refused edit back where the field shows it AND the last-good brand behind it: the theme, `lastGoodInput` (what Apply
// posts) and the persisted copy (what a web reload opens) are the user's brand, never the example the load brought in.
// Expected values typed here: the name `mine`, the root `pds3`, the error the engine gives for the refused edit.
// Mutations that fail here BY NAME: `restoreInput` ignoring the stashed last-good → `#1037 restoreInput over a failing
// edit: …`; `stashForLoad` passing the live input as the last-good → `#1037 stashForLoad: …`.
{
  const ids = Object.keys(exampleBrands);
  const [mine, other] = [ids[0], ids[1]];
  const persisted: BrandInput[] = [];
  store.setPersist((input) => { persisted.push(structuredClone(input)); });
  store.initSession(structuredClone((exampleBrands as Record<string, BrandInput>)[mine]), { kind: 'example', id: mine });
  store.brandState.name = 'mine';
  store.rebuild();
  store.brandState.actionPalette = 'not-a-palette';
  let engineSays = '';
  try { brandTheme(store.brandState); } catch (e) { engineSays = (e as Error).message; }
  store.rebuild();
  ok(store.lastError === engineSays && store.lastGoodInput.name === 'mine', `#1037 premise: the live edit is refused and the last good brand is the named one (${store.lastError})`);
  // The stash `main.ts` keeps before a load (`loadReplacing` calls `stashForLoad`), so the argument choice is held here
  // too (review of f3cca512): a stash whose last-good is the live, refused input fails `#1037 stashForLoad: …` BY NAME.
  const u = store.stashForLoad('mine');
  ok(u !== null && u.input.actionPalette === 'not-a-palette' && u.lastGood.name === 'mine' && u.lastGood.actionPalette === undefined,
    `#1037 stashForLoad: the stash keeps the live brand with its refused edit, and the last good brand behind it (last good ${u?.lastGood.actionPalette ?? 'without the edit'})`);
  store.loadInput((exampleBrands as Record<string, BrandInput>)[other], { kind: 'example', id: other });
  ok(store.theme.root === 'ads' && persisted[persisted.length - 1]?.name === 'Aurora', `#1037 premise: the load brought in the other example and persisted it (${store.theme.root})`);
  store.restoreInput(u!.input, u!.provenance, u!.lastGood);
  ok(store.brandState.name === 'mine' && store.brandState.actionPalette === 'not-a-palette' && store.lastError === engineSays,
    `#1037 restoreInput over a failing edit: the refused edit is back in the live brand, flagged as before (${store.lastError})`);
  ok(store.lastGoodInput.name === 'mine' && store.lastGoodInput.actionPalette === undefined && store.theme.root === 'pds3',
    `#1037 restoreInput over a failing edit: the theme and the last good brand are the user's, not the loaded example's (theme root ${store.theme.root}, last good ${store.lastGoodInput.name})`);
  ok(persisted[persisted.length - 1]?.name === 'mine' && persisted[persisted.length - 1]?.actionPalette === undefined,
    `#1037 restoreInput over a failing edit: the persisted copy is the user's last good brand, so a reload opens it (${persisted[persisted.length - 1]?.name})`);
  store.setPersist(null);
}

// ---- #3878: a clear is a clear — set, then back to Auto, leaves the brand byte-identical ----------------
// Each writer below clears with `undefined` (or an emptied list or map). Before #3878, `setPath` materialized
// every parent on the way down, so the clear left `typography: {}` (or `shadow: {}`, `surfaces: { light: {} }`,
// `layout: {}`, `typefaceLibrary: []`), and `isDirty` read the untouched brand as edited. EXPECTED is the brand
// as loaded (the provenance baseline, a clone taken before any write); ACTUAL is the live `brandState`.
{
  const { isDirty, editCount } = await import('./src/provenance');
  const { BLANK_BRAND } = await import('./src/state/start-input');
  const type = await import('./src/state/type-input');
  const depth = await import('./src/state/depth-motion-input');
  const fills = await import('./src/state/fills-input');
  const layout = await import('./src/state/layout-input');
  const blank = (): void => store.initSession(BLANK_BRAND(), { kind: 'new' });
  const example = (): void => store.initSession(structuredClone((exampleBrands as Record<string, BrandInput>).prism3), { kind: 'example', id: 'prism3' });
  const cases: Array<[string, () => void, () => void, () => void]> = [
    ['setTitleFloor on, then off', blank, () => type.setTitleFloor(true), () => type.setTitleFloor(false)],
    ['setCaptionFloor 10, then 11', blank, () => type.setCaptionFloor(10), () => type.setCaptionFloor(11)],
    ["setShadowSoftness('light') 0.5, then Auto", blank, () => depth.setShadowSoftness('light', 0.5), () => depth.setShadowSoftness('light', undefined)],
    ["setTempo('light') snappy, then Auto", blank, () => depth.setTempo('light', 'snappy'), () => depth.setTempo('light', undefined)],
    ["setSurfaceFloor('light') a step, then Auto", blank, () => fills.setSurfaceFloor('light', '100'), () => fills.setSurfaceFloor('light', '')],
    ["setBandPalette('dark') primary, then neutral (prism3 example)", example,
      () => fills.setBandPalette('dark', fills.bandPalettes()[1] ?? 'NO-SECOND-BAND-PALETTE'),
      () => fills.setBandPalette('dark', store.theme.roleToPalette.neutral)],
    ['addLibraryFace, then removeLibraryFace (prism3 example)', example, () => { type.addLibraryFace('Lora'); }, () => type.removeLibraryFace(typefaceSlug('Lora'))],
    ['setColumnOverride 2, then Auto', blank, () => layout.setColumnOverride('md', 2), () => layout.setColumnOverride('md', undefined)],
  ];
  for (const [name, init, set, clear] of cases) {
    init();
    const before = JSON.stringify(store.brandState);
    set();
    const moved = JSON.stringify(store.brandState) !== before;
    clear();
    ok(moved && same(store.brandState, store.provenance.baseline) && !isDirty(store.brandState, store.provenance)
      && editCount(store.brandState, store.provenance.baseline) === 0,
      `#3878: ${name} leaves the brand byte-identical and not dirty${moved ? '' : ' (FIXTURE: the set wrote nothing)'}`);
  }
  const o: any = { keep: { arr: [1] }, a: { b: { c: 1 } } };
  store.setPath(o, 'a.b.c', undefined);
  store.setPath(o, 'x.y', undefined);
  ok(same(o, { keep: { arr: [1] } }), '#3878: setPath(undefined) prunes every parent it empties and creates none');
  store.setPath(o, 'keep.arr.0', undefined);
  ok(Array.isArray(o.keep.arr) && 'keep' in o, '#3878: setPath(undefined) never prunes an array, nor its owner through it');
}

// ---- #3880: a web reload keeps the origin and baseline, so edits still count -----------------------------------------
// Owner decision A (2026-11-18). The web entry wires `persistInput` to `localStorage` and boots on `restoreSession`; here
// the same two calls run over a `Map`-backed store, and a "reload" is a fresh `initSession` from what the store holds,
// which is what `entry.ts`'s `bootBrand` does. Before #3880 the restored brand was its own baseline (origin `file`), so
// the reload made the edit stop counting and the next load went through unguarded.
// Expected values come from outside the store: the example as the engine ships it, and the edit this test makes.
// Mutations that fail here BY NAME: `persistInput` not writing `ORIGIN_KEY` → `#3880 reload: the edit still counts`;
// `initSession` ignoring the restored baseline → `#3880 reload: the edit still counts`; `restoreSession` skipping the
// fingerprint check → `#3880 reload: an origin entry written beside another brand is not read`.
{
  const map = new Map<string, string>();
  const local: LocalStore = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: (k) => { map.delete(k); } };
  const aurora = (exampleBrands as Record<string, BrandInput>).aurora;
  store.setPersist((input, prov) => persistInput(local, input, prov));
  store.loadInput(structuredClone(aurora), { kind: 'example', id: 'aurora' });
  const h = (aurora.primary.h + 40) % 360;
  store.brandState.primary.h = h;
  store.rebuild();
  ok(store.lastError === null && needsOverwriteConfirm(store.brandState, store.provenance),
    `#3880 premise: an edit to the aurora example asks before a load replaces it (h ${h})`);
  store.setPersist(null);

  // The reload: what `bootBrand` restores, booted as `entry.ts` boots it.
  const reload = (): void => {
    const r = restoreSession(local);
    if (!r) throw new Error('premise: the store holds no brand after a persisted edit');
    store.initSession(r.input, r.origin, r.baseline);
  };
  reload();
  ok(store.brandState.primary.h === h && same(store.provenance.origin, { kind: 'example', id: 'aurora' })
    && isDirty(store.brandState, store.provenance) && editCount(store.brandState, store.provenance.baseline) === 1,
    `#3880 reload: the edit still counts — the aurora example is the origin, its baseline is the example's, 1 edit (origin ${JSON.stringify(store.provenance.origin)}, edits ${editCount(store.brandState, store.provenance.baseline)})`);
  ok(needsOverwriteConfirm(store.brandState, store.provenance),
    '#3880 reload: the next load is guarded — replacing the brand asks first, as before the reload');
  ok(same(store.provenance.baseline, aurora), '#3880 reload: the restored baseline is the example as shipped, not the edited brand');

  // A slider drag stores its edit once, on release (`holdPersist` … `releasePersist`, #2487 B1): that write must pair the
  // brand with the provenance of the load it edits, not the boot's (#4049 review). The session boots on a file first, so
  // the boot's provenance and the example's differ, then loads the example and drags.
  // Mutation that fails here BY NAME: `releasePersist` writing `bootProvenance` → `#3880 reload: a dragged edit still counts`.
  map.clear();
  store.initSession(structuredClone(aurora), { kind: 'file' });
  store.setPersist((input, prov) => persistInput(local, input, prov));
  store.loadInput(structuredClone(aurora), { kind: 'example', id: 'aurora' });
  const dragH = (aurora.primary.h + 80) % 360;
  store.holdPersist();
  store.brandState.primary.h = dragH;
  store.rebuild();
  const held = JSON.parse(map.get(BRAND_KEY) ?? 'null')?.input?.primary?.h;
  store.releasePersist();
  const released = JSON.parse(map.get(BRAND_KEY) ?? 'null')?.input?.primary?.h;
  store.setPersist(null);
  ok(store.lastError === null && held === aurora.primary.h && released === dragH,
    `#3880 premise: a held drag stores nothing until its release, then stores the dragged brand (held h ${held}, released h ${released}, dragged h ${dragH})`);
  reload();
  ok(store.brandState.primary.h === dragH && same(store.provenance.origin, { kind: 'example', id: 'aurora' })
    && same(store.provenance.baseline, aurora) && editCount(store.brandState, store.provenance.baseline) === 1
    && needsOverwriteConfirm(store.brandState, store.provenance),
    `#3880 reload: a dragged edit still counts — stored on release beside the example's origin and baseline, 1 edit, the next load guarded (origin ${JSON.stringify(store.provenance.origin)}, edits ${editCount(store.brandState, store.provenance.baseline)})`);
  // Put back the stored state the arms below start from: the aurora example with the one edit above.
  map.clear();
  store.setPersist((input, prov) => persistInput(local, input, prov));
  store.loadInput(structuredClone(aurora), { kind: 'example', id: 'aurora' });
  store.brandState.primary.h = h;
  store.rebuild();
  store.setPersist(null);

  // Storage written before #3880 holds the brand alone: it restores as it always did.
  map.delete(ORIGIN_KEY);
  reload();
  ok(store.brandState.primary.h === h && same(store.provenance.origin, { kind: 'file' }) && !isDirty(store.brandState, store.provenance),
    `#3880 reload: storage with no origin entry restores as before — the brand is its own baseline, origin file (${JSON.stringify(store.provenance.origin)})`);

  // An origin entry that was not written beside this brand (a write that failed, or another brand stored over it).
  store.setPersist((input, prov) => persistInput(local, input, prov));
  store.loadInput(structuredClone(aurora), { kind: 'example', id: 'aurora' });
  store.brandState.primary.h = h;
  store.rebuild();
  store.setPersist(null);
  const other = structuredClone(aurora);
  other.primary.h = (h + 40) % 360;
  map.set(BRAND_KEY, JSON.stringify({ ...JSON.parse(map.get(BRAND_KEY)!), input: other }));
  reload();
  ok(store.brandState.primary.h === other.primary.h && same(store.provenance.origin, { kind: 'file' }) && !isDirty(store.brandState, store.provenance),
    `#3880 reload: an origin entry written beside another brand is not read — the brand restores as before (${JSON.stringify(store.provenance.origin)})`);

  // The empty state keeps no origin entry, and a junk entry restores as before.
  map.set(ORIGIN_KEY, '{not json');
  reload();
  ok(same(store.provenance.origin, { kind: 'file' }), '#3880 reload: a junk origin entry restores the brand as before, never refuses it');
  persistInput(local, store.brandState, { origin: { kind: 'none' }, baseline: store.brandState });
  ok(!map.has(ORIGIN_KEY) && map.has(BRAND_KEY), '#3880 persist: the empty state keeps no origin entry, and the brand is still kept');
}

// ---- #4209: Undo load saves the restored brand, so a reload opens it with its origin and baseline ------------------
// `restoreInput` saves only through `resolve()`'s write. The #1037 arms above cover the refused-edit branch, not this
// one. Expected values come from outside the store: the example as the engine ships it, and the rename typed here.
// Mutation that fails here BY NAME: `restoreInput` resolving without the write → `#4209 Undo load, then reload: …`.
{
  const map = new Map<string, string>();
  const local: LocalStore = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: (k) => { map.delete(k); } };
  const ids = Object.keys(exampleBrands);
  const [mine, other] = [ids[0], ids[1]];
  const shipped = (exampleBrands as Record<string, BrandInput>)[mine];
  store.setPersist((input, prov) => persistInput(local, input, prov));
  store.initSession(structuredClone(shipped), { kind: 'example', id: mine });
  store.brandState.name = 'renamed before the load';
  store.rebuild();
  const u = store.stashForLoad('renamed before the load');
  store.loadInput(structuredClone((exampleBrands as Record<string, BrandInput>)[other]), { kind: 'example', id: other });
  store.restoreInput(u!.input, u!.provenance, u!.lastGood);
  store.setPersist(null);
  const r = restoreSession(local);
  ok(r !== null && r.input.name === 'renamed before the load' && same(r.origin, { kind: 'example', id: mine }) && same(r.baseline, shipped),
    `#4209 Undo load, then reload: the saved copy is the restored brand, with its origin and baseline (name ${r?.input.name}, origin ${JSON.stringify(r?.origin)})`);
}

// ---- #4234: one edit resolves every mode once — the store's resolve fills the cache the verdict reads -------------
// Before #4234, `resolvePreview` ran `resolveAllModes` itself and the verdict ran it again on the same theme. Two
// readings, neither derived from the subject: the cache's own run count across a rebuild and a verdict read, and a
// preview resolved over a hand-altered copy of the modes (a hex typed here), which only shows if the modes are used.
// Mutations that fail here BY NAME: the store calling `resolvePreview(t)` without the cached modes → `#4234 one resolve
// per edit: …`; `resolvePreview` ignoring its `modes` → `#4234 resolvePreview reads the modes it is given`.
{
  const verdict = await import('./src/state/verdict');
  // Read through `?.` so a build without the counter fails the arm by name rather than throwing.
  const runs = (): number => (verdict as { resolveRuns?: () => number }).resolveRuns?.() ?? NaN;
  const { resolvePreview, resolveAllModes } = await import('@prism3/engine');
  store.initSession(structuredClone((exampleBrands as Record<string, BrandInput>).aurora), { kind: 'example', id: 'aurora' });
  store.brandState.primary.h = (store.brandState.primary.h + 30) % 360;
  const before = runs();
  store.rebuild();
  const byRebuild = runs() - before;
  verdict.verdictOf(store.theme, store.rp.modes);
  const total = runs() - before;
  ok(store.lastError === null && byRebuild === 1 && total === 1,
    `#4234 one resolve per edit: the rebuild resolves the modes once and the verdict reads that copy (rebuild ${byRebuild}, after the verdict ${total})`);
  const modes = structuredClone(resolveAllModes(store.theme));
  const ref = Object.keys(store.rp.colors)[0]!;
  const role = modes[0]!.roles[ref.replace(/^color\./, '')]!;
  role.hex = '#123456'; role.alpha = undefined;
  const rp = (resolvePreview as (...a: unknown[]) => typeof store.rp)(store.theme, undefined, modes);
  ok(rp.colors[ref]?.[modes[0]!.mode] === '#123456', `#4234 resolvePreview reads the modes it is given (${ref}: ${rp.colors[ref]?.[modes[0]!.mode]})`);
}

// ---- Undo load back to the boot brand (#4215) ---------------------------------------------------------------------------
// `provenance === bootProvenance` reads "nothing chosen in this session" (#1197), and `main.ts` guards a late host read
// with it. An Undo load back to the brand boot put there restored the boot OBJECT, so a slow boot read arriving after a
// load and its undo behaved as if nothing had been chosen. Restored, the provenance is equal by value and a new object.
// Mutation that fails here BY NAME: `restoreInput` assigning `prov` as given → `#4215 restoreInput: …`.
{
  const ids = Object.keys(exampleBrands);
  store.initSession(structuredClone((exampleBrands as Record<string, BrandInput>)[ids[0]]), { kind: 'example', id: ids[0] });
  ok(store.provenance === store.bootProvenance, '#4215 premise: the session starts on the boot provenance');
  store.brandState.name = 'edited at boot';
  const u = stashBefore(store.brandState, store.provenance, 'edited at boot', store.lastGoodInput);
  store.loadInput((exampleBrands as Record<string, BrandInput>)[ids[1]], { kind: 'example', id: ids[1] });
  store.restoreInput(u!.input, u!.provenance, u!.lastGood);
  ok(store.provenance !== store.bootProvenance, '#4215 restoreInput: an Undo load back to the boot brand is a choice, never the boot provenance by identity');
  ok(JSON.stringify(store.provenance) === JSON.stringify(store.bootProvenance) && Object.isFrozen(store.provenance) && Object.isFrozen(store.provenance.baseline),
    '#4215 restoreInput: the restored provenance is the boot one by value, and frozen as every provenance is');
  ok(isDirty(store.brandState, store.provenance), '#4215 restoreInput: the boot brand\'s edit comes back still unsaved');
}

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
