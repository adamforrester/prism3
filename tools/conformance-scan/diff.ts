/**
 * CONFORMANCE SCAN — THE DIFF (#1553 Phase 1, half two of two).
 *
 *   npx tsx tools/conformance-scan/diff.ts expected.json actual.json
 *   npx tsx tools/conformance-scan/diff.ts expected.json actual.json --json
 *   npx tsx tools/conformance-scan/diff.ts --selftest
 *
 * Answers "does what's in this Figma file match what the engine says should be there?" — nine
 * categories, each a separate arm, each finding carrying the expected value, the actual value, and a
 * severity. Read-only and report-only: it changes nothing, in the repo or in Figma, and it EXITS 0
 * with findings. It is a tool, not a gate (`tools/CLAUDE.md`): a tool answers a question and exits 0.
 * A non-zero exit here means the diff itself could not run.
 *
 * ── THE CATEGORIES ──────────────────────────────────────────────────────────────────────────────
 *
 *   a  binding-presence  a raw literal, or nothing, where the engine binds a variable (#1387)
 *   b  binding-target    bound, but to the wrong variable — the icon-vs-text role confusion
 *   c  value-match       the variable exists and is bound, but its per-mode value is stale
 *   d  mode-coverage     a collection or variable is missing a mode the engine emits
 *   e  scope-type        wrong `resolvedType`, or scopes that would hide a variable from a picker
 *   f  structure         members, axes, `emitAs`, missing components, orphaned collections
 *   g  contrast          the engine's contracts RE-MEASURED on the file's own colors → AA failures
 *   h  staleness         the file was built by an older engine than this checkout
 *   i  style-definition  a style's INTERIOR — a text style's size and line height, a shadow's offset
 *
 * ── WHY (g) IS A RE-MEASUREMENT AND NOT A COMPARISON ────────────────────────────────────────────
 *
 * Arms (a)-(f) and (h) compare two states. Arm (g) does something different and it is the reason the
 * expected state carries `min` and `model` rather than just a ratio: it takes the engine's CONTRACT
 * (this role, against this ground, must clear this floor, measured this way) and evaluates it against
 * the colors IN THE FILE. A file whose `text.primary` was hand-nudged still "matches" nothing in
 * particular — arm (c) reports the value drift — but only arm (g) says the nudge took it below 4.5:1.
 * The recomputation is the engine's own `contrast`/`composite` out of `packages/engine/color.ts`,
 * because a re-implementation here would be measuring something else and calling it a conformance
 * failure. `engineRatio` travels alongside so a failure separates "the file drifted" (engine ratio
 * passes, actual does not) from "the engine ships a near-miss" (both fail, at the same number).
 *
 * ── WHERE THE `descendantFills` LENIENCE LIVES, AND WHY HERE ────────────────────────────────────
 *
 * `descendantFills` is a PLAN concept — "the ink of the vector inside this node" — not a Figma
 * property. Where it lands in the file depends on the node: beneath an INSTANCE the ink is on a node
 * the reader cannot address, so a read reports it on the instance; beneath a plain container the ink is
 * on the child SHAPE, one level down. `tools/binding-audit`'s reader resolves this by NODE TYPE and its
 * README records the two weaknesses that causes — a standalone glyph set reads as EXTRA, and only the
 * INSTANCE case is covered — which between them accounted for 82 unevaluable expected bindings there.
 *
 * This harness does not repeat that. The reader stays dumb (it reports fills wherever it finds them)
 * and the resolution happens HERE, in the one place that holds the plan and therefore knows a
 * `descendantFills` claim was made about this node at all. A claim on node N is satisfied by ink on N
 * or by ink on the first bound descendant of N, and the report says which — so the lenience is visible
 * rather than assumed, and a node with ink in NEITHER place is a category (a) finding rather than a
 * silence. Structural, and it costs the reader nothing.
 *
 * ── THE LINE BETWEEN A SPELLING AND A DEFECT ────────────────────────────────────────────────────
 *
 * Two more places where an engine claim and a Figma read disagree WITHOUT anything being wrong, and one
 * where they disagree and something is. The distinction is the whole judgement this file makes, so it is
 * written down rather than left to each arm:
 *
 *   A REPRESENTATION difference is the same fact spelled two ways, and is reconciled with a `via`.
 *   `strokeWeight` is the case: the engine plans ONE uniform weight, Figma stores four per-side fields
 *   (`strokeTopWeight` and friends) and never surfaces `strokeWeight` in `boundVariables` at all. A
 *   direct lookup therefore misses every one of the engine's 2,096 claims and reports them as unbound —
 *   2,096 findings, none of them real, which is #1511's failure mode in a different property. Collapsed
 *   here, with the four sides required to AGREE: four sides pointing at different variables is not a
 *   uniform weight, and accepting the first one would hide a real asymmetry.
 *
 *   A SUBSTANTIVE difference is a fact that is missing, and is a finding no matter how close the file
 *   looks. A detached text style is the case, and it is worth the words because it is the one an
 *   over-eager lenience would erase: `write-text-styles.ts` binds exactly `fontFamily`/`fontSize`/
 *   `fontStyle` on the STYLE, and Figma copies those three onto a node the style is applied to. So a
 *   node whose style has DETACHED still carries all three bindings and the style's baked line height,
 *   and reads as correct on every property a diff would think to check. What it has lost is the LINK:
 *   nothing tracks the style any more, the line height is now a literal, and a change to the style will
 *   not reach it. That is reported — at the same category and subject as "nothing bound", because it is
 *   still a missing binding — with a summary that says detached rather than absent, since the two want
 *   different fixes. The three font fields are then not also reported as unplanned extras: the engine
 *   does plan them, through the style.
 *
 * ── ARM (i)'S TWO RECONCILIATIONS, AND THE ONE UNIT DIFFERENCE THAT IS A DEFECT ─────────────────
 *
 * `fontWeight` IS A REPRESENTATION DIFFERENCE. A Figma `TextStyle` has no `fontWeight` property at all
 * — it has `fontName: { family, style }` — while the emission carries BOTH `fontStyle` ('Bold') and
 * `fontWeight` (700), which agree by construction. Compared directly, the engine's weight is missing
 * from every style in every file: 38 false findings on a correct aurora file, the `strokeWeight` shape
 * again. So the weight claim is checked THROUGH the one property Figma stores. Where the file's
 * `fontStyle` is variable-bound (the built state) the weight rides on that variable and `fontStyle`
 * already checks it by name, so it is reconciled and counted. Where the file's `fontStyle` is a literal
 * name (hand-set, or detached) the name is mapped to a weight and compared as a number — which is what
 * makes 'Semi Bold', 'SemiBold' and 'semibold' one fact rather than three, and 600-vs-700 still a
 * finding. A name the table does not know is `unevaluated`, never a pass: an unrecognized font style is
 * a blind spot, and quietly calling it correct is how an arm stops working.
 *
 * `lineHeight` PERCENT-vs-PIXELS IS NOT. This is the one place the harness reports a unit difference
 * rather than normalizing it away, and it is a deliberate departure from "convert both sides and
 * compare": `lint-lineheight-bake.ts` (#1356) records that the engine bakes line height as an UNBOUND,
 * mode-invariant PERCENT for three reasons that all bear on this comparison — the role is a unitless
 * multiplier, `setBoundVariable('lineHeight', …)` accepts PIXELS only so a percentage line height cannot
 * be variable-bound at all, and a pixel line height is `fontSize × multiplier` and therefore wrong at
 * every other font size in a fluid set. So `150%` and `24px` are not two spellings of one fact: the
 * second is the first evaluated at one size and frozen, and it has lost exactly the property the bake
 * exists to provide. Converting them to a common unit here would need a font size, which for a fluid
 * style is per-mode — the conversion would pick a mode and call the result equal. Reported, at its own
 * summary, so the fix (re-apply the style) is not confused with "a number drifted".
 *
 * ── GAP B: WHAT THE FILE CONSUMES FROM A LIBRARY IS NOT THE FILE'S TO GET WRONG ─────────────────
 *
 * Every read is a `getLocal*Async` read, so a variable or style a file consumes from a PUBLISHED library
 * is absent from every local enumeration while being entirely correct and in use. Reported as absence,
 * that is a false finding at the volume of a whole token layer. It is also not a value finding, a mode
 * finding or a scope finding: the record lives in the library file, and this document cannot be wrong
 * about it. So `State.libraryConsumed` names them and they are SUPPRESSED AND COUNTED — the same
 * mechanism, and the same reasoning, as bindings inherited through an instance. A name that is both
 * local and library-listed is local, and is compared: the suppression only applies where the local
 * lookup already missed.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, composite } from '../../packages/engine/color';
import {
  bindKey,
  bindKindOf,
  bindTargetOf,
  parseBindKey,
  parseCanonColor,
  readState,
  showBindKey,
  showStyleKey,
  underInstance,
  unitOfCanon,
  type BindState,
  type ContrastContract,
  type State,
} from './state';

export type Category =
  | 'binding-presence'
  | 'binding-target'
  | 'value-match'
  | 'mode-coverage'
  | 'scope-type'
  | 'structure'
  | 'contrast'
  | 'staleness'
  | 'style-definition';

/** The nine, in report order — declared so the report prints an arm that found nothing as an
 *  explicit `0 findings` line. An arm that silently stops working otherwise reads as a clean file,
 *  which is the failure mode `docs/34-gate-independence.md` calls evidence-of-absence.
 *
 *  `style-definition` is APPENDED rather than slotted next to `structure`, where it arguably belongs by
 *  subject. The report letters this list positionally, so inserting would silently re-letter `contrast`
 *  and `staleness` and leave "(g) contrast" meaning two different things in two documents that are both
 *  on main. The letters are cosmetic; a letter that quietly changes meaning is not. */
