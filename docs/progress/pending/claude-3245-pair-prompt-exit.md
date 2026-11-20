## (2026-11-18) — The agent link's pairing prompt leaves with the menus' fade (#3245)

**Status:** studio/plugin chrome (`chrome.css`) plus `test:chrome` section `3150`. No engine change, so no change note;
CONTRACT and `EXECUTOR_REVISION` unchanged.

### What changed

- **Owner decision on #3245 (2026-11-18, A):** the agent link's pairing prompt (`agent-link-ui.ts`, hook `agent-pair`)
  takes the menus' exit fade, with reduced-motion arms.
- The prompt is a `.p3-menu` that is hidden (`pairBox.hidden`), never removed, so #3207's `data-leaving` exit never
  reached it. It entered with the menu's Shift and then vanished at once. It now leaves the way the error strip does:
  `display` is held through the fade (`transition-behavior: allow-discrete`), and on `[hidden]` its opacity goes to 0
  on the exit curve, `motion-fast`, moving nothing, as `.p3-menu[data-leaving]` does.
- **The reduced-motion trap.** The reduced block's menus line sets `transition-property: opacity` on every `.p3-menu`.
  That drops `display` from the list, so under reduced motion the prompt's fade would end at once. The prompt gets its
  own reduced rule (`opacity, display`, the reduced duration, `allow-discrete`), placed after that line at
  `.p3-popwrap > .p3-menu.p3-agent-pair`, the specificity it needs to win over the `:is(…)` list.
- No change to `agent-link-ui.ts`. Its DOM and its `hidden` toggling are as they were.

### The arms (section `3150`)

- DECLARED lists the three new rules by selector.
- LIVE and REDUCED (plugin 1280), driven directly as the error strip is, since no bridge asks for a code in the page:
  - the prompt is in the bar's agent slot, hidden;
  - it shifts in like a menu (opacity and translate, 100ms, enter curve), or crossfades on the reduced duration;
  - it settles at rest;
  - once hidden it stays drawn and fades out (opacity on 100ms, exit curve, nothing moving), or crossfades under reduced
    motion and is still drawn;
  - it settles undrawn.
- **Mutations, each failing by name:**
  - main's CSS fails 6: the three DECLARED arms, the LIVE exit arm (`display none; read []`) and both REDUCED exit arms.
  - the reduced rule alone dropped fails 3: DECLARED, `… stays drawn through its exit under reduced motion (display
    none)` and `… crossfades on 100ms`.
