## (2026-10-10) — test:chrome: a case that throws says why, and #2192's chips wait for their redraw by name (#2460)

A flaky check on #2421 (job 114051289592, passed on retry): `✗ #2192 web dark 1280: the case stopped at a step that
threw — locator.click: Timeout 10000ms exceeded.` That line is all CI kept. The catch kept only `split('\n')[0]` of the
error, so Playwright's call log was dropped, including the line that says whether the chip was covered, moving, disabled
or detached. Test code only.

**The labels.** `stopped(e)` in `apps/studio/test-chrome.mjs` now keeps three parts: the error's first line, the locator
it waited for, and the call log's last actionability line (`intercepts pointer events`, `element is not stable`, `not
enabled`, `detached`, and so on). With no such line, it keeps the last step the log reached. The regex vocabulary is the
one the #2194 pinned-clash catch already used. All 85 `String(e?.message ?? e).split('\n')[0]` catches in the file now
call `stopped(e)`. Each part is capped at 200 characters, because an intercepting element's line carries its markup.

**The wait.** §30b already waited for each pressed chip to read pressed, but under `.catch(() => {})`, so a redraw that
never landed went unnoticed and the next step read stale state. That wait, and the same one after KB1 A's Enter, is now
`drawnPressed`. It is the same condition with the same 5 s bound, shaped as `.then(() => true, () => false)` into an
`ok()` that has its own name. The condition really is the redraw: a press redraws the whole levers pane as new nodes,
and only the redraw draws the pressed chip. No sleep, no retry, no timeout changed.

**What the measurements say, honestly.** The flake didn't reproduce. 632 cases of the unchanged block passed, run alone,
4-wide, and under 6× CDP CPU throttling. A deliberately deferred redraw (the chip's pick run 400 ms late, in a scratch
copy of the built bundle) shows the wait matters: with the wait removed, every case fails by name at `step 1 … saves
italics`. That mutation fails through the step assertions, not through a catch, and that's built in rather than
missing. A click Playwright can't act on retries until its own 10 s timeout, so a redraw short enough for the 5 s wait
to pass can't time a click out. The click just lands on the stale row. The CI symptom therefore needed something
blocking the chip for the full 10 s, which a 150–330 ms rebuild can't do alone. The new label is how the next
occurrence will say what that was. To show it, a scratch bundle leaves a full-page layer over the chips after a press.
The old label ends at `Timeout 10000ms exceeded.`, and the new one ends at `<div class="p3-veil"></div> intercepts
pointer events`.

**Trap for whoever re-measures:** a scratch bundle edited after the build fails `assertBundleFresh` if it is written
into `dist/`. Serve it from a copy, as the harness for this entry did, and never rebuild `dist/` while a loop is reading
it.
