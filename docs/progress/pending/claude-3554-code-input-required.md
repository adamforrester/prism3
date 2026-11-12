## (2026-11-11) — CodeInput: a required prop for the marker it already shows (#3554 Q-CC8)

**Status:** CodeInput def + test arm. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No executor
change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q-CC8 A (2026-11-11, on #3554):** CodeInput nests FieldLabel `nest-exposed`, so the label's
  required marker surfaces on the field in Figma, but the code API had no `required` prop. It now declares the field
  family's prop, worded as TextField's: a boolean, default false, that sets required and aria-required and turns on the
  marker. `accessibility.aria` names aria-required.
- **Counter is not touched.** Q-CC8 A decides Counter separately; it still exposes the marker with no prop.

### Diagnosis

Only the code API and its docs move: `props` is not on the projected plan, so the Figma set and the component-surface
baseline are unchanged. The docs page, `component-defs.json` and the agent-facing JSON move, which is why the note is
minor.

### Verification

`test.ts` `Q-CC8 <id> declares the field family's required prop` holds the seven fields that surface the marker,
CodeInput among them, to a boolean `required` defaulting false like FieldLabel's marker, in TextField's wording.
Dropping the prop from CodeInput fails `Q-CC8 code-input` by name.
