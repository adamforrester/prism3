## (2026-11-12) — Slider: a required prop for the marker it already shows (#3554 Q-FL2 A, #3699 Q-FL2.1 A)

**Status:** Slider def + test arm. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No executor
change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q-FL2 A (2026-11-12, on #3554):** Slider nests FieldLabel `nest-exposed` since Q-CC5 A, so the
  label's required marker surfaces on the slider in Figma, but the code API had no `required` prop. It now declares
  one, as CodeInput did under Q-CC8 A (#3622): a boolean, default false, that turns on the marker.
- **Owner decision Q-FL2.1 A (2026-11-12, on #3699):** ARIA 1.2 does not support `aria-required` on `role="slider"`,
  so the prop sets none. It carries "required" in each thumb's accessible name instead, such as "Price range,
  required". The prop description and `accessibility.aria` say so, and the prop is no longer worded as the family's
  "Sets required / aria-required".
- **Counter is not touched.** It still exposes the marker with no prop.

### Diagnosis

Only the code API and its docs move: `props` is not on the projected plan, so the Figma set and the component-surface
baseline are unchanged. The docs page, `component-defs.json`, `components.ai.json` and the comparison report move,
which is why the note is minor.

### Why not aria-required

The first build followed the family wording and set aria-required on each thumb. ARIA 1.2 does not list it among the
slider role's supported properties, and HTML's `required` does not apply to `<input type="range">`, so a validator
would flag it and a screen reader might not announce it. Q-FL2.1 A moved the semantics into the accessible name.

### Verification

`test.ts` `Q-CC8 <id> declares the field family's required prop` keeps the seven text-like fields on the family
sentence. A Slider arm, `Q-FL2.1 slider's required prop carries "required" in each thumb's accessible name and sets no
aria-required`, holds the owner's wording in both the prop description and `accessibility.aria`, and fails if either
names aria-required as set.
