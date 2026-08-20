/**
 * ADVISORY-EXPIRY GATE — a stated advisory window, once it closes, fails the build.
 *
 *   npx tsx packages/engine/lint-advisory-expiry.ts
 *   PRISM3_TODAY=2026-08-20 npx tsx packages/engine/lint-advisory-expiry.ts   # injected clock, for tests
 *
 * ── WHAT IT CHECKS ──────────────────────────────────────────────────────────────────────────────
 *
 * The repo writes claims of the form *"this step is advisory / `continue-on-error` **until** some
 * dated day, then it gates"*. Every such claim is a promise with an expiry: on the stated morning
 * the sentence stops being a description of CI and becomes a false statement about it, in five or
 * six documents at once, with nothing anywhere to say so. The person who pushes that morning is not
 * the person who wrote the claim and has none of the context.
 *
 * So: scan the tracked tree, find every claim of that form, and fail once the stated day arrives.
 *
 * ── WHY THIS SUB-CLASS IS A GATE WHEN THE BROADER "FORWARD CLAIM" PROBLEM IS NOT ────────────────
 *
 * A general checker for *"we will do X later"* prose is a recall problem: nobody can enumerate the
 * phrasings, so nobody can say what it misses, so it cannot be trusted to block a merge. That work
 * ships separately as a `tools/` harness for exactly that reason. This one is different on all
 * three counts, and those three are the entire justification for it gating:
 *
 *   1. THE ORACLE IS THE CLOCK. No API, no issue state, no network, no second artifact to keep in
 *      sync. `docs/34` independence is free here: the subject is prose in the repo and the expected
 *      value is the date, and the repo cannot edit the calendar. This is as far from shape 1 (the
 *      gate reads the declaration it is checking) as a gate gets.
 *   2. THE PATTERN IS LITERAL, so recall is MEASURED rather than estimated — see the census below.
 *   3. THERE IS AN IMMINENT INSTANCE, so the gate has a real first firing rather than a hypothetical
 *      one, and its failure message gets read by someone who needs it.
 *
 * ── HOW A CLAIM IS RECOGNIZED, AND HOW THE FORMS WERE ENUMERATED ────────────────────────────────
 *
 * Anchored on the DATE, not on the phrase. Every `YYYY-MM-DD` in every tracked text file is a
 * candidate; a candidate is a claim when the `WINDOW` characters before it contain a non-blocking
 * MARKER (`advis…` or `continue-on-error`) and then the word `until` after that marker. Anchoring on
 * the date is what makes the recall question answerable: the denominator is every date in the repo,
 * which is finite and printable, so the classifier can be audited against the complement rather than
 * against a guess about what people might write.
 *
 * MEASURED at authoring time over the 549 tracked text files (554 tracked, 5 binary): 905
 * `YYYY-MM-DD` occurrences, of which 13 are claims — 8 live, and 5 inside the exempt history log.
 * The complement was read by hand — 28 dates sit
 * within `WINDOW` of an `until` with no marker, and every one is an unrelated sense of the word
 * ("until the seam moves", "until asked", "until it graduates"). The forms found, all six spellings
 * of one fact, are the fixtures in `FORM_SAMPLES` below:
 *
 *   `advisory until <date>`                        · ci.yml's step name, verify.ts's ciStep template
 *   `ADVISORY UNTIL <date>, THEN GATING`           · ci.yml's comment
 *   `Advisory in CI until <date>, then gating`     · CLAUDE.md §4, .github/pull_request_template.md
 *   `ADVISORY (continue-on-error) until <date>`    · CONTRIBUTING.md §3 (SPANS A LINE BREAK)
 *   `advisory (until <date> — #NNN)`               · apps/studio/test-smoke.mjs
 *   `SOMETHING_ADVISORY_UNTIL = '<date>'`          · verify.ts's constant (an IDENTIFIER, not prose)
 *
 * The last two are why the window is a character count and not "the same line": one form puts a
 * parenthesis and eight words between marker and `until`, another wraps across a comment prefix, and
 * a third joins them with an underscore inside an identifier. `WINDOW` was chosen by measurement,
 * not taste — the found set is IDENTICAL at 120, 200 and 400 characters, and the only additions
 * beyond that plateau (800, 2000) are demonstrable false positives inside the history log, where an
 * unrelated later date drifts into range of an earlier claim. 400 sits in the middle of the stable
 * plateau with room for a rewording.
 *
 * ── WHAT IT DELIBERATELY CANNOT DO, stated rather than left to be discovered ─────────────────────
 *
 * A claim phrased with NEITHER marker word — *"non-blocking through the end of the month"* — is not
 * seen, and no amount of widening this file fixes that class; that is the harness's problem, not
 * this gate's. `FORM_SAMPLES` proves the detector still recognizes the six forms it was written for;
 * it cannot prove a SEVENTH phrasing is recognized. Which is why the run prints the whole census on
 * every invocation: a claim count that drops without a deletion in the diff is the tell, and the
 * printed number is the only thing that can carry it (`docs/34` shape 9 — a detector that stops
 * matching reports a clean zero, and the number is the cheap defense).
 *
 * The comparison is lexical (`today >= stated`), which is correct for zero-padded ISO dates and
 * needs no date parsing, no timezone and no dependency. A malformed date (month 13, day 45) compares
 * as a string and would simply expire late; not worth code, since nothing writes one.
 *
 * This file is scanned like any other, with NO self-exemption — which is why its fixture dates are
 * assembled by `iso()` rather than written out. The one date written literally here is the usage
 * example at the top, and it is not a claim because no marker and no `until` precede it, which is
 * the classifier working rather than an escape from it.
 *
 * THAT IS A HOUSE RULE, NOT A LOCAL TRICK: **a detector whose own source falls inside its corpus must
 * write no matchable instance — never exempt itself. A gate that excuses itself leaves the file most
 * likely to grow the defect unchecked.** `tools/forward-claim-check/measure.ts` reached it
 * independently, interpolating its issue numbers for the same reason this file assembles its dates;
 * two arrivals, one rule.
 *
 * ── THE ONE EXEMPTION, AND WHY IT IS A PROPERTY OF THE DOCUMENT ─────────────────────────────────
 *
 * `docs/00-progress.md` is out of scope — see `EXEMPT_PREFIXES`. Its genre is an append-only log of
 * dated entries, each describing the repo AS IT WAS on the day it was written. An entry that says a
 * suite was advisory until some date is a true statement about that date and stays true forever;
 * flagging it would force us to falsify history to go green. The exemption is a property of THAT
 * DOCUMENT, not a weakness of the pattern — the identical sentence in `CONTRIBUTING.md` is a live
 * promise and is checked. `lint-layout-claims.ts` exempts the same file for the same reason, in the
 * same shape, and this follows it rather than inventing a second convention.
 *
 * `docs/superpowers/` is deliberately NOT exempt even though it is also per-change working notes: a
 * spec's forward claim is a plan someone may still act on, unlike a log entry, and there are zero
 * occurrences there today so the stricter choice is free. Revisit with a reason, not by reflex.
 *
 * ── THE INJECTED CLOCK ──────────────────────────────────────────────────────────────────────────
 *
 * `PRISM3_TODAY` overrides today's date. It exists so this gate can be verified in BOTH directions —
 * a gate that has never been seen to fail is the defect it exists to prevent — without editing the
 * dates in the files, which would test a different program. CI does not set it, and when it is set
 * the run says so on its first line, so a bypass is visible in the log rather than silent.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

/** Characters before a date in which the marker and `until` must sit. See the header for the
 *  measurement that chose 400 — the found set is identical at 120/200/400 and only gains false
 *  positives past it. */
