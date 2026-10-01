## (2026-10-01) — UI redesign P1: test hardening — absence checks prove their state, hook clicks go through the guard, the mode audit moves onto hooks (#1829, #1830, #1831)

**STATUS: PR to be opened from `ui/p1-test-hardening`, labeled DO NOT MERGE.** UI test tooling only, so no ENGINE bump. No new CI step.

**The diagnosis that made it small.** F1's hook guard (`apps/studio/test-hooks.mjs`) proves a hook NAME once per run. It keeps one "seen" set, so a hook minted at several sites (`status-pill` has nine) passes while any one site still renders. That one fact sits under all three issues:
- **#1830.** Two semantic locators carried accessibility checks that were never written down. Once the suites found those elements by hook, nothing asserted the role or the name.
- **#1831.** A check that something is absent passes on an empty lookup, so it can't catch a hook dropped at its own site. Separately, plain clicks died as a TimeoutError before the guard could report.
- **#1829.** The mode audit had never been moved onto the hooks.

**#1830.** Each attribute is asserted through the accessibility tree, not by reading it off the element:
- **Smoke.** `getByRole('button', { name: 'Export', exact: true })` must resolve to exactly the `export-open` hook, once per brand. Without the `aria-label`, the wide bar's name is "↓ Export", so the exact match fails at full width as well as narrow.
- **Verdict.** `getByRole('dialog', { name: 'Prune stale items', exact: true })` must be the `prune-dialog` hook. Removing either the role or the label fails it.

**#1831, absence checks.** I chose the issue's first option: each absence check proves its state in the same test. Narrowing the header's promise alone would have left the checks vacuous.
- **The helper.** `hooks.absent(ok, { seen, state }, isAbsent, label)` passes only when `seen` holds. Otherwise it fails under the check's own label with `— NOT MEASURED: this test never saw <state>`.
- **What counts as the proof.** It is always something the same probe saw: the pending pill during this build, the dialog in the control arm, the start screen earlier on this panel, the error surface mounted.
- **Verdict "nothing yet" block.** It now drives one build after its fresh reading. Before a build there was nothing to prove the probe against.
- **Converted.**
  - Verdict: nothing yet ×2, stale fraction ×2 per condition, detail collapsed, prune arm ×2.
  - Start: the late empty-restore.
  - Smoke: overlay Source ×3, Links warning ×2, pin error surface, and the eyebrow swap's error state (now requires `present`).
- **One more, found by mutation.** The sweep's "global error bar is hidden". Its comment called it non-vacuous because the roster proves the surface, but the roster reads `data-chrome`, not the hook this lookup reads. With `error-bar` dropped it stayed green, so it now proves the hook too.
- **The header** now says what the guard does not prove. It also says that the absence rule is a convention review must hold, since nothing can recognize an absence check in source.

**#1831, clicks.**
- **Routing.** Every `.click(` in the three suites and the audit now goes through `hooks.click(locator, opts)`. It waits through `need()` first, then clicks with Playwright's own strictness. `need()` now also takes a Locator: its `String()` keeps the hook literals, filters and scoping included, so a filtered lookup is named the same way.
- **Enforcement.** `checkClicks` refuses, line by line, any `.click(` in a suite's code that is not `hooks.click(`, so a click on a locator held in a variable is caught too. Lines that are only comments, and trailing `//` comments, are skipped.
- **One behavior change.** `test-start-screen.mjs` used `page.click`, which is not strict. It became `.first()` to keep that.
- **Not routed: `fill`, `selectOption`, `setInputFiles`, and unbounded hooked `waitForFunction`.** Filed as #1888, not widened here. The plan's P1 scope is clicks.

**#1829, the mode audit.** It is migrated, not retired: the plan deletes it in S13 together with the mode strip.
- **Where hooks existed.** Rail pages, mode tabs (`derived` and `on` stay as STATES classes, as in the suites), the workspace and the start chip are all located by hook now. Every click goes through `hooks.click`.
- **Sections needed hooks in `main.ts`.** A hook is one value, and several sections already carry their own (`section-backgrounds`, `section-links`, `section-duration-ramp`, `section-tempo`), so a generic `section` role was impossible. So:
  - `section-head` is minted on the three section heads, and a section is its head's parent.
  - `section-title` is added on the two title sites that lacked it (the action palettes and Links).
  - `mode-scope-badge` is added on the badge.
  - These are six attribute-only edits, with no change to markup or style.
