## (2026-10-11) — Export dialog: the preview draws the chrome's focus ring, inside its edge (#2523, owner decision Q229 A)

The export dialog's preview (`pre.p3-export-pre`) has been a Tab stop of its own since #2124, and it drew the browser's ring: 1px `#005fcc`, no offset. PR 5's ring sweep with the dialog open found it (#2527) and pinned it as a known gap. The owner's Q229 A: draw the chrome's 2px ring INSIDE the preview's edge, as the two scrolling panes draw theirs, so scrolling never clips it.

**The change.** `.p3-export-pre` joins the panes' inner-ring rule in `chrome.css` (`outline-offset: calc(-1 * var(--p3-focus-width))`). The preview gets the hook `export-preview`, which joins `INNER_RINGS` in `test-chrome.mjs`. The pinned gap in `PR5_RING_GAPS` is closed and removed.

**Why inside, measured.** The preview fills its column (`p3-export-prevs`) exactly: same rect, 463 × 380 at 1280. It scrolls both ways itself: 1698 tall and 622 wide of content. Its column clips at its edges and does not scroll. So a ring 2px outside would be lost on every side, and one inside the edge is drawn whatever the scroll.

**The test** (§47, PR 5's dialog case). The preview is focused by Tab and scrolled to each of its four corners. At each corner the ring is read by `FOCUS_RING_READ` and held to `ringMisses` as an inner ring: `color.border.focus`, 2px or more, `offset ≤ −width`, 3:1 against its own ground. The preview's box must also sit inside every ancestor that clips. It reads 2px `#1e1eff` at −2px, 6.44:1, at all four, on web and figma.

**Mutations,** each from a `wip:` commit, with both bundles rebuilt, each failing by name:
- **the preview dropped from the inner-ring rule:**
  - `✗ … with the export dialog open, each of its 15 controls walked by Tab draws the chrome ring … — export-preview: color #005fcc …`
  - `✗ … #2523 the export preview draws the chrome ring inside its edge … (start/start 1px #005fcc at 0px …)`
- **the ring drawn 2px outside:**
  - `… export-preview: an inner ring at offset 2px, want -2px or less`
  - and the #2523 arm.
- **the preview pushed past its column's edge:** the #2523 arm alone, `… clipped by p3-export-prevs`.

**One existing arm moved with the hook.** S13.1's tab-order walk names each stop by its hook, or by its tag when it has none. So its "the export preview is a Tab stop of its own … and Tab reaches it" arm now looks for `export-preview` rather than `pre`. The first full verify caught it, on every host, theme and width.

**A trap for whoever mutates this.** The chrome CSS build allows tokens only, so a raw `-6px` fails the build, and the suite then reports a stale bundle, not the arm. Write a mutation in tokens (`calc(-1 * var(--p3-space-075))`).
