---
engine: patch
---
The desktop bridge (tools/figma-bridge) tells a connecting agent how to work in a Prism3 file (#3300). Its
initialize and server/discover results carry a short note, and figma_status carries the same note as readFirst: never
detach a Prism3 instance, keep hand edits, leave FINAL pages, locked layers and Original copies alone, change only
component properties on a library instance, bind semantic roles by name, and save a named version before a write. The
bridge also serves five read-only resources from its checkout: the rebind and consume skills, commands.json,
figma-conventions.json and llms.txt. No emitted artifact moves, AGENT_PROTOCOL_VERSION stays 1, and CONTRACT is
unchanged.
