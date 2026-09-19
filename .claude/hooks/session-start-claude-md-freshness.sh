#!/bin/sh
#
# SessionStart — IS THE CLAUDE.md THIS SESSION OBEYS THE CURRENT ONE? (#1110)
#
# The instructions an agent follows are the bytes in its own checkout. A stale checkout carries stale
# instructions that read as authoritative, and nothing anywhere says so. On 2026-08-27 an orchestrator
# session on a clone **63 commits and 6 days behind** quoted "105 artifacts" out of its own `CLAUDE.md`
# into a lane brief. `main` said 114. The brief was faithful to the file it read.
#
# ── THE NEGATIVE RESULT, WHICH DISQUALIFIES THE OBVIOUS IMPLEMENTATION ─────────────────────────────
#
# The tempting version of this check compares the count sites to each other. It cannot work, and #1110
# measured why: at `57b6bc7` `verify.ts`, `CLAUDE.md` and `ci.yml` **all three read 105** — agreeing,
# and all wrong. A stale checkout is INTERNALLY CONSISTENT, so any check reasoning only about the
# current tree reports clean over a stale world. That is `docs/34` **shape 17** (both sides descend
# from one producer — here the checkout — so an ancestor mutation moves them in lockstep and the
# comparison stays byte-equal), and it is the reason the oracle has to arrive from outside the tree.
#
# It is also why this is a REPORT and not a gate. A gate runs inside the tree it is judging; the only
# thing that can see past the tree is a network round-trip at the moment somebody starts working.
#
# ── WHY IT FETCHES, AND WHY THAT IS NOT THE REASON YOU WOULD GUESS ────────────────────────────────
#
# The obvious rationale — *"a local ref is derived from the subject"* — is **false here, and #1110
# corrected it.** Worktrees share the parent clone's refs, so `origin/main` reads identically in all of
# them, including trees whose `HEAD` is three weeks old. The local ref is already independent of the
# working tree in the shape-17 sense.
#
# The real defect is that **the local ref's freshness is unowned.** `origin/main` is only as current as
# the last fetch by any unrelated session, so *"you are up to date with `origin/main`"* can be true
# while `origin/main` is six days old — and that failure is silent and indistinguishable from correct.
# A stale oracle does not go quiet; it produces a confident all-clear. That is the whole argument for
# the network call, and it is why removing the fetch is a mutation this check must not survive (M2).
#
# ── THE ORACLE IS A SHA FROM `ls-remote`, NEVER THE `origin/main` REF ──────────────────────────────
#
# `git ls-remote` asks the remote what `main` is and writes nothing. Everything below compares against
# that SHA. Reading `origin/main` after a fetch would have been the shorter spelling and is wrong in
# two ways at once:
#
#   • A fetch that exits 0 does not promise the remote-tracking ref moved. `refs/remotes/origin/main`
#     is shared with every other worktree and every concurrent session, and its update is an
#     opportunistic side effect holding a lock somebody else may have. Losing that race leaves a STALE
#     ORACLE BEHIND A SUCCESSFUL FETCH — the exact failure this check exists to detect, reproduced
#     inside the detector.
#   • The SHA makes the oracle traceable in the output. "Differs from `origin/main`" is unfalsifiable
#     six days later; "differs from `2d14b5c`" can be checked by anyone.
#
# So the fetch is only needed to bring the OBJECTS, and it is skipped entirely when they are already
# present. A fetch that fails is fatal only if the objects are still missing — which is also why a
# concurrent fetch losing a ref lock is harmless here rather than a false alarm.
#
# ── THREE OUTCOMES, NEVER TWO ─────────────────────────────────────────────────────────────────────
#
# `CANNOT DETERMINE` must never collapse into `UP TO DATE`, and this is not hypothetical. #1110 found
# a shallow clone with no `origin/main` at all, where the naive comparison exits
# `fatal: bad revision 'origin/main'` — treat that as "differs" and you get a false alarm, treat it as
# "same" and you get a false all-clear. **CI checks out shallow too.** So: current, differs, or
# undeterminable, and the third says so out loud with its reason attached.
#
# Severity is split on the same evidence rather than flattened, because the two differ in what they
# ask of the reader: DIFFERS + behind is somebody else's committed change you have not pulled, and
# DIFFERS + not behind is your own edit or your own commit. Both print the diff. Only one is staleness.
#
# ── WHAT IT DOES NOT SEE — its ceiling, stated because the output is where a reader will look ─────
#
#   • It checks that `CLAUDE.md` is CURRENT, never that it is CORRECT. All three sites agreeing on a
#     wrong number in `main` passes this untouched — that is a cross-site gate's job (#1110 §1 keeps it
#     as a live, orthogonal recommendation), and the two are complements, not substitutes.
#   • Nothing enforces that it ran. A session started another way, a subagent, or a human reading the
#     file gets no signal. This is a real ceiling and no version of this hook removes it. The one thing
#     done about it: the CURRENT outcome still emits a line into the session's context, so "no message"
#     means the hook did not run rather than "the check passed".
#   • Only what it compares. Scope is files NAMED `CLAUDE.md`, at any depth, taken as the union of the
#     oracle's tree and this tree's — derived rather than enumerated, so a new nested one is covered on
#     the day it lands and no list rots. A stale `docs/`, skill, command or `agents.md` file is
#     invisible, and widening the scope is a decision, not a fix.
#   • It reports that something changed, not what it means. So it prints the DIFF rather than a
#     verdict: "CLAUDE.md differs" does not say the count moved 105 → 114, and a reader who has seen a
#     boolean fire once learns to skip it. Long diffs are truncated with the dropped line count stated
#     and the command to see the rest — never silently.
#
# ── REPORT, DO NOT BLOCK ──────────────────────────────────────────────────────────────────────────
#
# Every path ends in `exit 0`, for the same reason as its co-tenant: refusing to start a session on a
# stale tree strands the only person who can update it. SessionStart cannot block a session at any
# exit code today, so this is belt-and-braces — but keep the property, because a future edit could
# move this logic somewhere that can.
#
# ── THE CO-TENANTS: `settings.json` REGISTERS THREE SessionStart HOOKS ────────────────────────────
#
# Matching hooks run in PARALLEL, each in its own process with its own timeout; array order sequences
# nothing. The `npm ci` hook touches disjoint state. **The behind-count hook does not: it also fetches
# `origin main` in the same clone**, so the two race on `refs/remotes/origin/main`'s lock. Measured
# rather than reasoned — 8 concurrent `git fetch origin main` in one clone, repeated: every one exited
# 0, and git serializes on the ref lock instead of failing. Even if one did fail, this check reads a
# SHA from `ls-remote` and not that ref, so a lost race costs it nothing (see above). Do not "fix" the
# duplicate fetch by making this one read the other's ref — that is M2, and it is the mutation this
# check is built to fail.
#
set -u

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

