---
engine: minor
---
Toast (#2668, the owner's approved proposal, every numbered call A): a short status message over the page after the
user's own action. 2 members on a new `intent` axis, `neutral | success`, neutral first; no size and no state axis. The
card is the inverse surface, `color.inverse.background.primary`, with `shadow.lg` as an effect style, `radius.xl`, and
padding `space.100` block, `space.200` inline start and `space.100` inline end, built 360 wide and hugging its height.
The message is `type.body.md.default` on `color.inverse.text.primary`, wrapping; success adds the `check-circle` glyph (part `checkCircleGlyph`)
on `color.inverse.icon.success` at `icon.size.sm`, 12px from the message, and neutral has none. At the end edge, 4px
apart: an optional action, a nested Button (text, small, `surface: inverse`, off, reading "Action"), and the close, a
nested FlushIconButton.Neutral (flush, small, `surface: inverse`, on, the close glyph; Q386). FlushIconButton gains a
`surface` axis, `default | inverse`, appended last, which changes the glyph ink only. Figma properties: `message`, `action`,
`close`. Placement, one-at-a-time replacement, the timer (6000ms default, 5000ms floor, pausing on hover, focus and a
hidden window; no timer with an action), the live region and the F6 route are code-side, stated in `codeOnly`. Dialog,
Badge and Spinner drop `toast` from their planned lists. No new tokens; CONTRACT is unchanged.
