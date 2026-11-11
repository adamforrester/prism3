## (2026-11-11) — The levers rows between 360 and 480: a snug line at 480, easing tokens that wrap, no cut readout (#3553 M2, M3, M4)

Batch M-B of the UI polish review (#3553), with the owner's option A on all three items.

**M2 A.** At web 1024 the levers pane is 404px wide, so it was `data-fit="full"` (above `LEVERS_SNUG_MAX`, 360). A
fill row's step picker kept its content width and squeezed the name column to 20–40px: labels wrapped under the picker
("Hover" read "Ho") and tokens collapsed to "text.…". The line is now 480. The pane measures 404 at 1024, 436 at 1100
and 478 at 1200, so across that range a row's picker sits under its name. At 1280 (511px) the pane stays full. The
few rows that still wrap there ("Success, subtle", "Warning, subtle") are the accepted cost of A. The snug class carries
its other rules with it into that range: the panel's tighter side padding, a breakpoint's Remove under its field, and
the next-page button's wrap.

**M3 A.** At the plugin's 380, the four easing-role tokens all ellipsized to "motion.easing-ro…", cutting the part that
tells them apart. `tokenLabel` takes a `wrap` option: a `<wbr>` after each dot (the Style guide pills' pattern, which
adds nothing to `textContent`), with the token free to wrap. Only the easing rows use it. Every other fill token
ellipsizes as before.

**M4 A.** At the plugin's 380, Palettes' OKLCH readout was cut ("OKLCH 0.471 0.300…"). Every snug color field now
drops it, as the glass control already did. A percent field's unit (`.p3-numfield`) stays. With M2's new line, that
includes web panes up to 480px (1024–1200).

**Verified.** New test:chrome section `3553-mb`, in shard 3, both themes. Web at 1024, 1100 and 1200, Surfaces & fills
and Interactive: the pane is snug, and every drawn fill row's name is at least 90px with its label on one line. At
1280 the pane stays full. Plugin at 380 and 1280: every easing-role token is whole and inside its row, and no color
field's readout on Palettes is cut (at 1280 it is still drawn). Mutations, each after a `wip:` commit:
`LEVERS_SNUG_MAX` back to 360 fails `#3553 M2 … the pane is snug` and `… every fill row keeps its name`. The easing
rows' `wrap` dropped fails `#3553 M3 … every easing-role token is shown whole`. The snug readout rule dropped fails
`#3553 M4 … no color field's readout is cut`.
