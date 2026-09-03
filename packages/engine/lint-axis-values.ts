/**
 * Prism3 engine — EVERY AXIS VALUE SET IS DECLARED, AND ITS RELATION TO THE OTHERS IS DECLARED TOO
 * (#934).
 *
 * `VARIANT_AXES` closes the axis **NAME** vocabulary — 11 names, checked in `component-schema.ts`.
 * Nothing closed, or even OBSERVED, axis **VALUES**. This gate is the census that was missing, built
 * on an authored register rather than on a scan.
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
 *   2. **The divergence is not confined to `selection`.** THREE of the eleven axes carry more than one
 *      set: `selection` (3), `size` (2), `tone` (2). A gate scoped to `selection` — which is what the
 *      issue title asks for — would have gone green over the other two.
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
 * ── THE OVERLAPPING CASE, WHICH IS #756's FAILURE MODE LIVE IN A DIFFERENT AXIS ──────────────────
 *
 * `tone` has `field-message`'s `[default, error, warning, success]` against `icon`'s nine-value ink
 * vocabulary. They agree on `success` and `warning` — and then one spells the failure ink **`error`**
 * and the other **`danger`**. The proof they are one concept is in the binding itself:
 *
 *     'error.label': 'color.text.danger'
 *     'error.icon':  'color.icon.danger'
 *
 * The def spells the value `error` and resolves it to `danger` on the very next token. That is #756's
 * finding — *"four spellings of one axis, every one individually defensible"* — one level down, in an
 * axis nobody was watching, and both spellings ARE individually defensible: `error` is a member of the
 * closed `STATES` vocabulary, which is what a validation outcome should mirror; `danger` is the
 * semantic-ink token vocabulary, which is what the binding resolves to.
 *
 * **This gate DECLARES that divergence rather than fixing it, deliberately.** #934's own bar is that
 * the gate must not prejudge a decision two spellings might legitimately survive, and unifying them is
 * a component-API change that belongs to whoever owns the tone axis, not to the census that found it.
 * The register entry states both grounds so the decision is weighable; it is filed as a finding.
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
  | 'overlapping';

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
    defs: ['button', 'button-destructive', 'button-neutral', 'icon-button'],
    relation: 'sole',
    reason:
      'The emphasis ladder, descending: filled carries the page\'s primary action, outline the secondary, '
      + 'text the tertiary. One entry covers four defs by two mechanisms: `icon-button` INHERITS button\'s '
      + 'set, and the two #1223 siblings (`button-destructive`, `button-neutral`) come off button\'s own '
      + 'factory — same axis, only the colour family differs. A second entry for any of them would let the '
      + 'shared set drift while all still passed; the shared set IS the relationship.',
  },
  {
    axis: 'tone',
    values: ['primary', 'secondary'],
    defs: ['field-label'],
    relation: 'subset',
    reason:
      'The de-emphasized label (#872; Prism 2 calls the control "color"). A SUBSET of `icon`\'s tone '
      + 'vocabulary — `[inherit, primary, secondary, tertiary, brand, success, warning, danger, info]` — '
      + 'and the two shared names mean the same two semantic text roles there, which is what makes this a '
      + 'subset rather than a second spelling of the axis. Two values and not more: a label below '
      + '`secondary` stops reading as a field\'s name, and a status-colored one would be the validation '
      + 'signal `field-message` already owns.',
  },
  {
    axis: 'indicator',
    values: ['none', 'required', 'optional'],
    defs: ['field-label'],
    relation: 'sole',
    reason:
      'A three-way choice whose most important value is ABSENCE, which is why `none` is declared rather '
      + 'than left implicit — the def\'s own notes record that this is exactly what stops the axis being '
      + 'projected to Figma, since a member with the marker still drawn would be a coordinate that lies.',
  },
  {
    axis: 'intent',
    values: ['primary', 'neutral', 'destructive'],
    defs: ['icon-button'],
    relation: 'sole',
    reason:
      'What the action MEANS, held apart from how loud it looks (`appearance`) — the two cross, so a '
      + 'destructive action can be quiet. `destructive` rather than `danger` because this axis names the '
      + 'action, not the ink; the ink it resolves to is the danger family. #1223 made Button\'s intents '
      + 'three COMPONENTS (Button/Destructive Button/Neutral Button) rather than an axis, so `button` no '
      + 'longer declares this — `icon-button` still carries it as an axis, and whether it should split the '
      + 'same way is the open sibling question this entry now stands alone as a reminder of.',
  },
  {
    axis: 'name',
    values: [
      'arrow-down', 'arrow-down-left', 'arrow-down-right', 'arrow-left', 'arrow-right', 'arrow-up',
      'arrow-up-left', 'arrow-up-right', 'check', 'check-circle', 'check-circle-filled',
      'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up', 'close', 'close-filled',
      'error-circle', 'error-circle-filled', 'external-link-filled', 'eye', 'eye-filled', 'eye-off',
      'eye-off-filled', 'home', 'info-circle', 'info-circle-filled', 'link', 'minus', 'minus-filled',
      'more-horizontal-filled', 'more-vertical-filled', 'plus', 'plus-circle', 'plus-circle-filled',
      'plus-filled', 'search', 'warning-triangle', 'warning-triangle-filled',
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
    defs: ['checkbox'],
    relation: 'canonical',
    reason:
      'The canonical set because it is the widest and it is ARIA\'s own vocabulary: `aria-checked` covers '
      + 'checkbox, radio AND `role="switch"`, and its third value `mixed` is this set\'s `indeterminate`. '
      + '`unchecked` leads because the first value is the rest coordinate (see `values` above). The axis '
      + 'NAME was settled for the whole family in `VARIANT_AXES` and the values deliberately left open; '
      + 'this register is where that open half is finally accounted for.',
  },
  {
    axis: 'selection',
    values: ['unchecked', 'checked'],
    defs: ['radio'],
    relation: 'subset',
    reason:
      'Checkbox\'s vocabulary minus `indeterminate`, which a mutually-exclusive choice does not have — '
      + '`radio.ts` argues it from the brief\'s own `no-indeterminate` line, and notes that an ABSENCE is '
      + 'not a value you can declare. The cheapest kind of divergence: every value it does carry means '
      + 'exactly what it means in canonical, so the two line up without a translation.',
  },
  {
    axis: 'selection',
    values: ['off', 'on'],
    defs: ['switch'],
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
    axis: 'size',
    values: ['small', 'medium', 'large'],
    defs: ['button', 'button-destructive', 'button-neutral', 'icon-button', 'text-field', 'textarea', 'checkbox', 'radio', 'field-label'],
    relation: 'canonical',
    reason:
      'The three-rung ladder, and canonical on weight of use — eight of the defs with a size axis, the '
      + 'two #1223 button siblings among them by way of the shared factory. '
      + 'Rungs are named rather than numbered so a brand can re-derive the dimensions behind them without '
      + 'the names going stale.',
  },
  {
    axis: 'size',
    values: ['small', 'medium'],
    defs: ['switch'],
    relation: 'subset',
    reason:
      'The ladder minus its top rung, for a def with no large form: a switch above medium stops reading '
      + 'as a control. Same vocabulary, shorter — `small` and `medium` mean the same dimensions they mean '
      + 'in canonical, which is what makes this weighable instead of a second ladder. `field-label` shared '
      + 'this entry until #872 and now takes the full three: the reason given for its shortness ("a label '
      + 'tracks the field it labels rather than setting its own scale") turned out to be the argument FOR '
      + 'three, since `text-field` and `textarea` have declared three rungs since tranche 1.',
  },
  {
    axis: 'style',
    values: ['outline'],
    defs: ['text-field', 'textarea'],
    relation: 'sole',
    reason:
      'An axis of ONE, declared rather than dropped: the field substrate has a single treatment today, and '
      + 'the axis exists so that filled and underline have somewhere to land without a later API break. '
      + 'The cost of an axis of one is real (`modifiers`, #845) and it is being paid deliberately here.',
  },
  {
    axis: 'surface',
    values: ['default', 'inverse'],
    defs: ['button', 'button-destructive', 'button-neutral', 'focus-ring'],
    relation: 'sole',
    reason:
      'The ground a control sits on (#1134): `default` the page, `inverse` a dark or brand-filled band. THE '
      + 'ONE name the bounded inverse set uses (docs/20 §9.11), so a host and a component it nests share it '
      + 'by name and can pass it through — `button` carries `surface` and its nested `focus-ring` carries '
      + '`surface`, which is what lets `button`\'s `follow: [\'surface\']` drive the ring\'s coordinate. '
      + '`focus-ring`\'s axis was `color` until #1134 renamed it here; the two are one entry now because they '
      + 'are one distinction. ORDER matters as everywhere here: `default` is the rest coordinate the '
      + 'projector\'s inverse rewrite falls through to (an `inverse` coordinate binds `color.inverse.*`, a '
      + '`default` one the bare role).',
  },
  {
    axis: 'tone',
    values: [
      'inherit', 'primary', 'secondary', 'tertiary', 'brand', 'success', 'warning', 'danger', 'info',
    ],
    defs: ['icon'],
    relation: 'canonical',
    reason:
      'The semantic-ink vocabulary, and canonical because its values ARE the token names they resolve to '
      + '(`danger` → `color.icon.danger`), so it is the set the other has to be described against rather '
      + 'than the reverse. `inherit` leads and binds NOTHING — `currentColor` is the absence of a pinned '
      + 'ink, and it is the default, which is why this axis is not projected to Figma at all.',
  },
  {
    axis: 'tone',
    values: ['default', 'error', 'warning', 'success'],
    defs: ['field-message'],
    relation: 'overlapping',
    reason:
      'THE ONE ENTRY IN THIS REGISTER THAT RECORDS A DEFECT RATHER THAN A DECISION, and it is declared '
      + 'rather than fixed because unifying it is a component-API change that belongs to whoever owns the '
      + 'axis, not to the census that found it (#934). It agrees with canonical on `success` and `warning` '
      + 'and then spells the failure ink `error` where canonical spells it `danger` — and resolves it to '
      + '`color.text.danger` on the very next line, which is the proof they are one concept. Both spellings '
      + 'are individually defensible, which is #756\'s failure mode exactly: `error` is a member of the '
      + 'closed `STATES` vocabulary, which a validation outcome should mirror; `danger` is the ink '
      + 'vocabulary the binding resolves to. `default` is a fourth value canonical has no counterpart for. '
      + 'Overlapping is the EXPENSIVE divergence precisely because it reads as alignment.',
  },
  {
    axis: 'width',
    values: ['auto', 'full'],
    defs: ['button', 'button-destructive', 'button-neutral'],
    relation: 'sole',
    reason:
      'Whether the button takes its content\'s width or its container\'s — two values because there is no '
      + 'third that is not a layout concern belonging to the container. Named for the BEHAVIOR rather than '
      + 'a measurement, so it survives a brand re-deriving its dimensions.',
  },
  {
    axis: 'weight',
    values: ['regular', 'bold'],
    defs: ['field-label'],
    relation: 'sole',
    reason:
      'How heavy the label reads, held apart from how big it is — Prism 2\'s third form-label control '
      + '(#1248, completing #872), whose enum is `["Regular", "Bold"]` and whose Bold variants cross size '
      + 'in full. VALUES ARE PRISM 2\'S WORDS, not the type-role names the two resolve to: `bold` binds '
      + '`type.body.{size}.strong` and `strong` is weight 700, which is what Inter calls Bold — measured '
      + 'against the reference spec, since `emphasis` (600) is the nearer-looking role and the wrong one. '
      + 'Naming the values `default`/`strong` would pin the axis to `type.body.*`\'s cells, which a def '
      + 'binding a different tier does not share. TWO values and not the weight-role ladder\'s five '
      + '(`subtle`, `default`, `emphasis`, `strong`, `max`): this axis is what a designer CHOOSES on a '
      + 'component, not what the type scale can express, and Prism 2 offers two.',
  },
];

/** A reason shorter than this is a label, not a justification. Crude on purpose — see SCOPE above. */
const MIN_REASON = 80;

