## (2026-10-05) — Chrome: a disabled text field takes Prism3's disabled skin, and the contrast audit exempts inactive controls (F1 A)

**STATUS: branch `ui/disabled-field-prism3`.** UI, build check and tests only. No engine change, no emitted artifact moves, no ENGINE bump, and `CONTRACT_VERSION` is unchanged. No new copy. Replaces #2120's dashed edge on the fixed text field, and its test.

**The owner's decision (2026-10-05, F1 A).** A disabled text field in the studio chrome follows Prism3's own disabled field styling exactly. The studio's contrast audit exempts disabled controls, as WCAG 2.2 does: SC 1.4.3 and SC 1.4.11 both exempt a component that is not available for user interaction.

**The skin.** Re-checked in `packages/engine/components/text-field.ts`: the disabled state binds `color.disabled.fill`, `color.disabled.border`, and the on-fill ink `color.disabled.on-fill` for its label and glyph. It does not use `disabled.text`, because the field always has a fill. It sits on no surface, so it uses no `inverse.*` set. Three new chrome variables read those roles in both themes: `--p3-disabled-fill`, `--p3-disabled-edge` and `--p3-disabled-ink`. They are rows in `chrome/spec.mjs` `PRODUCT_VARS`, and none of them resolves through a `BRAND_RE` path (neutral 200 / 550 in light, 750 / 450 in dark). `.p3-text-input:disabled` now draws them. The dashed edge is gone, and the `not-allowed` cursor stays.

**The build's `[pairs]` check.** These three variables are in no `PAIRS` entry, so they would fail "a mapped color in no declared pair". A new `INACTIVE` list in `spec.mjs` exempts them from that one rule only. The build refuses an `INACTIVE` name that maps no row, and one that reads anything but a `color.disabled.*` role in either theme. That pattern, `INACTIVE_ROLE`, is typed in `esbuild-plugin.mjs` rather than in `spec.mjs`, so the list that grants the exemption cannot also define what qualifies for it.

