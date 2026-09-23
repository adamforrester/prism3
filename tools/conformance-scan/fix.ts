/**
 * CONFORMANCE SCAN — THE FIX PLAN (#1553 P2).
 *
 *   npx tsx tools/conformance-scan/fix.ts <expected.json> <actual.json>          # the plan, rendered
 *   npx tsx tools/conformance-scan/fix.ts <expected.json> <actual.json> --json   # the plan, for the snippet
 *   npx tsx tools/conformance-scan/fix.ts --selftest
 *
 * P1 answered "does this Figma file match what the engine says should be there?" and stopped. This is the
 * other half of the loop — build → scan → FIX → re-scan — and it is a plan EMITTER, not an executor. It
 * has no Figma access and never will: the writes are the agent's, through `figma-console-mcp`'s
 * `figma_execute` over the snippet in the README, dry-run first. So this file is pure, the plan is plain
 * JSON, and everything that could go wrong with the writes is visible in the plan before any of them run.
 *
 * ── THE SAFE/UNSAFE BOUNDARY IS THE DESIGN ──────────────────────────────────────────────────────
 *
 * Get it wrong and a report-only harness becomes a destructive one, so the boundary is a WHITELIST of two
 * shapes and every other finding is carried as an EXCLUSION with a reason. Two shapes are safe:
 *
 *   (c) value-match — the variable exists, is bound, and its value in one mode has drifted from what the
 *       engine emits. `setValueForMode` with the engine's value. Nothing about the file's STRUCTURE moves:
 *       the same variable, the same mode, the same bindings, one value.
 *   (a) binding-presence, the RAW-LITERAL branch only — a hex where the engine binds a variable (#1387),
 *       AND ONLY WHEN THAT VARIABLE IS IN THE FILE. `setBoundVariableForPaint` / `setBoundVariable`.
 *
 * Everything else emits NOTHING. The reasons are not a policy preference; each one is a case where the
 * op a naive reading suggests is either destructive or cannot run:
 *
 *   (f) structure    a missing component or variable. The plugin's rebuild is guarded by a STALE check,
 *                    so re-running it over a drifted file is exactly the destructive path decision #5
 *                    holds with the owner. Never a component op, from here, ever.
 *   (b) binding-target  bound, to the wrong variable — the icon-role-vs-text-role confusion. Which token
 *                    a node should carry is a DESIGN decision, and the two candidates usually render
 *                    almost identically, so a wrong automatic choice is invisible and permanent.
 *   (d) mode-coverage   a mode the engine emits and the file lacks. Adding and removing modes is the
 *                    reconciler's job (#1570) and the prune's (#1521), where mode identity is tracked.
 *   (h) staleness    the file was built by an older engine. The fix is a rebuild, not a value write.
 *   (g) contrast     never itself an op. A contrast failure is a CONSEQUENCE — usually of a (c) drift,
 *                    which is fixed as (c) — and "make this pass AA" has no unique answer.
 *   (e) scope-type   `resolvedType` and `scopes` are properties of the EMISSION. Retyping a live variable
 *                    coerces or drops every value already bound through it.
 *   (i) style-definition  a style's interior is written by the plugin's four style writers. Editing
 *                    interiors here would fork them, and a partially-written style renders wrong.
 *
 * ── WHY THE PLAN IS A COMPLETE ACCOUNTING AND NOT A SUBSET ──────────────────────────────────────
 *
 * `ops.length + excluded.length === findings.length`, asserted, every finding landing in exactly one
 * bucket. A fix tool whose output is a silent subset of the diff teaches its operator that the plan IS the
 * remaining work, which is the one belief that makes an unsafe category dangerous: the (f) findings do not
 * stop existing because nothing can be done about them automatically. So they are printed, with their
 * reason, under the ops. The plan is the whole diff, sorted into what this tool will do and what it will
 * not touch.
 *
 * The same property is what makes a TENTH diff category safe to add: `EXCLUSION_REASON` is keyed by
 * `Category`, so a new category is a TYPE ERROR here until somebody classifies it, and the classification
 * it cannot get by default is `safe`. A category that appears while this file is not looking is excluded,
 * never fixed, and never silently dropped either.
 *
 * ── WHAT THE OPS ARE BUILT FROM, AND WHY NOT FROM THE REPORT ALONE ──────────────────────────────
 *
 * `fix` takes the two STATES as well as the report, and the values it writes come out of the EXPECTED
 * STATE — `expected.variables[name].modes[mode]` — never off the finding's rendered `expected` string. The
 * finding is what SELECTS a fix; the expectation is what SUPPLIES it. Three things follow:
 *
 *   1. The `resolvedType` is READ rather than inferred. A canonical value string is ambiguous on its own —
 *      a STRING variable whose value is `12` is indistinguishable from a FLOAT one — and a wrongly typed
 *      `setValueForMode` is a write that either throws or silently coerces.
 *   2. "The expected variable EXISTS in the file" is a LOOKUP in `actual.variables`, which is the only
 *      place that fact lives. A rebind to a variable that is not there cannot run, so it is a structure
 *      gap and not a fix — and a variable consumed from a published library is also absent from a local
 *      read, so it lands here too, correctly: binding it needs an import, which is not this tool's op.
 *   3. The two must AGREE. Where the state's value and the finding's `expected` disagree the finding is
 *      excluded rather than applied, because a report and a state that disagree are not a file anybody
 *      should be writing to — most likely a report kept from a previous scan.
 *
 * A coordinate is never parsed back out of a rendered subject either: `showBindKey` is one-way (a node
 * name could contain the separator), so the subject is matched against a map of the expectation's own
 * keys, and the op's coordinate comes from `parseBindKey` of the real key.
 *
 * ── IDEMPOTENCE, AND THE TWO SENSES IT HAS TO HOLD IN ───────────────────────────────────────────
 *
 * Every op is an ABSOLUTE write of a desired state, never a delta: `setValueForMode(mode, <the engine's
 * value>)` and `setBoundVariable(property, <the engine's variable>)`. So applying the same plan twice
 * leaves the file exactly as applying it once did. And after an apply, a re-scan no longer reports the
 * finding, so `fix` over the re-scan emits zero ops. The self-check proves both — the second by applying
 * the plan to the actual STATE in memory and re-diffing.
 *
 * The in-memory apply is a model of Figma, and a narrow one: it claims only that `setValueForMode`
 * replaces a mode's value and that a rebind replaces a bind state. That is enough to prove the plan is
 * internally consistent with the scan's own model of the file, and it is NOT a claim that Figma behaves
 * this way. Only the host acceptance run (README) can say that, which is why it is a named step there and
 * not a thing this file pretends to cover.
 *
 * ── PRECISION: THE FIX IS EXACT AT THE SCAN'S OWN RESOLUTION ────────────────────────────────────
 *
 * A color travels as `rgba(26,26,26,1)` — 8-bit channels, which `state.ts` canonicalizes to because it is
 * lossless for every value the emitter can produce (the emitter derives them from 0-255 integers). The op
 * therefore carries `26/255` and not the emitted double, and the two agree to well within what the scan
 * can see: the re-scan reads the file's own float back through the same `canonColor` and gets `26` again.
 * Stated rather than assumed, because "the fix restores the emitted bytes exactly" is a stronger claim
 * than this makes, and the weaker one is the true one.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, diff, type Category, type Finding, type Report } from './diff';
import {
  bindKey,
  parseBindKey,
  parseCanonColor,
  readState,
  showBindKey,
  type BindState,
  type State,
} from './state';

export const FIX_FORMAT = 'prism3-conformance-fix' as const;
export const FIX_VERSION = 1 as const;

/** A value in the shape the Plugin API's `setValueForMode` takes. JSON-serializable, because the plan
 *  crosses into `figma_execute` as JSON and nothing may be reconstructed by hand on the other side. */
