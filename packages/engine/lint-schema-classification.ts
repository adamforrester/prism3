/**
 * SCHEMA-CLASSIFICATION GATE (#807) — every file in `packages/engine/schema/` has a decided place in
 * the two prose gates, and a new one fails until a human decides.
 *
 *   npx tsx packages/engine/lint-schema-classification.ts
 *
 * ── THE RULE THIS ENFORCES, AND WHY IT NEEDED A GATE ────────────────────────────────────────────
 *
 * CLAUDE.md principle 5 states it: `token-contract.json` is deliberately not a regen artifact, and so
 * is named by hand in the prose gates — **"anything else kept out of regen needs the same line."**
 *
 * That rule lived in prose and in each gate's header, and was carried out by whoever remembered at the
 * moment a file was created. `packages/engine/schema/` mixes two populations: files in
 * `SCHEMA_ARTIFACTS` (regen-covered, and therefore in both prose gates automatically, because both
 * import that export) and files deliberately kept out of regen, which inherit none of that coverage
 * and must be listed by hand twice. Nothing distinguished **"deliberately exempt"** from **"nobody
 * looked"**, which is the same defect `payload-manifest.json` was written to remove one tier down:
 * #674's argument was that `out/` decided membership BY LOCATION with nothing but human knowledge
 * separating payload from ours. A schema file's prose coverage was decided the same way.
 *
 * So the fix is not to add the lines that were missing. That repairs the files that exist today and
 * leaves the next one to memory. This asserts that EVERY file in the directory is classified, in one
 * of exactly three ways, and fails naming any file that is in none of them.
 *
 * ── WHERE THE EXPECTATION COMES FROM (the trap, docs/34 shape 1) ────────────────────────────────
 *
 * EXPECTED is `git ls-files packages/engine/schema/` — the DIRECTORY LISTING.
 * ACTUAL is what the three classifications cover.
 *
 * It would be easier to build the expectation from the gates' own lists, and it would be worthless: a
 * check that derives what to expect from the lists it is checking agrees with them by construction and
 * reports that agreement as a pass. The unclassified file is precisely the one absent from every list,
 * so a list-derived expectation cannot contain it. Only the directory knows the file is there.
 *
 * This is why the directory walk is the gate and not an implementation detail — do not "simplify" it
 * into a union of the lists below.
 *
 * MEASURED, not argued: with `onDisk` rebuilt as that union and an unclassified `brand-new.json`
 * committed to `schema/`, this gate printed `✓ clean` at exit 0 and reported the same three-way census
 * as a passing run — while the directory-derived version fails on that identical file, naming it.
 * A weakened gate here does not go quiet; it produces a confident, well-formatted pass.
 *
 * ── HOW A FILE GETS CLASSIFIED ─────────────────────────────────────────────────────────────────
 *
 *   1. In `SCHEMA_ARTIFACTS` (regen.ts)  — generated, and covered by both prose gates automatically
 *                                          because both gates map over that same export.
 *   2. Hand-named in BOTH prose gates    — authored, kept out of regen, carries shipped prose.
 *   3. In `EXEMPT` below with a reason   — authored, kept out of regen, carries no shipped prose.
 *
 * Class 2 requires BOTH gates, and that is the point rather than a convenience: they share one scope
 * rule, so a file in one and not the other is a DIVERGENCE, and at most one side of it can be right.
 * Requiring both means such a state cannot be reached silently — it has to be argued for by editing
 * this file.
 *
 * ── WHAT WAS ACTUALLY FOUND, since #807 predicted more than the measurement supports ───────────
 *
 * Measured on `main` at 4159a49 by instrumenting each gate's resolved `gated[]` list and printing the
 * `packages/engine/schema/` entries — that is, from what the gates ACTUALLY scan rather than from
 * reading their source:
 *
 *   · both gates resolve to the SAME 7 schema files. The scopes do not diverge.
 *   · `paint-census.json` is in BOTH (lint-us-english.ts and lint-voice.ts), entering both in the
 *     same commit, 3dd7f39. #807 reports it as present in one and absent from the other and calls
 *     that split "the proof it is memory rather than judgment" — that split does not exist.
 *   · genuinely unclassified: `nb-measured.json`, `payload-manifest.json`,
 *     `theme-schema.example.json` — in neither gate, with no exemption and no record of a decision.
 *
 * So the finding is smaller than filed and still real: THREE files nobody decided about, not five
 * with a divergence among them. The underlying diagnosis survives intact, because it never depended
 * on the divergence — three files in neither list is already a rule enforced by memory. What changes
 * is that no gate was ever wrong about a file it scanned; they were both silent about files neither
 * scanned, which is the harder failure to see and exactly what a directory-derived expectation
 * catches.
 *
 * #807 also predicts a real finding in `payload-manifest.json`'s `why` fields, on the reasoning that
 * its prose has never been scanned. It is clean — as are the other two. Recorded because "we expected
 * a hit and there was none" is a result, and the next person to read that prediction should not go
 * looking for the hit that justified it. The value here is the coverage from now on, not a catch.
 *
 * ── MUTATIONS VERIFIED (each fails by name, exit 1) ────────────────────────────────────────────
 *
 * A new unclassified file in `schema/` (fails NAMING the file, then passes once classified) · a file
 * named in only one prose gate (fails as a divergence, naming the gate that is missing it) · a name
 * in `EXEMPT` that matches no file on disk · a name hand-named in a prose gate that no longer exists
 * · an `EXEMPT` entry with an empty reason · a file both hand-named and exempted. The both-directions
 * checks are what keep the lists from rotting the way every other hand-maintained list here has.
 *
 * One thing this gate deliberately does NOT decide: whether a file's prose OUGHT to be gated. It
 * asserts a human wrote down an answer, not that the answer is right — the same limit
 * `lint-payload-manifest.ts` states about payload-vs-ours, and the reason every `EXEMPT` entry
 * carries a `why` a reviewer can disagree with.
 *
 * SCOPE — `packages/engine/schema/**` as `git ls-files` reports it. Tracked files only: an untracked
 * file is not shipped, and would make the gate fail on a scratch file mid-work.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_ARTIFACTS } from './regen';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

const SCHEMA_DIR = 'packages/engine/schema';
const PROSE_GATES = ['packages/engine/lint-us-english.ts', 'packages/engine/lint-voice.ts'] as const;

/**
 * Class 3 — authored, kept out of regen, and deliberately NOT prose-gated. Each entry states why, so
 * a reviewer can disagree with the judgment rather than only with the omission.
 *
 * The bar for landing here rather than in both prose gates: the file carries no text a human or agent
 * reads as prose. A `$comment` or a `description` field is prose and belongs in the gates; a pure
 * data file is not.
 */
