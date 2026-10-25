#!/usr/bin/env bash
# #2348 — the test for install-chromium.sh, with a stand-in install that leaves a lock-holding child behind.
#
#   bash .github/scripts/test-install-chromium.sh
#
# THE STAND-IN. On its first run it records whether the apt config is already written, starts a child that
# leaves its process group (as the root `apt-get` did, which is why `timeout` never reached it) and writes its
# PID into a stand-in dpkg lock, then stalls past the bound. On a later run, while that child lives, it fails
# the way apt does: "E: Could not get lock … It is held by process N (apt-get)", exit 100. When the config
# carries DPkg::Lock::Timeout it first waits for the lock, briefly, as apt would.
#
# THE CLEAR. CI's clear is `sudo pkill -x apt-get`, a pattern kill that is fine on a disposable runner and not
# on a shared machine. So this test hands the script a clear that stops the recorded PID only, and the default
# clear is exercised by CI itself. What this tests is the script's order: config first, clear and repair before
# every retry and never before the first attempt, and three failures failing with the named error.
#
# Cases, by name:
#   stall/…    attempt 1 stalls and leaves the lock held; attempt 2 starts clean and succeeds.
#   fail/…     an install that always fails fails the run, named, after three attempts.
#   first/…    an install that succeeds at once runs no clear and no repair.
#   config/…   the apt config holds the four bounds and the cached archive directory (#2951); a config
#              that cannot be written, or an archive directory that cannot be made, fails the run, named.
#   old/…      the #2348 behavior (no clear before a retry) fails attempts 2 and 3 on the lock: the
#              premise, shown, so `stall/…` is known to be able to fail.
# ZOMBIES (#2981). Where PID 1 does not reap orphans, the stopped holder stays a zombie. The stand-in reads a
# zombie as not holding the lock, as apt would, so the `stall/…` cases pass there too (measured under a
# subreaper that never reaps; before this they failed there, five of them).
# Mutations, each failing here by name (measured): the clear before a retry removed → `stall/ok`,
# `stall/no lock error` and three more `stall/…`; the repair removed → `stall/repaired`; the config write
# removed → `stall/config first`, `config/bounds`, `config/unwritable`; the final `exit 1` made `exit 0` →
# `fail/exit`, `old/premise`.
set -u

HERE=$(cd "$(dirname "$0")" && pwd)
SUBJECT="$HERE/install-chromium.sh"
WORK=$(mktemp -d "${TMPDIR:-/tmp}/p3-install-test.XXXXXX")
FAILED=0
HOLDERS=()

ok() { if [ "$1" = 0 ]; then echo "  ✓ $2"; else echo "  ✗ $2"; FAILED=$((FAILED + 1)); fi; }
check() { if eval "$1"; then ok 0 "$2"; else ok 1 "$2"; fi; }

cleanup() {
  for p in "${HOLDERS[@]+"${HOLDERS[@]}"}"; do kill "$p" 2> /dev/null || true; done
  rm -rf "$WORK"
}
trap cleanup EXIT

# A `timeout` with GNU's contract (exit 124 on expiry, the command's own process group signaled), first on
# PATH, so the test runs the same on a machine without GNU coreutils.
mkdir -p "$WORK/bin"
cat > "$WORK/bin/timeout" << 'EOF'
#!/usr/bin/env python3
import os, signal, subprocess, sys
p = subprocess.Popen(sys.argv[2:], start_new_session=True)
try:
    sys.exit(p.wait(timeout=float(sys.argv[1])))
except subprocess.TimeoutExpired:
    os.killpg(p.pid, signal.SIGTERM)
    p.wait()
    sys.exit(124)
EOF
chmod +x "$WORK/bin/timeout"

# The stand-in install. $1 is the case directory, $2 the mode.
cat > "$WORK/bin/stand-in-install" << 'EOF'
#!/usr/bin/env bash
D=$1; MODE=$2
n=$(( $(cat "$D/count" 2> /dev/null || echo 0) + 1 )); echo "$n" > "$D/count"
# A zombie holds no lock: the kernel drops a process's locks when it exits, before anything reaps it. So a
# holder that is stopped but unreaped (a container whose PID 1 does not reap orphans, #2981) has released
# the lock, though `kill -0` still answers for it.
held() {
  local pid; pid=$(cat "$D/lock" 2> /dev/null) || return 1
  [ -n "$pid" ] && kill -0 "$pid" 2> /dev/null || return 1
  case $(ps -o stat= -p "$pid" 2> /dev/null) in Z*) return 1 ;; esac
}
if [ "$n" -gt 1 ] && held; then
  if grep -q 'DPkg::Lock::Timeout' "$D/apt.conf" 2> /dev/null; then
    for _ in 1 2; do held || break; sleep 0.5; done  # 1 s, inside the 2 s bound, as 120 s sits inside 240 s
  fi
  if held; then echo "E: Could not get lock $D/lock. It is held by process $(cat "$D/lock") (apt-get)"; exit 100; fi
