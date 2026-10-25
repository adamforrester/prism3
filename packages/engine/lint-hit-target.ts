/**
 * HIT-TARGET FLOOR GATE (#1443) — every interactive control presents a hit target of at least 44px at
 * its default size on a comfortable or spacious density, or is one of two named permanent exceptions,
 * and every interactive control is REPRESENTED.
 *
 *   npx tsx packages/engine/lint-hit-target.ts
 *
 * ── THE POLICY (owner-decided, #1437 → #1443, corrected 2026-09-16) ─────────────────────────────
 *
 * Interactive controls adopt a 44px hit-target floor — WCAG 2.2 SC 2.5.5 (Enhanced) Target Size. The
 * floor is about the TOUCH/HIT area, not the visual size (`docs/28`'s touch-target-expansion note is
 * the same distinction). It governs the COMFORTABLE and SPACIOUS densities. There are TWO permanent,
 * owner-decided exceptions and NOTHING else:
 *
 *   1. SMALL SIZE — a small button, or a small tag (owner, 2026-09-27: "compact and small as named
 *      exceptions, as for Button"), knowingly sits below the floor; choosing it is choosing the smaller
 *      target.
 *   2. COMPACT DENSITY — a compact-density brand is a deliberate dense/desktop mode, allowed below the
 *      floor. The exception is scoped to compact ALONE: comfortable and spacious are NOT exempt.
 *
 * TARGETS INSIDE A CONTROL (#1741). The gate used to read each control's own box and nothing inside it, so
 * Tag's remove button — a nested small IconButton, 36px on comfortable inside a 44px medium tag — was neither
 * exception above and was not passed by this gate so much as unseen by it. Three arms close that:
 *
 *   · INNER_TARGETS — a part inside an interactive control that is, or may be, a target of its own. Tag's ×
 *     slot is the one today (owner, 2026-09-28): a square the tag's height, whose status as THE target or a
 *     part of a whole-tag target is the owner's open call. Either way it is measured here at the default size,
 *     read THROUGH the part's own `size` binding, so a slot shrunk below the tag's height fails by name.
 *   · UNSEEN NESTS — every `nest` part of an INTERACTIVE control that nests another INTERACTIVE control must be
 *     listed in INNER_TARGETS, or the gate fails. A nested button inside a control is a second target by
 *     construction, and the next one cannot pass unseen the way #1741's did.
 *   · MARKED PARTS — a target that is not a nested control (Tag's × slot is a `box`) is marked in the def
 *     (`PartDef.innerTarget`), and the list and the marks are compared in BOTH directions: a marked part
 *     INNER_TARGETS does not list fails, an entry naming an unmarked part fails, and a mark on a def this gate
 *     does not measure fails. Before the marker, the × slot was found by the hand-written entry alone, and
 *     deleting the entry left every gate green — the list was its own only witness (docs/34 shape 1).
 *
 * FLUSH MEMBERS (#2408, owner Q154 A). A flush text button (`PartDef.flush`, #2350) keeps its height and drops
 * its minimum width, so its visible box is only as wide as its label. The walk below reads HEIGHT, so it passes a
 * flush member on its height alone and says nothing about a width that can now be narrower than 44px. The owner's
 * rule is that the hit area is at least 44×44 in CODE, through an invisible extension, and Figma is unchanged. No
 * emitted token can carry that, so this gate does not measure it; it requires the def to STATE it. Every measured
 * def with a flush part must be in FLUSH_MEMBERS (and every entry must have one), and each must carry a `codeOnly`
 * entry that names the flush button, the 44×44 hit area and the `::before` extension. The phrases are literals
 * here, never read off the def (docs/34), so deleting the sentence from `button.ts` fails this gate by name.
 * The 44×44 covers MEDIUM and LARGE (owner Q170 B); a SMALL flush button's hit area is at least 24×24 in code,
 * the WCAG 2.5.8 floor (owner Q174 B). So the entry must state both, and must not put small, or every size, at
 * 44×44. FLUSH_SIZES and FLUSH_SMALL_SIZES are checked against each def's own `size` axis, so a new size cannot
 * arrive unscoped, and against literals below (#2443), so widening or narrowing either fails by name.
 *
 * THE UNDERLINE TAG (#2947). Every arm above reads a def as authored, which for Tag is the pill. Under the brand's
 * `tagStyle: underline` the tag hugs its content (owner Q585 A): 20 / 26 / 32px, its × slot only as wide as its glyph,
 * and the 24px target (WCAG 2.5.8) moves to code, as Link's does. An arm materializes it through `applyTagStyle`, walks
 * each member's plan to the box it draws at every density, and holds each size, body and × slot apart, to 24px as
 * drawn or to a size `UNDERLINE_CODE_SIDE` names, both ways, with the named sizes stated in `codeOnly` by literal phrases.
 *
 * `select` binds `size.md.min-height` = `max(size.md.height, 44)` (#1426/#1437); the field/row family
 * otherwise binds the size rung directly, which is 44px at the comfortable `md` and 56px at the spacious
 * `md`, so a control at its default size clears the floor on both densities.
 *
 * ── THE TWO THINGS COMPARED, AND WHY THEY ARE INDEPENDENT (docs/34) ─────────────────────────────
 *
 * EXPECTED is `FLOOR_PX = 44`, the WCAG number transcribed HERE as a literal — deliberately NOT imported
 * from `scale.ts`'s `AAA_TARGET_PX`. The emitter computes `select`'s `min-height` AS `max(md,
 * AAA_TARGET_PX)`, so asserting that emitted value `>= AAA_TARGET_PX` would be `x >= x` (docs/34 shape
 * 2). Written independently, lowering `AAA_TARGET_PX` to 40 fails THIS gate at 44.
 *
 * ACTUAL is the emitted px of the token a control ACTUALLY binds as its hit target, at its DEFAULT size,
 * read THROUGH the def's own `tokens` map (`def.tokens[bindKey]`) and resolved from a freshly built tree
 * per density, so the measurement is mutation-sensitive: point a control's default hit target at a
 * smaller rung and it drops below the floor on a comfortable brand, and the assertion fires by name.
 *
 * ── DENSITY IS THE AXIS THE COMPACT EXCEPTION IS SCOPED TO, SO THE GATE BUILDS IT DIRECTLY ───────
 *
 * The compact exception is about the density LEVER, not about any one brand, so the gate builds one base
 * brand input at each density and asserts each built theme's density is the one it was asked for — a
 * comfortable brand cannot be mislabeled compact and slip past the floor, and the compact measurement
 * cannot be credited to a comfortable one. The FLOOR is asserted over the comfortable + spacious builds;
 * the compact build is exempt, and its exemption is self-justified: the gate asserts compact genuinely
 * runs the default control BELOW 44, so if a future change lifts it to the floor the exemption goes
 * stale and fails by name rather than persisting unexamined. The small-button exception self-justifies
 * the same way — asserted to be actually below the floor on a comfortable brand.
 *
 * ── REPRESENTATION, NOT COUNT (docs/34) ─────────────────────────────────────────────────────────
 *
 * Every def in `componentDefs` is either an INTERACTIVE control measured here, or in EXCLUDED with a
 * stated reason (non-interactive, a nested atom whose target is a row gated separately, a group whose
 * rows are the targets, or the fluid multi-line field with no single-line dimension). A def in neither
 * fails, so a new interactive control cannot arrive unclassified.
 *
 * ── SCOPE / LIMITS, STATED ──────────────────────────────────────────────────────────────────────
 *
 * The floor is measured at each control's DEFAULT size — the tap target a consumer gets without
 * choosing otherwise. Non-default size variants are the density affordance the small-button exception
 * already names in the one place the owner sanctioned it; a small non-button variant sits below the
 * floor on a comfortable brand by the same size ladder, and whether that too should be gated is a scope
 * the owner has not extended (noted in `docs/28`). This reads the emitted TOKEN a control binds, not a
 * rendered pixel: `button`'s CSS `::before` hit overlay and the rows' consumer padding are not emitted,
 * so a control is measured at what it actually emits. Per-mode density overrides are not walked (the
 * base px is read, matching #1437's unit test).
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components/index';
import type { ComponentDef } from './component-schema';
import { figmaAnatomySet, figmaAnatomyPlan, planComponentName, applyTagStyle, applySpacingDensity } from './anatomy-figma';
import { buildTree } from './tree';
import { brandTheme } from './theme';
import { parseDesignMd } from './design-md';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * EXPECTED — the WCAG 2.2 SC 2.5.5 enhanced target, transcribed as a literal. NOT `scale.ts`'s
 * `AAA_TARGET_PX`, which the emitter derives select's `min-height` from — sharing it would be `x >= x`.
 */
const FLOOR_PX = 44;

// ── THE DENSITY LEVER, BUILT DIRECTLY ────────────────────────────────────────────────────────────
// One base brand input (`harbor`, a clean comfortable brand) built at each of the three densities, so
// the floor and its compact exception are tested against the LEVER the exception is scoped to rather
// than whichever example brands happen to exist. Each built theme's density is asserted below.
const baseInput = parseDesignMd(readFileSync(resolve(HERE, './examples/harbor.design.md'), 'utf8')).input;
const buildAt = (density: 'comfortable' | 'spacious' | 'compact') => {
  const theme = brandTheme({ ...baseInput, density });
  const built = buildTree(theme);
  return { density, actualDensity: theme.dims.density, tree: built.tree, root: Object.keys(built.tree)[0] };
};
const FLOOR_DENSITIES = ['comfortable', 'spacious'] as const;
const EXEMPT_DENSITY = 'compact' as const;
const floorBuilds = FLOOR_DENSITIES.map(buildAt);
const compactBuild = buildAt(EXEMPT_DENSITY);

/** Resolve a dotted token path (e.g. `size.md.min-height`) to its emitted px, under the tree's root. */
const resolvePx = (tree: any, root: string, path: string): number | undefined => {
  let node = tree[root];
  for (const seg of path.split('.')) {
    node = node?.[seg];
    if (node === undefined) return undefined;
  }
  return node?.$extensions?.prism3?.px;
};

