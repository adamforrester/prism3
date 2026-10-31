---
engine: patch
---
Update check and apply: no Proxy over the Figma host (#3209). #3177 answered the run's searches from one read by wrapping
the host in a JS Proxy (withRoot, readRun's root) whose get trap returned bound copies of its methods. On Figma those
methods are own data properties, neither writable nor configurable, and a Proxy over them must return their own value,
so every check and apply threw on getLocalTextStylesAsync and left every set Due. The wrappers are now plain objects
(apps/plugin/src/host-facade.ts) whose fallback is a Proxy over an empty object, which no invariant binds; componentFigma
in mcp-steps.ts had the same exposure and moves too. The shim gains fixHostMethods, which fixes a copy's methods as the
host does, and the update-apply and mcp-paste suites run over it. The read-once behavior is unchanged; no committed
artifact moves.
