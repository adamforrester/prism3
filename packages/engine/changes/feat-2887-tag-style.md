---
engine: minor
---
Tag style lever (#2887, owner decisions Q513 1–8 and Q540). A new Form lever, `tagStyle`: "Tag style", Pill / Underline,
default Pill, right after Field style. Under Underline every tag draws one line under itself: the bottom side only
(`strokeEdges`), 1px (`border-width.hairline`) on an unselected tag at rest, focus-visible and disabled, and 2px
(`border-width.thick`) on hover, pressed and every selected state, in `interactive.neutral.border` unselected and
`interactive.primary.border` selected. Focus adds the ring and keeps the line weight. Square corners (`radius.none`)
and no fill in any state (no wash, no selected tint). The height becomes a `minHeight` at the same rung, so the hit
target holds, and the content row sits at the bottom on a new component-local key, `size.{size}.underline.inset`
(`space.050 / 075 / 100`, the same at every density), with the label row held at the glyph's height; the × slot keeps
its square and sits its glyph on the same inset. Applied to the def before projection by `applyTagStyle`, the identity
under Pill: every Pill plan is byte-identical, and the Underline set keeps the 45 members and every layer name, so Update
redraws it in place. `minWidthRatio` now also takes a bound `minHeight` as its base. Tag's codeOnly names both styles.
No token is added or renamed, so CONTRACT is unchanged.
