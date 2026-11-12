---
engine: minor
---
Component alternatives are symmetric (#3555 Q-MD10). Where one component named another in `composition.alternativeTo`,
the other now names it back. That is 39 reverse entries, appended after each list's existing ones, in
`components.ai.json`, `component-defs.json` and the component pages. A test fails by name on any one-way pair.
