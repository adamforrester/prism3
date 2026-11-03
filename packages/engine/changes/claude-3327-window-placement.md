---
engine: patch
---
Plugin: Minimize parks the strip at the canvas's lower right, 16 px in from the right and the bottom, and Restore brings the full window back centered over the visible canvas (#3327). Each placement is computed at the moment of the toggle from `figma.viewport.bounds` and `figma.viewport.zoom` and applied with `figma.ui.reposition`; a window the user drags stays where it is until the next toggle. The 16 px margin is a starting value to be tuned in real Figma: a plugin cannot see Figma's bottom toolbar, so on a canvas too narrow for the toolbar and the strip side by side the strip overlaps it. No emitted artifact, token or projected component surface moves, and the executor is unchanged.
