---
engine: minor
---
Update file builds the usage panels' template on a first run (#3308, Q3308.3 A). With Documentation's usage panels on
and a file with no _Doc-block, Update file's run also builds Badge, Tag, List item and Divider first (To add lists them
as "Also builds"), then _Doc-block, before the queued sets, so every queued set gets its usage panel in one run. Until
now each set said "No usage panels drawn" and the owner's first run read five sets "built with problems". The panel's
sets step asks each build for it (build-components' docBlock); the Components page's build and an agent's are unchanged,
and so is a run with the panels off. The file's read names the template's sets the file lacks (docBlockLacks). No token,
emitted tree or projected component surface moves, so CONTRACT is unchanged.
