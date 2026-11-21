## (2026-11-19) — The conforming projection writes DTCG 2025.10 value forms (#4123, #4128)

**What.** Owner decision A on #4123: the base and overlay projections write a literal color as `{ colorSpace,
components, alpha?, hex }` and a dimension as `{ value, unit }`, shadow layers included. Owner decision A on #4128,
its letter-spacing half: a type style's `letterSpacing` is resolved to px, the multiplier times the style's font size,
as a dimension. It is resolved per mode, so a mode that moves the multiplier or the size puts the style in its overlay.

**Where, and why there.** In `buildOverlaySet`, the handoff, on a copy of the canonical tree. The canonical tree, the
Figma emitters and every other reader keep the string forms and the alias they already read. Converting upstream
would have moved every one of them for no consumer gain.

**What decision A's own condition kept as strings: durations.** Measured on stock Style Dictionary 5.5 with a probe
tree: color and dimension objects come out byte-identical to the strings on CSS, SCSS, JS, Swift, Compose and
Android. A `{ value, unit: 'ms' }` duration comes out as `[object Object]` on CSS, Swift, Kotlin and Android, alone
and as a transition's `delay`. A recorded departure from Format §8.5, in `packages/tokens/README.md`.

**The one CSS change.** An object color inside a shadow layer prints as `rgb(3.92% 7.06% 15.69% / 0.102)` where the
string printed `#0a12281a`: the same color. Three gates compared those strings exactly. `check-consumability`'s #609
arm and `check-package`'s `[VALUE]` now read each color as its rounded RGBA, and `lint-overlay-completeness`' arm C
reads both value forms to one spelling. Each uses its own parser. `lint-consumer-build`'s own derivation types the
value forms (with a self-check case), and `lint-description-claims` reads a color or px dimension object. Studio's `test-export-settings.ts` 7c held the
export's base file to `buildBase`; its oracle is now `buildOverlaySet`'s base, the engine path that writes
`out/*.base.tokens.json`. The export guide's citation of `check-consumability.mjs` moved with the lines.

**Not built: #4128's other half.** `fontStyle`, `textDecoration` and `textCase` stay in `$value` (owner decision A,
2026-11-20); #4374 documents them as Prism3 extensions.

**The shadcn/Tailwind projectors read the object forms.** `emit-shadcn.ts` and `emit-tailwind.ts` read this handoff,
and #4309 put them into CI, where they threw on the first color object. Each now reads a color object from its
`components` (srgb only, anything else refused by name) and a `{ value, unit }` dimension, a shadow layer's included,
with its own parser. Their CSS is byte-identical to main's.

**Tests.** `check-consumability` `[SHAPE]`, per brand and file: every color and dimension is an object, and every
type style's `letterSpacing` is a dimension or an alias to one. On string forms (main's projection) it fails by name.
With `trackingInPx` dropped, it fails naming `letterSpacing: "{…letter-spacing-role.tight} (a number token)"`.
`test.ts` `#4123` / `#4128` pin the converter on a synthetic tree (rgba, a mode's hex, rem, a duration, per-mode
tracking), since no committed brand exercises those; both rows fail by name with each piece dropped.
`test.ts` `#4123` shadcn rows project a synthetic handoff spelled both ways and every committed handoff; with the
string-only guard put back they fail by name, and `check:shadcn`, `lint-shadcn-contrast` and `lint-shadcn-roundtrip`
throw.