export type FigmaValue = { r: number; g: number; b: number; a: number } | number | string | boolean;

/** Set ONE variable's value in ONE mode to what the engine emits. Category (c). */
export type SetVarValueOp = {
  op: 'set-var-value';
  subject: string;
  variable: string;
  mode: string;
  resolvedType: string;
  value: FigmaValue;
  /** The canonical strings, for the dry run: what is there now, and what it becomes. */
  from: string;
  to: string;
  addresses: Finding;
};

/** Bind ONE node property to the variable the engine plans for it, replacing a raw literal. Category (a),
 *  the raw-literal branch only. */
export type RebindOp = {
  op: 'rebind';
  subject: string;
  component: string;
  member: string;
  node: string;
  property: string;
  variable: string;
  /** The literal this overwrites — a hand-typed value, so the dry run has to show it. */
  from: string;
  addresses: Finding;
};

export type FixOp = SetVarValueOp | RebindOp;

/** A finding this tool will NOT act on, and why. Never a silence: see the header. */
export type Exclusion = { subject: string; category: Category; reason: string; addresses: Finding };

export type FixPlan = {
  format: typeof FIX_FORMAT;
  version: typeof FIX_VERSION;
  brand: string;
  file: string;
  /** Carried through from the report: a plan built over a scoped read only covers that scope. */
  scope: string | null;
  ops: FixOp[];
  excluded: Exclusion[];
  /** The three numbers that make "complete accounting" checkable rather than asserted in prose. */
  accounting: { findings: number; ops: number; excluded: number };
  notes: string[];
};

