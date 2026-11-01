## (2026-11-01) — Chrome motion: exits for the surfaces the shell removes (menus, dialogs, the unread dot) (#3207)

**Status:** studio and plugin chrome, from one stylesheet. Stacked on #3217 (both edit §3150 and the motion block).
ENGINE patch (change note): no token, emitted tree or component surface moves, so CONTRACT is unchanged. No executor
change, so `EXECUTOR_REVISION` stays. This closes the gap #3213 disclosed (Q3213.1 A): the approved inventory gives
these surfaces an exit on `motion-fast` with the exit curve (Q3150.1–2 A), and until now they left at once.

### What changed

- **A deferred removal, `leave()` in `shell/dom.ts`.** It marks the node `data-leaving` (the stylesheet gives it its
  exit), makes it `inert`, waits for the node's own finite animations to finish, then removes it. With nothing running
  (the motion durations at 0s, or a node that is not drawn) it removes the node at once, as before. `unleave()` takes the
  mark back, and a per-node counter keeps an exit already under way from removing a node that has since opened again.
- **While it leaves it reads as closed.** The shared menu button's `isOpen` is false for a leaving menu, so a click mid-
  exit opens it again (the leaving one goes at once and a new one enters). `inert` keeps focus and clicks out of it.
  The bar's brand menu returns focus to the switcher when the item that held it is leaving, not only when it is gone.
- **Where it applies:** the Theme and Inspect menus (`menuButton`), the brand menu (`bar.ts`), Update file
  (`update-file.ts`, which used to empty its layer), the start window and its guard (`start.ts`), and the bar row's
  unread dot (`activity.ts`). The dot is redrawn on every repaint, so the paint that drops it keeps the drawn node in
  place, unhooked, through its exit. A moved node would restart its style and its exit with it.
- **The exits (`chrome.css`):** a menu leaves as a fade, opacity only (the proposal's "Shift … leaves as a fade"). A
  dialog's scrim fades and the dialog shrinks back to 96%. The dot shrinks to nothing. All three use `motion-fast` and
  the exit curve. Under reduced motion each is a 100ms fade (Q3150.3 A), with the dialog's and the dot's exit scale
  dropped so neither snaps.

### Where the dot's exit shows

At 1280 the bar row stays when the drawer opens, so the dot shrinks away there. At 380 the open sheet hides the bar row
(`display: none`), so the dot goes with it at once. Nothing is drawn to animate, and `leave()` removes it immediately.

### Gates

`test:chrome` §3150 gains LIVE and REDUCED arms for each exit: the Inspect menu and Update file on the plugin at 1280,
the unread dot at 1280 (and its at-once case at 380), and the brand menu and the start window on the web. Each arm reads
the surface the moment it closes: drawn, marked leaving, inert, focus outside it, its control reading closed. It then
reads the exit's timing and curve (or, reduced, a 100ms fade with no transform), and checks the node is gone once the
motion settles. A reopen mid-exit is read too. DECLARED lists the four new exit rules.

"Gone after Escape" still holds in every other `test:chrome` section: they run with the motion durations at 0s, where no
exit runs and `leave()` removes the node at once. The live harnesses that read a closed surface by its absence now read
a leaving one as closed. Three readers in `test-start-screen.mjs` (`readStart`, `waitStart`, `readHome`) and its two
brand-menu "closed" reads skip nodes inside `[data-leaving="true"]`. `test:smoke` and `test:verdict` needed no change.

Mutations, each failing by name in §3150:
- the menu's `leave` back to `menu.remove()` → `LIVE`/`REDUCED figma light 1280: the Inspect menu, closed by Escape, stays drawn through its exit …` and its fade arms;
- `isOpen` reading a leaving menu as open → `… a click on Inspect during the menu's exit opens it again …`;
- `leave` setting no `inert` → every exit's `… reads as closed` arm (10);
- the menu's exit rule dropped → `DECLARED: rule .p3-menu[data-leaving="true"] declares motion …`, and the Inspect and brand menus' LIVE and REDUCED arms;
- the dot not kept through its exit → `… the dot stays drawn through its exit …` and `… the status dot shrinks away …`;
- Update file emptying its layer again → `… the Update file dialog, closed by Escape, stays drawn …`, `… scrim fades out …`, `… scales down …`;
- the reduced scale override dropped → `REDUCED … the leaving dialog keeps its size …` and `… the status dot … not even a snap`;
- the start window's dismiss removing at once → `LIVE`/`REDUCED web light 1280: the start window, closed by its X, …`;
- the brand menu removed at once → `LIVE`/`REDUCED web light 1280: the brand menu, closed by Escape, …`.

### Gaps

The start window's guard and the Theme menu are not driven live. The guard shares the start window's `leave` call and
its rule, and the Theme menu shares `menuButton` with Inspect.