/**
 * FLOORS (`docs/34` shape 9). Every arm below is a statement about a set, so every arm passes
 * vacuously over an empty one — a broken import, a renamed directory or a `variants` field that
 * changed shape would take the census to zero and the gate would report clean. Set below the corpus
 * with room to remove a def, not at it: a floor pinned to today's exact count is a second baseline
 * that fails on legitimate change.
 *
 * Measured on `d9c5b2d`: 11 tracked def files, 11 defs carrying `variants`, 24 (def, axis) pairs.
 */
const FLOOR_DEFS = 8;
const FLOOR_PAIRS = 15;

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
  if (shared === v.size && shared === c.size) return 'canonical'; // identical — a duplicate entry
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

if (failures.length) {
  console.error('\n❌ axis VALUES are not fully accounted for\n');
  for (const line of detail) console.error(line);
  console.error('');
  for (const f of failures) console.error(`  · ${f}`);
  console.error(
    `\n  ${AXIS_VALUE_SETS.length} declared set(s) over ${entriesByAxis.size} axis name(s); `
    + `${pairs.length} (def, axis) pair(s) across ${defs.length} def(s).`,
  );
  process.exit(1);
}

console.log(
  `✓ axis values accounted for — ${pairs.length} (def, axis) pairs across ${defs.length} defs resolve to `
  + `${AXIS_VALUE_SETS.length} declared sets over ${entriesByAxis.size} axes; `
  + `${divergent} axis/axes carry more than one set, each with its relation declared and checked.`,
);
