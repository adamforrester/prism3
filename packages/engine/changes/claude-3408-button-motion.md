---
engine: minor
---
Button, Button.Destructive and Button.Neutral bind their state transition and their press to motion tokens (#3408, owner
Q146 A), instead of naming them only in prose: `motion.state` / `motion.press` → `motion.duration.fast`, both easings →
`motion.easing-role.default`, and `motion.state-reduced` → `motion.duration-reduced.fast`. The press's 0.98 scale is not
a timing and no token holds it, so it stays in the def's motion prose, which now says the press runs on the same
duration and curve. The `notes.unverified` line saying no motion token is bound is removed.
