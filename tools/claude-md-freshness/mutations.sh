#!/bin/sh
#
# tools/claude-md-freshness/mutations.sh — DOES THE STALENESS CHECK ACTUALLY SEE A STALE CHECKOUT?
#
# The subject is `.claude/hooks/session-start-claude-md-freshness.sh` (#1110). It is a SessionStart
# report, not a gate, and it cannot be one: a stale checkout is internally consistent, so anything
# running inside the tree reports clean over a stale world. That is the property this harness exists to
# measure, and it measures it the only way available — by building a stale world with a real remote,
# running the check in it, and then breaking the check on purpose to confirm the break is visible.
#
# WHY A SYNTHETIC REMOTE AND NOT THIS REPO. Every arm needs a remote that MOVES while the clone does
# not. Against `origin` that is unreproducible (you cannot push to `main` to order a test) and would
# make the harness's oracle the very thing under test. A bare repo in a temp dir plus two clones gives
# the stale-checkout shape exactly: `HEAD`, the working tree and the local `origin/main` all agree on
# the old content, while the remote has moved on.
#
# WHAT "FAIL BY NAME" MEANS HERE. Two of the three mutations invert the usual direction, so the
# assertion has to be stated per-arm rather than as "something went red":
#
#   • M1 mutates the WORLD (a stale CLAUDE.md) and the check must FIRE, naming the file.
#   • M2 mutates the CHECK (drop the fetch, read the local ref) and the mutant must GO SILENT over a
#     world the real check fires on. A mutant that still fires would mean the fetch is decoration.
#   • M3 mutates the ENVIRONMENT (no remote, unreachable remote, no `main`) and the check must say
#     CANNOT DETERMINE — the arm that fails if "undeterminable" is ever allowed to read as "current".
#
# The NEG arm is not a mutation at all: it measures the negative result from #1110 §1 directly, by
# confirming the stale world it builds is one in which `git diff origin/main` and `git status` are both
# EMPTY. Everything else here is only interesting because that arm holds.
#
# SELF-CHECK ON THE MUTATION ITSELF, in three parts, because two of them were found the hard way while
# writing this file. A `sed` that matches nothing produces an unmutated copy, and an unmutated copy
# passes — the mutation battery's own version of the defect it is testing for. So before drawing any
# conclusion from the mutant's silence, M2 asserts (a) the mutant differs from the subject, (b) it calls
# no `ls-remote` on any EXECUTABLE line — the raw text is not enough, since the subject's own header
# discusses `ls-remote` at length and scanning it reports a network call that no longer exists — and
# (c) its clone's local `origin/main` is still at C1. That last one is the trap: running the real check
# in a clone fetches, which moves `refs/remotes/origin/main` as an opportunistic side effect and repairs
# the stale world for every later arm. The first draft shared one clone and the mutant "fired", which
# reads as *the fetch does not matter* — the opposite of the truth, from a green-looking arm.
#
# NO GATE SIBLING, and the reason is a scope decision rather than an impossibility: #1110 asks for a
# report with no CI step, and this harness would run in CI perfectly well (every arm is local `file://`
# git, no network). Wiring it is #1123, rather than folded in here.
#
# Run: sh tools/claude-md-freshness/mutations.sh          (exits non-zero if any arm fails)
#
set -u

root=$(git rev-parse --show-toplevel) || exit 1
HOOK="$root/.claude/hooks/session-start-claude-md-freshness.sh"
[ -f "$HOOK" ] || { echo "subject not found: $HOOK"; exit 1; }

WORK=$(mktemp -d "${TMPDIR:-/tmp}/p3-freshness.XXXXXX") || exit 1
trap 'rm -rf "$WORK"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

PASS=0
FAIL=0
ok()   { PASS=$((PASS + 1)); printf '  ✅ %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf '  ❌ %s\n' "$1"; }
# `assert_has` / `assert_lacks` take the arm's name first so a failure line names the arm, not just the
# expectation — the whole point of "fails by name".
assert_has()   { case "$2" in *"$3"*) ok "$1: says \"$3\"" ;; *) bad "$1: expected \"$3\" — got: $(printf '%s' "$2" | head -c 400)" ;; esac; }
assert_lacks() { case "$2" in *"$3"*) bad "$1: must NOT say \"$3\" — got: $(printf '%s' "$2" | head -c 400)" ;; *) ok "$1: does not say \"$3\"" ;; esac; }

# ── BUILD THE STALE WORLD ──────────────────────────────────────────────────────────────────────────
# C1 says 105 artifacts (the number the real orchestrator quoted); C2 says 114 (what main said). The
# nested file exists so that scope is proven DERIVED — a check hardcoding the root path passes without it.
git init -q --bare -b main "$WORK/remote.git"
git clone -q "$WORK/remote.git" "$WORK/seed"
mkdir -p "$WORK/seed/sub"
printf 'regen --check should report 105 artifacts.\n' > "$WORK/seed/CLAUDE.md"
printf 'nested guidance, revision one\n' > "$WORK/seed/sub/CLAUDE.md"
git -C "$WORK/seed" add -A && git -C "$WORK/seed" commit -qm c1 && git -C "$WORK/seed" push -q origin main
C1=$(git -C "$WORK/seed" rev-parse HEAD)

