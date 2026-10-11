## (2026-10-11) — Interactive components grounded: reactions on variants, measured on a plugin-built Button set (#2466)

**STATUS: branch `docs/2466-interactive-grounding`.** Docs only (`docs/18` §3). No code, no artifact moves, no ENGINE bump. This is the grounding probe #2466's plan asked for first (comment 6102771910). Owner decisions on scope and transitions come next.

**What was measured.** Live, on the scratch file's plugin-built Button set (576 members), in three passes: the Desktop Bridge for writing and reading reactions, the agent link (`tools/figma-bridge`) for the Update, and the owner in presentation mode. The owner approved the swap sequence (Q236 A). The findings are in `docs/18` §3.

**The finding that decides the build.** The in-place Update's fingerprint doesn't include reactions:
- the set read up to date, with an unchanged preview hash, with 288 reactions on it;
- an overwritten member kept its id and its reactions;
- a replaced member came back under a new id with none, and its siblings' reactions pointed at the old, orphaned id with no error.

So reactions can't be kept "as built". They have to be written from the plan on every apply, by state. Whether the as-built record should include them, so an Update can report one removed by hand, is an owner question for #2466.

**Traps for whoever builds it:**
- `MOUSE_ENTER` / `MOUSE_LEAVE` need a `delay`, or `setReactionsAsync` refuses them.
- After a member is deleted, `getNodeByIdAsync` still returns the old node (`removed: false`, `parent: null`). A check for dangling destinations has to test the parent, not only existence.
- The agent link has no code-execution command, so the probe needed a plugin swap. #2530 is the spike on fixing that for development.

**Cleanup, verified:** every reaction was removed (0 left on 576 members) and the probe page was deleted. The two test edits, the owner's fill change and a deleted member, were rebuilt to the plan by the Update. A version was saved before it ("Before Prism3 updated button").
