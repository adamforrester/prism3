/**
 * SHAPE-INDEX GATE (#786) — a `docs/34` shape number, once published, never means something else.
 *
 *   npx tsx packages/engine/lint-shape-index.ts
 *   npx tsx packages/engine/lint-shape-index.ts --accept    # append NEW shapes only; never rewrites
 *
 * ── WHAT IS ACTUALLY WRONG HERE, AND WHAT IS NOT ────────────────────────────────────────────────
 *
 * State this precisely, because #786 was filed on a precedent that does not exist and the record
 * should say so. `docs/34`'s sub-shape numbers are cited as stable identifiers from gate headers,
 * `test.ts` comments and several docs, and they are assigned at authoring time with nothing enforcing
 * that an existing number keeps its meaning. That is a real hazard. (No citation count is written in
 * this header on purpose — the run prints it. A number in a comment is #568's landmark-goes-stale,
 * which is the defect this file's own subject document records.)
 *
 * It has never fired. Measured over every commit that has ever touched the document, comparing each
 * number's title against the previous commit's:
 *
 *   · shapes 1-9 are BYTE-IDENTICAL since 2026-08-08
 *   · 10 through 15 were each APPENDED, never inserted
 *   · same-number-different-title across the whole history: ZERO
 *   · every cited number (1,2,3,4,5,8,9,10,12,13,14,15) resolves to an existing heading
 *
 * The "12 -> 13 renumber" that motivated #786 was a renumber at FILING time: c1812eb shipped 12 and
 * b3bc865 appended 13. Nothing published as 12 later became 13, so no citation was ever invalidated.
 *
 * So this gate protects a hazard with ZERO INCIDENTS, and that is a different thing from a recurring
 * defect. It is deliberately the cheap version for exactly that reason — one authored file and two
 * arms, not the stable-slug migration that would have rewritten every citation in the repo to fix
 * damage that has not occurred. Whoever is tempted to upgrade it: check the register first, and if
 * the answer is still zero, the cost is still not justified.
 *
 * ── WHY THE BASELINE IS AUTHORED AND NOT REGENERATED ────────────────────────────────────────────
 *
 * `schema/shape-index.json` is hand-maintained and deliberately NOT a `regen.ts` artifact, the same
 * posture as `token-contract.json` (CLAUDE.md principle 5), `payload-manifest.json` (#674) and
 * `paint-census.json` (#758).
 *
 * The naive gate reads the CURRENT document to decide what to expect — and that is `docs/34` shape 1
 * in the file that defines shape 1: the expected value computed from the subject, confirming the
 * document is self-consistent, which it always is. A renumber would rewrite the expectation and the
 * gate would report a pass. Say it plainly since this is the one property a cleanup would remove:
 * **a gate allowed to rewrite what it reads has no memory** (shape 6).
 *
 * THE ALTERNATIVE THAT WAS REJECTED, named so it is not re-proposed as an improvement: derive the
 * previous binding from git history (`git show HEAD~1:docs/34-...`). That is genuinely independent —
 * the document cannot edit its own past — but it makes the gate depend on a ref being fetched, and
 * CI checks out shallow. A gate that cannot run is worse than one whose oracle is a committed file,
 * and "the history is not there" is indistinguishable from "nothing changed" at exactly the moment
 * it matters.
 *
 * ── INDEPENDENCE (docs/34) ──────────────────────────────────────────────────────────────────────
 *
 *   ARM A, the binding:   EXPECTED = the authored `shapes[]` in schema/shape-index.json.
 *                         ACTUAL   = the `### N. Title` headings parsed out of docs/34.
 *                         Neither is derived from the other. The document cannot move a number
 *                         without contradicting a file it does not write.
 *
 *   ARM B, the citations: EXPECTED = the set of numbers the DOCUMENT defines (its headings).
 *                         ACTUAL   = every `shape N` / `sub-shape N` reference in tracked files.
 *                         Here the document is legitimately the oracle: the question is only
 *                         "does the cited section exist", and the document is what exists. Arm A is
 *                         what stops that heading set from being quietly re-meaning-ed underneath it.
 *
 *   ARM C, the crossing:  EXPECTED = the prose rules `lint-us-english.ts` and `lint-voice.ts` apply
 *                         to `schema/shape-index.json`, imported from `prose-rules.ts` — the SAME
 *                         functions, never a second copy.
 *                         ACTUAL   = each `### N. Title` in docs/34, which is the text `--accept`
 *                         copies verbatim into that file.
 *
 * ── WHY ARM C IS HERE AND NOT IN A PROSE GATE (#1117) ───────────────────────────────────────────
 *
 * Every prose gate answers *"is this FILE in scope?"*, and text does not respect that boundary.
 * `schema/shape-index.json` is hand-named in BOTH prose gates; `docs/34-gate-independence.md` is in
 * NEITHER. `--accept` copies headings across that line verbatim. So an en-GB spelling or a §2 banned
 * phrase in a docs/34 heading is invisible for as long as it lives only in docs/34, and becomes a
 * gate failure the moment it is copied — **reported against `shape-index.json`, whose author did not
 * write the words.** It has fired: during #1105, and the remedy was a hand-edit of the destination.
 *
 * This arm moves the failure to the source. It runs in the ordinary gate as well as in `--accept`,
 * so a heading that would launder bad prose fails in CI even if nobody runs `--accept`, and the
 * message names **docs/34** — the file to edit — rather than the file that faithfully copied.
 *
 * **The rule is imported, never restated.** A boundary check holding text to a rule LOOSER than its
 * destination's is worse than none: it stamps approval on text that then fails against the wrong
 * file, which is the defect it was added to remove. `prose-rules.ts` exists so the two cannot differ.
 *
 * TITLES ONLY, which is what crosses. `policy` and `document` in the baseline are hand-authored
 * there, so they are the destination's own prose and its own gates' business.
 *
 * ── WHAT ARM B CANNOT DO, stated rather than implied ────────────────────────────────────────────
 *
 * **It checks that a cited shape number EXISTS. It cannot check that the citation means the RIGHT
 * shape.** `docs/34 shape 4` beside a gate that is actually an instance of shape 9 passes this gate
 * and always will. That judgment lives in prose written by a person, and any second opinion about it
 * would have to be derived from the citing comment or from the document — both of which are the
 * thing under test. So the honest guard is review, and the reason this limit is written here rather
 * than left to be inferred is that a gate whose limits are undocumented gets trusted past them:
 * "citations checked, clean" reads like a correctness claim and is only an existence claim.
 *
 * Arm A is what makes the existence claim worth having at all. Without it, a renumber keeps every
 * citation resolving — to the wrong shape — and arm B stays green through the entire defect.
 *
 * MUTATIONS VERIFIED (each fails by name, exit 1): retitle an existing heading · renumber two
 * headings by swapping their titles · delete a heading that is in the baseline · append a heading
 * with no baseline entry · point a citation at a number the document does not define · a baseline
 * entry whose number appears twice · narrow the citation regex (fails as SCOPE NOT REPRESENTED,
 * which is the one that matters — a dead detector otherwise reports a clean zero) · an en-GB
 * spelling in a heading, which fails arm C naming docs/34 rather than the baseline. Negative control:
 * appending a heading plus its baseline entry passes. `--accept` refuses both a retitle and a
 * deletion, and leaves the baseline byte-unchanged when it refuses.
 *
 * A NOTE FOR WHOEVER WRITES THE NEXT MUTATION REGISTER, because arm B's first real catch was one:
 * prose that DESCRIBES a mutation in citation form (an "add shape <N>" / "cite shape <N>" register,
 * with real numbers in it) is indistinguishable from prose CITING a shape, and this gate will fail
 * your `00-progress.md` entry. The fix is to reword the description, NOT to add an exemption or
 * narrow the pattern — same posture as `lint-us-english.ts`'s "a false positive is fixed by adding to
 * NOT_EN_GB, never by narrowing a scan", and here even the exemption turned out to be avoidable.
 *
 * Note also that THIS FILE is in arm B's own scope once committed (`git ls-files`), so an untracked
 * run is not the same run CI does. Verified by staging before trusting the green.
 *
 * SCOPE — `docs/34-gate-independence.md`, and for arm B every tracked `.ts/.tsx/.mjs/.js/.md` file
 * except the document itself (its internal cross-references are prose about adjacent shapes, not
 * citations of a stable id, and they move with the text). The scope is asserted REPRESENTED, not
 * counted: arm B must find citations in at least the files the baseline records as citing sites, so
 * a regex that stops matching fails instead of reporting a clean zero (shape 9's cheap tell).
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// The DESTINATION's rules, imported rather than restated — see ARM C in the header. A second copy
// that drifts LOOSER than the destination would approve text that fails later against another file.
import { enGb, voiceHits } from './prose-rules.ts';

const repo = join(import.meta.dirname, '../..');
const DOC = 'docs/34-gate-independence.md';
const BASELINE = 'packages/engine/schema/shape-index.json';

/** Files whose citations arm B must find. Not a count — a REPRESENTATION floor, so a regex that
 *  stops matching fails rather than reporting `0 citations, clean`. Add a file when it starts
 *  citing; removing one is a deliberate edit that says the citations are gone.
 *
 *  THIS FILE is deliberately absent from the floor even though its header cites shapes: its
 *  citations are prose about the mechanism, and holding the gate's own header to a floor it
 *  publishes only constrains how this file may be reworded. Every other citing site is here. */
