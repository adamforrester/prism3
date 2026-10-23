/**
 * Prism3 engine — EVERY AXIS VALUE SET IS DECLARED, AND ITS RELATION TO THE OTHERS IS DECLARED TOO
 * (#934).
 *
 * `VARIANT_AXES` closes the axis **NAME** vocabulary, checked in `component-schema.ts`. Nothing
 * closed, or even OBSERVED, axis **VALUES**. This gate is the census that was missing, built on an
 * authored register rather than on a scan.
 *
 * (That line read "— 11 names" until #1267. It was 12 by then, `weight` having landed in #1248, and
 * the count bought a reader nothing they could not get from the constant. Arm D prints
 * `VARIANT_AXES.length` live when it fires, which is the same fact at every ref.)
 *
 * ── WHY A REGISTER AND NOT A UNIFORMITY RULE ────────────────────────────────────────────────────
 *
 * The obvious gate — "one values set per axis" — would be WRONG, and #934 says so before proposing
 * anything: `switch` spells its `selection` axis `[off, on]` against `checkbox`'s
 * `[unchecked, checked, indeterminate]`, and that divergence was argued at length in #930 and is
 * correct. `role="switch"` exists precisely because it is ANNOUNCED on/off; forcing it onto
 * `[unchecked, checked]` to satisfy a uniformity rule would make the def read as a checkbox with a
 * different skin, which is that component's most common misuse.
 *
 * So the bar is not sameness. It is that **every set is declared with a stated reason, and checked in
 * both directions**: an undeclared set fails, and a declared set no def uses fails as stale. That
 * makes divergence WEIGHABLE rather than uniform, which is the right bar when the divergence is
 * legitimate. Same standard as `LEAF_OK` (`lint-context-nodes.ts`), `ZERO_OK`
 * (`lint-absolute-inset.ts`) and `PROVENANCE_EXCEPTIONS` (`lint-paint.ts`): an exemption carries its
 * reason or it is not weighable.
 *
 * ── THE ASSUMPTION #934 NAMED WAS NOT THE BINDING ONE (#1000's rule, and it paid) ────────────────
 *
 * #934 frames the gap as *spelling divergence in `selection`*, and describes it as two spellings
 * across three defs. **Both halves are wrong, and the census is what says so.** Measured on `d9c5b2d`,
 * over 11 defs and 24 (def, axis) pairs:
 *
 *   1. **`selection` carries THREE sets, not two.** #934's table records `radio` as "inherits
 *      checkbox's". It does not — `radio` is `[unchecked, checked]`, checkbox's vocabulary minus
 *      `indeterminate`, which `radio.ts` argues for in its own header (a mutually-exclusive choice has
 *      no partial state). Correct, and a third distinct set.
 *
 *   2. **The divergence is not confined to `selection`.** At #934 THREE of the axes carried more than
 *      one set: `selection` (3), `size` (2), `tone` (2). A gate scoped to `selection` — which is what the
 *      issue title asks for — would have gone green over the other two. (The `tone` divergence was later
 *      RESOLVED at its source by #1334 — see the OVERLAPPING section below — so the live count the gate
 *      prints is smaller now; the point that a scoped gate misses the axes it was not scoped to stands.)
 *
 * And the binding property is not "how many spellings". It is **COMPARABILITY**: whether two defs'
 * sets for one axis can be lined up at all. Three relations exist in the corpus and they are not
 * equally dangerous:
 *
 *   - **`subset`** — `radio` ⊂ `checkbox`; `field-label`'s `[small, medium]` ⊂ the three-rung ladder.
 *     Same vocabulary, shorter. A shared value means the same thing in both. Cheapest case.
 *   - **`disjoint`** — `switch`'s `[off, on]` shares NO member with checkbox's. Loud: a consumer
 *     lining the two up sees immediately that they do not.
 *   - **`overlapping`** — shares some members and disagrees on others. **This is the dangerous one,
 *     and it is the one #934 did not know was there.** Partial agreement reads as alignment, so the
 *     one place the sets disagree looks like a real distinction rather than a synonym.
 *
 * ── THE OVERLAPPING CASE, WHICH WAS #756's FAILURE MODE LIVE IN A DIFFERENT AXIS (RESOLVED #1334) ──
 *
 * At #934 the `tone` axis carried `field-message`'s `[default, error, warning, success]` against
 * `icon`'s nine-value ink vocabulary. They agreed on `success` and `warning` — and then one spelled the
 * failure ink **`error`** and the other **`danger`**. The proof they were one concept was in the binding
 * itself:
 *
 *     'error.label': 'color.text.danger'
 *     'error.icon':  'color.icon.danger'
 *
 * The def spelled the value `error` and resolved it to `danger` on the very next token. That was #756's
 * finding — *"four spellings of one axis, every one individually defensible"* — one level down, in an
 * axis nobody was watching, and both spellings ARE individually defensible: `error` is a member of the
 * closed `STATES` vocabulary, which is what a validation outcome should mirror; `danger` is the
 * semantic-ink token vocabulary, which is what the binding resolves to.
 *
 * **This gate DECLARED that divergence rather than fixing it, deliberately** — #934's own bar is that
 * the gate must not prejudge a decision two spellings might legitimately survive, and unifying them was
 * a component-API change that belonged to whoever owns the axis, not to the census that found it. **The
 * owner took that decision in #1334**, splitting the overloaded `tone`: the validation outcome became
 * its own `status` axis (`field-message`, `select`) and the label-emphasis axis became `emphasis`
 * (`field-label`), leaving `tone` on `icon` alone — its one honest, non-overlapping use. So this section
 * is now the RECORD of a divergence a gate surfaced and an owner resolved, not a live one; the register's
 * `status`, `emphasis` and `tone` entries all stand `sole`. The `error → danger` ink mapping survives as
 * a named provenance exception in `lint-paint.ts`, which is where a value/role difference belongs.
 *
 * ── THE TRAP, NAMED IN #934 AND WORTH RE-STATING AT THE CALL SITE ────────────────────────────────
 *
 * A census that reads the defs to decide what to EXPECT can only confirm the defs agree with
 * themselves — `docs/34` shape 1 — and it would report that as a pass. So:
 *
 *     the register is authored          → EXPECTED
 *     the defs' `variants` blocks       → ACTUAL
 *     git's index over `components/`    → the ORACLE for which defs must be represented
 *
 * The register must be **authored and never generated**, for the same reason as `token-contract.json`
 * (principle 5), `payload-manifest.json` and `paint-census.json`: regenerated from a scan, it would
 * classify each new spelling itself and report that as a pass. **A gate allowed to rewrite what it
 * reads has no memory.** It lives in this file, in TypeScript, rather than as a JSON artifact — which
 * is not only for the prose. A JSON baseline in the repo is a standing invitation to add it to
 * `regen.ts`; a `const` in a gate script cannot be regenerated by anything.
 *
 * The def list comes from `git ls-files`, not from `components/index.ts`. Reading the registry to
 * decide which defs to expect would put a second list in the oracle position — `typecheck-components.ts`
 * states the rule this borrows: *"git's index stays the ORACLE; the registry is only ever the
 * SUBJECT."* Concretely it means a def file that exists and was forgotten from the registry is still
 * censused here.
 *
 * `parseTrackedDefs` in `typecheck-components.ts` does this same parse and is exported — and is
 * deliberately NOT imported. That file is a SCRIPT: it runs its work at module scope and calls
 * `process.exit(1)`, so importing it would run that gate and, on failure, kill this one during the
 * import. #988's rule — **a gate script and a library are different things, and a file can only be one
 * of them** — applies to the file being imported FROM, whichever direction you approach it.
 *
 * ── SCOPE, STATED PLAINLY ───────────────────────────────────────────────────────────────────────
 *
 * This proves every set is declared, that the declaration is not stale, and that the stated relation
 * between two sets on one axis is the relation they actually stand in. It does **not** prove the
 * values are the right values — the same limit `lint-context-nodes.ts` states about itself.
 * `MIN_REASON` is a floor against a label standing in for a justification, not a judge of content.
 *
 * Run: `npx tsx packages/engine/lint-axis-values.ts`
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { VARIANT_AXES, type VariantAxis } from './component-schema';

const HERE = dirname(fileURLToPath(import.meta.url));
const repo = resolve(HERE, '..', '..');
const DEFS_DIR = 'packages/engine/components';
/** The registry is a tracked `.ts` file in the defs directory that is not a def. It re-exports every
 *  def by name, so counting its exports would double-count the whole corpus. Excluded BY NAME, and
 *  the exclusion is asserted to have matched something — an exclusion that silently matches nothing
 *  after a rename is `docs/34` shape 9. */
const REGISTRY = `${DEFS_DIR}/index.ts`;

/**
 * How a values set stands relative to its axis's `canonical` set. The first two are STRUCTURAL — they
 * describe the register's own shape and are checked as such. The last four are COMPUTED from the
 * values by set algebra and compared against what the author declared, which is what makes the
 * declaration an assertion rather than a note.
 */