export const CATEGORIES: readonly Category[] = [
  'binding-presence',
  'binding-target',
  'value-match',
  'mode-coverage',
  'scope-type',
  'structure',
  'contrast',
  'staleness',
  'style-definition',
] as const;

/** The per-category letters the report prints. A literal `'abcdefgh'` went stale the moment a ninth
 *  category landed — silently, because indexing past the end yields `undefined` and prints as a blank
 *  rather than as a failure. Asserted against the list instead, at module load. */
const LETTERS = 'abcdefghi';
if (LETTERS.length !== CATEGORIES.length)
  throw new Error(
    `LETTERS has ${LETTERS.length} letters for ${CATEGORIES.length} categories — add one, or the report ` +
      `prints a blank letter for the categories past the end.`,
  );
const letterOf = (c: Category): string => LETTERS[CATEGORIES.indexOf(c)];

/** `high` — a broken promise a consumer can see (an unbound token, an AA failure, a wrong role).
 *  `medium` — real drift with a bounded blast radius (a stale value, a missing mode).
 *  `low` — cosmetic or informational (scope ordering, an extra collection nobody references). */
export type Severity = 'high' | 'medium' | 'low';

export type Finding = {
  category: Category;
  severity: Severity;
  /** The thing the finding is ABOUT, in the file's own vocabulary — a variable name, or a
   *  `component · member · node · property` coordinate. This is the `by name` in "fails by name". */
  subject: string;
  /** One line, stating the defect. */
  summary: string;
  expected: string;
  actual: string;
};

export type Report = {
  /** `true` when the two sides agree across every arm that ran. */
  clean: boolean;
  brand: string;
  file: string;
  /** Non-null when the actual read covered less than the whole file — printed in the headline. */
  scope: string | null;
  counts: Record<Category, number>;
  findings: Finding[];
  /** What the diff could NOT evaluate, and why. Not findings — the report's own blind spots, printed
   *  under the counts so a low count cannot be mistaken for a clean file. */
  unevaluated: string[];
  /** What the diff evaluated and deliberately did not report, with the count. Distinct from
   *  `unevaluated`: these coordinates WERE checked, and the note records the judgement rather than a
   *  gap. A suppression with no number attached to it is indistinguishable from a broken arm. */
  notes: string[];
};

const f = (
  category: Category,
  severity: Severity,
  subject: string,
  summary: string,
  expected: string,
  actual: string,
): Finding => ({ category, severity, subject, summary, expected, actual });

// ── ALIAS RESOLUTION ────────────────────────────────────────────────────────────────────────────

/**
 * A variable's concrete value in a mode, following aliases to the end of the chain.
 *
 * Needed by arm (g), which has to measure a COLOR and gets handed `ads/color/text/primary`, a variable
 * whose `light` mode is an alias to `ads/core/palette/neutral/900`.
 *
 * The mode does not carry across the hop. `color` has four modes and `core` has one (`Default`), so
 * asking `core` for `light` finds nothing — which is not a defect, it is what a single-mode collection
 * IS. So: try the requested mode, then fall back to the target's ONLY mode when it has exactly one, and
 * fail with a stated reason otherwise rather than picking one of several. A silent pick here would make
 * arm (g) measure a dark-mode color against a light-mode ground and report a contrast failure that
 * exists nowhere.
 */
const resolveValue = (
  state: State,
  name: string,
  mode: string,
  seen: string[] = [],
): { value: string } | { error: string } => {
  if (seen.includes(name)) return { error: `alias cycle: ${[...seen, name].join(' → ')}` };
  const v = state.variables[name];
  if (!v) return { error: `'${name}' is not in the ${state.side} variable table` };
  const modes = Object.keys(v.modes);
  const key = mode in v.modes ? mode : modes.length === 1 ? modes[0] : null;
  if (key == null)
    return {
      error:
        `'${name}' has no mode '${mode}' and has ${modes.length} modes (${modes.join(', ')}), so there is ` +
        `no unambiguous value to read`,
    };
  const mv = v.modes[key];
  return mv.kind === 'value' ? { value: mv.value } : resolveValue(state, mv.target, mode, [...seen, name]);
};

// ── ARM (a) + (b): BINDINGS ─────────────────────────────────────────────────────────────────────

/** The four fields Figma stores a uniform `strokeWeight` as. In per-side order, for a report line. */
const SIDE_WEIGHTS = ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'] as const;

/** Exactly the three fields `write-text-styles.ts` binds on a TEXT STYLE, and therefore the three a node
 *  carries once that style is applied — and keeps if it detaches. See the header. */
const STYLE_FONT_FIELDS = ['fontFamily', 'fontSize', 'fontStyle'] as const;

