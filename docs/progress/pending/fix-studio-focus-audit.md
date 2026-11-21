## (2026-11-19) — Keyboard focus and announcements from the overnight audit: start window, Update file, ⓘ tips, Activity, pairing prompt (#4216, #4217, #4218, #4225, #4226, #4228)

Six findings from the #4104 audit share one root. A control the person used is hidden or redrawn away, and focus is left on nothing (or sent to the top of the dialog), or the outcome is never said. Each fix sends focus somewhere the person can continue from, or makes the outcome heard. One new `test:chrome` section, `focus-audit` (shard 2), holds every arm. Each arm fails on the merge base by name and passes here.

### What changed

- **#4216, the start window.** A load closed the window with `dismiss(null)`, and focus fell to `<body>` on every start path, on both hosts. `syncStart` now dismisses to the brand switcher, which names the brand just loaded and is where the reopen's X already returns. When a new window replaces the old one, it still takes focus itself, and the X paths still move focus on afterwards.
- **#4217, Update file.** When Turn off updates, Turn updates back on or Delete redraws its own button away, focus used to fall to the dialog, and the next repaint put it on the X. Now a turn off or on follows the set to the button that undoes it, if the set has one; otherwise it goes to the next row with the same action, then the one before, then the Components fold. Delete waits on the dialog until the result line lands, then focuses that line (`tabindex="-1"`). Any other control that leaves on a repaint keeps the old rule (#3023's Theme box).
- **#4218, a refused turn off or on.** The error line is `role="alert"` on the first paint of each refusal only, and the refused button is `aria-describedby` it. The alert is keyed on the refusal's def, direction and words, and cleared by the next turn off or on. That way a repaint doesn't say it again, and the same refusal a second time is still said. No new words.
- **#4225, the ⓘ tips.** Escape closes an open tip, keeps focus on the ⓘ and stops there, so an enclosing dialog's Escape waits for the next press. `infoTip` draws every ⓘ, so one keydown covers all of them.
- **#4226, Activity's bar button.** The hidden "Expand / Collapse Activity" span is gone. The name is the visible "Activity", and `aria-expanded` carries the state.
- **#4228, the pairing prompt.** Hiding the prompt while focus is inside it (Not now, or the code accepted) now moves focus to the Agent switch.

### Traps for whoever re-runs these

- **Update file's Components group folds itself shut once nothing is due or blocked (Q-UD3 A).** A fixture whose last due set is turned off hides the Updates off rows, and focus correctly lands on the fold. The arm keeps a third set (`tag`) due throughout so the rows stay drawn.
- **The plugin's dev host answers a turn on by itself** with a refusal ("not written") before a test's own `updates-off` lands. The #4218 arm records every error line inserted and holds one alert per distinct refusal, rather than exactly one alert.
- **`updates-off`'s `by` is `'auto' | 'designer'`.** A fixture with any other value draws the set as unrecorded, not off.
- **The pairing prompt needs the desktop bridge,** which the browser harness doesn't have. The #4228 arm swaps in a stand-in `WebSocket` (`open`'s `prep`) that opens and sends the server's challenge. With no stored token, the relay then asks for the code, so the real prompt is driven, not a hand-unhidden box.
- **Compare against the branch's merge base, not `origin/main`.** `main` moved during this lane, and a moved file no longer built against the branch.
