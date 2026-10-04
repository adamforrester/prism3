---
engine: minor
---
surfaces.<mode>.floorStep refuses a value that is not a step on the neutral ramp (#2033, owner go-ahead
2026-10-04), the check base and inverseBase got in #1985: a typo must never silently move the contrast floor.
333 used to resolve to neutral.350 and 1234 to neutral.950, moving every floor-gated role with no error; both
now throw, naming the key and the nearest real step. A non-number is refused by name. Real steps are accepted
unchanged. The off-ramp refusal is now one helper shared by the six surface anchors and floorStep, and the
anchor messages are unchanged. Minor, not major: ENGINE major is refused below 1.0, what is refused was
already resolving to a floor nobody chose, and no corpus brand, fixture, gate case or Studio control relied on
snapping (every floorStep measured was a real step: 100, 200, 300, 800). No token path moves, so
CONTRACT_VERSION does not.
