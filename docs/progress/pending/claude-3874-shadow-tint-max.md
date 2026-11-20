## (2026-11-18) — The global shadow tint amount stops at 1 (#3874)

**What.** `theme-shadow.ts` sets the tint's lightness to `0.13 + 0.17 × amount` and scales its chroma by the amount, so
the lever has a real ceiling: past 1 the chroma leaves the gamut, and past about 5 the lightness passes 1 and every
shadow turns white. `shadow.tint.amount: 50` compiled cleanly into `#ffffff1f`. The global lever's schema had only a
minimum, and #332's range check left the tint out because it is an `object` lever, not a slider. It now joins
`rangeLevers`, refused outside [0, 1] like the other levers there, and the schema gains `"maximum": 1`.

**Why 1.** The bound already holds everywhere else this value is set: the per-mode tint in `brandTheme`
(`modeLevers.<mode>.shadow.tint.amount`, [0, 1]), its schema, and the studio's Shadow tint slider (0 to 1). The
global lever was the one place without it. Whether a wider range should be allowed (up to about 5 keeps the lightness
below white, with the chroma clipped to the gamut) is held for the owner on #3874.

**Measured.** `test.ts` #3874: on main's engine, 4 arms fail (amounts 50, 1.01 and -0.1 built cleanly, and the schema
took 50). With the fix they pass, and an amount of 1 still builds. Mutation: the bound raised to 5 fails "#3874 a
global shadow tint amount of 1.01 is refused by name". Every committed artifact regenerates unchanged.
