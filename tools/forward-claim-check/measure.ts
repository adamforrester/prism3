/**
 * MEASUREMENT — forward-looking claims about ISSUE STATE in this repo's prose, checked against the
 * state those issues are actually in.
 *
 *   npx tsx tools/forward-claim-check/measure.ts             # the report
 *   npx tsx tools/forward-claim-check/measure.ts --json      # + machine-readable
 *   npx tsx tools/forward-claim-check/measure.ts --issues    # just the issue numbers needing states
 *
 * WHAT THIS ANSWERS. This repo's prose is dense with issue citations — 6,151 of them across 168 files
 * at the commit this was written on — and a subset of those citations are not references but *claims
 * about mutable state*: `blocked on #N`, `#N is still open`, `parked pending #N`. A citation ages
 * gracefully; a claim about state does not. When the issue closes, the sentence becomes false and
 * nothing anywhere says so. This finds those sentences and reports claim-vs-reality.
 *
 * (Those three are written schematically, with `#N` rather than the real numbers they were drawn from,
 * and that is not fussiness. The first draft of this header — and of `CLAUDE.md`'s `tools/` row —
 * quoted them verbatim, and the tool reported **its own documentation** as a stale claim. A quotation
 * in a non-journal document is indistinguishable from an assertion; the `REPORTED` filter only catches
 * quotation that announces itself with a reporting verb, and a documentation example announces nothing.
 * Documenting a detector without tripping it turns out to be a real constraint, and it is met here by
 * not writing a matchable citation at all rather than by exempting this directory — a detector that
 * excuses itself is the one thing worse than one that catches itself.)
 *
 * ── WHAT THIS IS NOT ────────────────────────────────────────────────────────────────────────────
 *
 * NOT A GATE. Do not wire it into `ci.yml`, `verify.ts`, or `lint-doc-gates`'s region. It is a tool in
 * `tools/`, under that directory's rule from CLAUDE.md — *a tool answers a question; a gate asserts an
 * answer* — and `tools/nest-exposed-cost/` is the precedent: a measurement with no gate sibling,
 * deliberately.
 *
 * THE FIRST REASON, STATED HERE SO NOBODY PROMOTES IT LATER, is not squeamishness about false
 * positives. Precision is fine (measured below, and it is 17/17 on this tree). The disqualifying
 * property is **RECALL, and specifically that the DENOMINATOR IS UNKNOWN.** The pattern set below
 * catches 17 lines out of 6,151 citations. Nobody knows how many forward claims those 6,151
 * citations contain, because the only way to find out is to read them all, and that has not been done.
 *
 * That is not a hypothetical worry. **A confirmed false negative was found by accident**:
 * `packages/engine/theme.ts` wrote `issue #101 — still open` with an em-dash, and the `still-open`
 * pattern missed it because the pattern wants `stays|remains|is still` and the em-dash construction
 * supplies bare `still`. #101 was CLOSED. That was a stale claim, in engine source, that this tool
 * did not see — found because a human happened to grep for `#101`, not because anything reported it.
 * It is no longer live: a concurrently-developed PR fixed that exact sentence before this one reached
 * `main`, so `KNOWN_FALSE_NEGATIVES` below is empty on this tree. That is not the recall argument
 * getting weaker — the argument never depended on a specimen staying put. A live example happened to
 * exist when this was written and happened to be gone by the time it merged, which is itself a small
 * demonstration of the same point: nothing here is watching for these except a human who trips over
 * one. The register stays wired up so the *next* accidental find has somewhere to go.
 *
 * So a gate built on this would **report clean over everything it cannot see**. That is `docs/34`
 * shape 9 exactly — the detector matches nothing and nothing compares its count to anything — and it
 * is the failure this repo keeps re-learning (`vercel-ignore-check.mjs` found zero files and called it
 * a pass; `lint-skills` and `lint-us-english` both went blind inside two hours of one rename). A green
 * "no stale forward claims" would be a **true statement about the subset the regex happens to match**,
 * dressed as a statement about the repo. Until recall is measured — separately, by reading a sample of
 * the 6,151 and counting what the pattern missed — this reports and does not assert.
 *
 * THE SECOND REASON IS INDEPENDENT OF THE FIRST, and it is the stronger one, which matters because a
 * future reader holding a good recall number will otherwise think the case for gating is complete. It
 * is not, because **THE ERROR COSTS ARE ASYMMETRIC.** A missed stale claim is the status quo — the
 * sentence stays wrong exactly as it was before this file existed, and nothing is worse than before.
 * A **FALSE `STALE` AT FULL CONFIDENCE IS WORSE THAN HAVING NO TOOL AT ALL**, because someone acts on
 * it and "fixes" a sentence that was already right. That shape is not hypothetical: the guest
 * exclusion below exists for `apps/tokenpress/docs/CHANGELOG.md`, whose citation RESOLVES — against
 * the wrong tracker — so a naive resolver reports it stale with no uncertainty attached anywhere in
 * the output. **This is an argument against the issue-state check ever gating, and unlike the recall
 * argument it does not go away when recall improves.** Measuring the denominator would answer the
 * first objection and leave this one untouched.
 *
 * THE ONE THING IT DOES ASSERT is about ITSELF, not about the repo, and the distinction is the whole
 * point of the split. It exits non-zero when the INSTRUMENT is broken: the citation scan came back
 * empty, the corpus came back materially smaller than the recorded baseline, a pattern stopped firing
 * on its own known-bad sample, or a declared register went stale. That is the floor `docs/34` shape 9
 * demands of anything that prints a count — *if a tool can say "I examined N things", something should
 * care what N is* — and it is not a gate on the prose. Nothing here fails because a claim is stale.
 *
 * ── THE EXCLUSIONS, AND THEIR FRAMING IS ITSELF THE FINDING ─────────────────────────────────────
 *
 * Read this before "improving" any of them into a tuned filter, because the obvious repair is the
 * wrong one:
 *
 * **These are properties of the DOCUMENT, not of the pattern.** The pattern's precision was never the
 * problem. The noise lives in three document kinds, and the first two are excluded by the same GENRE
 * mechanism:
 *
 *  1. **Append-only dated journals.** `docs/00-progress.md` alone held **23 of 41** raw hits — 56%.
 *     A forward claim inside a dated entry is scoped to that date and is *correct as history*: an
 *     entry that says "blocked on #252" under a 2026-08-04 heading is a true record of what was true
 *     on 2026-08-04, and rewriting it when #252 closes would be falsifying the log. Excluding the file
 *     by **genre** removes well over half the noise and removes none of the signal.
 *  2. **Vendored guest sub-projects.** `apps/tokenpress/` was ported in whole, with its history, and
 *     `CLAUDE.md` says to treat it as a guest; its changelog cites **its own** tracker. The general
 *     form, which is why this is a genre and not a special case: **a corpus spanning more than one
 *     issue namespace must resolve namespace before state.** A vendored sub-project is that case by
 *     construction — its `#N` belongs to its own tracker, and resolving it against ours produces a
 *     confident wrong answer rather than a miss. `apps/tokenpress/docs/CHANGELOG.md` is the live
 *     instance: its number resolves here to an unrelated closed PR about `.ai.json` consumption eval,
 *     so a resolver pointed at one repo reports STALE at full confidence. The exclusion is a property
 *     of the guest, exactly as the journal exclusion is a property of the log — see `GUESTS`, and the
 *     asymmetry argument above for why this class in particular disqualifies gating.
 *  3. **Reported rather than asserted claims.** `This arc read *"blocked on #252"* until…`,
 *     `authored while they were still open` — the text QUOTES a former claim in order to say it
 *     changed. The sentence is about the claim, not an instance of it. Two of these are on this tree
 *     and both are in `docs/38-arcs.md`'s re-cut notes.
 *
 * No exclusion here is a heuristic tuned to raise a score. **Narrowing the pattern instead would be
 * the wrong repair, and would hide the finding** — the finding being that forward claims are
 * *supposed* to appear in a journal, *supposed* to appear in a guest's own changelog, and *supposed*
 * to appear in quotation, so a detector for them has to know what kind of document it is reading. A
 * narrowed pattern would score better and know less.
 *
 * Both genre exclusions are DECLARED (`JOURNALS`, `GUESTS`) rather than inferred, and then each
 * declaration is verified two ways, because a declared scope that nothing checks is shape 9 waiting
 * to happen: every declared journal must still HAVE the journal shape (a supermajority of dated entry
 * headings), and any UNDECLARED file that has that shape is reported as a candidate; every declared
 * guest must still cover files AND still be called a guest by `CLAUDE.md`, and any directory
 * `CLAUDE.md` calls a guest that is not declared here is reported as a candidate. Neither list can
 * silently stop matching the tree in either direction.
 *
 * ── THE REGEX BUG THIS PR FIXED, because it is a shape worth carrying ───────────────────────────
 *
 * The reported-claim filter was written as `…\s+["'*]\b` — a trailing `\b` after a character class
 * whose last member is `*`. **It could never match the case it was written for.** In `read *"blocked`
 * the class consumes the `*`, and `\b` then demands a word boundary between `*` and `"` — both
 * non-word characters, so there is no boundary, and the match dies one character from succeeding. The
 * filter looked right, read right in review, and excluded nothing. Removing the trailing `\b` is the
 * whole fix, and `selfCheck()` measures it live rather than asserting it: **14/17 correctly classified
 * before, 17/17 after.** A `\b` is only an anchor when at least one side of it is a word character;
 * after a class of punctuation it is a guarantee of failure.
 *
 * ── WHY ISSUE STATES ARRIVE FROM A FILE ─────────────────────────────────────────────────────────
 *
 * `issue-states.json` is a committed snapshot resolved through the GitHub MCP tools by whoever runs
 * this. That is not a design preference — a `tsx` script has no MCP client, and this repo's other
 * network-touching tool (`exporter-comparison`) has the same shape for the same reason. The
 * consequence is stated rather than hidden: **the states are as fresh as the file**, so the report
 * prints `resolvedAt` at the top and every cited issue with no entry is listed as UNRESOLVED by name
 * rather than being quietly counted as fine. An unresolved citation is not evidence of a healthy
 * claim; it is evidence of an unfinished measurement, and the two must not look alike.
 *
 * ── FOUR THINGS THAT ARE NOT CHECKABLE, NAMED RATHER THAN DROPPED ───────────────────────────────
 *
 * All four were measured on this tree. They are in `NON_CHECKABLE` — which carries the exact site,
 * the issue number and the reason, so the numbers are one screen down rather than repeated here in a
 * form the scan would pick up. These are PER-INSTANCE by construction: each is one sentence whose
 * shape no rule generalizes, which is what separates them from the genre exclusions above — a fifth
 * entry (the guest changelog) started here and moved to `GUESTS` once it was recognized as a genre
 * rather than a case. They are reported in their own section and excluded from the stale count,
 * because reporting any of them as stale would be **confidently wrong**, which is worse than not
 * reporting it:
 *
 *  1. **A claim about one HALF of an issue** (`lint-absolute-inset.ts`, on the decision issue about
 *     rendered-vs-intended values). The issue is open. But an issue is open or closed — **half-open
 *     is not a state the API has.** The sentence can go false while the issue stays open and nothing
 *     in the API moves.
 *  2. **A claim about an UNFILED follow-up** (`docs/10-figma-materialization.md`). The cited number is
 *     closed, and is a *pull request* rather than an issue — GitHub shares one number space, so some
 *     citations here resolve to PRs. The claim's subject is a follow-up that PR's own text defers, and
 *     it has no number at all. Reporting it stale because the PR merged answers a question nobody asked.
 *  3–4. **TWO PAST-TENSE NARRATIONS OF A RESOLVED BLOCKER** (`docs/12-token-press-monorepo-eval.md`,
 *     `docs/38-arcs.md`), found by an independent reviewer rebasing this PR across a concurrent one
 *     that fixed exactly these two sentences from live claims into past-tense history: one now opens
 *     with "was blocked on … and that blocker is gone", the other narrates "then blocked by" inside an
 *     already-past-tense sentence. (Written here without the digits both originally cited — see the
 *     SAMPLE convention below; the register entries carry the real fingerprints.) `blocked-on` matches
 *     the bare stem with no tense check, so a sentence correctly narrating a closed blocker as history
 *     reads identically to one asserting a live one. Unlike `depends-on` (deliberately matched on the
 *     assertive inflection `depends`, not the stem `depend`, so a negated present-tense claim doesn't
 *     fire), `blocked-on` has no equivalent guard, and a general fix is real NLP, not a regex tweak —
 *     narrowing it further risks the same trap as narrowing the two document-level exclusions above.
 *     Named here rather than silently reworded away, for the same reason the other three are.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

// ── the corpus ──────────────────────────────────────────────────────────────────────────────────

/** Tracked prose + source, the file kinds that carry issue citations in this repo. */
const CORPUS_EXT = /\.(md|ts|mjs|yml)$/;

