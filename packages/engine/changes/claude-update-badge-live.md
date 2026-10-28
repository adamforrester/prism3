---
engine: patch
---
Update file's badge counts everything Update file would change, live (#3081, Q810 A). It counts the component sets due
against the brand the panel holds, plus one item for Theme changes the file does not hold yet, and the button's
accessible name says the same count. The panel asks for the count after a setting changes (debounced, one ask for a
burst) and after each write's verdict, with a new `due-request`. The plugin answers with `file-due` from the as-built
ledger and the file's stored brand alone: it reuses the sets the last `file-sets` read found, and never runs the full
check. A write starting or ending makes it read the file's sets again. The Theme item comes from the stored brand, which
Apply Theme writes, not from the panel's `isDirty`, whose baseline Apply does not reset. No emitted artifact, token or
projected component surface moves, and the executor is unchanged.
