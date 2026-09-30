# UI redesign: owner decisions from the v4 review (2026-09-30)

The owner's first review of the v4 mockup (#1826). It records the answers to the four questions raised by that feedback and to v4's ten open questions (`concept-v4.md`). It extends `decisions-2026-09-30.md`; where the two differ, this file wins.

## From the owner's feedback

| # | Topic | Decision |
|---|---|---|
| F1 | Preview and levers | **Every lever section declares exactly one home view, and the preview follows the section.** It follows on tab change, and when a section scrolls into view or takes focus. It does not follow each lever, and the user never picks a view by hand while editing. The mapping lives in data, and the build fails if a lever section has no home view. **Tokens, Contrast and Decisions log** leave the view select and move to an **Inspect** control, which the verdict also opens. "Keep this view" stays. Where one domain covers two views, it splits into two sections (Depth & motion becomes Elevation and Motion). This supersedes Q3's "follow the lever on change". |
| F2 | Activity drawer | An **Activity** button in the top bar is always visible, with a status dot for running, failed and unread. It shows and hides the drawer at any time. The drawer **opens by itself** when an operation starts, including one an agent starts. It **collapses by itself** a few seconds after a success, and the verdict stays on the bar. On a failure or a warning it **stays open** until the user closes it. At 380×420 it keeps the strip and the full-pane sheet. |
| F3 | Chrome look and theme | The chrome is **built from Prism3's own tokens, from the neutral palette** of the canonical default theme (`pds3`), generated at build time, never hand-written. The user's brand color is never used in the chrome. **Dark mode:** the studio follows the system setting by default and offers a light/dark/system toggle. The plugin follows Figma's theme. This reverses the brief's "light chrome only" (§8.3). The chrome is more modern and spacious, with clean type, and swatches fill their containers. **Borders look softer but still meet contrast:** every interactive boundary stays at 3:1 or better (WCAG 1.4.11), and controls are identified by fill as well as edge. The current look stays until the structure is locked. |
| F4 | Sequencing | **Style tiles first, then v5.** There will be two or three small, clickable directions, each shown in light and dark. The owner picks one, and v5 applies it together with F1 and F2. |
| F5 | Token namespace (`root`) | **Shown, not advanced.** It sits in Brand › Identity, visible by default, so a set is never shipped under a placeholder namespace. The rename warning and confirm from Q9 stay. The tiles also show a proposed flag for a namespace that is still a placeholder or reserved (`prism`, `pds3`), for the owner to confirm. This partly supersedes Q9. |

## v4's open questions (`concept-v4.md`)

| # | Question | Decision |
|---|---|---|
| 1 | Roles matrix width | The matrix stays in the levers panel and **scrolls horizontally**, with the role column and the header row pinned, like today's tables. |
| 2 | What the verdict counts | Every role with a floor, in every mode: 884 for prism3. Health shows "221 per mode". |
| 3 | High-contrast dark with dark off | Turning dark off also turns off high-contrast dark (brief §4.10), with a preview of what is dropped. |
| 4 | Editable light cells in the Roles matrix | Open. The owner wants to see it: v5 shows light cells editable, labeled as the base. |
| 5 | Thin Type page under Q4 | Keep the manifest-flag rule. |
| 6 | Engine-voiced decisions log | Fix it in the engine's notes generator, together with #1824. It is an engine change, routed through the owner to the support lane. |
| 7 | Status rows "Use ‹palette›" | Keep. |
| 8 | Compare repeats the surface switch | One shared switch. |
| 9 | Studio font warnings | A preview marker only in the studio. No Health warning, because only the plugin's "in this Figma" affects Apply. |
| 10 | Style guide option values | Settle them when #1784 and #1788 land. |
