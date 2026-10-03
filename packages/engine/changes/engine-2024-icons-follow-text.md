---
engine: minor
---
Under iconContrast '3:1', tertiary and -subtle icons follow their text too (#2024, owner 2026-10-03). The
always-carried set in withIconTwins (ALWAYS_TWINNED) gains (inverse.)text.tertiary and
(inverse.)text.<status>-subtle, whose text is held to the same 3:1 floor as an icon: the rule #1982 applied.
That makes 19 icons follow their text while unpaired; the other 12, (inverse.)icon.secondary and the bold
(inverse.)icon.<status>, still derive and edit on their own. An explicit icon override still wins.
Interactive icons were already carried (#1617). No token path moves, so CONTRACT_VERSION does not.
