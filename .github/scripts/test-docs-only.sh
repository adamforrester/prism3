#!/usr/bin/env bash
# #3698 R4 — the test for the docs-only exemption: the classifier (`docs-only.sh`) and the aggregator's half of it
# (`all-gates.sh`). No git, no network: the classifier reads FILES, the aggregator reads NEEDS.
#
#   bash .github/scripts/test-docs-only.sh
#
# Every expected verdict is typed here, per case, never computed from the classifier's own rule (docs/34).
#
# Cases, by name:
#   classify/…   one file list each → the `docs_only` the classifier must write.
#                The load-bearing one is classify/docs+app: a docs change that ALSO touches an app file is not exempt.
#   event/…      a push, a merge-queue run and an unset event are never exempt, whatever the files.
#   aggregate/…  NEEDS → all-gates.sh's exit, and the EXEMPT record when the exemption applies.
#   scope/…      each prose gate (`lint-us-english`, `lint-voice`) lists what it scans (`--files`), and the classifier
#                must call EVERY one of those files not docs: a PR that touches a prose gate's subject is never exempt,
#                so the prose gates still run on it. The list is the gate's own, never the classifier's (docs/34), so a
#                surface either side adds is checked without editing this file. Needs `npx tsx` (CI's engine job).
# Mutations, each failing here by name (measured when this was added):
#   - `is_docs_file`'s `apps/*|packages/*|skills/*) return 1` line deleted → classify/docs+app-md, classify/docs+design-md,
#     classify/skills.
#   - the per-file verdict removed (no file counted as not docs) → classify/docs+app, classify/docs+app-md,
#     classify/docs+design-md, classify/docs-public, classify/skills, classify/code.
#   - all-gates.sh's exemption made unconditional (its `docs_only == "true"` tests made `true`) → aggregate/no-exemption-skip,
#     aggregate/changes-failed.
#   - `engine` added to all-gates.sh's EXEMPT_JOBS → aggregate/engine-never-exempt.
#   - `is_docs_file`'s `README.md) return 1` line deleted (the verdict on #3735, blocking 1) → classify/root-readme,
#     scope/lint-us-english.
#   - all-gates.sh's `docs_only == "true"` loosened to `!= "false"` (an absent output read as an exemption) →
#     aggregate/docs-only-absent.
set -u

HERE=$(cd "$(dirname "$0")" && pwd)
CLASSIFIER="${CLASSIFIER:-$HERE/docs-only.sh}"
AGGREGATOR="${AGGREGATOR:-$HERE/all-gates.sh}"
fails=0
check() { # name, condition-result (0 = held)
  if [ "$2" -eq 0 ]; then echo "  ok   $1"; else echo "  FAIL $1"; fails=$((fails + 1)); fi
}
classify() { # event, files → sets `verdict` from the GITHUB_OUTPUT line
  local out; out=$(mktemp)
  EVENT="$1" FILES="$2" GITHUB_OUTPUT="$out" bash "$CLASSIFIER" > /dev/null 2>&1
  verdict=$(sed -n 's/^docs_only=//p' "$out"); rm -f "$out"
}
nl=$'\n'

classify pull_request "docs/34-gate-independence.md${nl}docs/progress/pending/x.md"
check 'classify/docs' "$([ "$verdict" = true ]; echo $?)"
classify pull_request "CONTRIBUTING.md${nl}tools/x/README.md${nl}.github/ISSUE_TEMPLATE/bug.md"
check 'classify/root-and-tool-md' "$([ "$verdict" = true ]; echo $?)"
classify pull_request "README.md"
check 'classify/root-readme' "$([ "$verdict" = false ]; echo $?)"
classify pull_request "docs/progress/pending/x.md${nl}apps/studio/src/main.ts"
check 'classify/docs+app' "$([ "$verdict" = false ]; echo $?)"
classify pull_request "docs/progress/pending/x.md${nl}apps/plugin/README.md"
check 'classify/docs+app-md' "$([ "$verdict" = false ]; echo $?)"
classify pull_request "docs/progress/pending/x.md${nl}packages/engine/examples/harbor.design.md"
check 'classify/docs+design-md' "$([ "$verdict" = false ]; echo $?)"
classify pull_request "docs/public/guides/index.md"
check 'classify/docs-public' "$([ "$verdict" = false ]; echo $?)"
classify pull_request "skills/prism3-theme/SKILL.md"
check 'classify/skills' "$([ "$verdict" = false ]; echo $?)"
classify pull_request "docs/x.md${nl}.github/workflows/ci.yml"
check 'classify/code' "$([ "$verdict" = false ]; echo $?)"
classify pull_request ""
check 'classify/empty' "$([ "$verdict" = false ]; echo $?)"

