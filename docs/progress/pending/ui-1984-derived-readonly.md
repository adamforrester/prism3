## (2026-10-07) — Studio: one read-only state for the levers panel in derived modes (#1984)

**Status:** `apps/studio/src/shell/frame.ts` (the hold, its exceptions and the line), `chrome.css` (three rules), the seven
per-mode domain modules (their derived lines and disabling loops removed), and `test:chrome` (new section 35, plus the
Q59 and TY2 A cases moved to the new model). No ENGINE bump: no emitted artifact moves. CONTRACT unchanged. Copy: one new
line, APPROVED (owner, RO1 A, 2026-10-07). Closes #1984.

### What changed

The owner decided on 2026-10-03 that derived modes (HC light, HC dark, wireframe) get one read-only state for the levers
panel instead of each page disabling its own controls. N-3 A (2026-10-05) asked for a panel-level line plus controls
that can't be used. On review of the first build the owner chose two refinements (2026-10-07):

- **RX1 A:** help and navigation stay usable, and only the settings are locked.
- **RX2 A:** the line takes the studio's existing note style and stays at the top of the panel.
- **RX3 A:** the note keeps its own warning glyph, unchanged, and HP3 (the ⓘ is only ever a button) stays as it is.

**The hold.** The frame mounts each page's levers inside `levers-region`, a `div` with `display: contents`. On the seven
pages that edit the previewed mode (the `derivedReadOnly` flag on their `NEW_PAGES` rows), a derived mode runs
`holdSettings` over that region. It finds every operable element: native controls, ARIA widgets, editable regions and
anything in the tab order (#1991's reach). It holds every one that is not one of RX1 A's exceptions (`STAYS_LIVE`):

- the ⓘ help buttons (`.p3-info`);
- the Show advanced folds (`aria-controls="p3-advb-…"`);
- the Jump to links;
- the "way to" links (`.p3-deplink`: Shape › Components, Components › Shape, and Type › Layout, the same kind of link);
- Continue.

A held native control gets its own `disabled`. So it keeps Prism3's disabled skin (F1 A, X4 A) and the contrast audits'
exemption, leaves the tab order, and reads disabled to assistive technology. Any other widget gets `aria-disabled` and
`tabindex="-1"`. Each held element is marked `data-held`, so leaving the derived mode frees only what the frame held. A
page's own disabled controls (the first breakpoint, a locked icon row) stay as the page drew them. A `MutationObserver`
on the region re-applies the hold whenever a page redraws, for example when a fold opens. One source of truth: a new
lever is held without doing anything, and no page checks the mode to disable a control.

**The line,** "‹Mode› is auto-derived and can't be edited here. Switch the preview to Light or Dark to edit.", is the
pane's first child, outside the region. It is Build style guides' boxed note, `.p3-sg-note.p3-sg-warn`, unchanged, its
own warning glyph included (RX3 A). The studio has no tinted neutral note, so this is the existing box with an icon. An
info glyph there was tried and dropped: TY2 A's HP3 check fails any ⓘ drawn outside a button in the levers pane. The line uses `modeLabel`'s name, takes
programmatic focus (`tabindex="-1"`), and is absent in Light and Dark. Brand and Palettes are brand-wide and stay
editable.

**Removed, one source of truth:**
- each page's "‹Mode› is auto-derived — read-only…" line (Surfaces & fills drew it in every row list and in Gradients);
- each page's `querySelectorAll(…).disabled = true` loop;
- the per-row `btn.disabled = derived` and Unpair's flag;
- `DEPTH_COPY.derived` and `COMPONENTS_COPY.derived`.

**Kept, on purpose:**
- **The write-time guards.** #2096's refusal in Components' `edit` stays as defense in depth. The Components Q59 case
  still dispatches a scripted `input` on the held slider and holds the saved brand byte-identical.
- **`isDerived` checks that decide what is drawn,** not whether a control is disabled: no picker drawn open, no
  "Editing ‹mode›" line, no inline Pair confirm in a derived mode.
- **A Custom mode's surface controls** stay disabled by `surfaceSourceOf().editable`. That is the custom-mode rule, not
  a derived-mode check.

**The first build, and why it changed.** The first round made the region a `fieldset` that was both `inert` and
`disabled`. That was one line of mechanism, but it took help and navigation down with the settings, which RX1 A
reverses. The fieldset also left each control's own `disabled` property false, so both contrast audits' "the `disabled`
property or `aria-disabled`" read had to learn about fieldsets. Holding each control by its own `disabled` puts both
audits back exactly as they were on `main`.

### The gate (test:chrome section 35, new)

The gate runs on both hosts, both chrome themes, at 1280 and 380. In each derived mode, on each of the seven pages:

- Every operable element in the pane that is not a named exception is held, and every named exception drawn is live.
- A Tab walk from the line through the whole pane stops only on named exceptions, and Shift+Tab leaves the pane.
- CDP `Accessibility.getFullAXTree` reports every control under the pane disabled except the named exceptions, with a
  floor on the disabled ones, and holds the line's text.
- The line reads the literal, sits outside the region, and takes focus. It carries the note's classes and its warning
  glyph (known by its drawing), with its text at 4.5:1 and its glyph at 3:1 on its own ground.

Once per run, in HC light on Surfaces & fills, the exceptions are shown to work: an ⓘ opens its help, and a Jump to link
scrolls the pane. In Light and Dark there is no line, a setting takes focus, and the tree holds enabled settings.

The exceptions are a literal list of hooks, so the gate does not read the frame's `STAYS_LIVE` selector. The modes, names,
pages, line and note classes are literals too, and every page × mode pair is counted.

**Mutations,** each in its own `wip:` commit, run on the section with both bundles rebuilt:

- (a) settings not held in wireframe: 168 failures, all wireframe, e.g. `#1984 web light 1280 wireframe on color-fills:
  every setting in the levers pane is held (149 read; live: fill-pick, icons-unpair, gradients-switch, …)`.
- (b) the line left out in HC dark: 280 failures, all HC dark, e.g. `#1984 web light 1280 hc-dark on color-fills: the
  panel's line is present and reads "HC dark is auto-derived …" (0 drawn, read null)`.
- (c) the line placed inside the levers region: 168 failures, e.g. `#1984 web light 1280 hc-light on color-fills: the
  line sits outside the levers region and takes focus (in the pane true, in the region true, focus true)`.
- (d) Layout's flag removed: 168 failures, all on Layout, e.g. `#1984 web light 1280 hc-light on layout: every setting in
  the levers pane is held (28 read; live: bp-input, bp-remove, bp-add, …)`.
- (e) the selects left out of the hold: 216 failures, e.g. `#1984 web light 1280 hc-light on color-fills: every setting
  in the levers pane is held (149 read; live: gradient-kind, gradient-interpolation, …)`.
- (f) the Jump to links held: 16 failures, e.g. `#1984 web light 1280 hc-light on color-fills: help and navigation stay
  usable (RX1 A): every named exception drawn is live (14 drawn; held: fills-jump-link)`. The held link then refused
  the jump click, so each context's case stopped there, by name.
- (g) the line back in the hint style: 168 failures, e.g. `#1984 web light 1280 hc-light on color-fills: the line is the
  studio's boxed note (p3-sg-note p3-sg-warn, RX2 A) with its own warning glyph (RX3 A), text at 4.5:1 and glyph at 3:1
  on its own ground ({"classes":false,"glyph":true,"opaque":false,"text":3.81,"icon":3.81})`.

One full `test:chrome` run also timed out once in #2194's Light-mode Type case, which never touches a derived mode. Run
on its own it passed 20/20 on both hosts, so it was load. #2285 (section 33) and #2298 (its 33, renumbered here to 34) landed first, so this one is 35.

### Moved cases

- **Q61's Pair button and every Q59 page case** read `:disabled` instead of the property. That reads the same either way
  now, and it is what the X4 A sweep reads.
- **Their line checks** read `levers-derived-note` and the new copy.
- **TY2 A's hint-line floor** fell from 16 to 2. The derived lines it counted (`.p3-state-hint`, repeated in each
  Surfaces & fills row list) are gone, and the new line is a note, not a hint. Measured.

Found on the way, not fixed here: at 380 the Surfaces & fills levers overflow their pane (scrollWidth 454 against 379),
on `origin/main` too. That is #1975, and the measurement is posted there.