/**
 * The actual `BindState` for an expected coordinate, reconciling the two representation differences.
 *
 * Returns the state found, HOW it was found (`via`, so the report says "satisfied on the child shape"
 * rather than quietly accepting a match at a different coordinate), and any `problem` the reconciliation
 * itself uncovered — a `problem` is reported on its own, because a coordinate the lenience could not
 * resolve cleanly must not then be judged against whichever fragment of it happened to come first.
 */
const actualFor = (
  key: string,
  actual: State,
): { bind: BindState; via: string | null; problem?: string } => {
  const direct = actual.bindings[key];
  if (direct) return { bind: direct, via: null };
  const { component, member, node, property } = parseBindKey(key);

  // `strokeWeight` — a representation difference (header). Collapsed only when all four sides agree.
  if (property === 'strokeWeight') {
    const sides = SIDE_WEIGHTS.map((s) => ({ side: s, bind: actual.bindings[bindKey(component, member, node, s)] }));
    const found = sides.filter((x) => x.bind !== undefined);
    if (found.length === 0) return { bind: { absent: true }, via: null };
    const targets = [...new Set(found.map((x) => bindTargetOf(x.bind!)))];
    if (found.length === SIDE_WEIGHTS.length && targets.length === 1)
      return { bind: found[0].bind!, via: 'as four per-side weights' };
    return {
      bind: found[0].bind!,
      via: null,
      problem:
        'the engine binds one uniform `strokeWeight` and the four per-side weights do not agree on it — ' +
        sides
          .map((x) => `${x.side.replace(/^stroke|Weight$/g, '').toLowerCase()}=${x.bind ? bindTargetOf(x.bind) : 'unbound'}`)
          .join(', '),
    };
  }

  if (property !== 'descendantFills') return { bind: { absent: true }, via: null };
  // The ink may be reported one level down, on the shape itself. Search descendants of `node`,
  // nearest first, for a bound fill — `descendantFills` if the reader classified it, else `fills`.
  const prefix = `${component}|${member}|${node === '/' ? '' : node}/`;
  const candidates = Object.keys(actual.bindings)
    .filter((k) => k.startsWith(prefix))
    .filter((k) => {
      const p = parseBindKey(k).property;
      return p === 'descendantFills' || p === 'fills';
    })
    .sort((a, b) => parseBindKey(a).node.split('/').length - parseBindKey(b).node.split('/').length);
  for (const c of candidates) {
    const b = actual.bindings[c];
    if ('boundVariable' in b) return { bind: b, via: `on descendant ${parseBindKey(c).node}` };
  }
  return { bind: { absent: true }, via: null };
};

/**
 * For an absent `textStyle` claim, which of the style's three font fields the node carries anyway.
 *
 * Length 3 means detached; length 0 means the style was never applied; anything between is neither, and
 * falls through to the plain "nothing bound" finding — a partial set is not a detachment and saying so
 * would put a confident diagnosis on a state nobody has seen.
 */
const detachedFontFields = (key: string, want: BindState, actual: State): string[] => {
  const { component, member, node, property } = parseBindKey(key);
  if (property !== 'textStyle' || !('boundStyle' in want)) return [];
  return STYLE_FONT_FIELDS.filter((field) => {
    const b = actual.bindings[bindKey(component, member, node, field)];
    return b !== undefined && 'boundVariable' in b;
  });
};

const armBindings = (expected: State, actual: State, inScope: (component: string) => boolean) => {
  const findings: Finding[] = [];
  const unevaluated: string[] = [];
  const notes: string[] = [];
  const instances = new Set(actual.instanceNodes ?? []);
  let inherited = 0;
  let checked = 0;
  for (const [key, want] of Object.entries(expected.bindings)) {
    const { component } = parseBindKey(key);
    if (!inScope(component)) continue;
    checked++;
    const { bind: got, via, problem } = actualFor(key, actual);
    const wantKind = bindKindOf(want);
    const wantTarget = bindTargetOf(want);
    const gotKind = bindKindOf(got);
    const gotTarget = bindTargetOf(got);

    if (problem)
      findings.push(
        f('binding-target', 'high', showBindKey(key), problem, `${wantKind} ${wantTarget}`, 'no single binding to compare'),
      );
    else if (gotKind === 'absent' && detachedFontFields(key, want, actual).length === STYLE_FONT_FIELDS.length)
      // The style's effects are all present and only the LINK is gone — a different fix from "nothing
      // bound", so a different summary, at the same category and subject. See the header.
      findings.push(
        f('binding-presence', 'high', showBindKey(key),
          'the text style is DETACHED — the node still carries all three of the style\'s font bindings and ' +
            'its baked line height, so the style\'s effects landed and only the link did not; nothing tracks ' +
            'the style now, and a change to it will not reach this node',
          `${wantKind} ${wantTarget}`, `no style id, but ${STYLE_FONT_FIELDS.join('/')} bound as that style binds them`),
      );
    else if (gotKind === 'absent')
      findings.push(
        f('binding-presence', 'high', showBindKey(key),
          `nothing bound where the engine binds a ${wantKind}`, `${wantKind} ${wantTarget}`, 'no binding and no value read'),
      );
    else if (gotKind === 'literal')
      findings.push(
        f('binding-presence', 'high', showBindKey(key),
          `a raw literal where the engine binds a ${wantKind} — the token is not in effect here`,
          `${wantKind} ${wantTarget}`, `raw ${gotTarget}`),
      );
    else if (gotKind !== wantKind)
      // A style where a variable was expected (or the reverse) is a presence failure, not a target
      // one: there is no sense in which `type/body/md` is the "wrong value" for a color variable, and
      // reporting it as a target mismatch would invite a fix that cannot work.
      findings.push(
        f('binding-presence', 'high', showBindKey(key),
          `bound to a ${gotKind} where the engine binds a ${wantKind} — different Figma API, not a wrong value`,
          `${wantKind} ${wantTarget}`, `${gotKind} ${gotTarget}`),
      );
    else if (gotTarget !== wantTarget)
      findings.push(
        f('binding-target', 'high', showBindKey(key),
          `bound to the wrong ${wantKind}`, wantTarget, gotTarget + (via ? ` (${via})` : '')),
      );
  }
  // Bindings the file carries that the engine does not plan. Reported at `low`: a designer's own
  // binding on a node is not a conformance failure of the engine's, and calling it one would train
  // the reader to ignore the category.
  for (const key of Object.keys(actual.bindings)) {
    const { component } = parseBindKey(key);
    if (!inScope(component)) continue;
    if (key in expected.bindings) continue;
    if (!(component in expected.structure)) continue; // a whole unknown component is arm (f)'s
    const { member, node, property: p } = parseBindKey(key);
    if (p === 'fills' || p === 'descendantFills') continue; // may be a `descendantFills` claim's other home
    // The other side of the two reconciliations above. A per-side stroke weight is not an unplanned
    // binding where the engine planned a uniform one, and neither are the three font fields a text style
    // puts on its node — the engine plans both, in a different spelling, and the coordinate is already
    // judged (or cleared) by the expected-side pass. Reporting them here would add ~6.7k `low` findings
    // that say only "Figma spells this differently", and a category that cries wolf gets skipped.
    const planned = (property: string): boolean => bindKey(component, member, node, property) in expected.bindings;
    if ((SIDE_WEIGHTS as readonly string[]).includes(p) && planned('strokeWeight')) continue;
    if ((STYLE_FONT_FIELDS as readonly string[]).includes(p) && planned('textStyle')) continue;
    // Inherited through an INSTANCE, not authored here (`State.instanceNodes`). Counted, not reported —
    // the note below is what keeps that from being a silence.
    if (underInstance(key, instances)) { inherited++; continue; }
    findings.push(
      f('binding-presence', 'low', showBindKey(key),
        'the file binds a property the engine does not plan', 'no binding planned', bindTargetOf(actual.bindings[key])),
    );
  }
  if (checked === 0)
    unevaluated.push(
      'binding arms (a)+(b) evaluated 0 coordinates — the actual state carries no bindings for any ' +
        'in-scope component, so a 0 count here is an absence of evidence, not a clean result',
    );
  if (inherited > 0)
    notes.push(
      `${inherited} binding(s) on or beneath a component INSTANCE are not reported: an instance surfaces ` +
        `its main component's bindings as its own, so they are inherited rather than authored where they ` +
        `were found, and the component they come from is scanned on its own terms. Counted here so the ` +
        `suppression is visible.`,
    );
  else if (instances.size === 0)
    notes.push(
      'the read recorded no instance nodes, so any binding inherited through an instance is reported as ' +
        'unplanned — noisy, but never an assumption about which nodes are instances',
    );
  return { findings, unevaluated, notes, checked };
};

