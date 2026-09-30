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
 *   HAND-WRITTEN STAMP   — outside a fold, a NEW stamp is the placeholder, and a pending placeholder is
 *                          never filled by hand. A concrete number there names a version no fold assigned.
 *   IMMUTABLE STAMP      — an existing CONCRETE stamp never changes, in a fold or out of one: not forward,
 *                          not back to a correction, not back to the placeholder. A rule whose change is
 *                          worth a new stamp is a new rule: a new id, the placeholder, and a note. (A
 *                          renamed id reads as one rule removed and one added, so it lands here as NEW.)
 *   NOTE WITH THE STAMP  — a diff that INTRODUCES a placeholder stamp (new, or newly placeholder) ADDS a
 *                          well-formed change note of its own. Judged on the diff, never on HEAD's state:
 *                          "some note is pending" would pass a PR leaning on another PR's note, and if the
 *                          fold consumed that note first, `main` would carry a placeholder no pending note
 *                          will ever move — every later PR red, and `fold.ts` refusing.
 *   FOLD LEFT A PLACEHOLDER — in a fold, no placeholder survives.
 *   FOLD FILLED WRONG    — in a fold, every stamp that was pending at the base reads exactly the fold's
 *                          version.
 *   FOLD ADDED A STAMP   — a fold only FILLS placeholders. A stamp that is new in a fold is refused, even
 *                          at the fold's own version: a rule belongs to a PR, with its own note.
 *
 * ── THE READER ──────────────────────────────────────────────────────────────────────────────────
 *
 * Each rule table is cut out of its file (`export const NAME … = [` to the next line that is exactly
 * `];`) and EVERY `since:` inside it is counted, whatever follows it, against the stamps the parse read.
 * So `since: ENGINE_VERSION`, a double-quoted stamp or a template literal is a CANNOT RUN, not a stamp
 * the gate silently skipped. The type fields (`since: string;`) sit outside the tables and are never
 * counted. In `test.ts` every non-blank, non-comment line of the two tables must be exactly
 * `'<key>': '<since>',`: a trailing `// comment` on a row is a CANNOT RUN too. Put the comment on
 * its own line.
 *
 * ── WHAT IT DOES NOT SEE ────────────────────────────────────────────────────────────────────────
 *
 * Whether a historical stamp is RIGHT. That is `test.ts`'s literal table, and the owner's reading of it.
 * A wrong historical stamp cannot be corrected through this arm at all; that is a deliberate policy
 * (the orchestrator's call on #1842's review), and a real correction is an owner decision made in the
 * open, by changing this arm in the same PR.
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

/** Cut `export const NAME … = [` … `];` out of `src`, or null when it is not there exactly once. */
const tableBody = (src: string, name: string): string | null => {
  const lines = src.split('\n');
  const opens = lines.flatMap((l, i) => (l.startsWith(`export const ${name}:`) && l.trimEnd().endsWith('= [') ? [i] : []));
  if (opens.length !== 1) return null;
  const close = lines.findIndex((l, i) => i > opens[0] && l === '];');
  return close < 0 ? null : lines.slice(opens[0] + 1, close).join('\n');
};

/** EVERY `since:` in a table body, whatever its value. The floor below compares the parse to it. */
const countSince = (body: string): number => (body.match(/\bsince\s*:/g) ?? []).length;

const RULE_TABLES: { file: StampFile; name: string; re: RegExp; key: (m: RegExpMatchArray) => string; since: (m: RegExpMatchArray) => string; shape: string }[] = [
  { file: 'renames', name: 'MATERIALIZATION_RENAMES', re: /\bid:\s*'([^']+)',\s*\n\s*since:\s*'([^']*)'/g, key: (m) => m[1], since: (m) => m[2], shape: "`id: '…',` then `since: '…',` on the next line" },
  { file: 'renames', name: 'MATERIALIZATION_DELETIONS', re: /\bid:\s*'([^']+)',\s*\n\s*since:\s*'([^']*)'/g, key: (m) => m[1], since: (m) => m[2], shape: "`id: '…',` then `since: '…',` on the next line" },
  { file: 'collections', name: 'COLLECTION_RENAMES', re: /\{\s*from:\s*'([^']+)',\s*to:\s*'([^']+)',\s*since:\s*'([^']*)'\s*\}/g, key: (m) => `${m[1]}→${m[2]}`, since: (m) => m[3], shape: "`{ from: '…', to: '…', since: '…' }` on one line" },
];

