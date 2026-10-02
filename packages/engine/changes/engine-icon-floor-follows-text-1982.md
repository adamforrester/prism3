---
engine: minor
---
Under iconContrast '3:1', the seven icon roles that keep a 4.5:1 floor now follow their text (#1982):
icon.primary, inverse.icon.primary and icon.on-brand, -success, -warning, -danger and -info. The lever
does not lower their floor, so they already derived equal to their text, but an override on the text
was left behind on the icon. withIconTwins now carries those seven pairs under both lever values, as
it does the interactive ones. Every other pair still carries only under 'text'. An explicit icon
override still wins. No path is added or removed, so CONTRACT_VERSION is unchanged, and no committed
artifact moves: no corpus brand under '3:1' carries a text override on these.
