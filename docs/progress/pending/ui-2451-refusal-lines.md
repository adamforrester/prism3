## (2026-10-10) — Type: the title floor's and Italic only's refusal reasons are drawn as hint lines and describe their chips (#2451)

Owner decision RS1 A. Three refused chips said their reason only in `title`, which a keyboard or screen-reader user never reaches, because a disabled chip takes no focus. Each reason is now also a hint line under its chips, drawn only while the chip is refused, and linked to the chips' group through `refuseOption(group, value, why, reasonId)` (#2458), so the group's description says it. The `title` stays. The words are the existing approved strings, unchanged:

- Type › Scale limits › Smallest title size, **16px** under the Compact scale: `S63.titleFloorCompact`.
- The same row, **18px** while title 2xs is set individually: `S63.titleFloorPinned`.
- Type › Italic styles, **Italic only** on a text type that pins a font style: `S63.italicPinned`, under that text type's own chips.

**Hint, not warning (Q184 B).** The lines are `stateLine(…)` hints (`p3-state-hint`), so the choice rows' live region, which reads only `.p3-state-warn`, never carries them. This differs from Type scale on purpose: its non-clash reasons are drawn as warnings and are announced; these three were asked for as hints.

**The diagnosis that kept it small.** The two title floor refusals are mutually exclusive (one needs the floor at 18px, the other at 16px), so the row needs one line, and it goes in the lever's existing state slot, where Size floor's 8px warning already sits. `chips()` takes an optional refusal and does the `refuseOption` and the line itself, instead of the old pattern of reaching into the rendered chip afterward. Each italic row is a one-column grid, so the line is appended after its chips with no new CSS. No layout choice was left open.

**Tests.** `test:chrome` §43: both hosts, light, at 1280 and 380, each refusal set up through the UI. For each: one line drawn under the group's chips with the approved sentence (typed as a literal), found by its words inside the row rather than through `aria-describedby`; the group's description in the accessibility tree (CDP) contains it; no live region carries it, read with the line proven drawn; and, with the refusal lifted, no such line remains and the description no longer says it, through `hooks.absent` with the line proven seen.

Mutations, each after a `wip:` commit on both rebuilt bundles, each failing §43 by name on both hosts at both widths: the line not drawn (48 failures: (i), and (ii) to (iv) NOT MEASURED); the line not linked (the 12 description arms); the line drawn as a warning, so sent to the live region (the 12 live-region arms).

**Not done, on purpose.** Type scale's own reason lines stay warnings. Other title-only refusals elsewhere in the Studio (the display ceiling's disabled options, a select) are out of scope for #2451.