type Relation =
  /** The axis has exactly one declared set. Nothing to compare against. */
  | 'sole'
  /** The axis has several, and this is the reference the others are described against. Exactly one. */
  | 'canonical'
  /** Every value is in canonical, and there are fewer. Same vocabulary, shorter ladder. */
  | 'subset'
  /** Every canonical value is here, and there are more. */
  | 'superset'
  /** No value is in canonical. Loud, and therefore the cheap kind of divergence. */
  | 'disjoint'
  /** Shares some, disagrees on others. Reads as alignment while disagreeing — argue this one hardest. */
  | 'overlapping'
  /** Exactly canonical's values, in another ORDER (#2266). The first value is the rest coordinate and the
   *  Figma default variant, so a reordering is a real choice, declared rather than read as a duplicate. */
  | 'reordered';

type AxisValueSet = {
  readonly axis: VariantAxis;
  /** ORDERED. Order is meaningful — the first value is the rest coordinate a paint key falls through
   *  to (see `checkbox.ts`'s `paintKeys` comment), so a reordered set is a different set. */
  readonly values: readonly string[];
  /** Every def that declares this axis with exactly these values. Checked both directions. */
  readonly defs: readonly string[];
  readonly relation: Relation;
  readonly reason: string;
};

/**
 * THE REGISTER — EXPECTED, authored, never generated. See the header.
 *
 * Ordered by axis name, then canonical first. A reason has to answer the question the relation
 * raises: for a `sole` set, why these values; for anything else, why this def does not use the
 * canonical set, and why the divergence is worth its cost.
 */
