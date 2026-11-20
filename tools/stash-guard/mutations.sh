#!/bin/sh
#
# tools/stash-guard/mutations.sh — DOES THE STASH GUARD STILL DENY THE COMMAND IT EXISTS TO DENY?
#
# The subject is `.claude/hooks/pre-tool-use-stash-guard.mjs` (#923): a PreToolUse hook that denies a
# `git stash pop`, `apply` or `drop` naming no explicit entry, and prints the stack in its reason. Its
# failure mode is silence: a guard whose pattern stops matching denies nothing, and the first sign is
# another session's entry consumed (docs/34 shape 9 at the tooling layer). So the battery breaks the hook
# on purpose, one way per mutant, and each mutant must fail a NAMED arm with a NAMED verdict. A mutant
# that fails some other way is reported as a failed mutation, not counted as a catch (docs/34 corollary 4).
#
# THE ARMS. Every arm runs against a fresh repo in $TMPDIR holding two named stash entries, `mine` on top
# of `theirs`, so the stack the reason prints is real.
#
#   D* — DENIED, one per bare form: pop, apply, drop; with options only; `stash` and `refs/stash` as the
#        ref (git reads both as stash@{0}); after `cd`, through `git -C`, inside `bash -c`, after another
#        command, behind a wrapper (`time`) or an env prefix, inside `bash -lc`, and git by its path. Each must deny, print both entries of the stack, and name the `git show` remedy. D1 also
#        asserts the stack is unchanged afterwards (the hook only reads it).
#   A* — ALLOWED, the false-denial direction: `stash@{n}`, a bare index, a SHA, `refs/stash@{n}`, options
#        around an explicit ref, `git stash` / `push` / `list` / `show`, a guarded command spelled inside
#        `echo`, a non-repo directory. Each must produce no output. A1 also RUNS the allowed command and
#        checks it applied the entry it named, so an allowed form is one git accepts.
#   M* — MUTANTS of the hook, each a copy in $TMPDIR with one edit:
#        M1 `pop` is no longer guarded                 → D1 must report ALLOWED
#        M2 `stash` counts as an explicit ref          → D5 must report ALLOWED
#        M3 git's global options are not skipped       → D8 must report ALLOWED
#        M4 `sh -c` scripts are no longer read          → D9 must report ALLOWED
#        M5 every guarded command is denied            → A1 must report DENIED
#        M6 the stack is left out of the reason        → D1 must report NOSTACK
#        M7 `drop` is no longer guarded                → D3 must report ALLOWED
#        M8 wrappers (`time`, `env`, …) are not skipped → D11 must report ALLOWED
#        M9 an env prefix (`VAR=1`) is not skipped     → D12 must report ALLOWED
#        M10 only an exact `-c` is read (not `-lc`)    → D13 must report ALLOWED
#        M11 git is matched only by its bare name      → D14 must report ALLOWED
#
# SELF-CHECKS ON THE MUTATION ITSELF. A `sed` that matches nothing yields an unmutated copy, which passes
# (docs/34 corollary 2), so every mutant is compared to the subject and the arm fails if they are
# byte-identical. Each arm asserts its own precondition (the stack holds both entries), so a setup that
# silently produced an empty stack cannot read as a correct verdict.
#
# No remote and no network: every repo is a local `git init` in $TMPDIR, with global and system config
# ignored. It never touches this checkout (it reads the hook file, nothing else).
#
# Run: sh tools/stash-guard/mutations.sh          (exits non-zero if any arm fails)
#
set -u

root=$(git rev-parse --show-toplevel) || exit 1
HOOK="$root/.claude/hooks/pre-tool-use-stash-guard.mjs"
[ -f "$HOOK" ] || { echo "subject not found: $HOOK"; exit 1; }
command -v node >/dev/null || { echo "node is required"; exit 1; }
command -v jq >/dev/null || { echo "jq is required"; exit 1; }

WORK=$(mktemp -d "${TMPDIR:-/tmp}/p3-stash-guard.XXXXXX") || exit 1
trap 'rm -rf "$WORK"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

