/**
 * CURRENT-DECISIONS INDEX GATE (#886) — every recorded decision is indexed, and every index row
 * resolves to a real decision.
 *
 *   npx tsx packages/engine/lint-decisions-index.ts
 *   npx tsx packages/engine/lint-decisions-index.ts --accept    # append NEW headings only; never rewrites
 *
 * ── THE GAP THIS CLOSES ─────────────────────────────────────────────────────────────────────────
 *
 * Nothing anywhere catches a decision superseded by a later one, or a decision that exists only in an
 * issue thread with no doc pointing at it. `docs/42-current-decisions.md` is the router; this is what
 * keeps it honest. Read `docs/34-gate-independence.md` before touching this file — it names the shape
 * this gate exists to avoid (shape 9's "forward alone" trap, generalized past one document's promise
 * list to #670/#807's directory-scale version of the same rule) and the both-directions arm below is
 * the one that does the work.
 *
 * ── THE CONVENTION (docs/42) ────────────────────────────────────────────────────────────────────
 *
 * A decision-recording section is a heading, `##` through `####`, matching:
 *
 *   Decided (YYYY-MM-DD, #NNN): <title>          — or, with no owning issue:
 *   Decided (YYYY-MM-DD): <title>
 *
 * lifted verbatim from the two instances that already existed in `docs/28` before this gate did
 * (§5.1, §5.2). Heading-level, not inline — an inline `**Decision:**` paragraph is not a section a
 * reader can be routed to, and is not reliably distinguishable from ordinary bold emphasis at scale
 * (the same scope-vs-promise gap #704 found checking a whole file instead of a declared region).
 * Docs predating the convention are named as a known gap in `docs/42`, not silently migrated.
 *
 * `docs/00-progress.md` is exempt by genre, the same exemption `lint-layout-claims.ts` and
 * `lint-advisory-expiry.ts` grant it: its dated entries describe the repo as it was, so a decision
 * recorded there is correct prose forever and is not this file's subject — the topic doc is.
 * `docs/42-current-decisions.md` itself is excluded from the scan (its own convention section quotes
 * the pattern in prose, which is not a citation of a real decision).
 *
 * ── WHY THE BASELINE IS AUTHORED AND NOT REGENERATED ────────────────────────────────────────────
 *
 * `schema/decisions-index.json` is hand-maintained, the same posture as `token-contract.json`
 * (CLAUDE.md principle 5), `payload-manifest.json` (#674), `paint-census.json` (#758) and
 * `shape-index.json` (#786). A version regenerated from a scan of the docs would classify its own
 * membership and report that as a pass — `docs/34` shape 6, restated: a gate allowed to rewrite what
 * it reads has no memory.
 *
 * ── INDEPENDENCE (docs/34), both directions ─────────────────────────────────────────────────────
 *
 *   ARM A, the row:        EXPECTED = each row in the authored baseline (doc, date, issue, title).
 *                           ACTUAL   = that doc's own `Decided (...)` headings, parsed live.
 *                           A row whose doc/date/issue/title does not match any heading in that doc
 *                           fails — the index claiming a decision that is not (or no longer) there.
 *
 *   ARM B, the converse:   EXPECTED = the set of `Decided (...)` headings the CORPUS actually
 *                           contains — every tracked `docs/**\/*.md` file except the two exemptions
 *                           above, parsed live, independent of the baseline.
 *                           ACTUAL   = the baseline's rows.
 *                           A heading with no matching baseline row fails — a decision recorded and
 *                           never indexed, which is the gap #886 exists to close and the one a
 *                           forward-only check cannot see (docs/34, "two adjacent failure modes").
 *
 * Neither side is derived from the other: the baseline is hand-written, the headings are parsed from
 * the live docs tree. A decision moved to a different doc, deleted, or retitled breaks arm A. A new
 * `Decided (...)` heading added anywhere without a matching row breaks arm B.
 *
 * ── THE SECTION POINTER ─────────────────────────────────────────────────────────────────────────
 *
 * A baseline row also carries `section` (e.g. `"9.1"`) — purely a routing aid for a human reading
 * `docs/42`'s table, extracted from the heading's own leading `N.M` prefix where the heading has one.
 * Checked, not decorative: a `section` that no longer matches what the heading's prefix says is a
 * stale pointer, which is exactly the failure `docs/42`'s whole reason for existing is to prevent one
 * level up (a decision, not a directory listing, but the same "which doc §" promise).
 *
 * MUTATIONS VERIFIED (each fails by name, exit 1): retitle a heading the baseline cites · change a
 * baseline row's `doc` to a file that does not carry the heading · delete a heading that is in the
 * baseline · add a new `Decided (...)` heading with no baseline entry · point a baseline row at a
 * `section` number the live heading's prefix disagrees with · narrow the heading regex (fails as
 * SCOPE NOT REPRESENTED against `KNOWN_DECISION_DOCS`, so a dead detector cannot report a clean zero).
 * Negative control: appending a heading plus its baseline row via `--accept` passes.
 *
 * SCOPE — every tracked `docs/**\/*.md` file except `docs/00-progress.md` (genre exemption) and
 * `docs/42-current-decisions.md` (the index's own convention prose). Representation is asserted, not
 * counted: every doc the baseline currently cites must still be found carrying at least one `Decided`
 * heading by this run, so a regex that stops matching fails instead of reporting a clean zero
 * (`docs/34` shape 9's cheap tell).
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repo = join(import.meta.dirname, '../..');
const BASELINE = 'packages/engine/schema/decisions-index.json';
const EXEMPT = new Set(['docs/00-progress.md', 'docs/42-current-decisions.md']);

/**
 * A baseline row. `issue` (one) and `issues` (several) are BOTH accepted and normalized on read —
 * see `issuesOf`. One decision owning two issues is real (#1148 + #1150 is the instance), and the
 * single-issue spelling is the overwhelmingly common case, so forcing every row to an array would
 * churn fifteen unrelated rows to express nothing. A row carrying BOTH is refused rather than
 * silently preferring one.
 */
