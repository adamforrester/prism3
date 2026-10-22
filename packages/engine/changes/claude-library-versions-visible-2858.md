---
engine: minor
---
The library's versions are visible in the Figma file (#2858, owner decisions Q443 A and Q479). Every Update that writes
draws an "About this library" frame on the Cover page, beside the thumbnail frame: the engine and token contract versions,
the date of the Update, and what changed in the latest release. The dry run lists the frame when it is missing or drawn
for another engine, and a copy a designer edited is kept aside. When the frame is an Update's only work, no named
version is saved, and the dry run and the run log say so. After an Update, the plugin's Activity drawer offers the
library publish description with a Copy button. The release index (`docs/public/releases/index.json`) now carries every
Figma and token item of each release, which the plugin bundles; `release-notes.ts --index` rewrites it from the release
files. No token path moves, so CONTRACT is unchanged.
