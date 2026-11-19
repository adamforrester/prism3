## (2026-11-18) — Outline and text button hover colors wireframe, for the owner (#3116, A)

**What.** A DRAFT wireframe, `docs/superpowers/3116-button-interactive-colors-wireframe.html`, proposes the layout the
owner decided on #3116 (A, 2026-11-18). Outline and text button hover and pressed colors sit with each button set's
other colors in Color › Interactive, not under the outline hover method's chooser. It draws before and after at 1280
and 380, light and dark, under each of the four methods. Nothing is built: no Studio, plugin or engine change.

**The diagnosis that shaped it.** #3335 had already moved the Solid fill picks into each button set's card. What the
owner still met was distance and inconsistency:
- the group sits seventh in the card, after Text and Border, about 1,600px below Fill at 1280;
- it shows only under Solid fill, and under a wash the same slot carries a differently named read-only group.

The proposal moves one group, always titled "Outline & text hover", directly under Fill, under every method. Per the
owner's direction on the first draft (2026-11-18), it is set up like every other color group in the card: a Rest row
with Hover and Pressed inset, each with its swatch, name, token path and an "Auto · <step>" picker with its ratio.
Under a wash the same rows show the wash values; under No hover fill it is one line. The method and Wash opacity stay in Interactive settings,
since the method is brand-wide (Q3335.6 A). The placement is a layout change only: same levers, tokens and writes.
The owner's A settles "beside Fill", not the always-shown group or the folded wash groups, so those are Q3116.3.

**Real values.** The frames' chrome takes the built Studio's `--p3-*` values in light and dark. The swatches, buttons
and ratios take the example brand's roles resolved under each method at `2ef39ee6`, so the page is a snapshot. Each
row shows its role's own contracted ratio. The worst-label line is recomputed on the page and matches the built panel
(9.20:1 hover, 10.89:1 pressed, light).

**Held for the owner (Q-blocks on the page, recommendation first, none picked).**
- Q3116.1, which parts a brand changes. The label and border hover and pressed roles are shared with tabs, tags,
  pagination, segmented controls, switches and checkboxes, so button-only label and border colors would be new tokens.
- Q3116.2, the method chooser's form.
- Q3116.3, whether the group shows under every method with the "Overlay wash" and "Tinted wash" groups folded into it
  (as drawn), only under Solid fill with the wash read-outs moved up beside Fill, or with the wash groups kept separate.
- Q3105.1, whether the pressed contrast check reaches the washes.
- Q3105.2, whether contrast moves the pressed step or only the label.