PASS=0
FAIL=0
ok()  { PASS=$((PASS + 1)); printf '  ✅ %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); printf '  ❌ %s\n' "$1"; }

# fresh → sets `repo` to a new repo with one commit and two named stash entries: `mine` on `theirs`.
fresh() {
  repo=$(mktemp -d "$WORK/repo.XXXXXX")
  git init -q -b main "$repo"
  mkdir -p "$repo/sub"
  printf 'base\n' > "$repo/f.txt"
  git -C "$repo" add -A && git -C "$repo" commit -qm base >/dev/null
  printf 'theirs\n' > "$repo/f.txt"; git -C "$repo" stash push -q -m theirs
  printf 'mine\n' > "$repo/f.txt";   git -C "$repo" stash push -q -m mine
}

# run_hook <hook> <cwd> <command>  → the hook's stdout
run_hook() {
  jq -n --arg c "$3" --arg d "$2" '{tool_name:"Bash",tool_input:{command:$c},cwd:$d}' | node "$1"
}

stack() { git -C "$1" stash list --format=%gs | tr '\n' '|'; }

# denied <hook> <command>  → OK | PRECONDITION | ALLOWED | NOSTACK | NOREMEDY | MOVED
denied() {
  hook=$1 cmd=$2
  fresh
  before=$(stack "$repo")
  case "$before" in *mine*theirs*) ;; *) echo PRECONDITION; return ;; esac
  out=$(run_hook "$hook" "$repo" "$cmd")
  printf '%s' "$out" | jq -e '.hookSpecificOutput.permissionDecision == "deny"' >/dev/null 2>&1 || { echo ALLOWED; return; }
  reason=$(printf '%s' "$out" | jq -r '.hookSpecificOutput.permissionDecisionReason')
  case "$reason" in *"On main: mine"*"On main: theirs"*) ;; *) echo NOSTACK; return ;; esac
  case "$reason" in *"git show 'stash@{n}:<path>'"*) ;; *) echo NOREMEDY; return ;; esac
  [ "$(stack "$repo")" = "$before" ] || { echo MOVED; return; }
  echo OK
}

# allowed <hook> <command> [cwd-override]  → OK | PRECONDITION | DENIED | SPOKE
allowed() {
  hook=$1 cmd=$2
  fresh
  case "$(stack "$repo")" in *mine*theirs*) ;; *) echo PRECONDITION; return ;; esac
  dir=${3:-$repo}
  out=$(run_hook "$hook" "$dir" "$cmd")
  printf '%s' "$out" | grep -q '"deny"' && { echo DENIED; return; }
  [ -z "$out" ] || { echo SPOKE; return; }
  echo OK
}

# runs <hook>  → OK | DENIED | WRONG — the allowed explicit form, then git itself: it applies `theirs`.
runs() {
  fresh
  out=$(run_hook "$1" "$repo" "git stash apply 'stash@{1}'")
  printf '%s' "$out" | grep -q '"deny"' && { echo DENIED; return; }
  (cd "$repo" && git stash apply -q 'stash@{1}') >/dev/null 2>&1 || { echo WRONG; return; }
  [ "$(cat "$repo/f.txt")" = theirs ] || { echo WRONG; return; }
  echo OK
}

expect() { # expect <arm-name> <wanted> <got>
  if [ "$3" = "$2" ]; then ok "$1 → $3"; else bad "$1: expected $2, got $3"; fi
}

D1='git stash pop'
D3='git stash drop'
D5='git stash pop stash'
D8='git -C sub stash pop'
D9="bash -c 'git stash pop'"
D11='time git stash pop'
D12='GIT_TRACE=1 git stash apply'
D13="bash -lc 'git stash pop'"
D14='/usr/bin/git stash pop'

echo "── denied: every bare form, with the stack and the remedy in the reason"
expect "D1 git stash pop"                       OK "$(denied "$HOOK" "$D1")"
expect "D2 git stash apply"                     OK "$(denied "$HOOK" 'git stash apply')"
expect "D3 git stash drop"                      OK "$(denied "$HOOK" "$D3")"
expect "D4 options only (pop --index -q)"       OK "$(denied "$HOOK" 'git stash pop --index -q')"
expect "D5 ref 'stash' (reads as stash@{0})"    OK "$(denied "$HOOK" "$D5")"
expect "D6 ref 'refs/stash'"                    OK "$(denied "$HOOK" 'git stash apply refs/stash')"
expect "D7 cd <dir> && git stash pop"           OK "$(denied "$HOOK" 'cd sub && git stash pop')"
expect "D8 git -C <dir> stash pop"              OK "$(denied "$HOOK" "$D8")"
expect "D9 bash -c '<bare pop>'"                OK "$(denied "$HOOK" "$D9")"
expect "D10 after another command"              OK "$(denied "$HOOK" 'git stash -u; git stash pop 2>&1')"
expect "D11 behind a wrapper (time)"            OK "$(denied "$HOOK" "$D11")"
expect "D12 behind an env prefix (VAR=1)"       OK "$(denied "$HOOK" "$D12")"
expect "D13 bash -lc (combined -c flag)"        OK "$(denied "$HOOK" "$D13")"
expect "D14 git by its path (/usr/bin/git)"     OK "$(denied "$HOOK" "$D14")"

