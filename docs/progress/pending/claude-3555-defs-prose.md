## (2026-11-11) — Component prose: plain-word summaries, one purpose register, intent wording, no cited sources (#3555 Q-MD5, Q-MD14, Q-MD15, Q-MD16)

Part of #3555 (the 2026-11-11 metadata audit). The owner took option A on every Q-MD. This PR builds the component-def
halves of Q-MD5, Q-MD14, Q-MD15 and Q-MD16.

- **Q-MD5 A, summaries.** A summary is the Figma set description, so it uses plain words, not code names, and no build
  instruction.
  - "Nested by Checkbox.Row" becomes "Nested by a checkbox row", and likewise for the radio and switch controls.
  - "inside a Radio.Group" becomes "inside a radio group".
  - The accordion indicator now says "an accordion header", and the slider thumb "a slider".
  - Focus ring's "Build first; don't place alone." becomes "Don't place it alone."
- **Q-MD14 A, register and jargon.**
  - Ten `primaryPurpose` lines were noun phrases ("One trigger inside Tabs …", "Text that navigates …"). Each now opens
    with a verb, and keeps its content.
  - The three action families' siblings shared one line each. Each sibling now has its own, built from words the defs
    already use: "in the brand's primary style", "deletes or removes something", "carries no brand emphasis".
  - Shipped fields lose "a11y" (now "accessibility"), "i18n" ("text expansion in translation") and
    `IA2_ROLE_TOGGLE_BUTTON` ("some platform accessibility layers map … to the same toggle-button role").
  - Switch.Row's lowercase sentence start ("two implementation traps") is fixed in the same sentence.
- **Q-MD15 A, Badge.** The summary said "color is never the only signal", but the dot type has no text. It now reads as
  intent, "color is not meant to be the only signal", and its 1.4.1 line is stated "as intent", the form other defs use.
- **Q-MD16 A, channel and register.**
  - Spinner's `whenToUse` drops "(Material 3's bands)".
  - Checkbox.Row's focus text says "44 or 48 on touch", not "44 (Apple) / 48 (Material)".
  - Image placeholder's tool-neutral `whenToUse` drops "turn the marker property off". The same instruction already
    ships in its `docs.do`, which a designer reads in the file.

### Gate

A new arm, `#3555 Q-MD5`, holds three things:
- No summary contains another registered component's dotted name. The oracle is the registry's names.
- No summary contains "build".
- Each action family's three siblings state three different `primaryPurpose` lines.

The family equality tests mask `primaryPurpose` as a per-sibling field. Mutation: "Nested by Checkbox.Row" was restored
and Button's three purposes were collapsed back into one. The arm failed by name: "checkbox-control summary names
Checkbox.Row | button family shares a primaryPurpose".

### Trap for whoever merges

#3634 (C2) edits the same `sharedPart` mask line in `test.ts`, and the `whenToUse` lines next to `primaryPurpose` in
`icon-button.ts` and `flush-icon-button.ts`. Whichever lands second keeps both fields in the mask and both per-sibling
values.
