## (2026-11-12) — Slider: a required prop for the marker it already shows (#3554 Q-FL2 A)

**Status:** Slider def + test arm. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No executor
change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q-FL2 A (2026-11-12, on #3554):** Slider nests FieldLabel `nest-exposed` since Q-CC5 A, so the
  label's required marker surfaces on the slider in Figma, but the code API had no `required` prop. It now declares
  the field family's prop, as CodeInput did under Q-CC8 A (#3622): a boolean, default false, worded as TextField's,
  that sets required and aria-required and turns on the marker. `accessibility.aria` names aria-required on each thumb.
- **Counter is not touched.** It still exposes the marker with no prop.

### Diagnosis

Only the code API and its docs move: `props` is not on the projected plan, so the Figma set and the component-surface
baseline are unchanged. The docs page, `component-defs.json`, `components.ai.json` and the comparison report move,
which is why the note is minor.

### Trap for the owner (flagged, not decided here)

ARIA 1.2 does not list `aria-required` among the slider role's supported properties, and HTML's `required` attribute
does not apply to `<input type="range">`. So the semantics half of Q-FL2 A, as worded, is not carried by the platform
the way it is on a text field; a validator may flag aria-required on a thumb. The marker half holds. The prop wording
follows the decision and #3622 exactly; the PR asks whether the semantics should be stated differently.

### Verification

`test.ts` `Q-CC8 <id> declares the field family's required prop` now lists `slider` with the seven fields. Dropping the
prop from Slider fails `Q-CC8 slider` by name.
