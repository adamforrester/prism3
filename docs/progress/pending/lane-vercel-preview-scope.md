## (2026-10-01) — Vercel previews build only for commits that touch the studio; production is unchanged

**STATUS: PR from `lane/vercel-preview-scope`.** CI and deploy tooling only (`apps/studio/vercel-ignore.sh` and its gate). No ENGINE bump.

**Why.** On 2026-09-30 the parallel lanes hit Vercel's Hobby limit of 100 deployments a day, and several PRs showed a red Vercel status. That was not a code failure; `gates` is the check that counts. The Ignored Build Step built a preview for almost every PR push, for two reasons:
- **Engine PRs count as site changes.** Almost every engine PR touches a file the studio bundle imports, so each counted as a site change.
- **Merge commits diff large.** The step compares each commit with its first parent, so every "merge main into the branch" commit diffed as all of main's changes since the last merge. The lanes make one before every push.

**The change (owner decision, 2026-10-01: "only deploy PRs that touch the studio").** When `VERCEL_ENV` is `preview`:
- a merge commit is skipped, because it only brings in main's changes and main's own production deploy covers them;
- any other commit builds only if it touches `apps/studio/` or `vercel.json`.

The production path is unchanged: any change to a bundle input still builds, so the live site never goes stale when engine code changes. An engine-only PR now gets no preview, which is the accepted cost. Uncertainty still builds: a commit with no parent fails the diff and exits 1.

**The gate.** `vercel-ignore-check.mjs` already checked the exclusion list against esbuild's metafile. It now also RUNS the script against throwaway commits in a temp repo and asserts eight decisions, each a literal exit code:
- a commit with no parent builds;
- an engine-only commit is skipped in a preview, and builds in production or with `VERCEL_ENV` unset;
- a studio commit builds in a preview;
- a plugin-only commit is skipped in production;
- a merge commit is skipped in a preview, and builds in production.

**Mutations** (each fails by name):
- removing the preview branch fails "an engine-only commit is SKIPPED in a preview" and the merge case;
- removing only the merge skip fails "a merge commit is SKIPPED in a preview, even when it brings studio changes".

**Not checked here.** The Vercel connector isn't authorized in this environment, so nothing confirms that Vercel sets `VERCEL_ENV=preview` in the Ignored Build Step. Vercel documents it as a system environment variable available there. If it were unset, every preview would take the production path, which is today's behavior: a fallback, not a stale site.
