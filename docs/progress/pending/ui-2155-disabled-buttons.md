## (2026-10-06) — Chrome: a disabled button takes Prism3's disabled button skin, no disabled control answers hover, and the exemption canaries copy every style (X4 A, Q28 a; #2155, #2154, #2174)

**Status:** `apps/studio/src/chrome.css`, `apps/studio/chrome/spec.mjs`, `test:chrome`, `test:smoke` and the plugin's `test:start`. No engine change, no emitted artifact moves, no ENGINE bump, and `CONTRACT_VERSION` is unchanged. No new copy. Visible: every disabled chrome button changes from the dashed "can't change" edge to Prism3's disabled button for its appearance, and no disabled control changes under the pointer.

### The owner's decisions

- **X4 A (#2155).** A disabled button in the studio chrome follows Prism3's own disabled button styling, the way F1 A (#2152) did for the text field.
- **Q28 a (#2154).** A disabled control, `[disabled]` or `[aria-disabled="true"]`, shows no hover change, whatever its kind. #2143 had done this for text fields only.

### The skin, read from the engine's definitions

`packages/engine/components/button.ts` binds one cross-cutting disabled block. The projector (`anatomy-figma.ts`) paints the fill only where the appearance has a fill at rest, the edge only on `outline`, and the on-fill ink only over a disabled fill (#784). `icon-button.ts` binds the same block for its `ghost`. `button-destructive` shares the block, so Discard is drawn the same as a filled button. Per appearance the chrome uses:

| Appearance | Chrome buttons | Fill | Edge | Label | Glyph |
|---|---|---|---|---|---|
| filled | Apply Theme, Continue (`.p3-next`), Start from this color, Discard | `disabled.fill` | none | `disabled.on-fill` | `disabled.on-fill` |
| outline | every page-colored `.p3-btn`, the value picker's values | none | `disabled.icon` (#1349) | `disabled.text` | `disabled.icon` |
| text | every ghost button, the mode check | none | none | `disabled.text` | `disabled.icon` |

- **Reused and added.** `--p3-disabled-fill` and `--p3-disabled-ink` (#2152) match the filled roles, so they are reused. `--p3-disabled-edge` reads `disabled.border`, which a button never binds (#1349 moved the button's edge to `disabled.icon`). So there are two new rows, `--p3-disabled-text` (`color.disabled.text`) and `--p3-disabled-icon` (`color.disabled.icon`). Both are in `INACTIVE`, and the build's `INACTIVE_ROLE` check accepts them as `color.disabled.*` roles. In the default theme `text` and `icon` resolve to the same value (neutral 450 light, 550 dark). They are still two rows because they are two roles.
- **The rules.** One block sits at the end of `chrome.css`, keyed on `:is(:disabled, [aria-disabled="true"]):not([aria-busy="true"])`. A running write's control is `aria-disabled` and `aria-busy`. It is pending, not disabled, so it keeps its look (S11). The block is last so it wins over a state rule of the same weight, such as a chosen chip or a set picker. Everything inside the button inherits the label ink, and every glyph takes the glyph role.
- **Removed.** `.p3-btn[disabled]`'s dashed edge, `.p3-btn-primary[disabled]`'s page fill, the dashed edges on `.p3-mcheck[aria-disabled]` and `.p3-vpick[aria-disabled]`, and the dashed box of a locked mode check. A locked mode check's box now takes Prism3's disabled check box (`checkbox-control.ts`: `disabled.fill`, `disabled.border`, the mark on `disabled.on-fill`). A disabled switch's dot takes the glyph role.
- **Hover.** Every `:hover` rule in `chrome.css` now carries `:where(:not(:disabled, [aria-disabled="true"]))`. It adds no weight, so the cascade is unchanged. The color field is a group, so it uses `:not(:has(…))`. `.p3-menu-item[disabled]:hover`'s reset is gone because its rule is now limited the same way.

### The contrast exemption, extended to buttons (all three suites, each with its own oracle)

The disabled button label sits under the text floor on purpose: about 3.9:1 in light and 3.5:1 in dark for outline and text, and about 3.0:1 on the disabled fill. As with #2152, a node is exempt only when it is, or sits inside, a control that is `:disabled` or `aria-disabled="true"`, and only when it is under its floor. Each exempted button is asserted, by name, to be:
- **disabled to assistive technology.** In `test:chrome` this comes from the accessibility tree. A control under an open window (S12's guard over Import) counts when the tree drops it as inert. In smoke and start it means the disabled property or `aria-disabled`.
- **inert.** It takes no focus. An `aria-disabled` control keeps its focus stop on purpose (the mode check, a matrix check, a refused picker value), so for those, activating it with `click()` must change nothing. In `test:chrome` that covers the control, what the page stores, the place, and which windows are open. In smoke and start it covers the control and what the page stores.
- **drawn in its appearance's roles.** This covers its fill, its edge and its ink. It also covers the ink of every label (and, in `test:chrome`, every glyph) the audit exempted inside it. The values come from the committed emission. Which appearance a control has is read from its element and classes. That only picks the skin to expect. It never grants the exemption.

**Counted, with floors:**
- `test:chrome` exempted 788 nodes in 60 of 286 probes. These were Surfaces & fills' 31 paired icon rows (disabled in Light by design), Layout's first breakpoint field, the step picker's Return to Auto, and Import on every S12 probe. S12 now fails a first run that did not exempt Import.
- `test:smoke` exempted 2589 labels in 39 states across 27 controls, and every brand must exempt one.
- `test:start` exempted 8 labels in 8 states. Every start moment must exempt Import, because the paste box is empty there.

### The canaries copy every computed style (#2174)

In each suite, every canary (the field one from #2152, and a new button one) is now a copy that is not disabled. It carries, inline, every computed style of the real disabled control and of each element inside it, and it keeps the class and the hook too. Only `:disabled` / `aria-disabled` tells the two apart. The canary must be:
- planted live;
- left with no computed style different from the original, apart from the size its place in the row gives it, the origins that follow from that size, and two serializations (`text-decoration`, `app-region`);
- measured, under its floor, and exempted nowhere.

Where the button canary is planted:
- `test:chrome`: S12's Import, on both hosts, both themes, both sizes.
- `test:smoke`: the first disabled chrome button each brand draws. That is Surfaces & fills' first paired icon row.
- `test:start`: Import at the start moment.

### The new tests (`test:chrome`, "X4 A, Q28 a")

1. **Every appearance, on a real control, on both hosts and in both themes.**
   - The controls: Import (outline, disabled by the app), Start from this color (filled), the search glyph (text, an icon button), Close (text), and the guard's Discard (destructive).
   - Each is switched off the way the app does it and must draw exactly its appearance's roles, draw no dashed edge, and change nothing on hover.
   - Switched back on, each must answer hover (the control arm).
   - The screenshots are `2155-{web,plugin}-{light,dark}-{outline,filled,text,text-icon,destructive}.png`.
2. **Q28 a, every kind.** One control of each of 15 kinds is found on the page, with the first one drawn and not chosen. The kinds are: button, picker button, filled button, ghost button, add row, chip, check, matrix check, switch, segmented tab, select, color field, text field, picker step and picker value. Each is hovered on and then off, on both hosts in both themes. Off, it must change nothing on itself or inside it and draw no dashed edge. On, it must answer hover. A kind that is not found fails by name.
3. **Every control a derived mode switches off.** In HC light, every place, both hosts and both themes, the test reads 438 disabled controls, 312 of them buttons (floor 100). No disabled control may draw a dashed edge, and every disabled button must draw its appearance's roles.

### Mutations, each in its own detached worktree at the `wip:` commit, so the branch's working tree was never written

- **M1, the dashed edge put back** (the skin rule's `border-style: solid` → `dashed`): `test:chrome` 884 failures. Among them, on both hosts and both themes:
  - `✗ X4 A: web light: the disabled Import (start-import) draws no dashed edge — p3-btn p3-btn-page p3-start-go top dashed, …`;
  - `✗ X4 A derived: web light: no disabled chrome control draws a dashed edge (438 read) — color-fills surface-base-pick: …`;
  - `✗ Q28 a: web light: a disabled chip (personality-word) draws no dashed edge — …`;
  - `✗ S12 web light 1280 / start: the exempted button[start-import] "Import" draws Prism3's disabled outline roles for light: … drew {"fill":"none","edge":"4 side(s) #808284 dashed",…}`.
- **M2, a disabled button colored with the wrong role** (the outline edge on `--p3-disabled-edge`, `color.disabled.border`, instead of `--p3-disabled-icon`):
  - `test:chrome` 820 failures, for example `✗ X4 A: web light: the disabled Import (start-import) draws Prism3's disabled outline button: … (want fill none, edge #808284, …; drew {"fill":"none","edge":"#c0c1c2",…})` and `✗ X4 A derived: web light: every disabled chrome button draws its appearance's Prism3 disabled roles (312 read) — color-fills surface-base-pick (outline): …`;
  - `test:start` 8 failures, `✗ light scheme / Figma light / start screen: the exempted "Import" in start-import draws Prism3's disabled outline roles for the light chrome (want fill none, edge #808284, ink #808284; drew {…"edge":"#c0c1c2"…})`.
- **M3, hover allowed on a disabled chip** (an unlimited `.p3-btn.p3-chip:hover` rule after the skin): `test:chrome` 4 failures and nothing else, `✗ Q28 a: web light: a pointer over a disabled chip (personality-word, on brand) changes nothing (Q28 a)`, on both hosts and both themes.
- **M3b, #2154's own mutation, one kind's hover rule without its limit** (`.p3-select:hover`): `test:chrome` 4 failures and nothing else, `✗ Q28 a: web light: a pointer over a disabled select (family-select, on type) changes nothing (Q28 a)`, on both hosts and both themes.
- **M4, the exemption re-keyed on `cursor: not-allowed`** (each suite's predicate, the field one and the button one): only the canaries fail, in every suite.
  - `test:chrome` 12: `✗ S12 web light 1280 / start: the exemption canary, a button with every computed style of the disabled Import … — {…"exempted":…}` (8: both hosts, both themes, both sizes) and `✗ web light 1280 / layout: the exemption canary, a field with every computed style …` (4);
  - `test:smoke` 6: `✗ prism3 / color-fills / light: the button exemption canary, a fill-pick with every computed style of the disabled one … — {…"exempted":2,…}` and `✗ prism3 / layout / light: the exemption canary, a field with every computed style … — {…"exempted":true}`, for each of the three brands;
  - `test:start` 8: `✗ light scheme / Figma light / start screen: the button exemption canary, … — {…"exempted":1,…}` and `✗ light scheme / Figma light / Layout: the exemption canary, a field …`, in each scheme × theme.

  #2152's canary, which copied only the class, the hook and six colors, would pass under M4, because the cursor was not copied. That gap is what #2174 named.

### Traps

- **A hover rule on a `.p3-btn` is masked by the skin.** The skin sets `border-color` at the same weight and sits last. So dropping the `:where(:not(…))` limit from `.p3-btn.p3-btn-page:hover` changes nothing that is drawn, and Q28 a's test rightly stays green. M3 therefore adds a chip hover rule *after* the skin, which is what a hover that shows would take. For the kinds that are not `.p3-btn` (select, segmented tab, color field, picker step, text field), the limit is the only guard.
- **Restoring the old `.p3-btn[disabled] { … dashed }` rule alone also changes nothing drawn**, for the same reason: the skin's `border-style: solid` wins. M1 mutates the skin instead.
- **The click check activates in the page (`HTMLElement.prototype.click`), not with a Playwright click.** A pointer would land on whatever is on top, such as S12's guard over Import. It also keeps the hook guard's `.click(` scan meaningful.
- **Held for the owner (#2208).** Brand › Modes' fixed Light row is a `div`, not a control. It still draws the dashed "can't change" box beside the locked checks that now draw Prism3's disabled box.
