## (2026-11-20) — An engine refusal in the suite is named failures, and every arm it skips is listed (#1889, #1870)

**What.** Two ways a refusal hid what it skipped in `packages/engine/test.ts`, both measured on `main`:

- **It crashed the suite (#1889).** A radius lever refused at a legal scale (#1885's M3, written as a throw in
  `theme-brand.ts` for any `modeLevers` radius other than 1) stopped the run after 892 assertions, at #1015's
  unguarded `controlBrand`. The #1852 arms never ran. Refusing aurora stopped it after 27, at an example sweep
  added since #1843/#1861's sweeps. A new helper, `refusable(name, build)`, sits beside `exampleTheme`: a
  throw records one named failure (`<name> builds — the engine threw: …`) and returns `undefined`. It guards the
  lever builds M3 reaches (#1015 b1, D(a), D(a″), D(b), #1852 (c), the #301 ledger brand). The example loads
  added since the last sweep now go through `exampleTheme` (eight sweeps and lists), four direct
  `contractCorpus()` calls through `corpus()`, and two `corpus()[0]` reads fall back on an empty corpus. The
  integration replay's `try/finally` gains a `catch`, so a replay step that throws is one named failure.
- **The #1268 probe could not see the skipped sites (#1870).** V8 ends a zero-count continuation range where the
  next nested range begins. In `arm: { if (!t) break arm; ok(a && b); ok(c) }`, the range after the `if` stops
  at `&&`'s right operand, and `ok(c)` reads its count from the enclosing function, so it reads as run. The scan
  now finds the zero-count continuations (a range that opens right after a `;` or `}`, and not with a `{`,
  `else`, `catch`, `finally`, or a token no statement starts with, such as a ternary's `:`). It extends each one
  to its block's closing brace. A site reads as unrun there only when its count comes from an ancestor of that
  range. A self-check runs every time on a small fixture measured by the same coverage session. Its four skipped
  sites must read 0, and its controls must read as run: one site after an unevaluated `x && b`, and one after a
  skipped `{ }` then-block.

**Measured.** Clean: exit 0, `735776 passed, 0 failed`, all 4606 sites ran. M3: main crashes after 892; the fix
completes at `735753 passed, 20 failed`, every failure named, #1852 included. Aurora refused: main crashes after
27; the fix completes at `731140 passed, 365 failed`, and the probe lists **246** unrun sites, against **146**
with the extension disabled. With the extension disabled, the self-check fails by name: `#1870 the coverage probe
misreads the break-skipped fixture … S2 reads 1, S3 reads 1, S4 reads 1`.

**Two false positives the clean run caught, and the rule that excludes them.** A `catch` clause's range opens
after the try block's `}`. In tsx's compact output, a ternary's alternate opens at the `:` right after an object
literal's `}` (`m?{…}:void 0`). The first version of the rule read both as continuations and flagged 195, then 1,
sites that ran. The rule is narrow on purpose: a range it does not recognize keeps V8's count, which is the
behavior before this change.

**Not covered.** M3 and the aurora refusal are the two refusals measured. Another lever's refusal can still
reach an unguarded `brandTheme(` among the ~540 calls. The uncaught-exception handler still names what failed
before it.
