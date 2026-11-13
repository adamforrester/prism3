## (2026-11-12) — Chrome suite: every mode-control step waits for the header's fit, and a guard names one that does not (#3700)

In `apps/studio/test-chrome.mjs` only. The engine, the studio and the plugin are unchanged.

- **The failure (#3700).** `chrome (3)` failed on #3636, #3689 and #3661 with `S7 Shape edits: … locator.selectOption:
  Timeout 30000ms exceeded · … mode-select … element is not visible`. Those runs started before #3684 merged, so their
  `chooseAnyMode` did not settle first. S7 goes from Brand to Shape and then chooses the custom mode at once. At 1280,
  Brand's five modes show the select. On Shape the radios fit, but the fit runs a frame after Shape opens. Read
  directly after `goPlace`, the header still showed Brand's select with `data-fit-pending` set. The step chose the
  select, the fit then hid it, and `selectOption` waited 30 s. #3684 already covers this site. This PR covers the
  rest and adds a guard.
- **The steps.** `showMode` and `roShowMode` waited a fixed two frames. Both frames can land before a resize's fit,
  which is the gap #3684 found in `settleModes`. Both helpers now call `settleModes`. Some steps acted on the control
  with no wait: section 13's radio clicks and arrow-key focus, Q4's held-control click on Palettes, and section 17's
  `settled` read before its `selectOption`. These now settle first too. `pickMode`, `chooseAnyMode` and
  `chooseModeAny` already did.
- **The guard (`modeLook`).** It runs after the settle and before every look that picks a radio or the select. It
  reads `data-fit-pending` off the page. If the flag is still set, it fails by name with the mode and the place, so a
  missing settle no longer shows up as a 30 s wait on a hidden control.
- **The forced case (section 24).** This case reproduces S7's path, from Brand on the select to Shape and the custom
  mode, with every frame slowed by 600 ms from Brand on. That keeps the fit owed when Shape opens on every run, and
  the case checks this first. It then checks that `chooseAnyMode` picks the custom mode's radio.
- **#2192 italic-row** (the other failure #3700 cites) is not this race. Its step clicks body's Italic only chip and
  touches no mode control. Filed as #3704.

### How it was shown

- **Natural speed.** Read right after Brand → Shape, `data-fit-pending` was set in 1 run of 3. With `chooseAnyMode`'s
  settle removed, S7 failed in 2 runs of 3. One of those failures was the issue's exact `selectOption` timeout. This
  is why the forced case exists.
- **Forced, as a scratch probe.** Frames slowed 600 ms, the look made without the settle, and the act held until the
  fit ran (a slow round trip) gave the issue's exact error in 3 runs of 3. With the settle, the same probe passed in
  3 runs of 3.
- **Mutation, in the suite** (after a `wip:` commit). With `chooseAnyMode`'s `settleModes` removed, two checks failed
  by name in 3 runs of 3: `#3700: choosing custom-1 on shape, the mode control is read only once the preview header's
  fit has run — data-fit-pending was still set`, and the forced case's `… chosen by its radio once the fit has run —
  fit select, checked custom-1`.
- Trap for re-verification: making `settleModes` a no-op is not a reliable mutation. It failed nothing in 3 runs of 3
  at natural speed, because the extra waits it removes change the timing elsewhere. Remove a caller's settle instead.
- **Gates.** Studio `typecheck`, `test`, `build`, and `test:smoke` (12,063 assertions) passed. Every chrome section
  ran in foreground chunks under 10 minutes: shard 2 whole, and shards 1 and 3 in two parts each. The parts came from a
  scratch copy that differed only in its section filter and record name. `test:chrome-shards` held every section to
  exactly one run: 46,887 of 46,887 passed with the end-of-run checks. `lint-guide-claims` passed: no cited
  `preview.ts` line moved.
