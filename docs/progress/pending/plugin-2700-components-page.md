## (2026-10-16) — Plugin: the Components page redesign, grouped, alphabetical, multi-select (#2700)

Built to the owner's approved wireframe on #2700, with every numbered call (1–17) at A. It replaces the radio list in the preview and the floating build bar.

- **The list lives in the levers pane (call 9 A).**
  - Two sections: **Components**, with 19 rows, and **Subcomponents**, with 7 rows including Icon (call 11). Together they hold the 41 sets.
  - Rows are grouped by the Figma page a build places them on, so a family such as Buttons, Checkbox or Accordion is one row that opens to its sets. Part sets stay in their family (call 12).
  - Rows are alphabetical, and so are a family's sets (note 2). Rows are labeled by page name, and sets inside a family by component name (call 14).
  - Each row shows its count and its "↳ page" (idea 12). Families start closed, and open when one of their sets is selected or the row is focused (call 15).
  - The grouping comes from a new `page` and `section` on each catalog entry. The plugin's iframe entry and the web's generator both read `file-taxonomy.ts`, so the Studio never imports plugin code at run time.
- **Selection:**
  - A box selects; it is three-state on families and sections (call 8). A name focuses the preview, and focusing doesn't select.
  - Nothing is selected on open (call 13). Selection, open families and focus last for the session (`state/components-page.ts`).
- **The action bar sits at the foot of the list pane, sticky as Draw is (idea 9).** It reads "Build N sets" (call 17), with the selection's cost and the sets a build makes first when the file lacks them (idea 7).
- **The run (`state/build-queue.ts`).** The plugin builds one set per request and its result names no set, so the Studio posts a selection's sets one after another, each when the last result lands. The wire and the plugin are unchanged.
  - Stop lets the set being built finish (call 16).
  - Between sets, Activity reads one running build, phased "Name (2 of 4) · …". A run of several sets ends with one combined verdict and a summary under the bar (idea 13). A one-set run keeps the plugin's own verdict.
  - Subcomponents' "Build all 9" runs at once and leaves the selection alone (call 10).
  - Every build control follows the busy rule (owner decision #4 on #1956): focusable, `aria-busy`, and never natively disabled while a build runs.
- **The preview pane shows the focused family** (Buttons by default, the one with a specimen). It draws the family's head, the Button specimen, Button options (moved into `domains/button-options.ts`) and "Sets in this family", in the approved set lines. At the narrow tier the same block opens inline under the focused row.
  - **The options sit on the card, in the chrome's inks, not on a specimen ground.** A ground is the brand's page for the previewed mode, and in a first build the chrome's light inks on a dark mode's page measured 1:1 (`test:smoke`). The options now sit between the specimen and the sets.
- **Search** (the Studio's settings search) now filters the list. A family stays while any of its sets matches, as the wireframe's edge state says. Before this, it never filtered the set list, though call 6's rationale assumed it did.
- **Derived modes:** Components left the frame's read-only hold. Its levers pane edits no brand setting now, so building stays available, as it was when the bar sat in the preview pane. The Button options hold themselves under the frame's own line.
- **Layout traps fixed on the way (each caught by a gate):**
  - The inline specimen widened the list at 380, so the list's grid tracks are `minmax(0, 1fr)` and the inline card scrolls on its own.
  - A one-line section head overflowed the 268px levers pane at 640 (#1975), so the head is a grid in which the title wraps.
  - TY2 A's L1 rule wants `space-300` after a section title, and a count wrapping under it broke that at 380, so the count sits inside the heading.
- **Removed:** the set radios, `chosenOf`, `componentSetsSection` and the `.p3-buildbar` CSS. Q23's heading pairs on Components ended with the move.

### Tests

- New: `test-component-groups.ts`, with 29 arms. Its rows, labels, order and family members are typed from the wireframe. Six mutations each fail by name: Icon's section, the row sort, the member sort, a box selecting an unbuildable set, search on labels only, and Stop ending the run at once.
- `test-build-verdict.mjs` drives the new list and bar (403/403). Its new `#2700` arms cover:
  - a three-set run posting in sequence, with one Activity result;
  - the summary;
  - Stop;
  - Build all posting the nine subcomponents in order;
  - the agent wait.

  Its mutations each fail by name: no next set posted, the combined verdict dropped, and Stop ending at once.
- `test-chrome.mjs`:
  - §26 is re-expressed for the new page: Represented, Q59 with the options holding themselves and the list staying live, Q54, C4 and #2180 at the list pane's foot.
  - The focus sweep needs `cp-box`.
  - `RO_PLACES` drops Components.
- `test-smoke.mjs`: the Components preview's text floor is a literal 55, since the preview shows the focused family (61 measured), and the 380 chip-group check opens Buttons inline first.
- `test-shell-imports.ts`:
  - The Button-write arms follow the writes to `domains/button-options.ts`.
  - Its definition-import pattern is narrowed to the engine's folder, so the Studio's own `preview/components` module isn't mistaken for a definition. The engine's index, a relative path to it and the projector still fail by name.

### Measured

At 1280 and at 380, in the built plugin UI:
- At 1280, the list, the bar and the Buttons preview match the wireframe.
- At 380, the list fits the pane without scrolling sideways. That came after fixing grid tracks that let the inline specimen widen the list.
