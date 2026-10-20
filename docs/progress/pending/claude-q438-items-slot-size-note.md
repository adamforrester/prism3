## (2026-10-20) — Items-slot hosts say how their size reaches the items (#2829)

**Status:** five defs' summaries + one gate arm. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No
executor change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q438 A (2026-10-20, on #2829), option B held:** Tabs, Checkbox.Group, Radio.Group, List and
  SegmentedControl each end their `summary` with "Size applies to the items you haven't edited. After editing an item,
  select the items and set their size." The summary is the one def line the plugin writes as the Figma description of
  the set, and it is the first line of the def's docs page and its `.ai.json` entry, so one edit reaches every place the
  owner named. No plugin action was built.
- `summaryMaxOf` (component-schema.ts) lifts the 100-character cap by the sentence's length for a def with an `items`
  slot and a `size` prop. Every other summary keeps 100.
- ButtonGroup also holds its items in a slot but has no `size`, so there is nothing for the note to explain and it is
  left out. The scan is `items` slot beside `size`, so a later host is held without being added to a list.

### Verification

`lint-component-docs.ts` arm F reads the hosts from the props and holds the owner's sentence, written in the gate as its
own literal, against the def, the JSON entry and the page. Mutations, each failing by name: the sentence dropped from
List's summary (`ITEMS SIZE NOTE (def)`, `(json)`, `(page)`); the sentence cut from the committed Tabs page only
(`ITEMS SIZE NOTE (page)`).
