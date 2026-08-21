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

type Decision = { date: string; issue: number | null; title: string; doc: string; section: string | null };

/** A `Decided (...)` heading, wherever it appears. `section` is the heading's own leading `N.M`
 *  prefix if it has one, else null — never invented. */
type Heading = { doc: string; date: string; issue: number | null; title: string; section: string | null; line: number };

const HEADING_RE = /^(#{2,4})\s+(?:([\d.]+)\s+)?Decided\s*\((\d{4}-\d{2}-\d{2})(?:,\s*#(\d+))?\)\s*:\s*(.+?)\s*$/;

function headingsIn(doc: string, src: string): Heading[] {
  const out: Heading[] = [];
  src.split('\n').forEach((line, i) => {
    const m = HEADING_RE.exec(line);
    if (m) {
      out.push({
        doc,
        section: m[2] ?? null,
        date: m[3],
        issue: m[4] ? Number(m[4]) : null,
        title: m[5],
        line: i + 1,
      });
    }
  });
  return out;
}

const same = (h: Heading, d: Decision): boolean =>
  h.doc === d.doc && h.date === d.date && h.issue === d.issue && h.title === d.title;

const cite = (d: Decision | Heading): string =>
  `${d.doc} — Decided (${d.date}${d.issue ? `, #${d.issue}` : ''}): ${d.title}`;

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
  const knownKeys = new Set(baseline.decisions.map((d) => `${d.doc}|${d.date}|${d.issue ?? ''}|${d.title}`));
  const added = allHeadings.filter((h) => !knownKeys.has(`${h.doc}|${h.date}|${h.issue ?? ''}|${h.title}`));
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
    ...added.map((h) => ({ date: h.date, issue: h.issue, title: h.title, doc: h.doc, section: h.section })),
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
