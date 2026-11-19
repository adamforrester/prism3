#!/usr/bin/env bash
# Q503 A — the `gates` job's one step: green only when every gate job it waits on finished `success`.
#
# Run by ci.yml's "Every gate job succeeded" step, with NEEDS set to `${{ toJSON(needs) }}`:
#   {"engine":{"result":"success","outputs":{}}, "chrome":{"result":"failure",...}, ...}
#
# WHY A SCRIPT AND NOT `needs:` ALONE. A job whose `needs` failed is SKIPPED, and a required check that
# reads `skipped` lets the PR merge. So the `gates` job runs `if: always()` and decides here. Every result
# other than `success` fails it, by job name: `failure`, `cancelled`, and `skipped` (a gate job that did
# not run is not a pass). An empty or unreadable NEEDS fails too, so the step cannot pass by reading
# nothing. Which jobs NEEDS must hold is `lint-doc-gates.ts`'s check, against the workflow's own job list.
#
# THE ONE NAMED EXEMPTION (#3698 R4). A docs-only pull request skips the browser jobs. A skipped job passes here
# ONLY when all three hold: it is in EXEMPT_JOBS, the `changes` job finished `success`, and its `docs_only` output is
# exactly `true` (`docs-only.sh` decides it). Each such job prints as EXEMPT with the exemption's name, and the run's
# summary records it, so a green `gates` over a skipped browser job always says why. Any other skip still fails.
# `lint-doc-gates.ts` holds EXEMPT_JOBS to the jobs in ci.yml that carry the exemption's `if:`, in both directions.
#
# The test is `.github/scripts/test-all-gates.sh` (the base cases) and `.github/scripts/test-docs-only.sh` (the
# exemption's cases).
set -u

EXEMPTION='DOCS-ONLY EXEMPTION (#3698 R4)'
EXEMPT_JOBS="studio plugin chrome chrome-shards surfaces"

if ! count=$(printf '%s' "${NEEDS:-}" | jq -e 'if type == "object" then length else error("not an object") end' 2>/dev/null); then
  echo "::error::NEEDS is not a JSON object of job results, so no gate job can be read: ${NEEDS:-<unset>}"
  exit 1
fi
if [ "$count" -eq 0 ]; then
  echo "::error::NEEDS lists no jobs, so this step would pass having read nothing."
  exit 1
fi

docs_only=$(printf '%s' "$NEEDS" | jq -r 'if .changes.result == "success" and .changes.outputs.docs_only == "true" then "true" else "false" end')
exempt_json=$(printf '%s' "$EXEMPT_JOBS" | jq -R 'split(" ")')

printf '%s' "$NEEDS" | jq -r --arg d "$docs_only" --argjson ex "$exempt_json" \
  'to_entries[] | "  \(.key): \(.value.result)\(if $d == "true" and .value.result == "skipped" and (.key as $k | $ex | index($k)) then " — EXEMPT" else "" end)"'
exempted=$(printf '%s' "$NEEDS" | jq -r --arg d "$docs_only" --argjson ex "$exempt_json" \
  '[to_entries[] | select($d == "true" and .value.result == "skipped" and (.key as $k | $ex | index($k))) | .key] | join(", ")')
bad=$(printf '%s' "$NEEDS" | jq -r --arg d "$docs_only" --argjson ex "$exempt_json" \
  '[to_entries[] | select(.value.result != "success")
    | select(($d == "true" and .value.result == "skipped" and (.key as $k | $ex | index($k))) | not)
    | "\(.key) (\(.value.result))"] | join(", ")')
if [ -n "$bad" ]; then
  echo "::error::Not every gate job succeeded: $bad"
  exit 1
fi
if [ -n "$exempted" ]; then
  line="$EXEMPTION: skipped $exempted, because every changed file is docs (the \`changes\` job lists them)."
  echo "$line"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then echo "$line" >> "$GITHUB_STEP_SUMMARY"; fi
  echo "Every gate job of $count succeeded or was exempt by name."
  exit 0
fi
echo "All $count gate jobs succeeded."
