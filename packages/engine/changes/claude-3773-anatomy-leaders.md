---
engine: patch
---
The usage panel's anatomy markers take `_Label`'s ink (#3773, owner decision B). Each part gets one direct leader in
#9747FF ending in a 4px dot on the part's edge, never over its content; a container's leader comes in from the left
gutter to its left edge, the outermost near its bottom corner and an inner one at its middle. There are no brackets,
so a nested container no longer takes a bracket tier of the panel's width. Each marker is a filled #9747FF disc with a
white numeral, drawn by the panel itself, no longer an instance of the brand's Badge. `PANEL_FORMAT` is 8, so every
drawn panel is due once on the next Update. Plugin only; no committed artifact moves.
