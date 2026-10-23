---
engine: patch
---
In the plugin, Update now clears a minimum or maximum size the plan no longer sets (#2976). A file built under Tag style
Pill and updated to Underline kept the pill's height and 1.5x width as plain floors on every tag member, because Update
removed the binding but the host keeps the value a removed binding wrote, and a literal floor an earlier plan wrote stayed
too. In place, minWidth, maxWidth, minHeight and maxHeight are now set to none on any node whose plan neither binds nor
writes them, so an updated member has a fresh build's sizes. The executor revision rises to 38. No emitted artifact,
token or projected component surface moves.
