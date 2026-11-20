## (2026-11-19) — Popover: a non-modal panel anchored to its trigger (#4008)

**What.** A new component, `popover`, built from the proposal on #4008 with every OD at its recommendation and the
KB conflicts as the owner resolved them in Q-FL2 (2026-11-19): K4 B (the aliases `overlay` and `flyout`), K5 B (a
read-only popover leaves focus on its trigger) and K8 A (an owned, dependency-free positioning layer for the POC).
It is Dialog's arrangement made smaller: a header with the title beside a small FlushIconButton.Neutral close button,
the body as a native slot that clips and scrolls, and an optional nested Button group footer. It sits on the raised
surface (`color.foreground.raised`, a hairline `color.border.secondary` edge, `shadow.lg`, `radius.lg`), which
Menu will bind too (OD-X1 A); `test.ts` pins the five roles to the proposal's literals now and will hold Menu's equal.

**Trap: the engine cannot project a set with no axes.** OD-P2 A gives one member and no axes, and no def had ever had
zero: `checkAnatomySet` refuses a member with no coordinate, by design (#795). This build gives the one member a
one-value axis, `placement: [bottom]`, the default side, joined to `lint-axis-values` as a subset of Dialog's word.
The owner kept it (2026-11-19), rather than an engine and executor change that builds an axis-less def as a plain
component.

**Decided by the owner (2026-11-19, on the PR), all as recommended.**
- The one-value axis above.
- The built width: 320px, between the proposal's 240px floor (Figma's min width) and 360px cap (code only).
- The brief's extra props `trapFocus` and `modal`: left out, because a trapped popover is a Dialog.
- `motion.duration.fast` stays, though it is 100ms on the reference brand, under the briefs' 120–180ms range.
- The page: Popover has its own page under Components, beside Dialog.
- The placeholder copy is approved.
- S1 A: a read-only popover (the toggletip case) announces its content through a polite live region
  (`role="status"`) and sits right after its trigger in the DOM. `aria-controls` is no longer the stated way in,
  because most screen readers do not announce it. A named arm in `test.ts` holds it.

**Tooltip (#4251).** Popover keeps `tooltip` in `composition.planned` until Tooltip is registered. The owner decided
the two list each other in `alternativeTo`; that has to be symmetric, so the swap lands with whichever PR merges
second.

**The motion preset is not built.** The Popover / open and Popover / close pattern (OD-X5 A) is written into the
`motion` field and `codeOnly` as token roles, but the #2857 starter set exists only as a wireframe, so no preset
code exists to extend, and no open PR carries "Popover / open".
