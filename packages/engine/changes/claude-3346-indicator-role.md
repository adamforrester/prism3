---
engine: minor
---
The selection mark gets its own role (#3346, owner Q1 revised A, E1 A and E3 A, 2026-11-03). Every interactive family
now emits `interactive.<c>.indicator.{rest,hover,pressed}`, on the page and the inverse band: the shape that marks a
control as selected or on, holding the label's color as resolved. The tab's selected bar, the radio's checked ring, the
tag's selected outline, the switch's off thumb and the slider's disc bind it instead of `interactive.*.border.*`, so an
outline-edge setting can never reach them, and no shape binds a text role. A label override now carries to the
matching `.border.<state>` and `.indicator.<state>` (`withIndicatorTwins`), unless that role is overridden itself; a
border override never reaches the indicator. Under Tag style Underline the unselected line keeps
`interactive.primary.border.*`. No existing token value moves in any example brand; on the reference brand's master
input the selection marks turn near-black, and its outline edge's hover and pressed now match the label.
`CONTRACT_VERSION` 14.14.0: 18 added paths.
