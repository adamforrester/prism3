## (2026-10-16) — Build-component skill: the conventions the owner decided on 2026-10-15

`skills/prism3-build-component/SKILL.md` now states the component conventions the owner decided on the audit
umbrella #2706 and around it. It also fixes the eight skill-drift items the audit listed (S1–S8). Skill only:
no def, gate or artifact moves, so there is no change note.

### What the skill now says, and where each rule came from

- **Wireframe before build** (#2382): the owner sees a rough wireframe of the component as it will be built
  before the build starts.
- **Field order** (S8): summary before description, and the corpus's order for the rest. The Button and
  Icon button factories' order is named as the one to avoid (#2712).
- **Four `notes` buckets** (S4): `projection` joins contested, unverified and evolution.
- **Root names** (S1): "named for its role, never `root` or the component's id", picked from §6's closed
  list; a new role needs an owner decision (Q365).
- **Nesting:** every host nests FieldLabel `nest-exposed` with emphasis and weight exposed; fields default to
  regular, groups to bold (Q348). `variantWhen` is documented, host states included (main folded `atState` into it).
- **Borders** (Q346): a border never binds an icon or text role, and every disabled edge binds
  `color.disabled.border`. This is the same text #2753 adds.
- **Errors** (Q354): main's §5 bullet (#2755), plus one sentence: radio's group-only validation is the one
  stated reason a family differs, and a new def that departs states its own.
- **Selection weight** (S3): Tab and the Segmented control's segment set the selected label in the emphasis
  weight and hold its width with a reserve driven through `also`. That is the one exception to the
  constant-weight idiom.
- **Props for consumer-set states** (Q351): a Row restates `disabled` and `readOnly`. Only a part never placed
  alone (FieldLabel) takes the state without a prop.
- **Lowercase property names** (Q345, S5): main's §6 paragraph, plus one sentence: a property rename rides
  `COMPONENT_RENAMES`.
- **The naming table** (Q350) and the **`_` prefix** (Q349, Q355, Q394): main's §6 copy is the only one;
  this PR adds only that Radio row stays unprefixed.
- **Repeating children** go in a native `items` slot, never a boolean per child (#2660, Q307).
- **The rarer `figmaProperties` fields** (S7) get a table.
- **Prototype reactions** (Q344): Rest carries hover and press, Hover carries press, and the touch-prototype
  reason is given.
- **Pointers to the open conventions:** binding-key spelling (#2710), the "not projected" wording (#2711)
  and sibling test kinds (#2764, the remainder of #2715).

### Decisions and traps for whoever re-verifies this

- **One copy of each rule.** The PRs this one waited on (#2753, #2754, #2755, #2756, #2758, #2765, #2768,
  #2769, #2771, #2772, #2777, #2938) landed their own text in this skill. On merging main (2026-10-22) this
  PR's copies of the Q354 bullet, the §6 naming table, the `_` prefix, slot items and lowercase names were
  deleted, keeping main's: `lint-naming` reads only the first copy of §6, so a second copy could drift with
  every gate clean. Git does not flag these: the hunks do not overlap.
- **Q321, cited in the brief for items slots, does not exist** on any issue, PR or file. The record is Q307 A
  on #2649, and the skill cites that.
- **`lint-skills` reads a lowercase dotted name in backticks as a token path.** So `docs.usage` and
  `notes.projection` would fail as dead paths, and the skill writes them as "the `usage` field of `docs`".

### Owner decisions applied after review (2026-10-19)

- **Q365 A** (naming sweep): main text is `label` with Dialog's `title`/`description` as the one exception;
  glyph layers end in `Glyph` and the close glyph stays `dismissGlyph`; the root comes from a closed list of
  roles (main's 11: FieldLabel's root became `container`, so `label` is not a root); only the checkbox and radio controls are exempt from the `_` prefix, and Radio row stays unprefixed.
- **Q394 A** (#2831): slot items (tab item, list item, the Segmented control's segment) are unprefixed and
  preferred, because a `_` prefix hides a component from library publishing. The `_` rule now covers the
  accordion indicator only.
- Review fixes: field order (`inherits` after identity, `weightIntent` before the paint keys), both factories
  named, and the closed root list restored. The size and slot ordering text is main's (#2752).