// ── THE INTERACTIVE CONTROLS AND THEIR HIT-TARGET BINDING ────────────────────────────────────────
// Per control, the KEY in `def.tokens` whose value is the token bound as the hit-target dimension at a
// given size. Read THROUGH `def.tokens` so a reverted binding is caught. `single` marks a control with no
// `size` variant axis whose projected control binds the one `md` min-height rung (none since #2266, when
// `select` and `text-field` gained the size axis); every other control is measured at its declared DEFAULT size.
type Binding = { key: (size: string) => string; why: string; single?: boolean };
const INTERACTIVE: Record<string, Binding> = {
  'button': { key: (s) => `size.${s}.height`, why: 'the button box height' },
  'button-destructive': { key: (s) => `size.${s}.height`, why: 'the button box height' },
  'button-neutral': { key: (s) => `size.${s}.height`, why: 'the button box height' },
  'icon-button': { key: (s) => `size.${s}.side`, why: 'the square icon-button side' },
  'icon-button-destructive': { key: (s) => `size.${s}.side`, why: 'the square icon-button side' },
  'icon-button-neutral': { key: (s) => `size.${s}.side`, why: 'the square icon-button side' },
  // The two single-line fields are sized since #2266; each size binds the floor (`size.md.min-height`) or above.
  'text-field': { key: (s) => `size.${s}.height`, why: 'the field control height — size.md.min-height, the interactive floor, at small and medium (#1437, #2266 Q6)' },
  // #2317: the Password field is TextField's box, from the same factory, so it binds the same height rung.
  'password-field': { key: (s) => `size.${s}.height`, why: 'the field control height — TextField\'s, from the shared field factory (#2317)' },
  // #2888: the Search field is TextField's box too.
  'search-field': { key: (s) => `size.${s}.height`, why: 'the field control height — TextField\'s, from the shared field factory (#2888)' },
  'select': { key: (s) => `size.${s}.min-height`, why: 'the select control floor — size.md.min-height, the interactive floor, at small and medium (#1437, #2266 Q6)' },
  'switch-row': { key: (s) => `size.${s}.min-height`, why: 'the labelled switch row floor' },
  'checkbox-row': { key: (s) => `size.${s}.min-height`, why: 'the labelled checkbox row floor' },
  'radio-row': { key: (s) => `size.${s}.min-height`, why: 'the labelled radio row floor' },
  // Owner decision 4 (2026-09-27): a tag's default (medium) target clears 44, on Button's own height rung.
  'tag': { key: (s) => `size.${s}.height`, why: 'the tag box height' },
  // #2416: a tab's medium target is Button's own height rung, 44 on comfortable and spacious.
  'tab-item': { key: (s) => `size.${s}.height`, why: 'the tab box height' },
  // #2417: the whole header row is the target; its floor is 44px at every size (owner Q182).
  'accordion': { key: (s) => `size.${s}.min-height`, why: 'the header row\'s min-height floor' },
  // #2418: each option\'s full-height cell is its target, on Button\'s own height rung (the visible pill is inset 4px).
  'segmented-control-segment': { key: (s) => `size.${s}.height`, why: 'the option cell height' },
  // #2427: the Counter's row, the height of the value it centers (the spinbutton, its one Tab stop). Its two buttons
  // are code-side targets nested in it, measured under FLUSH_NESTS below.
  'counter': { key: (s) => `size.${s}.height`, why: 'the Counter row height, on Button\'s height rung' },
  // #2665: each page cell is its own target, on IconButton's height rung (owner call 8).
  'pagination-item': { key: (s) => `size.${s}.height`, why: 'the page cell height' },
  // #2669: the control row around the track is the click-to-jump target, on the interactive floor `size.md.min-height`
  // at every size (owner Q550 e: the size axis moves the thumb and the track, never the row). Each thumb is its own
  // code-side target below (CODE_SIDE_TARGETS).
  'slider': { key: () => 'control-height', why: 'the control row around the track, the click-to-jump target, the same at every size' },
};

// ── TARGETS INSIDE A CONTROL (#1741): `<def>.<part>` → the tokens KEY of the part's side at a size ─────────
// Authored here, not read off the def: the arm below asserts the part's own `size` binding expands to this key,
// so a slot rebound to a smaller rung fails as "the binding moved" before it is measured, and one left bound
// to a smaller rung under the same key fails the floor. WHICH parts are targets is stated twice, here and by
// the def's `innerTarget` marker, and the two are compared both ways below — so deleting this entry, or the
// marker, fails by name.
const INNER_TARGETS: Record<string, { key: (size: string) => string; why: string }> = {
  'tag.dismiss': { key: (s) => `size.${s}.height`, why: "the dismissible tag's × slot, a square the tag's height (owner, 2026-09-28) — the target itself or a part of a whole-tag target, the owner's open call; it clears the floor either way" },
  // #2317: a NESTED control with no side bound in the host. Its key is the NESTED def's (Button's box height), read
  // through Button's own tokens at the size the host nests it at, so a toggle pointed at a smaller rung fails here.
  'password-field.toggle': { key: (s) => `size.${s}.height`, why: 'the Show/Hide button, a nested flush text Button, small at every field size (Q301.3 B, Q380 A): its box height on Button\'s own rung; its hit area is the code-side flush rule below' },
  // The paired inputs (owner call 7 A): nested TextFields at medium, measured through TextField's own height rung.
  'slider.inputSingle': { key: (s) => `size.${s}.height`, why: 'the number input of a single value, a nested medium TextField' },
  'slider.inputMin': { key: (s) => `size.${s}.height`, why: 'the minimum input of a range, a nested medium TextField' },
  'slider.inputMax': { key: (s) => `size.${s}.height`, why: 'the maximum input of a range, a nested medium TextField' },
};

