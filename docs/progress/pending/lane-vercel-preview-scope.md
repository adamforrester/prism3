## (2026-10-01) — Vercel deploys only `main` and the studio-editing branches; the ignore step's decisions are tested by running it

**STATUS: PR from `lane/vercel-preview-scope`.** CI and deploy configuration only (`vercel.json`, `apps/studio/vercel-ignore-check.mjs`). No ENGINE bump.

**Why.** On 2026-09-30 the parallel lanes hit Vercel's Hobby limit of 100 deployments a day, and several PRs showed a red Vercel status. That was not a code failure; `gates` is the check that counts. Almost every lane push deployed a preview:
- engine PRs touch files the studio bundle imports;
- every "merge main into the branch" commit diffs large against its first parent.

**The approach that was tried and dropped.** The first version of this PR narrowed previews inside the Ignored Build Step (`apps/studio/vercel-ignore.sh`), building them only for commits that touch `apps/studio/` and never for merge commits. Two problems came out of the independent review:
- **It could not save quota.** Vercel's docs say a build the Ignored Build Step cancels still counts as a deployment, and against concurrency.
- **It would have starved the redesign lane.** Its pushes are usually merge commits, so they would have skipped previews too.

That change is reverted, and the ignore script is identical to `main`'s.

**The change (owner decision, 2026-10-01: "only deploy PRs that touch the studio").** `vercel.json` gains `git.deploymentEnabled`, which stops a deployment from being created at all:
- **Disabled:** branches that don't edit the studio during the freeze. That is this lane (`lane/*`, `fold/*`, `docs/*`), session branches (`claude/*`) and the other prefixes in use (`archive/*`, `design/*`, `fix/*`, `feat/*`, `net/*`, `conv-*`).
- **Still deploying:** `main` (production) and the UI redesign lane's `ui/*`, the only branches that edit `apps/studio/src` until S13.

When the freeze lifts, a lane that edits the studio needs a `ui/*` branch, or an edit to this list, to get a preview.

**The gate.** `vercel-ignore-check.mjs` already checked the ignore step's exclusion list against esbuild's metafile. It now also:
- **runs the ignore script** against throwaway commits in a temp repo, asserting six production decisions as literal exit codes: no parent builds, a bundled engine change builds, an excluded engine file is skipped, a studio change builds, a plugin-only change is skipped, a `vercel.json` change builds;
- **asserts the deploy list** as literals: `lane/*`, `fold/*`, `docs/*` and `claude/*` are disabled; `main` and `ui/*` still deploy. A typo that disabled `main` would stop production deploys silently.

The scratch repo's git runs with a scrubbed environment, with no inherited `GIT_DIR`/`GIT_INDEX_FILE`, no global config, no hooks and no signing. The review showed an inherited `GIT_DIR`, as git hooks set, wrote the gate's commits into another repository. Tested: with `GIT_DIR` pointing at a scratch repo, the gate now writes nothing there.

**Mutations, each failing by name:**
- `main: false` fails "vercel.json leaves main deploying";
- dropping `vercel.json` from the script's paths fails "a vercel.json change BUILDS".

**Filed separately.** Production compares only `HEAD^..HEAD`. If Vercel auto-cancels an earlier build in a burst of pushes to `main`, an engine change can go undeployed. Diffing against `VERCEL_GIT_PREVIOUS_SHA` would close that. Pre-existing; filed as #1902.

**Not verifiable here.** The Vercel connector isn't authorized in this environment. The first push to a `lane/*` branch after merge should create no Vercel deployment at all.
