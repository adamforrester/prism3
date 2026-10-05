## (2026-10-05) — UI: Components refuses a write in a derived mode at the write, not only by the DOM disabled flag (#2096)

**STATUS: branch `ui/2096-min-width-guard`. Fixes #2096.** UI and studio tests only: no engine change, no emitted
artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged, no visible wording.

**The defect.** On Components (S8.2), the Button minimum-width slider's write called `edit()` without checking the
previewed mode. In a derived mode (HC light, HC dark, wireframe) only the input's DOM `disabled` flag stopped it,
and a scripted `input` event is not stopped by that flag, so it wrote. No user could reach it.

**The fix.** `edit()` in `domains/components.ts` returns before writing when `isDerived(currentMode)`. Every write on
the page passes through it, so the three option chips are covered too. The guard sits in the domain module rather
than in `state/button-input.ts`: the Button options are brand-wide and their setters take no mode, and "derived"
is a fact about the mode the preview shows, which only the page knows.

**The test.** `test:chrome`'s Q59 derived-mode block (web, 1280): previewing each of HC light, HC dark and
wireframe, it dispatches a scripted `input` on the disabled slider with a value in range that the brand doesn't
hold, and asserts `prism3:brandInput` is byte-identical before and after. It also asserts the slider was found and a
brand was persisted, so the check can't pass by comparing two nulls.

**Mutation, failing by name:** the guard line removed → `#2096: previewing HC light, a scripted input on the
minimum-width slider writes nothing (prism3:brandInput byte-identical, buttonMinWidthMultiplier now 3.75)`, and
the same line for HC dark (now 3.5, since the first write landed) and Wireframe: three failures, nothing else.
