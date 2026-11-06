---
engine: patch
---
The desktop bridge (tools/figma-bridge) takes PRISM3_BRIDGE_ARM=0|1|2 for the agent-adherence test (#3440). Arm 0 sends
no note, serves no resources and refuses the context command; arm 1 adds the note; arm 2, the default, is the bridge as
it was. A new --record <file> option logs every figma_run call and its outcome, refused calls included. Without either,
the bridge behaves as before. No emitted artifact moves, AGENT_PROTOCOL_VERSION stays 1, and CONTRACT is unchanged.
