## (2026-11-20) — Two gate matchers read every spelling they were missing (#1934, #3592)

One root cause in two gates: the pattern that decides what a gate sees knew one spelling of a thing and
missed the others.

- **`lint-doc-gates.ts` reads the workspace flag in all three spellings (#1934).** `gateTokensOf` knew only
  `-w X`. `npm run --workspace X s` gave the tokens `["--workspace"]`, so a step would read as undocumented
  in all three checklists. `npm run s --workspace=X` dropped the workspace, which weakened the
  co-occurrence check. It now walks the words of each `npm run`: `-w X`, `--workspace X` and
  `--workspace=X`, before or after the script, stopping at `--`. This is restated rather than imported from
  arm 5's `canonicalArgv`, so the prose arm and the argv arm do not share one reading of a command
  (docs/34). Five self-check samples, every spelling and position. With main's pattern, three fail by name:
  `#1934 the npm run tokens of npm run --workspace @prism3/plugin test:start are [["--workspace"]]` and
  `… test:start --workspace=@prism3/plugin are [["test:start"]]`.
- **`lint-motion-literals.ts` refuses the bare `linear` keyword where it is a timing function (#3592).** The
  curve shape matched only `linear(`. A bare-word shape would fire on `motion.easing.linear`, on the skill's
  list of curve names, and on prose like "a linear bar", which Progress's motion text uses. So the new shape
  fires only in an easing context: after a duration (`200ms linear`), inside a `transition`, `animation` or
  `*-timing-function` declaration, or as an `easing`/`ease` value. Never after a `.` and never before `(`.
  The self-check holds three firing samples and the three clean forms. With the shape removed, all three
  fire samples fail by name. The skill needed no new allowance.

**What the new shape found.** Spinner's and Progress's code-only notes spelled their turn
`animation: spin var(--motion-duration-spin) linear infinite`. The duration was bound to a token and the
curve was a literal, where every other def binds both and the skill names `motion.easing.linear` for these
two. Both now read `var(--motion-easing-linear)`. That moves `schema/component-maintainer.json` and the two
defs' projected surface (`lint-component-surface.ts --accept`, `schema/component-surface.json`), so this carries
a minor change note. The two `test.ts` arms that matched the old text (`#1670 spinner`, `#2791 … progress`) now
match the token form.
