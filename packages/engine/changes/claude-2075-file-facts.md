---
engine: minor
---
The file facts scan (#2075 part 1): `file-facts.ts` reads one Figma document, through the plugin API or a plain-data
snapshot, into a versioned JSON evidence report (`prism3-file-facts/1.0`, schema `schema/file-facts.schema.json`). It
lists the variables (collections, modes, types, per-mode values, alias chains, scopes, descriptions), the paint, text,
effect and grid styles with the layers using each, the paints, type values, radii and spacing the layers use, sorted
into roles by a stated name-and-type rule, and the components and libraries in use. Every value carries its binding:
a variable, a style, or raw. It proposes nothing. No emitted artifact changes.
