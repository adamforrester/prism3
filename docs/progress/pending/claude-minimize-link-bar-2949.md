## (2026-10-23) — Plugin: minimize to a link strip while the agent link stays on (#2949)

**STATUS: branch `claude/minimize-link-bar-2949`.** Plugin + chrome (`apps/plugin/src/main.ts`, `agent-link-ui.ts`, `messages.ts`; `apps/studio/src/chrome.css`, one glyph in `shell/dom.ts`, one null validator in `write-adapter.ts`). Owner decisions on the issue: Q1 A (a compact link bar), Q2 A (the Activity drawer's short-status words plus the command), Q3 A (state, plus the running or last command, plus its age), Q600 A (a Minimize button beside the Agent tile, only while the link is on; the strip carries Restore and Turn off; Turn off also restores).

### What changed
- **Minimize** is a bar tile in the `bar-agent` slot, after the Agent tile, hidden while the link is off. It posts `minimize-ui`; the main thread resizes and answers `ui-minimized`, the authority as for the link itself.
- **The window** (`main.ts`). The main thread now tracks the size it last set (`uiSize`; Figma has no getter). Minimize keeps that size in `beforeStrip` and resizes to `STRIP_SIZE` (480×40), under the 380×420 floor, which is ours, not Figma's (Figma takes 70×0 up). The strip is never written to `UI_SIZE_KEY`: a `resize-ui` while minimized is ignored, and a size read from storage after minimizing goes to `beforeStrip`. Restore returns to `beforeStrip`. Any switch-off through `agent-link` restores first. It refuses to minimize while the link is off.
- **The strip** (`agent-link-ui.ts`) is built once and appended to `<body>`. `html[data-strip="true"]` hides every other body child (the live region excepted), so the whole UI stays mounted and Restore returns to the same page and state. Its line is `agentStripText` (pure): the short status; while not an error, `Agent running <cmd>… <age>` from `agent-started`/`agent-finished`, else `· last: <cmd> <age> ago` from `lastCommand.finishedAt`, else `· no command yet`. Ages are `Ns`, `Nm`, `Nh`, re-drawn each second while minimized. The full status line is the strip's tooltip.

### Why 480 and not the wireframe's 360
At 360 the approved line "Agent listening · last: update-components 2m ago" lost its age to the ellipsis, the one part Q3 A asked for, so "working" and "gone quiet" looked the same. `test:chrome` checks that the longest listening line ("… update-components 59m ago") fits whole at 480×40, with every control inside the strip.

### Poll independence
The poll runs on the main thread's own `setTimeout` (`agent-link.ts`), and `setMinimized` touches only `figma.ui.resize` and `beforeStrip`. `test-agent-link.ts` `strip/*` drives the real `main.ts`: the link and its record stay on, the poll stays armed, and a command sent while minimized is claimed and run. Mutation, from a commit: `setMinimized` calling `agentLink.setOn(false)` → `strip/link`, `strip/poll`, `strip/claims` and `strip/restore-link` fail by name.

### Three test:chrome checks that had to learn about the strip
- **D6** ("nothing outside the frame names an agent or holds a button") caught the strip, which lives on `<body>` by design. It now exempts the strip by its hook, and only the strip; the strip has its own block of checks.
- **29d's `FIT_SEEN`** counted every `.p3-tile-label`, so the hidden Minimize tile read as an unlabelled tile and the bar classified as `other` at every wide width. It now counts the labels of drawn tiles. The frame's own fit was never wrong: it measures widths, and a hidden tile measures 0.
- **"Agent on"** passed locally but failed on CI's first run (`figma * / Agent on: … agent-toggle-tip drew nothing`, all six). Showing Minimize widens the bar, the bar re-fits a frame or more later, and the hover the click left on the Agent tile was re-read mid-measurement, so its tooltip changed between being listed and having its font read. It now measures once every bar control has held the same box for four frames, with the pointer moved back onto the Agent tile. Didn't reproduce locally, so this is reasoned from the failure line.

### Not measured
The issue's 10-minute claiming measurement on a real host (window minimized, desktop app in front) hasn't been run. That's the owner's to run. Release builds behave the same: nothing here is behind `PRISM3_DEV`.