/** A citation is `#` plus 2–4 digits, word-bounded. The bound is load-bearing: without it every hex
 *  color literal (`#0066cc`) contributes a phantom citation, which inflated the first count of this
 *  corpus by 192 and its distinct-issue count by 90. */
const CITATION = /#(\d{2,4})\b/g;

/**
 * THE FLOOR (`docs/34` shape 9). A detector that finds nothing must not print a clean zero, so the
 * corpus size is compared against a recorded baseline instead of merely being printed.
 *
 * The baseline is honest about one thing that did NOT reproduce. A prior measuring pass recorded
 * "5,964 citations, 219 files, 542 distinct issues". Citations and distinct issues reproduce here to
 * within 3% (6,151 / 555 — the repo moved forward), but **the file count does not reproduce under any
 * corpus definition tried**: md/ts/mjs/yml gives 167 files, adding `.json` gives 179, and a wide
 * net over every text extension in the tree gives 186. None is 219. Rather than widen the corpus
 * until a number matched — which would be fitting the instrument to its own baseline — the definition
 * above is stated plainly and the file count is carried as INFORMATIONAL. The floor keys on the
 * citation count, which is the figure that reproduced.
 */
const BASELINE = { citations: 5_964, files: 219, distinctIssues: 542 };
/** "Materially smaller" — a 10% collapse in the citation corpus means the scan lost sight of files,
 *  not that the repo deleted 600 citations. Loose on purpose: a pin gets re-pinned without thought
 *  the first time a correct change moves it (`docs/34` shape 9's own lesson from the 15→16 move). */
