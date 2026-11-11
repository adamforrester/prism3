## (2026-11-11) — Search takes the row at every width (#3553 M1)

The UI polish review (#3553) found that opening Search at the wide tier (1280 and 1024, web and plugin) left the field
about 52px of text. The open field was `flex: 0 1 50%` beside tabs that kept their width, so "Depth & motion" was cut
to "Depth & motior". The no-match status ran about 180px past the levers column, over the preview's title, and Close
fell outside the row. The narrow tier already hid its place select while Search was open.

**The owner's M1 A.** The narrow tier's rule now applies at every width: the open field takes the row and the tab row
hides. Moving to another Theme page means closing Search first. The rail still moves between areas with Search open,
so a search on Components still holds across a visit to Theme by the rail's tile.

**Components too.** On Components the row also carries the page's title ("Components"). With the tabs gone, the title
still left the field 0px at 1024 and ran Close past the column at every width, so the title gives way while Search is
open, as the tabs do. The rail's tile still names the place. This applies A's "the field takes the row" to the one
row that had something besides the tabs on it.

**The test that changed.** test:chrome section 6b's sweep searched every place with Search left open, and its
held-search check (#3129 R4) reached Brand by the tab row. Both are updated to the new behavior, not deleted. The
sweep closes Search before each next place. The held-search check now goes by the rail: Components with "white" →
the Theme tile (Search still open, the tab row still hidden) → Dark → back to Components, and Dialog title size stays
hidden.

**Verified.** New test:chrome section `3553-m1`, in shard 3. Web at 1280 and 1024, plugin at 1280, 1024 and 380, both
themes, on Brand, Surfaces & fills, Type, Shape, Depth & motion, Layout and Components, each with a query that matches
nothing so the status is at its longest. It holds that the tab row (and Components' title) hides, that the no-match status and
Close stay inside the levers column, that closing brings the place switcher back, and, at the wide tier, that the field
shows at least 80px with the typed query whole. Measured after: 90px at web 1024 and more at 1280, against 52px before.
Mutations, each after a `wip:` commit: the hide rule dropped fails `#3553 M1 … the tab row hides while Search is open`;
the open field's `flex: 1 1 auto` put back to `0 1 50%` fails `#3553 M1 … the field shows at least 80px of text`.

**Not fixed here.** At the plugin's 380 (the narrow tier, outside M1), the no-match status leaves the field about 17px,
on `main` too. Filed as #3620.