**The audit's exemption (`test:chrome`).** The rationale is in the file header and above `checkExempt`.
- **Who qualifies.** The probe marks a measured text node, field value or edge as off when it is, or sits inside, a control that is `:disabled` or `aria-disabled="true"`. It never goes by class name or hook. A node is exempt only if it is off and also measures under its literal floor. A disabled control that clears its floor is not counted.
- **What each exempted node must still pass, by name:**
  - The browser's accessibility tree (CDP `Accessibility.getPartialAXTree`, independent of the DOM predicate) reports it disabled, and it carries the `disabled` property or `aria-disabled`.
  - `focus()` does not take, and a scripted edit (focus, then typing) changes neither its value nor `localStorage`. So an `aria-disabled` control that keeps its focus stop does not qualify. Nothing in the chrome needs one to today.
  - Its fill, its four solid edges and its ink equal `color.disabled.fill`, `.border` and `.on-fill` for the chrome theme drawn (read from the root's `color-scheme`). The values come from `PRISM3_DISABLED`, which resolves the committed emission in Node, never the studio's CSS or `spec.mjs`.
- **Counted.** Each run prints how many nodes it exempted, per probe. This run exempted 4 nodes in 4 of 262 probes: the first breakpoint field on Layout, web and figma, light and dark, in section 2's place sweep.
- **The floor.** Section 2 fails a Layout sweep that exempted zero nodes or did not exempt `bp-input`.
- **The canary.** Section 2 also plants, beside the field, a copy that is not disabled but keeps its class, its hook and, inline, its exact colors. The copy must be measured, must not be exempted, and must fail 4.5:1.

**The same rule in `test:smoke` and the plugin's `test:start`.** The first full `npm run verify` failed two gates that #2143's notes did not name. Both suites have their own form-control walk, and both measure the same field: 18 failures in `smoke` (every brand's Layout field, plus every field Layout and Type lock in HC light and HC dark) and 4 in `plugin-start` (Figma's Layout tab, both schemes and both themes). Both walks now carry the rule, each with its own copy of the oracle. A chrome field (never a specimen) is exempt only if it is `:disabled` or `aria-disabled` and also under its bar. Each exempted field is asserted, by name, to be disabled, to take no focus, and to draw the three Prism3 roles from the emission. The accessibility-tree read stays in `test:chrome` only. Each suite also has:
- a floor: every brand's Layout sweep in smoke, and every Layout tab measured in `test:start`, exempts `bp-input`;
- the same canary;
- a printed count: smoke 44 fields in 18 states, `test:start` 4 in 4.

**The replacement for #2120's test (`F1 A: Layout: …`).** On both hosts and both chrome themes, the first breakpoint field's computed fill, edge (all four sides, solid) and value ink must equal the emission's Prism3 disabled values, and no editable breakpoint field may take any of them. Given a screenshot directory, it saves the breakpoint list as `f1-{web,plugin}-{light,dark}.png`.

**Mutations,** each run in its own detached worktree at the `wip:` commit, so the branch's working tree was never written:
- **(a) The field not disabled, its colors kept.** In `layout.ts`, `t.el.disabled = true` was commented out, and the CSS rule was keyed on `[data-fixed="true"]` as well. 22 failures. Among them, on both hosts and both themes:
  - `✗ web light 1280 / layout: every chrome field inks its value at 4.5:1 — input[bp-input] "sm, px" 3.05:1`;
  - `… every control edge and indicator clears 3:1 — edge input[bp-input] "sm, px" 1.8:1 < 3`;
  - `… the contrast audit exempted 0 disabled node(s) …`.
- **(b) The exemption widened to a class-name match.** `|| n.classList.contains('p3-text-input')` was added to the probe's predicate. 4 failures, all the canary, for example `✗ web light 1280 / layout: the exemption canary, … is not exempted and fails 4.5:1 — {"planted":true,"measured":true,"r":3.05,"exempted":true}`. Without the canary this mutation passes green, because every enabled field clears its floor and so is never exempted.
- **(c) The ink on `disabled.text` instead of `disabled.on-fill`.** This was changed in `spec.mjs`. 8 failures:
  - `✗ web light 1280 / layout: the exempted input[bp-input] "sm, px" draws Prism3's disabled roles for light: … ink color.disabled.on-fill #67696b (drew {… "ink":"#808284" …})`, on both hosts and both themes;
  - `✗ F1 A: Layout: web light: the fixed first breakpoint field draws Prism3's disabled text field …`, on both hosts and both themes.

- **(b) and (c) on `test:smoke` and `test:start`,** each in its own detached worktree:
  - The class-name widening in both walks gives the canary only, by name: smoke 3 (`✗ prism3 / layout / light: the exemption canary, … {"planted":true,"measured":true,"ratio":3.06,"exempted":true}`, once per brand) and `test:start` 4 (`✗ light scheme / Figma light / Layout: the exemption canary, …`).
  - The `disabled.text` ink gives the color arm on every exempted field: smoke 44 (`✗ prism3 / layout / light: the exempted field input.p3-text-input [text] "0" draws Prism3's disabled roles for the light chrome: …`) and `test:start` 4.

### Traps
- **The exemption is decided against the floors in Node, not in the page.** `exemptOf` and `check` both read `TEXT_MIN` / `LARGE_TEXT_MIN` / `NONTEXT_MIN`. The probe only says which nodes are off, so a probe change cannot quietly decide what passes.
- **#2143 (`ui/disabled-field-focus`) merged while this was in flight.** Its rule, `.p3-text-input:hover:not(:disabled)`, sits next to this one. Its `test:chrome` block ("a pointer over the disabled first breakpoint field changes nothing") conflicted with this PR's replacement of #2120's test in the same place. The merge keeps both blocks, one after the other.