/**
 * Why each category is excluded, by default, in one sentence the operator reads.
 *
 * Keyed by `Category` so the compiler requires every one — including one added later, which then arrives
 * excluded rather than silently unhandled. The two SAFE shapes are exceptions carved out of (c) and (a)
 * below; these are what a finding gets when it is not one of them.
 */
const EXCLUSION_REASON: Record<Category, string> = {
  'binding-presence':
    'nothing bound, or bound through a different Figma API than the engine plans — only a RAW LITERAL ' +
    'where the engine binds a variable is safely fixable, and only when that variable is in the file',
  'binding-target':
    'bound to the wrong variable: which token a node carries is a design decision (the icon-role vs ' +
    'text-role confusion this category exists for), and the two usually render alike, so a wrong ' +
    'automatic choice would be invisible and permanent',
  'value-match':
    'the value could not be turned into a write — see the specific reason on this exclusion',
  'mode-coverage':
    'adding or removing a mode is the reconciler\'s job (#1570) and the prune\'s (#1521), where mode ' +
    'identity is tracked; a mode written from here would not be reconciled with the ones already there',
  'scope-type':
    '`resolvedType` and `scopes` are properties of the emission — retyping a live variable coerces or ' +
    'drops every value already bound through it',
  structure:
    'a missing component, variable or collection is a REBUILD, and the plugin\'s rebuild is guarded by a ' +
    'STALE check that makes re-running it over a drifted file the destructive path decision #5 holds ' +
    'with the owner',
  contrast:
    'a contrast failure is a consequence, never itself an op — usually of a value drift, which is fixed ' +
    'as (c); "make this pass AA" has no unique answer',
  staleness: 'the file was built by a different engine than this checkout — the fix is a rebuild, not a value write',
  'style-definition':
    'a style\'s interior is written by the plugin\'s four style writers; editing one from here would fork ' +
    'them, and a half-written style renders wrong',
};

/** The leading token of a finding's `expected`/`actual` — `variable` / `style` / `raw`, the vocabulary
 *  `bindKindOf` prints. Read rather than the SUMMARY prose: a summary is a sentence somebody may reword,
 *  and the failure direction of a reworded sentence has to be "no op emitted", never "the wrong op". */
const leadingKind = (s: string): string => s.split(' ')[0];

/** Decode a canonical value string back to the shape `setValueForMode` takes, by the variable's declared
 *  type. Returns a REASON instead of a value for anything it cannot decode — a guessed value is a write,
 *  and there is no such thing as a safe guessed write. */
export const decodeCanon = (
  resolvedType: string,
  canon: string,
): { value: FigmaValue } | { reason: string } => {
  if (resolvedType === 'COLOR') {
    const c = parseCanonColor(canon);
    if (!c) return { reason: `the expected COLOR ${JSON.stringify(canon)} is not an \`rgba(r,g,b,a)\` value` };
    return { value: { r: c.r / 255, g: c.g / 255, b: c.b / 255, a: c.a } };
  }
  if (resolvedType === 'FLOAT') {
    const n = Number(canon);
    if (!Number.isFinite(n)) return { reason: `the expected FLOAT ${JSON.stringify(canon)} is not a finite number` };
    return { value: n };
  }
  if (resolvedType === 'BOOLEAN') {
    if (canon !== 'true' && canon !== 'false')
      return { reason: `the expected BOOLEAN ${JSON.stringify(canon)} is neither \`true\` nor \`false\`` };
    return { value: canon === 'true' };
  }
  if (resolvedType === 'STRING') return { value: canon };
  return { reason: `\`${resolvedType}\` is not a type this tool knows how to write` };
};

// ── THE PLAN ────────────────────────────────────────────────────────────────────────────────────

/**
 * PURE. Emits a plan; applies nothing, reads nothing off disk, touches no Figma.
 *
 * One pass over the findings, each landing in exactly one bucket — `op` or `excluded` — so a finding
 * cannot be dropped by construction rather than by a later count. The count is then asserted anyway,
 * because "by construction" is a claim about code somebody will edit.
 */
