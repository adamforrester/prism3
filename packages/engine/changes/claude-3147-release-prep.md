---
engine: patch
---
The plugin's release build refuses a checkout that is not clean and current (#3147, the owner's Q3147.16 A): npm run -w
@prism3/plugin build:release exits 1, before writing anything, when the build stamp's commit is -dirty or
git-unavailable, when the checkout is behind origin/main, or when it cannot tell (releaseCheck in
apps/plugin/git-stamp.mjs). The dev build keeps the warning, and under CI the release build warns with the same reasons
and builds. The network build's privacy note at the foot of the Inspect menu is the owner's approved wording (Q3147.7 A,
Q3147.17 A), and it wraps within the menu rather than widening it. tools/release/prepare.ts prepares a release record
(two zips and a draft note) and prints the tag, push and draft-release commands; it publishes nothing. No committed
artifact or component surface moves, and CONTRACT is unchanged.
