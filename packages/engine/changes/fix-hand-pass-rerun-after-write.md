---
engine: patch
---
The plugin's background hand-edit pass runs again when the write that made it stale ends (#3804). A pass that finds a
write holding the file stops where it is and posts nothing (#3737), and only the load and the end of an Update file run
asked for it again, so the sets it had not reached stayed "Checking" in the panel until a reload. Now the pass records
that it is owed, and the write's end (`guarded`) asks for it again over the file the write left. Plugin only; no committed
artifact moves.
