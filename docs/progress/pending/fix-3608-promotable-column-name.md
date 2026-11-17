## (2026-11-17) — "Add button set" lists a palette whose name a column already carries, disabled, with a reason (#3608)

**Status:** Studio only. ENGINE unchanged (no change note: no engine code moved). CONTRACT unchanged.

### What changed

- **The add row's list** moves out of `color-interactive.ts`'s render into `addSetOptions` in
  `apps/studio/src/state/interactive-input.ts` (with `RESERVED_COLUMNS`), so a test can read it without a browser.
  `promotablePalettes` is the list less its taken entries.
- **The fix, the owner's Q-AB1 B:** a palette whose name equals a column's explicit `name` is listed, but `taken`.
  `addAccent` adds an unnamed column, the engine names it after its palette, and the engine refuses a duplicate column
  name, so adding it led to a refused brand. A brand reaches that state through a rename `#3545` allows on purpose
  (`acc-o → own-n`, no unnamed column on `acc-o`) or by import. The select shows a taken palette as a disabled option
  with its reason in the title (#2044's pattern), plus a visible line per taken color ("Own-n: This name is already a
  button set.") that the select names in `aria-describedby`, so the reason is announced with the select and is not
  hover-only. The add click ignores a taken value.
- **Only-candidate case.** When the taken palette is the only one left, the add row shows its reason line, then the
  existing hint ("Add a brand color on Palettes to use it for another button set."), and no add button: a form whose
  only option is disabled would offer an action that cannot run.
- **Copy held for the owner.** The reason line, "This name is already a button set.", is DRAFT. The hint is unchanged;
  rewording it is the owner's call.

### Verification

`apps/studio/test-interactive-input.ts` §14 builds the issue's repro and asserts `own-n` is listed taken, a free brand
color is listed enabled, every enabled palette adds a button set the engine takes, and every taken palette is one the
engine refuses (the engine is the oracle both ways). `test-chrome.mjs` (Color › Interactive) seeds the same shape and
asserts the disabled option and its title, the announced reason line, that a forced `own-n` adds nothing, that a free
color still adds, and the reason-then-hint row when `own-n` is the only color left. A `wip:` mutation that marks no
palette taken fails both by name.
