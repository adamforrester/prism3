## (2026-10-30) — Accordion: the title uses the regular label weight at every size (#3180)

**Status:** engine {{ENGINE_VERSION}} (`engine: minor`, change note `claude-3180-accordion-label-regular.md`). No token
name moves, so `CONTRACT_VERSION` stays. The executor is untouched, so `EXECUTOR_REVISION` stays and `executor-reach.json`
gains no entry: the def's plan moved, and the member stamp already reads that as "to update".

### What changed

- **The title binds `type.label.{sm,md,lg}.default`** (Figma `label/{rung}/default`) in place of `.emphasis`, at every
  size and for every brand (owner Q-ACC1 A). The reference brand's FAQ accordion sets its title at 14px regular. The size
  ladder, the ink and every padding are unchanged.
- **The line box is unmoved (#2586).** Every label composite at one rung shares its font size and line height (`tree.ts`
  throws if one disagrees), so `type.label.{rung}.line-box` and the 2px title offset still center the first line on the
  glyph. The existing glyph-centering arms (#2417 Q262, #2594 Q276) measure the new style in every brand, and the new
  arm resolves the regular composite's own size × line height against the line-box leaf, per brand.

### How a partly hand-edited set updates

The as-built record is per **node**, not per member. A designer's edit to the header's padding changes the `header`
node's hash only. The title is its own node, which nobody edited, so the Update rewrites its text style on the edited
members as well. It keeps the header (`keep`, the default, reported as a hand edit) and keeps every member's and node's
key and id. The new `test-update-apply.ts` section builds the set on the emphasis style, hand-edits 30 of the 48 headers'
block padding (as the reference brand's master is) and updates. All 48 titles land on the regular style, the 30 headers
keep the designer's padding and are listed as kept, the other 18 headers do not take it, and the next dry run reads 18
current with the 30 hand edits still reported.

### Gates

- `test.ts` `#3180 accordion title weight`: the token and the Figma text style per size, typed as literals, against the
  def and all 48 projected members. `#3180 accordion title line box`: the regular composite is one line of the line box
  in every brand.
- Mutation: the def's three title bindings back on `.emphasis` fails `#3180 accordion title weight`,
  `surface/accordion` (`lint-component-surface`) and `accordion weight/premise` (the plugin's update arm), each by name.

### Not in this change

The design's 56px row spacing, missing dividers and thinner chevron stay instance-level choices in the brand's files
(the issue's "for context only").
