## (2026-11-19) — The integration replay in test.ts takes 22 s, not 50 s (#4236)

`test.ts`'s #3833/#3863 replay ran the real `fold.ts` in a clone of the repo, and with it the whole of `regen.ts`. It
also ran `lint-release-notes.ts` five times in a row. Measured on one 4-vCPU container at base 6dd7e614 with full
history: the section alone fell from 50.5 s to 21.9 s, and `test.ts` from 252.8 s to 229.9 s.

- **Regen narrowed in the clone only.** Before the fixture's first commit, the clone's `regen.ts` keeps two steps,
  `emit-dtcg` and `emit-figma`, and that edit is folded into W, so no later commit's diff carries it.
  - The replayed gates read the fold's version, changelog, notes and release files, plus the DIFF of moved
    artifacts. None reads the whole corpus. A half-restamped corpus is `regen --check`'s to catch, as
    `lint-emission-version.ts`' header says.
  - The four records the release notes compare carry no version stamp, so their content at the fold is W's either way.
  - The issue suggested a fold option instead. This route needs no change to `fold.ts`, so it cannot be reached from
    a real fold.
- **Release-notes runs side by side.** They run in two groups, because two runs need `origin/poc2` at the squash and
  three need it at the real merge. Trees the clone's checkout does not hold are read from `git worktree`s of the
  clone. `lint-release-notes` reads the repository its own file sits in.
- **A new arm, `#4236`,** asserts the fold's regen ran exactly the two kept steps and that each wrote. With the
  narrowing removed it fails by name, listing all 12 steps.
- **The replay's teeth still bite.** Its eight registered mutations were rerun through a standalone copy of the
  section, and each still fails by name:
  - `integrationBase` returning null;
  - each of emission-version, progress-order and executor-reach dropping its call;
  - the `ahead` test inverted;
  - `walkFrom = 'HEAD'`;
  - `integrationBase` in place of `carriedMain`;
  - `carriedMain` not returning null for `main`.

Not done here: #4278 (`keysNotDrawn`) takes the analysis reports' cost off `regen` itself. This replay no longer
runs that step at all, so the two do not overlap.
