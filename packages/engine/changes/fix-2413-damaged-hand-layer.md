---
engine: patch
---
In the plugin, a member that draws other than its plan and also has a layer added or removed by hand now reads
"edited by hand" in the update's dry run, not "to update" (#2413). The apply skips such a member under every choice,
so the dry run now says what the apply does; its damage is still listed as differences. The apply's skip reason names
the damage as well as the layer. No emitted artifact, token or projected component surface moves.
