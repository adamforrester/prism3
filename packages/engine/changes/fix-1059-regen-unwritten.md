---
engine: patch
---
`regen --check` now sees a stopped emission (#1059). Before it regenerates, it ages every committed artifact to the
epoch, and afterwards it fails, by name, on any committed artifact no step wrote (`stale`) and on any step that exited 0
having written nothing (`silent`). Regeneration is in place and the named schema and engine artifacts are compared
pairwise, so an emitter that stopped writing used to leave its old copy on disk, byte-identical, and the check passed.
A plain `regen` also fails on a silent step, and its step log reports how many files each step wrote. No committed
artifact moves.
