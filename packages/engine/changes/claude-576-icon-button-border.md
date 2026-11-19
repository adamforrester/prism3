---
engine: minor
---
"Outline button border" (`buttonBorderWeight`, #576) now reaches the icon buttons too, per the owner's decision on Q6. At `thick`, icon-button, icon-button-neutral and icon-button-destructive, and flush-icon-button and its two siblings, bind `border-width.thick` (2px) on their `border-width` key instead of `border-width.hairline`. So a brand's outline icon buttons and round flush icon buttons match its outline text buttons. Each set keeps its own border color, and `hairline`, the default, changes nothing. A def opts in with the new `levers.buttonBorderWeight: { edge: true }`, which the schema refuses on a def with no `border-width` key. This supersedes the #4074 note's "icon buttons are unchanged". No token is added, so the token contract does not move.
