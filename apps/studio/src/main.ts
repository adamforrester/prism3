/**
 * Prism3 web dashboard (docs/08 §7 B3, docs/09).
 *
 * The FIRST rendering host over the engine core. It imports the SAME pure modules
 * the Figma plugin will (`theme`, `levers`, `preview`, `resolve-preview`, `color`,
 * `ramp`) and renders from the shared contracts:
 *   1. the theming knobs — from the lever manifest (`levers.ts`)
 *   2. a live component preview + per-mode contrast overlay — from `previewSpec`
 *      resolved through `resolvePreview(theme)`
 *   3. the generated palette ramps — straight off `brandTheme(input).palettes`
 *
 * The shell is a FOUR-STAGE build order (primitives → semantic → type → form),
 * mirroring how a theme actually composes: primitives first, then the semantic
 * roles that alias them, then type, then form. Stage 1 (Brand primitives) is the
 * bespoke redesign — a scalable brand-color list, a tunable neutral cast with a
 * Derive⇄Pin toggle (surfacing the engine's `neutral.anchor`), and the generated
 * ramps shown as labeled specimens. Later stages render their lever groups + the
 * live preview/overlay. Colour-axis edits re-resolve the engine and repaint only the
 * volatile region (ramps or preview), so knob focus is never lost; a failed brand
 * combination is caught and surfaced with the last-good render preserved.
 */
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput, Theme } from '@prism3/engine/theme';
import { hex, oklchToRgb, contrast, composite } from '@prism3/engine/color';
import { resolveAllModes } from '@prism3/engine/modes';
import { toDesignMd } from '@prism3/engine/design-md';
import { buildTree, deref, subNode, numOf, remPxOf, familyOf, type TreeNode } from '@prism3/engine/tree';
import { hostCommit, type HostCommit } from './write-adapter';
import { initialHostSession, reduce, topicsFor, brandEffectFor, type HostSession, type DetailKey, type OpKey } from './state/host-session';
import type { StyleGuideOptionsMsg } from './write-adapter';
import { emToPercentLabel } from './em-percent';
import { mountFrame, type Frame } from './shell/frame';
import { isNewPage, pageOfTab, type LegacyPageKey } from './shell/pages';
import type { ActivityReading, OpReading } from './shell/activity';
import type { FigmaAction } from './shell/figma';
import { glyph, pendingLabel, setBusy } from './shell/dom';
// The start window (UI redesign S12) and what it shares with the brand menu's import: one check for every paste and
// every file, with the error naming its line (owner decision S7).
import { openStart, type StartChoice, type StartWindow } from './shell/start';
import {
  IMPORT_ACCEPT, guardText, importErrorText, readDesignMdFile, validateDesignMd, validatePaste,
} from './state/start-input';
// The Style guide's shared color sections and the helpers they draw with (UI redesign S4a, owner decision Q5):
// Color › Surfaces & fills draws the same five sections from the same modules.
import {
  SG_SURFACES, colorPath, ground as sharedGround, oppositeOf, palSection, sgContext, specimen, subHead,
  tokenPillSpan, withInverseBadge, VIEW_ONLY, type SgRole,
} from './preview/sections/kit';
import {
  COLOR_SECTIONS, disabledSection, interactiveSection, typeSampleSection, radiusSampleSection, RADIUS_SAMPLE, SAMPLE_SHADOW,
} from './preview/sections/index';
// The component catalog, which the set build asks whether a set can be built (UI redesign S8.2: the Components page
// itself lists it, from `preview/components.ts`; the Button options moved to `domains/components.ts`).
import { componentCatalog } from './state/component-catalog';
// The brand's Control shape, for the Style guide's radius sample (UI redesign S7, owner decision D18 B).
import { brandControlShape } from './state/shape-input';
// The Elevation and Motion writes moved to `state/depth-motion-input.ts` (UI redesign S9.1), and every Elevation and
// Motion control to `domains/depth.ts` (S9.2); the Type writes to `state/type-input.ts` and every Type control to
// `domains/type.ts` (S6.1 to S6.3). Nothing here writes either any more.
import {
  needsOverwriteConfirm, isDirty, isUnrecoverable, editCount,
  type Origin,
} from './provenance';
import {
  ARTIFACTS, defaultSettings, visibleSettings, projectDtcg, fileNames, previewFiles, availableImportSlots,
  type ArtifactId, type SettingsState, type ExportSource,
} from './export-settings';
// The BrandInput session — the working input, the resolved theme, the last-good rule, the viewed mode
// and page — lives in a DOM-free module so a Node test can import it (#896). Its `let`s are live
// bindings here: read freely, reassigned only through its setters.
import {
  BRANDS, brandState, provenance, bootProvenance, theme, lastGoodInput, rp, currentMode, lastError, page,
  firstRun, rebuild, ensureThemeFresh, loadInput, clearOrigin, setCurrentMode, setPage,
  getPath, setPath, subscribe, invalidate, searchQuery, searchHits, setSearchHits,
  type Mode, type PageKey,
} from './state/store';

// The session starts in `entry.ts` (#896): it reads the web's persisted brand, picks the origin, and
// hands both to the store's `initSession` before anything renders. `firstRun`, the start screen's
// gate, is the store's reading of that origin.

// The start paths' brands ("Start blank", a color's seed) moved to `state/start-input.ts` with the start window (S12).

const MODE_LABEL: Record<string, string> = { light: 'Light', dark: 'Dark', 'hc-light': 'HC light', 'hc-dark': 'HC dark', wireframe: 'Wireframe' };

// ---- stages ----------------------------------------------------------------
// The rail is data (docs/23 §7): a flat list of focused destinations, each one page. A page's facets
// are sections within it, not separate rail rows. `view:true` marks a non-authoring destination
// (Preview, Components) — it sits after a divider with no ordinal. Order is the sequence a theme
// composes in: primitives → how they're applied (surfaces / interactive) → type → form
// (elevation/size/layout/motion) → look at the whole (Preview) → write something out (Components).
const NAV = [
  // UI redesign S8.2 moved the Button options (Size & radius's last block) and the component build (the Components
  // page) to the Components tab (`domains/components.ts`, `preview/components.ts`), so their two rows are gone. What is
  // left is the plugin's Style guide, until S11.2 moves it into the Figma menu; the web offers no destination, so it
  // draws no Pages menu (owner decision G19 A).
  // #259 — the style-guide step, after Apply theme: it documents the variables Apply wrote, so it follows the
  // authoring pages and Preview. Figma-only: it draws on the canvas, so the web rail omits it (docs/23 §7's rule for a
  // destination that only makes sense in the Figma channel).
  // Placement and label are proposed, owner to confirm (docs/45).
  { key: 'styleGuide', label: 'Style guide', sub: 'Token tables on the Figma canvas', view: true, figmaOnly: true },
] as const satisfies readonly { key: LegacyPageKey; label: string; sub: string; view?: boolean; figmaOnly?: boolean }[];
/** THE OTHER DIRECTION (#1846). `satisfies` above makes every rail row name a `PageKey`; this makes every
 *  `PageKey` have a rail row. `PageKey` used to be DERIVED from `NAV`, so the second half held by
 *  construction; since F2 hand-listed it in `state/store.ts`, a new key with no row compiled, and the page
 *  was reachable only by a `setPage` nobody could click to. Two hand-written lists, checked against each
 *  other both ways, is the independence docs/34 asks for. A missing row fails `typecheck` here, naming the
 *  key in `missingNavRow`. */
type PageWithoutNavRow = Exclude<LegacyPageKey, (typeof NAV)[number]['key']>;
const everyPageHasANavRow: [PageWithoutNavRow] extends [never] ? true : { missingNavRow: PageWithoutNavRow } = true;
void everyPageHasANavRow;

/** The destinations this HOST offers. `figmaOnly` entries are absent from the web rail, not disabled
 *  in it — a grayed row still claims the destination exists and just will not open (the same call
 *  `renderModeStrip` makes about hiding rather than disabling the mode bar).
 *
 *  Read by BOTH consumers — the sidebar and the narrow-width `Pages` menu. Filtering one and not the
 *  other is the shape that would ship: the menu is the rail below 900px, so a Figma-only destination
 *  left in it would be reachable on a phone-width web page and unreachable on a desktop one. */
const railNav = (): readonly (typeof NAV)[number][] => NAV.filter((s) => !('figmaOnly' in s && s.figmaOnly) || commit.isFigma);

/** Is `i` the first `view` destination in `nav`? — the one place the authoring/result divider goes.
 *
 *  Shared by the sidebar and the `Pages` menu, which is the point: this WAS `if ('view' in s && s.view)`
 *  duplicated in both, correct only while there was exactly one view destination. Adding a second (this
 *  ticket's Components, and later docs/23 §6's Output) would have drawn a rule between every pair. */
const isView = (s: (typeof NAV)[number]): boolean => 'view' in s && s.view === true;
const isFirstView = (nav: readonly (typeof NAV)[number][], i: number): boolean =>
  isView(nav[i]) && !nav.slice(0, i).some(isView);

// `pageOfLever` and `leversFor`, the routing table only the Motion page read (#958), went with that page in UI redesign
// S9.2: every page now names its levers, and `test-pages.ts` plus `test:chrome`'s rendered coverage hold that each
// manifest lever has a home that draws it. (`leverByKey`, their last reader's lookup, went with the Button options in S8.2.)

// ---- engine read-model -----------------------------------------------------
// `theme`, `rp`, `lastGoodInput` and `lastError`, with `rebuild()` and its last-good rule, live in
// `state/store.ts`; what follows is how this file repaints from them.

// paint() repaints only the current stage's volatile region (ramps or preview) so
// input focus is never lost; applyFull() re-renders the workspace REGION BY REGION (structural
// edits — add/remove color, Derive⇄Pin, stage switch); build() re-renders the shell.
let paintVolatile: () => void = () => {};
/** The nodes the CURRENT page's `paintVolatile` writes into — see `setVolatile`. Read only by
 *  `renderWorkspace`'s region reconcile, which must never keep a live region that holds one. */
let volatileHosts: readonly HTMLElement[] = [];
/** Assign the page's volatile painter AND declare the nodes it writes into. Both halves in one call
 *  because they are one fact, and the render granularity added by #771 makes the second half
 *  load-bearing rather than documentation.
 *
 *  WHY THE DECLARATION EXISTS. `renderWorkspace` no longer destroys the page; it builds the next page
 *  detached and KEEPS every live region whose content is unchanged (that is the whole of #771). A page
 *  renderer's painter closes over nodes it built in that detached tree — `vol` in `renderScreen`, the
 *  `.cs-preview` boxes in the retired `controlSplitPage`.
 *  If the reconcile keeps the LIVE region those nodes correspond to, the freshly-assigned painter is
 *  left writing into a tree that was never attached, and every later `apply()` paints into nothing.
 *
 *  That is not a hypothetical: it is the same failure the retired Components page guarded against in
 *  the other direction ("a page that skips the assignment leaves the previous page's closure live, and
 *  the next `apply()` paints specimens into nodes this render already detached"). #771 gave that failure
 *  a second door, so it gets a mechanism rather than a second comment. Declaring a host makes its region
 *  ineligible to be kept — the fresh node always wins there, so the closure is always live.
 *
 *  DECLARE THE OUTERMOST NODE THE PAINTER REACCHES INTO, not every leaf: eligibility is tested with
 *  `contains`, so naming a section covers everything the painter touches inside it.
 *
 *  THIS IS THE ONLY WRITER OF `paintVolatile`. A renderer that assigns the binding directly gets no
 *  protection at all — its painter can be orphaned by the very next commit, silently. */
const setVolatile = (hosts: readonly HTMLElement[], paint: () => void): void => {
  volatileHosts = hosts;
  paintVolatile = paint;
};
let globalErrHost: HTMLElement | null = null;
/** Keep the global error bar honest after every rebuild. `lastError` is set by `rebuild()`'s catch and
 *  means "the live edit did not resolve; you are looking at the last good theme" — a state the user must
 *  be told about wherever they are, not only on the page that happens to render it.
 *
 *  The second clause is inherited from the Color-page bar this replaced (#772). That bar said "showing
 *  the last valid palettes", which was the useful half the global copy was missing: without it the
 *  message says an edit failed and leaves open whether what is on screen is the failed state. It is
 *  true on every page, so it is said on every page — folding the duplicate in was not allowed to lose
 *  what the duplicate knew. */
const syncErrorBar = (): void => {
  // THE INVARIANT, STATED WHERE IT CAN BE VIOLATED (#772): an engine error must never be held with no
  // surface rendering it. That is #388 in one line, and checking it here catches every route to it —
  // the bar not mounted, mounted into a view that was then replaced, or a root view put on screen
  // outside `mountView`. `isConnected`, not a null check: a detached node is a surface that shows
  // nothing while still satisfying every reference to it. Reports rather than throws, for the reason
  // `chromedWorkspace` gives; the smoke suite's zero-console-errors assertion makes it fatal in CI.
  if (!globalErrHost?.isConnected) {
    if (lastError) console.error(`the 'error' chrome surface is not mounted in this view, so an engine error is going unreported: ${lastError} (#772)`);
    return;
  }
  // `hidden`, not an inline `display`: the bar sits in the frame's notices row, which is chrome, and the
  // chrome carries no runtime inline values (`test:chrome`).
  globalErrHost.hidden = !lastError && !restoreFailure;
  // A refused RESTORE is not a change that didn't apply, and what is on screen is not the designer's last
  // theme but the boot demo (#1989). So it says whose brand failed, and why the two writes are off.
  if (restoreFailure) globalErrHost.textContent = RESTORE_BAR[restoreFailure.kind](restoreFailure.reason);
  else if (lastError) globalErrHost.textContent = `That change didn't apply: ${lastError} — you are seeing the last theme that resolved.`;
  syncChromeHeight();   // the bar lives in the chrome; showing it moves everything sticky below
};
// `syncChrome()` refreshes EVERY declared chrome surface (see CHROME_SURFACES) rather than naming
// them one at a time. These two lines used to read `renderModeStrip(); syncErrorBar();` — two of the
// four surfaces, hand-listed in two refresh paths, which is the shape that let #388's error bar be
// reachable from exactly one page. A surface added to the declaration is picked up here for free.
const apply = (): void => { rebuild(); syncChrome(); paintVolatile(); };
// `applyFull` names no surface either, and it does not call `syncChrome()` DIRECTLY: `renderWorkspace`
// runs the pass itself, once, after the region reconcile has landed (#771). That is the second half of
// the mode strip's `syncLast` — last within the pass, and the pass last within the render — because
// `renderModeStrip` ends in a `--chrome-h` re-measure, and a layout read taken before the page it sits
// on top of has settled publishes a height measured against the outgoing layout. The roster is still
// the only list; the ordering is declared in it rather than restored by a hand-listed call here.
const applyFull = (): void => { rebuild(); renderWorkspace(); };

// ---- scoped styles: the class-name law (#770) --------------------------------
//
// THE DEFECT THIS REPLACES A GATE FOR. Four defects in one session shared one shape — a class token
// minted for one surface silently matching a rule authored for another, invisible at the mint site
// and findable only by looking at a render. `.pfield.slider` picked up a standalone
// `.slider{margin-top:16px}` 70 lines away, and that 16px WAS the palette row's label misalignment
// in full; three alignment fixes could not touch it because it was never an alignment problem
// (#464). `.psl-range` lost to `.range{margin-top:10px}` on source order at equal specificity,
// inflating a grid row 33px → 44px. `.seg` added chrome the `select` beside it had no equivalent of
// (#484). The repo's answer was `lint-classes.mjs`: scan the source for elements carrying two classes
// that each own a top-level rule, and fail until a human allowlists the pairing. It worked, and #544
// found three blind spots in it — but a gate that polices a collision is a workaround for an
// architecture that permits one. This is the architecture that does not.
//
// THE LAW, in one sentence: EVERY CLASS NAME BELONGS TO EXACTLY ONE SCOPE — the text before its first
// dash, or the whole name — AND AN ELEMENT'S CLASS LIST LIVES IN ONE SCOPE, plus a small shared
// vocabulary that provably cannot carry a rule on its own.
//
// It is enforced in two independent places, neither of which is a lint step that can be dropped from
// CI (which is exactly what this change did to `lint-classes.mjs`, so the distinction is the point):
//
//   1. MINT SIDE — the type of `el`'s class argument. `Scoped<T>` resolves to `never` when T's tokens
//      do not share one scope, so `el('div', 'pfield slider')` is a COMPILE error, caught by
//      `npm run -w @prism3/studio typecheck`. Deliberate cross-scope composition is spelled `mix(...)`
//      at the mint site — the review `ALLOWED` used to force from 8,000 lines away, now written where
//      the composition happens and required by the compiler rather than by a reviewer's diligence.
//      `checkScope` repeats the check at runtime for class strings the type system sees only as
//      `string` (template literals, values threaded through helpers) — the hole a type-level rule
//      always has, closed rather than documented.
//   2. STYLESHEET SIDE — `installStyles` below, which is the only path by which `styles.css` becomes
//      CSS. It refuses a stylesheet where a SHARED token (a STATE or a UTILITY) keys a top-level rule
//      on its own.
//
// WHY THOSE TWO TOGETHER CLOSE IT. A rule can only reach an element through a class the element
// carries. By (1) an element's tokens are one scope's members plus shared tokens. A scope member
// `s-x` is spelled with its scope, so the rule it matches is that scope's, by name. A shared token
// cannot match a single-class rule at all, because by (2) no such rule may exist for one — it can
// only appear in a COMPOUND selector (`.pfield.slider`), which requires the anchor to be present and
// therefore can never act on an element of another scope. So there is no spelling of "this token
// silently picked up someone else's rule". The two shared lists cannot be abused to reopen it either:
// putting a scope head into STATES makes its own rule illegal under (2), and leaving it out makes the
// mint a type error under (1). Both doors, not one.
//
// WHAT REMAINS REPRESENTABLE, stated plainly rather than left for the next reader to discover:
// `mix('pfield', 'slider')` reproduces the original bug exactly. That is deliberate — genuine
// composition exists (the export dialog reusing `.seg`, a token pill flagged by the style guide) and
// pretending otherwise would just push it into a template literal. What is closed is the SILENCE: the
// composition is now named at the point of use, in the same expression that creates the element, and
// there is no way to not name it.

/** A class name's scope: everything before its first dash, or the whole name. */
type Stem<T extends string> = T extends `${infer A}-${string}` ? A : T;

/** Composable utilities — classes meant to be worn by anything, so they are exempt from the one-scope
 *  rule. Both carry TYPE treatment only; `installStyles` re-derives that invariant from the shipped
 *  stylesheet rather than trusting this comment (the #544 lesson, kept). Keep this list at two. */
const UTILITIES = ['mono', 'faint'] as const;
/** State and modifier classes — the other half of the shared vocabulary. Every one of these owns NO
 *  top-level rule of its own; each appears only in a compound (`.select.sm`, `.panchor.dia`), which
 *  is what makes them safe to wear alongside any scope: a compound cannot fire without its anchor.
 *  `installStyles` enforces exactly that, so this list cannot silently grow a name that carries a
 *  declaration. Adding a name here whose rule keys on it alone fails at boot. */
const STATES = [
  'active', 'authored', 'bad', 'cap', 'cs-nudge', 'cur', 'dark', 'derived', 'dia', 'disabled',
  'fill', 'fixed', 'inline', 'is-anchor', 'is-pressed', 'mtbl-spec', 'no', 'none', 'note', 'ok',
  'on', 'open', 'pin', 'primary', 'r', 'ro', 'set', 'sg-inv', 'sg-l', 'sg-r', 'sg-t', 'show-hex',
  'slider', 'sm', 'stuck', 'unbound', 'unknown', 'warn', 'yes', 'zero',
] as const;
type Utility = (typeof UTILITIES)[number];
type State = (typeof STATES)[number];
/** The shared vocabulary — wearable with any scope. */
type Free = Utility | State;

/** True when every token of T is in scope S or is a shared token; false at the first that is neither. */
type AllInScope<S extends string, T extends string> =
  T extends `${infer A} ${infer R}`
    ? (A extends S | `${S}-${string}` | Free ? AllInScope<S, R> : false)
    : (T extends S | `${S}-${string}` | Free ? true : false);
/** The scope a class list is anchored to: the scope of its first token that is NOT a shared one.
 *  Mirrors `checkScope`'s runtime choice of anchor exactly, so `'mtbl-name mono'` and `'mono mtbl-name'`
 *  are the same statement to both halves of the law. */
type Anchor<T extends string> =
  T extends `${infer A} ${infer R}`
    ? (A extends Free ? Anchor<R> : Stem<A>)
    : (T extends Free ? T : Stem<T>);
/** A class list anchored to one scope — T itself when the law holds, `never` when it does not, which
 *  is what makes a cross-scope mint a compile error at the call site rather than a lint finding. */
type Scoped<T extends string> = AllInScope<Anchor<T>, T> extends true ? T : never;

/** A deliberately cross-scope class list. Distinct from `string` so it is visible in the source and
 *  at every site that accepts one; `el` takes it in place of a `Scoped<T>` literal. */
type Mix = { readonly cls: string };
/** Declare a cross-scope composition. Every argument names a scope this element deliberately joins —
 *  the reviewed-pairing decision `lint-classes.mjs`'s `ALLOWED` used to hold, moved to the one place
 *  that can see the surrounding layout. Write the reason beside the call, not in a list elsewhere. */
const mix = (...parts: string[]): Mix => ({ cls: parts.filter(Boolean).join(' ') });

const FREE: ReadonlySet<string> = new Set<string>([...UTILITIES, ...STATES]);
const scopeOf = (token: string): string => (token.includes('-') ? token.slice(0, token.indexOf('-')) : token);
/** The runtime half of the mint law — same rule as `Scoped<T>`, applied to class strings the type
 *  system only ever sees as `string`. Throws rather than warns: a cross-scope mint is the defect this
 *  whole section exists to make unreachable, and a warning is a thing a render can survive. */
const checkScope = (cls: string): string => {
  const toks = cls.split(/\s+/).filter(Boolean);
  const anchor = toks.find((t) => !FREE.has(t));
  if (anchor) {
    const s = scopeOf(anchor);
    const off = toks.filter((t) => !FREE.has(t) && t !== s && !t.startsWith(`${s}-`));
    if (off.length) {
      throw new Error(
        `apps/studio: class list "${cls}" spans scopes — '${anchor}' is scope '${s}', but ${off.map((t) => `'${t}'`).join(', ')} ` +
          'is not. One element, one scope (#770). If the composition is intended, say so with mix().',
      );
    }
  }
  return cls;
};