export const fix = (report: Report, expected: State, actual: State): FixPlan => {
  const ops: FixOp[] = [];
  const excluded: Exclusion[] = [];
  const notes: string[] = [];

  /** Expected bind keys by their RENDERED subject, so a coordinate is matched rather than parsed back out
   *  of prose (`showBindKey` is one-way). Built once. */
  const keyBySubject = new Map(Object.keys(expected.bindings).map((k) => [showBindKey(k), k] as const));

  const exclude = (finding: Finding, reason?: string): void => {
    excluded.push({
      subject: finding.subject,
      category: finding.category,
      reason: reason ?? EXCLUSION_REASON[finding.category],
      addresses: finding,
    });
  };

  for (const finding of report.findings) {
    // ── (c) VALUE-MATCH → set-var-value ───────────────────────────────────────────────────────
    if (finding.category === 'value-match') {
      // Subject is `<name> [<mode>]`, both engine-controlled, so the split is on the LAST bracket pair.
      const m = /^(.+) \[([^\]]+)\]$/.exec(finding.subject);
      if (!m) {
        exclude(finding, `the subject ${JSON.stringify(finding.subject)} does not name a variable and a mode`);
        continue;
      }
      const [, name, mode] = m;
      const want = expected.variables[name];
      const got = actual.variables[name];
      if (!want) { exclude(finding, `'${name}' is not in the expectation's variable table`); continue; }
      if (!got) {
        exclude(finding, `'${name}' is not in the file's local variable table — absent, or consumed from a published library, and either way there is nothing here to write to`);
        continue;
      }
      const wm = want.modes[mode];
      if (!wm || wm.kind !== 'value') {
        exclude(finding, `the engine's '${name}' in mode '${mode}' is ${wm ? 'an ALIAS' : 'absent'}, not a concrete value — restoring an alias re-points one variable at another, which is a target change and not a value refresh`);
        continue;
      }
      if (wm.value !== finding.expected) {
        // The report and the expectation disagree — most likely a report kept from an earlier scan. See
        // the header: two documents that disagree are not a file anybody should be writing to.
        exclude(finding, `the expectation says '${name}' [${mode}] is ${JSON.stringify(wm.value)} and the report says ${JSON.stringify(finding.expected)} — they must agree before anything is written`);
        continue;
      }
      const decoded = decodeCanon(want.resolvedType, wm.value);
      if ('reason' in decoded) { exclude(finding, decoded.reason); continue; }
      ops.push({
        op: 'set-var-value',
        subject: finding.subject,
        variable: name,
        mode,
        resolvedType: want.resolvedType,
        value: decoded.value,
        from: finding.actual,
        to: wm.value,
        addresses: finding,
      });
      continue;
    }

    // ── (a) BINDING-PRESENCE, the RAW-LITERAL branch only → rebind ─────────────────────────────
    if (finding.category === 'binding-presence') {
      // A category-(a) finding is not always about a node. An alias the file FLATTENED to a raw value is
      // the #1387 shape one level up, at the variable, and `diff.ts` reports it here with a `<name>
      // [<mode>]` subject. It gets its own reason because the generic one below would describe a binding
      // that is not what went wrong. Identified by the variable LOOKUP, not by the subject's shape: a node
      // name ending in brackets matches the same regex and finds nothing in the variable table.
      //
      // NOT PROVEN BY A MUTATION, and said so rather than left to be assumed: the fixture carries no
      // flattened alias, and injecting one would add a defect to `manifest.json`'s answer key for the
      // benefit of an exclusion's prose — a different concern than this lane. The branch cannot emit an op,
      // so its failure direction is a worse sentence, never a write.
      const vm = /^(.+) \[([^\]]+)\]$/.exec(finding.subject);
      const asVariable = vm ? expected.variables[vm[1]] : undefined;
      if (vm && asVariable) {
        exclude(
          finding,
          asVariable.modes[vm[2]]?.kind === 'alias'
            ? `the file flattened an alias to a raw value — restoring it means writing a VARIABLE_ALIAS, which re-points one variable at another; that is a target change, and this tool emits no target changes`
            : `the file carries an alias where the engine emits a concrete value — replacing an alias is a target change, not a value refresh`,
        );
        continue;
      }
      if (leadingKind(finding.actual) !== 'raw' || leadingKind(finding.expected) !== 'variable') {
        // Every other shape of (a): nothing bound, a style where a variable is planned (or the reverse),
        // a detached text style, and the file's own unplanned bindings. None is a value to write.
        exclude(finding);
        continue;
      }
      const key = keyBySubject.get(finding.subject);
      if (!key) { exclude(finding, `the coordinate ${JSON.stringify(finding.subject)} is not in the expectation's binding table`); continue; }
      const want = expected.bindings[key];
      if (!('boundVariable' in want)) { exclude(finding, `the expectation binds a ${'boundStyle' in want ? 'style' : 'nothing'} at this coordinate, not a variable`); continue; }
      const variable = want.boundVariable;
      if (!(variable in actual.variables)) {
        // THE BOUNDARY. A rebind needs something to bind TO: a variable that is not in the file's local
        // table cannot be bound by name, so this is a structure gap wearing a binding finding's clothes.
        exclude(finding, `the engine binds '${variable}' here and the file does not have that variable locally (absent, or consumed from a published library) — a structure gap, so there is nothing to rebind to`);
        continue;
      }
      const { component, member, node, property } = parseBindKey(key);
      ops.push({
        op: 'rebind',
        subject: finding.subject,
        component,
        member,
        node,
        property,
        variable,
        from: finding.actual,
        addresses: finding,
      });
      continue;
    }

    exclude(finding);
  }

  // Deterministic order: variables before nodes (the order a file is built in), then by subject, so two
  // runs over the same pair produce the same plan byte for byte and a review diff is readable.
  const rank = (o: FixOp): number => (o.op === 'set-var-value' ? 0 : 1);
  ops.sort((a, b) => rank(a) - rank(b) || a.subject.localeCompare(b.subject));
  excluded.sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.subject.localeCompare(b.subject));

  if (report.scope)
    notes.push(`the scan covered ${report.scope} — this plan can only fix what was read, and says nothing about the rest of the file`);
  if (report.findings.some((x) => x.category === 'staleness'))
    notes.push(
      'the file carries a DIFFERENT engine version than this checkout (finding (h)), so these ops write ' +
        'THIS checkout\'s values into a file another one built. That is not refused — a stale file with a ' +
        'real value drift is exactly where an operator may want the value fix — but a rebuild is the ' +
        'better first move, and after it most of the rest of this plan usually disappears.',
    );
  if (report.unevaluated.length)
    notes.push(
      `the scan carried ${report.unevaluated.length} blind spot(s) of its own (the report's NOT EVALUATED ` +
        `section). A finding that was never made cannot be fixed or excluded here, so this plan is bounded ` +
        `by what the scan could see.`,
    );
  if (ops.length === 0 && report.findings.length > 0)
    notes.push('no safe op: every finding in this report is in a category this tool will not act on');

  const accounting = { findings: report.findings.length, ops: ops.length, excluded: excluded.length };
  if (accounting.ops + accounting.excluded !== accounting.findings)
    // Not reachable through the loop above, which has no path that skips a finding. Asserted because "by
    // construction" is a claim about code somebody will edit, and the failure it guards against is a plan
    // that reads like the remaining work while quietly being less than it.
    throw new Error(
      `the plan does not account for every finding: ${accounting.ops} op(s) + ${accounting.excluded} ` +
        `exclusion(s) != ${accounting.findings} finding(s). A plan that is a silent subset of the diff is ` +
        `worse than no plan.`,
    );

  return {
    format: FIX_FORMAT,
    version: FIX_VERSION,
    brand: report.brand,
    file: report.file,
    scope: report.scope,
    ops,
    excluded,
    accounting,
    notes,
  };
};

