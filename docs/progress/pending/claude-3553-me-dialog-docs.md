## (2026-11-11) — Report a problem's intro and Documentation's body align (#3553 M10, M11, M12, batch M-E)

The UI polish review (#3553) found three alignment defects in the Report a problem dialog and in Documentation.

**M10.** The Report a problem intro ("This builds a report from this session…") carried `p3-upd-sub`, which indents a
hint under its checkbox by space-400. The intro comes before the checkbox, so it sat 32px to the right of the checkbox
row and the textarea (x=265 against 233 at 1280). It is now plain `p3-sub`. The two lines after the checkbox keep the
indent.

**M11.** With no collection open, Documentation › Style guides drew its empty groups tree as a bordered pill about 8px
tall (padding and a border around no rows). `.p3-sg-tree:empty` now hides it, following the chrome's other `:empty`
rules (`.p3-subnav`, `.p3-search-status`).

**M12.** At the plugin's 380, Documentation sets its guide to `padding: 0` (`.p3-docs-body > .p3-sg`), but the narrow
tier's own padding for the guide (`.p3-frame[data-w="narrow"] .p3-sg`) is more specific and won. The intro and the
"What to draw" card started at x=84, under a title and section select at 72. A narrow-tier rule now restores the
`padding: 0`. That also drops the narrow guide's top and bottom padding, which the same `padding: 0` meant to remove.

**Verified.** New test:chrome section `3553-me`, in shard 3, in both themes. On the web at 1280 and 380, it holds that
the Report intro starts where the checkbox row starts. On the plugin at 1280 and 380, it holds that no groups tree is
drawn while it has no rows. At 380 it holds that the guide's body starts at the title's edge (±0.5px). Mutations, each
after a `wip:` commit: the intro given `p3-upd-sub` again fails `#3553 M10 … the intro starts where the checkbox row
starts`. The `:empty` rule dropped fails `#3553 M11 … no groups tree is drawn while it has no rows`. The narrow padding
rule dropped fails `#3553 M12 … the guide's body starts at the title's edge`.
