---
engine: minor
---
A standard-dialect design.md's `x-prism3:` block now names each key it does not read, and the file keeps compiling (#2678, owner decision Q-XP1 A). The CLI prints one line per skipped key, `x-prism3: ignored unknown setting '<key>'`, under the applied list. Before this, a key such as `linkPalette` or `controlShape` was dropped silently. `standardToBrandInput` returns the lines as `xWarnings`. The wording is DRAFT, waiting on the owner's voice pass. No committed artifact changes.
