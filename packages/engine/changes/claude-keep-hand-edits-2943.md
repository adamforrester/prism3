---
engine: patch
---
In the plugin, Update with hand edits kept now keeps every hand-edited path, including the fields a parent writes onto
its child (#2943). The executor's passes that place, size or re-corner a child from its parent (the focus ring's
concentric radius, a pin, an inset icon, a stretch) skipped no kept child, so a ring a designer had unbound and squared
came back concentric on every member whose root the update rewrote. The executor revision rises to 36. No emitted
artifact, token or projected component surface moves.