const FLOOR_FRACTION = 0.9;

// ── the patterns ────────────────────────────────────────────────────────────────────────────────

/** Bounded same-sentence gaps. `[^.\n]` keeps a match inside one sentence, so "blocked on X. See #40"
 *  cannot pair a claim with an unrelated citation two sentences later. */
const GAP = '[^.\\n]{0,24}?';
const WIDE = '[^.\\n]{0,48}?';
const OPEN = '(?:stays|remains|is\\s+still)\\s+open';

/**
 * Present-tense assertions about a mutable state. Every stem is the ASSERTIVE inflection and that is
 * deliberate: `depends on #N` asserts a live dependency, while `does not depend on Playwright
 * (#N)` — a real line in `apps/studio/lint-contrast.mjs` — is a design stance that happens to cite its
 * tracking issue. Matching the bare stem `depend` swept that line in as a false positive; matching
 * `depends` does not. The grammar is doing precision work here, so widening a stem is not free.
 */
/** Sample issue number for the liveness self-check, interpolated rather than written literally: this
 *  file is inside the corpus it scans, and a literal `#`+digits in a sample would be indistinguishable
 *  from a live claim. Interpolating keeps the sample matchable by the PATTERN without putting a
 *  matchable CITATION in the file — the alternative, exempting this directory from the scan, is the
 *  one repair a detector must never make for itself. */
