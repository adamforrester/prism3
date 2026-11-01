---
engine: patch
---
The Activity drawer's closing slide plays only when an open drawer closes (#3217). It used to play at boot, and on every
narrow-to-wide resize, under a drawer that was already closed. It moved 0px, so nothing showed, but every settle-wait
waited for it. The plugin's verdict harness now waits for the drawer's motion with the capped wait the smoke harnesses
use, and fails by name if the cap trips. No committed artifact, token or projected component surface moves, and
CONTRACT is unchanged.
