## (2026-11-11) — CONTRIBUTING §2 drops its obsolete pre-#1807 material; owner questions on the remaining contradictions (draft)

A draft for the owner, from the hygiene audit's duplication map. The bar is "shorter and truer, never weaker". No owner rule is dropped or changes meaning. Each cut is history that a gate or a log entry already holds, or a procedure for a case that no longer exists.

- **"Converting an open PR from the old convention"** (2 KB) becomes a one-paragraph stub, "A PR still on the pre-#1807 convention". No open PR is on that convention: the 7 open on 2026-11-11 each add only a pending fragment. The stub keeps every rule the procedure carried: move the text before merging, keep `main`'s side of the shared lines, keep your own other edits, regen, re-accept a real contract bump. It also points at `git log -S` for the full step list. Its two inbound pointers, `lint-progress-order.ts`'s CARRIES AN ENTRY hint and `/review-pr`, name the new heading.
- **"A branch that has not merged `main` since #1807 landed…"** is cut. It warned that the one-writer arm read "not yet in force" for a merge base before the FOLD MARKER, and no live branch has such a base any more.
- **The #1807 history paragraph** and **"A PR used to pay for three full runs"** each become one clause. The reasoning stays, and the history points at the 2026-09-30 log entry.
- **Not cut, and why:** CLAUDE.md keeps its resident rules (docs/43 §5) and its pinned gate list (`lint-doc-gates`). `/review-pr`'s squash bullet looks duplicated, but it adds why `--force-with-lease` can't be trusted. "Adding a gate" carries the illustrating incidents a first-time gate author needs.

Owner questions (Q-HY2 to Q-HY5, in the PR body): the two definitions of `patch`, CONTRIBUTING §6's label set against the 40 live labels, `type:bug`'s place in §6, and whether CLAUDE.md edits keep going through agent PRs (Q529 A).
