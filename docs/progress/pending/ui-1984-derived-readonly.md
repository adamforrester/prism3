## (2026-10-07) — Studio: one read-only state for the levers panel in derived modes (#1984)

**Status:** `apps/studio/src/shell/frame.ts` (the read-only region and its line), `chrome.css` (two rules), the seven
per-mode domain modules (their derived lines and disabling loops removed), and `test:chrome` (new section 31, plus the
Q59, Q61, #2179 and TY2 A cases moved to the new model). No ENGINE bump: no emitted artifact moves. CONTRACT unchanged.
Copy: one new line, APPROVED (owner, RO1 A, 2026-10-07). Closes #1984.

### What changed

The owner decided on 2026-10-03 that derived modes (HC light, HC dark, wireframe) get one read-only state for the whole
levers panel instead of disabling each control, and chose N-3 A on 2026-10-05: a panel-level line plus controls that
can't be used. The frame now mounts each page's levers inside a `fieldset` (`levers-region`, drawn as
`display: contents`, `role="presentation"`). On the seven pages that edit the previewed mode (Surfaces & fills,
Interactive, Type, Depth & motion, Shape, Layout, Components; the `derivedReadOnly` flag on their `NEW_PAGES` rows), a
derived mode makes that fieldset both `inert` and `disabled`:

- `inert` takes every control out of the tab order and out of the accessibility tree in one step.
- `disabled` on the fieldset makes every native control under it match `:disabled`, so each keeps Prism3's disabled
  skin (F1 A, X4 A) and the contrast audits' exemption. No control carries its own flag.

The line, "‹Mode› is auto-derived and can't be edited here. Switch the preview to Light or Dark to edit.", is the pane's
first child, outside the region. It uses `modeLabel`'s name (what the mode control shows) and takes programmatic focus
(`tabindex="-1"`). In Light and Dark it is not in the document at all. Brand and Palettes are brand-wide, keep no flag,
and stay editable.

**The diagnosis that made it small.** The page modules mount into the pane once (`host.replaceChildren(root)`) and read
`host.scrollTop` to keep their scroll position across a redraw. So the pane has to stay their `host`. The frame moves the
mounted nodes into the region right after each mount, rather than handing the pages the region, whose `scrollTop` is
always 0 under `display: contents`. A disabled fieldset was the one mechanism the audits already counted as really
disabled: `test:chrome`'s exemption predicate notes "`:disabled` (which also covers a control in a disabled fieldset)".
That kept the skin, the X4 A derived sweep and the exemption unchanged without a new predicate.

**Removed, one source of truth.** Each page's "‹Mode› is auto-derived — read-only…" line (Surfaces & fills drew it in
every row list and in Gradients) and each page's `querySelectorAll(…).disabled = true` loop, plus the per-row
`btn.disabled = derived` and Unpair's flag. `DEPTH_COPY.derived` and `COMPONENTS_COPY.derived` went with them.

**Kept, on purpose:**
- The write-time guards (#2096's refusal in Components' `edit`) stay as defense in depth. The Components Q59 case still
  dispatches a scripted `input` on the held slider and holds the saved brand byte-identical.
- `isDerived` checks that decide what is drawn rather than whether it is disabled: no picker drawn open, no "Editing
  ‹mode›" line, no inline Pair confirm in a derived mode.
- A Custom mode's surface controls stay disabled by `surfaceSourceOf().editable`. That is the custom-mode rule, not a
  derived-mode check.

**What this changes in a derived mode.** Q59 and Q74 kept some controls live in a derived mode: the ⓘ toggletips, the
Show advanced folds, the "way to" links (Shape › Components, Components › Shape), the jump links and Continue. Under
`inert` none of them can be reached, as the issue specifies ("no control in the levers panel is focusable"). A fold
opened in Light stays open, so Individual sizes can still be read. Native buttons among them take the disabled skin.
The jump links are `<a>` and have no disabled skin, so they look live but cannot be used. This was raised with the
owner on the PR.

### The gate (test:chrome section 31, new)

Both hosts, both chrome themes, 1280 and 380. In each derived mode, on each of the seven pages, the gate checks four
things:

- The region is `inert` and `:disabled`.
- A Tab walk from the line, three stops forward and three back, never lands inside the pane.
- CDP `Accessibility.getFullAXTree` holds no control-role node under the pane and does hold the line's text.
- The line reads the literal with the mode's name, sits outside the region, is not under `inert`, and takes focus.

In Light and Dark, the region is live, there is no line, a control takes focus, and the tree holds controls under the
pane, so the tree read cannot pass by reading nothing. The modes, their names, the pages and the line are literals in the
test. Every page × mode pair is counted, so a skipped page fails.

**Mutations,** each in its own `wip:` commit, run on the section with both bundles rebuilt:

- (a) region not inert in wireframe: 128 failures, all wireframe, e.g. `#1984 web light 1280 wireframe on color-fills:
  the levers region is inert and disabled (region true, inert false, disabled true)`, `… a Tab walk from the line
  reaches no control in the levers pane (6 stops — reached a[fills-jump-link], …)`, `… the accessibility tree holds no
  control under the levers pane (pane found true; 298: button "Continue to Interactive", …)`.
- (b) line left out in HC dark: 224 failures, all HC dark, e.g. `#1984 web light 1280 hc-dark on color-fills: the
  panel's line is present and reads "HC dark is auto-derived and can't be edited here. Switch the preview to Light or
  Dark to edit." (0 drawn, read null)`.
- (c) line placed inside the region: 504 failures, e.g. `#1984 web light 1280 hc-light on color-fills: the line sits
  outside the inert region and takes focus (in the pane true, in the region true, under inert true, focus false)`.
- (d) Layout's flag removed: 144 failures, all on Layout, e.g. `#1984 web light 1280 hc-light on layout: the levers
  region is inert and disabled (region true, inert false, disabled false)`.

### Moved cases

- Q61's Pair button and every Q59 page case read `:disabled`, not the `disabled` property, which a fieldset does not
  set. Their line checks read `levers-derived-note` and the new copy.
- Components' "way to Shape left live" became "held with the panel". Type's Show advanced case became "opened in Light,
  still shows Individual sizes, held".
- #2179 reads the floor row's computed accessible name only in Light and Dark. In a derived mode it asserts the pickers
  are out of the tree.
- TY2 A's hint-line floor went from 16 to 9 (measured). High contrast light now draws one line per page where Surfaces &
  fills repeated its line in each row list.

### Trap for whoever re-verifies

`test:chrome`'s contrast exemption (`checkExempt`) still requires the `disabled` property or `aria-disabled`
(`prop: n.disabled`), and a fieldset-disabled control has neither. No audit sweeps a derived mode today, so nothing
fails. If one is added, a held control will fail its exemption until that predicate reads `:disabled`.

Found on the way, not fixed here: at 380 the Surfaces & fills levers overflow their pane (scrollWidth 454 against 379) on
`origin/main` too. That is #1975, and the measurement is posted there.