# The stale clones: taken at C1, and never fetched again. TWO of them, and that is not tidiness —
# running the real check in a clone FETCHES, which updates `refs/remotes/origin/main` as an
# opportunistic side effect and silently repairs the stale world for every later arm. The first draft
# of this harness shared one clone, and M2 read a local ref that the REAL arm had already moved to C2:
# the mutant "fired", which would have been read as the fetch not mattering. Assert the precondition
# per arm rather than trusting sequence.
git clone -q "$WORK/remote.git" "$WORK/stale"
git clone -q "$WORK/remote.git" "$WORK/stale-m2"

printf 'regen --check should report 114 artifacts.\n' > "$WORK/seed/CLAUDE.md"
printf 'nested guidance, revision two\n' > "$WORK/seed/sub/CLAUDE.md"
git -C "$WORK/seed" commit -qam c2 && git -C "$WORK/seed" push -q origin main
C2=$(git -C "$WORK/seed" rev-parse HEAD)

echo "world: remote at ${C2}, stale clone at ${C1}"

# ── NEG — the negative result: this world is internally consistent ─────────────────────────────────
echo
echo "NEG  the stale world is invisible from inside itself (#1110 §1)"
assert_has "NEG" "[$(git -C "$WORK/stale" diff origin/main -- CLAUDE.md)]" "[]"
assert_has "NEG" "[$(git -C "$WORK/stale" status --porcelain)]" "[]"
assert_has "NEG" "local origin/main is $(git -C "$WORK/stale" rev-parse origin/main)" "local origin/main is ${C1}"

# ── CONTROL — a current clone must be quiet, and quiet must be ONE line ────────────────────────────
echo
echo "CONTROL  a current checkout reports current, on one line, with no user-facing message"
git clone -q "$WORK/remote.git" "$WORK/current"
out=$(cd "$WORK/current" && sh "$HOOK")
assert_has   "CONTROL" "$out" "match origin/main at ${C2}"
assert_lacks "CONTROL" "$out" "systemMessage"
assert_has   "CONTROL" "$out" "hookSpecificOutput"
ctx=$(printf '%s' "$out" | jq -r '.hookSpecificOutput.additionalContext')
lines=$(printf '%s\n' "$ctx" | wc -l | tr -d ' ')
[ "$lines" = "1" ] && ok "CONTROL: the current outcome is one line" || bad "CONTROL: current outcome is ${lines} lines, not 1"
assert_has "CONTROL" "$ctx" "all 2 CLAUDE.md file(s)"

# ── THE REAL DETECTION — the check fires on the stale world M2 will then blind it to ──────────────
echo
echo "REAL  the unmutated check fires on the stale clone, names both files, and prints the diff"
real=$(cd "$WORK/stale" && sh "$HOOK")
assert_has "REAL" "$real" "STALE INSTRUCTIONS"
assert_has "REAL" "$real" "1 commit(s) behind"
assert_has "REAL" "$real" "systemMessage"
assert_has "REAL" "$real" "CLAUDE.md sub/CLAUDE.md"
assert_has "REAL" "$real" "105 artifacts"
assert_has "REAL" "$real" "114 artifacts"
assert_has "REAL" "$real" "$C2"

# ── M1 — the measured defect: a tree that matches main, carrying stale instruction bytes ──────────
echo
echo "M1  a current tree whose CLAUDE.md content is the old one must be named as differing"
git -C "$WORK/current" show "${C1}:CLAUDE.md" > "$WORK/current/CLAUDE.md"
m1=$(cd "$WORK/current" && sh "$HOOK")
assert_has   "M1" "$m1" "CLAUDE.md differs from origin/main"
assert_has   "M1" "$m1" "Differing: CLAUDE.md"
assert_has   "M1" "$m1" "systemMessage"
assert_has   "M1" "$m1" "105 artifacts"
assert_lacks "M1" "$m1" "match origin/main"
git -C "$WORK/current" checkout -q -- CLAUDE.md

# ── M2 — the independence test, and the one a naive implementation passes ─────────────────────────
echo
echo "M2  drop the fetch and read the local ref: the mutant must go SILENT on the world REAL fired on"
MUT="$WORK/no-fetch.sh"
sed 's|^ls_out=\$(git -c http\..*ls-remote.*$|ls_out="$(git rev-parse origin/main) refs/heads/main"|' "$HOOK" > "$MUT"
if cmp -s "$HOOK" "$MUT"; then
  bad "M2: the mutation did not apply — the sed matched nothing, so the mutant is a copy of the subject"
