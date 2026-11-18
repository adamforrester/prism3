## (2026-11-18) — Motion patterns wireframe and the G1–G6 batch, for the owner (#2857, Q-MO1 A / Q-MO2 A)

**What.** A DRAFT wireframe, `docs/superpowers/2857-motion-presets-wireframe.html`, proposes the starter motion
patterns and their Figma custom animation styles. It covers dialog enter and exit, drawer enter and exit, toast enter
and exit, tooltip show, accordion expand, hover, pressed and fade in. Each card plays its pattern on the example
brand's emitted values (`out/figma/prism3/motion.json`) and states:
- what moves;
- the duration role and easing role it binds;
- its "… / reduced" sibling, previewed with a toggle (Dialog reduced is a fade only on `duration-reduced.normal`, Q-M5 A);
- its data name and Figma style name.

Mocks show the styles in Figma's style picker and in a style guide row. A second deliverable, one comment on #3413,
puts gaps G1–G6 (#3481–#3486, with #3493) to the owner as proposed names and values. Nothing is built: no engine,
plugin or skill change.

**Values are copied, not derived.** The page embeds the role values from the emission at `d9078034`, so it is a
snapshot. It never reads a primitive, matching the #2857 rule that styles bind role variables only. A "reduced ramp"
menu previews #3493's options A–C, so the owner sees what each does to the reduced siblings before answering G4.

**Held for the owner (OD-1 to OD-9 on the page).**
- Drawer has no component: it is Dialog's end placement, so its name is open.
- Tooltip has no component and no vault grounding.
- Hover and pressed live in prototype reactions, which refuse variables.
- Picker grouping, and the "/ reduced" sibling making a style name double as a folder (Q-M7 A as written).
- The scale values with no token (the dialog's scale-in, the 0.98 press).
- Missing reverse halves (fade/out, accordion/collapse).
- Style description copy and the style guide layout.

**Traps for the build (P4).** The #2857 spike verified only position and opacity entries. Scale, size and fill color
in a custom animation style are unverified, so Accordion, Pressed and Hover may not be expressible as styles. Check that
in the app, along with the style-and-folder naming, before the executor work starts. G5's recommended derivation
(perceptual duration 2π/√stiffness) assumes Figma reads a spring's duration that way, which is also unverified.