const CITING_FILES_FLOOR = [
  'docs/00-progress.md',
  'docs/35-naming-and-packaging.md',
  'CONTRIBUTING.md',
  '.github/pull_request_template.md',
  'packages/engine/typecheck-components.ts',
  'packages/engine/lint-doc-gates.ts',
  'packages/engine/lint-layout-claims.ts',
  'packages/engine/test.ts',
  'packages/engine/nb-regression.ts',
  'packages/engine/components/index.ts',
  'apps/studio/vercel-ignore-check.mjs',
  'apps/studio/src/export-settings.ts',
  'apps/plugin/test-write-components.ts',
  'verify.ts',
  'packages/engine/lint-absolute-inset.ts',
];

type Shape = { n: number; title: string };

/** ACTUAL for arm A: the document's own headings. `### N. Title`, which is how every shape is
 *  written; a shape added in another form is not in the register and would fail arm A as missing. */
function headingsInDoc(src: string): Shape[] {
  const out: Shape[] = [];
  for (const line of src.split('\n')) {
    const m = /^### (\d+)\.\s+(.+?)\s*$/.exec(line);
    if (m) out.push({ n: Number(m[1]), title: m[2] });
  }
  return out;
}

/** ACTUAL for arm B. Matches `shape 4`, `shapes 9 and 13`, `sub-shape 13`, with or without a comma
 *  before the number, case-insensitively — the four spellings measured across the corpus. */
