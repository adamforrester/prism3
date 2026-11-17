## (2026-11-17) — `regen --check` puts `out/` back in place (#2029)

**What.** `regen --check` snapshots `out/`, regenerates, compares, and restores the snapshot. The restore was
`rmSync(out)` and a copy back, so for that moment `packages/engine/out` did not exist. A Studio or plugin build that
read `out/` then (`apps/studio/chrome/esbuild-plugin.mjs` `loadModes()`) failed with `[map] cannot load the default
theme from packages/engine/out: …`, which names the theme, not the race. It is the likeliest cause of the one
unexplained build failure on #1905.

The restore is now `restoreTree` (`regen.ts`), which works in place: `out/` and every directory it keeps are never
deleted; a file whose bytes match the snapshot stays where it is; a file whose bytes differ is written to a hidden
sibling and renamed over the old one, which is atomic on one file system; regen's additions are removed. Every file
gets its snapshot timestamps back, as #2067 requires. Only `out/` changes. The other restored artifacts were already
copied file by file over themselves.

**No engine bump.** `regen.ts` is maintainer tooling and no artifact moves, as with #3735's `--check` change.

**Not in scope.** During `regenerate()` itself, which plain `regen` runs too, each step rewrites its files with
`writeFileSync`, so a build can still read a half-written file. Filed as #3914.

**Measured.** `test.ts` gains four #2029 arms. Three run `restoreTree` on a fixture (rewrite, same-bytes rewrite,
added file, added directory, deleted file) and check the tree is byte-identical, the timestamps are restored, and the
inodes of the root, a kept directory and an unchanged file are kept. One runs a real `regen --check` and checks that
`out/` and `out/prism3.tokens.json` keep their inodes. A deleted and recreated entry gets a new inode, so this is
deterministic, where polling for a missing file is not. On main, two fail by name (`restoreTree` is not exported;
`tokens inode CHANGED`). Mutations, each failing by name: `restoreTree` deleting and recopying (the inode arm and
the end-to-end arm), and `check()` going back to delete-and-copy while `restoreTree` stays correct (the end-to-end
arm, where `out/`'s own inode was reused and the file's was not).
