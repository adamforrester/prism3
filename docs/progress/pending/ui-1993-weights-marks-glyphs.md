## (2026-10-05) — Studio: the Type preview's ● and ○ are drawn by the embedded Inter, and back in the glyph check (#1993)

**Status:** studio only: the embedded Inter subset (two code points added), `chrome.css` (one rule),
`weights-by-face.ts` (the key's marks in spans, same words), `glyphs.mjs` (the `NOT_CHROME` entry gone), the
recipe comment in `tokens.mjs`, and one `test:chrome` block. No ENGINE bump (no emitted artifact moves).
CONTRACT unchanged. No new words.

### What was wrong

The Weights table in the Type preview marks each weight ● (ships it) or ○ (may not), and its key repeats both.
S6.1 kept `weights-by-face.ts` out of the `[glyphs]` build check (`NOT_CHROME`), because the embedded Inter subset
had neither glyph. Measured by CDP before this change, every mark was drawn by a device font (DejaVu Sans in the
test container): the section sits in the legacy card, whose text stack is `styles.css`'s `--sans`.

### The fix, in two halves

- **The face carries them.** Inter itself has U+25CF and U+25CB, so this re-subsets it by the recipe beside
  `CHROME_FONTS` in `tokens.mjs`, with those two added. The recipe first reproduced #1924's committed file byte for
  byte (sha256 `1e27343f…8322`), so the only difference in the new file is the two code points. The source font's
  sha256 matched the recipe. Every one of the 239 earlier code points keeps its outline, advance and variations,
  compared glyph by glyph. The new file is 47,996 B (72 B more), with 241 code points.
- **The marks are drawn by it.** One `chrome.css` rule gives `.tpw-mark.yes`, `.tpw-mark.no` and the key's
  `.tpw-key` spans the chrome's UI face, inside `.p3-legacy-card`. The key's sentence stays one string literal,
  split at ● and ○ only so each mark gets a span. Its `textContent` is unchanged, and its words still draw in the
  card's own stack.

`weights-by-face.ts` leaves `NOT_CHROME`, so `[glyphs]` reads its literals again.

### What the eye sees

The same filled and hollow circles. Inter's ○ is a little larger than DejaVu's, which shows in the key, and the
section is 1px shorter. The ? mark (an unknown family) is untouched.

### Checks, and the mutations that fail them by name

- **`[glyphs]`, the build.** With the old subset back and the file in scope, the studio build fails with
  `[glyphs] U+25CB (○) is not in the embedded face … weights-by-face.ts:62`, and the same for U+25CF (●).
- **`test:chrome`, new block 20c.** By CDP, on web and in the plugin, every mark in the table and key is drawn by
  `Inter` as a custom font, and at least one ● and one ○ are drawn in each (represented, not counted). Dropping the
  `chrome.css` rule fails `#1993 (web): every availability mark is drawn by Inter, never a device font …`.
  `[glyphs]` cannot see this half: it proves the face HAS a glyph, not that the page asks the face for it.
