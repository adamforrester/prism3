## (2026-10-16) — Toast: a short status over the page after the user's own action, on the inverse surface (#2668, every call A)

Built to the proposal and wireframe on #2668, which the owner approved with every numbered call at its recommendation
(A) on 2026-10-16. One `Toast`, category `feedback`, aliases `snackbar`, `notification`, `flag`, `flash-message`, on
its own `↳ Toast` page under Components. Cites the knowledge base's `components/toast.md` (category Feedback), read
for this build.

### What it is

- **2 members** on an `intent` axis, `neutral | success`, neutral first (the code default, so Figma's first member is
  the code default too). No size axis and no state axis: a toast is not interactive, and its nested controls carry
  their own states and prototype reactions (Q344 applies inside the nested Button and IconButton.Neutral sets, with
  nothing authored here).
- **The card** is the inverse surface, `color.inverse.background.primary`, `shadow.lg` as an effect style,
  `radius.xl`, padding 8 / 16 / 8 (block, inline start, inline end), built 360 wide (`placementWidth`) and hugging its
  height. No border: the card is far above 3:1 against the page in every committed brand × mode.
- **Content:** success adds `check-circle` on `color.inverse.icon.success` at `icon.size.sm`, 12px from the message;
  neutral has no glyph. The message is `type.body.md.default` on `color.inverse.text.primary` and wraps.
- **Controls**, 4px apart at the end edge: the action, a nested Button (text, small, `surface: inverse`), off by
  default and reading "Action" through a nested-instance override; the close, a nested IconButton.Neutral (ghost,
  small, square, `surface: inverse`), on by default, showing the close glyph through a swap override.
- **Figma properties:** `message` ("Status message"), `action` (off), `close` (on). All lowercase (Q345).
- **Code-side, in `codeOnly`:** the `Toaster` region and `toast()` API, the one shared polite live region present
  from app start, no focus steal, placement (bottom center below 768px, the bottom inline-end corner from 768px),
  one at a time with the newest replacing, the timer (6000ms default, 5000ms floor, pausing on hover, focus and a
  hidden window; no timer with an action), F6 in and Escape or Shift+F6 out, `scroll-padding-bottom`, motion.

### The one place this departs from the build brief (held for the owner)

The build brief named "Button / Flush icon button" for the nests. The approved proposal names IconButton.Neutral for
the close and says why not FlushIconButton: it has no inverse surface. That still holds on main:
FlushIconButton.Neutral's glyph is `color.interactive.neutral.icon.rest`, the default-ground ink, dark on the dark
card in light mode. This build follows the approved proposal. Also held: the 8px gap between the message and the
controls (the proposal leaves it open; the wireframe draws 8px), and the action label living on the nested Button
rather than as a Toast text property (a host text property can only drive the host's own text parts).

### Gates

- `test.ts` `#2668` arm: the member list, axes, names and aliases, no danger/warning/info anywhere; the card's width,
  sizing, fill, shadow, radius and padding as literals; the glyph only on success; the message ink; both nests' exact
  variant, visibility and override; the three Figma properties; the code-side behavior stated in `codeOnly`; the
  spacing order at every density; and contrast over every committed brand × mode, read from `out/<brand>.tokens.json`
  as files (light plus each mode under `$extensions.prism3.modes`), never through the def: message 4.5, glyph 3,
  action label rest/hover/pressed 4.5, close glyph rest/hover/pressed 3, focus ring 3, card against the page 3.
- Joined by hand: `lint-hit-target` `EXCLUDED`, `lint-rung-names` `NO_SIZE_AXIS`, `lint-axis-values` (a `sole`
  `intent` set: the axis returns as a variant axis after #1225 retired it from the button families), `lint-paint`
  `PROVENANCE_EXCEPTIONS` (`color.inverse.icon.success` carries `success` one segment later than the rule reads),
  `lint-paint-placement` both sets, `lint-glyph-geometry` `MUST_COVER` and `FIXED_GLYPH`, `test.ts` spacing tables and
  `GATED_EXPECTED`, the plugin taxonomy. Dialog, Badge and Spinner drop `toast` from `planned` (the component-refs arm
  fails a registered id there).
- One more committed artifact (`out/components/toast.md`), so `EXPECTED_ARTIFACTS` and the CI check move together.

- `apps/plugin/test-update-apply.ts` corpus arm: Toast is the first def whose nested instance carries a swap
  override (`icon/close`). The arm's fixture file held only the components a plan nests or swaps to itself, so the
  update refused the set ("component the plan swaps to is not in this file: icon/close") and both members stayed
  "to update". A real file holds the icon set; the fixture now holds each def's override swap targets too. The arm
  still re-applies every def.
- `CANVAS_FURNITURE` (the set labels, #2502) lists Toast, and `test-canvas-furniture.ts` `rollout/switch` counts 40
  sets; its fixture file holds override swap targets for the same reason as the update corpus.
- The padding keys use the corpus spelling, `pad-y` and `pad-x`, so the studio's set list shows Toast's padding and gap
  as it does a field's, and `test.ts`'s spacing-order scope arm finds Toast and holds it to a bare rule (gap and
  glyph gap under `pad-x`). `pad-end` and `glyph-gap` are classified hidden in the studio's C2 list.
- `test-chrome.mjs` probed `radius.xl` as the radius no component binds; Toast binds it now, so the probe is
  `radius.lg`.
- Generated with the def: the studio's used-by index and component catalog, and the ecosystem data's
  component-defs list (`lint-ecosystem`).

### Trap for whoever re-verifies

`lint-axis-values` reads the corpus through `git ls-files`, so an untracked new def file is invisible to it and the
gate passes over a def it never saw. `git add` the def before trusting a green run there.

### Deferred, filed

The proposal's canvas furniture (a 360 × 640 phone frame with the toast bottom center and a desktop frame with it in
the corner, like Dialog's scrim) is plugin work and is filed as its own issue rather than built here.