// ── ARM (c) + (d) + (e): VARIABLES ──────────────────────────────────────────────────────────────

const armVariables = (expected: State, actual: State) => {
  const findings: Finding[] = [];
  const notes: string[] = [];
  const library = new Set(actual.libraryConsumed?.variables ?? []);
  let fromLibrary = 0;
  for (const [name, want] of Object.entries(expected.variables)) {
    const got = actual.variables[name];
    if (!got) {
      // Consumed from a published library: present, correct, in use, and invisible to every
      // `getLocal*Async` read. Suppressed and counted rather than reported as absent — see the header.
      // Checked HERE, inside the local miss, so a name that is both local and library-listed is still
      // compared on its local record.
      if (library.has(name)) { fromLibrary++; continue; }
      // A variable the engine emits and the file does not have — an entity-presence fact, so (f), not
      // (d): the variable has no modes to be missing. Every binding to it is separately a category (a)
      // finding, and this is the ROOT cause reported once, at the variable, so a reader can tell one
      // absent variable from three hundred unbound properties.
      findings.push(
        f('structure', 'high', name, 'the engine emits this variable and the file does not have it',
          `${want.resolvedType} in collection '${want.collection}'`, 'absent'),
      );
      continue;
    }
    // (e) type first — a value comparison across two types is unreadable, so report the type and skip.
    if (got.resolvedType !== want.resolvedType) {
      findings.push(
        f('scope-type', 'high', name, 'wrong resolvedType — every value bound through this is coerced or dropped',
          want.resolvedType, got.resolvedType),
      );
      continue;
    }
    if (got.collection !== want.collection)
      findings.push(
        f('structure', 'medium', name, 'the variable lives in a different collection than the engine emits it to',
          want.collection, got.collection),
      );
    // (e) scopes. `low`: a wrong scope does not break a binding that already exists, it hides the
    // variable from a picker — real, and not the same order of problem as an unbound token.
    const ws = want.scopes.join(','), gs = got.scopes.join(',');
    if (ws !== gs)
      findings.push(
        f('scope-type', 'low', name, 'scopes differ — the variable is offered in different places than intended',
          ws || '(none)', gs || '(none)'),
      );
    // (d) mode coverage, then (c) value match within the modes both sides have.
    for (const mode of Object.keys(want.modes)) {
      if (!(mode in got.modes)) {
        findings.push(
          f('mode-coverage', 'high', `${name} [${mode}]`, 'the variable has no value in a mode the engine emits',
            want.modes[mode].kind === 'alias' ? `alias → ${(want.modes[mode] as { target: string }).target}` : (want.modes[mode] as { value: string }).value,
            'no value in this mode'),
        );
        continue;
      }
      const w = want.modes[mode], g = got.modes[mode];
      if (w.kind === 'alias' && g.kind === 'alias') {
        if (w.target !== g.target)
          findings.push(
            f('binding-target', 'high', `${name} [${mode}]`, 'the variable aliases a different variable than the engine emits',
              `alias → ${w.target}`, `alias → ${g.target}`),
          );
        continue;
      }
      if (w.kind !== g.kind) {
        // An alias flattened to a raw value is the #1387 shape at the variable level: it still shows
        // the right color today and stops tracking the one it was meant to follow.
        const flattened = w.kind === 'alias' && g.kind === 'value';
        findings.push(
          f('binding-presence', flattened ? 'high' : 'medium', `${name} [${mode}]`,
            flattened
              ? 'the alias was flattened to a raw value — it no longer follows the variable it was meant to'
              : 'a raw value in the engine is an alias in the file',
            w.kind === 'alias' ? `alias → ${w.target}` : w.value,
            g.kind === 'alias' ? `alias → ${g.target}` : g.value),
        );
        continue;
      }
      if (w.kind === 'value' && g.kind === 'value' && w.value !== g.value)
        findings.push(
          f('value-match', 'medium', `${name} [${mode}]`, 'stale value — the file does not carry what the engine emits',
            w.value, g.value),
        );
    }
    for (const mode of Object.keys(got.modes))
      if (!(mode in want.modes))
        findings.push(
          f('mode-coverage', 'low', `${name} [${mode}]`, 'the file carries a mode the engine does not emit for this variable',
            `modes ${Object.keys(want.modes).join(', ')}`, `extra mode '${mode}'`),
        );
  }
  for (const name of Object.keys(actual.variables))
    if (!(name in expected.variables))
      findings.push(
        f('structure', 'medium', name, 'the file carries a variable the engine does not emit — nothing generated will reference it',
          'not emitted by the engine', `${actual.variables[name].resolvedType} in collection '${actual.variables[name].collection}'`),
      );
  if (fromLibrary > 0)
    notes.push(
      `${fromLibrary} variable(s) the engine emits are CONSUMED FROM A PUBLISHED LIBRARY rather than authored ` +
        `here, and are not reported as absent: a local read cannot see them, and their values are the library's ` +
        `to be right or wrong about. Arms (c), (d) and (e) skip them for the same reason. Counted here so the ` +
        `suppression is visible.`,
    );
  else if (actual.libraryConsumed === undefined)
    notes.push(
      'the read did not distinguish library-consumed names from local ones, so anything this file consumes from ' +
        'a published library is reported as absent — noisy, but never an assumption that a missing variable is ' +
        'somebody else\'s',
    );
  return { findings, notes };
};

// ── ARM (i): STYLE DEFINITIONS ──────────────────────────────────────────────────────────────────

/** Expected-side style properties a Figma read cannot produce, checked another way instead of reported
 *  as missing. See the header — `fontWeight` is the only one, and it is not zero. */
const RECONCILED_STYLE_FIELDS = new Set(['fontWeight']);

/**
 * A Figma font-style NAME → the numeric weight it means.
 *
 * Every spelling collapses to one key (`'Semi Bold'`, `'SemiBold'`, `'semibold'` → `semibold`), and a
 * slant is stripped because it is not a weight: `'Bold Italic'` is 700. Deliberately NOT exhaustive over
 * every foundry's naming — a name that is not here returns `null` and the field goes `unevaluated`, which
 * is the honest answer. Guessing from a substring would read `'Semibold Italic'` correctly and
 * `'Extrablack'` wrongly, with no way to tell which happened.
 */
