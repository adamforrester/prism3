## (2026-11-17) — The usage panel shows "Last changed in" (#2889)

**What.** Each family's usage panel draws the block #2858's approved wireframe placed under the header, above
Overview (Q479.3 A: release notes only). The data was already built by #2876 (`library-about.ts` `lastChangedIn`,
`lastChangedLines`); this wires it in. The plan carries the block's lines (`PanelPlan.changed`), and the draw puts a
`last-changed` frame between the header and the first section: the version line as a `_Doc-block` Heading (sm), the
release's items as a Paragraph (sm), bulleted. No new block type, so `_Doc-block` and Set up file are untouched.

**Whose release.** The family's lead set's: the set the panel sits beside and is tagged with. A member's own release
items are not read. This is held for the owner on the PR: a family whose member changed after its lead would show the
lead's older release. Measured at 0.238.0, no family's member reads a newer release than its lead.

**Only panels whose text moved go stale (owner decision A).** Two places had to agree. The plan's hash covers the block,
so `docPanelDue` reads a panel as due exactly when its block reads differently. But Update file only checks a set the
as-built ledger reads as due, and a fold that leaves a set's plans alone leaves it `current` (Q811 A), so its panel would
never be checked. The ledger entry on a lead set now carries `changed`, a hash of the block's lines, beside `panel`
(#3205's format), and `dueOf` reads a current set as due for its panel when it moved. Nothing reads `ENGINE_VERSION`
itself, so a fold that names no item for a set leaves its panel current. `PANEL_FORMAT` is not raised: the plan moves,
and an entry with no `changed` reads due once, which draws the block on every lead panel at the first Update.

**#2882 is untouched.** It concerns `publishDescription`'s range; `lastChangedIn` reads every release up to the engine and
takes no `from`.

**Measured.** `test-doc-panel.ts` `last changed/…` and `fold/…`, with the release notes pinned at 0.237.0 and a fold typed
by hand. Mutations, each failing by name: the block not drawn; the lead's release read at the plugin's engine; the block
out of the hash; the ledger's credit dropped; `changed` not kept by `recordSets`.
`test-update-kept-main.ts` `main/changed recorded` and `main/panel recorded` read the entry the real `main.ts` writes
after an update with panels on (the doc-panel arms build it by hand, so dropping `changed` from `panelFormatOf` passed
them): `panelFormatOf` without `changed`, and without `panel` (#3937), each fail by name.