// ---- DOM helpers -----------------------------------------------------------
const el = <T extends string = string>(tag: string, cls?: (T & Scoped<T>) | Mix, text?: string): HTMLElement => {
  const n = document.createElement(tag);
  if (cls) n.className = typeof cls === 'string' ? checkScope(cls) : cls.cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
/** A stable test hook: `data-p3="<role>"`. The browser suites (`test:smoke`, and the plugin's `test:verdict`
 *  and `test:start`) find elements by this attribute rather than by class or visible copy, so a restyle or
 *  a rename does not move what they locate. The value names the element's ROLE in kebab-case and stays
 *  fixed across a redesign. No style rule keys on it, and state stays on the shared STATES classes. */
const hook = <E extends Element>(n: E, role: string): E => { n.setAttribute('data-p3', role); return n; };
/** `classList.add` under the same law — for the two places a class is added to an already-built
 *  element rather than at its mint. Pass `mix(...)` when the addition crosses a scope. */
const addClass = (n: HTMLElement, cls: string | Mix): void => {
  const next = `${n.className} ${typeof cls === 'string' ? cls : cls.cls}`.trim();
  n.className = typeof cls === 'string' ? checkScope(next) : next;
};

// ---- control kit — the reusable vocabulary every knob + select is built from ----------------------
// Small structural primitives shared by renderControl and the bespoke editors, so a control (or a whole
// screen in the IA reorg) composes from these rather than re-deriving the `knob` scaffold and the
// `<option>` boilerplate each time. Purely structural — they produce exactly the nodes the hand-rolled
// versions did; behaviour and styling are unchanged.
/** An `<option>` with value/text and optional pre-selection — replaces the per-site opt/optE/mkOpt closures. */
const optionEl = (value: string, text: string, selected = false): HTMLOptionElement => {
  const o = document.createElement('option');
  o.value = value; o.textContent = text; if (selected) o.selected = true;
  return o;
};
/** The dashboard `<select>` (doc 24 C1). One `.select` base class owns all dropdown cosmetics — border,
 *  radius, background, and the shared chevron — so a styling tweak lands in one place. Size / context are
 *  additive modifiers: `sm` (compact inline) · `fill` (flex to its row) · `cap` (max-width, for cards).
 *  Callers append their own `<option>`s (option-building varies too much to generalise). */
const selectEl = (mods: string | Mix = ''): HTMLSelectElement => el(
  'select',
  // A plain string is `select`'s own modifier vocabulary (`sm`/`fill`/`cap`) and goes through the
  // scope check like any mint; a caller wanting to size the control from ITS scope says so with
  // mix(), which is the one shape that legitimately crosses (#770).
  typeof mods === 'string' ? (mods ? `select ${mods}` : 'select') : mix('select', mods.cls),
) as HTMLSelectElement;
/** The on/off toggle switch (doc 24 C3) — a `.toggle` checkbox paired with its On/Off `.knob-val`
 *  readout, returned as a `knobBody`. `onToggle(checked)` fires after the readout updates; the caller
 *  runs its own `apply()` / `applyFull()`. */
const toggleField = (checked: boolean, onToggle: (checked: boolean) => void): HTMLElement => {
  const input = el('input') as HTMLInputElement;
  // #559 — hit-min's ::before widens the hit box; `.toggle`'s own 38px width is already past the
  // floor, so the pseudo overlays that axis rather than narrowing it. A declared cross-scope pairing.
  input.type = 'checkbox'; input.className = mix('toggle', 'hit-min').cls; input.checked = checked;
  const val = el('span', 'knob-val', checked ? 'On' : 'Off');
  input.onchange = () => { val.textContent = input.checked ? 'On' : 'Off'; onToggle(input.checked); };
  return knobBody(input, val);
};
/** The resolvable DTCG path for a colour role, for every pill that shows one. One tier, one rule.
 *
 *  This used to be a TIER LOOKUP, and it is worth knowing why it is not one any more, because a pill is
 *  a path a developer copies and a wrong one resolves to nothing. #1013 split `color.*` in two: a
 *  POINTER tier holding the short name for each of the 130 non-inverse roles, and a VALUE tier at
 *  `color.appearance.*` where the 113 inverse-band roles existed ONLY. So the right path depended on
 *  which side of that split a role fell, and this function asked `surfaceRows` — the one derivation both
 *  materialisations read — rather than pattern-matching `inverse` locally, so a pill could not disagree
 *  with the emitted tree.
 *
 *  #1148 collapsed the two tiers into one `color`, which gives every role the short name and leaves no
 *  membership question to ask. The lookup is gone rather than kept returning true for everything: a
 *  predicate that cannot say no is not a check (`docs/34` shape 9). */
// `colorPath` lives in `preview/sections/kit.ts` (UI redesign S4a), shared with the Style guide's sections.

/** A token-path chip (doc 24 C4) — the small mono pill that shows a DTCG/role path.
 *
 *  A long path ELIDES FROM THE LEFT instead of wrapping to two lines (#289): the CSS gives the pill
 *  `direction:rtl`, which moves where `text-overflow:ellipsis` bites to the start, so
 *  `color.inverse.background.primary` renders as `…erse.background.primary`.
 *
 *  Why not the obvious right-truncation: these paths share long prefixes and differ only in the tail.
 *  `color.foreground.brand` and `color.foreground.brand-subtle` — or the six
 *  `color.inverse.interactive.destructive.{text,fill}.{rest,hover,pressed}`, whose first 38
 *  characters are identical — all collapse to the SAME visual stub if you cut from the right. The
 *  discriminating information lives at the end, so that is the end worth keeping. The cost is that the
 *  namespace prefix is the part hidden when space is tight; `title` and (on style-guide pills) the
 *  hover bubble both carry the full path, and the emitted path itself is unchanged, which is what
 *  doc-26's namespace rule is actually about.
 *
 *  The path stays a SINGLE text node and the elision is purely visual — only where `text-overflow`
 *  bites does the rendered text truncate — which is what keeps a text selection exact: today's pill
 *  is one text node, so anything that split it would REGRESS copy/paste. Two earlier attempts did
 *  exactly that: `inline-flex` head+tail laid out correctly but flex items are blockified, so a
 *  selection came back as `color\n.background.primary`; switching to `inline-block` with the tail's
 *  width reserved in `ch` fixed the newline but the head's `max-width:100%` resolved against the
 *  pill's own shrink-to-fit width — circular — which collapsed the head to nothing on 181 of 198
 *  pills. Both measured, not reasoned about. `title` carries the full path for the elided case.
 *
 *  This mints the pill ALONE. `tokenPill` is what callers want: it pairs the pill with the `inverse`
 *  badge (#1147) where the path needs one. The two are split because the two callers that rebuild the
 *  pill's children — `tokenPillWrapping` and `sgPill` — must hold the pill itself, not a wrapper. */
// `tokenPillSpan` lives in `preview/sections/kit.ts` (UI redesign S4a).
/** True when a path's discriminator is the `inverse` group (#1141) — matched as a whole SEGMENT, so a
 *  role that merely contains the letters (`brand-inverse-subtle`, were one ever minted) is not one. */
// `isInversePath` lives in `preview/sections/kit.ts` (UI redesign S4a).
/** Pair a pill with an `inverse` badge when its path carries that group, and return it unchanged when
 *  it does not (#1147).
 *
 *  THE BADGE IS A SIBLING, AND THAT IS THE WHOLE POINT. `.tpill` elides from the LEFT, so the elided
 *  end is the shared namespace prefix — a design that assumes the discriminator lives in the TAIL, and
 *  a correct assumption until #1141 moved the inverse marker to a LEADING `inverse.` group. Measured on
 *  `ba3e0cf`: all 113 inverse roles have a non-inverse twin differing ONLY by that segment, so once a
 *  pill is narrow enough to elide, `color.inverse.background.primary` and `color.background.primary`
 *  both render `…background.primary`. Two tokens, one rendering, in a tool whose job is telling you
 *  which token you are looking at.
 *
 *  Anything INSIDE the pill would be subject to the same ellipsis, so the badge sits outside its
 *  overflow box. And it is a sibling rather than a segment of the pill's text for the reason
 *  `tokenPill` documents at length: the pill is ONE text node, two earlier attempts to split it
 *  regressed copy/paste, and a path copied out of a pill still has to be the path. `.tpill`'s own text
 *  node is untouched here. */
// `withInverseBadge` lives in `preview/sections/kit.ts` (UI redesign S4a).
const tokenPill = (path: string): HTMLElement => withInverseBadge(path, tokenPillSpan(path));
// `tokenPillWrapping` lives in `preview/sections/kit.ts` (UI redesign S9.1), with the Motion sections that draw it.
/** A dashed "+ add" button (doc 24 C4). `.addbtn` owns the styling; pass context classes (width/margin)
 *  via `cls`. That context class comes from the CALLER's scope, so the pairing is a declared mix()
 *  — the base owns cosmetics, the context class owns placement, and neither overrides the other (#770). */
const addButton = (label: string, onClick: () => void, cls = ''): HTMLButtonElement => {
  const btn = el('button', cls ? mix('addbtn', cls) : 'addbtn', label) as HTMLButtonElement;
  btn.onclick = onClick;
  return btn;
};
/** The `div.knob-body` row — a control input paired with its `knob-val` readout (slider / toggle). */
const knobBody = (...kids: Node[]): HTMLElement => { const r = el('div', 'knob-body'); r.append(...kids); return r; };
/** The knob scaffold: `label.knob-label`, the control body (one node or several), then `p.knob-desc`.
 *  Every control — generic or bespoke — shares this shape. */
const knob = (label: string | null, body: Node | Node[], desc: string): HTMLElement => {
  const wrap = el('div', 'knob');
  // A chip group names itself with its own `<legend>` (#1675), so it takes no `label` beside it.
  if (label !== null) wrap.append(el('label', 'knob-label', label));
  wrap.append(...(Array.isArray(body) ? body : [body]));
  wrap.append(hook(el('p', 'knob-desc', desc), 'control-description'));
  return wrap;
};
// The COMMIT host (docs/22 #110) — distinct from the preview: "materialise this theme".
// On web it's inert (the export bar downloads); in the Figma plugin it posts the BrandInput to
// the main thread (→ #108 applyWritePlan) and receives the #109 read-back seed summary on boot.
export const commit = hostCommit();
/** The Customize options (#259). Session state, not persisted with the brand: they shape a drawing of the
 *  file's variables, not the brand itself. Proposed, owner to confirm (docs/45). */
const styleGuideOptions: StyleGuideOptionsMsg = {};
/** Everything the host has told this UI, and where each host action stands: one value, whose fields and
 *  their rationale live in `state/host-session.ts` (F3). A host message changes it only through `reduce`
 *  there; the UI's own actions below (a button going pending, a pill opening its detail) reassign it
 *  whole through `setHost`. */
let host: HostSession = initialHostSession();
const setHost = (patch: Partial<HostSession>): void => { host = { ...host, ...patch }; };
// Host → UI notifications: the #109 read-back seed summary, and the #131 knob-rehydration (the
// persisted BrandInput). restore-input loads the brand wholesale (loadBrand rebuilds + re-renders),
// so re-opening a themed Figma file boots on that brand instead of the default. `entry.ts` subscribes
// this after the whole module has evaluated, and it only fires async (after ui-ready), so every
// const it reaches below is defined.
//
// The state change is `reduce`, what changed is `topicsFor` and what it does to the brand session is
// `brandEffectFor` — all pure and unit-tested (`test-host-session.ts`). This function runs the brand
// effect, then invalidates the topics in order. IT NAMES NO PAINTER (UI redesign P2): each surface that
// reads host state subscribes to its topic beside its own painter — search `subscribe('host` and
// `subscribe('fonts'`. The `Repaint` tag switch that stood here is gone; #1845 was the proof it could
// lose a case silently, and `apps/plugin/test-build-verdict.mjs` now reads every topic's surface back.
export const handleHostMessage: Parameters<HostCommit['onHostMessage']>[0] = (m) => {
  const prev = host;
  host = reduce(prev, m);
  const effect = brandEffectFor(m, prev, host);
  // Origin `file`: this brand IS what the Figma file holds, so it is what a reset returns to and what
  // dirtiness is measured against (#722).
  // #1989: a restore the engine refuses in RESOLUTION leaves `lastGoodInput` on the boot demo, so Apply and
  // Prune go off until a brand resolves (`restoreFailure`). `loadBrand` renders once, before this can know
  // the outcome, so a refusal renders again with the writes off and the bar saying why.
  if (effect === 'loadBrand' && m.kind === 'restore-input') {
    loadBrand(m.input as BrandInput, { kind: 'file' });
    if (lastError) { restoreFailure = { kind: 'unresolved', reason: lastError, brand: failedBrandOf(brandState) }; build(); }
  }
  // #1994: the two restores that load nothing. `reduce` dropped a blob `brandTheme` refuses with no effect,
  // so its reason is read again here; an unreadable one arrives as the host's own message. Only while
  // nothing has been chosen (the #1197 guard below, by identity): once a designer has picked a brand, the
  // writes post THAT brand, not the demo, and turning them off would be wrong.
  const unchosen = provenance === bootProvenance;
  if (unchosen && m.kind === 'restore-input' && effect !== 'loadBrand') {
    let reason: string | null = null;
    try { brandTheme(m.input as BrandInput); } catch (e) { reason = (e as Error).message; }
    if (reason !== null) { restoreFailure = { kind: 'rejected', reason, brand: failedBrandOf(m.input) }; build(); }
  }
  if (unchosen && m.kind === 'restore-input-error') { restoreFailure = { kind: 'unreadable', reason: m.message, brand: null }; build(); }
  // #1197 — THE PLUGIN'S FRESH-FILE START MOMENT. The web reaches this state in `bootBrand`, which
  // can read localStorage synchronously and so knows at boot that nothing is stored. The plugin
  // cannot: the file's brand arrives asynchronously from the host, so boot has to pick a placeholder
  // and `example/<BOOT_BRAND>` is the honest one until the host answers (#721 state 2). This message is
  // the host answering "nothing", and it is the only moment at which `none` becomes true.
  //
  // GUARDED ON THE BOOT PROVENANCE BY IDENTITY, not on `firstRun()` and not on its value. Between
  // `ui-ready` and this message a designer can already have picked an example or uploaded a
  // design.md — the UI is live, not blocked on the host — and dropping them onto a start screen
  // would discard a choice they just made. `loadBrand` assigns a new provenance for every one of
  // those paths, so this identity check is exactly "nothing has been chosen yet".
  //
  // THE INVARIANT THIS RESTS ON (#1200): provenance is only ever REASSIGNED, never mutated in place.
  // Mutate it and identity survives while the meaning changes — the value would still be right and
  // this guard would discard a chosen brand again. It is enforced, not just stated: the fields are
  // `readonly` and `provenanceOf` deep-freezes what it returns, asserted in `test-provenance.ts`.
  //
  // The value-based version of this guard was written first and was WRONG: boot's placeholder origin
  // was `example/aurora` (the boot brand then; `BOOT_BRAND` now), so "origin is example/aurora and
  // nothing is dirty" also read true straight after a designer clicked the aurora chip. A late empty-restore then threw away the brand they had
  // just picked. Caught by the scenario in `test-start-screen.mjs` that posts the message after a
  // chip click, which is the only reason it is not still in here.
  else if (effect === 'startFresh' && provenance === bootProvenance) { clearOrigin(); build(); }
  for (const t of topicsFor(m, prev, host)) invalidate(t);
};


// ===========================================================================
// Section containers and the mode-scope badge, shared by the legacy pages
// ===========================================================================

// A per-role section container with a heading.
/** Which sections answer to the mode bar. MEASURED, not asserted — every entry came from
 *  `mode-audit.mjs`, which switched Light→Dark and diffed each section, and gated this map
 *  (`--check-badges`) on the web's legacy pages until UI redesign S8.3 deleted it with the last of them.
 *  The web draws no legacy page now; the map goes with the mode strip in S13.
 *
 *  Two states, not three (#439). The audit distinguishes `displays` (the preview re-resolves, the
 *  control does not) from `inert` (nothing changes), and that split is real and worth keeping in the
 *  tool — but it is not ACTIONABLE: in both cases the answer to "can I edit this per mode?" is no.
 *  Three labels made two of them sound like the same thing, which is exactly how it read in review.
 *
 *  Scope: the six pages that carry a mode bar. Typography edits every mode as columns and has no bar
 *  (#416), so its "editing all modes" case is deliberately not covered here — it is not in the
 *  audit's output, and a badge nobody measured is the thing this map exists to avoid. */
type ModeScope = 'per-mode' | 'shared';
const SECTION_MODE_SCOPE: Record<string, ModeScope> = {
  // (Surfaces & fills left the mode bar's pages in UI redesign S4a: it draws the two panes, where the rows say
  // which mode they edit, and its Backgrounds, Foreground fills and Text sections went with the legacy page.)
  // (Interactive left the mode bar's pages in UI redesign S5.2: it draws the two panes, where the rows say
  // which mode they edit.)
  // (Size & radius' Corner radius, Density & size, Spacing grid and Primitive scales left with the Shape page in UI
  // redesign S7; its Buttons section has no entry, #1912.)
  // (Elevation and Motion left the mode bar's pages in UI redesign S9.2: Depth & motion draws the two panes, where
  // each control says which mode it edits.)
  // Preview — read-only end to end
  'Background': 'shared', 'Foreground': 'shared', 'Text color': 'shared', 'Border': 'shared',
  'Icon': 'shared', 'Disabled': 'shared', 'Interactive': 'shared',
};

// `VIEW_ONLY` and `viewOnly()` (#574: a control that changes the VIEW, not a token, which `attachModeBadges`
// skips when deciding editability) live in `preview/sections/kit.ts` (UI redesign S9.1), with the Motion specimen
// that marks its playback select.
/** A SPECIMEN: an element whose ink is the BRAND's, previewed — as against the studio's own chrome (#779).
 *  The smoke suite holds chrome text to WCAG (4.5:1, 3:1 large) and a specimen to the contract of what it
 *  previews, and it cannot tell the two apart from class names: prefixes are per-surface, so `sg-lab` is a
 *  specimen and `sg-rn` beside it is chrome. The render site knows, so the render site says — the same
 *  reasoning, and the same shape, as `viewOnly` above. Every site that paints ink from a brand token calls
 *  this; `test-smoke.mjs` fails on inline ink it finds unmarked, so a new specimen cannot land as chrome. */
// `SPECIMEN` and `specimen()` live in `preview/sections/kit.ts` (UI redesign S4a), so the shared Style guide
// sections mark their specimens with the same attribute this file does. `specimenPair` (#1652) and
// `legibleInkOn` (#555) moved there in UI redesign S5.1 with the Interactive section, their only reader.
/** Value editors only — what the three-state badge (and `mode-audit.mjs`, until S8.3) meant by "a control".
 *  `button` is excluded because the buttons in these sections play a motion preview or expand a
 *  disclosure; `[data-view-only]` because a playback speed is not a token. */
const TOKEN_CONTROL_SEL =
  `input:not([disabled]):not([${VIEW_ONLY}]), select:not([disabled]):not([${VIEW_ONLY}]), textarea:not([disabled]):not([${VIEW_ONLY}])`;

/** The badge: label + scope, one grammar across both states, and deliberately ACHROMATIC.
 *  Hue is reserved for the contrast verdicts (--ok / --danger, #446) — neither mode state is good or
 *  bad, so tinting one would borrow a meaning that does not apply. Fill says "the bar reaches this";
 *  dashed outline says it does not. */
const modeScopeBadge = (scope: ModeScope, hasControls: boolean): HTMLElement => {
  // THREE states, not two (#437). "Shared · All modes" was covering two situations that are not the
  // same offer to a reader: five sections whose controls edit ONE value every mode then uses
  // (Outline button hover, Disabled, Icon colors, Easing, Motion) and six with no control at all
  // (Focus ring, since moved to Surfaces & fills; Spacing grid, Primitive scales, Elevation ramp, Duration ramp, Springs). Measured,
  // not assumed — the six have zero inputs between them. Saying "Shared" over a control you can turn
  // understates it; saying it over a specimen you cannot touch overstates it.
  //
  // Editability is detected from the rendered section rather than declared in SECTION_MODE_SCOPE, so
  // it cannot drift: a section that gains or loses a control re-badges itself. Only the per-mode axis
  // stays hand-declared, because no amount of DOM inspection can tell you WHICH mode a select writes
  // to. Buttons do not count — the ones present here play a motion preview, they do not set a value.
  const perMode = scope === 'per-mode' && !DERIVED_MODES.has(currentMode);
  // #545 — a per-mode section rendered while the bar holds a DERIVED mode is inert BY DESIGN: the
  // engine only ever accepts per-mode edits for a mode it does not itself generate, so a control
  // rendering here is not evidence it works here. This has to be tested BEFORE `hasControls`, not
  // folded into the `editable` OR below it: the kept guard two branches down already covered the
  // no-controls half of this case correctly ("HC light is derived — it cannot be edited"), but
  // `editable = perMode || hasControls` let `hasControls` win outright whenever a per-mode section's
  // controls DID render in a derived mode, badging "Editing · All modes" — a worse lie than the
  // "Editing HC light" the old comment already warned about, because it additionally claims every
  // mode is being edited when none is, for this section. Still unreachable by measurement today (the
  // page scaffolds hide per-mode sections' controls entirely on a derived mode, per `renderScreen` /
  // `controlSplitPage`), which is exactly why the bug was invisible rather than absent — kept as a
  // guard the same way the branch two lines down is, not decoration.
  const derivedPerMode = scope === 'per-mode' && DERIVED_MODES.has(currentMode);
  const editable = perMode || (hasControls && !derivedPerMode);
  const b = hook(el('span', 'msb' + (editable ? ' on' : '')), 'mode-scope-badge');
  const mode = MODE_LABEL[currentMode] ?? currentMode;
  if (perMode) b.append(el('span', 'msb-k', 'Editing'), el('span', 'msb-v', mode));
  else if (hasControls && !derivedPerMode) b.append(el('span', 'msb-k', 'Editing'), el('span', 'msb-v', 'All modes'));
  else b.append(el('span', 'msb-k', 'Non-editable'));
  b.title = perMode
    ? `Controls in this section write to ${mode} only.`
    : hasControls && !derivedPerMode
      ? 'Controls here set one value that every mode then uses. What you see still re-resolves per mode.'
      // UNREACHABLE TODAY, kept as a guard, and the distinction matters — #512 rightly killed a
      // decoration whose comment claimed a mechanism that never fired. Measured across all six bar
      // pages in HC light: Surfaces, Interactive and Size render ZERO sections, and the only two that
      // survive (Elevation ramp, Motion) are both `shared`. So no per-mode section is ever badged in
      // a derived mode. This branch stays because it is not decoration but a correctness guard: if a
      // page ever does render one there, the alternative — before #545 — was a badge reading
      // "Editing · All modes" over controls the engine refuses (doc 26 states this trap for columns).
      // `derivedPerMode` above now catches that case ahead of `hasControls` too, so both the
      // no-controls and controls-present halves land here. Re-measure before deleting it; do not
      // assume it still cannot fire.
      : scope === 'per-mode'
        ? `${mode} is derived — it cannot be edited. Switch to a customizable mode to edit this section.`
        : 'Derived from the values above. Nothing in this section is directly editable.';
  return b;
};

// `palSection` lives in `preview/sections/kit.ts` (UI redesign S4a), shared with the Style guide's sections.

// A labeled control column (Source / Hue / Chroma / Anchor). `right` aligns it to the row's end.
const pfield = (label: string, control: HTMLElement, right = false): HTMLElement => {
  const f = el('div', 'pfield' + (right ? ' r' : ''));
  f.append(el('span', 'pfk', label), control);
  return f;
};

// ===========================================================================
// Generic lever controls + the bespoke editors the focused pages compose from
// ===========================================================================

// `renderControl`, the generic lever knob, went in UI redesign S8.2 with its last caller (the Button options, now the
// levers kit's chips and slider on Components, `domains/components.ts`); the descriptor it read stays in
// `levers/controls.ts` (`describeControl`, #1675) for the levers kit.

// The per-mode `modeLevers` read/write helpers — `getModeLever`, `setModeLever`, `pruneModeLevers` —
// live in `state/store.ts`, with the prune-to-byte-identical invariant they exist to keep.

// `renderPerModeSelect` and `PER_MODE_SELECTS`, the per-mode "Auto — follows global" selects for radius softness,
// density and tempo, are gone: S7 moved radius and density to Shape and S9.2 tempo to Depth & motion, where each
// control edits the previewed mode (Q22).

/** The all-modes contrast table (Pair · a mode column each · dot + ratio). Shared by the Preview master
 *  table and the per-page section tables (docs/23 §3) — one authoritative renderer, re-sliced by the
 *  caller's contract list. `paths` shows the raw `fg on bg` token paths (the section tables, which sit
 *  next to their controls where the component context is already obvious) with the human label as a
 *  subtitle; the master table keeps the descriptive `component · variant — label`. */
const pairCellEl = (ct: typeof rp.contracts[number], paths: boolean): HTMLElement => {
  const td = el('td', 'pair');
  if (paths) {
    td.append(el('span', 'pair-path mono', `${ct.fg} on ${ct.bg}`));
    if (ct.label) td.append(el('span', 'pair-sub', ct.label));
  } else {
    td.textContent = `${ct.component} · ${ct.variant} — ${ct.label ?? `${ct.min}:1`}`;
  }
  return td;
};
const contractTableEl = (contracts: typeof rp.contracts, paths = false): HTMLElement => {
  const table = el('table', 'ctable');
  const thead = el('tr');
  thead.append(el('th', undefined, paths ? 'Foreground on background' : 'Pair'));
  for (const m of rp.modes) thead.append(el('th', 'mcol', MODE_LABEL[m] ?? m));
  table.append(thead);
  for (const ct of contracts) {
    const tr = el('tr');
    tr.append(pairCellEl(ct, paths));
    for (const m of rp.modes) {
      const cell = el('td', 'mcol');
      const r = ct.byMode[m];
      if (r) { cell.append(el('span', `dot ${r.pass ? 'ok' : 'no'}`), el('span', 'ratio', r.ratio.toFixed(2))); }
      else cell.textContent = '—';
      tr.append(cell);
    }
    table.append(tr);
  }
  return table;
};

// ---- Preview segments (docs/23 §7) ----------------------------------------
// The Preview destination has three views behind a segmented switcher: the style guide (roles composed
// in-context), the all-modes contract master table, and a category-grouped token list. All read the
// mode picked in the global header for their per-mode columns/rendering.

/** Contrast contracts — the full all-modes master table (verification of record). */
const renderPreviewContracts = (host: HTMLElement): void => {
  // Wrapped in a `.psec` like its two sibling views. It was the only one of the three rendering a bare
  // note + bare table straight onto the page background — the doc-26 shell is what makes the three
  // views read as one destination rather than three different pages behind a segmented control.
  //
  // The heading carries the FAILURE COUNT, because that is the question this view exists to answer and
  // it was previously only derivable by scanning ~32 rows × every mode for a red dot. Zero is stated
  // rather than left implicit: "all pairs clear" is the result a designer most wants confirmed.
  // Counted as PAIRS that fail in at least one mode, not as mode-instances — a pair failing in both
  // light and dark is one problem to fix, and summing instances would report it as two. The mode
  // count rides along so the number stays honest about breadth.
  const failing = rp.contracts.filter((ct) => rp.modes.some((m) => ct.byMode[m] && !ct.byMode[m]!.pass));
  const instances = rp.contracts.reduce((n, ct) => n + rp.modes.filter((m) => ct.byMode[m] && !ct.byMode[m]!.pass).length, 0);
  const sec = palSection('Contrast contracts',
    `Every declared a11y pair (${rp.contracts.length}), computed on the resolved colors across all modes. The per-control badges on each editing page verify the active mode at the point of edit; the per-page tables scope this to what that page governs.`);
  const tally = el('p', failing.length ? 'pv-tally no' : 'pv-tally ok',
    failing.length
      ? `${failing.length} of ${rp.contracts.length} pairs fall below their floor — ${instances} mode${instances === 1 ? '' : 's'} affected.`
      : 'Every pair clears its floor in every mode.');
  sec.append(tally);
  sec.append(contractTableEl(rp.contracts));
  host.append(sec);
};

// Token list — the resolved token set, grouped by category, value(s) per mode where they vary.
const tokenTableEl = (rows: Array<{ name: string; cells: Array<HTMLElement | string> }>, cols: string[]): HTMLElement => {
  // `toktable` left-aligns the value columns (a swatch+hex / px value reads best flush-left) — the
  // shared `.ctable .mcol` centring is right for the contrast table's dot+ratio, wrong here.
  // the token list IS a contract table; toktable adds only column sizing
  const table = el('table', mix('ctable', 'toktable'));
  const thead = el('tr'); thead.append(el('th', undefined, 'Token'));
  for (const c of cols) thead.append(el('th', 'mcol', c));
  table.append(thead);
  for (const r of rows) {
    const tr = el('tr'); tr.append(el('td', 'pair mono', r.name));
    for (const c of r.cells) { const td = el('td', 'mcol'); if (typeof c === 'string') td.textContent = c; else td.append(c); tr.append(td); }
    table.append(tr);
  }
  return table;
};
const swatchCell = (hex: string | undefined): HTMLElement => {
  const wrap = el('span', 'tok-val');
  if (hex) { const sw = el('span', 'tok-sw'); sw.style.background = hex; wrap.append(sw, el('span', 'mono', hex)); }
  else wrap.append(document.createTextNode('—'));
  return wrap;
};
// The token list walks the SAME DTCG tree `exportTokens` downloads (`buildTree(theme).tree`), so what you
// see IS what you'd export — and a full tree walk shows EVERY token, not the preview-bound subset (#263).
// Each top-level category under the brand root becomes a `.psec`; leaves render by `$type`.
type TokLeaf = { path: string; node: TreeNode };
/** Collect every leaf under `node` (a leaf has `$type`; groups are plain objects; `$`-keys are metadata),
 *  as dotted paths RELATIVE to the category root. Mirrors the generator's own walker (tree.ts). */
const collectLeaves = (node: TreeNode, prefix: string, out: TokLeaf[]): void => {
  if (!node || typeof node !== 'object') return;
  if (node.$type !== undefined) { out.push({ path: prefix, node }); return; }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) collectLeaves(v, prefix ? `${prefix}.${k}` : k, out);
};
/** A color leaf's hex for a mode: the base `$value` (base mode) or the `modes.<m>.$value` override,
 *  dereferenced to its palette primitive (whose `$extensions.prism3.hex` is colour-format-independent). */
