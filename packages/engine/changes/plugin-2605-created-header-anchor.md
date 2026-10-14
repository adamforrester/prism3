---
engine: patch
---
Plugin only (#2605). A section header that file setup or a build creates now goes at the end of the previous
section's span instead of after that section's furthest page in the file. A Foundations page kept under Sandbox no
longer pulls a created `Components` header into Sandbox. The header reuses the divider that closes the span only when
the section's own pages follow it; with a designer's page or section there, it gets a divider of its own and the
designer's pages keep theirs. No existing page moves. No emitted artifact, token or projected component surface moves.
