---
engine: patch
---
"Prism3 Studio Offline" no longer reads the desktop bridge's pairing token on its main thread (#3218). The offline
build has no bridge, so its main thread now carries none of the token plumbing: no clientStorage key, no read on
launch, and no paired or unpaired handling. The plugin's main-thread build takes the PRISM3_NETWORK define its UI
build already had, and the release gate fails if the token's key returns to the offline bundle. No committed artifact,
token or projected component surface moves, and CONTRACT is unchanged.
