## (2026-11-05) — Components shows what's already in the file: a checked, disabled box and an In file tag (#3439)

Owner decisions Q-IF.1 A, Q-IF.2 A and Q-IF.3 A, superseding Q3129.6 A's empty cell for a set the file holds. On the
plugin's Components page a set already in the file drew no box, so the owner saw blank space where the checkbox would
be. Now:

- **Q-IF.1 A:** a set or family the file holds whole draws its box checked and disabled, in the chrome's existing
  checkbox pattern (`role="checkbox"`, `aria-checked="true"`, `aria-disabled="true"`, the held style #3306 already
  draws). Its accessible name is `{name} is in this file` (DRAFT, the issue's draft; the final wording is the owner's).
  A tick on it writes nothing.
- **Q-IF.2 A:** an **In file** tag sits first among a row's status tags, as in `In file · Due`.
- **Q-IF.3 A:** a family partly in the file keeps an active box; a tick adds only the missing sets, as before. Once every
  set of it is in the file, its box is checked and disabled.

### How
- `state/component-groups.ts`: `inFileOf(catalog, ids, present)`, true when the file holds a set of `ids` and could add
  none of them (`addableOf` empty). `boxOfSets` is unchanged: a box with something to add is three-state as before.
  `GROUPS_COPY.inFile` and `GROUPS_COPY.inFileName`.
- `domains/components.ts`: `boxOrCell` draws the in-file box where it drew the empty cell, when `inFileOf` holds.
  `statusTags` puts In file first when any of its sets is in the file. On a family that holds mixed statuses the
  existing `has.delete('current')` rule is kept, and In file still shows, since it says the family holds some of its
  sets (the issue's "shows when any set is in the file").
- Unchanged: the held state, the queued state, the web (no file, no boxes, no tag), private parts (no box), the tier
  actions, and a **section of several rows** (Fields, Other components, Subcomponents): it is no family, so with
  nothing to add it keeps its empty cell. A section that stands in for one family (Buttons, Tag, Radio…) draws the
  family's in-file box. Held for the owner on the PR.

### The audit learned one thing
The chrome's contrast audit holds every disabled control to its appearance's disabled roles, and read a `.p3-check`'s
mark as a ghost button's glyph (`disabled.icon`). No checked, disabled check box had been audited before, so it never
met a mark that sits inside the box, on `disabled.fill`, which the CSS draws in `disabled.on-fill`. That is the role
DB1 A already holds the fixed Light row's mark to, read from the emission. The audit now holds a mark inside
`.p3-check-box` to `disabled.on-fill` and every other glyph as before.

### Verification
`test-component-groups.ts` section 2c and `test-chrome.mjs` sections 3129 (light and dark at 1280, light at 380) and
IA2, with literal expectations. Mutations, each committed first and failing by name: the empty cell drawn again →
`3129 figma … Q-IF.1 A: a set or family the file holds draws its box checked and disabled …`; the tag dropped →
`3129 figma … Q-IF.2 A: In file sits first …` and `IA2 figma … #3439 Q-IF.2 A`; a partly-in family's box disabled →
`3129 figma … Q-IF.3 A: a family partly in the file keeps an active box …`. `inFileOf` mutations fail
`Q-IF.1 A` and `Q-IF.3 A` in the unit test. The guide `build-components.md` names the new state and its citations moved
by content.
