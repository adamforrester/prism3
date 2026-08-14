/**
 * Prism3 engine — DOC/CI GATE-SYNC CHECK (#613).
 *
 *   npx tsx packages/engine/lint-doc-gates.ts
 *
 * #610 fixed a concrete instance of the defect this gate exists to prevent from recurring:
 * `CLAUDE.md` principle 4, `CONTRIBUTING.md` §3, and `.github/pull_request_template.md` each
 * documented a "gates to run before pushing" checklist shorter than what `ci.yml` actually runs —
 * the PR template listed 4 checks against CI's 17, with no `lint:classes` (retired in #770), `lint:contrast`,
 * `check:ignore`, or `lint-us-english.ts` anywhere in any of the three documents. Two independently
 * authored PRs (#601, #602) each followed the documented checklist faithfully and both shipped
 * `lint:classes` silently broken — not carelessness, a gap in what they were told to check. #610
 * fixed the snapshot; nothing stopped it from drifting again the moment a new CI step landed without
 * a matching doc edit. This gate is that stop.
 *
 * WHAT IT COMPARES, and why that is the whole design: `.github/workflows/ci.yml` on one side — parsed
 * live, every run, never restated as a hand-written list — against the three documents' own gate
 * REGIONS on the other (see `GATE_REGIONS`, and #704 for why a region rather than a whole file).
 * A hand-written "the gates CI runs" constant would make this gate agree with itself
 * forever regardless of what ci.yml actually contains (`docs/34`, shape 2 — the subject and the
 * oracle sharing a derivation). Parsing the real file is what lets a *new* CI step, added without a
 * doc edit, actually fail this gate.
 *
 * SCOPE — "`run:` steps that invoke `npm run` / `npx tsx`", per the issue that filed this:
 *   - `uses:`-based steps (`actions/checkout@v4`, `actions/setup-node@v4`) have no local equivalent
 *     and are excluded automatically — they have no `run:` at all.
 *   - `npm ci` ("Install workspace deps") is excluded automatically — it matches neither pattern.
 *   - The "Plugin main.js has 0 node: builtins" step is excluded automatically too — its `run:` is a
 *     grep script with no `npm run`/`npx tsx` invocation anywhere in it.
 *   - "Drift gate still covers the full artifact set" is the one step that needs an EXPLICIT
 *     exclusion (`NOT_A_DISTINCT_GATE` below): its `run:` embeds `npx tsx packages/engine/regen.ts
 *     --check` as an input to its own separate "count == 88" assertion, so a naive substance-scan
 *     would flag it as a second gate needing doc representation when it is a meta-check on the
 *     ALREADY-covered "Committed artifacts have not drifted" step's output. Kept as a named,
 *     auditable list rather than an inferred heuristic — and that list is the same class of problem
 *     one level down that this whole gate exists to solve one level up: if a future CI step is added
 *     that is also not a "local gate" and doesn't get added here, this gate will false-positive on
 *     it. (Compare `ci.yml`'s own comment on the "88 committed artifacts" check: "if the set
 *     legitimately grew or shrank, update this check in the same PR.")
 *
 * MATCHING BY SUBSTANCE, NOT VERBATIM: `CONTRIBUTING.md` writes `npm run typecheck -w @prism3/studio`;
 * `ci.yml` writes `npm run -w @prism3/studio typecheck` — same command, different argument order. Exact
 * string matching would false-positive on that harmless rephrasing, so `gateTokensOf` extracts the
 * identifying pieces (script name + workspace, or the bare `.ts` filename for `npx tsx` steps) and
 * asks whether those pieces appear together, rather than whether the full command line appears verbatim.
 *
 * ── WHERE IT LOOKS, AND HOW CLOSE THE PIECES MUST SIT (#704, #728) ──────────────────────────────
 *
 * Both fixes below are to the same predicate, and both were live false passes rather than theory.
 *
 * SCOPE — THE REGION THAT CARRIES THE PROMISE, NOT THE WHOLE FILE (#704). This gate used to search
 * each document end to end. #703 added two CI steps; this gate correctly flagged `CONTRIBUTING.md` and
 * the PR template, and stayed SILENT about `CLAUDE.md` §4, where they were also genuinely missing —
 * because the same PR had added an `apps/tokenpress` row to the layer table under "What this repo is",
 * and that row satisfied the file-wide search. The checklist went short while the gate reported green,
 * which is precisely the #601/#602 condition this file exists to make impossible.
 *
 * The scope of a check must be the scope of its promise. `CLAUDE.md` promises nothing about gates in
 * its layer table; principle 4 is where the promise lives, so principle 4 is what gets read.
 * `lint-layout-claims.ts` had already solved this with three declared layout regions — this adopts that
 * pattern rather than inventing one, down to declaring the membership rule (see `GATE_REGIONS`), because
 * an undeclared region is the thing that drifts next.
 *
 * PROXIMITY — ONE LINE, NOT ONE FILE (#728). Even inside the right region, checking each token as an
 * independent bare substring lets a two-token gate be satisfied by text that has nothing to do with it:
 * `npm run -w @prism3/studio test` extracts `["test", "@prism3/studio"]`, and the word `test` plus the
 * workspace name appear in all three documents for unrelated reasons. Three CI steps have `test` as
 * their script token and all three were unverifiable — documented in fact, but the gate would not have
 * noticed them stopping.
 *
 * So the tokens must co-occur on ONE LINE of the region. That keeps the argument-order tolerance the
 * paragraph above defends (both spellings put their tokens on one line) and rejects a match assembled
 * from two unrelated paragraphs. MEASURED before choosing the unit: all 78 token sets across the three
 * regions already co-occur on a single line, so this costs zero false positives, and a character window
 * would have been wrong — `CLAUDE.md` §4's Web bullet names the workspace once and then lists five
 * scripts after it, spanning 328–363 characters legitimately, all on one line.
 *
 * The two questions are ONE predicate with different DATA, not two code paths — see `REQUIRED_POINTERS`
 * on why the README's pointers are two one-token sets rather than one two-token set.
 *
 * TWO STRENGTHS OF CONTRACT: the three checklist documents must ENUMERATE every gate; the root
 * `README.md` must only POINT at the two that hold the list. The README is a signpost by its own
 * stated design, so holding it to enumeration would create a fourth copy of the checklist — see
 * `POINTER_DOC` below for the full reasoning and the option that was rejected.
 *
 * ONE DIRECTION FOR THE PROSE DOCS, DELIBERATELY: those are checked for every ci.yml gate being
 * represented, not the converse. `CONTRIBUTING.md` §3 also documents `emit-dtcg.ts`/`emit-figma.ts` as
 * local-only commands with no matching `ci.yml` step — that is fine on purpose (they are covered
 * transitively by `regen.ts`, which the docs also note) and is not the defect #610/#613 exist to catch.
 * Extending the PROSE check to the reverse direction was considered and left out — it is a different
 * question with a different false-positive shape, not a smaller version of this one.
 *
 * ── THE THIRD AND FOURTH ARMS: ci.yml IS NO LONGER AN UNCHECKED ORACLE (#789) ────────────────────
 *
 * Everything above compares documents against `ci.yml` and therefore takes `ci.yml` as ground truth.
 * That leaves one class this file could never see: a gate MISSING FROM `ci.yml`. All four artifacts
 * would agree — perfectly, and about a gate that runs nowhere — and nothing would fire. Silence, not
 * a failure, which is the `docs/34` failure mode one level up from the one this file was filed for.
 *
 * ARM 3 — `verify.ts`'s `GATES` array, compared against `ci.yml` in BOTH DIRECTIONS. That list is a
 * RUNNER, so it is not prose and gets no token tolerance: it joins on the `- name:` string verbatim,
 * and a mismatch in either direction fails. Why both directions are right here when they are not right
 * for the prose docs: a runner that runs something CI does not is as wrong as one that skips something
 * CI runs — its whole claim is "this is what CI will do to your PR". The prose docs make a weaker
 * promise (a checklist may mention a local-only command), so they keep the weaker check.
 *
 * The point of the arm is that it makes the disagreement SYMMETRIC. `ci.yml` and `verify.ts` are
 * authored separately by hand, and either one going short now fails. Adding a gate is a five-file edit
 * as a result — the `schema/payload-manifest.json` reasoning: the friction is the feature.
 *
 * ARM 4 — THE ORPHAN CASE, which no comparison of lists can reach, because five copies of a list
 * cannot see something absent from all five. A `lint-*` file that exists in the repo and is named in
 * NOTHING is invisible to arms 1-3 by construction. So this arm reads the FILESYSTEM (via
 * `git ls-files`) and asks `ci.yml` about each file it finds — two readers, neither derived from the
 * other. Implementation lives in `verify.ts` beside the list it complements; this file drives it so it
 * runs in CI rather than only when a human types `verify`.
 *
 * WHY IMPORTING `verify.ts` IS SAFE: it runs its gates only under a main-module guard, so importing
 * `GATES` costs nothing. It does run its own self-checks at import time, which is deliberate — this
 * gate then fails if the runner's checks are broken, rather than reporting on a list produced by a
 * runner that cannot see its own defects.
 *
 * Dependency-free per repo convention: a hand-rolled parser for `ci.yml`'s flat `- name: ... run: ...`
 * step structure, not a YAML library — see `lint-us-english.ts`/`lint-skills.ts` for the same choice.
 * The file's structure (one job, one flat `steps:` list, no nesting inside a step beyond `run:`/`with:`)
 * is simple enough that this is low-risk.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATES, orphanGateFiles, trackedGateFiles } from '../../verify.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

const CI_PATH = resolve(repo, '.github/workflows/ci.yml');

export type DocRegion = { label: string; path: string; section: string; start: RegExp; end: RegExp };

/**
 * The three checklist documents, each scoped to THE REGION THAT CARRIES THE PROMISE (#704).
 *
 * THE MEMBERSHIP RULE, declared rather than left to judgment — the same discipline
 * `lint-layout-claims.ts` applies to its layout regions, and for the same reason: an undeclared region
 * is the one that drifts next. **A region is a gate promise when it is the passage a contributor is
 * told to run before pushing.** Not "wherever the document mentions a gate" — `CLAUDE.md` discusses
 * `lint-us-english.ts` in its Naming-conventions section and `regen.ts` in principle 5, and neither
 * passage promises to be complete. Principle 4 does. That is the difference the file-wide search could
 * not see.
 *
 * `end` is matched against the lines AFTER `start`, so a region runs to the next sibling heading. Each
 * boundary is anchored on a structural marker (a numbered principle, an `##` heading) rather than on
 * prose, so reordering sentences inside a region cannot move its edges. If a boundary regex ever stops
 * matching, the region reads EMPTY — which fails loudly via the region floor below rather than passing
 * over nothing, the failure mode this whole file is about.
 */