const hexOfNode = (tree: TreeNode, node: TreeNode): string | undefined => {
  // A leaf's hex: its own `$extensions.prism3.hex` if present (primitives carry it, format-independent);
  // else if its `$value` is an `{alias}`, follow it to the primitive that does. `#…` / `rgb(…)` fall back.
  const own = node?.$extensions?.prism3?.hex;
  if (own) return own;
  const v = node?.$value;
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) return hexOfNode(tree, deref(tree, subNode(tree, v)));
  if (typeof v === 'string' && (v.startsWith('#') || v.startsWith('rgb'))) return v;
  return undefined;
};
const colorHexAt = (tree: TreeNode, node: TreeNode, mode: Mode, baseMode: Mode): string | undefined => {
  const ov = node.$extensions?.prism3?.modes?.[mode];
  // A primitive (raw hex, no per-mode overrides) reads the same across every column; a role uses its base
  // `$value` for the base mode and the `modes.<m>.$value` alias otherwise.
  if (mode === baseMode || !node.$extensions?.prism3?.modes) return hexOfNode(tree, node);
  return ov?.$value ? hexOfNode(tree, deref(tree, subNode(tree, ov.$value))) : hexOfNode(tree, node);
};
/** A typography composite → family · weight · size · line-height · tracking (primary face only). */
/** `value` defaults to the node's own `$value`, but a caller that has resolved a PER-MODE snapshot
 *  passes it instead — a composite's mode override is a full `$value` (`{ ...value, ...parts }`), so it
 *  carries all five aliases and reads exactly the same way. Without this seam the read-out was pinned
 *  to light for every mode. */
/** `onTarget` re-reads each aliased ROLE at a mode. The `value` seam above covers a composite that
 *  carries its own per-mode override; this covers the case where the composite is identical in every
 *  mode and the variance is one hop down, which is where ALL per-mode typography actually lands
 *  (`modeLevers.<mode>.{families,weights,lineHeights,letterSpacings}` mark `font.weight-role.strong`,
 *  never `type.display.sm.strong`). Without it the mode columns render, and render the SAME numbers —
 *  worse than one column, because two identical columns assert the modes agree when they do not. */
const typeComposite = (tree: TreeNode, node: TreeNode, value?: unknown, onTarget?: (n: TreeNode) => TreeNode): string => {
  const v = (value ?? node.$value ?? {}) as any;
  const t = (alias: unknown): TreeNode => { const n = subNode(tree, alias); return n && onTarget ? onTarget(n) : n; };
  const parts: string[] = [];
  if (v.fontFamily) parts.push(familyOf(tree, t(v.fontFamily)).split(',')[0].trim());
  if (v.fontWeight) parts.push(String(numOf(tree, t(v.fontWeight))));
  if (v.fontSize) parts.push(`${Math.round(remPxOf(tree, t(v.fontSize)))}px`);
  if (v.lineHeight) parts.push(`${numOf(tree, t(v.lineHeight))} lh`);
  if (v.letterSpacing) { const ls = deref(tree, t(v.letterSpacing)); const em = ls?.$extensions?.prism3?.em; if (em != null) parts.push(`${em}em · ${emToPercentLabel(em)}`); }
  return parts.join(' · ');
};
/** A shadow layer array → a compact CSS box-shadow string (for a monospace cell). */
const shadowCss = (layers: unknown): string => Array.isArray(layers)
  ? layers.map((l: any) => `${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread ?? '0'} ${l.color}`).join(', ')
  : '';
// ── Preview → Token list, split on the primitive/semantic tier line (#267 pattern) ──────────────
// Typography carried this split first (#272, via `.pvseg`); this generalises it. Two defects forced
// it, and each is invisible until the tiers are apart: PRIMITIVES HAVE NO MODES, so the four mode
// columns rendered four identical cells for all 142 palette steps; and a semantic's resolved value is
// only half of it — which token it ALIASES is the editable relationship, and only 10 of 151 colour
// roles alias the same target in every mode (aurora; harbor: 9), so the alias has to live INSIDE each
// mode cell rather than in one shared column.
type TokTier = 'primitive' | 'semantic';
let tokTier: TokTier = 'primitive';
let tokShow: 'both' | 'alias' | 'value' = 'both';
let tokPath: 'full' | 'short' = 'full';
let tokCat = '';

const TOK_ALIAS = /^\{.+\}$/;
/** Tier by SHAPE, not a hardcoded category list — a token added later lands in the right tab on its
 *  own. One carve-out: a typography COMPOSITE holds an object of aliases rather than an alias string,
 *  so the shape rule alone would file it as primitive. Doc 26 puts the full type ramp under
 *  Typography's *Styles* tier, and a composed style is the least primitive thing in the system. */
const tokTierOf = (node: TreeNode): TokTier =>
  node.$type === 'typography' ? 'semantic'
    : (typeof node.$value === 'string' && TOK_ALIAS.test(node.$value)) ? 'semantic' : 'primitive';

/** A typography composite's parts, in composite order, labeled for the stacked alias cell. */
const COMPOSITE_PART: Record<string, string> = {
  fontFamily: 'Family', fontSize: 'Size', fontWeight: 'Weight', lineHeight: 'Leading', letterSpacing: 'Tracking',
};
/** `repaint` redraws the list after one of its own controls changes: the legacy Preview page's live slot,
 *  or Inspect's body (S1.3), which lends its own. */
