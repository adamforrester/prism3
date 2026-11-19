#!/bin/sh
#
# tools/restore-autostash/mutations.sh — DOES THE RESTORE GUARD STILL SAVE THE WORK IT EXISTS TO SAVE?
#
# The subject is `.claude/hooks/pre-tool-use-restore-autostash.mjs` (#1050): a PreToolUse hook that,
# before a Bash command restores a path carrying uncommitted work, saves that work to a NAMED stash
# entry and lets the command run unchanged. Its failure mode is silence. A hook whose pattern stops
# matching reports nothing, everyone assumes protection, and the first sign is destroyed work (#1050's
# "the failure mode this must not have"; docs/34 shape 9 at the tooling layer). So this battery does
# not stop at "the hook fires": it breaks the hook on purpose, one way per mutant, and each mutant must
# fail a NAMED arm with a NAMED reason. A mutant that fails some other arm, or fails for some other
# reason, is reported as a failed mutation, not counted as a catch (docs/34 corollary 4).
#
# THE ARMS
#
#   P* — POSITIVE, one per restore form. A fresh repo, an uncommitted edit, the hook, then the real
#        command. Each must: report a stash entry; hold the edit at the reported commit; be NAMED
#        `auto-before-restore-*` in `git stash list`; and the command must still have done its job.
#        P12 is the semantic arm: staged work plus a different unstaged edit, restored from the index.
#        Without the hook the file ends up holding the STAGED text; it must still do so with the hook.
#        That is what pins `git stash create` over `git stash push` (the hook's header has why).
#   N* — NEGATIVE, the false-stash direction: a clean path while another is dirty, a branch create, a
#        branch switch, a restore spelled inside an `echo`, a non-repo directory. Each must produce no
#        output and no stash entry.
#   F1 — FAIL CLOSED: the restore names dirty work and the stash cannot be written (a held lock on
#        `refs/stash`). The hook must deny, since the work is known to be at risk and known unsaved.
#   M* — MUTANTS of the hook, each a copy in $TMPDIR with one edit:
#        M1 the `checkout` matcher stops matching       → P1 must report NOSTASH
#        M2 the stash is stored without a name           → P1 must report UNNAMED
#        M3 `stash push` replaces `stash create`         → P12 must report CHANGED (restore result moved)
#        M4 the dirty check always says dirty            → N1 must report STASHED
#        M5 `cd` is no longer followed                   → P7 must report NOSTASH
#        M6 the deny on a failed stash is dropped        → F1 must report NODENY
#        M7 `sh -c` scripts are no longer read           → P10 must report NOSTASH
#        M8 the conflict path falls back to `stash create` → C1 must report NOSTASH
#        M9 the staged/unmerged paths are not added       → C4 must report LOST
#        M10 that add drops `-f`                          → C5 must report NOSTASH
#   C* — A MERGE CONFLICT (#4195): `f.txt` is unmerged (UU) and `sub/g.txt` carries an unrelated edit.
#        `git stash create` refuses an unmerged index, so before #4195 every restore here was denied.
#        C1 `--theirs` and C2 `--ours` must save the conflicted working copy (markers included) and then
#        take the side; C3 restores the unrelated dirty path mid-conflict. Each also asserts the hook left
#        the index as it found it (INDEX): the unmerged entries are still there when the command runs.
#        C4 is a path HEAD does not have: `d.txt` deleted by us and modified by them (DU), a hand fix
#        written to disk, then `--theirs`. `add -u` never sees it, so only the staged/unmerged-paths add
#        saves the hand fix (#4357 review). C5 is the same shape on a path `.gitignore` matches that the
#        base force-added: a plain `git add` refuses it, so without `-f` the save fails and the hook denies.
#
# SELF-CHECKS ON THE MUTATION ITSELF. A `sed` that matches nothing yields an unmutated copy, and an
# unmutated copy passes (docs/34 corollary 2) — so every mutant is compared to the subject and the arm
# is failed if they are byte-identical. Each positive arm also asserts its own precondition (the path is
# dirty before the hook runs), so an arm whose setup silently produced a clean tree cannot read as a
# correct "no stash".
#
# No remote and no network: every repo is a local `git init` in $TMPDIR, with global and system config
# ignored. No network, and it never touches this checkout (it reads the hook file, nothing else).
#
# Run: sh tools/restore-autostash/mutations.sh          (exits non-zero if any arm fails)
#
set -u

