---
engine: patch
---
In the plugin, an update that inserts a frame between a node and children it already has now moves those children
into the new frame instead of rebuilding them (#2595), so they keep their ids and a placed instance's overrides on
them carry over. The dry run lists each as moving into the new frame, kept, instead of removed, and compares it to its
plan where it lands. A node a designer edited by hand is not moved and is rebuilt as before. The component executor's
revision is raised to 28. No emitted artifact, token or projected component surface moves.
