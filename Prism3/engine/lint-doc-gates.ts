/**
 * Prism3 engine — DOC/CI GATE-SYNC CHECK (#613).
 *
 *   npx tsx Prism3/engine/lint-doc-gates.ts
 *
 * #610 fixed a concrete instance of the defect this gate exists to prevent from recurring:
 * `CLAUDE.md` principle 4, `CONTRIBUTING.md` §3, and `.github/pull_request_template.md` each
 * documented a "gates to run before pushing" checklist shorter than what `ci.yml` actually runs —
 * the PR template listed 4 checks against CI's 17, with no `lint:classes`, `lint:contrast`,
 * `check:ignore`, or `lint-us-english.ts` anywhere in any of the three documents. Two independently
 * authored PRs (#601, #602) each followed the documented checklist faithfully and both shipped
 * `lint:classes` silently broken — not carelessness, a gap in what they were told to check. #610
 * fixed the snapshot; nothing stopped it from drifting again the moment a new CI step landed without
 * a matching doc edit. This gate is that stop.
 *
 * WHAT IT COMPARES, and why that is the whole design: `.github/workflows/ci.yml` on one side — parsed
 * live, every run, never restated as a hand-written list — against the three documents' own text on
 * the other. A hand-written "the gates CI runs" constant would make this gate agree with itself
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
 *     exclusion (`NOT_A_DISTINCT_GATE` below): its `run:` embeds `npx tsx Prism3/engine/regen.ts
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
 * `docHas` checks that each piece appears as a substring *somewhere* in a doc, not that the full
 * command line appears verbatim or that the pieces sit adjacent.
 *
 * TWO STRENGTHS OF CONTRACT: the three checklist documents must ENUMERATE every gate; the root
 * `README.md` must only POINT at the two that hold the list. The README is a signpost by its own
 * stated design, so holding it to enumeration would create a fourth copy of the checklist — see
 * `POINTER_DOC` below for the full reasoning and the option that was rejected.
 *
 * ONE DIRECTION ONLY, DELIBERATELY: this checks that every ci.yml gate is represented in the docs, not
 * the converse. `CONTRIBUTING.md` §3 also documents `emit-dtcg.ts`/`emit-figma.ts` as local-only
 * commands with no matching `ci.yml` step — that is fine on purpose (they are covered transitively by
 * `regen.ts`, which the docs also note) and is not the defect #610/#613 exist to catch. Extending this
 * to the reverse direction was considered and left out — it is a different question with a different
 * false-positive shape, not a smaller version of this one.
 *
 * Dependency-free per repo convention: a hand-rolled parser for `ci.yml`'s flat `- name: ... run: ...`
 * step structure, not a YAML library — see `lint-us-english.ts`/`lint-skills.ts` for the same choice.
 * The file's structure (one job, one flat `steps:` list, no nesting inside a step beyond `run:`/`with:`)
 * is simple enough that this is low-risk.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

const CI_PATH = resolve(repo, '.github/workflows/ci.yml');
const REQUIRED_DOCS: { label: string; path: string }[] = [
  { label: 'CLAUDE.md', path: resolve(repo, 'CLAUDE.md') },
  { label: 'CONTRIBUTING.md', path: resolve(repo, 'CONTRIBUTING.md') },
  { label: '.github/pull_request_template.md', path: resolve(repo, '.github/pull_request_template.md') },
];

// The root `README.md` is DELIBERATELY not in REQUIRED_DOCS above, and this is what it gets instead.
//
// The three docs above are checklists — someone reads them to learn what to run, so a checklist
// shorter than `ci.yml` actively misleads, which is the #601/#602 defect. The README is not a
// checklist: it states outright that it "points, it doesn't restate", and it carries a categorical
// summary of the gates on purpose. Requiring it to enumerate all ~21 steps would make it a second
// copy of CONTRIBUTING §3 — a fourth place to drift, added by a gate whose entire purpose is to stop
// drift. The summary's failure mode is different from a checklist's, and needs a different check.
//
// So the README is held to a WEAKER but still structural contract: whatever it summarizes, it must
// name the two places that hold the real list. A reader who lands on a summary that has gone stale
// still has a path to the authority, and a future edit cannot quietly sever it. What it must NOT do
// is claim completeness while going stale in silence — which is exactly the state it was in before
// this landed, listing 4 gates against CI's 21 with nothing watching.
//
// This is the more conservative of the two options considered; the other was to leave the README out
// entirely with a comment recording the omission as a decision. That records the reasoning but gates
// nothing, and the README had already drifted once. Open to reviewer override.
const POINTER_DOC = { label: 'README.md', path: resolve(repo, 'README.md') };
const REQUIRED_POINTERS = ['.github/workflows/ci.yml', 'CONTRIBUTING.md'];

// See the file header's SCOPE note — this is the one exclusion that can't be inferred from shape
// alone, because its `run:` genuinely contains an `npx tsx` invocation.
const NOT_A_DISTINCT_GATE = new Set<string>(['Drift gate still covers the full artifact set']);

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

/** Which of `tokens` are absent from a doc. The ONE place membership is decided — `docHas`, `findGaps`
 *  and the README pointer check below all drive this, so a change to what "mentioned" means moves all
 *  three together instead of leaving a copy behind. */