const SAMPLE = 4242;

const PATTERNS: { name: string; re: RegExp; sample: string }[] = [
  { name: 'blocked-on', re: new RegExp(`\\bblocked\\s+(?:on|by)\\s+${GAP}#(\\d{2,4})\\b`, 'gi'), sample: `this is blocked on #${SAMPLE} for now` },
  { name: 'waiting-on', re: new RegExp(`\\bwait(?:s|ing)\\s+on\\s+${GAP}#(\\d{2,4})\\b`, 'gi'), sample: `the path waits on #${SAMPLE}` },
  { name: 'pending', re: new RegExp(`\\bpending\\s+${GAP}#(\\d{2,4})\\b`, 'gi'), sample: `deferred, pending #${SAMPLE}` },
  { name: 'parked', re: new RegExp(`\\bparked\\s+(?:pending|until)\\s+${GAP}#(\\d{2,4})\\b`, 'gi'), sample: `parked pending validation (#${SAMPLE})` },
  { name: 'still-open', re: new RegExp(`#(\\d{2,4})\\b${WIDE}\\b${OPEN}\\b`, 'gi'), sample: `issue #${SAMPLE} is still open` },
  { name: 'open-under', re: new RegExp(`\\b${OPEN}\\b${WIDE}#(\\d{2,4})\\b`, 'gi'), sample: `that remains open under #${SAMPLE}` },
  { name: 'deferred', re: new RegExp(`\\bdeferred\\s+(?:to|behind|pending)\\s+${GAP}#(\\d{2,4})\\b`, 'gi'), sample: `deferred behind #${SAMPLE}` },
  { name: 'depends-on', re: new RegExp(`\\bdepends\\s+on\\s+${GAP}#(\\d{2,4})\\b`, 'gi'), sample: `this depends on #${SAMPLE}` },
  { name: 'unblocked-by', re: new RegExp(`\\bunblocked\\s+by\\s+${GAP}#(\\d{2,4})\\b`, 'gi'), sample: `the editor is unblocked by #${SAMPLE}` },
];

// ── exclusion 1: document GENRE ─────────────────────────────────────────────────────────────────

/** Declared append-only dated journals. A forward claim in a dated entry is scoped to its date. */
const JOURNALS = new Set(['docs/00-progress.md']);
/** The journal SHAPE, used both to verify each declaration and to surface undeclared candidates. */
const JOURNAL_MIN_DATED = 20;
const JOURNAL_MIN_RATIO = 0.5;
const HEADING = /^#{1,4} /;
const DATED = /20\d{2}-\d{2}-\d{2}/;

/**
 * Declared vendored GUESTS: sub-projects ported in whole, carrying their own issue tracker. A `#N`
 * inside one of these is a citation in a FOREIGN namespace, so resolving it here answers a different
 * repo's question — confidently, and wrongly. Same genre mechanism as `JOURNALS` above, for the same
 * kind of reason: a property of the document, never a narrowing of the pattern.
 */
const GUESTS: { prefix: string; why: string }[] = [
  {
    prefix: 'apps/tokenpress/',
    why: 'ported in whole with its history and its own tracker — its citations name that tracker, and the same numbers here name unrelated work',
  },
];
const isGuest = (f: string) => GUESTS.some((g) => f.startsWith(g.prefix));

/** Where a guest is DECLARED to be one, so the exclusion can be checked against the repo's own
 *  statement rather than against itself. */
const GUEST_DECLARED_IN = 'CLAUDE.md';
/** Directory prefixes that `GUEST_DECLARED_IN` calls a guest — a backticked path on a line using the
 *  DECLARATION IDIOM ("treat it as a guest"), kept only if it actually prefixes a scanned file. Both
 *  filters earn their place: the idiom is narrow on purpose, because a line that merely *mentions*
 *  guests would nominate every backticked directory sharing it, and the corpus filter is what drops
 *  the generic `src/` that sits on the real declaration's own line. Used in both directions — to
 *  verify each declaration here, and to surface a guest the repo declares that this file does not
 *  know about. */