const AXIS_VALUE_SETS: readonly AxisValueSet[] = [
  {
    axis: 'appearance',
    values: ['filled', 'outline', 'text'],
    defs: ['button', 'button-destructive', 'button-neutral'],
    relation: 'canonical',
    reason:
      'The emphasis ladder, descending: filled carries the page\'s primary action, outline the secondary, '
      + 'text the tertiary. CANONICAL since #1432 split this axis — one entry covers the three #1223 button '
      + 'siblings (`button`, `button-destructive`, `button-neutral`), all off `makeButton`, same axis with '
      + 'only the colour FAMILY differing (the component identity now, not a coordinate). It WAS shared with '
      + 'the icon-button family until #1432 renamed their tertiary value `text` → `ghost` (a "text" appearance '
      + 'is meaningless on an icon-only control); Button KEEPS `text`, so the two ladders now diverge on that '
      + 'one rung and this is the reference the icon-button `overlapping` entry below is described against. A '
      + 'second entry for the three button defs would let this shared set drift while all still passed; the '
      + 'shared set IS the relationship.',
  },
  {
    axis: 'appearance',
    values: ['ghost', 'filled', 'outline'],
    defs: ['icon-button', 'icon-button-destructive', 'icon-button-neutral'],
    relation: 'overlapping',
    reason:
      'The icon-button emphasis ladder (#1432, owner-decided 2026-09-17): filled, outline, then `ghost` — '
      + 'the borderless/fill-less icon action, the industry term for what Button calls `text`. OVERLAPPING '
      + 'with the canonical button ladder BY DESIGN, and named as the expensive relation deliberately: the '
      + 'two agree on `filled`/`outline` and diverge on the tertiary rung alone, which is exactly the "reads '
      + 'as aligned while disagreeing on one value" shape this register exists to flag. Here the divergence '
      + 'is the decision, not an accident — a "text" appearance names nothing on an icon-only control (there '
      + 'is no text), so the VALUE is renamed while the mechanical mapping to button\'s `text` ink role is '
      + 'unchanged (icon-button.ts binds `ghost.*` paint keys to `color.interactive.<family>.text.*`). The '
      + 'owner accepted that Button and IconButton diverge on this one appearance-value name; shared by the '
      + 'three `makeIconButton` siblings, so one entry records all three. ORDERED ghost first (#2752, owner '
      + 'decision Q347 A): the first value is the set\'s top-left member, which Figma inserts, and the code '
      + 'default is `ghost`. The code enum keeps filled, outline, ghost.',
  },
  {
    axis: 'appearance',
    values: ['outline', 'ghost'],
    defs: ['counter'],
    relation: 'overlapping',
    reason:
      'The Counter\'s two treatments (#2427; owner Q283.4 A, `outline | ghost`, and the wireframe decision keeping '
      + 'both). OVERLAPPING with the canonical button ladder: `outline` is the same word for the same thing (an '
      + 'edged control), and `ghost` is IconButton\'s word for a control with no box, here the row with no edge and '
      + 'round buttons at its ends. No `filled` rung: the wireframe\'s filled square buttons (C) are not built now, '
      + 'and adding them is a third value here. `outline` LEADS as Q283.4 A spells it, so the Figma default is '
      + 'outline, while ghost is the MVP the wireframe named; which one leads is an open owner call on the PR.',
  },
  {
    axis: 'emphasis',
    values: ['secondary', 'primary'],
    defs: ['field-label'],
    relation: 'canonical',
    reason:
      '`secondary` FIRST since #1699 (owner-delegated): the first value is the set\'s first member, which '
      + 'Figma takes as the default variant, and every field host nests the secondary label, so the Figma '
      + 'default now matches the code default. '
      + 'The de-emphasized label (#872; Prism 2 calls the control "color"). RENAMED from `tone` to '
      + '`emphasis` in #1334, which split the overloaded `tone` name — this was recorded here as a SUBSET '
      + 'of `icon`\'s `tone` ink vocabulary, and the owner\'s split makes label prominence its own axis '
      + 'rather than a shortened spelling of icon\'s ink. CANONICAL since badge took the axis name (2026-09-28): '
      + 'this is the set the badge\'s `subtle | bold` is described against. Two values and not more: a label below `secondary` stops reading as a field\'s '
      + 'name, and a status-colored one would be the validation signal `field-message` already owns via '
      + 'its `status` axis.',
  },
  {
    axis: 'emphasis',
    values: ['subtle', 'bold'],
    defs: ['badge'],
    relation: 'disjoint',
    reason:
      'How strongly a badge reads (owner decision, 2026-09-28): the tone\'s tint with a 1px edge in the tone\'s '
      + 'border role, or the solid tone fill. It REUSES the `emphasis` name rather than a new one because it is '
      + 'the same question field-label\'s axis answers — how prominent the thing reads relative to what is '
      + 'around it — and a second name for one question is the #756 failure. DISJOINT from canonical on '
      + 'purpose, the loud kind of divergence: `primary | secondary` names two TEXT roles a label chooses '
      + 'between, while `subtle | bold` names two paint treatments of a filled pill, and no value would mean '
      + 'the same thing on both defs, so none is shared. `subtle` LEADS because it is the code default and so '
      + 'Figma\'s default member. Only the status type carries both; the count and dot are bold-only through '
      + '`figmaProperties.excludeCoordinates`, which leaves this value set unchanged.',
  },
  {
    axis: 'type',
    values: ['status', 'count', 'dot'],
    defs: ['badge'],
    relation: 'canonical',
    reason:
      'Which KIND of badge a member is (owner-approved, 2026-09-27, as `genre`; renamed `type` 2026-09-28 so '
      + 'Badge and Tag use one name): a status label in flow, a number over a host, or a contentless mark over a '
      + 'host — the brief\'s three genres, which the owner made one component switched by this axis. '
      + 'Self-describing values, `status` rather than `default`, as the owner asked, and `status` LEADS because '
      + 'it is the code default and the only type that needs no host, so Figma\'s default member matches. '
      + 'CANONICAL because it came first and is the wider set. Three values and not the brief\'s fourth count '
      + 'edge state (dot-on-overflow): that is a count behavior, not a kind.',
  },
  {
    axis: 'type',
    values: ['determinate', 'indeterminate'],
    defs: ['progress'],
    relation: 'disjoint',
    reason:
      'Whether the work has a value (#2670, the brief\'s defining fork): a known amount, or a sweep while the amount is '
      + 'unknown. The field\'s own words and ARIA\'s distinction (`aria-valuenow` present or absent). DISJOINT from '
      + 'Badge\'s canonical set: a badge type is a content kind and a progress type a value contract, and no value would '
      + 'mean the same thing on both. `determinate` LEADS because it is the default member; in code the type follows '
      + 'from whether a value is given.',
  },
  {
    axis: 'type',
    values: ['select', 'dismissible'],
    defs: ['tag'],
    relation: 'disjoint',
    reason:
      'Which INTERACTION a tag carries (owner-named, 2026-09-28): one the user toggles on and off, or one the '
      + 'user removes. The owner\'s own words for the two types, and self-describing — `select` rather than '
      + '`selectable`, `dismissible` rather than `removable`. `select` LEADS because it is the code default and '
      + 'Figma\'s default member. DISJOINT from Badge\'s canonical set, the loud kind of divergence: a badge type '
      + 'is a content kind and a tag type an interaction kind, and no value would mean the same thing on both '
      + 'defs, so none is shared. Two values and not the three interactions it replaces (clickable | selectable '
      + '| removable): the plain clickable tag was dropped, and an action in place is a button.',
  },
  {
    axis: 'type',
    values: ['unordered', 'ordered', 'icon'],
    defs: ['list-item', 'list'],
    relation: 'disjoint',
    reason:
      'Which MARKER a list shows (owner decisions Q273.1 and Q273.3, #2319): bullets for a list whose order carries no '
      + 'meaning (`<ul>`), numbers for one whose order does (`<ol>`), or an icon before each item (a `<ul>` with an icon '
      + 'marker). The HTML words for the first two, so the value names the element a developer writes. `unordered` LEADS '
      + 'because it is the code default and Figma\'s default member. DISJOINT from Badge\'s canonical set, the loud kind of '
      + 'divergence: a badge type is a content kind and a list type a marker kind, and no value would mean the same thing '
      + 'on both defs, so none is shared. Shared by List and List.Item because the List passes its type to every item '
      + '(`follow`), so the two must hold one set; one entry records both, and a drift between them fails here.',
  },
  {
    axis: 'type',
    values: ['chevron', 'slash'],
    defs: ['_breadcrumb-separator'],
    relation: 'disjoint',
    reason:
      'Which LOOK the mark between breadcrumb steps takes (owner decision Q382 A, which names the axis `type`): a chevron '
      + 'pointing toward the current page, or a slash. `chevron` LEADS because it is the code default and Figma\'s default '
      + 'member. DISJOINT from Badge\'s canonical set, the loud kind of divergence: a badge type is a content kind and a '
      + 'separator type a glyph, and no value would mean the same thing on both defs. The item picks it by its own '
      + '`separator` axis, which holds the same two values.',
  },
  // `indicator` IS GONE FROM THE REGISTER (#1338), and its absence is the point rather than an omission —
  // the same shape the `intent` note below records. field-label carried a three-way
  // `[none/required/optional]` axis whose most important value was ABSENCE, which is exactly why it never
  // projected to Figma. The owner decision (2026-09-13) reconciled it into Prism 2's `Required` BOOLEAN
  // (default true) — a node-visibility toggle, not a variant axis — so no def declares `indicator` as a
  // variant axis any more, and a register entry no def uses is what ARM B fails as stale. Removed, the
  // register is true again; the marker's presence now lives on `figmaProperties.booleans`, which this
  // register (a VARIANT-axis census) does not cover.
  //
  // `intent` IS GONE FROM THE REGISTER (#1225), and its absence is the point rather than an omission.
  // #1223 made Button's intents three COMPONENTS and left `icon-button` carrying `intent` as an axis of
  // its own, with the entry here scoped to `['icon-button']` alone and its reason naming the open sibling
  // question: whether icon-button should split the same way. #1225 answers it — it does — so NO def
  // declares `intent` as a variant axis any more, and a register entry no def uses is exactly what ARM B
  // fails as stale. The concept survives as component identity (the `interactive.<family>` binding), which
  // is not a variant axis and so is not this register's subject. Left as a `sole` entry it would go red on
  // this very PR; removed, the register is true again.
  {
    axis: 'name',
    values: [
      'arrow-down', 'arrow-down-left', 'arrow-down-right', 'arrow-left', 'arrow-right', 'arrow-up',
      'arrow-up-left', 'arrow-up-right', 'check', 'check-circle', 'check-circle-filled',
      'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up', 'close', 'close-filled',
      'error-circle', 'error-circle-filled', 'external-link-filled', 'eye', 'eye-filled', 'eye-off',
      'eye-off-filled', 'FPO-default-icon', 'home', 'image', 'info-circle', 'info-circle-filled', 'link', 'menu', 'minus', 'minus-filled',
      'more-horizontal-filled', 'more-vertical-filled', 'pause-circle', 'play-circle', 'plus', 'plus-circle', 'plus-circle-filled',
      'plus-filled', 'resize-grip', 'search', 'slash', 'warning-triangle', 'warning-triangle-filled',
    ],
    defs: ['icon'],
    relation: 'sole',
    reason:
      'The only axis in the corpus a def does not author: these are `ICON_NAMES`, spread from the icon '
      + 'set, so `icon.ts` cannot spell one wrong and the synonym failure mode this whole register guards '
      + 'has no way in. Declared here anyway, at full width, because the register\'s claim is that every '
      + 'set is accounted for — an axis exempted for being safe is an axis nobody is watching.',
  },
  {
    axis: 'offset',
    values: ['control', 'field'],
    defs: ['focus-ring'],
    relation: 'sole',
    reason:
      'How far the ring sits from what it surrounds, named for the two KINDS of thing it surrounds rather '
      + 'than for the distances — a control hugs, a field stands off. Naming the distances (`tight`/`loose`) '
      + 'would pin the values to numbers that brands re-derive.',
  },
  {
    axis: 'selection',
    values: ['unchecked', 'checked', 'indeterminate'],
    defs: ['checkbox-control'],
    relation: 'canonical',
    reason:
      'The canonical set because it is the widest and it is ARIA\'s own vocabulary: `aria-checked` covers '
      + 'checkbox, radio AND `role="switch"`, and its third value `mixed` is this set\'s `indeterminate`. '
      + '`unchecked` leads because the first value is the rest coordinate (see `values` above). The axis '
      + 'NAME was settled for the whole family in `VARIANT_AXES` and the values deliberately left open; '
      + 'this register is where that open half is finally accounted for. The checkbox ROW dropped this axis '
      + 'in #1330 — it EXPOSES `checkbox-control`\'s selection rather than declaring its own — so only the '
      + 'atom names it now; the Row is gone from this entry because it no longer carries a `selection` axis.',
  },
  {
    axis: 'selection',
    values: ['unchecked', 'checked'],
    // Since #1348 the `selection` axis lives on `radio-control` (the painted circle/dot), not the `radio`
    // ROW (which exposes it). The row no longer declares it — the atom does.
    defs: ['radio-control'],
    relation: 'subset',
    reason:
      'Checkbox\'s vocabulary minus `indeterminate`, which a mutually-exclusive choice does not have — '
      + '`radio-control.ts` (the atom that carries the axis since #1348) argues it from the brief\'s own '
      + '`no-indeterminate` line, and notes that an ABSENCE is not a value you can declare. The cheapest '
      + 'kind of divergence: every value it does carry means exactly what it means in canonical, so the '
      + 'two line up without a translation.',
  },
  {
    axis: 'selection',
    values: ['off', 'on'],
    // Since #1354 the `selection` axis lives on `switch-control` (the painted track/thumb), not the
    // `switch` ROW (which exposes it). The row no longer declares it — the atom does.
    defs: ['switch-control'],
    relation: 'disjoint',
    reason:
      'Argued and correct (#930), and the reason this gate is a register rather than a uniformity rule. '
      + 'Three grounds: paint-key values describe what is on SCREEN and appear in no ARIA tree; '
      + '`role="switch"` is ANNOUNCED "on"/"off", which is the whole reason the role exists rather than '
      + 'reusing `role="checkbox"`; and `checked` carries this component\'s most common misuse, since a '
      + 'switch spelled `[unchecked, checked]` reads as a checkbox with a different skin. Disjoint is the '
      + 'LOUD kind of divergence — a consumer lining the sets up sees at once that they do not, which is '
      + 'why this costs less than `tone`\'s overlap below despite looking like the bigger break.',
  },
  {
    axis: 'selection',
    values: ['unselected', 'selected'],
    defs: ['tag', 'tab-item', 'segmented-control-segment', 'link'],
    relation: 'disjoint',
    reason:
      'A selectable tag\'s two values, in the words the Tag brief uses (§4, §15) — `selected` is what a filter '
      + 'or choice tag IS, and no one ARIA word fits it: its state rides aria-pressed on a button, aria-checked on '
      + 'a role="checkbox", or aria-selected on a listbox option, depending on the role its GROUP takes. Borrowing '
      + 'checkbox\'s `[unchecked, checked]` would claim the checkbox\'s ARIA state for every filter tag, which is '
      + 'the one of the three the brief lists last. Disjoint, the loud kind: a consumer lining the sets up sees at '
      + 'once they do not match. `unselected` leads because it is the rest coordinate. The spelling is an '
      + 'axis-value choice held for the owner in the Tag PR (2026-09-27). Tab joins it (#2416, owner Q177.2): a '
      + 'tab\'s state IS aria-selected, so `selected` is its ARIA word too, and one spelling serves both. A segmented '
      + 'control\'s option joins it (#2418, owner Q269): Tag\'s values, its state riding aria-current or a native radio. A standalone Link joins it for the current page in a navigation (#2872, owner Q507.3 A): its code prop is `current`, rendering aria-current="page".',
  },
  {
    axis: 'size',
    values: ['medium', 'small', 'large'],
    defs: ['_accordion-indicator', 'accordion', 'button', 'button-destructive', 'button-neutral', 'icon-button', 'icon-button-destructive', 'icon-button-neutral', 'flush-icon-button', 'flush-icon-button-destructive', 'flush-icon-button-neutral', 'checkbox-control', 'checkbox-row', 'checkbox-group', 'radio-control', 'radio-row', 'radio-group', 'tag', 'tab-item', 'tabs', 'list-item', 'list', 'segmented-control-segment', 'segmented-control', 'link', 'text-field', 'select', 'textarea', 'dialog', 'password-field', 'counter', 'search-field'],
    relation: 'canonical',
    reason:
      'The three-rung ladder, led by `medium` (#2752, owner decision Q1 B, 2026-10-16). Canonical on weight of use: '
      + 'every def with a size axis except field-label and the two switch defs below, the button and icon-button '
      + 'siblings among them by way of their shared factories (#1223, #1225). The first value is the set\'s first '
      + 'member, which is Figma\'s default variant, so medium first makes the inserted control the code default. '
      + 'The fields (#2266, Q221 B) and Dialog (#2609, Q303) led with medium first; Q1 B gave every ladder their '
      + 'order, superseding #2501\'s smallest-to-largest (Q213). The code enum (`props.size`) keeps the ladder\'s own '
      + 'order. Rungs are named rather than numbered so a brand can re-derive the dimensions behind them without '
      + 'the names going stale.',
  },
  {
    axis: 'size',
    values: ['medium', 'small', 'large', 'xlarge'],
    defs: ['code-input', 'code-input-cell'],
    relation: 'superset',
    reason:
      'Code input\'s four cell sizes (#2428, owner decision Q330 A): the field ladder plus `xlarge`, the 68×72 display '
      + 'cell with a 40px character meant for four-character codes. Led by `medium`, the code default and so the set\'s '
      + 'first member (owner decisions Q347 and Q359), as every size ladder is (#2752, Q1 B); the code enum keeps the '
      + 'ladder\'s own order (`lint-rung-names.ts` DEFAULT_FIRST). The cell carries the same values, so it follows the '
      + 'field\'s size by name.',
  },
  {
    axis: 'size',
    values: ['small', 'medium', 'large'],
    defs: ['field-label'],
    relation: 'reordered',
    reason:
      'The canonical ladder, led by `small` because the label\'s code default is small: the 12px label, one body step '
      + 'below the medium field it labels. Leading with the code default is Q1 B\'s own rule (#2752), so the member '
      + 'Figma inserts is the label code renders by default. Every field host passes its own size through by `follow`, '
      + 'so the nested label takes the field\'s size whatever this set\'s first member is.',
  },
  {
    axis: 'size',
    values: ['x-small', 'small', 'medium', 'large'],
    defs: ['spinner'],
    relation: 'superset',
    reason:
      'The ICON ladder (16 / 20 / 24 / 32), not the control ladder, because a spinner (#1670) drops into an icon '
      + 'slot and is sized as the glyph it stands in for. The words are `icon`\'s own size prop enum and bind the '
      + 'same `icon.size.{xs,sm,md,lg}` rungs, so `x-small` is the rung below `small` rather than a new vocabulary. '
      + 'It is a superset of canonical by words only: `small` here is a 20px glyph where a small BUTTON is a '
      + '36px control, the same split `icon`\'s header records. No paint key crosses `size`, so the leading '
      + '`x-small` is a rest coordinate nothing falls through to.',
  },
  {
    axis: 'size',
    values: ['medium', 'small'],
    // The `switch-row` ROW keeps `size` (it scales the label ramp, gap and row height) and passes it through
    // to the nested `switch-control` by `follow`; the atom declares the same two-rung ladder (#1354).
    // Breadcrumbs and its item join it (#2666, owner call 7 A): one line of 14 or 16px body text, and an 18px trail
    // stops reading as secondary wayfinding.
    defs: ['switch-row', 'switch-control', 'breadcrumbs', 'breadcrumb-item', 'progress'],
    relation: 'subset',
    reason:
      'The ladder minus its top rung, for a def with no large form, led by medium as canonical is (#2752 Q1 B): a switch above medium stops reading '
      + 'as a control. Same vocabulary, shorter — `small` and `medium` mean the same dimensions they mean '
      + 'in canonical, which is what makes this weighable instead of a second ladder. `field-label` shared '
      + 'this entry until #872 and now takes the full three: the reason given for its shortness ("a label '
      + 'tracks the field it labels rather than setting its own scale") turned out to be the argument FOR '
      + 'three, since `text-field` and `textarea` have declared three rungs since tranche 1. `progress` (#2670) joins for its '
      + 'RING: 40px and 24px on the icon ladder, with no large form; a linear bar has one thickness and is built at `medium` only.',
  },
  {
    axis: 'shape',
    values: ['square', 'circular'],
    defs: ['icon-button', 'icon-button-destructive', 'icon-button-neutral'],
    relation: 'canonical',
    reason:
      'The icon button\'s CORNER SILHOUETTE (#1353, owner-decided) — `square` a rounded rectangle at the '
      + 'button\'s normal radius (`radius.md`), `circular` a full-round disc (`radius.round`). PURE GEOMETRY: '
      + 'the two values differ only in the container\'s corner radius and are token-identical in colour, state '
      + 'and every other binding, which is why it is a 2-value AXIS and not a component split (the #1225 '
      + 'contrast — intent became components because each carried a different colour binding; shape carries '
      + 'none). `square` LEADS because it is the default and the byte-identical pre-#1353 geometry. `sole`, '
      + 'and shared by the three icon-button components BY DESIGN — one shared anatomy through `makeIconButton`, '
      + 'so the three carry identical values and this one entry records all three. Distinct from `size` (a '
      + 'scale rung), `ratio` (a width-to-height proportion) and `style` (a line treatment) — argued in '
      + '`VARIANT_AXES`. CANONICAL since #2457 added a second `shape` set (below): it came first and is shared by three '
      + 'defs.',
  },
  {
    axis: 'shape',
    values: ['flush', 'round'],
    defs: ['flush-icon-button', 'flush-icon-button-destructive', 'flush-icon-button-neutral'],
    relation: 'disjoint',
    reason:
      'The flush icon button\'s two shapes (#2457, owner decision Q287 A: "one component with two shapes"). NOT pure '
      + 'geometry, unlike the canonical set: `flush` is the bare glyph square with no paint, and `round` a circle with a '
      + 'decorative edge and a hover wash, so the two differ in size, corner AND paint. DISJOINT, and the pair is named '
      + 'here on purpose because it is the near-overlap this register exists to flag: `round` draws the same full-round '
      + 'corner IconButton calls `circular`. The owner\'s decision spells it `round`, and the canonical set has no `flush`, '
      + 'so the two sets are not one ladder; the owner kept `round` (Q295.5 A). Shared by the three flush icon-button '
      + 'components BY DESIGN (Q295.2 B, one anatomy through `makeFlushIconButton`), so this one entry records all three. '
      + '`flush` LEADS because it is the code default and the shape built first, so Figma\'s inserted member is flush.',
  },
  {
    axis: 'shape',
    values: ['linear', 'circular'],
    defs: ['progress'],
    relation: 'overlapping',
    reason:
      'Progress\'s two drawings (#2670, owner calls 1 and 10 A): a bar that fills its container, or a ring for a small '
      + 'space. OVERLAPPING with the canonical set on `circular`, and that shared word is the near-overlap this register '
      + 'exists to flag: on IconButton `circular` is a corner silhouette (a disc at `radius.round`), here it is a whole '
      + 'drawing, a ring with an arc. The two never meet on one def and no paint key crosses either axis, so the word '
      + 'reads the same to a designer (round) without the sets being one ladder. `circular` is the brief\'s own word '
      + '(`variant: linear | circular`), the approved proposal\'s axis table, and MUI\'s `CircularProgress`. `linear` '
      + 'LEADS because it is the code default and Figma\'s default member (owner Q347).',
  },
  {
    axis: 'style',
    values: ['outline'],
    defs: ['text-field', 'textarea', 'password-field', 'search-field'],
    relation: 'canonical',
    reason:
      'An axis of ONE, declared rather than dropped. Underline is a BRAND choice since #2695 (the Field style '
      + 'lever, applied to the def before projection), not a value here: a second value would be a per-instance '
      + 'code coordinate, which Q14 A rules out. The axis keeps filled a place to land without a later API break. '
      + 'The cost of an axis of one is real (`modifiers`, #845) and it is being paid deliberately here. '
      + '`canonical` since Link (#2580) declared a second `style` set against it.',
  },
  {
    axis: 'style',
    values: ['standalone', 'inline'],
    defs: ['link'],
    relation: 'disjoint',
    reason:
      'Where a link sits, and so how it shows it is a link (owner decision Q289.2 A): `standalone` on its own line, '
      + 'underlined at hover, pressed and focus because its placement carries the cue; `inline` in body copy, '
      + 'underlined at every state because color alone fails SC 1.4.1. The same kind of distinction as the field\'s '
      + '`style` (a line treatment), hence the name. DISJOINT, the loud kind: a field outline and a link placement '
      + 'share no value that would mean the same thing on both. `standalone` LEADS, the code default and so Figma\'s '
      + 'default member. No `quiet` for now (Q289.2 A).',
  },
  {
    axis: 'surface',
    values: ['default', 'inverse'],
    defs: ['button', 'button-destructive', 'button-neutral', 'icon-button', 'icon-button-destructive', 'icon-button-neutral', 'flush-icon-button', 'flush-icon-button-destructive', 'flush-icon-button-neutral', 'focus-ring', 'link'],
    relation: 'sole',
    reason:
      'The ground a control sits on (#1134): `default` the page, `inverse` a dark or brand-filled band. THE '
      + 'ONE name the bounded inverse set uses (docs/20 §9.11), so a host and a component it nests share it '
      + 'by name and can pass it through — `button` carries `surface` and its nested `focus-ring` carries '
      + '`surface`, which is what lets `button`\'s `follow: [\'surface\']` drive the ring\'s coordinate. The '
      + 'icon-button siblings (`icon-button`, `icon-button-destructive`, `icon-button-neutral`) join the set '
      + 'in #1427, following `button` 1:1 apart from the `shape` axis — each carries `surface` and drives its '
      + 'nested `focus-ring` by the same `follow: [\'surface\']`, and its inverse fill inherits the shared '
      + '`inverse.interactive.<family>.fill` role (white/black at rest since #1384, stepped 2 rungs per state since #1456). '
      + 'The flush icon-button siblings join in #2668 (Q386): no fill, so the axis changes the glyph ink only, for the Toast\'s close. '
      + '`focus-ring`\'s axis was `color` until #1134 renamed it here; the two are one entry now because they '
      + 'are one distinction. ORDER matters as everywhere here: `default` is the rest coordinate the '
      + 'projector\'s inverse rewrite falls through to (an `inverse` coordinate binds `color.inverse.*`, a '
      + '`default` one the bare role).',
  },
  {
    axis: 'tone',
    values: ['neutral', 'info', 'success', 'warning', 'danger'],
    defs: ['badge'],
    relation: 'overlapping',
    reason:
      'Which semantic role a badge paints from — the same kind of distinction as `icon`\'s ink `tone`, which is why '
      + 'it takes that name rather than a new one. OVERLAPPING, the relation this register calls dangerous, and '
      + 'named as such on purpose: the four shared values (`info`, `success`, `warning`, `danger`) are spelled '
      + 'as the token tier spells them in BOTH sets, so a shared value means the same role in each. The divergence '
      + 'is at the ends: `neutral` leads here (the default, a gray label on a gray surface), where `icon` has '
      + '`inherit` (no pinned ink) and the rank words `primary`/`secondary`/`tertiary`/`brand`. A badge paints a '
      + 'surface as well as ink, so `inherit` has no meaning for it, and a rank word would name a text role for a '
      + 'fill. The brief spells the failure tone `error`; it is `danger` here so it matches `icon` and the ref.',
  },
  {
    axis: 'tone',
    values: [
      'inherit', 'primary', 'secondary', 'tertiary', 'brand', 'success', 'warning', 'danger', 'info',
    ],
    defs: ['icon'],
    relation: 'canonical',
    reason:
      'The semantic-ink vocabulary — `icon`\'s only axis. #1334 split the overloaded name (field-message/'
      + 'select\'s validation set → `status`, field-label\'s → `emphasis`), which left this set `sole`; it is '
      + '`canonical` again now `badge` describes its tone set against it. Its values ARE the token names they '
      + 'resolve to (`danger` → `color.icon.danger`), which is why it is the one the others are read against. '
      + '`inherit` leads and binds NOTHING — `currentColor` is the absence of a pinned '
      + 'ink, and it is the default, which is why this axis is not projected to Figma at all.',
  },
  {
    axis: 'tone',
    values: ['info', 'success', 'warning', 'danger'],
    defs: ['banner'],
    relation: 'subset',
    reason:
      'How serious a banner\'s message is (#2579, owner decision Q327.1 A): the four status roles, spelled as the token '
      + 'tier spells them, so a value names the same role as in `icon` and `badge`. No `neutral` (Q327.1 declined it) and no '
      + 'rank words or `inherit`: a banner paints a tinted surface and an edge, which only a status role has. `info` LEADS '
      + 'because it is the code default and Figma\'s default member (Q347).',
  },
  {
    axis: 'status',
    values: ['default', 'error', 'warning', 'success'],
    defs: ['field-message', 'select', 'text-field', 'textarea', 'password-field', 'search-field'],
    relation: 'canonical',
    reason:
      'A form field\'s VALIDATION OUTCOME. RENAMED from `tone` to `status` in #1334 (the owner\'s split of '
      + 'the overloaded `tone`): this set was recorded here as `overlapping` with `icon`\'s ink vocabulary '
      + '— it agrees on `success`/`warning` and spells the failure ink `error` where the ink axis spells it '
      + '`danger` — and that overlap-that-read-as-alignment was #934\'s finding and #756\'s failure mode. '
      + 'The split resolves it: a validation outcome is not an ink role, so it is its own axis. `sole` now, '
      + 'and shared by four defs BY DESIGN, not by coincidence — `select` (and `text-field` since #1494, '
      + '`textarea` since the #1623 sign-off) each '
      + 'spell their validation axis `status` so the nested `field-message` follows it by name (`nest-fixed` '
      + '`follow`), a same-name same-value passthrough, so all of them must carry identical values and this one '
      + 'entry records them. '
      + '`error` (not `danger`) mirrors the closed `STATES` vocabulary a validation outcome tracks; the '
      + '`error → danger` ink mapping lives in `lint-paint.ts` as a named provenance exception.',
  },
  {
    axis: 'status',
    values: ['default', 'error'],
    defs: ['checkbox-control', 'checkbox-row', 'checkbox-group', 'switch-control', 'switch-row', 'radio-control', 'radio-row', 'radio-group', 'code-input'],
    relation: 'subset',
    reason:
      'The choice controls\' validation outcome (owner Q354, #2751): every control that can be invalid takes the '
      + 'fields\' `status` axis, and a checkbox, switch or radio has an error look and no warning or success look, '
      + 'so it carries the canonical set\'s first two values. A shared value means exactly what it means on a '
      + 'field, which is what lets a group follow its `status` into its rows and its nested `field-message` by '
      + 'name. The canonical set became `canonical` (from `sole`) when this one joined. Code input (#2428, owner '
      + 'decision Q321.9 A) carries the same two: a one-time code is right or wrong, and a right code moves the user '
      + 'on, so success is the page\'s to announce and warning has no case.',
  },
  {
    axis: 'status',
    values: ['active', 'complete', 'error'],
    defs: ['progress'],
    relation: 'overlapping',
    reason:
      'Progress\'s END STATE (#2670, owner call 4 A): the work is running, finished, or failed. OVERLAPPING with the '
      + 'canonical validation set on `error` only, and the shared value means the same thing on both: a failure, '
      + 'shown with FieldMessage\'s error glyph and caption (Progress nests it at `error`), so an error looks one way '
      + 'across components (owner Q352/Q354). The other two differ because they name a different thing: `active` is '
      + 'work in progress, which a field has no word for, and `complete` maps to the nested message\'s `success`, '
      + 'which a progress bar does not say ("Upload complete" is an outcome, not a validation). `active` LEADS because '
      + 'it is the code default and Figma\'s default member.',
  },
  {
    axis: 'width',
    values: ['auto', 'full'],
    defs: ['button', 'button-destructive', 'button-neutral'],
    relation: 'canonical',
    reason:
      'CANONICAL since the banner took the axis name (#2579): the set its `contained | full` is described against. '
      + 'Whether the button takes its content\'s width or its container\'s — two values because there is no '
      + 'third that is not a layout concern belonging to the container. Named for the BEHAVIOR rather than '
      + 'a measurement, so it survives a brand re-deriving its dimensions.',
  },
  {
    axis: 'width',
    values: ['contained', 'full'],
    defs: ['banner'],
    relation: 'overlapping',
    reason:
      'Where a banner sits (#2579, owner decision Q327.3 A): a rounded box inside a section, or square-cornered across the '
      + 'page. OVERLAPPING, argued: `full` means the same thing in both sets, the container\'s whole width, and that is why '
      + 'the name is shared rather than a new `placement` (a schema change Q327.3 declined). `contained` replaces `auto` '
      + 'because a banner never hugs its content; it fills its section either way. `contained` LEADS because it is the '
      + 'code default and Figma\'s default member (Q347).',
  },
  {
    axis: 'weight',
    values: ['regular', 'bold'],
    defs: ['field-label'],
    relation: 'canonical',
    reason:
      'How heavy the label reads, held apart from how big it is — Prism 2\'s third form-label control '
      + '(#1248, completing #872), whose enum is `["Regular", "Bold"]` and whose Bold variants cross size '
      + 'in full. VALUES ARE PRISM 2\'S WORDS, not the type-role names the two resolve to: `bold` binds '
      + '`type.body.{size}.strong` and `strong` is weight 700, which is what Inter calls Bold — measured '
      + 'against the reference spec, since `emphasis` (600) is the nearer-looking role and the wrong one. '
      + 'Naming the values `default`/`strong` would pin the axis to `type.body.*`\'s cells, which a def '
      + 'binding a different tier does not share. TWO values and not the weight-role ladder\'s five '
      + '(`subtle`, `default`, `emphasis`, `strong`, `max`): this axis is what a designer CHOOSES on a '
      + 'component, not what the type scale can express, and Prism 2 offers two. `canonical` since Link (#2580) '
      + 'declared a second `weight` set against it.',
  },
  {
    axis: 'weight',
    values: ['emphasis', 'default'],
    defs: ['link'],
    relation: 'disjoint',
    reason:
      'How heavy a link\'s label reads (owner decision Q289.3 B): `emphasis` binds `type.label.<rung>.emphasis[-link]`, '
      + 'the common footer and form look and the default, so it LEADS; `default` binds `type.label.<rung>.default[-link]`, '
      + 'the weight of body text. VALUES ARE THE WEIGHT-ROLE NAMES the two bind, unlike field-label\'s intents: a link '
      + 'binds the label tier\'s two roles by name and needs no brand-resolved intent. DISJOINT from field-label\'s '
      + '`regular | bold`, the loud kind, and argued: `bold` there resolves to the heaviest body cut (`strong`), which '
      + 'is not `emphasis`, so no shared value would mean the same thing on both. The axis name and its two values '
      + 'are the build\'s pick from the owner\'s example, held as an owner item in the PR.',
  },
  {
    axis: 'value',
    values: ['dark', 'light'],
    defs: ['veil'],
    relation: 'sole',
    reason:
      'The media veil\'s POLARITY (#1030) — a dark wash under light text, a light wash under dark text, '
      + 'in the color-theory sense of value (lightness, held apart from hue). LOWER-CASE, and that is '
      + 'enforced rather than stylistic: the values are the paint keys\' lead segment (`dark.subtle`) and '
      + '`lint-paint.ts` arm 1 checks that lead against the veil role it binds (`color.veil.dark.subtle`), '
      + 'so `dark`/`light` is what lets arm 1 cover every fill with no exemption — a UI may still label it '
      + '"Dark". TWO values because a wash has one polarity or the other; there is no third. Distinct from '
      + '`tone` (which semantic ink role) and `surface` (which ground a control sits on) — this is the '
      + 'wash\'s own lightness, argued in `VARIANT_AXES`.',
  },
  {
    axis: 'intensity',
    values: ['medium', 'subtle', 'strong'],
    defs: ['veil'],
    relation: 'sole',
    reason:
      'The media veil\'s MAGNITUDE (#1030) — how much the wash mutes the image, weakest to strongest, '
      + 'binding `veil.{value}.{subtle,medium,strong}` at each rung. RENAMED FROM WCAG FLOORS in #1317: a '
      + 'rung named for a floor it clears (`body`/`enhanced`) claimed a per-image contrast guarantee the '
      + 'engine cannot keep, so the rungs name the magnitude instead. THREE values, matching the three '
      + 'alpha steps each polarity emits. Distinct from `weight` (type heaviness) and `appearance` (a '
      + 'control\'s emphasis/render strategy) — this is the strength of an overlay, argued in `VARIANT_AXES`. '
      + 'ORDERED medium, subtle, strong (#2752, owner decision Q347 A): the first value is the member Figma '
      + 'inserts, and the code default is `medium`.',
  },
  {
    axis: 'direction',
    values: ['full', 'from-top', 'from-bottom', 'from-left', 'from-right'],
    defs: ['veil'],
    relation: 'sole',
    reason:
      'The media veil\'s SPATIAL DISTRIBUTION (#1318, owner-decided 2026-09-28) — a solid wash over the '
      + 'whole image (`full`, the default and every member before #1318), or the intensity at one named '
      + 'edge fading linearly to clear at the opposite one: Prism 2\'s `Gradient from top/bottom/left/right`. '
      + 'FIVE values — the solid wash and the four edges; no corner or radial form, which the owner did not '
      + 'decide. `from-*` names the edge that carries the wash, so `from-top` is strongest at the top. '
      + 'Distinct from `intensity` (how strong the wash is) and `offset`/`style`/`shape` — this is where the '
      + 'wash sits across the surface, argued in `VARIANT_AXES`.',
  },
  {
    axis: 'orientation',
    values: ['horizontal', 'vertical'],
    defs: ['divider'],
    relation: 'sole',
    reason:
      'The divider\'s RUN (#2455, the owner\'s issue, DRAFT) — which way the rule runs across its container: '
      + 'spanning its width between content stacked above and below (`horizontal`, the default and the code '
      + 'default, first so it is Figma\'s default member), or its height between items side by side (`vertical`). '
      + 'The same word and values as ARIA\'s `aria-orientation`. Distinct from `direction` (where a veil\'s wash '
      + 'sits across an image) and `width` (how much of its container a control takes), argued in `VARIANT_AXES`.',
  },
  {
    axis: 'expansion',
    values: ['collapsed', 'expanded'],
    defs: ['_accordion-indicator', 'accordion'],
    relation: 'sole',
    reason:
      'Whether a disclosure shows its content (#2417, owner Q182 and Q183): the accordion\'s panel present or not, and its '
      + 'indicator turned to match. `collapsed` LEADS because it is the code default (an accordion opens closed) and so '
      + 'Figma\'s default member. Shared by the accordion and its building-block indicator, which follows the accordion\'s '
      + 'value. Distinct from `selection` (a value the user picks) and the state axis (a transient interaction), argued in '
      + '`VARIANT_AXES`.',
  },
  {
    axis: 'iconPosition',
    values: ['leading', 'trailing'],
    defs: ['accordion'],
    relation: 'sole',
    reason:
      'Which side of the title the accordion\'s indicator sits on (#2417; the axis owner Q182, the values owner Q242): '
      + 'before it or after it, following text direction. `leading` LEADS because it is the owner\'s default and the code '
      + 'default: a leading indicator stays beside the title when the page is zoomed (WCAG 1.4.10). The words are Button\'s '
      + 'leading and trailing visuals and Switch row\'s `labelPosition`, a prop there and not an axis, so this set has no '
      + 'other def to stand in a relation with. In right-to-left text leading is the right edge and nothing mirrors. '
      + 'Distinct from `direction` and `orientation`, argued in `VARIANT_AXES`.',
  },
  {
    axis: 'placement',
    values: ['center', 'bottom', 'full', 'end'],
    defs: ['dialog'],
    relation: 'sole',
    reason:
      'Where a layer sits over the page (#2609, owner decision Q303.1): centered, attached to the bottom edge as a bottom '
      + 'sheet, filling a small screen, or attached to the end edge as a side sheet (#2877, Q483 A, named `end` by Q488 A: '
      + 'the writing direction\'s end, so it mirrors in right-to-left text and a `start` can join it with no rename). `center` LEADS because it is the code '
      + 'default on every screen and Figma\'s default member. One def carries it, so there is no other to stand in a '
      + 'relation with. Distinct from `alignment` and `direction`, argued in `VARIANT_AXES`.',
  },
  {
    axis: 'kind',
    values: ['ancestor', 'current', 'overflow'],
    defs: ['breadcrumb-item'],
    relation: 'sole',
    reason:
      'Which role a step plays in its trail (#2666, owner call 1 A): a link to a page above, the current page as text, '
      + 'or the button standing for collapsed steps. `ancestor` LEADS because it is the code default and Figma\'s '
      + 'default member, the commonest step. One def carries it. Distinct from `type`, argued in `VARIANT_AXES`.',
  },
  {
    axis: 'separator',
    values: ['chevron', 'slash'],
    defs: ['breadcrumbs', 'breadcrumb-item'],
    relation: 'sole',
    reason:
      'Which mark stands between the steps of a trail (owner decision Q382 A): a chevron or a slash, one setting for the '
      + 'whole trail. `chevron` LEADS because it is the code default and Figma\'s default member. Shared by Breadcrumbs and '
      + 'BreadcrumbItem because the trail passes it to every ancestor (`follow`), so the two must hold one set. The same '
      + 'two values as `_breadcrumb-separator`\'s `type`, which the item picks by them. Distinct from `indicator` and '
      + '`style`, argued in `VARIANT_AXES`.',
  },
  {
    axis: 'path',
    values: ['full', 'parent'],
    defs: ['breadcrumbs'],
    relation: 'sole',
    reason:
      'How much of the route the navigation shows (#2666, owner calls 1 A and 11 A; named `layout` first and renamed by '
      + 'Q424 A, because the Button group holds `layout`): the full trail, or one link up to the parent for a small '
      + 'screen. `full` LEADS because it is the code default and Figma\'s default member. One def carries it. Distinct '
      + 'from `width` and `footer`, argued in `VARIANT_AXES`.',
  },
  {
    axis: 'intent',
    values: ['neutral', 'success'],
    defs: ['toast'],
    relation: 'sole',
    reason:
      'What a toast confirms (#2668, owner call 2 A): a plain confirmation, or a completed action with a circled check. '
      + 'No danger, warning or info: a message the user must see goes to a banner (call 1 A). `neutral` LEADS because it '
      + 'is the code default and Figma\'s default member. The axis returns here as a variant axis after #1225 retired it '
      + 'from the button families (where intent became the component): a toast\'s two intents differ in one glyph and its '
      + 'ink, not in a family of interactive colors, so they are members of one set. One def carries it.',
  },
  {
    axis: 'footer',
    values: ['inline', 'stacked', 'fill', 'none'],
    defs: ['dialog'],
    relation: 'sole',
    reason:
      'How a panel lays out its actions (#2609, owner decision Q303.6 A; `fill` by Q492 B, #2880): a row at the end '
      + 'edge, full-width buttons stacked, a row whose buttons share the width equally, or no footer. The first three '
      + 'nest the Button group\'s `layout` of the same name, in its order. `inline` LEADS because it is the code '
      + 'default and Figma\'s default member. One def '
      + 'carries it. Distinct from `orientation` and `alignment`, argued in `VARIANT_AXES`.',
  },
  {
    axis: 'layout',
    values: ['inline', 'stacked', 'fill'],
    defs: ['button-group'],
    relation: 'sole',
    reason:
      'How a group of buttons shares its space (#2661, owner decisions Q363 and Q363.9 B): a row at the end edge, a column '
      + 'of full-width buttons, or a row whose buttons share the width. `inline` LEADS because it is the code default and '
      + 'Figma\'s default member. One def carries it. Not Dialog\'s `footer`, whose `none` removes the part; the group is '
      + 'always there. Distinct from `orientation` and `alignment`, argued in `VARIANT_AXES`.',
  },
  {
    axis: 'indicator',
    values: ['chevron', 'plus-minus'],
    defs: ['_accordion-indicator'],
    relation: 'sole',
    reason:
      'Which pair of glyphs the accordion\'s indicator shows (#2417, owner Q183): a chevron, down closed and up open, or a '
      + 'plus that becomes a minus. `chevron` LEADS because it is the field\'s default and the code default. An axis of the '
      + 'BUILDING BLOCK, exposed on the accordion, so a designer picks it once and it survives an expansion switch.',
  },
  {
    axis: 'ratio',
    values: ['4:3', '2:3', '3:4', '4:5', '1:1', '3:2', '16:9'],
    defs: ['image-placeholder'],
    relation: 'sole',
    reason:
      'The image placeholder\'s aspect PROPORTION (#1316) — a square, the classic photo ratio, and '
      + 'widescreen. The values ARE ratios (`parseRatio` reads `16:9` as 16/9 to derive the frame\'s '
      + 'aspect-ratio lock), which is why `anatomyErrors` refuses a `ratio` value that is not a positive '
      + '`W:H`: the lock is derived from the value rather than mapped by a second per-variant table. '
      + 'Distinct from `size` (a scale rung on a named ladder) and `width` (a single main-axis length) — '
      + 'this is a width-to-height proportion that holds while the actual dimensions flex, argued in '
      + '`VARIANT_AXES`. SEVEN values: the three the owner settled on in #1316, plus the portrait 2:3, 3:4 '
      + 'and 4:5 and the landscape 3:2 a measured commerce file needed (#2345), ordered tallest to widest '
      + 'after a leading 4:3 (#2752, owner decision Q347 A): the first value is the member Figma inserts, and '
      + 'the code default is 4:3.',
  },
  {
    axis: 'alignment',
    values: ['start', 'center'],
    defs: ['tabs'],
    relation: 'sole',
    reason:
      'Where a tab list sits in its bar (#2518, owner Q222 A): at the start edge, as Tabs was approved (#2416), or '
      + 'centered in a bar that spans its placement, the baseline full width either way. `start` LEADS because it '
      + 'is the code default and every member before #2518.',
  },
  {
    axis: 'inset',
    values: ['default', 'flush'],
    defs: ['button', 'button-destructive', 'button-neutral'],
    relation: 'canonical',
    reason:
      'CANONICAL since the divider took the axis name (#2455): the set its `none | inset | middle-inset` is described against. '
      + 'Whether a text button keeps its inline padding (#2350, owner Q143 and Q145 A, name and values DRAFT): '
      + 'the button as authored, or with no inline padding on either side, so its label lines up with the '
      + 'content edge above and below whether it starts, ends or centers a row. `default` LEADS because it is '
      + 'the code default and every member before #2350. One value, not one per side: a flush button has no '
      + 'visible box, so the side it is not aligned to shows nothing either way. The text appearance only '
      + '(`excludeCoordinates`). Distinct from `width` (how much of the container it takes) and `offset` (a '
      + 'nested part\'s displacement) — this is whether the control has inline padding, argued in `VARIANT_AXES`.',
  },
  {
    axis: 'inset',
    values: ['none', 'inset', 'middle-inset'],
    defs: ['divider'],
    relation: 'disjoint',
    reason:
      'How far a divider\'s rule sits in from its container\'s edges (#2455, owner Q190.2 A, after the KB brief and '
      + 'Material 3): edge to edge, from the start, or from both ends. The same NAME as button\'s flush control because '
      + 'both say how far a box sits in from its container\'s edge, and the brief names the prop `inset`. DISJOINT, the '
      + 'loud kind: no value is shared, so a consumer lining up `default | flush` against these sees at once they are '
      + 'different ladders. `none` LEADS because it is the code default and the brief\'s default.',
  },
];

