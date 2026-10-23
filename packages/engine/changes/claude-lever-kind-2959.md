---
engine: minor
---
Every lever in the lever manifest declares its kind, value or structural (#2959, owner Q599 A). The test (owner Q610 A):
a structural lever needs different markup, logic or states per option in the coded component, so every coded component
must implement each option, and a new one needs the owner's OK in its wireframe; on a value lever only token values differ. schema/lever-manifest.json,
and so the MCP list_levers result, gains a kind field on each lever. Four levers are structural: fieldStyle,
searchFieldStyle, tagStyle and buttonIcons. test.ts fails a lever with no kind, by
name, and pins the structural set; lint-skills holds the prism3-build-component skill's lever table to the manifest.
No token, emitted tree or projected component surface moves, so CONTRACT is unchanged.
