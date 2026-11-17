---
engine: patch
---
`test.ts`'s replay of an integration-branch refresh (#3833) now passes on that branch's own tree (#3842). It
committed the working tree on top of HEAD and ran the real `fold.ts` there, so on an integration branch the fold
read that branch's own pending entries as landing on its first-parent chain, older than `main`'s newest folded
entry, and refused. The working tree now goes on top of the `main` the tree carries, as one commit, and the clone
keeps no ref of the source but `main`, so a local `poc/…` branch no longer blocks the fixture's `poc`. Tests only;
no committed artifact moves.
