## (2026-11-18) — Tag.Group: a wrapping row of pressed toggle tags, and a line gap for wrapping rows (#1739)

**What.** `tag-group`, the component #1739 held: the owner's decision of 2026-11-18 (A, A, A) is built as written.
Any number of select tags can be pressed, each a `<button>` with `aria-pressed` (no listbox, no radiogroup); the row
wraps, with no "+N more"; and the Figma set holds a row of three nested tags in a native `items` slot, built like
Checkbox.Group, with the gap bound to `space.100`, the step Tag's `group-gap` already held. The set has a `size` axis
(3 members) that follows into the tags. Tag's own keyboard, removal and focus-after-removal contract moves into the
group's `codeOnly` unchanged. Category `foundations`, the brief's (`components/tag.md`). Engine minor, by change note.

**The diagnosis that added a schema field.** A wrapping Figma row puts the host's default between its lines, which is
none: a second line of tags would touch the first, though the code and Tag's `codeOnly` put the group gap on both axes.
So the anatomy gains `rowGap` (CSS `row-gap`), a box-only binding key refused on a box whose layout does not wrap, and
the projector writes it as `bound.counterAxisSpacing`. Both executors already bind `bound` after `layoutMode` and
`layoutWrap`, so neither changed, and `lint-executor-revision` agrees (no `EXECUTOR_REVISION` bump). The shim builds and
reads it back; a real host is unverified (`notes.unverified`).

**Decided by the owner (Q-TG1 B + confirm, 2026-11-18).** A select group is `role="toolbar"`: one Tab stop with arrow
keys across the toggle tags, keeping Tag's keyboard contract as recorded. A dismissible group keeps `role="grid"`. The
other options were `role="group"` (each tag a Tab stop) and `role="grid"` for both types. Confirmed as built: the `size`
axis, no visible heading (`label` is the accessible name), the prop list, no group-level `disabled`, three identical
unselected default tags, and the Tag page. The `accessibility` role, the `codeOnly` semantics entry and the notes now
name the toolbar, and `test.ts` `#3949 tag-group role` holds both roles against literals from the decision. Two more
arms: `#3949 tag-group roving tabindex` holds the code-tier keyboard entry's one Tab stop (the last-focused tag
`tabindex="0"`, every other `-1`), which only the surface digest held before; and `#3949 tag select contract` holds
Tag's own role, keyboard, `aria` and select `codeOnly` entry to the decision. Tag had still said a group's select tags
were checkboxes, listbox options or a radiogroup, and that arrows select. Besides that denylist, it asserts one tab stop
and arrows that move focus without toggling, on Tag's select keyboard sentence and on Tag.Group's keyboard field. Still held:
`generationPriority` 2, the 320px placement width, and the shipped prose (DRAFT under `docs/voice-standard.md`). The
visual review of the projected set is in the #3928 QA round, not before the merge.

**Measured.** `test.ts` `#1739` holds each decision against a literal: the `value` prop is `string[]` and the role names
`aria-pressed` and no listbox or radiogroup; nothing shipped offers "+N more" and the Overflow line says
`flex-wrap: wrap`; the items row wraps and binds `space.100` as gap and line gap, equal to Tag's `group-gap` and off
the density ladder; the projected set is 3 members, each a wrapping slot of three select Tags at its size with both
gaps bound to `space/100`; and the validator refuses `rowGap` on a row that does not wrap. Mutations, each failing by
name, are listed in the PR.

**Trap.** Registering a def shifts line numbers that `docs/public/guides/*.md` cite (`components/index.ts`,
`component-groups.ts`, `file-taxonomy.ts`); `lint-guide-claims` fails each by name. Re-cite, delete the stale
fingerprint, and `--stamp` after reading the block.