function citationsIn(src: string): number[] {
  const out: number[] = [];
  for (const m of src.matchAll(/(?:sub-)?shapes?\s+(\d+)(?:\s*(?:,|and|then)\s*(\d+))*/gi)) {
    for (const d of m[0].matchAll(/\d+/g)) out.push(Number(d[0]));
  }
  return out;
}

const accept = process.argv.includes('--accept');
const docSrc = readFileSync(join(repo, DOC), 'utf8');
const actual = headingsInDoc(docSrc);
const baseline = JSON.parse(readFileSync(join(repo, BASELINE), 'utf8')) as {
  policy: string;
  document: string;
  shapes: Shape[];
};

const failures: string[] = [];
const lines: string[] = [];

// ---- the baseline's own integrity, before it is used as an oracle ---------------------------
{
  const seen = new Map<number, string>();
  for (const s of baseline.shapes) {
    const prior = seen.get(s.n);
    if (prior !== undefined) {
      failures.push(
        `BASELINE names shape ${s.n} twice ("${prior}" and "${s.title}") — an oracle that ` +
          `disagrees with itself cannot decide anything. Fix ${BASELINE} by hand.`,
      );
    }
    seen.set(s.n, s.title);
  }
  if (baseline.document !== DOC) {
    failures.push(`BASELINE points at \`${baseline.document}\`, this gate reads \`${DOC}\`.`);
  }
}