type Decision = {
  date: string;
  issue?: number | null;
  issues?: number[];
  title: string;
  doc: string;
  section: string | null;
};

/** A `Decided (...)` heading, wherever it appears. `section` is the heading's own leading `N.M`
 *  prefix if it has one, else null — never invented. `issues` is in heading order, and `[]` for a
 *  heading with no owning issue. */
type Heading = { doc: string; date: string; issues: number[]; title: string; section: string | null; line: number };

/**
 * ── THE PARSE ADMITS SEVERAL ISSUES, AND THE OLD ONE SILENTLY ADMITTED THE HEADING TO NOTHING ────
 *
 * This used to end `(?:,\s*#(\d+))?\)` — at most ONE `#NNN`, with the closing paren required
 * immediately after it. A heading owning two issues did not fail the ISSUE group; it failed the
 * WHOLE pattern, because after `#1148` the regex wanted `)` and found ` + #1150)`. The optional group
 * then backtracked to matching nothing, the `)` still did not appear after the date, and the line was
 * not a `Decided` heading at all.
 *
 * **That is the defect, and its shape is worse than a rejected heading.** Arm B checks that every
 * `Decided (...)` heading in the corpus has a baseline row; a heading the pattern cannot see is not
 * an unmatched heading, it is not a heading — so arm B has nothing to complain about and the gate
 * reports clean. A decision recorded in the docs and absent from the index passes. `docs/34` shape 9:
 * the detector is anchored on a spelling its subject is free to move past.
 *
 * The corpus shows what that cost: nothing is rejected today because the convention BENT AROUND the
 * gate. `docs/20` §9.10 was written `Decided (2026-08-29, #1148): … and (#1150) …` — the second issue
 * pushed into the TITLE, where it is prose rather than a citation, unreachable by any query over the
 * index. A gate that cannot express a real case does not stop that case arising; it deforms how the
 * case gets written, somewhere the gate is not looking.
 *
 * Now: one or more refs separated by `+`, captured as a list and split.
 *
 * ONE SEPARATOR, NOT TWO. The first version also accepted `,` — tolerant input, and wrong for the same
 * reason a row may not carry both `issue` and `issues`: `citeIssues` only ever RENDERS ` + `, so a
 * heading written with commas would round-trip through `--accept` into a citation spelled differently
 * from the heading it came from, and two spellings of one fact drift apart. Accept exactly what is
 * emitted.
 */