const declaredGuests = (src: string, corpus: string[]): Set<string> =>
  new Set(
    src
      .split('\n')
      .filter((l) => /\bas a guest\b/i.test(l))
      .flatMap((l) => [...l.matchAll(/`([^`\s]+\/)`/g)].map((m) => m[1]))
      .filter((p) => corpus.some((f) => f.startsWith(p))),
  );

// ── exclusion 3: REPORTED rather than asserted ──────────────────────────────────────────────────

/**
 * A quoted or narrated former claim. The trailing `\b` that used to close the first pattern is the
 * bug documented in the header — see `selfCheck()`, which measures its cost rather than asserting it.
 */
const REPORTED: { name: string; re: RegExp }[] = [
  { name: 'quoted-former-claim', re: /\b(?:read|reads|said|says|stated|claimed|quoted|wrote)\s+[“”"'*]/i },
  { name: 'authored-while', re: /\bauthored\s+while\b/i },
];
/** The pre-fix form, kept ONLY so the self-check can measure the difference on real lines. */
const REPORTED_BUGGY = /\b(?:read|reads|said|says|stated|claimed|quoted|wrote)\s+[“”"'*]\b/i;

// ── the registers: sites that are real but not resolvable ───────────────────────────────────────

/**
 * Pinned by a text fingerprint rather than a line number, so an edit above them does not read as a
 * stale register. Each is verified to still match; a register that no longer matches is a broken
 * instrument and fails loudly.
 *
 * The fingerprints deliberately carry NO `#`+digits, for the same reason the samples above don't:
 * this file sits inside the corpus it scans, and a stored copy of a claim would be indistinguishable
 * from the claim. The consequence is that a fingerprint reads oddly on its own, so the report resolves
 * each register to the LINE IT MATCHES IN THE TREE (`locate()`) and prints that instead — which is
 * better than printing a stored copy anyway: it shows what the file says today, not what it said when
 * the register was written.
 *
 * Everything here is PER-INSTANCE: one sentence whose shape no rule generalizes. A reason that
 * generalizes to a KIND of document belongs in a genre exclusion above (`JOURNALS`, `GUESTS`), where
 * it covers the next file of that kind too — the guest changelog was hand-listed here first and moved
 * once that was recognized.
 */
type Register = { file: string; fingerprint: string; issue: number; why: string };

const NON_CHECKABLE: Register[] = [
  {
    file: 'packages/engine/lint-absolute-inset.ts',
    fingerprint: "'s Figma half stays open",  // no '#'+digits: this file is in the corpus it scans
    issue: 802,
    why: 'half-open is not a state the API has — #802 can stay open while this sentence goes false, and nothing in the API moves',
  },
  {
    file: 'docs/10-figma-materialization.md',
    fingerprint: 'full-materialise** follow-up from',
    issue: 50,
    why: 'the claim is about an UNFILED follow-up, not about #50 (closed, and a PR rather than an issue) — reporting it stale would answer a question nobody asked',
  },
  {
    file: 'docs/12-token-press-monorepo-eval.md',
    fingerprint: 'and that blocker is gone',
    issue: 609,
    why: "the sentence is past tense and says outright that the blocker is resolved — 'blocked-on' has no tense awareness and cannot tell 'is blocked' from 'was blocked, and that blocker is gone'. Reporting it STALE would be confidently wrong about a sentence that already says the correct thing.",
  },
  {
    file: 'docs/38-arcs.md',
    fingerprint: 'then blocked by',
    issue: 767,
    why: "'then blocked by' narrates a historical sequencing inside an already-past-tense sentence ('the owner called...') — 'blocked-on' matches the bare stem regardless of tense. Reporting it STALE would be confidently wrong about a since-resolved blocker being narrated as history.",
  },
];

/**
 * Empty on this tree. The one confirmed instance (`packages/engine/theme.ts`'s em-dash `issue #101 —
 * still open`) was fixed by a concurrently-developed PR before this one reached `main` — see the file
 * header. An empty register is not evidence recall is fine; it means the last accidental find has
 * been resolved and no new one has been tripped over yet. Add the next one here when it turns up.
 */
const KNOWN_FALSE_NEGATIVES: Register[] = [];

// ── scan ────────────────────────────────────────────────────────────────────────────────────────

type Hit = { file: string; line: number; issue: number; patterns: string[]; text: string };

const git = (cmd: string) => execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const read = (f: string) => { try { return readFileSync(resolve(ROOT, f), 'utf8'); } catch { return null; } };

const files = git('git ls-files').split('\n').filter((f) => f && CORPUS_EXT.test(f));

let citations = 0;
const citedIn = new Set<string>();
const distinct = new Set<number>();
const rawHits: Hit[] = [];

for (const f of files) {
  const text = read(f);
  if (text === null) continue;

  CITATION.lastIndex = 0;
  let c: RegExpExecArray | null;
  while ((c = CITATION.exec(text))) { citations++; citedIn.add(f); distinct.add(+c[1]); }

  text.split('\n').forEach((line, i) => {
    for (const p of PATTERNS) {
      p.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = p.re.exec(line))) rawHits.push({ file: f, line: i + 1, issue: +m[1], patterns: [p.name], text: line.trim() });
    }
  });
}

/** One line citing one issue is ONE claim site, however many patterns fire on it. */
const dedupe = (hits: Hit[]): Hit[] => {
  const by = new Map<string, Hit>();
  for (const h of hits) {
    const k = `${h.file}:${h.line}:${h.issue}`;
    const seen = by.get(k);
    if (seen) { if (!seen.patterns.includes(h.patterns[0])) seen.patterns.push(h.patterns[0]); }
    else by.set(k, { ...h, patterns: [...h.patterns] });
  }
  return [...by.values()];
};

const isReported = (text: string) => REPORTED.some((r) => r.re.test(text));

const journalHits = rawHits.filter((h) => JOURNALS.has(h.file));
const guestHits = rawHits.filter((h) => !JOURNALS.has(h.file) && isGuest(h.file));
const afterGenre = rawHits.filter((h) => !JOURNALS.has(h.file) && !isGuest(h.file));
const candidates = dedupe(afterGenre);
const reportedOut = candidates.filter((h) => isReported(h.text));
const reportable = candidates.filter((h) => !isReported(h.text));

// ── issue states ────────────────────────────────────────────────────────────────────────────────

type States = { resolvedAt: string; repo: string; method: string; states: Record<string, { state: string; kind?: string; title?: string }> };
const STATES_PATH = resolve(HERE, 'issue-states.json');
const stateFile: States | null = existsSync(STATES_PATH) ? JSON.parse(readFileSync(STATES_PATH, 'utf8')) : null;
const stateOf = (n: number) => stateFile?.states[String(n)] ?? null;

