---
engine: minor
---
Every lever in the lever manifest declares its kind, value or structural (#2959, owner Q599 A). A value lever resolves
to token values at generation time; a structural lever changes a component's anatomy or behavior, so every coded
component must implement each option, and a new one needs the owner's OK in its wireframe. schema/lever-manifest.json,
and so the MCP list_levers result, gains a kind field on each lever. Six levers are structural: fieldStyle,
searchFieldStyle, tagStyle, buttonIcons, buttonTextHover and outlineInteraction. test.ts fails a lever with no kind, by
name, and pins the structural set; lint-skills holds the prism3-build-component skill's lever table to the manifest.
No token, emitted tree or projected component surface moves, so CONTRACT is unchanged.
