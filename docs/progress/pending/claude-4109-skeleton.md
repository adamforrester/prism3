## (2026-11-19) — Skeleton: the content-shaped placeholder (#4109)

Built from the #4109 proposal with all seven owner decisions at A (OD-S1 to OD-S7, 2026-11-19; Q-AT2 on #4001), drawn in the
#4148 wireframe. One `skeleton` def with a `shape` axis [text, circle, rect] and a `size` axis [medium, small] on text only
(`excludeCoordinates`), so four members. No token minted; `CONTRACT_VERSION` unmoved; engine minor by change note.

### What the build had to decide, and how

- **One surface in pieces.** The three text bars and the circle/rect `block` all paint `fill` (`color.background.tertiary`).
  The #933 rule refuses two boxes on one slot unless they share a `paintGroup` (#3051, Divider's precedent), so they do.
- **The circle is the rect's `block`, fully round,** as the proposal's anatomy table drew it: one part present at circle and
  rect, its radius keyed `{shape}.radius` (text → `radius.sm` for the bars, rect → `radius.md`, circle → `radius.round`).
  Splitting it into two parts failed `builtSize`: only one part can grow down the built root.
- **The bar height (OD-S5 A).** Figma binds a variable, not an expression, so "two thirds of the line box" is a fixed
  `space.050` inset above and below the bar, off `densitySpacing`: 16 of 24 at medium, 13 of 21 at small (0.62).
- **The stepped widths.** Auto layout has no percentage width. The first bar grows; the second and third are literal
  `minWidth` floors at 80% and 40% of the 320 build width (256, 128). A resized instance keeps those two at pixel width.

### Held for the owner (in the PR)

- **The circle is not aspect-locked** (OD-S6 A asked for the Image placeholder's lock). `aspectRatio` reads its ratio off a
  `W:H` axis, and `shape` is not one. A lock on an inner box that binds its width does not help either: resizing the
  instance resizes the root around a circle that stays bound. Tried and reverted: a literal `aspectRatio: '1:1'` on a
  bound inner box. A root lock at one member is a schema change.
- **The Figma page:** provisionally Subcomponents, beside Spinner and Image placeholder.
- **Control shape:** recorded as outside (`OUTSIDE_REASON`), since a host passes the content's radius.

### Traps

- The size ladder is `[small, medium]` in `props` and `[medium, small]` in `variants` (Q1 B); `lint-rung-names` reads the
  props order as the ladder and fails an inverted walk.
- The KB brief was read only as the proposal quotes it: this lane had no knowledge-base checkout.
