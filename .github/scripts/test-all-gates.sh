#!/usr/bin/env bash
# Q503 A — the test for all-gates.sh, the step that decides the `gates` check.
#
#   bash .github/scripts/test-all-gates.sh
#
# Cases, by name:
#   pass/…       every job `success` → exit 0.
#   failure/…    one job `failure` → exit 1, and the message names that job.
#   cancelled/…  one job `cancelled` → exit 1, named.
#   skipped/…    one job `skipped` → exit 1, named: a skipped gate job is not a pass.
#   empty/…      `{}` → exit 1: a step that read nothing does not pass.
#   unset/…      NEEDS unset or not JSON → exit 1.
# Mutations, each failing here by name (measured): the result filter made `select(false)` → `failure/…`,
# `cancelled/…`, `skipped/…` (exit and named); the empty check removed → `empty/exit`; the final `exit 1` made `exit 0`
# → `failure/exit`, `cancelled/exit`, `skipped/exit`.
set -u

HERE=$(cd "$(dirname "$0")" && pwd)
SUBJECT="${SUBJECT:-$HERE/all-gates.sh}"
fails=0
check() { # name, condition-result (0 = held)
  if [ "$2" -eq 0 ]; then echo "  ok   $1"; else echo "  FAIL $1"; fails=$((fails + 1)); fi
}
run() { # NEEDS json (or the literal __UNSET__)
  if [ "$1" = "__UNSET__" ]; then out=$(env -u NEEDS bash "$SUBJECT" 2>&1); else out=$(NEEDS="$1" bash "$SUBJECT" 2>&1); fi
  code=$?
}
ok='{"result":"success","outputs":{}}'

run "{\"engine\":$ok,\"studio\":$ok,\"chrome\":$ok}"
check 'pass/exit' "$([ "$code" -eq 0 ]; echo $?)"
check 'pass/counts' "$(grep -q 'All 3 gate jobs succeeded' <<<"$out"; echo $?)"

for r in failure cancelled skipped; do
  run "{\"engine\":$ok,\"chrome\":{\"result\":\"$r\",\"outputs\":{}},\"studio\":$ok}"
  check "$r/exit" "$([ "$code" -eq 1 ]; echo $?)"
  check "$r/named" "$(grep -q "chrome ($r)" <<<"$out"; echo $?)"
done

run '{}'
check 'empty/exit' "$([ "$code" -eq 1 ]; echo $?)"
run '__UNSET__'
check 'unset/exit' "$([ "$code" -eq 1 ]; echo $?)"
run 'not json'
check 'unset/not json' "$([ "$code" -eq 1 ]; echo $?)"

if [ "$fails" -gt 0 ]; then echo "✗ $fails case(s) failed"; exit 1; fi
echo "✓ all cases hold"