const GATE_REGIONS: DocRegion[] = [
  {
    label: 'CLAUDE.md §4 (Goal-driven execution with verification)',
    path: resolve(repo, 'CLAUDE.md'),
    section: 'principle 4',
    start: /^4\. \*\*Goal-driven execution/,
    end: /^5\. \*\*/,
  },
  {
    label: 'CONTRIBUTING.md §3 (The gates)',
    path: resolve(repo, 'CONTRIBUTING.md'),
    section: '§3',
    start: /^## 3\. The gates\b/,
    end: /^## \d+\./,
  },
  {
    label: '.github/pull_request_template.md §Gates',
    path: resolve(repo, '.github/pull_request_template.md'),
    section: '§Gates',
    start: /^## Gates\b/,
    end: /^## /,
  },
];

// The root `README.md` is DELIBERATELY not in GATE_REGIONS above, and this is what it gets instead.
//
// The three docs above are checklists — someone reads them to learn what to run, so a checklist
// shorter than `ci.yml` actively misleads, which is the #601/#602 defect. The README is not a
// checklist: it states outright that it "points, it doesn't restate", and it carries a categorical
// summary of the gates on purpose. Requiring it to enumerate all ~21 steps would make it a second
// copy of CONTRIBUTING §3 — a fourth place to drift, added by a gate whose entire purpose is to stop
// drift. The summary's failure mode is different from a checklist's, and needs a different check.
//
// So the README is held to a WEAKER but still structural contract: whatever it summarizes, it must
// name the two places that hold the real list. What this gates is the POINTER, not the summary — and
// the distinction is the whole point, so read it literally rather than as an understatement. A
// summary that goes stale still passes. A summary gutted from five categories to one still passes,
// with both pointers intact (verified by mutation in review of #646). This check cannot detect that,
// and is not trying to: a stale summary beside a live pointer still routes the reader to the
// authority, which is what the README is for. What no future edit can do is SEVER that path. Before
// this landed the README listed 4 gates against CI's 21 AND named only one of the two authorities:
// `CONTRIBUTING.md` twice (the banner and the next-steps list), `.github/workflows/ci.yml` not at
// all — so this check would have failed on 1 of the 2 pointers, measured by running it against the
// pre-PR README. A weakened signpost, then, not a dead end: one route to the real list survived. One
// severed pointer of two is still the hole this closes; the drift above it is deliberately not
// gated, because gating it would mean demanding enumeration, which is the outcome rejected above.
//
// This is the more conservative of the two options considered; the other was to leave the README out
// entirely with a comment recording the omission as a decision. That records the reasoning but gates
// nothing, and the README had already drifted once. Open to reviewer override.
const POINTER_DOC = { label: 'README.md', path: resolve(repo, 'README.md') };

