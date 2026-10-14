## (2026-10-14) — component-shim: each combined set gets its own id (#2593)

**What happened.** `component-shim.ts`'s `combineAsVariants` set `set.id = 'SET:1'` on every set it made. The apply's
identity check (VERIFY (a) in `update-apply.ts`) finds a set after the build's pass by its id or key, so with several
sets on a page it found the first `SET:1` and reported the set it had just updated as replaced, every member "no
longer in the set". A real host gives each set its own id, so only the harness was wrong, but every multi-set apply
test had to assign ids by hand, as `test-reactions.ts`'s `all three/…` did.

**The fix.** Under `identities`, a set keeps the `N:` id `mkNode` already gave it from `nodeSeq`, as every other node
does; without `identities`, sets are numbered in their own sequence, so the first is still `SET:1` (the #1561 parent-id
parity needs a string). No test pinned `SET:1`: the only literal was the workaround, now removed.

**Verification.** `test-reactions.ts` `all three/converges` runs with no ids assigned by the test. Mutation: every set
named `SET:1` again → `all three/converges` fails by name ("⚠ 1 set not verified … id SET:1 → SET:1").
