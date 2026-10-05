## (2026-10-05) — UI redesign S13.1: the top bar's brand menu, Export and the error line move to the new chrome

**STATUS: branch `ui/s131-top-bar`, off `main` after S8.3 (#2094) merged; held for the owner's screenshot review.** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged, **no new strings** (every visible string and accessible name is today's, moved verbatim; the dialogs' Close drops the "✕" character for the chrome's `x` glyph, with the same accessible name, "Close"). Owner decisions G18 A and N-2 A (2026-10-05). The first half of S13, split off as the scoping report recommended (S13a, the bar and the notices; S13b, the deletions).

**What moved.** Until now `main.ts`'s `renderBar` (32 call sites) drew the brand switcher, the brand menu, Export and its dialog, the plugin's Apply Theme and the prune review into the frame's bar slot, the menus and dialogs in `styles.css`, pinned light; and the engine error line was a legacy card in the notices row, pinned light, so in a dark theme it stayed a light card. Now:
- **`src/shell/bar.ts`** draws the bar's controls in the chrome (`chrome.css`, the chrome tokens, #2041's shared pieces: `p3-menu`, `p3-menu-item`, `p3-btn`, `p3-seg`, `p3-confirm`), in the order the owner's menu bar sets (below). Apply Theme reads the Figma menu's own `apply` item (same label, busy and off states, tooltip, function).
- **`src/shell/notices.ts`** draws the error line as a **full-width strip right under the top bar** (concept v6's banner: the inset ground, the danger glyph and text), in the chrome's theme, so it is dark in dark. Its text and its show, hide and clear rules are `main.ts`'s `syncErrorBar`, unchanged (#388, #772, #1989); the notices row moved from after the tab row to straight after the bar (the two-pane grid already put it there).
- **What `main.ts` keeps, and lends** (`BarLend`): the brand-load rules (the overwrite confirm and its sentence, `loadBrand` and its origin, the design.md validation), the export model and downloads, the host's writes, and their state. The bar reads a view of that state and calls the actions, each the body the old control ran; each ends in the store's new **`bar` topic**, which the bar repaints from (plan §3.10), with focus kept by hook and position across a repaint. `renderBar` is **gone**; its call sites call `barChanged()`.
- **What is left, and why:** the plugin's **Pages menu** stays a legacy node (`renderPagesMenu`, the list pinned light in `styles.css`'s `.brandmenu.navmenu`, `.bm-cap`, `.bm-div`, `.barmenu-wrap`) until S11.2 moves the Style guide into the Figma menu. **"+ New brand"** still returns to the start screen through `build()`, the legacy view switch, inside its lent body, until S12. The `brand-bar` chrome surface stays declared (it now places the shell's node), so the roster `test:smoke` reads is unchanged.

**Removed, each by name once nothing called it:** `renderBar`, `renderBrandMenu`, `renderImportBox`, `renderOverwriteConfirm` (its sentence is `overwriteText`), `renderExportDialog`, `renderPruneDialog`, `barHost`, `outsideBound`, `globalErrHost`; in `styles.css`, every `.exdlg*` rule (with its two `@media (max-width:720px)` blocks), `.bm-field`, `.bm-lab`, `.bm-in` (and `.bm-in.bad`), `.bm-hint`, `.bm-item`, `.bm-dot`, `.bm-import`, `.bm-ta`, `.bm-err`, `.bm-load`, `.bm-file`, `.bm-import-row`, `.bm-confirm-row`, `.bm-upload`, `.bm-cancel`, `.bm-confirm`; in `chrome.css`, the `.barmenu-wrap .brandmenu` hang rule and the notices row's legacy padding. Kept, with their last user named: `.errbar` (the web's refused-saved-brand boot card, `entry.ts`, #1999), `.barbtn` (that card and the Style guide's draw button), `.seg`/`.seg-b` (Inspect's token list).

**Chrome tokens:** two product rows, `l-col` (`core.dimension.72`: the brand menu is four columns, 288px, concept's popover; the export dialog twelve, 864px) and `scrim` (`color.scrim.default`, listed decorative: nothing is read on it, the dialog draws its own ground). The brand menu is fixed at its static position under the switcher, so its height is held to the window and it scrolls rather than run off a 420px-tall plugin (#1925's second item, now held by `test:chrome` §28).

**Gates:**
- `test:chrome` **section 28** (27 until #2144 took that number), both hosts, both themes, 1280, 640 and 380: the brand menu (import box open), the export dialog and the error strip, each measured by the probe as chrome (text 4.5:1, edges and glyphs 3:1, 24px targets, the embedded font, no shadows, no inline values; the probe no longer skips the notices row or the bar's popovers, only the plugin's Pages menu list); the strip's ground follows the theme (literal luminance lines), full width, right under the bar; the menu inside the window and the dialog one column at the narrow tier; and **the brand menu by keyboard** (Enter opens it on the current example, Arrow Down, End and Home move, Escape closes it back to the switcher; Escape closes the dialog back to Export). The probe also measures `textarea` as a field and classifies `p3-textarea`.
- `test:smoke` §2d: **the strip in dark**, the bug being fixed: its rendered ground dark (below 0.2), its line 4.5:1 and its glyph 3:1, and the light theme's strip on a light ground; #388's checks unchanged (quiet before, shown after the refused edit, naming the field, kept across navigation, cleared on undo). The #1031 brand-menu arm now holds that each control's color-scheme **agrees with its measured ground** in either direction (it held "light only" while the menu was pinned light).
- `test-shell-imports.ts` scans `shell/bar.ts` and `shell/notices.ts` by name; `renderBar` stays on its literal tier list.
- Every existing behavior test kept its oracle and its hooks (the hooks are the same names: `brand-switcher`, `brand-menu`, `brand-menu-example`, `brand-menu-new`, `brand-menu-import`, `import-text`, `import-load`, `overwrite-*`, `export-open`, `export-dialog`, `dialog-confirm`, `prune-dialog`, `error-bar`): the plugin's `test:start` (the start-screen re-entry from "+ New brand", the brand menu measured in both themes) and `test:verdict` (the prune review, Export after a failed restore, the #1989 error line) pass unchanged.

**Equivalence (not committed; the S8.2 driver's approach):** every brand-menu action and Export, driven on a build of the base (`93011b47`, then again of `main` after the merge) and of this branch, per corpus brand: load each example, rename on Brand › Identity, stage an example over an edit (the confirm, Cancel, Replace), download tokens and the brief, a refused import (the error), the brief imported back over an edit (confirm, Replace), an import through the export dialog's slot, and "+ New brand" to the start screen, then from an example and from a color. **51 of 51 steps identical**: every persisted `prism3:*` key at 45 snapshots, the bar's name, the confirm sentence, the import error, and the bytes of all 6 downloads. (Rename is not a brand-menu action since S3; it was driven where it lives, with the bar's name read after.)

**Mutations, each after a `wip:` commit, restored with `git checkout -- <file>`:**
- **The error strip drawn light in dark** (`notices.dataset.theme = 'light'` back in `shell/frame.ts`, the pin it had): `test:smoke` `prism3: in dark, the error strip is drawn on a dark ground (luminance 0.815, below 0.2) …` (and aurora, harbor).
- **Export dropped from the bar** (`exportWrap` out of the bar's order in `shell/bar.ts`): `test:chrome` `web light 1280: the chrome renders [data-p3="export-open"] and it was measured`, and `Tab reaches [data-p3="export-open"] and its ring was measured` (291 failures, every column).
- **The brand menu not keyboard-reachable** (its items `tabIndex = -1`, and no focus moved into it on open): `test:chrome` `S13.1 web light 1280: keyboard: Enter on the brand switcher opens the menu with focus on the current example (open true, focus on "brand-switcher", current null)`, with the arrows and Escape-from-an-item arms, every column. (The same run also failed `figma light 640 / a write running: … span.p3-spin "…" 1:1`, section 10's spinner measured mid-fade: timing, not the mutation; the clean runs pass it.)
- **The error strip not cleared on undo** (`show(null)` returns before hiding, in `shell/notices.ts`): `test:smoke` `prism3: undoing the refused edit clears the bar` (and aurora, harbor).

**The owner's first review (2026-10-05).** The theme menu moved left of Activity and Export, so on the web Export is the last control. Its right edge **equals the page content's**: 1248 at 1280 (the preview header's content edge) and 368 at 380 (the tab row's). This alignment is made deliberately, not by accident: the bar's right padding is the preview header's (`space-400`; the left stays `space-300`), and the dialog layer is `display: contents`, so the empty layer adds no gap after the last control. Before, at 1280, that gap happened to make up the 8px; at 380 it left Export 6px short. That round also put glyphs beside Export's and Activity's words. The menu bar below replaces those glyph buttons.

**The owner's menu bar (2026-10-05, a modified "A · Menu bar" from the top-bar mockup).**
- **No divider anywhere in the bar.**
- **The plugin's order:** the mark (the logo and "Prism3 Studio"), the brand switcher, Contrast, then Theme, Agent, Activity and Export, then Pages ▾, Figma ▾, and Apply Theme at the far right. The web has the same order without Pages, Figma or Apply Theme, so Export ends the web's bar, still at the page content's edge.
- **The mark is on the plugin too** (it was web only). The bar places it first among its controls (`BarPlaced.mark`), so a second row starts at the bar's own edge.
- **Contrast, Theme, Agent (plugin), Activity and Export are tiles** (`dom.ts` `tile`): borderless and unfilled, a glyph over a small label. The label drops at the narrow tier (`NARROW_MAX`, 560). A tooltip under the tile, on hover and on keyboard focus, repeats the name. The names are unchanged, and the label and tooltip are `aria-hidden`. The tooltip is drawn by the stylesheet alone, so it sets no inline value; at 380, Contrast's tooltip hangs from the bar's left edge, so it stays inside the window. The labels take the text ink: the secondary ink measured 4.17:1 on the dark bar at 12px (`test:start` caught it).
- **The brand switcher, Pages and Figma are white buttons with ▾.** Pages no longer collapses to its glyph at 380.
- **Apply Theme is the only filled control.** The web has none.
- **Contrast** shows a check while every pair passes, or a warning glyph and the count below floor. Today's line is the tooltip. The name is still "Verdict: <line>. Open Inspect, Contrast", and a click still opens Inspect › Contrast. There is no checking state. The bordered verdict pill and its CSS are gone.
- **The Agent tile (the owner's T7 A, 2026-10-05)** replaces the "Agent: Off" chip and its popover, between Theme and Activity, plugin only:
  - a click posts the same `agent-link` request the popover's switch posted, and the main thread stays the authority (off at every launch);
  - its name and tooltip are "Agent, off" or "Agent, on";
  - it carries `aria-pressed`, because the old control was a toggle (a `role="switch"` with `aria-checked`);
  - a green dot sits on the glyph only while the link is on.
  The popover's explanation line and status line ("Listening — file mailbox, every 1 s …", and an inbox error when there is one) are no longer drawn. `agentLinkStatusText` is kept, and still tested by `test-agent-link.ts`, until the owner says where that status goes.
- **Activity's name and tooltip add "agent link on"** while the link is on (approved copy), for example "Activity, agent link on, 1 running". The plugin's Agent tile reports each state through `setAgentLinkOn` (`shell/activity.ts`).
- **The plugin's Theme menu** offers Match Figma (the default, today's behavior: Figma's `figma-light`/`figma-dark` classes, live), Light and Dark (`shell/theme.ts`, now host-aware). The plugin's iframe has no storage, so the choice is kept **per person in `figma.clientStorage`, key `prism3:theme`**, the same mechanism as the window size (`prism3:ui-size`, #144):
  - the UI posts `set-theme-pref`;
  - the main thread keeps it and answers each `ui-ready` with `theme-pref`;
  - the plugin's UI entry applies the reply.
  The web keeps Light, Dark and System in `localStorage`.
- **Fit:** the web at 640 is one row. The plugin at 380 is two rows:
  - row 1: the mark, the brand, Contrast, Theme, Agent, Activity and Export. Measured at 380 with "prism3": the controls span 12–368 with a 58px gap in the spacer (mark 22, brand 106, Contrast, Theme, Agent, Activity and Export 28 each, gaps 6), so Export stays on row 1;
  - row 2: Pages ▾ and Figma ▾, then Apply Theme on the right (a row break and a second spacer that only the narrow tier draws).

**Gates for the menu bar:**
- `test:chrome` §28, both hosts, both themes, at 1280, 640 and 380:
  - the DOM order per host;
  - no divider (no separator element, no edge on a non-control, no thin filled element);
  - the white-with-▾ menus;
  - the borderless tiles: glyph, label shown or dropped by width, names and tooltips;
  - Apply Theme as the only fill;
  - one row at web 640, and row membership at plugin 380;
  - the alignment;
  - Contrast's tooltip shown on hover inside the window.
- `test:chrome` §28b:
  - Contrast's mark per verdict, using `test-verdict-count.ts`'s two-mode fixture on the web, "2 of 884 below floor, 2 modes" and the count 2;
  - the plugin Theme menu's three choices, its default, a choice posted to the main thread, and the choice remembered across a reload;
  - "agent link on" in Activity's name.
- `test:chrome`'s Agent section (T7): the tile sits in its slot, named "Agent, off", not pressed, with no dot, and its label is dropped at 380. A click posts `agent-link` on; the published on state gives "Agent, on", pressed, and the dot; a second click posts off; and the off state clears both. The old chip and popover are gone (D6).
- `apps/plugin/test-theme-pref.ts` (new, in the plugin's `test`) drives the real `main.ts`: a choice is kept under `prism3:theme`, and the next `ui-ready` sends it back.
- Existing checks follow the change: the product mark is now checked on both hosts; the plugin's "no theme toggle" check became "starts on Match Figma"; the verdict's line is read from its tooltip; the Tab-order lists include the plugin's Theme; and the 380 Activity sheet's edge floor went from 10 to 6, because the tiles have no edge.

**Mutations for the menu bar.** Each was run on a `git archive` copy of the committed head (`87fc5974`) with the shared `node_modules` linked in, built, and run through `test:chrome`, so the worktree itself was never mutated or restored:
- **The theme menu put back after Export** (`bar.ts`'s order): 16 failures. Example: `S13.1 web light 1280: bar order: product-mark, brand-switcher, verdict, theme-toggle, activity-open, export-open (product-mark, brand-switcher, verdict, activity-open, export-open, theme-toggle)`, and `… bar alignment: the bar's last control on its top row (theme-toggle) ends at the page content's right edge (1248 vs 1248, the preview header), and it is Export`.
- **A divider after the mark** (`border-right` on `.p3-mark`): 12 failures, every host, theme and width. Example: `S13.1 web light 1280: bar dividers: none between the bar's items (product-mark border-right)`.
- **The labels kept at the narrow tier** (the narrow `.p3-tile-label` rule dropped): 26 failures. Examples: `S13.1 web light 380: bar tiles: verdict is borderless (true) with its glyph (true), its label dropped ("Contrast"), …` and `T7 figma light 380: the Agent tile sits in the top bar's Agent slot, named "Agent, off", not pressed, no dot, its label dropped ({… "label":"Agent" …})`.
- **Contrast's mark always the check** (`preview.ts`): 9 failures. Example (the section was 27b then, now 28b): `27b web light 1280: Contrast: pairs below floor, so its mark is the warning glyph and the count below floor ({"state":"fail","check":true,"warn":false,"count":null,"tip":"2 of 884 below floor, 2 modes",…})`.
- **The Agent dot drawn while off** (`.p3-agent-dot { display: block }`): 12 failures. Example: `T7 figma light 1280: the Agent tile sits in the top bar's Agent slot, named "Agent, off", not pressed, no dot, labelled "Agent" ({… "dot":true …})`, plus `… the published off state clears the dot and the pressed state`.
- **The theme choice not kept** (`main.ts`'s `set-theme-pref` case emptied): `test-theme-pref.ts` failed 4 checks, for example `a choice is kept in clientStorage under prism3:theme (kept undefined)` and `the next ui-ready sends the kept choice back (sent [])`.

The clean run on the same head: `test:chrome` 18161/18161.

**After the owner's approval: merging #2151 (focus rings), and a class clash with S12 (#2142).**
- **Merge.** `chrome/spec.mjs` keeps main's `focus-ring` row and `PRODUCT_PAIRS` beside this branch's `l-col` and `scrim` rows, and `chrome/esbuild-plugin.mjs` keeps main's `PAIRS as MOCKUP_PAIRS, PRODUCT_PAIRS` import and spread. Every chrome focus ring is on `--p3-focus-ring`, including this branch's import box (`.p3-textarea`), which had been written on `--p3-ctl-edge`. #2144's sweep is `test:chrome` section 27, so this branch's sections are now **28 and 28b**.
- **The clash.** The S12 start window and its guard (#2142) use `p3-dialog`, `p3-dialog-head`, `-title`, `-body`, `-foot` and `p3-scrim`, the same names as the export and prune dialogs. So the export dialog's two-column body rule split the start window into two columns; the owner hit it in a demo build. The export and prune dialogs now carry their own names, **`p3-bardlg-*`** (`p3-bardlg`, `-head`, `-title`, `-body`, `-col`, `-desc`, `-note`, `-foot`, `-import`, `-layer`, and `p3-bardlg-scrim`). So no rule of theirs reaches a start-window element, and no S12 rule reaches theirs. The export scrim stays at z-index 50, under S12's.
- **`test:chrome` §28c**, both hosts at 1280:
  - with the export dialog open, an element carrying the start window's class names is laid out by none of its rules: one track at most, and not the export scrim's z-index;
  - once the start window exists (#2142), "+ New brand" opens it over the open export dialog, and its body must be a single grid track. Until #2142 merges, that half says so instead of passing.
  - Mutation, the body rule unscoped: below.

**The tile dots (owner QA, 2026-10-05).** Before, the dots were placed and colored inconsistently:
- Agent's "on" dot sat at the glyph's bottom right, in green.
- Activity's dot sat at the top right, and its color depended on the state (`statusWords`/`paint` in `shell/activity.ts`):
  - **running**: a ring in the icon ink (black in light, white in dark);
  - **attention** (a failed or warning result): filled bad red;
  - **new result nobody opened**: filled icon ink;
  - **nothing**: no dot.
  The drawer's own lead dot is not a tile dot and is unchanged.

Now every tile dot sits at the glyph's top right at one offset (`.p3-tile-mark > .p3-dot`). **The owner's D-RED A: a failure keeps its red dot, and every other dot is the ok green (`--p3-ok-icon`)**: Agent on, Activity running, a new result, and an attention state that is not a failure, which is a warning. A write's `ok: false` covers both failures and warnings, so the tile tells them apart by the verdict's lead mark, the contract every write's headline follows (✓ done, ⚠ done with problems, ✗ failed): a `bad` operation whose verdict starts with ⚠ draws the new `warn` dot, in green. The drawer and the names still count both as needing attention.

**Every tile dot is filled, the same shape** (the owner, during the orchestrator's review, 2026-10-05): Activity's running dot was a ring on the tile and is now a filled green dot like the rest. The drawer's own lead dot keeps its ring. Mutation, the ring put back on the tile: `28b figma light 1280: tile dots: every dot is filled, Activity "run" too (Agent filled true, Activity filled false)` (and dark). `test:chrome` §28b checks the plugin at 1280 in both themes, with the link on and a write running: both dots are drawn, at one offset within 1px, in the ok green, and the names still say "Agent, on" and "Activity, agent link on, 1 running". Then a failed apply (`✗ write failed`) draws Activity's dot red, and a warning (`⚠ 4 misses`) draws it green; both names still say "needs attention". (The "light" case runs in dark by then: its Theme check chose Dark.) The web has no tile dot in any state (no agent link, no write).

Mutations for the dots and the dialog scope (each on a `git archive` copy of `a629aa1b`; the clean run was 18382/18382):
- **Agent's dot back at the bottom right**: `28b figma light 1280: tile dots: Agent's and Activity's dots sit at their glyph's top right at one offset (Agent 4,10; Activity 4,-2; …)`, and the same for dark.
- **Activity's running dot in the icon ink**: `28b figma light 1280: tile dots: Agent "on" and Activity "run" draw in the ok green rgb(56, 146, 94) (Agent rgb(56, 146, 94), Activity rgb(247, 247, 247))`, and the same for dark.
- **The export body rule unscoped** (`.p3-bardlg-body, .p3-dialog-body`): `28c web light 1280: dialog scope: no rule of the export dialog reaches an element named as the start window's (body grid, 2 tracks "268.797px 268.797px"; scrim static, z auto)`, and the same for figma.

**`test:chrome` F2 follows D-RED A.** Its warning case (dark, `⚠ 2 pages skipped`) now expects the green `warn` dot, and its failure case (light) still expects the red `bad` dot. The first verify after the #2152 merge failed on exactly that, which is the old expectation meeting the new rule. The same run also stopped once on a `TimeoutError` clicking Q52's `icons-pair`. That did not recur in the next standalone run or in the next verify (18708/18708, then 68/68), so I am treating it as a flake, not a defect: noted here, not filed.

**Held:**
- **The plugin from 561 to about 1000px.** The bar wraps at the wide tier, so Export can start the second row. The owner named 1280 and 380 for the plugin; its window opens at 1280.
- **Where the agent link's status now shows** (the old popover's two lines), above.

**Filed:** #2105 (the plugin at 380 × 420: the bar's second row draws over the error line, and a long line leaves the levers 0px; on the base too).

### Traps
- **A popover's height can't use the viewport here.** `chrome.css` may hold no raw length (`vh` included) and no var but `--p3-*`. The brand menu is `position: fixed` at its static position (top and left `auto`, a margin past the switcher), so `100%` in its `max-height` is the window's height. It relies on no ancestor making a containing block for fixed boxes (a `transform`, `filter` or `contain` on the frame, the head or the bar would break it).
- **`hidden` loses to a class's `display`.** `.p3-errstrip { display: flex }` overrides the UA's `[hidden] { display: none }`, so the strip needs its own `.p3-errstrip[hidden]` rule; without it the strip never hides and #388's "quiet before" fails.
- **The bar repaints whole on `bar`, `host` and `origin`,** as `renderBar` did; a keystroke in the import box tells no topic (`importText` stores only), so the caret is never disturbed.