// TWO one-token sets, not one two-token set — and that is a claim about the README's promise, not a
// workaround for the co-occurrence rule (#728). "Name both authorities" is satisfied by naming them in
// two different places; the banner points at `CONTRIBUTING.md` (line 13) and the gates summary points
// at `ci.yml` (line 61), 48 lines apart, and both are correct. Demanding one line would be a new
// requirement on the README's prose that nothing has argued for. A *command*, by contrast, is one
// thing: its script and its workspace belong together. Same predicate, different data.
const REQUIRED_POINTERS = ['.github/workflows/ci.yml', 'CONTRIBUTING.md'];

/** Which authorities the README fails to name. Each pointer is its own ONE-token query through
 *  `missingTokens` — the shipped predicate, not a copy — which is what lets the two pointers sit on
 *  different lines while a single command's tokens may not. */
export const lostPointersIn = (lines: string[]): string[] =>
  REQUIRED_POINTERS.filter((p) => missingTokens(lines, [p]).length > 0);

// See the file header's SCOPE note — this is the one exclusion that can't be inferred from shape
// alone, because its `run:` genuinely contains an `npx tsx` invocation.
const NOT_A_DISTINCT_GATE = new Set<string>(['Drift gate still covers the full artifact set']);

/**
 * ARM 3's scope: which `ci.yml` steps `verify.ts` must carry, by `- name:`.
 *
 * EVERY step with a `run:` is in scope — including the two the prose arms skip by shape (the inline
 * `node:`-builtin grep, and the drift-coverage meta-check). A runner has to run them; `verify.ts`
 * implements both as `derive` gates, reading a file and an earlier gate's captured output rather than
 * shelling out. That is a stronger scope than the prose arms use, and it is the right one for exactly
 * the reason arm 3 is bidirectional: this list's promise is "everything CI does".
 *
 * TWO exceptions, declared by NAME rather than inferred, because a shape rule ("exclude anything
 * without a gate token") would silently widen the day someone adds another non-asserting step:
 *
 *   - `npm ci` installs and asserts nothing.
 *   - The runner's own `--list` step. `verify.ts` must not carry a gate that runs `verify.ts`: it
 *     already runs those self-checks at import, in-process, before its first gate — so the row would
 *     re-run them in a subprocess and report the result of asking itself. `docs/34` shape 2 in
 *     miniature. The CI step exists precisely because CI is the one place that ISN'T the runner.
 */
const NOT_A_RUNNABLE_GATE = new Set<string>([
  'Install workspace deps',
  "The gate runner's list and order are sound",
]);

