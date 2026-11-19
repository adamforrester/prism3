#!/usr/bin/env bash
# #3698 R4 (owner decision 2026-11-12): THE DOCS-ONLY EXEMPTION, decided. A pull request whose every changed file is
# documentation skips the browser jobs (`studio`, `plugin`, `chrome`, `chrome-shards`, `surfaces`) by a NAMED
# exemption, which the `gates` job records (`all-gates.sh`). It is never a bare skip.
#
# Run by ci.yml's `changes` job. It writes `docs_only=true|false` to $GITHUB_OUTPUT when that is set, and prints
# every changed file with its verdict, so the run shows why. Inputs, from the job's `env:`:
#   EVENT  the event name. Only `pull_request` can be exempt. A push to main and a merge-queue run never are.
#   BASE   the pull request's base SHA.   HEAD   its head SHA.
# FILES, when set, is the newline-separated file list itself, in place of the git diff (the test's input).
#
# WHICH FILES COUNT AS DOCS. `is_docs_file` below is the one statement of it. A file is docs when it is
#   - under `docs/`, except `docs/public/`, which the studio serves at /docs and the browser suites and the prose gates
#     in `surfaces` read; or
#   - a `.md` file outside `apps/`, `packages/`, `skills/` and `docs/public/`, other than the root `README.md`.
#     `packages/` holds bundle inputs written in markdown (the studio bundles `packages/engine/examples/*.design.md`),
#     `skills/` ships, and the root `README.md` is a subject of `lint-us-english`, which runs in `surfaces` (the
#     verdict on #3735, blocking 1).
# No file a prose gate scans may count as docs, or a docs-only PR would skip the gate that reads what it changed.
# The test holds that against each prose gate's own `--files` list, not against this list (docs/34).
# Everything else is not docs, and ONE non-docs file means no exemption. That set is narrower than "docs/** or *.md
# outside apps/", for the two reasons above; the PR that added it asks the owner to confirm it.
#
# THE SAFE DIRECTION. Every doubt resolves to "run everything": no files, a diff that fails, an event other than
# a pull request, or a missing SHA each print the reason and write `docs_only=false`. This script never fails the
# job, because a failed `changes` job would skip the browser jobs through `needs`, and `gates` would then have to
# tell that apart from an exemption.
#
# The test is `.github/scripts/test-docs-only.sh`.
set -u

is_docs_file() {
  case "$1" in
    docs/public/*) return 1 ;;
    docs/*) return 0 ;;
    apps/*|packages/*|skills/*) return 1 ;;
    README.md) return 1 ;;
    *.md) return 0 ;;
    *) return 1 ;;
  esac
}

decide() { # verdict, reason
  echo "docs-only exemption: $1 — $2"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "docs_only=$1" >> "$GITHUB_OUTPUT"; fi
  exit 0
}

if [ "${EVENT:-}" != "pull_request" ]; then decide false "event '${EVENT:-<unset>}' is not a pull request, so every job runs"; fi

if [ -n "${FILES+x}" ]; then
  files="$FILES"
else
  if [ -z "${BASE:-}" ] || [ -z "${HEAD:-}" ]; then decide false "no base or head SHA to diff, so every job runs"; fi
  # Three dots: what the pull request changed since it branched. `--no-renames` lists both sides of a rename.
  if ! files=$(git diff --name-only --no-renames "$BASE...$HEAD" 2>&1); then decide false "the diff failed ($files), so every job runs"; fi
fi

total=0; other=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  total=$((total + 1))
  if is_docs_file "$f"; then echo "  docs      $f"; else echo "  NOT DOCS  $f"; other=$((other + 1)); fi
done <<< "$files"

if [ "$total" -eq 0 ]; then decide false "no changed files were read, so every job runs"; fi
if [ "$other" -gt 0 ]; then decide false "$other of $total changed file(s) are not docs, so every job runs"; fi
decide true "all $total changed file(s) are docs, so the browser jobs are exempt"
