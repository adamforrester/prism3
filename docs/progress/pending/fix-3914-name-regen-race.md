## (2026-11-20) — The chrome build names a theme file a running regen has cut short (#3914)

**What.** `regen` rewrites each `out/` file in place with `writeFileSync`, which truncates and then writes.
A Studio or plugin build that reads an emitted tree at that moment got an empty or half-written file. The chrome
build reads them in two places: the `[glyphs]` check (`apps/studio/chrome/glyphs.mjs` `chromeTexts()`) reads
every brand's `out/<brand>.tokens.json` first, then `[map]` (`tokens.mjs` `loadModes()`) reads
`prism3.tokens.json` and its dark overlay. The first threw a bare `Unexpected end of JSON input` that no check
caught, which sends a reader looking for a broken emitter.

**Fix, the issue's second option.** Both reads go through `readTree` (`tokens.mjs`). An empty file, or one that
does not parse, is named with the race:
`… is empty — a regen running in this tree rewrites out/ in place, so wait for it to finish and run the build
again (#3914)`. In `chromeTexts` it becomes a `[glyphs]` failure; in `loadModes` the existing `[map]` failure
carries it. `buildChromeCss`, `chromeTexts` and `loadModes` take an optional emission directory, which only the
test passes.

**Why not the atomic write.** The first option, every `out/` writer writing to a sibling and renaming, touches
about a dozen emitters other lanes are editing. It also changes how `regen --check` sees a write (#1059 reads
each artifact's mtime as the record of a write). The population is the one #2029 named: a regen and a build
started by hand at the same moment in one tree. Naming it closes the misdirection at both of the chrome build's readers. The race
itself remains, and this entry says so.

**Measured.** `test-chrome-motion.ts` gains arms over a copy of the real emission. On `loadModes`: an empty
`prism3.tokens.json`, a half-written one, and the whole file as the control. On the build's own entry,
`buildChromeCss()`: `prism3.tokens.json` and another brand's tree, each empty and half-written, and the whole
copy as the control. The build arms were added after review found the first arms tested the helper and not what
the build prints: on the first fix the build still threw a bare JSON error from `[glyphs]`. Before: the four
build arms fail (the build ignores the directory). After: 19/19. With `chromeTexts`'s read put back to a bare
`JSON.parse`, the four fail by name with `threw "Unexpected end of JSON input"` and
`threw "Expected ',' or '}' after property value …"`. A real `npm run -w @prism3/studio build`, and the plugin
build, over an emptied `prism3.tokens.json` or `aurora.tokens.json` now print `[glyphs] … is empty — …`.
