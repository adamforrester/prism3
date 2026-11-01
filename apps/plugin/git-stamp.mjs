/**
 * THE COMMIT A PLUGIN BUILD CAME FROM (#3239, owner decision Q-SI1 A).
 *
 * On 2026-10-31 the owner rebuilt the plugin after #3214 merged, and the rebuilt plugin still had the bug. A
 * license prompt from the host's developer tools had silently blocked `git pull`, so the checkout was stale.
 * The build stamp (`tree-<8 hex>`, `build.mjs`) hashes the folder path, so it read the same on every build
 * and could not show that. So every build also stamps the short commit and whether the tree is dirty, warns
 * when the checkout is behind `origin/main`, and says so plainly when `git` cannot run at all.
 *
 * WHY A COMMIT NOW, when #836 chose the tree over a commit: #836's argument still holds (two worktrees on one
 * commit are a normal state, so a commit cannot say which tree Figma loaded). The commit is ADDED, not
 * swapped in: the tree says which checkout, the commit says how current that checkout is. #836 never
 * weighed the second question, and it is the one 2026-10-31 asked.
 *
 * Every git call goes through `run`, so the test (`test-git-stamp.ts`) stubs git and depends on nothing
 * about the machine it runs on. `run(args)` returns `{ status, stdout, stderr }`, with `status` null and
 * `error` set when the process could not start.
 *
 * WORDING IS DRAFT for the owner (#3239): the stamp's `git-unavailable` field and every printed line.
 */

/** The field that stands in for a commit when git cannot answer. A literal, so the test can name it. */
export const NO_GIT = 'git-unavailable';

/** The first non-empty line of git's own complaint, so the warning carries what git said. */
const firstLine = (r) => `${r.stderr ?? ''}\n${r.stdout ?? ''}`.split('\n').map((l) => l.trim()).find(Boolean)
  ?? (r.error ? String(r.error.message ?? r.error) : `exit ${r.status}`);

/**
 * The commit field: `<short sha>`, `<short sha>-dirty`, or `NO_GIT`, plus the lines to print. `dirty` counts
 * untracked files too, because an untracked source file can be in the bundle.
 */
export const commitStamp = (run) => {
  const head = run(['rev-parse', '--short=8', 'HEAD']);
  const sha = head.status === 0 ? head.stdout.trim() : '';
  if (!/^[0-9a-f]{7,40}$/.test(sha)) {
    return {
      field: NO_GIT,
      warnings: [
        `⚠ git did not run, so this build cannot say which commit it came from: ${firstLine(head)}`,
        '  The plugin will show "git-unavailable" in place of a commit. Fix git, then pull and rebuild.',
      ],
    };
  }
  const status = run(['status', '--porcelain']);
  if (status.status !== 0) {
    return {
      field: NO_GIT,
      warnings: [
        `⚠ git found commit ${sha} but could not read the working tree: ${firstLine(status)}`,
        '  The plugin will show "git-unavailable" in place of a commit. Fix git, then rebuild.',
      ],
    };
  }
  return { field: status.stdout.trim() ? `${sha}-dirty` : sha, warnings: [] };
};

/**
 * Whether the checkout is behind `origin/main`. Never fails the build: a fetch that cannot run (offline, no
 * remote) is one plain note, and a checkout that is current prints nothing.
 */
export const behindStamp = (run) => {
  const fetched = run(['fetch', '--quiet', 'origin', 'main']);
  if (fetched.status !== 0) {
    return { behind: null, warnings: [`  Could not fetch origin/main, so this build cannot say whether the checkout is behind: ${firstLine(fetched)}`] };
  }
  const count = run(['rev-list', '--count', 'HEAD..origin/main']);
  const n = count.status === 0 ? Number(count.stdout.trim()) : NaN;
  if (!Number.isInteger(n)) {
    return { behind: null, warnings: [`  Could not count commits against origin/main: ${firstLine(count)}`] };
  }
  if (n === 0) return { behind: 0, warnings: [] };
  return {
    behind: n,
    warnings: [`⚠ This checkout is ${n} commit${n === 1 ? '' : 's'} behind origin/main. Pull, then rebuild, to get the latest fixes.`],
  };
};

/**
 * The whole stamp, `<ISO seconds> <tree token> <commit field>`, as `build.mjs` writes it into both bundles. Here
 * rather than inline in `build.mjs` so the test drives the real composition with a stubbed git, and a stamp that
 * drops the commit fails `stamp/commit` by name. `warn` receives each line the build prints.
 */
export const composeBuildId = (builtAt, treeToken, run, warn = console.warn) => {
  const commit = commitStamp(run);
  for (const w of commit.warnings) warn(w);
  return `${builtAt} ${treeToken} ${commit.field}`;
};

/**
 * A RELEASE IS BUILT ONLY FROM A CLEAN, CURRENT COMMIT (#3147, the owner's Q3147.16 A). A dev build keeps #3239's
 * warnings; `--release` refuses to build when the commit field is `-dirty` or `NO_GIT`, or when the checkout is behind
 * `origin/main`, or when it cannot tell whether it is behind (`behind` null: no fetch, no count). A warning in a
 * terminal is easy to miss when publishing to an org, and on 2026-10-31 a stale checkout shipped a fixed bug back.
 *
 * `strict` is false only under `CI` (GitHub Actions sets it, and `verify.ts` sets it for every gate). There the release
 * build is a gate, never published, and `main` moving under a running check would turn it red for nothing; so it warns
 * with the same reasons and builds. The owner's own `npm run -w @prism3/plugin build:release` runs without `CI`, so a
 * build made for publishing is always held to this.
 *
 * Returns the problems, the lines to print, and whether to stop before writing anything.
 */
export const releaseCheck = (commitField, behind, strict) => {
  const problems = [];
  if (commitField === NO_GIT) problems.push('git could not say which commit this is');
  else if (commitField.endsWith('-dirty')) problems.push(`the working tree has changes not committed (${commitField})`);
  if (behind === null) problems.push('it cannot tell whether the checkout is behind origin/main');
  else if (behind > 0) problems.push(`the checkout is ${behind} commit${behind === 1 ? '' : 's'} behind origin/main`);
  if (!problems.length) return { problems, refuse: false, lines: [] };
  if (!strict) {
    return { problems, refuse: false, lines: [`⚠ This release build is not one to publish (CI, so it builds anyway): ${problems.join('; ')}.`] };
  }
  return {
    problems,
    refuse: true,
    lines: [
      `✗ Release build refused: ${problems.join('; ')}.`,
      '  A release is built only from a clean checkout at the tip of origin/main. Commit or stash, pull, then rebuild.',
    ],
  };
};
