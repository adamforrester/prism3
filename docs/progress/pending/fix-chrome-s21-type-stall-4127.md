## (2026-11-19) — test:chrome section 21's Type waits fail by name in seconds, not at the 600s watchdog (#4127)

Section 21 stalled on CI three times in 26 hours, on unrelated heads and once on `main`. Each time the 600s section watchdog (#3044) stopped it, naming QA-B17's "Jump to:" check, which had passed. Every Playwright action on the path that follows (clicks, `waitForFunction`) already throws at 30s, and the section's catch reports a throw by name. So a 600s silence can only be a `page.evaluate`, which has no timeout: `frames()`' animation-frame loop, `goPlace`'s `document.fonts.ready`, or one of the synchronous reads on a stuck renderer.

A new top-level `within(page, label, work, ms)` races a wait against its own bound (30s, the same as Playwright's action timeout). On the bound it throws with the step's name and whether the page still renders a frame. It now bounds `frames()` (both its frame loop and its glide-log read, with the calling step's name), `goPlace`'s font wait, and every wait in Type's `typeEdit` and `openTypeAdvanced`. A repeat of the stall now fails within about 30s, as `Type: the type scale: the preview pane's frames did not settle within 30s; the page renders no frame`, and no longer burns 10 minutes of a shard to name the wrong check.

What this does not do: find the race. It did not reproduce locally: section 21 alone, eight runs in parallel with CPU burners, and shard 2's sections 1–21 together all passed. Finding it is left to the first named failure.

A measured trap for whoever writes the next frame-stall test: a stub `requestAnimationFrame` that drops its callback does not model a stall. The page garbage-collects the orphaned promise, and Playwright rejects it about 30s later ("Resulting promise was garbage collected"). The self-check holds the callbacks instead, as a frame requested and never produced does.

### Verification

- The new arm in section 21 stops the page's frames and holds `frames()` to a 3s bound. On main's `frames()`: `✗ section 21: no progress for 60s … the last check it reached: none yet` (watchdog at `CHROME_SECTION_LIMIT_S=60`). With the fix: 49/49, the arm included.
- Mutations, each committed first: `within`'s bound dropped → the same watchdog stall. The step name dropped from `frames`' label → `✗ #4127: a frame wait that never settles fails by name within its bound …`.
- After review: `within`'s timeout message carries no issue number, so the self-check arm is the only literal `lint-test-arms` reads as `#4127`; deleting that arm now fails `ARM GONE … #4127` by name, where before the registry line stayed green. The self-check replays the frame callbacks it held, so a page guard waiting on one (`data-fit-pending`) is not left stuck.