/** `ci.yml` steps arm 3 requires `verify.ts` to carry: everything with a `run:`, minus the named
 *  install step. */
export const runnableCiSteps = (steps: Step[]): Step[] =>
  steps.filter((s) => s.run.trim() && !NOT_A_RUNNABLE_GATE.has(s.name));

/**
 * ARM 3, BOTH DIRECTIONS. Exact-string join on the `- name:`, no token tolerance — see the header for
 * why a runner gets a stricter contract than prose. Returns the two disagreements separately, because
 * they have different fixes and a message that merged them would say "these lists differ" and leave
 * the reader to work out which way.
 */
export const runnerListDiff = (steps: Step[], gateSteps: string[]): { unrun: string[]; extra: string[] } => {
  const inRunner = new Set(gateSteps);
  const inCi = new Set(runnableCiSteps(steps).map((s) => s.name));
  return {
    unrun: [...inCi].filter((n) => !inRunner.has(n)),
    extra: [...inRunner].filter((n) => !inCi.has(n)),
  };
};

export type Step = { name: string; run: string };

/** Parse ci.yml's flat step list: `- name: <name>` (quoted or bare — a bare name containing a colon,
 *  e.g. "Plugin main.js has 0 node: builtins", is exactly the trap #298's original edit hit, so a
 *  quoted name must have its quotes stripped without truncating at an interior colon) followed by
 *  either a single-line `run: <cmd>` or a block-scalar `run: |` with indented lines beneath it. */
export const parseSteps = (yaml: string): Step[] => {
  const lines = yaml.split('\n');
  const steps: Step[] = [];
  let i = 0;
  while (i < lines.length) {
    const nameMatch = /^(\s*)- name:\s*(.+?)\s*$/.exec(lines[i]);
    if (!nameMatch) { i++; continue; }
    const stepIndent = nameMatch[1].length;
    const raw = nameMatch[2];
    const name = /^".*"$/.test(raw) ? raw.slice(1, -1) : raw;
    i++;
    let run = '';
    while (i < lines.length) {
      const line = lines[i];
      const indent = (/^\s*/.exec(line))![0].length;
      if (line.trim() && indent <= stepIndent) break; // next step, or dedent out of the steps list
      const runMatch = /^\s*run:\s*(\|-?)?\s?(.*)$/.exec(line);
      if (runMatch && runMatch[1]) {
        // Block scalar: collect lines indented deeper than the `run:` line itself.
        const runIndent = indent;
        i++;
        const block: string[] = [];
        while (i < lines.length) {
          const l = lines[i];
          const li = (/^\s*/.exec(l))![0].length;
          if (l.trim() && li <= runIndent) break;
          block.push(l);
          i++;
        }
        run = block.join('\n');
        continue;
      }
      if (runMatch) { run = runMatch[2]; i++; continue; }
      i++;
    }
    steps.push({ name, run });
  }
  return steps;
};

/** The identifying tokens a step's `run:` text asks the docs to represent — one array per distinct
 *  invocation (a step could in principle chain more than one, though none here do today). Empty
 *  return means "not a candidate gate" per the SCOPE note above. */
export const gateTokensOf = (run: string): string[][] => {
  const out: string[][] = [];
  for (const m of run.matchAll(/npx\s+(?:--yes\s+)?tsx(?:@\d+)?\s+(?:\S*\/)?([\w.-]+\.ts)\b/g)) out.push([m[1]]);
  for (const m of run.matchAll(/npm run\s+((?:-w\s+\S+\s+)?)([\w:.-]+)((?:\s+-w\s+\S+)?)/g)) {
    const ws = /-w\s+(\S+)/.exec(m[1] + m[3])?.[1];
    out.push(ws ? [m[2], ws] : [m[2]]);
  }
  return out;
};

/** Extract a declared region's lines. Returns `[]` when the start boundary no longer matches — a
 *  missing region must be LOUD (the floor in the real run below), never "nothing to check". */
export const sliceRegion = (text: string, region: { start: RegExp; end: RegExp }): string[] => {
  const lines = text.split('\n');
  const from = lines.findIndex((l) => region.start.test(l));
  if (from < 0) return [];
  const rest = lines.slice(from + 1);
  const to = rest.findIndex((l) => region.end.test(l));
  return to < 0 ? rest : rest.slice(0, to);
};

/**
 * Which of `tokens` are absent from `lines`. THE ONE PLACE MEMBERSHIP IS DECIDED — `docHas`, `findGaps`
 * and the README pointer check all drive this, so a change to what "mentioned" means moves all of them
 * together instead of leaving a copy behind (`docs/34`, shape 2).
 *
 * Present means: SOME SINGLE LINE carries every token (#728). Order-agnostic within the line, so
 * `npm run typecheck -w @prism3/studio` and `npm run -w @prism3/studio typecheck` both match — but a
 * `test` in one paragraph and a `@prism3/studio` in another no longer combine into a match for a gate
 * neither mentions. A single-token set degenerates to a plain substring search over the region, which
 * is what the `.ts` filenames and the README pointers want.
 *
 * Takes LINES rather than a blob precisely so a caller cannot pass a whole file by accident and get the
 * old file-wide behavior back: the type makes the #704 mistake awkward to re-make.
 */
export const missingTokens = (lines: string[], tokens: string[]): string[] => {
  if (lines.some((l) => tokens.every((t) => l.includes(t)))) return [];
  // Nothing matched together — report only the tokens that are absent ENTIRELY, so the message says
  // "no mention of X" when X is missing, and names every token when they merely fail to co-occur.
  const absent = tokens.filter((t) => !lines.some((l) => l.includes(t)));
  return absent.length ? absent : tokens;
};

