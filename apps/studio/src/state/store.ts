/**
 * The studio's BrandInput session — the state every page reads, held in one module that touches no
 * DOM (#896, UI redesign F2).
 *
 * WHY THIS IS ITS OWN MODULE. `main.ts` owned this state as module-level `let`s beside ten thousand
 * lines of DOM code, and ran DOM side effects at import time, so none of it could be loaded under
 * `tsx` — the last-good rule below was assertable only by driving a browser. Here it has no `document`,
 * no `window`, no `localStorage` and no build-time define, so `test-store.ts` imports it in Node and
 * asserts on it directly.
 *
 * HOW `main.ts` READS IT. The session fields are exported `let` bindings. An ES import of a `let` is a
 * LIVE binding — every read sees the current value — but it is read-only at the importer, so a
 * reassignment has to come through one of the setters here. That is the point: the compiler now lists
 * every writer. Mutating the object a binding holds (`brandState.gradients = …`) is unchanged and needs
 * no setter.
 *
 * WHO SUBSCRIBES (UI redesign P2). The repaint end state is store subscribers: a writer invalidates a
 * topic and every surface that reads it repaints. P2 lands it for HOST messages — `handleHostMessage` in
 * `main.ts` invalidates the `HostTopic`s that `topicsFor` (`state/host-session.ts`) names, and each
 * legacy surface that reads host state subscribes once, beside its own painter. The brand topics
 * (`brand`, `origin`, `mode`, `page`) still have no subscribers: the `apply()` / `applyFull()` /
 * `renderBar()` / `build()` call sites pick their own repaint until the new shell (S1) subscribes to them
 * and S13 deletes the tiers. Subscribing the legacy tiers to them now would repaint twice per edit.
 *
 * Persistence is INJECTED (`setPersist`), not imported: the web host writes the last-good brand to
 * `localStorage` and the plugin writes nothing, and the entry — the one module allowed to know which
 * host it is in — wires that. Unset, a rebuild persists nothing, which is what a Node test wants.
 */
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput, Theme } from '@prism3/engine/theme';
import { resolvePreview } from '@prism3/engine/resolve-preview';
import type { ResolvedPreview } from '@prism3/engine/resolve-preview';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { provenanceOf, noOrigin, type Origin, type Provenance } from '../provenance';
import type { PageKey } from '../shell/pages';

export type Mode = ResolvedPreview['modes'][number];

/** The keys `page` can hold: the legacy pages. DERIVED from the page data in `shell/pages.ts` (UI redesign
 *  S1.3, plan §3.7): each page's `legacy` list, plus the Figma menu's Style guide. A domain slice that
 *  moves a page empties its list, which takes the key out of this type. The labels, the order and which
 *  host shows which destination belong to the rail (`NAV` in `main.ts`), which is checked against this
 *  BOTH WAYS there: `satisfies` makes a destination the data does not know a compile error, and
 *  `everyPageHasANavRow` does the same for a key here with no rail row (#1846). Two lists, written in two
 *  places, checked against each other. `shell/pages.ts` is DOM-free, so this module stays Node-loadable. */
export type { PageKey };

// Boot from a VALIDATED example brand — the emitted schema/example-brands.json (a test.ts gate asserts
// every brand there resolves all-green on the preview contracts). prism3 is the canonical default theme
// (#1296): a bright blue (#1E1EFF) as the one interactive color, italic Playfair Display headings over
// an Inter UI.
export const BRANDS = exampleBrands as Record<string, BrandInput>;
/** The example the studio and the plugin open with — the canonical default theme (#1296). Named once,
 *  so the web demo behind the start screen and the plugin's placeholder cannot boot different brands. */
export const BOOT_BRAND = 'prism3';

// ---- the session -----------------------------------------------------------------------------------
// Unassigned until `initSession` runs; the entry calls it before anything renders.

/** The mutable working copy the inputs edit. */
export let brandState: BrandInput;
/** Where `brandState` came from, and the baseline it is measured against (#722 / #721). */
export let provenance: Provenance;
/** The provenance object BOOT created, kept by identity so the plugin's fresh-file trigger can ask
 *  "has anything happened yet?" (#1197).
 *
 *  Identity, not value, and the difference is a bug this caught rather than a precaution. Every user
 *  choice goes through `loadInput`, which ASSIGNS a new provenance — so `provenance === bootProvenance`
 *  is exactly "nothing has been chosen in this session". The value-based version of the same test
 *  ("origin is example/<boot brand> and nothing is dirty") reads TRUE after a designer picks that
 *  brand's chip, because boot's placeholder is the same example, and a late host message then discarded a brand they had
 *  just chosen. Two states that are equal by value and different in every way that matters. */
