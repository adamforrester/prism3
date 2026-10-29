---
engine: patch
---
Sets to add are chosen on Components and kept in the file (#3129, Q832 A, Q833 A, Q3129.1–13 all A, Q3129.14 B, Q3129.15–16 A). In the plugin,
Components draws one box per family on each row the file could add a set of (a family partly in the file queues its
missing parts), three-state boxes on sections, and Select all and Deselect all on each tier's caption line; a queued
set's tag reads To add. The shared settings sit under a Component settings tier, the page title moves to the left of the
levers header with the search flush right, and Components shows no mode control and always previews Light,
putting back Theme's mode on the way out, as Palettes does. Each box posts one new
`add-queue` message, and the plugin keeps the queue in the root's shared plugin data, one `addQueue.<defId>` key per set
in namespace `prism3`. `file-sets` and `file-due` carry the queue, minus the sets the file holds and the sets the engine
cannot build. A build that lands a set whole clears its key where the as-built ledger records it, and every Update file
run ends with a queue write that clears the keys of sets the file holds or the engine dropped. Update file lists the
queue and the due sets under one Components section, as To add (Remove, Remove all from two rows up, Add all on a fresh
file, absent when the queue is empty) and Due, with Components' names; a fresh file no longer opens with every set ticked. The badge counts the
queue too, and its name splits the count ("Update file, 7 to add, 3 due"). The web studio is unchanged. No emitted
artifact, token or projected component surface moves, and the executor is unchanged (`EXECUTOR_REVISION` holds).
