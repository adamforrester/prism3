/**
 * PROGRESS-LOG ORDER GATE (#931) — `docs/00-progress.md` is newest-entry-first by convention, and
 * nothing checks it.
 *
 *   npx tsx packages/engine/lint-progress-order.ts
 *
 * ── THE GAP THIS CLOSES ─────────────────────────────────────────────────────────────────────────
 *
 * A rebase or a merge routinely lands the incoming progress entry SECOND, because git merges the
 * two entries cleanly — different lines, no textual conflict, nothing reports anything. Three
 * occurrences in 24 hours across two lanes (#931), all caught only because a human happened to
 * notice and moved the entry back to the top by hand.
 *
 * Not because nobody wrote a gate for this file — it is exempt from every one that touches it
 * (`lint-advisory-expiry.ts`, `lint-decisions-index.ts`, `lint-layout-claims.ts`,
 * `lint-shape-index.ts`, `lint-voice.ts`), and every exemption is correct: the file is an
 * append-only dated log, so an entry describing the repo as it was in July is accurate prose
 * forever, and holding it to a present-tense standard would force it to falsify itself. That
 * argument is about CONTENT. It was applied file-wide, so it also covered ORDERING — a structural
 * property none of those five gates was ever asking about. Same species of gap as
 * `docs/43-agent-instruction-surface.md` §3 found in two of `CLAUDE.md`'s own three "pinned"
 * regions: a check built to answer one narrow question reads, from the outside, like coverage of
 * the whole file, and the property nobody was asking about falls through in plain sight. A file
 * that accumulates a genre exemption in gate after gate is worth a second look at what ELSE lives
 * in it besides the content those exemptions were written for.
 *
 * ── WHY THIS ONE IS GATEABLE, UNLIKE #923's CLASS ───────────────────────────────────────────────
 *
 * #923 argues some hazards fire during a shell command with no tree state to assert against. This
 * is the opposite case: the ordering of a committed markdown file IS tree state, present in every
 * checkout, checkable offline with no host and no shell.
 *
 * ── THE CHECK, AND THE docs/34 SHAPE-1 TEST IT HAS TO PASS ─────────────────────────────────────
 *
 * EXPECTED is `sorted(dates, descending)` — a genuine transformation of the parsed dates, computed
 * by this file's own sort, never a re-read of the file re-labeled. ACTUAL is the dates as they
 * appear in the file, in heading order. When the file is correctly ordered the two are already
 * equal and the gate passes; when an entry lands out of place they differ at the first point of
 * disagreement and the gate fails, naming every subsequent point of disagreement too. That is the
 * shape-1 test (docs/34 #1: "the gate reads the declaration it is checking") — EXPECTED is DERIVED
 * from ACTUAL by an operation that can produce a different sequence, not restated from it, so this
 * cannot be "simplified" into comparing the file to itself without silently deleting the check.
 * Ties sort stably (Array.prototype.sort is stable since ES2019), so same-day entries keep their
 * original relative order rather than being treated as a violation of each other.
 *
 * ── THE PARSE FLOOR (docs/34 shape 9) ───────────────────────────────────────────────────────────
 *
 * If `HEADING_RE` matches zero lines, the gate FAILS rather than reporting a vacuous pass — the
 * same discipline `lint-doc-gates.ts`'s region floor uses, and the same failure mode it exists to
 * refuse. A future reformatting of the heading (a different dash, a dropped parenthesis) that stops
 * matching must go red and say so, not pass silently over nothing.
 *
 * ── WHAT THIS DOES NOT CHECK, STATED PLAINLY SO A GREEN RUN IS NOT READ AS MORE THAN IT IS ───────
 *
 * One structural property: the dated headings appear in non-increasing date order. It does NOT
 * check that an entry is correct, that an entry is present for a given PR, that the stated date is
 * the real date the work happened, or that an entry's content matches what shipped. A rebase that
 * silently drops a whole entry, or backdates one to dodge this check, is invisible here — that is
 * prose, and review is its only guard, same limit `lint-decisions-index.ts`'s header states for its
 * own doc.
 *
 * ── SCOPE ────────────────────────────────────────────────────────────────────────────────────────
 *
 * `docs/00-progress.md` only, per #931 — other append-only dated logs (`_research/_inbound/` in the
 * knowledge-base repo has the same genre) are out of scope and were explicitly left there rather
 * than folded in.
 *
 * The heading pattern is deliberately narrow: `## (YYYY-MM-DD) — <title>`, the convention every
 * entry since this file adopted per-entry headings has used. Older headings that predate that
 * convention (`## Latest (2026-07-21) — ...`, `## 2026-07-03 — ...`, `## Current status
 * (2026-07-01)`, and non-dated section headings in the same historical tail) do not match and are
 * invisible to this gate BY CONSTRUCTION, not by an exemption list — they were never entries in the
 * sense this check parses, and widening the pattern to reach them is a different, undecided task.
 * With 398 real matches in the current file this scope choice does not starve the floor above.
 *
 * MUTATIONS VERIFIED (each fails by name, exit 1): two entries transposed · the heading pattern
 * changed so it matches nothing (fails the floor, not silently) · appending a new entry at the top
 * with today's date (still passes — the positive control). See the PR for the mutation transcript.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repo = join(import.meta.dirname, '../..');
const FILE = 'docs/00-progress.md';
const HEADING_RE = /^## \((\d{4}-\d{2}-\d{2})\) — (.+?)\s*$/;

type Entry = { line: number; date: string; title: string };

const src = readFileSync(join(repo, FILE), 'utf8');
const entries: Entry[] = [];
src.split('\n').forEach((line, i) => {
  const m = HEADING_RE.exec(line);
  if (m) entries.push({ line: i + 1, date: m[1], title: m[2] });
});

console.log('Progress-log order gate (#931)');

if (entries.length === 0) {
  console.error(
    `\n✗ PARSE FLOOR: 0 heading(s) matched ${HEADING_RE} in ${FILE}. Either the file has genuinely ` +
      `lost every dated entry (check by hand — it has not) or the heading format changed and this ` +
      `detector is looking at nothing. A pattern that stops matching must fail loudly, never pass ` +
      `over an empty set (docs/34 shape 9). Do not widen the pattern to make this pass — find out ` +
      `what changed and fix the mismatch.`,
  );
  process.exit(1);
}

console.log(`  ${entries.length} dated entr${entries.length === 1 ? 'y' : 'ies'} found`);

const actual = entries.map((e) => e.date);
// EXPECTED: a real transformation of ACTUAL, not a restatement of it — descending, ties stable.
const expected = [...actual].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

const disagreements: number[] = [];
for (let i = 0; i < actual.length; i++) {
  if (actual[i] !== expected[i]) disagreements.push(i);
}

if (disagreements.length === 0) {
  console.log(
    '  ✓ clean — every dated entry appears in descending date order. Note the limit: this proves\n' +
      '    one structural property, not that an entry is correct, present, dated accurately, or\n' +
      '    matches what shipped — that judgment is prose, and review is its only guard.',
  );
  process.exit(0);
}

// Diagnose in the units a human fixes: which entry sits below which, and by how much.
const outOfOrder: string[] = [];
for (let i = 1; i < entries.length; i++) {
  if (entries[i].date > entries[i - 1].date) {
    outOfOrder.push(
      `${FILE}:${entries[i].line} — "(${entries[i].date}) — ${entries[i].title}" sits BELOW ` +
        `${FILE}:${entries[i - 1].line} — "(${entries[i - 1].date}) — ${entries[i - 1].title}", ` +
        `but ${entries[i].date} is a LATER date. Move the newer entry above the older one.`,
    );
  }
}

console.error(
  `\n✗ ${outOfOrder.length} entr${outOfOrder.length === 1 ? 'y' : 'ies'} out of order (${disagreements.length} ` +
    `position(s) disagree with the sorted sequence):\n`,
);
for (const o of outOfOrder) console.error(`  · ${o}\n`);
console.error(
  '  Most rebases land the incoming entry second with no textual conflict — check `git log --oneline\n' +
    '  -1 docs/00-progress.md` on both sides of the merge and move the newer entry back to the top.',
);
process.exit(1);
