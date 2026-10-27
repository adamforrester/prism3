---
engine: patch
---
The chrome suite reads the preview header's mode control only once it has settled (#3033). The control picks radios
or the select in a frame after the header resizes, and the 4-mode check read it straight after the pane toggle, so at
380 it could see a radio the select was about to replace. Every read in that section now waits until the select shows
or no radio is clipped, for at most 2 s. Test-only: no committed artifact changes.
