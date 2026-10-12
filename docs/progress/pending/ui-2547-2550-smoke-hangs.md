## (2026-10-12) — Studio smoke: a stalled click or key press fails one arm by name, and says what the page was doing (#2547, #2550)

**STATUS: branch `ui/2547-2550-smoke-hangs`.** Test only (`apps/studio/test-smoke.mjs`). No product code, no artifact moves, no ENGINE bump.

**The change.** A new `bounded(page, label, act)` runs a click or a key press against a 15 s limit (`INPUT_MS`). Playwright's own calls have none: a key press waits forever, and a click throws an uncaught error after 30 s that ends the suite. All 11 inputs at the three reported sites now run through it: the S4c surface pickers and the S4c Fields rows (#2550), the S4d icon-override rows (#2547's Escape), and `withPicker` on Interactive (#2550's 30 s click).

A stall fails **one arm by name** and reports what the page was doing:
- **if the page still renders a frame**, it was busy, and the arm carries on;
- **if it renders none**, the debugger **pauses** the renderer and the failure names the JavaScript stack it was in, or says no JavaScript was running. The page then goes through the suite's existing dead-page path (`closeDead`), and its brand is skipped through the arm's label (`s4cArm`, `s4dArm`, and the new `s5aArm` and `s5bArm`).

The suite also prints how close the inputs came to the limit: `Bounded inputs (…): N went through, the slowest in X ms`.

**A trap the mutation found:** the first diagnostic attached the debugger only after a stall, and against a page stuck in a JavaScript loop it reported "no JavaScript was running". That was wrong. `Debugger.enable` runs on the page's main thread, the very thing that's blocked, so it never completed and the pause never landed. The debugger is now enabled per page at its first bounded input, while the page still answers (`debuggerOf`), and the later `Debugger.pause` is an interrupt that stops even a busy loop.

**Mutations, each from a commit, failing by name, with the suite reaching its report each time:**
- **A frozen renderer** (an endless loop started before the first S4d Escape): `✗ S4d prism3: the Foreground row inverse.foreground.secondary in dark: Escape closes the picker: the input did not return within 15000ms; it was running JavaScript: frozenOnPurpose (page):1: the page rendered no frame …, so it is treated as dead`. It's the only failure of 11,992 assertions.
- **`INPUT_MS` at 1 ms:** every bounded input fails by name (`…: the input did not return within 1ms; the page still renders frames, so it was busy, not stuck`), 126 arms, and the run still ends in its report (12,027 assertions) instead of dying at the first stall.

**The cause, measured: not load, and not a race in our code.**
- **Load doesn't reproduce it.** I ran three smoke suites at once (load averages 16.6–18.3), then five (a peak one-minute load of **32.7**, free memory down to about 55 MB). All 8 runs passed. Across the five-run batch's 1,350 bounded inputs, the slowest took **255 ms** against a 15 s bound, so loaded inputs are slow by milliseconds, not tens of seconds.
- **Every reported hang happened with the display off or the Mac asleep** (`pmset -g log`):
  - **#2537**, two hours idle (Oct 11, about 09:00–11:00 CDT): the display was off from 09:51 until 22:00;
  - **#2547** (about 23:50–00:15): the display was off from 23:31;
  - **#2550** (about 25 minutes into a verify reported 09:17 on Oct 12): the system entered sleep at 08:51, 08:52, 08:55 and 09:12, and woke fully at 09:13.
- **A fourth instance doesn't fit, so the cause is not settled.** test:chrome S6.3's `selectOption` on `lh-swap` timed out on the UI lane's first verify of `db324bf8` (#2555), then passed on the rerun. That commit is from 09:42 CDT on Oct 12 and the passing verify started about 10:51, so the failing one ran between those times. The display was on throughout, with no sleep. If that run was on this Mac, the display-off pattern holds for three of four instances, not all.
- **Why the display state could hang an input, for the three it fits:** Chromium handles input in step with frames, and on macOS frame timing follows the display. With the display off or the system asleep, no frames come, so a click that has already passed every readiness check waits on the input being taken. That's #2550's log exactly: "element is visible, enabled and stable — performing click action".
- **Not yet confirmed by experiment, and not the whole story (the fourth instance above):** a smoke run with the display turned off (`pmset displaysleepnow`) should now fail an arm naming "the page renders no frame". That run needs the owner's go-ahead, since it turns off their display.

**Where it stands:** the hangs no longer end a run, and the next one names what the renderer was doing (a JavaScript stack, or none). That's the evidence the cause still needs. test:chrome's `lh-swap` `selectOption` is outside this PR, which stays on the smoke issues; `bounded()` is the shape to bring there. **One option for the display-off cases** (not done here; it's a runner change): wrap a local verify in `caffeinate -dis`, so a long run keeps the display and the system awake. CI runs on Linux without a display and isn't affected.
