## (2026-10-01) — UI redesign S1.4: the Activity drawer, the Figma menu and the Agent chip in the top bar

**STATUS: PR open from `ui/s1-4-activity`, stacked on #1923 (S1.3) and #1922 (S1.2).** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. The spec is `docs/superpowers/ui-redesign/implementation-plan.md` §3.5 and §3.9, with the owner's F2 (the drawer's behavior), v5 Q9 (`COLLAPSE_MS`, 4 s), IA-3 and D6 (the Agent chip moves to the top bar and the bottom-left one goes), and the §9.1 runtime-inline-values row (`agent-link-ui.ts:56`).

**What the user sees.**
- **Activity**, on the top bar of both hosts, after the Agent chip and before Export: the word at full width, a glyph at 380. Its status dot and its name say what concept v6's say: a write running ("Activity, 1 running"), a result that needs attention ("1 needs attention"), or a result nobody has opened ("new result").
- **The Activity drawer**, at the bottom of the frame and pinned to the bottom edge. Its bar row holds the toggle and the status pills that sat in the top bar until now; its body holds the apply detail. It opens by itself when a write starts, collapses by itself 4 s after a success, and stays open on a failure or a warning until it is closed. At 380 a running write shows in the strip (the drawer's bar row, pinned to the bottom), and a failure or a warning opens the full-pane sheet under the top row. Nothing is drawn until something has run, or until Activity is clicked.
- **The Figma menu** (plugin only), after Pages and before Apply to Figma: Apply to Figma, Prune stale, Set up file, Build set…, Style guide…. Apply to Figma stays on the bar as the one inverse-filled control. Prune stale left the bar for the menu.
- **The Agent chip** (plugin only), after the verdict's spacer: "Agent: Off" or "Agent: On", a glyph at 380. It opens a popover with the switch, concept v6's line on what the link does, and today's status line. The bottom-left dark box is gone (D6).

### Diagnosis and structure

- **`shell/activity.ts`** owns the button, the drawer and its F2 state. It reads a pure reading `main.ts` lends (`activityReading`: each write's state, idle, running, ok or bad, plus whether a result's detail is open), subscribes to `host` and `host:detail`, and reacts to what moved since the last reading: a write that started, one that settled well, one that settled badly, a result that landed with no start seen (an agent's). It names no legacy tier; `test-shell-imports.ts` now scans it and `figma.ts` by name.
- **A write going pending now tells the topics.** Before S1.4 the legacy click handlers named `renderBar()` and `syncApplyDetail()` directly, which no subscriber could hear. `hostChanged()` invalidates `host` then `host:detail`, the order a host verdict uses, so the bar, the detail row and the drawer all repaint from their subscriptions. The subscription order is unchanged: `main.ts`'s painters subscribe at module load, before the frame, so the pills are painted before the drawer reads them.
- **One function per write.** `runApply`, `runPrune` and `runFileSetup` are what the bar's Apply, the old Prune stale button and the page's Set up file button ran, lifted out so the Figma menu's items call the same functions. `shell/figma.ts` draws the menu from the list `main.ts` lends (`figmaActions`) and runs what it is handed. Build set… and Style guide… open the pages that hold their options (the set picker, the style guide's settings), as concept v6's option-first items do; neither writes on its own.
- **The `bar` hook moved with the pills.** `test:verdict` reads the pills as `[data-p3="bar"] [data-p3="status-pill"]`, so the drawer's pill row carries `bar`, and the legacy slot in the top bar is now `bar-main`. The pills keep `status-pill` and `status-verdict`, the detail keeps `apply-detail`, and the verdict suite's literal strings are unchanged.
- **File setup and the style guide now have a pill in the drawer.** Their verdicts opened the shared detail row before with no pill in the bar to say whose detail it was (#483 asks that the open detail belong to a named pill). With the pills in the drawer every write's result sits beside the detail it opens, and the #1890 arm's "the bar repaints before the detail row" holds for all four kinds.
- **The apply detail is a `drawer` chrome surface** (`CHROME_SURFACES`, a new home) and takes the chrome's `.p3-detail`; the legacy `.applystat-detail` rule went with it.
- **The shell's bar nodes keep focus across a re-render.** `renderBar` places the verdict, the Agent slot, Activity and the Figma menu among the legacy controls in concept v6's order, the same nodes every time, and gives focus back to one that held it.
- **The Agent chip** (`apps/plugin/src/agent-link-ui.ts`) is built once by the plugin's entry and moved into whichever `bar-agent` slot is in the document (the frame comes and goes with the app view). It wears chrome classes and carries no inline value, so the §9.1 rendered check passes on it, and `test:chrome`'s named exemption for the old chip (`INLINE_EXEMPT`) fired as stale and is removed, with its mechanism. `agentLinkStatusText` is unchanged and still exported for `test-agent-link.ts`.

### The #1890 arm in `test:verdict`

The arm asserted that the detail row lives in the sticky head and that `--chrome-h` is written after the bar. Under S1.4 the detail row is the drawer's body, outside the head, so a verdict no longer changes the head's height and there is no `--chrome-h` write to observe; its three chrome checks failed (`saw bar → detail`, `holds bar and detail false`). The arm now checks what the move intends, keeping seven checks per verdict kind and the suite at 191: the bar is still written before the detail row; the detail opens in the drawer beside the bar, in a drawer that is open and pinned to the bottom edge; the open detail stays inside the viewport with the page scrolled to its top and to its bottom; and `--chrome-h` still equals the sticky head's rendered height. No other line of the suite changed.

### Tests

- **`test:chrome`** grows to **5,824 assertions, in about 3 min 10 s** (section 10, both hosts, both themes, 1280, 640 and 380). The Activity drawer: nothing drawn before a write; a write started from the Figma menu opens it (the strip at 380), its pill in the drawer and none in the top bar; a success keeps it open at 3 s and collapses it by 5 s (the literal `COLLAPSE_MS`, timed at 1280); a failure (light) or a warning (dark) keeps it open past 5 s with its detail (the sheet at 380). The Figma menu: its five literal labels; Arrow Down, End, Home, Arrow Up (wrapping), Escape and Tab; each item's effect observed on the wire or as the page it opens; Apply and Prune unavailable while Apply runs. The Agent chip: in the top bar's slot, the same slot node across a bar re-render, its switch posting `agent-link`, the main thread's state turning it on with today's status line, Escape back to the chip, and the old chip absent through `hooks.absent` with the new chip as proof. The full chrome probe runs in each of those states. The top-bar column lists gain `activity-open`, `agent-chip` and `figma-open` and lose `prune-open`.
- **`test:verdict`** 191 of 191 (the #1890 arm as above, with S1.2's review fix: the detail counts as open only when it is not `hidden` and its computed `display` is not `none`). **`test-shell-imports`** 23 (it reads the two new files by name, and S1.2's import-path arm covers them).

**Mutations, each after a commit, diff checked non-empty, each failing by name:**

| Mutation | Fails with |
|---|---|
| M1 `COLLAPSE_MS` 4000 → 2000 | `F2 figma light 1280: a success keeps the drawer open at 3 s (COLLAPSE_MS is 4 s) — open false` |
| M2 a failure schedules the collapse | `F2 figma light 1280: a failure keeps the drawer open past 5 s, its detail showing — open false, detail "null"` |
| M3 the Prune stale item runs `runApply` | `Figma menu figma light 1280: Prune stale posts a dry-run prune (prune:false) — posted ["apply-theme"]` |
| M4 the bottom-left chip mounted again | `D6 figma light 1280: the bottom-left agent chip is gone — … (found ["div#p3-agent-link","button"], #p3-agent-link present)`, and `no runtime inline value outside [data-content] — div. "Agent link: off" sets position, left, bottom, …` |
| M5 the apply pill painted into the top bar | `F2 figma light 1280: the running write's pill sits in the drawer's bar row (pills [])`; `test:verdict`: `#1890 apply-result: the bar repaints before the detail row it opens — write order detail` |
| M6 `import { build } from '../main'` in `activity.ts` | `src/shell/activity.ts:32: references the legacy repaint tier "build"`, and `src/shell/activity.ts:32: imports "../main", which reaches src/main.ts` (and `frame.ts`, which imports it) |

M1–M5 were run against `test:chrome`'s section 10 alone, after both builds; the assertion names are the suite's own.

### Traps

- **A message posted to `parent` lands as a task.** In the browser harness `parent` is the page, so a capture read straight after a click sees nothing; the first draft attributed every item's post to the next item. The capture now lets one task through before reading.
- **The verdict pills' leading glyphs are not in the embedded Inter subset.** The host's headlines lead with ✓, ✗ and ⚠, and a pending write reads "⋯ Applying…". The pills sat in the S1.2 bar too, but no `test:chrome` state had one. They are the verdict suite's copy contract, so `FACE_GAPS` now lists U+2713, U+2717, U+26A0 and U+22EF, each one glyph; the fix is a wider subset.
- **A collapse waits while the pointer is over the drawer** (concept v6). At 380 the sheet opens under where the Figma menu was, so a test that clicks a menu item and then waits for a collapse there would wait forever; the narrow checks wait only for things that must not collapse.

### Held for the owner

Each is the option closest to v6, picked and flagged under the owner's overnight rule; none is brand-facing.
- **Where the drawer sits while every page is legacy.** At the bottom of the frame, pinned to the bottom edge (sticky), under the legacy frame; under the two panes it is the preview pane's bottom row, as the plan says. Its body is capped at four bar heights and scrolls.
- **At 380 the strip is the drawer's bar row at the bottom edge.** v6 drew the strip under the top row.
- **Apply to Figma is in the Figma menu and on the bar.** The brief's list names it; v6's wide bar keeps it beside the menu, and its narrow More menu lists it. The bar keeps the one inverse fill.
- **Build set… and Style guide… open their pages.** v6 opens their options in the drawer, which is S11. The labels are today's ("Build set", "Style guide") with the ellipsis for "asks first".
- **The pills' row is the drawer's bar row,** so a collapsed drawer still shows the latest results; the body holds only the detail and a note. v6's collapsed bar shows the last operation's line, which is what the pills say today.
- **File setup and the style guide report pills into the drawer** (see above). Their copy is today's.
- **Activity is on the studio too,** as in v6, though the studio runs no write in S1.4; its drawer says so.
- **The Agent chip takes `radius-lg`** (a control, under the 2026-10-01 split); v6 drew it as a pill. **The switch is a button with `role="switch"`** reading "On" or "Off" with a dot; v6 drew a track and thumb, which needs geometry the chrome map does not hold yet. **The popover shows today's status line,** not v6's transport select: the main thread picks the transport.
- **The Agent chip is not on the start screen,** which has no frame until S12. The old chip was on every screen.
- **New neutral copy:** "Nothing has run in this session." (the studio's drawer note); the menu's name "Figma" and "Activity" are v6's, and "Agent: Off", the popover's line and the status words are v6's verbatim.
- **Not built:** v6's "Activity collapsed. The result stays on the bar." announcement, the per-operation rows and history (S11), and a running spinner (the running dot is a ring; a spin needs a duration variable the chrome map does not hold).
- **At 380 the plugin's bar still wraps** to a second row (Figma and Apply to Figma); v6 folds them into a More menu.
