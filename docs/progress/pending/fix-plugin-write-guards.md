## (2026-11-19) — Plugin writes: each run is its own undo step, and the as-built record splits past Figma's cap (#4158, #4162)

**#4158, one undo step per run.** Figma keeps a plugin's actions in one undo step until the plugin calls
`figma.commitUndo()`. Prism3 never called it, so that a run would be one step (`write-components.ts`'s header). Going
by Figma's documentation, though, two runs in one open panel (Apply Theme, then Build), or an agent's command after a
run, could collapse into one step, and one undo would then take back both. `guarded` (`main.ts`), the one door every
write goes through from the panel and the agent link, now commits as the write starts and before its first write. What
came before closes as its own step, and the run itself is still one step. A read (Prune's preview) commits nothing.
Confirming the original behavior needs a real host (the issue's Mac steps). The call is safe either way: it adds only
the boundary the copy already promises.

**#4162, the as-built record past the cap.** `recordSets` wrote every set into one plugin-data key. Figma refuses a
value over about 100 kB, and every caller swallows the refusal (`catch { /* read as due again */ }`), so a master file
whose record grew past it would read every set as unrecorded, for good, with nothing naming why. Today's catalog
record is 24 kB. With forty kept changes a set (`held`, #3421) it is 185 kB. Past `PART_BUDGET` (90,000 bytes, room
for the plugin id and key), the record is now written across `prism3:asBuilt` and `prism3:asBuilt:1…n`, and the first
key names the count. Under the budget it stays one key in the format earlier plugins read, so no file changes until
it would otherwise have failed. The parts are written before the first key, and a record that shrinks clears the
parts it no longer uses. An unreadable part leaves only its own sets unrecorded.

**Held for the owner (#4162).** Two of the issue's suggestions change what a designer sees: capping `held.changes`
(Update file lists them under Kept edits), and naming a refused record write in the verdict (new copy). Both are
flagged on #4162 with options. The split removes the failure they would report.

**Tests.** `apps/plugin/test-write-guards.ts` (new). #4158 is read off the host: a shim logs each `commitUndo` and each
variable write through `main.ts`'s real Apply Theme, run twice. #4162 uses a root that refuses a value over 100,000
bytes (typed in the test), the real catalog's entries, and a budget arm: today's record within 60% of the cap.
