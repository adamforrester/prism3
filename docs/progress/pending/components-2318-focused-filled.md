## (2026-10-09) — Fields: a "focused with a value" member, `state=focus-visible-filled`, on text-field, select and textarea (#2318)

Owner decision Q157 (2026-10-09): 1, a new state (not `focus-visible` showing the value); 2, named
`focus-visible-filled`. Found in a design-rebuild test: an active password field (focus border, masked value) had no
member and was placed as `filled`, which lost the focus border.

**What the member shows.** The `focus-visible` member's focus ring and focus border around the `filled` member's value in
`text.primary`, and no placeholder. Each status keeps its own border (`error` danger, and so on), as at `focus-visible`.
It sits right after `focus-visible` on the state axis, so the grid's new column falls between `focus-visible` and
`disabled`. Select draws the chosen value and its chevron, with no caret.

**Member counts:** each field goes from size 3 × status 4 × state 6 = 72 to × state 7 = 84, so 12 new per field and
36 in all. A `has value` boolean crossing the axis would have doubled each set to 144 instead.

**The NB update adds the 12 and touches nothing else, checked two ways offline:**
- `dryRunSet` over each set with the new members stripped: 72 old members, 12 adds (all `focus-visible-filled`), and 0
  renames, moves, drops, blockers, replacements or not-current members, on all three fields.
- Every one of the 216 existing coordinates projects a plan byte-identical to `main`'s, apart from `codeOnly` prose (the
  `empty` note's member count), which no update module reads and the plugin bundle does not carry.
The update path itself is unchanged (it's Lane A's).

**The caret: at the end of the value, on text-field only (owner decision Q166 C, 2026-10-09).** The first build kept it
behind a switch while Q157.3 was re-asked, at the START of the value, because one caret node can't reach the end: two
parts can't share the `caret` paint slot (the anatomy gate refuses it, "the projector resolves a slot once"). The owner
then chose C, so text-field gains a second caret part, `caretEnd`, after the value in the entry row, present only at
`focus-visible-filled`, on a new `caret-end` paint slot bound to the same `text.primary`. `caret-end` joins `PAINT_SLOTS`
and `BOX_PAINT_SLOTS` with its reason, and the "a caret is a childless bar" rule covers both slots. Textarea and select
draw no caret at the new state: textarea's value fills the box and wraps, so nothing can follow its last character, and
select has no insertion point. The switch (`field-focus.ts`) is gone with the question.

**Schema: an absolute part's `when` may be a list.** The focus ring is an `absolute` part, and its `when` named one state,
so it couldn't show at both focus states. `when?: string | readonly string[]`, read through `whenStates`; the validator
holds every entry to the def's states and refuses an empty list, and an `overlay`'s `when` still names one state (it
replaces a part on exactly one). `lint-absolute-inset` reads the list with its own normalizer, not the schema's helper.
`focus-visible-filled` joins the closed `STATES` vocabulary with its reason, the bar being a distinct interaction.

**Tests:** a new `#2318` arm per field reads the projected plan at every size and status of the new member, with the
expectations typed from the decision: the value in `color/text/primary`, no placeholder, the ring, the focus or status
border, and on text-field only a caret immediately after the value (no caret before it, none on textarea or select),
plus 12 built members. On the built host, `test-write-components.ts`'s `field end caret` arm reads the end caret's
position, ink, width and one-line height on every text-field member at the new state, and its absence everywhere else. New
validator arms: a `when` list naming an undeclared state, an empty list, and an overlay given a list each fail by name.
The member-count literals of #2266, #1344, #1331, #1426, #1699, #1814 and #1428 move from 72 to 84 (with their
mutation counterparts, 84 → 96 and 144 → 168).

**Mutations,** through the #2272 harness against the engine suite, each failing by name:
- M3, the end caret moved before the value: `❌ #2318 text-field: … WRONG: small/default: no caret immediately after the
  value …`, and on the built host `✗ field end caret (text-field): … end caret is not immediately after the value …`.
- M1, text-field's new member drawn with the placeholder: `❌ #2318 text-field: … WRONG: small/default: value ink
  undefined | small/default: the placeholder is drawn …`.
- M2, select's ring back to `focus-visible` alone: `❌ #2318 select: … WRONG: small/default: no focus ring | …`.

**Screenshots** are plan renders (#2388's method): each projected plan drawn as HTML, with variables resolved from the
prism3 brand's committed Figma export, light and dark, medium size. They approximate: a system font, the focus ring
drawn as an outline, the select chevron and textarea's three reserved rows not drawn.
