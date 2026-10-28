---
engine: patch
---
Settings search reaches every lever (#3093), on the plugin and the web studio alike. On Components, search now matches
the levers in each section's settings blocks by label, description and key, opens the block that holds a match and shows
only the matching levers in it, so "dialog", "dialog surface", "white" and "raisedSurface" all find Dialog surface. On
every page a lever whose page draws its own label or description is still found by the manifest's words. Color › Surfaces
& fills draws the panel over the scrim, `foreground.raised`, as a read-only row whose "Set by Dialog surface" link opens
that lever in Components › Dialog. Studio only: no token, emitted tree or component surface moves, so CONTRACT is
unchanged.
