## (2026-11-06) — lint-guide-claims: a range-only citation carries its block's fingerprint (#3417)

**Status:** gate and guides only, so no engine bump, no artifact moves and `CONTRACT_VERSION` is unchanged. The
citation format gains an optional `#<8 hex>` suffix, listed in the PR as an owner question with A recommended.

### What changed

- **A FINGERPRINT arm in `lint-guide-claims.ts`.** A citation whose claim quotes nothing was checked for range
  only, so code inserted above it left it pointing at other lines, and the gate stayed green. Each such citation now
  carries `<!-- src: path:a-b#1a2b3c4d -->`: the first 8 hex digits of the SHA-256 of the cited lines as the file
  holds them. The gate hashes the lines and fails by name when they differ, and names where the block now sits when
  it is found once elsewhere in the file. A range-only citation with no fingerprint fails.
- **`--stamp`** writes a fingerprint where a citation has none and never rewrites one: a gate allowed to rewrite
  what it reads has no memory. To re-cite changed code, read it, fix the numbers, delete the old fingerprint and
  stamp again.
- **Why a fingerprint, not the issue's merge-base mapping.** A mapping run in CI needs the base's history and is
  only as good as the base: main itself already carried the drift (below), so a base-relative check would have held
  every stale citation to its stale number. The fingerprint needs no history, so it runs the same locally, in CI
  and on a shallow clone.

### The migration: 23 re-points, then 140 stamps

Stamping today's numbers would have locked in the drift main already carries. For example, `agent-link.md:27`
cited `main.ts:2343`, which reads `});`, while `figma.on('close', …)` sits at 2355. So every range-only citation was
checked by content first:
- For each one, find the commit where its claim's prose first appeared, and map the cited range from there to
  `HEAD` through the cited file's line diff (the mapping #3417 proposes).
  - **102 mapped exactly to today's numbers**, with no hunk inside the block. They are unchanged since the claim
    was written.
  - **17 mapped elsewhere.** 15 were re-pointed to the mapped block after reading it. `agent-link.md:61` was already
    two lines off at authoring, and now cites the "Nothing connects while the link is off" comment. `style-guides.md:50`
    keeps its range, which a later PR widened on purpose.
  - **19 had a hunk inside the block.** They were read by hand. 7 were re-pointed: #3432 and #3433 had shifted them by
    offsets that belonged to other ranges (the tool list in `mcp.ts`, `export_theme`, `INSPECT`, the preflight in
    `apply-theme.ts`, `componentDefs` twice, and the page taxonomy). The other 12 still bound the block they were written for.
  - **2 had no origin** under that rule. Both were read and are correct.
- Then `--stamp` fingerprinted all 140. The diff adds nothing but `#<8 hex>`.
- **An independent recompute** (`sed -n a,bp | perl -pe 'chomp if eof' | sha256sum`, no code shared with the gate)
  matches all 140.
- It first disagreed on two: both cited `provenance.ts:1-58` in a 57-line file, which the gate's range check admits
  (an off-by-one, filed separately). Both were re-pointed to `1-57` and re-stamped.

### Verification

Each mutation was committed first and restored with `git show HEAD:<path> > <path>`.
- **One line inserted above `main.ts:2355`.** The gate fails `FINGERPRINT: …agent-link.md:27: …main.ts:2355#13449644 now
  hashes to #9eb0b17b … The block now sits at apps/plugin/src/main.ts:2356`. Main's gate and guides on the same
  shift pass, `140 quote nothing and are checked for range only`.
- **One line inserted above `main.ts:1904`** (the issue's file-setup case). Four range-only citations fail as
  FINGERPRINT, and the two quoting ones fail through CITE, as before.
- **A fingerprint deleted.** The gate fails `…quotes nothing, so only a fingerprint can tell when its code moves, and
  it has none`.
- **A wrong fingerprint, then `--stamp`.** `fingerprinted 0` leaves `#00000000` in place, and the gate still fails.
- **The cited line edited in place.** The gate fails and says the cited code changed.

### For whoever re-verifies this

A fingerprint proves the cited lines are unchanged since they were stamped, not that they were the right lines then.
The audit above is that check for the stamps this PR wrote. A PR that edits a range-only cited block now has to
re-read it to go green, which is the point, and also the cost.