- **`.knob` stays a class read.** It is part of the signature, not a lookup, and knob wrappers also carry specific hooks. A floor holds it instead: if no control on any bar page reads a label, the run fails by name.
- **Output is unchanged apart from labels.** Measured before and after with `--check-badges` on harbor: every verdict, total and mismatch is identical. The one difference is that page labels now come from `rail-item-label` ("Surfaces & fills"), not from the button's whole text run together ("Surfaces & fillsBackgrounds, text, gradients").
- **Exit code.** The audit exits non-zero when its instrument fails, even without `--check-badges`.
- **Kept out of CI,** for two reasons. It is a tool that exits 0 without the flag. And it is **red on `main` with the flag**, with five mismatches that predate this PR (three sections missing from the badge map; two chip groups the probe can't poke as radios). Filed as #1887.

**Mutations.** Each was run after a `wip:` commit, with the diff checked non-empty, and every run went to completion.
- **M1.** Drop the Export `aria-label`. Smoke fails `<brand>: the Export button's accessible name is "Export" — buttons by that name: []` for all three brands (3 failed of 3374).
- **M2a / M2b.** Drop the prune dialog's `aria-label`, then its `role`. Verdict fails `#1830 the prune dialog is a role="dialog" whose accessible name is "Prune stale items" — dialogs by that name: []` (147 of 148).
- **M3.** The review's own mutation: unhook the component pending pill (`main.ts`, the `componentPendingText()` site).
  - The guard still reads `17 of 17`.
  - 15 absence checks fail `… no stale fraction is left on the page/in the bar beside the verdict — NOT MEASURED: …` and `no progress fraction is shown before a build has run — … NOT MEASURED: …` (116 of 148).
  - Before this PR, those checks passed.
- **M4.** Unhook `prune-dialog`. `#1663 an agent prune preview (pillOnly) opens NO confirm dialog … — NOT MEASURED: this test never saw the dialog in the control arm …`.
- **M5.** Unhook `apply-detail`. `<condition>: a clean verdict leaves the detail collapsed — found null — NOT MEASURED: …`.
- **M6.** Unhook `start-screen`. `a late empty-restore does NOT discard a brand the designer already chose — NOT MEASURED: …`.
- **M7.** Unhook `source-readout` and `error-bar`. Smoke fails `… the Source slot offers no ramp-step picker … — NOT MEASURED: this test never saw this row's Source readout` (and the state and neutral-ramp variants), and `<brand>: a pin whose family matches the bound face is accepted, no error surfaced — NOT MEASURED: …`.
- **M13.** M7's `error-bar` half again, after the sweep fix. `<brand> / <page> / <mode>: the global error bar is hidden — NOT MEASURED: this test never saw the global error bar mounted, found by its hook` (108 failed of 3375).
- **M8.** Unhook `start-blank`. Test:start stops with `Error: data-p3 hook "start-blank" did not appear in the rendered DOM (waited for locator('[data-p3="start-blank"]'))`, not a bare TimeoutError.
- **M9.** Write one click back as `page.locator(…).click()`. The suite refuses at load with `a click that bypasses the hook guard … test-start-screen.mjs:252: …`. Running `origin/main`'s start suite against the new guard lists all its raw clicks the same way.
- **M10.** Unhook `mode-scope-badge`. The audit fails `data-p3 hook "mode-scope-badge" is used by this suite but never appeared in the rendered DOM` and exits 1 without `--check-badges`.
- **M11.** Unhook `section-head` in `palSection` only. The guard reads `9 of 9`. The audit fails `<page>: every section title sits in a section the audit can find (0 section head(s), 3 title(s))` on six pages.
- **M12.** Knob wrappers lose `.knob`. The audit fails `the signature read a control label for 0 of 138 control(s) …`, and its table drops one EDITS (11 → 10), which is exactly the silent under-count the floor exists for.

**Traps for whoever re-verifies this.**
- **Per-name hole.** A hook removed at one of several sites still reads "N of N" in the guard. The failure you want is the check's own label, often with `NOT MEASURED`, never the guard line.
- **Links warning has no subject-side mutation.** Dropping `order-warning` hangs an unbounded `waitForFunction` for 30 s before either absence check runs (#1888). The proof was checked by reading the code, not by mutation.
- **Counts.** The suites grew by these totals, measured: smoke 3371 → 3374 (Export, one per brand) and verdict 147 → 148 (the dialog). The absence checks were converted in place, so start grows by no assertion. A mutation that adds a guard failure prints one more than baseline (3375, 149), because the report adds one line per missing hook.
- **`audit:modes` exit code.** It exits 1 on `main` with `--check-badges` before and after this PR. Check the mismatch list against #1887 before reading red as a regression.