const renderPreviewTokens = (host: HTMLElement, repaint: () => void = paintVolatile): void => {
  ensureThemeFresh();                   // #1196 — the live token list shows the same namespace the export would emit
  const tree = buildTree(theme).tree;
  const root = (tree.$extensions?.prism3?.root as string) ?? Object.keys(tree).find((k) => !k.startsWith('$'))!;
  const brand = tree[root] as TreeNode;
  const modes = rp.modes;
  const baseMode = modes[0];   // the base `$value` is the first/canonical mode; the rest are overrides
  const modeLabels = modes.map((m) => MODE_LABEL[m] ?? m);
  const rootRe = new RegExp('^' + root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.');

  /** The `$value` a node presents IN A MODE — the per-mode snapshot where there is one, else the base.
   *  Extracted because three readers had already open-coded these two lines and a fourth (`compositeParts`)
   *  and a fifth (the typography branch of `valueText`) had NOT, which is the whole defect: a per-mode
   *  composite re-point rendered four identical mode columns on the one page built to show divergence.
   *  One accessor means the next reader cannot forget. */
  const valueAt = (node: TreeNode, m: Mode): unknown => {
    const ov = node.$extensions?.prism3?.modes?.[m];
    if (m === baseMode || !ov) return node.$value;
    // Two override shapes exist in the emitted tree. 453 of them (every colour) are
    // `{ $value, aliasOf, … }`; shadow's 7 are the RAW layer array. Reading only `ov.$value` made
    // every dark shadow render as an em-dash in the one view whose job is the exhaustive dump — the
    // table said "no dark value" for a family that has one, on all 7 rows.
    //
    // Tolerant here rather than corrected at the source ON PURPOSE: the raw-array shape is load
    // bearing — `resolve-preview.ts` and `emit-figma-styles.ts` both read it with `Array.isArray`,
    // and it is a published artifact shape. Unifying the convention is the right fix and is a
    // decision about the emitted contract, not something to change as a side effect of a UI review.
    return (ov as { $value?: unknown }).$value ?? ov;
  };
  /** What a leaf points at in a mode — root-relative — or undefined when it carries a value itself. */
  const aliasAt = (node: TreeNode, m: Mode): string | undefined => {
    const v = valueAt(node, m);
    return typeof v === 'string' && TOK_ALIAS.test(v) ? v.replace(/[{}]/g, '').replace(rootRe, '') : undefined;
  };
  /** The node a leaf points at in ONE hop — undefined when it carries a value itself. Deliberately
   *  NOT `deref`, which follows the chain all the way to the terminal primitive: the chain marker
   *  exists to say "this points at another semantic", and a fully-resolved node can never be one. */
  const hopAt = (node: TreeNode, m: Mode): TreeNode | undefined => {
    const v = valueAt(node, m);
    return (typeof v === 'string' && TOK_ALIAS.test(v)) ? subNode(tree, v) : undefined;
  };
  /** …and the fully resolved node, which is what the value read-out wants. */
  const targetAt = (node: TreeNode, m: Mode): TreeNode => deref(tree, hopAt(node, m) ?? node);
  /** A typography COMPOSITE has no single alias: its `$value` is FIVE aliases at once (family, size,
   *  weight, leading, tracking). Returned in composite order so the cell can stack them; `[]` for
   *  everything else, which is what keeps the normal single-alias path untouched. */
  const compositeParts = (node: TreeNode, m: Mode): Array<{ label: string; path: string }> => {
    const v = valueAt(node, m);
    return node.$type !== 'typography' || !v || typeof v !== 'object' ? []
      : Object.entries(v as Record<string, unknown>)
        .filter(([, x]) => typeof x === 'string' && TOK_ALIAS.test(x as string))
        .map(([k, x]) => ({ label: COMPOSITE_PART[k] ?? k, path: String(x).replace(/[{}]/g, '').replace(rootRe, '') }));
  };

  /** The resolved value as text, by `$type` — the payload for a primitive, the second line for a semantic. */
  const valueText = (node: TreeNode, m: Mode): string => {
    // A role carrying a per-mode override is read AT `m`: shallow-merge the override over the node so
    // the downstream deref/numOf see this mode's `$value`. Base mode and un-overridden roles fall
    // through untouched, which is why every current brand renders byte-identically.
    if (node.$type === 'typography') return typeComposite(tree, node, valueAt(node, m), (n) => {
      const ov = n.$extensions?.prism3?.modes?.[m];
      return m === baseMode || !ov || typeof ov !== 'object' ? n : { ...n, ...(ov as object) };
    });
    if (node.$type === 'shadow') return shadowCss(valueAt(node, m)) || '—';
    const n = targetAt(node, m);
    const px = n?.$extensions?.prism3?.px;
    if (px != null) return `${px}px`;
    const val = n?.$value;
    return typeof val === 'number' ? String(val) : String(val ?? '—');
  };

  /** One cell. `both` is the two-line form (alias over value); the Show control collapses it. */
  const tokCell = (node: TreeNode, m: Mode, canShort: boolean): HTMLElement => {
    const alias = aliasAt(node, m);
    const parts = compositeParts(node, m);
    const hasAlias = alias !== undefined || parts.length > 0;
    const wantAlias = tokShow !== 'value' && hasAlias;
    const wantValue = tokShow !== 'alias' || !hasAlias;             // never render an empty cell
    const wrap = el('div', wantAlias && wantValue ? 'tok-two' : undefined);
    if (wantAlias && parts.length) {
      // STACKED, one labeled row per part. Chosen over an inline join because the five paths run
      // ~123 characters — about 775px at this size, i.e. the whole 850px content column, so every
      // one of the 37 composites would scroll sideways (aurora; harbor: 38). Stacking costs height
      // in one section only; `type.*` is the only shape in the system with more than one alias.
      const g = el('div', 'tok-stack');
      for (const part of parts) {
        g.append(el('span', 'pfk', part.label));   // the shared micro-label (doc 26), not a new variant
        g.append(el('span', 'mono tok-alias', tokPath === 'short' && canShort ? part.path.split('.').slice(1).join('.') : part.path));
      }
      wrap.append(g);
    } else if (wantAlias && alias) {
      const a = el('span', 'mono tok-alias', tokPath === 'short' && canShort ? alias.split('.').slice(1).join('.') : alias);
      // A semantic that aliases another SEMANTIC (32 of them: grid → space → dimension; harbor: 30).
      // The one-hop target is the editable relationship, so that is what shows; the chain is on the
      // marker.
      const hop = hopAt(node, m);
      if (hop && tokTierOf(hop) === 'semantic') {
        const c = el('span', 'tok-chain', ' ›');
        c.title = `Aliases another semantic — resolves through to ${valueText(node, m)}`;
        a.append(c);
      }
      wrap.append(a);
    }
    if (wantValue) {
      const v = el('span', 'tok-val');
      const hx = node.$type === 'color' ? colorHexAt(tree, node, m, baseMode) : undefined;
      if (hx) v.append((() => { const s = el('span', 'tok-sw'); s.style.background = hx; return s; })());
      const txt = node.$type === 'color' ? (hx ?? '—') : valueText(node, m);
      const t = el('span', 'mono tok-hexv', txt);
      if (node.$type === 'shadow' || node.$type === 'typography') t.title = txt;
      v.append(t);
      wrap.append(v);
    }
    return wrap;
  };

  /** Does what this leaf NAMES resolve differently per mode, even though the leaf carries one value?
   *
   *  A `type.*` composite always aliases the same five roles — `font.family.display`,
   *  `font.weight-role.strong` and friends — so it never carries `modes` itself. Per-mode typography
   *  is real (`modeLevers.<mode>.{families,weights,lineHeights,letterSpacings}`) but it lands on the
   *  ROLE, not on the composite: measured, `weights:{strong:600}` puts `modes` on
   *  `font.weight-role.strong` and on nothing else. That is the architecture working — "a mode
   *  re-points a semantic at a different primitive, it never redefines one" — but reading only the
   *  leaf made the Type section claim "mode-invariant, one value" and render ONE column whose
   *  resolved specimen line (`Clash Display · 700 · 56px · 1.5 lh`) was silently true for the base
   *  mode alone.
   *
   *  ONE hop, deliberately, matching `hopAt`: the question is whether what this token names differs
   *  per mode, and a re-point lands exactly one hop away. Following the chain to the terminal
   *  primitive would answer a different question and light up nearly everything. */
  const refsVaryByMode = (node: TreeNode): boolean =>
    modes.some((m) => {
      if (hopAt(node, m)?.$extensions?.prism3?.modes) return true;
      const v = valueAt(node, m);
      return node.$type === 'typography' && !!v && typeof v === 'object'
        && Object.values(v as Record<string, unknown>).some((x) =>
          typeof x === 'string' && TOK_ALIAS.test(x) && subNode(tree, x)?.$extensions?.prism3?.modes);
    });

  // Categories for the ACTIVE tier, in the generator's own order.
  // `modeSource` separates the two ways a section earns per-mode columns, because they are not the
  // same claim and the blurb says so: 'own' — the leaves themselves carry per-mode values or aliases;
  // 'ref' — one alias set whose TARGETS differ per mode.
  type TokSec = { cat: string; leaves: TokLeaf[]; hasModes: boolean; modeSource: 'own' | 'ref' | null; ns: string[] };
  const sections: TokSec[] = [];
  for (const category of Object.keys(brand).filter((k) => !k.startsWith('$'))) {
    const all: TokLeaf[] = [];
    collectLeaves(brand[category], '', all);
    const leaves = all.filter((l) => tokTierOf(l.node) === tokTier);
    if (!leaves.length) continue;
    // Composite parts count toward the table's alias namespaces — without them `type.*` reports none
    // and never earns the shared-prefix callout that makes its stacked paths readable.
    const ns = [...new Set(leaves.flatMap((l) => [...modes.map((m) => aliasAt(l.node, m)), ...modes.flatMap((m) => compositeParts(l.node, m)).map((cp) => cp.path)]
      .filter(Boolean).map((a) => a!.split('.')[0])))].sort();
    const modeSource: 'own' | 'ref' | null = leaves.some((l) => l.node.$extensions?.prism3?.modes) ? 'own'
      : leaves.some((l) => refsVaryByMode(l.node)) ? 'ref' : null;
    sections.push({ cat: category, leaves, hasModes: modeSource !== null, modeSource, ns });
  }

  // ---- controls: a header ABOVE the content (doc 26), every field labeled via `pfield`. ----
  // #466 — tok-seg is the L3 (nested) modifier of the shared view segment
  const seg = el('div', mix('pvseg', 'tok-seg'));
  for (const [k, label] of [['primitive', 'Primitives'], ['semantic', 'Semantics']] as Array<[TokTier, string]>) {
    const b = el('button', 'pvseg-b' + (tokTier === k ? ' on' : ''), label) as HTMLButtonElement;
    b.onclick = () => { if (tokTier !== k) { tokTier = k; tokCat = ''; repaint(); } };
    seg.append(b);
  }
  host.append(seg);

  const bar = el('div', 'tok-ctrls');
  if (tokTier === 'semantic') {
    const showSel = selectEl();
    for (const [v, label] of [['both', 'Alias and value'], ['alias', 'Alias only'], ['value', 'Value only']])
      showSel.append(new Option(label, v));
    showSel.value = tokShow;
    showSel.onchange = () => { tokShow = showSel.value as typeof tokShow; repaint(); };
    bar.append(pfield('Show', showSel));

    const pseg = el('div', 'seg');
    for (const [k, label] of [['full', 'Full'], ['short', 'Short']] as Array<['full' | 'short', string]>) {
      const b = el('button', 'seg-b' + (tokPath === k ? ' on' : ''), label) as HTMLButtonElement;
      b.onclick = () => { if (tokPath !== k) { tokPath = k; repaint(); } };
      pseg.append(b);
    }
    bar.append(pfield('Alias path', pseg));
  }
  const catSel = selectEl();
  catSel.append(new Option('All categories', ''));
  for (const s of sections) catSel.append(new Option(`${s.cat} (${s.leaves.length})`, s.cat));
  catSel.value = sections.some((s) => s.cat === tokCat) ? tokCat : (tokCat = '');
  catSel.onchange = () => { tokCat = catSel.value; repaint(); };
  bar.append(pfield('Category', catSel));
  host.append(bar);

  // ---- sections ----
  const shown = sections.filter((s) => !tokCat || s.cat === tokCat);
  if (!shown.length) { host.append(el('p', 'tok-empty', 'No categories match this filter.')); return; }
  for (const s of shown) {
    const canShort = s.ns.length === 1;
    const cols = s.hasModes ? modeLabels : ['Value'];
    // The primitive blurb used to assert "one value, no modes" unconditionally — true of 9 of the 10
    // primitive categories and FALSE of shadow, whose 7 leaves each carry a reduced dark variant and
    // which renders per-mode columns directly beneath that sentence. It now reads `hasModes`, like
    // the semantic blurb below it already did.
    const sec = palSection(s.cat.charAt(0).toUpperCase() + s.cat.slice(1),
      tokTier === 'primitive'
        ? (s.hasModes
          ? `${s.leaves.length} primitives, each with a per-mode variant — the exception to the rule below: a value that is genuinely different per mode, not a re-pointed alias.`
          : `${s.leaves.length} primitives — one value, no modes. The ramps are shared; a mode re-points a semantic at a different primitive, it never redefines one.`)
        // Three cases, not two. 'ref' is the one the old copy got wrong: a `type.*` composite does NOT
        // re-alias per mode — it names the same five roles in every mode — so "each mode aliases its
        // own target" would be a fresh inaccuracy in place of the old one. What varies is underneath it.
        : `${s.leaves.length} semantics — ${s.modeSource === 'own' ? 'each mode aliases its own target'
          : s.modeSource === 'ref' ? 'one alias set; what those aliases resolve to varies per mode'
          : 'mode-invariant, one value'}.`);
    const rows = s.leaves.map((l) => ({ name: l.path, cells: (s.hasModes ? modes : [baseMode]).map((m) => tokCell(l.node, m, canShort)) }));
    const scroll = el('div', 'pv-tscroll'); scroll.append(tokenTableEl(rows, cols)); sec.append(scroll);
    // Short paths are only honest when ONE namespace covers the table. `size.*` aliases both
    // `dimension.*` and `space.*`, so a single shared-prefix note there would be a lie.
    if (tokTier === 'semantic' && tokPath === 'short' && s.ns.length) {
      const note = el('p', 'tok-callout');
      note.textContent = canShort
        ? `All aliases in this table resolve under ${s.ns[0]}.* — prefix hidden.`
        : `Full paths kept: this table aliases into ${s.ns.join(' and ')}, so one shared prefix would be wrong here.`;
      sec.append(note);
    }
    host.append(sec);
  }
};

/** Style guide (Preview → Style guide) — the resolved system composed in situ: every color role in
 *  context, on light and inverse surfaces, driven by the global mode picker. The semantic token path is
 *  the label (a `.tpill`); the resolved primitive + hex + contrast reveal on hover. Reuses the doc-26
 *  shell (`palSection`/`subHead`/`tokenPill`); only the specimen layout is new (`sg-*`). */
const renderPreviewStyleGuide = (host: HTMLElement, repaint: () => void): void => {
  // The five color sections (Background, Foreground, Text color, Border, Icon), their cards, the ground and
  // the surface list are SHARED with Color › Surfaces & fills (UI redesign S4a, owner decision Q5): they live
  // in `preview/sections/`, and this page draws them from there. What stays here is the Style guide's own:
  // the ground picker. The Disabled and Interactive sections are shared too since S5.1.
  const rolesByMode = new Map<string, Record<string, SgRole | undefined>>(
    resolveAllModes(theme).map((x) => [x.mode, x.roles as Record<string, SgRole | undefined>]));
  const cur: string = currentMode;
  const opp = oppositeOf(cur, rp.modes, (m) => rolesByMode.has(m));
  const c = sgContext({
    rolesByMode, cur, opp, namespace: theme.namespace, modeLabel: (m) => MODE_LABEL[m] ?? m, badges: false,
    paletteHex: (p, s) => theme.palettes.find((x) => x.palette === p)?.steps.find((x) => x.key === s)?.hex ?? null,
  });
  const { paint } = c;
  // With `badges: false` a chip is the pill alone, exactly the node this page drew before the lift.
  const sgPill = (k: string, label?: string, m: string = cur): HTMLElement => c.chip(k, label, m)[0];

  // Which surface the specimens are previewed ON (`SG_SURFACES`, shared): "show me this system on our page /
  // on our second tier / on our dark hero band", not a brightness switch. A manual light/dark toggle was
  // considered and rejected: the mode already determines brightness. Each ground carries its OWN ink and
  // border set, which is the whole correctness of the feature (`text.primary` is gated against the page
  // planes and is the wrong ink on the inverse band). The options are named for the ROLE each one is (#485,
  // #504); an `sgSurface` holding a retired key falls through to the first, defensively.
  const surf = SG_SURFACES.find((x) => x.key === sgSurface) ?? SG_SURFACES[0];
  const ground = (sec: HTMLElement): HTMLElement => sharedGround(c, sec, surf);

  const bar = el('div', 'sg-surfbar');
  const sel = hook(selectEl('cap'), 'style-guide-ground');
  for (const o of SG_SURFACES) sel.append(optionEl(o.key, o.label, o.key === surf.key));
  // The repaint is the caller's (Brand's preview, UI redesign S3), so the select redraws the Style guide in
  // place, never through a legacy tier.
  sel.onchange = () => { sgSurface = sel.value; repaint(); };
  const stack = el('div', 'sg-surfstack');
  const row = el('div', 'sg-surfrow');
  // The swatch sits BESIDE the select, not inside it. A native `option` cannot carry a swatch — it
  // takes no child elements and no generated content, and per-option `background-color` renders in
  // the popup on some engines and never on the closed control, so an in-select swatch would show
  // the chosen ground on some machines and nothing on others. The alternative is a custom listbox,
  // which means owning keyboard interaction, ARIA and focus management for a three-item picker.
  // Beside it costs nothing and always paints. The ring matters: a white ground on a white select
  // would otherwise be an invisible swatch.
  const sw = el('span', 'sg-surfsw');
  sw.style.background = paint(cur, surf.key);
  row.append(sw, sel);
  // The resolved path uses the same token pill as every other path on the page, underneath rather
  // than trailing the control — it describes the selection, so it reads as a caption to it.
  stack.append(row, sgPill(surf.key));
  // Sentence case, like every other `pfield` label in the app. `.pfk` uppercases it, so the casing is
  // invisible in the rendered view — but the string is what the next reader copies, and doc 29 §2b
  // states the rule (#504 review).
  bar.append(pfield('View style guide on', stack));
  host.append(bar);

  // The type sample first, before Background (#1942, owner decision Q67), shared with the Type preview: a few of
  // the brand's text styles in its faces, in the previewed mode, inked for the chosen ground.
  host.append(ground(typeSampleSection(c, theme.typography, cur, { ink: surf.ink })));
  // The radius sample (UI redesign S7, owner decision D18 B), shared from `preview/sections/`: the brand's radius on a
  // panel, a field, a button and a tag, in the previewed mode, on the chosen ground. S9 adds the shadow to its panel.
  host.append(ground(radiusSampleSection(c, { dims: theme.dims, modes: theme.modes, mode: cur, shape: brandControlShape(), copy: RADIUS_SAMPLE, inverse: surf.key.startsWith('inverse.'),
    shadow: rp.shadows[SAMPLE_SHADOW]?.[cur] })));   // D18 B's shadow half (S9.2): the panel's elevation, for the mode in view
  // The five shared color sections, in the Style guide's order, each on the chosen ground.
  for (const [, section] of COLOR_SECTIONS) host.append(ground(section(c)));

  // The Disabled and Interactive sections, shared since UI redesign S5.1 (`preview/sections/`), each on the
  // chosen ground. Interactive reads the brand's outline method and whether that ground is the inverse band.
  host.append(ground(disabledSection(c)));
  host.append(ground(interactiveSection(c, { method: theme.outlineInteraction, surface: surf.key })));
};

const PAGE_COPY: Record<LegacyPageKey, [string, string]> = {
  // (Size & radius's and Components' ledes went with the pages, UI redesign S8.2.)
  styleGuide: ['Style guide.', 'Token tables drawn from this file’s variables: each palette as a scale on Primitive tokens, each role family on Semantic tokens. One column per mode, each swatch bound to its variable and drawn on the ground its contrast is measured against. Run it after Apply Theme.'],
};


// === Mode context control (#171) ==========================================================
// A workspace-level single-select switcher that puts the WHOLE stage into ONE mode at a time —
// editing one mode at a time (docs/11 Pillar 2 authoring context). Three tiers by how a mode's
// values are produced: light/dark are GENERATED and editable, writing through `modeLevers` /
// `modeAnchors` / `brandState.overrides`; hc-light/hc-dark/wireframe are DERIVED-only (auto from the
// contrast contracts, read-only verification views); primitives are mode-independent so this
// control never renders on that stage. Replaces the mode chips that used to overflow the brand
// dropdown. Managing WHICH modes exist is Brand › Modes (UI redesign S3; the brand menu's copy went with #1943).
const DERIVED_MODES = new Set<string>(['hc-light', 'hc-dark', 'wireframe']);
/** #423 — a DERIVED mode is generated from light/dark (accessibility floors for HC, mechanical
 *  grayscale for wireframe) and the engine REFUSES per-mode levers on it: `CUSTOMIZABLE_MODES` is
 *  `['light', 'dark', ...customNames]`, and anything else throws "is generate-only and not
 *  customizable". The one-mode-at-a-time pages already gate on this via `renderGeneratedNote`, but a
 *  table that shows every mode AS COLUMNS has no such gate — each column must check for itself, or the
 *  click reaches the engine and the user reads a raw internal error string. */
const modeIsEditable = (m: string): boolean => !DERIVED_MODES.has(m);
const modeAllPass = (m: Mode): boolean => rp.contracts.every((ct) => !ct.byMode[m] || ct.byMode[m]!.pass);

const renderModeContext = (): HTMLElement => {
  const strip = el('div', 'modectx');
  const left = el('div', 'mctx-modes');
  // Stays "Mode" (#439). Swapping it to "Editing" was considered and rejected: it would have to
  // become "Viewing" on a derived mode, and a label that mutates under you is worse than a neutral
  // one. The editable-vs-read-only fact lives on the chip it applies to instead.
  left.append(el('span', 'mctx-cap', 'Mode'));
  for (const m of rp.modes) {
    const derived = DERIVED_MODES.has(m);
    const b = hook(el('button', 'mctx-b' + (m === currentMode ? ' on' : '') + (derived ? ' derived' : '')) as HTMLButtonElement, 'mode-tab');
    b.append(hook(el('span', 'mctx-name', MODE_LABEL[m] ?? m), 'mode-tab-name'));
    if (derived) b.append(el('span', 'mctx-vo', 'view only'));
    // No per-mode contrast mark here any more (#54 retired, owner decision): a pass/fail glyph on a
    // mode SELECTOR is theme health riding on a control that selects scope, and contrast is reported
    // where it is actionable — the contract tables, the derived-mode panel, and at export. Four green
    // ticks that are always green teach nothing; the same information is still one page away, and
    // `modeAllPass` still drives the read-only panel's verdict chip.
    // Wireframe is a mechanical grayscale, not contrast-derived (see renderGeneratedNote's own copy for
    // that mode) — the tooltip must not overclaim for it the way the HC modes' derivation legitimately can.
    if (derived) b.title = m === 'wireframe'
      ? 'Auto-derived — a mechanical grayscale, not contrast-derived. A read-only verification view.'
      : 'Auto-derived from your contrast contracts — a read-only verification view.';
    // `renderWorkspace` repaints the strip itself now (#771), so the mode-change branch does not also
    // ask for it. The re-click branch still does: it repaints ONLY the strip, on purpose.
    b.onclick = () => { if (currentMode !== m) { setCurrentMode(m); renderWorkspace(); } else { renderModeStrip(); } };
    left.append(b);
  }
  strip.append(left);

  // No "Edit modes" control here any more (#432): managing WHICH modes exist is brand configuration,
  // not a per-page action, so it lives on Brand › Modes (#1943). This strip is now purely a selector — which
  // is also what lets it scroll rather than wrap, since it no longer has to reserve room for a button.
  return strip;
};

/** A2a — the read-only view shown when a GENERATED mode (HC / wireframe) is selected. These modes are
 *  auto-derived and never hand-tuned, so the editing controls are replaced by an explanation + a
 *  per-mode contract verdict; the verification preview below still renders the mode on real components. */
const renderGeneratedNote = (): HTMLElement => {
  const wf = currentMode === 'wireframe';
  const label = MODE_LABEL[currentMode] ?? currentMode;
  const box = hook(el('div', 'genview'), 'derived-note');
  box.append(el('h3', 'genview-t', `${label} is auto-derived — read-only`));
  box.append(el('p', 'genview-d', wf
    ? 'Wireframe is a mechanical grayscale: every non-neutral role collapses to its neutral equivalent and corners go sharp. It’s generated from your theme, not hand-tuned — edit Light or Dark and it follows.'
    : 'High contrast pushes every role to meet the AAA contrast floors. It’s derived from your contrast contracts, not hand-tuned — edit Light or Dark and it follows. Verifying it here is the point: confirm it holds before you ship.'));
  const ok = modeAllPass(currentMode);
  const chip = el('div', 'genview-chip ' + (ok ? 'ok' : 'no'));
  chip.append(el('span', 'gv-mark', ok ? '✓' : '✗'),
    el('span', undefined, ok ? 'Every contrast contract passes in this mode' : 'Some contracts fail in this mode — see Preview → Contrast contracts'));
  box.append(chip);
  // Points at Brand › Modes, not the mode strip: managing WHICH modes exist is there (#432 put it in the brand
  // menu; #1943 left Brand › Modes the one place). No blanket "preview below" promise here any more either — several pages
  // that reach this note (Size & radius, Layout) render no specimen at all, and Surfaces/Typography pass
  // an empty specimen list, so the claim was false on 4 of the 7 pages that can show this note.
  box.append(el('p', 'genview-hint', 'Toggle which modes generate from Brand › Modes.'));
  return box;
};

/** Bespoke editors for the object/list levers renderControl can't edit (it only shows them read-only).
 *  Rendered alongside the manifest-advanced slider/enum controls in the (always-visible) extras panel. */

// ---- focused pages (docs/23 §7) -------------------------------------------
// (The `renderScreen` scaffold, hero → sections → volatile specimens, went with its last two pages, Elevation and
// Motion, in UI redesign S9.2.)

// The Button options and their specimen moved to the Components tab in UI redesign S8.2 (`domains/components.ts`,
// `preview/components.ts`), and with them went the last caller of `controlSplitPage` (and `SplitBlock`), the controls-
// beside-previews scaffold Layout and Size & radius composed from: Layout left in S10, Size & radius here.

/** Which background role the Style guide's specimens are previewed on. Module state so it survives a repaint,
 *  like `currentMode`. The legacy Preview page that held it, with its three views, is gone (UI redesign S3):
 *  the Style guide is Brand's preview, lent to `preview/brand.ts`, and the contract table and the token
 *  list are Inspect's (S1.3). */
let sgSurface = 'background.primary';

// The component catalog's host accessor (`componentCatalog`) moved to `state/component-catalog.ts` in UI redesign S8.2,
// beside the catalog it reads; the Components page lists it (`preview/components.ts`).

/** The file-setup action's label (#1558), the Figma menu's item: since UI redesign S8.2 the menu is its only control
 *  (owner decision G8 A), and its result shows in the Activity drawer. Shipped UI text: US-English +
 *  `docs/voice-standard.md`. */
const FILE_SETUP_LABEL = 'Set up file';

// The Components page (#718), its component-row and file-setup-row plumbing (`syncComponentRow`, `syncFileSetupRow`
// and their two subscriptions) went in UI redesign S8.2: the build is the Components tab's (`preview/components.ts`,
// through `lend.sets`, which `runBuild` below backs), Set up file is the Figma menu's alone (G8 A), and both results
// show in the Activity drawer, which already had their rows (S11).

/** The style-guide button's label (#259). Proposed, owner to confirm — the one string a reviewer changes. */
const STYLE_GUIDE_LABEL = 'Draw style guide';

/**
 * The Style guide page (#259, phase 1: color) — the step after Apply theme. One button draws the color tables
 * from the file's own variables; the per-type options fold away under Customize, every one with a default, so
 * the button alone does the common case. The specimen is chosen from each token's role unless Display style
 * overrides it (owner decision 8).
 *
 * Figma-only (`railNav()` omits it on web), and `commit.isFigma` is re-checked, since a direct caller would otherwise
 * draw a control whose `postStyleGuide` is inert. Nothing here repaints with a lever, so its volatile set is empty.
 */
const renderStyleGuidePage = (host: PageHost): void => {
  const [title, lede] = PAGE_COPY.styleGuide;
  host.append(hero(title, lede));
  setVolatile([], () => {});
  if (!commit.isFigma) return;

  const sec = palSection('Color tables', 'Draws or updates one table per palette and one per role family.');
  const note = el('p', 'cw-note');
  note.append(document.createTextNode('Needs the pages and cell components Set up file adds. A rerun updates each table in place.'));
  sec.append(note);

  // CUSTOMIZE — folded by default: every option has a default, so the button alone draws the common case.
  const det = hook(el('details', 'contracts') as HTMLDetailsElement, 'style-guide-customize');
  const sum = el('summary', 'contracts-sum');
  sum.append(el('span', 'contracts-t', 'Customize'), el('span', 'contracts-hint', 'value format · header · display style · columns'));
  det.append(sum);
  const pick = <K extends 'valueFormat' | 'header' | 'display'>(key: K, opts: [string, string][], fallback: string): HTMLSelectElement => {
    const s = selectEl();
    for (const [v, t] of opts) s.append(optionEl(v, t, (styleGuideOptions[key] ?? fallback) === v));
    s.onchange = () => { (styleGuideOptions as Record<string, unknown>)[key] = s.value; };
    return s;
  };
  det.append(
    hook(knob('Color value', pick('valueFormat', [['hex', 'Hex'], ['rgba', 'RGB-A'], ['hsl', 'HSL'], ['hsb', 'HSB']], 'hex'), 'How each value cell prints the color. A translucent hex adds its alpha as a percentage.'), 'style-guide-value-format'),
    knob('Table header', pick('header', [['dark', 'Dark'], ['light', 'Light']], 'dark'), 'The header row’s fill.'),
    hook(knob('Display style', pick('display', [['auto', 'From each token’s role'], ['default', 'Generic'], ['text', 'Text color'], ['border', 'Border color'], ['icon', 'Icon color'], ['transparency', 'Transparency']], 'auto'),
      'The specimen each row draws. By default a text role draws “Aa”, a border role an outline, an icon role a diamond, and a translucent value a checkerboard.'), 'style-guide-display'),
    knob('Aliases', toggleField(styleGuideOptions.aliases ?? true, (on) => { styleGuideOptions.aliases = on; }), 'Show the primitive each value aliases, as a chip beside it.'),
    knob('Description', toggleField(styleGuideOptions.description ?? true, (on) => { styleGuideOptions.description = on; }), 'Add a column with each variable’s description.'),
  );
  sec.append(det);

  const row = hook(el('div', 'fs-row'), 'style-guide-row');
  styleGuideRow = row;
  const btn = hook(el('button', 'barbtn') as HTMLButtonElement, 'style-guide-draw');
  styleGuideBtn = btn;
  btn.title = 'Draws the color tables from this file’s variables. Safe to re-run — it updates tables in place.';
  btn.onclick = () => {
    setHost({ styleGuideState: 'pending', openDetail: null });
    hostChanged(); syncStyleGuideRow();
    commit.postStyleGuide({ ...styleGuideOptions });
  };
  row.append(btn);
  syncStyleGuideRow({ staged: true });
  sec.append(row);
  host.append(sec);
};

/** The style-guide row's status, refreshed in place (#259): the build's and file setup's old row mechanism (#870), in
 *  its own slot. `staged` is true on the render path, where the row is built detached and reconciled in (#771); the
 *  message path writes only into a row that is on screen. */
let styleGuideRow: HTMLElement | null = null;
let styleGuideBtn: HTMLButtonElement | null = null;
const syncStyleGuideRow = (opts: { staged?: true } = {}): void => {
  const row = styleGuideRow;
  if (!row || !styleGuideBtn) return;
  if (!opts.staged && !row.isConnected) return;
  const pending = host.styleGuideState === 'pending';
  styleGuideBtn.textContent = pending ? '… Drawing…' : `▦ ${STYLE_GUIDE_LABEL}`;
  styleGuideBtn.disabled = pending;
  row.querySelector(':scope > .bar-seed, :scope > .applystat')?.remove();
  if (host.styleGuideState) row.prepend(renderApplyStatus(host.styleGuideState, 'styleguide'));
};
subscribe('host:styleguide', () => syncStyleGuideRow());

// Font availability (`fontAvailable`, `faceStatus`) and the advisory weight map (`knownWeightsOf`,
// `WEIGHT_NAME`) live in `ui/fonts.ts` (UI redesign S6.1). The Type controls and the fixed ladders the legacy
// Typography page drew here moved to `domains/type.ts` and `preview/sections/` (UI redesign S6.3).

// `TYPE_GROUP_ORDER` lives in `state/type-input.ts`; the Type preview's sections in `preview/sections/` (UI redesign
// S6.1 to S6.3), drawn by `preview/type.ts`.

// The radius ramp and the Control shape specimen moved to the Shape preview in UI redesign S7 (`preview/sections/
// radius.ts`), reading the ladder itself (`theme.dims.radius`) rather than a hand list resolved through `rp.dims`.

// The button-layout specimen (#1667) is `preview/sections/button-layout.ts`'s, drawn by the Components preview since UI
// redesign S8.2, with the engine's corner for the brand's Control shape in the previewed mode (#2049).

// The shadow steps (`shadowRampSection`, with `SHADOW_STEPS`) live in `preview/sections/shadow-ramp.ts` (UI redesign
// S9.1), drawn by the Depth & motion preview (S9.2).

// The control heights, the spacing steps and the building blocks moved to the Shape preview in UI redesign S7
// (`preview/sections/control-heights.ts`, `spacing.ts`, `shape-building-blocks.ts`).


// The inverse-surface + icon specimens were retired here (#69): the inverse column is now a first-class
// row in every interactive matrix section (Fill · inverse / Text · inverse / On-fill · inverse), and the
// icon-contrast payoff is the "Icon colors" global section's match-vs-distinct example — no separate
// preview needed.


// The gradient editor went with the legacy Surfaces page (UI redesign S4a): Color › Surfaces & fills edits the
// gradients (`domains/color-fills.ts`), through the same writes (`state/fills-input.ts`).



// ---- shared bits -----------------------------------------------------------
const hero = (title: string, lede: string): HTMLElement => {
  const h = el('div', 'hero');
  if (title) h.append(hook(el('h1', undefined, title), 'page-title'));
  if (lede) h.append(el('p', 'lede', lede));
  return h;
};
// ---- shell -----------------------------------------------------------------
/** The root every view mounts into. Handed over by `entry.ts` (`mountApp`) before the first `build()`,
 *  rather than looked up while this module loads (#896). */
let app: HTMLElement;
export const mountApp = (root: HTMLElement): void => { app = root; };
let workspace: HTMLElement;
/** The new frame (S1.2), mounted by the first `build()` and kept; the start window opens in its layer (S12). */
let frame: Frame | null = null;
let modeStripHost: HTMLElement;   // top of the WORKSPACE — the mode bar sits with what it scopes (#432)
let chromeHost: HTMLElement;      // the sticky header, measured into --chrome-h

// ---- page chrome — the declared floor every view carries (#772) --------------------------------
/**
 * WHY THIS IS DATA RATHER THAN A HABIT.
 *
 * #388 was one page-level surface rendered by one page. `lastError` was painted inside
 * `renderPrimitives`' Color-page closure, so an engine throw from Typography set the flag and showed
 * NOTHING — the field went on displaying the value the engine had already refused. #389 closed that
 * instance by mounting a bar in the chrome and calling `syncErrorBar()` from `apply()`/`applyFull()`,
 * and left the shape that produced it standing: surfaces appended one at a time in `build()`, and
 * refreshed by hand-listed calls in two separate refresh paths. Each of those lists is a place the
 * NEXT surface gets forgotten, which is precisely how the first one was. #388's own words: "worth
 * deciding once rather than patching per page — this will recur for any future validation."
 *
 * So the surfaces are DECLARED here and applied by iteration. Four consumers read this one list:
 * `mountView` mounts the root ones, `renderWorkspace` mounts the workspace ones, `syncChrome`
 * refreshes all of them, and `chromedWorkspace` checks the roster `mountView` published before it
 * will vouch for a page host. Nothing is written twice, so nothing can be written once.
 *
 * A FLOOR, NOT UNIFORMITY. `home` and `views` exist because the surfaces genuinely disagree, and
 * flattening that would cost more than it saves: the brand bar has no business on a start screen that
 * draws its own mark and has no brand to switch, and the mode strip belongs in the workspace beside
 * the controls it scopes (#432) rather than back in the header it was deliberately moved out of. What
 * every view does share is the error surface — see its entry for why its scope is every view.
 *
 * SURVEYED AND DELIBERATELY LEFT OUT, so the question is not reopened from scratch:
 *
 *   • The MODE-SCOPE BADGES (`attachModeBadges` / `SECTION_MODE_SCOPE`) are ALREADY structural in the
 *     way this list is trying to be — a post-render pass over the workspace DOM, which its own header
 *     defends on exactly these grounds ("a pass over the rendered DOM cannot be forgotten by code that
 *     does not know it exists"). They carry no cross-render refresh, so there is no forgettable second
 *     obligation to declare, and their placement rules were gated by `mode-audit.mjs --check-badges` until S8.3 deleted it.
 *     Declaring them would move working code for symmetry, and into #771's lane.
 *
 *   • The SEED / RESTORE / APPLY pills (#480, #722) render INSIDE `renderBar()`, which IS the
 *     `brand-bar` surface — so they are already mounted once, structurally, by something on this list.
 *     They are bar CONTENT, and promoting content to a surface would put a plugin-only pill into the
 *     floor every web view has to carry.
 *
 *   • The START WINDOW's import validation stays a field message on its own control (`shell/start.ts`): a
 *     rejected input the app never adopted, unlike the engine error this list carries.
 */
/** The one root view since UI redesign S12: the start is a window over it, not a view of its own. */
type RootView = 'app';
type ChromeSurface = {
  /** Stable identity. Stamped as `data-chrome` on the mounted node and published in the roster, so
   *  "is this surface actually there" is answerable from the rendered page rather than from this file. */
  readonly key: string;
  /** `root` surfaces are mounted by `mountView` into the chrome header on the start view, and into the
   *  frame's notices row on the app view; `bar` surfaces into the frame's top bar (UI redesign S1.2);
   *  `workspace` surfaces are minted by `renderWorkspace` alongside the page they scope. */
  readonly home: 'bar' | 'root' | 'workspace';
  /** Which root views carry it. */
  readonly views: readonly RootView[];
  /** Mint the node. The mounter stamps and appends it, so a surface cannot land unstamped or in the
   *  wrong host by writing its own append. */
  readonly mount: () => HTMLElement;
  /** Derive its state from module state — called on mount and after EVERY rebuild.
   *
   *  Optional, and the omission is a statement rather than an oversight: a surface that re-renders on
   *  its own events and holds live UI state says so by leaving this out, instead of being refreshed
   *  out from under the person using it. */
  readonly sync?: () => void;
  /** Sync LAST in the pass, after every other surface has been refreshed.
   *
   *  DECLARED rather than positional, because the constraint is a property of the surface and appending
   *  a fifth entry below the one that needs it must not silently take the slot. One surface needs it
   *  today: `renderModeStrip` ends in a `--chrome-h` re-measure, and a layout read taken before the rest
   *  of the pass has settled publishes a height measured against the outgoing layout. That is the same
   *  class of defect #771 traced #485 to — a layout read against a workspace that had been emptied — so
   *  the ordering is stated here instead of being restored by a hand-listed call in `applyFull()`. */
  readonly syncLast?: true;
};

/** Every reference below is wrapped in an arrow rather than passed as a value. A function declared LATER
 *  in this file as a `const` and referenced bare would be evaluated while this array literal is built — at
 *  module init, in its temporal dead zone. Uniform wrapping means moving a declaration cannot arm that trap.
 *  (The apply detail, the surface that first needed it, left this list in UI redesign S11: the Activity
 *  drawer draws every write's result itself.) */
const CHROME_SURFACES: readonly ChromeSurface[] = [
  {
    key: 'brand-bar', home: 'bar', views: ['app'],
    // The legacy half of the new top bar (S1.2): the frame owns the bar itself and lends this slot.
    // Its hook is `bar-main`: the `bar` hook moved with the status pills to the Activity drawer's bar row
    // (S1.4), where `test:verdict` reads them.
    mount: () => { barHost = hook(el('div', 'p3-bar-main'), 'bar-main'); renderBar(); return barHost; },
    // NO `sync`, deliberately. `renderBar()` rebuilds `barHost` wholesale, and that node holds the open
    // brand menu, the Pages menu and the export dialog — refreshing it on every knob edit would close
    // whatever the designer had open, mid-gesture. It re-renders on its own events instead (menu
    // toggles, apply state, brand load), which is the reason `sync` is optional at all.
  },
  {
    key: 'error', home: 'root', views: ['app'],
    // THE SURFACE THIS MECHANISM IS NAMED AFTER (#388). It was scoped to the start view too, while the start was a
    // root view of its own; since S12 the start is a window over the app view, which carries it. (The start
    // window's import errors stay field messages on their own controls: a rejected input, not adopted state.)
    mount: () => { globalErrHost = hook(el('div', 'errbar errbar-global'), 'error-bar'); return globalErrHost; },
    sync: () => syncErrorBar(),
  },
  {
    key: 'mode-strip', home: 'workspace', views: ['app'],
    // Page furniture, not header chrome (#432) — it scopes the CONTROLS, so it lives with them, and
    // this declaration does not move it back. What brings it into the list is its REFRESH, which was
    // hand-listed in `apply()`/`applyFull()` right beside `syncErrorBar()`: `currentMode`'s "on" state
    // and the derived-mode "view only" tag both track every edit. Its PLACEMENT stays in
    // `renderWorkspace`, which is the only code that knows where the page's hero (and, on Preview, its
    // view switcher) ended up — a position no declaration here could state.
    mount: () => { modeStripHost = el('div', 'modebar'); return modeStripHost; },
    sync: () => renderModeStrip(),
    // See `syncLast`. Since #771 this surface is also a reconcilable REGION, so its refresh has to come
    // after the page it sits on has landed as well as after the rest of the pass.
    syncLast: true,
  },
];

/** Mount every declared surface of `home` that `view` carries. MOUNT ONLY — the sync pass is a
 *  separate `syncChrome()` call once the host is in the document, because `syncErrorBar` now judges
 *  itself by `isConnected` and syncing mid-mount would report a detached-but-correct surface as the
 *  very defect that check exists to find.
 *
 *  IDEMPOTENT, which #771 made load-bearing rather than defensive. `mountView` empties the app root
 *  before it calls this, so the `root` pass always mints. The `workspace` pass runs on every
 *  `renderWorkspace`, and the workspace is no longer emptied — its surfaces are live REGIONS the
 *  reconcile keeps. Re-minting one per render would hand the reconcile a node it could only ever treat
 *  as new, and would leave `syncChrome` refreshing a node the reconcile had already replaced: a stale
 *  strip the roster believes is current. Asked of the `data-chrome` stamp this function writes, so the
 *  declaration answers the question rather than a module variable that may point at a detached node. */
const mountSurfaces = (home: ChromeSurface['home'], view: RootView, host: HTMLElement): void => {
  for (const s of CHROME_SURFACES) {
    if (s.home !== home || !s.views.includes(view)) continue;
    if (host.querySelector(`:scope > [data-chrome="${s.key}"]`)) continue;
    const node = s.mount();
    node.setAttribute('data-chrome', s.key);
    host.append(node);
  }
};

/** THE ONLY refresh path. `apply()` calls this instead of naming surfaces one at a time, and
 *  `applyFull()` reaches it through `renderWorkspace` for the ordering reason stated there — which is
 *  what makes "a new surface cannot be forgotten" true of the refresh half as well as the mount half.
 *  Each `sync` guards its own host, so this is safe before the first build.
 *
 *  Two passes, not one, because `syncLast` is declared data (see the field). Iterating the array once
 *  would make the ordering a fact about where an entry happens to sit in the literal — exactly the kind
 *  of unwritten convention this whole declaration replaced. */
const syncChrome = (): void => {
  for (const s of CHROME_SURFACES) if (!s.syncLast) s.sync?.();
  for (const s of CHROME_SURFACES) if (s.syncLast) s.sync?.();
};

/** The keys `view` promises to carry, published on `<html data-chrome-roster>` — a separate attribute
 *  from the per-node `data-chrome` stamp, so `[data-chrome="<key>"]` cannot match the root element
 *  itself on a single-surface view and report a surface as mounted when it is not. Publishing it lets
 *  the check below — and the smoke suite — compare the PROMISE against the rendered DOM instead of
 *  restating the list in a second place that could disagree with this one. */
const chromeRoster = (view: RootView): string[] =>
  CHROME_SURFACES.filter((s) => s.views.includes(view)).map((s) => s.key);

/** THE ONLY WRITER OF THE APP ROOT, and that is the structural half of this ticket. A view mounted any
 *  other way is a view that skipped the floor — which is exactly what the start screen was doing, and
 *  what the next page-like view would have done by copying it. Routing both root views through here
 *  means "which surfaces does this view carry" is answered by the declaration rather than by whichever
 *  branch of `build()` happened to be written first. */
const mountView = (view: RootView, body: () => HTMLElement): void => {
  document.documentElement.dataset.chromeRoster = chromeRoster(view).join(' ');
  {
    // THE APP VIEW LIVES IN THE NEW FRAME (UI redesign S1.2, `shell/frame.ts`): the top bar, the tab row
    // and the legacy frame. The frame is mounted once and outlives every render, so a tab keeps focus
    // across the page change it causes; what is re-minted here, on every `build()`, is what the frame
    // lends: the bar's legacy controls, the notices row and the legacy page.
    if (!frame) {
      app.innerHTML = '';
      delete app.dataset.theme;
      // Inspect (S1.3) shows two legacy views until their slices replace them: the contrast contract table
      // and the token list. They are lent here; the shell never imports this file.
      // S1.4: the Activity drawer reads the host session's writes, and the Figma menu runs the writes the
      // old bar controls ran, both lent the same way.
      frame = mountFrame(app, {
        host: commit.isFigma ? 'figma' : 'web',
        inspect: { contrast: renderPreviewContracts, tokens: renderPreviewTokens },
        activity: { read: activityReading, closeDetail: closeOpenDetail },
        figma: commit.isFigma ? figmaActions : null,
        // S3: Brand's preview is the Style guide, lent the same way until a slice replaces it.
        // S6.2 lent Type's levers the legacy Text styles controls; S6.3 replaced them, so only the fonts are lent.
        // S8.2: the Components page's set builds, lent so that page never imports this file.
        lend: { styleGuide: renderPreviewStyleGuide, fonts: () => host, sets: { busy: componentBusy, lastOf: (id) => host.setBuilds.get(id), run: runBuild } },
        // The product mark's logo, `styles.css`'s fixed gradient, lent like the views above.
        logo: () => el('span', 'logo'),
      });
    }
    chromeHost = frame.head;
    frame.bar.replaceChildren();
    frame.notices.replaceChildren();
    mountSurfaces('bar', view, frame.bar);
    mountSurfaces('root', view, frame.notices);
    frame.legacyPage.replaceChildren(body());
  }
  // Sync AFTER the append, never before: a surface's first paint is its sync, and the initial state is
  // always DERIVED — page nav re-runs `build()`, so a hardcoded "hidden" at mount would drop a live
  // error the moment the user changed page, which is the hole #388 closed.
  syncChrome();
  syncChromeHeight();
};

declare const CHROMED: unique symbol;
/** A page host rendered into a VIEW that has the declared page chrome mounted around it.
 *
 *  The brand is a `unique symbol` no object literal can satisfy, and `chromedWorkspace` is its only
 *  producer — so `PAGE_RENDERERS` cannot be invoked with an element that has not been through the
 *  mounter, and a new page renderer cannot accept one either. Same enforcement as `loadBrand`'s
 *  required `origin` (#722): checked by construction at every call site, with no scan to keep in
 *  scope. A convention every page happens to follow is what already existed.
 *
 *  IT IS NOT A CLAIM ABOUT THE NODE, and #771 is what made that distinction matter rather than merely
 *  be true. Since the page is built DETACHED and reconciled into the workspace region by region, the
 *  host a renderer receives is a staging tree, not `.ws` itself. That required no accommodation: the
 *  proposition has always been "an engine error will be visible on the page this renderer is about to
 *  draw", which is a fact about the mounted view, and `chromedWorkspace` has always checked the document
 *  rather than its argument. A detached host is admitted BECAUSE it goes through the same producer and
 *  the same check — not by widening the brand, and never by an `as PageHost` at a call site, which would
 *  be the whole floor gone. */
type PageHost = HTMLElement & { readonly [CHROMED]: true };
type PageRenderer = (host: PageHost) => void;

/** Compile-time proof that the brand is load-bearing, at zero runtime cost. If `PageHost` ever loses
 *  it, a plain `HTMLElement` satisfies it, `Assert` is instantiated with `false`, and
 *  `npm run -w @prism3/studio typecheck` fails — so the floor cannot be quietly downgraded from
 *  structural back to advisory without the gate saying so. */
type Assert<T extends true> = T;
type PageHostIsUnforgeable = Assert<HTMLElement extends PageHost ? false : true>;

/** Mint the page host — the only producer of `PageHost`, and it verifies before it vouches: the type
 *  says a page cannot be rendered without the chrome, this says the chrome is really in the DOCUMENT
 *  rather than merely declared. Compared against the published roster, so it checks what was PROMISED
 *  for this view rather than a second hardcoded list. `ws` is deliberately not inspected — see the type
 *  above for why that is the point and not an omission, and note the consequence for the caller: the
 *  workspace-home surfaces must be mounted BEFORE a page is staged, or this reports them missing.
 *
 *  REPORTS, does not throw. A missing surface means an engine error could go unseen, which is bad; a
 *  throw here renders nothing at all, which is worse. The console is not a dead end — the smoke suite
 *  asserts zero console errors across all 72 page × mode × brand states — so this is fatal in CI and
 *  legible rather than blank in front of a user. */
const chromedWorkspace = (ws: HTMLElement): PageHost => {
  const missing = (document.documentElement.dataset.chromeRoster ?? '').split(' ')
    .filter((k) => k && !document.querySelector(`[data-chrome="${k}"]`));
  if (missing.length) {
    console.error(`page chrome missing: ${missing.join(', ')} — an engine error may not be visible on this page (#772)`);
  }
  return ws as PageHost;
};

/** #268 — the switcher appears only where a mode-varying control actually exists.
 *
 *  The governing rule is the one #268 proposed and #176's decision 2 implies: modes live in the
 *  SEMANTIC layer, so a purely primitive surface has nothing to switch. This is deliberately a
 *  predicate rather than a per-page flag — placement is DERIVED from what a page contains, so a new
 *  page inherits the right answer instead of needing a decision.
 *
 *  Pages fail it unconditionally:
 *   • (`layout` was one until UI redesign S10 moved Layout into the two panes: nothing layout-related exists in
 *     `ModeLevers` or carries a `*ByMode` field; its preview header carries the mode control for the ground.)
 *   • `palettes` — a ramp is mode-invariant, and choosing which STEP a mode lands on is a Surfaces
 *     concern, not a Palettes one (see the in-function measurement below).
 *   • (`typography` was a third until UI redesign S6.2 moved Type into the two panes.)
 *
 *  `preview` is a fourth, conditional case: it fails outside the style-guide view, where every mode is
 *  already rendered as its own column (see the per-view measurement in the function body).
 *
 *  IT IS A NEGATIVE LIST, whatever this comment claimed before #718 ("stated as a POSITIVE list of the
 *  pages that have the axis, not `!== 'layout'`"). The body has always been four `return false` cases
 *  over a `return true` default, so a page added later is GRANTED the switcher rather than asked for
 *  it. Corrected rather than restructured: the claim was the load-bearing part, and it was wrong about
 *  the code directly beneath it. #718's `components` page is the case it predicted — a page with no
 *  mode axis at all, which arrived and inherited a bar it has nothing to drive. */
const pageHasModeVaryingControl = (): boolean => {
  // (#718's Components page, which took no mode input, moved to the two panes in UI redesign S8.2.)
  // A moved page (Color › Palettes from UI redesign S2) draws no legacy workspace, so it has no strip:
  // its preview header carries the mode control.
  if (isNewPage(page)) return false;
  // (Typography's column-per-mode rule, #416, went with the page, UI redesign S6.2: Type draws the two panes.)
  // (The Preview page's per-view rule went with the page, UI redesign S3: the Style guide is Brand's
  // preview, whose header carries the mode control, and its other two views are Inspect's.)
  return true;
};

/** Repaint the mode-selector strip at the top of the workspace (#432) — page furniture, not header
 *  chrome. Reached as the `mode-strip` surface's `sync` (never called by name from a refresh path), plus
 *  directly from the menu-toggle branch of the mode buttons; it carries no per-mode contrast marks any
 *  more (#54 retired, owner decision), but currentMode's "on" state still needs a refresh. No-op before
 *  the first build (the start screen has no workspace yet).
 *
 *  It writes into `modeStripHost`, which since #771 is a PERSISTENT node the region reconcile keeps
 *  rather than one re-minted per render — so "the roster refreshed the strip" and "the strip on screen
 *  is current" cannot come apart. `mountSurfaces` is what holds that; see its idempotence note. */
function renderModeStrip(): void {
  if (!modeStripHost) return;
  modeStripHost.innerHTML = '';
  // Hidden, never disabled: a greyed-out switcher still claims the page has modes and just won't let
  // you use them. `currentMode` is untouched, so leaving and returning restores the mode you were in.
  if (!firstRun() && pageHasModeVaryingControl()) modeStripHost.append(renderModeContext());
  // A page with no bar must not leave an empty sticky box holding its own padding.
  modeStripHost.style.display = modeStripHost.childElementCount ? '' : 'none';
  syncChromeHeight();
}

/** `--chrome-h` positions the sticky rail AND the sticky mode bar, so it must track the real header.
 *  It used to be read off the mode strip's parent — fine while the strip lived in the chrome, wrong
 *  now that it doesn't. Measured from the chrome element itself, and re-read whenever the chrome can
 *  change height: the global error bar shows and hides inside it. */
function syncChromeHeight(): void {
  // In the app view the frame owns the sticky region, and at narrow widths only its top row is sticky,
  // so the frame measures it.
  if (frame) frame.syncSticky();
  else if (chromeHost) document.documentElement.style.setProperty('--chrome-h', `${chromeHost.offsetHeight}px`);
}
/** The sticky region's height, as last published. */
const chromeHeight = (): number => parseFloat(document.documentElement.style.getPropertyValue('--chrome-h')) || 0;

/** Every destination in the rail, keyed by `PageKey` — so a page added to `NAV` fails to compile
 *  until it is registered here, and registered as a `PageRenderer`, which can only be called with a
 *  host the chrome mounter produced. */
const PAGE_RENDERERS: Record<LegacyPageKey, PageRenderer> = {
  styleGuide: renderStyleGuidePage,
};
/** Attach the mode badge to every section on the page, in ONE post-render pass.
 *
 *  Deliberately not done inside the section builders: there are already THREE ways a `.psec` comes
 *  into existence — `palSection`, `renderPaletteSection` (its own `.psec-h`, which also carries a
 *  remove button), and `renderGlobalBehavior`, which assembles bare `.psec` nodes with no head at
 *  all. Wiring each one means a fourth builder silently ships without badges, which is the same
 *  shape as the negative mode-bar rule that let Palettes keep an inert switcher for a month (#430).
 *  A pass over the rendered DOM cannot be forgotten by code that does not know it exists.
 *
 *  Placement follows whatever head the section has, so the badge lands top-right in all three:
 *  both head variants are already `justify-content:space-between` flex rows; a headless section
 *  gets the badge positioned against its own box instead. */
const attachModeBadges = (root: HTMLElement): void => {
  // Badges belong to the pages that carry a mode bar — the scope SECTION_MODE_SCOPE already states,
  // now enforced instead of assumed. It was assumed, and the assumption broke: the map is keyed by
  // section TITLE, and the token list builds its sections with `palSection(capitalize(category))`,
  // so its `icon` category minted a section titled `Icon` that collided with the Style guide's
  // 'Icon' entry. One stray "Shared / All modes" badge on the token list, on the one category out of
  // ~14 whose name happened to match. The token list is a read-only listing with no bar, and it
  // already states its own mode scope per section ("mode-invariant, one value" / "each mode aliases
  // its own target") from the token data rather than from a name — strictly better information than
  // the badge. Gating on the bar's own predicate fixes the collision at the root rather than by
  // renaming one of the two sections, which would leave the next collision to be found by eye.
  if (!pageHasModeVaryingControl()) return;
  for (const sec of [...root.querySelectorAll('.psec')] as HTMLElement[]) {
    if (sec.querySelector('.msb')) continue;
    const title = sec.querySelector('.psec-t')?.textContent?.trim();
    const scope = title ? SECTION_MODE_SCOPE[title] : undefined;
    if (!scope) continue;
    // Value editors only — see TOKEN_CONTROL_SEL. `button` was excluded from the start for this exact
    // hazard, and the reasoning was right but ONE ELEMENT TYPE TOO NARROW (#574): Motion has both a
    // preview button (excluded) and a playback `select` (counted), so the specimen badged itself
    // "Editing · All modes". The old comment here claimed "every section with a real control has at
    // least one input/select, and every section without one has zero of anything" — true when written,
    // false the moment a view-state select appeared, and nothing re-checked it. Measured on all six bar
    // pages: of the 98 controls this selector counts, 95 provably mutate the persisted brand, one is
    // single-option, one re-renders before it can be read, and the only genuinely quiet one is the
    // playback select — which is now marked rather than assumed away.
    const hasControls = sec.querySelector(TOKEN_CONTROL_SEL) !== null;
    // ONE path, not two (#562). A section with no head gets one BUILT here — its title + description
    // moved into a `.psec-txt`, exactly the shape `palSection` produces — rather than the badge being
    // absolutely positioned against the section box. That old fallback (`top:0;right:0`) is what put
    // the badge flush against the border on four Interactive sections: outside the section's own 20/24
    // padding, and with none of the flex head's under-720px column reflow. Those four now call
    // `palSection` like the rest, so this branch is unreached today. It is kept, and made correct,
    // because the value of a post-render pass is that a NEW section builder cannot forget it — and
    // "cannot forget" buys nothing if what it falls back to is misplaced.
    let head = sec.querySelector('.psec-head') ?? sec.querySelector('.psec-h');
    if (!head) {
      const built = hook(el('div', 'psec-head'), 'section-head'), txt = el('div', 'psec-txt');
      for (const n of [...sec.children] as HTMLElement[])
        if (n.classList.contains('psec-t') || n.classList.contains('psec-d')) txt.append(n);
      built.append(txt); sec.prepend(built); head = built;
    }
    head.append(modeScopeBadge(scope, hasControls));
  }
};

// ---- render granularity: the workspace REGION (#771) -----------------------------------------
//
// THE UNIT. A workspace region is one direct child of `workspace` — the hero, the mode bar, each
// `.psec` section, the `.stage-vol` specimen box, the odd loose note. `renderWorkspace` builds the
// next page DETACHED and reconciles it against the live one region by region: a region whose content
// is unchanged is left alone, a region whose content changed is swapped in place, and the workspace
// itself is never emptied.
//
// WHAT THAT REPLACES, AND WHY IT IS NOT JUST A TIDY-UP. The old body was `workspace.innerHTML = ''`
// followed by a full rebuild, so #485's every-select-jumps-to-the-top was not a scroll bug — it was
// the browser correctly clamping `scrollY` against a document that momentarily had no content. #485
// fixed the SYMPTOM at the right level (save/restore around the teardown, so every caller got it at
// once) and said so; the teardown is what this removes. Because the container now always holds a full
// page's worth of height, there is no moment to clamp against and nothing to restore. That is the
// falsifiable part: delete the reconcile and the jump comes back; delete the save/restore and it does
// not. The save/restore is gone.
//
// AND THE OTHER DIRECTION, WHICH IS THE WORSE BUG. A granularity change that UNDER-repaints does not
// announce itself — the page just quietly stops agreeing with its own controls. Two things hold that
// line. (1) The keep test is a SIGNATURE of the rendered region, not a guess about what an edit can
// reach: serialized markup plus the live value of every control in it, so anything the renderer would
// have drawn differently forces the swap, including a section's mode badge (`attachModeBadges` runs on
// the staged tree, before the comparison). (2) A region holding a declared volatile host is never
// kept — see `setVolatile` for the orphaned-painter failure that rule exists to make impossible.
//
// THE ONE REGION THAT IS ALSO CHROME. The mode strip is a workspace-home surface on the #772 roster AND
// a direct child of `.ws`, so it is reached twice — once by `syncChrome`, once by this reconcile — and
// the two have to agree about which node they mean. They do, by construction rather than by care: the
// strip is minted ONCE per `.ws` (`mountSurfaces` is idempotent), so there is a single node, it is the
// same object in `want` and in `live`, and the reconcile keeps it on IDENTITY without ever comparing its
// content. A second node cannot appear to be double-rendered, and a kept node cannot be a stale twin the
// roster believes it refreshed. The ordering that closes it: `syncChrome()` runs AFTER the reconcile, so
// the strip's content is written last, into the node that is on screen.
/** Stable identity for a region, so an inserted or removed section shifts nothing else. Titled
 *  sections key on their title; the rest key on tag + class. Duplicates get an ordinal — the token
 *  list really does mint two sections named `Icon` (see `attachModeBadges`), and a key collision here
 *  would silently pair two different sections and swap one for the other. */
const regionKey = (n: HTMLElement, seen: Map<string, number>): string => {
  const base = n.classList.contains('psec')
    ? `psec:${n.querySelector('.psec-t')?.textContent?.trim() ?? ''}`
    : `${n.tagName}.${n.className}`;
  const nth = (seen.get(base) ?? 0) + 1;
  seen.set(base, nth);
  return nth === 1 ? base : `${base}#${nth}`;
};
/** Everything about a region that a reader could see. Markup carries structure, text, inline styles
 *  and reflected attributes; it does NOT carry `select.value` / `input.checked` / `input.value`, which
 *  the renderers set as PROPERTIES — a select whose resolved option moved would serialize identically
 *  and be kept showing the old choice. That is the under-repaint this second half exists to prevent. */
const regionSignature = (n: HTMLElement): string => {
  const live: string[] = [];
  for (const c of n.querySelectorAll('input,select,textarea')) {
    if (c instanceof HTMLSelectElement) live.push(`s${c.selectedIndex}${c.value}`);
    else if (c instanceof HTMLInputElement) live.push(`i${c.value}${c.checked ? 1 : 0}`);
    else live.push(`t${(c as HTMLTextAreaElement).value}`);
  }
  // `JSON.stringify` on the array rather than a joined string: the parts are self-delimiting, so no
  // control-character separator is needed and no control value can forge a boundary.
  return JSON.stringify(live) + n.outerHTML;
};
/** Carry a user's open/closed disclosure state from the live region onto its replacement, and do it
 *  BEFORE the signature is taken. `<details open>` is a reflected attribute, so without this a section
 *  the user had expanded ("Contrast on this page") would differ from every freshly built one — it would
 *  be swapped on every commit for a difference the user made, and it would snap shut each time. Skipped
 *  when the counts differ, which means the region's structure genuinely changed. */
const carryDisclosure = (from: HTMLElement, to: HTMLElement): void => {
  const a = from.querySelectorAll('details'), b = to.querySelectorAll('details');
  if (a.length !== b.length) return;
  for (let i = 0; i < a.length; i++) (b[i] as HTMLDetailsElement).open = (a[i] as HTMLDetailsElement).open;
};
/** Bring `host`'s children into `want`'s order and content, touching as little as possible.
 *
 *  The ONE invariant that matters: `host` is never empty at any point in this loop. A replacement is
 *  an atomic `replaceWith`, an insertion happens before the removal it pairs with, and leftovers go
 *  last — so the document keeps its height throughout and `scrollY` is never clamped. Emptying first
 *  and refilling would be simpler and would reintroduce #485 exactly. */
const reconcileRegions = (host: HTMLElement, want: readonly HTMLElement[]): { kept: number; swapped: number } => {
  const seen = new Map<string, number>();
  const live = new Map<string, HTMLElement>();
  for (const n of [...host.children] as HTMLElement[]) live.set(regionKey(n, seen), n);
  const keys = new Map<string, number>();
  let kept = 0, swapped = 0;
  let ref: Element | null = host.firstElementChild;
  for (const fresh of want) {
    const key = regionKey(fresh, keys);
    const prev = live.get(key);
    live.delete(key);
    let place = fresh;
    // Identity, not signature — reached only by a workspace-home CHROME surface (#772), which is a
    // region and a declared surface at once. It is the same node in `live` and in `want`, so it is kept
    // without being compared: its content belongs to its `sync`, which runs after this reconcile. That
    // is what keeps "the roster refreshed it" and "the strip on screen is current" from coming apart,
    // and it is also why there is exactly one strip — `mountSurfaces` does not re-mint one to compete.
    if (prev === fresh) { place = prev; kept++; }
    // The volatile test asks about the FRESH region, not the live one. The declared hosts belong to
    // the render that just ran, so they live in the staged tree; `prev.contains(h)` would be false for
    // every one of them and every region would look keepable. Getting this backwards is silent — the
    // page renders correctly once and then stops responding to `apply()`.
    else if (prev && !volatileHosts.some((h) => fresh === h || fresh.contains(h))) {
      const before = regionSignature(prev);
      carryDisclosure(prev, fresh);
      if (before === regionSignature(fresh)) { place = prev; kept++; } else swapped++;
    } else swapped++;
    if (place === ref) { ref = ref.nextElementSibling; continue; }   // already in position, unchanged
    if (prev && prev === ref) { ref = ref.nextElementSibling; prev.replaceWith(place); continue; }
    host.insertBefore(place, ref);
    if (prev && prev !== place) prev.remove();
  }
  for (const gone of live.values()) gone.remove();
  return { kept, swapped };
};

// HOST SUBSCRIPTIONS (P2) are taken ONCE, at module load, beside each painter — never per mount. The
// legacy surfaces are re-minted on every render (`CHROME_SURFACES` on every `mountView`, each page row on
// every `renderWorkspace`) and none has an unmount hook, so a subscription taken at mount would stack one
// painter per render. Permanent subscriptions whose painters ask whether their surface is live are what
// the switch did, with the same guards. The new shell (S1) subscribes on mount and unsubscribes on unmount.
//
// `fonts`: no legacy surface reads `host.hostFonts` since UI redesign S6.2. The Type page's library and
// type-ahead read it through `lend.fonts` and subscribe to `fonts` themselves, on mount.
/** The mode the legacy page was last drawn in (see the `mode` subscription). */
let paintedMode: Mode | null = null;
function renderWorkspace(): void {
  paintedMode = currentMode;
  // A MOVED PAGE (UI redesign S2 on) draws in the frame's two panes, from its own modules, and the legacy
  // frame is hidden. Nothing legacy is drawn for it, and the volatile painter is emptied, so a legacy write
  // that still calls `apply()` (the bar's) repaints no page that is gone.
  if (isNewPage(page)) { workspace.replaceChildren(); setVolatile([], () => {}); return; }
  // The workspace-home chrome surfaces (#772) — today that is the mode strip, page furniture rather
  // than global chrome (#432). Mounted from the DECLARATION rather than by name, so a second piece of
  // page furniture cannot arrive here wired to one of its two obligations.
  //
  // FIRST, and both halves of that are load-bearing under #771.
  //   • It is the ONE write to the live workspace that precedes the reconcile, and it is only ever an
  //     append into an EMPTY container: `mountSurfaces` is idempotent, and the only way the workspace
  //     loses its surfaces is `build()` minting a fresh `.ws`. So no live content is disturbed and there
  //     is no moment of clamped document height — #485's actual mechanism — on any other call.
  //   • It has to precede the STAGED page render, because `chromedWorkspace` verifies the published
  //     roster against the DOCUMENT. On the first render into a fresh workspace the strip is not in it
  //     yet, so staging first would report `mode-strip` missing on every page navigation and trip CI's
  //     zero-console-errors assertion.
  // Not re-minted per render, which the idempotence is there for: the strip is the one region whose
  // content `renderModeStrip` owns directly, so a fresh node each pass would hand the reconcile
  // something it could only treat as new (a swap on every commit) and leave `syncChrome` refreshing a
  // node the reconcile had already replaced. `currentMode` is module state, so the SELECTION survives.
  mountSurfaces('workspace', 'app', workspace);
  // THE PAGE IS BUILT DETACHED and reconciled in region by region (#771). Nothing below touches the live
  // workspace until `reconcileRegions`, which is what makes each swap atomic and the workspace never
  // empty.
  //
  // `chromedWorkspace` is still the ONLY producer of the host `PAGE_RENDERERS` will accept, and the
  // staged tree needs no weakening of the brand to go through it: what it vouches for is that the
  // declared floor is mounted in the DOCUMENT this tree is being staged for — a fact about the VIEW, not
  // about the node — and it never inspected its argument. So `PAGE_RENDERERS[page](staged)` on the raw
  // element is still `TS2345`, and the answer to "will an engine error be visible on the page this
  // renderer is about to draw" is still checked before a page renderer runs.
  const staged = el('div');
  PAGE_RENDERERS[page](chromedWorkspace(staged));
  attachModeBadges(staged);
  // The bar belongs UNDER the page's title + lede, not above it. It scopes the CONTROLS; the hero is
  // the page's identity, and a scope control sitting above the name of the thing it scopes reads as
  // chrome again — which is what moving it out of the header (#432) was meant to stop. Positioned
  // here rather than inside each page renderer for the same reason the badges are: there is more than
  // one renderer, and a new one would forget.
  // Below the hero — and below a VIEW switcher when one immediately follows it. On Preview the
  // Style guide / Contrast contracts / Token list segment changes what the page shows, and the bar
  // is hidden on two of those three (#452). With the bar above the segment, switching views made
  // the segment itself jump up and down the page; below it, the segment holds still and only the
  // thing that actually varies moves. A control that changes the page outranks a control that
  // scopes it.
  const regions = [...staged.children] as HTMLElement[];
  const heroAt = regions.findIndex((n) => n.classList.contains('hero'));
  let barAt = heroAt < 0 ? 0 : heroAt + 1;
  if (heroAt >= 0 && regions[barAt]?.classList.contains('pvseg')) barAt++;
  // A workspace-home surface is ALSO a region — a direct child of `.ws` — so every one of them has to be
  // in `want` or the reconcile would remove as a leftover the node `mountSurfaces` just appended. Read
  // back off the `data-chrome` stamps rather than named as `modeStripHost`, so that stays true of a
  // second surface. Their POSITION is still stated here and only here, which is #772's own reason for
  // leaving placement out of the declaration: this is the only code that knows where the hero ended up.
  regions.splice(barAt, 0, ...workspace.querySelectorAll<HTMLElement>(':scope > [data-chrome]'));
  // A chip group's arrow keys commit on every press, and a commit that changes anything else in the
  // region (an example, a warning line) swaps the region, taking the focused radio with it. Focus would
  // fall to <body> and the second arrow press would do nothing. So the focused radio is found again by
  // its group name and value in the swapped-in region, and focused there.
  const focusedRadio = document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'radio'
    && workspace.contains(document.activeElement) ? document.activeElement : null;
  const radioName = focusedRadio?.name, radioValue = focusedRadio?.value;
  // The search marks are cleared off the live regions first, so a region a search hid is compared on its
  // content alone and kept when nothing else changed; `applySearch` marks the result again below.
  clearSearchMarks();
  reconcileRegions(workspace, regions);
  if (focusedRadio && !focusedRadio.isConnected && radioName) {
    const again = [...workspace.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
      .find((r) => r.name === radioName && r.value === radioValue);
    again?.focus({ preventScroll: true });
  }
  // Every declared surface refreshed ONCE, after the regions have landed — the placement half of the
  // mode strip's `syncLast` (see `applyFull`). The workspace is in the document by now, so every
  // surface's paint is honest: `syncErrorBar` judges itself by `isConnected` (#772), and syncing before
  // the reconcile would report a correct-but-not-yet-placed surface as the very defect it exists to find.
  syncChrome();
  applySearch();
  syncStuck();
}

// ---- settings search over a legacy page (UI redesign S1.2, the owner's QA note Q3) -------------------
// The search field lives in the new frame's levers header and writes `searchQuery` (`setSearch`); this
// legacy surface subscribes to it, the P2 way, and filters the legacy page in view to it: a pass over the
// rendered DOM that marks what does not match, never a re-render, so the field keeps its caret. A setting
// is a `.knob`, matched on its label, its description and its lever key; a workspace region with no
// matching setting is hidden with it, except the page's hero and the chrome surfaces. The count goes back
// through `setSearchHits` for the field's status line. Bespoke editors (palette rows, the surfaces
// grid, the gradient editor) are not knobs and are hidden while a search runs; real search over every
// lever, with the page it lives on, arrives with the levers panel from S2.
const SEARCH_HIDDEN = 'data-search-hidden';
const clearSearchMarks = (): void => {
  for (const n of workspace?.querySelectorAll(`[${SEARCH_HIDDEN}]`) ?? []) n.removeAttribute(SEARCH_HIDDEN);
};
function applySearch(): void {
  // A moved page filters its own levers panel and reports its own count (S2).
  if (!workspace?.isConnected || isNewPage(page)) return;
  clearSearchMarks();
  const q = searchQuery.trim().toLowerCase();
  if (!q) { if (searchHits !== null) setSearchHits(null); return; }
  const said = (k: Element): string => [
    k.querySelector(':scope > .knob-label, .chips-legend')?.textContent ?? '',
    k.querySelector('[data-p3="control-description"]')?.textContent ?? '',
    ...[...k.querySelectorAll('[data-p3^="lever-"]')].map((n) => (n.getAttribute('data-p3') ?? '').slice('lever-'.length).replace(/-/g, ' ')),
  ].join(' ').toLowerCase();
  let hits = 0;
  for (const k of workspace.querySelectorAll('.knob')) {
    if (said(k).includes(q)) hits++;
    else k.setAttribute(SEARCH_HIDDEN, '');
  }
  for (const r of workspace.children) {
    if (r.classList.contains('hero') || r.hasAttribute('data-chrome')) continue;
    if (!r.querySelector(`.knob:not([${SEARCH_HIDDEN}])`)) r.setAttribute(SEARCH_HIDDEN, '');
  }
  setSearchHits(hits);
}
subscribe('search', () => applySearch());

/** The bar is sticky, so page content slides under it. Without a shadow that reads as a hard cut at
 *  the bar's own background colour rather than as a layer. `.stuck` is applied only once the bar has
 *  actually reached its sticky position, so a page scrolled to the top shows no shadow at all — a
 *  permanent one would claim there is content above when there is not.
 *
 *  Measured against the LIVE chrome height rather than a baked offset: the global error bar lives in
 *  the chrome and changes its height when it appears, which would leave a fixed threshold wrong for
 *  exactly the situation where the user is reading an error. */
function syncStuck(): void {
  if (!modeStripHost) return;
  const chromeH = chromeHeight();
  modeStripHost.classList.toggle('stuck', modeStripHost.getBoundingClientRect().top <= chromeH + 0.5);
}
let stuckBound = false;
const bindStuck = (): void => {
  if (stuckBound) return;
  stuckBound = true;
  let queued = false;
  const onScroll = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; syncStuck(); });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
};