// ── A NESTED FLUSH BUTTON SHORTER THAN THE FLOOR (#2804, Q380 A; owner question on #2809, option A) ──────────────
// Password's Show is a SMALL Button (36 tall) at every field size, in a label row one label line tall (21 / 24 at
// medium / large), so its Figma box is below the floor by decision. Its floor at medium and large is the code-side
// 44×44 instead, which the host must state (FLUSH_BUTTON_HOSTS below), AND state ANCHORED: a 44 centered on a 21 or 24px
// row reaches 3.5 or 2px into the input box, which would put one target over another. The anchor phrase is a literal
// here, never read off the def (docs/34). A toggle measured AT the floor makes the entry stale by name.
const CODE_SIDE_NESTED: Record<string, { anchor: RegExp; why: string }> = {
  'password-field.toggle': { anchor: /bottom edge sits on the label row's bottom edge/, why: 'the 44 reaches up and sideways, never down into the input box' },
};

// ── HOSTS OF A NESTED FLUSH BUTTON (#2317): a host whose nested Button is flush owes the same code-side hit area ────
// The nested Button's own def states the rule (FLUSH_MEMBERS), but a designer or agent reads the HOST, so the host
// states it too, with the same phrases. Compared both ways with the defs' nested coordinates.
const FLUSH_BUTTON_HOSTS = new Set(['password-field']);

// ── FLUSH MEMBERS (#2408): the defs whose flush member drops its width floor, so its hit area is code-side ────
// Authored here and compared both ways with the defs' own `flush` fields, so a new flush def cannot arrive with
// only its height measured. The code-side rule each must state, as literals (owner Q154 A):
const FLUSH_MEMBERS = new Set(['button', 'button-destructive', 'button-neutral']);
// Phrases of the RULE, not words that occur anyway: the same entry already says "Apple HIG 44×44" and "(::before /
// absolute overlay)", so bare `44×44` and `::before` passed with the flush sentence deleted (measured).
// Owner Q170 B: 44×44 at medium and large; owner Q174 B: 24×24 at small. The entry names both scopes.
const FLUSH_RULE = [/flush/, /at least 44×44 at medium and large sizes/, /at least 24×24 at small\b/, /::before`? inset outward/];
// …and must not widen the 44×44 back: small, or every size, at 44×44 is the rule over-scoped.
const FLUSH_OVERSCOPE = /44×44 at small\b|\bsmall, medium\b|every size|all sizes/;
const FLUSH_SIZES = ['medium', 'large'];
const FLUSH_SMALL_SIZES = ['small'];
/** The `codeOnly` entry that states the code-side hit area, or the phrases no entry carries (an over-scoped
 *  entry reports the over-scope pattern). Pure, so the self-check can drive it. */
const flushRuleGap = (codeOnly: readonly string[]): string[] => {
  const gaps = (c: string) => [...FLUSH_RULE.filter((re) => !re.test(c)), ...(FLUSH_OVERSCOPE.test(c) ? [FLUSH_OVERSCOPE] : [])];
  const best = codeOnly.map(gaps).sort((a, b) => a.length - b.length)[0];
  return (best ?? FLUSH_RULE).map((re) => re.source);
};

// ── CODE-SIDE TARGETS (#2457, owner Q283.3 A): a control whose whole visible box is below the floor by design ──
// The flush icon button's box IS its glyph (20 or 24px, no padding), so no emitted token is its target: the owner's
// rule is a hit area of at least 44×44 in CODE at every size, through an invisible extension, and Figma draws the
// glyph square only. So, as for FLUSH_MEMBERS, this gate requires the def to STATE it, twice: in `codeOnly` (the
// maintainer record) and in the shipped `docs.do` (the page an implementer reads, which `codeOnly` never reaches).
// Each listed def is also measured BELOW the floor at every size on comfortable, so a box later grown to 44 makes the
// entry stale by name rather than leaving a code-side claim on a control that no longer needs one. The phrases are
// literals here, never read off the def (docs/34): deleting either sentence from the def fails this gate by name.
// A def whose OTHER shape draws a box of its own lists it in `atFloor` (#2457 Q287 A, the round shape): those sizes
// are measured the INTERACTIVE way, at or above the floor over the floor densities, so the circle's own box is held
// to 44 where the owner's sizes put it there (medium 44, large 56). The sizes are literals here, never read off the
// def; the size below them (small, 36) stays covered by the code-side rule, which the def states "at every size".
type AtFloor = { key: (size: string) => string; sizes: readonly string[]; why: string };
// The three flush icon-button families (Q295.2 B) share one box, so each is listed and measured on its own: a family
// dropped from this list fails as unmeasured, and one whose box drifts fails by its own id.
const FLUSH_ICON_BUTTON_TARGET = (): { key: (size: string) => string; why: string; atFloor?: AtFloor } => ({
  key: (s) => `size.${s}.flush`, why: "the flush icon button's glyph square, with no padding",
  atFloor: { key: (s) => `size.${s}.round`, sizes: ['medium', 'large'], why: "the round flush icon button's circle, the Counter's height" },
});
const CODE_SIDE_TARGETS: Record<string, { key: (size: string) => string; why: string; atFloor?: AtFloor; single?: true }> = {
  'flush-icon-button': FLUSH_ICON_BUTTON_TARGET(),
  'flush-icon-button-destructive': FLUSH_ICON_BUTTON_TARGET(),
  'flush-icon-button-neutral': FLUSH_ICON_BUTTON_TARGET(),
  // #2669 (owner call 6 A, Q550 e): the slider thumb's disc is 18, 24 or 30px by size (smaller at compact), and its hit
  // area is 44×44 in code at every size and density, so the small 18px disc's target is well over 24×24.
  '_slider-thumb': { key: (s) => `size.${s}.thumb`, why: "the slider thumb's disc, `control.size.{sm,md,lg}.thumb`" },
};
// The thumb's entry is centered on the THUMB, the flush icon button's on the GLYPH: one rule, two words for the box.
const CODE_SIDE_RULE = [/at least 44×44px at every size/, /::before`? inset outward/, /centered on the (glyph|thumb)/];
const CODE_SIDE_DOC = [/hit area in code to at least 44×44px at every size/, /::before`? inset outward/];
// ── FLUSH NESTS (#2427): a host nesting code-side targets, and the room it leaves their hit areas ─────────────
// A code-side target's 44×44 hit area reaches past its box, so a host nesting two of them must keep their centers
// at least 44px apart, or the two areas overlap and one tap lands on both (owner Q296 A, on #2457: "the 44px
// spacing between two flush icon buttons is center to center"). Per host, the nest parts that are code-side
// targets, listed both ways against the def's anatomy, and the PAIR whose spacing is measured (none for a host that
// nests one). Authored here, never read off the def: dropping a part from the anatomy, or nesting a third, fails by name.
const FLUSH_NESTS: Record<string, { parts: readonly string[]; pair?: readonly [string, string]; why: string }> = {
  counter: { parts: ['decrement', 'increment'], pair: ['decrement', 'increment'], why: "the Counter's minus and plus, either side of the value" },
  // #2808 (Q385 A): the Dialog's close is one code-side target, so there is no second hit area to space it from.
  dialog: { parts: ['close'], why: "the Dialog's close, the one code-side target in its header" },
  // Owner QA 2026-10-19: the Banner's dismiss is a flush FlushIconButton.Neutral, the one code-side target in the row.
  banner: { parts: ['dismiss'], why: "the Banner's dismiss, the one code-side target in its row" },
  // #2666: the overflow step's flush icon button is the one code-side target in a breadcrumb item, so there is no second hit area to space it from.
  'breadcrumb-item': { parts: ['overflow'], why: "the collapsed-steps button, the one code-side target in a breadcrumb step" },
  // #2668 (Q386): the Toast's close is one code-side target beside the action Button, which is a separate target measured under its own name.
  toast: { parts: ['close'], why: "the Toast's close, the one code-side icon target in its controls" },
  // #2669: the Slider's two thumbs are code-side targets (Slider.Thumb), the minimum one only on a range. No pair is measured:
  // their spacing is the value's, not the layout's, so two thumbs a step apart overlap by design and the code states the
  // nearer-thumb rule (call 10 A) instead of a spacing the layout could keep.
  slider: { parts: ['thumbMin', 'thumb'], why: "the Slider's maximum thumb, and the minimum thumb of a range; Slider.Thumb nested" },
};
/** The 44px center-to-center spacing, a literal (Q296 A), not FLOOR_PX: a different rule that happens to share the number. */
const FLUSH_NEST_SPACING_PX = 44;
/** The nest parts of each def that nest a code-side target, against FLUSH_NESTS, both ways. Pure, for the self-check. */
const flushNestFailures = (defs: readonly ComponentDef[], codeSide: ReadonlySet<string>, listed: Record<string, { parts: readonly string[] }>): string[] => {
  const out: string[] = [];
  for (const def of defs) {
    const nesting = Object.entries(def.anatomy?.parts ?? {}).filter(([, p]) => p.kind === 'nest' && !!p.nests && codeSide.has(p.nests)).map(([n]) => n);
    const want = listed[def.id]?.parts ?? [];
    for (const n of nesting.filter((x) => !want.includes(x)))
      out.push(`${def.id}.${n}: nests a code-side target ('${def.anatomy!.parts[n]!.nests}'), and FLUSH_NESTS does not list it — its 44×44 hit area reaches past its box, so the host's spacing around it is unmeasured. Add it to FLUSH_NESTS['${def.id}'].parts.`);
    for (const n of want.filter((x) => !nesting.includes(x)))
      out.push(`FLUSH_NESTS['${def.id}'] lists '${n}', which is not a nest part of '${def.id}' nesting a code-side target — a stale entry measures nothing.`);
  }
  for (const id of Object.keys(listed)) if (!defs.some((d) => d.id === id)) out.push(`FLUSH_NESTS names '${id}', which is not a def — a stale entry.`);
  return out;
};
/** The phrases of `rule` that no single entry carries (the best entry's gaps). Pure, so the self-check can drive it. */
const ruleGap = (entries: readonly string[], rule: readonly RegExp[]): string[] =>
  (entries.map((e) => rule.filter((re) => !re.test(e))).sort((a, b) => a.length - b.length)[0] ?? [...rule]).map((re) => re.source);

/** The defs carved out as a size-level exception: a small button (owner, #1443) and a small tag (owner,
 *  2026-09-27, "as for Button") sit below the floor on purpose. Kept as data so the walk asserts each is
 *  ACTUALLY below the floor. */
const SMALL_SIZE = new Set(['button', 'button-destructive', 'button-neutral', 'tag', 'tab-item', 'segmented-control-segment', 'pagination-item']);

// ── EXCLUDED: represented, with a stated reason (docs/34 — a hand-enumerated legitimate exclusion) ──
const EXCLUDED: Record<string, string> = {
  'icon': 'a decorative glyph, not a control — an icon-only ACTION is icon-button, which is gated',
  'focus-ring': 'a decorative ring nested by other controls; never a standalone tap target',
  'field-label': 'a field label, not an interactive control',
  'field-message': 'a helper/validation message, not an interactive control',
  'veil': 'a media wash overlay, not an interactive control',
  'segmented-control': 'a segmented control\'s track and label — its tap targets are the nested options, which are gated as segmented-control-segment',
  'divider': 'a 1px rule between groups of content, never interactive and never focusable',
  'banner': 'a message in the page flow, never itself a pointer target: its one text action is a Button (Button.Neutral when the file has it) and its dismiss a FlushIconButton.Neutral, each measured under its own name (#2579, Q533.1)',
  'button-group': 'a layout of one to three Buttons, never itself a pointer target: each Button is measured under its own name (#2661)',
  'dialog': 'a modal panel, never itself a pointer target: its close button and footer buttons are a FlushIconButton.Neutral and Buttons, each measured under its own name (#2609, Q385 A)',
  'toast': 'a status message over the page, never itself a pointer target: its action and close button are a Button and a FlushIconButton.Neutral, each measured under its own name; the small close button\'s 44×44 hit area is extended in code, as IconButton records (#2668)',
  'list': 'a read list of text items, never interactive and never focusable; a link inside an item is its own control (#2319)',
  'list-item': 'one item of a read list, never interactive and never focusable; a link inside it is its own control (#2319)',
  '_accordion-indicator': 'a decorative glyph inside an Accordion header; the tap target is the header row, gated as accordion',
  'image-placeholder': 'an empty-state media frame, not an interactive control',
  'progress': 'a progress bar or ring shows system work and is never interactive (#2670) — a retry after an error is the host\'s own control, placed beside it, which is gated',
  'spinner': 'a decorative loading indicator on the icon ladder, never interactive — the tap target is the host control it sits in (a pending button), which is gated',
  'badge': 'a static marker, never interactive (owner decision, 2026-09-27) — a count or dot on an icon button relies on the host\'s target, which is gated',
  'checkbox-control': 'a nested-only atom — the tap target is the labelled row (checkbox-row), gated here',
  'radio-control': 'a nested-only atom — the tap target is the labelled row (radio), gated here',
  'switch-control': 'a nested-only atom — the tap target is the labelled row (switch), gated here; its bare 24–32px track fails SC 2.5.8 in isolation by its own codeOnly',
  'checkbox-group': 'a group container — its interactive tap targets are the nested checkbox-rows, which are gated',
  'radio-group': 'a group container — its interactive tap targets are the nested radio-rows, which are gated',
  'pagination': 'a navigation row — its tap targets are the nested page cells, gated as pagination-item, and the previous and next IconButton.Neutral and Button.Neutral, each measured under its own name (#2665)',
  'tabs': 'a tab list container — its interactive tap targets are the nested tabs, which are gated as tab',
  'link': 'one text line tall in Figma by owner decision (Q289.4 A), so its box is the line, not a control height: code expands the hit area to at least 24px (SC 2.5.8, codeOnly), and an inline link in a sentence is exempt under the inline exception',
  // #2428: Code input's target is its row of cells, one target over the one input, built at the owner's literal cell
  // heights (Q330 A: 44, 56, 64, 72px; `builtSize`, no token), so there is no binding here to read. test.ts holds those
  // heights against the 44px floor as literals (`#2428 code-input: the row of cells is a target of at least 44px`).
  'code-input': 'its pointer target is the row of cells over its one input, built at literal cell heights (owner decision Q330 A, no token), so no binding to measure here; test.ts holds every size at 44px or taller',
  'code-input-cell': 'an aria-hidden drawing of one character inside a code input, never focusable and never a target of its own; the row of cells is the code input\'s one target',
  // #2666: neither is a control of its own. The targets are the nested Link (one text line, its code-side 24px area
  // stated under `link`) and the nested FlushIconButton.Neutral (measured under its own name, 44×44 in code).
  'breadcrumbs': 'a navigation container — its targets are the nested items\' links and overflow button, and the parent path\'s Link, each a control of its own',
  '_breadcrumb-separator': 'a decorative mark between breadcrumb steps (CSS ::after in code, never in the accessibility tree); it takes no pointer and no focus',
  'breadcrumb-item': 'one step of a trail — its targets are the nested Link (one text line, code-side 24px, as `link`) and the nested FlushIconButton.Neutral (code-side 44×44, measured under its own name); the current page is text and not a target',
  'textarea': 'a multi-line field whose height is rows/auto-grow (fluid); it binds no single-line height, so there is no fixed hit-target dimension to measure',
};

