## (2026-11-01) — Divider follow-ups from #3151's review: the sizingWhen+size refusal tested, token-usage marks keys no plan draws (#3157)

**Status:** engine. The token-usage report (`docs/public/reports/token-usage.{md,json}`) moves; no token, emitted
tree or component plan does, so `CONTRACT_VERSION` stays. Divider's `notes.unverified` gains one sentence, which
moves the maintainer surface. A `minor` change note. Item 1 (the live-host measurement) stays open on #3157.

### What changed

- **Item 2: the `sizingWhen`-beside-`size` refusal is tested.** One `errs(withRoot({ sizingWhen, size }))` case in the
  `#3143` schema block, `#3157 sizingWhen beside size is refused`. Mutation M8 from #3151's review (the refusal in
  `component-schema.ts` disabled) now fails it by name; before, it survived every test.
- **Item 3: token-usage no longer over-claims.** A token's row lists every key that names it, and its parts are where
  the token lands, so a key sharing a token with a drawn key read as drawn. `emit-analysis-reports.ts` now probes
  each key that shares its token: the def is projected again with that one key pointed at a name nothing else binds,
  and the key is drawn only when some member binds that name. Keys no member draws are marked "(not drawn)" on the
  page and listed in a new `keysNotDrawn` field in the JSON. This reads the projection, never the part's binding
  fields, so a key dropped by any rule reads as dropped. Divider's three keys from the issue are marked
  (`horizontal.line.width`, `vertical.line.height` by the grow rule, `vertical.true.width` by the hug), and so are
  its `vertical.inset.*` pads (no vertical member takes `inset`). A key whose token no member draws at all is not
  marked: its row already reads "(not drawn)". Corpus-wide the report marks 88 keys in 12 defs (Link's selected
  inline type keys, the field family's `*.empty` keys, Badge, Tag and others): the same report, read correctly. The probe adds about
  14s to the reports step.
- `#3157 divider token-usage` in `test.ts`, beside build check 1, holds the three keys from the issue, typed as
  literals, against the committed page and JSON, and holds that the drawn keys on the same tokens stay unmarked.
- **Item 1 is not done.** It needs the live-file measurement on a real Figma host, which this lane had no access to.
  Divider's `notes.unverified` now also names the second unmeasured thing: the plain vertical members' update from a
  HORIZONTAL to a VERTICAL root on a file built before #3143.

### Verification

Mutations on a `wip:` commit, each failing by name: the `size` refusal disabled (`#3157 sizingWhen beside size is
refused`), and the probe's drawn test removed with the report regenerated (`#3157 divider token-usage`).
