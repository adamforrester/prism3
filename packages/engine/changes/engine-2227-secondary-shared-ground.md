---
engine: minor
---
The Figma color emission names a ground when a declared `secondary` lands on a step another ground also takes,
instead of throwing (#2227). A page `secondary` on the step of `base`, `tertiary` or an inverse tier left the
floor step aliased by two grounds, and `figmaArtifacts` threw "… which 2 page grounds alias …", so
`export_theme` with `include: ["figma"]` returned -32603 and the plugin's apply failed. The Figma line now
names the first of `background.secondary`, `background.primary`, `background.tertiary`, then the inverse
tiers, that sits on the floor step. The grounds are one color in light, so the line stays true. No committed
artifact moves; a floor step that no ground sits on is unchanged here and waits on #2227's refusal.