/**
 * THE ONE ASSERTION, as a pure predicate so the self-check can drive it (docs/34, never a second
 * spelling of the rule). Returns a failure clause, or `null` when acceptable.
 *   floor      — must be >= 44 on comfortable + spacious (the regression this gate exists to catch).
 *   exception  — must be <  44, or the sanctioned below-floor case (small button, or compact density)
 *                is stale: a change lifted it to the floor, so the exception must be reconsidered.
 */
type Kind = 'floor' | 'exception';
const violation = (px: number, kind: Kind): string | null =>
  kind === 'floor'
    ? (px >= FLOOR_PX ? null : `is ${px}px, below the ${FLOOR_PX}px floor`)
    : (px < FLOOR_PX ? null : `measures ${px}px >= ${FLOOR_PX} — the below-floor exception is stale; a change lifted it to the floor, so reconsider the exception`);

// ── SELF-CHECK: can each arm of `violation` fire, and only when it should? (docs/34) ───────────────
const selfFails: string[] = [];
const CASES: Array<{ px: number; kind: Kind; fires: boolean; why: string }> = [
  { px: 44, kind: 'floor', fires: false, why: 'a control AT the floor passes (comfortable md today)' },
  { px: 36, kind: 'floor', fires: true, why: 'THE MUTATION: a default control pointed at a sub-floor rung (36) is the regression this gate catches, by name' },
  { px: 43, kind: 'floor', fires: true, why: 'one px under the floor still fails — the boundary is >=, not >' },
  { px: 36, kind: 'exception', fires: false, why: 'small button / compact md below the floor on purpose — the sanctioned exception' },
  { px: 44, kind: 'exception', fires: true, why: 'an exception lifted to 44 makes the carve-out stale — the lift must be NOTICED, not silently kept' },
];
for (const c of CASES) {
  const fired = violation(c.px, c.kind) !== null;
  if (fired !== c.fires) selfFails.push(`violation(${c.px}, '${c.kind}') should ${c.fires ? 'FIRE' : 'pass'} — ${c.why} — but did not.`);
}
for (const k of ['floor', 'exception'] as Kind[]) {
  if (!CASES.some((c) => c.kind === k && c.fires)) selfFails.push(`no self-check case makes kind '${k}' FIRE — that arm is unfalsifiable here.`);
  if (!CASES.some((c) => c.kind === k && !c.fires)) selfFails.push(`no self-check case makes kind '${k}' PASS — that arm is a false-positive generator here.`);
}

const failures: string[] = [...selfFails];

// ── DENSITY ASSERTIONS: the floor set is genuinely comfortable/spacious; the exempt build is compact ──
// So the compact exception is scoped to compact ALONE and cannot swallow a comfortable/spacious
// regression — the requirement stated in the #1443 unblock.
for (const b of floorBuilds)
  if (b.actualDensity !== b.density)
    failures.push(`the ${b.density} build resolved to density '${b.actualDensity}' — the floor set must be the densities it claims, or the floor is asserted over the wrong ladder.`);
if (compactBuild.actualDensity !== EXEMPT_DENSITY)
  failures.push(`the exempt build resolved to density '${compactBuild.actualDensity}', not '${EXEMPT_DENSITY}' — the compact exception must be scoped to compact alone.`);

// ── REPRESENTATION: every def is measured or excluded, exactly once ───────────────────────────────
const defIds = new Set(componentDefs.map((d) => d.id));
for (const d of componentDefs) {
  const inInteractive = d.id in INTERACTIVE;
  const inExcluded = d.id in EXCLUDED;
  const inCodeSide = d.id in CODE_SIDE_TARGETS;
  if ([inInteractive, inExcluded, inCodeSide].filter(Boolean).length > 1) failures.push(`${d.id}: appears in more than one of INTERACTIVE, EXCLUDED and CODE_SIDE_TARGETS — decide which, then state it once.`);
  if (!inInteractive && !inExcluded && !inCodeSide) failures.push(`${d.id}: is neither measured nor excluded. A new interactive control must be added to INTERACTIVE with its hit-target binding; a non-control must be added to EXCLUDED with a reason.`);
}
for (const id of Object.keys(INTERACTIVE)) if (!defIds.has(id)) failures.push(`INTERACTIVE names '${id}', which is not a def in componentDefs — a stale entry measures nothing.`);
for (const id of Object.keys(EXCLUDED)) if (!defIds.has(id)) failures.push(`EXCLUDED names '${id}', which is not a def in componentDefs — a stale exclusion.`);
for (const id of Object.keys(CODE_SIDE_TARGETS)) if (!defIds.has(id)) failures.push(`CODE_SIDE_TARGETS names '${id}', which is not a def in componentDefs — a stale entry.`);
for (const id of SMALL_SIZE) if (!(id in INTERACTIVE)) failures.push(`SMALL_SIZE names '${id}', which is not an INTERACTIVE control — a stale exception entry.`);

/** A control's DEFAULT size — the `size` prop's default, or `single` for the no-size-axis control. */
const defaultSizeOf = (def: ComponentDef): string | undefined =>
  (def.props?.find((p) => p.name === 'size') as { default?: string } | undefined)?.default;

// ── THE WALK: default size, floor over comfortable + spacious ─────────────────────────────────────
const rows: string[] = [];
let floorCount = 0;
for (const def of componentDefs) {
  const binding = INTERACTIVE[def.id];
  if (!binding) continue;

  // Locate the default size and assert the enumeration agrees with the def's own axis.
  const declaredSizes = def.variants?.size as string[] | undefined;
  let size: string;
  if (binding.single) {
    if (declaredSizes) failures.push(`${def.id}: is enumerated single-size but declares variants.size [${declaredSizes.join(', ')}].`);
    size = 'single';
  } else {
    const dflt = defaultSizeOf(def);
    if (!dflt || !declaredSizes?.includes(dflt)) {
      failures.push(`${def.id}: could not read a default size from its \`size\` prop that is one of variants.size [${(declaredSizes ?? []).join(', ')}] (got ${dflt ?? 'none'}) — cannot pick the representative tap target.`);
      continue;
    }
    size = dflt;
  }

  const bindKey = binding.key(size);
  const tokenPath = (def.tokens as Record<string, string> | undefined)?.[bindKey];
  if (!tokenPath) {
    failures.push(`${def.id}/${size}: binds no token at tokens['${bindKey}'] (${binding.why}) — the hit-target binding moved. Re-point INTERACTIVE['${def.id}'].key.`);
    continue;
  }

  // ACTUAL: the worst (smallest) emitted px across the FLOOR densities.
  const measured = floorBuilds.map((b) => ({ density: b.density, px: resolvePx(b.tree, b.root, tokenPath) }));
  const missing = measured.filter((m) => m.px === undefined);
  if (missing.length) {
    failures.push(`${def.id}/${size}: token '${tokenPath}' does not resolve to a px on the ${missing.map((m) => m.density).join(', ')} build(s) — cannot measure the hit target.`);
    continue;
  }
  const minPx = Math.min(...measured.map((m) => m.px!));
  floorCount++;
  const bad = violation(minPx, 'floor');
  rows.push(`${def.id}/${size} → ${tokenPath} = ${minPx}px (min over ${FLOOR_DENSITIES.join('+')}) [floor]${bad ? '  ✗' : ''}`);
  if (bad) failures.push(`${def.id}/${size} (${binding.why}, ${tokenPath}) ${bad} on a ${measured.find((m) => m.px === minPx)!.density} brand — a control's default tap target must meet the floor on comfortable and spacious.`);
}

// ── TARGETS INSIDE A CONTROL (#1741): unseen nests and unlisted marked parts fail; each listed inner target
// is a marked part, and clears the floor ─────────────────────────────────────────────────────────────────────
/**
 * The REPRESENTATION arms, as one pure function so the self-check below can drive each with a synthetic def
 * (docs/34: an arm no case can make fire is unfalsifiable). Four ways a target inside a control goes unmeasured:
 * a mark on a def this gate does not measure; a nested interactive control INNER_TARGETS does not list; a marked
 * part it does not list; and an entry naming a part the def does not say is a target.
 */
const markFailures = (defs: readonly ComponentDef[], interactive: ReadonlySet<string>, inner: ReadonlySet<string>): string[] => {
  const out: string[] = [];
  for (const def of defs) {
    const parts = Object.entries(def.anatomy?.parts ?? {});
    if (!interactive.has(def.id)) {
      for (const [name, part] of parts)
        if (part.innerTarget) out.push(`${def.id}.${name}: the def marks it innerTarget, but '${def.id}' is not an INTERACTIVE control here — a target inside a control this gate does not measure is measured by nothing. Classify the def, or drop the marker.`);
      continue;
    }
    for (const [name, part] of parts) {
      if (part.kind === 'nest' && part.nests && interactive.has(part.nests) && !inner.has(`${def.id}.${name}`))
        out.push(`${def.id}.${name}: nests the interactive control '${part.nests}', a second target inside '${def.id}', and INNER_TARGETS does not list it — a nested target this gate cannot see is #1741's defect. Measure it here, or change the anatomy.`);
      if (part.innerTarget && !inner.has(`${def.id}.${name}`))
        out.push(`${def.id}.${name}: the def marks it innerTarget, a second target inside '${def.id}', and INNER_TARGETS does not list it — a marked target this gate does not measure is #1741's defect. Add it to INNER_TARGETS with the key of its side.`);
    }
  }
  for (const id of inner) {
    const [defId, partName] = id.split('.');
    const part = defs.find((d) => d.id === defId)?.anatomy?.parts[partName];
    if (!part || !interactive.has(defId)) continue;   // stale entries are the measure loop's to report
    // The entry's other direction: the def must say the part is a target. A nested interactive control says so
    // by what it nests; any other part says so with the `innerTarget` marker.
    const nestsControl = part.kind === 'nest' && !!part.nests && interactive.has(part.nests);
    if (!part.innerTarget && !nestsControl)
      out.push(`INNER_TARGETS names '${id}', and the def does not mark that part innerTarget (nor does it nest an interactive control) — the entry and the def disagree about whether it is a target. Mark the part, or drop the entry.`);
  }
  return out;
};