/** A reason shorter than this is a label, not a justification. Crude on purpose — see SCOPE above. */
const MIN_REASON = 80;

/**
 * FLOORS (`docs/34` shape 9). Every arm below is a statement about a set, so every arm passes
 * vacuously over an empty one — a broken import, a renamed directory or a `variants` field that
 * changed shape would take the census to zero and the gate would report clean. Nothing else in the
 * repo checks axis-value declarations, so a collapse here is unmitigated: there is no second gate to
 * notice that this one stopped looking.
 *
 * ── THE MARGIN IS A RULE, NOT A SNAPSHOT (#1267) ─────────────────────────────────────────────────
 *
 * Each floor is **the corpus minus one legitimate removal**, and the two floors differ in what one
 * removal costs them:
 *
 *   FLOOR_DEFS   — minus ONE def. A def can legitimately be retired, and the gate should survive that
 *                  without an edit; it should not survive two, because at that point something is
 *                  deleting defs rather than someone retiring one.
 *   FLOOR_PAIRS  — minus the WIDEST def's axis count, because removing a def takes ALL of its pairs
 *                  with it. Sized to the widest rather than the average: the floor has to tolerate
 *                  the most expensive single removal, or retiring the wrong def trips it.
 *
 * WHY THE FLOORS ARE AUTHORED AND NOT COMPUTED, since deriving them from the corpus is the obvious
 * next thought and it is `docs/34` shape 1: a floor computed from the thing it guards agrees with
 * that thing at every ref, including the ref where the census has collapsed to three. The number has
 * to come from outside the subject, which means a human types it.
 *
 * **NO LIVE COUNT IS WRITTEN DOWN HERE, deliberately, and that is the #1267 finding rather than a
 * style preference.** This block used to end "Measured on `d9c5b2d`: 11 tracked def files, 11 defs
 * carrying `variants`, 24 (def, axis) pairs" — three numbers, one of which was a category error and
 * two of which went stale. The corpus reached 13 defs and 34 pairs while the floors sat at 8 and 15,
 * so the gate was protecting a population less than two thirds of its actual size, and the comment a
 * reader would check that against confidently reported the wrong figures. The live population is
 * PRINTED on the success line instead, with each floor's slack beside it, so it is true at every ref
 * and visible without anyone mutating the gate to find out.
 *
 * (The category error is worth naming so it is not reintroduced: `11 tracked def files` and `11
 * defs` were not the same claim. `button.ts` exports THREE defs through `makeButton` — button,
 * button-destructive, button-neutral — and `icon-button.ts` now exports THREE through `makeIconButton`
 * (#1225), so the file count has never equalled the def count since #1223. `FLOOR_DEFS` counts DEFS,
 * which is what every arm below iterates.)
 */
