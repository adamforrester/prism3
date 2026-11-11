---
engine: minor
---
Tab, Tabs and Banner name motion tokens instead of milliseconds (#3487). The tab underline's slide and the tabs
panel cross-fade now say `motion.transition.default`, and Banner's dismiss says `motion.transition.exit` with no
"about 150 to 200ms" beside it, in each def's `motion` field and its matching code-only description. A duration in
milliseconds is right for one tempo only, so an agent reading the catalog copied a number that is wrong for every other
brand. `components.ai.json`, `component-defs.json`, the three docs pages and the maintainer schema move; no token moves,
so CONTRACT is unchanged.
