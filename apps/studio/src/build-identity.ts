/**
 * WHICH BUILD IS RUNNING (#836) — the readings of `PRISM3_BUILD`, in one place with one test.
 *
 * `PRISM3_BUILD` has three producers and now three shapes, all of them a single string because a
 * `--define` is a string substitution and every entry that bundles `apps/studio/src` must supply one
 * (see `prism3-host.d.ts`: an absent define leaves a bare identifier that throws at load, so this is a
 * required build input rather than a value with a fallback):
 *
 *   • `'local'`                                  — `apps/studio` dev/build, not built by the deploy
 *   • a commit SHA                               — `build-site.mjs`, the Vercel deploy
 *   • `'<ISO seconds> <absolute tree path>'`      — `apps/plugin/build.mjs` (#836)
 *
 * WHY THE PLUGIN STAMPS A PATH AND NOT A COMMIT. #836 offered a short SHA + dirty flag as the cheap
 * option and answered it in its own body: two worktrees on the same commit is a normal state here, and
 * a SHA cannot separate them. This repo had 22 live worktrees the day this landed. `dist/` is also
 * gitignored, so a tree can sit on exactly the right commit carrying a two-day-old bundle — which is
 * the state that cost an afternoon on 2026-08-26, when Figma was loading the shared checkout's `dist/`
 * while three trees each declared plugin id `prism3-theming-plugin`. The path is both the discriminator
 * a SHA cannot be and the actionable half: the remedy is to re-import or rebuild a specific tree.
 * The path also makes the commit derivable (`git -C <tree> log -1`); the commit does not make the path
 * derivable. That asymmetry is the whole argument, and it is why there is no SHA field here.
 *
 * TWO RENDERINGS, because the two surfaces have different budgets. The rail is 210px wide and the chip's
 * field caps at 194px (measured in the built panel, not read off the `.shell` grid declaration); the field
 * is a flex item, so a long token would push past the rail rather than wrap inside it. The chip therefore
 * gets the tree's LAST SEGMENT plus the build time. Measured at a 17.05px line-height, with the UTC
 * marker: `p3-buildid 08-26 21:55Z` (23 characters) renders at **152.3px on one line**; the chip stays on
 * one line through 29 characters, takes two from 30 to 58, and three at 59; and an unbreakable 80-character
 * token is three lines at 194px. Nothing overflows the rail at any length tried, because `.rail-build-b`
 * carries `overflow-wrap:anywhere`.
 *
 * TWO EARLIER VERSIONS OF THOSE NUMBERS WERE WRONG, in different ways, and both are worth keeping visible.
 * The first said four lines at 47 characters; #1100's reviewer falsified it and a second pass measured
 * three. The second — the correction — quoted three lines at 47 characters as if total length were the
 * variable. It is not: the break is decided by the TREE-NAME TOKEN, since the time field cannot break and
 * the name only breaks mid-token once it alone exceeds 194px. Adding the `Z` moved a 47-character chip from
 * a 35-character name (breaks) to a 34-character name (fits), so the same total length changed line count
 * without anything about the layout changing. State the threshold, not one sampled string.
 *
 * The run report and the `title` have no width budget and get the whole path.
 *
 * NEITHER RENDERING IS THE PRIMARY CHANNEL, and that is measured too: at the plugin's default window the
 * chip is 78px below the fold, and `buildNote`'s clause is not rendered at all on a clean run, because
 * the panel only opens the detail row on failure. The channel that reports on the run this exists for —
 * success reported, wrong bundle — is the boot `console.log` in `apps/plugin/src/main.ts`, which is where
 * the ranking and the numbers are written down. These two are confirmation; do not widen the chip's
 * budget in the belief that it is what catches the mismatch (#1107).
 *
 * PURE — no DOM, no imports. It compiles under all three tsconfigs that reach it: the studio's, the
 * plugin's UI config, and the plugin's MAIN config, whose `lib` is `ES2020` with no `dom`.
 */

/** The parsed forms. `tree` is the plugin's; the other two are the web's and are unchanged by #836. */
export type BuildIdentity =
  | { kind: 'tree'; builtAt: string; tree: string }
  | { kind: 'commit'; commit: string }
  | { kind: 'local' };