// SELF-CHECK: each representation arm fires on its own synthetic case, and a clean case fires none.
{
  const box = (innerTarget?: true) => ({ kind: 'box', size: 'size.{size}.height', ...(innerTarget ? { innerTarget } : {}) });
  const defOf = (id: string, parts: Record<string, unknown>) => ({ id, anatomy: { root: 'root', parts: { root: { kind: 'box', role: 'target' }, ...parts } } }) as unknown as ComponentDef;
  const MARK_CASES: Array<{ why: string; defs: ComponentDef[]; interactive: string[]; inner: string[]; want: RegExp | null }> = [
    { why: 'a mark on a def the gate does not measure', defs: [defOf('x', { slot: box(true) })], interactive: [], inner: [], want: /is not an INTERACTIVE control here/ },
    { why: 'a marked part INNER_TARGETS does not list', defs: [defOf('x', { slot: box(true) })], interactive: ['x'], inner: [], want: /marks it innerTarget, a second target inside 'x', and INNER_TARGETS does not list it/ },
    { why: 'a nested interactive control INNER_TARGETS does not list', defs: [defOf('x', { btn: { kind: 'nest', nests: 'y' } }), defOf('y', {})], interactive: ['x', 'y'], inner: [], want: /nests the interactive control 'y'/ },
    { why: 'an entry naming an unmarked part', defs: [defOf('x', { slot: box() })], interactive: ['x'], inner: ['x.slot'], want: /does not mark that part innerTarget/ },
    { why: 'a marked, listed part (clean)', defs: [defOf('x', { slot: box(true) })], interactive: ['x'], inner: ['x.slot'], want: null },
  ];
  for (const c of MARK_CASES) {
    const got = markFailures(c.defs, new Set(c.interactive), new Set(c.inner));
    if (c.want ? !got.some((f) => c.want!.test(f)) : got.length) selfFails.push(`markFailures, ${c.why}: ${c.want ? 'should FIRE' : 'should pass'}, got ${got.length ? got.join(' | ') : 'nothing'}.`);
  }
}
failures.push(...selfFails.filter((f) => f.startsWith('markFailures')));

// A code-side target nested in a host is a second target inside it too, but its box is below the floor by design, so
// INNER_TARGETS (which measures a side against the floor) cannot hold it. It is FLUSH_NESTS' to list and measure
// (#2427, the Counter's two), so this arm sees INTERACTIVE alone. (#2457 had it see CODE_SIDE_TARGETS as well, which
// would have demanded an INNER_TARGETS entry the measure loop then skips.)
failures.push(...markFailures(componentDefs, new Set(Object.keys(INTERACTIVE)), new Set(Object.keys(INNER_TARGETS))));
for (const id of Object.keys(CODE_SIDE_NESTED)) if (!(id in INNER_TARGETS)) failures.push(`CODE_SIDE_NESTED names '${id}', which INNER_TARGETS does not list — a stale entry.`);
for (const [id, inner] of Object.entries(INNER_TARGETS)) {
  const [defId, partName] = id.split('.');
  const def = componentDefs.find((d) => d.id === defId);
  const part = def?.anatomy?.parts[partName];
  if (!def || !part) { failures.push(`INNER_TARGETS names '${id}', which is not a part of a registered def — a stale entry measures nothing.`); continue; }
  if (!(defId in INTERACTIVE)) { failures.push(`INNER_TARGETS names '${id}', whose def is not an INTERACTIVE control.`); continue; }
  const nestsControl = part.kind === 'nest' && !!part.nests && part.nests in INTERACTIVE;
  if (!part.innerTarget && !nestsControl) continue;   // reported by `markFailures`
  // A single-size host (#2669, the Slider) has no size prop; its nested targets are measured at the size they nest.
  const size = INTERACTIVE[defId].single ? 'single' : defaultSizeOf(def);
  if (!size) { failures.push(`${id}: its def has no default size to measure the inner target at.`); continue; }
  const want = inner.key(size);
  // A NESTED CONTROL WITH NO SIDE OF ITS OWN (#2317): measured through the NESTED def's tokens, at the size the host
  // nests it at (its followed size, or the size its coordinate names).
  if (nestsControl && part.size === undefined && part.width === undefined && part.height === undefined) {
    const nesting = part.nesting as { variant?: Record<string, string>; follow?: readonly string[] } | undefined;
    const nestedSize = nesting?.follow?.includes('size') ? size : nesting?.variant?.size;
    const nested = componentDefs.find((d) => d.id === part.nests)!;
    const key = nestedSize ? inner.key(nestedSize) : undefined;
    const path = key ? (nested.tokens as Record<string, string>)[key] : undefined;
    const got = floorBuilds.map((b) => ({ density: b.density, px: path ? resolvePx(b.tree, b.root, path) : undefined }));
    if (!path || got.some((m) => m.px === undefined)) { failures.push(`${id}/${size}: the nested '${part.nests}' binds nothing at tokens['${key ?? '?'}'] that resolves on every floor density — cannot measure the nested target.`); continue; }
    const px = Math.min(...got.map((m) => m.px!));
    floorCount++;
    const bad = violation(px, 'floor');
    const codeSide = CODE_SIDE_NESTED[id];
    if (codeSide) {
      // Below the floor by decision: the floor moves to code, so the host must be a stated flush host, stating the
      // 44×44 rule (checked with FLUSH_BUTTON_HOSTS below) and its anchor in the SAME codeOnly entry.
      const codeOnly = def.anatomy?.codeOnly ?? [];
      const flush = nesting?.variant?.inset === 'flush' && FLUSH_BUTTON_HOSTS.has(defId);
      const anchored = codeOnly.some((e) => !flushRuleGap([e]).length && codeSide.anchor.test(e));
      rows.push(`${id}/${size} → ${part.nests} ${key} → ${path} = ${px}px in Figma; the floor is the code-side 44×44, anchored (${codeSide.why}) [nested target, code-side]${!bad || !flush || !anchored ? '  ✗' : ''}`);
      if (!bad) failures.push(`CODE_SIDE_NESTED names '${id}', whose nested box (${px}px) meets the floor — a stale entry; measure it as a nested target.`);
      else if (!flush) failures.push(`${id}/${size} (${inner.why}, ${path}) ${bad}, and its nested Button is not a flush Button of a FLUSH_BUTTON_HOSTS host — nothing carries the floor in code.`);
      else if (!anchored) failures.push(`${id}/${size} (${inner.why}, ${path}) ${bad}: no codeOnly entry states the code-side 44×44 together with its anchor (${codeSide.anchor.source}) — ${codeSide.why}.`);
      continue;
    }
    rows.push(`${id}/${size} → ${part.nests} ${key} → ${path} = ${px}px (min over ${FLOOR_DENSITIES.join('+')}) [floor, nested target]${bad ? '  ✗' : ''}`);
    if (bad) failures.push(`${id}/${size} (${inner.why}, ${path}) ${bad} on a ${got.find((m) => m.px === px)!.density} brand — a target inside a control must meet the floor too.`);
    continue;
  }
  // BOTH SIDES: a square's one `size`, or `width` and `height` each (the schema refuses a marked part with an
  // unbound side). Each must expand to the measured key, so a slot 4 wide and 44 tall cannot clear on its height.
  const sides = part.size !== undefined ? [part.size] : [part.width, part.height];
  const moved = sides.map((k) => k?.replace('{size}', size)).find((k) => k !== want);
  if (sides.some((k) => k === undefined) || moved !== undefined) { failures.push(`${id}/${size}: the part binds '${moved ?? 'nothing'}' as a side, not '${want}' (${inner.why}) — the inner target's binding moved. Re-point INNER_TARGETS['${id}'].key.`); continue; }
  const tokenPath = (def.tokens as Record<string, string>)[want];
  const measured = floorBuilds.map((b) => ({ density: b.density, px: tokenPath ? resolvePx(b.tree, b.root, tokenPath) : undefined }));
  if (!tokenPath || measured.some((m) => m.px === undefined)) { failures.push(`${id}/${size}: tokens['${want}'] does not resolve to a px on every floor density — cannot measure the inner target.`); continue; }
  const minPx = Math.min(...measured.map((m) => m.px!));
  floorCount++;
  const bad = violation(minPx, 'floor');
  rows.push(`${id}/${size} → ${tokenPath} = ${minPx}px (min over ${FLOOR_DENSITIES.join('+')}) [floor, inner target]${bad ? '  ✗' : ''}`);
  if (bad) failures.push(`${id}/${size} (${inner.why}, ${tokenPath}) ${bad} on a ${measured.find((m) => m.px === minPx)!.density} brand — a target inside a control must meet the floor too.`);
}