// ---- brand setup — selector menu: name + namespace, switch / new / import --------
let barHost: HTMLElement;
let brandMenuOpen = false;
let exportMenuOpen = false;
let navMenuOpen = false;
// #723: which artifact the export dialog is on, and the shape settings for it. The settings persist
// across opens within a session — a designer who wants underscores wants them for the next export too
// — but deliberately NOT into `persist-local`: they describe an output, not the brand, and #721's
// dirty check compares the brand against its baseline. Putting an export preference in that object
// would make choosing "compact" read as an unsaved brand edit.
let exportArtifact: ArtifactId = 'dtcg';
let exportSettings: SettingsState = defaultSettings();
// The only source that exists (#584 unbuilt). Not derived from PRISM3_HOST — see `export-settings.ts`.
const exportSource: ExportSource = 'generated';
let importOpen = false;
let importErr: string | null = null;
let importText = '';            // M-17: survives re-renders so a failed paste isn't wiped
/** A load waiting on confirm-overwrite (#160 for import; #1033 extends it to the other two writers).
 *
 *  IT CARRIES ITS ORIGIN, and that is the whole reason this is not still `importPending: BrandInput`.
 *  `loadBrand` requires an origin (#722, and requiring it is the enforcement), so a pending load that
 *  stored only the input had to have its origin re-authored at the confirm button — which is fine while
 *  exactly one writer stages, and is a silent trap the moment a second one does: the second writer's
 *  confirm would load its brand under the first writer's origin, and every later dirty check and reset
 *  would measure against the wrong baseline. Storing the pair means the origin travels with the input
 *  it belongs to and the confirm button re-authors nothing. */
