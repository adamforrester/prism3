## (2026-11-04) — Banner's `width` axis is `edge`: contained or full-bleed (#3392)

**Status:** engine. A component API rename, owner decision 2026-11-04 on #3392. No token name moves, so
`CONTRACT_VERSION` stays; the executor's code does not move, so `EXECUTOR_REVISION` stays at main's number
(`lint-executor-revision` agrees). A `minor` change note.

### What changed

- **The name.** Banner's axis was `width` (`contained | full`), but what moves between its two members is the corners
  and which sides carry the edge; both members fill their container. #3383's rule names an axis for what changes, so
  the owner renamed it. Finalized as `edge` (`contained | full-bleed`), the owner's suggestion, checked against the
  canon: one lowercase word, so its Figma panel name is lowercase with no display rename (Q345); `full-bleed` follows
  the kebab-case of multi-word values already in the corpus (`apple-pay`, `from-top`). `edge` is new to the closed
  `VARIANT_AXES`, which is a schema change, so the owner's decision is what admits it; its header entry argues it
  against `width`, `shape`, `inset` and `placement`.
- **The migration.** Two `COMPONENT_RENAMES` entries: an axis entry `width` → `edge` and a value entry on the NEW axis
  `full` → `full-bleed` (an axis rename applies first in `renameCoordinate`). An update renames each built member in
  place, so placed instances keep their member. `component-axes.json` re-accepted.
- **The register.** `lint-axis-values` carries `edge` as a `sole` set for Banner, and Button's `width` falls back from
  `canonical` to `sole`, its only set again.
- **Token slot keys** follow the axis: `edge.{edge}.radius` and `edge.{edge}.edge-side` (same tokens bound).

### Verification

- Mutation: drop the axis entry from `COMPONENT_RENAMES` and `lint-component-renames` fails with
  `banner: axis 'width' is gone`; drop the value entry and it fails with `banner: edge=full is gone`.
- `test.ts`'s Banner literals and `test-roundtrip.ts`'s built widths read `edge=…`; their regexes take the hyphen.
