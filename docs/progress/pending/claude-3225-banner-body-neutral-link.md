## (2026-11-02) — Banner: a body text property, a neutral tone and an inline link, in one PR (#3225)

**Status:** engine + plugin. Banner's set grows from 8 to 10 members and its properties move (`body` SLOT renamed
`richBody`; `body text`, `body`, `rich body` and `link` added). The schema gains `LayoutDef.wrap` and a hugging text
below the root; both executors write `layoutWrap`, so `EXECUTOR_REVISION` rises to 46, reaching `banner`. No token name
moves, so `CONTRACT_VERSION` stays. A `minor` change note.

### What changed

- **Body text (Q-BN2.1–.3 A).** A `bodyText` part, in a new body row between the title and the slot, drives the
  `body text` property, keyed by code `children` (that key is the Code Connect mapping: there is no Code Connect emitter
  yet, and a `texts` key is the code prop it maps to). Its default is the old placeholder, held as a literal in
  `test.ts`. `body` (on) toggles the sentence and `rich body` (Figma-only, off) the slot, which now holds nothing.
- **The slot is renamed `richBody`.** The proposal kept the slot part `body`, whose SLOT property is named `body`; a
  set holds one property per name, and `planSetProperties` refuses a BOOLEAN `body` beside it. So the layer and its
  property are renamed in place by a `part` and a `property-rename` entry, which keep every placed instance's slot
  content. Held as DRAFT in the PR (the slot's panel name now reads `richBody`).
- **The migration (Q-BN2.2 A).** A new `slot-text` kind in `COMPONENT_RENAMES`, carried by
  `apps/plugin/src/slot-text-migration.ts` beside `slot-migration.ts` and wired into the dry run (listed, in the
  preview hash) and the apply: an untouched body needs nothing; edited text is written into `body text` and the old copy
  cleared; anything else turns `rich body` on and `body` off; an emptied body turns `body` off (a fourth case the
  proposal did not list: without it the default sentence would reappear). `lint-component-renames.ts` arm C demands the
  entry when a def that held a slot gains a TEXT property beside it.
- **Neutral (Q-BN3 all A).** `background.secondary`, `border.tertiary`, `text.primary`, no glyph, last on the axis. The
  banner contrast block measures the role the styled def binds against literal floors: 100 pairs (10 per tone per
  style, the inline link's ink added on every fill), all clearing in 20 of 20 cells. `background.secondary` joins
  `INK_SURFACES`, as the `#2817` coverage arm demanded once a def placed the primary and link inks there; no example
  brand's value moved (every cell already cleared, lowest 4.56).
- **Inline link (Q-BN4 all A).** A nested Link (inline, default, medium) after `bodyText` in a row with `layout.wrap`
  and baseline alignment. `bodyText` hugs (`wrap: 'hug'`) at the row's width at the build width, derived down from the
  root: 412 at 480 contained (448 with no glyph), 892 at 960 full (928). The text-to-link gap is `space.050` (DRAFT).
  The link's text is the nested Link's own `label`, set to "Link text" by an instance override, as the action's
  "Action" is: a host TEXT property cannot reference a nested instance's layer (the executor's own measured note), so a
  banner-level `link text` property was not buildable. Held in the PR's Q-block.
- `emit-analysis-reports.ts`'s token-usage probe now reads a probe the projection refuses (a key read as px for a
  derived width) as drawn.

### Traps

- The nested hugging text freezes its max width at the built width, as every hugging text does (#1762): a host that
  narrows the banner below it leaves the body overrunning. Recorded in `notes.unverified`.
- Neither the wrap with baseline alignment, a boolean on a native slot, nor the SLOT property rename has been run on
  a live Figma host; the shim reads each back. The first Update of a file holding banners is that probe.

### Verification

See the PR's Ready comment: the full `npm run verify` table and every mutation.