# One newline, portably, for multi-line report bodies.
nl=$(printf '\nx'); nl=${nl%x}

CEILING="Scope: files named CLAUDE.md only, so a stale docs/, skill or command file is invisible. This
answers whether the file is CURRENT, never whether it is CORRECT (see the hook's header and #1110)."

# The CURRENT outcome is held to ONE LINE — long enough to prove the check ran and to name its own
# ceiling, short enough that nobody starts skipping it. `mutations.sh` asserts the line count.
CEILING_SHORT="Scope: files named CLAUDE.md; answers CURRENT, not CORRECT (#1110)."

# CURRENT is context-only on purpose: the user does not need a per-session all-clear on screen, but the
# session needs to know the check ran, so that no message means it did not.
quiet() { jq -n --arg m "$1" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$m}}'; }
loud() {
  jq -n --arg m "$1" \
    '{systemMessage:$m,hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$m}}'
}

undetermined() {
  loud "CANNOT DETERMINE whether this checkout's CLAUDE.md is current: $1

This is NOT an all-clear. The instructions this session is following may be days old and there is no
signal either way — #1110's whole subject is a stale CLAUDE.md that reads as authoritative. Check by
hand before quoting anything from it into a brief: git fetch origin main && git diff origin/main -- CLAUDE.md

${CEILING}"
  exit 0
}

git remote get-url origin >/dev/null 2>&1 || undetermined "this clone has no 'origin' remote, so there is nothing to compare against."

# THE ORACLE. A network read that writes no refs, bounded so a hung connection cannot sit on the
# hook's whole timeout budget (the http.* settings are ignored for ssh remotes, harmlessly). The SHA is
# selected BY REF NAME rather than by line number, so a warning on stderr cannot be parsed as a commit.
ls_out=$(git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=15 ls-remote origin refs/heads/main 2>&1)
if [ $? -ne 0 ]; then
  undetermined "the fetch failed, so the current state of origin/main is unknown.${nl}${nl}${ls_out}"
fi
oracle=$(printf '%s\n' "$ls_out" | awk '$2=="refs/heads/main"{print $1; exit}')
[ -n "$oracle" ] || undetermined "origin has no 'main' branch to compare against."

