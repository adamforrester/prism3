## (2026-10-15) — Rows and Textarea get their state props (#2708, Q351 A)

**The gap.** Audit #2706 found four defs whose declared states had no prop to reach them. Textarea
declared `disabled`, `read-only` and `pending` with no `disabled`, `readOnly` or `isPending`, and had no
`label` at all. The three Rows declared `disabled` with no `disabled`, and Radio.Row also had no
`readOnly`. `inherits` is prose that nothing resolves, so `components.ai.json` and the docs pages
described components that could not be disabled or labeled. The owner chose A on O7: each Row restates
the prop (a consumer disables a labeled checkbox, not its box). #2708 was already the technical fix for
Textarea.

**The change.** Props only:
- Checkbox.Row, Radio.Row and Switch.Row gain `disabled`, in Text field's shape (`boolean`, default
  `false`).
- Radio.Row gains `readOnly` in Checkbox.Row's shape. Its description carries the same caveat:
  `<input type="radio">` has no working `readonly`.
- Textarea restates `label`, `onChange`, `helpText`, `required`, `disabled`, `readOnly`, `isPending`,
  `id` and `name`, with Text field's types and Text field's descriptions where they hold.

Every new boolean defaults to a real `false`. #2707 fixes the string `"false"` defaults elsewhere.

**No Figma member moves.** The props are code API, so `lint-component-surface` stays clean with no
accept, and `EXECUTOR_REVISION` stays. Only `out/components/` (the `.ai.json` and the four pages) and
the comparison report move, under an `engine: minor` note.

**Update, proved in the shim.** `test-update-apply.ts` builds each of the four from its def with the
gained props taken back out, then runs Update with today's plans. Every member reads current, and the
apply writes nothing: no version, and every id, key, stamp and record stays as built. A file built
before this PR has nothing to correct.

**Mutations, each failing by name.**
- Textarea's `disabled` dropped: `#2708 textarea props` and `#2708 textarea prop shapes`.
- Radio.Row's `readOnly` default spelled `'false'`: `Q351 A row props`.
- `figmaAnatomySet` projecting a `disabled` prop as a Figma boolean: `<row>/dry run` and
  `<row>/nothing written` for the three Rows.

**The first mutation tried for the shim section proved nothing.** It added the boolean to the def, and
the before-file was derived from that same def, so both sides moved together and the test stayed green.
The mutation that counts has to make the plan depend on the props themselves.

**Not done here (optional in #2708).** A general `test.ts` arm asserting that every prop-backed state
has its prop unless the def admits otherwise. FieldLabel would be its first admission. Filed as
#2757.

**Merged `main` at `b56a0137` (cloud lane, landing train 3).** Only the generated `component-comparison` report
conflicted; `regen` rewrote it on the merged tree.