// ---- ARM A: no published number ever means something else ----------------------------------
{
  const actualByN = new Map(actual.map((s) => [s.n, s.title]));
  for (const b of baseline.shapes) {
    const now = actualByN.get(b.n);
    if (now === undefined) {
      failures.push(
        `SHAPE ${b.n} IS GONE from ${DOC}. The baseline records it as "${b.title}", and citations ` +
          `across the repo reference these numbers by index. Deleting a shape orphans every ` +
          `citation of it; renumber nothing — retire it in place.`,
      );
    } else if (now !== b.title) {
      failures.push(
        `SHAPE ${b.n} CHANGED MEANING: baseline says "${b.title}", ${DOC} now says "${now}". ` +
          `Every \`shape ${b.n}\` citation in the repo now points at a different shape than its ` +
          `author meant, and nothing else would say so. If this is a genuine retitle of the SAME ` +
          `shape, edit ${BASELINE} by hand in this PR — \`--accept\` appends only, on purpose.`,
      );
    }
  }
  for (const s of actual) {
    if (!baseline.shapes.some((b) => b.n === s.n)) {
      failures.push(
        `SHAPE ${s.n} ("${s.title}") is in ${DOC} and not in the baseline. Append it with ` +
          `\`npx tsx packages/engine/lint-shape-index.ts --accept\` in the same PR that adds it. ` +
          `That friction is the point: it is the moment the append-only rule gets applied.`,
      );
    }
  }
  lines.push(`  shapes: ${actual.length} in the document, ${baseline.shapes.length} in the baseline`);
}

