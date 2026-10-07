## (2026-10-06) — Activity: drag the open drawer's top edge to make it taller (#2176)

**STATUS: branch `ui/2176-drawer-resize`; the owner approved the screenshots on 2026-10-07 (the pill, the 24px keyboard step, and the most height sitting flush with the preview header).** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. One new string, "Resize Activity", the handle's accessible name, approved as AD3. Owner decisions AD1–AD3 (2026-10-05), with the owner's one change from the mock.

**What it does.**
- **AD1.** At the wide tier, while the drawer is open, a handle sits on its top edge, on both hosts. It is a window splitter (WAI-ARIA): `role="separator"`, `aria-orientation="horizontal"`, `aria-valuenow`, `aria-valuemin` and `aria-valuemax`, in CSS pixels. A pointer drag follows the pointer. Arrow Up and Arrow Down step 24px, and Home and End go to the least and the most (the pattern's optional keys).
- **The range.** The least is today's open height: the drawer as it draws with no height set, measured each time, so it follows the rows. The most is the drawer's bottom less the preview header's measured bottom (Inspect's header in its place; on the plugin's style guides page, the frame's head). Both ends clamp.
- **Kept** per person under `prism3:activity-height`. The web uses `localStorage` (`persist-local.ts`). The plugin posts `set-activity-height` from its UI entry, and the main thread keeps it in `figma.clientStorage` and answers `ui-ready` with `activity-height`, the same path as `prism3:theme`.
- **The owner's change from the mock.** The pill sits inside the drawer, `space-075` (6px) below its top border, like a sheet's grabber. It is `space-500` (40px) wide, where the mock had 32px, and `space-050` (4px) tall, in `icon-2` (a declared 3:1 pair on `bg-page`). The handle's hit box is `hit-min` tall and the pill plus `space-200` a side wide (72px), centered over the bar row's top.
- **AD2.** No handle at 380. The open drawer stays the full-pane sheet, and a kept height does not size it.
- **AD3.** The handle's name is "Resize Activity".

**The layout fix the max needed.** Under the two panes, the drawer was the preview column's last grid row. The sub-row (Color's Palettes / Surfaces & fills / Interactive) sets row 4's height, so the preview body could not shrink below it, and on Color the drawer could only reach the sub-row's line, 64px under the header. While a height is kept, the preview body and the drawer now both span the preview column from row 4 down. The drawer is aligned to the end at the kept height, and the body keeps that height free under it as a bottom margin. So the drawer reaches the header on every page. With no kept height, today's grid is unchanged.

**A runtime variable, and the gate that allows it.** The height reaches the stylesheet as `--p3-activity-h`, set on the frame. `chrome/esbuild-plugin.mjs`'s `[variables]` check refused any `--p3-*` the token map does not define. It now has a literal `RUNTIME_VARS` list (`activity-h`, with where it is set). A runtime name still fails if `chrome.css` never reads it, or if the map defines it too. `test:chrome`'s inline-value check already let custom properties through, so the frame's `style` carries only that.

**Gates.**
- `test:chrome` section 32 (#2213 took 31), both hosts and both themes:
  - at 1280: the handle drawn only while open; its computed name and role (CDP `getPartialAXTree`); min, now and max against the drawer's first open height and the header's measured bottom;
  - the pill: inside the border, wider than 32, centered, and at 3:1;
  - a 24×24 target;
  - a pointer drag, with `aria-valuenow` equal to the height drawn and the body ending where the drawer starts;
  - the clamp at both ends, by drag and by End and Home;
  - Arrow Up and Down;
  - the height kept, then back after a reload (web `localStorage`; the plugin's posted `set-activity-height` replayed as the `activity-height` reply).
  - At 380: no handle (through `absent()`, proven on the open sheet), no focus, and a kept height does not size the sheet.
- The probe counts a focusable separator as a control (`CONTROL`, kind "resize handle"), so section 10's open drawer measures the handle's target and focus like any other.
- `apps/plugin/test-activity-height.ts` (new, in the plugin's `test`) drives the real `main.ts`: a height is kept under the key, sent back on the next `ui-ready`, and anything that is not a positive number is neither kept nor sent.

**Mutations:** see the PR body; each was run after a `wip:` commit and failed by name.

**Not done, on purpose.** No drag on the 380 sheet (AD2). Enter does not collapse the drawer from the handle (an optional key in the pattern; the bar row already toggles). The plugin's resize grip and the window size are unchanged. The kept height is not clamped when it is stored; it is clamped each time it is drawn, so a taller window gets it back.