export const WINDOW = 400;

/** The words that name a non-blocking state. Both are literal spellings taken from the corpus, not
 *  guesses: `continue-on-error` is the one form that appears with no `advis…` anywhere near it. */
const MARKER = /advis|continue-on-error/gi;

const DATE = /\d{4}-\d{2}-\d{2}/g;

/** Files whose GENRE is a dated record of what WAS true. Each entry states why it qualifies;
 *  anything added here needs the same sentence. Same shape and same reasoning as
 *  `lint-layout-claims.ts`'s exemption list. */
const EXEMPT_PREFIXES: { prefix: string; why: string }[] = [
  {
    prefix: 'docs/00-progress.md',
    why: 'the append-only history log — every entry describes the repo on the day it was written, so a closed advisory window recorded there is correct prose forever',
  },
  {
    prefix: 'tools/forward-claim-check/recall-classification-record.txt',
    why: "the recall measurement's committed evidence — a snapshot taken 2026-08-14 at 63efb29 that QUOTES other files' text verbatim as its data, and says so in its own header: 'the quoted text is the pin that survives'. The advisory sentences it reproduces are the SUBJECT of a measurement, not claims this repo is making, and editing them to go green would falsify a record that is explicitly not reproducible. Same genre argument as the history log above, arrived at the same way: it surfaced as 4 of the 12 sites this gate named when #775's window closed, and the fix is an exemption rather than a narrower pattern",
  },
];