const FLOOR_DEFS = 14;
const FLOOR_PAIRS = 33;

// ---- the corpus, read through git -----------------------------------------------------------------

const git = spawnSync('git', ['-C', repo, 'ls-files', DEFS_DIR], { encoding: 'utf8' });
if (git.status !== 0) {
  console.error(`\n❌ \`git ls-files ${DEFS_DIR}\` failed — the def list is this gate's ORACLE, so an absence here is not a pass.`);
  console.error(git.stderr || git.stdout);
  process.exit(1);
}
const tracked = git.stdout
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.endsWith('.ts'))
  .sort();

const defFiles = tracked.filter((f) => f !== REGISTRY);
if (defFiles.length === tracked.length) {
  console.error(`\n❌ the registry exclusion matched no tracked file — \`${REGISTRY}\` was renamed or moved.`);
  console.error('   Left unfixed, the registry re-enters the def set and re-exports every def, double-counting the corpus.');
  process.exit(1);
}

type Def = { id: string; variants?: Record<string, readonly string[]> };
const isDef = (v: unknown): v is Def =>
  !!v && typeof v === 'object' && typeof (v as Def).id === 'string';

/** def id → the file that exported it, so a duplicate id is reported against both files. */
const sourceOf = new Map<string, string>();
const defs: Def[] = [];
const dupes: string[] = [];
for (const file of defFiles) {
  const mod = await import(pathToFileURL(resolve(repo, file)).href);
  for (const v of Object.values(mod)) {
    if (!isDef(v)) continue;
    const prior = sourceOf.get(v.id);
    if (prior) { dupes.push(`'${v.id}' exported by both ${prior} and ${file}`); continue; }
    sourceOf.set(v.id, file);
    defs.push(v);
  }
}

