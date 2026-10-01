## (2026-10-01) — The Vercel ignore step compares with the last deployment, not the previous commit (#1953)

**STATUS: PR open from `ui/vercel-ignore-previous-sha`.** Deploy configuration only: no engine change, no emitted artifact moves, no ENGINE bump.

**What was wrong.** `apps/studio/vercel-ignore.sh` skipped the build when `git diff HEAD^ HEAD` over the bundle's inputs was empty, so it compared only the newest commit with its parent. A branch whose newest commit touched only docs was skipped even when an earlier commit on it changed the app. This left #1951 (S4a) with no preview at all: its push ended in a fragment-status commit, and a dashboard Redeploy runs the same step and was skipped again.

**The fix.** The base is now `VERCEL_GIT_PREVIOUS_SHA`, the last commit Vercel successfully deployed for the branch. With no previous deployment (a new branch), or a SHA the clone doesn't have (shallow clone, force-push), it builds, keeping the script's rule that uncertainty always builds. Building more often costs build minutes, not quota: Vercel counts a skipped build as a deployment anyway.

**The gate.** `vercel-ignore-check.mjs` runs the real script against throwaway commits. Its existing cases now pass the previous commit as the deployed one. Three cases are new:
- no previous deployment builds;
- an unknown previous SHA builds;
- the #1953 case: an app commit, then a docs-only commit, against the deployment before both, builds.

A docs-only push on top of the deployed commit still skips.

**Mutation.** Putting `HEAD^` back as the base fails with `a docs-only newest commit BUILDS when an earlier commit since the last deployment changed the app (#1953) (exit 0, want 1 — BUILD)`.

**Not verified here.** That Vercel sets `VERCEL_GIT_PREVIOUS_SHA` in the Ignored Build Step on this project is documented by Vercel, not observed in this repo. If it turns out unset, every push builds, which is safe. The first preview after this merges will show which.
