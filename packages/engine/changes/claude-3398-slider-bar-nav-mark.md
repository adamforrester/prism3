---
engine: minor
---
Slider's selected bar binds `color.interactive.neutral.indicator.rest`, the thumb's selection mark, instead of `color.interactive.neutral.border.rest`, and the Studio nav-item preview's indicator binds `color.interactive.primary.indicator.rest` instead of `color.interactive.primary.border.rest` (#3398). Both are marks, so a brand's outline-edge setting will not reach them. Tag Underline's unselected line stays an edge on `interactive.primary.border.*`. Values are unchanged today, because each indicator role resolves to the same color as the border it replaces.
