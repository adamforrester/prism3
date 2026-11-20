## (2026-11-20) — Two test:chrome flakes were debounce timers landing mid-measurement (#2641, #3340)

### A slider drag stores once, even when it pauses (#2641, part of #2745)
`perFrame` (`apps/studio/src/ui/lever-kit.ts`) holds the store's persist from a drag's first `input` until its
release, so a drag stores once (#2487 B1). One of its releases is `QUIET_MS` (400 ms) with no `input`, there for a
value set with nothing after it. It also ran while the pointer was still pressed. A drag that paused, or one frame
that ran long under load, was released mid-gesture: one write. The pointer's release then wrote again. That is the
"2 written" §46 caught in loaded verify runs. It was a product bug, not a test bug: a user who pauses mid-drag got
two writes. The quiet timer now isn't armed while a pointer is pressed on the control. The pointer's own release,
which the window-level `pointerup`/`pointercancel` listener already catches, ends the drag.

New §46 arm: a drag that holds the pointer still for 900 ms halfway stores one write, where it ends. It fails on main
(`2 written; 1 → 2, stored 2`) and passes with the fix. Removing `if (!pressed)` fails it by name.

### The Docs post check waits for the pick's recount (#3340)
Section 9's figma Docs check recorded the plugin's posts from after `open()` and read a 50 ms window after the
click. Picking the example in `open()` arms the badge recount (`due-request`, `DUE_DEBOUNCE_MS` = 250 ms after the
pick, #3081). On this machine it lands a few ms after the window closes; on a slower one it lands inside it. The
case now records from boot (`open`'s `prep`), waits for that `due-request` to land, and reads only what is posted
after the click. A new premise arm says the recount landed first.

Reproduced with a forced delay: an init script holds the page's 250 ms timer until the pointer reaches Docs (or
1.5 s). Main fails 3 of 3 with the CI signature (`posted [{"type":"open-docs"},{"type":"due-request",…}]`), and the
fix passes 3 of 3. Making the wait a no-op brings the race back and fails the Docs check by name.

### Not fixed here
The rest of this lane's flakes (#3775, #3687, #2849, #4026, #3704, #2629, and #2745's #2192 half) log one step
with no retry lines. That points at a renderer that stopped producing frames, which Playwright's rAF-polled waits
and input dispatch all hang on. That is #2629's stall, not a test race, so a wait in the test can't remove it. The
evidence is on each issue.