root=$(git rev-parse --show-toplevel) || exit 1
HOOK="$root/.claude/hooks/pre-tool-use-restore-autostash.mjs"
[ -f "$HOOK" ] || { echo "subject not found: $HOOK"; exit 1; }
command -v node >/dev/null || { echo "node is required"; exit 1; }
command -v jq >/dev/null || { echo "jq is required"; exit 1; }

WORK=$(mktemp -d "${TMPDIR:-/tmp}/p3-restore-autostash.XXXXXX") || exit 1
trap 'rm -rf "$WORK"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

PASS=0
FAIL=0
ok()  { PASS=$((PASS + 1)); printf '  ✅ %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); printf '  ❌ %s\n' "$1"; }

# fresh → sets `repo` to a new repo with one commit. Each arm runs inside `$(...)`, so a counter would
# not survive between arms; `mktemp -d` gives every arm its own directory instead.
fresh() {
  repo=$(mktemp -d "$WORK/repo.XXXXXX")
  git init -q -b main "$repo"
  mkdir -p "$repo/sub"
  printf 'base\n' > "$repo/f.txt"; printf 'base\n' > "$repo/sub/g.txt"; printf 'base\n' > "$repo/with space.txt"
  git -C "$repo" add -A && git -C "$repo" commit -qm base >/dev/null
}

# run_hook <hook> <cwd> <command>  → the hook's stdout
run_hook() {
  jq -n --arg c "$3" --arg d "$2" '{tool_name:"Bash",tool_input:{command:$c},cwd:$d}' | node "$1"
}

autostash_count() { git -C "$1" stash list | grep -c 'auto-before-restore-' ; }

# pos <hook> <setup: wt|staged|split> <command> <path>  → prints exactly one verdict word:
#   OK | PRECONDITION | NOSTASH | LOST | UNNAMED | NOTRUN | CHANGED
pos() {
  hook=$1 setup=$2 cmd=$3 path=$4
  fresh
  case "$setup" in
    wt)     printf 'edit\n' > "$repo/$path"; want_after='base' ;;
    staged) printf 'edit\n' > "$repo/$path"; git -C "$repo" add -- "$path"; want_after='edit' ;;
    split)  printf 'staged\n' > "$repo/$path"; git -C "$repo" add -- "$path"; printf 'edit\n' > "$repo/$path"; want_after='staged' ;;
  esac
  [ -n "$(git -C "$repo" status --porcelain -- "$path")" ] || { echo PRECONDITION; return; }
  out=$(run_hook "$hook" "$repo" "$cmd")
  sha=$(printf '%s' "$out" | sed -n 's/.*commit \([0-9a-f]\{40\}\).*/\1/p' | head -1)
  # NOSTASH asks only "is the reported commit on the stash stack"; whether it is NAMED is UNNAMED's
  # question, asked separately so a mutant that drops the name fails for that reason and no other.
  [ -n "$sha" ] && git -C "$repo" stash list --format=%H | grep -qx "$sha" || { echo NOSTASH; return; }
  [ "$(git -C "$repo" show "$sha:$path" 2>/dev/null)" = 'edit' ] || { echo LOST; return; }
  git -C "$repo" stash list --format='%H %gs' | grep -q "^$sha .*auto-before-restore-" || { echo UNNAMED; return; }
  printf '%s' "$out" | grep -q '"permissionDecision"' && { echo NOTRUN; return; }
  (cd "$repo" && sh -c "$cmd") >/dev/null 2>&1 || { echo NOTRUN; return; }
  [ "$(cat "$repo/$path")" = "$want_after" ] || { echo CHANGED; return; }
  if [ "$setup" = staged ]; then git -C "$repo" diff --cached --quiet || { echo CHANGED; return; }; fi
  echo OK
}

# neg <hook> <command> [cwd-override]  → OK | STASHED | SPOKE
neg() {
  hook=$1 cmd=$2
  fresh
  printf 'edit\n' > "$repo/f.txt"   # the tree is DIRTY in every negative arm: silence must be earned
  dir=${3:-$repo}
  out=$(run_hook "$hook" "$dir" "$cmd")
  [ "$(autostash_count "$repo")" -eq 0 ] || { echo STASHED; return; }
  [ -z "$out" ] || { echo SPOKE; return; }
  echo OK
}