export const missingTokens = (docText: string, tokens: string[]): string[] => tokens.filter((t) => !docText.includes(t));

/** A doc "represents" a token set when every token in it appears somewhere in the doc's text — not
 *  adjacent, not in order (see the file header's substance-not-verbatim note). */
export const docHas = (docText: string, tokens: string[]): boolean => missingTokens(docText, tokens).length === 0;

type Finding = { step: string; doc: string; missing: string[] };

/** The one function both the self-check and the real run drive — never a copy of it (`docs/34`,
 *  shape 2: a self-check that samples a reimplementation validates the reimplementation, not the
 *  gate that ships). */
export const findGaps = (steps: Step[], docs: { label: string; text: string }[]): Finding[] => {
  const findings: Finding[] = [];
  for (const step of steps) {
    if (NOT_A_DISTINCT_GATE.has(step.name)) continue;
    const tokenSets = gateTokensOf(step.run);
    for (const tokens of tokenSets) {
      for (const doc of docs) {
        const missing = missingTokens(doc.text, tokens);
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
        run: npx --yes tsx@4 Prism3/engine/sample-test.ts

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
          count=$(npx --yes tsx@4 Prism3/engine/sample-test.ts | grep -oE '[0-9]+ things')
`;

const selfFails: string[] = [];
const steps = parseSteps(SAMPLE_YAML);

// 1. Parsing: the right step COUNT and NAMES, including the quoted-colon trap (#298's original bug)
//    and the block-scalar form, before trusting anything built on top of it.
const names = steps.map((s) => s.name);
if (!names.includes('Sample gate: has a colon')) selfFails.push('a quoted step name with an interior colon is truncated or dropped');
if (steps.some((s) => s.name === 'Install workspace deps' && s.run !== 'npm ci')) selfFails.push('a single-line `run:` is parsed wrong');
const driftStep = steps.find((s) => s.name === 'Drift gate still covers the full artifact set');
if (!driftStep || !driftStep.run.includes('npx --yes tsx@4 Prism3/engine/sample-test.ts')) selfFails.push('a block-scalar `run: |` step is parsed wrong');

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

// 4. docHas: substance match (tokens present anywhere, any order) — both directions.
if (!docHas('the sample workspace runs typecheck via @prism3/sample', ['typecheck', '@prism3/sample'])) {
  selfFails.push('docHas no longer accepts tokens present out of order');
}
if (docHas('the sample workspace runs typecheck only', ['typecheck', '@prism3/sample'])) {
  selfFails.push('docHas is satisfied when a required token is actually missing (false pass)');
}

// 4b. The README pointer contract — both directions, driven through `missingTokens`, the same
//     function the real check below calls. A pointer check that cannot fail is worse than no pointer
//     check, because it makes the README look covered.
if (missingTokens('summary only; the gates live elsewhere', REQUIRED_POINTERS).length !== REQUIRED_POINTERS.length) {
  selfFails.push('the README pointer check passes a doc naming neither authority (it cannot fail)');
}
if (missingTokens('the full list is in .github/workflows/ci.yml; the checklist in CONTRIBUTING.md', REQUIRED_POINTERS).length) {
  selfFails.push('the README pointer check flags a doc that DOES name both authorities (false positive)');
}
if (!missingTokens('see .github/workflows/ci.yml for the full list', REQUIRED_POINTERS).includes('CONTRIBUTING.md')) {
  selfFails.push('the README pointer check is satisfied by naming only one of the two authorities');
}

// 5. findGaps end to end — the core "can this gate actually fail" proof (docs/34's central test).
//    A doc missing a real gate's token must produce a finding NAMING that step and that doc; the same
//    doc, once it mentions the token, must produce none for it. And the named exclusion must survive
//    all the way through `findGaps`, not just `gateTokensOf` in isolation.
const docsMissingSample = [
  { label: 'DocA', text: 'nothing relevant here' },
  { label: 'DocB', text: 'run sample-test.ts before pushing' },
];
const gapsMissing = findGaps(steps, docsMissingSample);
if (!gapsMissing.some((f) => f.step === 'Sample unit tests' && f.doc === 'DocA')) {
  selfFails.push('findGaps does not flag a doc that never mentions a real gate step (the gate cannot fail)');
}
if (gapsMissing.some((f) => f.step === 'Sample unit tests' && f.doc === 'DocB')) {
  selfFails.push('findGaps flags a doc that DOES mention the gate step (false positive)');
}
if (gapsMissing.some((f) => f.step === 'Drift gate still covers the full artifact set')) {
  selfFails.push('the named exclusion did not survive into findGaps — the meta-check step is being required in the docs');
}
if (gapsMissing.some((f) => f.step === 'Install workspace deps' || f.step === 'Sample gate: has a colon')) {
  selfFails.push('a non-gate step (npm ci / grep-only script) produced a finding');
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
const missingDocs = [...REQUIRED_DOCS, POINTER_DOC].filter((d) => !existsSync(d.path));
if (missingDocs.length) {
  console.error('\n❌ required doc(s) not found — this gate cannot check what it never opened:');
  for (const d of missingDocs) console.error(`    ${d.label}`);
  process.exit(1);
}

// ---- THE REAL RUN --------------------------------------------------------------------------------
const realSteps = parseSteps(readFileSync(CI_PATH, 'utf8'));
const realDocs = REQUIRED_DOCS.map((d) => ({ label: d.label, text: readFileSync(d.path, 'utf8') }));

const candidates = realSteps.filter((s) => !NOT_A_DISTINCT_GATE.has(s.name) && gateTokensOf(s.run).length > 0);
// A parser that silently stopped matching would report "clean" over zero candidates — a floor here
// is what makes that loud instead of quiet (the same shape as `lint-skills.ts`'s "zero skills found").
if (candidates.length < 10) {
  console.error(`\n❌ only ${candidates.length} contributor-facing gate step(s) found in ci.yml — expected well over 10.`);
  console.error('    Either the workflow genuinely shrank (update this floor in the same PR), or the parser broke.');
  process.exit(1);
}

const findings = findGaps(realSteps, realDocs);

// The README's weaker contract — see POINTER_DOC above for why it is not held to enumeration.
const lostPointers = missingTokens(readFileSync(POINTER_DOC.path, 'utf8'), REQUIRED_POINTERS);

console.log(`Doc/CI gate-sync check — ${candidates.length} contributor-facing gate step(s) in ci.yml, checked against ${realDocs.length} doc(s) + ${POINTER_DOC.label} (pointers only).`);
if (lostPointers.length) {
  console.error(`\n❌ ${POINTER_DOC.label} summarizes the gates without naming ${lostPointers.length} of the ${REQUIRED_POINTERS.length} place(s) that hold the real list:\n`);
  for (const p of lostPointers) console.error(`    ${p}`);
  console.error('\n  The README carries a CATEGORICAL summary on purpose and is not required to enumerate');
  console.error('  every step — but a summary that no longer points at the authority is how it drifted to');
  console.error('  4 gates against CI\'s 21. Keep the pointers, or move the README into REQUIRED_DOCS and');
  console.error('  accept the full enumeration.');
  process.exit(1);
}
if (findings.length) {
  console.error(`\n❌ ${findings.length} gate(s) undocumented:\n`);
  for (const f of findings) console.error(`    "${f.step}" is missing from ${f.doc} (no mention of: ${f.missing.join(', ')})`);
  console.error('\n  Every CLAUDE.md/CONTRIBUTING.md/PR-template checklist must equal what ci.yml actually runs —');
  console.error('  #601 and #602 both shipped `lint:classes` silently broken by following a shorter, stale checklist.');
  process.exit(1);
}
console.log('  ✓ clean — every npm-run/npx-tsx gate in ci.yml is represented in all three documents.');
