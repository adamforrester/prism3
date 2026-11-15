---
engine: minor
---
The anatomy part field `type` is now refused on any part that is not a `text` part (#3698, owner decision Q-PU2 A). Both `tsc` and the run-time validator refuse it, naming the part, its kind and the field. The Figma projection also plans a text style only for a text part, and both component executors report a text style on a node with no text-style setter as a miss instead of applying it: the paste payload used to throw there, and the plugin used to record the style as applied (#3783). A component definition that set `type` off a text part now fails validation. No shipped definition did, so no emitted artifact changes. `CONTRACT_VERSION` unchanged: no token name moves.