/**
 * TIMESTAMP FIRST, SEPARATED BY THE FIRST SPACE — so the path is the unparsed tail.
 *
 * A path can contain almost anything, including `@`, `|` and spaces (this repo has
 * `reference/New Balance/`), so no separator is safe to search for from the right. An ISO timestamp
 * cannot contain a space, so splitting on the FIRST one makes the path's own content irrelevant to the
 * parse. That ordering is the reason this is a total function rather than a best effort.
 *
 * A string with no space is the web's: `'local'`, or a commit. `'check'`
 * (`vercel-ignore-check.mjs`) reads as a commit and never renders — that entry has no output path and
 * exists only to answer whether a deploy is needed.
 */
export const parseBuildId = (raw: string): BuildIdentity => {
  const sp = raw.indexOf(' ');
  if (sp > 0) return { kind: 'tree', builtAt: raw.slice(0, sp), tree: raw.slice(sp + 1) };
  if (raw === 'local') return { kind: 'local' };
  return { kind: 'commit', commit: raw };
};

/** The tree's last path segment — `p3-buildid`, `Prism3`. POSIX separators only: `build.mjs` builds the
 *  string from `import.meta.url`, and this repo's platform is darwin. A Windows path would fall through
 *  to the whole string, which is wrong in the chip but not wrong in the title or the report. */
const treeName = (tree: string): string => tree.split('/').filter(Boolean).pop() ?? tree;

/**
 * The rail chip (#474's second field). `<tree> MM-DD HH:MM`, e.g. `p3-buildid 08-26 14:03`.
 *
 * BOTH FIELDS, because they catch different failures. The tree catches the one #836 is about — Figma
 * loading a different checkout's `dist/` than the one being edited. The build time catches the one the
 * tree cannot: the right tree, pulled but never rebuilt, since `dist/` is gitignored and no git
 * operation touches it. Year dropped and seconds dropped: the chip is a comparison against "did I just
 * build this", and at 210px the two fields that answer it are what fit.
 *
 * The web's forms pass through verbatim — a commit SHA and `'local'` are already the whole answer.
 *
 * THE `Z` IS KEPT, and it is the one character that stops this field causing the misread it exists to
 * prevent. `builtAt` is UTC, and the earlier slice cut the marker: a developer at UTC-5 building at 21:17
 * local read `08-27 02:17` — a staleness indicator dated **tomorrow**, which invites the conclusion that
 * the chip is broken rather than that the bundle is (#1100's review measured exactly that). Rendering
 * LOCAL time was the alternative and is declined for two reasons: it would make this module's output
 * depend on the viewer's timezone, so `test-build-identity.ts`'s literal expectations would pass only in
 * the timezone they were written in; and the `title` and the run report carry UTC, so a local-time chip
 * beside a UTC sentence trades one misread for another. One marker character, 12 not 11.
 */
export const buildChip = (raw: string): string => {
  const id = parseBuildId(raw);
  if (id.kind !== 'tree') return raw;
  return `${treeName(id.tree)} ${id.builtAt.slice(5, 16).replace('T', ' ')}Z`;
};

/**
 * The chip's `title` — the full identity, and for the web the two sentences #474 already shipped,
 * moved here verbatim so all three branches are asserted by one test rather than none.
 */
export const buildTitle = (raw: string): string => {
  const id = parseBuildId(raw);
  if (id.kind === 'local') return 'Built outside the deploy — no commit to report.';
  if (id.kind === 'commit') return `Deployed from commit ${id.commit}.`;
  return (
    `Built from ${id.tree} at ${id.builtAt}. ` +
    'Every checkout carries its own dist/ under the same plugin id, so this names the one Figma loaded.'
  );
};

/**
 * The run report's clause — the half of #836 that is seen without going looking for it.
 *
 * `null` when there is no tree identity, so the caller appends nothing rather than an empty clause —
 * the same shape as `apply-summary.ts`'s `staleNote`, and for the same reason.
 */
export const buildNote = (raw: string): string | null => {
  const id = parseBuildId(raw);
  return id.kind === 'tree' ? `Built from ${id.tree} at ${id.builtAt}.` : null;
};

/**
 * Append the clause to a summary, sentence-safely.
 *
 * The separator is a rule rather than a literal because the summaries it lands on end differently: the
 * theme write's ends in a count, and the component build's ends in `staleNote`'s full stop. A fixed
 * `'. '` produced `…build into a fresh page.. Built from …` on exactly the run where the reader is
 * already being told something went wrong.
 */
export const appendBuildNote = (summary: string, raw: string): string => {
  const note = buildNote(raw);
  if (note === null) return summary;
  if (summary === '') return note;
  return `${summary}${summary.endsWith('.') ? ' ' : '. '}${note}`;
};
