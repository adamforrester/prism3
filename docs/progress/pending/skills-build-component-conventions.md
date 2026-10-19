## (2026-10-16) — Build-component skill: the conventions the owner decided on 2026-10-15

`skills/prism3-build-component/SKILL.md` now states the component conventions the owner decided on the audit
umbrella #2706 and around it. It also fixes the eight skill-drift items the audit listed (S1–S8). Skill only:
no def, gate or artifact moves, so there is no change note.

### What the skill now says, and where each rule came from

- **Wireframe before build** (#2382): the owner sees a rough wireframe of the component as it will be built
  before the build starts.
- **Field order** (S8): summary before description, and the corpus's order for the rest. Button's factory
  order is named as the one to avoid (#2712).
- **Four `notes` buckets** (S4): `projection` joins contested, unverified and evolution.
- **`generationPriority`** has no agreed scale (#2713), so it is ranked against the family's own numbers.
- **Root names** (S1): the stale list of roots is gone. The rule is now "named for its role, never `root`
  or the component's id", with a pointer to the naming table.
- **Nesting:** every host nests FieldLabel `nest-exposed` with emphasis and weight exposed; fields default to
  regular, groups to bold (Q348). `atState` is documented.
- **Borders** (Q346): a border never binds an icon or text role, and every disabled edge binds
  `color.disabled.border`. This is the same text #2753 adds.
- **Errors** (Q354): an invalid control takes the fields' `status` axis. A standalone choice sets its own;
  a group sets it and passes it down, which is the stated reason radio validation lives on the group. This
  is the same text #2755 adds.
- **Selection weight** (S3): Tab and the Segmented control's segment set the selected label in the emphasis
  weight and hold its width with a reserve driven through `also`. That is the one exception to the
  constant-weight idiom.
- **Props for consumer-set states** (Q351): a Row restates `disabled` and `readOnly`. Only a part never placed
  alone (FieldLabel) takes the state without a prop.
- **Lowercase property names** (Q345, S5), with renames riding `COMPONENT_RENAMES`.
- **First member = code default** (Q347, S2): on every axis, held by the `#2752 <def>` test. The size ladder
  and Button's icon slots stay recorded exceptions while #2752's owner question is open.
- **The naming table** (Q350) and the **`_` prefix** (Q349, Q353, Q355).
- **Repeating children** go in a native `items` slot, never a boolean per child (#2660, Q307).
- **The rarer `figmaProperties` fields** (S7) get a table.
- **Prototype reactions** (Q344): Rest carries hover and press, Hover carries press, and the touch-prototype
  reason is given.
- **Pointers to the open conventions:** binding-key spelling (#2710), the "not projected" wording (#2711)
  and sibling test kinds (#2715).

### Decisions and traps for whoever re-verifies this

- **This PR owns the naming table.** No rename-sweep PR or branch existed when it was written. The table
  is worded to be true before and after the sweep: new defs use the table, and an older name in an existing
  def is waiting on the sweep. The sweep lane should link here rather than write a second table.
- **Several rules depend on unmerged PRs:** #2753 (the `lint-paint` arm 5 the border rule names), #2754 (the
  `#2752 <def>` test), #2755 (status), #2756 (groups' label), #2758 (Row props), #2660 (items slots) and
  #2746 (the gate-scope rows S6 needs). Those PRs' own lines are not in this diff. #2746's table rows stay
  untouched here so it merges in cleanly. `lint-skills` passes on main today because none of the
  identifiers those PRs introduce are quoted in backticks; a reviewer re-running it after they land is the
  check that the prose still matches.
- **#2753 and #2755 both edit §5 of this file at the same line.** Their text is carried here word for word
  (with one added sentence on a family's stated reason to differ), so a merge conflict with either resolves
  by taking this side.
- **Q321, cited in the brief for items slots, does not exist** on any issue, PR or file. The record is Q307 A
  on #2649, and the skill cites that.
- **`lint-skills` reads a lowercase dotted name in backticks as a token path.** So `docs.usage` and
  `notes.projection` would fail as dead paths, and the skill writes them as "the `usage` field of `docs`".

### Owner decisions applied after review (2026-10-19)

- **Q365 A** (naming sweep): main text is `label` with Dialog's `title`/`description` as the one exception;
  glyph layers end in `Glyph` and the close glyph stays `dismissGlyph`; the root comes from a closed list of 12
  roles; only the checkbox and radio controls are exempt from the `_` prefix, and Radio row stays unprefixed.
- **Q394 A** (#2831): slot items (tab item, list item, the Segmented control's segment) are unprefixed and
  preferred, because a `_` prefix hides a component from library publishing. The `_` rule now covers the
  accordion indicator only.
- Review fixes: field order (`inherits` after identity, `weightIntent` before the paint keys), both factories
  named, and the closed root list restored. The size and slot ordering text is main's (#2752).
