#!/usr/bin/env bash
# Vercel's Ignored Build Step (#474 follow-on). Decides whether a commit can change the deployed
# site at all; if it cannot, the build is skipped.
#
# EXIT CODES ARE INVERTED FROM INTUITION AND THIS IS THE WHOLE FOOTGUN:
#   exit 0 → SKIP the build      exit 1 → RUN the build
# Getting them backwards fails silently toward a stale site, which is exactly the defect #474/#475
# were about, so every path below normalizes to one of those two codes explicitly.
#
# WHY A SCRIPT AND NOT A ONE-LINER IN vercel.json. Same reason `headers` is documented in
# apps/studio/README.md: vercel.json is JSON and cannot hold the reasoning. The reasoning is the part that
# stops someone "simplifying" this into a stale deploy.
#
# WHAT CAN CHANGE THE SITE. Vercel runs `build:site --workspace @prism3/studio`, which bundles
# `apps/studio/src/entry.ts` (which imports `main.ts`) and copies `apps/studio/index.html`. Measured against esbuild's own metafile, that
# bundle's only out-of-`apps/studio/` inputs are `packages/engine/**` and `packages/engine/schema/**`. The Figma plugin
# is NOT part of this build and cannot affect the deployed site, so `apps/plugin/**` is deliberately
# absent from the trigger list.
#
# WHY EXCLUSIONS RATHER THAN A LIST OF BUNDLED FILES. Only 26 of the engine's 52 `.ts` files are
# actually imported by the bundle; the rest are CLI entry points, emitters, gates and the test
# suite. Listing the 26 would be more precise and would fail in the DANGEROUS direction: a new
# engine file that the bundle does import would be missing from the list, so its changes would skip
# the build and the site would go quietly stale. Listing the 26 excluded fails the other way — a new
# file is unlisted, so it triggers a build it may not need. A wasted build is cheap; a stale deploy is
# the bug we are fixing. `apps/studio/vercel-ignore-check.mjs` gates the list against the real metafile so an
# excluded file that later gets imported is caught in CI rather than in production.
#
# THREE FILES CAME OFF THIS LIST IN #804, and the reason is worth stating because the obvious reading
# of it is wrong. `apps/studio/src/main.ts` now imports `figmaAnatomySet` to derive which component defs
# can be materialized, which pulls in `anatomy-figma.ts` → `component-schema.ts` → `eval.ts`. The
# derivation is gated on `PRISM3_HOST === 'figma'`, so the *web* build eliminates the defs and almost
# all of the projector — measured, the gate takes the web bundle from 176KB gzip back to 147KB against a
# 140KB baseline.
#
# It does NOT eliminate all of it: 18KB of `anatomy-figma.ts` survives into the web output, because that
# module's top-level template constants are not provably side-effect-free and esbuild will not drop them.
# So a change to any of the three CAN change the deployed site, the gate is literally right, and the
# tempting fix — leaving them excluded because "the feature is Figma-only" — would be the #474 stale
# deploy with a rationale attached. Dead-code elimination is a size optimization, not a dependency
# boundary, and this list is about the boundary.

set -uo pipefail

# --- begin excluded (engine files the deployed bundle does not import; gated by
# --- apps/studio/vercel-ignore-check.mjs, which fails CI if any of these becomes a bundle input)
EXCLUDED=(
  ai-metadata.ts
  cli.ts
  emit-brandinput.ts
  emit-dtcg.ts
  emit-figma-color.ts
  emit-figma-dims.ts
  emit-figma-font.ts
  emit-figma-styles.ts
  emit-figma.ts
  emit-levers.ts
  emit-preview.ts
  eval-run.ts
  fidelity.ts
  lint-skills.ts
  lint-us-english.ts
  materialise-to-figma.ts
  mcp-test.ts
  mcp.ts
  nb-fixture.ts
  nb-regression.ts
  read-back.ts
  regen.ts
  test.ts
  token-contract.ts
  visualize.ts
  write-plan.ts
)
# --- end excluded

# PREVIEWS ARE NARROWER THAN PRODUCTION (owner decision, 2026-10-01). The Hobby plan allows 100
# deployments a day, and on 2026-09-30 the lanes hit it: almost every engine PR touches a bundled engine
# file, and every "merge main into the branch" commit diffs as all of main's changes against its first
# parent. So a PR preview builds only when the commit itself touches the studio, and never for a merge
# commit (it only brings in main's changes, which main's own production deploy covers). PRODUCTION is
# unchanged below: any change to a bundle input still builds, so the live site never goes stale. A
# preview that skips an engine-only change is a stale PREVIEW, which is the accepted cost.
# `VERCEL_ENV` is set by Vercel in the Ignored Build Step; locally it is unset, which takes the
# production path. Uncertainty still resolves toward building: a commit with no parent fails the diff
# and exits 1.
if [ "${VERCEL_ENV:-}" = "preview" ]; then
  if git rev-parse -q --verify 'HEAD^2' >/dev/null 2>&1; then exit 0; fi
  git diff --quiet HEAD^ HEAD -- apps/studio vercel.json || exit 1
  exit 0
fi

PATHS=(apps/studio packages/engine/schema vercel.json package.json package-lock.json packages/engine)
for f in "${EXCLUDED[@]}"; do PATHS+=(":(exclude)packages/engine/$f"); done

# `--quiet` exits 0 when the diff is empty and 1 when it is not. Anything else (a shallow clone with
# no HEAD^, a bad ref) is an ERROR, not a "nothing changed" — so it must build. The `|| exit 1`
# catches every non-zero code, error and change alike, and only a genuinely empty diff reaches
# `exit 0`. Uncertainty always resolves toward building.
git diff --quiet HEAD^ HEAD -- "${PATHS[@]}" || exit 1
exit 0
