## (2026-11-20) — `<p3-password-field>` keeps a caret set after Show/Hide; the upgrade check stops passing by timing (#3947, #3946)

**What changed.** Two arm 1 field bugs on the code POC's `poc/arm-1`, with no engine change.

- **#3947.** The element's delayed caret restore after Show/Hide was unconditional, so it overwrote a caret written
  since the press. It now runs only while the caret sits at Chromium's reset `0,0`, as `@prism3/css`'s script has
  since #3945. A same-task test and a self-test mutant hold it.
- **#3946.** The upgrade check's reported failure was a real defect: `@prism3/css`'s then-unguarded restore, fixed by
  #3945. But the check caught it only under load: run alone, it saw the defect 0 of 20 times. It now writes the press,
  the value and the caret in one task, so it catches the defect on every run, and a mutant pins the script's guard.
- **The journal** (`docs/poc/arm-1-journal.md`) has the reproduction table.
