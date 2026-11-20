## (2026-11-20) — The chrome build names a theme file a running regen has cut short (#3914)

**What.** `regen` rewrites each `out/` file in place with `writeFileSync`, which truncates and then writes.
A Studio or plugin build that reads `prism3.tokens.json` or its dark overlay at that moment
(`apps/studio/chrome/tokens.mjs` `loadModes()`) got an empty or half-written file. It failed with
`[map] cannot load the default theme from packages/engine/out: Unexpected end of JSON input`, which sends a
reader looking for a broken emitter.

**Fix, the issue's second option.** `loadModes` reads each tree through `readTree`. An empty file, or one that
does not parse, throws naming the file and the race:
`… is empty — a regen running in this tree rewrites out/ in place, so wait for it to finish and run the build
again (#3914)`. `loadModes` takes an optional `out` directory, which only the test passes.

**Why not the atomic write.** The first option, every `out/` writer writing to a sibling and renaming, touches
about a dozen emitters other lanes are editing. It also changes how `regen --check` sees a write (#1059 reads
each artifact's mtime as the record of a write). The population is the one #2029 named: a regen and a build
started by hand at the same moment in one tree. Naming it closes the misdirection at the one reader. The race
itself remains, and this entry says so.

**Measured.** `test-chrome-motion.ts` gains three arms over a copy of the real emission: an empty
`prism3.tokens.json`, a half-written one, and the whole file as the control. Main's `loadModes` ignores the
directory and reads the real `out/`, so both cut-file arms fail (`got ""`). This branch passes 13/13. With
`readTree` reduced to a bare `JSON.parse`, both fail by name with `got "Unexpected end of JSON input"` and
`got "Expected ',' or '}' after property value …"`.
