## (2026-11-18) — Right-to-left as part of the component contract: a mirror field and an "In RTL" note (#3986)

Owner decision Q-RTL1 A, after the knowledge base: Figma isn't the authority on right-to-left, code proves it,
and the contract documents it. This entry is parts 1 and 3. Part 2, RTL tests in the POC, is a separate lane.
Engine {{ENGINE_VERSION}}.

### The field

`PartFields.mirror`, admitted on every part kind. `anatomyErrors` refuses a value on a kind it can't describe:

- `reverses`: a box whose row reverses. Box only.
- `mirrors`: a glyph, or what a slot or nest holds, flips. Not on a box or a text.
- `never`: stays as drawn, or keeps its left-to-right order (code-input's cells, a card number's digits).
- `per-glyph`: an icon that flips or holds depending on which glyph it is. Allowed only on the Icon's own templated
  glyph and on slots that hold an icon. This is a fourth value beyond the owner's three, because a button's
  leading slot neither always mirrors nor never mirrors. It's flagged on the PR.

The icon set gains `RTL_MIRRORED_GLYPHS`: the glyphs that point left or right, the diagonals, and the
external-link arrow. That follows the Icon def's prose (back and forward mirror; a clock stays a clock) and
Link's (the arrow and the external icon mirror). The list is DRAFT.

All 48 defs with right-to-left prose are filled from that prose. 46 state the field on their own parts. The other
2, CheckboxGroup and RadioGroup, have no part of their own the prose describes, so they inherit through the rows
they nest and get no note of their own. Three helpers carry the field where a factory builds the parts: `withMirrors` for the three text-field
variants, a `mirror` option on `markPart`, and a field on Banner's `toneGlyph`.

### The gate, and the two prose edits it asked for

A `test.ts` arm reads each def's right-to-left prose with its own phrase list. It never goes through
`rtl-mirror.ts`. It sorts the prose into three claims (row, flip, hold) and holds them to the fields:

- what a def's own parts state, its prose must say;
- what the prose says, the def's parts, or the parts of the defs it nests, must state;
- prose with no field anywhere fails, and so does a field with no prose.

A self-check on BreadcrumbSeparator proves each direction bites. The mutation proves it on the corpus.

Two defs' prose described the layout around them rather than the component. RadioControl said "the row mirrors";
its row is RadioRow's. Spinner said "layout mirrors through logical properties"; the spinner has one glyph. Both
now say "the row it sits in" and "the page around it". This moves both sets' plan stamps (`component-surface.json`
accepted).

### The note

`rtlNote` writes one sentence per value, naming parts as the anatomy does. For example: "The layout mirrors: the
start edge is on the right. The chevron glyph flips to point the other way." The doc section model carries it on
the usage section, so the docs page shows it under **In RTL.** and the Figma usage panel shows it as "In RTL: …"
under the usage paragraph. Figma gets no right-to-left variants. The wording is DRAFT for the owner.

#1325 (component-contract versioning) hasn't landed, so the field rides `ENGINE_VERSION` as every component
change does today.
