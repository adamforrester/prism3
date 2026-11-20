## (2026-11-18) — The Apply Theme font count is the brand's own faces (#1090)

**What.** The summary's `type N fonts loaded` read `preloadFonts`' `loaded`, which counts every face the preload
loaded: the brand's own, the faces of the styles the file already held, and their cross product (#680). On an empty
file only the brand's faces exist, so one brand read 4 there and 6 once the first run's styles were in the file. The
count was deterministic per file state but read as "the brand's fonts". Owner decision (2026-11-18, option A): count
the brand's faces only. `FontPreloadResult` gains `brandLoaded`, the distinct loaded faces some theme candidate
resolved to; the summary clause and the agent data's `counts.fontsLoaded` read it. What is loaded is unchanged.

**Order-independent.** `brandLoaded` is a set filled from each theme candidate's outcome, not a count of loads a theme
candidate made, so a crossed or file candidate that resolves to the same face and loads it first still counts once,
for the brand. `loadPreloadCandidates` already promises nothing below may depend on candidate order.

**The labels half.** Re-checked on main: the summary has no `surface` clause (#1153 removed it), and `color` counts
the `color` collection. No relabel, so no draft copy.

**Not changed.** The paste path (`mcp-steps.ts`) still reports `fonts.loaded` as every face loaded; it is a separate
report the decision did not name.

**Measured.** A new #1090 block in `test-write-typography.ts`, on a Figma without the brand's display family as in the
report: every face loaded reads 4 on an empty file and 7 on a populated one (the arm); `brandLoaded` reads 4 on both.
On main's source the pin and the wiring check fail. Mutations: `brandLoaded: loaded` fails "#1090 brand fonts loaded
is 4 …" (got 4, 7); the summary reading `pf.loaded` fails "#1090 the Apply Theme summary's "fonts loaded" …".