fi
case "$MODE" in
  stall-once)
    if [ "$n" -eq 1 ]; then
      [ -f "$D/apt.conf" ] && echo yes > "$D/config-at-first" || echo no > "$D/config-at-first"
      python3 -c 'import os, sys, time; os.setsid(); open(sys.argv[1], "w").write(str(os.getpid())); time.sleep(600)' "$D/lock" &
      for _ in $(seq 1 50); do [ -s "$D/lock" ] && break; sleep 0.1; done
      sleep 30
    fi
    echo "stand-in: Chromium installed"; exit 0 ;;
  fail) echo "stand-in: install failed"; exit 1 ;;
  ok) echo "stand-in: Chromium installed"; exit 0 ;;
esac
EOF
chmod +x "$WORK/bin/stand-in-install"

# Run the subject for one case. $1 case name, $2 mode, $3 the clear (default: stop the recorded holder).
run() {
  local D="$WORK/$1"; mkdir -p "$D"
  local clear=${3:-"kill \$(cat '$D/lock' 2> /dev/null) 2> /dev/null; echo cleared >> '$D/clears'"}
  PATH="$WORK/bin:$PATH" \
  PRISM3_INSTALL="stand-in-install $D $2" PRISM3_INSTALL_BOUND=2 PRISM3_SUDO="" \
  PRISM3_APT_CONF="${APT_CONF_OVERRIDE:-$D/apt.conf}" PRISM3_APT_ARCHIVES="${ARCHIVES_OVERRIDE:-$D/archives}" \
  PRISM3_APT_CLEAR="$clear" PRISM3_DPKG_REPAIR="echo repaired >> '$D/repairs'" \
    bash "$SUBJECT" > "$D/out" 2>&1
  echo $? > "$D/exit"
  [ -s "$D/lock" ] && HOLDERS+=("$(cat "$D/lock")")
}

echo "install-chromium.sh (#2348)"

run stall stall-once
S="$WORK/stall"
check "[ \"\$(cat $S/exit)\" = 0 ]" "stall/ok: attempt 1 stalls holding the lock, and the run still installs (exit $(cat $S/exit))"
check "! grep -q 'Could not get lock' $S/out" "stall/no lock error: no attempt fails on the lock attempt 1 left held"
check "[ \"\$(cat $S/count)\" = 2 ]" "stall/two attempts: the install ran twice, the stall and the retry ($(cat $S/count))"
check "[ \"\$(cat $S/clears 2> /dev/null | wc -l | tr -d ' ')\" = 1 ]" "stall/cleared: the leftover was cleared once, before attempt 2"
check "[ \"\$(cat $S/repairs 2> /dev/null | wc -l | tr -d ' ')\" = 1 ]" "stall/repaired: dpkg --configure -a ran once, before attempt 2"
check "[ \"\$(cat $S/config-at-first 2> /dev/null)\" = yes ]" "stall/config first: the apt config was written before attempt 1"

run fail fail
F="$WORK/fail"
check "[ \"\$(cat $F/exit)\" = 1 ]" "fail/exit: three failures fail the run (exit $(cat $F/exit))"
check "grep -q '::error::Chromium install timed out or failed after 3 attempts; the browser gates cannot run' $F/out" "fail/named: with the named error"
check "[ \"\$(grep -c '::warning::Chromium install attempt' $F/out)\" = 3 ]" "fail/three: after exactly three attempts"

run first ok
O="$WORK/first"
check "[ \"\$(cat $O/exit)\" = 0 ] && [ ! -e $O/clears ] && [ ! -e $O/repairs ]" "first/clean: an install that succeeds at once runs no clear and no repair"

check "grep -qx 'Acquire::http::Timeout \"30\";' $S/apt.conf && grep -qx 'Acquire::https::Timeout \"30\";' $S/apt.conf && grep -qx 'Acquire::Retries \"3\";' $S/apt.conf && grep -qx 'DPkg::Lock::Timeout \"120\";' $S/apt.conf" \
  "config/bounds: the apt config bounds each fetch, retries it, and waits for a held lock"
check "grep -qx \"Dir::Cache::Archives \\\"$S/archives/\\\";\" $S/apt.conf && [ -d $S/archives/partial ]" \
  "config/archives: apt keeps its packages in the directory ci.yml caches, created before attempt 1 (#2951)"
touch "$WORK/a-file"
ARCHIVES_OVERRIDE="$WORK/a-file/archives" run noarchive ok
N="$WORK/noarchive"
check "[ \"\$(cat $N/exit)\" = 1 ] && grep -q '::error::could not create the apt archive directory' $N/out && [ ! -e $N/count ]" "config/no archive: an archive directory that cannot be created fails the run, named, before any install"
APT_CONF_OVERRIDE="$WORK/no-such-dir/apt.conf" run unwritable ok
U="$WORK/unwritable"
check "[ \"\$(cat $U/exit)\" = 1 ] && grep -q '::error::could not write the apt config' $U/out && [ ! -e $U/count ]" "config/unwritable: a config that cannot be written fails the run, named, before any install"

run old stall-once "true"
P="$WORK/old"
check "[ \"\$(cat $P/exit)\" = 1 ] && [ \"\$(grep -c 'Could not get lock' $P/out)\" = 2 ]" "old/premise: with no clear before a retry, attempts 2 and 3 fail on the lock and the run fails (#2348's CI)"

echo
if [ "$FAILED" = 0 ]; then echo "✅ all pass"; else echo "❌ $FAILED failing"; exit 1; fi
