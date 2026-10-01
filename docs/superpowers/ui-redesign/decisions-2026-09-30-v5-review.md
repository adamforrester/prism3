# UI redesign: owner decisions from the v5 review (2026-09-30)

These are the owner's answers to the questions in `concept-v5.md`, plus their feedback on v5 (#1865). This file extends `decisions-2026-09-30-v4-review.md`, and wins wherever the two differ. 

## v5's open questions

| # | Question | Decision |
|---|---|---|
| 1 | View select | **Removed.** |
| 2 | Opening view | Keep Palettes. The IA change below moves where that is. |
| 3 | Depth & motion | **Keep one tab.** Its preview stacks Elevation and Motion under clear headers (V4). |
| 4 | Brand name and namespace side by side at 380 | **Yes.** Mobile is a nice-to-have, but harder to add later. |
| 5–9 | The 380 strip, Compare at 380, Health placement, advanced names, 4s collapse | Kept as recommended. |
| 10 | Roles shown twice | Replaced by V2. |

## Feedback on v5

| # | Topic | Decision |
|---|---|---|
| V1 | Preview model | **One preview per tab**, or per sub-page where a tab has sub-navigation. The preview does not change on scroll or focus. This supersedes F1's scroll and focus following. **"Keep this view" is removed** (V12). |
| V2 | Roles | Roles become a **view toggle beside the preview's title** (for example, Palettes · Roles). It switches the preview to the role × mode matrix for that section's role families. |
| V3 | Information architecture | **Brand** holds identity, namespace and modes. The color levers move out of Brand. **Color** gets sub-navigation, or Interactive gets its own tab. **Decided: IA-1.** |
| V4 | Depth & motion preview | One preview, stacked, with clear headers. |
| V5 | Layering | The preview stays white. The levers panel gets a very light gray. The top bar needs its own place in the color hierarchy. **Decided: IA-2.** |
| V6 | Field borders | Bring them as close to 3:1 as possible (v5 uses 3.85:1). |
| V7 | Palettes | Go back to the current studio's palette treatment: large squares with room to breathe, content separated into containers, and a dashed "Add brand color". |
| V8 | Visual richness | Gradients span their container at a large size. Selects are roomy. Keep the current studio's lightness, large color visuals, type hierarchy, and grays that organize the layout. |
| V9 | Step picker | **Keep** the v5 swatch-grid step picker. The owner loves it. |
| V10 | Missing controls | Fills and all the interactive/action settings were hard to find: the manifest `advanced` rule hid them behind "Show advanced". The IA change must make them first-class. |
| V11 | Layout preview | Breakpoints and columns get color in their preview. |
| V12 | Keep this view | Removed, per V1. |
| V13 | Agent link | Its switch, buried in the Activity drawer, is hard to find. It needs a discoverable home. **Decided: IA-3.** |

## Structure (decided 2026-09-30)

| # | Topic | Decision |
|---|---|---|
| IA-1 | Tabs | **Brand · Color · Type · Shape · Depth & motion · Layout · Components.** Brand holds identity (name, namespace), personality and modes. Color has sub-navigation: **Palettes · Surfaces & fills · Interactive**. Surfaces & fills includes gradients. Interactive holds the action and link palettes, interactive palettes, strict contrast, link states, icon contrast, disabled strategy, outline hover and neutral emphasis. Each tab, or each Color sub-page, has **one preview**, and the Color sub-pages have a **Roles** toggle beside the preview title that shows that sub-page's role families as the editable role × mode matrix. |
| IA-2 | Layering | The preview is white (`background.primary`). The levers panel is the very light gray neutral 025, and the top bar is neutral 050 (`background.secondary`), a step darker, with a hairline. No semantic role maps to neutral 025, so the mockup uses the ramp step directly. This is noted as a possible engine role, not filed. |
| IA-3 | Agent link | In the plugin, an **"Agent: Off" chip in the top bar** opens a small popover holding the switch and one line on what it does. Activity still logs agent work. |
| B1 | Field borders | Control edges use neutral 400 (`border.secondary`): 3.28:1 on white and 3.06:1 on neutral 025. On the neutral 050 surfaces, where it would fail (2.70:1), controls keep `field.border.rest`. |
