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
# The test is `.github/scripts/test-all-gates.sh`.
set -u

if ! count=$(printf '%s' "${NEEDS:-}" | jq -e 'if type == "object" then length else error("not an object") end' 2>/dev/null); then
  echo "::error::NEEDS is not a JSON object of job results, so no gate job can be read: ${NEEDS:-<unset>}"
  exit 1
fi
if [ "$count" -eq 0 ]; then
  echo "::error::NEEDS lists no jobs, so this step would pass having read nothing."
  exit 1
fi

printf '%s' "$NEEDS" | jq -r 'to_entries[] | "  \(.key): \(.value.result)"'
bad=$(printf '%s' "$NEEDS" | jq -r '[to_entries[] | select(.value.result != "success") | "\(.key) (\(.value.result))"] | join(", ")')
if [ -n "$bad" ]; then
  echo "::error::Not every gate job succeeded: $bad"
  exit 1
fi
echo "All $count gate jobs succeeded."
