## (2026-10-14) — The style guide's no-column note is tested on a second borrowed collection (#2581)

**The gap.** The Border width table borrows every border-width variable in the run's collections, so the
focus ring's widths sit in it (#2353). When a borrowed collection has a mode that no column reads, the
notes name that mode and the collection it belongs to (#2505). The wording is generic on purpose (owner
decision Q261 1A): it is meant for any borrowed collection, a client's stroke collection for example. But
every test borrowed only focus, so a note that hard-coded "focus's" in place of the collection's name
passed them all.

**The fix.** §35d in `apps/plugin/test-style-guide.ts` gains a case with a second borrowed collection:
`stroke`, holding one `STROKE_FLOAT` variable, with modes Default and Heavy. Focus keeps Default and
Compact. The Default column reads both collections' Default, so the notes must carry exactly two lines:
"focus's mode Compact" and "stroke's mode Heavy". Test-only, so no change note.

**Proof.** With the note hard-coded to "focus's" in `style-guide.ts`, the new case fails by name:
"35d: with a second borrowed collection, each note names its own collection — focus's Compact and
stroke's Heavy", printing "focus's mode Heavy". The three existing §35d cases still pass under that
mutation, which is the gap the issue describes.