// ── THE RENDER (the dry run) ────────────────────────────────────────────────────────────────────

export const renderPlan = (p: FixPlan): string => {
  const L: string[] = [];
  L.push('');
  L.push(`FIX PLAN — ${p.brand} (engine expectation)  →  ${JSON.stringify(p.file)} (Figma)`);
  L.push('='.repeat(96));
  if (p.scope) L.push(`SCOPE: ${p.scope}. Nothing outside it was read, so nothing outside it is planned.`);
  L.push(
    `${p.accounting.findings} finding(s): ${p.accounting.ops} SAFE op(s), ` +
      `${p.accounting.excluded} left alone. This is a PLAN — nothing has been written.`,
  );
  L.push('');
  if (p.ops.length) {
    L.push('-'.repeat(96));
    L.push(`OPS — ${p.ops.length}, to apply via figma_execute (README, "the fix loop"). Idempotent.`);
    L.push('');
    for (const o of p.ops) {
      if (o.op === 'set-var-value') {
        L.push(`  set-var-value  ${o.variable} [${o.mode}]  (${o.resolvedType})`);
        L.push(`      ${o.from}  →  ${o.to}`);
      } else {
        L.push(`  rebind         ${o.component} · ${o.member} · ${o.node} · ${o.property}`);
        L.push(`      ${o.from}  →  variable ${o.variable}`);
      }
    }
    L.push('');
  }
  if (p.excluded.length) {
    L.push('-'.repeat(96));
    L.push(`LEFT ALONE — ${p.excluded.length}. Still real, still the file's; not safely automatable.`);
    const groups = new Map<string, Exclusion[]>();
    for (const e of p.excluded) groups.set(`${e.category}: ${e.reason}`, [...(groups.get(`${e.category}: ${e.reason}`) ?? []), e]);
    for (const [head, list] of groups) {
      L.push('');
      L.push(`  (${head})  ×${list.length}`);
      for (const e of list.slice(0, 4)) L.push(`      ${e.subject}`);
      if (list.length > 4) L.push(`      … and ${list.length - 4} more`);
    }
    L.push('');
  }
  if (p.notes.length) {
    L.push('-'.repeat(96));
    L.push('NOTES:');
    for (const n of p.notes) L.push(`  · ${n}`);
    L.push('');
  }
  L.push('='.repeat(96));
  L.push('Nothing was changed. Apply with the README snippet (DRY_RUN first), then RE-SCAN — the re-scan is');
  L.push('the only thing that says the fix landed. This is a tool, not a gate: it exits 0.');
  L.push('');
  return L.join('\n');
};

