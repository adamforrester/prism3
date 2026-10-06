## (2026-10-05) — Components: the plugin's build bar stands clear of the Activity drawer (#2180)

**Status:** branch `ui/2180-buildbar-gap`. One rule in `apps/studio/src/chrome.css` (`.p3-buildbar`), and `test:chrome`. No ENGINE bump (no emitted artifact moves). CONTRACT unchanged. No new copy. **Fixes #2180.**

### What changed

The build bar on Components (S8.2, owner decision C4 A; plugin only) is `position: sticky` in the preview's scroller, and it had `bottom: 0`. The preview's bottom edge is the Activity drawer's top edge, so the bar sat flush on the drawer's collapsed strip. With the drawer open at 1280, the bar sat flush on the open drawer instead.

Now its sticky offset is `bottom: var(--p3-space-300)`. That is the chrome's stacked-card gap, the gap `.p3-stack` and `.p3-preview-stack` put between cards (`space.300`, 24px). The bar moves up with the drawer because it is stuck to the preview's edge, so the gap holds in every state:
- 1280 closed: 24px;
- 1280 open: 24px;
- 380 closed: 24px;
- 380 open: no bar is drawn. The open drawer is the full-pane sheet (F2), and it hides the panes.

At the end of the scroll the bar is back in the flow. At 1280 the stack's own bottom padding (`space-400`) already gives more than the gap. At 380 that padding is `space-150`, so the sticky offset lifts the bar 12px into the space above it. The last set still ends above the bar, which the C4 test checks.

The Activity drawer itself is untouched.

### Test, in `test:chrome`

A new block covers the plugin at 1280 and 380, with the drawer closed and open. The closed drawer is its strip: the block runs the bar's own Build first, because a drawer with no operation is hidden. The block reads three scroll positions: top, middle and end. The oracle is `space.300`, resolved from the committed emission through `chrome/tokens.mjs`, never the page's `--p3-*` variable. The gap is the drawer's top edge minus the bar's bottom edge, read off the render.

At 380 with the drawer open, the block asserts that the sheet is shown and the bar is not drawn.

### Mutation, failing by name (`wip:` commit first)

**`bottom` back to 0:** 7 of 15 fail. The first is `#2180: figma 1280, drawer closed, at the top: the build bar stands at least space.300 (24px) above the Activity drawer — gap 0.0 …`, and 380 closed at the end reads `gap 12.7`.