const HEADING_RE = /^(#{2,4})\s+(?:([\d.]+)\s+)?Decided\s*\((\d{4}-\d{2}-\d{2})(?:,\s*(#\d+(?:\s*\+\s*#\d+)*))?\)\s*:\s*(.+?)\s*$/;

/** Every `#NNN` in a captured ref list, in heading order. */
const refsIn = (group: string | undefined): number[] =>
  group ? [...group.matchAll(/#(\d+)/g)].map((m) => Number(m[1])) : [];

/**
 * A baseline row's issues, normalized — and the ONE place the two spellings are reconciled, so no
 * other reader has to know there are two. A row carrying both is a defect rather than a preference:
 * whichever this function chose, the other would be a live value nothing reads, which is how the two
 * drift apart.
 */
const issuesOf = (d: Decision): number[] => {
  if (d.issues !== undefined) return [...d.issues];
  return d.issue === null || d.issue === undefined ? [] : [d.issue];
};

/** A row carrying BOTH spellings — checked ONCE, up front, rather than inside `issuesOf`.
 *
 *  The first version of this raised the error from inside `issuesOf`, which is called from `same()`
 *  deep in the comparison. Two things were wrong with that and a mutation found both: `die` is not in
 *  scope there, so the guard CRASHED with a `ReferenceError` instead of reporting — and a crash is not
 *  a failure, it aborts before the rest of the run and reports fewer problems the more broken the
 *  input is (`docs/34`, #680). Validating the baseline before any comparison also puts the message
 *  where a reader expects it: a malformed index is a fact about the file, not about one row's match. */
const bothSpellings = (d: Decision): boolean =>
  d.issues !== undefined && d.issue !== undefined && d.issue !== null;

const sameIssues = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((n, i) => n === b[i]);

function headingsIn(doc: string, src: string): Heading[] {
  const out: Heading[] = [];
  src.split('\n').forEach((line, i) => {
    const m = HEADING_RE.exec(line);
    if (m) {
      out.push({
        doc,
        section: m[2] ?? null,
        date: m[3],
        issues: refsIn(m[4]),
        title: m[5],
        line: i + 1,
      });
    }
  });
  return out;
}

const same = (h: Heading, d: Decision): boolean =>
  h.doc === d.doc && h.date === d.date && sameIssues(h.issues, issuesOf(d)) && h.title === d.title;

/** `#a + #b` is the heading spelling, so the citation reads back as what a reader would search for. */
const citeIssues = (ns: number[]): string => (ns.length ? `, ${ns.map((n) => `#${n}`).join(' + ')}` : '');

/** A `Heading` is the one with a source line; everything else here is a baseline `Decision`. */
const isHeading = (d: Decision | Heading): d is Heading => 'line' in d;

const cite = (d: Decision | Heading): string =>
  `${d.doc} — Decided (${d.date}${citeIssues(isHeading(d) ? d.issues : issuesOf(d))}): ${d.title}`;

/**
 * THE WRITE PATH ROUND-TRIPS ITS OWN READ, asserted before either runs (#1160 review).
 *
 * `--accept` builds baseline rows from `Heading`s and the reader turns them back into issue lists. The
 * two were written at different times and the rename to `issues` reached only the reader: the writer
 * still emitted `issue: h.issue`, which `Heading` no longer has, so it wrote `undefined` — and
 * `JSON.stringify` DROPS an undefined value, appending rows with no ref at all. Single-ref decisions
 * lost their ref too, which is the tell that this was a WRITE-path bug and not a multi-ref one, and
 * the next run failed them as ROW NOT FOUND + UNINDEXED. The gate's own remedy text says "run
 * --accept", so the failure walked the user straight back into it.
 *
 * **No gate saw it: engine sources outside `components/` are not typechecked.** A reviewer's
 * `tsc --strict` found it. This asserts the property at runtime instead of relying on that — the two
 * functions must agree for both shapes, and the round trip is the only thing that can say so.
 */
const rowFor = (h: Heading): Decision => ({
  date: h.date,
  ...(h.issues.length > 1 ? { issues: h.issues } : { issue: h.issues[0] ?? null }),
  title: h.title,
  doc: h.doc,
  section: h.section,
});

for (const probe of [[], [1140], [1148, 1150]] as number[][]) {
  const h: Heading = { doc: 'x', date: '2026-01-01', issues: probe, title: 't', section: null, line: 1 };
  const round = issuesOf(JSON.parse(JSON.stringify(rowFor(h))) as Decision);
  if (!sameIssues(round, probe)) {
    // `console.error` + `process.exit`, this file's own idiom — there is no `die` here. Worth the
    // sentence: the FIRST draft of this guard called one, which is the same slip a mutation caught in
    // the both-spellings check on this very PR. A guard that throws instead of reporting is not a
    // guard (`docs/34`, #680).
    console.error(`\n✗ the --accept writer and the baseline reader disagree for ${probe.length} ref(s).`);
    console.error(`    wrote ${JSON.stringify(rowFor(h))} · read back ${JSON.stringify(round)} · expected ${JSON.stringify(probe)}`);
    console.error(
      '\n  A row this gate writes must be a row it can read. The JSON round trip is deliberate: an\n' +
        '  `undefined` field survives in memory and vanishes through `JSON.stringify`, which is exactly\n' +
        '  how the write path lost every ref while looking correct in the object it built.',
    );
    process.exit(1);
  }
}

const accept = process.argv.includes('--accept');
const baseline = JSON.parse(readFileSync(join(repo, BASELINE), 'utf8')) as {
  document: string;
  decisions: Decision[];
};


const tracked = execSync('git ls-files docs', { cwd: repo, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((f) => f.endsWith('.md') && !EXEMPT.has(f));

const allHeadings: Heading[] = [];
for (const f of tracked) {
  let src: string;
  try {
    src = readFileSync(join(repo, f), 'utf8');
  } catch {
    continue;
  }
  allHeadings.push(...headingsIn(f, src));
}

const failures: string[] = [];

// A baseline row carrying BOTH `issue` and `issues` — a fact about the FILE, checked before any row is
// compared, and reported through this gate's own `failures` path rather than a bespoke exit.
//
// The first version raised this from inside `issuesOf`, which `same()` calls deep in the comparison,
// and a mutation found two things wrong with it at once: there is no `die` in this file, so the guard
// threw a `ReferenceError` — and a crash is not a failure. It aborts the run, so the more malformed the
// index is the FEWER problems get reported (`docs/34`, #680). Placed here, a malformed row reads as
// what it is: a defect in the index, not a mismatch on whichever decision happened to reach it first.
for (const d of baseline.decisions.filter(bothSpellings))
  failures.push(
    `BASELINE ROW CARRIES BOTH \`issue\` AND \`issues\`: ${d.doc} — ${d.title}. One of the two would be a ` +
      'value nothing reads, which is how two spellings of one fact drift apart. Use `issues` for a ' +
      'decision owning several and `issue` for one; never both on a row.',
  );
const lines: string[] = [];

// ---- the baseline's own integrity, before it is used as an oracle ---------------------------
{
  const seen = new Set<string>();
  for (const d of baseline.decisions) {
    const key = `${d.doc}|${d.date}|${d.issue ?? ''}|${d.title}`;
    if (seen.has(key)) {
      failures.push(`BASELINE names the same decision twice: ${cite(d)}. An oracle that disagrees with itself cannot decide anything. Fix ${BASELINE} by hand.`);
    }
    seen.add(key);
  }
}

// ---- ARM A: every baseline row resolves to a real heading in its named doc -------------------
for (const d of baseline.decisions) {
  const docHeadings = allHeadings.filter((h) => h.doc === d.doc);
  const match = docHeadings.find((h) => same(h, d));
  if (!match) {
    failures.push(
      `ROW NOT FOUND: ${cite(d)} — no heading in ${d.doc} matches. Either the section moved/was ` +
        `retitled (update ${BASELINE} by hand — this is a superseding edit, not an append) or the ` +
        `decision was removed (delete the row and say why in the PR).`,
    );
    continue;
  }
  if (d.section !== match.section) {
    failures.push(
      `SECTION POINTER STALE: ${cite(d)} — ${BASELINE} says §${d.section ?? '(none)'}, the heading's ` +
        `own prefix at ${d.doc}:${match.line} says §${match.section ?? '(none)'}. docs/42's whole ` +
        `reason for existing is that "which doc §" stays true; fix the row's \`section\` field.`,
    );
  }
}

// ---- ARM B: every 'Decided (...)' heading in the corpus has a matching baseline row -----------
const KNOWN_DECISION_DOCS = [...new Set(baseline.decisions.map((d) => d.doc))];
const docsWithHeadings = new Set(allHeadings.map((h) => h.doc));

for (const h of allHeadings) {
  if (!baseline.decisions.some((d) => same(h, d))) {
    failures.push(
      `UNINDEXED DECISION: ${cite(h)} (${h.doc}:${h.line}) has no row in ${BASELINE}. Add one and ` +
        `a table row in docs/42-current-decisions.md in the same PR that adds the heading — or run ` +
        `\`--accept\` to append the row now.`,
    );
  }
}

for (const doc of KNOWN_DECISION_DOCS) {
  if (!docsWithHeadings.has(doc)) {
    failures.push(
      `SCOPE NOT REPRESENTED: ${doc} is cited in ${BASELINE} and this run found no \`Decided (...)\` ` +
        `heading in it at all. Either every decision there was legitimately removed (drop those rows ` +
        `in this PR) or the heading regex stopped matching — in which case a clean run means nothing.`,
    );
  }
}

lines.push(`  baseline: ${baseline.decisions.length} decision(s) across ${KNOWN_DECISION_DOCS.length} doc(s)`);
lines.push(`  corpus:   ${allHeadings.length} 'Decided (...)' heading(s) found across ${tracked.length} scanned file(s)`);

if (accept) {
  const knownKeys = new Set(baseline.decisions.map((d) => `${d.doc}|${d.date}|${issuesOf(d).join('+')}|${d.title}`));
  const added = allHeadings.filter((h) => !knownKeys.has(`${h.doc}|${h.date}|${h.issues.join('+')}|${h.title}`));
  const conflicts = failures.filter((f) => f.startsWith('ROW NOT FOUND') || f.startsWith('SECTION POINTER STALE'));
  if (conflicts.length) {
    console.error('✗ --accept refuses: an EXISTING row disagrees with the docs, which is not an append.\n');
    for (const c of conflicts) console.error(`  · ${c}`);
    console.error(
      '\n  `--accept` appends only, so a superseding rewrite cannot be waved through by running the gate.\n' +
        `  Fix the disagreeing row(s) in ${BASELINE} by hand, then rerun.`,
    );
    process.exit(1);
  }
  if (!added.length) {
    console.log('Nothing to append — the baseline already covers every Decided heading in the corpus.');
    process.exit(0);
  }
  baseline.decisions = [
    ...baseline.decisions,
    // Writes back in the SAME two spellings the reader accepts (#1160 review): `issues` for a decision
    // owning several, `issue` for one or none. Emitting `h.issue` here — which `Heading` has not had
    // since the multi-ref parse landed — is `undefined`, and `JSON.stringify` DROPS an undefined value,
    // so `--accept` appended rows with no ref at all and the next run failed them as ROW NOT FOUND +
    // UNINDEXED. Single-ref decisions were hit too, which is the tell that this was a write-path bug
    // rather than a multi-ref one.
    ...added.map(rowFor),
  ];
  writeFileSync(join(repo, BASELINE), `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`✓ appended ${added.length} decision(s):`);
  for (const h of added) console.log(`  · ${cite(h)}`);
  console.log('\n  Add a table row to docs/42-current-decisions.md in the same PR — this only updates the baseline.');
  process.exit(0);
}

console.log('Current-decisions index gate (#886)');
for (const l of lines) console.log(l);

if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s):\n`);
  for (const f of failures) console.error(`  · ${f}\n`);
  process.exit(1);
}

console.log(
  '  ✓ clean — every indexed decision resolves to a real heading, and every Decided heading in the\n' +
    "    docs corpus is indexed. Note the limit: this proves a cited section exists and is pointed at\n" +
    '    correctly, not that the index\'s prose SUMMARY of the decision is still accurate — that\n' +
    '    judgment is prose, and review is its only guard.',
);
