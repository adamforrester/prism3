## (2026-10-15) — Segmented control: a flat pill on a neutral track (#2724, Q336 A, Q342 A)

**What landed.** The selected look the owner approved in the wireframe: the control's track fills with
`color.background.secondary` and loses its 1px outline; a selected option's indicator fills with
`color.background.primary`, with no border and no shadow; the emphasis-weight label and its bold reserve stay as the
state cue. Unselected options keep the neutral wash at hover and pressed. The selected pill holds at hover, pressed
and disabled. This supersedes Q269.3's tint and 2px primary outline and the track outline Q278 kept. The header
comment, descriptions, WCAG lines and the forced-colors note say so.

**Why these two roles.** The brief asked for a track from a "neutral subtle-fill" family. No such family exists: the
only `subtle-fill` role is `interactive.primary.subtle-fill.selected`. The two neutral candidates were measured:
- `interactive.neutral.fill.rest` (the neutral button fill) puts one brand's light focus ring at 2.90:1 against the
  track. It is also the fill the `neutralEmphasis` lever darkens, which can take it to near-black, so the neutral
  ink on it would fail under that lever. Rejected.
- `background.secondary`, the quiet surface step, clears every floor. Chosen.
`background.tertiary` also clears, with less margin (about 3.26:1 for the same ring).

**What the test proves.** In `test.ts`, every pair is read off the plans and every value is resolved from the
committed DTCG trees. That is 14 pairs × 5 brands × 4 modes, 280 measurements:
- label 4.5:1 and icon 3:1 on the pill and on the track at rest, hover and pressed, the wash composited over the
  track; lowest label 5.28:1 (one brand, dark, on the track at pressed);
- focus ring 3:1 against the track and the page; lowest 3.76:1 (one brand, light, against the track).
The old arm read the Figma exports, which cover four brands, so it said 16 cells. This one reads the DTCG trees,
which cover all five.

**Update in place.** `test-update-apply.ts` builds both sets as main built them before this change: a tinted,
outlined indicator and an outlined track. It runs the real preview and apply and reads the shim's nodes. Every
indicator loses its stroke, every selected one is filled with the page surface, and every track loses its outline
and takes the fill. Keys and the indicator and track node ids are kept, and the next dry run reads everything
current. No executor code moved: the stroke neutralization that clears an unplanned stroke already does it. So
`EXECUTOR_REVISION` is unchanged.

**Mutations, each failing by name.**
- Selected label pointed at `color.text.tertiary` → `#2724 contrast over 5 brands × 4 modes`.
- 2px border put back on the selected indicator → `#2724 Q336/Q342 segment indicator`.
- The track's outline put back and its fill dropped → `#2418 Q269.7/Q269.8 control (#2724 Q336 track)` and the
  contrast arm.
- The executor's `set('strokes', [])` neutralization removed → `seg/border removed`, `seg/track outline removed`
  (and `seg/updated`, `seg/control updated`, whose verify catches it).

**Left for the owner (not blocking, recorded in `notes.unverified`).** In the high-contrast modes the surface steps
are one color, so the track and the pill both read as the page and the bold label is the only cue. In dark modes
the page surface is darker than the track, so the pill reads as set into the track rather than raised. A disabled
selected option keeps its pill, so the disabled control still shows its value.