export let bootProvenance: Provenance;
export let theme: Theme;
// The last input that resolved cleanly — the ramps + anchor badges render from THIS, so when a
// live edit fails (lastError set) the flagged anchor swatch still matches the shown ramp (M-16).
export let lastGoodInput: BrandInput;
export let rp: ResolvedPreview;
export let currentMode: Mode;
export let lastError: string | null = null;
export let page: PageKey = 'palettes';

/**
 * The start screen's gate — now a READING of the origin, not an independent boolean (#721).
 *
 * It was `let firstRun = false` set in two places. A flag beside the state can disagree with it; a
 * reading cannot. It is also what makes *returning* to the empty state ordinary rather than a
 * feature: "+ New brand" sets the origin to `none` and the start screen follows, so
 * `preview an example → decide to start blank` is two origin changes instead of a wizard re-entered.
 *
 * The web reaches it at boot, from an empty `localStorage`; the plugin reaches it when the host
 * answers `restore-input-empty` (#1197); either reaches it again through `clearOrigin`.
 */
export const firstRun = (): boolean => provenance.origin.kind === 'none';

// ---- invalidation --------------------------------------------------------------------------------

/** What the HOST changed (P2). Named for the fact that moved, not for a painter, so a second reader of the
 *  same fact subscribes rather than edits a switch. `topicsFor` in `state/host-session.ts` maps each host
 *  message to these, purely.
 *   - `host`: a fact the chrome bar shows — the boot read-back, a restore refusal, a prune, any verdict.
 *   - `host:detail`: a verdict landed, so which detail is open (and what it says) may have moved.
 *   - `host:components`, `host:filesetup`, `host:styleguide`: that action's verdict, which its page row shows.
 *   - `host:progress`: the in-flight component build's fraction — a text swap, never a re-render.
 *   - `fonts`: the families the host can load, which the Typography page reads. */
export type HostTopic =
  | 'host' | 'host:detail' | 'host:components' | 'host:filesetup' | 'host:styleguide' | 'host:progress' | 'fonts';

/** What changed. `brand`: the working input, the resolved theme or the error (every `rebuild`, and a
 *  wholesale load). `origin`: the provenance was reassigned. `mode`: the mode being viewed. `page`: the
 *  rail destination. `search`: the settings search query. `search:hits`: how many settings it matched on
 *  the page in view. `identity`: the brand's name or namespace moved WITHOUT a rebuild (`syncIdentity`, UI
 *  redesign S3), so whatever shows the name repaints without a re-resolve. Plus the host topics above. */
export type Topic = 'brand' | 'origin' | 'mode' | 'page' | 'search' | 'search:hits' | 'identity' | HostTopic;
const subscribers = new Map<Topic, Set<() => void>>();

/** Call `fn` whenever `topic` is invalidated. Returns the unsubscribe. */
export const subscribe = (topic: Topic, fn: () => void): (() => void) => {
  let set = subscribers.get(topic);
  if (!set) subscribers.set(topic, (set = new Set()));
  set.add(fn);
  return () => { set!.delete(fn); };
};

/** Tell `topic`'s subscribers, and only them, that it changed. A snapshot of the set is walked, so a
 *  subscriber that unsubscribes (or subscribes another) mid-notification does not skip or double-run
 *  one of its siblings. */
export const invalidate = (topic: Topic): void => {
  const set = subscribers.get(topic);
  if (set) for (const fn of [...set]) fn();
};

// ---- persistence (injected) ------------------------------------------------------------------------

let persist: ((input: BrandInput) => void) | null = null;
/** Wire the host's persistence. The web entry passes a `localStorage` writer; the plugin passes none,
 *  because Figma shared-data is written by the plugin's main thread on Apply, not from here. */
export const setPersist = (fn: ((input: BrandInput) => void) | null): void => { persist = fn; };

// ---- lifecycle -------------------------------------------------------------------------------------

/** Start the session on `input`: resolve it, take it as the last-good input and the boot provenance,
 *  and view its first mode. The input must already resolve — the entry validates a restored brand
 *  before booting on it, and falls back to an example if it does not. */
