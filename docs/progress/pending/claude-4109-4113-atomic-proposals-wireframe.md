## (2026-11-19) — Skeleton, Avatar, Toggle button and Image wireframe, for the owner (#4109, #4110, #4112, #4113)

**What.** A DRAFT wireframe, `docs/superpowers/4109-4113-atomic-proposals-wireframe.html`, draws the four atomic
proposals filed from #4001 (Q-AT2) before the owner review. It follows the #4001 Menu, Popover and Tooltip
wireframe: gray boxes for parts, axes and set members, light and dark with a theme toggle, an RTL toggle, and a
reduced-motion toggle that also follows the system setting. Every owner decision (OD-S1 to S7, OD-A1 to A8, OD-T1 to
T5, OD-I1 to I9) carries an `OD-xx` tag on the recommended option, and a decision index at the foot links all 29.
Nothing is decided and nothing is built: no engine, plugin or skill change.

**Live demos.**
- Skeleton pulse and shimmer on one `motion.duration.sweep` cycle; under reduced motion the animation stops and the
  still shape stays.
- A region reload that shows OD-S7: the shapes are hidden, the region sets `aria-busy` and one status message is written.
- Toggle button `aria-pressed` by Space and Enter on native buttons, with the transient press beside the selected look.
- Image empty → loading → loaded, or loading → error. The loading state nests the same Skeleton (OD-I4), so it
  pulses, shimmers or stops with the Skeleton picker. Only a loaded or failed image carries `role="img"` and its
  name; empty and loading carry no role, so the demo is never a nameless image (review fix).

**Values are copied, not derived.** Where a proposal names a token, the page uses the example brand's emitted value
from `packages/engine/out/prism3.tokens.json`, in both light and dark (resolved through each role's `modes`
extension). Anything with no named token is marked "stand-in": Button's medium height, the initials font sizes, and
Badge's dot tone. The initials contrast quoted on the page (14.0:1 light, 15.0:1 dark, `text.primary` on
`background.tertiary`) is computed from those values.

**Something to note for the review.** With OD-S4 A, the skeleton fill (`background.tertiary`) sits one step
darker than Image's empty fill (`background.secondary`), so loading and empty read as different states. Under
OD-S4 B they would look the same. The page shows both grounds side by side.