# failclosed <hook>  → OK | NODENY
failclosed() {
  fresh
  printf 'edit\n' > "$repo/f.txt"
  : > "$repo/.git/refs/stash.lock"
  out=$(run_hook "$1" "$repo" 'git checkout -- f.txt')
  rm -f "$repo/.git/refs/stash.lock"
  printf '%s' "$out" | jq -e '.hookSpecificOutput.permissionDecision == "deny"' >/dev/null 2>&1 || { echo NODENY; return; }
  echo OK
}

# conflict <hook> <command> <path> <want-after>  → OK | PRECONDITION | NOSTASH | LOST | UNNAMED | INDEX | NOTRUN | CHANGED
# A repo stopped on a merge conflict in f.txt, with an unrelated uncommitted edit to sub/g.txt.
conflict() {
  hook=$1 cmd=$2 path=$3 want_after=$4
  fresh
  git -C "$repo" checkout -qb other && printf 'theirs\n' > "$repo/f.txt" && git -C "$repo" commit -qam theirs
  git -C "$repo" checkout -q main && printf 'ours\n' > "$repo/f.txt" && git -C "$repo" commit -qam ours
  git -C "$repo" merge -q other >/dev/null 2>&1
  printf 'edit\n' > "$repo/sub/g.txt"
  [ -n "$(git -C "$repo" ls-files -u)" ] && [ -n "$(git -C "$repo" status --porcelain -- "$path")" ] || { echo PRECONDITION; return; }
  before=$(git -C "$repo" ls-files -s -u; git -C "$repo" diff)
  held=$(cat "$repo/$path")
  out=$(run_hook "$hook" "$repo" "$cmd")
  sha=$(printf '%s' "$out" | sed -n 's/.*commit \([0-9a-f]\{40\}\).*/\1/p' | head -1)
  [ -n "$sha" ] && git -C "$repo" stash list --format=%H | grep -qx "$sha" || { echo NOSTASH; return; }
  [ "$(git -C "$repo" show "$sha:$path" 2>/dev/null)" = "$held" ] || { echo LOST; return; }
  [ "$(git -C "$repo" show "$sha:sub/g.txt" 2>/dev/null)" = 'edit' ] || { echo LOST; return; }
  git -C "$repo" stash list --format='%H %gs' | grep -q "^$sha .*auto-before-restore-" || { echo UNNAMED; return; }
  [ "$(git -C "$repo" ls-files -s -u; git -C "$repo" diff)" = "$before" ] || { echo INDEX; return; }
  printf '%s' "$out" | grep -q '"permissionDecision"' && { echo NOTRUN; return; }
  (cd "$repo" && sh -c "$cmd") >/dev/null 2>&1 || { echo NOTRUN; return; }
  [ "$(cat "$repo/$path")" = "$want_after" ] || { echo CHANGED; return; }
  echo OK
}

