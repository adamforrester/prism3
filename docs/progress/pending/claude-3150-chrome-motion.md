## (2026-10-31) — Chrome motion: the drawer, menus, dialogs, fold-outs and the reduced path (#3150 part 2, Q3150.1–11 A)

**Status:** studio and plugin chrome, from one stylesheet. ENGINE patch (change note): no token, emitted tree or component
surface moves, so CONTRACT is unchanged. No executor change, so `EXECUTOR_REVISION` stays. Part 1, the brand library's
animation styles (#2857), waits on the owner's three in-app checks.

### What changed

- **Five motion variables** in `chrome/spec.mjs` (PRODUCT_VARS), from Prism3's default theme, never the edited brand:
  `motion-panel` (`motion.duration.normal`, 200ms), `motion-fast` (`motion.duration.fast`, 100ms), `motion-reduced`
  (`motion.duration-reduced.fast`, 100ms), `ease-enter` and `ease-exit` (`motion.easing-role.enter` / `.exit`). Their own
  names rather than `dur-fast`, so the spinner's timing and the surfaces' are read apart, and so `test:chrome` can settle
  the surfaces without touching the spinner. `chrome.css` still carries no raw duration.
- **The surfaces** (`chrome.css`, the "chrome motion" section at the end), each by the wireframe's timing:
  - the Activity drawer slides up (a keyframe animation on `data-open`, 200ms in, 100ms out), at 1280 and as the 380
    sheet; the body stays drawn through the exit (`transition-behavior: allow-discrete`); the chevron turns with it;
  - the 380 strip shifts in with the first run; the bar row's unread dot pops in;
  - menus (Theme, Inspect, the brand menu) shift in; tile tooltips fade in and go at once;
  - dialogs (Update file, the start window and its guard) scale in over a fading scrim;
  - the error strip fades in and out, its notices row held through the exit;
  - Update file's rows fade in when the file read lands, and a set's line when its check comes back;
  - fold-out content (Show advanced on Palettes, Type and Elevation; an operation's lines; Earlier results and their
    entries; Draw by table title) fades in a short step down, its height snapping; a collapse is at once.
- **Reduced motion:** the drawer's slide, the chevron's turn and the dialog's scale drop, and every surface crossfades
  on `motion-reduced`. A surface whose exit is a display change keeps it as a fade; one that enters only still goes at once.

### Diagnosis: what made each surface replay, and the fixes

- **Redrawn surfaces replay `@starting-style`.** Update file's dialog, the bar row (its chevron and dot), an operation's
  Earlier results and every lever page are drawn afresh on each repaint, so a plain `@starting-style` replays on every
  tick. Two marks fix it: `data-still` on a repainted Update file scrim (set once a frame has shown the open dialog),
  and `data-enter` (`armEnter` / `enterMark`, `shell/dom.ts`), armed by the toggle or the host answer and held until
  the next frame, because one change often repaints twice in one task. A redraw after that frame (an edit, a run's
  progress, a page change, the sheet opened again) draws the surface unmarked. A first try gated fold-outs on
  `:focus`; it failed because the lever pages restore focus after the redraw has already been styled.
- **The chevron** was a new node each repaint, so it had nothing to transition from; it is now one node for the
  drawer's life, with the row's other parts drawn around it.
- **The Activity tile's dot is not drawn** since Q3113.9 A; "the status dot" is the bar row's unread dot now, so Pop
  lands there.
- **The drawer's slide is a keyframe animation, not a transition,** because a transition would leave a transform on the
  drawer at rest, and the drawer deliberately makes no stacking context (the preview header hangs over it). The closed
  offset is the bar row's own height, so the exit's end is where the closed drawer already sits.

### Held, and gaps filed

- **A surface the shell removes leaves at once:** menus, dialogs and the unread dot. CSS cannot play an exit on a removed
  node; it needs a deferred removal in the shell. Filed as #3207.
- **No Agent popover and no Figma menu exist any more** (T7 and the rail removed them), so Q3150.1's "the Agent popover"
  has no surface. Export is a page since #2909, and the prune review is Update file's Clean tab, so both ride the
  Update file dialog.

### Verification

- `test:chrome` §3150 (shard 3), 193 assertions: DECLARED (every rule in the stylesheet that declares motion, by
  selector and context, against a typed list), LIVE and REDUCED on the plugin at 1280 and 380 and the web at 1280 (the
  page's animation clock slowed through CDP so a 100ms move is read whole, then each surface settled and its end state
  held), and SETTLED.
- Every other section opens its pages with the three motion durations at 0s (`SETTLED_MOTION`), so each surface lands
  on its end state in the frame it changes and nothing measures mid-move.
- `test:verdict`'s #1890 arm read the drawer's place straight after a verdict opened it, which now lands mid-slide; it
  waits for every finite animation to finish first (bounded), so it reads the end state.
- `lint:live-css` passes unchanged: its scope is `styles.css`, and this change adds no rule there. The DECLARED arm is
  what holds the new `chrome.css` rules.
