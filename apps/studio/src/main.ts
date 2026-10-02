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
import { brandTheme, REQUIRED_WEIGHT_ROLES, normalizeDisabledStrategy, HEADING_SIZE_FLOOR, PER_MODE_SIZE_GROUPS, mobileEndpoint, typefaceSlug, derivedRungFor, shiftRung, LINE_HEIGHT_KEYS, LETTER_SPACING_KEYS, LINE_HEIGHT_LADDER, LETTER_SPACING_LADDER, SPIN_ROLE } from '@prism3/engine/theme';
import type { BrandInput, Theme, TypeComposite, PerModeSizeGroup, TypographyInput, FacePin } from '@prism3/engine/theme';
import { hex, oklchToRgb, hexToRgb, rgbToOklch, contrast, composite } from '@prism3/engine/color';
import { buttonMinWidth, DEFAULT_MIN_WIDTH_MULTIPLIER, ICON_SIZES, sizeRefPx, densitySpacingStep } from '@prism3/engine/scale';
import { leverManifest, leverGroups } from '@prism3/engine/levers';
import type { Lever } from '@prism3/engine/levers';
import { previewSpec } from '@prism3/engine/preview';
import { resolveAllModes, outlineFillFamily, outlineFillRole } from '@prism3/engine/modes';
import { parseDesignMd, toDesignMd } from '@prism3/engine/design-md';
import { parseStandardDesignMd, standardToBrandInput, isStandardDesignMd } from '@prism3/engine/standard-design-md';
import { buildTree, deref, subNode, numOf, remPxOf, familyOf, type TreeNode } from '@prism3/engine/tree';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { componentDefs } from '@prism3/engine/components/index';
import { figmaAnatomySet } from '@prism3/engine/anatomy-figma';
import { BUTTON_SPACING } from '@prism3/engine/button-spacing';
import { hostCommit, type HostCommit } from './write-adapter';
import { initialHostSession, reduce, topicsFor, brandEffectFor, type HostSession, type DetailKey, type OpKey } from './state/host-session';
import type { StyleGuideOptionsMsg } from './write-adapter';
import { buildChip, buildTitle } from './build-identity';
import { sizeColumnHeader } from './size-labels';
import { emToPercentLabel } from './em-percent';
import { describeControl, paletteRefOptions, leverHook, type ControlOption } from './levers/controls';
import { mountFrame, type Frame } from './shell/frame';
import { isNewPage, type LegacyPageKey } from './shell/pages';
import type { ActivityReading, OpReading } from './shell/activity';
import type { FigmaAction } from './shell/figma';
import { glyph } from './shell/dom';
// The Style guide's shared color sections and the helpers they draw with (UI redesign S4a, owner decision Q5):
// Color › Surfaces & fills draws the same five sections from the same modules.
import {
  SG_SURFACES, colorPath, ground as sharedGround, oppositeOf, palSection, sgContext, specimen, subHead,
  tokenPillSpan, withInverseBadge, type SgRole,
} from './preview/sections/kit';
import { COLOR_SECTIONS, disabledSection, interactiveSection } from './preview/sections/index';
import { setRoleOverride } from './state/fills-input';
// The Interactive page's writes and its "Auto" baselines (UI redesign S5.1): DOM-free, so Color › Interactive
// (S5.2) can make the same edits without importing this file. This page calls them, then repaints.
import {
  addAccent, anchorOf, baselineAnchorStepOf, baselineStepOf as baselineStepIn, removeAccent, setAnchor,
  setInverseFillSource, setLever, setLinkFamilyOverride as setLinkFamilyIn, setLinkRung as setLinkRungIn, stepKeyOf,
} from './state/interactive-input';
import {
  needsOverwriteConfirm, isDirty, isUnrecoverable,
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
  getPath, setPath, getModeLever, setModeLever, subscribe, invalidate, searchQuery, searchHits, setSearchHits,
  type Mode, type PageKey,
} from './state/store';

// The session starts in `entry.ts` (#896): it reads the web's persisted brand, picks the origin, and
// hands both to the store's `initSession` before anything renders. `firstRun`, the start screen's
// gate, is the store's reading of that origin.

// A minimal, known-good starting point for "New brand": one mid-indigo primary + a
// derived neutral, action defaults to primary, namespace at the 'prism' placeholder.
const NEW_BRAND = (): BrandInput => ({
  id: 'untitled', root: 'prism',
  modes: ['light'],                               // most brands ship light only (docs/11 Pillar 1)
  primary: { l: 0.55, c: 0.15, h: 262 },
  neutral: { hue: 262, chroma: 0.006, auto: true },   // neutral hue auto-follows primary (262 = primary.h → identical ramp; now live-linked)
});

// Every ATOMIC control is live — it edits brandState and re-runs the engine on change.
// Liveness is by control TYPE, not a per-key allowlist: sliders, enums, palette-refs, and
// toggles all have real handlers (a bad value just surfaces the error bar, never crashes —
// rebuild() is try/caught). Object/list levers (families, surfaces, brand colors) all got their
// bespoke editors (#97) — this generic path is what's left over: baseMd, disabledMin, and
// radiusScale/density/shadow.softness/motionPersonality.tempo on Light, where a bespoke per-mode
// editor takes over everywhere else. density/motion/shadow all have live preview specimens now
// (#99) — paintSizePreview, renderMotionSpecimen, renderShadowSpecimen.
const LIVE_CONTROLS = new Set(['slider', 'enum', 'palette-ref', 'toggle']);

const MODE_LABEL: Record<string, string> = { light: 'Light', dark: 'Dark', 'hc-light': 'HC light', 'hc-dark': 'HC dark', wireframe: 'Wireframe' };

// ---- stages ----------------------------------------------------------------
// The rail is data (docs/23 §7): a flat list of focused destinations, each one page. A page's facets
// are sections within it, not separate rail rows. `view:true` marks a non-authoring destination
// (Preview, Components) — it sits after a divider with no ordinal. Order is the sequence a theme
// composes in: primitives → how they're applied (surfaces / interactive) → type → form
// (elevation/size/layout/motion) → look at the whole (Preview) → write something out (Components).
const NAV = [
  { key: 'interactive', label: 'Interactive', sub: 'Action colors, states, a11y' },
  { key: 'typography', label: 'Typography', sub: 'Families, weights → type scale' },
  { key: 'elevation', label: 'Elevation', sub: 'Shadows' },
  { key: 'sizeRadius', label: 'Size & radius', sub: 'Size, density, corner radius' },
  { key: 'layout', label: 'Layout', sub: 'Breakpoints & containers' },
  { key: 'motion', label: 'Motion', sub: 'Tempo & easing' },
  // #259 — the style-guide step, after Apply theme: it documents the variables Apply wrote, so it follows the
  // authoring pages and Preview. Figma-only for the `components` reason below — it draws on the canvas.
  // Placement and label are proposed, owner to confirm (docs/45).
  { key: 'styleGuide', label: 'Style guide', sub: 'Token tables on the Figma canvas', view: true, figmaOnly: true },
  // #718 — the component write's destination, and A DEMOTION RATHER THAN A PROMOTION. The natural
  // reading of "components get their own rail item" is that the capability graduated; here it is the
  // reverse. The control is leaving a first-class slot beside Apply precisely because it is not
  // first-class: it is the anatomy schema's materialization proof (docs/28, docs/14 §3.1), kept
  // runnable so the schema has a consumer that can refute it, not a capability a client is offered.
  //
  // `figmaOnly` follows the rule docs/23 §7 already settled for the deferred Output group: a
  // destination that only makes sense in the Figma channel is present in the plugin host and omitted
  // from the web rail, rather than rendered inert there. Both NAV consumers read `railNav()`.
  { key: 'components', label: 'Components', sub: 'Internal — build the Button set', view: true, figmaOnly: true },
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

// Which page a lever belongs to. The manifest groups levers under a few axes; the focused pages slice
// finer. Palette colour primitives get a bespoke UI, so they're excluded from the generic knob render.
// Status hues are edited inline on Palettes ramps (they're advanced + colour-control, so they filter
// out of every generic panel anyway). The `color` + `advanced` groups split by key across pages.
const PRIMITIVE_KEYS = new Set(['primary', 'neutral.hue', 'neutral.chroma', 'neutral.anchor', 'brandColors']);
const pageOfLever = (l: Lever): PageKey => {
  if (l.group === 'type') return 'typography';
  if (l.group === 'motion') return 'motion';
  if (l.group === 'elevation') return 'elevation';
  if (l.group === 'layout') return 'layout';
  if (l.group === 'form') return 'sizeRadius';   // radiusScale, density, + advanced grid/space dims
  if (l.key === 'gradients' || l.key === 'surfaces') return 'fills';   // Color › Surfaces & fills, moved (S4a)
  return 'interactive';   // remaining colour/advanced: action palette, interactive treatment, disabled, icon, inverse, neutralEmphasis, interactivePalettes
};
const leversFor = (key: PageKey): Lever[] => leverManifest.filter((l) => !l.advanced && !PRIMITIVE_KEYS.has(l.key) && pageOfLever(l) === key);
const leverByKey = (k: string): Lever | undefined => leverManifest.find((l) => l.key === k);

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
 *  `.cs-preview` boxes in `controlSplitPage`.
 *  If the reconcile keeps the LIVE region those nodes correspond to, the freshly-assigned painter is
 *  left writing into a tree that was never attached, and every later `apply()` paints into nothing.
 *
 *  That is not a hypothetical: it is the same failure `renderComponentsPage` already guards against in
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
  globalErrHost.hidden = !lastError;
  if (lastError) globalErrHost.textContent = `That change didn't apply: ${lastError} — you are seeing the last theme that resolved.`;
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
  'active', 'arow-lead', 'authored', 'bad', 'cap', 'cs-nudge', 'cur', 'dark', 'derived', 'dia', 'disabled',
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
/** A number `<input>` (doc 24 C2). The `.num` base owns the shared field cosmetics (border, radius,
 *  background, padding); the caller passes a context class for width/size and wires its own `onchange`.
 *  That context class comes from the CALLER's scope by design, so the pairing is a mix() — the base
 *  owns cosmetics, the context class owns width, and neither overrides the other (#770). */
const numberField = (o: { value: string | number; min?: number | string; max?: number | string; step?: number | string; className?: string; title?: string }): HTMLInputElement => {
  const inp = el('input', o.className ? mix('num', o.className) : 'num') as HTMLInputElement;
  inp.type = 'number';
  if (o.min != null) inp.min = String(o.min);
  if (o.max != null) inp.max = String(o.max);
  if (o.step != null) inp.step = String(o.step);
  inp.value = String(o.value);
  if (o.title) inp.title = o.title;
  return inp;
};
/** A range `<input>` (doc 24 C5b). Just the element construction (type/bounds/value/class) — the
 *  readout + wiring stay per-site, since the surrounding layouts genuinely differ (a `.slider-top`
 *  readout, a `.knob-val`, an auto-pruning knob, a label-as-readout). `className` may be omitted for
 *  the knob-context sliders styled by the `.knob input[type=range]` descendant rule. */
const rangeInput = (o: { value: string | number; min?: number | string; max?: number | string; step?: number | string; className?: string }): HTMLInputElement => {
  const inp = el('input', o.className) as HTMLInputElement;
  inp.type = 'range';
  if (o.min != null) inp.min = String(o.min);
  if (o.max != null) inp.max = String(o.max);
  if (o.step != null) inp.step = String(o.step);
  inp.value = String(o.value);
  return inp;
};
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
/** A token pill that WRAPS on path boundaries, for card grids whose column width is fixed by the
 *  content set (six easing curves → a ~123px card, against ~225px for `motion.easing.expressive`).
 *
 *  Deliberately NOT folded into `tokenPill`: `<wbr>` is not inert under `white-space: nowrap` in
 *  Chromium. Putting it in the shared helper took Layout's breakpoint pills from 0 wrapped to 5 and
 *  turned Surfaces' 3 elided pills into 3 wrapped ones — measured against `main` with the same sweep,
 *  which is the only reason it was caught. A shared component is exactly where an "obviously harmless"
 *  addition does damage out of sight of the page you are working on.
 *
 *  `<wbr>` rather than a zero-width space: it contributes nothing to `textContent`, so a path copied
 *  out of the pill is still the path. Pair with the wrap CSS on the container. */
const tokenPillWrapping = (path: string): HTMLElement => {
  const p = tokenPillSpan(path);
  p.textContent = '';
  const segs = path.split('.');
  segs.forEach((seg, i) => { p.append(i < segs.length - 1 ? `${seg}.` : seg); if (i < segs.length - 1) p.append(el('wbr')); });
  return withInverseBadge(path, p);
};
/** A dashed "+ add" button (doc 24 C4). `.addbtn` owns the styling; pass context classes (width/margin)
 *  via `cls`. That context class comes from the CALLER's scope, so the pairing is a declared mix()
 *  — the base owns cosmetics, the context class owns placement, and neither overrides the other (#770). */
const addButton = (label: string, onClick: () => void, cls = ''): HTMLButtonElement => {
  const btn = el('button', cls ? mix('addbtn', cls) : 'addbtn', label) as HTMLButtonElement;
  btn.onclick = onClick;
  return btn;
};
/** A round "×" remove button (doc 24 C4). `cls` is a placement class from the caller's own scope, so
 *  it is a declared mix() for the same reason `addButton`/`numberField` are (#770). */
const removeButton = (onClick: () => void, title = 'Remove', cls = ''): HTMLButtonElement => {
  const btn = el('button', cls ? mix('rx', cls) : 'rx', '×') as HTMLButtonElement;
  btn.title = title; btn.onclick = onClick;
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
/** Segmented chips for a 2-4-option enum lever (#1675): a native radio group, so arrow keys, focus
 *  and the screen-reader announcement come from the platform. The `<legend>` is the lever label and
 *  the chips are the radios' labels. The selected chip is filled AND carries a check mark and a
 *  heavier weight, so the state does not rest on color alone.
 *
 *  `checked` is set as a PROPERTY, never as the attribute, the same way `optionEl` sets `selected`.
 *  That keeps a freshly built group's `outerHTML` identical to the live one, so the region reconcile
 *  (#771) keeps the live group when nothing else changed. When something else in the region changed, the
 *  region is swapped, and `renderWorkspace` focuses the same chip in the new group.
 *
 *  The radio `name` is the lever key, not a counter, for the same reason: a counter would make every
 *  rebuilt group differ from the live one. One lever renders at most once per page. */
const chipGroup = (key: string, legend: string, options: readonly ControlOption[], cur: unknown, onPick: (value: string | number) => void): HTMLFieldSetElement => {
  const fs = hook(el('fieldset', 'chips') as HTMLFieldSetElement, leverHook(key));
  fs.append(el('legend', 'chips-legend', legend));
  const row = el('div', 'chips-row');
  for (const o of options) {
    const opt = el('label', 'chips-opt');
    const input = el('input', 'chips-in') as HTMLInputElement;
    input.type = 'radio'; input.name = `lever:${key}`; input.value = String(o.value);
    input.checked = String(o.value) === String(cur);
    input.onchange = () => { if (input.checked) onPick(o.value); };
    opt.append(input, el('span', 'chips-face', o.label));
    row.append(opt);
  }
  fs.append(row);
  return fs;
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
  if (effect === 'loadBrand' && m.kind === 'restore-input') loadBrand(m.input as BrandInput, { kind: 'file' });
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
/** Which sections answer to the mode bar. MEASURED, not asserted — every entry comes from
 *  `npm run -w @prism3/studio audit:modes`, which switches Light→Dark and diffs each section. That
 *  script also GATES this map (`--check-badges`), so a section whose behaviour changes, or whose
 *  title is renamed out from under an entry, fails rather than silently losing its badge.
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
  // Interactive — the three action palettes edit; the global behaviors only re-resolve
  'Primary actions': 'per-mode', 'Neutral actions': 'per-mode', 'Destructive actions': 'per-mode',
  'Outline button hover': 'shared', 'Icon colors': 'shared', 'Focus ring': 'shared',
  // Size & radius
  'Corner radius': 'per-mode', 'Density & size': 'per-mode', 'Spacing grid': 'shared',
  'Primitive scales': 'shared',
  // Elevation
  'Shadow': 'per-mode', 'Elevation ramp': 'shared',
  // Motion
  // Easing is 'shared', not 'per-mode', and the audit is what caught the difference. Its per-mode
  // control is a COLUMN-PER-MODE table (#522), so it edits every mode at once and its markup is
  // identical whichever mode the bar holds — the bar does not scope it. With `hasControls` true the
  // three-state badge renders "Editing · All modes", which is exactly the case #437 proposed that
  // label for. Marking it 'per-mode' claimed the bar scoped an editor it has no effect on.
  'Tempo': 'per-mode', 'Easing': 'shared', 'Motion': 'shared',
  'Duration ramp': 'shared', 'Springs': 'shared',
  // Preview — read-only end to end
  'Background': 'shared', 'Foreground': 'shared', 'Text color': 'shared', 'Border': 'shared',
  'Icon': 'shared', 'Disabled': 'shared', 'Interactive': 'shared',
};

/** Marks a control that changes the VIEW, not a token — a playback speed, a filter, a specimen ground.
 *  `attachModeBadges` skips these when deciding editability, the way it already skips `button`.
 *
 *  WHY AN ATTRIBUTE AND NOT A DECLARED FLAG PER SECTION. #437's editability is measured from the
 *  rendered DOM precisely so it cannot drift, and #574 is not a reason to give that up — a
 *  hand-declared `editable: false` on Motion would go stale the day Motion gains a real control. The
 *  measurement was not wrong, it was measuring a PROXY: presence of a control is not evidence of
 *  editability, and a view-state control satisfies "the user can change something here" without
 *  satisfying "the user can change a token here". Marking the exception keeps the measurement, and a
 *  section that gains a real control still re-badges itself with no map to remember.
 *
 *  WHY AN ATTRIBUTE AND NOT THE `.mo-slowmo-sel` CLASS. The badge would then encode one specimen's
 *  class name, so the second view control would reintroduce the bug — exactly how #575 happened (a
 *  mapping re-derived at a second site, with no shared name to grep for). This is that shared name. */
const VIEW_ONLY = 'data-view-only';
/** Tag `c` as a view-state control and return it, so it can wrap the control at construction. */
const viewOnly = <T extends HTMLElement>(c: T): T => { c.setAttribute(VIEW_ONLY, ''); return c; };
/** A SPECIMEN: an element whose ink is the BRAND's, previewed — as against the studio's own chrome (#779).
 *  The smoke suite holds chrome text to WCAG (4.5:1, 3:1 large) and a specimen to the contract of what it
 *  previews, and it cannot tell the two apart from class names: prefixes are per-surface, so `sg-lab` is a
 *  specimen and `sg-rn` beside it is chrome. The render site knows, so the render site says — the same
 *  reasoning, and the same shape, as `viewOnly` above. Every site that paints ink from a brand token calls
 *  this; `test-smoke.mjs` fails on inline ink it finds unmarked, so a new specimen cannot land as chrome. */
// `SPECIMEN` and `specimen()` live in `preview/sections/kit.ts` (UI redesign S4a), so the shared Style guide
// sections mark their specimens with the same attribute this file does. `specimenPair` (#1652) and
// `legibleInkOn` (#555) moved there in UI redesign S5.1 with the Interactive section, their only reader.
/** Value editors only — what the three-state badge and `mode-audit.mjs` both mean by "a control".
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
  // (Focus ring, Spacing grid, Primitive scales, Elevation ramp, Duration ramp, Springs). Measured,
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

/** `commit` is the path this control takes when it changes, and it defaults to `apply()` — recompute
 *  the theme, repaint the volatile region, keep focus. That is right for a control whose page owns a
 *  painter for everything the edit changes. A caller passes `applyFull` instead when the edit's
 *  visible consequences are drawn by a page SECTION, which no painter owns — see `renderMotionPage`
 *  and #800.
 *
 *  A `slider` commits on `oninput`, i.e. once per pixel of drag, so `applyFull` is not a sane commit
 *  for one. Nothing here prevents it; no caller does it, and this says so rather than implying a
 *  guard that is not written. */
const renderControl = (lever: Lever, commit: () => void = apply): HTMLElement => {
  const live = LIVE_CONTROLS.has(lever.control);
  // Which control this lever gets is the descriptor's call (`levers/controls.ts`, #1675), not this
  // function's. A 2-4-option enum is chips; the rest keep the controls they had.
  const d = describeControl(lever);
  let body: HTMLElement;

  if (d.kind === 'chips') {
    // The same write and the same commit the select made; only the control differs.
    const cur = getPath(brandState, lever.key) ?? lever.default;
    return knob(null, chipGroup(lever.key, lever.label, d.options, cur, (v) => { setPath(brandState, lever.key, v); commit(); }), lever.description);
  } else if (lever.control === 'slider') {
    const input = rangeInput({ min: lever.min, max: lever.max, step: lever.step, value: (getPath(brandState, lever.key) ?? lever.default ?? lever.min ?? 0) as number });
    input.disabled = !live;
    const val = el('span', 'knob-val', `${input.value}${lever.unit ?? ''}`);
    if (live) input.oninput = () => { setPath(brandState, lever.key, Number(input.value)); val.textContent = `${input.value}${lever.unit ?? ''}`; commit(); };
    body = knobBody(input, val);
  } else if (lever.control === 'palette-ref' && live) {
    const sel = selectEl('sm');
    const palettes = paletteRefOptions(lever.key, (brandState.brandColors ?? []).map((b) => b.name));
    const cur = String(getPath(brandState, lever.key) ?? lever.default ?? 'primary');
    for (const p of palettes) sel.append(optionEl(p, p, p === cur));
    sel.onchange = () => { setPath(brandState, lever.key, sel.value); commit(); };
    body = sel;
  } else if (lever.control === 'enum') {
    const sel = selectEl('sm');
    const cur = getPath(brandState, lever.key) ?? lever.default;
    for (const o of lever.options ?? []) sel.append(optionEl(String(o.value), o.label, o.value === cur));
    sel.disabled = !live;
    if (live) sel.onchange = () => { setPath(brandState, lever.key, sel.value); commit(); };
    body = sel;
  } else if (lever.control === 'toggle') {
    // Boolean axis. `checked` reads truthy — so `gradients` renders "on" whether it's `true`
    // or an explicit gradient array (the array is only reset if the user toggles off). Toggling
    // writes a plain boolean: on → the default (single gradient / inverse inks), off → false.
    body = toggleField(!!(getPath(brandState, lever.key) ?? lever.default), (checked) => { setPath(brandState, lever.key, checked); commit(); });
  } else {
    const v = getPath(brandState, lever.key) ?? lever.default;
    let text: string;
    if (Array.isArray(v)) text = v.map((it: any) => it?.name).filter(Boolean).join(', ') || `${v.length} item(s)`;
    else if (v && typeof v === 'object') text = 'configured';
    else text = String(v ?? lever.itemLabel ?? '—');
    body = el('div', 'knob-val ro', text);
  }
  return knob(lever.label, body, lever.description);
};

// The per-mode `modeLevers` read/write helpers — `getModeLever`, `setModeLever`, `pruneModeLevers` —
// live in `state/store.ts`, with the prune-to-byte-identical invariant they exist to keep.

/** A per-mode enum select with a natural "Auto" (follows the global lever). Shared by the radius / motion
 *  tempo / density controls — outside the base mode they edit `modeLevers[mode].<key>` instead of the
 *  global. A hand-authored value that matches no discrete option is surfaced as its own "(custom)" option
 *  rather than silently reading as Auto. `parse` maps the selected string to the stored value. */
const renderPerModeSelect = (lever: Lever, key: string, opts: [string, string][], globalOf: () => string, parse: (s: string) => unknown, autoNote: string): HTMLElement => {
  const cur = getModeLever(currentMode, key);
  const sel = selectEl('sm fill');
  sel.append(optionEl('', `Auto — follows global (${globalOf()})`, cur == null));
  let matched = false;
  for (const [v, label] of opts) { const on = String(cur) === v; matched ||= on; sel.append(optionEl(v, label, on)); }
  if (cur != null && !matched) sel.append(optionEl(String(cur), `${cur} (custom)`, true));
  sel.onchange = () => { setModeLever(currentMode, key, sel.value === '' ? undefined : parse(sel.value)); applyFull(); };
  const desc = `${lever.description} — per ${MODE_LABEL[currentMode] ?? currentMode}; “Auto” follows the global ${autoNote}.`;
  return knob(lever.label, sel, desc);
};
const RADIUS_SCALE_OPTS: [string, string][] = [['0', '0 · sharp'], ['0.5', '0.5'], ['1', '1 · default'], ['1.5', '1.5'], ['2', '2 · soft']];
const TEMPO_OPTS: [string, string][] = [['snappy', 'Snappy'], ['standard', 'Standard'], ['relaxed', 'Relaxed']];
const DENSITY_OPTS: [string, string][] = [['compact', 'Compact'], ['comfortable', 'Comfortable'], ['spacious', 'Spacious']];
const renderPerModeRadius = (lever: Lever): HTMLElement =>
  renderPerModeSelect(lever, 'radius', RADIUS_SCALE_OPTS, () => String(brandState.radiusScale ?? (lever.default as number) ?? 1), Number, 'corner softness');
const renderPerModeTempo = (lever: Lever): HTMLElement =>
  renderPerModeSelect(lever, 'tempo', TEMPO_OPTS, () => String(brandState.motionPersonality?.tempo ?? (lever.default as string) ?? 'standard'), (s) => s, 'tempo');
const renderPerModeDensity = (lever: Lever): HTMLElement => hook(
  renderPerModeSelect(lever, 'density', DENSITY_OPTS, () => String(brandState.density ?? (lever.default as string) ?? 'comfortable'), (s) => s, 'density'), 'per-mode-density');
/** The levers that carry a per-mode "Auto" select outside the base mode, by lever key. */
const PER_MODE_SELECTS: Record<string, (lever: Lever) => HTMLElement> = {
  radiusScale: renderPerModeRadius,
  density: renderPerModeDensity,
  'motionPersonality.tempo': renderPerModeTempo,
};

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

  // The five shared color sections, in the Style guide's order, each on the chosen ground.
  for (const [, section] of COLOR_SECTIONS) host.append(ground(section(c)));

  // The Disabled and Interactive sections, shared since UI redesign S5.1 (`preview/sections/`), each on the
  // chosen ground. Interactive reads the brand's outline method and whether that ground is the inverse band.
  host.append(ground(disabledSection(c)));
  host.append(ground(interactiveSection(c, { method: theme.outlineInteraction, surface: surf.key })));
};

const PAGE_COPY: Record<LegacyPageKey, [string, string]> = {
  interactive: ['Interactive color & states.', 'Point actions at the palette that reads best, tune the interactive treatment (hover, inverse, neutral emphasis), and set the accessibility policy — icon contrast + the disabled strategy.'],
  typography: ['Set the type system.', 'Families, weights, and the type scale that shifts the semantic→primitive size mapping. The rem ladder is brand-invariant; the scale is the dial.'],
  elevation: ['Elevation.', 'The shadow ramp — blur/offset softness and an optional brand-hued tint on the shadow base. Dark modes get a reduced set automatically.'],
  sizeRadius: ['Size & radius.', 'Component sizing (control height, driven by density) and corner radius. Both go per-mode outside Light. Each component sets its own padding, and density moves it one step on the spacing scale.'],
  layout: ['Layout.', 'Breakpoints, grid columns, and container widths — the responsive frame the system lays out within.'],
  motion: ['Motion.', 'Tempo (the duration ramp) and the expressive easing curve. Reduce-motion is derived.'],
  // #718. The lede states the role rather than the feature, because that is the fact this page exists
  // to convey: the write is how the anatomy schema is proven to materialize, not a component library
  // the brand ships. Naming the one def and the member count keeps it from reading as a catalog.
  styleGuide: ['Style guide.', 'Token tables drawn from this file’s variables: each palette as a scale on Primitive tokens, each role family on Semantic tokens. One column per mode, each swatch bound to its variable and drawn on the ground its contrast is measured against. Run it after Apply Theme.'],
  components: ['Components.', 'Internal — the Button set, written onto the Figma canvas from the component definition. One definition carries the anatomy this needs, so one component builds: 648 variants across intent, appearance, size, state, and the two icon slots. This is how the definition format is proven to materialize, not a component library the brand ships.'],
};

// The status roles, in the engine's order. Their colors are set on Color › Palettes (`domains/color-palettes.ts`,
// UI redesign S2); the legacy pages read the list to tell a status ramp from a brand one.
const STATUS_ROLES = ['success', 'warning', 'danger', 'info'] as const;
type StatusRole = typeof STATUS_ROLES[number];

// The Interactive page groups its controls into intent sub-sections. (Gradients — formerly a "Features"
// group here — now lives on the Surfaces page; page surfaces + text/ink are bespoke editors there.)
// `subHead` lives in `preview/sections/kit.ts` (UI redesign S4a).

// `stepKeyOf` (the last dot-segment of a token path: the palette step key) lives in
// `state/interactive-input.ts` since UI redesign S5.1.

// ---- shared colour atoms (audit §8) ---------------------------------------
// contrastBadge + swatch are the shared atoms every colour editor composes from (the interactive matrix,
// the Surfaces fill/foreground editors, the preview gallery).

/** "ratio:1 ✓/✗", pass/fail coloured, with an optional leading label. Shared by the cards + the preview
 *  gallery (audit §8 candidate #1). */
const contrastBadge = (ratio: number, min: number, label?: string): HTMLElement => {
  const b = el('span', `cbadge ${ratio >= min ? 'ok' : 'no'}`);
  if (label) b.append(el('span', 'cb-lab', label));
  b.append(hook(el('span', 'cb-ratio', `${ratio.toFixed(2)}:1`), 'contrast-ratio'), el('span', 'cb-mark', ratio >= min ? '✓' : '✗'));
  return b;
};
/** A colour swatch element with an inline background (audit §8 candidate #2). Takes any CSS background
 *  value, not only a hex — a translucent role paints as `washCss`'s layered composite, which is a
 *  background image over a colour and cannot be spelled as one hex. */
const swatch = (bg: string, cls = 'sw'): HTMLElement => { const s = el('div', cls); s.style.background = bg; return s; };

// ============================================================================
// Interactive & action colors — the per-palette matrix (#69)
// ============================================================================
// Each action palette (Primary / Neutral / Destructive / promoted Accents) is a section of full-width
// SLOT rows: Fill · rest, Fill · inverse, Text · rest, Text · inverse, Overlay wash, On-fill, On-fill ·
// inverse. A row = a 56×56 swatch · a Source select + token pill + description · a locked-right example
// with its contrast receipt · (fill / text / overlay) a two-up Hover/Pressed states strip. Every slot
// binds to a REAL engine role — ENG-1/ENG-2 emit the full per-state, inverse, and overlay surface. The
// fill · rest Source is the column's fill ANCHOR (re-derives the whole family coherently); every other
// Source and every state is a surgical per-mode colour OVERRIDE (brandState.overrides[mode][role] =
// {palette, step}; "Auto" clears it, reverting to the derived value). Cross-cutting behaviors (outline
// hover, disabled, icon colors) sit at the TOP — they govern every palette. Overrides only live on the
// customizable modes, so renderScreen renders the generated-note on the derived modes and this editor
// never runs there.
// A structural narrowing of the engine's `ResolvedRole`. `against` names the role this one's `ratio`
// is measured against — needed to judge a candidate step before it is picked (`contrastMark`).
type RoleRes = { hex: string; path?: string; ratio?: number; min?: number; against?: string; alpha?: number; tint?: { fill: string; opacity: number } };
type RoleMap = Record<string, RoleRes | undefined>;
const iRoles = (): RoleMap => (resolveAllModes(theme).find((x) => x.mode === currentMode)?.roles ?? {}) as RoleMap;
const stepsOf = (palette: string): string[] => (theme.palettes.find((p) => p.palette === palette)?.steps ?? []).map((s) => s.key);
const capWord = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// ---- "Auto" baselines (#330) -----------------------------------------------
// Every override/anchor picker's "Auto" option must NAME the step it actually resolves to — the
// engine's TRUE generated/contrast-placed baseline, independent of whatever is live right now. The
// naive way to get that label is `stepKeyOf(r.path)` off `iRoles()`/`resolveAllModes(theme)` — but
// those already reflect the CURRENT override/anchor, so the moment one goes active, "Auto" silently
// starts echoing the user's own last pick instead of the baseline it claims to be. Then clicking
// "Auto" (which genuinely clears the deviation and re-resolves) lands on a DIFFERENT value than the
// option just displayed — a control lying about its own behavior.
//
// Fixed by resolving a THEME CLONE with just the one live deviation removed, rather than patching
// the live (deviation-inclusive) resolved role — so this stays correct even if the engine ever
// derives one role's baseline from another role's own deviation (a per-field patch could not notice
// that; a full re-resolve always sees it). `baselineOf` is the shared primitive; `WITHOUT` names
// which deviation this particular control's own "Auto" clears — there are two, because the engine
// has two independent live-deviation layers, not one:
//   - baselineStepOf     — the A1 per-mode COLOUR-OVERRIDE layer (`theme.overrides`, written by
//                           `setFillOverride`). Every Source/Step select in the interactive matrix,
//                           the Surfaces fill/foreground/text editors, and Backgrounds → Inverse.
//   - baselineAnchorStepOf — the A2b per-mode FILL-ANCHOR layer (`theme.modeAnchors` / the column's
//                           global `actionAnchorStep`/`destructiveAnchorStep`/`interactivePalettes[
//                           ].anchorStep`, written by `col.setStep`). Only the interactive matrix's
//                           Fill · rest row for columns that anchor a family (primary/destructive/
//                           accents) — Neutral has no anchor and uses `baselineStepOf` like everything
//                           else.
// The three moved to `state/interactive-input.ts` in UI redesign S5.1 (`baselineOf`, `baselineStepOf`,
// `baselineAnchorStepOf`), unchanged; this page's callers read the mode in view.
const baselineStepOf = (roleKey: string, mode: Mode = currentMode): string => baselineStepIn(roleKey, mode);

/** `#rrggbb`(+alpha) → an `rgba()` string, so a translucent overlay wash paints honestly (a faint swatch). */
const rgbaOf = (r: RoleRes): string => {
  const h = (r.hex ?? '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${r.alpha ?? 1})`;
};

// ---- translucent roles (#1210) ---------------------------------------------
// The overlay washes are the only roles in this editor that COMPOSITE rather than cover, and both studio
// defects #1210 names follow from that one property rather than from the row's name — so both fixes key
// off the role's own `alpha`, and reach every row that renders a translucent role, not just the one in
// the screenshot. The token itself is correct throughout: `interactive.neutral.overlay.hover` is a 10%
// black wash on a light page and a 10% white one on a dark page, which is what it should be.

/** A role that composites over its ground instead of covering it. Its `hex` is the OPAQUE BASE — black or
 *  white — never the colour anyone sees, which `modes.ts` says outright at the scrim; the translucency
 *  lives only in `alpha`. Painting `hex` renders the wash as solid black, and painting the `rgba()` with
 *  no underlay renders it over whatever chrome happens to be behind. */
const isWash = (r: RoleRes): boolean => (r.alpha ?? 1) < 1;

/** A translucent role painted over the ground it DECLARES, so a swatch shows the composite a user would
 *  see rather than the wash over the studio's own furniture. A 10% black wash with no underlay picks up
 *  the card, the border and whatever sits beneath, and reads near-opaque.
 *
 *  The underlay is the role's own `against` — not a fixed light colour. The page wash flips polarity with
 *  the mode (`black-alpha` on a light page, `white-alpha` on a dark one) and the inverse twin flips the
 *  other way, so a pinned white would render half of these invisible: the same defect in the other
 *  direction. That is #555 in this file — `.exbox.dark` pinned `#0d0d10`, which is wrong in a Dark mode,
 *  where "inverse" resolves LIGHT — and `exGround` cured it by reading the resolved ground. This reads the
 *  ground the engine itself named, which is also the one its `ratio` was measured on. */
const washCss = (roles: RoleMap, r: RoleRes): string => {
  const ground = (r.against ? roles[r.against]?.hex : undefined) ?? roles['background.primary']?.hex ?? '#ffffff';
  const c = rgbaOf(r);
  return `linear-gradient(${c}, ${c}), ${ground}`;
};

/** The Source read-out for a wash — honest about the primitive, and deliberately NOT a picker.
 *
 *  This slot used to hold `stepPicker(neutral, …)`, which labelled the wash "Auto · neutral 10" and
 *  offered the neutral ramp's steps. Both halves were untrue. The primitive is `<ns>.black-alpha.10`, a
 *  translucent neutral — the neutral ramp has no step 10 to be. And picking from that list wrote
 *  `{palette: neutral, step}` through `setFillOverride`, which `modes.ts` applies by SPREADING over the
 *  existing role, so `alpha` survived: the role came out naming an opaque ramp step while still rendering
 *  at 10%. Removing the picker is not a lost capability, because the thing it wrote was incoherent.
 *
 *  Wears `.sf-derived` — the read-only Source treatment the Surfaces "Derived — not editable" rows
 *  already use, so "no control here" arrives in the vocabulary the app has rather than a new one. */
const washSourceRead = (r: RoleRes): HTMLElement => {
  // A `solid-tint` subtle fill (#1614) is the control's FILL at an opacity step: name those two, not the
  // fill's primitive — the step is what the engine chose, and the fill is set on the Fill row.
  if (r.tint) {
    const n = hook(el('span', 'sf-derived', `fill at ${r.tint.opacity}%`), 'source-readout');
    n.title = 'The button’s own fill at an opacity step, chosen to keep the hover label readable and the hover visible. Change the fill to change its color.';
    return n;
  }
  const parts = (r.path ?? '').split('.');
  const n = hook(el('span', 'sf-derived', parts.length >= 2 ? `${parts[parts.length - 2]} ${stepKeyOf(r.path)}` : (r.path ?? '—')), 'source-readout');
  n.title = 'A translucent wash has no ramp step to swap in — a step of the neutral ramp is opaque, and would replace the wash rather than retint it.';
  return n;
};

/** A per-mode colour-override Source control for one role. "Auto" clears the override (the role reverts to
 *  its derived value); a step pins the role to that primitive (the engine re-derives its contrast and
 *  warns — never blocks — if a hand pick misses the floor). Reuses the generic override writer the
 *  Surfaces foreground editor uses (`setFillOverride`).
 *
 *  A WASH gets a read-out instead, for the reasons on `washSourceRead` — and `roles` is a parameter rather
 *  than an `iRoles()` call inside precisely so that check cannot be skipped by a caller who does not know
 *  it exists. `palette` is inert on that branch; every call site passes it because most roles are not
 *  washes and the argument is the same one either way. */
const roleSourceSelect = (roles: RoleMap, roleKey: string, palette: string, derivedStep: string): HTMLElement => {
  const r = roles[roleKey];
  if (r && isWash(r)) return washSourceRead(r);
  const cur = brandState.overrides?.[currentMode]?.[roleKey]?.step;
  return stepPicker(palette, stepsOf(palette), derivedStep, typeof cur === 'string' ? cur : undefined,
    (step) => setFillOverride(roleKey, palette, step), contrastMark(roleKey, palette));
};

/** #1384 — the INVERSE FILL Source. Its "Auto" is now the CRISP ABSOLUTE: pure `white` on the dark inverse
 *  band (light-family modes), pure `black` on the near-white band (dark-family modes) — the #1384 default,
 *  a light-label CTA that reads crisp rather than brand-tinted. The override list offers WHITE + NEUTRAL as
 *  pinnable sources alongside the assigned palette's own steps (owner: overridable to another palette / neutral
 *  fill), each contrast-marked against the inverse ground (non-text 3:1) like every other picker. One select
 *  spans two ramps by encoding the palette in the option value. White itself is the default (Auto), not a
 *  stored override — the override layer stores (palette, step) pairs, and white is a bare primitive, so Auto
 *  IS the white source and names it as such. */
const invFillSourceSelect = (roleKey: string, assignedPalette: string, neutralPalette: string): HTMLSelectElement => {
  const sel = selectEl('cap');
  const curOv = brandState.overrides?.[currentMode]?.[roleKey];
  const cur = typeof curOv?.step === 'string' ? `${curOv.palette}::${curOv.step}` : undefined;
  const absName = baselineStepOf(roleKey);                 // 'white' (light family) / 'black' (dark family)
  sel.append(optionEl('', `Auto · ${absName} (crisp)`, cur == null));
  const addPalette = (pal: string): void => {
    const mark = contrastMark(roleKey, pal);
    for (const s of stepsOf(pal)) sel.append(optionEl(`${pal}::${s}`, `${pal} ${s}${mark?.(s) ?? ''}`, cur === `${pal}::${s}`));
  };
  addPalette(assignedPalette);
  if (neutralPalette !== assignedPalette) addPalette(neutralPalette);
  sel.onchange = () => { setInverseFillSource(currentMode, roleKey, assignedPalette, sel.value); applyFull(); };
  return sel;
};

/** Marks the steps that SATISFY a contrast-gated role, in the picker, before the pick is made.
 *
 *  Overrides apply-but-warn by design (`modes.ts`) — deliberately, since a UI that refused the option
 *  would be false assurance: the same override is authorable through `design.md`/`BrandInput`, which
 *  the engine accepts, so blocking here would hide the capability from one surface without protecting
 *  the artifact. Only the engine can guarantee, and whether it should CLAMP instead of warn is a
 *  layer-wide question (#320), not a per-role one.
 *
 *  So this informs rather than blocks: the warning stays as the backstop, and the picker stops being
 *  the place you discover the problem only after choosing. Applies to every contrast-gated override
 *  picker, not just one row — the same reasoning holds everywhere the layer is used.
 *
 *  Marks the PASSING steps, not the failing ones. On a subtle tint only ~4 of 20 steps clear the label,
 *  so flagging failures put a warning on 80% of the list — technically accurate and useless, since a
 *  list that is nearly all warnings reads as noise rather than guidance. The short list is the useful
 *  signal, so it is the one that gets marked. (Interim: if #320 lands on clamping, the failing steps
 *  stop being reachable and this can go back to being a plain list.)
 *
 *  Contrast is symmetric, so one comparison covers both directions — a role that IS a surface
 *  (`subtle-fill`, measured against its state ink) and a role that sits ON one (text against a
 *  background) use the same formula.
 *
 *  Returns undefined — not a no-op marker — when the role states no contract, is absent in this mode,
 *  or is measured against `self`. That distinction matters under inversion: within a picker either
 *  NOTHING is marked (no contract to judge) or the passing steps are, so an unmarked option is never
 *  ambiguous between "fails" and "wasn't judged". */
const contrastMark = (roleKey: string, palette: string): ((step: string) => string) | undefined => {
  const roles = iRoles();
  const r = roles[roleKey];
  const min = r?.min ?? 0;
  if (!r || min <= 0 || !r.against || r.against === 'self') return undefined;
  const againstHex = roles[r.against]?.hex;
  if (!againstHex) return undefined;                       // nothing resolvable to compare against
  const againstRgb = hexToRgb(againstHex);
  const steps = theme.palettes.find((p) => p.palette === palette)?.steps ?? [];
  // States the number rather than a bare tick: the minimum is 4.5 for text and 3 for non-text, so
  // "✓" alone would hide WHICH bar a step clears.
  const label = ` · ✓ ${String(min).replace(/\.0$/, '')}:1`;
  return (step: string): string => {
    const s = steps.find((x) => x.key === step);
    if (!s) return '';
    return contrast(hexToRgb(s.hex), againstRgb) >= min ? label : '';
  };
};

// ---- examples (locked right) ----------------------------------------------
/** #291 — click-to-pin the pressed state on a live example. `:hover` already gives the transient hover
 *  feel; a bare `:active` vanishes the instant the mouse releases, too fleeting to actually evaluate a
 *  pressed color, so a click toggles a HELD `.is-pressed` state instead (click again to release). Only
 *  wired when a pressed color was actually resolved (`exBtn`/`exLink`/`exOutline` call this conditionally). */
const wirePress = (n: HTMLElement): void => {
  // the held-pressed affordance, worn by the example button/link/outline atoms
  addClass(n, mix('pinnable'));
  n.title = 'Click to hold the pressed state';
  n.onclick = (e) => { e.preventDefault(); n.classList.toggle('is-pressed'); };
};
// #555 — `.exbox` carried no background (transparent, so a `text.rest`/`inverse.text.rest` ink
// resolved for the CURRENT mode fell through to the studio's own always-light chrome behind it), and
// `.exbox.dark` hardcoded `#0d0d10` (correct only when "inverse" means dark, which is false in a Dark
// mode — dark's inverse resolves LIGHT). Both specimens are meant to sit on the ground their ink was
// actually measured against: `background.primary` for the regular treatment, `inverse.background.primary`
// for the inverse one, both read for `currentMode` so they track whichever way that mode's inverse falls.
const exGround = (dark: boolean): string => iRoles()[dark ? 'inverse.background.primary' : 'background.primary']?.hex ?? (dark ? '#0d0d10' : '#ffffff');
const exBtn = (bg: string, fg: string, dark = false, label = 'Button', hover?: string, pressed?: string): HTMLElement => {
  const box = hook(el('div', 'exbox' + (dark ? ' dark' : '')), 'example-ground'); box.style.background = exGround(dark);
  const b = hook(el('span', 'ibtn'), 'example-button'); b.style.setProperty('--ibtn-bg', bg); specimen(b).style.color = fg;
  if (hover) b.style.setProperty('--ibtn-hbg', hover);
  if (pressed) { b.style.setProperty('--ibtn-pbg', pressed); wirePress(b); }
  b.append(document.createTextNode(label), iconEl('arrow', fg));
  box.append(b); return box;
};
const exLink = (color: string, dark = false, hover?: string, pressed?: string): HTMLElement => {
  const box = hook(el('div', 'exbox' + (dark ? ' dark' : '')), 'example-ground'); box.style.background = exGround(dark);
  const a = el('a', 'ilink', 'Text link'); a.style.setProperty('--ilink-fg', color);
  if (hover) a.style.setProperty('--ilink-hfg', hover);
  if (pressed) { a.style.setProperty('--ilink-pfg', pressed); wirePress(a); }
  box.append(a); return box;
};
/** The outline edge for one interactive prefix, at one state. `interactive.<c>.border.<state>` is the
 *  role (#1231); the text ink is the fallback because it is also what the border DERIVES from — so a
 *  brand whose border role didn't resolve falls back to the same color it would have got, not a guess. */
const edgeOf = (roles: RoleMap, prefix: string, state = 'rest'): string =>
  roles[`${prefix}.border.${state}`]?.hex ?? roles[`${prefix}.text.${state}`]?.hex ?? '#000000';
/** The outline specimen. The EDGE and the INK are separate (#576): `border.*` follows the text ink by
 *  default but is independently overridable, so a specimen painting both from one color could not show a
 *  pinned border at all — the edge would keep tracking the ink, and the Border row would read as a
 *  control that does nothing. `o.ink` defaults to `edge`, so every caller that legitimately has one color
 *  stays unchanged.
 *
 *  Pinnable when EITHER the wash or the edge carries a pressed value. Keying it off the wash alone left
 *  the one row this parameter exists for unable to reach its own pressed color: the border row's edge
 *  moves on press and its wash never does. */
const exOutline = (edge: string, wash: string, dark = false, hoverWash?: string, pressedWash?: string,
                   o: { ink?: string; pressedInk?: string; icon?: string; hoverEdge?: string; pressedEdge?: string } = {}): HTMLElement => {
  const box = hook(el('div', 'exbox' + (dark ? ' dark' : '')), 'example-ground'); box.style.background = exGround(dark);
  const ink = o.ink ?? edge;
  const b = hook(el('span', 'ibtn'), 'example-button'); b.style.setProperty('--ibtn-bg', wash); specimen(b).style.color = ink;
  b.style.setProperty('--ibtn-bw', '1.5px'); b.style.setProperty('--ibtn-bd', edge);
  if (o.hoverEdge) b.style.setProperty('--ibtn-hbd', o.hoverEdge);
  if (o.pressedEdge) b.style.setProperty('--ibtn-pbd', o.pressedEdge);
  if (hoverWash) b.style.setProperty('--ibtn-hbg', hoverWash);
  if (pressedWash) b.style.setProperty('--ibtn-pbg', pressedWash);
  if (pressedWash || o.pressedEdge) wirePress(b);
  // #812 — a held press swaps the ink too, when the caller names the pressed ink, so the pressed state
  // previews the pair a component binds (`text.pressed` on the pressed wash) rather than the rest ink
  // carried onto a fill it is never drawn on.
  if (o.pressedInk && (pressedWash || o.pressedEdge)) {
    const restInk = ink, pressedInk = o.pressedInk;
    b.onclick = (e) => { e.preventDefault(); b.style.color = b.classList.toggle('is-pressed') ? pressedInk : restInk; };
  }
  // #1617 — the glyph draws from its OWN role (`interactive.<c>.icon.*`) when the caller passes one, so a
  // label/icon divergence is visible here rather than masked by painting both with the label ink.
  b.append(document.createTextNode('Outline'), iconEl('arrow', o.icon ?? ink));
  box.append(b); return box;
};
const exIconLabel = (iconColor: string, textColor: string, dark = false): HTMLElement => {
  const box = hook(el('div', 'exbox' + (dark ? ' dark' : '')), 'example-ground'); box.style.background = exGround(dark);
  const row = el('span', 'inote'); specimen(row).style.color = textColor;
  const ic = el('span', 'inote-ic'); specimen(ic).style.color = iconColor; ic.append(iconEl('bell', iconColor));
  row.append(ic, document.createTextNode('Notifications')); box.append(row); return box;
};
/** Bare text on the panel — a specimen for a role rated against the PAGE rather than against a fill
 *  (`disabled.text`). Deliberately has no button chrome: drawing it as a button would imply a fill it is
 *  not measured against, which is the mistake the disabled section's own copy used to make in words. */
const exTextOnPage = (color: string, label: string): HTMLElement => {
  const box = hook(el('div', 'exbox'), 'example-ground'); box.style.background = exGround(false);
  const t = el('span', 'inote', label); specimen(t).style.color = color;
  box.append(t); return box;
};
/** The example column: an example box + an optional contrast receipt below it. */
const iExample = (inner: HTMLElement, badge?: HTMLElement): HTMLElement => {
  const aex = hook(el('div', 'aex'), 'role-example'); aex.append(inner); if (badge) aex.append(badge); return aex;
};
/** Two labeled specimens side by side in the example column (rest→hover, filled→outline, match→distinct).
 *  Each may carry its OWN contrast receipt as a third tuple slot — per specimen, not per row, because two
 *  specimens can be rated against different grounds and clear different ratios (`disabled.on-fill` is
 *  measured on the disabled fill, `disabled.text` on the page). One receipt for the pair would have to
 *  pick one of them and silently drop the other.
 *
 *  The pair is an `.aex-two` ROW nested in the `.aex` column — not one element carrying both classes, as
 *  it was before it could take a badge. `.aex` is the column that stacks a specimen over its receipt
 *  (`iExample` relies on exactly that), so a two-up that also wants a receipt needs the row and the
 *  column to be two boxes. Nesting unconditionally, rather than only when a badge is passed, keeps one
 *  layout to reason about — and retired a reviewed class pairing instead of moving it
 *  somewhere the scanner can't see. */
type TwoUpSpec = [string, HTMLElement] | [string, HTMLElement, HTMLElement | undefined];
const twoUp = (a: TwoUpSpec, b: TwoUpSpec): HTMLElement => {
  const row = el('div', 'aex-two');
  for (const [label, node, badge] of [a, b]) {
    const s = el('div', 'aex-spec'); s.append(el('span', 'pfk', label), node);
    if (badge) s.append(badge);
    row.append(s);
  }
  const wrap = hook(el('div', 'aex'), 'role-example'); wrap.append(row);
  return wrap;
};
const iBadge = (r: RoleRes | undefined): HTMLElement | undefined =>
  r && r.ratio != null && r.min != null && r.min > 0 ? contrastBadge(r.ratio, r.min) : undefined;

// ---- rows -----------------------------------------------------------------
/** The two-up Hover/Pressed states strip below a slot row — each state its own swatch + override select.
 *  States absent in this mode are dropped; an empty strip returns null.
 *
 *  A wash state paints as its composite, not as `r.hex` (#1210): every Hover/Pressed cell of the overlay
 *  row rendered solid black here, because a wash's `hex` is its opaque base. Fixing only the row's own
 *  swatch would have left the identical untruth two rows down, at three times the count. */
const iStates = (roles: RoleMap, palette: string, cells: Array<[string, string]>): HTMLElement | null => {
  const g = el('div', 'astates-g'); let any = false;
  for (const [name, roleKey] of cells) {
    const r = roles[roleKey]; if (!r) continue; any = true;
    const cell = hook(el('div', 'astate'), 'role-state');
    const head = el('div', 'astate-h');
    head.append(hook(swatch(isWash(r) ? washCss(roles, r) : r.hex, 'astate-sw'), 'role-state-swatch'), hook(el('span', 'astate-n', name), 'role-state-name'));
    cell.append(head, roleSourceSelect(roles, roleKey, palette, baselineStepOf(roleKey)));
    g.append(cell);
  }
  if (!any) return null;
  const wrap = hook(el('div', 'astates'), 'role-states'); wrap.append(el('div', 'astates-h', 'Interactive states'), g); return wrap;
};

/** One matrix row: 56×56 swatch (omitted on `lead` control rows) · mid (label + Source select + token pill
 *  + description) · locked-right example · optional states strip. */
const iRow = (o: { lead?: boolean; swatchBg?: string; label?: string; srcLabel?: string; select: HTMLElement; pill?: string; desc?: string; warn?: string; example: HTMLElement; states?: HTMLElement | null }): HTMLElement => {
  const row = hook(el('div', 'arow' + (o.lead ? ' arow-lead' : '')), o.lead ? 'role-lead' : 'role-row');
  const main = el('div', 'arow-main');
  if (!o.lead) main.append(hook(swatch(o.swatchBg ?? '#000000', 'asw'), 'role-swatch'));
  const mid = hook(el('div', 'amid'), 'role-body');
  if (o.label) mid.append(el('div', 'alabel', o.label));
  const ctl = hook(el('div', 'sf-ctlblock'), 'role-source');
  // A chip group (#1675) names itself with its `<legend>`, the lever label, which takes the place of
  // the small caption a select is given here. Both would name one control twice.
  if (!(o.select instanceof HTMLFieldSetElement)) ctl.append(el('span', 'pfk', o.srcLabel ?? 'Source'));
  ctl.append(o.select); mid.append(ctl);
  if (o.pill) mid.append(tokenPill(o.pill));
  if (o.desc) mid.append(el('p', 'adesc', o.desc));
  if (o.warn) mid.append(el('p', 'fz-warn', o.warn));
  main.append(mid, o.example);
  row.append(main);
  if (o.states) row.append(o.states);
  return row;
};

/** An override-backed slot row (every slot except fill · rest, which anchors). null when it doesn't resolve.
 *
 *  `inverse` is a flag rather than part of `slot` because #1140 moved the marker OUT of the slot and to
 *  the front of the role: `inverse.interactive.<name>.<slot>`, where it used to be
 *  `interactive.<name>.inverse.<slot>` and a caller could spell it inside `slot` unaided. */
const slotRow = (o: { name: string; slot: string; label: string; palette: string; desc: string; example: (roles: RoleMap) => HTMLElement; badgeRole?: string; states?: Array<[string, string]>; inverse?: boolean; invFillSources?: boolean }): HTMLElement | null => {
  const roles = iRoles();
  const roleKey = `${o.inverse ? 'inverse.' : ''}interactive.${o.name}.${o.slot}`;
  const r = roles[roleKey]; if (!r) return null;
  return iRow({
    swatchBg: r.hex, label: o.label,
    // #1384 — the inverse fill row offers white + neutral as pinnable sources; every other row keeps the
    // single-palette override select.
    select: o.invFillSources ? invFillSourceSelect(roleKey, o.palette, theme.roleToPalette.neutral) : roleSourceSelect(roles, roleKey, o.palette, baselineStepOf(roleKey)),
    pill: colorPath(roleKey), desc: o.desc, example: iExample(o.example(roles), iBadge(roles[o.badgeRole ?? roleKey])),
    states: o.states ? iStates(roles, o.palette, o.states) : null,
  });
};

/** A single interactive column. `name` is the `interactive.<name>.*` role suffix (built-ins primary /
 *  neutral / destructive, accents `name ?? palette`). `setStep` present ⇒ the fill · rest Source is the
 *  column's fill anchor (re-derives the family); absent (neutral) ⇒ a plain fill · rest override. */
type ICol = { name: string; title: string; desc: string; palette: string; stepValue?: number; setStep?: (v: number | undefined) => void; onRemove?: () => void; lead?: HTMLElement | null };

/** The fill · rest row — its Source is the column's fill ANCHOR (re-derives the family) when the column
 *  has one (primary / destructive / accents); neutral has no anchor (its emphasis lead drives the fill),
 *  so it falls back to a plain override select. Hover / pressed are override sub-states. */
const fillRestRow = (col: ICol): HTMLElement | null => {
  const roles = iRoles();
  const r = roles[`interactive.${col.name}.fill.rest`]; if (!r) return null;
  const onFill = roles[`interactive.${col.name}.on-fill`];
  let select: HTMLElement;
  let warn: string | undefined;
  if (col.setStep) {
    const steps = stepsOf(col.palette);
    select = stepPicker(col.palette, steps, baselineAnchorStepOf(`interactive.${col.name}.fill.rest`, currentMode, col.name),
      steps.find((k) => Number(k) === col.stepValue), (step) => col.setStep!(step === undefined ? undefined : Number(step)));
    // Apply-but-warn, like every other override in this file (#331). A pin that misses the floor
    // is APPLIED — the swatch, the example and the derived hover/pressed all show the step you
    // actually picked — and the miss is reported here. It used to substitute the nearest passing
    // step instead, which meant the one thing you could never see was the consequence of your own
    // choice; and the same pin authored through `design.md`/`BrandInput` was honoured anyway, so
    // the substitution protected nothing. Warn off the RESOLVED ratio rather than off
    // requested-vs-effective: with the pin applied those two are now always equal.
    const min = r.min ?? 0, ratio = r.ratio ?? Infinity;
    if (min > 0 && ratio < min)
      warn = `${stepKeyOf(r.path)} doesn't clear the contrast floor here — ${ratio.toFixed(2)}:1 against ${r.against}, needs ${min}:1. Applied as picked; hover, pressed, text and on-fill all derive from it.`;
  } else {
    select = roleSourceSelect(roles, `interactive.${col.name}.fill.rest`, col.palette, baselineStepOf(`interactive.${col.name}.fill.rest`));
  }
  return iRow({
    swatchBg: r.hex, label: 'Fill · rest', select, pill: colorPath(`interactive.${col.name}.fill.rest`),
    desc: 'The button / container fill. This anchors the family — hover, pressed, text and on-fill derive from it unless you override them below.',
    warn,
    example: iExample(exBtn(r.hex, onFill?.hex ?? '#ffffff', false, 'Button',
      roles[`interactive.${col.name}.fill.hover`]?.hex, roles[`interactive.${col.name}.fill.pressed`]?.hex), iBadge(onFill)),
    states: iStates(roles, col.palette, [['Hover', `interactive.${col.name}.fill.hover`], ['Pressed', `interactive.${col.name}.fill.pressed`]]),
  });
};

/** The overlay-wash row — the translucent hover/pressed tint for this palette's outline & text actions.
 *  The wash is a neutral ALPHA primitive, so the swatch, the states strip and the Source slot all go
 *  through the wash treatment above (#1210) rather than through the ordinary opaque path: paint the
 *  composite over the declared ground, and read the primitive out instead of offering ramp steps. */
const overlayRow = (col: ICol): HTMLElement | null => {
  const roles = iRoles();
  const r = roles[`interactive.${col.name}.overlay.hover`]; if (!r) return null;
  // Inert on this row — every role it reaches is a wash, so `roleSourceSelect` takes the read-out branch
  // and never binds a ramp. Passed anyway because the argument is not optional: a caller must not be able
  // to omit it and quietly get a picker for a role that should not have one.
  const nPal = theme.roleToPalette.neutral;
  // The edge comes from the BORDER role, the ink from the text role (#576). They were one read until the
  // Border row made them independently pinnable; painting both from the ink would have shown this row's
  // wash inside a border that silently ignored the neighboring row's override.
  const edge = edgeOf(roles, `interactive.${col.name}`);
  // #812 — the ink is the HOVER text, because that is the pair a component draws on this wash: the Button
  // binds `outline.label.hover` to `interactive.<c>.text.hover` over `outline.overlay.hover`. The row used to
  // paint `text.rest` here, a pair no component renders (aurora Dark primary: 3.83:1, where the shipped pair
  // is 5.35:1). Pressed swaps to `text.pressed` on the pressed wash, the Button's pressed pair.
  const hoverInk = roles[`interactive.${col.name}.text.hover`];
  const pressedInk = roles[`interactive.${col.name}.text.pressed`];
  const pressed = roles[`interactive.${col.name}.overlay.pressed`];
  // The receipt is for the pair ON SCREEN: the hover ink over the hover wash composited onto the ground the
  // wash declares, held to the hover ink's own contract. Neither half is the wash role's own `ratio`, which
  // rates `text.primary` (its `legibleFor`) and would put a pass beside any ink.
  const ground = (r.against ? roles[r.against]?.hex : undefined) ?? roles['background.primary']?.hex;
  const badge = hoverInk && ground && (hoverInk.min ?? 0) > 0
    ? contrastBadge(contrast(hexToRgb(hoverInk.hex), composite(hexToRgb(ground), hexToRgb(r.hex), r.alpha ?? 1)), hoverInk.min!)
    : undefined;
  return iRow({
    swatchBg: washCss(roles, r), label: 'Overlay wash',
    select: roleSourceSelect(roles, `interactive.${col.name}.overlay.hover`, nPal, baselineStepOf(`interactive.${col.name}.overlay.hover`)),
    pill: colorPath(`interactive.${col.name}.overlay.hover`),
    // Names the ground, and says what the primitive is NOT. The old copy said the wash "composites over
    // any surface" — true of the mechanism and false of the result, which is exactly the claim #892
    // retired from the engine's own `$description` when it gave the inverse band its own opposite-polarity
    // wash. This surface kept saying it after the engine stopped.
    desc: 'The translucent hover / pressed wash for this palette’s outline & text actions — a neutral alpha primitive composited over the page surface it is measured against, so there is no ramp step to swap in.',
    // The row's rest swatch already IS the hover wash (there's no "rest" overlay to show — the wash only
    // ever appears on hover/pressed), so only pressed needs wiring here; a :hover cue would be a no-op.
    example: iExample(exOutline(edge, rgbaOf(r), false, undefined, pressed ? rgbaOf(pressed) : undefined,
      { ink: hoverInk?.hex, pressedInk: pressedInk?.hex }), badge),
    states: iStates(roles, nPal, [['Hover', `interactive.${col.name}.overlay.hover`], ['Pressed', `interactive.${col.name}.overlay.pressed`]]),
  });
};

/** The subtle-tint row — the TINTED sibling of the overlay wash (#288), shown only when
 *  `outlineInteraction: solid-tint` is the method (the role is absent otherwise, so this returns null
 *  and the row self-hides, same as `overlayRow` does under the other methods).
 *
 *  Since #1614 the tint is the column's own FILL at an opacity step (translucent), so there is no ramp
 *  step to pick: `roleSourceSelect` reads a wash out rather than offering a picker, and the swatches are
 *  composited over the ground the role names (`washCss`), exactly as the Overlay wash row's are. The
 *  role's `ratio`/`min` are the hover label on that composite, so a failing one still says so here. */
const subtleFillRow = (col: ICol): HTMLElement | null => {
  const roles = iRoles();
  const r = roles[`interactive.${col.name}.subtle-fill.hover`]; if (!r) return null;
  const pressed = roles[`interactive.${col.name}.subtle-fill.pressed`];
  const edge = edgeOf(roles, `interactive.${col.name}`);   // the border role, not the ink (#576)
  const ink = roles[`interactive.${col.name}.text.rest`]?.hex;
  const short = (n: number) => n.toFixed(2).replace(/\.00$/, '');
  return iRow({
    swatchBg: washCss(roles, r), label: 'Subtle tint',
    select: roleSourceSelect(roles, `interactive.${col.name}.subtle-fill.hover`, col.palette, baselineStepOf(`interactive.${col.name}.subtle-fill.hover`)),
    pill: colorPath(`interactive.${col.name}.subtle-fill.hover`),
    desc: 'The hover / pressed fill for this palette’s outline & text actions — the button’s own fill at 20% opacity (30% pressed), so the control keeps its color. Steps lower if the label needs more contrast, higher if the hover would not show.',
    // `min`/`ratio` are optional on the resolved role, so a missing pair means "no contract stated" —
    // which must read as no warning, not as a failed one.
    warn: (r.min ?? 0) > 0 && (r.ratio ?? Infinity) < (r.min ?? 0)
      ? `This tint leaves the hover label at ${short(r.ratio ?? 0)}:1, under the ${short(r.min ?? 0)}:1 it needs even at the lowest opacity step — pick a lighter fill, or the text stops being readable on hover.`
      : undefined,
    example: iExample(exOutline(edge, rgbaOf(r), false, undefined, pressed ? rgbaOf(pressed) : undefined, { ink })),
    states: iStates(roles, col.palette, [
      ['Hover', `interactive.${col.name}.subtle-fill.hover`],
      ['Pressed', `interactive.${col.name}.subtle-fill.pressed`],
    ]),
  });
};

/** The Border row's description. Neutral gets an extra sentence because its three states resolve to the
 *  SAME step — its ink is picked as the most extreme rung of the ramp with nowhere further to walk, so the
 *  edge holds still on hover by design (#576, decided). Three identical swatches with no explanation is
 *  exactly what made a working section look broken in #561; saying so here is cheaper than a designer
 *  concluding the selects are dead. */
const borderDesc = (name: string, inverse: boolean): string =>
  (inverse
    ? 'The outline control’s edge on a dark / inverse surface. Follows that band’s text ink by default — pin a step to let the edge differ from the label it surrounds.'
    : 'The outline control’s edge. Follows the text ink by default — pin a step to let the edge differ from the label it surrounds.')
  + (name === 'neutral'
    ? ' Neutral’s ink is already the far end of its ramp, so all three states land on one step and the edge holds still on hover unless you pin them apart.'
    : '');

/** One action-palette section: header (+ optional remove) · optional lead control · the slot rows. */
const renderPaletteSection = (col: ICol): HTMLElement | null => {
  const roles = iRoles();
  if (!roles[`interactive.${col.name}.fill.rest`]) return null;
  const sec = el('div', 'psec');
  const head = hook(el('div', 'psec-h'), 'section-head'); head.append(hook(el('p', 'psec-t', col.title), 'section-title'));
  if (col.onRemove) head.append(removeButton(col.onRemove, 'Remove interactive color', 'rmv'));
  sec.append(head, el('p', 'psec-d', col.desc));
  if (col.lead) sec.append(col.lead);
  // `inv` is the whole inverse role PREFIX, not a name fragment — since #1140 the marker leads the
  // path (`inverse.interactive.primary.fill.rest`), so there is nothing for a `interactive.${…}` outer
  // template to wrap and every lookup below reads `${inv}.<slot>` directly.
  const P = col.palette, nm = col.name, inv = `inverse.interactive.${nm}`, nPal = theme.roleToPalette.neutral;
  const rows: Array<HTMLElement | null> = [
    fillRestRow(col),
    slotRow({ name: nm, slot: 'fill.rest', inverse: true, label: 'Fill · inverse', palette: P, invFillSources: true,
      desc: 'The button fill on a dark / inverse surface — crisp white by default (#1384). Pin white, a neutral step, or a palette step; each is contrast-marked.',
      example: (rs) => exBtn(rs[`${inv}.fill.rest`]?.hex ?? '#ffffff', rs[`${inv}.on-fill`]?.hex ?? '#000000', true, 'Button',
        rs[`${inv}.fill.hover`]?.hex, rs[`${inv}.fill.pressed`]?.hex),
      badgeRole: `${inv}.on-fill`,
      states: [['Hover', `${inv}.fill.hover`], ['Pressed', `${inv}.fill.pressed`]] }),
    slotRow({ name: nm, slot: 'text.rest', label: 'Text · rest', palette: P,
      desc: 'Text links & text buttons on light surfaces.',
      example: (rs) => exLink(rs[`interactive.${nm}.text.rest`]?.hex ?? '#000000', false,
        rs[`interactive.${nm}.text.hover`]?.hex, rs[`interactive.${nm}.text.pressed`]?.hex),
      states: [['Hover', `interactive.${nm}.text.hover`], ['Pressed', `interactive.${nm}.text.pressed`]] }),
    slotRow({ name: nm, slot: 'text.rest', inverse: true, label: 'Text · inverse', palette: P,
      desc: 'Text links & text buttons on dark / inverse surfaces.',
      example: (rs) => exLink(rs[`${inv}.text.rest`]?.hex ?? '#ffffff', true,
        rs[`${inv}.text.hover`]?.hex, rs[`${inv}.text.pressed`]?.hex),
      states: [['Hover', `${inv}.text.hover`], ['Pressed', `${inv}.text.pressed`]] }),
    // #576 — the outline control's EDGE, per family and per state, on the page band and the inverse one.
    // PER-COLUMN rather than one shared control because each family resolves it from a different ramp:
    // primary from the action palette, destructive from danger, neutral from the neutral ramp, an accent
    // from its own. That divergence is the thing a single shared select could not express.
    //
    // Present under every `outlineInteraction` method including `none` — measured on all six corpus
    // themes — which is the method where it matters most, since with no hover wash the edge and the ink
    // are the only things carrying the state.
    slotRow({ name: nm, slot: 'border.rest', label: 'Border · rest', palette: P,
      desc: borderDesc(nm, false),
      example: (rs) => exOutline(edgeOf(rs, `interactive.${nm}`), 'transparent', false, undefined, undefined, {
        ink: rs[`interactive.${nm}.text.rest`]?.hex, icon: rs[`interactive.${nm}.icon.rest`]?.hex,
        hoverEdge: rs[`interactive.${nm}.border.hover`]?.hex, pressedEdge: rs[`interactive.${nm}.border.pressed`]?.hex }),
      states: [['Hover', `interactive.${nm}.border.hover`], ['Pressed', `interactive.${nm}.border.pressed`]] }),
    slotRow({ name: nm, slot: 'border.rest', inverse: true, label: 'Border · inverse', palette: P,
      desc: borderDesc(nm, true),
      example: (rs) => exOutline(edgeOf(rs, inv), 'transparent', true, undefined, undefined, {
        ink: rs[`${inv}.text.rest`]?.hex, icon: rs[`${inv}.icon.rest`]?.hex,
        hoverEdge: rs[`${inv}.border.hover`]?.hex, pressedEdge: rs[`${inv}.border.pressed`]?.hex }),
      states: [['Hover', `${inv}.border.hover`], ['Pressed', `${inv}.border.pressed`]] }),
    overlayRow(col),
    subtleFillRow(col),   // #288 — the opaque sibling; only one of the two is ever non-null
    slotRow({ name: nm, slot: 'on-fill', label: 'On-fill text', palette: nPal,
      desc: 'The ink on the fill — auto-picked to clear contrast on the button surface.',
      example: (rs) => exBtn(rs[`interactive.${nm}.fill.rest`]?.hex ?? '#000000', rs[`interactive.${nm}.on-fill`]?.hex ?? '#ffffff') }),
    slotRow({ name: nm, slot: 'on-fill', inverse: true, label: 'On-fill text · inverse', palette: nPal,
      desc: 'The ink on the inverse (light) fill — button text on a dark surface.',
      example: (rs) => exBtn(rs[`${inv}.fill.rest`]?.hex ?? '#ffffff', rs[`${inv}.on-fill`]?.hex ?? '#000000', true) }),
  ];
  for (const rw of rows) if (rw) sec.append(rw);
  return sec;
};

// ---- Links — the single global link role (#1487 → editor #1510) ----------
// Links are ONE global role (#1486): `text.link.*` / `icon.link.*` with their inverse twins, derived
// from the action ramp at the ink bar and stepped by a perceptual interval so the engaged states stay
// distinct even where the base sits deep in the ramp. There are no neutral or accent link roles — a
// "destructive link" is the destructive palette in a text treatment, which the sections above already
// carry. #1487 surfaced the role read-only because the lever was deferred (#1486); #1510 makes this
// section an EDITOR on two axes. (1) The GLOBAL rung lever (`linkStateRungs`) — a rung picker per engaged
// state on the page text family, mode- and family-invariant, the cross-mode default that moves every
// family together. (2) PER-MODE ABSOLUTE pins — every family's resting-link picker pins an exact color
// for the current mode, winning over the rung default and re-anchoring that family; the engine holds each
// pinned link to its contrast floor, so an absolute pick can never render a link below contract.
//
// State order is the depth order the engine walks — default → hover → pressed → visited — with
// `focused` last. `default` (and `focused`, which follows it) is the resting link — the action-palette
// anchor, not this lever — so only hover/pressed/visited are editable. Focused is a color no-op by
// design (the focus ring carries focus; the ink does not shift), shown rather than dropped.
const LINK_STATE_ROWS: Array<[string, string]> = [
  ['Default', 'default'], ['Hover', 'hover'], ['Pressed', 'pressed'], ['Visited', 'visited'], ['Focused', 'focused'],
];

// The engaged link states the per-state override lever (#1510) reaches — hover / pressed / visited. The
// resting `default` (and `focused`, which follows it) is the action-palette anchor, not this lever.
const LINK_ENGAGED = new Set(['hover', 'pressed', 'visited']);
const LINK_RUNG_MAX = 8;
/** Write the global per-state link override (#1510). `rung` is a step count past the resting link;
 *  undefined ("Auto") clears that state back to the tuned walk. The lever is mode- and family-invariant —
 *  one control moves every `link.*` family in both modes — so no per-mode bookkeeping here. */
const setLinkRung = (state: 'hover' | 'pressed' | 'visited', rung: number | undefined): void => {
  setLinkRungIn(state, rung);   // `state/interactive-input.ts` (UI redesign S5.1)
  applyFull();
};
/** The rung picker for one engaged link state — the Links section's role-editor control (#1510). "Auto"
 *  keeps the tuned perceptual walk (#1486); a number pins how many steps past the resting link the state
 *  sits (floor-clamped by the engine, so a pick can respace but never drop the link below its contract). */
const linkRungPicker = (state: 'hover' | 'pressed' | 'visited'): HTMLSelectElement => {
  const sel = selectEl('cap');
  const cur = brandState.linkStateRungs?.[state];
  sel.append(optionEl('', 'Auto', cur == null));
  for (let k = 1; k <= LINK_RUNG_MAX; k++) sel.append(optionEl(String(k), `${k} step${k > 1 ? 's' : ''}`, cur === k));
  sel.onchange = () => setLinkRung(state, sel.value === '' ? undefined : Number(sel.value));
  return sel;
};

/** The per-mode ABSOLUTE link override (#1510) for ONE family. Where the rung lever is the cross-mode
 *  DEFAULT that moves every family together, this pins an EXACT color for THIS family in the CURRENT mode
 *  only — and it WINS over the rung/derived default, because the engine's per-mode `overrides` layer runs
 *  after derivation. Pinning the resting link re-anchors the whole family: `default`/`focused` take the
 *  picked step, and each engaged state keeps the SAME signed step-distance from the resting link it has in
 *  the derived layout. That distance is re-established HERE because a per-role override layer cannot carry
 *  a between-role relationship on its own (#1487); reading it in signed index space keeps it correct for
 *  the page and inverse families alike, whose walks run opposite ways. The engine holds every written step
 *  to the link's contrast floor (a sub-floor pick is clamped), so an absolute pin can never render a link
 *  below contract. "Auto" (undefined) clears all five states for this family/mode, back to the default. */
const setLinkFamilyOverride = (prefix: string, step: string | undefined): void => {
  setLinkFamilyIn(currentMode, prefix, step);   // `state/interactive-input.ts` (UI redesign S5.1)
  applyFull();
};
/** The resting-link absolute picker for one family — the per-mode override control (#1510). "Auto" follows
 *  the rung/derived default; a step pins this family's exact color for the current mode (the engaged states
 *  re-anchor to it, and the engine holds each to the link's contrast floor). */
const linkAbsPicker = (prefix: string): HTMLSelectElement => {
  const pal = theme.linkPalette;   // #1496: offer steps from the LINK ramp (= action ramp when links follow it)
  const steps = (theme.palettes.find((p) => p.palette === pal)?.steps ?? []).map((s) => s.key);
  const cur = brandState.overrides?.[currentMode]?.[`${prefix}.link.default`]?.step;
  return stepPicker(pal, steps, baselineStepOf(`${prefix}.link.default`), typeof cur === 'string' ? cur : undefined,
    (step) => setLinkFamilyOverride(prefix, step));
};

/** The five-state strip for one link family + ground (`text.link` / `icon.link`, page or inverse). Mirrors
 *  `iStates`' `.astates` layout, carrying a token pill + contrast receipt per state. EVERY family is
 *  independently editable (#1510): the resting `default` cell carries a per-mode ABSOLUTE picker that pins
 *  this family's exact color for the current mode and re-anchors its engaged states. When `rungEditable`
 *  (the page text family) the engaged states also carry the GLOBAL rung picker — the cross-mode default
 *  that moves every family together until a per-mode absolute pin overrides it here. null when the family
 *  does not resolve in this mode. */
const linkStatesStrip = (roles: RoleMap, prefix: string, rungEditable = false): HTMLElement | null => {
  const g = el('div', 'astates-g'); let any = false;
  for (const [name, st] of LINK_STATE_ROWS) {
    const key = `${prefix}.link.${st}`;
    const r = roles[key]; if (!r) continue; any = true;
    const cell = hook(el('div', 'astate'), 'role-state');
    const head = el('div', 'astate-h'); head.append(hook(swatch(r.hex, 'astate-sw'), 'role-state-swatch'), hook(el('span', 'astate-n', name), 'role-state-name'));
    cell.append(head, tokenPill(colorPath(key)));
    const badge = iBadge(r); if (badge) cell.append(badge);
    if (st === 'default') cell.append(linkAbsPicker(prefix));                 // per-mode absolute pin — every family
    else if (rungEditable && LINK_ENGAGED.has(st)) cell.append(linkRungPicker(st as 'hover' | 'pressed' | 'visited'));
    g.append(cell);
  }
  if (!any) return null;
  const wrap = hook(el('div', 'astates'), 'role-states'); wrap.append(el('div', 'astates-h', 'Link states'), g); return wrap;
};

/** One link family row: the `default` swatch + label + token pill + description on the left, a live
 *  specimen (rest → hover → pressed, pinnable) on the right, and the five-state strip below — the same
 *  shape as a palette slot row minus the Source select. The strip's `default` cell always carries the
 *  per-mode absolute pin; `rungEditable` (page text only) adds the global rung pickers. null when the
 *  family does not resolve. */
const linkRow = (o: { prefix: string; label: string; desc: string; rungEditable?: boolean; example: (rs: RoleMap) => HTMLElement }): HTMLElement | null => {
  const roles = iRoles();
  const restKey = `${o.prefix}.link.default`;
  const rest = roles[restKey]; if (!rest) return null;
  const row = hook(el('div', 'arow'), 'role-row');
  const main = el('div', 'arow-main');
  main.append(hook(swatch(rest.hex, 'asw'), 'role-swatch'));
  const mid = hook(el('div', 'amid'), 'role-body');
  mid.append(el('div', 'alabel', o.label), tokenPill(colorPath(restKey)), el('p', 'adesc', o.desc));
  main.append(mid, iExample(o.example(roles), iBadge(rest)));
  row.append(main);
  const strip = linkStatesStrip(roles, o.prefix, o.rungEditable); if (strip) row.append(strip);
  return row;
};

/** The Links section — the global link role surfaced read-only on the Interactive page (#1487), text
 *  and icon twins on the page ground and the inverse one. null when the brand emits no link role. */
const renderLinksSection = (): HTMLElement | null => {
  const roles = iRoles();
  if (!roles['text.link.default']) return null;
  const sec = hook(el('div', 'psec'), 'section-links');
  const head = hook(el('div', 'psec-h'), 'section-head'); head.append(hook(el('p', 'psec-t', 'Links'), 'section-title'));
  sec.append(head, el('p', 'psec-d',
    'The global link role, drawn from the link palette below — one link role, no per-accent link roles. '
    + 'The resting link and its focus follow the link palette; the engaged states step away from it. '
    + 'The rung pickers on the page text link set how many steps hover, pressed and visited move — one cross-mode default for every family, so they stay distinct even where the link sits deep in the ramp. '
    + 'Each family can also pin an exact color for the current mode on its resting-link picker; a pin wins over the rung default and re-anchors that family, and the engine holds every link to its contrast floor. '
    + 'Focused always matches the resting link: the focus ring carries that state, so the link text does not shift.'));
  sec.append(linkPaletteLead());
  // WCAG 1.4.1 (Use of Color), warn-not-force (#1496): when the link palette is not color-distinct from
  // body text, the engine flags in its notes that links must be underlined. Surface that inline here —
  // advisory, never a block — reading the engine's own decision (theme.notes) so it never diverges from it.
  if (theme.notes.some((n) => /WCAG 1\.4\.1/.test(n)))
    sec.append(hook(el('p', 'te-order-warn',
      '⚠ This link palette is not color-distinct from body text, so color alone cannot mark a link. Underline links for WCAG 1.4.1 (Use of Color) — add the link role to Underlined link roles in Type. A warning, not a block.'), 'order-warning'));
  const rows: Array<HTMLElement | null> = [
    linkRow({ prefix: 'text', label: 'Text link', desc: 'Links in running text on light surfaces.', rungEditable: true,
      example: (rs) => exLink(rs['text.link.default']?.hex ?? '#000000', false, rs['text.link.hover']?.hex, rs['text.link.pressed']?.hex) }),
    linkRow({ prefix: 'inverse.text', label: 'Text link · inverse', desc: 'Links in running text on dark / inverse surfaces.',
      example: (rs) => exLink(rs['inverse.text.link.default']?.hex ?? '#ffffff', true, rs['inverse.text.link.hover']?.hex, rs['inverse.text.link.pressed']?.hex) }),
    linkRow({ prefix: 'icon', label: 'Icon link', desc: 'The icon twin of the link ink — an icon inside a link on light surfaces.',
      example: (rs) => exIconLabel(rs['icon.link.default']?.hex ?? '#000000', rs['text.link.default']?.hex ?? '#000000') }),
    linkRow({ prefix: 'inverse.icon', label: 'Icon link · inverse', desc: 'The icon twin on dark / inverse surfaces.',
      example: (rs) => exIconLabel(rs['inverse.icon.link.default']?.hex ?? '#ffffff', rs['inverse.text.link.default']?.hex ?? '#ffffff', true) }),
  ];
  for (const rw of rows) if (rw) sec.append(rw);
  return sec;
};

// ---- lead controls + global behaviors ------------------------------------
/** An enum lever as the lead control of a matrix section: chips or a `.cap` select, whichever the
 *  descriptor says (#1675). It writes the input and rebuilds (a lever change re-derives roles the
 *  matrix reads, so applyFull, not apply). `cur` defaults to the working input's value; the Neutral
 *  lead passes the last good one, which is what it has always shown. */
const iEnumControl = (key: string, cur: unknown = getPath(brandState, key) ?? leverByKey(key)!.default): HTMLElement => {
  const lever = leverByKey(key)!;
  const d = describeControl(lever);
  if (d.kind === 'chips') return chipGroup(key, lever.label, d.options, cur, (v) => { setLever(key, v); applyFull(); });
  const sel = selectEl('cap');
  for (const o of lever.options ?? []) sel.append(optionEl(String(o.value), o.label, o.value === cur));
  sel.onchange = () => { setLever(key, sel.value); applyFull(); };
  return sel;
};

/** The Primary section's lead: the Action-palette choice (which palette drives primary actions). */
const actionPaletteLead = (): HTMLElement => {
  const sel = selectEl('cap');
  const palettes = paletteRefOptions('actionPalette', (brandState.brandColors ?? []).map((b) => b.name));
  const cur = String(brandState.actionPalette ?? 'primary');
  for (const p of palettes) sel.append(optionEl(p, capWord(p), p === cur));
  sel.onchange = () => { setLever('actionPalette', sel.value); applyFull(); };
  const roles = iRoles();
  return iRow({ lead: true, label: 'Action palette', srcLabel: 'Source', select: sel,
    desc: 'Which palette drives your primary actions — a brand color, or point it at your neutral for a restrained, monochrome look. The contrast floor is accessible either way.',
    example: iExample(exBtn(roles['interactive.primary.fill.rest']?.hex ?? '#000000', roles['interactive.primary.on-fill']?.hex ?? '#ffffff')) });
};

/** The Links section's lead: the link-palette choice (#1496). Which palette drives the link color,
 *  independently of the action palette. Unlike actionPalette, `neutral` is an offered target (a
 *  monochrome link is a common brand choice). An unset linkPalette FOLLOWS the action palette, so the
 *  picker shows the resolved palette (`theme.linkPalette`); selecting one decouples links onto it. */
const linkPaletteLead = (): HTMLElement => {
  const sel = selectEl('cap');
  const palettes = paletteRefOptions('linkPalette', (brandState.brandColors ?? []).map((b) => b.name));
  const cur = String(theme.linkPalette);
  for (const p of palettes) sel.append(optionEl(p, capWord(p), p === cur));
  sel.onchange = () => { setLever('linkPalette', sel.value); applyFull(); };
  const roles = iRoles();
  return hook(iRow({ lead: true, label: 'Link palette', srcLabel: 'Source', select: sel,
    desc: 'Which palette drives your links — follows your action palette by default, or point it at your neutral or an accent to give links their own color. The contrast floor holds either way.',
    example: iExample(exLink(roles['text.link.default']?.hex ?? '#000000', false, roles['text.link.hover']?.hex, roles['text.link.pressed']?.hex)) }), 'link-palette');
};

/** The Neutral section's lead: the emphasis choice (subtle grey surface vs bold near-black/white fill). */
const neutralEmphasisLead = (): HTMLElement => {
  const roles = iRoles();
  return iRow({ lead: true, label: 'Button emphasis', srcLabel: 'Emphasis', select: iEnumControl('neutralEmphasis', lastGoodInput.neutralEmphasis ?? 'subtle'),
    desc: 'A neutral / secondary button as a subtle light-gray surface, or a bold near-black/white fill. Shared across modes.',
    example: iExample(exBtn(roles['interactive.neutral.fill.rest']?.hex ?? '#eeeeee', roles['interactive.neutral.on-fill']?.hex ?? '#111111')) });
};

/** The cross-cutting behaviors grouped at the top — outline hover, disabled, icon colors — each governs
 *  every palette below, so it doesn't belong to any one of them. */
const renderGlobalBehavior = (host: HTMLElement): void => {
  const cap = el('div', 'gcap'); cap.append(el('p', 'gcap-t', 'Global action behavior'), el('p', 'gcap-d', 'These apply across every action palette below.'));
  host.append(cap);
  const roles = iRoles();

  // The second sentence is method-specific: the Overlay wash row only tunes the translucent method.
  // Under solid-tint the fill comes from the control's own palette automatically, so pointing at a
  // control that does nothing there would be the same species of wrong answer as the empty swatch.
  const ohBlurb = theme.outlineInteraction === 'solid-tint'
    ? 'How every outline & text action reacts on hover. The hover is each control’s own fill at 20% opacity, so a destructive outline hovers red-tinted rather than gray.'
    : theme.outlineInteraction === 'none'
      ? 'How every outline & text action reacts on hover. No hover fill — the border and ink carry the state on their own.'
      : 'How every outline & text action reacts on hover. Each palette’s Overlay wash row tunes the tint it uses.';
  // `palSection`, not a bare `.psec` + two `<p>`s (#562). These four sections used to append the title
  // straight to the section, so they had no `.psec-head` — which sent `attachModeBadges` down its
  // absolute-position FALLBACK and pinned the badge to `top:0;right:0`, flush against the border while
  // the section's own padding is 20/24. Measured 1/1 here against 21/25 on every section that did use
  // the helper. Fixed by taking the same path as the rest rather than by giving the fallback insets:
  // the head path is a flex row that also reflows to a column under 720px, which these never got.
  const oh = palSection('Outline button hover', ohBlurb);
  // Edge from the border role, ink from the text role (#576) — the two are separately pinnable now, and
  // this section's whole subject is what the outline does on hover, so it is the last place that should
  // show one of them standing in for the other.
  // Both specimens stay at the REST edge and the REST ink: the pair isolates the WASH, which is what the
  // Method select changes, so moving a second variable across it would stop answering the question.
  const ohEdge = edgeOf(roles, 'interactive.primary');
  const ohInk = roles['interactive.primary.text.rest']?.hex;
  // Each method reads its OWN role, which is the whole point of #288: `overlay-neutral` emits a
  // translucent `interactive.<name>.overlay.hover`, `solid-tint` an opaque
  // `interactive.<name>.subtle-fill.hover` (its fill at an opacity step, #1614), and `none` no fill by design. This used to read the
  // overlay role unconditionally, which rendered solid-tint identically to none — and once that was
  // made conditional there was still nothing to read, because the engine emitted no solid-tint token
  // for any brand (#288). Both halves are fixed now, so the example tracks the method for real.
  //
  // The mapping itself now comes from `outlineFillRole` rather than being spelled out here a second
  // time. It WAS spelled out twice, and the copy in the style guide was the one that never got the
  // fix (#575) — so the duplication was not hypothetical, it shipped the same bug to the surface a
  // designer hands a developer. `opaque` still branches locally, because it decides how to PAINT
  // (a translucent wash needs `rgbaOf` to composite honestly; an opaque step is its own hex).
  const ohRole = outlineFillRole(theme.outlineInteraction, 'primary', 'hover');
  const ohRes = ohRole ? roles[ohRole] : undefined;
  const ohWash = !ohRes ? 'transparent'
    : outlineFillFamily(theme.outlineInteraction).opaque
      ? ohRes.hex              // opaque — no method is since #1614, but an opaque one paints its own hex
      : rgbaOf(ohRes);
  oh.append(iRow({ lead: true, srcLabel: 'Method', select: iEnumControl('outlineInteraction'),
    example: twoUp(['Rest', exOutline(ohEdge, 'transparent', false, undefined, undefined, { ink: ohInk })],
                   ['Hover', exOutline(ohEdge, ohWash, false, undefined, undefined, { ink: ohInk })]) }));
  host.append(oh);

  // "the label" is the correction, not decoration (#561): the section promised "how much contrast
  // disabled controls keep", but `disabled.fill` is a fixed neutral rung nothing here can move — only
  // the ink is contrast-gated. Reading the old copy and watching the fill never budge is what made a
  // working section look broken.
  const ds = palSection('Disabled', 'How much contrast a disabled label keeps — on a disabled fill, and as plain disabled text on the page. Never below 3:1 either way; this system doesn’t use the WCAG exemption for inactive controls. The disabled fill itself is a fixed step of your neutral ramp, so it moves with the neutral, not with these controls.');
  const dFull = normalizeDisabledStrategy(getPath(brandState, 'disabledStrategy') as string | undefined) === 'full';
  // Re-resolved on each call, not closed over `roles`, so the same builder serves the first render and
  // every mid-drag repaint below.
  //
  // BOTH gated disabled roles, each with its own receipt (#561). The floor drives two inks, not one:
  // `disabled.on-fill` is rated against the DISABLED FILL, `disabled.text` against the page, so the two
  // cross a ramp rung at different floors and one specimen cannot stand in for the other. That is what
  // made the top of the dial look dead. Measured across the corpus at all four stops (both light and
  // dark, HC excluded — it escalates to 4.5 by design and collapsing there is correct): all four stops
  // are distinct in 8 of 10 customizable brand+modes with both inks visible, versus 6 of 10 with
  // `on-fill` alone. Aurora and harbor light are exactly the pair that flips — `on-fill` sits still from
  // 4.0→4.5 while `text` moves 4.01→4.8x, and showing only `on-fill` reported that as no change.
  // Where a stop IS still dead (nb/minimal light) it is because 4.0 already lands both inks at ~4.5,
  // so asking for 4.5 requests nothing more — a floor already cleared, not a control that cannot move.
  // The dial's granularity was never the defect; the specimen was under-reporting it.
  const dsExample = (): HTMLElement => {
    const r = iRoles();
    return twoUp(
      ['On fill', exBtn(r['disabled.fill']?.hex ?? '#e7e7ee', r['disabled.on-fill']?.hex ?? '#9a9aa6', false, 'Save'), iBadge(r['disabled.on-fill'])],
      ['On page', exTextOnPage(r['disabled.text']?.hex ?? '#9a9aa6', 'Save'), iBadge(r['disabled.text'])]);
  };
  let dsEx = dsExample();
  ds.append(iRow({ lead: true, srcLabel: 'Contrast', select: iEnumControl('disabledStrategy'),
    desc: 'Full guarantees AA text (4.5:1); Reduced dims to a floor you set, no lower than 3:1.',
    // The affordance caveat, surfaced where the choice is made rather than left to be discovered:
    // at 4.5:1 the label is as legible as body copy, so "disabled" reads from fill/border/cursor.
    warn: dFull ? 'At 4.5:1 the label is as legible as body text — check a disabled control still reads as disabled (the cue now rests on fill, border, cursor and aria-disabled).' : undefined,
    example: dsEx }));
  // The floor dial belongs to Reduced — Full is a fixed promise with nothing to tune. (Inverted from
  // the original, where the dial sat on the compliant branch and could be pulled below AA.)
  if (!dFull) {
    const min = leverByKey('disabledMin');
    if (min) {
      const c = renderControl(min);
      // The example lives in this non-volatile section (not the .stage-vol region), so the generic
      // slider oninput's apply() (volatile-only) can't refresh it, and applyFull() on oninput would
      // rebuild the workspace and destroy the slider mid-drag. Both still hold — so the drag re-resolves
      // the theme (`rebuild`, DOM-free) and swaps just THIS specimen node, which is the one thing on
      // screen the floor moves. Release still commits through applyFull so the rest of the page (the
      // mode strip's per-mode contrast marks, every other palette) catches up in one pass; refreshing
      // those mid-drag would risk syncErrorBar reflowing the sticky chrome under the cursor.
      const slider = c.querySelector('input[type="range"]') as HTMLInputElement | null;
      const label = c.querySelector('.knob-val') as HTMLElement | null;
      if (slider) {
        slider.oninput = () => {
          if (label) label.textContent = `${slider.value}${min.unit ?? ''}`;
          setLever(min.key, Number(slider.value));
          rebuild();
          const next = dsExample(); dsEx.replaceWith(next); dsEx = next;
        };
        slider.onchange = () => { setLever(min.key, Number(slider.value)); applyFull(); };
      }
      ds.append(c);
    }
  }
  host.append(ds);

  const ic = palSection('Icon colors', 'Should icons match your text color, or take a distinct (lighter) color? The example shows both.');
  const txt = roles['text.primary']?.hex ?? '#191920', lighter = roles['text.tertiary']?.hex ?? '#9a9aa6';
  ic.append(iRow({ lead: true, label: 'Icon color', srcLabel: 'Icon color', select: iEnumControl('iconContrast'),
    desc: 'Match text keeps icons at full text legibility; Distinct lets them sit lighter (WCAG non-text 3:1).',
    example: twoUp(['Match text', exIconLabel(txt, txt)], ['Distinct', exIconLabel(lighter, txt)]) }));
  host.append(ic);

  // FOCUS RING (review, 2026-08-04) — 4 emitted tokens that appeared nowhere in the dashboard. They
  // belong here: a focus ring is an interaction state, and `color.border.focus` (its colour, already
  // on this page's contract table) is the one part of it that WAS visible. These are the geometry.
  // Fixed constants in the engine, so read-only — shown with a live specimen because a 2px ring at 2px
  // offset is a thing you judge by looking, not by reading two numbers.
  const fr = palSection('Focus ring', 'The ring geometry every focusable control shares — width, how far it sits off the element, and its stroke style. Fixed for every brand (WCAG 2.4.13 sets the floor); its color is the color.border.focus role above.');
  const frRows: Array<[string, string, string]> = [
    ['focus.ring.width', '2px', 'WCAG 2.4.13 floor'],
    ['focus.ring.offset', '2px', 'separates the ring from the element edge'],
    ['focus.ring.offset-field', '0px', 'form fields — the ring hugs the field'],
    ['focus.ring.style', 'solid', 'dashed and dotted fail at small sizes'],
  ];
  const frWrap = el('div', 'fr-wrap');
  const frList = el('div', 'fr-list');
  for (const [ref, val, why] of frRows) {
    const r = el('div', 'fr-row');
    r.append(tokenPill(ref), el('span', 'fr-v mono', val), el('span', 'fr-why', why));
    frList.append(r);
  }
  const frEx = el('div', 'fr-ex');
  const ringColor = roles['border.focus']?.hex ?? roles['interactive.primary.border.rest']?.hex ?? '#3e6dc8';
  for (const [lab, off] of [['Control', '2px'], ['Form field', '0px']] as Array<[string, string]>) {
    const cell = el('div', 'fr-excell');
    const btn = el('div', 'fr-btn', lab);
    btn.style.outline = `2px solid ${ringColor}`;
    btn.style.outlineOffset = off;
    cell.append(btn, el('span', 'fr-exlab', `offset ${off}`));
    frEx.append(cell);
  }
  frWrap.append(frList, frEx);
  fr.append(frWrap);
  host.append(fr);
};

/** The add-accent promote row — a select of promotable palettes + an add button (structural, base-mode
 *  only). Pushes `{ palette }`; the engine defaults the column name to the palette. */
const renderAddAccentRow = (): HTMLElement => {
  const row = el('div', 'ic-add');
  const brandNames = (brandState.brandColors ?? []).map((b) => b.name);
  const already = new Set((brandState.interactivePalettes ?? []).map((e) => e.palette));
  const actionPal = theme.roleToPalette.action;
  const RESERVED_ICOL = new Set(['primary', 'neutral', 'destructive']);
  const promotable = ['primary', ...brandNames].filter((p) => !already.has(p) && p !== actionPal && !RESERVED_ICOL.has(p));
  if (!promotable.length) {
    row.append(el('span', 'ic-addhint', 'Add a brand color on Primitives to create another interactive color.'));
    return row;
  }
  const sel = selectEl('cap');
  for (const p of promotable) sel.append(optionEl(p, capWord(p)));
  const btn = addButton('+ Add action palette', () => { addAccent(sel.value); applyFull(); }, 'ic-addbtn');
  row.append(sel, btn);
  return row;
};

/** The whole interactive editor: global behaviors, then one section per action palette, then the add row.
 *  The fill anchor is per-mode outside Light (modeAnchors); structural edits (add/remove a column) stay
 *  base-only. */
const renderInteractiveMatrix = (host: HTMLElement): void => {
  renderGlobalBehavior(host);
  const perMode = currentMode !== 'light';
  if (perMode) host.append(el('p', 'ic-modenote', `Editing ${MODE_LABEL[currentMode] ?? currentMode}’s interactive colors — “Auto” follows the generated baseline; pick a step to override this mode.`));
  // The anchor write is `setAnchor` (`state/interactive-input.ts`, UI redesign S5.1): Light's global field
  // per column, `modeAnchors` with pruning in any other mode.
  const anchor = (name: string): Pick<ICol, 'stepValue' | 'setStep'> => ({
    stepValue: anchorOf(currentMode, name),
    setStep: (v) => { setAnchor(currentMode, name, v); applyFull(); },
  });
  const add = (node: HTMLElement | null): void => { if (node) host.append(node); };

  add(renderPaletteSection({ name: 'primary', title: 'Primary actions', desc: 'The default interactive colors. State colors are calculated from your selections unless you override them.', palette: theme.roleToPalette.action, lead: actionPaletteLead(), ...anchor('primary') }));
  add(renderPaletteSection({ name: 'neutral', title: 'Neutral actions', desc: 'The secondary / low-emphasis action set — for “Cancel”, toolbar buttons, and quiet controls.', palette: theme.roleToPalette.neutral, lead: neutralEmphasisLead() }));
  add(renderPaletteSection({ name: 'destructive', title: 'Destructive actions', desc: 'Delete / remove and other irreversible actions.', palette: theme.roleToPalette.danger, ...anchor('destructive') }));
  (brandState.interactivePalettes ?? []).forEach((entry, i) => {
    const nm = entry.name ?? entry.palette;
    add(renderPaletteSection({
      name: nm, title: `${capWord(nm)} actions`, desc: 'Optional secondary interactive set.', palette: entry.palette,
      ...anchor(nm),
      ...(perMode ? {} : { onRemove: () => { removeAccent(i); applyFull(); } }),
    }));
  });
  if (!perMode) host.append(renderAddAccentRow());
  add(renderLinksSection());
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

// ---- Type sizes — shape · range · the per-size table (#328 follow-through) ------------------------
/** Shape, range and the per-size table are one decision chain, so they live together on Text styles rather
 *  than split across tabs. This moves `typeScale` / `displayCeiling` / `titleFloor` onto Text styles,
 *  which leaves the size ladder alone on Primitives — genuinely primitive, and consistent with #268's
 *  rule that a primitive surface shows no mode switcher.
 *
 *  Two tiers, and the layout is what makes them legible: RANGE decides which rows exist and is shared
 *  by every mode; CELLS set sizes and are per-mode. */
/** Label + description together, then the controls. `knob` puts the description AFTER the body,
 *  which reads fine under a single field and badly under a card grid — by the time you reach the
 *  explanation you have already made the choice. Local to this section rather than a change to
 *  `knob`, which every other page depends on. */
const fieldBlock = (label: string, desc: string, body: Node): HTMLElement => {
  const w = el('div', 'tsz-field');
  w.append(el('label', 'tsz-flabel', label), el('p', 'tsz-fdesc', desc), body);
  return w;
};
const TYPE_SHAPES: Array<[string, string, string]> = [
  ['compact', 'Compact', 'Tighter steps. Denser screens and information-heavy products.'],
  ['default', 'Default', 'The balanced ramp. A safe starting point for most brands.'],
  ['expressive', 'Expressive', 'Wider steps and a bigger jump into headings. Editorial and marketing.'],
];
const SHAPE_SHIFT: Record<string, number> = { compact: -1, default: 0, expressive: 1 };
let typeSizesOpen: boolean | null = null;   // null ⇒ follow "is anything pinned"

/** Step a px value along the ladder, clamped. Returns undefined when there is no such step. */
const ladderStep = (px: number, by: number): number | undefined => {
  const l = theme.typography.sizesPx, i = l.indexOf(px);
  if (i < 0) return undefined;
  const j = i + by;
  return j >= 0 && j < l.length ? l[j] : undefined;
};
/** Every heading rung this brand ships, largest first — the row order for the tables. */
const rowsOf = (t: Theme, group: PerModeSizeGroup): Array<{ variant: string; px: number }> =>
  t.typography.composites.filter((c) => c.group === group)
    .reduce((acc: Array<{ variant: string; px: number }>, c) => (acc.some((a) => a.variant === c.variant) ? acc : [...acc, { variant: c.variant, px: c.sizePx }]), [])
    .sort((a, b) => b.px - a.px);
const headingRows = (group: PerModeSizeGroup): Array<{ variant: string; px: number }> => rowsOf(theme, group);
/** Rows for the WIDEST range this brand could have, so trimmed rungs can be shown as "outside range"
 *  rather than vanishing. The live theme contains only rungs that survived `displayCeiling` /
 *  `titleFloor`, so reading it alone silently drops the excluded rows — which is exactly what
 *  happened on the deployed build: a `md` ceiling showed two display rows and no sign of the four
 *  it had removed.
 *
 *  Three attempts, because widening can legitimately fail: `titleFloor: 16` is incompatible with
 *  `typeScale: 'compact'`, and a pinned size can collide with a neighbor that only exists at the
 *  wider range. Falling back to the live set just restores the old behavior, never a broken one. */
let widestRows: Map<PerModeSizeGroup, Array<{ variant: string; px: number }>> | null = null;
const computeWidestRows = (): void => {
  widestRows = null;
  const tries: Array<Partial<TypographyInput>> = [
    { displayCeiling: '3xl', titleFloor: 16 },
    { displayCeiling: '3xl' },
    { displayCeiling: '3xl', titleFloor: 16, sizes: undefined },
  ];
  for (const over of tries) {
    try {
      const t = brandTheme({ ...brandState, typography: { ...brandState.typography, ...over } } as BrandInput);
      widestRows = new Map(PER_MODE_SIZE_GROUPS.map((g) => [g, rowsOf(t, g)]));
      return;
    } catch { /* try the next relaxation */ }
  }
};
const brandSizePin = (group: PerModeSizeGroup, variant: string): number | undefined =>
  brandState.typography?.sizes?.[group]?.[variant];
const modeSizePin = (mode: Mode, group: PerModeSizeGroup, variant: string): number | undefined =>
  brandState.modeLevers?.[mode]?.typeSizes?.[group]?.[variant];
/** Set or clear a BASELINE per-size override, pruning empties so an all-cleared brand stays byte-identical. */
const setBrandSize = (group: PerModeSizeGroup, variant: string, px: number | undefined): void => {
  const ty = (brandState.typography ??= {});
  if (px === undefined) {
    const g = ty.sizes?.[group];
    if (!g || !ty.sizes) return;
    delete g[variant];
    if (!Object.keys(g).length) delete ty.sizes[group];
    if (!Object.keys(ty.sizes).length) delete ty.sizes;
    return;
  }
  ((ty.sizes ??= {})[group] ??= {})[variant] = px;
};
/** A #1587 per-rung VIEWPORT (desktop/mobile) endpoint pin, if set. The desktop endpoint is normally
 *  authored through the base column (`typography.sizes`); this reads the viewport-override store, which
 *  the studio uses for the MOBILE endpoint. */
const viewportPin = (group: PerModeSizeGroup, variant: string, vp: 'desktop' | 'mobile'): number | undefined =>
  brandState.typography?.sizeOverrides?.[group]?.[variant]?.[vp];
/** Set or clear a per-rung viewport endpoint override, pruning empties so an all-cleared brand stays
 *  byte-identical (mirrors `setBrandSize`, one axis deeper). */
const setViewportSize = (group: PerModeSizeGroup, variant: string, vp: 'desktop' | 'mobile', px: number | undefined): void => {
  const ty = (brandState.typography ??= {});
  if (px === undefined) {
    const rung = ty.sizeOverrides?.[group]?.[variant];
    if (!rung || !ty.sizeOverrides) return;
    delete rung[vp];
    if (!Object.keys(rung).length) delete ty.sizeOverrides[group]![variant];
    if (ty.sizeOverrides[group] && !Object.keys(ty.sizeOverrides[group]!).length) delete ty.sizeOverrides[group];
    if (!Object.keys(ty.sizeOverrides).length) delete ty.sizeOverrides;
    return;
  }
  (((ty.sizeOverrides ??= {})[group] ??= {})[variant] ??= {})[vp] = px;
};
/** How many sizes are pinned anywhere — drives the "customized" badge. Counts baseline sizes, per-mode
 *  sizes, AND #1587 per-rung viewport endpoints, so the badge never hides that a viewport pin is set. */
const pinnedSizeCount = (): number => {
  let n = 0;
  const bs = brandState.typography?.sizes ?? {};
  for (const g of Object.keys(bs) as PerModeSizeGroup[]) n += Object.keys(bs[g] ?? {}).length;
  for (const m of Object.keys(brandState.modeLevers ?? {}) as Mode[]) {
    const ms = brandState.modeLevers?.[m]?.typeSizes ?? {};
    for (const g of Object.keys(ms) as PerModeSizeGroup[]) n += Object.keys(ms[g] ?? {}).length;
  }
  const vo = brandState.typography?.sizeOverrides ?? {};
  for (const g of Object.keys(vo) as PerModeSizeGroup[])
    for (const variant of Object.keys(vo[g] ?? {}))
      n += Object.keys(vo[g]![variant] ?? {}).length;
  return n;
};

/** One editable size cell. The constraint lives IN the control: a disabled −/+ says this size has no
 *  room that way, where a filtered dropdown just omitted the option and never said why. */
const sizeCell = (group: PerModeSizeGroup, rows: Array<{ variant: string; px: number }>, i: number, mode: Mode | null, resolved: number[]): HTMLElement => {
  const variant = rows[i].variant;
  const px = resolved[i];
  const upper = i > 0 ? resolved[i - 1] : undefined;         // the larger neighbor
  const lower = i + 1 < resolved.length ? resolved[i + 1] : undefined;
  const floor = HEADING_SIZE_FLOOR[group];
  const step = (dir: -1 | 1) => ladderStep(px, dir);
  const dn = step(-1), up = step(1);
  return stepCell({
    px,
    // Sizes DO bound on their neighbors: the ramp must stay strictly increasing or the engine
    // refuses to build. That is the difference from weight roles, which may cross.
    canDown: dn !== undefined && dn >= floor && (lower === undefined || dn > lower),
    canUp: up !== undefined && (upper === undefined || up < upper),
    pinned: mode ? modeSizePin(mode, group, variant) !== undefined : brandSizePin(group, variant) !== undefined,
    label: `${group} ${variant}${mode ? ` in ${mode}` : ''}`,
    step,
    write: (v) => {
      if (mode) setModeLever(mode, `typeSizes.${group}.${variant}`, v);
      else setBrandSize(group, variant, v);
      applyFull();
    },
  });
};

/** One table per heading group — rows are sizes largest-first, columns are modes. */
const renderSizeTable = (group: PerModeSizeGroup): HTMLElement | null => {
  const live = headingRows(group);
  const all = widestRows?.get(group) ?? live;
  if (!all.length) return null;
  const inRange = new Set(live.map((r) => r.variant));
  const modes = rp.modes;
  const box = el('div', 'mtbl');
  box.append(el('p', 'mtbl-cap', group));
  const scroll = el('div', 'mtbl-scroll');
  const tbl = el('table', 'mtbl-tbl');
  const thead = el('thead'), htr = el('tr');
  htr.append(el('th', 'mtbl-stick', 'Size'));
  for (const m of modes) {
    const th = el('th', 'mtbl-mode');
    // #1586 — the base column must NOT read as the "Light" appearance mode. Sizes vary by VIEWPORT
    // (the Responsive type lever), not by light/dark, so the base value is a viewport-independent
    // base. Dark and derived columns keep their appearance labels — `sizeByMode` is a real per-mode
    // override. Header parts come from the pure `sizeColumnHeader` helper, tested independently.
    const h = sizeColumnHeader(m === 'light', modeIsEditable(m), MODE_LABEL[m] ?? m);
    th.append(document.createTextNode(h.text));
    if (h.suffix) th.append(el('span', 'mtbl-ro', h.suffix));
    if (h.title) th.title = h.title;
    htr.append(th);
  }
  htr.append(el('th', 'mtbl-fill'));
  thead.append(htr); tbl.append(thead);
  const tb = el('tbody');
  // Resolve each mode's ramp once, over the IN-RANGE rows only — a cell's legal span depends on its
  // neighbors in the same column, and an excluded rung is not a neighbor of anything.
  const resolvedByMode = new Map<string, number[]>();
  for (const m of modes) {
    resolvedByMode.set(m, live.map((r) => {
      const c = theme.typography.composites.find((x) => x.group === group && x.variant === r.variant)!;
      return (m === 'light' ? undefined : c.sizeByMode?.[m]) ?? c.sizePx;
    }));
  }
  // #1587 — the resolved MOBILE endpoint per in-range rung (the pin if set, else the clamp-derived value).
  // Only meaningful when responsive is on; the size table sits on the theme axis, so the viewport endpoints
  // ride in the BASE column alongside the desktop value (decision: inline, Desktop/Mobile labels).
  const mobileResolved = live.map((r) => theme.typography.composites.find((x) => x.group === group && x.variant === r.variant)!.sizeMinPx);
  const desktopResolved = resolvedByMode.get('light') ?? live.map((r) => r.px);
  /** One editable MOBILE endpoint cell for a fluid heading rung. Shows the derived endpoint by default
   *  (read-only in style until pinned — the #423 pattern) and opts into an override on the first step;
   *  reset (↺) returns to derived. Bounds keep the ramp coherent: mobile stays on the ladder, at/above the
   *  group floor, at most its own desktop, and non-decreasing against its neighbours — the same shape the
   *  engine's coherence guard enforces, so the control never offers a step the build would reject. */
  const mobileCell = (i: number): HTMLElement => {
    const variant = live[i].variant;
    const px = mobileResolved[i];
    const desktop = desktopResolved[i];
    const floor = HEADING_SIZE_FLOOR[group];
    const larger = i > 0 ? mobileResolved[i - 1] : undefined;    // rows are largest-first, so i-1 is the bigger rung
    const smaller = i + 1 < mobileResolved.length ? mobileResolved[i + 1] : undefined;
    const derived = mobileEndpoint(theme.typography.sizesPx, group, desktop);
    const pinned = viewportPin(group, variant, 'mobile') !== undefined;
    const step = (dir: -1 | 1) => ladderStep(px, dir);
    const dn = step(-1), up = step(1);
    return stepCell({
      px,
      canDown: dn !== undefined && dn >= floor && (smaller === undefined || dn >= smaller),
      canUp: up !== undefined && up <= desktop && (larger === undefined || up <= larger),
      pinned,
      label: `${group} ${variant} mobile`,
      title: () => pinned
        ? `Mobile size, pinned (the Responsive lever would derive ${derived}px)`
        : `Mobile size, derived from the ${desktop}px desktop value by the Responsive lever`,
      step,
      write: (v) => { setViewportSize(group, variant, 'mobile', v); applyFull(); },
    });
  };
  for (const r of all) {
    const tr = el('tr', inRange.has(r.variant) ? '' : 'mtbl-off');
    const nameCell = el('td', 'mtbl-stick');
    nameCell.append(el('span', 'mtbl-name mono', r.variant));
    if (!inRange.has(r.variant)) nameCell.append(el('span', 'mtbl-ro', ' outside range'));
    tr.append(nameCell);
    if (inRange.has(r.variant)) {
      const i = live.findIndex((x) => x.variant === r.variant);
      for (const m of modes) {
        const td = el('td', 'mtbl-mode');
        // #423 — a derived mode accepts no levers, so its column reads the resolved px rather than
        // offering a stepper whose click would surface the engine's generate-only error.
        if (m !== 'light' && !modeIsEditable(m)) {
          const px = resolvedByMode.get(m)![i];
          const self = el('span', 'mtbl-selfval mono', `${px}px`);
          self.title = `${MODE_LABEL[m] ?? m} is auto-derived from Light and Dark — it resolves to ${px}px and accepts no per-mode override.`;
          td.append(self);
        } else if (m === 'light' && theme.typography.fluid) {
          // #1587 — surface BOTH viewport endpoints inline, labelled Desktop / Mobile (captions stacked
          // above each stepper so the fixed mode-column width is untouched). Desktop is the base value
          // (authored here as before); Mobile is the derived endpoint with an opt-in pin.
          const stack = el('div', 'mtbl-vpstack');
          stack.append(
            el('span', 'mtbl-vplab', 'Desktop'), sizeCell(group, live, i, null, resolvedByMode.get('light')!),
            el('span', 'mtbl-vplab', 'Mobile'), mobileCell(i),
          );
          td.append(stack);
        } else {
          td.append(sizeCell(group, live, i, m === 'light' ? null : m, resolvedByMode.get(m)!));
        }
        tr.append(td);
      }
    } else {
      // What it WOULD be, so the row explains itself rather than just being greyed.
      for (const [mi, m] of modes.entries()) {
        const td = el('td', 'mtbl-mode');
        td.append(el('span', 'mtbl-offval mono', mi === 0 ? `${r.px}px` : '—'));
        tr.append(td);
      }
    }
    tr.append(el('td', 'mtbl-fill'));
    tb.append(tr);
  }
  tbl.append(tb); scroll.append(tbl); box.append(scroll);
  return box;
};

const renderTypeSizes = (): HTMLElement => {
  const ty = theme.typography;
  const sec = palSection('Heading sizes', 'The shape of the heading system, how far the ramp runs, and — if you need it — every size set individually.');

  // SHAPE — option cards. A select cannot carry a sentence per option, and this is a foundational
  // choice made once. Deviation from doc 26 (3+ options → select); see doc 24 for the rule.
  const cur = (getPath(brandState, 'typography.typeScale') ?? 'default') as string;
  const cards = hook(el('div', 'shape-cards'), 'heading-shapes');
  let anyBlocked = false;
  for (const [key, name, blurb] of TYPE_SHAPES) {
    const b = hook(el('button', 'shape-card' + (key === cur ? ' on' : '')) as HTMLButtonElement, `heading-shape-${key}`);
    b.setAttribute('aria-pressed', String(key === cur));
    // The px range previews what this card WOULD produce, by shifting the live title ramp along the
    // ladder — cheaper and more honest than a hardcoded string, which would drift from the engine.
    const titles = ty.composites.filter((c) => c.group === 'title').map((c) => c.sizePx);
    const d = SHAPE_SHIFT[key] - SHAPE_SHIFT[cur];
    const shifted = titles.map((p) => ladderStep(p, d) ?? p);
    b.append(el('b', undefined, name), el('span', 'shape-blurb', blurb),
      el('span', 'shape-nums mono', titles.length ? `title ${Math.min(...shifted)}px–${Math.max(...shifted)}px` : ''));
    // A pinned size is ABSOLUTE and does not travel with the shape, so changing shape CAN collide and
    // the engine then refuses to build (#353). Rather than a dialog after the click — the app uses no
    // native dialogs — trial-build this shape with the pins in place and disable the card only when it
    // would actually fail. Most pins do not collide, so blocking on "pins exist" would over-refuse.
    let blocked = false;
    if (key !== cur) {
      try { brandTheme({ ...brandState, typography: { ...(brandState.typography as any), typeScale: key === 'default' ? undefined : key } } as any); }
      catch { blocked = true; }
    }
    b.disabled = blocked;
    if (blocked) b.title = 'Some sizes set below would clash at this shape. Release them to switch.';
    b.onclick = () => {
      if (key === cur || blocked) return;
      setPath(brandState, 'typography.typeScale', key === 'default' ? undefined : key);
      applyFull();
    };
    cards.append(b);
    if (blocked) anyBlocked = true;
  }
  if (anyBlocked) {
    const warn = el('div', 'shape-blocked');
    warn.append(el('span', undefined, 'Some shapes are unavailable while sizes are set individually — they would clash.'));
    const rel = hook(el('button', 'shape-release', 'Release pinned sizes') as HTMLButtonElement, 'heading-shape-release');
    rel.onclick = () => {
      if (brandState.typography) { delete brandState.typography.sizes; delete brandState.typography.sizeOverrides; }
      for (const m of Object.keys(brandState.modeLevers ?? {})) setModeLever(m, 'typeSizes', undefined);
      applyFull();
    };
    warn.append(rel);
    cards.append(warn);
  }
  sec.append(fieldBlock('Shape', 'How the heading sizes step. Most brands never need more than this.', cards));

  // RANGE — the two set-membership levers together: different mechanisms, same action.
  const range = el('div', 'range-row');
  const ceil = leverByKey('typography.displayCeiling');
  if (ceil) {
    const f = el('div', 'range-f');
    f.append(el('span', 'pfk', 'Largest display size'));
    const sel = selectEl('sm');
    // The live display ramp is TRIMMED by the current ceiling, so it cannot price the options above
    // it. One candidate build at the largest ceiling gives every rung's px; the display base steps
    // are not uniform on the ladder (48→64 spans two), so extrapolating would be wrong.
    const opts = ceil.options ?? [];
    let pxByVariant = new Map<string, number>();
    try {
      const full = brandTheme({ ...brandState, typography: { ...brandState.typography, displayCeiling: opts[opts.length - 1]?.value as any } } as BrandInput);
      pxByVariant = new Map(full.typography.composites.filter((c) => c.group === 'display').map((c) => [c.variant, c.sizePx]));
    } catch { /* fall back to bare rung names */ }
    for (const o of opts) {
      const px = pxByVariant.get(String(o.value));
      sel.append(optionEl(String(o.value), px ? `${o.value} — ${px}px` : String(o.value)));
    }
    sel.value = String(getPath(brandState, ceil.key) ?? ceil.default);
    sel.onchange = () => { setPath(brandState, ceil.key, sel.value); applyFull(); };
    f.append(sel);
    range.append(f);
  }
  {
    const f = hook(el('div', 'range-f'), 'heading-title-floor');
    f.append(el('span', 'pfk', 'Smallest title size'));
    const on = (getPath(brandState, 'typography.titleFloor') ?? 18) === 16;
    const row = el('div', 'range-tg');
    // toggleField returns [switch, On/Off readout]; the size belongs between them so the row reads
    // "switch · what it is · whether it is on", not "switch · state · orphaned number".
    const tf = toggleField(on, (checked) => {
      setPath(brandState, 'typography.titleFloor', checked ? 16 : undefined);
      applyFull();
    });
    const readout = tf.querySelector('.knob-val');
    if (readout) tf.insertBefore(el('span', 'range-tglab mono', '16px'), readout);
    else tf.append(el('span', 'range-tglab mono', '16px'));
    row.append(tf);
    f.append(row);
    range.append(f);
  }
  sec.append(fieldBlock('Range', 'Where the ramp starts and stops. Sizes outside it are not generated.', range));

  // CUSTOMIZE — hidden by default, but never hides the FACT that sizes are pinned.
  const pins = pinnedSizeCount();
  const open = typeSizesOpen ?? pins > 0;
  if (open) computeWidestRows();
  const head = el('div', 'szt-head');
  const tf = toggleField(open, (checked) => { typeSizesOpen = checked; renderWorkspace(); });
  const readout = tf.querySelector('.knob-val');
  const headLab = el('span', 'szt-headlab', 'Edit individual sizes');
  if (readout) tf.insertBefore(headLab, readout); else tf.append(headLab);
  head.append(tf);
  if (pins) head.append(el('span', 'szt-badge', `${pins} customized`));
  sec.append(fieldBlock('Customize sizes', 'Set any size directly, vary it per mode, and — when Responsive is on — pin a desktop or mobile value per size. The shape above still sets everything you don’t touch.', head));
  if (open) for (const g of PER_MODE_SIZE_GROUPS) { const t = renderSizeTable(g); if (t) sec.append(t); }
  return sec;
};

/** Responsive sizing lives on Layout (#361): `minViewport`/`maxViewport` are viewport thresholds, the same
 *  kind of number as the breakpoints they sit beside — not a semantic type decision. Split into the Layout
 *  page's control/preview pair, because the "what fluid does" list IS the preview of what these controls do:
 *  as a `paint` it repaints on every `apply()` while the number fields keep their DOM (and focus).
 *  The #271 "shared across all modes" note did NOT come with it — it disclosed that one section on a
 *  mode-scoped page wrote global state, and Layout is global throughout, so there is no anomaly left to
 *  disclose. */
const renderResponsiveControls = (): HTMLElement => {
  const ty = theme.typography;
  const col = el('div', 'cs-ctl-stack');
  const cb = el('input') as HTMLInputElement;
  cb.type = 'checkbox'; cb.checked = brandState.typography?.responsive?.fluid ?? ty.fluid;
  cb.onchange = () => { setPath(brandState, 'typography.responsive.fluid', cb.checked); apply(); };
  const fl = el('label', 'adv-row'); fl.append(cb, el('span', 'adv-row-lab', 'Fluid heading sizing (clamp between viewports)'));
  col.append(fl);
  const mk = (key: 'minViewport' | 'maxViewport', label: string, fallback: number): void => {
    const inp = numberField({ className: 'adv-num', value: String(getPath(brandState, `typography.responsive.${key}`) ?? fallback) });
    inp.onchange = () => { const n = Number(inp.value); if (Number.isFinite(n)) { setPath(brandState, `typography.responsive.${key}`, n); apply(); } };
    const row = el('div', 'adv-row'); row.append(el('span', 'adv-row-lab', label), inp, el('span', 'adv-unit', 'px'));
    col.append(row);
  };
  mk('minViewport', 'Min viewport', ty.minViewport);
  mk('maxViewport', 'Max viewport', ty.maxViewport);
  return col;
};

/** The breakpoints controls (the editable px list + add/remove) — just the control node now, so the
 *  layout page can pair it with the ruler/table preview beside it (#264). `commit` redraws its own list
 *  locally (count/order may change) then `apply()` — which rebuilds the theme + repaints the layout
 *  previews via the page's refreshers — but never `applyFull`, which would lose focus/scroll mid-edit. */
const renderBreakpointsControls = (): HTMLElement => {
  const listEl = el('div', 'adv-bplist');
  const commit = (arr: number[]): void => {
    const clean = [...new Set(arr.filter((n) => Number.isFinite(n) && n >= 0))].sort((a, b) => a - b);
    setPath(brandState, 'layout.breakpoints', clean); draw(); apply();
  };
  const draw = (): void => {
    listEl.innerHTML = '';
    const bps = (brandState.layout?.breakpoints ?? theme.layout.breakpoints.map((b) => b.px)) as number[];
    bps.forEach((px, i) => {
      const cell = el('div', 'adv-bp');
      const inp = numberField({ className: 'adv-num', value: String(px) });
      inp.onchange = () => { const next = [...bps]; next[i] = Number(inp.value); commit(next); };
      // #559 — hit-min adds an out-of-flow ::before hit box only; adv-x's painted box is untouched
      const rm = el('button', mix('adv-x', 'hit-min'), '×') as HTMLButtonElement;
      rm.onclick = () => commit(bps.filter((_, j) => j !== i));
      cell.append(inp, rm); listEl.append(cell);
    });
    const add = el('button', 'adv-add', '+ Add') as HTMLButtonElement;
    add.onclick = () => { const bps2 = (brandState.layout?.breakpoints ?? theme.layout.breakpoints.map((b) => b.px)) as number[]; commit([...bps2, (Math.max(0, ...bps2) + 256)]); };
    listEl.append(add);
  };
  draw();
  return listEl;
};

const renderEasingEditor = (): HTMLElement => {
  // "the Motion specimen's emphasized BAR" was a stale reference — the specimen was rebuilt as curve
  // cards and has had no bars since; the copy outlived the rendering it pointed at.
  // No backticks in visible copy — el() escapes its text, so markdown ships literally (doc 26).
  const wrap = palSection('Easing', 'Six curves, fixed — no curve’s numbers are authored or change per mode. What you choose is which curve each motion role uses: once for the brand, and per mode where a mode wants to differ. The Motion specimen traces the emphasized card.');
  // The four-input bezier editor for `emphasized` was removed here. It was the only curve whose numbers
  // could be hand-tuned, which made the section inconsistent with itself — and no brand had ever used
  // it: aurora, harbor, nb and wendys all emitted the identical default [0.4, 0.14, 0.3, 1]. The rare
  // capability had shipped while the common one (which curve a role uses) was not settable at all.
  // The curve set is now curated the way the type-size ladder is: you pick from it, you do not author
  // it. A brand that genuinely needs its own curve should get a seventh NAMED curve in the set, not a
  // role whose numbers drift away from what its name says.
  // Every curve, drawn. `linear` and `calm` appeared NOWHERE in the app before this — the section was
  // titled "Easing" and showed one of six. `calm` in particular is an accessibility role (soft onset
  // for long/involuntary motion), which is not a thing to leave undiscoverable.
  wrap.append(subHead('The curve set'));
  const strip = el('div', 'mo-ez-strip');
  for (const [name, bez] of Object.entries(theme.motion.easing)) {
    const card = el('div', 'mo-ez-card');
    const stage = el('div', 'mo-ez-stage'); stage.append(motionStageSvg(bez as number[]));
    card.append(stage, el('div', 'mo-ez-name', name), tokenPillWrapping(`motion.easing.${name}`),
      el('div', 'mo-ez-bez mono', `${(bez as number[]).join(', ')}`));
    strip.append(card);
  }
  wrap.append(strip);
  // Per-mode re-point (#522). The curves themselves stay mode-invariant primitives — a mode swaps
  // which curve a ROLE resolves to, the same contract as the leading and tracking ladders, in the same
  // table. `calm` is the case this exists for: the engine describes it as a soft onset for long or
  // involuntary motion, which is exactly the substitution a dark or reduced-intensity mode wants.
  if (rp.modes.length > 1) {
    const m = theme.motion;
    const curve = (k: string) => `cubic-bezier(${(m.easing[k] ?? []).join(', ')})`;
    // Rows carry the curve NAME, options carry its numbers — the two arrays are already separate, so
    // this needs no extra formatter. The first pass printed the bezier in every cell: it never said
    // which curve a role resolves to (the whole point of the row), repeated a 24-character string
    // three times across, and clipped the last column. The numbers live on the worth line under each
    // select, and on the curve cards directly above.
    wrap.append(renderRepointTable(
      'Easing per mode',
      m.easingRoles.map((r) => ({ key: r.role, val: r.curve, base: r.curve })),
      (v) => String(v),
      'easings',
      Object.keys(m.easing).map((k) => ({ key: k, val: curve(k) })),
      'Role',
      (role, c2) => setPath(brandState, `motionPersonality.easingRoles.${role}`, c2),
    ));
  }
  return wrap;
};

/** The duration ramp, read-only — what Tempo actually scales.
 *
 *  Tempo's whole job is to move this ramp and the page never showed it: 3 of the 6 semantic steps
 *  appeared only as pills inside the transitions specimen, the 9 `duration-ms` primitives they alias
 *  (aurora; harbor: 8) appeared nowhere, and the reduced ramp appeared nowhere at all — while two
 *  separate lines of copy claimed "reduce-motion is derived". A promise made twice and evidenced zero
 *  times.
 *
 *  Reads the CURRENT MODE's re-derived ramp (`motionByMode[mode]`) the same way the specimen does. A
 *  mode can run its own tempo, so reading `theme.motion` directly would print Light's numbers under a
 *  Dark mode bar — the #158 lesson, and the reason this is not simply `theme.motion.duration`. */
const renderDurationRamp = (): HTMLElement => {
  const mo = theme.motion;
  const byMode = mo.motionByMode?.[currentMode];
  const dur = byMode?.duration ?? mo.duration;
  const reduced = byMode?.durationReduced ?? mo.durationReduced;
  const stagger = byMode?.stagger ?? mo.stagger;
  const tempoLabel = byMode?.tempo ?? mo.tempo;
  const wrap = hook(palSection('Duration ramp',
    `The six semantic durations at tempo '${tempoLabel}', each aliasing a literal ms primitive, beside the reduce-motion ramp the engine derives from it. Read-only — Tempo above scales the whole ladder.`), 'section-duration-ramp');
  // the motion ramp IS a contract table; mo-ramp adds the ms column
  const table = el('table', mix('ctable', 'mo-ramp'));
  const head = el('tr');
  // Four columns, each header true of its cell. The first cut had two columns both headed "Aliases",
  // and the second of them held `motion.duration-reduced.<name>` — which is the reduced token's OWN
  // path, not something it aliases. A header that is nearly right is worse than a missing one.
  for (const h of ['Step', 'Duration', 'Aliases', 'Reduce-motion']) head.append(el('th', undefined, h));
  table.append(head);
  // The spinner's turn (#1670) rides the duration pair but is not a step of this ramp: it is a loop period,
  // fixed at every tempo, and its reduced value is slower rather than shorter. So it is not a row here.
  for (const name of Object.keys(dur).filter((n) => n !== SPIN_ROLE)) {
    const ms = dur[name], rms = reduced[name];
    const tr = el('tr');
    const nameCell = el('td'); nameCell.append(el('span', 'mo-ramp-name', name), tokenPill(`motion.duration.${name}`));
    const aliasCell = el('td'); aliasCell.append(tokenPill(`motion.duration-ms.${ms}`));
    const redCell = el('td'); redCell.append(el('span', 'mo-ramp-ms mono', `${rms}ms`));
    // 0ms is the eliminated case, not a fast one — say so rather than leaving a bare 0.
    if (rms === 0) redCell.append(el('span', 'mo-ramp-note', 'eliminated'));
    redCell.append(tokenPill(`motion.duration-reduced.${name}`));
    tr.append(nameCell, el('td', 'mono', `${ms}ms`), aliasCell, redCell);
    table.append(tr);
  }
  wrap.append(table);
  const foot = el('div', 'mo-ramp-foot');
  foot.append(el('span', 'mo-ramp-name', 'stagger'), tokenPill('motion.stagger'), el('span', 'mono', `${stagger}ms`),
    el('span', 'mo-ramp-note', 'between staggered siblings'));
  wrap.append(foot);
  // The primitive tier is a UNION across the base tempo and every mode's tempo (tree.ts builds it that
  // way so an alias always lands on a real leaf), so this lists the union — not the current mode's six.
  const msValues = new Set<number>();
  const collect = (m: { duration?: Record<string, number>; durationReduced?: Record<string, number>; stagger?: number } | undefined): void => {
    if (!m) return;
    for (const v of Object.values(m.duration ?? {})) msValues.add(v);
    for (const v of Object.values(m.durationReduced ?? {})) msValues.add(v);
    if (m.stagger !== undefined) msValues.add(m.stagger);
  };
  collect(mo);
  for (const mm of Object.values(mo.motionByMode ?? {})) collect(mm);
  wrap.append(subHead(`Millisecond primitives — ${msValues.size} values`));
  wrap.append(el('p', 'sl-note', 'Literal, not semantic: one invariant leaf per reachable value across every mode’s tempo. A per-mode tempo re-points the alias above; it never re-values one of these.'));
  const prims = el('div', 'mo-ms-strip');
  for (const v of [...msValues].sort((a, b) => a - b)) {
    const chip = el('div', 'mo-ms-chip');
    chip.append(el('span', 'mo-ms-val mono', `${v}ms`), tokenPillWrapping(`motion.duration-ms.${v}`));
    prims.append(chip);
  }
  wrap.append(prims);
  return wrap;
};

/** Springs — three generated presets, shown because they are real emitted tokens with no other home.
 *  Not editable (the engine fixes them), and deliberately not animated: a spring is damping+stiffness,
 *  and faking one with a cubic-bezier trace would be showing a different curve than the token names. */
const renderSpringsSection = (): HTMLElement => {
  const wrap = palSection('Springs', 'Three generated spring presets for platforms that animate with physics rather than a duration + curve. Read-only — stated as damping and stiffness, the two numbers a consumer needs.');
  const grid = el('div', 'mo-spring-grid');
  for (const [name, s] of Object.entries(theme.motion.spring)) {
    const card = el('div', 'mo-spring-card');
    card.append(el('div', 'mo-ez-name', name), tokenPillWrapping(`motion.spring.${name}`));
    const nums = el('div', 'mo-spring-nums mono');
    nums.append(el('span', undefined, `damping ${(s as { damping: number }).damping}`), el('span', undefined, `stiffness ${(s as { stiffness: number }).stiffness}`));
    card.append(nums);
    grid.append(card);
  }
  wrap.append(grid);
  return wrap;
};

// ---- focused pages (docs/23 §7) -------------------------------------------
// Each editing page composes through one scaffold: hero → sections (or a read-only note on a derived
// mode) → the volatile contextual specimens for that axis. The heavy global preview lives on its own
// Preview tab (3a); these are the tight, single-axis specimens that stay with their editor.

/** The shared screen scaffold. `sections` builds the controls/editors; `specimens` returns the
 *  contextual specimen nodes, repainted on every edit. A derived mode (HC / wireframe) is auto-derived
 *  + read-only, so the controls are replaced by an explanatory note — the specimens still render it. */
const renderScreen = (
  host: HTMLElement, key: LegacyPageKey,
  sections: (h: HTMLElement) => void,
  specimens: () => Array<HTMLElement | null>,
): void => {
  const [title, lede] = PAGE_COPY[key];
  host.append(hero(title, lede));
  if (DERIVED_MODES.has(currentMode)) host.append(renderGeneratedNote());
  else sections(host);
  const vol = el('div', 'stage-vol');
  host.append(vol);
  setVolatile([vol], () => { vol.innerHTML = ''; for (const s of specimens()) if (s) vol.append(s); });
  paintVolatile();
};
// Per-page contrast table (docs/23 §3) — a re-slice of the same authoritative contracts the Preview
// master table shows, scoped to the components this page governs. "Local proof" without leaving the
// page; the full system table stays on Preview. Only the two colour pages govern contrast pairs, and
// the split is EXHAUSTIVE BY CONSTRUCTION: Surfaces owns the text-on-surface components; Interactive is
// the catch-all for everything else. So a component added to the preview spec later can never silently
// vanish from the local tables — it lands on Interactive automatically. (Review nit on #201.)
const SURFACE_CONTRACT_COMPONENTS = new Set(['typography', 'card']);
const renderSectionContrast = (key: PageKey): HTMLElement | null => {
  // Surfaces & fills moved to the two panes (UI redesign S4a), and its page drew no table (Inspect › Contrast
  // has every pair); Interactive keeps its catch-all slice.
  if (key !== 'interactive') return null;
  const cts = rp.contracts.filter((ct) => !SURFACE_CONTRACT_COMPONENTS.has(ct.component));
  if (!cts.length) return null;
  const det = el('details', 'contracts') as HTMLDetailsElement;
  const sum = el('summary', 'contracts-sum');
  sum.append(el('span', 'contracts-t', 'Contrast on this page'), el('span', 'contracts-hint', `${cts.length} pairs · all modes · the full system table lives in Preview`));
  det.append(sum);
  det.append(el('p', 'np-note', 'The a11y pairs this page governs, computed on the resolved colors across every mode — the per-control badges above verify the active mode at the point of edit.'));
  det.append(contractTableEl(cts, true));   // token paths — the component context is obvious next to the controls
  return det;
};

// Interactive & action colors — the per-palette matrix (#69). Global behaviors at the top, then one
// section per action palette (Primary / Neutral / Destructive / accents) of full-width slot rows binding
// every fill/text/inverse/overlay/on-fill role. The per-page contrast table stays volatile below.
const renderInteractivePage = (host: PageHost): void => renderScreen(host, 'interactive', (h) => {
  renderInteractiveMatrix(h);
}, () => [renderSectionContrast('interactive')]);

/** The typography PREVIEW tab — everything the system generates, at size, in every mode.
 *
 *  Read-only by design: the editors live on Semantics/Text styles, and giving the same value two homes is how they
 *  drift. It exists because the ramp was squeezed into the Styles aside, where a 160px display line
 *  and five mode columns have nowhere to go.
 *
 *  It also carries the specimens the tables cannot: a weight number is meaningless as digits, and the
 *  size tables show px rather than type. Those tables are the place to CHANGE a value; this is the
 *  place to SEE it. */
const renderTypePreview = (): HTMLElement => {
  const ty = theme.typography;
  const wrap = el('div');
  // Faces first — every specimen below inherits from them, so seeing what is actually resolving
  // explains anything that looks wrong before you go hunting in the ramp.
  // #415 retired the family ROLE tier; this section kept its vocabulary, so the column read `Role`
  // over rows that are categories, and `Role` then meant two different things on one tab (here, and
  // the weight roles below). Renamed to match the tokens it mirrors: `font.family.<category>`.
  const fam = palSection('Typefaces', `The face each category resolves to${rp.modes.length > 1 ? ', per mode' : ''}. Everything below is set in these.`);
  const ftbl = el('div', 'mtbl');
  const fscroll = el('div', 'mtbl-scroll');
  const ft = el('table', 'mtbl-tbl');
  const fhead = el('thead'), fhtr = el('tr');
  // Rows are CATEGORIES (display/title/body/…), which is what `font.family.*` is keyed by since #415.
  // This said `Role`, so it both named the retired tier and collided with the weight-roles table below
  // — one word, two meanings, one tab.
  fhtr.append(el('th', 'mtbl-stick', 'Category'));
  for (const m of rp.modes) {
    const th = el('th', 'mtbl-mode');
    th.append(document.createTextNode(MODE_LABEL[m] ?? m));
    if (m === 'light') th.append(el('span', 'mtbl-ro', ' baseline'));
    fhtr.append(th);
  }
  fhtr.append(el('th', 'mtbl-fill mtbl-spec', 'Specimen'));
  fhead.append(fhtr); ft.append(fhead);
  const fb = el('tbody');
  for (const f of ty.families) {
    const tr = el('tr');
    const nc = el('td', 'mtbl-stick');
    nc.append(el('span', 'mtbl-name mono', f.group));
    tr.append(nc);
    let stack = f.stack.join(', ');
    for (const m of rp.modes) {
      const per = ty.familiesByMode?.[m]?.find((x) => x.group === f.group)?.stack.join(', ');
      const resolved = per ?? f.stack.join(', ');
      if (m === 'light') stack = resolved;
      const td = el('td', 'mtbl-mode');
      const nm = el('span', 'tp-fam', resolved.split(',')[0].replace(/["']/g, '').trim());
      nm.title = resolved;
      td.append(nm);
      tr.append(td);
    }
    const spec = el('td', 'mtbl-fill mtbl-spec');
    const samp = el('span', 'mtbl-spec-t', 'The quick brown fox jumps');
    samp.style.fontFamily = stack;
    spec.append(samp);
    tr.append(spec);
    fb.append(tr);
  }
  ft.append(fb); fscroll.append(ft); ftbl.append(fscroll); fam.append(ftbl);
  wrap.append(fam);

  // Weight roles × faces (#362) — the availability matrix that used to sit on the primitive tab as a
  // read-only table on an editing tab. Rows are the ROLES (what the system actually ships), columns
  // are the FACES, so it survives a brand with many faces where a fixed per-family table did not:
  // `.mtbl-scroll` takes the overflow. The specimen #356 dropped from the weights EDITOR comes back
  // here, once per face rather than once overall — "600 in Inter" and "600 in a face that stops at
  // 500" are different facts, and only a specimen per face shows it.
  //
  // MODE-BLIND BY DECISION (owner, 2026-08-01): a role's numeric can be re-pointed per mode
  // (`weightRolesByMode`), but availability is a property of the FACE and does not vary by mode, so
  // the table's core fact stays true. Base numerics + a flag naming any re-pointed role, rather than
  // a third axis. The faces column set IS a union across modes though — a face bound only in Dark
  // still ships (or doesn't ship) these weights, so hiding it would drop a real availability fact.
  const wsec = palSection('Weight roles by face', 'Each role at the numeric it resolves to, and whether each face actually ships that weight. Availability is advisory — nothing here is ever blocked. Set the numerics on Semantics.');
  const faces: Array<{ name: string; stack: string; roles: string[] }> = [];
  const addFace = (stackArr: string[] | undefined, cat: string): void => {
    if (!stackArr?.length) return;
    const name = stackArr[0].replace(/["']/g, '').trim();
    const found = faces.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (found) { if (!found.roles.includes(cat)) found.roles.push(cat); return; }
    faces.push({ name, stack: stackArr.join(', '), roles: [cat] });
  };
  for (const f of ty.families) addFace(f.stack, f.group);
  for (const m of rp.modes) for (const f of ty.familiesByMode?.[m] ?? []) addFace(f.stack, f.group);

  const wtbl = el('div', 'mtbl');
  const wscroll = el('div', 'mtbl-scroll');
  const wt = el('table', 'mtbl-tbl');
  const whead = el('thead'), whtr = el('tr');
  whtr.append(el('th', 'mtbl-stick', 'Role'), el('th', 'mtbl-mode', 'Weight'));
  // FIXED-WIDTH face columns, not `mtbl-fill`. One fill column per face made the table's width grow
  // with the face count without bound — measured at 899px inside a 798px container on the DEFAULT
  // two-face brand, so every brand saw the specimens clipped, and 1308px at four faces. The specimens
  // are the entire point of this table, and they were the part cut off.
  //
  // The category list that used to sit in the header moves to its tooltip. It was a third copy of a
  // fact the Semantics Typefaces table (category → face) and the Primitives library ("Binding")
  // already carry, and it was the widest thing in the cell.
  for (const f of faces) {
    const th = el('th', 'mtbl-mode');
    th.append(document.createTextNode(f.name));
    th.title = `${f.name} — used by ${f.roles.join(', ')}\n${f.stack}`;
    whtr.append(th);
  }
  whtr.append(el('th', 'mtbl-fill'));
  whead.append(whtr); wt.append(whead);
  const wb = el('tbody');
  for (const w of ty.weightRoles) {
    const tr = el('tr');
    const nc = el('td', 'mtbl-stick');
    nc.append(el('span', 'mtbl-name mono', w.role));
    tr.append(nc);
    tr.append(el('td', 'mtbl-mode', `${w.value} ${WEIGHT_NAME[w.value] ?? ''}`.trim()));
    for (const f of faces) {
      const known = knownWeightsOf(f.name);
      const ships = !known ? null : known.includes(w.value);
      const td = el('td', 'mtbl-mode');
      td.append(el('span', 'tpw-mark ' + (ships === null ? 'unknown' : ships ? 'yes' : 'no'), ships === null ? '?' : ships ? '●' : '○'));
      // `Ag 123` rather than a sentence — the same specimen the Primitives typeface library already
      // uses, so the two agree, and short enough that a fixed column shows it whole. A weight
      // difference is legible in four glyphs; a sentence only bought width.
      // type-pairing sample inside a mode-table specimen cell
      const samp = el('span', mix('mtbl-spec-t', 'tpw-samp'), 'Ag 123');
      samp.style.fontWeight = String(w.value);
      samp.style.fontFamily = f.stack;
      td.append(samp);
      td.title = ships === null ? `${f.name} — unknown family, availability cannot be asserted`
        : ships ? `${f.name} ships ${w.value}` : `${f.name} may not ship ${w.value} — falls back to the nearest`;
      tr.append(td);
    }
    tr.append(el('td', 'mtbl-fill'));
    wb.append(tr);
  }
  wt.append(wb); wscroll.append(wt); wtbl.append(wscroll); wsec.append(wtbl);
  wsec.append(el('p', 'sl-note', '● ships it · ○ may not (falls back to the nearest) · ? unknown family, not flagged. A specimen that looks identical to the row above it is the fallback showing — that is what ○ predicts.'));
  // The one fact the mode-blind shape would otherwise swallow: say which roles a mode re-points, and
  // where to see it, rather than silently showing Light's numeric as if it were the only one.
  const repointed = ty.weightRoles
    .filter((w) => rp.modes.some((m) => {
      const v = ty.weightRolesByMode?.[m]?.find((x) => x.role === w.role)?.value;
      return v !== undefined && v !== w.value;
    }))
    .map((w) => w.role);
  if (repointed.length)
    wsec.append(el('p', 'sl-note', `Baseline numerics shown. ${repointed.length === 1 ? 'One role is' : `${repointed.length} roles are`} re-pointed in at least one mode (${repointed.join(', ')}) — see Weight roles on the Semantics tab for the per-mode values. Availability itself does not vary by mode.`));
  wrap.append(wsec);

  // And the ramp itself, full width rather than squeezed into the aside.
  wrap.append(renderTypeRamp());
  return wrap;
};

// Typography — type scale (shared, read-only outside Light) + the family/weight/leading editor.
/** Typography splits along the tier line (docs/26). The old two-way Foundations/Styles split (#272)
 *  conflated two different lines, because typography has THREE tiers where every other axis has two:
 *  primitives, semantic roles, and composites. "Foundations" held the size ladder (a primitive) next
 *  to the leading/tracking rung bindings (semantics), and "Styles" held the weight roles (semantics)
 *  next to the categories (composites). Both tabs straddled the line they were named for.
 *
 *  Four tabs, one tier each:
 *   • PRIMITIVES — the raw material. The typeface library is the ONLY editable primitive in the whole
 *     axis; the size / leading / tracking ladders are fixed and brand-invariant, shown read-only
 *     because otherwise they are visible nowhere in the app and you only ever see the steps some role
 *     happens to bind.
 *   • SEMANTICS — every row is the same shape: a named role and the primitive it binds, re-pointable
 *     per mode. Faces, weights, leading and tracking all four fit it. That regularity is the argument
 *     for the split — it is invisible while the tiers are mixed, and it is what makes this tab teach
 *     the model rather than just list controls.
 *   • TEXT STYLES — the composites and the levers that shape them (shape, range, per-size pins,
 *     which role each category consumes, weights, links, italics).
 *   • PREVIEW — everything generated, at size, in every mode. Read-only.
 *
 *  SIZE has no Semantics row, and that is load-bearing rather than an omission: a size role would
 *  duplicate the composite name — `body.md` IS the size role — where `tight` is not implied by
 *  `caption`. So size runs ladder → composite and lives wholly in Text Styles. Don't "fix" it by
 *  inventing one. */
type TypeTab = 'primitives' | 'semantics' | 'styles' | 'preview';
let typeTab: TypeTab = 'primitives';
const TYPE_TABS: Array<[TypeTab, string]> = [['primitives', 'Primitives'], ['semantics', 'Semantics'], ['styles', 'Text styles'], ['preview', 'Preview']];
const renderTypographyPage = (host: PageHost): void => renderScreen(host, 'typography', (h) => {
  const seg = el('div', 'pvseg');
  for (const [k, label] of TYPE_TABS) {
    const b = hook(el('button', 'pvseg-b' + (typeTab === k ? ' on' : ''), label) as HTMLButtonElement, `type-tab-${k}`);
    // The tab switch changes the strip too, not just the body: the tier a tab shows IS what the
    // switcher's visibility turns on (#268) — primitives are mode-invariant and semantics/composites
    // are not. `renderWorkspace` now ends by repainting the strip (#771), so the tab no longer asks
    // for it separately; page nav gets the same thing via `build()`.
    b.onclick = () => { if (typeTab !== k) { typeTab = k; renderWorkspace(); } };
    seg.append(b);
  }
  h.append(seg);
  h.append(el('p', 'tabnote', typeTab === 'primitives'
    ? 'The raw material. Only the typeface library is yours to edit — the ladders below it are fixed and brand-invariant, shown so you can see what every style is chosen from.'
    : typeTab === 'semantics'
      ? 'Named roles, each bound to one primitive. A mode can re-point any of them without touching the primitive underneath.'
      : typeTab === 'styles'
        ? 'The styles your product actually uses, and the levers that shape them.'
        : 'Everything the system generates, at size, in every mode. Nothing here is editable.'));
  if (typeTab === 'primitives') h.append(renderTypefaceLibrary(), renderSizeLadder(), renderRungLadders());
  else if (typeTab === 'semantics') {
    // Faces → weights → leading/tracking. One shape repeated four times: role, the primitive it binds,
    // who uses it, and (below) what each mode substitutes.
    h.append(renderTypefaceBindings(), renderWeightRoles(), renderLeadingTracking());
    const repoints = renderRepoints();
    if (repoints) h.append(repoints);
  } else if (typeTab === 'styles') h.append(renderTypeSizes(), renderCategorySetup(), renderFacePins());
  else h.append(renderTypePreview());
  // No aside on any tab. The ramp used to sit in the Styles aside on the doc-26 rule that a section
  // carries its own specimen in context — but that rule is satisfied by the Preview tab now, and a
  // ~220px column was never an honest place to show a 160px display line beside five mode columns.
  // One ramp, one home.
}, () => []);

// Elevation — the shadow ramp (softness + tint live together in the bespoke editor).
const renderElevationPage = (host: PageHost): void => renderScreen(host, 'elevation', (h) => {
  h.append(renderShadowEditor(leverByKey('shadow.softness')));
}, () => [renderShadowSpecimen()]);

// Size & radius — component sizing (density) + corner radius; both go per-mode outside Light.
// Render one lever's control, honouring the per-mode ramp variants (radius / density / tempo go per-mode
// outside Light). Shared by the geometry/motion pages so each concept `.psec` composes the same way.
const leverControl = (key: string, perMode: boolean, commit?: () => void): HTMLElement | null => {
  const l = leverByKey(key); if (!l) return null;
  // The three per-mode variants already commit through `applyFull` (see `renderPerModeSelect`), which
  // is why #800 was never visible outside Light: there, changing the tempo re-renders the page and the
  // Duration ramp comes back current. Only the global control had it.
  // Outside the base mode these three add an "Auto — follows global" entry. A choice set with an Auto
  // entry stays a select (#1675), so they keep the per-mode selects; chips are the base mode's control.
  const perModeSelect = perMode ? PER_MODE_SELECTS[key] : undefined;
  if (perModeSelect) return perModeSelect(l);
  return renderControl(l, commit);
};
/** A `.psec` concept section built from a set of lever keys (doc 26). Returns null when none of its
 *  levers resolve, so an empty concept never renders an empty panel. `commit` is handed to every
 *  control in the section — see `renderControl`. */
const leverSection = (title: string, sub: string, keys: string[], perMode: boolean, commit?: () => void): HTMLElement | null => {
  const sec = palSection(title, sub); let any = false;
  for (const k of keys) { const c = leverControl(k, perMode, commit); if (c) { sec.append(c); any = true; } }
  return any ? sec : null;
};

// Size & radius — grouped by concept (doc 26): corner radius, density/size, spacing grid. Each control
// block sits beside its live preview (#265, shared scaffold with Layout). radius + density stay per-mode
// outside Light — the controls reuse `leverControl(key, perMode)`, so that semantics is unchanged.
const csLeverStack = (keys: string[], perMode: boolean): HTMLElement => {
  const stack = el('div', 'cs-ctl-stack');
  for (const k of keys) { const c = leverControl(k, perMode); if (c) stack.append(c); }
  return stack;
};
/** Same shape as `spacingFixedNote`: a read-only scale still gets a control column that says why it is
 *  empty, rather than an empty column that reads as a rendering bug. */
const primitiveScalesNote = (): HTMLElement => el('p', 'ic-modenote',
  'Nothing to set here. The dimension grid is the fixed 4px-step ladder every geometry token resolves '
  + 'onto — border widths and icon sizes are named aliases onto it, and radius, spacing and component '
  + 'sizes land on its steps. Change those on the sections above; this is what they land on.');

/** The Spacing grid section has no controls by design — both its levers were removed. Says why, rather
 *  than leaving an empty control column that reads as a rendering bug. */
const spacingFixedNote = (): HTMLElement => el('p', 'ic-modenote',
  'The 8px rhythm is fixed for every brand. Changing the base would rename spacing values rather than '
  + 'unlock them — 4px is still available as space.050 — and the numbered scale only means “n× base” '
  + 'across brands if the base is the same across brands.');

const renderSizeRadiusPage = (host: PageHost): void => controlSplitPage(host, 'sizeRadius', () => {
  const perMode = currentMode !== 'light';
  return [
    { title: 'Corner radius', sub: 'The corner-radius ramp — its anchor (radius.md at scale 1), the softness dial that scales the whole ramp, and the opt-in 1px hairline the even sub-grid cannot otherwise reach.', controls: csLeverStack(['baseMd', 'radiusScale', 'radiusHairline'], perMode), paint: paintRadiusPreview },
    // controlShape is a GLOBAL brand lever (not per-mode) — `csLeverStack([…], false)` renders the plain
    // enum select. It sits beside corner softness on purpose: both shape the corner, but orthogonally
    // (softness scales the ramp; pill overrides it with height ÷ 2 for pill-able controls).
    { title: 'Control shape', sub: 'Corner shape for pill-able controls (button, icon-button). Boxed is sharp; hairline is a fixed 1px edge; rounded follows corner softness; pill is a full height ÷ 2, whatever the softness.', controls: csLeverStack(['controlShape'], false), paint: paintControlShapePreview },
    // The button levers (#1667) are GLOBAL brand levers like controlShape, so `false` again. The labels are
    // the owner's exact words and live in `levers.ts`; this block only groups them beside their specimen.
    { title: 'Buttons', sub: 'Button icon placement, the medium label and icon size, the label weight, and minimum width. Applies to buttons, not icon buttons.', controls: csLeverStack(['buttonIcons', 'buttonContentSize', 'buttonLabelWeight', 'buttonMinWidthMultiplier'], false), paint: paintButtonLayoutPreview },
    // Per mode, the note says what a mode's own density does and does not move (owner, 2026-09-29, docs/28
    // §5.4.3); the sentence is the density lever's own, so the knob and the section read the same.
    { title: 'Density & size', sub: perMode
      ? 'Component sizing — control height per step. Spacing follows the brand’s density, not the mode’s: a mode’s density changes control heights only.'
      : 'Component sizing — control height per step. The density name stays stable; the heights shift, and each component’s padding and gaps move one step on the spacing scale.', controls: csLeverStack(['density'], perMode), paint: paintSizePreview },
    // No controls: the rhythm and the fine grid base are FIXED (scale.ts SPACE_BASE / GRID_BASE). The
    // specimen stays — the scale is still worth reading — and the note says why there is nothing to set,
    // which is more use than a section that quietly vanished.
    { title: 'Spacing grid', sub: 'The spacing rhythm — space.100 = 1× an 8px base, fixed for every brand.', controls: spacingFixedNote(), stack: true, paint: paintSpacingPreview },
    // These three scales are emitted, aliased by half the system, and were visible NOWHERE in the
    // dashboard — a user could only find them in Preview's token list. Nothing here is settable, which
    // is exactly why they had no home: the page is organized around levers, and a scale with no lever
    // fell through. Read-only is the point — see what exists, and what the names resolve to.
    { title: 'Primitive scales', sub: 'The raw grid the geometry aliases resolve onto — fixed for every brand, and read-only. Radius, spacing and component sizes all land on dimension steps.', controls: primitiveScalesNote(), stack: true, paint: paintPrimitivesPreview },
  ];
});

// ---- controls-beside-previews pages (docs #264 / #265) --------------------
// Layout and Size & radius put each control NEXT TO its own live preview, so a change is visible without
// scrolling to a specimen block far below. Built like the Palettes page: controls are stable and only the
// preview sub-nodes repaint (via `refreshers` → paintVolatile), so a slider/select is never rebuilt
// mid-interaction. `controlSplitPage` is the shared scaffold both pages compose from.
/** `controls: null` STACKS the block — description under the heading, specimen full-width below.
 *  The two-column split earns its keep when a setting sits beside the thing it changes; with no
 *  setting it just reserves an empty left column and squeezes the specimen into ~490px. Blocks that
 *  DO have controls can opt in with `stack: true` where the specimen needs the width more than the
 *  adjacency (Layout's breakpoint table and the fluid-type list both overran the narrow column). */
type SplitBlock = { title: string; sub: string; controls: HTMLElement | null; stack?: boolean; paint: (into: HTMLElement) => void };
/** The shared scaffold: hero → (derived-mode note, or) one `.cs-split` section per block (controls beside a
 *  preview node) → a page-local `paintVolatile` that repaints only the preview nodes on every `apply()`. */
const controlSplitPage = (host: HTMLElement, pageKey: LegacyPageKey, blocks: () => SplitBlock[]): void => {
  const [title, lede] = PAGE_COPY[pageKey];
  host.append(hero(title, lede));
  // A derived mode renders a note and no previews — so there is nothing to repaint, and this branch
  // has to SAY so. Returning without assigning left the PREVIOUS page's painter live, which is the
  // exact hazard `renderComponentsPage` documents; harmless while every commit rebuilt the page from
  // scratch, and not harmless now that a commit repaints through the painter (#771).
  if (DERIVED_MODES.has(currentMode)) { host.append(renderGeneratedNote()); setVolatile([], () => {}); return; }
  const refreshers: Array<() => void> = [];
  const previews: HTMLElement[] = [];
  for (const b of blocks()) {
    const sec = palSection(b.title, b.sub);
    const preview = el('div', 'cs-preview');
    if (!b.controls || b.stack) {
      if (b.controls) sec.append(b.controls);
      addClass(preview, 'cs-preview-full');
      sec.append(preview);
    } else {
      const split = el('div', 'cs-split');
      const ctlCol = el('div', 'cs-ctl-col'); ctlCol.append(b.controls);
      split.append(ctlCol, preview);
      sec.append(split);
    }
    host.append(sec);
    previews.push(preview);
    refreshers.push(() => b.paint(preview));
  }
  setVolatile(previews, () => { refreshers.forEach((r) => r()); });
  paintVolatile();
};
/** A compact labeled slider for the split pages — value read-out updates live on drag; the theme commits
 *  on release (`change` → apply()), which repaints the previews via the registered refreshers. Not the
 *  full-width `.knob` slider (overkill here, per #264/#265). */
const csSlider = (key: string, label: string, min: number, max: number, step: number, unit: string, get: () => number): HTMLElement => {
  const f = el('div', 'cs-ctl');
  const top = el('div', 'cs-ctl-top');
  const val = el('span', 'cs-ctl-val mono', `${get()}${unit}`);
  top.append(el('span', 'cs-ctl-lab', label), val);
  const input = rangeInput({ className: 'cs-range', min, max, step, value: get() });
  input.oninput = () => { val.textContent = `${input.value}${unit}`; };
  input.onchange = () => { setPath(brandState, key, Number(input.value)); apply(); };
  f.append(top, input);
  return f;
};
/** A compact labeled enum picker for the split pages (curated choices → a select). Commits on change. */
const csPicker = (key: string, label: string, choices: Array<[string, string]>, cur: string, onCommit?: () => void): HTMLElement => {
  const sel = selectEl('cap');
  for (const [value, text] of choices) sel.append(optionEl(value, text, value === cur));
  sel.onchange = () => { setPath(brandState, key, sel.value); if (onCommit) onCommit(); else apply(); };
  const f = el('div', 'cs-ctl'); f.append(el('span', 'cs-ctl-lab', label), sel);
  return f;
};

// Layout — breakpoints, grid columns, container caps (docs #264).
const LAYOUT_COLUMN_CHOICES = [4, 6, 8, 12, 16, 24];   // curated grid systems — no odd/awkward counts (#264)
const renderLayoutPage = (host: PageHost): void => controlSplitPage(host, 'layout', () => {
  // Grid columns — a curated step-picker (4/6/8/12/16/24, no awkward counts). Numeric key → coerce on commit.
  const colSel = selectEl('cap');
  const curCols = (brandState.layout?.columns ?? theme.layout.baseColumns) as number;
  for (const c of LAYOUT_COLUMN_CHOICES) colSel.append(optionEl(String(c), `${c} columns`, c === curCols));
  colSel.onchange = () => { setPath(brandState, 'layout.columns', Number(colSel.value)); apply(); };
  const colsCtl = el('div', 'cs-ctl'); colsCtl.append(el('span', 'cs-ctl-lab', 'Grid columns'), colSel);

  const caps = el('div', 'cs-ctl-stack');
  caps.append(
    csSlider('layout.containerMax', 'Container max', 960, 1920, 40, 'px', () => (brandState.layout?.containerMax ?? theme.layout.containerMax) as number),
    csSlider('layout.containerNarrow', 'Content container', 480, 960, 20, 'px', () => (brandState.layout?.containerNarrow ?? theme.layout.containerNarrow) as number),
  );
  return [
    { title: 'Breakpoints', sub: `Min-width floors (px, ascending) — names auto-assign from the count: ${theme.layout.breakpoints.map((x) => x.name).join(' / ')}.`, controls: renderBreakpointsControls(), stack: true, paint: paintBreakpointsPreview },
    // Beside breakpoints on purpose (#361): both are viewport thresholds in px, and the interpolation
    // range only means something read against the floors it spans.
    { title: 'Responsive type sizing', sub: 'Headings interpolate between a mobile floor and a desktop ceiling across this viewport range; body, label, caption and code stay fixed by design. Eyebrow shrinks only above 14px, so small kickers hold their size and hero kickers do not.', controls: renderResponsiveControls(), stack: true, paint: paintFluidPreview },
    { title: 'Grid columns', sub: 'Base column count for the design grid (16 / 24 for dense-data brands). Each breakpoint gets a 4/8/… ladder up to this base.', controls: colsCtl, paint: paintColumnsPreview },
    // The resolved per-breakpoint grid — the same `theme.layout.grid` the Figma grid-style emitter ships
    // from (#1480/#1532/#1593), so the readout cannot drift from what a brand exports. Columns, gutter and
    // margin are each editable per breakpoint (an override wins over the ladder); gutter/margin snap to the
    // spacing scale so they keep aliasing the space tokens.
    { title: 'Per-breakpoint grid', sub: 'The columns, gutter and margin the engine emits for each breakpoint — one Figma grid style each. Each follows its ladder by default; override a breakpoint to pin its value. Gutter and margin snap to the spacing scale, reaching down to 4px.', controls: perBreakpointColsNote(), stack: true, paint: paintPerBreakpointGrid },
    { title: 'Container caps', sub: 'Content-width caps — layout is fluid below the cap. The content container is the narrower reading-measure column (~65–75ch).', controls: caps, stack: true, paint: paintContainersPreview },
  ];
});

// Motion — Tempo (per-mode outside Light) + the Easing curve, each its own concept section.
const renderMotionPage = (host: PageHost): void => renderScreen(host, 'motion', (h) => {
  const perMode = currentMode !== 'light';
  // The section head no longer restates the knob's own description verbatim — both said "scales the
  // duration ramp" and "reduce-motion is derived", three lines apart. The head says what the section
  // governs; the knob keeps the multipliers.
  // #800 — TEMPO COMMITS FULLY, and this is the one page where that is not over-reach.
  //
  // `apply()` recomputes the theme and repaints the VOLATILE region; on a `renderScreen` page the
  // volatile region is the `.stage-vol` specimen box and nothing else. Every other section here is
  // built once per `renderWorkspace` and never touched again. Three of the four sections below are
  // read-only renderings OF THE TEMPO — the Duration ramp's six durations, its ms primitives, its
  // stagger and its `tempo '…'` label — so a tempo edit that commits through `apply()` repaints the
  // one section that does not display the ramp and leaves the three that do showing the previous
  // tempo's numbers. Measured before it was fixed: three successive edits (snappy → relaxed →
  // standard) all left `[40, 80, 160, 240, 400, 640]` on screen. Not stale by one commit — stale
  // since the last full render, which is what a single-edit measurement could not tell apart.
  //
  // `applyFull()` re-renders the page region by region (#771), so the ramp is rebuilt from the
  // resolved theme and every unchanged region is kept. It is also what the per-mode tempo select has
  // always done, which is why this was only ever visible in the base mode.
  const tempo = leverSection('Tempo', 'The overall motion speed for this brand. Per-mode outside Light.', leversFor('motion').map((l) => l.key), perMode, applyFull);
  if (tempo) h.append(hook(tempo, 'section-tempo'));
  h.append(renderDurationRamp());
  h.append(renderEasingEditor());
  h.append(renderSpringsSection());
}, () => [renderMotionSpecimen()]);

/** Which background role the Style guide's specimens are previewed on. Module state so it survives a repaint,
 *  like `currentMode`. The legacy Preview page that held it, with its three views, is gone (UI redesign S3):
 *  the Style guide is Brand's preview, lent to `preview/brand.ts`, and the contract table and the token
 *  list are Inspect's (S1.3). */
let sgSurface = 'background.primary';

/**
 * Which defs can actually be materialized, ASKED rather than listed (#804).
 *
 * It projects each def and keeps the ones that do not throw, so the answer is the projector's and not a
 * second copy of it. The alternative — a literal array, or a `!!def.anatomy && !!def.figmaProperties`
 * predicate — is the mistake this very control already made once: `renderComponentsPage` carried the
 * claim *"Button is the only def of the five that has one"*, true when written and false since #734,
 * #741 and #796, because a count in a comment has an expiry date that nothing checks. The plugin's
 * `main.ts` had the twin claim and fixed it the same way (#742/#787). A predicate would rot more slowly
 * and still rot: it restates `figmaAnatomySet`'s preconditions from outside, so a third requirement
 * added there would leave this list confidently wrong.
 *
 * The member count comes free and is worth carrying: it is the only honest per-def cost estimate, since
 * a run is ~162ms per member (#700) and the defs span 4 to 648 — a single "about 105 seconds" note
 * would be wrong by two orders of magnitude for three of the four.
 *
 * The throw is the SIGNAL, not an error to report: `figmaAnatomySet` throws precisely when a def has no
 * `anatomy` or no `figmaProperties`, which is the definition of not-materializable. A def missing here is
 * expected rather than broken, and the page says so instead of listing them as failures.
 *
 * TWO REASONS TO BE MISSING, AND THE SECOND IS NOT A THROW (#869). This comment used to name `focus-ring`
 * and `field-message` as the throwing pair, which was true at #795 and false from the moment #795's own
 * work gave `focus-ring` a `figmaProperties` block: it has projected cleanly ever since — 2 members, 0
 * binding errors — and this filter therefore *offered* it. Building it produced a 100×100 white frame with
 * the right token at 1px, because its members bind no geometry (`notStandalone` on the def has the
 * measurement). So the second reason is a DECLARED one: a def stating `figmaProperties.notStandalone`
 * cannot render standalone and is withheld, quoting its own string. Asking the projector is still right
 * for the first reason and cannot reach the second — a plan that renders nothing is structurally
 * indistinguishable from one that renders, which is why the answer had to be declared rather than
 * inferred. Note what this comment's own history demonstrates: it warns two paragraphs later that a count
 * in a comment expires unchecked, and the same is true of a NAMED LIST. `missing` is derived; the names in
 * this prose are not, and that is the one thing here nothing gates.
 *
 * Computed ONCE at module scope, not per render: the defs are compiled in and brand-invariant, so this
 * cannot change while the app is running.
 *
 * GATED ON `PRISM3_HOST`, WHICH IS ABOUT THE WEB BUNDLE RATHER THAN CORRECTNESS. The control is Figma-only
 * (`commit.isFigma` returns early below), so on web the answer is unused — but the import graph does not
 * know that. Measured: importing `figmaAnatomySet` and `componentDefs` unconditionally put 35KB gzip of
 * projector and every component def into the *web* bundle, a 20% increase over a 140KB baseline, for a
 * control that page can never reach. Behind the define, esbuild eliminates the defs and most of the
 * projector: 147KB. Both fields come from the one gated expression because a second ungated reference to
 * `componentDefs` would defeat it — which is why `missing` is derived here rather than at the call site.
 *
 * It does NOT eliminate all of it: ~18KB of `anatomy-figma.ts` survives, because that module's top-level
 * template constants are not provably side-effect-free. That is why `anatomy-figma.ts`, `component-schema.ts`
 * and `eval.ts` came OFF the exclusion list in `vercel-ignore.sh` in the same PR — a change to any of them
 * can now change the deployed site, so treating them as Figma-only would be a #474 stale deploy. Dead-code
 * elimination is a size optimization, not a dependency boundary.
 */
const COMPONENT_CATALOGUE: {
  /** `components` marks a def built as separate top-level components (`emitAsComponents`, icon) rather
   *  than one set of variants, so the picker counts it in the right unit (#1623). */
  readonly buildable: readonly { id: string; name: string; members: number; components: boolean }[];
  /** Not offered, each WITH its own reason — see the second-reason paragraph above. `reason` is the def's
   *  own `notStandalone` string where it declared one, and `null` where the projector threw. */
  readonly missing: readonly { name: string; reason: string | null }[];
} =
  PRISM3_HOST === 'figma'
    ? (() => {
        const buildable = componentDefs.flatMap((d) => {
          // Checked BEFORE projecting, not after: the projection succeeds for exactly the def this
          // excludes, so a post-hoc filter would spend the work and then discard a valid-looking plan.
          if (d.figmaProperties?.notStandalone) return [];
          try {
            return [{ id: d.id, name: d.name, members: figmaAnatomySet(d, { swapTarget: 'FPO-default-icon' }).length, components: d.figmaProperties?.emitAsComponents === true }];
          } catch {
            return [];
          }
        });
        const ids = new Set(buildable.map((b) => b.id));
        return {
          buildable,
          missing: componentDefs
            .filter((d) => !ids.has(d.id))
            .map((d) => ({ name: d.name, reason: d.figmaProperties?.notStandalone ?? null })),
        };
      })()
    : { buildable: [], missing: [] };

/** The file-setup button's label (#1558). Placement and wording are a design call the owner confirms at
 *  review, so the one string a reviewer changes lives here rather than inline — "Set up file" or "Scaffold
 *  pages" were the two proposals; this is the default. Shipped UI text: US-English + `docs/voice-standard.md`. */
const FILE_SETUP_LABEL = 'Set up file';

/**
 * The Components page (#718) — the new home of the component write, moved off the primary action bar.
 *
 * THE MOVE IS A DEMOTION. The control sat beside **Apply Theme**, which is the terminal action of
 * the theme flow and the thing a designer runs after every knob change. A build takes tens of seconds
 * at ~162ms per member (#700) and materializes a fraction of the catalogue, so a slot next to Apply
 * claimed a parity that does not exist. Rail item, marked internal, is where a materialization proof
 * belongs — see `NAV` for the framing and docs/28 / docs/14 §3.1 for why it is kept runnable at all.
 *
 * "A fraction", not "one of five": the claim here used to be *"Button is the only def of the five that
 * has one"* and the control was named for Button on that basis. It was true when written and false since
 * #734, #741 and #796 — four defs project today. It is now `COMPONENT_CATALOGUE` (derived, above) in both the
 * picker and this prose, which is the same fix the plugin's twin comment took (#742/#787): a count in a
 * comment has an expiry date that nothing checks, so state the property and point at the derivation.
 *
 * The three internal/experimental statements are deliberately different rather than one repeated
 * label, because each answers a different question a designer would actually ask here: the rail sub
 * says WHAT it is, the notice says WHY it is not offered as a feature and what it costs to run, and
 * the button's `title` says the ORDER — the one fact a build's result cannot recover, since the set
 * binds variables by name and a build into an unthemed file misses every binding.
 *
 * Reached only in the plugin: `railNav()` omits it on web, and `PAGE_RENDERERS` never fires for a page
 * that has no rail row. `commit.isFigma` is re-checked here regardless — this function is exported into
 * the map by name, so a future caller reaching it directly would otherwise render a control whose
 * `postComponents` is inert.
 */
const renderComponentsPage = (host: PageHost): void => {
  const [title, lede] = PAGE_COPY.components;
  host.append(hero(title, lede));
  // Every other page renderer assigns `paintVolatile`, and it is MODULE state — so a page that skips
  // the assignment leaves the previous page's closure live, and the next `apply()` paints specimens
  // into nodes this render already detached. Nothing here varies with a lever (the def and its variant
  // count are brand-invariant), so the correct value is a no-op — but it has to be assigned to BE one.
  // Declaring NO volatile hosts alongside it is the other half of the same statement (#771): this page
  // has nothing that repaints, so every one of its regions is eligible to be kept.
  setVolatile([], () => {});
  if (!commit.isFigma) return;

  // FILE SETUP (#1558) — ABOVE the component build, because it lays the skeleton the build then fills: it
  // scaffolds the file's pages (Cover, dividers, section headers, Foundations, Sandbox) and builds the two
  // template assets onto File Components, so a build has a page to land on. Its own section rather than a
  // control in the build's row, for the #652 reason every canvas write here is its own action — a distinct
  // designer choice with its own trigger and its own verdict slot (`fileSetupState`). The label and this
  // placement are the owner's to confirm at review (#1558); `FILE_SETUP_LABEL` is the one string to change.
  const fsSec = palSection(FILE_SETUP_LABEL, 'Lays the file’s page skeleton and builds its template assets.');
  const fsNote = el('p', 'cw-note');
  fsNote.append(
    el('b', undefined, 'Internal — experimental. '),
    document.createTextNode(
      'This creates the file’s pages — Cover, section headers, Foundations and the Sandbox — and builds the '
      + 'two template assets onto the File Components page, so a component build has somewhere to land. It is '
      + 'idempotent: a re-run adds no page already present and rebuilds no asset already there. Known limits '
      + 'are tracked on #1554.',
    ),
  );
  fsSec.append(fsNote);

  const fsRow = hook(el('div', 'fs-row'), 'file-setup-row');
  fileSetupRow = fsRow;
  const fsBtn = hook(el('button', 'barbtn') as HTMLButtonElement, 'file-setup-button');
  fileSetupBtn = fsBtn;
  // One line, under the ~90 the plugin register allows. It states the one fact a re-run needs — that this
  // never duplicates — because the build's `title` beside it already carries the order the two run in.
  fsBtn.title = 'Creates the file’s pages and template assets. Safe to re-run — it never duplicates a page.';
  fsBtn.onclick = () => {
    // `openDetail` cleared for the same reason the build clears it: the previous run's detail is stale the
    // instant a new one starts, and the shared row is chrome, so the bar has to be told the row is gone.
    runFileSetup();
  };
  fsRow.append(fsBtn);
  // Staged, like the build's row: this page is built DETACHED and reconciled in (#771), so the initial sync
  // runs against a row not yet in the document — see `syncComponentRow`'s header for why the caller says so.
  syncFileSetupRow({ staged: true });
  fsSec.append(fsRow);
  host.append(fsSec);

  const sec = palSection('Build a component set', 'Writes one component set onto the current Figma page.');

  // The internal notice. States the mechanism and the cost, per the voice standard: what it is for, what
  // it costs, and what it does not do — so a designer who runs it is not surprised, and one who skips it
  // is not missing a feature.
  //
  // THE COST IS NOW PER DEF rather than one number in this sentence. It used to read "a full run writes
  // 648 variants … roughly 105 seconds", which was a measurement of Button stated as a property of the
  // action — off by two orders of magnitude for a 4-member def. The per-member rate is the part that
  // transfers (#700), so the rate lives here and the multiplication lives in the picker beside each def.
  const note = el('p', 'cw-note');
  note.append(
    el('b', undefined, 'Internal — experimental. '),
    document.createTextNode(
      'This exists to prove the component definition format can materialize, so it is not a supported '
      + 'way to get components into a file. Each variant takes about 162ms to write, in short bursts '
      + 'that leave Figma stuttering rather than frozen — so the cost is the variant count beside each '
      + 'set below. Figma then reconciles the new nodes after the result lands: that settle was measured '
      + 'at 1m10s on the 648-variant Button run, and it is not something this plugin can shorten. Known '
      + 'limits are tracked on #718.',
    ),
  );
  sec.append(note);

  // WHICH DEFS ARE MISSING, AND WHY, said plainly rather than by omission. A designer who knows the
  // catalogue has seven components and sees four here would otherwise reasonably read it as a bug. The
  // requirement is ours, not Figma's (#795), which is the honest way to put it.
  //
  // ONE SENTENCE PER REASON, NOT ONE FOR THE GROUP (#869). This block said "a set needs a declared size
  // axis to project" about every absent def, which was one cause stated as the only cause — and by the
  // time #869 was filed it was the wrong cause for the def a designer was most likely to ask about.
  // A def declaring `notStandalone` gets its own string; the rest keep the projector sentence.
  const { buildable, missing } = COMPONENT_CATALOGUE;
  const declared = missing.filter((m) => m.reason);
  const threw = missing.filter((m) => !m.reason).map((m) => m.name);
  if (threw.length) {
    const gap = el('p', 'cw-note');
    gap.append(
      document.createTextNode(
        `${threw.join(', ')} ${threw.length === 1 ? 'is' : 'are'} not offered here yet. The projector `
        + 'cannot build a Figma set from the definition yet, which is a limit in our own projector rather '
        + 'than something Figma cannot hold.',
      ),
    );
    sec.append(gap);
  }
  for (const m of declared) {
    const gap = el('p', 'cw-note');
    // The def's own words, verbatim apart from the machine-readable lead. A paraphrase would be a second
    // copy of a claim the def is the authority on, and this page has already had one of those go stale
    // (see `COMPONENT_CATALOGUE`).
    //
    // The `<id>:` prefix is STRIPPED, and it has to be: the schema requires the string to lead with the
    // def's id so a gate can tell an admission from a mention, and this heading already carries the def's
    // display name — so rendered raw it reads "FocusRing — focus-ring: a ring is…", naming the same
    // component twice in six words. The prefix is addressed to `figmaPropertyErrors`, not to a designer.
    // Removed by a leading-anchored replace rather than a split, so a colon later in the sentence is safe.
    const prose = (m.reason as string).replace(/^\S+:\s*/, '');
    gap.append(el('b', undefined, `${m.name} — `), document.createTextNode(prose));
    sec.append(gap);
  }

  const row = hook(el('div', 'cw-row'), 'components-row');
  componentRow = row;

  // A PICKER, NOT A BUTTON PER DEF. Four sets today and Arc 2 adds more, so a control per def would grow
  // the page every time a def earns a `figmaProperties` block. The select is also what carries the cost:
  // the member count sits in each option, because that is the number a designer needs BEFORE choosing —
  // Button is ~105s and FieldLabel is under a second, and a picker that hid that would make the two look
  // like equivalent choices.
  //
  // Defaults to Button, matching what this page has always built, so the familiar action is the one
  // already selected rather than one the designer has to find.
  // `cap` rather than a new `cw-*` class: the only styling this needs is a width cap, which `.select.cap`
  // already is (`styles.css`), and a new pairing would mean a new `ALLOWED` entry in `lint-classes.mjs`
  // for a rule identical to one that exists.
  const sel = selectEl('cap');
  for (const b of buildable) {
    const unit = b.components ? 'component' : 'variant';
    const opt = el('option', undefined, `${b.name} — ${b.members} ${unit}${b.members === 1 ? '' : 's'}`) as HTMLOptionElement;
    opt.value = b.id;
    if (b.id === 'button') opt.selected = true;
    sel.append(opt);
  }
  componentSel = hook(sel, 'components-def-picker');
  sel.title = 'Which set to build. The variant count is the cost — about 162ms each.';
  row.append(sel);

  // NAMED FOR THE ACTION, NOT THE DEF, which is a change and the reason is that the def is now a
  // selection beside it. The label read "Build Button set" because Button was the only def that could be
  // built and a generic label would have promised four components it could not deliver (#718). With a
  // picker the specificity moved into the picker, and a label naming one def would contradict it.
  const compBtn = hook(el('button', 'barbtn') as HTMLButtonElement, 'components-build');
  componentBtn = compBtn;
  // One line, under the ~90 the plugin register allows. It states the ORDER because that is the fact a
  // designer cannot recover from the result: the set binds variables by name, so a build into an
  // unthemed file misses every binding.
  compBtn.title = 'Builds the selected set on this page. Apply Theme first — it binds those variables.';
  // `componentProgress` clears here as well as on the result (#684) — belt and braces on purpose. The
  // result handler is the normal path, but a build that THROWS in the main thread before the executor
  // returns posts a failed result, and one that never answers at all posts nothing; without this line a
  // fraction from the abandoned run would be the first thing the next build's pill shows.
  //
  // `renderBar()` still runs even though the control is no longer IN the bar: the bar hosts the boot
  // read-back pill and the theme write's own status, and `openDetail` is cleared here — the shared
  // detail row is chrome, so the bar has to be told the row it was showing is gone.
  compBtn.onclick = () => {
    // Read at CLICK time, not at render: the select is a live DOM node and this page does not re-render
    // on its change, so a value captured during render would build whatever was selected when the page
    // was drawn — the defect being that it would look right for the default and wrong for every change.
    const def = sel.value;
    setHost({ componentState: 'pending', componentProgress: null, openDetail: null });
    hostChanged(); syncComponentRow();
    commit.postComponents(def);
  };
  row.append(compBtn);
  // Every state-dependent part of this row written by the ONE function that owns them, on the render
  // path as well as on the message path (#870). Setting the label and the disabled flags inline here and
  // syncing them there would be two derivations of one state, so a fix to either could leave the other
  // saying "Building…" — which is the defect this ticket is.
  //
  // `staged` because this page is built DETACHED and reconciled in (#771) — see the function's header for
  // why the attachment test belongs to the caller rather than to it.
  syncComponentRow({ staged: true });
  sec.append(row);
  host.append(sec);
};

/** The Components page's own status row, refreshed in place (#870).
 *
 *  WHY IN PLACE RATHER THAN `renderWorkspace()`. The `component-result` handler used to call only
 *  `renderBar()` + `syncApplyDetail()`, both of which are CHROME — so the bar's pill showed the verdict
 *  while this row, which is page content, kept whatever the last page render had put there. A designer who
 *  started a build here and stayed here saw `… Building…`, disabled, permanently: the state machine had
 *  already moved on, and only the paint was stale. Verified by reproducing all five terminating conditions
 *  against the built plugin bundle, and confirmed to be paint-only rather than state — navigating away and
 *  back recovered the button every time, which is why the field report's only known recovery was a restart.
 *
 *  The obvious repair — add `renderWorkspace()` beside the other two — trades this defect for a subtler
 *  one. Measured: a full page render rebuilds the picker, whose `<option>` carries `selected` for Button,
 *  so a build of any other def would report its verdict and silently reset the selection to Button. The
 *  designer's next click would then build the wrong set. So the row is SYNCED, like the chrome's own
 *  `syncApplyDetail` and for the same reason: the parts that depend on `componentState` are written, and
 *  the picker, which does not, is left alone.
 *
 *  `staged` IS THE PARAMETER AND IT HAD TO BE, which the first version of this got wrong in a way worth
 *  recording. The two callers ask different questions of the same nodes. A build's own render calls this
 *  while the page is still STAGED — `renderWorkspace` builds the tree detached and reconciles it in
 *  (#771) — so the row is legitimately not in the document yet. The message path calls it about a row that
 *  is supposed to be on screen, where a detached row means the designer has navigated away and writing a
 *  verdict into it would report a delivery that nobody can see. One `isConnected` guard cannot serve both:
 *  applied to the render path it skipped the initial sync entirely and shipped a BLANK button, measured in
 *  the built bundle. So the caller says which it is, and only the message path requires attachment. Its
 *  callers still refresh the chrome, which is where a verdict stays legible after navigating away — that
 *  division is #483's and is unchanged. */
let componentRow: HTMLElement | null = null;
let componentSel: HTMLSelectElement | null = null;
let componentBtn: HTMLButtonElement | null = null;
const syncComponentRow = (opts: { staged?: true } = {}): void => {
  const row = componentRow;
  if (!row || !componentSel || !componentBtn) return;
  if (!opts.staged && !row.isConnected) return;
  const pending = host.componentState === 'pending';
  componentBtn.textContent = pending ? '… Building…' : '⊞ Build set';
  // Disabled while in flight is both the signal and the guard, same call the Apply button makes: a second
  // click would post a concurrent build over the same page.
  componentBtn.disabled = pending;
  componentSel.disabled = pending;
  // The pill is REPLACED rather than written to, because pending and verdict are different elements — a
  // `.bar-seed` span versus an `.applystat` disclosure button — so this cannot be a text swap. Removing
  // the old one first is what keeps a verdict from landing beside the pending text it supersedes.
  row.querySelector(':scope > .bar-seed, :scope > .applystat')?.remove();
  if (host.componentState) row.prepend(renderApplyStatus(host.componentState, 'components'));
};

// A verdict's page row (#870). Outside any chrome guard on purpose: each row's own `isConnected` test
// answers "is it on screen" for itself (see `staged` above).
subscribe('host:components', () => syncComponentRow());

/** The file-setup row's status, refreshed in place (#1558). The same mechanism as `syncComponentRow`, and
 *  for the same reasons: the `file-setup-result` handler is on the message path and this row is page
 *  content, so a verdict that reached only the chrome would leave the button frozen at "… Setting up…".
 *  Simpler than the build's because file-setup has no picker to leave untouched and no progress to render —
 *  the button label and disabled flag plus the verdict pill are the whole of it. `staged` carries the same
 *  meaning: the render path calls it before the row is reconciled in, the message path about a live one. */
let fileSetupRow: HTMLElement | null = null;
let fileSetupBtn: HTMLButtonElement | null = null;
const syncFileSetupRow = (opts: { staged?: true } = {}): void => {
  const row = fileSetupRow;
  if (!row || !fileSetupBtn) return;
  if (!opts.staged && !row.isConnected) return;
  const pending = host.fileSetupState === 'pending';
  fileSetupBtn.textContent = pending ? '… Setting up…' : `⊞ ${FILE_SETUP_LABEL}`;
  // Disabled while in flight is both the signal and the guard, same call the build and Apply buttons make:
  // a second click would post a concurrent scaffold over the same file.
  fileSetupBtn.disabled = pending;
  // Pill REPLACED, not written to — pending (`.bar-seed`) and verdict (`.applystat`) are different
  // elements, so removing the old one first keeps a verdict from landing beside the pending text.
  row.querySelector(':scope > .bar-seed, :scope > .applystat')?.remove();
  if (host.fileSetupState) row.prepend(renderApplyStatus(host.fileSetupState, 'filesetup'));
};

subscribe('host:filesetup', () => syncFileSetupRow());

/** The style-guide button's label (#259). Proposed, owner to confirm — the one string a reviewer changes. */
const STYLE_GUIDE_LABEL = 'Draw style guide';

/**
 * The Style guide page (#259, phase 1: color) — the step after Apply theme. One button draws the color tables
 * from the file's own variables; the per-type options fold away under Customize, every one with a default, so
 * the button alone does the common case. The specimen is chosen from each token's role unless Display style
 * overrides it (owner decision 8).
 *
 * Figma-only (`railNav()` omits it on web), and `commit.isFigma` is re-checked for the `renderComponentsPage`
 * reason. Nothing here repaints with a lever, so its volatile set is empty, as on Components.
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

/** The style-guide row's status, refreshed in place (#259) — `syncFileSetupRow`'s mechanism, its own slot. */
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

// #103 Phase B — advisory font-weight availability (#113 advisory model, not a hard gate). A curated,
// best-effort map of common families → the numeric weights they actually ship. Used only to WARN when a
// category ships a weight its family lacks (the font would fall back to the nearest); an unknown/custom
// family is never warned (we can't assert its weights). Mirrors the engine's per-family emit fallbacks
// (#112). Keys are matched case-insensitively against the family's primary name.
const KNOWN_WEIGHTS: Record<string, number[]> = {
  'Inter': [100, 200, 300, 400, 500, 600, 700, 800, 900],
  'Roboto': [100, 300, 400, 500, 700, 900], 'Roboto Mono': [100, 200, 300, 400, 500, 600, 700],
  'Clash Display': [200, 300, 400, 500, 600, 700], 'JetBrains Mono': [100, 200, 300, 400, 500, 600, 700, 800],
  'Helvetica': [400, 700], 'Helvetica Neue': [400, 700], 'Arial': [400, 700],
  'Georgia': [400, 700], 'Times New Roman': [400, 700],
  'Space Grotesk': [300, 400, 500, 600, 700], 'DM Sans': [400, 500, 700], 'DM Mono': [300, 400, 500],
  'IBM Plex Sans': [100, 200, 300, 400, 500, 600, 700], 'IBM Plex Mono': [100, 200, 300, 400, 500, 600, 700],
  'Work Sans': [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Manrope': [200, 300, 400, 500, 600, 700, 800],
  'Poppins': [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Montserrat': [100, 200, 300, 400, 500, 600, 700, 800, 900],
  'Lato': [100, 300, 400, 700, 900], 'Open Sans': [300, 400, 500, 600, 700, 800], 'Nunito': [200, 300, 400, 500, 600, 700, 800, 900],
  'Source Sans 3': [200, 300, 400, 500, 600, 700, 800, 900], 'Source Serif 4': [200, 300, 400, 500, 600, 700, 800, 900],
};
const KNOWN_WEIGHTS_LC: Record<string, number[]> = Object.fromEntries(Object.entries(KNOWN_WEIGHTS).map(([k, v]) => [k.toLowerCase(), v]));
/** The known weight list for a family primary name, or null when the family is unknown (→ no warning). */
const knownWeightsOf = (fontName: string | undefined): number[] | null => (fontName ? KNOWN_WEIGHTS_LC[fontName.trim().toLowerCase()] ?? null : null);

/** Offline font-availability detection. A family that fails to resolve falls through to the
 *  fallback stack, so its measured width matches the bare fallback's. Canvas metrics only —
 *  no network — so this works identically in the plugin iframe (`networkAccess: none`).
 *  Three baselines guard against a false negative when the face happens to match one of them. */
/** The probe's canvas, made on the first question rather than at import (#896): a module that
 *  creates a DOM node while it loads cannot be loaded without a DOM. `undefined` = not made yet;
 *  `null` = made, but this browser gave no 2D context, which reads as "not available" as before. */
let _fontProbe: CanvasRenderingContext2D | null | undefined;
const fontAvailable = (name: string | undefined): boolean => {
  if (!name) return false;
  if (_fontProbe === undefined) _fontProbe = document.createElement('canvas').getContext('2d');
  const ctx = _fontProbe;
  if (!ctx) return false;
  const probe = 'mmmmmmmmmmlliWWWWWWjgq';
  return ['monospace', 'sans-serif', 'serif'].some((base) => {
    ctx.font = `72px ${base}`;
    const w0 = ctx.measureText(probe).width;
    ctx.font = `72px "${name}", ${base}`;
    return Math.abs(ctx.measureText(probe).width - w0) > 0.5;
  });
};

/** What the library table's status column reports for one face.
 *
 *  This used to be `fontAvailable` alone, and that was the wrong question. The canvas probe answers
 *  *"can this iframe paint a specimen?"*; the designer needs *"will this face load when I write text
 *  styles?"* On the web those are the same question. In the Figma iframe they are not, because
 *  Figma's font list mixes locally-installed families with Figma CLOUD fonts and the iframe ships
 *  `networkAccess: none` — so a cloud font cannot be painted here yet loads perfectly in Figma. The
 *  column reported "Not installed" for a Roboto this Figma carries 36 styles of, and would have said
 *  the same for JetBrains Mono. Understating by half the rows is worse than saying less.
 *
 *  So when the host has answered, its list is authoritative and the probe is demoted to what it can
 *  honestly report: whether the SPECIMEN beside it is the real face or a fallback. Two facts, two
 *  places, neither one lying. With no host list (web) there is only one source and the probe is it —
 *  which is also why this branches on `hostFonts.length` rather than on any host check.
 *
 *  `styles` is a count, not a guarantee: a listed family resolves as a FAMILY, while a text style
 *  demands a specific weight. Reporting "36 styles" invites the right doubt where a bare tick would
 *  imply a promise this cannot make (see #499 for the weight-name half of that problem). */
type FaceStatus = { ok: boolean; label: string; title: string; fallbackPreview: boolean };
const faceStatus = (name: string): FaceStatus => {
  const rendersHere = fontAvailable(name);
  if (!host.hostFonts.length) {
    // Web: the probe is the only source, and "installed on this device" is exactly what it measures.
    return {
      ok: rendersHere,
      label: rendersHere ? '✓ Installed' : '⚠ Not installed',
      title: rendersHere ? `${name} resolves on this device` : `${name} is not installed here — the preview falls back`,
      fallbackPreview: !rendersHere,
    };
  }
  const styles = host.hostFontStyles.get(name);
  if (styles === undefined) {
    return {
      ok: false,
      label: '⚠ Figma lacks it',
      title: `This Figma cannot load "${name}", so every text style asking for it will be skipped. `
        + 'Spelling is exact — case and spaces included.',
      fallbackPreview: true,
    };
  }
  // Count 0 means an older host sent names without counts — say less rather than invent a number.
  const label = styles > 0 ? `✓ ${styles.toLocaleString('en-US')} ${styles === 1 ? 'style' : 'styles'}` : '✓ Figma has it';
  return {
    ok: true,
    label,
    title: styles > 0
      ? `Figma can load ${name} (${styles.toLocaleString('en-US')} styles). That settles the family — `
        + 'a text style still skips if the family lacks the specific weight it asks for.'
      : `Figma can load ${name}.`,
    fallbackPreview: !rendersHere,
  };
};
const WEIGHT_NAME: Record<number, string> = {
  100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium',
  600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black',
};

// ---- FOUNDATIONS (primitives) ----------------------------------------------

/** Typefaces — the two tiers #269 split apart, made operable.
 *
 *  TIER 1, the library: `font.typeface.<slug>` — one primitive per distinct face, named after the
 *  face itself, carrying its fallback stack. Until now this tier was invisible in the dashboard even
 *  though the engine emits it. It is DERIVED, not authored: `deriveTypefaces` unions the faces the
 *  role bindings (and any per-mode overrides) actually name, so a face exists exactly as long as
 *  something binds it. That is also why removal needs no cascade — unbind it and it stops emitting.
 *
 *  TIER 2, the bindings: `font.family.<category>` — one per text category, the brand-invariant handles
 *  a shared codebase references. Each aliases one library face. #415 retired the display/text/mono
 *  ROLE tier that used to sit here: #269's argument was for a NAMED tier-2 (so a face swap leaves
 *  consumer references intact), which category names satisfy just as well, and role-keying cost a
 *  coupling — two categories on one role could not be moved apart without a second mechanism. The
 *  typeface library is still shared ACROSS brands with each brand binding its own members.
 *
 *  The bindings live on Semantics, not here: `font.family.*` is a semantic token, and this tab is
 *  primitives only. */
/** Tier 1 — the faces this brand has (Primitives tab). Split from the bindings (#388 part B): they
 *  were one section because they were one tab, and that section straddled the primitive/semantic line
 *  the tabs are now named for. */
const renderTypefaceLibrary = (): HTMLElement => {
  const ty = theme.typography;
  const sec = palSection('Typefaces', 'The faces this brand has, independent of what any of them does. A lone name auto-pads a system fallback stack; supply a full stack yourself and it is trusted verbatim. This is the only primitive on this tab you can edit.');

  // #416 — the BASELINE binding, full stop. This used to follow `currentMode`, which only made sense
  // while the mode bar was an editing context on this page; a primitive is mode-invariant, and the
  // per-mode faces are shown as columns on Semantics. A face bound only in some non-light mode is
  // still reported — `bindingOf`'s "Only in <mode>" branch reads `familiesByMode` directly.
  const boundFace = (cat: string): string => ty.families.find((f) => f.group === cat)?.stack[0] ?? '';

  // ---- TIER 1 — the library (Primitives tab) ----
  // Converted to the shared table format alongside leading & tracking (#363) so the tab reads on ONE
  // column grid rather than a card list beside two tables. Same three fixed-width columns as the rung
  // tables, and no mode axis for the same reason: a typeface primitive is mode-invariant. WHICH face a
  // category binds does vary by mode — but that is the bindings tier, now on Semantics.
  sec.append(subHead('The library — one primitive per face'));
  /** Where a face's binding lives. #287 made "in the library, bound to nothing" a REAL state — before
   *  it, a face existed only while a category bound it, so the old copy could say the list was purely
   *  derived. It no longer can, and an unbound face must not be mislabeled as a mode override. */
  const bindingOf = (name: string): { label: string; unbound: boolean } => {
    // #415 — categories, not roles. A face bound by all of them says so once rather than listing
    // seven names in a 148px cell, which is the shape the collapse would otherwise produce for the
    // ordinary single-face brand.
    const here = TYPE_GROUP_ORDER.filter((cat) => boundFace(cat) === name);
    if (here.length === TYPE_GROUP_ORDER.length) return { label: 'Every category', unbound: false };
    if (here.length) return { label: here.join(' + '), unbound: false };
    const inModes = rp.modes.filter((m) => (ty.familiesByMode?.[m] ?? []).some((f) => f.stack[0] === name))
      .map((m) => MODE_LABEL[m] ?? m);
    if (inModes.length) return { label: `Only in ${inModes.join(', ')}`, unbound: false };
    if (ty.families.some((f) => f.stack[0] === name)) return { label: 'A category', unbound: false };
    return { label: 'Not bound — staged', unbound: true };
  };
  /** The AUTHORED library (#287) — distinct from `ty.typefaces`, which is the derived union of authored
   *  entries and bound faces. Only this array is editable: a face that exists purely because a category
   *  binds it has no library entry to remove, which is the same reason a bound entry is not deletable. */
  const library = (): string[] => (getPath(brandState, 'typography.typefaceLibrary') as string[] | undefined) ?? [];
  const inLibrary = (name: string): boolean => library().some((n) => typefaceSlug(n) === typefaceSlug(name));
  const libBox = el('div', 'mtbl');
  const libScroll = el('div', 'mtbl-scroll');
  // `.tf-libtbl` widens THIS table's Face column (see the CSS) — the token path moved into it, and a
  // `font.typeface.<slug>` pill does not fit the shared 112px.
  // the typeface library rendered as a mode table; tf-libtbl sets its column widths
  const libTbl = el('table', mix('mtbl-tbl', 'tf-libtbl'));
  const libHead = el('thead'), libHtr = el('tr');
  // The heading names the SOURCE of the verdict, because the two hosts answer from different ones:
  // Figma's own font list where there is one, this machine's installed fonts otherwise. "On this
  // device" was actively wrong in Figma — a cloud font is loadable there and absent here.
  libHtr.append(el('th', 'mtbl-stick', 'Face'), hook(el('th', 'mtbl-mode', host.hostFonts.length ? 'In this Figma' : 'On this device'), 'typeface-source'),
    el('th', 'mtbl-mode', 'Used by'), el('th', 'mtbl-fill mtbl-spec', 'Specimen'));
  libHead.append(libHtr); libTbl.append(libHead);
  const libBody = el('tbody');
  let anyUnbound = false;
  for (const tf of ty.typefaces) {
    const bind = bindingOf(tf.name);
    anyUnbound = anyUnbound || bind.unbound;
    const tr = el('tr');
    const nc = el('td', 'mtbl-stick');
    const nm = el('span', 'tf-libname', tf.name); nm.title = tf.name;
    nc.append(nm);
    if (tf.variable) nc.append(el('span', 'tf-vf', 'Variable'));
    // The token path belongs to the FACE, not to its specimen — it is the name a product references,
    // so it reads as a subtitle under the name it identifies. It sat in the specimen cell until now,
    // where it shared one paragraph with the fallback stack and the `(fallback shown)` note, and three
    // unrelated facts in one cell made the widest column the least legible one.
    // The ordinary nowrap `tokenPill`, NOT `tokenPillWrapping`. The wrapping variant was tried first
    // because it fits the shared 112px and would have cost no column change at all — but measured, it
    // renders `font.typeface.jetbrains-mono` as a FOUR-line boxed block (67px tall), and a path broken
    // over four lines is harder to read than one that is elided. The column widens instead.
    const pathWrap = el('span', 'tf-libpath');
    pathWrap.append(tokenPill(`font.typeface.${tf.slug}`));
    nc.append(pathWrap);
    tr.append(nc);
    const st = faceStatus(tf.name);
    const sc = el('td', 'mtbl-mode');
    sc.append(el('span', 'tf-stat ' + (st.ok ? 'ok' : 'no'), st.label));
    sc.title = st.title;
    tr.append(sc);
    const bc = el('td', 'mtbl-mode');
    bc.append(el('span', 'tf-usedby' + (bind.unbound ? ' unbound' : ''), bind.label));
    // The decided removal semantics (#287): only UNBOUND entries are deletable, which needs no cascade
    // logic anywhere. The known cost is a "why can't I delete this?" moment, and the answer is here —
    // on the cell that already names the categories standing in the way — rather than as a disabled button,
    // which would invite the click it then refuses.
    if (!bind.unbound && inLibrary(tf.name))
      bc.title = `In the library and bound — re-point ${bind.label} to something else to make this removable.`;
    tr.append(bc);
    const pc = el('td', 'mtbl-fill mtbl-spec');
    // typeface preview inside a mode-table specimen cell
    const prev = el('span', mix('mtbl-spec-t', 'tf-prev'), 'Ag 123');
    prev.style.fontFamily = `"${tf.name}", ${tf.slug.includes('mono') ? 'monospace' : 'sans-serif'}`;
    pc.append(prev);
    // The second fact, on the cell it is actually about. Once the status column reports FIGMA's verdict,
    // "Ag 123" can be a fallback while the row reads ✓ — true, but confusing unless the specimen says
    // so itself. Only shown when the two diverge: on a face that renders here the note would be noise,
    // and on a face Figma lacks the status column has already said it.
    if (st.fallbackPreview && st.ok) {
      const fb = el('span', 'tf-fbnote', '(fallback shown)');
      fb.title = `${tf.name} loads in Figma but is not installed on this device, so this specimen shows the fallback. `
        + 'The written text styles use the real face.';
      pc.append(fb);
    }
    // Row action at the far right of the row — inside the FILL column on purpose. A fifth column, or a
    // button in any fixed-width cell, would push that cell past its token and break the 112/148/148
    // parity #363 just established; the fill column absorbs slack instead.
    if (bind.unbound) {
      const rm = el('button', 'tf-rm', '×') as HTMLButtonElement;
      rm.title = `Remove ${tf.name} from the library`;
      rm.setAttribute('aria-label', `Remove ${tf.name} from the library`);
      rm.onclick = () => {
        setPath(brandState, 'typography.typefaceLibrary', library().filter((n) => typefaceSlug(n) !== tf.slug));
        applyFull();
      };
      pc.append(rm);
    }
    // The specimen cell now carries the specimen and the two things that qualify it — nothing else.
    // The token pill moved to the Face cell; without it the stack starts the line, so it names itself
    // rather than reading as a trailing clause on the pill.
    pc.append(el('span', 'tf-fall',
      tf.stack.length > 1 ? `Falls back to ${tf.stack.slice(1).join(', ')}` : 'No fallback stack'));
    tr.append(pc);
    libBody.append(tr);
  }
  libTbl.append(libBody); libScroll.append(libTbl); libBox.append(libScroll);
  sec.append(libBox);

  // Staging a face — the authoring half #287 deferred to this follow-up. Validation MIRRORS the engine's
  // (`buildTypography`: non-empty, no duplicate slug) so a typo is answered here instead of surfacing as
  // a thrown build. The duplicate check runs against the DERIVED list, not just the authored array: a
  // name already reachable via a category binding would be silently absorbed by the union and the row would
  // never appear, which reads as "the button did nothing".
  const addRow = el('div', 'tf-add');
  const addIn = el('input', 'tf-in tf-addin') as HTMLInputElement;   // tf-in carries the shared field treatment; tf-addin only constrains width
  addIn.type = 'text'; addIn.spellcheck = false; addIn.placeholder = 'Font family name';
  addIn.setAttribute('aria-label', 'Add a face to the library');
  // #113 (Figma arm) — when the host knows its real font list, the field becomes type-ahead over it
  // while still accepting anything typed.
  //
  // This WAS a `<datalist>`, and that was the wrong control for an iframe. The original reasoning was
  // sound on the web — it is the browser's own widget, so keyboard and screen-reader behavior come for
  // free instead of from a hand-rolled `role="combobox"` — and the accepted cost was recorded as "cannot
  // be themed". In Figma's plugin iframe the real cost was *unusable*: the popup is browser CHROME drawn
  // outside the page, so it painted dark (following Figma's app theme, unreachable by our CSS), flipped
  // UP over the field so the text being typed was hidden, and never received wheel events — making 2,334
  // families impossible to scroll. None of the three is reachable from the page, which is the point: a
  // list that must be themed, positioned and scrolled has to BE page DOM. So this is the combobox the
  // datalist was chosen to avoid. The iframe made that trade non-optional.
  //
  // Built on the `.brandmenu` popover vocabulary already used by the brand/export/nav menus — same
  // `max-height` + `overflow-y:auto` shape, so scrolling and theming are structural rather than patched.
  //
  // Names render in the UI face, NOT their own (owner decision). Self-rendering would look more like
  // Figma's picker, but `listAvailableFontsAsync` mixes locally-installed families with Figma's CLOUD
  // Google Fonts and this iframe ships `networkAccess: none` — so a cloud face would silently fall back
  // and read as "broken" rather than "not installed here". One consistent face tells no lie.
  //
  // A HINT, not a constraint: an unlisted name still commits, because a brand input is a portable
  // specification and may legitimately name a face this machine lacks.
  let addWrap: HTMLElement | null = null;
  // Arrow/Escape handling lives with the list, but Enter must reach `submit` (defined below) — so the
  // combobox publishes a key hook that returns true when it CONSUMED the key, and the field's single
  // keydown handler defers to it before falling through to submit-on-Enter.
  let comboKey: ((e: KeyboardEvent) => boolean) | null = null;
  if (host.hostFonts.length) {
    addWrap = el('div', 'tf-combo');
    const list = el('div', 'tf-cbolist');
    list.id = 'tf-font-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Font families this Figma can load');
    list.hidden = true;
    addIn.setAttribute('role', 'combobox');
    addIn.setAttribute('aria-controls', list.id);
    addIn.setAttribute('aria-autocomplete', 'list');
    addIn.setAttribute('aria-expanded', 'false');
    addIn.autocomplete = 'off';                       // the browser's own history popup would re-create the overlap
    let shown: string[] = [];
    let active = -1;                                  // index into `shown`; -1 = nothing selected, so Enter still submits
    const optId = (i: number) => `tf-font-o${i}`;
    // `aria-selected` moves WITH the `.on` class, in both directions. It is a separate fact from
    // `aria-activedescendant`: that one says where the pointer is, `aria-selected` says which option a
    // single-select listbox currently holds, and a screen reader reads the second. Shipping it pinned to
    // "false" at row creation (which is what this did) meant the sighted highlight tracked the arrows
    // while AT was told, on all 2,340 rows, that nothing was selected — the one piece of the ARIA this
    // control used to get free from `<datalist>` that the hand-roll missed.
    const setActive = (i: number): void => {
      const rows = Array.from(list.children) as HTMLElement[];
      if (active >= 0 && rows[active]) {
        rows[active].classList.remove('on');
        rows[active].setAttribute('aria-selected', 'false');
      }
      active = i;
      if (i < 0) { addIn.removeAttribute('aria-activedescendant'); return; }
      const row = rows[i];
      if (!row) return;
      row.classList.add('on');
      row.setAttribute('aria-selected', 'true');
      addIn.setAttribute('aria-activedescendant', optId(i));
      row.scrollIntoView({ block: 'nearest' });       // keyboard nav must drag the scroll along with it
    };
    const close = (): void => {
      list.hidden = true;
      addIn.setAttribute('aria-expanded', 'false');
      setActive(-1);
    };
    const open = (): void => {
      if (!shown.length) { close(); return; }
      list.hidden = false;
      addIn.setAttribute('aria-expanded', 'true');
      // The old popup opened upward over the field. This one is page DOM below it, so the only thing
      // that can hide it is the page scroll — ask for it to be on screen rather than assume it is.
      list.scrollIntoView({ block: 'nearest' });
    };
    const paint = (q: string): void => {
      const needle = q.trim().toLowerCase();
      // Prefix matches first — "Ro" should lead with Roboto, not with a family that merely contains "ro".
      const pre: string[] = [], mid: string[] = [];
      for (const f of host.hostFonts) {
        if (!needle) { pre.push(f); continue; }
        const at = f.toLowerCase().indexOf(needle);
        if (at === 0) pre.push(f);
        else if (at > 0) mid.push(f);
      }
      shown = pre.concat(mid);
      list.textContent = '';
      shown.forEach((f, i) => {
        // textContent, never innerHTML — these names are external input.
        const row = el('div', 'tf-cbo', f);
        row.id = optId(i);
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', 'false');
        // mousedown, not click: click fires after the input's blur, by which point the list is closed.
        row.onmousedown = (e) => {
          e.preventDefault();                          // keep focus in the field so Add face is one key away
          addIn.value = f;
          close();
          addIn.focus();
        };
        list.append(row);
      });
      setActive(-1);
    };
    paint('');
    addIn.oninput = () => { paint(addIn.value); open(); };
    addIn.onfocus = () => { paint(addIn.value); open(); };
    // Blur closes, but not before a row's mousedown has run — hence the mousedown handler above.
    addIn.onblur = () => { close(); };
    comboKey = (e: KeyboardEvent): boolean => {
      const open_ = !list.hidden;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!open_) { paint(addIn.value); open(); if (shown.length) setActive(0); return true; }
        if (!shown.length) return true;
        const next = e.key === 'ArrowDown'
          ? (active + 1) % shown.length
          : (active <= 0 ? shown.length - 1 : active - 1);
        setActive(next);
        return true;
      }
      if (e.key === 'Escape') {
        if (!open_) return false;                      // let Escape do whatever it does elsewhere
        close();
        return true;
      }
      // Enter with a highlighted row means "take that one" — the field fills and the list closes, and
      // the face is NOT committed yet, so the next Enter submits. Two deliberate steps: picking a name
      // and adding it are different decisions, and the second one is destructive-ish (it edits the brand).
      if (e.key === 'Enter' && open_ && active >= 0 && shown[active]) {
        addIn.value = shown[active];
        close();
        return true;
      }
      if (e.key === 'Tab' && open_) { close(); return false; }   // close, but let focus move on
      return false;
    };
    addWrap.append(addIn, list);
  }
  // #405 — a SUBMIT CTA, not `.adv-add`. That class is the dashed REVEAL/add-a-row affordance (the
  // breakpoint editor's "+ Add" appends an empty slot with it, and on Palettes the same look means
  // "tap to expose fields"). Here the field is already exposed, so the dashed form promised "this will
  // show you something" while meaning "commit what I typed" — two different actions wearing one look.
  // Left `.adv-add` alone rather than restyling it: the breakpoint use is a genuine add-a-row.
  // The `+` goes with it — a leading plus is part of that same add-a-row vocabulary.
  const addBtn = el('button', 'tf-addbtn', 'Add face') as HTMLButtonElement;
  const addErr = el('p', 'tf-adderr');
  addErr.hidden = true;
  const submit = (): void => {
    const name = addIn.value.trim();
    addErr.hidden = true;
    if (!name) { addErr.textContent = 'Give the face a name.'; addErr.hidden = false; addIn.focus(); return; }
    const slug = typefaceSlug(name);
    const clash = ty.typefaces.find((t) => t.slug === slug);
    if (clash) {
      addErr.textContent = inLibrary(clash.name)
        ? `${clash.name} is already in the library.`
        : `${clash.name} is already here — a category binds it, so it is in the library list already.`;
      addErr.hidden = false; addIn.focus(); return;
    }
    setPath(brandState, 'typography.typefaceLibrary', [...library(), name]);
    applyFull();
  };
  addBtn.onclick = submit;
  addIn.onkeydown = (e) => {
    const ev = e as KeyboardEvent;
    if (comboKey && comboKey(ev)) { ev.preventDefault(); return; }
    if (ev.key === 'Enter') { ev.preventDefault(); submit(); }
  };
  addRow.append(addWrap ?? addIn, addBtn);
  sec.append(addRow, addErr);
  // #414 — the spelling guidance sits with the field it describes. It lived on Semantics, which after
  // the four-tab split types nothing: this is the only place a face name is entered by hand.
  const spell = el('p', 'tf-note');
  spell.innerHTML = host.hostFonts.length
    ? '<b>Pick from the list, or type any name.</b> The field suggests the ' + host.hostFonts.length.toLocaleString('en-US') + ' font families this Figma can load, so a name chosen from it is spelled the way Figma spells it. That settles the family, not every weight: a text style still skips if the family lacks the specific weight it asks for. Typing a name that is not listed also works — a brand can specify a font this machine does not have — but nothing it needs will load here.'
    : '<b>Exact spelling matters.</b> The name passes through to CSS and Figma untouched — there is no validation or auto-correct, so a near-miss silently falls back. Find the exact name in <b>macOS</b> Font Book, <b>Windows</b> Settings → Personalization → Fonts, or the foundry / Google Fonts specimen page.';
  sec.append(spell);
  // The old copy here claimed the list was purely derived — "a face exists here exactly as long as a
  // role binds it". #287 made that false, so it is replaced rather than left to quietly mislead.
  sec.append(el('p', 'tf-derivenote', anyUnbound
    ? 'This list is a union: a face appears because a category on Semantics binds it, or because the brand input stages it in typography.typefaceLibrary. A staged face can sit here bound to nothing until you give it a job. Slugs come from the face name, so there is no rename to cascade.'
    : 'Every face here is bound by a category on Semantics — add a name and its primitive appears here, ready to bind. A brand can also stage a face with no category in typography.typefaceLibrary, in which case it sits here unbound until you give it a job. Slugs come from the face name, so there is no rename to cascade.'));

  return sec;
};

/** Tier 2 — which face does each CATEGORY draw from (Semantics tab). Split from the library (#388
 *  part B); re-keyed from three abstract roles to the seven categories by #415.
 *
 *  #416 — ONE COLUMN PER MODE, which is the stated rule for editing a mode-varying value on this page.
 *  The rule was already what the codebase did; it had just never been written down. Every column-table
 *  here (weight roles, the leading/tracking re-points, the per-size pins) edits a value with MANY
 *  parallel instances, and every mode-bar control in the app (`renderPerModeSelect` — radius, tempo,
 *  density) edits a SINGLE lever. This control was seven categories sitting on the single-lever side,
 *  which is why it felt wrong and why it alone lacked the `Auto` + `.set` affordance its neighbours
 *  have: an override and an inherited value rendered identically, with no way to clear one.
 *
 *  Since every mode-varying value on Typography is a many-instance value, the mode bar has no editing
 *  job left on this page and is gone from it — the same conclusion #350/#268 reached for Primitives,
 *  arrived at from the other end. */
const renderTypefaceBindings = (): HTMLElement => {
  const ty = theme.typography;
  const modes = rp.modes;
  const multi = modes.length > 1;
  const sec = palSection('Typefaces', 'Which face each category draws from. The font.family token for a category is what your codebase binds — swapping the face behind it leaves every reference intact, which is why a text style never names a face directly.');
  const baseFace = (cat: string): string => ty.families.find((f) => f.group === cat)?.stack[0] ?? '';
  const isUnbound = (cat: string): boolean => cat === 'code' && getPath(brandState, 'typography.families.code') === null;

  // The bulk control writes the BASELINE only — it is a brand-level statement ("this brand is one
  // face"), not a per-mode one. `code` is deliberately out of its reach: its default is a different
  // KIND of face, so sweeping a text face across it is nearly always wrong and would be silent.
  const bulk = el('div', 'tf-bulk');
  const bulkSel = selectEl('sm');
  bulkSel.append(optionEl('', 'Choose a face…', true));
  for (const t of ty.typefaces) bulkSel.append(optionEl(t.name, t.name, false));
  const bulkBtn = el('button', 'tf-addbtn', 'Apply to all') as HTMLButtonElement;
  const BULK_CATS = TYPE_GROUP_ORDER.filter((g) => g !== 'code');
  bulkBtn.onclick = () => {
    if (!bulkSel.value) return;
    for (const g of BULK_CATS) setPath(brandState, `typography.families.${g}`, bulkSel.value);
    applyFull();
  };
  bulk.append(el('span', 'tf-bulklab', `Set every text category to`), bulkSel, bulkBtn);
  sec.append(bulk, el('p', 'tf-derivenote', 'Code keeps whatever face it has — a monospace choice is a different decision, so it is set on its own row below.'));

  const box = el('div', 'mtbl');
  const scroll = el('div', 'mtbl-scroll');
  const tbl = el('table', 'mtbl-tbl');
  const thead = el('thead'), htr = el('tr');
  htr.append(el('th', 'mtbl-stick', 'Category'));
  if (multi) {
    for (const m of modes) {
      const th = el('th', 'mtbl-mode');
      th.append(document.createTextNode(MODE_LABEL[m] ?? m));
      if (m === 'light') th.append(el('span', 'mtbl-ro', ' baseline'));
      // Same `auto` marker the mode chips carry, so a derived column is identifiable before you click.
      else if (!modeIsEditable(m)) th.append(el('span', 'mtbl-ro', ' auto'));
      htr.append(th);
    }
  } else {
    // A single-mode brand has no mode axis to show, so the column keeps its plain name rather than
    // being labeled "Light" — there is nothing for that label to contrast with.
    htr.append(el('th', 'mtbl-mode', 'Face'));
  }
  htr.append(el('th', 'mtbl-fill mtbl-spec', 'Specimen'));
  thead.append(htr); tbl.append(thead);
  const tb = el('tbody');
  for (const cat of TYPE_GROUP_ORDER) {
    const base = baseFace(cat);
    const unbound = isUnbound(cat);
    const tr = el('tr');
    const nc = el('td', 'mtbl-stick');
    nc.append(el('span', 'mtbl-name mono', cat));
    nc.append(el('div', 'cs-count', TYPE_GROUP_BLURB[cat] ?? ''));
    tr.append(nc);

    const NONE = '__none__';                    // a sentinel no font family can be called
    for (const m of (multi ? modes : ['light'])) {
      const td = el('td', 'mtbl-mode');
      if (unbound && m !== 'light') {
        // Nothing to override: the category ships no styles at all in any mode.
        td.append(el('span', 'cs-count', '—'));
        tr.append(td);
        continue;
      }
      if (m === 'light') {
        // The baseline is the brand-level binding, and it stays EDITABLE here — unlike the
        // leading/tracking re-point table, whose baseline is set in the table above it. This is the
        // only place the family baseline is authored, so its column is a control, not a reading.
        const sel = selectEl('sm fill');
        const opts: Array<[string, string]> = ty.typefaces.map((t) => [t.name, t.name] as [string, string]);
        if (!opts.some(([v]) => v === base) && base) opts.push([base, base]);
        if (cat === 'code') opts.push([NONE, 'None — no code styles']);
        for (const [v, label] of opts) sel.append(optionEl(v, label, v === (unbound ? NONE : base)));
        sel.title = base || '';
        sel.onchange = () => {
          if (sel.value === NONE) { setPath(brandState, 'typography.families.code', null); applyFull(); return; }
          if (!sel.value) return;               // matched no option — never write an empty face
          setPath(brandState, `typography.families.${cat}`, sel.value);
          applyFull();
        };
        td.append(sel);
      } else if (!modeIsEditable(m)) {
        // #423 — READ-ONLY, and showing the resolved face rather than an empty or disabled control.
        // A derived mode carries no `familiesByMode` entry (it can hold no levers), so it resolves to
        // the canonical baseline; that is a real fact about the mode and worth a cell. Rendering an
        // interactive select here is what let a click reach the engine and surface
        // "mode 'hc-dark' is generate-only and not customizable" verbatim.
        const self = el('span', 'mtbl-selfval mono', base || '—');
        self.title = `${MODE_LABEL[m] ?? m} is auto-derived from Light and Dark — it takes the baseline face and accepts no per-mode override. Turn the mode off in Brand › Modes if you don't want it generated.`;
        td.append(self);
      } else {
        const ovRaw = getModeLever(m, `families.${cat}`);
        const ovStr = Array.isArray(ovRaw) ? ovRaw[0] : (ovRaw as string | undefined);
        // An override equal to the baseline is INERT — `diffAssign` drops it, so it produces no token
        // and no mode entry. Reading it as "set" would style a cell that changes nothing, so it is
        // normalized away here and the cell renders as Auto, which is what it actually is. A brand
        // input can carry one (hand-authored, or written by the old control before this rule).
        const ovName = ovStr && ovStr !== base ? ovStr : undefined;
        // `.set` carries the same "pinned" weight the stepper tables give `.mval.pin`, so a scan down
        // the column finds the overrides without reading every label. This is the affordance the
        // review of #419 found missing — structural here rather than bolted on, because an inherited
        // cell and an overridden one are now different by construction.
        const sel = selectEl(ovName ? 'sm fill set' : 'sm fill');
        sel.append(optionEl('', `Auto — ${base}`, !ovName));
        for (const t of ty.typefaces) {
          if (t.name === base) continue;   // binding the baseline IS Auto — offering both would give
                                           // one outcome two controls, and the second writes an inert entry
          sel.append(optionEl(t.name, t.name, ovName === t.name));
        }
        if (ovName && !ty.typefaces.some((t) => t.name === ovName)) sel.append(optionEl(ovName, ovName, true));
        sel.title = ovName ? `${MODE_LABEL[m] ?? m} overrides ${cat} to ${ovName}` : `${cat} follows the baseline (${base}) in ${MODE_LABEL[m] ?? m}`;
        sel.onchange = () => { setModeLever(m, `families.${cat}`, sel.value || undefined); applyFull(); };
        td.append(sel);
      }
      tr.append(td);
    }

    const pc = el('td', 'mtbl-fill mtbl-spec');
    if (unbound) {
      pc.append(el('span', 'tf-unbound', 'No code face — the code category is not generated.'));
    } else {
      // same specimen cell, longer sample
      const prev = el('span', mix('mtbl-spec-t', 'tf-prev'), 'The quick brown fox jumps');
      prev.style.fontFamily = base ? `"${base}", ${cat === 'code' ? 'monospace' : 'sans-serif'}` : 'inherit';
      pc.append(prev);
    }
    pc.append(tokenPill(`font.family.${cat}`));
    tr.append(pc);
    tb.append(tr);
  }
  tbl.append(tb); scroll.append(tbl); box.append(scroll); sec.append(box);

  const local = el('p', 'tf-note warn');
  local.innerHTML = host.hostFonts.length
    ? '<b>Previews in this table use fonts installed on this device; Figma loads more than that.</b> Figma’s list mixes your installed fonts with its own cloud fonts, and this panel loads no webfonts — so a face Figma will happily write can still preview as the fallback here. The <b>In this Figma</b> column on <b>Primitives</b> reports what Figma can load, which is the fact that decides whether a text style applies. Your emitted tokens are unaffected; they carry the name you typed.'
    : '<b>Preview reflects only fonts installed on this device.</b> The dashboard loads no webfonts, so a correctly-spelled family you don’t have installed still previews as the fallback. The <b>Typefaces</b> table on <b>Primitives</b> flags which faces resolve here. Your emitted tokens are unaffected; they carry the name you typed.';
  sec.append(local);
  return sec;
};

/** The size ladder + the three levers that reshape it. The ladder itself was previously
 *  rendered nowhere, and displayCeiling / titleFloor were unreachable from the dashboard. */
const renderSizeLadder = (): HTMLElement => {
  const ty = theme.typography;
  // The ladder ALONE. Shape / range moved to Styles (#328 follow-through) to sit with the per-size
  // table they govern — which also leaves this tab purely primitive, the condition #268's
  // no-switcher rule turns on.
  const sec = palSection('The size ladder', 'Fixed and brand-invariant — 22 rem steps, the raw material every heading size is chosen from. Which rungs the categories land on is set by Shape and Range, on Text styles.');
  // No requested-vs-effective note any more: the ceiling names a RUNG, so what was asked for and
  // what ships cannot disagree (#328). The px ceiling could, because it was compared against sizes
  // typeScale had already shifted.

  sec.append(subHead('The ladder — largest first'));
  const used = new Set(ty.composites.map((c) => c.sizePx));
  const minUsed = new Set(ty.composites.map((c) => c.sizeMinPx));
  const displayStack = ty.families.find((f) => f.group === 'display')?.stack.join(', ') ?? 'inherit';
  // #404 — the SHARED table shape, on the same 112/148/148/390 grid as the leading/tracking ladders
  // below it. It was the one bespoke row layout left on the tab, and it also dimmed unbound rungs and
  // carried a three-key legend, so the two ladder tables on one tab taught opposite things: this one
  // said "unbound means faded", its sibling said "unbound is the ordinary case, stated in a column".
  //
  // Dimming is gone. On a READ-ONLY primitive table a faded row implies unavailable or wrong, and
  // neither is true — 22 steps exist, which ones are bound changes the moment Shape or Range moves.
  // The legend went with it: two of its three keys described which rungs travel with those levers,
  // which is a Text styles concern rather than a property of the raw material, and the third existed
  // only to explain the dimming. The blue `head` dot went too — it was the levered-rung marker those
  // keys explained, and an unexplained colour-coded dot is worse than no dot.
  const box = el('div', 'mtbl');
  // sl-tall raises the scroll cap for the taller mode table
  const scroll = el('div', mix('mtbl-scroll', 'sl-tall'));
  const tbl = el('table', 'mtbl-tbl');
  const thead = el('thead'), htr = el('tr');
  htr.append(el('th', 'mtbl-stick', 'Step'), el('th', 'mtbl-mode', 'rem'),
    el('th', 'mtbl-mode', 'Used by'), el('th', 'mtbl-fill mtbl-spec', 'Specimen'));
  thead.append(htr); tbl.append(thead);
  const tb = el('tbody');
  let firstBound: HTMLElement | null = null;
  // Largest-first: every lever acts on the heading end, so the rungs that change must be the ones in
  // view. The scroll still opens on the first BOUND rung — the top of the ladder is 160px and most
  // brands never reach it — but it now finds that row by capturing it here rather than by querying
  // `:not(.unused)`, which is the class #404 removed.
  for (const px of [...ty.sizesPx].reverse()) {
    const inUse = used.has(px);
    const tr = el('tr');
    const nc = el('td', 'mtbl-stick');
    nc.append(el('span', 'mtbl-name mono', `${px}px`));
    tr.append(nc);
    const rc = el('td', 'mtbl-mode');
    rc.append(el('span', 'mtbl-selfval mono', `${+(px / 16).toFixed(4)}rem`));
    tr.append(rc);
    const who = [...new Set(ty.composites.filter((c) => c.sizePx === px).map((c) => c.group))];
    const wc = el('td', 'mtbl-mode');
    wc.append(el('span', 'ltbl-who' + (inUse ? '' : ' none'),
      inUse ? who.join(', ') : (minUsed.has(px) ? 'fluid floor only' : 'not bound')));
    tr.append(wc);
    const pc = el('td', 'mtbl-fill mtbl-spec');
    const samp = el('div', 'sl-samp', 'Ag');
    samp.style.fontSize = `${px}px`; samp.style.fontFamily = displayStack;
    pc.append(samp);
    tr.append(pc);
    if (inUse && !firstBound) firstBound = tr;
    tb.append(tr);
  }
  tbl.append(tb); scroll.append(tbl); box.append(scroll);
  sec.append(box);
  requestAnimationFrame(() => { if (firstBound) scroll.scrollTop = Math.max(0, firstBound.offsetTop - 4); });
  return sec;
};

/** The leading + tracking LADDERS — the primitives themselves (#388 part B). Read-only, and shown at
 *  all for the reason the size ladder is: these are the steps every rung is chosen from, and without
 *  this table they are visible nowhere in the app — you would only ever see the handful of values some
 *  rung happens to bind. #384 locked both ladders, so there is nothing here to edit; what IS editable
 *  is which step each rung binds, one tier up on Semantics. */
const renderRungLadders = (): HTMLElement => {
  const ty = theme.typography;
  const sec = palSection('Leading & tracking ladders', 'The steps every leading and tracking rung is chosen from. Fixed and brand-invariant, like the size ladder — the gaps are deliberate, so a value between two steps is not a value this system emits. Binding a rung to one of these is on Semantics.');
  const ladderTable = (caption: string, ladder: readonly number[], fmt: (v: number) => string,
    boundBy: (v: number) => string[], preview: (host: HTMLElement, v: number) => void): void => {
    const box = el('div', 'mtbl');
    box.append(el('p', 'mtbl-cap', caption));
    const scroll = el('div', 'mtbl-scroll');
    const tbl = el('table', 'mtbl-tbl');
    const thead = el('thead');
    const htr = el('tr');
    // Four columns on the same 112/148/148/390 grid every other tier table uses (#363) — a 2-column
    // table here would have broken the one-grid rule the tab is built on. The 3rd column is what makes
    // a read-only ladder worth showing at all: 15 bare numbers teach nothing, 15 rendered steps show
    // you what the gaps between them actually cost.
    htr.append(el('th', 'mtbl-stick', 'Step'), el('th', 'mtbl-mode', 'Used by'),
      el('th', 'mtbl-mode', ''), el('th', 'mtbl-fill mtbl-spec', 'Specimen'));
    thead.append(htr); tbl.append(thead);
    const tb = el('tbody');
    for (const v of ladder) {
      const who = boundBy(v);
      // No row-level "unused" class: an unbound step is the COMMON case here (15 steps, ~6 rungs), so
      // dimming the majority of the table would read as an error state. The faint "not bound" cell
      // below carries it. (`el`'s 1st arg is the TAG — a class concatenated into it silently produces
      // an invalid element name, which is exactly what the first draft of this line did.)
      const tr = el('tr');
      const nc = el('td', 'mtbl-stick');
      nc.append(el('span', 'mtbl-name mono', fmt(v)));
      tr.append(nc);
      const wc = el('td', 'mtbl-mode');
      // An unbound step is the COMMON case (15 steps, ~6 rungs), so it must read as ordinary rather
      // than as a warning — "not used" in the faint tier, never a ✗ or an amber flag.
      wc.append(el('span', 'ltbl-who' + (who.length ? '' : ' none'), who.length ? who.join(', ') : 'not bound'));
      tr.append(wc);
      tr.append(el('td', 'mtbl-mode'));
      // `.ltbl-samp`, exactly as the rung table uses — NOT `.mtbl-spec-t`. That class is nowrap +
      // ellipsis, and a nowrap block contributes its full single-line width as min-content, so the
      // line-height specimen forced the fill column to 590px while the short tracking one sat at 239
      // (#369's trap, reproduced). `.ltbl-samp` wraps and caps at 52ch, which bounds the contribution
      // and lets both tables settle on the same grid.
      const pc = el('td', 'mtbl-fill mtbl-spec');
      const pv = el('div', 'ltbl-samp');
      preview(pv, v);
      pc.append(pv);
      tr.append(pc);
      tb.append(tr);
    }
    tbl.append(tb); scroll.append(tbl); box.append(scroll);
    sec.append(box);
  };
  // Same specimen strings the rung table uses, so a step reads identically whether you are looking at
  // the ladder or at the rung bound to it.
  ladderTable('Line height', LINE_HEIGHT_LADDER, (v) => `${v.toFixed(2)}×`,
    (v) => ty.lineHeights.filter((l) => Math.abs(l.value - v) < 1e-9).map((l) => l.key),
    (host, v) => { host.textContent = 'Typography is the craft of endowing human language with a durable visual form.'; host.style.lineHeight = String(v); });
  ladderTable('Letter spacing', LETTER_SPACING_LADDER, (v) => `${v}em · ${emToPercentLabel(v)}`,
    (v) => ty.letterSpacings.filter((l) => Math.abs(l.em - v) < 1e-9).map((l) => l.key),
    (host, v) => { host.textContent = 'Typography & tracking'; host.style.letterSpacing = `${v}em`; host.style.fontSize = '16px'; });
  return sec;
};

/** The rung → ladder-step BINDINGS (Semantics tab). Mode-invariant values, so this section never
 *  varies by mode; the per-mode re-point half is `renderRepoints`, below it on the same tab. Moved
 *  off the primitives tab in #388 part B — a rung is a named role, not raw material, and sitting it
 *  beside the ladder was what made the two read as one conflated thing. */
const renderLeadingTracking = (): HTMLElement => {
  const ty = theme.typography;
  const sec = palSection('Leading & tracking rungs', 'Each named rung binds one step of the fixed ladders on Primitives. Re-point a rung here and every style using it reflows — one binding each, shared by every mode unless a mode re-points it below. Which rung a category lands on is chosen for you from its size and role, and nudged per category on Text styles.');
  // #363 — the shared `.mtbl` table format, but its GEOMETRY only, not its semantics. These rungs are
  // mode-invariant primitives, so there is NO mode axis and the table gets no mode columns: adding them
  // would assert a dimension these values do not have. Same rule that keeps Category setup and
  // Responsive out of this format. The three fixed columns use the same width tokens as every other
  // table on the page, which is the whole point — each tier tab reads on one column grid.
  const ramp = (caption: string, steps: { key: string; val: number }[],
    globalKey: string, modeField: 'lineHeights' | 'letterSpacings',
    ladder: readonly number[], fmt: (v: number) => string,
    preview: (host: HTMLElement, v: number) => void): void => {
    const box = el('div', 'mtbl');
    box.append(el('p', 'mtbl-cap', caption));
    const scroll = el('div', 'mtbl-scroll');
    const tbl = el('table', 'mtbl-tbl');
    const thead = el('thead'), htr = el('tr');
    htr.append(el('th', 'mtbl-stick', 'Rung'), el('th', 'mtbl-mode', 'Value'),
      el('th', 'mtbl-mode', 'Used by'), el('th', 'mtbl-fill mtbl-spec', 'Specimen'));
    thead.append(htr); tbl.append(thead);
    const tb = el('tbody');
    steps.forEach((s, idx) => {
      const tr = el('tr');
      const nc = el('td', 'mtbl-stick');
      nc.append(el('span', 'mtbl-name mono', s.key));
      tr.append(nc);
      // #388 — a SELECT of ladder steps, not a free number. #384 made the engine refuse off-ladder
      // values, and this control had kept `step="0.05"` from `min="0.8"`, so arrow-keying from 1.30
      // landed on 1.35 — inside the deliberate 1.30→1.40 gap. The engine threw, `rebuild()` caught it,
      // and the user saw the field still showing the value the system had just rejected. Binding to an
      // existing step is what a locked ladder means; typing was never the right verb.
      //
      // Steps that would CROSS a neighbor are rendered disabled rather than omitted: the ramp order is
      // a real constraint, and showing it grayed teaches it, where hiding it would look like the ladder
      // is shorter than it is.
      const vc = el('td', 'mtbl-mode');
      // ltbl-sel sets the width from the library table's own scope
      const sel = selectEl(mix('sm', 'ltbl-sel'));
      sel.setAttribute('aria-label', `${caption} ${s.key}`);
      const lo = idx > 0 ? steps[idx - 1].val : -Infinity;
      const hi = idx < steps.length - 1 ? steps[idx + 1].val : Infinity;
      for (const v of ladder) {
        const o = optionEl(String(v), fmt(v), Math.abs(v - s.val) < 1e-9) as HTMLOptionElement;
        if (v < lo - 1e-9 || v > hi + 1e-9) {
          o.disabled = true;
          o.title = `Would cross ${v < lo ? steps[idx - 1].key : steps[idx + 1].key} — the rung names are a relative-emphasis ramp, so they stay in order`;
        }
        sel.append(o);
      }
      // `applyFull`, not `apply`: TWO things in this table are derived from the rung values and neither
      // survives a volatile-only repaint. The obvious one is this row's SPECIMEN — measured stale, the
      // select read 1.00 while the sample still rendered at 1.05. The one that actually matters is the
      // NEIGHBOURS' option ranges: `lo`/`hi` above come from `steps[idx±1]`, so moving `tight` re-derives
      // what `snug` may legally select. Left stale, a now-illegal option stays clickable and the engine
      // throws on it — a select whose whole purpose is making off-ladder values unreachable (#388).
      // A surgical paint of just the specimen would have fixed the visible half and left the live one.
      sel.onchange = () => { setPath(brandState, `${globalKey}.${s.key}`, Number(sel.value)); applyFull(); };
      vc.append(sel);
      tr.append(vc);
      const who = [...new Set(ty.composites.filter((c) => (modeField === 'lineHeights' ? c.lineHeight : c.tracking) === s.key).map((c) => c.group))];
      const wc = el('td', 'mtbl-mode');
      wc.append(el('span', 'ltbl-who' + (who.length ? '' : ' none'), who.length ? who.join(', ') : 'not currently used'));
      if (who.length) wc.title = who.join(', ');
      tr.append(wc);
      // The specimen must WRAP — a line-height rung is invisible on one line, so this is the one
      // cell on the page that deliberately does not take `.mtbl-spec-t`'s nowrap+ellipsis.
      const pc = el('td', 'mtbl-fill mtbl-spec');
      const pv = el('div', 'ltbl-samp');
      preview(pv, s.val);
      pc.append(pv);
      tr.append(pc);
      tb.append(tr);
    });
    tbl.append(tb); scroll.append(tbl); box.append(scroll);
    sec.append(box);
  };
  ramp('Line height', ty.lineHeights.map((l) => ({ key: l.key, val: l.value })),
    'typography.lineHeights', 'lineHeights', LINE_HEIGHT_LADDER, (v) => `${v.toFixed(2)}×`,
    (host, v) => { host.textContent = 'Typography is the craft of endowing human language with a durable visual form.'; host.style.lineHeight = String(v); });
  ramp('Letter spacing', ty.letterSpacings.map((l) => ({ key: l.key, val: l.em })),
    'typography.letterSpacings', 'letterSpacings', LETTER_SPACING_LADDER, (v) => `${v}em · ${emToPercentLabel(v)}`,
    (host, v) => { host.textContent = 'Typography & tracking'; host.style.letterSpacing = `${v}em`; host.style.fontSize = '16px'; });
  return sec;
};

// ---- STYLES (semantics) ----------------------------------------------------

/** Weight roles → numeric. A named role aliasing a primitive: semantic, and global —
 *  `emphasis` is the same numeric in every category (#112). */
/** One stepper cell. `canDown`/`canUp` come from the caller because the constraint is axis-specific:
 *  a size ramp must stay strictly increasing and the engine REFUSES otherwise, while weight roles are
 *  only warned about — so faking a hard bound on weights would invent a rule the engine does not have. */
const stepCell = (o: {
  px: number; canDown: boolean; canUp: boolean; pinned: boolean;
  title?: (v: number) => string; label: string;
  step: (dir: -1 | 1) => number | undefined; write: (v: number | undefined) => void;
}): HTMLElement => {
  const wrap = el('div', 'mcell');
  const mk = (glyph: string, dir: -1 | 1, enabled: boolean) => {
    const b = el('button', 'mstep', glyph) as HTMLButtonElement;
    b.disabled = !enabled;
    const to = o.step(dir);
    b.title = enabled && to !== undefined ? `${o.px} → ${to}` : (dir < 0 ? 'Already at the lowest available' : 'Already at the highest available');
    b.setAttribute('aria-label', `${o.label} ${dir < 0 ? 'down' : 'up'}`);
    b.onclick = () => o.write(o.step(dir));
    return b;
  };
  const val = el('span', 'mval mono' + (o.pinned ? ' pin' : ''), String(o.px));
  val.title = o.title ? o.title(o.px) : (o.pinned ? 'Set here' : 'Following the baseline');
  wrap.append(mk('−', -1, o.canDown), val, mk('+', 1, o.canUp));
  if (o.pinned) {
    const r = el('button', 'mreset', '↺') as HTMLButtonElement;
    r.title = 'Follow the baseline again';
    r.setAttribute('aria-label', `Reset ${o.label}`);
    r.onclick = () => o.write(undefined);
    wrap.append(r);
  } else wrap.append(el('span', 'mreset-sp'));
  return wrap;
};

/** The weight-role table — same shape and geometry as the size tables so they stack on one grid.
 *  Rows are weight ROLES, not sizes: a role is one numeric shared by every category that uses it,
 *  which is why this cannot be extra rows in the size table. */
const WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const renderWeightTable = (): HTMLElement => {
  const ty = theme.typography;
  const modes = rp.modes;
  // #422 (reopened) — the specimen used to be one `<td>` built OUTSIDE the per-mode loop from the
  // static baseline `w.value`, so it never moved for any per-mode edit. #424 (2026-08-03) responded by
  // dropping the column outright, reasoning that "Weight roles by face" already answers "what does this
  // weight look like" — but that table is deliberately MODE-BLIND (owner, 2026-08-01): its specimen is
  // per FACE at the baseline numeric, never per mode, so it cannot show what THIS table is about — a
  // role whose numeric itself differs per mode. Dropping the column traded a wrong answer for no answer.
  //
  // Fix, mirroring the pattern "Weight roles by face" DOES already establish — a specimen built INSIDE
  // the per-column loop, from that column's own resolved value, rather than once after it (main.ts's
  // per-face `td` loop below, ~line 3210). Applied here per mode instead of per face: each mode's cell
  // gets its own "Ag 123" sample at that mode's actually-resolved weight (baseline override, mode-lever
  // re-point, or fallback — the same `value` its stepper already computes and displays as a number).
  // Living inside the existing mode column rather than a trailing column also sidesteps #424's overflow
  // complaint — no new column, so the width #424 fixed stays fixed.
  const textStack = ty.families.find((f) => f.group === 'body')?.stack.join(', ') ?? 'inherit';
  const box = el('div', 'mtbl');
  box.append(el('p', 'mtbl-cap', 'Weight roles'));
  const scroll = el('div', 'mtbl-scroll');
  const tbl = el('table', 'mtbl-tbl');
  const thead = el('thead'), htr = el('tr');
  htr.append(el('th', 'mtbl-stick', 'Role'));
  for (const m of modes) {
    const th = el('th', 'mtbl-mode');
    th.append(document.createTextNode(MODE_LABEL[m] ?? m));
    if (m === 'light') th.append(el('span', 'mtbl-ro', ' baseline'));
    else if (!modeIsEditable(m)) th.append(el('span', 'mtbl-ro', ' auto'));
    htr.append(th);
  }
  htr.append(el('th', 'mtbl-fill'));
  thead.append(htr); tbl.append(thead);
  const tb = el('tbody');
  for (const w of ty.weightRoles) {
    const tr = el('tr');
    const nameCell = el('td', 'mtbl-stick');
    nameCell.append(el('span', 'mtbl-name mono', w.role));
    tr.append(nameCell);
    for (const m of modes) {
      const isBase = m === 'light';
      const override = isBase
        ? (getPath(brandState, `typography.weightRoles.${w.role}`) as number | undefined)
        : (getModeLever(m, `weights.${w.role}`) as number | undefined);
      const value = override ?? (ty.weightRolesByMode?.[m]?.find((x) => x.role === w.role)?.value ?? w.value);
      // The specimen: same "Ag 123" glyph sample the by-face table uses, at THIS column's resolved
      // weight — never `w.value`, the row's baseline, which is exactly the bug #422 reported.
      const spec = () => {
        // #422 — weight-roles specimen; wt-spec adds margin-top:4px to stack it under the stepper
        const samp = el('span', mix('mtbl-spec-t', 'tpw-samp', 'wt-spec'), 'Ag 123');
        samp.style.fontWeight = String(value);
        samp.style.fontFamily = textStack;
        return samp;
      };
      // #423 — a derived mode accepts no levers, so its column is a READING of the resolved numeric,
      // never a stepper. Rendering the stepper is what let a click reach the engine and print
      // "mode 'hc-dark' is generate-only and not customizable" at the user.
      if (!isBase && !modeIsEditable(m)) {
        const td = el('td', 'mtbl-mode');
        const self = el('span', 'mtbl-selfval mono', String(value));
        self.title = `${MODE_LABEL[m] ?? m} is auto-derived from Light and Dark — it resolves to ${value} and accepts no per-mode override.`;
        td.append(self, spec());
        tr.append(td);
        continue;
      }
      const idx = WEIGHT_STEPS.indexOf(value);
      const step = (dir: -1 | 1) => (idx >= 0 ? WEIGHT_STEPS[idx + dir] : undefined);
      const td = el('td', 'mtbl-mode');
      td.append(stepCell({
        px: value,
        // Ends of the scale only. Roles may cross each other — the engine allows it and the warning
        // below says so — so a neighbor bound here would be a rule the system does not actually have.
        canDown: step(-1) !== undefined,
        canUp: step(1) !== undefined,
        pinned: override !== undefined,
        label: `${w.role} weight${isBase ? '' : ` in ${m}`}`,
        title: (v) => `${v} — ${WEIGHT_NAME[v] ?? ''}`.trim(),
        step,
        write: (v) => {
          if (isBase) setPath(brandState, `typography.weightRoles.${w.role}`, v);
          else setModeLever(m, `weights.${w.role}`, v);
          applyFull();
        },
      }), spec());
      tr.append(td);
    }
    tr.append(el('td', 'mtbl-fill'));
    tb.append(tr);
  }
  tbl.append(tb); scroll.append(tbl); box.append(scroll);
  return box;
};

const renderWeightRoles = (): HTMLElement => {
  const ty = theme.typography;
  const sec = palSection('Weight roles', 'Each role maps to one CSS numeric, shared by every category — a relative-emphasis ladder from subtle to max. Per category you choose which roles ship, not what they weigh.');
  sec.append(renderWeightTable());
  const eff = ty.weightRoles.map((w) => w.value);
  if (eff.some((v, i) => i > 0 && v < eff[i - 1]))
    sec.append(hook(el('p', 'te-order-warn', '⚠ A heavier role now resolves lighter than one below it — the names read as relative emphasis (subtle → strong), so keeping them in order stays honest. A warning, not a block.'), 'order-warning'));
  return sec;
};

/** One per-mode re-point table. Rows are RUNGS; a cell names the rung that mode substitutes — never
 *  a number, because a mode may not redefine a primitive (the ladders are on Primitives). Selects,
 *  not steppers: re-pointing is an enum choice with an Auto state, and doc 26 puts 3+ options in a
 *  select. Same geometry tokens as the size and weight tables so all four line up on one grid. */
const renderRepointTable = (
  caption: string,
  steps: { key: string; val: number | string; base?: string }[],
  fmt: (v: number | string) => string,
  modeField: 'lineHeights' | 'letterSpacings' | 'easings',
  // The ladders re-point a rung at ANOTHER RUNG, so rows and options are the same set. Easing does
  // not: rows are the four motion ROLES and options are the six CURVES (#522). Hence the seam —
  // `options` defaults to `steps`, and `base` names the row's baseline target when it is not the row's
  // own key (role `default` resolves to curve `standard`), which is what the self-map skip and the
  // worth read-out must both key on rather than on the row name.
  options?: { key: string; val: number | string }[],
  // The ladders' rows ARE rungs; easing's are motion roles. A header reading "Rung" over a column of
  // role names is the kind of wrong only a screenshot catches.
  rowLabel = 'Rung',
  // When the baseline binding lives in ANOTHER table (the two ladders), Light is a read-out and this
  // stays undefined. Easing has no such table — its role→curve mapping was engine-fixed — so it passes
  // a writer and Light becomes a select like every other column. Without this a mode could deviate
  // from a baseline nobody could set: you could change Dark but not Light, which is backwards.
  setBaseline?: (rowKey: string, curve: string | undefined) => void,
): HTMLElement => {
  const opts = options ?? steps;
  const modes = rp.modes;
  const box = el('div', 'mtbl');
  box.append(el('p', 'mtbl-cap', caption));
  const scroll = el('div', 'mtbl-scroll');
  const tbl = el('table', 'mtbl-tbl');
  const thead = el('thead'), htr = el('tr');
  htr.append(el('th', 'mtbl-stick', rowLabel));
  for (const m of modes) {
    const th = el('th', 'mtbl-mode');
    th.append(document.createTextNode(MODE_LABEL[m] ?? m));
    if (m === 'light') th.append(el('span', 'mtbl-ro', ' baseline'));
    else if (!modeIsEditable(m)) th.append(el('span', 'mtbl-ro', ' auto'));   // #423
    htr.append(th);
  }
  htr.append(el('th', 'mtbl-fill'));
  thead.append(htr); tbl.append(thead);
  const tb = el('tbody');
  for (const s of steps) {
    const tr = el('tr');
    const nameCell = el('td', 'mtbl-stick');
    nameCell.append(el('span', 'mtbl-name mono', s.key));
    tr.append(nameCell);
    for (const m of modes) {
      const td = el('td', 'mtbl-mode');
      if (m === 'light' && setBaseline) {
        // Light IS the baseline, and here it is settable: this select writes the brand-wide binding
        // every other column is a substitution for.
        const sel = selectEl('sm');
        for (const t of opts) sel.append(optionEl(t.key, t.key, (s.base ?? s.key) === t.key));
        sel.setAttribute('aria-label', `${s.key} baseline`);
        sel.onchange = () => { setBaseline(s.key, sel.value); applyFull(); };
        td.append(sel);
        const worth = opts.find((t) => t.key === (s.base ?? s.key));
        if (worth) td.append(el('span', 'mtbl-worth mono', fmt(worth.val)));
      } else if (m === 'light') {
        // Light IS the baseline, so its cell can only ever resolve to the row's own rung. Showing the
        // VALUE rather than repeating the name earns the cell its width: it is the number every other
        // cell in the row is a substitution for.
        const self = el('span', 'mtbl-selfval mono', fmt(s.val));
        self.title = `The baseline. Change which ladder step ${s.key} binds in the table above — it is one binding, shared by every mode.`;
        td.append(self);
      } else if (!modeIsEditable(m)) {
        // #423 — a derived mode holds no levers, so it can only ever resolve to the rung itself.
        // Reading, not a select: the select's write reached the engine and printed its internal
        // "generate-only and not customizable" string at the user.
        const self = el('span', 'mtbl-selfval mono', fmt(s.val));
        self.title = `${MODE_LABEL[m] ?? m} is auto-derived from Light and Dark — it keeps the ${s.key} rung and accepts no per-mode re-point.`;
        td.append(self);
      } else {
        const ov = getModeLever(m, `${modeField}.${s.key}`) as string | undefined;
        // A set cell carries the same "pinned" weight the stepper tables give `.mval.pin`, so a scan
        // down the column finds the overrides without reading every label.
        const sel = selectEl(ov ? 'sm set' : 'sm');
        // Rung NAMES only, no values. A closed select renders the same text it lists, and the shared
        // column width ellipsised "relaxed · 1.65×" down to "relaxed · 1..." — truncating the one
        // thing a cell must always say. The values are one column to the left, on every row.
        sel.append(optionEl('', 'Auto', !ov));
        for (const t of opts) {
          if (t.key === (s.base ?? s.key)) continue;           // a self-map is a no-op; don't offer it
          sel.append(optionEl(t.key, t.key, ov === t.key));
        }
        sel.setAttribute('aria-label', `${s.key} in ${MODE_LABEL[m] ?? m}`);
        sel.onchange = () => { setModeLever(m, `${modeField}.${s.key}`, sel.value || undefined); applyFull(); };
        td.append(sel);
        // #388 — the VALUE this rung is worth in this mode, under the select. The complaint that opened
        // #377 was that a cell reading "rung tight → rung snug" re-points a rung into its own axis and
        // never says what it MEANS; the honest reading is "in Dark, tight = 1.15". It goes on a second
        // LINE rather than into the option text because a closed select renders exactly what it lists,
        // and "relaxed · 1.65×" ellipsised to "relaxed · 1..." at this column width — truncating the one
        // thing the cell must always say. Height is the affordable axis here; width is not.
        const worth = opts.find((t) => t.key === (ov ?? s.base ?? s.key));
        if (worth) td.append(el('span', 'mtbl-worth mono' + (ov ? ' set' : ''), fmt(worth.val)));
      }
      tr.append(td);
    }
    tr.append(el('td', 'mtbl-fill'));
    tb.append(tr);
  }
  tbl.append(tb); scroll.append(tbl); box.append(scroll);
  return box;
};

/** Hidden entirely for a single-mode brand: with no second mode there is nothing to re-point to, and
 *  every cell would be the read-only baseline. */
const renderRepoints = (): HTMLElement | null => {
  if (rp.modes.length < 2) return null;
  const ty = theme.typography;
  const sec = palSection('Leading & tracking per mode', 'A mode can swap one rung for another — a dark theme that wants everything a step looser, a compact mode that tightens. Rows are the rungs bound above, with what each is worth in the baseline column; every other column names the rung that mode substitutes. “Auto” keeps the rung itself.');
  sec.append(renderRepointTable('Line height', ty.lineHeights.map((l) => ({ key: l.key, val: l.value })), (v) => `${v}×`, 'lineHeights'));
  sec.append(renderRepointTable('Letter spacing', ty.letterSpacings.map((l) => ({ key: l.key, val: l.em })), (v) => `${v}em · ${emToPercentLabel(Number(v))}`, 'letterSpacings'));
  return sec;
};

/** Category setup — the composite skeleton. Each ticked weight multiplies out into real
 *  styles in the ramp; the leading/tracking nudges shift the engine's size-sensitive curve
 *  for that category rather than flattening it to one value. */
const renderCategorySetup = (): HTMLElement => {
  const ty = theme.typography;
  const roleOrder = ty.weightRoles.map((w) => w.role);
  const sec = palSection('What each category is made of', 'Choose the weight roles each category ships, nudge its leading and tracking, and decide whether it gets italic and underlined-link variants, or sets italic as its only cut. Each ticked weight multiplies out into a real style at every size in that category. The face is shown for context and set on Semantics.');
  // #416 — everything in this table is MODE-INVARIANT by contract (#296): which weights a category
  // ships and whether it gets italic/link decide which styles EXIST, and a mode never adds or removes
  // a token. The nudges are brand-level too. It used to disable every control outside Light, which
  // stated that correctly but illegibly — a greyed checkbox with the reason in a note above it. The
  // rule is now stated positively and the controls are always live, which is also what stops them
  // being stranded now that the mode bar has left this page (`currentMode` is global and can still be
  // Dark from another page, which would have left this table permanently dead).
  sec.append(el('p', 'te-shared-note', 'Shared across every mode. These choices decide which styles exist, and a mode never adds or removes one — it only overrides values (face, weight numerics, sizes, rungs), which is done on Semantics and above.'));
  const italicG = new Set(ty.composites.filter((c) => c.italic).map((c) => c.group));
  // #1296 — categories whose default cut is italic. Read from the composites like `italicG`, so the box
  // reports what the engine built rather than what the input asked for.
  const italicDefG = new Set(ty.composites.filter((c) => c.italicDefault).map((c) => c.group));
  const linkG = new Set(ty.composites.filter((c) => c.link).map((c) => c.group));
  const wrap = el('div', 'cs-wrap');
  const table = hook(el('table', 'cs-table'), 'category-table');
  const head = el('tr');
  head.append(el('th', undefined, 'Category'), el('th', undefined, 'Face'));
  // Header casing is SOURCE-ONLY tidying: every table header is `text-transform:uppercase`, so the
  // rendered page was already consistent and none of this is visible. Measured before assuming —
  // an earlier pass here added a `mono` class on the strength of "these are token identifiers", which
  // rendered ui-monospace beside -apple-system in one header row. That was the only user-visible
  // change in the whole casing question, and it made things worse. Reverted.
  const col = (t: string): HTMLElement => hook(el('th', 'cs-c', t), 'category-col');
  for (const r of roleOrder) head.append(col(r));
  head.append(col('Leading'), col('Tracking'), col('Italic default'), col('Italic'), col('Link'));
  table.append(head);
  const cb = (checked: boolean, onChange: (v: boolean) => void): HTMLInputElement => {
    const c = el('input') as HTMLInputElement;
    c.type = 'checkbox'; c.checked = checked;
    c.onchange = () => onChange(c.checked);
    return c;
  };
  // ±2 rungs, not ±1. The engine has always accepted `[-5, 5]` and `shiftRung` clamps at the ends of
  // the ramp, so widening the range is a UI change only — three options were under-offering what the
  // system could already do. The range is now DERIVED per category rather than fixed at ±2 (#377): a
  // flat cap was wrong in both directions at once — it offered dead steps for categories sitting
  // mid-ramp (from `normal`, +3/+4/+5 all clamp to `loose`) while hiding live ones for categories
  // sitting at an end (`display` derives `tight`/`snug`, so reaching `loose` needs +5 and was simply
  // unreachable). Both are the same mistake: guessing the range instead of computing it.
  /** Steps that actually MOVE at least one composite in this category. A category can derive several
   *  rungs (title spans three size bands), so the range runs from "enough negative to floor the
   *  highest-derived composite" to "enough positive to top out the lowest". Engine-bounded to ±5. */
  const nudgeSteps = (group: string, field: 'leadingShift' | 'trackingShift'): number[] => {
    const keys: readonly string[] = field === 'leadingShift' ? LINE_HEIGHT_KEYS : LETTER_SPACING_KEYS;
    const idx = ty.composites.filter((c) => c.group === group)
      .map((c) => keys.indexOf(derivedRungFor(field, c.group as any, c.sizePx)))
      .filter((i) => i >= 0);
    if (!idx.length) return [0];
    const lo = Math.max(-5, -Math.max(...idx));
    const hi = Math.min(5, (keys.length - 1) - Math.min(...idx));
    const out: number[] = [];
    for (let v = lo; v <= hi; v++) out.push(v);
    return out;
  };
  /** #411 — a SIGNED DELTA, carrying no word that is also a rung name.
   *
   *  The old labels were `2 tighter · tighter · default · looser · …`, and `tighter`/`wider` are
   *  literally `LETTER_SPACING_KEYS` entries: on Semantics `tighter` names THE TIGHTEST RUNG, on this
   *  tab the same word meant "shift one rung tighter". Same word, two meanings, one tab apart.
   *
   *  Rung names cannot go in the select instead, because the control is a SHIFT and two categories
   *  derive TWO rungs (title: compact at 18–24px, snug at 28–40px). `cozy` on title would be
   *  ambiguous — `compact→cozy` (+1) or `snug→cozy` (+2)? — and binding the category to one rung
   *  would flatten the size-sensitivity the nudge exists to preserve. */
  const nudgeLabel = (v: number): string => (v === 0 ? 'default' : `${v < 0 ? '\u2212' : '+'}${Math.abs(v)}`);
  /** What the delta RESOLVES TO — the concreteness the rung names would have given, and honest for a
   *  two-band category in a way no single label can be. Computed through the engine's own `shiftRung`
   *  rather than a local copy of its clamp, so this line cannot disagree with what the build does.
   *
   *  RAMP ORDER (tightest first), matching how both ladders read on Primitives and Semantics. Note
   *  that #411's worked example wrote `compact–snug`, which is SIZE order — the same two rungs, listed
   *  the other way. Ramp order is the issue's own stated lean and the one every other rung list on the
   *  page already uses; it is a one-line change to `sort` if the example was the intent.
   *
   *  Values stay OFF this line: `compact 1.25×–snug 1.15×` measured 154.2px against a 91.3px cell.
   *  They live on Semantics, where the per-mode table already shows them. */
  const resolvedRungs = (group: string, field: 'leadingShift' | 'trackingShift', shift: number): string => {
    const keys: readonly string[] = field === 'leadingShift' ? LINE_HEIGHT_KEYS : LETTER_SPACING_KEYS;
    const idx = [...new Set(ty.composites.filter((c) => c.group === group)
      .map((c) => keys.indexOf(shiftRung(keys, derivedRungFor(field, c.group as any, c.sizePx), shift)))
      .filter((i) => i >= 0))].sort((a, b) => a - b);
    return idx.map((i) => keys[i]).join('\u2013');
  };
  const nudge = (group: string, field: 'leadingShift' | 'trackingShift'): HTMLElement => {
    const cur = (getPath(brandState, `typography.${field}.${group}`) as number | undefined) ?? 0;
    const wrap = el('div', 'cs-nudgew');
    const sel = selectEl('sm cs-nudge');
    const steps = nudgeSteps(group, field);
    for (const v of steps) sel.append(optionEl(String(v), nudgeLabel(v), v === cur));
    // A hand-authored shift of ±3..±5 is legal in the engine and would otherwise match no option, so
    // the select would show the first one and rewrite the value on the next change. Same intent as
    // `renderPerModeSelect`'s "(custom)" fallback: surface it rather than silently losing it. The
    // resolved line needs no such special case — it is computed from the shift, not enumerated.
    if (!steps.includes(cur)) sel.append(optionEl(String(cur), nudgeLabel(cur), true));
    // `.set` marks a category that has been moved off its derived curve, the same weight the per-mode
    // tables give an override.
    const worth = el('span', 'mtbl-worth mono' + (cur !== 0 ? ' set' : ''), resolvedRungs(group, field, cur));
    sel.onchange = () => {
      const n = Number(sel.value);
      setPath(brandState, `typography.${field}.${group}`, n === 0 ? undefined : n);
      // Written HERE as well as re-derived on the next paint. `apply()` repaints only the volatile
      // region, and a derived affordance that waits for the next full paint lags the value it
      // describes — measured in #415, where the `.set` class did exactly that. The sizes this reads
      // are untouched by a nudge, so computing from the current theme is correct.
      worth.textContent = resolvedRungs(group, field, n);
      worth.classList.toggle('set', n !== 0);
      apply();
    };
    wrap.append(sel, worth);
    return wrap;
  };
  for (const g of TYPE_GROUP_ORDER) {
    const comps = ty.composites.filter((c) => c.group === g);
    const tr = el('tr');
    const nameTd = el('td');
    // Text styles was the ONLY tab that never named a token — and it is the tab that defines `type.*`.
    // Primitives, Semantics and Preview all carry pills; Preview lists `type.display.3xl.strong` while
    // the tab that CREATES it said nothing. A category is a family of composites rather than one leaf, so the pill names the
    // NODE they are emitted under. It carried a trailing `*` first, which `.tpill`'s `direction:rtl`
    // (left-ellipsis for long paths) reordered to the front — it rendered `*.type.display`. The count
    // above it already says this is a set, and the tooltip says so in words.
    nameTd.append(hook(el('div', 'cs-name mono', g), 'category-name'), hook(el('div', 'cs-count', `${comps.length} ${comps.length === 1 ? 'style' : 'styles'}`), 'category-count'));
    const catPill = tokenPill(`type.${g}`);
    catPill.title = `Every style in this category is emitted under type.${g} — ${comps.length} of them`;
    nameTd.append(catPill);
    tr.append(nameTd);
    // #415 — READ-ONLY. This was a select over the display/text/mono ROLES, and it is the control that
    // exposed the tier as a mistake: with every role on one face it rendered several options all
    // labeled "Inter" (the values were roles, the labels were faces), so picking one was guesswork.
    // Collapsing the tier removes the choice from here rather than relabeling it — the category now
    // binds a face directly, and `font.family.<category>` is a SEMANTIC token, so its editor belongs on
    // Semantics next to the other semantics. Two live editors for one value is the state the mode-bar
    // overlap already put this page in (#416); this does not add a third.
    //
    // It stays as a resolved READING because it is real context for the row — the weight set and the
    // leading nudge beside it are choices you make knowing which face they land on — and because the
    // per-mode value is genuinely different information from the baseline.
    // The BASELINE face. Per-mode faces are a column axis on Semantics now (#416), so resolving this
    // against `currentMode` would report a value this page no longer has a mode context for.
    const faceOf = (cat: string): string => ty.families.find((f) => f.group === cat)?.stack[0] ?? '—';
    const ftd = el('td');
    const fname = el('div', 'cs-face', faceOf(g));
    fname.title = ty.families.find((f) => f.group === g)?.stack.join(', ') ?? '';
    ftd.append(fname);
    ftd.append(el('div', 'cs-count', 'Set on Semantics'));
    tr.append(ftd);
    const has = new Set(comps.map((c) => c.weightRole));
    const required = (REQUIRED_WEIGHT_ROLES as Record<string, { role: string; why: string } | undefined>)[g];
    for (const r of roleOrder) {
      const td = hook(el('td', 'cs-c'), 'category-cell');
      const box = cb(has.has(r), () => {
        const next = roleOrder.filter((x) => (x === r ? !has.has(r) : has.has(x)));
        // `applyFull`, not `apply`: the disabled states below are derived from the shipped set, and a
        // volatile-only repaint left them (and `has`) describing the previous set until the next paint.
        setPath(brandState, `typography.weights.${g}`, next.length ? next : undefined); applyFull();
      });
      // #1639/#1681: the engine refuses a category with no weight, a label without `emphasis`, and a
      // body or caption without `default`. The unticks that would reach those refusals are disabled
      // here, with the reason on hover, the same way the rung selects disable a step that would cross
      // its neighbor.
      if (has.has(r) && required?.role === r) {
        box.disabled = true;
        box.title = `${g[0].toUpperCase()}${g.slice(1)} always ships ${r} — ${required.why}.`;
      } else if (has.has(r) && has.size === 1) {
        box.disabled = true;
        box.title = 'Every category ships at least one weight — tick another before clearing this one.';
      }
      td.append(box);
      tr.append(td);
    }
    const ltd = hook(el('td', 'cs-c'), 'category-cell'); ltd.append(nudge(g, 'leadingShift')); tr.append(ltd);
    const ttd = hook(el('td', 'cs-c'), 'category-cell'); ttd.append(nudge(g, 'trackingShift')); tr.append(ttd);
    // #1296 — Italic default and Italic are exclusive per category (the engine refuses both: an italic
    // default leaves no upright weight to pair an -italic twin with). The box that would reach that
    // refusal is disabled with the reason on hover, the same way the weight boxes above disable an
    // untick the engine would refuse. `applyFull`, because each box's disabled state reads the other.
    const idtd = hook(el('td', 'cs-c'), 'category-cell');
    const idBox = cb(italicDefG.has(g), (v) => {
      const next = TYPE_GROUP_ORDER.filter((x) => (x === g ? v : italicDefG.has(x)));
      setPath(brandState, 'typography.italicDefault', next.length ? next : undefined); applyFull();
    });
    if (italicG.has(g)) { idBox.disabled = true; idBox.title = 'This category ships -italic variants. Clear Italic first: an italic default replaces the upright cut those variants pair with.'; }
    else if (!italicDefG.has(g) && Object.keys((getPath(brandState, `typography.faces.${g}`) as Record<string, unknown> | undefined) ?? {}).length) { idBox.disabled = true; idBox.title = 'This category pins a cut. Clear its pinned cut first: an italic default sets the cut from the weight, and a pin would override it.'; }
    idtd.append(idBox);
    tr.append(idtd);
    const itd = hook(el('td', 'cs-c'), 'category-cell');
    const iBox = cb(italicG.has(g), (v) => {
      const next = TYPE_GROUP_ORDER.filter((x) => (x === g ? v : italicG.has(x)));
      setPath(brandState, 'typography.italics', next); applyFull();
    });
    if (italicDefG.has(g)) { iBox.disabled = true; iBox.title = 'This category is already italic by default, so an -italic variant would repeat each style. Clear Italic default first.'; }
    itd.append(iBox);
    tr.append(itd);
    const ktd = hook(el('td', 'cs-c'), 'category-cell');
    ktd.append(cb(linkG.has(g), (v) => {
      const next = TYPE_GROUP_ORDER.filter((x) => (x === g ? v : linkG.has(x)));
      setPath(brandState, 'typography.links', next); apply();
    }));
    tr.append(ktd);
    table.append(tr);
  }
  wrap.append(table);
  sec.append(wrap);
  // #411 — the sign convention has to be stated somewhere, since the labels are now bare deltas.
  // `innerHTML`, not `el`'s text argument: `el` escapes, so the markup would render literally.
  const nudgeNote = el('p', 'sl-note');
  nudgeNote.innerHTML = 'The leading and tracking nudges shift that category’s whole curve: <b>+1 opens it by one rung, −1 tightens it</b>. Bigger headings keep tightening — they start from a different place. The line under each control names the rung the category lands on, or both rungs where it spans two size bands.';
  sec.append(nudgeNote);
  return sec;
};

/** Pin a font cut (#1467) — the studio control for the engine's `facePin` (#1368).
 *
 *  `facePin` binds a VERBATIM Figma family+style to one (category, weight-role) slot, and it is the
 *  ONLY way to reach a WIDTH cut — "Light Condensed", "Bold Extended" — because Figma's `fontStyle` is
 *  a STRING, so the numeric weight axis can never name one. NB uses it for `display/subtle` and
 *  `title/subtle` (ITC Garamond Std Light Condensed). Until now it could only be set by hand-editing
 *  the brand input; this closes that.
 *
 *  PLACEMENT (#1467 left this a minor call): a distinct "Pin a cut" section on the Text styles tab,
 *  directly under the category table that DEFINES the (category × weight-role) slots this pins — kept
 *  in the existing typography UI rather than a new page. Not merged INTO that table: a free-text input
 *  in every role column would be far too wide, and a pin is a sparse, advanced choice (NB pins 2 of its
 *  slots), so a focused section listing only the pinnable slots reads better than a grid of empty cells.
 *
 *  SHAPE (#1467, owner-decided): a FREE-TEXT style string, not a picker enumerated from the family's
 *  cuts — a picker needs the bound family's cut list, which the studio does not have (out of scope).
 *  The author types ONLY the style; the `family` is fixed to the category's bound face and written
 *  automatically, because the engine DROPS a pin whose family diverges from the bound one
 *  (`theme.ts` `buildComposites` ~:1315, a named refusal). A pin can never be set with a diverging
 *  family here, and a pin left STALE by a later face change is surfaced inline — never silent. */
const renderFacePins = (): HTMLElement => {
  const ty = theme.typography;
  const sec = palSection('Pin a font cut', 'Bind a verbatim Figma cut — a width like Condensed that a numeric weight cannot reach — to one weight-role slot. The face is fixed to the category’s bound family; type only the style, exactly as Figma names it (for example, Light Condensed). Leave a slot blank to derive the style from its weight. Italic is set with the Italic columns above, not with a pin.');
  // The BOUND family for a category — `stack[0]`, the value `font.family.<cat>` carries and the value
  // the engine's pin validation compares against (`buildComposites` `familyPrimary`). This is the same
  // source the row's Face column reads, so the family the control WRITES cannot disagree with the one
  // it SHOWS.
  const boundFamily = (cat: string): string | undefined => ty.families.find((f) => f.group === cat)?.stack[0];
  const roleOrder = ty.weightRoles.map((w) => w.role);
  // Read/write the whole `faces` object so CLEARING a slot DELETES its key rather than leaving
  // `{ role: undefined }` behind: the engine iterates `faces` entries and throws on a present-but-empty
  // pin, so an undefined value would read as a broken pin, not an absent one.
  const setPin = (cat: string, role: string, style: string): void => {
    const faces: Record<string, Record<string, FacePin>> = structuredClone(getPath(brandState, 'typography.faces') ?? {});
    const fam = boundFamily(cat);
    const trimmed = style.trim();
    if (trimmed && fam) {
      (faces[cat] ??= {})[role] = { family: fam, style: trimmed };
    } else if (faces[cat]) {
      delete faces[cat][role];
      if (!Object.keys(faces[cat]).length) delete faces[cat];
    }
    setPath(brandState, 'typography.faces', Object.keys(faces).length ? faces : undefined);
    apply();
  };
  const wrap = el('div', 'cs-wrap');
  const table = hook(el('table', mix('cs-table', 'pincut')), 'pin-cut-table');
  const head = el('tr');
  head.append(el('th', undefined, 'Slot'), el('th', undefined, 'Face'), el('th', 'cs-c', 'Style pin'));
  table.append(head);
  let slots = 0;
  // #1296 — an italic-default category takes no pin: the engine refuses any pin there, since a verbatim
  // upright cut would contradict the italic its tokens carry. Not offered, and named below the table.
  const italicDefault = new Set(ty.composites.filter((c) => c.italicDefault).map((c) => c.group));
  for (const g of TYPE_GROUP_ORDER) {
    const fam = boundFamily(g);
    if (!fam) continue;   // an unbound category has no face to pin a cut WITHIN — the engine refuses it, so it is never offered
    if (italicDefault.has(g)) continue;
    const shipped = roleOrder.filter((r) => ty.composites.some((c) => c.group === g && c.weightRole === r));
    for (const role of shipped) {
      slots++;
      const tr = hook(el('tr', 'pincut-row'), 'pin-cut-row');
      tr.setAttribute('data-cat', g);
      tr.setAttribute('data-role', role);
      const slotTd = el('td');
      slotTd.append(el('div', 'cs-name mono', `${g} · ${role}`), el('div', 'cs-count', 'Every size in this category'));
      tr.append(slotTd);
      const fTd = el('td');
      const fName = hook(el('div', mix('cs-face', 'pincut-face'), fam), 'pin-cut-face');
      fName.title = ty.families.find((f) => f.group === g)?.stack.join(', ') ?? fam;
      fTd.append(fName);
      tr.append(fTd);
      const inTd = el('td', 'cs-c');
      const cur = getPath(brandState, `typography.faces.${g}.${role}`) as FacePin | undefined;
      const inp = hook(el('input', mix('tf-in', 'pincut-in')) as HTMLInputElement, 'pin-cut-input');
      inp.type = 'text';
      inp.spellcheck = false;
      inp.placeholder = 'Derived from weight';
      inp.value = cur?.style ?? '';
      inp.setAttribute('aria-label', `Style cut for ${g} ${role}`);
      // Commit on `change` (blur / Enter), not per keystroke: `apply()` repaints this section, which
      // would drop the caret mid-word the way the identity fields' skip-rebuild lineage records.
      inp.onchange = () => setPin(g, role, inp.value);
      inTd.append(inp);
      // A STALE pin — the bound family moved AFTER the pin was set — is surfaced, never silent: the
      // engine would refuse it at build (family mismatch) and drop the cut. Re-committing the style
      // rewrites the family to the current face, so the note says exactly that.
      if (cur && cur.family !== fam)
        inTd.append(el('p', mix('tf-adderr', 'pincut-stale'), `Pinned to “${cur.family}”, but this category now binds “${fam}”. Re-enter the style to re-bind, or the cut is dropped at export.`));
      tr.append(inTd);
      table.append(tr);
    }
  }
  wrap.append(table);
  sec.append(wrap);
  if (!slots) sec.append(el('p', 'sl-note', 'No pinnable slots yet — bind a face to a category on Semantics first.'));
  if (italicDefault.size) {
    const cats = TYPE_GROUP_ORDER.filter((g) => italicDefault.has(g)).join(' and ');
    sec.append(el('p', 'sl-note', `Not listed: ${cats}, which ${italicDefault.size === 1 ? 'is' : 'are'} italic by default. A pin binds its style verbatim, so it would override the italic. Clear Italic default above to pin a cut there.`));
  }
  return sec;
};
// ---- the override pickers the Interactive matrix composes from ---------------------------------
// The legacy Surfaces page's editors (Backgrounds, Foreground fills, Text) went with that page in UI redesign
// S4a: Color › Surfaces & fills draws them from `domains/color-fills.ts`, writing through
// `state/fills-input.ts`. What the Interactive matrix still uses stays here: the Auto-first step select, and
// the per-mode override write, which is now the shared one (`setRoleOverride`) plus this page's repaint.
/** A palette step select with an "Auto" (the generated baseline) option — audit §8 candidate #3. `''` is
 *  Auto; other values are step keys. */
const stepPicker = (paletteName: string, steps: string[], autoStep: string, current: string | undefined, onPick: (step: string | undefined) => void, mark?: (step: string) => string): HTMLSelectElement => {
  const sel = selectEl('cap');
  // Auto carries the mark too. It is the engine's contract-satisfying pick, so leaving it bare in a
  // marked list would make the one guaranteed-good option look like the failing ones.
  sel.append(optionEl('', `Auto · ${paletteName} ${autoStep}${mark?.(autoStep) ?? ''}`, current == null));
  for (const s of steps) sel.append(optionEl(s, `${paletteName} ${s}${mark?.(s) ?? ''}`, current === s));
  sel.onchange = () => onPick(sel.value === '' ? undefined : sel.value);
  return sel;
};
/** Point `role` at `palette` `step` in the mode in view, or revert it (`undefined`): the shared write, so the
 *  Interactive matrix and Color › Surfaces & fills prune an emptied override map the same way. */
const setFillOverride = (role: string, palette: string, step: string | undefined): void => {
  setRoleOverride(currentMode, role, palette, step);
  applyFull();
};

/** #97 + #114 tidy — the Shadow group. Gathers every shadow control under one heading: the
 *  `shadow.softness` blur dial (a generic slider lever, passed in so it leaves the geometry panel)
 *  and the `shadow.tint = {hue, amount}` object editor (hue-shifts the base off pure black; amount 0 =
 *  pure black, higher = a richer brand-hued near-black). Reads the resolved default (`theme.shadow.tint`)
 *  when the brand hasn't set one; the elevation specimen recolors live. */
const renderShadowEditor = (softness?: Lever): HTMLElement => {
  // D (shadow) — outside the base mode, softness + tint go per-mode (modeLevers[mode].shadow); the
  // slider shows the EFFECTIVE value (override ?? global) and moving it creates an override, with a
  // "↺ Auto" reset that clears it (blank-slider has no natural Auto state, so the reset is explicit).
  const perMode = currentMode !== 'light';
  const modeLabel = MODE_LABEL[currentMode] ?? currentMode;
  const wrap = palSection('Shadow', perMode
    ? `Blur softness + tint for ${modeLabel} — “Auto” follows the global shadow; a value overrides this mode (crisper/softer, warmer/cooler). The light↔dark reduction still applies on top.`
    : 'Blur softness (crisp/product → soft/marketing) and a hue-shift of the shadow base off pure black. Tint amount 0 = pure black; higher = a richer, brand-hued near-black.');
  const gTint = theme.shadow.tint;         // resolved global tint (what a mode inherits under Auto)
  const gSoft = theme.shadow.softness;     // resolved global softness
  const panel = wrap;                       // knobs append straight into the .psec (no nested .panel)
  if (perMode) {
    // A per-mode slider: effective = override ?? global; moving it writes modeLevers[mode].shadow.<path>
    // via the shared setModeLever (prunes to byte-identical). Dragging back to EXACTLY the global value
    // clears the override (no redundant "== global" override lingers), and the ↺ Auto reset clears it too.
    const mkPer = (label: string, min: number, max: number, step: number, unit: string, path: string, global: number): void => {
      const ov = getModeLever(currentMode, path) as number | undefined;
      const eff = ov ?? global;
      const knob = el('div', 'knob');
      const head = el('div', 'sh-knob-head');
      head.append(el('label', 'knob-label', label));
      const auto = el('button', 'sh-auto') as HTMLButtonElement;
      const setAuto = (overriding: boolean): void => { auto.textContent = overriding ? '↺ Auto' : `Auto (${global}${unit})`; auto.className = overriding ? 'sh-auto on' : 'sh-auto'; auto.disabled = !overriding; };
      setAuto(ov !== undefined);
      auto.onclick = () => { setModeLever(currentMode, path, undefined); applyFull(); };
      head.append(auto);
      knob.append(head);
      const input = rangeInput({ min, max, step, value: eff });
      const val = el('span', 'knob-val', `${eff}${unit}${ov !== undefined ? '' : ' · auto'}`);
      input.oninput = () => {
        const nv = Number(input.value);
        const overriding = nv !== global;                    // landing back on the global prunes the override
        setModeLever(currentMode, path, overriding ? nv : undefined);
        val.textContent = `${input.value}${unit}${overriding ? '' : ' · auto'}`;
        // update the ↺ Auto reset in place (no full re-render, so dragging stays smooth).
        setAuto(overriding);
        apply();
        refreshTintReadout?.();   // #305 — stable-head control, so repaint it rather than re-render
      };
      const body = el('div', 'knob-body'); body.append(input, val);
      knob.append(body);
      panel.append(knob);
    };
    const sLever = softness;
    mkPer(sLever?.label ?? 'Shadow softness', (sLever?.min as number) ?? 0, (sLever?.max as number) ?? 2, (sLever?.step as number) ?? 0.1, '', 'shadow.softness', gSoft);
    mkPer('Tint hue', 0, 360, 1, '°', 'shadow.tint.hue', gTint.hue);
    mkPer('Tint amount', 0, 1, 0.05, '', 'shadow.tint.amount', gTint.amount);
  } else {
    const cur = brandState.shadow?.tint;
    if (softness) panel.append(renderControl(softness));             // the blur dial, pulled out of the geometry panel
    const mk = (key: 'hue' | 'amount', label: string, min: number, max: number, step: number, unit: string): void => {
      const knob = el('div', 'knob');
      knob.append(el('label', 'knob-label', label));
      const input = rangeInput({ min, max, step, value: cur?.[key] ?? gTint[key] });
      const val = el('span', 'knob-val', `${input.value}${unit}`);
      input.oninput = () => {
        setPath(brandState, `shadow.tint.${key}`, Number(input.value));
        val.textContent = `${input.value}${unit}`;
        apply();
        refreshTintReadout?.();   // #305 — stable-head control, so repaint it rather than re-render
      };
      const body = el('div', 'knob-body'); body.append(input, val);
      knob.append(body);
      panel.append(knob);
    };
    mk('hue', 'Tint hue', 0, 360, 1, '°');
    mk('amount', 'Tint amount', 0, 1, 0.05, '');
  }
  panel.append(tintReadout());
  return wrap;
};

/** #305 — the tint sliders' honest feedback.
 *
 *  The shadow ramp runs at 10–14% alpha, so even a fully saturated tint moves the COMPOSITED shadow
 *  only ~3 ΔE00 — visible, but nowhere near what the slider's travel implies. Without this read-out the
 *  control looked broken: the reported symptom was "I cannot see the tint sliders changing the
 *  examples", and the honest answer is that the base colour changes a lot while the shadow changes a
 *  little. So show the base colour at FULL opacity (where the hue is unmistakable) beside the shadow as
 *  actually painted, and say why they differ.
 *
 *  Refreshed IMPERATIVELY via `refreshTintReadout`, not by re-render. The shadow editor lives in the
 *  stable head (doc-26: controls are built once and survive `apply()`; only the volatile bands
 *  re-render), so a read-out that computed its colour at construction time would freeze at the value
 *  it was born with. That is exactly the inert-control bug this issue is about — the first cut of this
 *  fix shipped frozen and a browser check caught it, so the slider handlers call the refresh. */
let refreshTintReadout: (() => void) | null = null;

const tintReadout = (): HTMLElement => {
  const row = el('div', 'sh-tintout');

  // The colour goes on an INNER fill so the chip's checkerboard stays behind it — setting
  // `style.background` on the chip itself would clobber the background-image shorthand and the 12%
  // swatch would read as an opaque grey instead of a translucent near-black.
  const swatch = (caption: string): { cell: HTMLElement; fill: HTMLElement } => {
    const chip = el('div', 'sh-tintchip');
    const fill = el('div', 'sh-tintfill');
    chip.append(fill);
    const cell = el('div', 'sh-tintcell');
    cell.append(chip, el('div', 'sh-tintcap', caption));
    return { cell, fill };
  };
  const solid = swatch('Tint color · 100%');
  // The same colour at a mid-ramp alpha — what the eye actually gets on the ramp.
  const painted = swatch('In a shadow · 12%');
  row.append(solid.cell, painted.cell);

  const note = el('div', 'sh-tintnote');
  const hexLabel = el('b', undefined, '');
  const noteText = document.createTextNode('');
  note.append(hexLabel, noteText);

  const refresh = (): void => {
    // A mode with its own tint override re-derives its own base colour; otherwise it inherits the global.
    const base = theme.shadow.shadowByMode?.[currentMode]?.colorRgb ?? theme.shadow.colorRgb;
    const baseHex = hex(base);
    const amount = theme.shadow.shadowByMode?.[currentMode]?.tint.amount ?? theme.shadow.tint.amount;
    solid.fill.style.backgroundColor = baseHex;
    painted.fill.style.backgroundColor = `${baseHex}1f`;   // 12% — mid-ramp
    hexLabel.textContent = baseHex.toUpperCase() + ' ';
    noteText.nodeValue = amount === 0
      ? '— pure black. Raise Tint amount to shift the shadow base off black.'
      : 'is the shadow base. Shadows paint it at 10–14% opacity, so the hue reads far subtler on the ramp than on the swatch above — that is the shadow doing its job, not the slider failing.';
  };
  refresh();
  refreshTintReadout = refresh;

  const wrap = el('div', 'sh-tintblock');
  wrap.append(row, note);
  return wrap;
};

// `as const` keeps the literal union so these stay assignable to the engine's TypeGroup
// (the italic/link sets are keyed by it).
const TYPE_GROUP_ORDER = ['display', 'title', 'body', 'label', 'caption', 'eyebrow', 'code'] as const;
const TYPE_GROUP_BLURB: Record<string, string> = {
  display: 'Hero and marketing-scale statements.', title: 'Section and page headings.',
  body: 'Running copy and UI text.', label: 'Form labels, buttons, dense UI.',
  caption: 'Secondary and supporting text.', eyebrow: 'Small uppercase kickers above headings.',
  code: 'Inline code and tabular figures.',
};
// ONE string at every size and in every category, owner-directed. This used to shorten as the size
// climbed ("Type" at 80px+, "Typography" at 40px+) and swap to a code snippet for `code`, so no two
// rows were comparing the same letterforms — which is the whole reason to stack a ramp. `.tr-samp`
// already clips with an ellipsis, so the big rows show real letterforms cut off rather than a
// different, shorter word.
const RAMP_SAMPLE = 'The quick brown fox';

/** The full semantic ramp — every generated style at true size, grouped by category.
 *  Resolves through the active mode's family / weight / leading / tracking. */
/** The full ramp, EVERY MODE SIDE BY SIDE (owner decision, #268 follow-up).
 *
 *  It used to render one mode — whichever `currentMode` was — so a per-mode deviation was only
 *  visible if you already suspected it and went looking. That is the wrong default for a dimension
 *  the engine can vary five different ways (`families`, `weights`, `lineHeights`, `letterSpacings`,
 *  `typeSizes`), and it is what made per-mode SIZES (#328/#347) effectively invisible in the UI.
 *  Showing all modes at once makes the mode axis a property of the table rather than of the session.
 *
 *  Every row shows every mode — including modes where nothing differs. Confirming "identical
 *  everywhere" is usually the thing you actually want, and a table whose shape shifts as you edit is
 *  harder to read than a wider one that doesn't.
 *
 *  This is why the mode switcher is retired for the WHOLE typography page (see
 *  `pageHasModeVaryingControl`): the editors above already resolve per column via
 *  `setModeLever(m, ...)`, not `currentMode`, so there is no single "active" mode left for a switcher
 *  to control. Showing every mode side by side here completes that column-per-mode design for
 *  READING, matching what the editors already do for WRITING (#268). */
const renderTypeRamp = (): HTMLElement => {
  const ty = theme.typography;
  const modes = rp.modes;
  // Resolve the whole composite FOR ONE MODE. Each axis falls back to the brand-level value, which is
  // what makes an untouched mode render identically rather than blank.
  // #296 — the rungs are mode-invariant, so read them straight. What varies is WHICH rung a composite
  // uses; resolving the key first and the value second keeps the preview honest about the two tiers.
  const lhOf = (k: string): number => ty.lineHeights.find((l) => l.key === k)?.value ?? 1.5;
  const lsOf = (k: string): number => ty.letterSpacings.find((l) => l.key === k)?.em ?? 0;
  const inMode = (c: TypeComposite, m: string) => {
    const fams = ty.familiesByMode?.[m] ?? ty.families;
    const wrs = ty.weightRolesByMode?.[m] ?? ty.weightRoles;
    const lhKey = c.lineHeightByMode?.[m] ?? c.lineHeight;
    const lsKey = c.trackingByMode?.[m] ?? c.tracking;
    // #347 — a re-sized rung carries its OWN mobile endpoint, so read the pair together. Taking
    // sizeMinPx from the brand while sizePx came from the mode would print an incoherent fluid range.
    const sizePx = c.sizeByMode?.[m] ?? c.sizePx;
    const sizeMinPx = c.sizeMinByMode?.[m] ?? (c.sizeByMode?.[m] !== undefined ? sizePx : c.sizeMinPx);
    return {
      sizePx, sizeMinPx, lhKey, lsKey,
      stack: fams.find((f) => f.group === c.group)?.stack.join(', ') ?? 'inherit',
      weight: wrs.find((w) => w.role === c.weightRole)?.value ?? 400,
    };
  };

  const sec = palSection('The full type ramp', `Every style the system generates — ${ty.composites.length} in total, grouped by category — resolved in all ${modes.length} ${modes.length === 1 ? 'mode' : 'modes'} side by side. This is what ships as tokens.`);
  for (const g of TYPE_GROUP_ORDER) {
    // Largest first, so the page reads big → small the whole way down and matches the size editors on
    // Styles. A STABLE sort on size alone is what makes this safe: rows sharing a size (the weight
    // roles, and the italic / link variants) keep their existing relative order, so only the size
    // progression reverses. Sorting on anything else would reshuffle them.
    const comps = ty.composites.filter((c) => c.group === g).sort((a, b) => b.sizePx - a.sizePx);
    if (!comps.length) continue;
    const block = el('div', 'tr-block');
    const band = el('div', 'tr-band');
    band.append(el('span', 'tr-band-n', g), el('span', 'tr-band-c mono', `${comps.length} ${comps.length === 1 ? 'style' : 'styles'}`),
      el('span', 'tr-band-d', TYPE_GROUP_BLURB[g] ?? ''));
    block.append(band);
    for (const c of comps) {
      const row = el('div', 'tr-row');
      const meta = el('div', 'tr-meta');
      meta.append(tokenPill(`type.${c.path}`));
      meta.append(el('span', 'tr-attr mono', `${c.weightRole} · ${c.group}`));
      row.append(meta);
      // One column per mode. Scrolls horizontally rather than wrapping: a wrapped column would read as
      // a new row, which is precisely the confusion a side-by-side table exists to remove.
      const cols = el('div', 'tr-modes');
      cols.style.gridTemplateColumns = `repeat(${modes.length}, minmax(220px, 1fr))`;
      for (const m of modes) {
        const v = inMode(c, m);
        const col = el('div', 'tr-mode');
        col.append(el('span', 'tr-mode-n', m));
        const fluidTag = v.sizeMinPx !== v.sizePx ? ` · fluid ${v.sizeMinPx}→${v.sizePx}` : '';
        col.append(el('span', 'tr-attr mono', `${v.sizePx}px · ${v.weight} · ${v.lhKey} ${lhOf(v.lhKey)}× · ${v.lsKey} ${lsOf(v.lsKey)}em${fluidTag}`));
        const samp = el('div', 'tr-samp', RAMP_SAMPLE);
        samp.style.fontFamily = v.stack;
        samp.style.fontSize = `${v.sizePx}px`;
        samp.style.fontWeight = String(v.weight);
        samp.style.lineHeight = String(lhOf(v.lhKey));
        samp.style.letterSpacing = `${lsOf(v.lsKey)}em`;
        if (c.link) samp.style.textDecoration = 'underline';
        // The modifier, or an italic-default category's bare style (#1296) — the tree's `fontStyle` rule.
        if (c.italic || c.italicDefault) samp.style.fontStyle = 'italic';
        if (c.textCase === 'uppercase') samp.style.textTransform = 'uppercase';
        col.append(samp);
        cols.append(col);
      }
      row.append(cols);
      block.append(row);
    }
    sec.append(block);
  }
  return sec;
};

/** The radius preview: the whole corner-radius ramp, HOLISTICALLY — a swatch per step (the actual corner)
 *  labeled with its px and the component(s) that consume it (button→md, input→sm, card→lg, badge→round).
 *  Fills a caller-owned node so `apply()` repaints it beside the radius controls (#265). Reads each rung's
 *  px from `rp.dims` (live per lever), with two SENTINELS special-cased: `none` = 0, and `capsule` = a full
 *  pill labeled `full` rather than a literal px (#1177). `capsule` is a 999px "clamp me to a pill" marker,
 *  not a corner anyone reads as 999 — and it is not in `rp.dims` at all (no preview-spec component binds it
 *  until `controlShape: pill`), so printing its stored px would both misrepresent the behaviour and require
 *  a source the ramp does not carry. The CONTROL SHAPE panel below is the specimen that shows what `pill`
 *  actually does; this ramp only needs to name the rung and read as a pill. */
const RADIUS_STEPS = ['none', 'sm', 'md', 'lg', 'round', 'capsule'];
const paintRadiusPreview = (into: HTMLElement): void => {
  into.innerHTML = '';
  const consumers: Record<string, Set<string>> = {};
  for (const c of previewSpec.components) for (const v of c.variants) {
    const rref = v.bindings.radius;
    if (rref?.startsWith('radius.')) (consumers[rref.slice(7)] ??= new Set<string>()).add(c.id);
  }
  // D — reflect the current mode's per-mode radius ramp (modeLevers.radius) when it deviates, so the
  // change is visible here rather than off in the export (the #158 lesson). Falls back to the global.
  const byMode = theme.dims.radiusByMode?.[currentMode];
  const list = el('div', 'rad-list');
  for (const step of RADIUS_STEPS) {
    // `capsule` is the PILL SENTINEL, special-cased like `none`: it has no meaningful ramp px (its 999
    // means "clamp to a pill at any height"), and it is absent from `rp.dims`, so it is drawn as a pill
    // and labeled `full` rather than read as a number (#1177). Every other rung reads `rp.dims` as before.
    const isCapsule = step === 'capsule';
    const overridePx = byMode?.find((s) => s.name === step)?.px;
    const px = step === 'none' ? 0 : (overridePx ?? rp.dims[`radius.${step}`] ?? 0);
    const cell = el('div', 'rad-cell');
    const sw = el('div', 'rad-sw');
    sw.style.borderRadius = isCapsule ? '26px' : `${Math.min(px, 26)}px`;   // cap so `round`/`capsule` read as a pill without overflowing the swatch
    const cons = [...(consumers[step] ?? [])];
    const label = isCapsule ? `${step} · full` : `${step} · ${px}px`;
    cell.append(sw, el('div', 'rad-lab mono', label), tokenPill(`radius.${step}`), el('div', 'rad-cons', cons.length ? cons.join(', ') : '—'));
    list.append(cell);
  }
  into.append(list);
};

/** The controlShape specimen: four control silhouettes — BOXED (sharp), HAIRLINE (1px), ROUNDED (the
 *  current `radius.md`) and PILL (height ÷ 2) — with the brand's current choice marked. Each names a
 *  RELATIONSHIP to a rung, not a raw radius (#1371). Reuses the `.rad-*` scaffold and the `.rad-sw` swatch
 *  (widened inline into a control bar), so the shape difference reads without new CSS. The lever is global
 *  across pill-able controls (button + icon-button today); the button is the representative silhouette
 *  because it is the control a designer pictures when they say "pill". */
const paintControlShapePreview = (into: HTMLElement): void => {
  into.innerHTML = '';
  const cur = String(getPath(brandState, 'controlShape') ?? 'rounded');
  const roundedPx = rp.dims['radius.md'] ?? 0;
  // The bar is 52px tall so the TRUE radius.md renders un-clamped across the whole slider range —
  // radius.md maxes at 24px (baseMd 12 × radiusScale 2), and 24 < 52/2, so the drawn corner always equals
  // the caption's px. A shorter bar would clamp a soft-brand corner (a 24px radius on a 32px bar reads as a
  // near-pill) and the label would then contradict the shape (the nit on the first cut of this preview).
  // `pill` draws at 999 — the capsule sentinel — which clamps to half the bar and reads as a full pill;
  // the caption names the rung, not the number. `boxed` is a fixed 0px (radius.none, always present) and
  // `hairline` a fixed 1px (radius.hairline, the #1362 sentinel), so both are drawn from constants rather
  // than `rp.dims` — neither is bound by a preview-spec component, so `rp.dims` would fall through to 0
  // (the #1177 trap `lint-ramp-steps.ts` gates a STEPS list against; this shape list is not one).
  const shapes = [
    { key: 'boxed', label: 'Boxed', radiusPx: 0, ref: 'radius.none', note: 'radius.none · 0px, sharp' },
    { key: 'hairline', label: 'Hairline', radiusPx: 1, ref: 'radius.hairline', note: 'radius.hairline · 1px, fixed' },
    { key: 'rounded', label: 'Rounded', radiusPx: roundedPx, ref: 'radius.md', note: `radius.md · ${roundedPx}px` },
    { key: 'pill', label: 'Pill', radiusPx: 999, ref: 'radius.capsule', note: 'radius.capsule · height ÷ 2, any height' },
  ];
  const list = el('div', 'rad-list rad-shapes');
  for (const s of shapes) {
    const on = s.key === cur;
    // #1477 — the selected card is a class toggle (`.rad-shapes .rad-cell.on`), an INSET ring on a
    // panel ground per the #439 pattern, not the outset `outline` that collided with the preview.
    const cell = el('div', 'rad-cell' + (on ? ' on' : ''));
    const bar = el('div', 'rad-sw');
    bar.style.width = '112px';
    bar.style.height = '52px';
    bar.style.borderRadius = `${s.radiusPx}px`;
    cell.append(bar, el('div', 'rad-lab mono', `${s.label}${on ? ' · selected' : ''}`), tokenPill(s.ref), el('div', 'rad-cons', s.note));
    list.append(cell);
  }
  into.append(list);
};

/** The button-layout specimen (#1667): per size, a short-label button at its derived minimum width, and two
 *  WIDENED buttons — leading + trailing icons, and trailing only — so "Locked to edges" is visible: the icons
 *  sit at the edges and the label centers in the space between them, which puts a trailing-only label
 *  slightly left of the button's center. The same construction as the Figma build: floor = height ×
 *  multiplier rounded up to 8 (`buttonMinWidth`), padding split by side (#326), and under "Locked to edges"
 *  each icon absolutely positioned at the visual padding with its side padded by that padding + icon + gap,
 *  so the button still hugs a longer label. Under "One step
 *  smaller" the medium size takes small's label size and icon, and every label takes the weight "Button label
 *  weight" picks (#1752). Geometry and weight only, in the page ink — the
 *  colors are the Colors page's job. Mode-aware like `paintSizePreview`. */
const BUTTON_SIZES: { size: string; step: string; icon: string; label: string }[] = [
  { size: 'Small', step: 'sm', icon: 'xs', label: 'sm' },
  { size: 'Medium', step: 'md', icon: 'sm', label: 'md' },
  { size: 'Large', step: 'lg', icon: 'md', label: 'lg' },
];
const paintButtonLayoutPreview = (into: HTMLElement): void => {
  into.innerHTML = '';
  const edges = (getPath(brandState, 'buttonIcons') ?? 'attached') === 'edges';
  const smaller = (getPath(brandState, 'buttonContentSize') ?? 'match') === 'smaller';
  const mult = Number(getPath(brandState, 'buttonMinWidthMultiplier') ?? DEFAULT_MIN_WIDTH_MULTIPLIER);
  // #1752 — the label's weight is the brand's number for the role "Button label weight" picks, in the mode in view.
  const labelRole = (getPath(brandState, 'buttonLabelWeight') ?? 'emphasis') === 'default' ? 'default' : 'emphasis';
  // Both lists carry every weight role (the engine maps `WEIGHT_ROLE_ORDER`), so the role is always found.
  const labelWeight = (theme.typography.weightRolesByMode?.[currentMode] ?? theme.typography.weightRoles).find((w) => w.role === labelRole)!.value;
  const sizes = theme.dims.sizesByMode?.[currentMode] ?? theme.dims.sizes;
  const radius = rp.dims['radius.md'] ?? 4;
  // Button's spacing is its own spec's (the spacing model): its comfortable `space.*` steps, moved one step for
  // the brand's density, exactly as the Figma build materializes them. The brand's BASELINE density — a Figma
  // component binds one space variable per side, so a mode's own density moves its heights, not this.
  // Read from the data-only `button-spacing.ts`, never from `componentDefs`: an ungated reference to the defs
  // would pull every def's prose into the web bundle (`COMPONENT_CATALOGUE`).
  const spacePx = sizeRefPx(theme.dims.sizes);
  const list = el('div', 'btnl-list');
  for (const b of BUTTON_SIZES) {
    const h = sizes.find((x) => x.name === b.step);
    if (!h) continue;
    const at = (k: string): number => { const key = `size.${b.size.toLowerCase()}.${k}`; return spacePx(densitySpacingStep(key, (BUTTON_SPACING as Record<string, string>)[key], theme.dims.density)) ?? 0; };
    const z = { height: h.height, padX: at('padding-x'), padXVisual: at('padding-x-visual'), gap: at('gap') };
    const off = smaller && b.step === 'md';
    const iconPx = ICON_SIZES.find((i) => i.name === (off ? 'xs' : b.icon))?.px ?? 16;
    const labelPx = theme.typography.composites.find((c) => c.group === 'label' && c.variant === (off ? 'sm' : b.label))?.sizePx ?? 14;
    const floor = buttonMinWidth(z.height, mult);
    const wide = Math.max(floor, 240);
    const button = (text: string, lead: boolean, trail: boolean, width?: number): HTMLElement => {
      const btn = el('div', 'btnl-btn');
      btn.style.height = `${z.height}px`;
      btn.style.minWidth = `${floor}px`;
      btn.style.borderRadius = `${radius}px`;
      btn.style.gap = `${z.gap}px`;
      const reserve = z.padXVisual + iconPx + z.gap;
      btn.style.paddingLeft = `${lead ? (edges ? reserve : z.padXVisual) : z.padX}px`;
      btn.style.paddingRight = `${trail ? (edges ? reserve : z.padXVisual) : z.padX}px`;
      if (width !== undefined) btn.style.width = `${width}px`;
      const glyph = (side: 'left' | 'right'): HTMLElement => {
        const g = el('span', 'btnl-icon' + (edges ? ' btnl-pinned' : ''));
        g.style.width = g.style.height = `${iconPx}px`;
        if (edges) g.style[side] = `${z.padXVisual}px`;
        return g;
      };
      const label = el('span', 'btnl-label', text);
      label.style.fontSize = `${labelPx}px`;
      label.style.fontWeight = String(labelWeight);
      if (lead) btn.append(glyph('left'));
      btn.append(label);
      if (trail) btn.append(glyph('right'));
      return btn;
    };
    const row = el('div', 'btnl-row');
    row.append(
      el('div', 'btnl-lab mono', `${b.size} · ${z.height}px high · min ${floor}px${off ? ' · small label & icon' : ''}`),
      button('OK', false, false),
      button('Continue', true, true, wide),
      button('Continue', false, true, wide),
    );
    list.append(row);
  }
  into.append(list);
};

/** The elevation ramp specimen: one card per shadow step (xs→2xl) on a light surface, so
 *  the shadow ramp — and the shadow-softness lever that reshapes every step — is visible
 *  (the single card in the component preview only shows one step). Reads `rp.shadows`. */
const SHADOW_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const renderShadowSpecimen = (): HTMLElement => {
  const wrap = palSection('Elevation ramp', 'The shadow ramp xs→2xl — the softness + tint levers reshape every step, resolved for the mode in view (see the preview below for the mode-reduced dark shadow).');
  const m: Mode = currentMode;   // #171 — every specimen reflects the mode-context selection
  const list = el('div', 'sh-list');
  // `inset` rides along after the ramp. The engine emits 7 shadow tokens and this specimen showed 6 —
  // `shadow.inset` appeared NOWHERE on the page, so the one token you could not see was the one whose
  // shape you most need to (an inner shadow reads nothing like an elevation step). It is deliberately
  // not a ramp STEP — it is a different kind of shadow, not a rung — so it is labeled apart rather
  // than appended to xs…2xl as if it were the next size up.
  for (const step of [...SHADOW_STEPS, 'inset']) {
    const css = rp.shadows[`shadow.${step}`]?.[m];
    if (!css) continue;
    const cell = el('div', 'sh-cell');
    const card = el('div', 'sh-card');
    card.style.boxShadow = css;                                   // resolved value inline (specimen reads the model directly)
    cell.append(card, el('div', 'sh-lab mono', step), tokenPill(`shadow.${step}`));
    list.append(cell);
  }
  wrap.append(list);
  return wrap;
};

/** The control-size preview: the component-size tier (sm→xl) as mini control boxes at their resolved
 *  height, so the DENSITY lever has a visible payoff (the preview components bind the space scale
 *  directly, not `size.*`, so nothing else shows the size tier). Heights only: each component states its
 *  own padding (the spacing model), shown on the button specimen. Mode-aware (D): reflects
 *  the current mode's per-mode density (`theme.dims.sizesByMode`) when it deviates, else the global tier.
 *  Fills a caller-owned node so it repaints beside the density control (#265). */
const paintSizePreview = (into: HTMLElement): void => {
  into.innerHTML = '';
  const byMode = theme.dims.sizesByMode?.[currentMode];
  const sizes = byMode ?? theme.dims.sizes;
  const list = el('div', 'sz-list');
  for (const z of sizes) {
    const cell = el('div', 'sz-cell');
    const box = el('div', 'sz-box', z.name);
    box.style.height = `${z.height}px`;
    box.style.padding = '0 8px';
    cell.append(box, el('div', 'sz-lab mono', `${z.name} · ${z.height}px`), tokenPill(`size.${z.name}.height`));
    list.append(cell);
  }
  into.append(list);
};

/** The spacing preview (#265): the resolved space.* ramp as proportional bars — the spacing rhythm has no
 *  other visible payoff (preview components bind space refs but don't show the ladder). Read-only from
 *  `rp.dims` (no engine change). Derives its steps from the ACTUAL resolved keys (sorted by scale), not a
 *  hardcoded list — the resolved model only carries the steps the preview binds, so a fixed list would
 *  show phantom 0px rows. `space.100` (= 1×) is the rhythm anchor. */
const paintSpacingPreview = (into: HTMLElement): void => {
  into.innerHTML = '';
  // Read the SCALE off the theme, not `rp.dims`. `rp.dims` is consumption-driven — it holds only the
  // dimension refs the preview COMPONENTS happen to bind — so this specimen rendered whichever four
  // steps a component used (`space.100/150/200/300`) out of the eighteen the engine emits, under a
  // heading that says "the spacing rhythm". A scale specimen has to show the scale; which steps some
  // component consumes is a different question, and not this section's.
  const steps = theme.dims.space.map((s) => ({ ref: `space.${s.key}`, px: s.px }));
  const list = el('div', 'sp-list');
  for (const { ref: k, px } of steps) {
    const cell = el('div', 'sp-cell');
    // TRUE px, not a percentage of the pane. The old `Math.max(2, (px/maxPx)*100)%` floored at 2
    // PERCENT — about 10px — so `space.0` and `space.025` (0px and 2px) drew identically and nothing
    // in the ramp was to scale. The whole ladder tops out at 96px and this section is now full width,
    // so the honest rendering fits: 8px is 8px, and 0 is nothing.
    const bar = el('div', 'sp-bar'); bar.style.width = `${px}px`;
    if (px === 0) addClass(bar, 'zero');
    // `tokenPill`, not mono text. The path was already visible here — but Corner radius and
    // Density & size, on this same page, name theirs with the shared pill, so one of three specimens
    // was saying the same kind of thing in a different component (doc 26: reuse the kit).
    const lab = el('div', 'sp-lab');
    lab.append(tokenPill(k), el('span', 'sp-px mono', `${px}px`));
    cell.append(lab, bar);
    list.append(cell);
  }
  into.append(list);
};

/** The three primitive scales that had no home (review, 2026-08-04): `dimension.*` (36), the raw grid
 *  every geometry alias resolves onto; `border-width.*` (4) and `icon.size.*` (5), both named aliases
 *  onto it. All read-only — read off the theme, not `rp.dims`, for the reason the spacing specimen
 *  was fixed: `rp.dims` holds only what preview COMPONENTS bind, which is a different question. */
const paintPrimitivesPreview = (into: HTMLElement): void => {
  into.innerHTML = '';
  const scale = (label: string, rows: Array<{ ref: string; px: number }>, wrapCls: string): HTMLElement => {
    const box = el('div', 'pv-scale');
    box.append(el('div', 'pv-scale-t', label));
    const list = el('div', wrapCls);
    for (const { ref, px } of rows) {
      const cell = el('div', 'pv-cell');
      cell.append(tokenPill(ref), el('span', 'sp-px mono', `${px}px`));
      list.append(cell);
    }
    box.append(list);
    return box;
  };
  // border-width and icon.size are ALIASES onto the grid, so they are shown next to it rather than as
  // separate scales — the point is that they resolve onto the same ladder.
  const BW: Array<[string, number]> = [['none', 0], ['hairline', 1], ['thick', 2], ['heavy', 4]];
  // Two columns inside the now-full-width section: the 36-step grid is long and wants its own column,
  // while border-width (4) and icon size (5) are short alias lists that read better stacked beside it
  // than strung out underneath a list three times their length.
  //
  // The grid uses `pv-rows` — ONE column — for the same reason the alias lists do. It previously had a
  // wrapping variant of its own, which reflowed 36 steps into three ragged columns and destroyed the
  // one property the specimen exists to show: that this is a monotonic ladder. A reader checks a scale
  // by running an eye down it, and wrapping turns "is the next step bigger" into a column-order puzzle.
  // Long is correct here; the section is a reference, not a summary.
  const cols = el('div', 'pv-cols');
  const left = el('div', 'pv-col'); const right = el('div', 'pv-col');
  left.append(scale(`Dimension grid — ${theme.dims.grid.length} steps`, theme.dims.grid.map((px) => ({ ref: `dimension.${px}`, px })), 'pv-rows'));
  right.append(
    scale('Border width', BW.map(([k, px]) => ({ ref: `border-width.${k}`, px })), 'pv-rows'),
    scale('Icon size', theme.dims.icons.map((i) => ({ ref: `icon.size.${i.name}`, px: i.px })), 'pv-rows'),
  );
  cols.append(left, right);
  into.append(cols);
};

/** The layout specimen: the responsive-grid axis — breakpoints (min-widths) with their column/gutter/
 *  margin grid, a base-column preview strip, and the container caps as proportional bars. The layout
 *  levers (breakpoints / columns / containers, all in the Advanced panel) have no other visible payoff.
 *  Reads `theme.layout` (not per-mode — layout composes with colour modes as a separate Figma axis). */
// Layout previews, split so each can sit beside its own control (docs #264): the breakpoints ruler+table,
// the base-column strip, the container-cap bars, and the fluid-type scaling list (#361). Each fills a
// caller-owned node so `apply()` repaints it in place (the control next to it stays put — never rebuilt
// mid-drag).
const paintBreakpointsPreview = (into: HTMLElement): void => {
  const ly = theme.layout;
  into.innerHTML = '';
  // A proportional min-width ruler — the breakpoints on a shared axis, so the steps read spatially.
  const ruler = el('div', 'ly-ruler');
  const rulerMax = Math.max(...ly.breakpoints.map((b) => b.px), 1) * 1.06;
  for (const b of ly.breakpoints) {
    const tick = el('div', 'ly-tick'); tick.style.left = `${(b.px / rulerMax) * 100}%`;
    tick.append(el('span', 'ly-tick-name', b.name), el('span', 'ly-tick-px mono', `${b.px}px`));
    ruler.append(tick);
  }
  into.append(ruler);
  const table = el('table', 'ly-table');
  const head = el('tr');
  head.append(el('th', undefined, 'Breakpoint'), el('th', undefined, 'Token'), el('th', undefined, 'Min-width'), el('th', undefined, 'Columns'), el('th', undefined, 'Gutter'), el('th', undefined, 'Margin'));
  table.append(head);
  for (const g of ly.grid) {
    const bp = ly.breakpoints.find((b) => b.name === g.bp);
    const tr = el('tr');
    const pillCell = el('td'); pillCell.append(tokenPill(`breakpoint.${g.bp}`));
    tr.append(el('td', 'mono', g.bp), pillCell, el('td', 'mono', `${bp?.px ?? 0}px`), el('td', 'mono', String(g.columns)), el('td', 'mono', `${g.gutterPx}px`), el('td', 'mono', `${g.marginPx}px`));
    table.append(tr);
  }
  // Six columns of tabular data have a real min-content width, and the split layout's preview pane is
  // only ~392px at 1100px wide — where the table used to push the whole DOCUMENT into a horizontal
  // scroll. Scrolling it inside its own pane is the same treatment Preview's token tables use
  // (`pv-tscroll`), and it is what doc 26 asks of wide content: the table scrolls, the page never does.
  const scroll = el('div', 'ly-tscroll'); scroll.append(table);
  into.append(scroll);
};
const paintColumnsPreview = (into: HTMLElement): void => {
  const ly = theme.layout;
  into.innerHTML = '';
  into.append(el('div', 'ly-cap', `${ly.baseColumns}-column base grid`));
  const cols = el('div', 'ly-cols');
  for (let i = 0; i < ly.baseColumns; i++) cols.append(el('div', 'ly-col'));
  into.append(cols);
};
// The control-column copy for the editable per-breakpoint grid — says what an override does and that
// unsetting it (choosing “Auto”) returns the breakpoint to the ladder.
const perBreakpointColsNote = (): HTMLElement => el('p', 'ic-modenote',
  'Each breakpoint’s columns default to the base ladder (smallest 4, next 8, up to the base); gutter and '
  + 'margin default to their own ladders. Override one to pin its value for that breakpoint only; choose Auto '
  + 'to return it to the ladder. Columns are held to 4–24. Gutter and margin snap to the spacing scale — the '
  + 'menu runs down to 4px — so each stays a real spacing step and keeps aliasing the space tokens.');
// The resolved per-breakpoint grid, read STRAIGHT from `theme.layout.grid` — the same derivation the Figma
// grid-style emitter consumes (#1480), so this readout is the source of truth and cannot disagree with what
// a brand ships. Columns carry an editable override select (Auto = the ladder value); gutter/margin are
// read-only. Lives in the volatile region, so committing an override repaints it with the re-resolved grid.
const paintPerBreakpointGrid = (into: HTMLElement): void => {
  const ly = theme.layout;
  const overrides = (brandState.layout?.columnOverrides ?? {}) as Record<string, number>;
  // The spacing steps a gutter/margin override may snap to (#1593) — the brand's OWN resolved scale, so
  // the offered px are exactly the ones that alias `space/*`. Reaches down to space/050 = 4px (and 025/0),
  // which is how a 4px mobile gutter becomes reachable instead of flooring at the derived 16px.
  const spaceSteps = theme.dims.space.map((s) => s.px);
  into.innerHTML = '';
  const table = el('table', 'ly-table');
  const head = el('tr');
  head.append(el('th', undefined, 'Breakpoint'), el('th', undefined, 'Columns'), el('th', undefined, 'Gutter'), el('th', undefined, 'Margin'), el('th', undefined, 'Override'));
  table.append(head);
  // A per-breakpoint gutter/margin editor — a resolved readout (`data-bpgut`/`data-bpmar`, straight off the
  // engine's grid like the columns readout) above a select of spacing steps (Auto = the derived ladder).
  // Mirrors the columns override write: a set value persists the px, Auto drops the entry, and an empty map
  // is removed rather than left as `{}`. Gutter/margin snap to the ladder (the value MUST be a space step so
  // it can alias `space/*`), which is why the options ARE the spacing scale rather than a free number input.
  const gapEditor = (bp: string, field: 'gutterOverrides' | 'marginOverrides', resolvedPx: number, roAttr: 'bpgut' | 'bpmar', selAttr: 'bpgutsel' | 'bpmarsel'): HTMLElement => {
    const cur = ((brandState.layout?.[field] ?? {}) as Record<string, number>)[bp];
    const ro = el('div', 'mono', `${resolvedPx}px`); ro.dataset[roAttr] = bp;
    const sel = selectEl('cap'); sel.dataset[selAttr] = bp;
    sel.append(optionEl('auto', 'Auto', cur === undefined));
    for (const px of spaceSteps) sel.append(optionEl(String(px), `${px}px`, cur === px));
    sel.onchange = () => {
      const next = { ...((brandState.layout?.[field] ?? {}) as Record<string, number>) };
      if (sel.value === 'auto') delete next[bp]; else next[bp] = Number(sel.value);
      if (Object.keys(next).length) setPath(brandState, `layout.${field}`, next);
      else if (brandState.layout) delete (brandState.layout as Record<string, unknown>)[field];
      apply();
    };
    const cell = el('td'); cell.append(ro, sel);
    return cell;
  };
  for (const g of ly.grid) {
    const tr = el('tr');
    // The RESOLVED column count — the readout, straight off the engine's grid. `data-bpcol` names the row
    // so the smoke suite can read it back per breakpoint.
    const colCell = el('td', 'mono', String(g.columns));
    colCell.dataset.bpcol = g.bp;
    // The override editor — Auto (the ladder) plus the curated column counts. `data-bpsel` names the control.
    const sel = selectEl('cap');
    sel.dataset.bpsel = g.bp;
    const cur = overrides[g.bp];
    sel.append(optionEl('auto', 'Auto', cur === undefined));
    for (const c of LAYOUT_COLUMN_CHOICES) sel.append(optionEl(String(c), String(c), cur === c));
    sel.onchange = () => {
      const next = { ...((brandState.layout?.columnOverrides ?? {}) as Record<string, number>) };
      if (sel.value === 'auto') delete next[g.bp]; else next[g.bp] = Number(sel.value);
      // Keep brandState clean: an empty override map is dropped rather than persisted as `{}`.
      if (Object.keys(next).length) setPath(brandState, 'layout.columnOverrides', next);
      else if (brandState.layout) delete (brandState.layout as { columnOverrides?: Record<string, number> }).columnOverrides;
      apply();
    };
    const editCell = el('td'); editCell.append(sel);
    tr.append(el('td', 'mono', g.bp), colCell,
      gapEditor(g.bp, 'gutterOverrides', g.gutterPx, 'bpgut', 'bpgutsel'),
      gapEditor(g.bp, 'marginOverrides', g.marginPx, 'bpmar', 'bpmarsel'),
      editCell);
    table.append(tr);
  }
  const scroll = el('div', 'ly-tscroll'); scroll.append(table);
  into.append(scroll);
};
const paintContainersPreview = (into: HTMLElement): void => {
  const ly = theme.layout;
  into.innerHTML = '';
  const cont = el('div', 'ly-cont');
  // Scale against the widest VIEWPORT the system targets, not against containerMax. Normalising by
  // containerMax made that bar 100% by construction, so the Container max slider could never move its
  // own preview — the one thing the specimen is beside it to show. The top breakpoint is the honest
  // reference (it is what "fluid" fills), and it is real data on this same page; the `max` guard keeps
  // the bars inside the track if a brand caps content wider than its largest breakpoint.
  const viewport = Math.max(...ly.breakpoints.map((b) => b.px), ly.containerMax, 1);
  // The bar goes inside its own TRACK. Its width is a percentage, and a percentage resolves against
  // the containing block — which was the whole row, including the 150px label the bar does not get to
  // use. Only the 100% bar was wide enough to overflow, so only it was flex-shrunk (to the 330px that
  // was actually free); every narrower bar rendered at its true fraction of the full 492px row. The
  // arithmetic was right and the reference was wrong, which inflated every ratio the specimen exists
  // to show by 492/330 ≈ 1.5 — a 720-on-1440 reading column drew at 75%, not 50%.
  const bar = (path: string, px: number, label: string): HTMLElement => {
    const row = el('div', 'ly-cont-row');
    const track = el('div', 'ly-cont-track');
    const b = el('div', 'ly-cont-bar');
    b.style.width = `${Math.max(6, Math.min(100, (px / viewport) * 100))}%`;
    track.append(b);
    const lab = el('div', 'ly-cont-lab'); lab.append(tokenPill(path), el('span', 'ly-cont-val mono', label));
    row.append(lab, track);
    return row;
  };
  // `container.fluid` is the DEFAULT container and was the one member of the family with no row. Shown
  // at the full track, which is what it means: no cap — so the two capped bars read as caps against it.
  cont.append(bar('container.fluid', viewport, '100%'),
    bar('container.max', ly.containerMax, `${ly.containerMax}px`),
    bar('container.narrow', ly.containerNarrow, `${ly.containerNarrow}px`));
  into.append(el('div', 'ly-cap', `Relative widths at a ${viewport}px viewport — the widest breakpoint.`));
  into.append(cont);
};

/** What fluid actually DOES — previously invisible: neither the mobile floor nor the generated clamp()
 *  was shown anywhere, so the toggle and the viewport pair changed nothing a designer could see. */
const paintFluidPreview = (into: HTMLElement): void => {
  const ty = theme.typography;
  into.innerHTML = '';
  const seen = new Set<string>();
  const uniq = ty.composites.filter((c) => c.sizeMinPx !== c.sizePx)
    .filter((c) => { const k = `${c.group}.${c.variant}`; if (seen.has(k)) return false; seen.add(k); return true; });
  // Fluid off (or nothing scaling) is a real state, not an empty one — say why the panel is bare.
  if (!uniq.length) { into.append(el('p', 'sl-note', 'Nothing is scaling right now — every style resolves to a single size across the whole viewport range. Turn on fluid heading sizing to see the mobile floor and the generated clamp() for each style that scales.')); return; }
  into.append(subHead(`What fluid does — ${uniq.length} scaling styles`));
  const maxPx = Math.max(...uniq.map((c) => c.sizePx));
  const list = el('div', 'fz-list');
  for (const c of uniq) {
    const row = el('div', 'fz-row');
    row.append(el('span', 'fz-name mono', `${c.group}.${c.variant}`), el('span', 'fz-pair mono', `${c.sizeMinPx} → ${c.sizePx}px`));
    const right = el('div', 'fz-right');
    const bar = el('div', 'fz-bar');
    const fill = el('div', 'fz-fill');
    fill.style.left = `${(c.sizeMinPx / maxPx) * 100}%`;
    fill.style.width = `${((c.sizePx - c.sizeMinPx) / maxPx) * 100}%`;
    bar.append(fill);
    const slope = (c.sizePx - c.sizeMinPx) / (ty.maxViewport - ty.minViewport);
    const intercept = (c.sizeMinPx - slope * ty.minViewport) / 16;
    const clamp = `clamp(${+(c.sizeMinPx / 16).toFixed(4)}rem, ${+intercept.toFixed(4)}rem + ${+(slope * 100).toFixed(4)}vw, ${+(c.sizePx / 16).toFixed(4)}rem)`;
    const cl = el('div', 'fz-clamp mono', clamp); cl.title = clamp;
    right.append(bar, cl);
    row.append(right);
    list.append(row);
  }
  into.append(list);
  into.append(el('p', 'sl-note', 'The mobile floor is derived, not chosen: you set whether headings scale and the viewport range, but the floor comes from a fixed curve — titles drop about one rung, display converges hard so hero type stays usable on a phone.'));
  // The convergence is deliberate but invisible: several desktop sizes can share one floor.
  const byFloor = new Map<number, string[]>();
  for (const c of uniq) { const k = c.sizeMinPx; byFloor.set(k, [...(byFloor.get(k) ?? []), `${c.group}.${c.variant}`]); }
  const merged = [...byFloor.entries()].filter(([, v]) => v.length > 1);
  if (merged.length) {
    const w = el('p', 'fz-warn');
    w.append(el('b', undefined, 'Sizes that merge on mobile. '));
    w.append(document.createTextNode(`${merged.map(([px, v]) => `${v.join(' + ')} all land on ${px}px`).join('; ')} — distinct on desktop, identical on a phone. Fine if deliberate; a sign of more display steps than the mobile curve can express if not.`));
    into.append(w);
  }
};

/** The motion specimen (#114, redesigned #292 "trace the curve"): one large stage per semantic
 *  transition (default/enter/exit/emphasized) — the ghost line is the easing curve's shape, the dot
 *  traces it over the resolved duration. Motion can't show in the static component preview, so the
 *  tempo lever had no payoff; here it does — the traces re-run on every re-render (i.e. the moment
 *  you change the tempo), plus a Replay. A Playback control uniformly divides all four durations for
 *  legibility only: it never changes the `${ms}ms` label (always the real resolved token value) or the
 *  curve shape, and it preserves the ratio between transitions (exit stays 2× faster than default,
 *  etc.) at any speed. `prefers-reduced-motion` is honored (dot shown at its resting position, no
 *  animation), nodding to the engine's derived reduced ramp. Kind-B specimen: reads `theme.motion`. */
/** The easing curve for one stage, plotted 0→1 in a 100-unit viewBox (SVG). Y is flipped (SVG y grows
 *  down). Percent-based, not px, so the stage scales for free. */
const motionStageSvg = (bez: number[]): SVGElement => {
  const W = 100, H = 100, P = 11.364;
  const x = (t: number): number => P + t * (W - 2 * P);
  const y = (v: number): number => H - P - v * (H - 2 * P);
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'mo-stage-svg');
  const axis = document.createElementNS(SVGNS, 'path');
  axis.setAttribute('d', `M${x(0)},${y(1)} L${x(0)},${y(0)} L${x(1)},${y(0)}`);
  axis.setAttribute('class', 'mo-stage-axis'); axis.setAttribute('fill', 'none');
  const [x1, y1, x2, y2] = bez.length === 4 ? bez : [0.4, 0, 0.2, 1];
  const line = document.createElementNS(SVGNS, 'path');
  line.setAttribute('d', `M${x(0)},${y(0)} C${x(x1)},${y(y1)} ${x(x2)},${y(y2)} ${x(1)},${y(1)}`);
  line.setAttribute('class', 'mo-stage-line'); line.setAttribute('fill', 'none');
  svg.append(axis, line);
  return svg;
};
const MOTION_SLOWMO_OPTIONS = [1, 2, 4, 8];
let motionSlowmo = 4;   // uniform playback divisor for the trace (#292) — never touches the ms label, the curve, or the ratio between transitions
const renderMotionSpecimen = (): HTMLElement => {
  const mo = theme.motion;
  // D — reflect the current mode's per-mode tempo (modeLevers.tempo) when it deviates, so the ramp
  // re-runs at the mode's speed here rather than only in the export (the #158 lesson). Duration is the
  // mode-varying part; easing/transitions are tempo-invariant. Falls back to the global ramp.
  const moByMode = mo.motionByMode?.[currentMode];
  const durOf = (role: string): number => (moByMode?.duration ?? mo.duration)[role] ?? 0;
  const tempoLabel = moByMode?.tempo ?? mo.tempo;
  const wrap = palSection('Motion', `The semantic transitions at tempo '${tempoLabel}' — each stage traces the resolved duration + easing curve. Playback below is a legibility aid only (the ms label is always the real token value); reduce-motion is honored (the engine also derives a reduced ramp).`);

  const toolbar = el('div', 'mo-toolbar');
  const slowmoLabel = el('label', 'mo-slowmo');
  slowmoLabel.append(document.createTextNode('Playback '));
  // View-only: this writes `motionSlowmo`, a module-local view variable, and repaints. It edits no
  // token in any mode, so it must not make the specimen read "Editing · All modes" (#574).
  const select = viewOnly(el('select', 'mo-slowmo-sel')) as HTMLSelectElement;
  for (const v of MOTION_SLOWMO_OPTIONS) {
    const opt = el('option', undefined, v === 1 ? 'real speed' : `1/${v}×`) as HTMLOptionElement;
    opt.value = String(v);
    if (v === motionSlowmo) opt.selected = true;
    select.append(opt);
  }
  select.onchange = () => { motionSlowmo = Number(select.value) || 1; paintVolatile(); };
  slowmoLabel.append(select);
  toolbar.append(slowmoLabel);
  wrap.append(toolbar);

  const grid = el('div', 'mo-grid');
  const dots: { el: HTMLElement; anim: string }[] = [];
  for (const t of mo.transitions) {
    const ms = durOf(t.duration);
    const playMs = ms * motionSlowmo;
    const curveBez = mo.easing[t.easing] ?? mo.easing.standard;
    const bez = `cubic-bezier(${curveBez.join(', ')})`;
    const anim = `mo-trace-x ${playMs}ms linear both, mo-trace-y ${playMs}ms ${bez} both`;

    const col = el('div', 'mo-col');
    const stage = el('div', 'mo-stage');
    stage.append(motionStageSvg(curveBez));
    const dot = el('div', 'mo-dot');
    dot.style.animation = anim;
    stage.append(dot);
    dots.push({ el: dot, anim });
    col.append(stage);

    const meta = el('div', 'mo-colmeta');
    meta.append(el('div', 'mo-colname', t.name));
    const metaRow = el('div', 'spec-metarow');
    // The card IS `motion.transition.<name>` and showed only its two PARTS — the composite that binds
    // them was the one token on the card without a pill. Named first, then what it resolves to.
    metaRow.append(tokenPillWrapping(`motion.transition.${t.name}`), el('span', 'mo-meta mono', `${ms}ms · ${t.easing}`), tokenPill(`motion.duration.${t.duration}`), tokenPill(`motion.easing.${t.easing}`));
    meta.append(metaRow);
    if (motionSlowmo > 1) meta.append(el('div', 'mo-playnote mono', `playing at ${playMs}ms (1/${motionSlowmo}×)`));
    meta.append(el('div', 'mo-coldesc', t.desc));
    col.append(meta);
    grid.append(col);
  }
  wrap.append(grid);

  const replay = el('button', 'mo-replay', 'Replay') as HTMLButtonElement;
  // Re-trigger by clearing the animation, forcing a reflow between so the browser restarts the keyframes.
  replay.onclick = () => { for (const d of dots) { d.el.style.animation = 'none'; void d.el.offsetWidth; d.el.style.animation = d.anim; } };
  wrap.append(replay);
  return wrap;
};

// The inverse-surface + icon specimens were retired here (#69): the inverse column is now a first-class
// row in every interactive matrix section (Fill · inverse / Text · inverse / On-fill · inverse), and the
// icon-contrast payoff is the "Icon colors" global section's match-vs-distinct example — no separate
// preview needed.


// The gradient editor went with the legacy Surfaces page (UI redesign S4a): Color › Surfaces & fills edits the
// gradients (`domains/color-fills.ts`), through the same writes (`state/fills-input.ts`).


/** Inline-SVG icon glyphs (stroke, `currentColor` via the `stroke` attr) — dependency-free line icons,
 *  authored here so the specimen stays buildless. 24×24 viewBox, rounded caps/joins. */
const SVGNS = 'http://www.w3.org/2000/svg';
const ICON_PATH: Record<string, string> = {
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  arrow: '<path d="M5 12h13M12 6l6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="20.5" y1="20.5" x2="16" y2="16"/>',
  dot: '<circle cx="12" cy="12" r="8"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.9 6.6 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5-5.5"/>',
  triangle: '<path d="M12 4l9 16H3z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/>',
  x: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8.01"/>',
};
const iconEl = (name: string, stroke: string): SVGElement => {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '22'); svg.setAttribute('height', '22');
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', stroke); svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = ICON_PATH[name] ?? ICON_PATH.dot;
  return svg;
};

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
/** The new frame (S1.2), while the app view is mounted; null on the start view. */
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
 *     obligation to declare, and their placement rules are coupled to `mode-audit.mjs --check-badges`.
 *     Declaring them would move working code for symmetry, and into #771's lane.
 *
 *   • The SEED / RESTORE / APPLY pills (#480, #722) render INSIDE `renderBar()`, which IS the
 *     `brand-bar` surface — so they are already mounted once, structurally, by something on this list.
 *     They are bar CONTENT, and promoting content to a surface would put a plugin-only pill into the
 *     floor every web view has to carry.
 *
 *   • The START SCREEN's import validation stays a field message on its own control — see the note at
 *     `renderStartScreen` for the distinction between a rejected input and adopted state.
 */
type RootView = 'start' | 'app';
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
    key: 'error', home: 'root', views: ['start', 'app'],
    // THE SURFACE THIS MECHANISM IS NAMED AFTER (#388). It is the one entry scoped to every view, and
    // the start screen is in that list even though `lastError` is unreachable there today — nothing
    // calls `rebuild()` before an origin exists. Mounted anyway, because the EXEMPTION is what would
    // rot: the next pre-brand view that does touch the engine would inherit "no error surface" from a
    // list it never read, which is this ticket's defect with a different page in it. A hidden node
    // costs a div; the precedent costs the ticket. (Its own import validation stays where it is — see
    // the survey note in `renderStartScreen`.)
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
  if (view === 'app') {
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
        lend: { styleGuide: renderPreviewStyleGuide },
      });
    }
    chromeHost = frame.head;
    frame.bar.replaceChildren();
    frame.notices.replaceChildren();
    mountSurfaces('bar', view, frame.bar);
    mountSurfaces('root', view, frame.notices);
    frame.legacyPage.replaceChildren(body());
  } else {
    frame?.unmount();
    frame = null;
    app.innerHTML = '';
    // The start screen is legacy until S12, so it is pinned light like the legacy frame (D2).
    app.dataset.theme = 'light';
    // Two-tier global header (docs/23 §7): tier 1 = brand identity + Export (the "brand bar"); tier 2 =
    // the persistent mode selector. The mode bar is NOT tier 2 any more (#432) — it is minted into the
    // workspace instead — so the chrome carries brand identity and app-level status.
    const chrome = el('header', 'chrome');
    chromeHost = chrome;
    mountSurfaces('root', view, chrome);
    app.append(chrome, body());
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
 *  Three pages fail it today, unconditionally:
 *   • `layout` — nothing layout-related exists in `ModeLevers` or carries a `*ByMode` field. It is
 *     mode-invariant outright, not merely primitive.
 *   • `palettes` — a ramp is mode-invariant, and choosing which STEP a mode lands on is a Surfaces
 *     concern, not a Palettes one (see the in-function measurement below).
 *   • `typography` — since #416 the whole page edits every mode-varying value it has (families,
 *     weight roles, leading/tracking re-points, per-size pins) as a COLUMN PER MODE, so there is
 *     nothing left for a switcher to drive. The editors write via column-scoped `setModeLever(m, ...)`,
 *     not `currentMode` — there is no single "active" mode left for the bar to control.
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
  if (page === 'layout') return false;
  // #718 — the component build takes no mode input. `build-components` carries no payload (the def is
  // compiled into the plugin) and the write binds variables BY NAME, so every mode resolves from the
  // variables already in the file rather than from anything this page could scope. Nothing on the page
  // reads `currentMode`, so a switcher here would change no rendered value — the Palettes case exactly,
  // reached without needing to measure it, because there is no per-mode value to measure.
  if (page === 'components') return false;
  // A moved page (Color › Palettes from UI redesign S2) draws no legacy workspace, so it has no strip:
  // its preview header carries the mode control.
  if (isNewPage(page)) return false;
  // Preview is read-only and shows every mode side by side, so there is nothing for a switcher to
  //  do — the same reasoning that hides it on Primitives, reached from the other direction.
  // #416 — Typography edits every mode-varying value it has (families, weight roles, leading and
  // tracking re-points, per-size pins) as a COLUMN PER MODE, so there is nothing left for a switcher
  // to drive. Same conclusion as Primitives and Preview, reached from the other end: those have no
  // per-mode values, this one shows them all at once.
  if (page === 'typography') return false;
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
  interactive: renderInteractivePage,
  typography: renderTypographyPage,
  elevation: renderElevationPage,
  sizeRadius: renderSizeRadiusPage,
  layout: renderLayoutPage,
  motion: renderMotionPage,
  styleGuide: renderStyleGuidePage,
  components: renderComponentsPage,
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
// `fonts`: the Typography page's typeface library and type-ahead read `host.hostFonts`. A plain re-render,
// the same path a tab click takes: the list can arrive before or after that page first renders, so
// caching plus a re-render makes the order irrelevant.
subscribe('fonts', () => renderWorkspace());
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
  try { loadInput(input, origin); } finally { loading = false; }
  brandMenuOpen = false; importOpen = false; importErr = null; importText = ''; pendingLoad = null;
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
/** Export the last-good brand as design.md — round-trips straight back into Import. */
const exportDesignMd = (): void => download(`${slug()}.design.md`, toDesignMd(lastGoodInput), 'text/markdown');

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

// design.md import (#160) — one validation path shared by the start-screen upload card and the
// post-setup import, so both reject the same off-spec input with the same friendly errors.
const MD_FILE_RE = /\.(md|markdown|txt)$/i;
const IMPORT_ACCEPT = '.md,.markdown,.txt,text/markdown,text/plain';

/** Engine acceptance IS the validation: parse the design.md, then confirm the engine builds it.
 *  Returns the BrandInput or a friendly error — the working brand is never touched here. (The full
 *  schema validator is node-bound, so it can't run here; brandTheme's guards cover the rest.)
 *
 *  Mirrors cli.ts's dialect auto-detection (#556): a design.md may be ENGINE-NATIVE (frontmatter
 *  compiles 1:1 to BrandInput, read by `parseDesignMd`) or STANDARD (brand-skills / google-labs —
 *  a flat `colors:` hex map, read by `parseStandardDesignMd` + `standardToBrandInput`). Before this
 *  fix the web import path only ever tried the native parser, so a standard-dialect file like
 *  `examples/wendys.design.md` parsed into an empty/malformed BrandInput and crashed inside
 *  `brandTheme` with an engine-internals error ("Cannot read properties of undefined (reading 'l')")
 *  instead of importing. Detection is the same rule cli.ts uses: a top-level flat `colors:` map is
 *  the standard dialect (engine-native briefs never have one). */
const validateDesignMd = (text: string): { input: BrandInput } | { error: string } => {
  if (!text.trim()) return { error: 'Nothing to import — the file is empty.' };

  // ---- detect dialect: a top-level flat `colors:` map is the standard dialect ----
  let std;
  try { std = parseStandardDesignMd(text); }
  catch (e) { return { error: `That doesn't read as a design.md: ${(e as Error).message}` }; }
  const isStandard = isStandardDesignMd(std);

  let input: BrandInput;
  if (isStandard) {
    try { input = standardToBrandInput(std).input; }
    catch (e) { return { error: `Parsed as a standard-dialect design.md, but couldn't classify '${std.name}': ${(e as Error).message}` }; }
  } else {
    try { input = parseDesignMd(text).input; }
    catch (e) { return { error: `That doesn't read as a design.md: ${(e as Error).message}` }; }
  }

  try { brandTheme(input); }
  catch (e) { return { error: `Parsed, but the engine rejected it: ${(e as Error).message}` }; }
  return { input };
};

/** Read an uploaded File as design.md text, rejecting non-markdown/text file types up front (#160). */
const readDesignMdFile = (file: File): Promise<{ text: string } | { error: string }> => {
  const okType = MD_FILE_RE.test(file.name) || /^text\//.test(file.type || '');
  if (!okType) return Promise.resolve({ error: `That's not a design.md — upload a .md file (got "${file.name}").` });
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve({ text: String(r.result ?? '') });
    r.onerror = () => resolve({ error: `Couldn't read "${file.name}".` });
    r.readAsText(file);
  });
};

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
const stageImport = (text: string): void => {
  importText = text;              // M-17: keep the paste so an error re-render doesn't wipe it
  const res = validateDesignMd(text);
  if ('error' in res) { importErr = res.error; pendingLoad = null; renderBar(); return; }
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
  // BOTH HOSTS return to the start moment (#1197). This branch used to fork: web cleared the origin,
  // the plugin loaded `NEW_BRAND()` in place, and the comment here said the plugin "must not surface
  // the web start screen" because that port was a deferred cross-lane follow-up (#506/#533). #1197 is
  // that follow-up, and the decision is that the two hosts offer the same four paths — a designer in
  // Figma starting a new brand can pick an example or upload a design.md, which the direct load could
  // not do.
  //
  // The fork does not survive as a smaller fork, either: the plugin's own confirm-before-replace
  // (#1034's fold-in) is not needed here any more, because clearing the origin REPLACES NOTHING. The
  // working brand stays exactly where it is and the start screen renders in front of it; the replace
  // happens later, when a path is chosen, and each of those paths goes through `loadBrand` with its
  // own origin. That is why the guard and the `alreadyNew` marker below can both go: neither has a
  // subject once the click stops overwriting the brand.
  nb.onclick = () => {
    brandMenuOpen = false;
    // #722: returning to the start moment is an ORIGIN CHANGE — clear the origin and the start screen
    // follows, because `firstRun()` reads it. Previously this set a flag that `loadBrand` knew nothing
    // about, which is why re-entry looked like it needed its own path. The working brand is
    // deliberately left in place: it is what the app renders behind the start screen.
    clearOrigin();
    build();
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
  if (importErr) box.append(el('p', 'bm-err', importErr));
  const row = el('div', 'bm-import-row');
  const up = el('label', 'bm-upload');
  const fi = el('input', 'bm-file') as HTMLInputElement;
  fi.type = 'file'; fi.accept = IMPORT_ACCEPT;
  fi.onchange = async () => {
    const f = fi.files?.[0]; if (!f) return;
    const read = await readDesignMdFile(f);
    if ('error' in read) { importErr = read.error; pendingLoad = null; renderBar(); return; }
    stageImport(read.text);
  };
  up.append(el('span', undefined, '↑ Upload .md'), fi);
  const load = hook(el('button', 'bm-load', 'Load') as HTMLButtonElement, 'import-load');
  load.onclick = () => stageImport(ta.value);
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
    right.append(el('div', 'exdlg-cap', 'You get 1 file'));
    right.append(el('p', 'exdlg-files', `${slug()}.design.md`));
    right.append(el('p', 'exdlg-sdesc', 'A handful of anchors — the color, the type, the few decisions this brand is built from. The engine regrows the rest.'));
  }
  body.append(right);

  dlg.append(body);

  // ---- the action -------------------------------------------------------------------------
  const foot = el('div', 'exdlg-foot');
  const go = hook(el('button', 'exdlg-go') as HTMLButtonElement, 'dialog-confirm');
  go.textContent = exportArtifact === 'design-md' ? '↓ Download brief' : '↓ Download tokens';
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
  btn.append(document.createTextNode(state.headline));
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
/** The boot read-back's result (#722): the seed pill's words, and the restore refusal (#480) as its body.
 *  The unrecoverable case says both halves, and is not styled as a failure: #721 requires it not read as one. */
const readbackOf = (): Omit<OpReading, 'phase' | 'progress' | 'agent'> | null => {
  const o = host.seedOutcome;
  const err = host.restoreError;
  if (!o && !err) return null;
  const refused = err ? `Saved brand not restored — ${err}` : null;
  if (!o) return { state: 'bad', ref: err, verdict: refused, summary: null };
  const [text, ok] = o.state === 'error' ? [o.message, false]
    : o.state === 'absent' ? ['No existing Prism3 theme in this file — start from the knobs.', true]
      : [isUnrecoverable(o) ? `${o.detail} — knobs not stored in this file, so these are defaults` : o.detail, o.contractOk];
  return { state: ok && !err ? 'ok' : 'bad', ref: `${err ?? ''}\n${text}`, verdict: text, summary: refused };
};
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
        pv ? { state: pv.ok ? 'ok' : 'bad', ref: pv, verdict: pv.summary, summary: null }
          : pp ? { state: 'ok', ref: pp, verdict: pp.summary, summary: null } : null,
        fixed(host.pruneBusy === 'delete' ? 'Removing…' : host.pruneBusy === 'preview' ? 'Checking…' : null)),
      readback: opReading('readback', false, readbackOf(), fixed(null)),
    },
    detail: host.openDetail,
  };
};

// ── the writes the bar's controls and the Figma menu run (S1.4) ─────────────────────────────────────
// One function per write, called by its control and by its Figma menu item, so the two cannot drift.
// Each sets its own pending state and says so through `hostChanged`; the bar, the detail row and the
// Activity drawer repaint from that.

/** Apply Theme. The previous run's detail is stale the instant a new write starts, so it collapses with
 *  the state. */
const runApply = (): void => { setHost({ applyState: 'pending', openDetail: null }); hostChanged(); commit.postTheme(lastGoodInput); };
/** Prune stale: a dry run first, whose count the confirm dialog shows (#1521). */
const runPrune = (): void => { setHost({ pruneBusy: 'preview', pruneVerdict: null, prunePreview: null }); hostChanged(); commit.postPrune(lastGoodInput, false); };
/** Set up file (#1558). `openDetail` is cleared for the reason the build clears it: the previous run's
 *  detail is stale the instant a new one starts. */
const runFileSetup = (): void => {
  setHost({ fileSetupState: 'pending', openDetail: null });
  hostChanged(); syncFileSetupRow();
  commit.postFileSetup();
};
/** Prune is unavailable while a prune runs AND while a theme apply is pending: a prune reads the same
 *  variables an apply writes, so overlapping the two would race a delete against a create. */
const pruneBlocked = (): boolean => !!host.pruneBusy || host.applyState === 'pending';
const PRUNE_HINT = 'Removes the styles, modes and variables this config no longer emits. Shows the count before deleting, and names the modes.';

/** The Figma menu's items (`shell/figma.ts`), plugin only. Labels are today's: the bar's two controls, the
 *  file-setup button, and the two pages whose writes need options first (concept v6's "Build set…" and
 *  "Style guide…"), which open those pages. */
const figmaActions = (): FigmaAction[] => [
  { id: 'apply', label: 'Apply Theme', disabled: host.applyState === 'pending', run: runApply },
  { id: 'prune', label: host.pruneBusy === 'preview' ? '… Checking…' : host.pruneBusy === 'delete' ? '… Removing…' : 'Prune stale', disabled: pruneBlocked(), hint: PRUNE_HINT, run: runPrune },
  { id: 'file-setup', label: FILE_SETUP_LABEL, disabled: host.fileSetupState === 'pending', run: runFileSetup },
  { id: 'build', label: 'Build set…', disabled: false, run: () => setPage('components') },
  { id: 'style-guide', label: 'Style guide…', disabled: false, run: () => setPage('styleGuide') },
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
    const pending = host.applyState === 'pending';
    // Pending is a real state, not a cosmetic one: the write is asynchronous and, on a large file, slow
    // enough that a button which neither moves nor disables reads as broken — and a second click posts a
    // second concurrent write over the same variables. Disabled while in flight is both the signal and
    // the guard. Appended last, after Export and Pages, so the one inverse-filled control ends the bar.
    applyBtn = hook(el('button', 'p3-btn p3-btn-primary', pending ? '… Applying…' : 'Apply Theme') as HTMLButtonElement, 'apply-to-figma');
    applyBtn.type = 'button';
    applyBtn.disabled = pending;
    // The previous run's detail is stale the instant a new write starts, so it collapses with the state.
    applyBtn.onclick = runApply;

    // The component write's trigger USED TO SIT HERE (#483), a second action beside Apply. #718 moved it
    // to the Components rail page, and the move is a demotion — see `renderComponentsPage`. Apply is the
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
  // reachable by its old name until its domain slice retires it, and S13 removes the menu.
  const nWrap = el('div', 'barmenu-wrap');
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
  actions.append(nWrap);
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
  // The page states which build it is (#474). `/dist/main.js` is served from an invariant URL, so a
  // cached bundle is indistinguishable from a fresh one by looking at it — a shipped change was
  // reported missing and took a local rebuild plus a pixel measurement to clear. Engine version
  // answers "what code produced these tokens"; the commit answers "is this deploy current", and only
  // the second one was ever in doubt. Selectable, because the first thing anyone does is paste it.
  // It sat at the foot of the rail, and came into the menu with it (S1.2).
  //
  // The two readings moved to `build-identity.ts` in #836, unchanged for the web and extended for the
  // plugin, where the field used to be the literal `plugin` in every checkout. That made this the one
  // chip that could have said which tree Figma was running and did not — and it was the OTHER field,
  // `engine 0.21.0`, that eventually caught it on 2026-08-26. Both sentences below are now asserted in
  // `test-build-identity.ts`; inline in this file they were unreachable by any test.
  const stamp = hook(el('p', 'rail-build'), 'build-stamp');
  stamp.append(el('span', undefined, `engine ${ENGINE_VERSION}`), el('span', 'rail-build-b', buildChip(PRISM3_BUILD)));
  stamp.title = buildTitle(PRISM3_BUILD);
  menu.append(stamp);
  return menu;
};

/** Seed a fresh brand from a single hex color: the engine grows a full system from one primary, so
 *  the color's OKLCH becomes the primary anchor and the neutral leans to its hue (a subtle brand tint). */
const seedFromColor = (hexVal: string): BrandInput => {
  const o = rgbToOklch(hexToRgb(hexVal));
  return { ...NEW_BRAND(), primary: o, neutral: { hue: o.h, chroma: 0.006 } };
};

/** The first-run START SCREEN (#149 follow-up). Web boots here when nothing is persisted, instead of
 *  silently loading the demo. One brand color bootstraps a full theme, so the paths are: start from
 *  your color, start from a neutral default, or open an example. Each lands in the editor (loadBrand →
 *  rebuild persists it), so a reload restores the working brand and the start screen doesn't reappear. */
const renderStartScreen = (): HTMLElement => {
  const view = hook(el('div', 'startview'), 'start-screen');
  const col = hook(el('div', 'start-col'), 'start-column');
  const mark = el('div', 'start-mark');
  mark.append(el('span', 'logo'), el('span', 'wordmark', 'Prism3'), el('span', 'studio', 'Theme studio'));
  col.append(mark);
  col.append(hook(el('h1', 'start-h', 'Start a new brand.'), 'start-heading'));
  col.append(el('p', 'start-lede', 'One brand color is enough — the engine grows a full, contrast-checked system you can steer. Pick a starting point.'));

  // Leaving the start screen IS choosing an origin — there is no separate `firstRun = false` to
  // forget, because the start screen renders on `origin.kind === 'none'` and every path below hands
  // `loadBrand` a real one. The four paths are four different origins, and keeping them distinct is
  // what makes a later reset mean something: "back to the file" and "back to the brand I imported"
  // are not the same destination.
  const enter = (input: BrandInput, origin: Origin): void => loadBrand(input, origin);

  // Path 1 — from your color (the hero path: a single primary bootstraps everything).
  const c1 = hook(el('div', 'start-card start-hero'), 'start-path');
  c1.append(el('h2', 'start-ct', 'Start from your color'));
  c1.append(el('p', 'start-cd', 'Your primary brand color; everything else takes smart defaults you can tune.'));
  const row = el('div', 'start-color-row');
  const swatch = el('input', 'start-swatch') as HTMLInputElement; swatch.type = 'color'; swatch.value = '#5e4bc3';
  const hexIn = el('input', 'start-hex') as HTMLInputElement; hexIn.type = 'text'; hexIn.value = '#5e4bc3'; hexIn.setAttribute('aria-label', 'Brand color hex');
  const HEX = /^#[0-9a-f]{6}$/i;
  swatch.oninput = () => { hexIn.value = swatch.value; };
  hexIn.oninput = () => { if (HEX.test(hexIn.value)) swatch.value = hexIn.value; };
  const go = hook(el('button', 'start-go', 'Create theme →') as HTMLButtonElement, 'start-go');
  // A color the user typed is a brand they authored here — `new`, not an example they picked.
  go.onclick = () => enter(seedFromColor(HEX.test(hexIn.value) ? hexIn.value : swatch.value), { kind: 'new' });
  row.append(swatch, hexIn, go);
  c1.append(row);
  col.append(c1);

  // Path 2 — a neutral, unopinionated default (set color later).
  const c2 = hook(el('div', 'start-card start-row2'), 'start-path');
  const t2 = el('div', 'start-c2t');
  t2.append(el('h2', 'start-ct', 'Start with a neutral default'), el('p', 'start-cd', 'An unopinionated starting theme — jump in and set your color later.'));
  const b2 = hook(el('button', 'start-alt', 'Start blank') as HTMLButtonElement, 'start-blank');
  b2.onclick = () => enter(NEW_BRAND(), { kind: 'new' });
  c2.append(t2, b2);
  col.append(c2);

  // Path 3 — open a fully-built example (prism3 / aurora / harbor), explicitly framed as examples.
  const c3 = hook(el('div', 'start-card'), 'start-path');
  c3.append(el('h2', 'start-ct', 'Explore an example'));
  c3.append(el('p', 'start-cd', 'Open a fully-built example to see what the engine produces from a brand.'));
  const chips = el('div', 'start-chips');
  for (const name of Object.keys(BRANDS)) {
    const chip = hook(el('button', 'start-chip') as HTMLButtonElement, 'start-example');
    const d = el('span', 'dot'); d.style.background = hex(oklchToRgb(BRANDS[name].primary));
    chip.append(d, el('span', undefined, name));
    chip.onclick = () => enter(BRANDS[name], { kind: 'example', id: name });
    chips.append(chip);
  }
  c3.append(chips);
  col.append(c3);

  // Path 4 — import an existing design.md by upload (#160). No overwrite confirm: it's the first-run
  // screen, there's no brand to replace. File type + engine-acceptance are both validated first.
  const c4 = hook(el('div', 'start-card start-row2'), 'start-path');
  const t4 = el('div', 'start-c2t');
  t4.append(el('h2', 'start-ct', 'Import a design.md'), el('p', 'start-cd', 'Already have a design.md? Upload it to load the full brand.'));
  // DELIBERATELY NOT FOLDED INTO THE DECLARED CHROME (#772). This is field validation — "that file is
  // not a design.md" — attached to the control that produced it, and it reports a REJECTED input the
  // app never adopted. The chrome error bar reports the opposite case: an engine throw over state the
  // app is already holding, which is why that one has to be visible wherever you are. Moving this into
  // shared chrome would put a message about one upload control at the top of the screen, away from the
  // control, and the floor would have cost this view the ability to say something true about itself.
  const err4 = el('p', 'start-imp-err');
  t4.append(err4);
  const up4 = hook(el('label', 'start-alt start-upload'), 'start-upload');
  const fi4 = hook(el('input', 'start-file') as HTMLInputElement, 'start-file');
  fi4.type = 'file'; fi4.accept = IMPORT_ACCEPT;
  fi4.onchange = async () => {
    err4.textContent = '';
    const f = fi4.files?.[0]; if (!f) return;
    const read = await readDesignMdFile(f);
    if ('error' in read) { err4.textContent = read.error; return; }
    const res = validateDesignMd(read.text);
    if ('error' in res) { err4.textContent = res.error; return; }
    enter(res.input, { kind: 'import', label: String(res.input.id ?? f.name) });
  };
  up4.append(el('span', undefined, '↑ Upload…'), fi4);
  c4.append(t4, up4);
  col.append(c4);

  view.append(col);
  return view;
};

export const build = (): void => {
  // No origin yet: the start moment stands in for the app. It is a ROOT VIEW, not a page — so it goes
  // through `mountView` like the app does and carries whatever surfaces the declaration scopes to it,
  // instead of being the one screen in the studio that renders outside the chrome entirely (#772).
  if (firstRun()) { mountView('start', () => renderStartScreen()); return; }

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