/** Nothing here carries prose, and decoding it as UTF-8 is noise. */
const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|zip|pdf)$/i;

export type Claim = { file: string; line: number; date: string; text: string };

/** How much of the surrounding source to quote back. Centered on the DATE, not on the start of the
 *  line, because three of the six sites live on lines 400-900 characters long — quoting a line's
 *  first N characters shows the reader everything except the claim. */
const QUOTE_BEFORE = 110;
const QUOTE_AFTER = 70;

/** Every advisory-expiry claim in one file's source. Exported for the self-checks — the shipped
 *  predicate, run against the fixtures, never a second copy of it. */
export const claimsIn = (file: string, src: string): Claim[] => {
  const out: Claim[] = [];
  for (const m of src.matchAll(DATE)) {
    const at = m.index!;
    const before = src.slice(Math.max(0, at - WINDOW), at);
    let marker = -1;
    for (const mm of before.matchAll(MARKER)) marker = mm.index!;
    if (marker < 0) continue;
    if (!/until/i.test(before.slice(marker))) continue;
    const from = Math.max(0, at - QUOTE_BEFORE);
    const to = Math.min(src.length, at + m[0].length + QUOTE_AFTER);
    const text = `${from > 0 ? '…' : ''}${src.slice(from, to).replace(/\s+/g, ' ').trim()}${to < src.length ? '…' : ''}`;
    out.push({ file, line: src.slice(0, at).split('\n').length, date: m[0], text });
  }
  return out;
};

export const isExempt = (file: string): boolean => EXEMPT_PREFIXES.some((e) => file.startsWith(e.prefix));

/** Expired iff the stated day has ARRIVED — "advisory until D" means the flip happens ON D, so `>=`
 *  and not `>`. Same comparison `verify.ts` uses to decide whether the smoke gate is still advisory,
 *  which is not a shared derivation: that file decides how to RUN a gate, this one decides whether
 *  the PROSE is still true, and each reads the clock itself. */
export const isExpired = (claim: Claim, today: string): boolean => today >= claim.date;

/**
 * Fixture dates are ASSEMBLED, never written as literals — including in `FORM_SAMPLES` below, where
 * `DATE` is substituted at runtime. This file carries no self-exemption and is scanned like any
 * other, so a real `YYYY-MM-DD` written beside these phrases would sit inside its own detector's
 * window and the gate would flag its own test data, forever, with no way to go green.
 */
const iso = (y: number, m: number, d: number) => `${y}-${`${m}`.padStart(2, '0')}-${`${d}`.padStart(2, '0')}`;

/**
 * The six literal forms found in the corpus, as fixtures.
 *
 * These prove the detector still recognizes what it was written for. They cannot prove it recognizes
 * a form nobody has written yet — see the header's limits section.
 */
const FORM_SAMPLES: { label: string; text: string }[] = [
  { label: "ci.yml step name / verify.ts ciStep", text: '- name: "Studio headless smoke suite (advisory until DATE — #775)"' },
  { label: 'ci.yml comment', text: '# ADVISORY UNTIL DATE, THEN GATING — tracked as #775, which is the only reason' },
  { label: 'CLAUDE.md §4 / PR template', text: '**Advisory in CI until DATE, then gating — #775.**' },
  { label: 'CONTRIBUTING.md §3 (across a line break)', text: '#   granularity. In CI it is ADVISORY\n#   (continue-on-error) until DATE, then gating —\n#   #775.' },
  { label: 'apps/studio/test-smoke.mjs', text: "'**This step is advisory and does not block the merge** (until DATE — #775). It is'," },
  { label: 'verify.ts constant', text: "const SMOKE_ADVISORY_UNTIL = 'DATE';" },
];