for e in push merge_group ""; do
  classify "$e" "docs/x.md"
  check "event/${e:-unset}" "$([ "$verdict" = false ]; echo $?)"
done

# A docs-only PR must still run the prose gates on what it touches: no file a prose gate scans may classify as docs.
# Each gate's `--files` exits before scanning and prints repo-relative paths; a floor guards an empty list (a gate that
# listed nothing would pass this vacuously).
ROOT=$(cd "$HERE/../.." && pwd)
for gate in lint-us-english lint-voice; do
  list=$(cd "$ROOT" && npx tsx "packages/engine/$gate.ts" --files 2>/dev/null)
  n=$(grep -c . <<<"$list")
  docs=$(EVENT=pull_request FILES="$list" bash "$CLASSIFIER" 2>/dev/null | sed -n 's/^  docs      //p')
  [ -z "$docs" ] || echo "       $gate scans file(s) the classifier calls docs: $(tr '\n' ' ' <<<"$docs")"
  check "scope/$gate" "$([ "$n" -ge 100 ] && [ -z "$docs" ]; echo $?)"
done

run() { out=$(NEEDS="$1" bash "$AGGREGATOR" 2>&1); code=$?; }
ok='{"result":"success","outputs":{}}'
skip='{"result":"skipped","outputs":{}}'
docs='{"result":"success","outputs":{"docs_only":"true"}}'
code_='{"result":"success","outputs":{"docs_only":"false"}}'
browser="\"studio\":$skip,\"plugin\":$skip,\"chrome\":$skip,\"chrome-shards\":$skip,\"surfaces\":$skip"

run "{\"changes\":$docs,\"engine\":$ok,$browser}"
check 'aggregate/exempt/exit' "$([ "$code" -eq 0 ]; echo $?)"
check 'aggregate/exempt/recorded' "$(grep -q 'DOCS-ONLY EXEMPTION (#3698 R4): skipped studio, plugin, chrome, chrome-shards, surfaces' <<<"$out"; echo $?)"
check 'aggregate/exempt/per-job' "$([ "$(grep -c ' — EXEMPT$' <<<"$out")" -eq 5 ]; echo $?)"
run "{\"changes\":$code_,\"engine\":$ok,$browser}"
check 'aggregate/no-exemption-skip' "$([ "$code" -eq 1 ] && grep -q 'chrome (skipped)' <<<"$out"; echo $?)"
run "{\"changes\":{\"result\":\"failure\",\"outputs\":{\"docs_only\":\"true\"}},\"engine\":$ok,$browser}"
check 'aggregate/changes-failed' "$([ "$code" -eq 1 ] && grep -q 'changes (failure)' <<<"$out" && grep -q 'studio (skipped)' <<<"$out"; echo $?)"
run "{\"changes\":$docs,\"engine\":$skip,$browser}"
check 'aggregate/engine-never-exempt' "$([ "$code" -eq 1 ] && grep -q 'engine (skipped)' <<<"$out"; echo $?)"
run "{\"changes\":$docs,\"engine\":$ok,\"studio\":{\"result\":\"failure\",\"outputs\":{}},\"chrome\":$skip}"
check 'aggregate/exempt-job-failed' "$([ "$code" -eq 1 ] && grep -q 'studio (failure)' <<<"$out"; echo $?)"
run "{\"changes\":$ok,\"engine\":$ok,$browser}"
check 'aggregate/docs-only-absent' "$([ "$code" -eq 1 ] && grep -q 'studio (skipped)' <<<"$out"; echo $?)"
run "{\"changes\":$code_,\"engine\":$ok,\"studio\":$ok,\"chrome\":$ok}"
check 'aggregate/no-skip-no-record' "$([ "$code" -eq 0 ] && ! grep -q 'EXEMPT' <<<"$out"; echo $?)"

if [ "$fails" -gt 0 ]; then echo "✗ $fails case(s) failed"; exit 1; fi
echo "✓ all cases hold"
