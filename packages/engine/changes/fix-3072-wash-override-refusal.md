---
engine: patch
---
An `overrides` entry on a translucent wash or a subtle fill is refused, naming the role (#3072). A wash override
(`interactive.<c>.overlay.<state>`, page or inverse) used to be applied as an opaque palette step: the tree aliased the
new step, so the wash emitted opaque, and its ratio was that step against the page rather than its ink on the
composite. A subtle-fill override (`interactive.<c>.subtle-fill.<state>`) was dropped without a warning, because the
subtle fills are settled after the override layer. The subtle-fill message points at the fill to override instead. No
corpus or example brand sets either, so no committed artifact moves.
