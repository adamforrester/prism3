---
engine: minor
---
Five anatomy part fields are now refused on the kinds that never used them (#3698, owner decision Q-PU1 A): `radius` and `children` on anything but a `box`, `replaces` and `overlaysWhenAbsent` on anything but an `overlay`, and `when` on anything but an `overlay` or an `absolute`. Both `tsc` and the run-time validator refuse each one, naming the part, its kind and the field. The validator also refuses a root's `builtSize.grow` that names a part other than a `box` or a `nest` (#3779). A component definition that set one of these fields where no projection reads it now fails validation. No shipped definition did, so no emitted artifact changes. `CONTRACT_VERSION` unchanged: no token name moves.
