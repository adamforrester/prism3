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

**Held for the owner (OWNER DECISION on the PR).** The container role of a select group. The brief gives the selection
genres no grid ("no embedded remove, so no grid"), so with pressed buttons `role="grid"` is not the evident pattern:
(A) `role="group"`, each tag a Tab stop; (B) `role="toolbar"`, one Tab stop and arrow keys over toggle buttons, which
keeps Tag's keyboard contract as recorded; (C) `role="grid"`, as for dismissible tags. Recommended B. The shipped
`accessibility` fields name no container role for a select group until it is decided. Also held: the `size` axis, no
visible heading (`label` is the accessible name), the prop list, `generationPriority` 2, the 320px placement width, the
Tag page in the file taxonomy, and the new shipped prose (DRAFT under `docs/voice-standard.md`). No wireframe was shown
before this build; the PR asks for that review against the projected set.

**Measured.** `test.ts` `#1739` holds each decision against a literal: the `value` prop is `string[]` and the role names
`aria-pressed` and no listbox or radiogroup; nothing shipped offers "+N more" and the Overflow line says
`flex-wrap: wrap`; the items row wraps and binds `space.100` as gap and line gap, equal to Tag's `group-gap` and off
the density ladder; the projected set is 3 members, each a wrapping slot of three select Tags at its size with both
gaps bound to `space/100`; and the validator refuses `rowGap` on a row that does not wrap. Mutations, each failing by
name, are listed in the PR.

**Trap.** Registering a def shifts line numbers that `docs/public/guides/*.md` cite (`components/index.ts`,
`component-groups.ts`, `file-taxonomy.ts`); `lint-guide-claims` fails each by name. Re-cite, delete the stale
fingerprint, and `--stamp` after reading the block.