/** A region "represents" a token set when `missingTokens` finds nothing missing. */
export const docHas = (lines: string[], tokens: string[]): boolean => missingTokens(lines, tokens).length === 0;

type Finding = { step: string; doc: string; missing: string[] };

/** The one function both the self-check and the real run drive — never a copy of it (`docs/34`,
 *  shape 2: a self-check that samples a reimplementation validates the reimplementation, not the
 *  gate that ships). Each doc arrives as the LINES OF ITS PROMISE REGION, already sliced, and `label`
 *  names the document AND the section so the failure message points at the passage to edit (#704). */
export const findGaps = (steps: Step[], docs: { label: string; lines: string[] }[]): Finding[] => {
  const findings: Finding[] = [];
  for (const step of steps) {
    if (NOT_A_DISTINCT_GATE.has(step.name)) continue;
    const tokenSets = gateTokensOf(step.run);
    for (const tokens of tokenSets) {
      for (const doc of docs) {
        const missing = missingTokens(doc.lines, tokens);
        if (missing.length) findings.push({ step: step.name, doc: doc.label, missing });
      }
    }
  }
  return findings;
};

// ---- SELF-CHECK: can the gate still see what it claims to, and can it still fail? ------------------
// Every sample below drives `parseSteps`/`gateTokensOf`/`findGaps` directly — the functions the real
// run below also calls — never a reimplementation of the parsing or matching logic. Each sample is
// phrased to test one specific claim this file makes, in both directions where the claim has two.
const SAMPLE_YAML = `
jobs:
  gates:
    steps:
      - uses: actions/checkout@v4

      - name: Install workspace deps
        run: npm ci

      - name: Sample unit tests
        run: npx --yes tsx@4 packages/engine/sample-test.ts

      - name: Typecheck sample
        run: npm run -w @prism3/sample typecheck

      - name: "Sample gate: has a colon"
        run: |
          set -euo pipefail
          if grep -q "x" sample.js; then
            exit 1
          fi

      - name: Drift gate still covers the full artifact set
        run: |
          set -euo pipefail
          count=$(npx --yes tsx@4 packages/engine/sample-test.ts | grep -oE '[0-9]+ things')
`;

const selfFails: string[] = [];
const steps = parseSteps(SAMPLE_YAML);

// 1. Parsing: the right step COUNT and NAMES, including the quoted-colon trap (#298's original bug)
//    and the block-scalar form, before trusting anything built on top of it.
const names = steps.map((s) => s.name);
if (!names.includes('Sample gate: has a colon')) selfFails.push('a quoted step name with an interior colon is truncated or dropped');
if (steps.some((s) => s.name === 'Install workspace deps' && s.run !== 'npm ci')) selfFails.push('a single-line `run:` is parsed wrong');
const driftStep = steps.find((s) => s.name === 'Drift gate still covers the full artifact set');
if (!driftStep || !driftStep.run.includes('npx --yes tsx@4 packages/engine/sample-test.ts')) selfFails.push('a block-scalar `run: |` step is parsed wrong');

// 2. Candidacy: `npm ci` and a grep-only block script must NOT be candidates; `npx tsx` and `npm run`
//    steps MUST be, and the named exclusion must suppress a step that would otherwise match by shape.
if (gateTokensOf(steps.find((s) => s.name === 'Install workspace deps')!.run).length) selfFails.push('`npm ci` is wrongly treated as a gate step');
if (gateTokensOf(steps.find((s) => s.name === 'Sample gate: has a colon')!.run).length) selfFails.push('a grep-only block script is wrongly treated as a gate step');
if (!gateTokensOf(steps.find((s) => s.name === 'Sample unit tests')!.run).length) selfFails.push('an `npx tsx` step is no longer detected as a gate step');
if (!gateTokensOf(steps.find((s) => s.name === 'Typecheck sample')!.run).length) selfFails.push('an `npm run` step is no longer detected as a gate step');

