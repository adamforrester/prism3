## (2026-10-31) — Field labels lead: every field host nests FieldLabel at emphasis=primary (#3200, owner Q-PH1 A)

**What changed.** The twelve hosts that nest FieldLabel (Text field and the three built on it: Password, Search and Card
number; Textarea, Select, Code input, Counter, Checkbox group, Radio group, Segmented control, Slider) now nest it at
`emphasis: primary`. The placeholder stays on `color.text.secondary` (#1518), so the label and the placeholder no longer
read as the same gray. `secondary` stays selectable on every nest-exposed host. Slider's label is nest-fixed, so it moved
to primary with no designer control, the same as before but in the new ink.

**FieldLabel's own default flipped too.** Its file header has held since #1699 that "the defaults follow the hosts": the
standalone default is the cell every host nests. With every host at primary, keeping `secondary` would make a standalone
label disagree with each host and break that rule. So `emphasis` defaults to `primary`, and the axis is ordered
`[primary, secondary]` so the first member carries the code default (#2752's rule). FieldLabel's plans are identical as a
set: `lint-component-surface` moved only the twelve hosts, and `lint-component-renames` and `lint-paint` did not move.

**Update.** No executor change: the in-place path already swaps a nested instance to the member its plan resolves
(`write-components.ts`, the `NESTED_INSTANCE` branch), and skips a node the designer edited. So `EXECUTOR_REVISION` stays
at its prior number, and a placed label moves to primary on the next Update, its id kept. A label a designer edited by hand stays as it
is and is reported.

**Arms.** `apps/plugin/test-write-components.ts` `#3200 label leads` and `#3200 placeholder stays secondary`: built as
the plugin builds, in all five corpus brands, read back off the shim. `apps/plugin/test-update-apply.ts` `<host> leads/…`:
a file built at secondary takes primary in place for all twelve hosts. `#3200 label leads` counts per brand/host cell
and requires all 60 (5 brands × 12 hosts) to read at least one label, naming any empty cell: a total count passed with a
host's label part renamed (review mutation D). Four of those hosts (Card number field, Code input,
Counter, Slider) carry nested overrides the harness file cannot hold, so their verdict arm asserts only that no listed
field is the label's.

**Trap for whoever re-verifies.** The placeholder layer's ink is `label.rest` / `.hover` / `.focus-visible`, not
`label.empty`: `empty` is a code-only state. Mutating `label.empty` moves nothing in Figma.

**Prose approved.** FieldLabel's new `emphasis` description and the sentence added to its `docs.usage` were approved
as written (owner Q3203.2 A). The DRAFT comments beside them in `field-label.ts` came off in #3222.

**Decided.** The label default is global, not a brand lever (owner Q3203.1 A).