const WEIGHT_OF_FONT_STYLE: Record<string, number> = {
  thin: 100, hairline: 100,
  extralight: 200, ultralight: 200,
  light: 300,
  regular: 400, normal: 400, book: 400, roman: 400,
  medium: 500,
  semibold: 600, demibold: 600,
  bold: 700,
  extrabold: 800, ultrabold: 800,
  black: 900, heavy: 900,
};

const weightOfFontStyle = (name: string): number | null => {
  const bare = name.toLowerCase().replace(/italic|oblique/g, '').replace(/[^a-z]/g, '');
  return WEIGHT_OF_FONT_STYLE[bare] ?? null;
};

/** `high` for a field a consumer sees immediately or that removes the style's effect outright — the
 *  family, the size, the weight name, a shadow's type or visibility, the NUMBER of effects or stops.
 *  `medium` for drift within an effect that still renders: an offset, a radius, a color, a line height. */
const HIGH_STYLE_FIELD = /^(fontFamily|fontSize|fontStyle|paintType)$|(\.type|\.visible|\.length)$/;
const severityOfStyleField = (field: string): Severity => (HIGH_STYLE_FIELD.test(field) ? 'high' : 'medium');

const armStyles = (expected: State, actual: State) => {
  const findings: Finding[] = [];
  const unevaluated: string[] = [];
  const notes: string[] = [];
  const want = expected.styles ?? {};
  if (Object.keys(want).length === 0) {
    unevaluated.push(
      'style-definition arm (i) has nothing to check: the expected state carries no style definitions. ' +
        'Re-run `expected.ts` — the engine emits four style files for every brand.',
    );
    return { findings, unevaluated, notes, checked: 0 };
  }
  if (actual.styles === undefined) {
    // Absent is a blind spot, NOT an empty file. `{}` would mean "enumerated, and there are none",
    // which is a real finding on every emitted style. See `State.styles`.
    unevaluated.push(
      `style-definition arm (i) could not run: the read did not enumerate style definitions, so none of the ` +
        `${Object.keys(want).length} styles the engine emits is checked — their interiors are unknown, not ` +
        `correct. Add the style read from the README to the actual state.`,
    );
    return { findings, unevaluated, notes, checked: 0 };
  }
  const library = new Set(actual.libraryConsumed?.styles ?? []);
  let fromLibrary = 0;
  let ridingOnVariable = 0;
  let checked = 0;

  for (const [key, w] of Object.entries(want)) {
    const got = actual.styles[key];
    if (!got) {
      if (library.has(key)) { fromLibrary++; continue; }
      findings.push(
        f('style-definition', 'high', showStyleKey(key),
          'the engine emits this style and the file does not have it — every node the engine points at it is ' +
            'separately a binding finding, and this is the root cause reported once, at the style',
          `${Object.keys(w.props).length} propert(ies)`, 'absent'),
      );
      continue;
    }
    checked++;
    for (const field of [...new Set([...Object.keys(w.props), ...Object.keys(got.props)])].sort()) {
      const wp = w.props[field];
      const gp = got.props[field];

      // A field Figma cannot carry, checked through the property it can. Header: `fontWeight`.
      if (RECONCILED_STYLE_FIELDS.has(field) && !gp) {
        if (!wp || wp.kind !== 'value') continue;
        const gotStyle = got.props.fontStyle;
        if (!gotStyle) {
          unevaluated.push(
            `${showStyleKey(key)}: the engine sets fontWeight ${wp.value} and the read carries neither a ` +
              `fontWeight nor a fontStyle to check it through`,
          );
          continue;
        }
        if (gotStyle.kind === 'variable') {
          // The weight rides on the bound font-style variable, which the `fontStyle` field already
          // compares by name. Checking it twice would be the same claim in two categories.
          ridingOnVariable++;
          continue;
        }
        const weight = weightOfFontStyle(gotStyle.value);
        if (weight === null) {
          unevaluated.push(
            `${showStyleKey(key)}: the file's fontStyle '${gotStyle.value}' names no weight this harness knows, ` +
              `so the engine's fontWeight ${wp.value} is unchecked here`,
          );
          continue;
        }
        if (String(weight) !== wp.value)
          findings.push(
            f('style-definition', 'high', showStyleKey(key),
              'the weight named by the file\'s font style is not the weight the engine sets — Figma stores a ' +
                'style NAME rather than a number, so the name is the whole of the claim',
              `fontWeight ${wp.value}`, `fontStyle '${gotStyle.value}' (weight ${weight})`),
          );
        continue;
      }

      if (!gp) {
        findings.push(
          f('style-definition', severityOfStyleField(field), showStyleKey(key),
            `the style is missing a property the engine sets (${field})`,
            wp.kind === 'variable' ? `variable ${wp.name}` : wp.value, 'not set on this style'),
        );
        continue;
      }
      if (!wp) {
        findings.push(
          f('style-definition', 'low', showStyleKey(key),
            `the style carries a property the engine does not set (${field}) — the designer's own, not a broken ` +
              `promise of the engine's`,
            'not set by the engine', gp.kind === 'variable' ? `variable ${gp.name}` : gp.value),
        );
        continue;
      }
      if (wp.kind === 'variable' && gp.kind === 'variable') {
        if (wp.name !== gp.name)
          findings.push(
            f('style-definition', 'high', showStyleKey(key),
              `the style's ${field} is bound to the wrong variable`, wp.name, gp.name),
          );
        continue;
      }
      if (wp.kind !== gp.kind) {
        // #1387 at the style interior: a literal that resolves correctly today and tracks nothing.
        const flattened = wp.kind === 'variable';
        findings.push(
          f('style-definition', 'high', showStyleKey(key),
            flattened
              ? `the style's ${field} is a raw value where the engine binds a variable — it shows the right ` +
                `thing today and will not follow the token`
              : `the style's ${field} is variable-bound where the engine sets a literal`,
            wp.kind === 'variable' ? `variable ${wp.name}` : wp.value,
            gp.kind === 'variable' ? `variable ${gp.name}` : gp.value),
        );
        continue;
      }
      if (wp.kind === 'value' && gp.kind === 'value' && wp.value !== gp.value) {
        const wu = unitOfCanon(wp.value);
        const gu = unitOfCanon(gp.value);
        const carriesUnit = field === 'lineHeight' || field === 'letterSpacing';
        if (carriesUnit && wu !== gu)
          // A unit difference, and the one the harness does NOT normalize away. See the header.
          findings.push(
            f('style-definition', 'high', showStyleKey(key),
              `the ${field} is ${gu} where the engine bakes ${wu} — not two spellings of one value: the ` +
                `engine's ${wu} is mode-invariant on purpose (#1356), and a ${gu} line height is that ` +
                `multiplier evaluated at ONE font size and frozen, so it is wrong at every other size in a ` +
                `fluid set`,
              wp.value, gp.value),
          );
        else
          findings.push(
            f('style-definition', severityOfStyleField(field), showStyleKey(key),
              `the style's ${field} has drifted from what the engine emits`, wp.value, gp.value),
          );
      }
    }
  }

  for (const key of Object.keys(actual.styles))
    if (!(key in want))
      findings.push(
        f('style-definition', 'low', showStyleKey(key),
          'the file has a style the engine does not emit — a designer\'s own, so nothing generated points at it',
          'not emitted by the engine', `${Object.keys(actual.styles[key].props).length} propert(ies)`),
      );

  if (checked === 0 && Object.keys(actual.styles).length === 0)
    unevaluated.push(
      `style-definition arm (i) compared 0 interiors: the read enumerated styles and found none, so all ` +
        `${Object.keys(want).length} findings above are the same fact — the file has no styles at all`,
    );
  if (fromLibrary > 0)
    notes.push(
      `${fromLibrary} style(s) the engine emits are CONSUMED FROM A PUBLISHED LIBRARY rather than authored ` +
        `here, and are not reported as absent: their interiors live in the library file, so this document ` +
        `cannot be wrong about them. Scan the library to check them. Counted here so the suppression is visible.`,
    );
  if (ridingOnVariable > 0)
    notes.push(
      `${ridingOnVariable} text style(s) had their fontWeight checked through a variable-bound fontStyle rather ` +
        `than as a number: Figma stores no fontWeight on a text style, and where the style name is bound the ` +
        `fontStyle comparison already covers it by name`,
    );
  return { findings, unevaluated, notes, checked };
};