echo "── allowed: an explicit entry, or no guarded command at all, passes silently"
expect "A1 explicit entry applies what it names" OK "$(runs "$HOOK")"
expect "A2 git stash pop 'stash@{1}'"           OK "$(allowed "$HOOK" "git stash pop 'stash@{1}'")"
expect "A3 git stash drop 1 (bare index)"       OK "$(allowed "$HOOK" 'git stash drop 1')"
expect "A4 git stash apply <sha>"               OK "$(allowed "$HOOK" 'git stash apply 3f2a9c1e')"
expect "A5 refs/stash@{0} with options"         OK "$(allowed "$HOOK" "git stash pop --index -q 'refs/stash@{0}'")"
expect "A6 git stash / push / list / show"      OK "$(allowed "$HOOK" 'git stash && git stash push -m x && git stash list && git stash show')"
expect "A7 guarded command inside echo"         OK "$(allowed "$HOOK" 'echo "git stash pop"')"
mkdir -p "$WORK/not-a-repo"
expect "A8 explicit entry outside a repo"       OK "$(allowed "$HOOK" "git stash pop 'stash@{0}'" "$WORK/not-a-repo")"

echo "── mutants: each must fail its named arm, for its named reason"
# mutant <id> <sed-expression>  → sets M to the mutant's path, or to empty if the sed changed nothing
# (called directly, never in `$(...)`, so the failure it records is counted).
mutant() {
  M="$WORK/mutant-$1.mjs"
  sed "$2" "$HOOK" > "$M"
  if cmp -s "$M" "$HOOK"; then bad "$1: the mutation did not apply (mutant is byte-identical to the subject)"; M=''; fi
}
mutant M1 "s/new Set(\['pop', 'apply', 'drop'\])/new Set(['apply', 'drop'])/"
[ -n "$M" ] && expect "M1 pop not guarded → D1"            ALLOWED "$(denied "$M" "$D1")"
mutant M2 "s/^const EXPLICIT = \/^(?:/const EXPLICIT = \/^(?:stash|/"
[ -n "$M" ] && expect "M2 'stash' counts as explicit → D5" ALLOWED "$(denied "$M" "$D5")"
mutant M3 "s/while (k < words.length \&\& words\[k\].startsWith('-')) {/while (false) {/"
[ -n "$M" ] && expect "M3 global options not skipped → D8" ALLOWED "$(denied "$M" "$D8")"
mutant M4 "s/if (depth < 3 \&\&/if (false \&\&/"
[ -n "$M" ] && expect "M4 sh -c not read → D9"             ALLOWED "$(denied "$M" "$D9")"
mutant M5 "s/if (refs.length \&\& refs.every((r) => EXPLICIT.test(r))) return null;//"
[ -n "$M" ] && expect "M5 every guarded command denied → A1" DENIED "$(runs "$M")"
mutant M6 's/The stack now:\\n\${stackOf(hit.dir)}/The stack now: (omitted)/'
[ -n "$M" ] && expect "M6 stack left out of reason → D1"   NOSTACK "$(denied "$M" "$D1")"
mutant M7 "s/new Set(\['pop', 'apply', 'drop'\])/new Set(['pop', 'apply'])/"
[ -n "$M" ] && expect "M7 drop not guarded → D3"           ALLOWED "$(denied "$M" "$D3")"
mutant M8 "s/^const WRAPPERS = new Set(\[.*\]);/const WRAPPERS = new Set([]);/"
[ -n "$M" ] && expect "M8 wrappers not skipped → D11"      ALLOWED "$(denied "$M" "$D11")"
mutant M9 "s/(\/^\[A-Za-z_\]\[A-Za-z0-9_\]\*=\/.test(words\[k\]) || /(false || /"
[ -n "$M" ] && expect "M9 env prefix not skipped → D12"    ALLOWED "$(denied "$M" "$D12")"
mutant M10 "s/^const SHELL_C = .*/const SHELL_C = \/^-c\$\/;/"
[ -n "$M" ] && expect "M10 only an exact -c read → D13"    ALLOWED "$(denied "$M" "$D13")"
mutant M11 "s/^const gitWord = .*/const gitWord = (w) => w === 'git';/"
[ -n "$M" ] && expect "M11 git only by bare name → D14"    ALLOWED "$(denied "$M" "$D14")"

echo
echo "stash-guard: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