# The fetch exists only to bring the objects that SHA names, so it is skipped when they are already
# here and is fatal only if they are still missing afterwards.
if ! git cat-file -e "${oracle}^{commit}" 2>/dev/null; then
  fetch_err=$(git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=15 fetch --quiet origin main 2>&1)
  if ! git cat-file -e "${oracle}^{commit}" 2>/dev/null; then
    undetermined "origin/main is at ${oracle}, but fetching that commit into this clone failed, so its CLAUDE.md cannot be read. A shallow clone does this.${nl}${nl}${fetch_err}"
  fi
fi

# SCOPE, DERIVED FROM BOTH SIDES so that a CLAUDE.md added on main and absent here still counts.
paths=$(
  {
    git ls-tree -r --name-only "$oracle" 2>/dev/null
    git ls-files 2>/dev/null
  } | grep -E '(^|/)CLAUDE\.md$' | sort -u
)
[ -n "$paths" ] || exit 0

# Line-oriented rather than word-oriented throughout: this repo has tracked paths with spaces in them
# (`reference/New Balance/`), so splitting a path list on whitespace is a latent defect even where no
# CLAUDE.md sits under one today.
differing=$(
  printf '%s\n' "$paths" | while IFS= read -r p; do
    [ -n "$p" ] || continue
    git diff --quiet "$oracle" -- "$p" 2>/dev/null || printf '%s\n' "$p"
  done
)

behind=$(git rev-list --count "HEAD..${oracle}" 2>/dev/null) || behind=""

if [ -z "$differing" ]; then
  n=$(printf '%s\n' "$paths" | wc -l | tr -d ' ')
  if [ -n "$behind" ] && [ "$behind" -gt 0 ] 2>/dev/null; then
    quiet "CLAUDE.md freshness (#1110): all ${n} CLAUDE.md file(s) match origin/main at ${oracle} (fetched now); this branch is ${behind} commit(s) behind it but none of them changed a CLAUDE.md. ${CEILING_SHORT}"
  else
    quiet "CLAUDE.md freshness (#1110): all ${n} CLAUDE.md file(s) match origin/main at ${oracle} (fetched now). ${CEILING_SHORT}"
  fi
  exit 0
fi

# PRINT THE DIFF, NOT A VERDICT — capped, with the drop stated. `docs/34`'s no-silent-caps rule: a
# truncation nobody is told about reads as "that was all of it".
LIMIT=60
full=$(
  printf '%s\n' "$differing" | while IFS= read -r p; do
    [ -n "$p" ] || continue
    git diff -U1 "$oracle" -- "$p" 2>/dev/null
  done
)
listed=$(printf '%s' "$differing" | tr '\n' ' ')
total=$(printf '%s\n' "$full" | wc -l | tr -d ' ')
body=$(printf '%s\n' "$full" | sed -n "1,${LIMIT}p")
if [ "$total" -gt "$LIMIT" ] 2>/dev/null; then
  body="${body}${nl}[... $((total - LIMIT)) more diff line(s) not shown. Full text: git diff ${oracle} -- ${listed}]"
fi

# An UNKNOWN commit distance takes the loud branch, not the reassuring one: "not behind" is a claim,
# and the only thing measured at this point is that the bytes differ.
if [ -z "$behind" ]; then
  loud "STALE INSTRUCTIONS (possibly): this checkout's CLAUDE.md differs from origin/main at ${oracle} (fetched now), and the commit distance to it could not be computed, so whether this is staleness or your own edit is unknown. Treat it as stale until you have looked. Differing: ${listed}

${body}

${CEILING}"
elif [ "$behind" -gt 0 ] 2>/dev/null; then
  loud "STALE INSTRUCTIONS: this checkout's CLAUDE.md differs from origin/main, and this branch is ${behind} commit(s) behind it (oracle ${oracle}, fetched now).

The project instructions this session is obeying are NOT the current ones. Do not quote counts, gate
lists or paths out of them into a brief or a PR without reading the current file first — #1110 exists
because an orchestrator 63 commits behind did exactly that, faithfully, and briefed a lane on a number
that had moved. Differing: ${listed}

${body}

${CEILING}"
else
  loud "CLAUDE.md differs from origin/main, but this branch is NOT behind it (oracle ${oracle}, fetched now) — so this is your own uncommitted edit or your own commit, not a stale checkout. Reported rather than hidden because the file this session obeys is not the one on main either way. Differing: ${listed}

${body}

${CEILING}"
fi
exit 0
