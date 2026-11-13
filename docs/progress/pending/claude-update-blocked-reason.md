## (2026-11-12) — Update file: a blocked set names its own reason (#3713, 1 of 4)

Update file's Due row for a blocked set read "Can't be updated in place yet; the agent's update check says why", and nothing on screen showed that reason. The plugin's scoped check knew it: `SetPreview.blockers` holds each blocker line. But `checkedSetOf` sent Studio only `blocked: true`. So the owner, looking at a blocked Icon set, had no way to tell what to do.

**The fix.** `CheckedSet` now carries `reasons`, the blocker lines themselves, only on a blocked set. Studio's `write-adapter` keeps them, dropping any reason of the wrong type, and never keeps them on a set that isn't blocked. `UPDATE_COPY.checked` says `Can't update yet — <first reason, plain words> <next step>`, then counts any further reasons. `blockedWhy` maps the known shapes from `fileBlockers` and `setRefusal` to plain words. It adds a next step only where one exists:
- Add on Components, for a missing nested or swapped-to set.
- Tick Theme, for missing variables or styles.
- Fix the font in Figma.
- Fix the variant names by hand in Figma.
- The agent's Adopt, for variants not built by Prism3.

With Theme ticked, the reasons Theme's run clears (variables, text and effect styles) are skipped: the row leads with what still blocks and counts only those, so it never asks the person to tick Theme again. Set names come from the shell's `displayNameOf` (owner decision Q392), so a row names a set as Components lists it ("Sign-in button", not a name rebuilt from the id). The plugin's style and swap-target lists, cut at three, now say how many more they leave out.

A shape it doesn't know falls through to the line as written, less its issue references. A reworded blocker therefore shows its own words, never a wrong reason. Every string is a DRAFT for the owner.

**Not fixed here: there is no path in Studio for some reasons.** That gap is filed as #3714. Studio can't adopt, can't rebuild a set the file holds, and drops a set the check refused outright.

**Independence.** `test-update-file.ts` holds 16 literal blocker lines, copied from the plugin, against literal output. `test-update-kept-run.ts` runs a real check's blockers (a missing `icon/close` plus missing variables) through the same copy and expects the literal line. **Mutation:** with `checkedSetOf`'s `reasons` dropped, the plugin test fails `theme only/nest` and `theme only/dry run`. With the blocked branch back to the old fixed line, the Studio test fails every `#3713 reason` arm. With `blockedLine` ignoring Theme, `#3713 theme ticked` fails. With set names built from the id rather than the name function, every naming arm fails.
