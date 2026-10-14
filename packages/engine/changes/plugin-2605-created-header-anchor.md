---
engine: patch
---
Plugin only (#2605). A section header that file setup or a build creates now goes at the end of the previous
section's span, on the divider that closes it, instead of after that section's furthest page in the file. A
Foundations page kept under Sandbox no longer pulls a created `Components` header into Sandbox. When the created
header would sit straight above the next section's header, the build now creates a divider between them, as file
setup already did. No existing page moves. No emitted artifact, token or projected component surface moves.
