## (2026-11-18) — design.md carries every brand setting the schema allows, held by a whole-schema round-trip gate (#3984)

**What.** Owner decision Q-DM2 A on #3984 (2026-11-18): design.md stays the one import and export format for brand
settings, and its front matter maps 1:1 onto `theme-schema.json`. Until now that was proven feature by feature in
`test.ts`. `lint-design-md-round-trip.ts` proves it for the whole schema.

**How the gate builds its inputs.** It walks `theme-schema.json` with its own code, following `$ref`, `allOf`,
`oneOf`/`anyOf` and type lists, and builds witnesses:
- **Main:** every property set, nested ones included. A map gets each key its `propertyNames` enum allows, or a key
  that needs quoting plus a plain one. An array gets one item.
- **Variants:** one per other branch, other enum value and `false`. 631 witnesses over 325 property paths today.

An unconstrained string gets a value with a quote, a colon, a `#`, a backslash and a line break. A patterned string
gets the first typed candidate that matches.

**What it checks.** Each witness must come back from `toDesignMd` → `parseDesignMd` deep-equal:
- `LOST: <path>` for a property that doesn't survive, with what was sent and what came back, grouped across
  witnesses;
- `UNPARSEABLE` for an export that won't import, naming each top-level property that fails alone;
- `REPRESENTED` for a schema property no witness sets, or a count under its floor.

Nothing is read from `design-md.ts`'s internals, `theme.ts` or the validator (docs/34). A property added to the schema
later is in the next run's witnesses with no edit to the gate. Mutations: dropping `motionPersonality` from
`toDesignMd` fails `LOST: motionPersonality`; dropping a nested key (`tempo`) in `serValue` fails
`LOST: motionPersonality.tempo` and `LOST: modeLevers.mobile.tempo`.

**What it found, and fixed here.** Both were value-level losses, not missing properties: with ordinary values every
property already survived.
- **A line break in any string setting** (a brand name, a family) was written raw inside the double quotes, so its
  second line became a frontmatter line and the export would not import (`UNPARSEABLE: name, modeLevers, …`). The
  serializer now writes `\n` and `\r` as YAML escapes, `bareOk` refuses a value holding one, and the parser decodes
  them. The backslash is escaped first, so a typed `\n` stays text. One behavior change for hand-written briefs: a
  `\n` inside double quotes now reads as a line break, as YAML defines it.
- **A quoted key was trimmed after decoding,** so a key with a space at an end lost it. The raw text is trimmed
  instead, in both the flow and the block parser.

A `test.ts` arm (#3984) holds both: 1 of 5 cases passes on main's serializer, 5 of 5 after. No committed artifact
moves, so it carries a `patch` note.