/** Every (def, axis) pair in the corpus — ACTUAL. */
type Pair = { def: string; axis: string; values: readonly string[] };
const pairs: Pair[] = [];
for (const d of defs)
  for (const [axis, values] of Object.entries(d.variants ?? {}))
    pairs.push({ def: d.id, axis, values });

const failures: string[] = [];
const detail: string[] = [];
/** Identity of a (axis, values) pair. `JSON.stringify` rather than a delimiter join: the values are
 *  author-typed strings, so any separator character is a collision waiting to be typed, and the two
 *  control characters that could not collide turned this source file BINARY to `grep` and `file`
 *  — invisible in every diff, and a file text tooling silently skips is worse than a collision. */
const key = (axis: string, values: readonly string[]) => `${axis} ${JSON.stringify(values)}`;

if (dupes.length) {
  failures.push(`${dupes.length} def id(s) exported from more than one file`);
  detail.push('── duplicate def ids ──', ...dupes.map((d) => `  ${d}`));
}

// ---- FLOORS ---------------------------------------------------------------------------------------

if (defs.length < FLOOR_DEFS) {
  failures.push(`only ${defs.length} def(s) found, below the floor of ${FLOOR_DEFS} — the census collapsed and every arm below would pass vacuously`);
}
if (pairs.length < FLOOR_PAIRS) {
  failures.push(`only ${pairs.length} (def, axis) pair(s) found, below the floor of ${FLOOR_PAIRS} — the census collapsed and every arm below would pass vacuously`);
}