// ── FLUSH MEMBERS (#2408): the height above passes a flush member; its width floor is a code-side rule ──
{
  const FLUSH_CASES: Array<{ why: string; codeOnly: string[]; fires: boolean }> = [
    { why: 'the rule stated in one entry', codeOnly: ['touch-target-expansion — a flush button\'s hit area is at least 44×44 at medium and large sizes, and at least 24×24 at small, through a transparent ::before inset outward'], fires: false },
    { why: 'THE MUTATION: the size qualifier dropped back to every size', codeOnly: ['touch-target-expansion — a flush button\'s hit area is at least 44×44 at every size, through a transparent ::before inset outward'], fires: true },
    { why: 'THE MUTATION: the small clause removed', codeOnly: ['touch-target-expansion — a flush button\'s hit area is at least 44×44 at medium and large sizes, through a transparent ::before inset outward'], fires: true },
    { why: 'THE MUTATION: small at 44×44', codeOnly: ['touch-target-expansion — a flush button\'s hit area is at least 44×44 at medium and large sizes, and at least 44×44 at small, through a transparent ::before inset outward'], fires: true },
    { why: 'THE MUTATION: small re-added to the 44×44 scope', codeOnly: ['touch-target-expansion — a flush button\'s hit area is at least 44×44 at small, medium and large sizes, and at least 24×24 at small, through a transparent ::before inset outward'], fires: true },
    { why: 'THE MUTATION: medium dropped from the scope', codeOnly: ['touch-target-expansion — a flush button\'s hit area is at least 44×44 at large sizes, and at least 24×24 at small, through a transparent ::before inset outward'], fires: true },
    { why: 'THE MUTATION: the flush sentence deleted, the entry\'s other 44×44 and ::before left', codeOnly: ['touch-target-expansion — the hit box is decoupled (::before / absolute overlay), reconciling Apple HIG 44×44; a flush button hugs its label'], fires: true },
    { why: 'the phrases split across two entries do not state one rule', codeOnly: ['a flush hit area of at least 44×44', 'a ::before inset outward'], fires: true },
    { why: 'an empty codeOnly', codeOnly: [], fires: true },
  ];
  for (const c of FLUSH_CASES)
    if ((flushRuleGap(c.codeOnly).length > 0) !== c.fires) failures.push(`flushRuleGap, ${c.why}: should ${c.fires ? 'FIRE' : 'pass'}, but did not.`);
  // #2443: the size scopes against literals (owner Q170 B, Q174 B), so widening or narrowing either constant fails
  // here by name rather than passing on the def's size axis, which only checks their union.
  if (FLUSH_SIZES.join() !== 'medium,large')
    failures.push(`FLUSH_SIZES is [${FLUSH_SIZES.join(', ')}], but the 44×44 flush hit area is owed at medium and large only (owner Q170 B).`);
  if (FLUSH_SMALL_SIZES.join() !== 'small')
    failures.push(`FLUSH_SMALL_SIZES is [${FLUSH_SMALL_SIZES.join(', ')}], but the 24×24 flush hit area is owed at small only (owner Q174 B).`);
  // #2457: the round circle's at-floor scope against a literal too (owner Q287 A: 36 / 44 / 56), so narrowing it
  // cannot let the medium circle drop below 44 with every gate green.
  for (const id of ['flush-icon-button', 'flush-icon-button-destructive', 'flush-icon-button-neutral']) {
    const roundSizes = CODE_SIDE_TARGETS[id]?.atFloor?.sizes ?? [];
    if (roundSizes.join() !== 'medium,large')
      failures.push(`${id} atFloor.sizes is [${roundSizes.join(', ')}], but the round circle is held to the 44px floor at medium and large (owner Q287 A).`);
  }
}
for (const def of componentDefs) {
  if (!(def.id in INTERACTIVE)) continue;
  const flushes = Object.values(def.anatomy?.parts ?? {}).some((p) => p.flush);
  if (flushes && !FLUSH_MEMBERS.has(def.id))
    failures.push(`${def.id}: has a flush part, which drops its width floor, and FLUSH_MEMBERS does not list it — its hit target is measured on height alone. Add it, and state the 44×44 code-side hit area in its codeOnly.`);
  if (!flushes && FLUSH_MEMBERS.has(def.id))
    failures.push(`FLUSH_MEMBERS names '${def.id}', which has no flush part — a stale entry.`);
}
// The hosts of a nested flush Button (FLUSH_BUTTON_HOSTS; FLUSH_NESTS below is the Counter's different rule), both ways, and each states the code-side rule in its own codeOnly.
for (const def of componentDefs) {
  if (!(def.id in INTERACTIVE)) continue;
  const nestsFlush = Object.values(def.anatomy?.parts ?? {}).some((p) => p.kind === 'nest' && !!p.nests && p.nests in INTERACTIVE
    && (p.nesting as { variant?: Record<string, string> } | undefined)?.variant?.inset === 'flush');
  if (nestsFlush && !FLUSH_BUTTON_HOSTS.has(def.id))
    failures.push(`${def.id}: nests a flush Button, whose width floor is code-side, and FLUSH_BUTTON_HOSTS does not list it — state the 44×44 code-side hit area in its codeOnly and list it.`);
  if (!nestsFlush && FLUSH_BUTTON_HOSTS.has(def.id))
    failures.push(`FLUSH_BUTTON_HOSTS names '${def.id}', which nests no flush Button — a stale entry.`);
  if (nestsFlush) {
    const gap = flushRuleGap(def.anatomy?.codeOnly ?? []);
    rows.push(`${def.id} → a nested flush Button; hit area ≥ 44×44 in code at ${FLUSH_SIZES.join(' and ')}, ≥ 24×24 at ${FLUSH_SMALL_SIZES.join(', ')} (codeOnly) [code-side rule, #2317]${gap.length ? '  ✗' : ''}`);
    if (gap.length) failures.push(`${def.id}: nests a flush Button, and no codeOnly entry states its code-side hit area, 44×44 at medium and large and 24×24 at small (missing or over-scoped: ${gap.join(', ')}).`);
  }
}
for (const id of FLUSH_MEMBERS) {
  const def = componentDefs.find((d) => d.id === id);
  if (!def || !(id in INTERACTIVE)) { failures.push(`FLUSH_MEMBERS names '${id}', which is not an INTERACTIVE def.`); continue; }
  const sizes = [...((def.variants?.size as string[] | undefined) ?? [])].sort();
  const scoped = [...FLUSH_SIZES, ...FLUSH_SMALL_SIZES].sort();
  if (sizes.join() !== scoped.join())
    failures.push(`${id}: size axis is [${sizes.join(', ')}], but the flush rule scopes 44×44 to [${FLUSH_SIZES.join(', ')}] and 24×24 to [${FLUSH_SMALL_SIZES.join(', ')}] — decide the new size's hit area with the owner (Q170, Q174), then list it here.`);
  const gap = flushRuleGap(def.anatomy?.codeOnly ?? []);
  rows.push(`${id}/inset=flush → width floor dropped; hit area ≥ 44×44 in code at ${FLUSH_SIZES.join(' and ')}, ≥ 24×24 at ${FLUSH_SMALL_SIZES.join(', ')} (codeOnly) [code-side rule, #2408, Q170 B, Q174 B]${gap.length ? '  ✗' : ''}`);
  if (gap.length) failures.push(`${id}/inset=flush: no codeOnly entry states the code-side hit area, 44×44 at medium and large and 24×24 at small (missing or over-scoped: ${gap.join(', ')}) — a flush member has no width floor, so the height measured above does not cover it. State that its hit area is at least 44×44 at medium and large sizes and at least 24×24 at small in code through a ::before extension (owner Q154 A, Q170 B, Q174 B, #2408).`);
}

const comfortable = floorBuilds.find((b) => b.density === 'comfortable')!;
// ── CODE-SIDE TARGETS (#2457): below the floor at every size, and the 44×44 code-side rule stated twice ──
{
  const CASES: Array<{ why: string; entries: string[]; rule: RegExp[]; fires: boolean }> = [
    { why: 'the rule stated in one codeOnly entry', entries: ['the hit area is at least 44×44px at every size in code: a transparent ::before inset outward and centered on the glyph'], rule: CODE_SIDE_RULE, fires: false },
    { why: 'THE MUTATION: the size scope dropped', entries: ['the hit area is at least 44×44px in code: a transparent ::before inset outward and centered on the glyph'], rule: CODE_SIDE_RULE, fires: true },
    { why: 'the phrases split across two entries', entries: ['at least 44×44px at every size', 'a ::before inset outward and centered on the glyph'], rule: CODE_SIDE_RULE, fires: true },
    { why: 'the shipped instruction stated', entries: ['Extend its hit area in code to at least 44×44px at every size, with a transparent `::before` inset outward'], rule: CODE_SIDE_DOC, fires: false },
    { why: 'THE MUTATION: the shipped instruction deleted', entries: ['Always give it an accessible name (a verb)'], rule: CODE_SIDE_DOC, fires: true },
    { why: 'an empty list', entries: [], rule: CODE_SIDE_DOC, fires: true },
  ];
  for (const c of CASES)
    if ((ruleGap(c.entries, c.rule).length > 0) !== c.fires) failures.push(`ruleGap, ${c.why}: should ${c.fires ? 'FIRE' : 'pass'}, but did not.`);
}
for (const [id, target] of Object.entries(CODE_SIDE_TARGETS)) {
  const def = componentDefs.find((d) => d.id === id);
  if (!def) continue;   // reported as stale above
  const declared = def.variants?.size as string[] | undefined;
  if (target.single && declared) { failures.push(`${id}: CODE_SIDE_TARGETS lists it single-size, and it declares variants.size [${declared.join(', ')}] — measure each size instead.`); continue; }
  const sizes = target.single ? ['single'] : declared ?? [];
  if (!sizes.length) { failures.push(`${id}: CODE_SIDE_TARGETS measures each size, and the def declares no size axis.`); continue; }
  for (const size of sizes) {
    const path = (def.tokens as Record<string, string> | undefined)?.[target.key(size)];
    const px = path ? resolvePx(comfortable.tree, comfortable.root, path) : undefined;
    if (px === undefined) { failures.push(`${id}/${size}: tokens['${target.key(size)}'] does not resolve to a px on the comfortable build (${target.why}) — the box binding moved. Re-point CODE_SIDE_TARGETS['${id}'].key.`); continue; }
    const bad = violation(px, 'exception');
    rows.push(`${id}/${size} → ${path} = ${px}px (comfortable) [code-side hit area ≥ 44×44 at every size, #2457, Q283.3 A]${bad ? '  ✗' : ''}`);
    if (bad) failures.push(`${id}/${size} (${target.why}) ${bad} — a box at the floor is an INTERACTIVE control, measured on its own box; move it there.`);
  }
  if (target.atFloor) {
    const at = target.atFloor;
    for (const size of at.sizes) {
      const path = (def.tokens as Record<string, string> | undefined)?.[at.key(size)];
      const measured = floorBuilds.map((b) => ({ density: b.density, px: path ? resolvePx(b.tree, b.root, path) : undefined }));
      if (!path || measured.some((m) => m.px === undefined)) { failures.push(`${id}/${size}: tokens['${at.key(size)}'] does not resolve to a px on every floor density (${at.why}) — the box binding moved. Re-point CODE_SIDE_TARGETS['${id}'].atFloor.key.`); continue; }
      const minPx = Math.min(...measured.map((m) => m.px!));
      floorCount++;
      const bad = violation(minPx, 'floor');
      rows.push(`${id}/${size} → ${path} = ${minPx}px (min over ${FLOOR_DENSITIES.join('+')}) [floor, ${at.why}, #2457 Q287 A]${bad ? '  ✗' : ''}`);
      if (bad) failures.push(`${id}/${size} (${at.why}, ${path}) ${bad} on a ${measured.find((m) => m.px === minPx)!.density} brand — the round circle at this size is its own target and must meet the floor.`);
    }
  }
  const ruleMiss = ruleGap(def.anatomy?.codeOnly ?? [], CODE_SIDE_RULE);
  if (ruleMiss.length) failures.push(`${id}: no codeOnly entry states the code-side hit area (missing: ${ruleMiss.join(', ')}) — its box is below the floor by design, so the rule is the only target it has. State that the hit area is at least 44×44px at every size in code, through a ::before inset outward and centered on the glyph (owner Q283.3 A, #2457).`);
  const docMiss = ruleGap(def.docs?.do ?? [], CODE_SIDE_DOC);
  if (docMiss.length) failures.push(`${id}: the shipped docs.do does not tell the implementer to extend the hit area (missing: ${docMiss.join(', ')}) — codeOnly never ships, so without this the code docs lose the only 44×44 target the control has. Keep a docs.do entry: "Extend its hit area in code to at least 44×44px at every size, with a transparent ::before inset outward…" (owner Q283.3 A, #2457).`);
}

