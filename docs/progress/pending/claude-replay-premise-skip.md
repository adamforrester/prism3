## (2026-11-18) — The integration-branch replays check their premises, and skip by name where prism3's history is absent (#3985)

`poc/arm-1`, carried as a PR into the POC repository, failed three arms of `packages/engine/test.ts` and nothing else: #3833's progress-order replay and two of #3863's release-notes replays. Those arms commit the working tree on top of the `main` it carries and re-run fold.ts and the real gates over that history. In the POC repository that `main` is an older seed of prism3 plus the contributor's own commits, so it holds neither the folds that set the versions the tree's release notes name nor the landings of the fragments its log folded, and the real gates rightly called that history wrong. The code they guard had not regressed.

Reproduced locally before the fix: a clone at `poc/arm-1` (62a34be3) whose `origin/main` is a one-commit snapshot of an older prism3 tree plus a contributor commit, HEAD the PR's merge commit, fails the same three arms by the same names (FOLDED ENTRIES; release-notes `no fold commit sets 0.237.0`). A real-history seed (`origin/main` at a prism3 commit from 2026-11-06) fails the two release-notes arms.

### What changed

- The replay now checks its premises with raw git before it builds the fixture, calling no gate's code: the checkout is not shallow; HEAD carries a `main`; that `main` reaches e6e57308, the commit that introduced `docs/progress/pending/` (#1823); and a single-parent commit in its history sets every version the tree's release notes name, and the tree's own `ENGINE_VERSION`.
- A broken premise **skips** the replay by name. A skip is not a pass: its sites count in no `pass`, the report prints `⊘ SKIPPED, not passed (#3985)` with the reason, and the closing line says "hold, EXCEPT 1 skipped span(s)" instead of "all hold". The suite exits 0 there, so a repository that only lacks prism3's history is not failed for it.
- **In prism3's own CI (`GITHUB_REPOSITORY`) a broken premise fails by name instead**, so the replay can never go quiet where it guards.
- There the span is also recorded as not run (`failSpan`), so the #1268 arm prints its sites as not run because the premise failed, rather than adding a second, unnamed `assertion site(s) never ran` failure (review nit).
- A skip still exits 0, so `verify.ts` reads the suite as PASS and the skip shows only in the suite's own output, including on a local shallow clone of prism3 without `GITHUB_REPOSITORY`. CI's `fetch-depth: 0` plus `GITHUB_REPOSITORY` still guards it. The `skip` header now says so.
- The #1268 assertion-site arm exempts a span's sites only when this run recorded it as skipped (between `// #1268 SKIPPABLE SPAN <label> BEGIN` / `END` markers, each once, in order) and prints them as skipped. That a skipped span recorded no assertion is checked at runtime by count, not by coverage: V8's coverage cannot see a zero past an unreached `&&` in a region that never ran, so 8 of the span's 10 sites read as executed when it skipped. That blind spot in the #1268 probe is its own issue, #3987.

### The gate-design call

Skip, not "read prism3's main via a pinned SHA": a repository seeded from a snapshot does not hold prism3's later commits at all, so there is no SHA to read there. The pinned anchor is used only as a premise (is prism3's history here?), never as a substitute history.

### Verified

- prism3's real history: the replay runs, 12 of 12. Mutation: `walkFrom` = `'HEAD'` in `lint-release-notes.ts` still fails the #3863 arms by name here, not a skip.
- The POC shape with this branch's tree: the replay skips by name, the suite exits 0, and #1268 lists its sites as skipped.
- A real-history seed (`origin/main` at a prism3 commit from 2026-11-06 plus a contributor commit): the replay skips on the versions premise alone (`no single-parent commit … sets 0.238.0`), and fails by name under `GITHUB_REPOSITORY=adamforrester/prism3`.
- Mutation: the anchor premise inverted fails by name with `GITHUB_REPOSITORY=adamforrester/prism3`, and skips without it.
- Mutation: a broken premise that does not `break` out of the span fails `#3985 integration replay: the span was skipped and still recorded 10 assertion(s)` by name.