// ── THE IN-MEMORY APPLY (self-check only) ───────────────────────────────────────────────────────

/**
 * Apply a plan to an actual STATE, returning a new one. A model of Figma narrow enough to state whole:
 * `setValueForMode` replaces a mode's concrete value, and a rebind replaces a coordinate's bind state.
 *
 * Exported because the self-check is the only caller and it is worth being able to run by hand. NOT a
 * claim that Figma behaves this way — see the header, and the host acceptance run in the README.
 */
export const applyToState = (actual: State, plan: FixPlan): State => {
  const next: State = {
    ...actual,
    variables: Object.fromEntries(Object.entries(actual.variables).map(([k, v]) => [k, { ...v, modes: { ...v.modes } }])),
    bindings: { ...actual.bindings },
  };
  for (const o of plan.ops) {
    if (o.op === 'set-var-value') next.variables[o.variable].modes[o.mode] = { kind: 'value', value: o.to };
    else next.bindings[bindKey(o.component, o.member, o.node, o.property)] = { boundVariable: o.variable } as BindState;
  }
  return next;
};

// ── THE SELF-CHECK ──────────────────────────────────────────────────────────────────────────────
//
// Keyed to a HAND-WRITTEN answer key (`fixtures/fix-manifest.json`), for the reason `diff.ts --selftest`
// is: a manifest generated from this tool's own output is a gate derived from its subject
// (`docs/34-gate-independence.md`) and cannot fail. Set equality both ways, so an op that stops being
// emitted fails as MISSING and — the load-bearing direction — an op that appears for an unsafe category
// fails as EXTRA. The exact counts are asserted separately, because a row is `kind: subject` and two
// exclusions can share one.

type FixManifest = {
  dirty: string;
  accounting: { findings: number; ops: number; excluded: number };
  expect: string[];
  /** Ops whose full shape is pinned, not just their existence — the values actually written. */
  values: Record<string, string>;
  /** Categories no op may EVER address, whatever else changes. The safety pin. */
  neverFixed: Category[];
  /** Findings no op addresses that the apply clears ANYWAY, as `<category>: <subject>`. Hand-written and
   *  asserted as an exact set in both directions: a fix reaching further than the finding it addresses is
   *  the thing this list makes visible, so "it also fixed something else" cannot pass as a wash. */
  collateral: string[];
};

/** A plan row as the manifest spells it: `<op|excluded>[:<op name>]: <subject>`. */
const rowsOf = (p: FixPlan): Set<string> =>
  new Set([
    ...p.ops.map((o) => `op ${o.op}: ${o.subject}`),
    ...p.excluded.map((e) => `excluded ${e.category}: ${e.subject}`),
  ]);

