# UI redesign: owner decisions on the Phase 1 questions (2026-09-30)

The owner accepted every recommendation in `phase1-audit.md` §4 as written. This file records them so later phases can cite one place. The reasoning for each is in `phase1-audit.md`.

| # | Question | Decision |
|---|---|---|
| 1 | Mode model | **B.** The preview owns the viewing mode (a segmented control in the preview header, derived modes hatched, optional Compare). The levers panel always edits the base value. Per-mode overrides show inline under the lever, in a "Per mode" disclosure. Role overrides get a role × mode matrix in Color › Roles. |
| 2 | Where §7.1 activity lives | An **Activity drawer** at the bottom of the preview pane. It opens on any Figma operation or agent command and shows progress, then the outcome, errors grouped by cause with their fixes, and history per operation. The Figma actions live in a **Figma menu** in the top bar, and each opens its options in the drawer. At narrow sizes it becomes a thin strip. |
| 3 | What the preview follows | It follows the setting on **change or commit**, not on focus. Redraws are debounced, a "Keep this view" pin holds a view, and view changes are announced in a polite live region. |
| 4 | Advanced tier | The **manifest's `advanced` flag** decides the tier, except in Layout, where every lever is advanced and the page shows them all. |
| 5 | `typography.responsive` | Moves to **Type › Scale**, with a "Depends on Layout: breakpoints" link. |
| 6 | Italics | `typography.italics` and `typography.italicDefault` merge into **one per-category 3-chip choice**: *Upright* / *Upright + italic* / *Italic only*. |
| 7 | Narrow mode (380×420) | **A single pane with a Settings/Preview toggle.** One 36px top row holds the brand, the verdict dot, the toggle and an overflow menu. Domain tabs become a select, nothing else is sticky, and an activity strip shows while an operation runs. |
| 8 | Contrast and the decisions log | Both become **views in the preview pane**. The top-bar verdict opens the Contrast view. |
| 9 | Token namespace (`root`) | Moves to **Brand › Advanced**, with a warning that changing it renames every token path. |
| 10 | #1802 unresolved type styles | **Shown** as a warning in the Type view and in Health. Whether a heading should fall back to the heaviest shipped weight is a separate engine question. |
| 11 | Style guide generator in v4 | The v4 mockup uses the **phase-2 option set without Pixels**, marked "pending #1784/#1788". |
| 12 | Architecture | **Foundation-first strangling (F1–F4, then the domain slices), with no framework.** F1–F4 may land before the v4 visual design. |
| 13 | Labels | Adopt **"verdict"** (for pill), **"Decisions log"**, **"Build set"**, **"Read-back"** and **"Keep the Figma window in front"**. |
| 14 | Start screens | Keep a **first-run start screen** in the studio, and add the **empty-file start** in the plugin (#506). |
