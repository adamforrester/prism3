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
 * THE BASE OF A MERGE-QUEUE RUN (#4106). Under `merge_group` GitHub checks out the queue's own commit: `main`, plus
 * every group ahead of this one in the queue, plus this PR. `GITHUB_BASE_REF` is empty there, so before this every
 * ladder fell to `origin/main`, and its merge base with HEAD is `main`'s tip. The diff then held the groups ahead too.
 * Two queued PRs that each raised `EXECUTOR_REVISION` from N to N+1 read as one raise and both passed, and a PR with no
 * progress entry passed on the entry of the PR ahead of it. That is the semantic staleness the queue exists to catch.
 *
 * The right before is the merge group's parent commit, `github.event.merge_group.base_sha` ("The SHA of the merge
 * group's parent commit", GitHub's REST description): `main` with the groups ahead already in it. `ci.yml` passes it
 * as `MERGE_GROUP_BASE_SHA` at the workflow level, so every job and every gate sees it.
 *
 * Null outside a merge-group run (`GITHUB_EVENT_NAME` is not `merge_group`), and the caller's ladder runs as before.
 * Inside one, this rung is AUTHORITATIVE and never falls through to `origin/main`: `ref` is the SHA only when it is set,
 * names a commit, is an ancestor of HEAD and is not HEAD. Otherwise `ref` is null, and the caller's "no base ref" path
 * fails the gate, so a merge-group run whose base was lost CANNOT RUN rather than passes against the wrong diff.
 * `tried` is the one line the caller adds to its report.
 */
export const mergeGroupBase = (git: Git, env: NodeJS.ProcessEnv = process.env): { ref: string | null; tried: string } | null => {
  if (env.GITHUB_EVENT_NAME !== 'merge_group') return null;
  const sha = (env.MERGE_GROUP_BASE_SHA ?? '').trim();
  const say = (why: string) => `MERGE_GROUP_BASE_SHA (merge group, authoritative) — ${why}`;
  if (!sha) return { ref: null, tried: say('unset or empty, so this run has no base. `ci.yml` sets it from `github.event.merge_group.base_sha`') };
  const r = git('rev-parse', '--verify', '--quiet', `${sha}^{commit}`);
  if (!r.ok || !r.out.trim()) return { ref: null, tried: say(`${sha} does not resolve to a commit`) };
  const base = r.out.trim();
  const head = git('rev-parse', 'HEAD');
  if (!head.ok || head.out.trim() === base) return { ref: null, tried: say(`${sha.slice(0, 8)} is HEAD itself, so there is no queued diff to read`) };
  if (!git('merge-base', '--is-ancestor', base, 'HEAD').ok) return { ref: null, tried: say(`${sha.slice(0, 8)} is not an ancestor of HEAD, so it is not this group's parent`) };
  return { ref: base, tried: say(`${base.slice(0, 8)} resolves, an ancestor of HEAD`) };
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
  const carried = carriedMain(git, baseRef);
  if (!carried) return null;
  const { mainRef, point } = carried;
  // Commits reachable from `point` and not from the merge base: zero means the base already holds this main.
  const ahead = git('rev-list', '--count', `${mergeBase}..${point}`);
  if (!ahead.ok || Number(ahead.out.trim()) === 0) return null;
  return {
    base: point,
    onBase: false,
    label: `merge base with ${mainRef} — HEAD carries ${ahead.out.trim()} ${mainRef} commit(s) ${baseRef} lacks, judged by their own runs (#3833)`,
  };
};

/**
 * THE `main` A TREE ON ANOTHER BASE BRANCH CARRIES (#3863): the merge base of HEAD and `main`, and which ref
 * named `main`. `integrationBase` reads a PR's "before" there only when the PR brings that `main` in; a gate
 * that walks HISTORY rather than diffing two trees needs it on every PR into the branch.
 *
 * An integration branch refreshed from `main` by a squash (#3833, a96bdd6a on `poc/arm-1`) holds a single-parent
 * commit that sets `ENGINE_VERSION` to `main`'s version, with a diff spanning everything `main` merged since the
 * branch last met it. That commit sits on the branch's first-parent chain for good, so a gate that reads the commit
 * setting a version as its fold reads that squash as the fold, on every later PR into the branch, refresh or not.
 * Walked from here instead, the history is `main`'s own, where each version's fold is the commit that folded it.
 *
 * Null when the base ref is `main` (the gate stays on HEAD's own history, as strict as it was), when no `main` ref
 * resolves, or when HEAD and `main` share no commit: the caller keeps HEAD, which fails loud rather than passes.
 */
export const carriedMain = (git: Git, baseRef: string): { mainRef: string; point: string } | null => {
  if (baseRef === 'origin/main' || baseRef === 'main') return null;
  // A merge-group run's base is the group's parent, which is `main` or a group the queue lands on `main` next
  // (`mergeGroupBase`, #4106). It carries no `main` its base lacks, and `origin/main` may already be behind it.
  if (process.env.GITHUB_EVENT_NAME === 'merge_group') return null;
  const mainRef = ['origin/main', 'main'].find((c) => git('rev-parse', '--verify', '--quiet', `${c}^{commit}`).ok);
  if (!mainRef) return null;
  const mp = git('merge-base', 'HEAD', mainRef);
  if (!mp.ok || !mp.out.trim()) return null;
  return { mainRef, point: mp.out.trim() };
};
