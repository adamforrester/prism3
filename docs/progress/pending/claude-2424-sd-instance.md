## (2026-10-09) — A stock Style Dictionary builds every brand to CSS, SCSS, JS, Swift, Android and Compose, with literal values and a measured version floor (#2424)

The consumability gate proved a stock Style Dictionary could read our DTCG, but for CSS only and by structure, not value. #2424 asked for every platform a product team ships to, value assertions independent of the engine, and, per the owner's note, the Style Dictionary version requirement measured rather than assumed. That's the evidence #2425's preset question needed.

### What was built

- **`packages/tokens/sd.platforms.mjs`.** The consumer config's rule, kept for six platforms: built-in transform groups and built-in formats only. It's plain data plus one build entry point, so a tool can hand the identical object to any version.
- **`packages/tokens/platform-outcomes.mjs`.** Judges each token on each platform as emitted, transformed, broken or lost. It walks the DTCG and resolves aliases itself, then parses each written file. It never asks Style Dictionary, and it matches names by normalizing both sides (lowercase, letters and digits only) rather than by reimplementing Style Dictionary's name transforms.
- **`packages/tokens/check-platforms.mjs`,** run by `check:consumability` after the existing gate, so CI's step list is unchanged:
  - `[RULE]` source checks;
  - `[READS]` (every file, every token, the `.d.ts`, the dark overlay moving the background on native);
  - `[VALUE]` literals per brand: the primary hex in all six forms, `16px`, `1rem`, the brand's ms duration, a `1.5` line height and the display typeface;
  - a pinned `[VERDICT]` table per platform × type.
- **`tools/sd-version-matrix/`** (a tool, with the gate as its sibling). It runs the config under 3.9.2, 4.0.0, 4.4.0, 5.0.0, 5.5.0 and 5.6.0, each in its own temp install, and writes `packages/tokens/sd-version-matrix.md`. About three minutes and networked on first run, which is why CI runs only the lockfile's version.

### The answer

- **4.0.0 is the floor that needs no preset.** Every version from 4.0.0 to 5.6.0 carries every base token to every platform, with the same verdict in every cell.
- **3.9.2 reads nothing:** 0 of 3,718 base tokens. The few variables it writes come from `value` keys inside `$extensions`.
- **Renaming the keys isn't enough.** It's the least a 3.x preset could do, and it was measured as a not-stock experiment: the CSS and SCSS builds then throw on composites, and colors stay unconverted strings, because 3.x picks transforms by path and our paths start at the brand root.
- **Web is whole** except gradient (the #642 gap). **Native is broken on every version,** in four Style Dictionary gaps filed as #2430–#2433 (px scaled ×16, raw text in Swift and Kotlin, composites as `[object Object]`, and Android `<integer>1.5`).
- **One finding is ours,** #2434: letter spacing in `em` and the fluid container in `%` are dimension units DTCG 2025.10 doesn't allow.

### Traps for whoever re-verifies

- **The `[GAP]` literals pin wrong values on purpose.** `CGFloat(256.00)` for `16px` is the measured output, tagged with its issue. A Style Dictionary fix fails the gate by name, and the right response is to update the literal to the correct value, not to restore the old one.
- **Swift comment style differs by version.** 4.0.0 writes `/* */` after a declaration, 5.x writes `/** */`. A parser keyed on one silently reads 4.0.0's iOS output as wrong, which is how the first matrix run reported 4.0.0 colors as broken.
- **Build each platform on its own in the matrix.** One platform throwing (3.x's CSS on a composite) otherwise hides every other platform's result for that set.
- **The report's example lines come from the first brand alphabetically.** It's a public repository, so check the regenerated file before committing it.