const selftest = (): number => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const load = (p: string, side: State['side']) =>
    readState(JSON.parse(readFileSync(resolve(dir, 'fixtures', p), 'utf8')), `fixtures/${p}`, side);
  const man = JSON.parse(readFileSync(resolve(dir, 'fixtures/fix-manifest.json'), 'utf8')) as FixManifest;

  let failed = 0;
  const fail = (line: string): void => { failed++; console.log(`FAIL  ${line}`); };
  const expectedState = load('expected.json', 'expected');
  const actualState = load(man.dirty, 'actual');
  const report = diff(expectedState, actualState);
  const plan = fix(report, expectedState, actualState);

  // 1. THE PREMISE. Without findings to sort, every assertion below is vacuous.
  if (report.findings.length === 0) fail('premise: the dirty fixture diffs clean, so there is nothing to plan');
  else console.log(`PASS  premise: the dirty fixture produces ${report.findings.length} finding(s) to sort`);

  // 2. COMPLETE ACCOUNTING — the exact counts, hand-written. A plan that is a subset of the diff reads
  //    like the remaining work and is not.
  const a = plan.accounting;
  // First that the numbers describe the arrays they claim to. `excluded: findings - ops` would satisfy
  // every assertion below it while being derived from the thing it audits (`docs/34` shape 1) — the plan
  // would then report a complete accounting BECAUSE it subtracted, not because every finding landed.
  if (a.ops !== plan.ops.length || a.excluded !== plan.excluded.length)
    fail(
      `accounting: the numbers are not counted from the arrays they describe — ${a.ops} op / ${a.excluded} ` +
        `excluded reported, ${plan.ops.length} / ${plan.excluded.length} actually there`,
    );
  else console.log('PASS  accounting: both numbers are counted from the arrays they describe, not derived from the finding total');
  if (a.findings !== man.accounting.findings || a.ops !== man.accounting.ops || a.excluded !== man.accounting.excluded)
    fail(
      `accounting: the plan is ${a.findings} finding(s) → ${a.ops} op(s) + ${a.excluded} exclusion(s); the ` +
        `manifest says ${man.accounting.findings} → ${man.accounting.ops} + ${man.accounting.excluded}`,
    );
  else
    console.log(
      `PASS  accounting: ${a.findings} finding(s) = ${a.ops} op(s) + ${a.excluded} exclusion(s), every finding in exactly one bucket`,
    );

  // 3. BY NAME, BOTH WAYS.
  const got = rowsOf(plan);
  const want = new Set(man.expect);
  const missing = [...want].filter((x) => !got.has(x)).sort();
  const extra = [...got].filter((x) => !want.has(x)).sort();
  if (missing.length) {
    failed++;
    console.log(`FAIL  ${missing.length} manifest row(s) the plan does NOT carry — that arm is broken or gone:`);
    for (const m of missing) console.log(`        MISSING  ${m}`);
  }
  if (extra.length) {
    failed++;
    console.log(`FAIL  ${extra.length} plan row(s) the manifest does not expect — an op or exclusion that should not be there:`);
    for (const e of extra) console.log(`        EXTRA    ${e}`);
  }
  if (!missing.length && !extra.length) console.log(`PASS  by-name: the plan carries exactly the ${want.size} row(s) the manifest names`);

  // 4. THE SAFETY PIN. No op may address a category on the never-fixed list — the destructive-tool
  //    failure mode, asserted per category BY NAME rather than as one count.
  for (const c of man.neverFixed) {
    const leaked = plan.ops.filter((o) => o.addresses.category === c);
    if (leaked.length)
      fail(`safety: ${leaked.length} op(s) address category (${c}), which is never safely fixable: ${leaked.map((o) => o.subject).join(', ')}`);
    else console.log(`PASS  safety: no op addresses (${c})`);
  }
  const uncovered = CATEGORIES.filter((c) => !man.neverFixed.includes(c) && c !== 'value-match' && c !== 'binding-presence');
  if (uncovered.length)
    fail(`safety: ${uncovered.length} category(ies) are neither on the never-fixed list nor one of the two safe shapes, so nothing pins them: ${uncovered.join(', ')}`);
  else console.log(`PASS  safety: all ${CATEGORIES.length} categories are either pinned as never-fixed or one of the two safe shapes`);

  // 5. THE VALUES WRITTEN, pinned. An op that exists but writes the wrong value passes step 3.
  for (const [subject, wantValue] of Object.entries(man.values)) {
    const o = plan.ops.find((x) => x.subject === subject);
    const gotValue = !o ? '(no op)' : o.op === 'set-var-value' ? `${o.resolvedType} ${JSON.stringify(o.value)}` : `variable ${o.variable}`;
    if (gotValue !== wantValue) fail(`value: the op for ${subject} writes ${gotValue}, the manifest says ${wantValue}`);
    else console.log(`PASS  value: ${subject} → ${gotValue}`);
  }

  // 6. EFFECTIVENESS + IDEMPOTENCE. Apply in memory, re-diff: the addressed findings go, the excluded
  //    ones stay, and a second plan over the re-scan is empty.
  const fixedState = applyToState(actualState, plan);
  const rescan = diff(expectedState, fixedState);
  const keyOf = (x: Finding): string => `${x.category}: ${x.subject}`;
  const before = new Set(report.findings.map(keyOf));
  const after = new Set(rescan.findings.map(keyOf));
  const addressed = new Set(plan.ops.map((o) => keyOf(o.addresses)));
  const stillThere = [...addressed].filter((k) => after.has(k));
  if (stillThere.length) fail(`re-scan: ${stillThere.length} finding(s) the plan addressed are still reported: ${stillThere.join(', ')}`);
  else console.log(`PASS  re-scan: all ${addressed.size} addressed finding(s) cleared`);
  // The (g) contrast findings are a CONSEQUENCE of the (c) value drift, so fixing the value clears them
  // too — which is exactly why (g) is never its own op. Anything else vanishing is a fix reaching further
  // than it was asked to, and that is the finding.
  const collateral = [...before].filter((k) => !after.has(k) && !addressed.has(k)).sort();
  const wantCollateral = [...man.collateral].sort();
  if (JSON.stringify(collateral) !== JSON.stringify(wantCollateral))
    fail(
      `re-scan: the unaddressed findings that cleared are [${collateral.join(' | ')}], the manifest says ` +
        `[${wantCollateral.join(' | ')}] — a fix reaching past the finding it addresses, or one that stopped reaching`,
    );
  else
    console.log(
      `PASS  re-scan: the only unaddressed findings that cleared are the ${collateral.length} the manifest names — nothing else moved`,
    );
  // The other direction: a finding that appears where there was none. A fix that BREAKS something is the
  // failure this whole tool has to be unable to hide.
  const introduced = [...after].filter((k) => !before.has(k)).sort();
  if (introduced.length) fail(`re-scan: the plan INTRODUCED ${introduced.length} finding(s): ${introduced.join(' | ')}`);
  else console.log('PASS  re-scan: no new finding appeared — the apply broke nothing the scan can see');
  const second = fix(rescan, expectedState, fixedState);
  if (second.ops.length !== 0) fail(`idempotence: a second plan over the re-scan carries ${second.ops.length} op(s): ${second.ops.map((o) => o.subject).join(', ')}`);
  else console.log('PASS  idempotence: a second plan over the re-scan is empty — the ops are absolute writes, not deltas');

  // 7. NEVER A GUESSED VALUE. A canonical string the decoder cannot read must become an exclusion, not a
  //    write. No fixture can hold this — the reader cannot produce a mistyped variable — so it is asserted
  //    directly against `decodeCanon`, the one place a value is manufactured.
  for (const [type, canon] of [['COLOR', 'NON-COLOR(null)'], ['FLOAT', 'NON-FLOAT("x")'], ['BOOLEAN', 'yes'], ['DATE', '2026-01-01']] as const) {
    const d = decodeCanon(type, canon);
    if ('value' in d) fail(`decode: ${type} ${JSON.stringify(canon)} decoded to ${JSON.stringify(d.value)} — an undecodable value must be excluded, never guessed`);
    else console.log(`PASS  decode: ${type} ${JSON.stringify(canon)} is refused — ${d.reason}`);
  }

  console.log('');
  console.log(failed === 0 ? 'FIX SELF-CHECK: PASS' : `FIX SELF-CHECK: FAIL (${failed} check(s))`);
  return failed === 0 ? 0 : 1;
};

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────

const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  const args = process.argv.slice(2);
  if (args[0] === '--selftest') process.exit(selftest());
  const [a, b] = args.filter((x) => !x.startsWith('--'));
  if (!a || !b) {
    console.log('usage: npx tsx tools/conformance-scan/fix.ts <expected.json> <actual.json> [--json]');
    console.log('       npx tsx tools/conformance-scan/fix.ts --selftest');
    process.exit(1);
  }
  const expectedState = readState(JSON.parse(readFileSync(a, 'utf8')), a, 'expected');
  const actualState = readState(JSON.parse(readFileSync(b, 'utf8')), b, 'actual');
  const plan = fix(diff(expectedState, actualState), expectedState, actualState);
  console.log(args.includes('--json') ? JSON.stringify(plan, null, 2) : renderPlan(plan));
  // Exits 0 with a plan, like `diff.ts` exits 0 with findings: a tool answers a question
  // (`tools/CLAUDE.md`). It also writes nothing — the apply is the operator's, through the README's
  // snippet, and keeping those two in separate processes is what makes the dry run real.
}
