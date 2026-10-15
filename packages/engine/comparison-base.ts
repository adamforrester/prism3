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