let pendingLoad: { input: BrandInput; origin: Origin } | null = null;
let outsideBound = false;
/** True while `loadBrand` is inside `loadInput` — see there. */
let loading = false;

// A PAGE CHANGE REPAINTS THROUGH THE STORE (UI redesign S1.2). The new tab row, the Depth & motion switch
// and the Pages menu all call `setPage` and nothing else; this legacy surface subscribes once, at module
// load, and re-renders the legacy frame (the P2 pattern: one permanent subscription whose painter asks
// whether its surface is live). The tab row subscribes separately, for its own selection.
subscribe('page', () => { if (frame && !loading && !firstRun()) build(); });

// AN EDIT ON A MOVED PAGE REPAINTS THE LEGACY CHROME THROUGH THE STORE (UI redesign S2). A moved page's
// controls call `rebuild()` and nothing else; the `brand` topic repaints its levers, its preview and the
// shell, and this repaints the legacy chrome around them (the engine-error bar, the bar's brand switcher
// and dirty state), which `apply()` used to do by name. Only while a moved page is in view: on a legacy page
// the writer still calls `apply()`, which syncs the chrome itself, so this would run it twice.
subscribe('brand', () => { if (frame && !loading && !firstRun() && isNewPage(page)) syncChrome(); });

// A NAME TYPED ON THE BRAND PAGE REACHES THE BAR THROUGH THE STORE (UI redesign S3). Brand › Identity writes
// the name per keystroke without a rebuild (#1196), and `syncIdentity` tells the `identity` topic; the brand
// switcher's name is patched in place, as the brand menu's Name field used to patch it by name.
subscribe('identity', () => { const n = barHost?.querySelector('.p3-brand-name'); if (n) n.textContent = brandState.id; });

// A MODE CHANGE FROM THE NEW SHELL REPAINTS THE LEGACY PAGE THROUGH THE STORE (UI redesign S1.3). The
// preview's mode control calls `setCurrentMode` and nothing else; the legacy writer (the mode strip) calls it
// and then repaints itself. So this waits a microtask and repaints only when the legacy page was last drawn in another mode: a legacy writer has already repainted by
// then, and the shell's control has not. One permanent subscription, the P2 pattern.
subscribe('mode', () => queueMicrotask(() => {
  if (frame && !loading && !firstRun() && paintedMode !== currentMode) renderWorkspace();
}));

/** Replace the working brand wholesale (switch / new / import / host restore) and re-render.
 *
 *  `origin` IS REQUIRED, AND THAT IS THE ENFORCEMENT (#722, implementing #721). A fifth writer
 *  cannot assign the working brand without saying where it came from — it fails `typecheck` at the
 *  call site rather than passing and leaving `provenance` describing the previous load. That matters
 *  because the failure mode is silent: a stale origin makes a genuinely-edited state read as
 *  untouched, and the confirmation this model exists to make meaningful stops firing.
 *
 *  A lint script could have checked the same thing by pattern; the required parameter checks it by
 *  construction, over every call site, with no scan to keep in scope. */
const loadBrand = (input: BrandInput, origin: Origin): void => {
  // The store replaces the input, sets the provenance from that same value, and resets the view to
  // the first page and mode (`loadInput`); what is left here is this file's own menus and the render.
  // `loadInput` sets the page before it resolves the new brand, so the `page` subscriber must not
  // render mid-load: the `build()` below is the one render, against the resolved brand.
  loading = true;
  // #1994: a brand loading is what ends a `rejected` or `unreadable` restore failure (see `restoreFailure`).
  if (restoreFailure && restoreFailure.kind !== 'unresolved') restoreFailure = null;
  try { loadInput(input, origin); } finally { loading = false; }
  brandMenuOpen = false; importOpen = false; importErr = null; importText = ''; pendingLoad = null;
  startReopened = false;   // a load is a choice: the start window closes with it (S12)
  build();
};