/** The register's current line in the tree — what it actually pins, read fresh rather than stored. */
const locate = (r: Register): { line: number; text: string } | null => {
  const t = read(r.file);
  if (t === null) return null;
  const lines = t.split('\n');
  const i = lines.findIndex((l) => l.includes(r.fingerprint));
  return i < 0 ? null : { line: i + 1, text: lines[i].trim() };
};

const registerFor = (h: Hit, reg: Register[]) =>
  reg.find((r) => r.file === h.file && r.issue === h.issue && h.text.includes(r.fingerprint));

type Verdict = 'STALE' | 'HOLDS' | 'NON-CHECKABLE' | 'UNRESOLVED';
const verdictOf = (h: Hit): { verdict: Verdict; detail: string } => {
  const nc = registerFor(h, NON_CHECKABLE);
  if (nc) return { verdict: 'NON-CHECKABLE', detail: nc.why };
  const st = stateOf(h.issue);
  if (!st) return { verdict: 'UNRESOLVED', detail: `no state recorded for #${h.issue} — resolve it via the GitHub MCP tools and add it to issue-states.json` };
  if (st.state === 'open') return { verdict: 'HOLDS', detail: `#${h.issue} is open — the claim is still true` };
  return { verdict: 'STALE', detail: `#${h.issue} is ${st.state}${st.kind ? ` (${st.kind})` : ''} — the sentence asserts a live dependency that has been resolved` };
};

const judged = reportable.map((h) => ({ ...h, ...verdictOf(h) }));

// ── self-checks: the instrument, not the repo ───────────────────────────────────────────────────

const problems: string[] = [];
const notes: string[] = [];

function selfCheck() {
  // 1. DETECTOR LIVENESS. Every pattern must still fire on a sample it was written for. This is what
  //    `docs/34` shape 9 asks of a detector: feed it a known-bad input and fail if it comes back
  //    clean. Emptying a pattern, or a rename that breaks one, is otherwise indistinguishable from a
  //    tree with no forward claims in it.
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    if (!p.re.test(p.sample)) problems.push(`pattern '${p.name}' no longer fires on its own sample: ${JSON.stringify(p.sample)}`);
  }

  // 2. THE REPORTED-FILTER FIX, measured on the real candidate lines rather than asserted. Precision
  //    here is classification accuracy over the candidate set: of N lines, how many does the filter
  //    put on the right side?
  const truthReported = new Set(reportedOut.map((h) => `${h.file}:${h.line}:${h.issue}`));
  const buggyCorrect = candidates.filter((h) => {
    const k = `${h.file}:${h.line}:${h.issue}`;
    return REPORTED_BUGGY.test(h.text) === truthReported.has(k);
  }).length;
  notes.push(
    `reported-filter precision: ${buggyCorrect}/${candidates.length} with the trailing \\b (the bug), ` +
    `${candidates.length}/${candidates.length} without it — the \\b sat after a character class ending in '*', ` +
    `so it demanded a boundary between two non-word characters and could never match.`,
  );
  if (buggyCorrect === candidates.length && truthReported.size > 0)
    problems.push('the buggy and fixed reported-filters now agree on every candidate line — the fix is no longer demonstrable, so this measurement has stopped measuring anything');

  // 3. THE JOURNAL DECLARATION, both directions. A declared journal that no longer has the shape, and
  //    an undeclared file that does, are both ways for the exclusion to stop matching the tree.
  const shape = (f: string) => {
    const t = read(f);
    if (t === null) return null;
    const hs = t.split('\n').filter((l) => HEADING.test(l));
    const dated = hs.filter((l) => DATED.test(l));
    return { headings: hs.length, dated: dated.length, ratio: hs.length ? dated.length / hs.length : 0 };
  };
  for (const j of JOURNALS) {
    const s = shape(j);
    if (!s) { problems.push(`declared journal '${j}' does not exist — the genre exclusion is addressed to a file that moved`); continue; }
    if (s.dated < JOURNAL_MIN_DATED || s.ratio < JOURNAL_MIN_RATIO)
      problems.push(`declared journal '${j}' no longer has the journal shape (${s.dated} dated of ${s.headings} headings, ${(s.ratio * 100) | 0}%) — either it changed genre or the exclusion is now unjustified`);
    else notes.push(`journal '${j}' verified: ${s.dated} dated headings of ${s.headings} (${(s.ratio * 100) | 0}%)`);
  }
  for (const f of files) {
    if (JOURNALS.has(f) || !f.endsWith('.md')) continue;
    const s = shape(f);
    if (s && s.dated >= JOURNAL_MIN_DATED && s.ratio >= JOURNAL_MIN_RATIO)
      notes.push(`UNDECLARED journal candidate: '${f}' (${s.dated} dated of ${s.headings} headings) — decide whether the genre exclusion should cover it`);
  }

  // 3b. THE GUEST DECLARATION, both directions, for the same reason. A guest is excluded because the
  //     repo calls it one, so the check reads the repo's statement rather than this file's: a prefix
  //     that covers nothing has been moved out from under the exclusion, and a prefix the repo no
  //     longer calls a guest is an exclusion that has outlived its justification.
  const declSrc = read(GUEST_DECLARED_IN);
  if (declSrc === null && GUESTS.length) problems.push(`'${GUEST_DECLARED_IN}' is unreadable, so no declared guest can be verified against the repo's own statement`);
  const declared = declSrc === null ? new Set<string>() : declaredGuests(declSrc, files);
  for (const g of GUESTS) {
    const covers = files.filter((f) => f.startsWith(g.prefix)).length;
    if (!covers) problems.push(`declared guest '${g.prefix}' covers no scanned file — the genre exclusion is addressed to a directory that moved`);
    else if (declSrc !== null && !declared.has(g.prefix)) problems.push(`'${g.prefix}' is excluded as a guest but ${GUEST_DECLARED_IN} no longer calls it one — the exclusion has outlived its stated justification`);
    else notes.push(`guest '${g.prefix}' verified: ${covers} scanned file(s), declared a guest in ${GUEST_DECLARED_IN}`);
  }
  for (const p of declared)
    if (!GUESTS.some((g) => g.prefix === p))
      notes.push(`UNDECLARED guest candidate: '${p}' — ${GUEST_DECLARED_IN} calls it a guest; decide whether its citations are a foreign namespace too`);

  // 4. THE REGISTERS. Both are pinned by fingerprint; a fingerprint that no longer appears means the
  //    prose moved and the register is now a comment asserting something the tree does not say.
  for (const [label, reg] of [['non-checkable', NON_CHECKABLE], ['known-false-negative', KNOWN_FALSE_NEGATIVES]] as const) {
    for (const r of reg) {
      const t = read(r.file);
      if (t === null) problems.push(`${label} register: '${r.file}' does not exist`);
      else if (!t.includes(r.fingerprint)) problems.push(`${label} register is stale: ${JSON.stringify(r.fingerprint)} no longer appears in ${r.file}`);
    }
  }

  // 5. THE FLOOR. The corpus is compared, not merely printed.
  if (citations === 0) problems.push('the citation scan found ZERO citations — the corpus definition or the scan is broken, and a clean zero here would be a true statement about an empty set');
  else if (citations < BASELINE.citations * FLOOR_FRACTION)
    problems.push(`the citation corpus collapsed: ${citations} against a ${BASELINE.citations} baseline (floor ${Math.round(BASELINE.citations * FLOOR_FRACTION)}) — the scan has probably lost sight of files rather than the repo having lost citations`);
  if (files.length === 0) problems.push('the corpus is empty — `git ls-files` matched no file of the scanned kinds');
}

