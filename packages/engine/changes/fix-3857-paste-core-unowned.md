---
engine: patch
---
The agent paste path now sees every variable in the `core` collection, as Apply Theme does since #1109 (#3857). The
`migrate` pass reads slice membership on the name the rename rules carry a variable to, so a pre-#1097 name with no
brand root (`palette/…`) is renamed in place there too. The `verify` pass reports the `core` variables in a group no
plan writes, under `orphans['core/other']`, the plugin's label for the same report. Nothing is deleted. The membership
rule moves into the engine as `sliceGroupOf` (`rename-map.ts`), which the plugin imports and the paste payload ships,
so the two paths read one definition. No committed artifact moves.