else
  ok "M2: the mutation applied (mutant differs from the subject)"
  # Comment lines are stripped first: this file's own header discusses `ls-remote` at length, and
  # scanning the raw text would report a network call that no longer exists.
  if grep -v '^[[:space:]]*#' "$MUT" | grep -q 'ls-remote'; then
    bad "M2: the mutant still calls ls-remote on an executable line, so it is not the no-fetch variant"
  else
    ok "M2: the mutant makes no network call (no ls-remote outside comments)"
  fi
  pre=$(git -C "$WORK/stale-m2" rev-parse origin/main)
  if [ "$pre" = "$C1" ]; then
    ok "M2: precondition holds — the mutant's clone still has a STALE local origin/main at C1"
  else
    bad "M2: precondition broken — local origin/main is ${pre}, not ${C1}; something fetched into this clone first, so the arm proves nothing"
  fi
  m2=$(cd "$WORK/stale-m2" && sh "$MUT")
  if [ -z "$m2" ]; then
    bad "M2: the mutant printed nothing at all — it exited early rather than reporting current"
  else
    assert_has   "M2" "$m2" "match origin/main at ${C1}"
    assert_lacks "M2" "$m2" "STALE INSTRUCTIONS"
    ok "M2: the fetch is load-bearing — the no-fetch mutant reports CURRENT over a 105-artifact tree that the real check reports STALE"
  fi
fi

# ── M3 — cannot determine must never read as up to date ───────────────────────────────────────────
echo
echo "M3  three ways the oracle is unavailable, each of which must say CANNOT DETERMINE"

git clone -q "$WORK/remote.git" "$WORK/noremote"
git -C "$WORK/noremote" remote remove origin
a=$(cd "$WORK/noremote" && sh "$HOOK")
assert_has   "M3a no origin remote" "$a" "CANNOT DETERMINE"
assert_has   "M3a no origin remote" "$a" "no 'origin' remote"
assert_lacks "M3a no origin remote" "$a" "match origin/main"
assert_has   "M3a no origin remote" "$a" "This is NOT an all-clear"

git clone -q "$WORK/remote.git" "$WORK/unreachable"
git -C "$WORK/unreachable" remote set-url origin "$WORK/does-not-exist.git"
b=$(cd "$WORK/unreachable" && sh "$HOOK")
assert_has   "M3b unreachable remote" "$b" "CANNOT DETERMINE"
assert_has   "M3b unreachable remote" "$b" "the fetch failed"
assert_lacks "M3b unreachable remote" "$b" "match origin/main"

git init -q --bare -b other "$WORK/nomain.git"
git clone -q "$WORK/remote.git" "$WORK/nomain"
git -C "$WORK/nomain" remote set-url origin "$WORK/nomain.git"
c=$(cd "$WORK/nomain" && sh "$HOOK")
assert_has   "M3c remote has no main" "$c" "CANNOT DETERMINE"
assert_has   "M3c remote has no main" "$c" "no 'main' branch"
assert_lacks "M3c remote has no main" "$c" "match origin/main"

# ── TRUNC — a capped diff must state the cap ──────────────────────────────────────────────────────
# `docs/34`'s no-silent-caps rule. A diff cut off with nothing said reads as "that was all of it", which
# is worse here than a long message: the whole reason this prints a diff is that a boolean gets skipped.
echo
echo "TRUNC  a diff longer than the cap says how many lines it dropped, and how to see them"
git clone -q "$WORK/remote.git" "$WORK/long"
i=1
while [ "$i" -le 200 ]; do echo "line $i" >> "$WORK/long/CLAUDE.md"; i=$((i + 1)); done
t=$(cd "$WORK/long" && sh "$HOOK")
assert_has "TRUNC" "$t" "more diff line(s) not shown"
assert_has "TRUNC" "$t" "Full text: git diff ${C2} -- CLAUDE.md"
tlines=$(printf '%s' "$t" | jq -r '.systemMessage' | wc -l | tr -d ' ')
[ "$tlines" -lt 80 ] && ok "TRUNC: the capped message is ${tlines} lines, not the whole 200-line diff" \
                     || bad "TRUNC: the message is ${tlines} lines — the cap did not apply"

# ── MEASUREMENT — the concurrent-fetch race the header claims is harmless ──────────────────────────
# The behind-count hook fetches `origin main` in the same clone at the same moment. This is the number
# quoted in the subject's header; re-run it here rather than trusting the sentence.
echo
echo "RACE  8 concurrent 'git fetch origin main' in one clone (the co-tenant hook's collision)"
git clone -q "$WORK/remote.git" "$WORK/race"
i=1
while [ "$i" -le 8 ]; do
  ( cd "$WORK/race" && git fetch --quiet origin main 2>/dev/null; echo "$?" > "$WORK/race-$i.code" ) &
  i=$((i + 1))
done
wait
failed=$(cat "$WORK"/race-*.code | grep -cv '^0$' || true)
echo "  measured: ${failed} of 8 concurrent fetches exited non-zero"
[ "$failed" = "0" ] && ok "RACE: concurrent fetches all exited 0 (git serializes on the ref lock)" \
                    || bad "RACE: ${failed} of 8 failed — the subject's header claims 0 of 8; re-word it"

echo
echo "── ${PASS} pass · ${FAIL} fail ──"
[ "$FAIL" -eq 0 ] || exit 1
