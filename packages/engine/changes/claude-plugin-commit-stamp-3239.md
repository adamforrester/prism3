---
engine: patch
---
Plugin: every build stamps the git commit it came from, beside the tree token (#3239). The stamp is now `<ISO seconds> tree-<8 hex> <commit>`, where the commit is the short sha, `<sha>-dirty`, or `git-unavailable` when git cannot run. The menu stamp, the verdict note, the console line and the agent link's `link` record carry it. The build warns, without failing, when the checkout is behind `origin/main`, and says plainly when git cannot run. Wording is DRAFT for the owner. No emitted artifact, token or projected component surface moves, and the executor is unchanged.
