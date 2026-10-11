## (2026-10-10) — Studio: a drag rebuilds once a frame and stores once, Layout's sliders keep the drag, and the bar stops re-measuring on unchanged writes (#2487 PR 2)

**Status:** Studio only (`apps/studio/src` and its tests). No engine change, no emitted artifact moves, no ENGINE bump,
CONTRACT unchanged. This closes B1, A9, A10 and A13 from the merged #2487 review (comment 6098371348, §4 PR 2), and
takes my own nit from #2500's review: `onCommitted` commits the value captured at `change`.

### What changed

- **A drag runs once a frame and stores once (B1).** Before, every slider tick ran the page's full edit: a
  re-resolve, every `brand` subscriber, and a `localStorage` write. `ui/lever-kit.ts` gains `perFrame`, which:
  - hands the page the latest value once per animation frame;
  - holds the store's persist from the first `input` until the control is released (`change`, `pointerup`,
    `pointercancel`, `blur`, a pointer release anywhere if a repaint replaced the control, or 400ms with no
    `input`);
  - leaves the slider's `aria-valuetext` written at once, as before.

  The slider, `colorField`'s picker and Palettes' brand-color picker use it.
- **The coalescing sits at the control, not in `rebuild()`.** That's a deliberate move from the review's wording.
  Shape's, Components' and now Layout's in-place drag path (`sliding && dragging.sync()`) depends on `rebuild()`
  telling `brand` synchronously while `sliding` is set. A `rebuild()` deferred to the next frame would tell it after
  `sliding` cleared, and every drag would take the full re-render that loses the pointer. Throttling the control's
  own `input` gives the same one-rebuild-per-frame, latest-value-wins result, and leaves every other `rebuild()`
  caller (and `test-store`'s synchronous pins) as they were.
- **`state/store.ts`:**
  - `holdPersist` / `releasePersist`: while held, a good rebuild owes a write, and the release makes it once, with
    the last-good brand. Unheld rebuilds write at once, as before.
  - `loadInput` is one batch (A13): it resolves, sets the mode, sets the page, then tells `origin`, `brand`, `mode`
    and `page` once each. Before, it told `page` before the new brand was resolved.
- **`domains/layout.ts`:** the container sliders take the in-place path. Only the containers read those values, so
  syncing both sliders in place is complete.
- **A9:** `shell/bar.ts` and `shell/activity.ts` write the brand name, the Activity tip and its row text only when
  they differ. A same-value write still replaced the text node, and the frame's observer then re-ran `measureFit`
  on every brand repaint. Apply Theme's `disabled` is written only when it moves, for the same reason.
- **A10:** `shell/bar.ts` rebuilds the export dialog only when what it shows changes (a key over the export view,
  the import box's open state, its error and the confirm). The import text is left out of the key: typing stores it
  without a repaint, and a text set from elsewhere is written into the box in place.
- **`onCommitted` now passes the value read at `change`** to its commit. Every caller uses it.

### Tests and mutations

- **`test-store.ts`:**
  - **#2487 A13:** `loadInput` tells `origin`, `brand`, `mode` and `page` once each, in that order, each against
    the new theme, its first mode and the first page.
  - **#2487 B1:** a held persist writes nothing over three rebuilds and once on release. After the release a
    rebuild writes at once again, and a second release is a no-op.
- **`test-chrome.mjs` §46 (web light 1280).** Write and re-measure counts come from wrappers on
  `Storage.prototype.setItem` and `window.getComputedStyle`. `measureFit` is the one caller with
  `[data-p3="bar-main"]`.
  - A mouse drag from the thumb moves Shape's softness, and Layout's Maximum width, more than one step, with at most
    one write each.
  - A second keyboard step re-measures the bar zero times.
  - A breakpoint committed at `change`, then written over in the same task, stores the value it held at `change`.
  - 20 picker `input`s in one frame re-resolve the brand once (a MutationObserver counts the OKLCH readout's
    changes), store once, and draw the last color.
- **§46 figma light 1280, A10:** a host message (an Apply verdict) while the Export dialog is open leaves it as it
  was: the same node (a marker the test sets), the import text, and its caret at 4. A premise reads that the message
  reached the bar (its mutation records).

Mutations, each from a `wip:` commit, restored with `git checkout --`, each failing only its own arm, by name:
- **Shape's in-place sync removed (K3):**
  `✗ §46 web light 1280 Shape: a mouse drag moves the softness more than one step (1 → 1.5, step 0.5)`.
- **Layout's in-place path removed:**
  `✗ §46 … Layout: a mouse drag moves the Maximum width more than one step, and stores where it ends (1440 → 1480, step 40, …)`.
- **The persist hold removed** (per-tick persist):
  - `✗ §46 … Shape: a drag stores at most one write (2 written …)`;
  - `✗ §46 … Layout: … at most one write (9 written)`;
  - `test-store`'s three `#2487 B1` arms.
- **The bar's same-value guard removed:** `✗ §46 … A9: a brand repaint that changes nothing in the bar re-measures it zero times (1 measureFit call(s))`.
- **`onCommitted` reading the field when its task runs:**
  `✗ §46 … onCommitted: a committed field commits the value it held at change, not one written after it (stored [0,768,1200,1440,1920])`.
- **`perFrame` running every input at once:** `✗ §46 … picker: 20 color inputs in one frame re-resolve the brand once … (20 readout change(s) …)`.
- **The export dialog rebuilt on every paint:**
  `✗ §46 figma light 1280 A10: a host message leaves the open Export dialog as it is, the import text and its caret in place ({"mark":null,…,"caret":24,…})`.
- **`loadInput` back to its old order:**
  `✗ #2487 A13 loadInput tells origin, brand, mode and page once each, in that order … (heard ["origin:old:…","page:old:…","brand:new:…","mode:new:…"])`.

### Traps for whoever re-verifies this

- **A value set with `input` alone, and no release, stores after `QUIET_MS` (400ms), not at once.** The first full
  run failed test:chrome's Q22 depth arms for exactly that reason: their `slide` helper dispatched `input` and nothing
  after it, then read the stored brand at once. The helper now dispatches `change` after `input`, as a user's set
  ends.
- **The same delay would have weakened a gate silently.** #2096's arm (a scripted `input` on a disabled slider
  writes nothing) waited 150ms and then compared the stored brand. Under the quiet release, a write that got through
  would land at 400ms, after the comparison, and the arm would pass on nothing. It now dispatches `change` too, so a
  leaked write lands before the read (docs/34).
- **test:chrome prints only failures.** A section header with nothing under it is a pass.
- **A10's first trigger was vacuous.** It used the agent link turning on, which repaints the Agent tile but never
  reaches the bar's `paint`, so the mutation (the dialog rebuilt on every paint) survived. An Apply verdict is a
  `host` notification, which `paint` subscribes to. The premise arm now reads that the message reached the bar.
