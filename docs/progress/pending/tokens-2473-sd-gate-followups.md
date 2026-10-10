## (2026-10-10) — Style Dictionary platform gate: the config is plain data, a brand with no row fails cleanly, and the matrix report is fully generated (#2473)

Follow-ups from the #2440 review, all in `packages/tokens/` and `tools/sd-version-matrix/`. No engine code or artifact moves, so there is no change note.

**The [RULE] now covers what a source scan cannot see.** The scan reads names (`preprocessors`, `transforms:`, `registerFormat` …), so `filter: (t) => true` on a file entry passed it: no banned word, but custom code all the same. `check-platforms.mjs` now builds the config object with `platformsConfig(...)` and asserts it deep-equals its own JSON round trip (`isDeepStrictEqual`). JSON drops a function and `undefined` and flattens a RegExp to `{}`, so only plain data survives unchanged. The check calls the real `platformsConfig` rather than reading its source, so it needs no list of option names to stay true.

**The provenance line was wrong, and now says what the literals are.** The header said the literals were checked against the engine's input and that the NB red was the hand-built reference's value. Neither is true. The literals are snapshots of the engine's output, verified by hand. The engine emits `#d53d44` (`rgb(213, 61, 68)`) for core-color red 500; `reference/New Balance` carries `#d83c43` (`rgb(216, 60, 67)`) for the same step. Independence still holds, because the literals are typed, never read from `out/` at run time.

**A brand with no literals row.** It used to call `expected({})`, which throws a TypeError while destructuring `color`, before the failure list prints. Now the value loop and the dark-overlay check both skip a brand with no row. The run reaches its end and reports the `[SCOPE] … a new brand needs its own row` failure by name. Guarding the overlay check too keeps a second, unexplained failure (a lookup of `undefined.color.background.primary`) from appearing beside it.

**`sd-version-matrix.md` is fully generated.** Its one hand-written clause, "(4.0.0 converts more colors in JavaScript)", is now computed by `matrix.mjs`. It lists the cells whose verdict matches the latest version's but whose counts don't. A fresh `--write` changed only the date and that sentence, which now reads "against 5.6.0, 4.0.0 differs in js / color". So the hand edit was the only drift.

**Mutations, each failing by name:**
- `filter: (t) => true` on the CSS file entry fails the new `[RULE] the platform config is plain data`, and only that rule.
- Removing the `harbor` row fails `[SCOPE] \`harbor\` carries literal value assertions`, with no TypeError and no other failure.
- Reverting the guard brings the TypeError back.
