## (2026-11-01) — test:chrome: the font read waits for laid-out text (#3255)

Section 3170's "updating" arm failed twice in CI (`chrome (3)` on #3252 and #3256, light and dark) with `p3-status-what`, `p3-status-n` or `p3-status-stop` "drew nothing", and passed locally. It wasn't a paint race in the usual sense, and no sleep fixes it.

### The cause

`fontsDrawn` reads each probed element's fonts with CDP `CSS.getPlatformFontsForNode`. That call counts the glyphs of the element's **laid-out** text and does not run layout itself. While a run is out, the status strip repaints once a second (`shell/status-strip.ts`, `TICK_MS`) and replaces the text nodes of its words, its count and its Stop: exactly the three elements in the failures. A font read that lands after a tick and before the next layout sees those elements with no laid-out text and reports no font at all. The node itself, its attributes and its markup all read whole, so #3069's "the node went" guard never fires. The "reading" arm has no clock and never ticks, which is why it never failed.

Shown directly: a standalone page whose span's text is changed and then read by CDP reports 0 fonts until `offsetHeight` forces layout, then 1. In section 3170, a loop reading the strip's three elements by CDP for 5 s came back empty 4–8 times per arm, clustered a second apart (one cluster per tick).

### The fix

`fontsDrawn` now reads against a laid-out tree. In one page task it numbers the probed elements, installs a `MutationObserver` (childList and characterData) and forces layout. After the read, each probed element whose text changed under the read is read again (fonts only, by the node id it was first read as). Each re-read happens after a forced layout in the same task that collected the changes, until a read of it sees no change. If every round in `AGAIN` (6) still has a change, it returns null, as for a node that went, and `measure` re-probes and then throws its named "re-rendered under the font read" error rather than a false "drew nothing". An element whose text did not change under its read is reported as read, so a real absence still fails on the first read. The fix is in the shared reader, so every `measure` in the suite gets it, not just 3170's.

A first version waited two frames between rounds and counted changes during the wait. That never settles when the tick is faster than a frame pair: a change before the layout point doesn't matter, so the window now starts at the forced layout.

### Verification

- **The race, made deterministic** (a `wip:` mutation, `TICK_MS` 1000 → 25, section 3170 alone): `main`'s reader failed every run with the CI message (`… / updating: … p3-status-what … drew nothing | … p3-status-n … drew nothing`). The new reader passed 2/2 unthrottled and 5/5 under `Emulation.setCPUThrottlingRate` 4. Before the "null past `AGAIN`" change, 1 of 4 throttled runs exhausted the rounds and printed a false "drew nothing". Now it re-probes instead.
- **A real absence still fails by name** (a `wip:` mutation, `.p3-status-n { content-visibility: hidden; contain-intrinsic-size: … }`: the element keeps its box, its text draws nothing): `✗ 3170 figma {light,dark} 1280 / {reading,updating}` and `light 380` all fail with `<span class="p3-status-n" … drew nothing`, 6 of 465. "Updating" is the arm where `n` changes every tick and goes through the re-read path.
- Section 3170 alone at the real tick: 465/465, repeatedly, unthrottled and at 6× throttle.
