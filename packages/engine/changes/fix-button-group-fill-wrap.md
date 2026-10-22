---
engine: minor
---
Dialog and Button group: the fill line now says the label takes `overflow-wrap: anywhere`, so a single long word breaks
inside its button instead of overflowing it (#2880 review follow-up). The Dialog `actionsFill` note reads "The fill
footer: a Button group at fill, Cancel then Save, sharing the width equally." The emitted Dialog doc and the maintainer
schema carry the new prose. No member, name, prop or token moves, so CONTRACT is unchanged.