# conflict_du <hook> <path>  → OK | PRECONDITION | NOSTASH | LOST | UNNAMED | INDEX | NOTRUN | CHANGED
# A repo stopped on a modify/delete conflict: <path> deleted on main (so HEAD has no <path>), modified on
# `other`. A hand fix is written to disk, then `git checkout --theirs <path>` takes their side.
# `*.log` is ignored and the base force-adds <path>, so a `.log` path is also one plain `git add` refuses.
conflict_du() {
  hook=$1 path=$2
  fresh
  printf '*.log\n' > "$repo/.gitignore" && printf 'base\n' > "$repo/$path"
  git -C "$repo" add .gitignore && git -C "$repo" add -f -- "$path" && git -C "$repo" commit -qm 'add path'
  git -C "$repo" checkout -qb other && printf 'theirs\n' > "$repo/$path" && git -C "$repo" commit -qam theirs
  git -C "$repo" checkout -q main && git -C "$repo" rm -q -- "$path" && git -C "$repo" commit -qm 'delete path'
  git -C "$repo" merge -q other >/dev/null 2>&1
  printf 'handfix\n' > "$repo/$path"
  [ -n "$(git -C "$repo" ls-files -u -- "$path")" ] && ! git -C "$repo" cat-file -e "HEAD:$path" 2>/dev/null || { echo PRECONDITION; return; }
  before=$(git -C "$repo" ls-files -s -u; git -C "$repo" diff)
  out=$(run_hook "$hook" "$repo" "git checkout --theirs $path")
  sha=$(printf '%s' "$out" | sed -n 's/.*commit \([0-9a-f]\{40\}\).*/\1/p' | head -1)
  [ -n "$sha" ] && git -C "$repo" stash list --format=%H | grep -qx "$sha" || { echo NOSTASH; return; }
  [ "$(git -C "$repo" show "$sha:$path" 2>/dev/null)" = 'handfix' ] || { echo LOST; return; }
  git -C "$repo" stash list --format='%H %gs' | grep -q "^$sha .*auto-before-restore-" || { echo UNNAMED; return; }
  [ "$(git -C "$repo" ls-files -s -u; git -C "$repo" diff)" = "$before" ] || { echo INDEX; return; }
  printf '%s' "$out" | grep -q '"permissionDecision"' && { echo NOTRUN; return; }
  (cd "$repo" && git checkout --theirs -- "$path") >/dev/null 2>&1 || { echo NOTRUN; return; }
  [ "$(cat "$repo/$path")" = 'theirs' ] || { echo CHANGED; return; }
  echo OK
}

expect() { # expect <arm-name> <wanted> <got>
  if [ "$3" = "$2" ]; then ok "$1 → $3"; else bad "$1: expected $2, got $3"; fi
}

P1='git checkout -- f.txt'
P7='cd sub && git checkout -- g.txt'
P10="bash -c 'git checkout -- f.txt'"
P12='git checkout -- f.txt'
N1='git checkout -- sub/g.txt'

echo "── positive: every restore form saves the work and still runs"
expect "P1 git checkout -- <path>"             OK "$(pos "$HOOK" wt "$P1" f.txt)"
expect "P2 git checkout <ref> -- <path>"       OK "$(pos "$HOOK" wt 'git checkout HEAD -- f.txt' f.txt)"
expect "P3 git checkout <path> (no --)"        OK "$(pos "$HOOK" wt 'git checkout f.txt' f.txt)"
expect "P4 git restore <path>"                 OK "$(pos "$HOOK" wt 'git restore f.txt' f.txt)"
expect "P5 git restore --source=<ref> -- <p>"  OK "$(pos "$HOOK" wt 'git restore --source=HEAD -- f.txt' f.txt)"
expect "P6 git restore --staged <path>"        OK "$(pos "$HOOK" staged 'git restore --staged f.txt' f.txt)"
expect "P7 cd <dir> && git checkout -- <p>"    OK "$(pos "$HOOK" wt "$P7" sub/g.txt)"
expect "P8 git -C <dir> restore <path>"        OK "$(pos "$HOOK" wt 'git -C sub restore g.txt' sub/g.txt)"
expect "P9 quoted path with a space"           OK "$(pos "$HOOK" wt 'git checkout -- "with space.txt"' 'with space.txt')"
expect "P10 bash -c '<restore>'"               OK "$(pos "$HOOK" wt "$P10" f.txt)"
expect "P11 git checkout -- ."                 OK "$(pos "$HOOK" wt 'git checkout -- .' f.txt)"
expect "P12 restore from index is unchanged"   OK "$(pos "$HOOK" split "$P12" f.txt)"
expect "P13 restore after another command"     OK "$(pos "$HOOK" wt 'git status >/dev/null; git restore f.txt 2>&1' f.txt)"

echo "── negative: no stash and no output where nothing dirty is restored"
expect "N1 clean path, other path dirty"       OK "$(neg "$HOOK" "$N1")"
expect "N2 git checkout -b <new>"              OK "$(neg "$HOOK" 'git checkout -b other')"
expect "N3 git checkout <branch> (a switch)"   OK "$(neg "$HOOK" 'git checkout main')"
expect "N4 restore spelled inside echo"        OK "$(neg "$HOOK" 'echo "git checkout -- f.txt"')"
expect "N5 unrelated git command"              OK "$(neg "$HOOK" 'git status && git log --oneline -1')"
mkdir -p "$WORK/not-a-repo"
expect "N6 not inside a repository"            OK "$(neg "$HOOK" 'git checkout -- f.txt' "$WORK/not-a-repo")"

