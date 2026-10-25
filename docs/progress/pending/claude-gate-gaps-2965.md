## (2026-10-25) — The brand-invariant stroke steps are pinned in px, and Slider's nested inputs and range text key are asserted (#2965, #2967)

Both issues came from the review of the Slider (#2792), and both are `test.ts` arms, so they share a PR.

### #2965 — the stroke steps, in pixels

No gate asserted a `border-width` step's emitted px. `BORDER_PX` in `test.ts` only feeds the executor stub, and #2792 pinned the Slider's three track rungs only, so `none` (0px) and `hairline` (1px, the border floor) moved freely. A new arm holds a literal table against every composed `out/<brand>.tokens.json` (not the base or the overlays), following each alias to its `$value` and holding any per-mode override to the same number:

- `border-width` none / hairline / thick / heavy / x-heavy → 0 / 1 / 2 / 4 / 6px.
- `focus.ring` width / offset / offset-field → 2 / 2 / 0px (the 2px SC 2.4.13 floor and the two fixed offsets).

`tree.ts` writes each as a constant, so none is a brand setting. The table is typed from the decisions, never read off `tree.ts` (`docs/34` shape 1). The arm asserts it walked at least five brands and a leaf count of brands × 8, so an empty walk cannot pass.

**What is deliberately not pinned.** The issue's broader "other brand-invariant steps" (it names `tree.ts`'s grid steps) does not hold as stated: one corpus brand already ships its own breakpoints and grid, so those are brand settings, and a pin would be wrong. `container.min` (320px) is already pinned by #2971. The `radius` steps vary by brand; its `round` and `capsule` sentinels are pinned by existing arms.

### #2967 — Slider's nested inputs and the range text key

1. **The inputs' size.** Only `lint-component-surface`'s plan digest held the nested TextFields at `medium` (Q550), and `--accept` clears a digest. A semantic arm now walks every Slider member's plan for nests of `text-field` and asserts each is `size: medium`, with a floor of 45 inputs (15 single members × 1 + 15 range members × 2).
2. **The keying.** `texts.defaultValue → figmaName: 'range text'` is forced: a texts key must be a declared prop, and the two readouts need different placeholders. A Code Connect projection would read it as "the range readout maps to `defaultValue`". Slider's `notes.projection` (the maintainer-only list for how a fact is projected, #2411) now says the keying is mechanical, not a prop mapping. A `test.ts` arm asserts the keying is still `range text` and that exactly one `notes.projection` entry carries the literal phrases (`range text`, `defaultValue`, `not a prop mapping`, `Code Connect`). The issue offered `notes` or `codeOnly`. `codeOnly` was tried first and dropped: it moves Slider's projected plan digest (`lint-component-surface`), which would make a one-sentence warning a `minor` surface change. `notes` reaches only `schema/component-maintainer.json`.

### Mutations, each failing by name

Wip commit before each. Each diff was checked non-empty first. The first M1 attempt matched nothing (a string anchor against the file's indentation), its green was discarded, and it was redone as a JSON edit (`docs/34` shape 19). Files were restored from `HEAD` with `git show`, and the regenerated tree with `git stash -u` + drop.

- **M1.** In one brand's composed tree, `border-width.hairline` → `{…core.dimension.2}` → `#2965 brand-invariant steps: … (5 brands, 40 leaves; 1 off — harbor.tokens.json border-width.hairline 2px (want 1px …))`. It was the only failure.
- **M2.** A `wireframe` mode override of 2px on one brand's `focus.ring.offset-field` → `#2965 …: aurora.tokens.json focus.ring.offset-field in wireframe 2px (want 0px …)`. The CLI byte-identity check also fired, as expected for a hand-edited artifact.
- **M3, the issue's shape.** `tree.ts` `border-width.none` written at 1px, regenerated → `#2965 … 5 off`. It was the only failure, which confirms the issue's measurement that nothing else held it.
- **M4.** `inputNest` `size: 'medium'` → `'small'` → `#2967 Q550 slider inputs: … (45 inputs; 45 not medium — type=single, size=medium, state=rest: small; …)`.
- **M5.** The `notes.projection` "range text key" entry deleted → `#2967 slider: range text is keyed to defaultValue, and one notes.projection entry says the keying is mechanical … (0 entries)`.