export const initSession = (input: BrandInput, origin: Origin): void => {
  brandState = input;
  provenance = provenanceOf(origin, brandState);
  bootProvenance = provenance;
  theme = brandTheme(brandState);
  lastGoodInput = structuredClone(brandState);
  rp = resolvePreview(theme);
  currentMode = rp.modes[0];
  lastError = null;
};

/** Re-resolve from the current brandState. On failure keep the last-good theme/rp and
 *  record the message (the render stays coherent; the edit is what's flagged). */
export const rebuild = (): void => {
  try {
    const t = brandTheme(brandState);
    rp = resolvePreview(t);
    theme = t;
    lastGoodInput = structuredClone(brandState);   // M-16: anchor badges read this, not the (maybe failing) live state
    lastError = null;
    persist?.(brandState);   // persist the last-good brand (web only — the plugin injects no writer; best-effort)
  } catch (e) {
    lastError = (e as Error).message;
  }
  invalidate('brand');
};

/**
 * Propagate the IDENTITY fields (`id` / `root`) from the live `brandState` into the LAST-GOOD input,
 * WITHOUT a `rebuild()` — the cheap, per-keystroke half of the #1196 fix.
 *
 * The Name and Namespace fields skip `rebuild()` so the text caret survives keystrokes (#1073/#1075's
 * skip-rebuild-on-rename lineage). But `rebuild()` was the ONLY refresher of `lastGoodInput` (read by
 * Apply's `postTheme`, web persist, the design.md export, and the export filename), so an ISOLATED
 * identity edit — no lever change after it — never reached it. This copies the identity fields across
 * and re-persists so all of those are correct the instant the field changes, with no re-resolve:
 *  · Apply posts `lastGoodInput` (a BrandInput the plugin re-resolves), so the fresh `root` reaches
 *    the plugin's emission from here alone;
 *  · web persist writes `lastGoodInput`, so a reopen restores the fresh name/namespace;
 *  · `slug(lastGoodInput.id)` and `toDesignMd(lastGoodInput)` pick up the fresh name.
 *
 * It does NOT touch the resolved `theme`. That was the original fix's mistake: `theme.root` and
 * `theme.namespace` are SEPARATE fields — `buildTree` roots the tree at `theme.root` but resolves every
 * color ref under `theme.namespace` (`= <root>.core.palette`, set by `brandTheme`), and `resolveAllModes`
 * bakes ~74% of the aliased refs from `theme.namespace`. Patching only `theme.root` left the tree rooted
 * at the new namespace with the color refs still pointing at the old one — dangling aliases, WORSE than
 * the coherent-but-wrong pre-fix state. Identity is not "pure namespacing you can copy in": the local
 * `theme` used by the DTCG export must be RE-RESOLVED, which `ensureThemeFresh` does at the export boundary.
 *
 * Persists `lastGoodInput` (not the live `brandState`) so the M-15/M-16 invariant holds — a concurrent
 * failing lever edit must not reach storage, but the identity change, always valid on its own, must.
 */
export const syncIdentity = (): void => {
  lastGoodInput.id = brandState.id;
  lastGoodInput.root = brandState.root;
  persist?.(lastGoodInput);   // web reopen reads the fresh identity
  invalidate('identity');     // S3: the bar's brand name follows the Brand page's name field
};

/**
 * Re-resolve the module-level `theme` from `brandState` when the namespace has drifted since the last
 * resolve — the load-bearing half of the #1196 fix, deferred to the DTCG-export boundary so it stays
 * off the typing path (a `rebuild()` per keystroke would re-resolve the whole theme while the designer
 * types the root). A namespace change moves `brandState.root` but skips `rebuild()` for the caret, so
 * `theme` (rooted + color-namespaced at the OLD root) goes stale. The token export reads that local
 * `theme` via `buildTree(theme)`; called first, this makes the tree's root AND every ref inside it agree
 * on the current namespace. A no-op when nothing drifted (the common case), so it is free on every other
 * export. If a concurrent invalid lever edit makes `rebuild()` throw, `theme` keeps its last-good value —
 * coherent under the old namespace (M-16: emit the last-good, never a failing live state).
 */
export const ensureThemeFresh = (): void => {
  if (theme.root !== (brandState.root ?? 'prism')) rebuild();
};

