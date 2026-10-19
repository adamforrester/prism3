## (2026-10-18) — Native is documented as outside the stock promise (#2426)

Owner decision Q402 (Q1 A, Q2 A, recorded on #2426): native (iOS, Android, Compose) is not in the stock promise yet. `skills/prism3-consume/SKILL.md` gains a section naming the six native gaps (#2430, #2613, #2431, #2432, #2433, #2434) and what a native consumer must bring: a unit-aware size transform, `sp` font sizes, quoting for durations, font families, stroke styles and cubic beziers, composites read from the JavaScript or JSON output, float dimens on Android, and letter spacing resolved against the font size. `packages/tokens/README.md` gains the same as "What this means for native consumers".

**What this is not.** Docs only. No value, pin or gate moves, and the `[GAP]` pins stay as the record of stock output. The no-custom-code rule stands: no reference production config with custom transforms ships for now, and both texts say so. A native projection, a single emitted unit and a compile gate remain undecided (#2426 Q1 b/c, Q2 b/c) and are not promised anywhere.

**Trap for a re-verifier.** Both texts restate the gap list in `README.md`'s "What it found". A new native gap needs all three places, and `lint-skills.ts` does not check the issue numbers in prose.
