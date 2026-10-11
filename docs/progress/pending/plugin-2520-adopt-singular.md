## (2026-10-10) — Update dry run test: the singular "Adopt can claim it." is pinned as a literal (#2520)

**Status:** test only (`apps/plugin/test-update-components.ts`). No product code moves, no engine bump, CONTRACT and
`EXECUTOR_REVISION` unchanged.

#2476 shipped the dry run's Adopt clause, and its test pinned only the plural ("Adopt can claim them.").
#2516's `unbuilt/apply as previewed` arm compares the apply's set line with `previewLine` itself, which can't
fail on a wording change. So rewording the singular clause passed every suite.

The new arm, `converged/adoptable one`:
- **Setup:** builds the Button set (576 members) and takes the stamp and record off one member, so it holds its
  planned coordinate and is adoptable.
- **Assertion:** the set's line is the literal the UI lane gave:
  `button: no changes (576 members). 1 not built by Prism3, left as they are. Adopt can claim it.`
- **Premise:** pins the counts (576 members, 1 not built by Prism3, 1 adoptable, nothing to add, no change listed).

Mutation, from a `wip:` commit and restored with `git checkout --` (the issue's own: `'it'` → `'that one'`):
`✗ converged/adoptable one: a set with one member Adopt could claim reads "… Adopt can claim it." (got "button: no changes (576 members). 1 not built by Prism3, left as they are. Adopt can claim that one.")`.
It is the only failure of 126.
