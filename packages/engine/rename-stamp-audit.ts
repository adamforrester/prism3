/**
 * RENAME STAMPS (#1816) — the checking half of "the fold fills in a rename rule's `since`".
 *
 * Three authored tables record the `ENGINE_VERSION` whose code made a rename, as a literal `since`:
 * `MATERIALIZATION_RENAMES` and `MATERIALIZATION_DELETIONS` (`materialization-renames.ts`) and
 * `COLLECTION_RENAMES` (`rename-map.ts`). `test.ts` pins them per entry in two hand-written tables,
 * `EXPECTED_SINCE` and `EXPECTED_COLLECTION_SINCE`, deliberately not against the live constant (#1080).
 * Since #1807 a PR cannot know its version: the fold assigns it after a batch of merges. So a PR that
 * adds a rule writes the quoted placeholder `'{{ENGINE_VERSION}}'` as the `since`, in the table and in
 * the test's table, and `fold.ts` substitutes the version it assigns, exactly as it does in change notes
 * and progress fragments.
 *
 * This module is what `lint-emission-version.ts` runs over the base and HEAD copies of those three
 * files. It is pure (sources in, problems out) so `test.ts` can drive it with literal fixtures.
 *
 * ── IT DOES NOT IMPORT `fold-stamps.ts`, AND MUST NOT (docs/34 shape 2) ──────────────────────────
 *
 * The fold's substitution is this module's SUBJECT. Reading the stamps through the fold's own regex, or
 * checking its output with its own file list, would agree with it by construction. So the parse, the
 * placeholder and the version comparison are all restated here. The duplication is the gate.
 *
 * ── THE ARMS ─────────────────────────────────────────────────────────────────────────────────────
 *
 *   STAMP SHAPE          — every stamp is the placeholder or `X.Y.Z`. A typo in the placeholder
 *                          (`{{ENGINE_VERSON}}`) would otherwise sit unsubstituted forever.
 *   STRAY PLACEHOLDER    — the quoted placeholder appears in a stamp file only as a stamp. The fold
 *                          substitutes it file-wide, so one written anywhere else (a test fixture, say)
 *                          would be rewritten silently by the next fold.
 *   HAND-WRITTEN STAMP   — a stamp that is new, or that moved, names a version the fold did not assign:
 *                          a new entry with a concrete number, a pending placeholder filled in outside a
 *                          fold, or an existing stamp moved above the base's `ENGINE_VERSION` (a guess at
 *                          a future version). Moving a stamp to a version at or below the base is allowed:
 *                          that is a correction to history, and `test.ts`'s literal table has to agree.
 *   PENDING, NO NOTE     — a placeholder at HEAD while no change note is pending. The next fold would
 *                          not move the version, and would stamp the rule with a version that shipped
 *                          without it.
 *   FOLD LEFT A PLACEHOLDER — in a fold, no placeholder survives.
 *   FOLD FILLED WRONG    — in a fold, every stamp that was pending at the base reads exactly the fold's
 *                          version.
 *
 * ── WHAT IT DOES NOT SEE ────────────────────────────────────────────────────────────────────────
 *
 * Whether a historical stamp is RIGHT. That is `test.ts`'s literal table, and the owner's reading of it.
 * And a version at or below the base that no release ever carried: this module does not read the
 * changelog, so a correction to `0.205.3` passes here and must be caught in review.
 */

/** Restated from `fold-stamps.ts` on purpose; see the header. */
export const PENDING_STAMP = '{{ENGINE_VERSION}}';
const QUOTED_PENDING = `'${PENDING_STAMP}'`;
const SEMVER = /^\d+\.\d+\.\d+$/;

export type StampSources = {
  /** `packages/engine/materialization-renames.ts` */
  renames: string;
  /** `packages/engine/rename-map.ts` */
  collections: string;
  /** `packages/engine/test.ts` */
  tests: string;
};
export type StampFile = keyof StampSources;
export type Stamp = { file: StampFile; table: string; key: string; since: string };