// ── FLUSH NESTS (#2427): every code-side nest listed, and each listed pair 44px apart center to center ──────────
{
  const defOf = (id: string, parts: Record<string, unknown>) => ({ id, anatomy: { root: 'row', parts: { row: { kind: 'box' }, ...parts } } }) as unknown as ComponentDef;
  const nest = (to: string) => ({ kind: 'nest', nests: to });
  const CASES: Array<{ why: string; defs: ComponentDef[]; listed: Record<string, { parts: string[] }>; want: RegExp | null }> = [
    { why: 'a code-side nest FLUSH_NESTS does not list', defs: [defOf('h', { a: nest('c') })], listed: {}, want: /FLUSH_NESTS does not list it/ },
    { why: 'a listed part that nests no code-side target', defs: [defOf('h', { a: nest('other') })], listed: { h: { parts: ['a'] } }, want: /a stale entry measures nothing/ },
    { why: 'a listed host that is not a def', defs: [], listed: { h: { parts: [] } }, want: /is not a def/ },
    { why: 'every code-side nest listed (clean)', defs: [defOf('h', { a: nest('c'), b: nest('c') })], listed: { h: { parts: ['a', 'b'] } }, want: null },
  ];
  for (const c of CASES) {
    const got = flushNestFailures(c.defs, new Set(['c']), c.listed);
    if (c.want ? !got.some((f) => c.want!.test(f)) : got.length) failures.push(`flushNestFailures, ${c.why}: ${c.want ? 'should FIRE' : 'should pass'}, got ${got.length ? got.join(' | ') : 'nothing'}.`);
  }
}
failures.push(...flushNestFailures(componentDefs, new Set(Object.keys(CODE_SIDE_TARGETS)), FLUSH_NESTS));
{
  // ACTUAL, off the PROJECTED plans on the comfortable build: half of each nested box (the nested def's own root
  // `size` key, filled from the instance's coordinate), plus every frame between the two (its minimum width and
  // inline padding — a hugging value can only be wider), plus the row's gap on each side. A lower bound on the
  // real spacing, held to 44.
  const pxOf = (name: string | undefined): number => (name ? resolvePx(comfortable.tree, comfortable.root, name.replace(/\//g, '.')) ?? NaN : 0);
  type PlanNode = { name: string; type?: string; nestTarget?: string; nestVariant?: Record<string, string>; minWidth?: number; bound?: Record<string, string>; children?: PlanNode[] };
  const sideOf = (n: PlanNode): number => {
    const nested = componentDefs.find((d) => d.id === n.nestTarget);
    const key = nested?.anatomy ? nested.anatomy.parts[nested.anatomy.root]?.size : undefined;
    const filled = key?.replace(/\{([a-zA-Z]+)\}/g, (m, a: string) => n.nestVariant?.[a] ?? m);
    const path = filled ? (nested!.tokens as Record<string, string>)[filled] : undefined;
    return path ? resolvePx(comfortable.tree, comfortable.root, path) ?? NaN : NaN;
  };
  let measuredPairs = 0;
  const paired = Object.entries(FLUSH_NESTS).flatMap(([id, fn]) => (fn.pair ? [[id, { ...fn, pair: fn.pair }] as const] : []));
  for (const [id, fn] of paired) {
    const def = componentDefs.find((d) => d.id === id);
    if (!def) continue;   // reported as stale above
    let closest = Infinity;
    let at = '';
    for (const plan of figmaAnatomySet(def)) {
      const walk = (n: PlanNode): PlanNode | undefined => ((n.children ?? []).some((c) => c.name === fn.pair[0]) ? n : (n.children ?? []).map(walk).find(Boolean));
      const row = walk(plan.root as unknown as PlanNode);
      const kids = row?.children ?? [];
      const ia = kids.findIndex((c) => c.name === fn.pair[0]);
      const ib = kids.findIndex((c) => c.name === fn.pair[1]);
      if (!row || ia < 0 || ib <= ia) { failures.push(`${id} @ ${planComponentName(plan)}: FLUSH_NESTS pair [${fn.pair.join(', ')}] are not siblings in one row, in that order — the spacing between them cannot be measured.`); continue; }
      const between = kids.slice(ia + 1, ib).filter((c) => c.type === 'FRAME' || c.type === 'TEXT');
      const gap = pxOf(row.bound?.itemSpacing);
      const span = between.reduce((sum, c) => sum + Math.max(c.minWidth ?? 0, 0) + pxOf(c.bound?.paddingLeft) + pxOf(c.bound?.paddingRight), 0);
      const d = sideOf(kids[ia]) / 2 + gap * (between.length + 1) + span + sideOf(kids[ib]) / 2;
      if (!Number.isFinite(d)) { failures.push(`${id} @ ${planComponentName(plan)}: the spacing between ${fn.pair.join(' and ')} does not resolve to px on the comfortable build — a nested box key or a bound padding moved.`); continue; }
      if (d < closest) { closest = d; at = planComponentName(plan); }
    }
    if (closest === Infinity) continue;
    measuredPairs++;
    const bad = closest < FLUSH_NEST_SPACING_PX;
    rows.push(`${id}: ${fn.pair.join(' ↔ ')} at least ${closest}px apart center to center (closest at ${at}, comfortable) [code-side hit areas, ≥ ${FLUSH_NEST_SPACING_PX}px, Q296 A, #2427]${bad ? '  ✗' : ''}`);
    if (bad) failures.push(`${id}: ${fn.pair.join(' and ')} (${fn.why}) are ${closest}px apart center to center at ${at} — below ${FLUSH_NEST_SPACING_PX}px, so their 44×44 code-side hit areas overlap (owner Q296 A). Widen what sits between them.`);
  }
  if (measuredPairs !== paired.length && !failures.length)
    failures.push(`FLUSH_NESTS lists ${paired.length} host(s) with a pair and ${measuredPairs} pair(s) were measured — a host measured nowhere asserts nothing.`);
}

// ── EXCEPTION 1: small size — asserted ACTUALLY below the floor on comfortable (self-justified) ──
for (const id of SMALL_SIZE) {
  const def = componentDefs.find((d) => d.id === id)!;
  const path = (def.tokens as Record<string, string>)['size.small.height'];
  const px = path ? resolvePx(comfortable.tree, comfortable.root, path) : undefined;
  if (px === undefined) { failures.push(`${id}/small: cannot measure size.small.height on the comfortable build — the small-size exception is unverifiable.`); continue; }
  const bad = violation(px, 'exception');
  rows.push(`${id}/small → ${path} = ${px}px (comfortable) [PERMANENT exception: small size]${bad ? '  ✗' : ''}`);
  if (bad) failures.push(`${id}/small (small size) ${bad} — the small-size exception exists because it is BELOW the floor; if it now meets it, drop the exception.`);
}

// ── EXCEPTION 2: compact density — exempt from the floor, and self-justified as genuinely below it ──
// The default control on compact (size.md at 36) must be below the floor, or the compact exception is
// exempting something that already meets it. `button` is the representative control here: the fields bind
// the 44 floor (`size.md.min-height`) at every density since #1437, and text-field's code ladder followed
// its projection onto that floor in #2266, so a field no longer measures what compact exempts.
const compactMdPath = (componentDefs.find((d) => d.id === 'button')!.tokens as Record<string, string>)['size.medium.height'];
const compactMdPx = resolvePx(compactBuild.tree, compactBuild.root, compactMdPath);
if (compactMdPx === undefined) {
  failures.push(`cannot measure the default button height on the compact build — the compact exception is unverifiable.`);
} else {
  const bad = violation(compactMdPx, 'exception');
  rows.push(`compact density → ${compactMdPath} = ${compactMdPx}px [PERMANENT exception: compact density, exempt from the floor]${bad ? '  ✗' : ''}`);
  if (bad) failures.push(`compact density: the default button measures ${compactMdPx}px >= ${FLOOR_PX} — compact no longer runs below the floor, so the compact-density exception is stale and should be reconsidered.`);
}

// ── THE UNDERLINE TAG (#2947): the box the brand-level `tagStyle: underline` builds, against the 24px minimum ──
// Every arm above reads a def as authored, which for Tag is the pill. `applyTagStyle(def, 'underline')` builds a tag
// that hugs its content (owner Q585 A, #2945): 20 / 26 / 32px tall, its × slot only as wide as its glyph and no longer
// `innerTarget`, the 24px target moved to code as Link's is. So this arm materializes the underline tag at each
// density, walks each member's plan to the height it draws (and the × slot's width and height), and holds each size
// to WCAG 2.5.8's 24px either AS DRAWN or through a named code-side entry, both ways: a size under 24px that
// UNDERLINE_CODE_SIDE does not name fails, and a named size that now clears 24px is a stale entry. A named size's
// `codeOnly` must state it in one entry, by the phrases below. EXPECTED is literals here: the 24px floor and the
// sizes the owner's decision puts in code (Q585 A, `tag.ts` codeOnly "The hit-target expansion, Underline"), never
// read off the def or the materializer (docs/34 shape 1). ACTUAL is the plan walk below, a second derivation of the
// hug height from the bound tokens: it shares nothing with `applyTagStyle` but the plan it reads.
const MIN_TARGET_PX = 24;
const UNDERLINE_SIZES = ['small', 'medium', 'large'];
/** The sizes whose underline box is below 24px by decision, each with the code-side phrases its `codeOnly` states. */
const UNDERLINE_CODE_SIDE: Record<'tag' | 'slot', { sizes: string[]; rule: RegExp[] }> = {
  // The tag body: a small tag (20px) only. Medium (26) and large (32) clear 24px as drawn.
  tag: { sizes: ['small'], rule: [/hit-target expansion, Underline/, /a small tag, 20px/, /reaches 24px/] },
  // The × slot, as wide as its glyph: 16 and 20px at small and medium; large (24) clears as drawn.
  slot: { sizes: ['small', 'medium'], rule: [/hit-target expansion, Underline/, /× slot is only as wide as its glyph/, /reaches 24px on both axes/] },
};
type PlanBox = { name: string; type?: string; layoutMode?: string; textStyle?: string; bound?: Record<string, string>; children?: PlanBox[] };
/** The height a plan node draws, in px: a bound height, else the hug of its children on its own layout axis plus its
 *  block padding and floor. A TEXT node is its text style's line box. Pure over a px lookup, so the self-check can drive it. */
const drawnHeight = (n: PlanBox, px: (name: string) => number): number => {
  const b = n.bound ?? {};
  if (b.height) return px(b.height);
  if (n.type === 'TEXT') { const [group, rung] = (n.textStyle ?? '').split('/'); return group && rung ? px(`type/${group}/${rung}/line-box`) : NaN; }
  const kids = (n.children ?? []).map((c) => drawnHeight(c, px));
  const along = n.layoutMode === 'VERTICAL'
    ? kids.reduce((a, h) => a + h, 0) + (b.itemSpacing ? px(b.itemSpacing) : 0) * Math.max(kids.length - 1, 0)
    : Math.max(0, ...kids);
  const pad = (b.paddingTop ? px(b.paddingTop) : 0) + (b.paddingBottom ? px(b.paddingBottom) : 0);
  return Math.max(along + pad, b.minHeight ? px(b.minHeight) : 0);
};
{
  const SELF: Array<{ why: string; node: PlanBox; want: number }> = [
    { why: 'a bound height wins', node: { name: 'a', bound: { height: 'h/20' }, children: [{ name: 'b', bound: { height: 'h/40' } }] }, want: 20 },
    { why: 'a horizontal row hugs its tallest child plus its block padding', node: { name: 'a', layoutMode: 'HORIZONTAL', bound: { paddingBottom: 'h/4' }, children: [{ name: 'b', bound: { height: 'h/16' } }, { name: 't', type: 'TEXT', textStyle: 'label/sm/x' }] }, want: 22 },
    { why: 'a floor above the content wins', node: { name: 'a', layoutMode: 'HORIZONTAL', bound: { minHeight: 'h/30' }, children: [{ name: 'b', bound: { height: 'h/16' } }] }, want: 30 },
  ];
  const fake = (name: string): number => (name === 'type/label/sm/line-box' ? 18 : Number(name.split('/').pop()));
  for (const c of SELF) if (drawnHeight(c.node, fake) !== c.want) failures.push(`drawnHeight self-check, ${c.why}: got ${drawnHeight(c.node, fake)}, want ${c.want}.`);
  for (const [what, cs] of Object.entries(UNDERLINE_CODE_SIDE)) {
    if (ruleGap([], cs.rule).length === 0) failures.push(`UNDERLINE_CODE_SIDE.${what}: an empty codeOnly states the rule — the phrase check cannot fail.`);
  }
}
{
  const tag = componentDefs.find((d) => d.id === 'tag');
  const sizes = tag?.variants?.size as string[] | undefined;
  if (!tag || !sizes) failures.push(`the underline Tag arm (#2947) found no tag def with a size axis — it measures nothing.`);
  else {
    if ([...sizes].sort().join() !== [...UNDERLINE_SIZES].sort().join()) failures.push(`tag: its size axis is [${sizes.join(', ')}], and the underline arm (#2947) holds [${UNDERLINE_SIZES.join(', ')}] — a size arrived or left unscoped.`);
    const under = applyTagStyle(tag, 'underline');
    if (under === tag) failures.push(`tag: applyTagStyle(tag, 'underline') returns the pill unchanged, so the underline arm (#2947) measures the pill.`);
    const members = [['select', 'unselected'], ['select', 'selected'], ['dismissible', 'unselected']];
    const minAt: Record<'tag' | 'slot', Record<string, { px: number; at: string }>> = { tag: {}, slot: {} };
    for (const b of [...floorBuilds, compactBuild]) {
      const px = (name: string): number => resolvePx(b.tree, b.root, name.replace(/\//g, '.')) ?? NaN;
      const def = applySpacingDensity(under, b.density);
      for (const size of UNDERLINE_SIZES) for (const [type, selection] of members) {
        const plan = figmaAnatomyPlan(def, size, { type, selection, state: 'rest' } as never);
        const at = `${b.density} ${type} ${selection}`;
        const root = plan.root as unknown as PlanBox;
        const keep = (what: 'tag' | 'slot', v: number) => { if (!(minAt[what][size]?.px <= v)) minAt[what][size] = { px: v, at }; };
        keep('tag', drawnHeight(root, px));
        const slot = type === 'dismissible' ? (root.children ?? []).find((c) => c.name === 'dismiss') : undefined;
        if (type === 'dismissible' && !slot) failures.push(`tag/underline/${size} @ ${at}: no 'dismiss' slot in the plan — the × slot cannot be measured.`);
        if (slot) keep('slot', Math.min(slot.bound?.width ? px(slot.bound.width) : NaN, drawnHeight(slot, px)));
      }
    }
    const codeOnly = tag.anatomy?.codeOnly ?? [];
    for (const what of ['tag', 'slot'] as const) {
      const cs = UNDERLINE_CODE_SIDE[what];
      for (const size of UNDERLINE_SIZES) {
        const m = minAt[what][size];
        const label = `tag/underline/${size} ${what === 'tag' ? 'box' : '× slot'}`;
        if (!m || !Number.isFinite(m.px)) { failures.push(`${label}: does not resolve to px — a bound token moved, so the underline arm (#2947) measures nothing.`); continue; }
        const named = cs.sizes.includes(size);
        rows.push(`${label} = ${m.px}px (min over every density, at ${m.at}) [${named ? `below ${MIN_TARGET_PX}px; code-side hit area, Q585 A` : `≥ ${MIN_TARGET_PX}px as drawn`}]`);
        if (!named && m.px < MIN_TARGET_PX) failures.push(`${label} is ${m.px}px at ${m.at}, below the ${MIN_TARGET_PX}px minimum (WCAG 2.5.8), and UNDERLINE_CODE_SIDE.${what} does not name ${size} — a sub-24px underline box with no code-side target is a target nobody owns. Name it and state it in codeOnly, or grow the box.`);
        if (named && m.px >= MIN_TARGET_PX) failures.push(`${label} is ${m.px}px at ${m.at}, which clears ${MIN_TARGET_PX}px as drawn, and UNDERLINE_CODE_SIDE.${what} still names ${size} — a stale code-side entry. Drop it.`);
      }
      const gap = ruleGap(codeOnly, cs.rule);
      if (cs.sizes.length && gap.length) failures.push(`tag: no codeOnly entry states the underline ${what === 'tag' ? 'box' : '× slot'}'s code-side 24px hit area at ${cs.sizes.join(' and ')} (missing: ${gap.join(', ')}) — under Tag style Underline that is the only 24px target it has (owner Q585 A, #2947).`);
    }
  }
}

// ── NON-EMPTY FLOOR: the gate must be holding at least one control TO the floor (docs/34) ──────────
if (floorCount === 0 && !failures.length)
  failures.push(`no interactive control was measured against the floor — the gate asserts nothing.`);

// ── REPORT ────────────────────────────────────────────────────────────────────────────────────────
console.log(`Hit-target floor — floor ${FLOOR_PX}px (WCAG 2.5.5) at each control's DEFAULT size over the ${FLOOR_DENSITIES.join(' + ')} densities; ${floorCount} control(s) held to the floor, 2 permanent exceptions (small button or tag; compact density), ${Object.keys(CODE_SIDE_TARGETS).length} code-side target(s), ${Object.keys(EXCLUDED).length} def(s) excluded.`);
for (const r of rows) console.log(`    ${r}`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} hit-target failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error(`\nInteractive controls adopt a ${FLOOR_PX}px hit-target floor (WCAG 2.2 SC 2.5.5) on comfortable and`);
  console.error(`spacious densities — the TOUCH area, not the visual size. Two permanent exceptions: small button or tag,`);
  console.error(`and compact density (a deliberate dense mode). See docs/28 and docs/34.`);
  process.exit(1);
}
console.log(`  ✓ every interactive control meets the ${FLOOR_PX}px floor at its default size on comfortable and`);
console.log(`    spacious, both permanent exceptions are actually below the floor (so a lift fails by name), and`);
console.log(`    every def is represented (measured or excluded with a reason) — a new sub-44 control cannot arrive unseen.`);