// ---- ARM A — every set a def uses is DECLARED, and the entry names that def ------------------------

const byKey = new Map<string, AxisValueSet>();
for (const e of AXIS_VALUE_SETS) byKey.set(key(e.axis, e.values), e);

const undeclared: string[] = [];
const unlisted: string[] = [];
for (const p of pairs) {
  const entry = byKey.get(key(p.axis, p.values));
  if (!entry) {
    undeclared.push(`${p.def} · ${p.axis}: [${p.values.join(', ')}]`);
    continue;
  }
  if (!entry.defs.includes(p.def))
    unlisted.push(`${p.def} · ${p.axis}: [${p.values.join(', ')}] — declared, but the entry does not name '${p.def}'`);
}
if (undeclared.length) {
  failures.push(`${undeclared.length} axis value set(s) no register entry declares`);
  detail.push(
    '── ARM A: undeclared value sets ──',
    ...undeclared.map((u) => `  ${u}`),
    '  Add an entry to AXIS_VALUE_SETS with the reason this set is the set it is, and the relation it',
    '  stands in to its axis\'s canonical entry. If the values match an existing entry exactly and in',
    '  ORDER, it is the order that differs — the first value is a rest coordinate, so it is a real change.',
  );
}
if (unlisted.length) {
  failures.push(`${unlisted.length} def(s) using a declared set the entry does not list`);
  detail.push('── ARM A: def not named by the entry it matches ──', ...unlisted.map((u) => `  ${u}`));
}

