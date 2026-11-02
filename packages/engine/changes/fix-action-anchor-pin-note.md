---
engine: patch
---
The action-anchor note reports a pinned step (#1894). When `actionPalette` names a brand color and `actionAnchorStep`
pins the step, the decisions log now names the pinned step and says it is applied exactly, instead of the brand
color's auto-placed step and "moved only if it misses…". The pin itself was already applied exactly; only the note
was wrong. Without a pin the note is unchanged. No token or committed artifact moves, so CONTRACT is unchanged.