// ---- SELF-CHECKS: the detector, the exemption, and both directions of the verdict ---------------
{
  const fails: string[] = [];
  const past = iso(2020, 1, 1);

  for (const s of FORM_SAMPLES) {
    const found = claimsIn('fixture.md', s.text.replace(/DATE/g, past));
    if (found.length !== 1) fails.push(`the detector no longer sees the ${s.label} form — recall has silently narrowed`);
    else if (!isExpired(found[0], iso(2026, 1, 1))) fails.push(`a claim dated ${past} read as unexpired in ${s.label}`);
  }

  // Negative controls. Each is a way the classifier could go wide and swallow the repo's other 891
  // dates, and each has a real analogue in the corpus.
  const negatives: [string, string][] = [
    ['a bare date with no claim around it', `shipped ${past}, superseded later that week`],
    ['`until` in an unrelated sense', `parked until the seam moves; audited ${past}`],
    ['a marker with no `until`', `the advisory model (#113) landed ${past}`],
    ['`until` BEFORE the marker', `blocked until review; the advisory layer is separate\n\n(unrelated) ${past}`],
    ['marker and `until` beyond the window', `advisory until${' '.repeat(WINDOW)}${past}`],
  ];
  for (const [label, text] of negatives) {
    if (claimsIn('fixture.md', text).length) fails.push(`FALSE POSITIVE: ${label} was read as an advisory claim`);
  }

  // The verdict must go both ways on the same claim — a gate whose PASS side is untested is a gate
  // that fails on everything, which is the same uselessness one direction along.
  const stated = iso(2026, 8, 20);
  const one = claimsIn('fixture.md', `advisory until ${stated}`)[0];
  if (!one) fails.push('the canonical form is not detected at all');
  else {
    if (isExpired(one, iso(2026, 8, 19))) fails.push('a claim expired the day BEFORE its stated date');
    if (!isExpired(one, stated)) fails.push('a claim did NOT expire ON its stated date — "until D" must flip on D');
    if (!isExpired(one, iso(2026, 9, 1))) fails.push('a claim did not expire after its stated date');
  }

  // The exemption predicate itself, not just the scan: a dated log entry must be representable
  // without failing, and the prefix must not be so broad it swallows a live document.
  if (!isExempt('docs/00-progress.md')) fails.push('the history log is not exempt — a dated entry would be forced to falsify itself');
  if (isExempt('CONTRIBUTING.md') || isExempt('docs/34-gate-independence.md')) fails.push('a live document matched an exemption prefix — the exemption is too broad');

  if (fails.length) {
    console.error('✗ the advisory-expiry gate FAILED ITS OWN CHECKS — its verdict below means nothing:\n');
    for (const f of fails) console.error(`  · ${f}`);
    process.exit(1);
  }
}

