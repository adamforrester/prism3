#!/bin/sh
#
# SessionStart — POPULATE A FRESH WORKTREE'S node_modules, so nobody has to hand-link one.
#
# The repo is buildless, which is why a worktree with no `node_modules` looks like it works: `npx tsx`
# re-downloads and the engine runs. What fails is everything else — `apps/studio` and `apps/plugin`
# builds need esbuild's platform binary, `@prism3/tokenpress` needs jszip, and the plugin typecheck
# needs `@figma/plugin-typings`. Three lanes hit exactly that, and each one reached for the same
# workaround: hand-made symlinks into the shared checkout.
#
# THE THIRD INCIDENT WAS DESTRUCTIVE ACROSS SESSIONS, and that is what makes this structural rather
# than a reminder. `npm install` run at a worktree root wrote THROUGH those hand-made links and gutted
# the shared checkout's `@figma/plugin-typings` — a plugin typecheck that had passed minutes earlier
# failed on typings the diff never touched, in a tree whose owner was not even running the command.
# CLAUDE.md forbids the symlink workaround by name; a prohibition with no replacement is a prohibition
# people work around, so this supplies the replacement.
#
# ── WHY `npm ci` AND NOT `npm install` ─────────────────────────────────────────────────────────────
#
# `install` is free to resolve a version the lockfile does not pin, which is how an unlocked
# `@figma/plugin-typings` leaked into a review worktree on 2026-08-11. `ci` installs the lockfile and
# nothing else.
#
# And `ci` is safe in the one tree shape that made `install` destructive — MEASURED, not assumed.
# An absolute symlink `node_modules/canary-abs -> /tmp/canary-target/pkg` was planted in a worktree
# and `npm ci` was run: the link was REMOVED and the target came back byte-intact (sentinel and
# version both unchanged). `ci` clears `node_modules` wholesale instead of writing into what it finds,
# so a hand-linked tree is repaired rather than propagated through. That measurement is the whole
# reason this script may run unattended, so re-take it before replacing `ci` with anything else.
#
# ── THE GUARD THAT IS NOT PARANOIA ────────────────────────────────────────────────────────────────
#
# `node_modules` being a SYMLINK is refused outright. `ci` clears `node_modules` — and through a link,
# "clears node_modules" means clears the directory at the far end. That is another session's tree.
# The measurement above says `ci` does not follow links INSIDE `node_modules`; it says nothing about
# `node_modules` itself being one, and the difference is somebody else's work.
#
# REFUSING REPORTS, IT DOES NOT BLOCK, and that distinction is the reason every path here ends in
# `exit 0`. A hook that refused by failing would strand the one person who can fix it: an agent in a
# worktree whose `node_modules` is a symlink needs a working session to repair it, and the repair
# instruction is in the message. Measured per branch rather than reasoned from the source — all six
# (not-a-repo, no lockfile, marker-present, symlink refusal, `npm ci` failure, and both fall-off-the-
# end outcomes of the `case`) exit 0, including the two that inherit `jq`'s status by falling off the
# end. SessionStart cannot block a session at any exit code, so this is belt-and-braces rather than
# load-bearing — but a future edit could move this logic to a blocking event, and then it is the
# whole design. Keep the property; do not "propagate the error" here.
#
# ── IDEMPOTENCE IS THE MARKER, NOT A SOURCE FILTER ────────────────────────────────────────────────
#
# `node_modules/.package-lock.json` is npm's own record of what it installed. Present means npm has
# run here, so this exits silently in ~10ms and SessionStart stays free on every resume and compact.
# That is why the hook needs no `startup|resume` matcher: a filter would guess when the tree is stale,
# and the marker knows. Note what it deliberately does NOT check — whether the installed tree still
# AGREES with the lockfile. A tree npm populated and a human then broke (a deleted package, an
# interrupted install) keeps its marker and is skipped here. Repairing that is `npm ci` by hand; this
# hook answers "was there ever an install", which is the failure all three lanes actually hit.
#
# ── THE CO-TENANT: `settings.json` REGISTERS TWO SessionStart HOOKS ───────────────────────────────
#
# The other one reports whether the branch is behind `origin/main`. Both run, NEITHER can stop the
# other, and neither can stop the session: matching hooks run in PARALLEL, each in its own process
# with its own timeout, and a failure is reported per-hook while the others still execute and their
# output is still collected. So do not read the array order as sequencing — this hook is listed first
# and that guarantees nothing. They are safe to run concurrently because they touch disjoint state
# (this one writes `node_modules`, the other reads git refs), which is a property to re-check rather
# than assume if a third is ever added. If a future hook genuinely DEPENDS on this one's install, the
# only way to order them is to put both steps in one script.
#
set -u

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

# Not this repo, or a repo with nothing to install. `ci` REQUIRES a lockfile, so this is a
# precondition and not a nicety.
[ -f package-lock.json ] || exit 0

# Already installed — the common case, and the reason this hook is nearly free.
[ -f node_modules/.package-lock.json ] && exit 0

# One newline, portably, for multi-line report bodies.
nl=$(printf '\nx'); nl=${nl%x}

emit() {
  jq -n --arg m "$1" \
    '{systemMessage:$m,hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$m}}'
}

if [ -L node_modules ]; then
  emit "node_modules is a SYMLINK, so npm ci was NOT run — it clears node_modules, and through a link that clears the tree at the far end, which is another session's work. Replace it with a real directory and re-run \`npm ci\` yourself: rm node_modules && npm ci"
  exit 0
fi

out=$(npm ci 2>&1)
if [ $? -ne 0 ]; then
  emit "npm ci FAILED in this worktree, so node_modules is absent or partial: the engine will still run under tsx, but the studio/plugin/tokenpress builds and the plugin typecheck will fail on missing deps. Do not hand-link them — CLAUDE.md forbids it and the last attempt damaged a shared checkout. Fix the install.${nl}${nl}${out}"
  exit 0
fi

# CONFIRM THE WORKSPACE LINKS RESOLVE INSIDE THIS TREE, which is the one property no other check
# catches: an absolute link into another checkout satisfies "the import resolved", typechecks, builds,
# and exits 0 while loading the code from the tree you are not working in. Only `realpath` sees it.
links=$(node -e '
  const fs = require("fs"), p = require("path");
  const root = fs.realpathSync(".");
  const dir = "node_modules/@prism3";
  let names;
  try { names = fs.readdirSync(dir); } catch { console.log("ABSENT"); process.exit(0); }
  const outside = names.filter((n) => !fs.realpathSync(p.join(dir, n)).startsWith(root + p.sep));
  console.log(outside.length ? "OUTSIDE " + outside.join(", ") : "OK " + names.length);
' 2>/dev/null) || links="ABSENT"

case "$links" in
  OK\ *)
    emit "npm ci populated this worktree's node_modules, which had none (the buildless engine hides this until a build or typecheck needs esbuild, jszip or @figma/plugin-typings). All ${links#OK } @prism3/* workspace links resolve INSIDE this worktree."
    ;;
  *)
    emit "npm ci succeeded but the @prism3/* workspace links do not resolve inside this worktree ($links). Every @prism3/* import is loading code from another tree, with exit 0 and no warning — a build or a review here would be measuring the wrong checkout. Do not proceed until this is fixed."
    ;;
esac
