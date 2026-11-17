/**
 * THE BASE A GIT-HISTORY GATE COMPARES AGAINST, ON THE BASE BRANCH ITSELF (#2556).
 *
 * Five engine gates read a "before" out of git at the merge base of HEAD and the base branch:
 * `lint-emission-version.ts`, `lint-component-surface.ts`, `lint-component-renames.ts`,
 * `lint-materialization-renames.ts` and `lint-contract-version.ts` (#2334). Each resolves its base ref with its own ladder and keeps doing so
 * (the reasons are in `lint-materialization-renames.ts`); this file holds only the one step after it.
 *
 * On main's push run the merge base of HEAD and `origin/main` is HEAD itself, so a gate that compares
 * the merge base with HEAD compares a squash commit with itself, finds nothing, and passes. A squash
 * whose own diff breaks the gate's rule (two PRs that each passed against a base that no longer exists,
 * merged without a git conflict) lands green. GitHub does not re-run a PR's CI when its base moves, so
 * main's push run is the only run that sees the squash, and it was not looking. #2551 was this gap in
 * `apps/plugin/lint-executor-revision.ts`, closed by #2555; this is the same fix for the four.
 *
 * So when the merge base is HEAD, the gate compares against HEAD's FIRST PARENT instead: on main that is
 * the commit the squash landed on, and the diff between them is exactly what the squash merged. The
 * merge base is replaced rather than kept beside the parent: a comparison of HEAD with itself can see
 * only an uncommitted edit, and the parent's comparison sees that edit too.
 *
 * A HEAD on the base branch with no first parent CANNOT RUN; it does not fall back to the merge base,
 * which would be the self-comparison this file exists to stop. In CI, `ci.yml`'s `fetch-depth: 0`
 * provides the history.
 *
 * Shared on purpose, unlike the ladders: this is not a gate's subject, and five copies of one rule
 * about which commit is "before" would drift exactly as the five ladders' wording has. What keeps the
 * sharing honest is `lint-push-base.ts`, which replays a squash on main against each of the five real
 * gates and requires each to fail by its own named assertion; a regression here fails all five there.
 */

export type Git = (...args: string[]) => { ok: boolean; out: string; err: string };

export interface ComparisonBase {
  /** The commit to read the "before" side at. */
  base: string;
  /** True when HEAD is already on the base branch, so `base` is HEAD's first parent. */
  onBase: boolean;
  /** How the base was chosen, for the gate's report line. */
  label: string;
}

/** The base to compare against, given the merge base the gate already resolved. `die` must not return. */
export const comparisonBase = (git: Git, mergeBase: string, die: (lines: string[]) => never): ComparisonBase => {
  const head = git('rev-parse', 'HEAD');
  if (!head.ok || !head.out.trim()) return die(['cannot resolve HEAD — this check CANNOT RUN.', `    ${head.err || '(git printed nothing)'}`]);
  if (head.out.trim() !== mergeBase) return { base: mergeBase, onBase: false, label: 'merge base' };
  const parent = git('rev-parse', '--verify', '--quiet', 'HEAD^1^{commit}');
  if (!parent.ok || !parent.out.trim())
    return die([
      'HEAD is on the base branch and has no first parent — this check CANNOT RUN (#2556).',
      '  On the base branch the merge base is HEAD itself, so comparing against it compares a commit with',
      '  itself and passes anything. The first parent is the only base that sees what this commit merged.',
      '  In CI, `ci.yml` sets `fetch-depth: 0`; locally, `git fetch --unshallow`.',
    ]);
  return { base: parent.out.trim(), onBase: true, label: 'first parent — HEAD is on the base branch, so the merge base is HEAD itself (#2556)' };
};

/**
 * THE BASE WHEN HEAD CARRIES `main` THAT ITS BASE BRANCH LACKS (#3833) — a long-lived integration branch
 * refreshed from `main`.
 *
 * A PR into a branch other than `main` reads its "before" at the merge base with that branch. When the PR
 * merges `main` in, that before predates everything `main` merged since, so the diff holds `main`'s own work
 * too: its change notes, its folds, its executor revisions. Each of those was judged by its own PR's run
 * against `main`, and judged again here against a base it never had, it reads as wrong: #3833 refreshed the
 * POC branch with 205 commits of `main`, and `lint-emission-version.ts` failed notes `main` had already
 * passed, `lint-progress-order.ts` read `main`'s folds as this diff's fold, and `lint-executor-reach.ts`
 * measured five of `main`'s executor revisions as one.
 *
 * So when the merge base of HEAD and `main` is NOT already in the PR's merge base, the before is that
 * commit instead: the newest `main` the PR carries. Measured from there, `main`'s side is out of the diff,
 * and what is left is the base branch's own delta over `main`, the refresh's resolutions included. The
 * branch's own earlier work is in that delta too, which judges it again, cumulatively, against `main`:
 * stricter than its own PRs were, never looser about anything `main` did not already hold.
 *
 * Returns null, and the gate keeps its merge base, when the base ref is `main`, when no `main` ref resolves
 * (the old behavior, which fails loud rather than passes), or when the PR carries no `main` its base lacks:
 * an ordinary PR into an integration branch, every PR into `main`, a merge-group run, a push run on `main`.
 */
export const integrationBase = (git: Git, baseRef: string, mergeBase: string): ComparisonBase | null => {
  if (baseRef === 'origin/main' || baseRef === 'main') return null;
  const mainRef = ['origin/main', 'main'].find((c) => git('rev-parse', '--verify', '--quiet', `${c}^{commit}`).ok);
  if (!mainRef) return null;
  const mp = git('merge-base', 'HEAD', mainRef);
  if (!mp.ok || !mp.out.trim()) return null;
  const point = mp.out.trim();
  // Commits reachable from `point` and not from the merge base: zero means the base already holds this main.
  const ahead = git('rev-list', '--count', `${mergeBase}..${point}`);
  if (!ahead.ok || Number(ahead.out.trim()) === 0) return null;
  return {
    base: point,
    onBase: false,
    label: `merge base with ${mainRef} — HEAD carries ${ahead.out.trim()} ${mainRef} commit(s) ${baseRef} lacks, judged by their own runs (#3833)`,
  };
};