echo "── fail closed: dirty work that cannot be saved is not restored"
expect "F1 stash cannot be written → deny"     OK "$(failclosed "$HOOK")"

echo "── merge conflict: taking a side, or restoring another path, saves the work and runs (#4195)"
C1='git checkout --theirs -- f.txt'
expect "C1 git checkout --theirs -- <unmerged>" OK "$(conflict "$HOOK" "$C1" f.txt theirs)"
expect "C2 git checkout --ours <unmerged>"      OK "$(conflict "$HOOK" 'git checkout --ours f.txt' f.txt ours)"
expect "C3 restore an unrelated dirty path"     OK "$(conflict "$HOOK" 'git checkout -- sub/g.txt' sub/g.txt base)"
expect "C4 --theirs on a path HEAD lacks (DU)"  OK "$(conflict_du "$HOOK" d.txt)"
expect "C5 the same on an ignored, tracked path" OK "$(conflict_du "$HOOK" d.log)"

echo "── mutants: each must fail its named arm, for its named reason"
# mutant <id> <sed-expression>  → sets M to the mutant's path, or to empty if the sed changed nothing
# (called directly, never in `$(...)`, so the failure it records is counted).
mutant() {
  M="$WORK/mutant-$1.mjs"
  sed "$2" "$HOOK" > "$M"
  if cmp -s "$M" "$HOOK"; then bad "$1: the mutation did not apply (mutant is byte-identical to the subject)"; M=''; fi
}
mutant M1 "s/if (sub === 'checkout')/if (sub === 'checkout-mutated')/"
[ -n "$M" ] && expect "M1 checkout matcher broken → P1"   NOSTASH  "$(pos "$M" wt "$P1" f.txt)"
mutant M2 "s/\['stash', 'store', '-m', \`\${name} -- \${shown}\`, sha\]/['stash', 'store', sha]/"
[ -n "$M" ] && expect "M2 stash stored unnamed → P1"      UNNAMED  "$(pos "$M" wt "$P1" f.txt)"
mutant M3 "s/sha = git(hit.dir, \['stash', 'create', name\]).trim();/git(hit.dir, ['stash', 'push', '-q', '-m', name]); sha = git(hit.dir, ['rev-parse', 'refs\/stash']).trim(); git(hit.dir, ['stash', 'drop', '-q', 'stash@{0}']);/"
[ -n "$M" ] && expect "M3 stash push, not create → P12"    CHANGED  "$(pos "$M" split "$P12" f.txt)"
mutant M4 "s/if (dirty.length) { hit/if (true) { hit/"
[ -n "$M" ] && expect "M4 dirty check always true → N1"   STASHED  "$(neg "$M" "$N1")"
mutant M5 "s/if (words\[0\] === 'cd') { dir = resolve(dir, words\[1\] ?? process.env.HOME ?? '\/'); continue; }/if (words[0] === 'cd') continue;/"
[ -n "$M" ] && expect "M5 cd not followed → P7"           NOSTASH  "$(pos "$M" wt "$P7" sub/g.txt)"
mutant M6 "s/permissionDecision: 'deny',//"
[ -n "$M" ] && expect "M6 deny on failed stash dropped → F1" NODENY "$(failclosed "$M")"
mutant M7 "s/if (depth < 3 \&\&/if (false \&\&/"
[ -n "$M" ] && expect "M7 sh -c not read → P10"           NOSTASH  "$(pos "$M" wt "$P10" f.txt)"
mutant M8 "s/if (conflicted) sha = conflictSnapshot(hit.dir, name);/if (false) sha = conflictSnapshot(hit.dir, name);/"
[ -n "$M" ] && expect "M8 conflict path dropped → C1"     NOSTASH  "$(conflict "$M" "$C1" f.txt theirs)"
mutant M9 "s/if (staged.length) git(/if (false) git(/"
[ -n "$M" ] && expect "M9 staged/unmerged add dropped → C4" LOST   "$(conflict_du "$M" d.txt)"
mutant M10 "s/'add', '-f', '--'/'add', '--'/"
[ -n "$M" ] && expect "M10 that add without -f → C5"      NOSTASH  "$(conflict_du "$M" d.log)"

echo
echo "restore-autostash: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
