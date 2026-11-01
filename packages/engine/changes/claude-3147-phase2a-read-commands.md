---
engine: patch
---
The agent link answers four read-only node commands (#3147 Phase 2a, the owner's Q3147.10 and Q3147.14 A): inspect
(the listed layers and their descendants to a depth: type, name, page, size, locked, the main component with its key,
instance properties, the variables bound by name and the text style), component-keys (every local set and component
with its key, publish state and variant properties), audit-frames (a rebuild's done check: legacy instances, unstyled
text, raw fills, stand-in dividers and default or rule-breaking frame names, against legacy lists the agent passes)
and snapshot (one layer as a local PNG). They run over the file mailbox and the desktop bridge
(apps/plugin/src/agent-reads.ts), post no verdict, and write nothing to the file. Walks are capped, and a layer that throws on read is
listed unreadable while its siblings are still read. A snapshot of a node that is not in the file is refused bad-args.
run-code stays dev-only (Q3147.13 A). AGENT_PROTOCOL_VERSION stays 1. No committed artifact or component surface
moves, and CONTRACT is unchanged.
