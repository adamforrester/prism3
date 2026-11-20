## (2026-11-19) — Three wiring arms stop passing on a spelling they no longer find (#4242, #4243, #4244)

Three arms checked a subject by matching its source text, and each passed when the subject changed its spelling
(docs/34 shapes 1 and 9). Each now reads the value, or the parsed program, and fails closed when it cannot find
what it reads.

- **#4242, `test.ts` #3551.** It matched `const RUNG_REPEATS_OPEN: Record<…> = {…}` and asserted the body did NOT
  include `'code-input-cell'`. Another type annotation made the regex miss, the body read `''`, and the negative
  assertion passed with the question back in the open register. Now each register is found by name alone, must be
  declared exactly once, and its object literal is evaluated; a register that cannot be read fails `#4242` by name.
  The arm also asserts the def's own ladder (sm, sm, sm, lg), the decided behavior. `lint-rung-names.ts` runs at
  import, so exporting the registers would have meant splitting the gate; the evaluated read stays in the test.
- **#4243, `test-write-typography.ts` #1090.** The regex `/fontsLoaded: pf\.brandLoaded,/` matched the old wiring
  left in a comment. The arm now parses `main.ts` with TypeScript: every `fontsLoaded` property and every template's
  "fonts loaded" clause must read `pf.brandLoaded`, and each must occur. Extracting the summary builder from
  `main.ts` into a pure function was the issue's better option, but `main.ts`'s Apply Theme block is open in other
  lanes' PRs, and a call-site check would still be needed to prove `main.ts` calls it.
- **#4244, `test-report.ts` #3883.** A grep for `commit.x(lastGoodInput` missed `const brief = lastGoodInput;
  commit.postTheme(brief)`. The claim is now positive: the brand-carrying methods are the `HostCommit` methods with
  an `input` parameter in `write-adapter.ts`, and every call to one in `main.ts` must pass `posted()` or
  `panelBrand(…)`, whose body must be `brandFor(theme, posted())`.

Each issue's own mutation passed on main's arm and fails the new arm by name. The limit: a parsed read of `main.ts`
still checks one file. A post made from another module would not be seen; today only `main.ts` posts.