/**
 * Parse every stamp out of the three sources. A parse that could have looked at nothing is a problem,
 * never an empty result (docs/34 question 3): each rule table must be found exactly once and every
 * `since:` in it read, each test table must be found exactly once with every line in it read, and each
 * source must yield at least one stamp.
 */
export const readStamps = (src: StampSources): { stamps: Stamp[]; problems: string[] } => {
  const stamps: Stamp[] = [];
  const problems: string[] = [];

  for (const t of RULE_TABLES) {
    const body = tableBody(src[t.file], t.name);
    if (body === null) {
      problems.push(`${STAMP_PATHS[t.file]}: \`export const ${t.name}: … = [\` … \`];\` found other than exactly once`);
      continue;
    }
    const got = [...body.matchAll(t.re)];
    for (const m of got) stamps.push({ file: t.file, table: t.name, key: t.key(m), since: t.since(m) });
    const all = countSince(body);
    if (all !== got.length)
      problems.push(`${STAMP_PATHS[t.file]}: ${t.name} holds ${all} \`since:\`, but only ${got.length} read as ${t.shape} — write every stamp as a single-quoted string literal`);
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

/**
 * `lint-progress-order.ts`'s question about a stamp file in a fold: is its WHOLE diff the fold filling
 * placeholders with `version`? True only when the base holds at least one quoted placeholder and the
 * base, with every quoted placeholder replaced by `version`, is byte-identical to HEAD. Restated from
 * the fold's own substitution rather than imported (docs/34 shape 2).
 */
export const onlyFilledStamps = (baseSrc: string, headSrc: string, version: string): boolean =>
  baseSrc.includes(QUOTED_PENDING) && baseSrc.split(QUOTED_PENDING).join(`'${version}'`) === headSrc;

export type StampAudit = {
  base: Stamp[];
  head: Stamp[];
  headSources: StampSources;
  /** The diff deletes at least one change note: `lint-emission-version.ts`'s own reading of a fold. */
  isFold: boolean;
  headVersion: string;
  /** This diff ADDS at least one well-formed change note (not merely: one is pending at HEAD). */
  noteAdded: boolean;
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
  const introduced = pending.filter((s) => baseOf.get(`${s.file}\u0000${s.table}\u0000${s.key}`) !== PENDING_STAMP);
  if (introduced.length && !a.isFold && !a.noteAdded)
    out.push(`NOTE WITH THE STAMP — this diff introduces ${introduced.map(id).join(', ')} as ${QUOTED_PENDING} and adds no change note. The note must travel with the stamp: another PR's pending note can be folded before this merges, and then nothing would ever move the version for it`);

  for (const s of a.head) {
    const was = baseOf.get(`${s.file}\u0000${s.table}\u0000${s.key}`);
    if (was === s.since) continue;                                  // unchanged
    if (was !== undefined && was !== PENDING_STAMP) {
      out.push(`IMMUTABLE STAMP — ${id(s)} moved ${was} → ${s.since}. An existing stamp never changes; a rule whose change needs a new stamp is a new rule (a new id, ${QUOTED_PENDING}, and a note)`);
      continue;
    }
    if (a.isFold) {
      if (was === undefined) out.push(`FOLD ADDED A STAMP — ${id(s)} is new in a fold (reads ${s.since}). A fold only fills placeholders; a new rule arrives in its own PR with its own note`);
      else if (s.since !== a.headVersion && SEMVER.test(s.since)) out.push(`FOLD FILLED WRONG — ${id(s)} was pending and now reads ${s.since}; this fold assigns ${a.headVersion}`);
      continue;
    }
    if (!SEMVER.test(s.since)) continue;                            // a placeholder or a bad shape, judged above
    out.push(was === undefined
      ? `HAND-WRITTEN STAMP — ${id(s)} is new and reads ${s.since}. Write ${QUOTED_PENDING}; the fold fills in the version it assigns`
      : `HAND-WRITTEN STAMP — ${id(s)} was pending and now reads ${s.since} outside a fold. Only the fold fills a placeholder`);
  }
  return out;
};