/** Replace the working brand wholesale and reset the view onto it: first page, first mode.
 *
 *  `origin` IS REQUIRED, AND THAT IS THE ENFORCEMENT (#722, implementing #721). A writer cannot assign
 *  the working brand without saying where it came from — it fails `typecheck` at the call site rather
 *  than passing and leaving `provenance` describing the previous load. `main.ts`'s `loadBrand` is the
 *  one caller; it resets its own menus and re-renders around this. */
export const loadInput = (input: BrandInput, origin: Origin): void => {
  brandState = structuredClone(input);
  // Set from the SAME value assigned above, before any edit can land — the baseline is what was
  // loaded, not what the state happens to hold when someone next asks.
  provenance = provenanceOf(origin, brandState);
  invalidate('origin');
  setPage('palettes');
  rebuild();
  setCurrentMode(rp.modes[0]);
};

/** Return to the start moment without touching the working brand: the origin becomes `none`, so
 *  `firstRun()` reads true and the start screen follows (#722). */
export const clearOrigin = (): void => {
  provenance = noOrigin(brandState);
  invalidate('origin');
};

export const setCurrentMode = (m: Mode): void => { currentMode = m; invalidate('mode'); };
export const setPage = (k: PageKey): void => { page = k; invalidate('page'); };

// ---- settings search (UI redesign S1.2, the owner's QA note Q3) -------------------------------------
// View state, like the page and the mode: never part of the brand. The search field writes the query;
// whatever shows settings filters itself to it and reports how many it matched. The field itself only
// reads `searchHits`, so typing never rebuilds it.

/** The settings search query, as typed. Empty means no search. */
export let searchQuery = '';
/** How many settings the query matched on the page in view, or null when nothing has been searched. */
export let searchHits: number | null = null;
export const setSearch = (q: string): void => { searchQuery = q; invalidate('search'); };
export const setSearchHits = (n: number | null): void => { searchHits = n; invalidate('search:hits'); };

// ---- paths into the input --------------------------------------------------------------------------

export const getPath = (o: any, p: string): any => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
export const setPath = (o: any, p: string, v: unknown): void => {
  const ks = p.split('.');
  const last = ks.pop()!;
  let cur = o;
  for (const k of ks) { if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; }
  cur[last] = v;
};

// ---- per-mode modeLevers read/write (single source for every per-mode editor) ---------------------
// The per-mode lever axes (radius/tempo/density selects, the typography family/weight/leading/tracking
// editors, the shadow softness/tint sliders) all read + write `brandState.modeLevers[mode].<path>` with
// the SAME prune-to-byte-identical invariant: a mode whose overrides are all cleared must revert to
// exactly the no-override state. These three helpers own that so no editor re-implements it (and can't
// drift from it). `path` is a dot path into the mode entry (e.g. 'radius', 'families.display',
// 'shadow.tint.hue').
export const getModeLever = (mode: string, path: string): unknown => {
  let node: any = brandState.modeLevers?.[mode];
  for (const p of path.split('.')) { if (node == null) return undefined; node = node[p]; }
  return node;
};
/** Drop empty nested maps and the mode entry (and modeLevers itself) so an all-cleared mode is byte-
 *  identical to never having had an override. */
export const pruneModeLevers = (mode: string): void => {
  const ml = brandState.modeLevers; if (!ml) return;
  const e = ml[mode];
  const dropEmpties = (o: any): void => {
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) { dropEmpties(v); if (!Object.keys(v).length) delete o[k]; }
    }
  };
  if (e) { dropEmpties(e); if (!Object.keys(e).length) delete ml[mode]; }
  if (!Object.keys(ml).length) brandState.modeLevers = undefined;
};
/** Set `modeLevers[mode].<path>` to `value` (creating the nested maps), or delete it when `value` is
 *  undefined / '' — then prune empties. Does NOT re-render (callers pick apply/applyFull). */
export const setModeLever = (mode: string, path: string, value: unknown): void => {
  const ml = brandState.modeLevers ?? (brandState.modeLevers = {});
  const e: any = ml[mode] ?? (ml[mode] = {});
  const parts = path.split('.');
  const last = parts.pop()!;
  let node: any = e;
  for (const p of parts) node = node[p] ?? (node[p] = {});
  if (value !== undefined && value !== '') node[last] = value; else delete node[last];
  pruneModeLevers(mode);
};
