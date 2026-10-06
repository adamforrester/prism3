# UI redesign: owner decisions from the v6 review (2026-09-30)

These are the owner's answers to the questions in `concept-v6.md` (#1879). This file extends `decisions-2026-09-30-v5-review.md` and wins where the two differ.

| # | Question | Decision |
|---|---|---|
| 1 | Opening view | Keep Color › Palettes. |
| 2 | Advanced rule | **Accepted.** Surfaces & fills, Interactive and Layout show every lever. Elsewhere the manifest `advanced` flag decides. Status colors stay under Show advanced in Palettes. |
| 3 | Role families | **Changed.** Text and icon are neither palettes nor primitives. They move to **Surfaces & fills**, alongside background, foreground, border, scrim, veil and inverse. **Palettes has no Roles toggle**, because palettes are primitives. Interactive is unchanged: interactive, inverse interactive, link, disabled and field. |
| 4 | Brand's preview | Keep the Style guide. |
| 5 | Fill rows | Keep: they edit the light (base) value, and the other modes are set in Roles. |
| 6 | Dark top bar | Accepted. At neutral 850 it carries no secondary text. |
| 7 | Neutral 025 as an engine role | Noted for the engine lane. Not filed. |
| 8 | Search | Search results don't change the preview. |

**Also fix before merge:** with Roles on in Interactive, the Inspect button wraps onto a second line in the preview header.