// ---- THE RUN -----------------------------------------------------------------------------------
// Guarded, so the predicates above can be imported and exercised without a filesystem scan and a
// `process.exit` happening as a side effect of the import. The self-checks are deliberately OUTSIDE
// the guard, same as `verify.ts`: an importer gets a broken detector reported, not inherited.
const isMain = (() => {
  try { return !!process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
})();

const main = (): never => {
  const injected = process.env.PRISM3_TODAY;
  if (injected && !/^\d{4}-\d{2}-\d{2}$/.test(injected)) {
    console.error(`✗ PRISM3_TODAY="${injected}" is not a YYYY-MM-DD date.`);
    process.exit(1);
  }
  const today = injected ?? new Date().toISOString().slice(0, 10);

  const tracked = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((f) => f && !BINARY.test(f));

  const claims: Claim[] = [];
  let scanned = 0;
  let dateOccurrences = 0;
  for (const f of tracked) {
    let src: string;
    try {
      src = readFileSync(join(repo, f), 'utf8');
    } catch {
      continue;
    }
    scanned++;
    dateOccurrences += [...src.matchAll(DATE)].length;
    if (isExempt(f)) continue;
    claims.push(...claimsIn(f, src));
  }

  console.log(`Advisory-expiry gate — today is ${today}${injected ? '  ⚠ INJECTED via PRISM3_TODAY' : ''}`);
  console.log(`  scope: ${scanned} tracked file(s), ${dateOccurrences} YYYY-MM-DD occurrence(s), ${EXEMPT_PREFIXES.length} exempt prefix(es)`);

  // A scan that stopped reading the tree reports a clean zero, and a clean zero is also what this
  // gate prints when it passes. The floor is what separates the two. 549 files / 905 dates at
  // authoring; these are order-of-magnitude floors, not pins, so ordinary growth never touches them.
  if (scanned < 100 || dateOccurrences < 100) {
    console.error(`\n✗ THE SCAN DID NOT RUN: ${scanned} file(s), ${dateOccurrences} date(s). The repo has hundreds of both.`);
    console.error('  A clean pass and a broken scan are indistinguishable without this floor — treat the run as void.');
    process.exit(1);
  }

  const expired = claims.filter((c) => isExpired(c, today));

  if (!claims.length) {
    console.log('  ✓ clean — no open advisory window is stated anywhere in the tracked tree.');
    process.exit(0);
  }

  console.log(`  claims: ${claims.length} — ${expired.length} expired, ${claims.length - expired.length} still open`);
  for (const c of claims) {
    console.log(`    · ${c.file}:${c.line} — ${isExpired(c, today) ? 'EXPIRED' : `open until ${c.date}`}`);
  }

  if (!expired.length) {
    console.log('  ✓ clean — every stated advisory window is still open.');
    process.exit(0);
  }

  // Harvested from AFTER the date rather than from the whole quote: every one of these claims writes
  // its tracking issue immediately behind the date ("until <date>, then gating — #NNN"), while the
  // prose in front of it routinely cites three or four unrelated issues.
  const issues = [
    ...new Set(
      expired.flatMap((c) => [...c.text.slice(c.text.indexOf(c.date)).matchAll(/#(\d+)/g)].map((m) => `#${m[1]}`)),
    ),
  ];

  console.error(`\n✗ ${expired.length} EXPIRED ADVISORY CLAIM(S). Today is ${today}, and each site below states a date that has arrived:\n`);
  for (const c of expired) {
    console.error(`  · ${c.file}:${c.line} — stated ${c.date}`);
    console.error(`      ${c.text}\n`);
  }
  console.error('WHAT TO DO — in this order. The second step alone is not the fix:\n');
  console.error(
    `  1. MAKE THE CHANGE THE WINDOW WAS BUYING TIME FOR — not a later date.${issues.length ? ` Each claim above\n     names its own tracking issue: ${issues.join(', ')}.` : ''}\n` +
      `     For a \`continue-on-error\` CI step that means DELETING that flag so the step gates, and\n` +
      `     dropping the matching \`advisory\` flag in \`verify.ts\` so the local runner is not weaker than\n` +
      `     CI. (The instance this gate was written for is the studio headless smoke suite, #775.) An\n` +
      `     advisory period exists to EARN that flip on a week of runner evidence, not to be renewed —\n` +
      `     if the week found flakiness the condition is to FIX THE FLAKE, because a second extension is\n` +
      `     how advisory becomes forever.`,
  );
  console.error(
    `\n  2. THEN UPDATE EVERY SITE LISTED ABOVE, so the prose describes what CI now does. They are\n` +
      `     plural on purpose: the same fact is written in the workflow, in the gate runner and in the\n` +
      `     three contributor documents, and a flip that edits one of them leaves the rest false.`,
  );
  console.error(
    `\n  Moving the dates forward will make this gate green again. That is not the fix, and nothing here\n` +
      `  can stop you doing it — it is refused by review, and by the issue's own stated condition.\n`,
  );
  process.exit(1);
};

if (isMain) main();
