---
engine: minor
---
A text override carries to its icon twin wherever the tree has one, when icons match text (#1968).
Before, only the interactive label inks did (#1617): an override on text.brand left icon.brand at its
derived value even under iconContrast 'text', the default, and the icon has no editor of its own.
withIconTwins now reads the twin map off the mode's tree (the path with its text segment swapped for
icon), so text.*, inverse.text.* and both link families carry. Under iconContrast '3:1' only the
interactive pairs carry, because a non-interactive icon then has its own floor and derives its own
value; the interactive glyph is the label's value twin under both lever values (owner, 2026-10-02).
An explicit icon override still wins. No path is added or removed, so CONTRACT_VERSION is unchanged,
and no committed artifact moves: no corpus brand carries a per-mode override.