/** Trigger a client-side file download (Blob → object URL → anchor click). */
const download = (filename: string, text: string, mime: string): void => {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

// L-11: a design.md pasted with a bare numeric `id:` (e.g. `id: 2026`) parses `id` as a
// number; `.trim()` on a number throws and crashes BOTH exports. Coerce to string first.
const slug = (): string => String(lastGoodInput.id || 'brand').trim().replace(/\s+/g, '-') || 'brand';

// Both exports run off the LAST-GOOD state, never the live one (M-15). Previously tokens.json
// re-ran `brandTheme(brandState)` uncaught — a failing edit threw in the click handler (no
// download, no feedback) — and design.md serialized the failing state into a brief its own
// importer rejects. The last-good input/theme is always valid and is exactly what the ramps +
// preview already show (the errbar tells the user the current edit is what's unresolved).
/** The brand Export design.md writes: the last-good one, except after a failed restore (#1994), when it is
 *  the file's brand that failed (the brand worth rescuing), and null where nothing readable arrived. */
const briefInput = (): BrandInput | null => (restoreFailure ? restoreFailure.brand : lastGoodInput);
const briefSlug = (): string => { const b = briefInput(); return String(b?.id || 'brand').trim().replace(/\s+/g, '-') || 'brand'; };
/** Export the brief as design.md — round-trips straight back into Import. */
const exportDesignMd = (): void => { const b = briefInput(); if (b) download(`${briefSlug()}.design.md`, toDesignMd(b), 'text/markdown'); };

/** Export the resolved DTCG token tree (buildTree) of the last-good theme, namespaced under `root`,
 *  shaped by the dialog's settings (#723).
 *
 *  The SAME `projectDtcg` the preview renders — one function, so the file the user gets cannot differ
 *  from the sample they were shown. With every setting at its default the output is byte-identical to
 *  what this wrote before #723 (`JSON.stringify(tree, null, 2)` + a trailing newline), which is the
 *  point: the settings are additive, and someone who ignores the dialog gets the export they had.
 *
 *  A split writes several files, which browsers deliver as several downloads. Not zipped: a zip needs
 *  a dependency (the engine is dependency-free, and jszip lives in TokenPress for reasons of its own),
 *  and the file list in the dialog is what makes the count expected rather than surprising. */
const exportTokens = (): void => {
  ensureThemeFresh();                   // #1196 — re-resolve if the namespace drifted since the last rebuild, so the tree's root and its refs agree
  const tree = buildTree(theme).tree;   // `theme` is the last-good — always valid, never throws
  for (const file of projectDtcg(tree, slug(), exportSettings)) {
    download(file.name, file.text, 'application/json');
  }
};

// design.md import (#160): the check, the file reader and the picker's types live in `state/start-input.ts` (S12), so
// the brand menu's paste and the start window's paste are held by one check.

/** Post-setup import: validate, then STAGE for confirm-overwrite — loadBrand replaces the working
 *  brand, so we never overwrite current edits without an explicit Replace (#160).
 *
 *  #722: THE CONFIRM IS NOW CONDITIONAL, and that is the model earning its keep. #160 prompted every
 *  time, including over a brand loaded seconds ago with nothing typed into it — and *"This overwrites
 *  your current edits"* was then simply false. A confirmation that fires unconditionally gets clicked
 *  through, at which point it protects nothing on the one occasion it matters (#721). With an origin
 *  and a baseline we can ask whether anything would actually be lost, so the prompt only appears when
 *  it is true, and #160's guarantee is strengthened rather than weakened: it still cannot overwrite
 *  real edits silently. */
const stageImport = (text: string, from: 'paste' | 'file'): void => {
  importText = text;              // M-17: keep the paste so an error re-render doesn't wipe it
  const res = from === 'paste' ? validatePaste(text) : validateDesignMd(text);
  if ('error' in res) { importErr = importErrorText(res.error); pendingLoad = null; renderBar(); return; }
  importErr = null;
  stageLoad(res.input, { kind: 'import', label: String(res.input.id ?? 'design.md') });
};

/**
 * THE GUARD, for every writer that replaces the working brand from the brand menu (#1033).
 *
 * `needsOverwriteConfirm` was already generic — `origin.kind !== 'none' && isDirty(...)`, with an
 * `{ kind: 'example', id }` case sitting unused in `Origin` — and the import path was the only call
 * site. So selecting an example, or "+ New brand" in the plugin, called `loadBrand` directly and
 * replaced an hour of edits with no prompt (#1033; #1034 asks for the same treatment on its own
 * button). Nothing here is new mechanism: this is the four lines `stageImport` already had, with the
 * origin passed in instead of written on the spot, so there is ONE place that decides whether a
 * replacement needs confirming rather than one per writer.
 *
 * Reads `brandState`, the LIVE state, not `lastGoodInput` — an edit that currently fails to resolve is
 * still an edit the user would be upset to lose.
 */
const stageLoad = (input: BrandInput, origin: Origin): void => {
  if (!needsOverwriteConfirm(brandState, provenance)) { loadBrand(input, origin); return; }
  pendingLoad = { input, origin }; renderBar();
};

/** Name the origin for user-facing copy (#722).
 *
 *  Recognizable terms, no jargon — "origin", "provenance" and "baseline" are OUR words for this and
 *  belong in the code, not the UI (voice-standard §4: recognizable terms in labels, and this is
 *  label-register text). `none` is never reached from the one call site (the confirm only appears
 *  when the origin is not `none`) but is answered rather than asserted away, so a later caller
 *  cannot get `undefined` in a sentence.
 *
 *  TWO POSITIONS, AND ONE CASE THAT CAN TELL THEM APART (#1033, corrected in review). The confirm names
 *  the origin on both sides of its sentence: what is ARRIVING ("Replace the current brand with …") and
 *  what is AT RISK ("Your edits to … are not saved"). Four cases are already specific enough to point at
 *  something on their own — a named example, a quoted filename, the file's own brand — and read the same
 *  in either slot. `new` is the only anonymous one, and the two slots want opposite things from it:
 *  arriving, it is "a new brand", because it is not on screen yet and there is nothing to point at; at
 *  risk, it is "this new brand", because it is precisely the thing the user is looking at.
 *
 *  #1033 first collapsed both to "a new brand" so one string could serve both slots. It served neither:
 *  two clicks from boot read "Replace the current brand with a new brand? Your edits to a new brand are
 *  not saved anywhere else." — where the second phrase names something other than what it means, and
 *  reads as though the unsaved edits belong to the brand about to replace them. That was a REGRESSION of
 *  the slot #722 already had right, introduced by generalizing toward the new one. `where` is a
 *  parameter rather than a second switch for the reason the generalization was right about: two label
 *  functions differing in one case drift apart. One switch, and the one case that differs says so. */
const originLabel = (o: Origin, where: 'arriving' | 'atRisk'): string => {
  switch (o.kind) {
    case 'none': return 'this brand';
    case 'example': return `the ${o.id} example`;
    case 'new': return where === 'arriving' ? 'a new brand' : 'this new brand';
    case 'import': return `“${o.label}”`;
    case 'file': return 'this file’s brand';
  }
};

/** The confirm-overwrite control (#160/#722, generalized by #1033).
 *
 *  Extracted from `renderImportBox` for the reason that function's own header gives for existing: the
 *  condition and its prompt are the thing that stops edits being lost silently, and a second copy is a
 *  second place to get it wrong. Three writers now stage a load; all three render THIS. */
const renderOverwriteConfirm = (pending: { input: BrandInput; origin: Origin }): HTMLElement => {
  const box = el('div', 'bm-import');
  // Reaching here MEANS there are edits to lose (`stageLoad` loads straight through when there are
  // not), so the sentence can name what they are edits *to* instead of asserting they exist (#722).
  box.append(hook(el('p', 'bm-confirm', `Replace the current brand with ${originLabel(pending.origin, 'arriving')}? Your edits to ${originLabel(provenance.origin, 'atRisk')} are not saved anywhere else.`), 'overwrite-confirm'));
  const row = el('div', 'bm-confirm-row');
  const rep = hook(el('button', 'bm-load', 'Replace brand') as HTMLButtonElement, 'overwrite-replace');
  rep.onclick = () => { pendingLoad = null; loadBrand(pending.input, pending.origin); };
  const can = hook(el('button', 'bm-cancel', 'Cancel') as HTMLButtonElement, 'overwrite-cancel');
  can.onclick = () => { pendingLoad = null; renderBar(); };
  row.append(rep, can);
  box.append(row);
  return box;
};

const renderBrandMenu = (): HTMLElement => {
  const menu = hook(el('div', 'brandmenu'), 'brand-menu');

  // The brand's Name and Namespace fields left this menu for Brand › Identity (UI redesign S3, IA-1), where
  // the name writes per keystroke through `syncIdentity` (#1196) and the namespace warns while it is a
  // reserved or placeholder one (T2). The bar's name follows through the store's `identity` topic.
  // The Examples `.cur` marker is computed at render, from `brandState.id`: no field in this menu writes the
  // name any more, so nothing can move it while the menu is open (#1075's in-place patch had that subject).
  const isCurrentExample = (name: string): boolean => name === brandState.id;

  // No Modes section (owner decision 2026-10-01, #1943). #432 had put the mode set here; S3 gave Brand › Modes
  // its own editor with different rules (a check per mode, a confirm before Dark off, the drops it lists), and
  // two editors of one set disagreed. Brand › Modes is the one place modes are edited, so Examples leads.
  menu.append(el('div', 'bm-cap', 'Examples'));
  for (const name of Object.keys(BRANDS)) {
    const b = hook(el('button', 'bm-item' + (isCurrentExample(name) ? ' cur' : '')) as HTMLButtonElement, 'brand-menu-example');
    const d = el('span', 'bm-dot'); d.style.background = hex(oklchToRgb(BRANDS[name].primary));
    b.append(d, el('span', undefined, name));
    // #1033: through the guard, not straight to `loadBrand`. Examples STAY here and stay one click from
    // an untouched brand (the decision the issue left open) — the confirm is what makes that safe, and
    // it fires only when there are edits to lose, so browsing the examples is unchanged.
    b.onclick = () => stageLoad(BRANDS[name], { kind: 'example', id: name });
    menu.append(b);
  }
  // Beneath the list it belongs to, so the sentence sits where the click was.
  if (pendingLoad?.origin.kind === 'example') menu.append(renderOverwriteConfirm(pendingLoad));

  menu.append(el('div', 'bm-div'));
  // #1034's `.cur` marker is GONE, and #1197 is why rather than an oversight. It existed because the
  // plugin's click loaded `NEW_BRAND()` in place, so in a file whose stored brand was already an
  // untouched new brand the click was a pixel-for-pixel no-op with nothing saying so. That click now
  // returns to the start moment in both hosts, which is visible feedback whatever the values are —
  // exactly the reason #1034 excluded web from the marker in the first place. The condition it tested
  // has no subject left: there is no longer a state in which this button does nothing.
  const nb = hook(el('button', 'bm-item', '+ New brand') as HTMLButtonElement, 'brand-menu-new');
  // BOTH HOSTS reopen the start (#1197), now a window over the studio (UI redesign S12). The working brand and its
  // origin stay exactly as they are while it is open: nothing is replaced until a path is chosen, and every path asks
  // first when it would discard edits (owner decision G15 A, the guard in `shell/start.ts`). So Close returns to the
  // brand unchanged with nothing to put back. Until S12 this cleared the origin, which made `needsOverwriteConfirm`
  // false and let every start path drop unsaved edits without asking (the S12 scoping report, headline 8).
  nb.onclick = () => {
    brandMenuOpen = false;
    startReopened = true;
    renderBar();
    syncStart();
  };
  menu.append(nb);
  const imp = hook(el('button', 'bm-item', '↑ Import design.md…') as HTMLButtonElement, 'brand-menu-import');
  imp.onclick = () => { importOpen = !importOpen; importErr = null; pendingLoad = null; renderBar(); };
  menu.append(imp);

  if (importOpen) menu.append(renderImportBox());

  // Export + Apply-to-Figma moved OUT of this dropdown (#159) — they're their own bar affordances
  // now (Export is an artifact output, not a brand source; Apply is the plugin's primary CTA).
  return menu;
};

/** The design.md import control — paste-or-upload, then the conditional confirm (#160, #722).
 *
 *  Extracted from `renderBrandMenu` by #723 so the export dialog's import slot and the brand menu
 *  render the SAME control rather than two that look alike. Worth being explicit about why it is one
 *  function: this is the path that validates by engine acceptance and stages an overwrite, and a
 *  second copy would be a second place for the confirm condition to be got wrong — where the failure
 *  mode is silently overwriting someone's edits. All state stays in the module-level `import*`
 *  variables, so an in-progress paste survives being reached from either surface. */
const renderImportBox = (): HTMLElement => {
  // An import awaiting confirm replaces this control with the prompt, as it did at #160 — the confirm
  // itself now lives in `renderOverwriteConfirm`, shared with the two brand-menu writers (#1033). Keyed
  // on the pending load's ORIGIN, so a staged example does not blank the paste box.
  if (pendingLoad?.origin.kind === 'import') return renderOverwriteConfirm(pendingLoad);
  const box = el('div', 'bm-import');
  const ta = hook(el('textarea', 'bm-ta') as HTMLTextAreaElement, 'import-text');
  ta.placeholder = 'Paste a design.md — --- YAML frontmatter --- then prose…';
  ta.spellcheck = false;
  ta.value = importText;                                   // M-17: restore across re-renders
  ta.oninput = () => { importText = ta.value; };           // a mode-toggle mid-paste won't lose it
  box.append(ta);
  if (importErr) box.append(hook(el('p', 'bm-err', importErr), 'import-error'));
  const row = el('div', 'bm-import-row');
  const up = el('label', 'bm-upload');
  const fi = hook(el('input', 'bm-file') as HTMLInputElement, 'import-file');
  fi.type = 'file'; fi.accept = IMPORT_ACCEPT;
  fi.onchange = async () => {
    const f = fi.files?.[0]; if (!f) return;
    const read = await readDesignMdFile(f);
    if ('error' in read) { importErr = read.error; pendingLoad = null; renderBar(); return; }
    stageImport(read.text, 'file');
  };
  up.append(el('span', undefined, '↑ Upload .md'), fi);
  const load = hook(el('button', 'bm-load', 'Load') as HTMLButtonElement, 'import-load');
  load.onclick = () => stageImport(ta.value, 'paste');
  row.append(up, load);
  box.append(row);
  return box;
};

/** The export dialog (#723, implementing #720) — replacing the two-item dropdown #159 introduced.
 *
 *  WHY A DIALOG AND NOT A LONGER MENU. The dropdown's two items were each a whole decision compressed
 *  into one click, which worked precisely because there was nothing to decide. #720 establishes that
 *  the DTCG export has four admissible shape settings, and a dropdown has nowhere to put a setting, a
 *  preview of what it does, or the list of files you are about to get. Widening the menu would have
 *  produced a menu with controls in it — the form fighting the content.
 *
 *  The structure is TWO LEVELS, artifact then settings, and that is load-bearing rather than tidy: it
 *  is what let `design.md` end up with no settings at all as a legible answer (each candidate #720
 *  named turned out to describe an emitter that does not exist — see `export-settings.ts`). A flat
 *  list of controls would have needed one of them invented to fill the space.
 *
 *  Everything about WHAT the settings are lives in `src/export-settings.ts`, which is pure and tested
 *  under tsx (`test-export-settings.ts`, 150 assertions over the four emitted brands). This function
 *  renders that model and nothing more — in particular the preview is the REAL `projectDtcg` over a
 *  six-token sample, not a second renderer that could drift from what the download writes. */
const renderExportDialog = (): HTMLElement => {
  const wrap = el('div', 'exdlg-scrim');
  const dlg = hook(el('div', 'exdlg'), 'export-dialog');
  dlg.setAttribute('role', 'dialog');
  dlg.setAttribute('aria-modal', 'true');
  dlg.setAttribute('aria-label', 'Export');

  const head = el('div', 'exdlg-head');
  head.append(el('h2', 'exdlg-t', 'Export'));
  const close = el('button', 'exdlg-x', '✕') as HTMLButtonElement;
  close.setAttribute('aria-label', 'Close');
  close.onclick = () => { exportMenuOpen = false; renderBar(); };
  head.append(close);
  dlg.append(head);

  // TWO COLUMNS: the settings on the left, what they produce on the right.
  //
  // Not a layout preference. Built as one column first and the preview landed entirely below the fold —
  // four settings with a description each is ~470px before the preview starts. A preview you have to
  // scroll to is not a preview: the whole reason it is here is to answer "what does this control do?"
  // in the moment the control is clicked, and #720's verify item ("a control whose effect is invisible
  // in the preview is either mis-chosen or the sample is wrong") is not satisfiable if the effect is
  // merely *present* somewhere in a scroll region. Side by side, clicking a setting changes something
  // you are already looking at. Collapses to one column below 720px, where two would be too narrow to
  // read either — there the preview follows the settings, which is the honest degradation.
  const body = el('div', 'exdlg-body');
  const left = el('div', 'exdlg-col');
  const right = el('div', 'exdlg-out');

  // ---- level 1: which artifact ------------------------------------------------------------
  // A segmented control, not a select: two mutually-exclusive options is doc 26's binary case, and
  // both labels are short enough to sit side by side at this width.
  // #723 — the export dialog reuses the shared segmented control; exdlg-seg adds align-self only
  const seg = el('div', mix('seg', 'exdlg-seg'));
  for (const a of ARTIFACTS) {
    const b = el('button', 'seg-b' + (a.id === exportArtifact ? ' on' : ''), a.label) as HTMLButtonElement;
    b.setAttribute('aria-pressed', String(a.id === exportArtifact));
    b.onclick = () => { exportArtifact = a.id; renderBar(); };
    seg.append(b);
  }
  left.append(seg);
  const artifact = ARTIFACTS.find((a) => a.id === exportArtifact)!;
  left.append(el('p', 'exdlg-desc', artifact.desc));

  // ---- level 2: its shape settings, DERIVED from the declaration ---------------------------
  // `visibleSettings` filters the ONE list by artifact and source (#720). Never a per-source list:
  // two lists drift, and the drift shows up as a control reaching an export it corrupts.
  const settings = visibleSettings(exportArtifact, exportSource);
  if (settings.length) {
    left.append(el('div', 'exdlg-div'));
    for (const s of settings) {
      const row = el('div', 'exdlg-set');
      row.append(el('div', 'exdlg-lab', s.label));
      // same control; exdlg-oseg adds max-width + flex-wrap so a long option pair wraps inside the panel
      const sseg = el('div', mix('seg', 'exdlg-oseg'));
      for (const o of s.options) {
        const on = exportSettings[s.key] === o.value;
        const b = el('button', 'seg-b' + (on ? ' on' : ''), o.label) as HTMLButtonElement;
        b.setAttribute('aria-pressed', String(on));
        b.setAttribute('aria-label', `${s.label}: ${o.label}`);
        b.onclick = () => { exportSettings = { ...exportSettings, [s.key]: o.value }; renderBar(); };
        sseg.append(b);
      }
      row.append(sseg);
      row.append(el('p', 'exdlg-sdesc', s.desc));
      left.append(row);
    }
  } else {
    // Said out loud rather than left as an empty area. An artifact with nothing to configure is a
    // fact about the artifact, and silence here reads as a loading state or a bug.
    left.append(el('p', 'exdlg-none', 'Nothing to set — the brief is written one way.'));
  }
  body.append(left);

  // ---- the right column: the file list, then the preview -----------------------------------
  if (exportArtifact === 'dtcg') {
    ensureThemeFresh();                   // #1196 — the preview must show the current namespace, same as the download
    const tree = buildTree(theme).tree;   // `theme` is the last-good — always valid, never throws
    const files = fileNames(tree, slug(), exportSettings);
    right.append(el('div', 'exdlg-cap', files.length === 1 ? 'You get 1 file' : `You get ${files.length} files`));
    const list = el('p', 'exdlg-files');
    // Every name, up to a point, then a count — an 18-group split is a legitimate setting and its file
    // list is longer than this column. The count is what makes the elision honest, and `title` keeps
    // the full list one hover away rather than lost.
    list.textContent = files.length <= 4 ? files.join('\n') : `${files.slice(0, 3).join('\n')}\n+${files.length - 3} more`;
    list.title = files.join('\n');
    right.append(list);
    if (restoreFailure) right.append(hook(el('p', 'exdlg-sdesc', TOKENS_NONE), 'export-restore-note'));
    right.append(el('div', 'exdlg-cap', 'A few tokens, shaped by these settings'));
    // One block PER FILE, with the name above it — not the file texts concatenated. The split setting
    // makes the sample several documents (3 for the 6-token sample), and joined with a newline they read
    // as one file containing `}` `{` in the middle, which is not valid JSON and not what downloads. The
    // name is chrome (an element), never injected into the text: the text has to stay the bytes.
    const prev = previewFiles(tree, slug(), exportSettings);
    const box = el('div', 'exdlg-prevs');
    for (const f of prev) {
      if (prev.length > 1) box.append(el('div', 'exdlg-pname', f.name));
      const pre = el('pre', 'exdlg-pre');
      pre.textContent = f.text;
      box.append(pre);
    }
    right.append(box);
  } else {
    // The brief has no settings, so there is nothing for a preview to demonstrate — and an empty right
    // column would read as something that failed to load. One sentence about what the file is for.
    if (briefInput()) {
      right.append(el('div', 'exdlg-cap', 'You get 1 file'));
      right.append(el('p', 'exdlg-files', `${briefSlug()}.design.md`));
    }
    right.append(el('p', 'exdlg-sdesc', 'A handful of anchors — the color, the type, the few decisions this brand is built from. The engine regrows the rest.'));
    // #1994: say whose brand this is when it is not the one on screen, or why there is none to export.
    if (restoreFailure) right.append(hook(el('p', 'exdlg-sdesc', restoreFailure.brand ? BRIEF_IS_FAILED : BRIEF_NONE), 'export-restore-note'));
  }
  body.append(right);

  dlg.append(body);

  // ---- the action -------------------------------------------------------------------------
  const foot = el('div', 'exdlg-foot');
  const go = hook(el('button', 'exdlg-go') as HTMLButtonElement, 'dialog-confirm');
  go.textContent = exportArtifact === 'design-md' ? '↓ Download brief' : '↓ Download tokens';
  if (exportArtifact === 'design-md' && !briefInput()) { go.disabled = true; go.title = BRIEF_NONE; }
  // Owner (#2007): after a failed restore the tokens on hand are the DEMO's, so that download is off too.
  if (exportArtifact === 'dtcg' && restoreFailure) { go.disabled = true; go.title = TOKENS_NONE; }
  go.onclick = () => {
    exportMenuOpen = false; renderBar();
    if (exportArtifact === 'design-md') exportDesignMd(); else exportTokens();
  };
  const cancel = el('button', 'bm-cancel', 'Cancel') as HTMLButtonElement;
  cancel.onclick = () => { exportMenuOpen = false; renderBar(); };
  foot.append(cancel, go);
  dlg.append(foot);

  // ---- import: a SLOT, not a control ------------------------------------------------------
  // #723 puts import in this dialog because it is the same conversation as export — the brief that
  // comes out here is the one that goes back in. The Figma-file path (#677) is deliberately absent
  // rather than disabled: `availableImportSlots()` narrows to the copy-bearing variant of the union,
  // so there is no string to render for a path whose behavior is undecided, and a disabled control
  // would promise one anyway. See `export-settings.ts`.
  const slots = availableImportSlots();
  if (slots.length) {
    const imp = el('div', 'exdlg-import');
    imp.append(el('div', 'exdlg-div'));
    imp.append(el('div', 'exdlg-cap', 'Import'));
    for (const slot of slots) {
      const b = el('button', 'bm-item', `↑ ${slot.label}…`) as HTMLButtonElement;
      b.onclick = () => { importOpen = !importOpen; importErr = null; pendingLoad = null; renderBar(); };
      imp.append(b);
      imp.append(el('p', 'exdlg-sdesc', slot.desc));
    }
    if (importOpen) imp.append(renderImportBox());
    dlg.append(imp);
  }

  // Click the scrim to dismiss, but not a click inside the panel — the scrim IS the outside.
  wrap.onmousedown = (e) => {
    if (e.target === wrap) { exportMenuOpen = false; renderBar(); }
  };
  wrap.append(dlg);
  return wrap;
};

/** The prune confirm dialog (#1521) — the review a designer sees before an opt-in delete runs.
 *
 *  Reuses the export dialog's `exdlg-*` chrome (scrim, panel, head, footer) rather than a second modal
 *  vocabulary — the deliberate cross-surface reuse the class-name law (#770) names. Its body is one
 *  column, `exdlg-col` appended straight to the flex `.exdlg` (not the two-column `exdlg-body`), holding
 *  the review sentence the main thread built (`prunePreviewSummary`). The footer pairs Cancel with the
 *  destructive CTA, whose label names the outcome — "Delete N items", per the voice standard's
 *  Destructive tone — not a bare "Confirm". Nothing here deletes; only the CTA's `postPrune(…, true)`
 *  does, and the main thread recomputes the plan from a fresh read before it acts. */
const renderPruneDialog = (): HTMLElement => {
  const p = host.prunePreview!;
  const wrap = el('div', 'exdlg-scrim');
  const dlg = hook(el('div', 'exdlg'), 'prune-dialog');
  dlg.setAttribute('role', 'dialog');
  dlg.setAttribute('aria-modal', 'true');
  dlg.setAttribute('aria-label', 'Prune stale items');

  const head = el('div', 'exdlg-head');
  head.append(el('h2', 'exdlg-t', 'Prune stale items'));
  const close = el('button', 'exdlg-x', '✕') as HTMLButtonElement;
  close.setAttribute('aria-label', 'Close');
  close.onclick = () => { setHost({ prunePreview: null }); renderBar(); };
  head.append(close);
  dlg.append(head);

  const col = el('div', 'exdlg-col');
  col.append(el('p', 'exdlg-desc', p.summary));
  dlg.append(col);

  const foot = el('div', 'exdlg-foot');
  const cancel = el('button', 'barbtn', 'Cancel') as HTMLButtonElement;
  cancel.onclick = () => { setHost({ prunePreview: null }); renderBar(); };
  const del = hook(el('button', 'exdlg-go', `Delete ${p.count} item${p.count === 1 ? '' : 's'}`) as HTMLButtonElement, 'dialog-confirm');
  // #1989: a preview the host sends opens this dialog whatever the Prune button's state, so Delete is off too.
  if (restoreFailure) { del.disabled = true; del.title = RESTORE_OFF_HINT; }
  del.onclick = () => { setHost({ pruneBusy: 'delete', prunePreview: null }); hostChanged(); commit.postPrune(lastGoodInput, true); };
  foot.append(cancel, del);
  dlg.append(foot);

  // The scrim IS the outside — a click on it cancels, a click inside the panel does not.
  wrap.onmousedown = (e) => { if (e.target === wrap) { setHost({ prunePreview: null }); renderBar(); } };
  wrap.append(dlg);
  return wrap;
};

/** The Apply-to-Figma status pill — reached only in the plugin, via the `commit.isFigma` branch.
 *
 *  Not dead-code-eliminated on web, whatever the branch's own comment used to claim. Measured: the web
 *  bundle contains this function and its class names, because `isFigma` is a RUNTIME property of the
 *  commit host, not the build-time `PRISM3_HOST` define. What IS eliminated is `figmaCommit`'s body in
 *  `write-adapter.ts` (no `pluginMessage` reaches the web bundle), so nothing here can ever fire — the
 *  branch is unreachable rather than absent. Behavior is identical either way; only the claim was wrong.
 *
 *  A headline plus an on-demand detail, NOT one line of prose. The main thread's summary is ~150
 *  characters spanning five axes; the bar pill was `max-width:220px` with `nowrap` + ellipsis, so a
 *  result reading "…, 4 misses" rendered as "palette 118 (+0), color 2…" — the miss count computed
 *  correctly and then discarded by a CSS rule. The headline carries the verdict at pill scale and the
 *  detail carries what a designer chasing a miss actually needs, wrapped rather than clipped.
 *
 *  Pending renders as text with no disclosure: there is nothing to expand yet, and a control that
 *  appears and then changes meaning when the result lands is worse than one that appears with it.
 *
 *  Shared by both write pills since #483 — `which` says whose verdict this is. Parameterised rather than
 *  copied because everything here except the pending text and the accessible name is the same for both,
 *  and the parts that are easiest to get wrong (the 24-char headline, `aria-expanded`/`aria-controls`
 *  agreeing with the row that is actually open) are exactly the parts a copy would drift on. */
/** The live pending text for the component build (#684).
 *
 *  PHASE NAMED, NOT JUST A FRACTION, because there are two loops over the same member count — building
 *  members, then wiring property references across them. A bare "412 of 648" would run to 648 and then
 *  restart at 1, which reads as a build that failed and started over. Naming the phase makes the reset
 *  the expected thing it is.
 *
 *  Before the first boundary reports there is no fraction to show, so this is the pre-#684 string — which
 *  is also what a host build older than this one leaves on screen for the whole build.
 *
 *  NOT SUBJECT TO THE 24-CHAR PILL BUDGET, unlike the headlines in `apply-summary.ts`: pending renders as
 *  `.bar-seed` text, not the `.applystat` pill, and `.bar-seed` ellipsizes at 220px rather than clipping a
 *  verdict. The longest string here is "Wiring references… 648 of 648" at 29 characters. */
const componentPendingText = (): string => {
  const p = host.componentProgress;
  if (!p) return 'Building the Button set…';
  // #1679: the reference back-off's waits. Owner's wording, and no fraction — a pass count is not progress
  // through the set, and the waits grow, so "3 of 6" would suggest the pause is half over when it is not.
  if (p.phase === 'retry') return 'Retrying property links…';
  const label = p.phase === 'build' ? 'Building members' : 'Wiring references';
  return `${label}… ${p.done} of ${p.total}`;
};
/** The live pending `<span>`s, so a chunk boundary can rewrite their text instead of re-rendering the
 *  bar (see the `component-progress` handler). Held from the last render and never read for state — if a
 *  host re-renders for another reason its entry is replaced, and a stale entry simply takes the text on a
 *  detached node while the fresh one already renders the current fraction.
 *
 *  A SET, NOT ONE SLOT (#870), because `componentState === 'pending'` is rendered TWICE — once into the
 *  chrome bar and once into the Components page's own row — and both are on screen at the same time
 *  whenever a designer starts a build from the page and stays there. A single slot made them compete for
 *  it: `renderApplyStatus` overwrote the field on every call, so the last pill rendered won and the other
 *  one kept the pre-#684 placeholder for the whole build. Measured in the built plugin bundle before the
 *  fix — with the page open, the page's row counted up while the bar sat frozen at "Building the Button
 *  set…" through all 54 boundaries; navigated away, the bar counted correctly, which is what made this
 *  look like a bar bug rather than a shared-cache bug.
 *
 *  PRUNED AT WRITE TIME BY `isConnected`, not cleared by the renderers that mint into it. Both hosts
 *  discard their pill wholesale on re-render, so entries do go stale and an unbounded set would leak
 *  detached nodes across a session — but asking each renderer to clear first puts the obligation on code
 *  that does not know this set exists, which is how a third host would silently reintroduce the freeze.
 *  Dropping a node the moment it is found detached needs no cooperation and is the same `isConnected`
 *  test `syncErrorBar` judges itself by. Live membership is at most one per host that renders the pill. */
const componentPendingEls = new Set<HTMLElement>();

// `host:progress` — a TEXT SWAP, NOT `renderBar()`. This fires at every chunk boundary — 27 per phase, so 54
// times, in a 648-member build at CHUNK = 24 — and rebuilding the bar discards and remakes every control in
// it, which would blur whatever the designer had focused and reset the brand switcher's open state
// mid-build. The pending pill is the only thing that changed, so it is the only thing rewritten.
//
// EVERY live pill, not one (#870): the bar and the Components page each render their own, and writing to a
// single cached node left whichever rendered first frozen at the placeholder for the whole build.
subscribe('host:progress', () => {
  const text = componentPendingText();
  for (const node of componentPendingEls) {
    // A detached node is a pill whose host has re-rendered since. Dropped rather than written to, so the
    // set stays bounded without any renderer having to know it exists — see the field.
    if (node.isConnected) node.textContent = text;
    else componentPendingEls.delete(node);
  }
});

function renderApplyStatus(state: Exclude<HostSession['applyState'], null>, which: DetailKey): HTMLElement {
  const noun = which === 'apply' ? 'apply' : which === 'filesetup' ? 'file setup' : which === 'styleguide' ? 'style guide' : 'component build';
  // A page row's pill, in the legacy frame's own classes, which its row sync looks up to replace. Since UI
  // redesign S11 it is the row's only copy: the bar's moved into the Activity drawer, which draws its own.
  const pendingPill = (text: string): HTMLElement => hook(el('span', 'bar-seed', text), 'status-pill');
  if (state === 'pending') {
    // The theme write's pending text is static and the component build's is not (#684), so only the
    // latter is cached for in-place updates. A theme apply writes variables and answers in well under a
    // second; a 648-member build takes tens of seconds, which is precisely why it reports.
    if (which === 'apply') return pendingPill(PENDING_TEXT.apply);
    // File setup posts a single terminal result with no progress boundaries (#1558), so its pending text
    // is static like the theme write's rather than cached like the component build's.
    if (which === 'filesetup') return pendingPill(PENDING_TEXT.filesetup);
    if (which === 'styleguide') return pendingPill(PENDING_TEXT.styleguide);
    const node = pendingPill(componentPendingText());
    // ADDED, not assigned (#870). Two hosts render this pill and both can be live at once; see
    // `componentPendingEls` for the measurement that an assignment left one of them frozen.
    componentPendingEls.add(node);
    return node;
  }
  const btn = hook(el('button', 'applystat' + (state.ok ? ' ok' : ' bad')) as HTMLButtonElement, 'status-verdict');
  btn.type = 'button';
  // The headline is a bare text node, not a span: it needs no styling of its own (the pill sets the
  // type and color), and an element with a class but no rule is a name reserved against nothing — the
  // shape the scope law (#770) exists to make unspellable.
  // The caret stays as the pill's sign that it opens something (owner decision #5 on #1956); it is the
  // pre-S11 caret, unturned, because what it opens is the drawer, not a row under it. The name carries
  // the headline, so the glyph is hidden from it.
  const caret = el('span', 'caret', '▾');
  caret.setAttribute('aria-hidden', 'true');
  btn.append(document.createTextNode(state.headline), caret);
  // The pill shows its result in the Activity drawer (S11), which holds the detail now: the click asks for
  // it through `openDetail`, and the drawer opens on it and answers. It discloses nothing in place, so it
  // carries no `aria-expanded`; `aria-controls` names the drawer it opens.
  btn.setAttribute('aria-controls', 'p3-activity');
  btn.setAttribute('aria-label', `${state.headline} — ${noun} details in Activity`);
  btn.onclick = () => { setHost({ openDetail: which }); hostChanged(); };
  return btn;
}

// The bar's host subscription, guarded on the chrome being mounted — the guard the switch carried.
subscribe('host', () => { if (barHost) renderBar(); });

/** The UI's own host-state change (a write going pending, a result asked for): told through the same two
 *  topics a host verdict invalidates, in the same order, so the bar and the Activity drawer (S1.4) each
 *  repaint from their subscription. Before S1.4 these callers named `renderBar` directly, which the drawer
 *  could not hear. */
const hostChanged = (): void => { invalidate('host'); invalidate('host:detail'); };

/** Answer a request to show a result (S11): lent to the Activity drawer, which calls it once it has opened
 *  on the result `openDetail` names, so the same pill can ask again. */
const closeOpenDetail = (): void => { if (host.openDetail === null) return; setHost({ openDetail: null }); hostChanged(); };

/** The static pending texts, one per write that has one: the page rows' pills and the Activity drawer's
 *  phase line read the same words. */
const PENDING_TEXT = { apply: 'Writing to Figma…', filesetup: 'Setting up file…', styleguide: 'Drawing the style guide…' } as const;
/** The component build's phase and progress, from either reading (the panel's or the agent's). The words
 *  are `componentPendingText`'s, with the fraction moved to the progress bar. */
const componentPhase = (p: HostSession['componentProgress']): Pick<OpReading, 'phase' | 'progress'> =>
  !p ? { phase: 'Building the Button set…', progress: null }
    : p.phase === 'retry' ? { phase: 'Retrying property links…', progress: null }
      : { phase: p.phase === 'build' ? 'Building members…' : 'Wiring references…', progress: { done: p.done, total: p.total } };
const IDLE: OpReading = { state: 'idle', ref: null, verdict: null, summary: null, phase: null, progress: null, agent: false };
/** True while the agent's command for `k` runs and its verdict has not landed. */
const agentRunning = (k: OpKey): boolean => !!host.agentRun && host.agentRun.op === k && !host.agentRun.settled;
/** One operation as the Activity drawer reads it (S11). Running when the panel's own slot is pending, or
 *  the agent's command for it runs (`agentRun`); `ref` is `'pending'` or the agent run's id then, so a run
 *  that ends with no verdict is the slot's old value coming back. `agent` is true while an agent's command
 *  runs it and when its verdict lands, which is the moment the drawer records it. */
const opReading = (k: OpKey, busy: boolean, settled: Omit<OpReading, 'phase' | 'progress' | 'agent'> | null, phase: () => Pick<OpReading, 'phase' | 'progress'>): OpReading => {
  const byAgent = agentRunning(k);
  if (busy || byAgent) return { state: 'running', ref: busy ? 'pending' : `agent:${host.agentRun!.id}`, verdict: null, summary: null, ...phase(), agent: !busy };
  if (!settled) return IDLE;
  return { ...settled, phase: null, progress: null, agent: !!host.agentRun && host.agentRun.op === k };
};
/** A write slot's verdict, as a settled reading. */
const verdictOf = (st: HostSession['applyState']): Omit<OpReading, 'phase' | 'progress' | 'agent'> | null =>
  st === null || st === 'pending' ? null : { state: st.ok ? 'ok' : 'bad', ref: st, verdict: st.headline, summary: st.summary };
/** The short verdicts Read-back and Prune stale show on their rows (owner decision #3 on #1956): a word or
 *  a count, with the host's full sentence in the row's details. The other rows' verdicts are already short
 *  headlines. */
const SHORT = { clean: 'Clean', failed: 'Failed', noTheme: 'No theme', notRestored: 'Not restored' } as const;
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
/** The boot read-back's result (#722): the seed pill's words and the restore refusal (#480) as its body,
 *  under a short verdict. The unrecoverable case says both halves, and is not styled as a failure: #721
 *  requires it not read as one. A read-back whose checks pass reads "Clean" even when the saved brand was
 *  not restored, the refusal in its details; "Not restored" is only for a refusal with nothing checked
 *  (the owner's approved copy, #1990). A failed restore on its own does not make the row bad: a "Clean"
 *  or "No theme" read-back after one is a normal row, not counted as needing attention and not opening the
 *  drawer (the owner's calls on #2008 and #2009), since the plugin's error bar already says the saved brand
 *  did not load. Only "Not restored", "Failed" and mismatches are bad. */
const readbackOf = (): Omit<OpReading, 'phase' | 'progress' | 'agent'> | null => {
  const o = host.seedOutcome;
  const err = host.restoreError;
  if (!o && !err) return null;
  const refused = err ? `Saved brand not restored — ${err}` : null;
  if (!o) return { state: 'bad', ref: err, verdict: SHORT.notRestored, summary: refused };
  const [text, ok] = o.state === 'error' ? [o.message, false]
    : o.state === 'absent' ? ['No existing Prism3 theme in this file — start from the knobs.', true]
      : [isUnrecoverable(o) ? `${o.detail} — knobs not stored in this file, so these are defaults` : o.detail, o.contractOk];
  const verdict = o.state === 'error' ? SHORT.failed
    : o.state === 'absent' ? SHORT.noTheme
      : o.contractOk ? SHORT.clean
        : o.failed > 0 ? plural(o.failed, 'mismatch', 'mismatches') : SHORT.failed;
  return { state: ok ? 'ok' : 'bad', ref: `${err ?? ''}\n${text}`, verdict, summary: [refused, text].filter(Boolean).join(' · ') };
};
/** Prune stale's short verdict: what the preview found, or what the delete removed. */
const pruneShort = (v: { ok: boolean; applied: boolean; count: number }): string =>
  !v.ok ? SHORT.failed : v.applied ? `Removed ${v.count}` : v.count === 0 ? SHORT.clean : `${v.count} stale`;
/** The host session's operations, lent to the Activity drawer (`shell/activity.ts`). Pure. A prune
 *  preview with something to remove is a settled run (its confirm dialog takes over); its verdict, when
 *  there is one, is the prune's result. Agent progress is the agent's own reading (`agentRun.progress`). */
const activityReading = (): ActivityReading => {
  const pv = host.pruneVerdict;
  const pp = host.prunePreview;
  const fixed = (phase: string | null) => () => ({ phase, progress: null });
  return {
    ops: {
      apply: opReading('apply', host.applyState === 'pending', verdictOf(host.applyState), fixed(PENDING_TEXT.apply)),
      components: opReading('components', host.componentState === 'pending', verdictOf(host.componentState),
        () => componentPhase(host.componentState === 'pending' ? host.componentProgress : host.agentRun?.progress ?? null)),
      filesetup: opReading('filesetup', host.fileSetupState === 'pending', verdictOf(host.fileSetupState), fixed(PENDING_TEXT.filesetup)),
      styleguide: opReading('styleguide', host.styleGuideState === 'pending', verdictOf(host.styleGuideState), fixed(PENDING_TEXT.styleguide)),
      prune: opReading('prune', !!host.pruneBusy,
        pv ? { state: pv.ok ? 'ok' : 'bad', ref: pv, verdict: pruneShort(pv), summary: pv.summary }
          : pp ? { state: 'ok', ref: pp, verdict: pruneShort({ ok: true, applied: false, count: pp.count }), summary: pp.summary } : null,
        fixed(host.pruneBusy === 'delete' ? 'Removing…' : host.pruneBusy === 'preview' ? 'Checking…' : null)),
      readback: opReading('readback', false, readbackOf(), fixed(null)),
    },
    detail: host.openDetail,
    refused: host.refused,
  };
};

// ── the writes the bar's controls and the Figma menu run (S1.4) ─────────────────────────────────────
// One function per write, called by its control and by its Figma menu item, so the two cannot drift.
// Each sets its own pending state and says so through `hostChanged`; the bar, the detail row and the
// Activity drawer repaint from that.
//
// WHILE A WRITE RUNS, PANEL OR AGENT, ITS CONTROLS ARE BUSY (owner decision #4 on #1956, which also fixes
// #1957): the engine Button's `isPending` (`shell/dom.ts`'s `pendingLabel`). Each run function refuses
// while its own write is out, whoever started it. That refusal is the one re-fire guard: the bar's
// control and the menu's item both call it, and neither carries a second guard a test could not tell apart.
// Before this, an agent's run left the panel's Apply ready to post a second write over the same variables.

/** True while a write of this kind runs: the panel's own slot is pending, or an agent's command runs it. */
const applyBusy = (): boolean => host.applyState === 'pending' || agentRunning('apply');
const pruneBusy = (): boolean => !!host.pruneBusy || agentRunning('prune');
const fileSetupBusy = (): boolean => host.fileSetupState === 'pending' || agentRunning('filesetup');
const componentBusy = (): boolean => host.componentState === 'pending' || agentRunning('components');

/**
 * THE FILE'S BRAND DID NOT RESOLVE (#1989), so Apply Theme and Prune stale are off until a brand does.
 *
 * The host's restore check (`reduce`) only asks `brandTheme` to accept the blob, so a brand the engine
 * refuses later, in resolution (a ground override), still loads: `brandState` holds the file's brand, the
 * rebuild fails, and `theme` and `lastGoodInput` stay on the boot demo. Both writes post `lastGoodInput`,
 * so either one would have written the DEMO over the file's brand, under a bar saying only that a change
 * had not applied. Set from the restore dispatch in `handleHostMessage`; cleared by the first rebuild that
 * resolves, whatever brought it (an example, an import). A later failing edit does not set it again: that
 * `lastGoodInput` is the designer's own brand, one edit back, which is what Apply has always posted.
 *
 * The bar's Apply and the Figma menu's two items are DISABLED rather than guarded in `runApply`/`runPrune`:
 * those are their only callers, so a guard there could never fire and no test could tell it was gone. The
 * prune dialog's Delete is disabled the same way, because a host preview can open that dialog at any time.
 */
/**
 * #1994 widened this to the two other ways a restore fails, and each keeps the demo on screen with the
 * writes posting it:
 *   - `rejected`: `brandTheme` refuses the blob, so `reduce` drops it and nothing loads (silent before).
 *   - `unreadable`: the host could not deserialize it (`restore-input-error`, #480). No brand arrives at all.
 * In both, the DEMO is what is loaded and its edits rebuild cleanly, so "the first rebuild that resolves"
 * cannot be what turns the writes back on: a demo edit would, and Apply would post it over the file. They
 * clear when a brand LOADS, in `loadBrand` (the one caller of `loadInput`), and on nothing else: an `origin`
 * subscriber also heard "New brand" (`clearOrigin`), which loads nothing, and dropped the error bar and the
 * Export rescue with it (review of #2007). `unresolved` keeps #1989's rule, since
 * there `brandState` is the file's own brand and a rebuild that resolves is that brand, fixed.
 *
 * `brand` is what Export design.md writes in this state: the file's brand that failed, never the demo, and
 * null where nothing readable arrived, which turns that export off with the reason.
 */
type RestoreFailure = { kind: 'unresolved' | 'rejected' | 'unreadable'; reason: string; brand: BrandInput | null };
let restoreFailure: RestoreFailure | null = null;
subscribe('brand', () => { if (restoreFailure?.kind === 'unresolved' && !lastError) restoreFailure = null; });
/** The file's failed brand as a design.md, or null when it cannot be written as one. */
const failedBrandOf = (input: unknown): BrandInput | null => {
  try { toDesignMd(input as BrandInput); return input as BrandInput; } catch { return null; }
};
const BRIEF_IS_FAILED = "This is the file's saved brand, which didn't open, not the demo brand on screen.";
const BRIEF_NONE = "Nothing to export: this file's saved brand couldn't be read.";
const TOKENS_NONE = "Off after a failed restore: these tokens would be the demo brand's, not this file's.";
/** The error bar after a failed restore, by kind (owner, 2026-10-02). `unresolved` says "resolves" because a
 *  rebuild that resolves also ends it; the other two end only when a brand loads. */
const RESTORE_BAR: Record<RestoreFailure['kind'], (reason: string) => string> = {
  unresolved: (r) => `This file's saved brand didn't resolve: ${r} Apply Theme and Prune stale are off until a brand resolves. Load an example or import a design.md to continue.`,
  rejected: (r) => `This file's saved brand didn't resolve: ${r} Apply Theme and Prune stale are off until a brand loads. Load an example or import a design.md to continue.`,
  unreadable: (r) => `This file's saved brand couldn't be read: ${r} Apply Theme and Prune stale are off until a brand loads. Load an example or import a design.md to continue.`,
};
/** The tooltip on every write that is off after a failed restore: one wording for every kind (owner). */
const RESTORE_OFF_HINT = "Off until a brand loads. This file's saved brand didn't open, and writing now would put the demo brand over it.";

/** Apply Theme. The previous run's detail is stale the instant a new write starts, so it collapses with
 *  the state. */
const runApply = (): void => {
  if (applyBusy()) return;
  setHost({ applyState: 'pending', openDetail: null }); hostChanged(); commit.postTheme(lastGoodInput);
};
/** Prune stale: a dry run first, whose count the confirm dialog shows (#1521). */
const runPrune = (): void => {
  if (pruneBlocked()) return;
  setHost({ pruneBusy: 'preview', pruneVerdict: null, prunePreview: null }); hostChanged(); commit.postPrune(lastGoodInput, false);
};
/** Set up file (#1558). `openDetail` is cleared for the reason the build clears it: the previous run's
 *  detail is stale the instant a new one starts. */
const runFileSetup = (): void => {
  if (fileSetupBusy()) return;
  setHost({ fileSetupState: 'pending', openDetail: null });
  hostChanged();
  commit.postFileSetup();
};
/** Build a component set (UI redesign S8.2): the Components preview's Build button, lent as `lend.sets.run`. Refuses
 *  while a build runs, the panel's or an agent's (the one re-fire guard, #1956 decision 4), and for a set the catalog
 *  does not offer (owner decision G4 A: a set that can't be built is never posted, whatever asked). Remembers the set
 *  it posted (`componentDef`), so the verdict that answers it is recorded against that set (G9). `componentProgress`
 *  clears as well as on the result (#684): a build that throws before the executor returns posts a failed result, and
 *  one that never answers posts nothing, so a fraction from an abandoned run must not lead the next one. */
const runBuild = (id: string): void => {
  if (componentBusy()) return;
  if (!componentCatalog().some((e) => e.id === id && e.buildable)) return;
  setHost({ componentState: 'pending', componentProgress: null, openDetail: null, componentDef: id });
  hostChanged();
  commit.postComponents(id);
};
/** Prune is unavailable while a prune runs AND while a theme apply runs, panel or agent: a prune reads the
 *  same variables an apply writes, so overlapping the two would race a delete against a create. */
const pruneBlocked = (): boolean => pruneBusy() || applyBusy();
const PRUNE_HINT = 'Removes the styles, modes and variables this config no longer emits. Shows the count before deleting, and names the modes.';

/** The Figma menu's items (`shell/figma.ts`), plugin only. Labels are today's: the bar's two controls, Set up file
 *  (whose only control this is since S8.2, G8 A), and the two writes that need options first (concept v6's "Build
 *  set…" and "Style guide…"), which open where those options are: the Components tab, and the Style guide page. */
/** The busy labels are the pending labels the panel already used (#1948), without their leading "…",
 *  which `pendingLabel` draws as the spinner's cell. An agent's prune does not say whether it is a dry run,
 *  so its busy label is the item's own. */
const figmaActions = (): FigmaAction[] => [
  { id: 'apply', label: 'Apply Theme', busy: applyBusy() ? 'Applying…' : null, disabled: !!restoreFailure,
    ...(restoreFailure ? { hint: RESTORE_OFF_HINT } : {}), run: runApply },
  { id: 'prune', label: 'Prune stale', busy: host.pruneBusy === 'preview' ? 'Checking…' : host.pruneBusy === 'delete' ? 'Removing…' : pruneBusy() ? 'Prune stale' : null,
    disabled: pruneBlocked() || !!restoreFailure, hint: restoreFailure ? RESTORE_OFF_HINT : PRUNE_HINT, run: runPrune },
  { id: 'file-setup', label: FILE_SETUP_LABEL, busy: fileSetupBusy() ? 'Setting up…' : null, disabled: false, run: runFileSetup },
  // S8.2 (owner decision G2 A): Build set… opens the Components tab, where the set is chosen and built.
  { id: 'build', label: 'Build set…', busy: null, disabled: false, run: () => setPage(pageOfTab('components', commit.isFigma ? 'figma' : 'web')) },
  { id: 'style-guide', label: 'Style guide…', busy: null, disabled: false, run: () => setPage('styleGuide') },
];

/** The brand bar (#159) — a horizontal row of brand-level utilities, replacing the single
 *  overloaded dropdown. Left: brandmark. Right: brand switcher (identity + examples + new +
 *  import — a brand *source*), Export (artifact *output*), and, in the plugin only, the primary
 *  Apply-to-Figma CTA (the terminal action of the plugin flow). Modes live in the workspace
 *  mode-context strip (#171), not here. The bar is sticky (see `.bar`). */
/** A legacy surface opened from the new chrome, pinned light (D2): `data-theme="light"` resets the chrome
 *  variables and `color-scheme` beneath it, so its fields keep dark UA ink on their light ground in a dark
 *  theme (#1031). */
const pinLight = <E extends HTMLElement>(n: E): E => { n.dataset.theme = 'light'; return n; };

function renderBar(): void {
  // The shell's nodes this places (the verdict, the Agent slot, Activity, the Figma menu) are the same
  // nodes on every render, so one that held focus gets it back once it is placed again.
  const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  barHost.innerHTML = '';
  // THE LEGACY HALF OF THE NEW TOP BAR (UI redesign S1.2). The frame (`shell/frame.ts`) owns the bar and
  // its theme toggle; this paints the controls the legacy code still owns into the slot it lends: the
  // brand switcher, Export, the Pages menu and the plugin's Apply Theme, and places the shell's own
  // controls among them in concept v6's order (S1.4): the verdict, the Agent chip's slot, Activity and the
  // Figma menu. The plugin's write verdicts are the Activity drawer's own (S11). Every control here wears
  // the chrome's classes; the menus and dialogs they open are legacy surfaces, pinned light (`pinLight`).

  // Brand switcher — identity, examples, new, import.
  const bWrap = el('div', 'barmenu-wrap');
  const sel = hook(el('button', 'p3-brand') as HTMLButtonElement, 'brand-switcher');
  sel.type = 'button';
  sel.setAttribute('aria-expanded', String(brandMenuOpen));
  // The swatch is the brand's color, so it is brand content: `data-content` marks it, and its inline
  // background is the one runtime value the chrome may carry. The chrome's class sits on the frame
  // around it, never inside it.
  const sw = el('span', 'p3-swatch');
  const dot = el('span');
  dot.setAttribute('data-content', '');
  dot.style.background = hex(oklchToRgb(brandState.primary));
  sw.append(dot);
  sel.append(sw, el('span', 'p3-brand-name', brandState.id), glyph('chev'));
  // Closing the menu discards a staged load with it (#1033) — an unanswered "Replace the current brand?"
  // must not be waiting behind a reopened menu, where the next click on Replace would answer a question
  // asked about a state that has since moved on.
  sel.onclick = (e) => { e.stopPropagation(); brandMenuOpen = !brandMenuOpen; exportMenuOpen = false; navMenuOpen = false; if (!brandMenuOpen) { importOpen = false; pendingLoad = null; } renderBar(); };
  bWrap.append(sel);
  if (brandMenuOpen) bWrap.append(pinLight(renderBrandMenu()));
  barHost.append(bWrap);
  // The verdict (S1.3): the shell's node, kept current by its own subscription and moved here, after the
  // brand switcher, on every render rather than re-minted.
  if (frame) barHost.append(frame.verdict);
  barHost.append(el('span', 'p3-spacer'));
  // The Agent chip's slot (IA-3), then Activity (F2): the frame's nodes, placed, never re-minted.
  if (frame?.agent) barHost.append(frame.agent);
  if (frame) barHost.append(frame.activity);

  const actions = barHost;

  // Apply Theme — plugin-only, the primary CTA (the plugin's terminal action). Never rendered on web
  // (`commit.isFigma` false — a runtime property, so the branch is unreachable there rather than
  // eliminated). Its status, the boot read-back's (#109, #480) and every other write's are the Activity
  // drawer's since S11 (`activityReading`): each operation's row holds its latest result and the earlier ones.
  let applyBtn: HTMLButtonElement | null = null;
  if (commit.isFigma) {
    // Pending is a real state, not a cosmetic one: the write is asynchronous and, on a large file, slow
    // enough that a button which neither moves nor says so reads as broken — and a second click posts a
    // second concurrent write over the same variables. Busy while any Apply runs, the panel's or an
    // agent's (owner decision #4 on #1956): the signal is `pendingLabel`'s, the guard is `runApply`'s.
    // Appended last, after Export and Pages, so the one inverse-filled control ends the bar.
    applyBtn = hook(el('button', 'p3-btn p3-btn-primary') as HTMLButtonElement, 'apply-to-figma');
    applyBtn.type = 'button';
    applyBtn.append(pendingLabel('Apply Theme', 'Applying…'));
    setBusy(applyBtn, applyBusy());
    // Off, natively, while the file's brand does not resolve (#1989): unlike busy, nothing is running that
    // focus should wait on. The reason is the error bar's, and the tooltip's.
    if (restoreFailure) { applyBtn.disabled = true; applyBtn.title = RESTORE_OFF_HINT; }
    // The previous run's detail is stale the instant a new write starts, so it collapses with the state.
    applyBtn.onclick = runApply;

    // The component write's trigger USED TO SIT HERE (#483), a second action beside Apply. #718 moved it
    // to the Components rail page, and UI redesign S8.2 to the Components tab's preview. Apply is the
    // only write that belongs in the primary bar: it is the terminal action of the theme flow, runs after
    // every knob change, and answers in well under a second.
    //
    // What did NOT move is the build's STATUS: it stays legible after navigating away from the page that
    // started it, in the Activity drawer since S11, because a 648-member build runs ~105s cold (#700) and
    // nobody watches a page for that long. The prune's control is the Figma menu's (`figmaActions`), and
    // its verdict (a preview that finds nothing stale, or the outcome of a delete) is its own row there.
  }

  // Export — opens the export dialog (#723, replacing #159's dropdown). Concept v6 names it with the
  // word alone; at narrow widths the word gives way to a glyph, and the accessible name stays "Export".
  const eWrap = el('div', 'barmenu-wrap');
  const exp = hook(el('button', 'p3-btn p3-btn-collapse') as HTMLButtonElement, 'export-open');
  exp.type = 'button';
  exp.append(glyph('export'), el('span', 'p3-btn-label', 'Export'));
  exp.setAttribute('aria-label', 'Export');   // stable accessible name once the word is hidden
  exp.setAttribute('aria-haspopup', 'dialog');
  exp.setAttribute('aria-expanded', String(exportMenuOpen));
  exp.onclick = (e) => { e.stopPropagation(); exportMenuOpen = !exportMenuOpen; brandMenuOpen = false; navMenuOpen = false; importOpen = false; renderBar(); };
  eWrap.append(exp);
  actions.append(eWrap);

  // Pages — the old rail, as a menu (D1, D5). The tab row navigates now; this keeps every legacy page
  // reachable by its old name until its domain slice retires it, and S13 removes the menu. A host with no destination
  // left draws none (owner decision G19 A): the web since S8.2, whose last legacy page moved to Components; the plugin
  // keeps it for the Style guide until S11.2.
  const nWrap = el('div', 'barmenu-wrap');
  if (!railNav().length) navMenuOpen = false;
  const nav = hook(el('button', 'p3-btn p3-btn-collapse') as HTMLButtonElement, 'pages-menu');
  nav.type = 'button';
  nav.append(glyph('pages'), el('span', 'p3-btn-label', 'Pages'), glyph('chev'));
  nav.setAttribute('aria-label', 'Pages');
  nav.setAttribute('aria-expanded', String(navMenuOpen));
  nav.onclick = (e) => {
    e.stopPropagation();
    navMenuOpen = !navMenuOpen; brandMenuOpen = false; exportMenuOpen = false; importOpen = false;
    renderBar();
  };
  nWrap.append(nav);
  if (navMenuOpen) nWrap.append(pinLight(renderNavMenu()));
  if (railNav().length) actions.append(nWrap);
  // The Figma menu (S1.4, plugin only), then Apply Theme, the one inverse-filled control, last.
  if (frame?.figma) actions.append(frame.figma);
  if (applyBtn) actions.append(applyBtn);


  // The export dialog is appended to the BAR HOST, not inside `.barmenu-wrap` (#723). Two reasons, both
  // concrete: the wrap is `position:relative` for the dropdowns that hang off it, which would trap a
  // fixed-position scrim in its stacking context; and the outside-click handler below dismisses anything
  // outside a `.barmenu-wrap`, so a dialog inside one would be dismissed by its own scrim click on the
  // way to the scrim's own handler. Ordering the two would have been the bug; not overlapping them is
  // the fix. `renderBar()` clears `barHost` on every call, so the dialog's lifetime is still one flag.
  if (exportMenuOpen) barHost.append(pinLight(renderExportDialog()));
  // The prune confirm dialog (#1521), appended for the same reasons the export dialog is — a modal scrim
  // that must sit outside the relative `.barmenu-wrap` stacking context. Present only when a preview with
  // something to remove has landed; `renderBar()` clears `barHost` each call, so its lifetime is the flag.
  if (host.prunePreview) barHost.append(pinLight(renderPruneDialog()));
  // A shell node placed again above keeps the focus it had (a re-render moved it, which blurs it).
  if (focused && focused.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });

  if (!outsideBound) {
    document.addEventListener('mousedown', (e) => {
      // The apply detail is NOT dismissed here, deliberately: it is a row in the chrome rather than an
      // overlay, so it obscures nothing and a click elsewhere is not a request to close it. Auto-closing
      // it would also lose a miss report the moment the designer clicked the control they came to fix.
      //
      // `exportMenuOpen` is no longer in this condition (#723): the export dialog is modal, and its own
      // scrim decides what "outside" means for it. Left here, this handler would close the dialog on the
      // first click that landed on a setting — every control in it is outside `.barmenu-wrap`.
      if ((brandMenuOpen || navMenuOpen) && !(e.target as HTMLElement).closest('.barmenu-wrap')) {
        brandMenuOpen = false; navMenuOpen = false; importOpen = false; pendingLoad = null; renderBar();
      }
    });
    // Escape closes the dialog. Bound once, alongside the click dismissal, for the same reason: the bar
    // re-renders constantly and a per-render listener would accumulate one per render.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && exportMenuOpen) { exportMenuOpen = false; importOpen = false; renderBar(); }
      // Escape cancels the prune review too (#1521) — a review is not a commitment, so closing it
      // deletes nothing. Same bound-once handler, for the same reason the click dismissal is.
      else if (e.key === 'Escape' && host.prunePreview) { setHost({ prunePreview: null }); renderBar(); }
    });
    outsideBound = true;
  }
}