// ---- ARM B: every cited shape number resolves to a section that exists ---------------------
{
  const defined = new Set(actual.map((s) => s.n));
  const tracked = execSync('git ls-files', { cwd: repo, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((f) => /\.(ts|tsx|mjs|js|md)$/.test(f) && f !== DOC);

  let total = 0;
  const filesWithCitations = new Set<string>();
  for (const f of tracked) {
    let src: string;
    try {
      src = readFileSync(join(repo, f), 'utf8');
    } catch {
      continue;
    }
    const srcLines = src.split('\n');
    for (const m of src.matchAll(/(?:sub-)?shapes?\s+(\d+)(?:\s*(?:,|and|then)\s*(\d+))*/gi)) {
      const lineNo = src.slice(0, m.index).split('\n').length;
      for (const d of m[0].matchAll(/\d+/g)) {
        total++;
        filesWithCitations.add(f);
        const n = Number(d[0]);
        if (!defined.has(n)) {
          failures.push(
            `DANGLING CITATION ${f}:${lineNo} references \`shape ${n}\`, which ${DOC} does not ` +
              `define (it defines 1-${Math.max(...defined)}). Context: ` +
              `${srcLines[lineNo - 1].trim().slice(0, 90)}`,
          );
        }
      }
    }
  }

  // The scope is asserted REPRESENTED, not counted (shape 9's cheap tell: a detector that stops
  // matching reports a clean zero). Every file the baseline knows cites shapes must still be found
  // by the regex above — so a narrowed pattern or a renamed file fails here rather than silently.
  for (const f of CITING_FILES_FLOOR) {
    if (!filesWithCitations.has(f)) {
      failures.push(
        `SCOPE NOT REPRESENTED: \`${f}\` is a known citing site and this run found no citation in ` +
          `it. Either the citations were legitimately removed (drop it from CITING_FILES_FLOOR in ` +
          `this file, in this PR) or the citation regex has stopped matching — in which case a ` +
          `clean run means nothing.`,
      );
    }
  }
  lines.push(`  citations: ${total} across ${filesWithCitations.size} file(s), all resolving`);
}

// ---- ARM C: the crossing (#1117) ------------------------------------------------------------
// Each heading TITLE is the text `--accept` copies verbatim into a file both prose gates scan, so it
// is held to those gates' rules HERE, where the failure names the file to edit. The rules are the
// imported ones — see the header for why a second copy is the one thing that must not exist.
//
// A REPRESENTATION FLOOR, not a count: `enGb` and `voiceHits` are applied through this one loop, and
// a zero result is only evidence if the loop ran. Zero headings means the parse died, not that the
// document is clean — the same tell arm B's citation floor exists for.
{
  // The counter is incremented INSIDE the loop, not read off `actual.length`. Those are different
  // numbers the moment anything filters, slices or short-circuits between them — and the first
  // version of this floor read `actual.length`, so pointing the loop at an empty array left the arm
  // walking nothing and the gate exiting 0. Caught by mutation, which is the only thing that would
  // have caught it: the code looked right and the number it printed was true about the wrong set.
  let walked = 0;
  for (const s of actual) {
    walked++;
    for (const { word } of enGb(s.title)) {
      failures.push(
        `CROSSING — ${DOC}, heading "### ${s.n}. ${s.title}" carries the en-GB spelling "${word}". ` +
          `\`--accept\` copies this title VERBATIM into ${BASELINE}, which lint-us-english.ts scans, ` +
          `so the failure would land there — on a file that faithfully copied what it was given. ` +
          `Edit the heading in ${DOC} (#1117).`,
      );
    }
    for (const { rule, match } of voiceHits(s.title)) {
      failures.push(
        `CROSSING — ${DOC}, heading "### ${s.n}. ${s.title}" breaks voice-standard §2 (${rule}: ` +
          `"${match}"). \`--accept\` copies this title VERBATIM into ${BASELINE}, which ` +
          `lint-voice.ts scans, so the failure would land there rather than here. Edit the heading ` +
          `in ${DOC} (#1117).`,
      );
    }
  }
  if (!walked) {
    failures.push(
      `ARM C walked 0 headings, so "no crossing violations" is silence rather than evidence. Either ` +
        `${DOC} lost its \`### N. Title\` headings, \`headingsInDoc\` stopped matching, or this arm's ` +
        `own loop stopped reaching them.`,
    );
  }
  lines.push(`  crossing: ${walked} heading(s) held to the rules of ${BASELINE}'s own gates`);
}

if (accept) {
  const known = new Set(baseline.shapes.map((b) => b.n));
  const added = actual.filter((s) => !known.has(s.n));
  // A crossing violation blocks the copy itself, and is reported FIRST: this is the one refusal whose
  // remedy is in another file, and stating it before the append-only rule keeps the reader pointed at
  // docs/34 rather than at the baseline (#1117).
  const crossings = failures.filter((f) => f.startsWith('CROSSING'));
  if (crossings.length) {
    console.error(`✗ --accept refuses: ${crossings.length} heading(s) would launder prose the destination's own gates reject.\n`);
    for (const c of crossings) console.error(`  · ${c}\n`);
    console.error(
      `  Nothing was written. Fix the heading in ${DOC} — not ${BASELINE}, which is only the copy.`,
    );
    process.exit(1);
  }
  const conflicts = failures.filter((f) => f.includes('CHANGED MEANING') || f.includes('IS GONE'));
  if (conflicts.length) {
    console.error('✗ --accept refuses: the document changed an EXISTING binding, which is not an append.\n');
    for (const c of conflicts) console.error(`  · ${c}`);
    console.error(
      '\n  `--accept` appends only, so that a renumber cannot be waved through by running the gate.\n' +
        '  If the retitle is genuine, edit schema/shape-index.json by hand and update the citations.',
    );
    process.exit(1);
  }
  if (!added.length) {
    console.log('Nothing to append — the baseline already covers every shape in the document.');
    process.exit(0);
  }
  baseline.shapes = [...baseline.shapes, ...added].sort((a, b) => a.n - b.n);
  writeFileSync(join(repo, BASELINE), `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`✓ appended ${added.length} shape(s): ${added.map((s) => `${s.n}. ${s.title}`).join(' · ')}`);
  process.exit(0);
}

console.log(`Shape-index gate — ${DOC}`);
for (const l of lines) console.log(l);

if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s):\n`);
  for (const f of failures) console.error(`  · ${f}\n`);
  process.exit(1);
}

console.log(
  '  ✓ clean — no published shape number changed meaning, and every cited number resolves.\n' +
    '    Note the limit: this proves a cited section EXISTS, not that the citation names the right\n' +
    '    shape. That judgment is prose, and review is its only guard.',
);