// ---- ARM B — every declared entry is USED, by exactly the defs it names ----------------------------

const actual = new Map<string, Set<string>>();
for (const p of pairs) {
  const k = key(p.axis, p.values);
  if (!actual.has(k)) actual.set(k, new Set());
  actual.get(k)!.add(p.def);
}

const stale: string[] = [];
const overclaimed: string[] = [];
for (const e of AXIS_VALUE_SETS) {
  const users = actual.get(key(e.axis, e.values));
  if (!users || !users.size) {
    stale.push(`${e.axis}: [${e.values.join(', ')}] — declared, used by no def`);
    continue;
  }
  for (const d of e.defs)
    if (!users.has(d))
      overclaimed.push(`${e.axis}: [${e.values.join(', ')}] names '${d}', which does not declare that axis with those values`);
}
if (stale.length) {
  failures.push(`${stale.length} register entr(ies) no def uses`);
  detail.push(
    '── ARM B: stale entries ──',
    ...stale.map((s) => `  ${s}`),
    '  A set that stopped being used is a decision that stopped applying. Remove the entry, or find the',
    '  def whose values moved out from under it.',
  );
}
if (overclaimed.length) {
  failures.push(`${overclaimed.length} register entr(ies) naming a def that does not use them`);
  detail.push('── ARM B: entry names a def that does not use it ──', ...overclaimed.map((o) => `  ${o}`));
}

// ---- ARM C — the DECLARED relation is the relation the values actually stand in --------------------
//
// The half that makes divergence weighable. `relation` is EXPECTED (authored); the comparison below is
// ACTUAL (set algebra over the defs' own values). An author adding a second set to an axis has to name
// which kind of divergence it is, and cannot name the cheap one for an expensive case.

const entriesByAxis = new Map<string, AxisValueSet[]>();
for (const e of AXIS_VALUE_SETS) {
  if (!entriesByAxis.has(e.axis)) entriesByAxis.set(e.axis, []);
  entriesByAxis.get(e.axis)!.push(e);
}

/** How `vals` stands relative to `canon`, by set algebra. Never reads the declaration. */
const relate = (vals: readonly string[], canon: readonly string[]): Relation => {
  const c = new Set(canon);
  const v = new Set(vals);
  const shared = [...v].filter((x) => c.has(x)).length;
  if (!shared) return 'disjoint';
  if (shared === v.size && shared === c.size)
    return vals.join(',') === canon.join(',') ? 'canonical' : 'reordered'; // identical — a duplicate entry, or another order
  if (shared === v.size) return 'subset';
  if (shared === c.size) return 'superset';
  return 'overlapping';
};

const relationFails: string[] = [];
for (const [axis, entries] of [...entriesByAxis].sort()) {
  const canons = entries.filter((e) => e.relation === 'canonical');
  const soles = entries.filter((e) => e.relation === 'sole');

  if (entries.length === 1) {
    if (soles.length !== 1)
      relationFails.push(`${axis}: one declared set, so its relation must be 'sole' — found '${entries[0].relation}'`);
    continue;
  }

  if (soles.length)
    relationFails.push(`${axis}: ${entries.length} declared sets, so none of them can be 'sole' — ${soles.length} is/are`);
  if (canons.length !== 1) {
    relationFails.push(
      `${axis}: ${entries.length} declared sets need exactly one 'canonical' to describe the others against — found ${canons.length}`,
    );
    continue;
  }

  const canon = canons[0];
  for (const e of entries) {
    if (e === canon) continue;
    const computed = relate(e.values, canon.values);
    if (computed !== e.relation)
      relationFails.push(
        `${axis}: [${e.values.join(', ')}] declares '${e.relation}' but stands '${computed}' to canonical [${canon.values.join(', ')}]`,
      );
  }
}
if (relationFails.length) {
  failures.push(`${relationFails.length} declared relation(s) that are not the relation the values stand in`);
  detail.push(
    '── ARM C: declared relation ≠ computed relation ──',
    ...relationFails.map((r) => `  ${r}`),
    '  \'overlapping\' is the expensive one and must not be declared as anything cheaper: sets that agree',
    '  in part read as aligned, so the place they disagree looks like a distinction rather than a synonym.',
  );
}

// ---- ARM D — the register's own hygiene ------------------------------------------------------------

const hygiene: string[] = [];
const seen = new Set<string>();
for (const e of AXIS_VALUE_SETS) {
  if (!(VARIANT_AXES as readonly string[]).includes(e.axis))
    hygiene.push(`'${e.axis}' is not one of the ${VARIANT_AXES.length} declared axis names — a typo here makes the entry unreachable, which reads as staleness rather than as the mistake it is`);
  if (!e.values.length)
    hygiene.push(`${e.axis}: an entry with no values declares nothing`);
  if (new Set(e.values).size !== e.values.length)
    hygiene.push(`${e.axis}: [${e.values.join(', ')}] repeats a value`);
  if (!e.defs.length)
    hygiene.push(`${e.axis}: [${e.values.join(', ')}] names no def — ARM B would report it stale for the wrong reason`);
  if (new Set(e.defs).size !== e.defs.length)
    hygiene.push(`${e.axis}: [${e.values.join(', ')}] repeats a def`);
  if (e.reason.trim().length < MIN_REASON)
    hygiene.push(`${e.axis}: [${e.values.join(', ')}] — reason is ${e.reason.trim().length} chars, under the ${MIN_REASON} floor. A label is not a justification.`);
  const k = key(e.axis, e.values);
  if (seen.has(k)) hygiene.push(`${e.axis}: [${e.values.join(', ')}] is declared twice`);
  seen.add(k);
}
if (hygiene.length) {
  failures.push(`${hygiene.length} problem(s) in the register itself`);
  detail.push('── ARM D: register hygiene ──', ...hygiene.map((h) => `  ${h}`));
}

// ---- report ---------------------------------------------------------------------------------------

const divergent = [...entriesByAxis.values()].filter((e) => e.length > 1).length;

// THE POPULATION IS STATED IN ONE PLACE — the success line — and that is the #1267 rule rather than
// terseness. A census footer used to print here too, on the failure path, and two sites stating one
// population is the drift shape `CLAUDE.md` records for `EXPECTED_ARTIFACTS`: whichever site a later
// change forgets goes quietly wrong, and a reader has no way to tell which one they are looking at.
// It was also the wrong claim to make HERE. On a failing run the census is what may be broken — a
// collapsed corpus is one of the failures listed above — so a confident "34 pairs across 13 defs"
// beneath the findings reads as reassurance about exactly the number in question. The floor failures
// state their own observed count, which is the FINDING rather than a summary, and they keep it.
if (failures.length) {
  console.error('\n❌ axis VALUES are not fully accounted for\n');
  for (const line of detail) console.error(line);
  console.error('');
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}

// SLACK IS PRINTED so it can be read without mutating the gate (#1267). Before this, finding out how
// much room a floor had meant deleting defs until it fired, or trusting a comment that was wrong: the
// floors sat at 8 and 15 against a corpus of 13 and 34, and nothing said so on any passing run. A
// floor whose margin is invisible is a floor nobody re-examines.
console.log(
  `✓ axis values accounted for — ${pairs.length} (def, axis) pairs across ${defs.length} defs resolve to `
  + `${AXIS_VALUE_SETS.length} declared sets over ${entriesByAxis.size} axes; `
  + `${divergent} axis/axes carry more than one set, each with its relation declared and checked.`,
);
console.log(
  `  floors: ${defs.length} defs vs ${FLOOR_DEFS} (slack ${defs.length - FLOOR_DEFS}), `
  + `${pairs.length} pairs vs ${FLOOR_PAIRS} (slack ${pairs.length - FLOOR_PAIRS}) — `
  + `each floor is the corpus minus one legitimate removal (see the FLOORS note). `
  + `Slack of 0 does not mean broken; it means the next removal needs the floor moved WITH it.`,
);
