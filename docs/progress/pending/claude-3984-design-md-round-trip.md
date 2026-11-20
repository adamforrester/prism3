## (2026-11-18) — design.md carries every brand setting the schema allows, held by a whole-schema round-trip gate (#3984)

**What.** Owner decision Q-DM2 A on #3984 (2026-11-18): design.md stays the one import and export format for brand
settings, and its front matter maps 1:1 onto `theme-schema.json`. Until now that was proven feature by feature in
`test.ts`. `lint-design-md-round-trip.ts` proves it for the whole schema.

**How the gate builds its inputs.** It walks `theme-schema.json` with its own code, following `$ref`, `allOf`,
`oneOf`/`anyOf` and type lists, and builds witnesses:
- **Main:** every property set, nested ones included. A map gets each key its `propertyNames` enum allows, or a key
  that needs quoting plus a plain one. A map that states no value shape (`additionalProperties: true`: `overrides`,
  `modeAnchors`) gets the same keys, each holding a typed value of every JSON kind. An array gets `minItems + 2`
  items (capped at `maxItems`), distinct where its schema allows, so a loss past the first item shows (#4087 review).
- **Variants:** one per other branch, other enum value and `false`. 631 witnesses over 327 property paths today.

An unconstrained string gets a value with a quote, a colon, a `#`, a backslash and a line break. A patterned string
gets the first typed candidate that matches.

**What it checks.** Each witness must come back from `toDesignMd` → `parseDesignMd` deep-equal:
- `LOST: <path>` for a property that doesn't survive, with what was sent and what came back, grouped across
  witnesses;
- `UNPARSEABLE` for an export that won't import, naming each top-level property that fails alone;
- `REPRESENTED` for a schema node that uses a keyword outside the gate's typed closed list (what it reads, plus
  annotations and constraints it may ignore), such as `patternProperties` or `if`/`then`; for a dropped
  `oneOf`/`anyOf` branch carrying more than `required`; for a map property no witness sets; or for a count under its
  floor. Before the review fix, `REPRESENTED` compared the walker's reach with itself and could not fail for a shape
  it did not reach (#4087 review, docs/34 shapes 12 and 20).

Nothing is read from `design-md.ts`'s internals, `theme.ts` or the validator (docs/34). A property added to the schema
later is in the next run's witnesses with no edit to the gate. Mutations: dropping `motionPersonality` from
`toDesignMd` fails `LOST: motionPersonality`; dropping a nested key (`tempo`) in `serValue` fails
`LOST: motionPersonality.tempo` and `LOST: modeLevers.mobile.tempo`. Review mutations, each green on the gate before
the fix: a `patternProperties` and an `if`/`then` property in the schema, dropped by the serializer, fail
`REPRESENTED: probeMap uses patternProperties` and `probeCond uses if`; arrays cut to two items on export fail
`LOST: modes`.

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