/** The rail's destinations as a dropdown, for the widths where the rail is not a sidebar. Renders
 *  from the same `railNav()` data and reuses the rail's own `.stage-t` title+subtitle block, so the
 *  subtitles survive the move — they are doing real work ("Surfaces & fills / Backgrounds, text,
 *  gradients" teaches what the page is) and a bare label list would drop them. The divider before
 *  the `view` destinations and the ordering note both come across too, so nothing the sidebar shows
 *  is silently lost on the way into the menu. */
const renderNavMenu = (): HTMLElement => {
  // menu variant — navmenu re-skins the shared popover
  const menu = hook(el('div', mix('brandmenu', 'navmenu')), 'pages-menu-list');
  menu.append(el('div', 'bm-cap', 'Pages'));
  const nav = railNav();
  nav.forEach((s, i) => {
    // ONE divider before the FIRST view destination, not one before each. It marks the boundary between
    // authoring the theme and looking at / writing out the result — a second rule between Preview and
    // Components would separate two things on the same side of that boundary. Written as "the first
    // view entry" rather than a hardcoded index so the rule survives another `view` destination
    // (docs/23 §6's deferred Output group is exactly that) and survives `figmaOnly` filtering, which
    // changes which index the boundary lands on between the two hosts.
    if (isFirstView(nav, i)) menu.append(el('div', 'bm-div'));
    // The rail's hooks and its `active` state came with it (S1.2, plan §4), so the suites' page sweep
    // reaches every legacy page the way it did: `rail-page-<key>` in kebab-case, the label on its own hook.
    const it = hook(el('button', 'nav-item' + (s.key === page ? ' cur active' : '')) as HTMLButtonElement, `rail-page-${s.key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`);
    const t = el('span', 'stage-t');
    t.append(hook(el('b', undefined, s.label), 'rail-item-label'), el('small', undefined, s.sub));
    it.append(t);
    it.onclick = () => {
      navMenuOpen = false;
      // `setPage` alone: the `page` subscriber re-renders the legacy frame, and with it this bar.
      if (page !== s.key) setPage(s.key); else renderBar();
    };
    menu.append(it);
  });
  menu.append(el('p', 'rail-note', 'Ordered the way a theme composes — palettes first, then how they’re applied to surfaces and interaction, then type and form.'));
  // The build stamp (#474) stood here until UI redesign S8.2; it is at the foot of the Inspect menu now, on both hosts
  // (owner decision C3 A), since the web has no Pages menu (G19).
  return menu;
};

// ---- the start window (UI redesign S12) --------------------------------------------------------------
// It opens over the studio on the first run (no origin yet) and when "+ New brand" reopens it; any load closes it.
/** "+ New brand" opened it, so it offers Close (owner decisions G15 A, S9). */
let startReopened = false;
let startWindow: StartWindow | null = null;
/** Open, keep or close the start window to match the session. Kept while it stays the same window, so a hex being
 *  typed or a paste survives a render behind it. */
const syncStart = (): void => {
  const want: 'first' | 'reopen' | null = firstRun() ? 'first' : startReopened ? 'reopen' : null;
  if (startWindow && want && startWindow.first === (want === 'first')) return;
  startWindow?.dismiss(null);
  startWindow = null;
  if (!want || !frame) return;
  startWindow = openStart(frame.layer, {
    host: commit.isFigma ? 'figma' : 'web',
    first: want === 'first',
    // THE ONE DECISION for whether a replacement asks first (#1033's `stageLoad` rule): only with edits to lose. The
    // count it names is the settings that differ from the origin (`editCount`).
    guardFor: (c: StartChoice) => (needsOverwriteConfirm(brandState, provenance)
      ? guardText(String(brandState.id), originLabel(c.origin, 'arriving'), editCount(brandState, provenance.baseline))
      : null),
    load: (c: StartChoice) => loadBrand(c.input, c.origin),
    close: () => {
      startReopened = false;
      syncStart();
      // Back to the control that opened it.
      (barHost?.querySelector<HTMLElement>('[data-p3="brand-switcher"]') ?? null)?.focus();
    },
  });
};

export const build = (): void => {
  // The studio always renders, and the start window opens over it (UI redesign S12, owner decision G10 A): on the
  // first run (no origin yet) and after "+ New brand". Until S12 the start was a root view of its own, outside the
  // frame and pinned light.
  // The rail is gone (UI redesign S1.2, D1): the tab row in the frame navigates, and the old rail
  // survives as the Pages menu in the top bar (`renderNavMenu`), with its hooks and its build stamp.
  const shell = el('div', 'shell');
  workspace = hook(el('section', 'ws'), 'workspace');
  shell.append(workspace);
  mountView('app', () => shell);
  bindStuck();
  // After `mountView`, never inside its `body()`: `renderWorkspace` measures real geometry (`syncStuck`
  // reads a bounding rect against the live `--chrome-h`), and a detached shell measures zero.
  renderWorkspace();
  syncStart();
};

// ---- stylesheet install ----------------------------------------------------
// The CSS itself lives in `styles.css` (#769), pulled in as TEXT by `entry.ts`, which checks it arrived
// as text and passes it here. See `entry.ts` for that guard and `styles.css`'s header for the loader
// requirement and for the gate that reads it by path.

/** Properties a UTILITY may declare (#544's invariant, unchanged): type treatment and ink, nothing
 *  that could size, position or space the element it is worn by. */
const NON_BOX_PROP = /^(font(-[a-z-]+)?|color|letter-spacing)$/;

/**
 * The stylesheet half of the class-name law (#770) — see the `scoped styles` section near the top of
 * this file for the whole argument. Two checks, both about the SHARED vocabulary, because that is the
 * only part of the namespace an element can wear without naming it:
 *
 *   1. No STATE or UTILITY may key a top-level rule on its own. A shared token that carries a
 *      declaration is precisely `.slider{margin-top:16px}` — a rule that reaches every element wearing
 *      the token, from any surface. Barred, a shared token can only appear in a COMPOUND (`.pfield.slider`),
 *      which cannot fire without its anchor and so cannot cross a surface. The one exception is a
 *      UTILITY's own single declaration, which is the whole reason it exists — held to (2).
 *   2. A UTILITY's declaration is layout-free, re-derived from the shipped text rather than trusted
 *      from the comment beside `UTILITIES`. A listed utility with no rule at all fails too, rather
 *      than passing by default (the #502 lesson: prove you looked).
 *
 * This is not a lint step. It is the only path by which `styles.css` becomes CSS, so there is no
 * build of this app in which it did not run — the property that made it worth retiring a gate for.
 * It reads the SHIPPED stylesheet string, not the source file, so the thing checked is the thing that
 * renders.
 */
export const installStyles = (css: string): void => {
  const decls = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // Top-level rules only: anchored at line start, a run of whole `.class` selectors separated by
  // top-level commas and immediately followed by `{`. A compound (`.pfield.slider`) or a descendant
  // (`.sg-pills .tpill`) breaks the match entirely rather than matching a prefix — which is the
  // point, since those are the shapes that are safe by construction.
  const owns = new Map<string, string>();
  for (const m of decls.matchAll(/^((?:\.[a-z][a-z0-9-]*\s*,\s*)*\.[a-z][a-z0-9-]*)\s*\{([^}]*)\}/gm)) {
    for (const sel of m[1].split(',')) owns.set(sel.trim().slice(1), m[2]);
  }
  if (owns.size === 0) {
    throw new Error('apps/studio: the stylesheet declares no top-level class rules — it moved or changed shape (#770).');
  }
  const shared = [...owns.keys()].filter((c) => FREE.has(c) && !(UTILITIES as readonly string[]).includes(c));
  if (shared.length) {
    throw new Error(
      `apps/studio: ${shared.map((c) => `'.${c}'`).join(', ')} key a top-level rule while listed as a shared ` +
        'state. A shared token that carries a declaration reaches every element wearing it, from any ' +
        'surface — that is the #464 defect. Give the rule a scope, or drop the name from STATES (#770).',
    );
  }
  for (const u of UTILITIES) {
    const body = owns.get(u);
    if (body === undefined) {
      throw new Error(`apps/studio: UTILITIES lists '.${u}', which has no top-level rule to verify (#770).`);
    }
    const boxy = body.split(';').map((d) => d.split(':')[0].trim()).filter(Boolean).filter((p) => !NON_BOX_PROP.test(p));
    if (boxy.length) {
      throw new Error(
        `apps/studio: UTILITIES class '.${u}' declares ${boxy.join(', ')}. A utility is worn by any scope, so ` +
          'it must carry no layout its host could fight. Remove the property, or make it a scope of its own (#770).',
      );
    }
  }
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.append(styleEl);
};

/** Distance from the pointer to the window's edge while the grip is held. The grip sits flush in
 *  the corner, so the dragged size is the pointer position plus this — the same small offset
 *  Figma's own resize sample uses. */
const GRIP_INSET = 5;

/** Mount the plugin window's resize grip (#144). Attached to `body`, not `#app`, because `#app` is
 *  re-rendered wholesale on every state change and the grip must outlive that. Pointer capture is
 *  what makes the drag survive the pointer leaving the 16px target — without it the gesture dies
 *  the moment you move faster than the window resizes. `entry.ts` calls it behind the `PRISM3_HOST`
 *  define rather than `commit.isFigma`, so the branch is statically false on web and esbuild really
 *  does drop this function (a runtime check would keep it). The three CSS rules still ride along in the
 *  shared stylesheet, which is a string constant — not worth splitting for ~150 bytes. */
export const mountResizeGrip = (): void => {
  const grip = el('div', 'resize-grip');
  grip.title = 'Drag to resize the plugin window';
  let dragging = false;
  const sizeFrom = (e: PointerEvent): [number, number] => [e.clientX + GRIP_INSET, e.clientY + GRIP_INSET];
  grip.addEventListener('pointerdown', (e) => {
    dragging = true;
    grip.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  grip.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const [w, h] = sizeFrom(e);
    commit.requestResize(w, h, false);
  });
  // Pointer-up AND pointer-cancel both end the drag: cancel fires if the browser takes the
  // gesture back, and without it `dragging` would stay true and the next hover would resize.
  const end = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    if (grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId);
    const [w, h] = sizeFrom(e);
    commit.requestResize(w, h, true);   // commit → the host persists this size
  };
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
  document.body.append(grip);
};
