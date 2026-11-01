---
engine: patch
---
The chrome suite holds the vendored Tabler icon set to a digest taken from the package (#3167). The glyph check read its
expected icons from the same file the chrome draws from, so a hand edit to an icon's paths passed. The vendoring script
now also writes each icon's digest from the package, and the suite checks the set against it before any glyph check
runs. The icons, every emitted artifact, token and component surface are unchanged.
