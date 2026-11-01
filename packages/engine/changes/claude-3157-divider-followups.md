---
engine: minor
---
The token-usage report marks a binding key "(not drawn)", and lists it under keysNotDrawn in the JSON, when it shares
its token with a key the projection draws but no member draws it (#3157): Divider's horizontal.line.width and
vertical.line.height (dropped by the grow rule) and vertical.true.width (dropped by the hug) no longer read as bound.
Divider's notes.unverified also names the unmeasured update of a plain vertical member on a file built before #3143.
test.ts gains a case for the sizingWhen-beside-size refusal.