// ── ARM (f): STRUCTURE ─────────────────────────────────────────────────────────────────────────

const armStructure = (expected: State, actual: State, inScope: (component: string) => boolean) => {
  const findings: Finding[] = [];
  const notes: string[] = [];
  const library = new Set(actual.libraryConsumed?.collections ?? []);
  let fromLibrary = 0;
  for (const [collection, want] of Object.entries(expected.collections)) {
    const got = actual.collections[collection];
    if (!got) {
      // The collection-level half of the same suppression: a file consuming the engine's published
      // library has none of its collections locally, and every mode inside them is likewise not this
      // file's to carry. Reported, it is the whole collection list as findings.
      if (library.has(collection)) { fromLibrary++; continue; }
      findings.push(
        f('structure', 'high', `collection '${collection}'`, 'the engine emits this collection and the file does not have it',
          `modes ${want.modes.join(', ')}`, 'absent'),
      );
      continue;
    }
    const missing = want.modes.filter((m) => !got.modes.includes(m));
    const extra = got.modes.filter((m) => !want.modes.includes(m));
    if (missing.length)
      findings.push(
        f('mode-coverage', 'high', `collection '${collection}'`, 'the collection is missing modes the engine emits',
          want.modes.join(', '), got.modes.join(', ')),
      );
    if (extra.length)
      findings.push(
        f('mode-coverage', 'low', `collection '${collection}'`, 'the collection carries modes the engine does not emit',
          want.modes.join(', '), got.modes.join(', ')),
      );
  }
  for (const collection of Object.keys(actual.collections))
    if (!(collection in expected.collections))
      findings.push(
        f('structure', 'medium', `collection '${collection}'`,
          'orphaned collection — the file has a collection the engine does not emit',
          'not emitted by the engine', `modes ${actual.collections[collection].modes.join(', ')}`),
      );

  for (const [id, want] of Object.entries(expected.structure)) {
    if (!inScope(id)) continue;
    const got = actual.structure[id];
    if (!got) {
      findings.push(
        f('structure', 'high', `component '${id}'`, 'the engine builds this component and the file does not have it',
          `${want.emitAs === 'set' ? 'a set of' : ''} ${want.members.length} member(s)`.trim(), 'absent'),
      );
      continue;
    }
    if (got.emitAs !== want.emitAs)
      // `emitAsComponents` (#1012): `icon` is 43 standalone components and NOT a set. Getting this
      // backwards turns a correct library into 43 missing members plus 43 orphans, so it is reported
      // as its own finding and the member comparison below still runs on the names.
      findings.push(
        f('structure', 'high', `component '${id}'`,
          `built as ${got.emitAs === 'set' ? 'a component set' : 'standalone components'} where the engine emits ${want.emitAs === 'set' ? 'a component set' : 'standalone components'}`,
          want.emitAs, got.emitAs),
      );
    const wm = new Set(want.members), gm = new Set(got.members);
    const missing = want.members.filter((m) => !gm.has(m));
    const extra = got.members.filter((m) => !wm.has(m));
    if (missing.length)
      findings.push(
        f('structure', 'high', `component '${id}'`, `${missing.length} member(s) the engine builds are not in the file`,
          `${want.members.length} members`, `${got.members.length} members; missing ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? `, +${missing.length - 4} more` : ''}`),
      );
    if (extra.length)
      findings.push(
        f('structure', 'medium', `component '${id}'`, `${extra.length} member(s) in the file are not ones the engine builds`,
          `${want.members.length} members`, `${got.members.length} members; extra ${extra.slice(0, 4).join(', ')}${extra.length > 4 ? `, +${extra.length - 4} more` : ''}`),
      );
    const wa = want.axes.join(','), ga = got.axes.join(',');
    if (wa !== ga)
      findings.push(
        f('structure', 'high', `component '${id}'`, 'variant axes differ — the set offers a different set of properties than the engine builds',
          wa || '(none)', ga || '(none)'),
      );
  }
  for (const id of Object.keys(actual.structure))
    if (!(id in expected.structure))
      findings.push(
        f('structure', 'medium', `component '${id}'`, 'the file has a component the engine does not build',
          'not built by the engine', `${actual.structure[id].members.length} member(s)`),
      );
  if (fromLibrary > 0)
    notes.push(
      `${fromLibrary} collection(s) the engine emits are CONSUMED FROM A PUBLISHED LIBRARY rather than authored ` +
        `here, and are not reported as absent — nor are their modes, which a local read cannot enumerate ` +
        `either. Counted here so the suppression is visible.`,
    );
  return { findings, notes };
};

// ── ARM (g): CONTRAST, RE-MEASURED ON THE FILE'S OWN COLORS ────────────────────────────────────

const EPS = 0.02; // the engine's own tolerance (`lint-ratio-truth.ts`) — float noise is not a failure.

