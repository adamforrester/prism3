---
engine: patch
---
Apply Theme binds its styles inside the collections it writes (#1904). The text styles' font bindings, the gradient
stops, the glass blur radius and the tinted washes' opacity used to resolve their variables by name across the whole
file, the last one listed winning, so a same-named variable in a collection Prism3 does not write (a foreign one, or one
left by an earlier version) could take the binding. They now resolve in the collections the pre-flight checks, in the
plugin and in the agent paste alike. Plugin only; no committed artifact moves.