selfCheck();

// ── report ──────────────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes('--issues')) {
  console.log([...new Set(reportable.map((h) => h.issue))].sort((a, b) => a - b).join('\n'));
  process.exit(0);
}

const out: string[] = [];
const say = (s = '') => out.push(s);
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');

say('FORWARD-CLAIM MEASUREMENT — present-tense claims about issue state, checked against actual state');
say('='.repeat(100));
say();
say('A MEASUREMENT, NOT A GATE. It is not in ci.yml and must not be added: the pattern catches a small,');
say('unknown fraction of the citations in this repo, and a confirmed false negative is registered below.');
say('A gate on this would report clean over everything it cannot see (docs/34 shape 9). It exits');
say('non-zero only when the INSTRUMENT is broken — never because a claim is stale.');
say();

say('-'.repeat(100));
say('CORPUS');
say('-'.repeat(100));
say(`  files scanned (tracked .md/.ts/.mjs/.yml)   ${files.length}`);
say(`  issue citations (#NN–#NNNN, word-bounded)   ${citations.toLocaleString('en-US')}   baseline ${BASELINE.citations.toLocaleString('en-US')}, floor ${Math.round(BASELINE.citations * FLOOR_FRACTION).toLocaleString('en-US')}`);
say(`  files carrying at least one citation        ${citedIn.size}   (baseline recorded ${BASELINE.files}; see the header — this figure did not reproduce and is informational)`);
say(`  distinct issues cited                       ${distinct.size}   baseline ${BASELINE.distinctIssues}`);
say();

say('-'.repeat(100));
say('FUNNEL');
say('-'.repeat(100));
say(`  raw pattern hits                            ${rawHits.length}   (${pct(rawHits.length, citations)} of citations)`);
say(`  - excluded by GENRE: append-only journals   ${journalHits.length}   ${pct(journalHits.length, rawHits.length)} of raw, all in ${[...JOURNALS].join(', ')}`);
say(`  - excluded by GENRE: vendored guests        ${guestHits.length}   ${pct(guestHits.length, rawHits.length)} of raw, in ${GUESTS.map((g) => g.prefix).join(', ')} — a FOREIGN issue namespace`);
say(`  = after genre exclusion                     ${afterGenre.length}`);
say(`  deduped to claim sites (file:line:issue)    ${candidates.length}`);
say(`  - excluded as REPORTED not asserted         ${reportedOut.length}`);
say(`  = REPORTABLE claim sites                    ${reportable.length}`);
say();
say('  Every exclusion is a property of the DOCUMENT, not of the pattern — see the file header before');
say('  narrowing anything. A journal entry\'s forward claim is correct as history; a guest\'s citation');
say('  names its own tracker, so namespace has to be resolved before state; a quoted former claim is');
say('  about a claim, not an instance of one.');
say();