// 3. Token extraction: the `.ts` filename for npx-tsx; script+workspace, ORDER-AGNOSTIC, for npm run.
const tsTokens = gateTokensOf(steps.find((s) => s.name === 'Sample unit tests')!.run);
if (!tsTokens.some((t) => t.length === 1 && t[0] === 'sample-test.ts')) selfFails.push('the npx-tsx filename token is wrong');
const npmTokensCiOrder = gateTokensOf('npm run -w @prism3/sample typecheck');
const npmTokensDocOrder = gateTokensOf('npm run typecheck -w @prism3/sample');
const setsEqual = (a: string[][], b: string[][]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
if (!setsEqual(npmTokensCiOrder, npmTokensDocOrder)) selfFails.push('npm-run token extraction is sensitive to `-w` argument order');

// 4. docHas: substance match, ORDER-AGNOSTIC WITHIN A LINE — both directions.
if (!docHas(['the sample workspace runs typecheck via @prism3/sample'], ['typecheck', '@prism3/sample'])) {
  selfFails.push('docHas no longer accepts tokens present out of order on one line');
}
if (docHas(['the sample workspace runs typecheck only'], ['typecheck', '@prism3/sample'])) {
  selfFails.push('docHas is satisfied when a required token is actually missing (false pass)');
}

// 4a. #728's defect, as an assertion: tokens scattered across UNRELATED LINES must NOT match. The
//     `test`/workspace pair is the real case — three ci.yml steps have `test` as their script token,
//     and both words occur in all three documents for reasons that have nothing to do with the step.
if (docHas(
  ['Run the plugin tests before pushing.', 'The @prism3/sample workspace also builds a bundle.'],
  ['test', '@prism3/sample'],
)) {
  selfFails.push('docHas accepts tokens assembled from two unrelated lines (#728 reintroduced)');
}
// ...and the co-occurrence rule must not turn the tolerance above into a false positive: the same two
// tokens ON one line still match, in either argument order.
for (const spelling of ['npm run test -w @prism3/sample', 'npm run -w @prism3/sample test']) {
  if (!docHas([spelling], ['test', '@prism3/sample'])) {
    selfFails.push(`docHas rejects a genuinely documented step written as \`${spelling}\``);
  }
}
// When tokens fail only to CO-OCCUR, the report must name them rather than claim nothing was found —
// otherwise the message reads "no mention of test" about a document that says `test` twice.
const scatter = missingTokens(['a test somewhere', 'and @prism3/sample elsewhere'], ['test', '@prism3/sample']);
if (scatter.length !== 2) selfFails.push('a co-occurrence failure does not report both tokens');

// 4b. sliceRegion — the #704 fix's own boundary logic, in both directions, plus the empty case that
//     the region floor depends on being detectable.
const SAMPLE_DOC = [
  '## 2. Something else',
  'mentions sample-test.ts in passing — this is OUTSIDE the promise region',
  '## 3. The gates',
  'run npx tsx packages/engine/other-test.ts',
  '## 4. After',
  'trailing prose',
].join('\n');
const region = sliceRegion(SAMPLE_DOC, { start: /^## 3\. The gates\b/, end: /^## \d+\./ });
if (region.length !== 1 || !region[0].includes('other-test.ts')) {
  selfFails.push('sliceRegion does not stop at the next sibling heading');
}
if (region.some((l) => l.includes('sample-test.ts'))) {
  selfFails.push('sliceRegion leaks content from BEFORE the region — the #704 false pass');
}
if (sliceRegion(SAMPLE_DOC, { start: /^## 9\. Nope\b/, end: /^## / }).length !== 0) {
  selfFails.push('sliceRegion invents content for a region whose start boundary does not match');
}
// The whole point of #704, stated as an assertion at the predicate level: a mention OUTSIDE the region
// must not satisfy a gate. Same tokens, same document, two different scopes, two different answers.
const wholeFile = SAMPLE_DOC.split('\n');
if (!docHas(wholeFile, ['sample-test.ts'])) selfFails.push('the sample doc no longer mentions the token at all — this sample cannot test #704');
if (docHas(region, ['sample-test.ts'])) {
  selfFails.push('a gate mentioned OUTSIDE the promise region still satisfies the check (#704 reintroduced)');
}

// 4c. The README pointer contract — both directions, driven through `missingTokens`, the same
//     function the real check below calls. A pointer check that cannot fail is worse than no pointer
//     check, because it makes the README look covered. Note the pointers are two ONE-token sets, so
//     they may legitimately sit on different lines — see REQUIRED_POINTERS.
if (lostPointersIn(['summary only; the gates live elsewhere']).length !== REQUIRED_POINTERS.length) {
  selfFails.push('the README pointer check passes a doc naming neither authority (it cannot fail)');
}
if (lostPointersIn(['the full list is in .github/workflows/ci.yml', 'the checklist is in CONTRIBUTING.md']).length) {
  selfFails.push('the README pointer check flags a doc that names both authorities on separate lines (false positive)');
}
if (!lostPointersIn(['see .github/workflows/ci.yml for the full list']).includes('CONTRIBUTING.md')) {
  selfFails.push('the README pointer check is satisfied by naming only one of the two authorities');
}

// 5. findGaps end to end — the core "can this gate actually fail" proof (docs/34's central test).
//    A doc missing a real gate's token must produce a finding NAMING that step and that doc; the same
//    doc, once it mentions the token, must produce none for it. And the named exclusion must survive
//    all the way through `findGaps`, not just `gateTokensOf` in isolation.
const docsMissingSample = [
  { label: 'DocA §Gates', lines: ['nothing relevant here'] },
  { label: 'DocB §Gates', lines: ['run sample-test.ts before pushing'] },
];
const gapsMissing = findGaps(steps, docsMissingSample);
if (!gapsMissing.some((f) => f.step === 'Sample unit tests' && f.doc === 'DocA §Gates')) {
  selfFails.push('findGaps does not flag a doc that never mentions a real gate step (the gate cannot fail)');
}
if (gapsMissing.some((f) => f.step === 'Sample unit tests' && f.doc === 'DocB §Gates')) {
  selfFails.push('findGaps flags a doc that DOES mention the gate step (false positive)');
}
// The finding must carry the SECTION, not just the file — "missing from CLAUDE.md" sends a reader to a
// 25,000-character document; "missing from CLAUDE.md §4" sends them to the checklist (#704's Do list).
if (!gapsMissing.every((f) => f.doc.includes('§'))) {
  selfFails.push('a finding names a document without naming the section inside it');
}
if (gapsMissing.some((f) => f.step === 'Drift gate still covers the full artifact set')) {
  selfFails.push('the named exclusion did not survive into findGaps — the meta-check step is being required in the docs');
}
if (gapsMissing.some((f) => f.step === 'Install workspace deps' || f.step === 'Sample gate: has a colon')) {
  selfFails.push('a non-gate step (npm ci / grep-only script) produced a finding');
}

// 6. ARM 3 — the runner-list comparison, in BOTH directions, over the sample steps rather than the
//    real ones, so these assertions do not depend on what ci.yml happens to contain today. Each
//    direction must fail on its own defect and stay silent on the other's.
const sampleRunnable = runnableCiSteps(steps).map((s) => s.name);
if (sampleRunnable.includes('Install workspace deps')) {
  selfFails.push('the named install exclusion leaked into arm 3 — verify.ts would be required to run `npm ci` as a gate');
}
if (!sampleRunnable.includes('Sample gate: has a colon')) {
  selfFails.push("arm 3's scope excludes the inline-script step — a runner would not be required to implement it, which is how the node:-builtin check would go unrun");
}
const agreeing = runnerListDiff(steps, sampleRunnable);
if (agreeing.unrun.length || agreeing.extra.length) {
  selfFails.push('arm 3 reports a disagreement between two identical lists (false positive)');
}
const dropped = runnerListDiff(steps, sampleRunnable.filter((n) => n !== 'Typecheck sample'));
if (!dropped.unrun.includes('Typecheck sample') || dropped.extra.length) {
  selfFails.push('arm 3 misses a ci.yml step the runner does not run — the direction that lets the runner go short');
}
const invented = runnerListDiff(steps, [...sampleRunnable, 'A gate CI does not have']);
if (!invented.extra.includes('A gate CI does not have') || invented.unrun.length) {
  selfFails.push('arm 3 misses a runner gate ci.yml does not have — the direction that makes ci.yml checkable at all (#789)');
}

// 7. ARM 4 — the orphan check, driven through the SHIPPED function from `verify.ts` (never a copy of
//    its matching logic), over hand-made inputs. Both directions: a named file must not be flagged, an
//    unnamed one must be.
if (orphanGateFiles('        run: npx tsx packages/engine/lint-known.ts', ['packages/engine/lint-known.ts']).length) {
  selfFails.push('arm 4 flags a gate file ci.yml names directly (false positive)');
}
if (!orphanGateFiles('        run: npx tsx packages/engine/lint-known.ts', ['packages/engine/lint-orphan.ts']).includes('packages/engine/lint-orphan.ts')) {
  selfFails.push('arm 4 misses a gate file named nowhere in ci.yml — the one case no comparison of lists can reach');
}

if (selfFails.length) {
  console.error("\n❌ the doc/CI gate-sync check's own detection is broken — it cannot see what it claims to:\n");
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}

// ---- SCOPE FLOOR: did it look? -----------------------------------------------------------------
// Missing files must be loud, not read as "nothing to check." Mirrors `lint-skills.ts`'s "zero
// skills means the layout moved" and `lint-us-english.ts`'s REQUIRED_SURFACES — assert
// representation, not just proceed past an absence.
if (!existsSync(CI_PATH)) {
  console.error(`\n❌ ${resolve(repo, '.github/workflows/ci.yml')} not found — this gate has nothing to compare against.`);
  process.exit(1);
}
const missingDocs = [...GATE_REGIONS, POINTER_DOC].filter((d) => !existsSync(d.path));
if (missingDocs.length) {
  console.error('\n❌ required doc(s) not found — this gate cannot check what it never opened:');
  for (const d of missingDocs) console.error(`    ${d.label}`);
  process.exit(1);
}

// ---- THE REAL RUN --------------------------------------------------------------------------------
const realSteps = parseSteps(readFileSync(CI_PATH, 'utf8'));
const realDocs = GATE_REGIONS.map((r) => ({
  label: r.label,
  section: r.section,
  path: r.path,
  lines: sliceRegion(readFileSync(r.path, 'utf8'), r),
}));

// ---- REGION FLOOR: did it find the promise, or just fail to find it? ----------------------------
// A region whose `start` no longer matches slices to ZERO LINES, and a zero-line region satisfies
// nothing — so this would fail loudly on every gate at once rather than pass silently. Loud is already
// the right direction, but the message would blame the docs for a heading that merely got renamed. This
// names the real cause instead, and is the same "assert you looked" shape as the candidate floor below.
const emptyRegions = realDocs.filter((d) => d.lines.length === 0);
if (emptyRegions.length) {
  console.error('\n❌ a declared gate region is EMPTY — its start boundary no longer matches, so this gate is');
  console.error('   reading nothing where it promised to read a checklist:\n');
  for (const d of emptyRegions) console.error(`    ${d.label} — no line matched the region's start pattern`);
  console.error('\n  Either the heading was renamed (update the boundary in GATE_REGIONS, same PR), or the');
  console.error('  checklist moved out of the section that promises to hold it.');
  process.exit(1);
}

const candidates = realSteps.filter((s) => !NOT_A_DISTINCT_GATE.has(s.name) && gateTokensOf(s.run).length > 0);
// A parser that silently stopped matching would report "clean" over zero candidates — a floor here
// is what makes that loud instead of quiet (the same shape as `lint-skills.ts`'s "zero skills found").
if (candidates.length < 10) {
  console.error(`\n❌ only ${candidates.length} contributor-facing gate step(s) found in ci.yml — expected well over 10.`);
  console.error('    Either the workflow genuinely shrank (update this floor in the same PR), or the parser broke.');
  process.exit(1);
}

const findings = findGaps(realSteps, realDocs);

// ---- ARM 3 + ARM 4: the runner list, and the orphan case (#789) ---------------------------------
const ciText = readFileSync(CI_PATH, 'utf8');
const runnerDiff = runnerListDiff(realSteps, GATES.map((g) => g.ciStep));
const gateFiles = trackedGateFiles();
const orphans = orphanGateFiles(ciText, gateFiles);

// SCOPE FLOOR on arm 4, the same shape as the candidate floor above: `trackedGateFiles()` returning
// nothing would report "no orphans" over an empty set — a clean bill of health from a scan that looked
// at nothing. `git ls-files` failing (not a git tree) reads identically to a repo with no gate files,
// which is why this asserts a floor rather than trusting the empty answer.
if (gateFiles.length < 8) {
  console.error(`\n❌ arm 4 found only ${gateFiles.length} tracked gate file(s) — expected at least 8.`);
  console.error('    Either the `lint-*` naming convention moved (update `gateFilePattern` in verify.ts,');
  console.error('    same PR), or `git ls-files` failed and this arm just scanned nothing.');
  process.exit(1);
}

// The README's weaker contract — see POINTER_DOC above for why it is not held to enumeration, and
// REQUIRED_POINTERS for why its two pointers are checked as separate one-token queries.
const lostPointers = lostPointersIn(readFileSync(POINTER_DOC.path, 'utf8').split('\n'));

console.log(
  `Doc/CI gate-sync check — ${candidates.length} contributor-facing gate step(s) in ci.yml, checked against ` +
    `${realDocs.length} declared gate region(s) + ${POINTER_DOC.label} (pointers only).`
);
for (const d of realDocs) console.log(`    region: ${d.label} — ${d.lines.length} line(s)`);
console.log(
  `    runner: verify.ts — ${GATES.length} gate(s) vs ${runnableCiSteps(realSteps).length} runnable ci.yml step(s), both directions`
);
console.log(`    orphans: ${gateFiles.length} tracked gate file(s) checked against ci.yml`);

if (runnerDiff.unrun.length || runnerDiff.extra.length) {
  console.error('\n❌ `verify.ts` and `ci.yml` disagree about what the gates are:\n');
  for (const n of runnerDiff.unrun) console.error(`    ci.yml runs "${n}" — \`verify.ts\` does NOT. A contributor running \`npm run verify\` would ship this unverified.`);
  for (const n of runnerDiff.extra) console.error(`    \`verify.ts\` runs "${n}" — ci.yml does NOT. Either CI is missing a gate, or the runner invented one.`);
  console.error('\n  Joined on the `- name:` string VERBATIM: the runner is code, not prose, so a renamed CI step');
  console.error('  fails here on purpose. Fix the name in whichever file is wrong.');
  console.error('  This is the arm that makes ci.yml checkable at all (#789) — until it existed, a gate missing');
  console.error('  from ci.yml left four artifacts in perfect agreement and fired nothing.');
  process.exit(1);
}

if (orphans.length) {
  console.error(`\n❌ ${orphans.length} gate file(s) exist in the repo and are named in NOTHING:\n`);
  for (const o of orphans) console.error(`    ${o}`);
  console.error('\n  Not in ci.yml directly, and not via any workspace script ci.yml runs — so it runs nowhere,');
  console.error('  and no comparison of the five gate lists can see it: they all agree by being silent.');
  console.error('  Add it to ci.yml (and to verify.ts + the three checklists, which this gate will then demand),');
  console.error('  or delete it. A gate nobody runs is worse than no gate — it reads as coverage.');
  process.exit(1);
}
if (lostPointers.length) {
  console.error(`\n❌ ${POINTER_DOC.label} summarizes the gates without naming ${lostPointers.length} of the ${REQUIRED_POINTERS.length} place(s) that hold the real list:\n`);
  for (const p of lostPointers) console.error(`    ${p}`);
  console.error('\n  The README carries a CATEGORICAL summary on purpose and is not required to enumerate');
  console.error('  every step — but a summary that no longer points at the authority is how it drifted to');
  console.error('  4 gates against CI\'s 21. Keep the pointers, or move the README into GATE_REGIONS and');
  console.error('  accept the full enumeration.');
  process.exit(1);
}
if (findings.length) {
  console.error(`\n❌ ${findings.length} gate(s) undocumented:\n`);
  for (const f of findings) console.error(`    "${f.step}" is missing from ${f.doc} (not on any one line there: ${f.missing.join(' + ')})`);
  console.error('\n  Every CLAUDE.md/CONTRIBUTING.md/PR-template checklist must equal what ci.yml actually runs —');
  console.error('  #601 and #602 both shipped `lint:classes` silently broken by following a shorter, stale checklist.');
  console.error('\n  Note WHERE this is checked (#704): only the section that carries the promise, named above.');
  console.error('  Mentioning the gate elsewhere in the same file will not satisfy it — that leniency is what let');
  console.error('  #703 add two CI steps and leave CLAUDE.md §4 short with this gate green. And the tokens must');
  console.error('  appear ON ONE LINE (#728): `test` in one paragraph plus a workspace name in another is not a');
  console.error('  documented step. Argument order does not matter.');
  process.exit(1);
}
console.log(`  ✓ clean — every npm-run/npx-tsx gate in ci.yml is documented in all ${realDocs.length} gate regions.`);