const EXEMPT: { file: string; why: string }[] = [
  {
    file: 'theme-schema.example.json',
    why:
      'A worked BrandInput (aurora) that conforms to theme-schema.json — pure DATA: ids, OKLCH ' +
      'triples, enum values, and no prose field anywhere in it (no $comment, no description). It is ' +
      'read by emit-dtcg.ts as an input fixture, never rendered to a person. theme-schema.json, the ' +
      'CONTRACT it exemplifies, carries `description` prose and is gated in both gates; this is the ' +
      'example, not the contract. If it ever gains a $comment, move it to class 2 rather than ' +
      'widening this reason.',
  },
];

type Failure = string;
const failures: Failure[] = [];
const lines: string[] = [];

// ---- EXPECTED: the directory listing. See the header — deriving this from the lists below would
// agree with them by construction, which is the one thing this gate must not do.
const onDisk = execSync(`git ls-files ${SCHEMA_DIR}`, { cwd: repo, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((p) => p.slice(`${SCHEMA_DIR}/`.length))
  .sort();

if (!onDisk.length) {
  // Not looking must never read as looking and finding nothing — the discipline both prose gates
  // encode as `blind[]`. An empty listing here means git failed or the path moved, not that the
  // directory is clean.
  console.error(`✗ \`git ls-files ${SCHEMA_DIR}\` returned nothing. The directory moved, or this is `
    + `not a git checkout — either way this gate cannot report a result it did not earn.`);
  process.exit(1);
}

// ---- ACTUAL: which files each prose gate names by hand. Read as SOURCE TEXT rather than by
// importing the gates, because the question is "did a human write the line", and importing them would
// run two full scans of the repo to answer it.
const namedIn = new Map<string, Set<string>>(); // gate path -> set of schema filenames
for (const gate of PROSE_GATES) {
  let src: string;
  try {
    src = readFileSync(join(repo, gate), 'utf8');
  } catch (e) {
    console.error(`✗ cannot read ${gate} (${(e as Error).message}) — this gate's ACTUAL is that `
      + `file's contents, so an unreadable one is a blind run, not a clean one.`);
    process.exit(1);
  }
  const found = new Set<string>();
  for (const m of src.matchAll(/['"`]packages\/engine\/schema\/([A-Za-z0-9._-]+)['"`]/g)) {
    found.add(m[1]);
  }
  namedIn.set(gate, found);
}

// A hand-named file the prose gates reach via `join(repo, 'packages/engine/schema/x.json')` matches
// the pattern above. The regen-covered ones are reached via SCHEMA_ARTIFACTS.map(...) and so are
// deliberately NOT expected to appear as literals — that is what class 1 is.
const regenCovered = new Set(SCHEMA_ARTIFACTS);
const exemptByFile = new Map(EXEMPT.map((e) => [e.file, e]));

// ---- Every file on disk is classified in exactly one of the three ways -----------------------
const classified: Record<string, string[]> = { regen: [], 'both-gates': [], exempt: [] };

for (const file of onDisk) {
  const inRegen = regenCovered.has(file);
  const gatesNaming = PROSE_GATES.filter((g) => namedIn.get(g)!.has(file));
  const exempt = exemptByFile.get(file);

  // Mutually exclusive: two classifications for one file means two people decided differently, or
  // one person decided twice. Either way nobody can tell which answer is live.
  const claims = [inRegen && 'SCHEMA_ARTIFACTS', gatesNaming.length && 'a prose gate', exempt && 'EXEMPT']
    .filter(Boolean)
    .map(String);
  if (claims.length > 1) {
    failures.push(
      `\`${file}\` is classified more than once — ${claims.join(' AND ')}. A file has one place: ` +
        `generated (SCHEMA_ARTIFACTS, covered automatically), authored-with-prose (hand-named in ` +
        `BOTH prose gates), or authored-without-prose (EXEMPT with a reason). Pick one, in ` +
        `packages/engine/lint-schema-classification.ts.`,
    );
    continue;
  }

  if (inRegen) {
    classified.regen.push(file);
    continue;
  }

  if (exempt) {
    if (!exempt.why.trim()) {
      failures.push(
        `\`${file}\` is in EXEMPT with an empty reason. An exemption with no stated why is ` +
          `indistinguishable from an oversight, which is the state this gate exists to end.`,
      );
    }
    classified.exempt.push(file);
    continue;
  }

  if (gatesNaming.length === PROSE_GATES.length) {
    classified['both-gates'].push(file);
    continue;
  }

  if (gatesNaming.length) {
    const missing = PROSE_GATES.filter((g) => !namedIn.get(g)!.has(file));
    failures.push(
      `DIVERGENCE: \`${file}\` is hand-named in ${gatesNaming.join(', ')} but NOT in ` +
        `${missing.join(', ')}. The two prose gates share one scope rule, so at most one side of ` +
        `this can be right — and a deliberate decision that a file needs voice-checking but not ` +
        `US-English-checking (or the reverse) would have a reason written down. Add the line to the ` +
        `gate missing it, or move the file to EXEMPT and say why.`,
    );
    continue;
  }

  failures.push(
    `UNCLASSIFIED: \`${SCHEMA_DIR}/${file}\` is in neither \`SCHEMA_ARTIFACTS\` nor either prose ` +
      `gate, and is not EXEMPT. Nothing distinguishes "deliberately not prose-gated" from "nobody ` +
      `looked", so a human has to decide (#807):\n` +
      `        · it carries shipped prose ($comment, description, note, a why) → hand-name it in ` +
      `BOTH ${PROSE_GATES.join(' and ')}\n` +
      `        · it is pure data with no prose field → add it to EXEMPT in ` +
      `packages/engine/lint-schema-classification.ts with a reason\n` +
      `        · it is generated by regen.ts → add it to SCHEMA_ARTIFACTS, which covers it in both ` +
      `gates automatically`,
  );
}

// ---- The other direction: a name in a list that no longer exists on disk ---------------------
// Without this, every list here rots exactly the way each hand-maintained list in this repo has: a
// renamed file leaves a stale entry that keeps the gate green while covering nothing.
const onDiskSet = new Set(onDisk);
for (const { file } of EXEMPT) {
  if (!onDiskSet.has(file)) {
    failures.push(
      `STALE EXEMPTION: \`${file}\` is in EXEMPT and does not exist in ${SCHEMA_DIR}. Remove the ` +
        `entry, or fix the name — an exemption for a file that is gone silently exempts nothing.`,
    );
  }
}
for (const gate of PROSE_GATES) {
  for (const file of namedIn.get(gate)!) {
    if (!onDiskSet.has(file)) {
      failures.push(
        `STALE SCOPE: ${gate} names \`${SCHEMA_DIR}/${file}\`, which does not exist. That gate ` +
          `fails closed on an unreadable file, so this is already breaking it — but it is named ` +
          `here too, because a scope entry pointing at nothing is the shape that rots a list.`,
      );
    }
  }
}
for (const file of SCHEMA_ARTIFACTS) {
  if (!onDiskSet.has(file)) {
    failures.push(
      `STALE SCHEMA_ARTIFACTS: regen.ts lists \`${file}\`, which does not exist in ${SCHEMA_DIR}.`,
    );
  }
}

lines.push(`  ${onDisk.length} tracked file(s) in ${SCHEMA_DIR}, each classified once:`);
lines.push(`    ${classified.regen.length} generated (SCHEMA_ARTIFACTS, both gates automatically): ${classified.regen.sort().join(' · ')}`);
lines.push(`    ${classified['both-gates'].length} authored, prose-gated in both: ${classified['both-gates'].sort().join(' · ')}`);
lines.push(`    ${classified.exempt.length} authored, exempt with a reason: ${classified.exempt.sort().join(' · ') || '(none)'}`);

console.log(`Schema-classification gate — ${SCHEMA_DIR}`);
for (const l of lines) console.log(l);

if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s):\n`);
  for (const f of failures) console.error(`  · ${f}\n`);
  process.exit(1);
}

console.log(
  '  ✓ clean — every schema file has a decided place, and no list names a file that is gone.\n' +
    '    Note the limit: this proves a human wrote an answer down, not that the answer is right.\n' +
    '    Moving a prose-carrying file to EXEMPT passes. The `why` on each entry is what review reads.',
);