const armContrast = (expected: State, actual: State) => {
  const findings: Finding[] = [];
  const unevaluable: string[] = [];
  let measured = 0;
  const colorOf = (name: string, mode: string, c: ContrastContract): { rgb: { r: number; g: number; b: number } } | null => {
    const r = resolveValue(actual, name, mode);
    if ('error' in r) {
      unevaluable.push(`${c.mode}/${c.role}: ${r.error}`);
      return null;
    }
    const rgb = parseCanonColor(r.value);
    if (!rgb) {
      unevaluable.push(`${c.mode}/${c.role}: '${name}' [${mode}] is ${r.value}, which is not a color`);
      return null;
    }
    return { rgb };
  };
  for (const c of expected.contrast) {
    const role = colorOf(c.roleVariable, c.mode, c);
    const ground = colorOf(c.againstVariable, c.mode, c);
    if (!role || !ground) continue;
    let ratio: number;
    if (c.model === 'ink-on-composite') {
      // Same dispatch as `lint-ratio-truth.ts`: the role color is a translucent wash over the ground,
      // and the contract is whether `legibleFor`'s ink still clears the floor on the RESULT.
      if (c.alpha == null || !c.legibleForVariable) {
        unevaluable.push(`${c.mode}/${c.role}: model 'ink-on-composite' without alpha/legibleFor in the expected state`);
        continue;
      }
      const ink = colorOf(c.legibleForVariable, c.mode, c);
      if (!ink) continue;
      ratio = contrast(ink.rgb, composite(ground.rgb, role.rgb, c.alpha));
    } else {
      ratio = contrast(role.rgb, ground.rgb);
    }
    measured++;
    // The RAW ratio against the floor — CR-01 in `color.ts`: rounding before a threshold test
    // false-passed a 4.4990 as 4.50, and this arm must not reintroduce that.
    if (ratio + EPS < c.min)
      // The per-pair RATIOS stay out of the summary and go in `expected`/`actual`. They are what the
      // report groups on, and a ratio in the summary makes every one of N failures its own group of
      // one — grouping that does not group. The verdict that DOES belong in the summary is which side
      // is at fault, because that decides who fixes it.
      findings.push(
        f('contrast', 'high', `${c.mode} · ${c.role} on ${c.against}`,
          c.engineRatio + EPS < c.min
            ? `AA failure below the ${c.min}:1 floor (${c.model}) — the ENGINE fails this contract too, so it is an engine defect rather than file drift`
            : `AA failure below the ${c.min}:1 floor (${c.model}) — the engine clears this contract, so the file's colors drifted`,
          `≥ ${c.min}:1 (engine measures ${c.engineRatio.toFixed(2)}:1)`,
          `${ratio.toFixed(2)}:1 on the file's own colors`),
      );
  }
  const unevaluated: string[] = [];
  if (expected.contrast.length > 0 && measured === 0)
    unevaluated.push(
      `contrast arm (g) measured 0 of ${expected.contrast.length} contracts — every one was unevaluable, so ` +
        `this arm reports nothing about the file. Read the variables into the actual state and re-run.`,
    );
  else if (unevaluable.length > 0)
    unevaluated.push(
      `contrast arm (g) measured ${measured} of ${expected.contrast.length} contracts; ${unevaluable.length} were ` +
        `unevaluable: ${[...new Set(unevaluable)].slice(0, 4).join(' | ')}${unevaluable.length > 4 ? ' | …' : ''}`,
    );
  return { findings, unevaluated, measured };
};

// ── THE DIFF ────────────────────────────────────────────────────────────────────────────────────

export const diff = (expected: State, actual: State): Report => {
  const scoped = actual.scope?.components;
  const inScope = scoped ? (c: string) => scoped.includes(c) : () => true;

  if (expected.root !== actual.root)
    // Every binding and variable comparison below is keyed by a name that starts with the root. Two
    // different roots means every single one mismatches, which is 30k findings describing one fact —
    // and it is #1511's failure mode exactly. Report the one fact and stop.
    return {
      clean: false,
      brand: expected.from,
      file: actual.from,
      scope: scoped ? `${scoped.length} component(s)` : null,
      counts: Object.fromEntries(CATEGORIES.map((c) => [c, c === 'structure' ? 1 : 0])) as Record<Category, number>,
      findings: [
        f('structure', 'high', 'brand root',
          'the file\'s variables carry a different brand root than this brand emits, so no name-keyed comparison ' +
            'below it is meaningful — every arm is suppressed. Scan against the brand this file was built from.',
          expected.root, actual.root),
      ],
      unevaluated: [`all ${CATEGORIES.length} arms suppressed: the two sides do not share a brand root`],
      notes: [],
    };

  const findings: Finding[] = [];
  const unevaluated: string[] = [];
  const notes: string[] = [];

  const b = armBindings(expected, actual, inScope);
  findings.push(...b.findings);
  unevaluated.push(...b.unevaluated);
  notes.push(...b.notes);

  const v = armVariables(expected, actual);
  findings.push(...v.findings);
  notes.push(...v.notes);

  const s = armStructure(expected, actual, inScope);
  findings.push(...s.findings);
  notes.push(...s.notes);

  const g = armContrast(expected, actual);
  findings.push(...g.findings);
  unevaluated.push(...g.unevaluated);

  const st = armStyles(expected, actual);
  findings.push(...st.findings);
  unevaluated.push(...st.unevaluated);
  notes.push(...st.notes);

  // (h) staleness.
  if (actual.engineVersion == null)
    unevaluated.push(
      'staleness arm (h) could not run: the file carries no `memberStamp` shared plugin data, so the engine ' +
        'version that built it is unknown. A hand-made file, or one built before stamping.',
    );
  else if (actual.engineVersion !== expected.engineVersion)
    findings.push(
      f('staleness', 'medium', 'engine version',
        'the file was built by a different engine than this checkout, so every other finding here may be a ' +
          'version gap rather than drift',
        expected.engineVersion ?? '(unknown)', actual.engineVersion),
    );

  if (Object.keys(actual.variables).length === 0)
    unevaluated.push(
      'the actual state carries no variables, so arms (c), (d), (e) and (g) report nothing about the file — ' +
        'a 0 count in those four is an absence of evidence',
    );
  if (Object.keys(actual.structure).length === 0)
    unevaluated.push('the actual state carries no components, so arm (f) reports only on collections');

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const x of findings) counts[x.category]++;

  return {
    clean: findings.length === 0,
    brand: expected.from,
    file: actual.from,
    scope: scoped ? `${scoped.length} of ${Object.keys(expected.structure).length} component(s): ${scoped.join(', ')}` : null,
    counts,
    findings,
    unevaluated,
    notes,
  };
};

// ── THE REPORT ──────────────────────────────────────────────────────────────────────────────────

const SEV_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

/** A finding's own group, so a category with 5,000 findings of one shape prints as one line with a
 *  count and four examples rather than 5,000 lines nobody reads. The group is the SUMMARY (the defect),
 *  not the subject (the instance). */
const groupKey = (x: Finding): string => `${x.severity} ${x.summary}`;

export const render = (r: Report): string => {
  const L: string[] = [];
  L.push('');
  L.push(`CONFORMANCE SCAN — ${r.brand} (engine expectation)  vs  ${JSON.stringify(r.file)} (Figma)`);
  L.push('='.repeat(96));
  if (r.scope) L.push(`SCOPE: the actual read covered ${r.scope}. Everything outside it is NOT checked.`);
  L.push(
    r.clean
      ? `RESULT: clean across all ${CATEGORIES.length} categories${r.scope ? ' WITHIN THE SCOPE ABOVE' : ''}.`
      : `RESULT: ${r.findings.length} finding(s) — ` +
        (['high', 'medium', 'low'] as Severity[])
          .map((s) => `${r.findings.filter((x) => x.severity === s).length} ${s}`)
          .join(', '),
  );
  L.push('');
  for (const c of CATEGORIES) L.push(`  ${String(r.counts[c]).padStart(6)}  (${letterOf(c)}) ${c}`);
  L.push('');
  if (r.unevaluated.length) {
    L.push('NOT EVALUATED — the report\'s own blind spots. A 0 count above may be one of these:');
    for (const u of r.unevaluated) L.push(`  ! ${u}`);
    L.push('');
  }
  if (r.notes.length) {
    L.push('CHECKED AND NOT REPORTED — a judgement, with its count, so the suppression is visible:');
    for (const n of r.notes) L.push(`  · ${n}`);
    L.push('');
  }
  for (const c of CATEGORIES) {
    const mine = r.findings.filter((x) => x.category === c);
    if (mine.length === 0) continue;
    L.push('-'.repeat(96));
    L.push(`(${letterOf(c)}) ${c.toUpperCase()} — ${mine.length} finding(s)`);
    const groups = new Map<string, Finding[]>();
    for (const x of mine) groups.set(groupKey(x), [...(groups.get(groupKey(x)) ?? []), x]);
    const sorted = [...groups.values()].sort(
      (a, b) => SEV_ORDER[a[0].severity] - SEV_ORDER[b[0].severity] || b.length - a.length,
    );
    for (const gr of sorted) {
      L.push('');
      L.push(`  [${gr[0].severity}] ${gr[0].summary}  ×${gr.length}`);
      for (const x of gr.slice(0, 4)) {
        L.push(`      ${x.subject}`);
        L.push(`        expected: ${x.expected}`);
        L.push(`        actual:   ${x.actual}`);
      }
      if (gr.length > 4) L.push(`      … and ${gr.length - 4} more of this shape`);
    }
    L.push('');
  }
  L.push('='.repeat(96));
  L.push('Report only — nothing was changed in Figma or in the repo. This is a tool, not a gate: it exits 0.');
  L.push('');
  return L.join('\n');
};

