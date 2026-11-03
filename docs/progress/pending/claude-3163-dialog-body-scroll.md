## (2026-11-03) — Dialog: the body clips and scrolls under the pinned footer (G14, #3163)

**Status:** engine + plugin executor change, `engine: minor` (change note `claude-3163-dialog-body-scroll.md`).
`EXECUTOR_REVISION` 48 → 49, and `executor-reach.json` names `dialog` for it. CONTRACT unchanged: no token is added and
no token name moves. Item 1 of the build order on #3130 (Q3130.9 A); owner decision Q3130.8 A (every placement).

### What changed

- **The bug (#3163):** on a rebuild of the reference brand's mobile screens, a full-screen Dialog with a long form drew
  its pinned footer over the form, and the fields spilled past the dialog. The body neither clipped nor scrolled
  (`clipsContent = false`, `overflowDirection = NONE`).
- **The schema:** a box part can declare `scroll: 'vertical'`. It projects as `overflowDirection = VERTICAL`. The
  validator refuses it on any kind but a box, refuses any other direction, and refuses it without `clipsContent: true`,
  because a frame that scrolls without cropping still draws its overflow over the footer.
- **Both executors** now write `overflowDirection` on every FRAME, `NONE` unless the plan says otherwise, the way
  `clipsContent` is threaded. The plugin's also writes it on a slot as it creates it; the paste payload carries it from
  the frame onto the slot (`__SLOT_FIELDS`) instead, because a second write in its shell pushed provider-logo's paste
  unit past #1798's 90% floor. A component set has no `overflowDirection` (`ComponentSetNode` lacks
  `FramePrototypingMixin`), so neither executor writes it there. The one write left in the paste shell moves
  icon-button's set from 17 chunks to 18, re-pinned in `test.ts` with a note, as the earlier shell-byte moves were.
- **Dialog's `body`** declares `clipsContent: true` and `scroll: 'vertical'` on all 24 members. At full and end the body
  already grows to the height the header and footer leave, so it is now the scroll region between them. Center and
  bottom hug, so the crop shows there only once a designer fixes the height.
- **The code projection** was already right in prose ("only the body scrolls"). The code note now names the shape: a
  flex-column panel, the body `flex: 1 1 auto; min-height: 0; overflow-y: auto`.
- **The component shim** now starts a frame at Figma's `overflowDirection: 'NONE'`, so writing the default reads as no
  change and only Dialog's drawing moves for `lint-executor-reach`.

### The gates

- `test:roundtrip` gains a Dialog block with its own model of Figma's auto layout, read off the host's fields: a FIXED
  column gives a `layoutGrow: 1` child the height its padding, gaps and other children leave. With 1,200px of content in
  the 360 × 640 full member and the 480 × 800 end member, the footer's top is at or below the body's visible bottom.
  Every member's body clips and scrolls. Mutations: the def's `clipsContent` removed fails
  `roundtrip/dialog body clips` (every member, and the footer top 580 against a visible bottom of 1320 at full); both
  executor `overflowDirection` writes removed fails `roundtrip/dialog body scrolls` and the corpus diff.
- `lint-unclaimed-defaults` gains an `overflowDirection` row (FRAME). With the writes removed it fails A1 on every def.
- `test.ts` pins the plan (every member's body slot carries both fields, no other def plans an `overflowDirection`)
  and each refusal arm by name. Mutation: the without-`clipsContent` refusal deleted fails `#3163 a box declaring scroll
  without clipsContent is refused BY NAME`.
- `lint-executor-reach` passes with entry 49 naming `dialog` alone, so no other set's drawing moved. With entry 49 set
  to `[]` it fails `dialog: drawn differently by revision 49 than by 48` in all eight arms.
- **The paste leg (review finding 1):** `test.ts` gains `#3163 paste leg`. Every Dialog member is pasted through the
  payload, and the stub host's body must read `SLOT VERTICAL clips`, a literal. The round-trip arms drive only the plugin
  executor, so before this an agent-pasted Dialog could lose its scroll silently. Mutation: `'overflowDirection'` dropped
  from `__SLOT_FIELDS` fails `#3163 paste leg: … (0/24) — … SLOT undefined clips`.

### The paste-unit ceiling (review finding 2)

This PR and #3372 each add one write to the paste shell, and together they took provider-logo's paste unit to 37,858 B,
past #1798's 37,800 B ceiling. The shell now names the four per-side stroke weights once (`__SIDE`), where three checks
had spelled them out. Nothing a host sees changes. Provider-logo's unit drops from 37,787 B to 37,672 B (−115 B), so the
two PRs fit under the ceiling in either merge order. icon-button's set goes back from 18 chunks to 17, re-pinned in
`test.ts`.

### Decided

- **The part name (Q3163.1 A, owner, 2026-11-03):** the part keeps the name `body`. No rename. The proposal's row 1
  called it `bodyViewport`, for an item 2 that would have put a `body` instance inside it. Q3130.1 was revised to keep the
  body a native slot, whose Figma property is named for its layer, so a rename would have changed the property designers
  see.

### Not proven

- **What a shim cannot prove:** that a real Figma host keeps both values on the native slot and scrolls the content in
  a prototype. That is in Dialog's `unverified` notes.