export const STAMP_PATHS: Record<StampFile, string> = {
  renames: 'packages/engine/materialization-renames.ts',
  collections: 'packages/engine/rename-map.ts',
  tests: 'packages/engine/test.ts',
};

const TEST_TABLES = ['EXPECTED_SINCE', 'EXPECTED_COLLECTION_SINCE'] as const;

/** Every `since:` followed by a string literal of ANY quote. The floor below compares the parse to it. */
const countSinceLiterals = (src: string): number => (src.match(/\bsince:\s*['"`]/g) ?? []).length;

/**
 * Parse every stamp out of the three sources. A parse that could have looked at nothing is a problem,
 * never an empty result (docs/34 question 3): each source must yield at least one stamp, every `since:`
 * literal in the two rule files must be one the parse understood, and each test table must be found
 * exactly once with every line in it parsed.
 */
export const readStamps = (src: StampSources): { stamps: Stamp[]; problems: string[] } => {
  const stamps: Stamp[] = [];
  const problems: string[] = [];

  // materialization-renames.ts — `id: '<id>',` directly followed by `since: '<v>',`.
  {
    const got = [...src.renames.matchAll(/\bid:\s*'([^']+)',\s*\n\s*since:\s*'([^']*)'/g)];
    for (const m of got) stamps.push({ file: 'renames', table: 'MATERIALIZATION_RENAMES/DELETIONS', key: m[1], since: m[2] });
    const all = countSinceLiterals(src.renames);
    if (all !== got.length)
      problems.push(`${STAMP_PATHS.renames}: ${all} \`since:\` literal(s), but only ${got.length} read as \`id: '…',\` then \`since: '…'\` — write a stamp as a single-quoted string on the line after its id`);
  }
  // rename-map.ts — `{ from: '<a>', to: '<b>', since: '<v>' }`, keyed `a→b` as test.ts keys it.
  {
    const got = [...src.collections.matchAll(/\{\s*from:\s*'([^']+)',\s*to:\s*'([^']+)',\s*since:\s*'([^']*)'\s*\}/g)];
    for (const m of got) stamps.push({ file: 'collections', table: 'COLLECTION_RENAMES', key: `${m[1]}→${m[2]}`, since: m[3] });
    const all = countSinceLiterals(src.collections);
    if (all !== got.length)
      problems.push(`${STAMP_PATHS.collections}: ${all} \`since:\` literal(s), but only ${got.length} read as \`{ from: '…', to: '…', since: '…' }\` on one line`);
  }
  // test.ts — the two literal tables, each `const NAME: Record<string, string> = {` … `};`.
  for (const table of TEST_TABLES) {
    const lines = src.tests.split('\n');
    const opens = lines.flatMap((l, i) => (l.trim() === `const ${table}: Record<string, string> = {` ? [i] : []));
    if (opens.length !== 1) {
      problems.push(`${STAMP_PATHS.tests}: \`const ${table}: Record<string, string> = {\` found ${opens.length} time(s), expected once`);
      continue;
    }
    const close = lines.findIndex((l, i) => i > opens[0] && l.trim() === '};');
    if (close < 0) { problems.push(`${STAMP_PATHS.tests}: ${table} never closes with \`};\``); continue; }
    for (const raw of lines.slice(opens[0] + 1, close)) {
      const l = raw.trim();
      if (!l || l.startsWith('//')) continue;
      const m = /^'([^']+)':\s*'([^']*)',?$/.exec(l);
      if (m) stamps.push({ file: 'tests', table, key: m[1], since: m[2] });
      else problems.push(`${STAMP_PATHS.tests}: a line in ${table} is not \`'<key>': '<since>',\` — ${l.slice(0, 80)}`);
    }
  }
  for (const f of Object.keys(STAMP_PATHS) as StampFile[])
    if (!stamps.some((s) => s.file === f))
      problems.push(`${STAMP_PATHS[f]}: no stamp read at all — a parse that found nothing looked at nothing. If a table was emptied on purpose, change this reader in the same PR`);
  return { stamps, problems };
};

/** `a <= b` over `X.Y.Z`, stated here rather than imported (see the header). */
const atOrBelow = (a: string, b: string): boolean => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i];
  return true;
};

export type StampAudit = {
  base: Stamp[];
  head: Stamp[];
  headSources: StampSources;
  /** The diff deletes at least one change note: `lint-emission-version.ts`'s own reading of a fold. */
  isFold: boolean;
  baseVersion: string;
  headVersion: string;
  /** At least one well-formed change note is pending at HEAD, so the next fold moves the version. */
  notePending: boolean;
};

/** One line per problem, each opening with its arm's name. Empty means every stamp is accounted for. */
export const auditStamps = (a: StampAudit): string[] => {
  const out: string[] = [];
  const id = (s: Stamp): string => `${s.table} '${s.key}'`;
  const baseOf = new Map(a.base.map((s) => [`${s.file}\u0000${s.table}\u0000${s.key}`, s.since]));

  for (const s of a.head)
    if (s.since !== PENDING_STAMP && !SEMVER.test(s.since))
      out.push(`STAMP SHAPE — ${id(s)} reads '${s.since}', which is neither ${QUOTED_PENDING} nor X.Y.Z`);

  for (const f of Object.keys(STAMP_PATHS) as StampFile[]) {
    const quoted = a.headSources[f].split(QUOTED_PENDING).length - 1;
    const asStamps = a.head.filter((s) => s.file === f && s.since === PENDING_STAMP).length;
    if (quoted !== asStamps)
      out.push(`STRAY PLACEHOLDER — ${STAMP_PATHS[f]} holds ${quoted} quoted ${QUOTED_PENDING}, and ${asStamps} of them are stamps. The fold substitutes every one in the file; build a fixture's copy by concatenation`);
  }

  const pending = a.head.filter((s) => s.since === PENDING_STAMP);
  if (pending.length && a.isFold)
    out.push(`FOLD LEFT A PLACEHOLDER — ${pending.map(id).join(', ')} still read ${QUOTED_PENDING} after a fold to ${a.headVersion}`);
  if (pending.length && !a.isFold && !a.notePending)
    out.push(`PENDING, NO NOTE — ${pending.map(id).join(', ')} read ${QUOTED_PENDING}, and no change note is pending, so the next fold would not move ENGINE_VERSION off ${a.headVersion}. A new rename rule is a behavior change: add a note`);

  for (const s of a.head) {
    const was = baseOf.get(`${s.file}\u0000${s.table}\u0000${s.key}`);
    if (was === s.since || !SEMVER.test(s.since)) continue;   // unchanged, or a placeholder (judged above)
    if (a.isFold && s.since === a.headVersion && (was === undefined || was === PENDING_STAMP)) continue;
    if (was === PENDING_STAMP) {
      out.push(a.isFold
        ? `FOLD FILLED WRONG — ${id(s)} was pending and now reads ${s.since}; this fold assigns ${a.headVersion}`
        : `HAND-WRITTEN STAMP — ${id(s)} was pending and now reads ${s.since} outside a fold. Only the fold fills a placeholder`);
    } else if (was === undefined) {
      out.push(`HAND-WRITTEN STAMP — ${id(s)} is new and reads ${s.since}. Write ${QUOTED_PENDING}; the fold fills in the version it assigns`);
    } else if (!atOrBelow(s.since, a.baseVersion)) {
      out.push(`HAND-WRITTEN STAMP — ${id(s)} moved ${was} → ${s.since}, above the base's ENGINE_VERSION ${a.baseVersion}: a guess at a version no fold has assigned. Write ${QUOTED_PENDING}`);
    }
  }
  return out;
};