// ── THE SELF-CHECK ──────────────────────────────────────────────────────────────────────────────
//
// The harness's own by-name proof, and the reason it is a FIXTURE rather than a unit test over a
// generated pair: a self-check built from `expected.ts`'s output would be a gate derived from its own
// subject (`docs/34-gate-independence.md`), and the arm it cannot catch is exactly the arm that
// silently stopped working. So the fixture is hand-written, the manifest of what it should find is
// hand-written next to it, and the assertion is SET EQUALITY in both directions:
//
//   - a finding in the manifest and not in the report → that arm is broken or gone
//   - a finding in the report and not in the manifest → the diff reports something it should not
//
// One injected defect per category (a)-(h), each keyed by `category + subject`. The clean-baseline run
// comes FIRST and must report zero: without it, "reports exactly those eight" is satisfiable by a diff
// that reports everything.

type Manifest = { clean: string; dirty: string; expect: string[] };

const selftest = (): number => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const load = (p: string, side: State['side']) =>
    readState(JSON.parse(readFileSync(resolve(dir, 'fixtures', p), 'utf8')), `fixtures/${p}`, side);
  const manifest = JSON.parse(readFileSync(resolve(dir, 'fixtures/manifest.json'), 'utf8')) as Manifest;

  let failed = 0;
  const expectedState = load('expected.json', 'expected');

  // 1. THE BASELINE. `actual-clean.json` is a faithful mirror of the expected fixture, and a diff of
  //    the two must be empty. If it is not, every count in step 2 is noise.
  const base = diff(expectedState, load(manifest.clean, 'actual'));
  if (!base.clean) {
    failed++;
    console.log(`FAIL  baseline: a faithful actual produced ${base.findings.length} finding(s) — the diff reports drift where there is none:`);
    for (const x of base.findings.slice(0, 10)) console.log(`        (${x.category}) ${x.subject}: ${x.summary} [want ${x.expected}, got ${x.actual}]`);
  } else {
    console.log(`PASS  baseline: a faithful actual over ${Object.keys(expectedState.bindings).length} bindings, ` +
      `${Object.keys(expectedState.variables).length} variables and ${expectedState.contrast.length} contracts diffs clean`);
  }
  if (base.unevaluated.length) {
    // An arm that could not run in the baseline cannot be proven by step 2 either — its finding would
    // be "absent" for a reason that has nothing to do with the injected defect.
    failed++;
    console.log(`FAIL  baseline: ${base.unevaluated.length} arm(s) could not evaluate against the fixture, so step 2 cannot prove them:`);
    for (const u of base.unevaluated) console.log(`        ! ${u}`);
  }

  // 2. THE BY-NAME PROOF. One defect per category, and the report must name exactly those.
  const dirty = diff(expectedState, load(manifest.dirty, 'actual'));
  const got = new Set(dirty.findings.map((x) => `${x.category}: ${x.subject}`));
  const want = new Set(manifest.expect);
  const missing = [...want].filter((x) => !got.has(x)).sort();
  const extra = [...got].filter((x) => !want.has(x)).sort();
  if (missing.length) {
    failed++;
    console.log(`FAIL  ${missing.length} manifest finding(s) the diff did NOT report — that arm is broken or gone:`);
    for (const m of missing) console.log(`        MISSING  ${m}`);
  }
  if (extra.length) {
    failed++;
    console.log(`FAIL  ${extra.length} finding(s) the diff reported that the manifest does not expect:`);
    for (const e of extra) console.log(`        EXTRA    ${e}`);
  }
  if (!missing.length && !extra.length)
    console.log(`PASS  by-name: the diff reported exactly the ${want.size} injected defect(s), one per category`);

  // 3. EVERY CATEGORY REPRESENTED. A manifest that quietly lost its (g) row would let step 2 pass
  //    while the contrast arm was dead — `docs/34`: assert each promised surface is REPRESENTED,
  //    never merely count.
  const covered = new Set([...want].map((x) => x.split(':')[0]));
  const uncovered = CATEGORIES.filter((c) => !covered.has(c));
  if (uncovered.length) {
    failed++;
    console.log(`FAIL  the manifest has no injected defect for ${uncovered.length} category(ies), so they are unproven: ${uncovered.join(', ')}`);
  } else {
    console.log(`PASS  coverage: all ${CATEGORIES.length} categories have an injected defect in the manifest`);
  }

  // 4. THE SIDE GUARD. Transposed arguments must throw rather than diff in the mirror direction.
  try {
    readState(JSON.parse(readFileSync(resolve(dir, 'fixtures/expected.json'), 'utf8')), 'transposed', 'actual');
    failed++;
    console.log('FAIL  side guard: an expected state was accepted as an actual one — a transposed argument pair would read as a pass');
  } catch {
    console.log('PASS  side guard: an expected state is refused in the actual position');
  }

  console.log('');
  console.log(failed === 0 ? 'SELF-CHECK: PASS' : `SELF-CHECK: FAIL (${failed} check(s))`);
  return failed === 0 ? 0 : 1;
};

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────

const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  const args = process.argv.slice(2);
  if (args[0] === '--selftest') process.exit(selftest());
  const [a, b] = args.filter((x) => !x.startsWith('--'));
  if (!a || !b) {
    console.log('usage: npx tsx tools/conformance-scan/diff.ts <expected.json> <actual.json> [--json]');
    console.log('       npx tsx tools/conformance-scan/diff.ts --selftest');
    process.exit(1);
  }
  const report = diff(
    readState(JSON.parse(readFileSync(a, 'utf8')), a, 'expected'),
    readState(JSON.parse(readFileSync(b, 'utf8')), b, 'actual'),
  );
  console.log(args.includes('--json') ? JSON.stringify(report, null, 2) : render(report));
  // Exits 0 WITH findings, on purpose. `tools/CLAUDE.md`: a tool answers a question and exits 0; a
  // gate asserts an answer and fails. Wiring this into CI as a gate would make every designer's
  // in-progress file a red build.
}
