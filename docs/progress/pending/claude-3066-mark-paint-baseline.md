## (2026-11-02) — Brand marks: a paint baseline seeded from the owner's drop, so a retint of file and record fails (#3066)

`lint-mark-colors.ts` held each mark file to its `provenance.json` record, and both are typed in the same edit, so a
retint of the two together passed every gate (`social/spotify.svg` `#1ED760` → `#1ED761`). Owner decision Q3066.1 A:
an accept-only baseline seeded from the owner's own drop, commit `3675273d` (`incoming-marks/`), and no second copy of
the artwork.

### What landed

- `packages/engine/schema/mark-paints.json`: per mark file, its paints as `#RRGGBB` in painting order. 71 entries are
  as supplied and cite no decision (two carry `supplied`, the drop's `social/twitter*.svg`, renamed `x`). 15 cite the
  decision that moved them: the 11 `button/` marks (#3174 · Q3174.3 A, captured from the providers' SDKs, not in the
  drop), `provider/apple` and `provider/facebook` drawn black (#3134), `provider/facebook-blue` (Q831 A) and
  `social/facebook`'s blue (Q837 A).
- Arm (i) `PAINT BASELINE` in `lint-mark-colors.ts`: every `marks/**.svg`, read from the folder, and every document
  in `provider-logo-glyphs.ts` paints exactly its baseline list, and the folder and the baseline agree both ways.
- `--accept --decision <#issue | Qn X>` is the only writer, and stamps that ref on each entry it changes; regen never
  writes the file (docs/34 shape 6). `--seed-check` re-reads every undecided entry from the seed commit. It needs that
  commit (`git fetch origin refs/pull/3064/head`), so it is a local check, not a CI step, and says CANNOT DETERMINE
  without it.
- `lint-schema-classification.ts` lists the file in class 3 (pure data, no prose), beside `component-axes.json`.

### The trap

The gate's old reader (`colorsOf`, hex `fill` on `<path>` and `stop-color`, in document order) reads the drop wrong:
the drop paints with keywords, short hex, `<rect>` and `<use>`, puts gradients after the paths, and carries Figma clip
rects filled `white`. Read with it, 30 files "differ" from the drop. `paintsOf` is written for both spellings: clip
paths and masks paint nothing, a gradient's stops count where a shape uses it, keywords and short hex read as
`#RRGGBB`, and any paint it cannot read throws rather than reads as fewer colors. Read that way, every undecided file
equals the drop exactly.

### The mutation

From a `wip:` commit: `social/spotify.svg` `#1ED760` → `#1ED761` and the same change in its record's `colors`, then
`emit-marks.ts`. Arms (a), (b) and (c) stay quiet, and the gate fails by name: `social/spotify.svg: PAINT BASELINE`
and `social/spotify: PAINT BASELINE` (the emitted document).
