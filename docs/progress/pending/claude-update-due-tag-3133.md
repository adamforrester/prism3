## (2026-11-01) — Update file at 380: a due set's tag stays inside the dialog (#3133)

**Status:** panel fix (`update-file.ts`, `chrome.css`) and a new `test:chrome` section, `3133` (shard 3). ENGINE patch
(change note): no committed artifact, emission or component surface moves. The plugin's main thread is unchanged.

### Diagnosis

A due row is the checklist's `check()` button: its box, then the set's name, then its why-tag, all on the button's one
flex line. That line cannot wrap, and the tag is `flex: none` (`.p3-sg-tag`), so the name (`min-width: 0`) gave up its
width first and the tag then ran past the body's edge. At 380 the body's content box is 330px wide; "Engine update:
recorded before Prism3 noted what it drew" drew from x 98 to 439 against a right edge of 355, and the name read "Se".

### The fix

The name and the tag now sit in one `.p3-check-text` span, the wrapping line the lever kit's check rows already use.
Where both fit, nothing changes: the tag stays at the line's end, the same 12px from the name. Where they do not, the
tag drops under the name, and a tag wider than the line shrinks and wraps its words inside its fill. No copy, color or
size changes; the run's Due/Updating rows (`update-run-row`) carry short tags and are left as they are.

### Test

`test:chrome` section `3133`: the plugin at 380 and 1280, light and dark, three due sets (one per reason), Update file
opened and its check answered. Each tag must be drawn whole inside the body's content box and its own row, each name
whole, and no sideways scroll; at 1280 each tag stays on its name's line. Mutation (after a `wip:` commit): the name and
tag handed to `check()` as two spans again, not the wrapper → `#3133 figma light 380: each due set's tag is drawn
whole, inside the Update dialog's body and its own row …` and `… each due set's name is drawn whole …`, light and dark.
