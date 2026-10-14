---
engine: minor
---
The MCP paste payload bases each bound solid paint and each gradient stop on its variable's own resolved color for the node, black only where nothing resolves (#2468), mirroring the plugin executor's #2379 and #2391. A wash's alpha is the solid paint's opacity; a stop keeps its alpha in its color. No committed artifact moves.
