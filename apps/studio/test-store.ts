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
import { type BrandInput, brandTheme } from '@prism3/engine';
import { EXAMPLE_BRANDS_JSON as exampleBrands } from '@prism3/engine';
import * as store from './src/state/store';
import { isDirty, needsOverwriteConfirm } from './src/provenance';
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
// Mutation that fails here BY NAME: `restoreInput` ignoring the stashed last-good → `#1037 restoreInput over a failing
// edit: …`.
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
  const u = stashBefore(store.brandState, store.provenance, 'mine', store.lastGoodInput);
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

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
