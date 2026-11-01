## (2026-11-01) — Every prop-backed state has its prop, unless admitted (#2757)

**What.** A `test.ts` arm, `#2757`, walks every def in `componentDefs`. For each state in `states` that a code
consumer sets through a prop, it requires that prop: `disabled`→`disabled`, `read-only`→`readOnly`,
`pending`→`isPending`, `inactive`→`isInactive`. #2708 pinned the Rows' and Textarea's props against a literal;
this covers the next def, too. A state with no prop can be reached in Figma and not in code.

**The oracle is a literal.** `STATE_PROP` is written by hand and not derived from the defs (docs/34 shape 1).
The names follow no single rule (`readOnly` is camel case, `isPending` is not), so a derivation would have to
guess and would move with any rename.

**Admissions.** `STATE_PROP_OK` maps `def:state` to a reason, in the `ZERO_OK` / `RESERVED_ROOT_OK` shape. The
walk found two, both already decided:
- `field-label:disabled`: #1339. The label dims from its field, and the old prop was removed.
- `pagination-item:disabled`: call 9 A and Q414 A. Previous and next at an end use `isInactive` with
  `aria-disabled`, not native disabled. Figma draws that as `disabled`.

An admission must be live (the def declares the state and lacks the prop), or it fails as stale. Each mapped
state must also be reached, with its prop, by at least one def, so a dead map entry fails instead of passing.

**Mutations.** Each was committed `wip:` first and the subject was restored from `HEAD`.
- Drop Textarea's `disabled` prop: `#2757` fails and names `textarea` (with #2708's two pins).
- Drop Counter's `disabled` prop: `#2757` is the only failure, naming `counter`. Nothing else pinned it.
- Delete the `pagination-item:disabled` admission: `#2757` fails and names `pagination-item`.
