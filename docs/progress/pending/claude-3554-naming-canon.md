## (2026-11-11) — The naming canon's lists are exact, and the size-order exceptions are named (#3554 M-B)

Part of #3554 (the 2026-11-11 component consistency audit), batch M-B: the build-component skill's §6 and the
`lint-naming` literals it mirrors.

- **The prefixed set** listed only `_accordion-indicator`. `_breadcrumb-separator` (Q382 A) and `_slider-thumb` (Q349)
  are prefixed under the same rule. Both lists now name all three.
- **The slot items** listed three. `breadcrumb-item`, `pagination-item`, `page-nav-item` and `code-input-cell` are slot
  items kept unprefixed by Q394 A as well; both lists now name all seven. `code-input-cell` was not in the audit's list;
  the new arm below found it, and its own header records Q394 A.
- **The size-order exception** called Field label "the one named exception". Spinner is the second, as `test.ts`'s
  `SIZE_EXCEPTIONS` already records: it builds one component per size, so no member is ever inserted as a default.

### Why the gate passed, and the arm that closes it

`DECIDED_PRIVATE` and `SLOT_ITEMS` were floors: every listed id had to exist and read right, but a def prefixed or
offered as a slot item after the list was written passed unlisted, and the skill's §6 (held equal to the lists) went
stale with them. Two converse arms now read the registry: every registered `_` def must be in `DECIDED_PRIVATE`, and
every slot's preferred item whose `whenToUse` reads as a private part must be in `SLOT_ITEMS`. A standalone component a
slot also prefers (Button, Checkbox.Row) is not one. Mutation: `_slider-thumb` dropped from `DECIDED_PRIVATE` fails
`list: '_slider-thumb' is registered with the '_' prefix and is not in DECIDED_PRIVATE …` and the skill arm.

No engine output moves.