if (reportedOut.length) {
  say('  reported-not-asserted, excluded:');
  for (const h of reportedOut) say(`    ${h.file}:${h.line}  #${h.issue}  ${h.text.slice(0, 96)}`);
  say();
}

say('-'.repeat(100));
say('CLAIM vs ACTUAL');
say('-'.repeat(100));
if (stateFile) say(`  states resolved ${stateFile.resolvedAt} from ${stateFile.repo} via ${stateFile.method}. As fresh as this file — re-resolve before quoting.`);
else say('  !! no issue-states.json — every claim below is UNRESOLVED. Run with --issues, resolve via the GitHub MCP tools, write the file.');
say();
const order: Verdict[] = ['STALE', 'UNRESOLVED', 'NON-CHECKABLE', 'HOLDS'];
for (const v of order) {
  const group = judged.filter((h) => h.verdict === v);
  if (!group.length) continue;
  say(`  ${v}  (${group.length})`);
  for (const h of group) {
    const st = stateOf(h.issue);
    say(`    ${h.file}:${h.line}`);
    say(`      pattern   ${h.patterns.join(', ')}   cites #${h.issue}${st ? `  [${st.state}${st.kind ? ' ' + st.kind : ''}]` : ''}`);
    say(`      claim     ${h.text.slice(0, 150)}`);
    say(`      actual    ${h.detail}`);
  }
  say();
}

say('-'.repeat(100));
say('NOT CHECKABLE BY CONSTRUCTION — named, not dropped');
say('-'.repeat(100));
for (const r of NON_CHECKABLE) {
  const at = locate(r);
  say(`  ${r.file}${at ? ':' + at.line : ''}   cites #${r.issue}`);
  say(`    ${at ? at.text.slice(0, 140) : '(fingerprint no longer located — see the self-check)'}`);
  say(`    → ${r.why}`);
}
say();

say('-'.repeat(100));
say('KNOWN FALSE NEGATIVES — the reason this is not a gate');
say('-'.repeat(100));
if (!KNOWN_FALSE_NEGATIVES.length) {
  say('  none registered right now — the one confirmed instance (theme.ts, #101) was fixed out from under');
  say('  this file before it reached main. Empty is not evidence recall is fine; see the file header.');
}
for (const r of KNOWN_FALSE_NEGATIVES) {
  const caught = judged.some((h) => h.file === r.file && h.issue === r.issue);
  const at = locate(r);
  say(`  ${r.file}${at ? ':' + at.line : ''}   cites #${r.issue}   ${caught ? '** NOW CAUGHT — re-measure the recall claim in this file\'s header **' : 'STILL MISSED by the pattern set'}`);
  say(`    ${at ? at.text.slice(0, 140) : '(fingerprint no longer located — see the self-check)'}`);
  say(`    → ${r.why}`);
}
say();
say(`  Recall is UNMEASURED. ${reportable.length} claim sites were found among ${citations.toLocaleString('en-US')} citations; how many forward claims`);
say('  those citations actually contain is unknown, and the only way to know is to read a sample and');
say('  count what the pattern missed. Until that exists, this reports and does not assert.');
say();

say('-'.repeat(100));
say('INSTRUMENT SELF-CHECK');
say('-'.repeat(100));
for (const n of notes) say(`  · ${n}`);
say(`  · ${PATTERNS.length}/${PATTERNS.length} patterns fired on their own samples`);
say(`  · registers verified by fingerprint: ${NON_CHECKABLE.length} non-checkable, ${KNOWN_FALSE_NEGATIVES.length} known false negative`);
say();

const stale = judged.filter((h) => h.verdict === 'STALE').length;
const unresolved = judged.filter((h) => h.verdict === 'UNRESOLVED').length;
say('='.repeat(100));
say(`${reportable.length} reportable claim sites — ${stale} STALE · ${judged.filter((h) => h.verdict === 'HOLDS').length} HOLDS · ${judged.filter((h) => h.verdict === 'NON-CHECKABLE').length} NON-CHECKABLE · ${unresolved} UNRESOLVED`);
if (unresolved) say(`!! ${unresolved} site(s) have no recorded issue state. An unresolved claim is an unfinished measurement, not a healthy claim.`);
say('='.repeat(100));

console.log(out.join('\n'));

if (args.includes('--json'))
  console.log('\n' + JSON.stringify({
    corpus: { files: files.length, citations, filesWithCitations: citedIn.size, distinctIssues: distinct.size, baseline: BASELINE },
    funnel: { raw: rawHits.length, journalExcluded: journalHits.length, guestExcluded: guestHits.length, afterGenre: afterGenre.length, candidates: candidates.length, reportedExcluded: reportedOut.length, reportable: reportable.length },
    genreExclusions: { journals: [...JOURNALS], guests: GUESTS },
    sites: judged.map((h) => ({ file: h.file, line: h.line, issue: h.issue, patterns: h.patterns, verdict: h.verdict, detail: h.detail, text: h.text })),
    nonCheckable: NON_CHECKABLE,
    knownFalseNegatives: KNOWN_FALSE_NEGATIVES,
    statesResolvedAt: stateFile?.resolvedAt ?? null,
  }, null, 2));

if (problems.length) {
  console.error('\n' + '!'.repeat(100));
  console.error('THE INSTRUMENT IS BROKEN — this is not a claim about the repo, it is this tool failing to measure:');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('!'.repeat(100));
  process.exit(1);
}
process.exit(0);
