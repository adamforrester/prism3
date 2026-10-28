## (2026-10-27) — Caption sizes and the per-text-type letter spacing pin; the reference brand's title 2xs, caption md and +1% tracking (#3077)

Engine {{ENGINE_VERSION}}. Owner decisions 2026-10-27 on #3077: Q802 A (title.2xs is 18px on mobile), Q803 B (label
moves to +1% too), caption A and tracking A.

### What changed
- **`typography.sizes.caption`** (caption A): md and lg take one brand-level size each. The value must be a ladder
  step, at least `CAPTION_SIZE_FLOOR` (10px), and the caption ramp stays strictly increasing. caption.xs and caption.sm
  are refused by name (their floors pin them). `sizeOverrides` and `modeLevers.<mode>.typeSizes` stay heading-only.
- **`typography.tracking`** (tracking A): `Partial<Record<TypeGroup, LetterSpacingKey>>`. A pinned text type uses that
  role at every size, replacing the derived rung and the `trackingShift` nudge; the others keep both.
- **The reference brand.** The redesign seed now carries the stored input's sizes (display 64–128 to 2xl, title
  24–56 with their mobile sizes, sizeFloor 8) plus the patch: titleFloor 16, title.2xs 20 / 18 mobile, caption.md 10,
  display/title/body/caption/label pinned to `open`, and `trackingShift` reduced to `eyebrow: -1`. Leading stays on the
  engine default, as the seed's owner note says. The legacy fixture takes caption.md 10 and the tracking pin + eyebrow
  nudge only.
- Schema, Studio/plugin Type page (Caption sizes in Scale limits; Letter spacing for each text type beside the
  nudges, both DRAFT copy), the prism3-theme skill, `.ai.json` notes.
- **The 10px caption floor's refusal.** While caption md is set to 10px, the 10px floor would add caption sm at 10px
  below it, which the engine refuses (the ramp must strictly increase). The Type page now disables that chip and draws
  the reason as a hint line, as the title floor's refusals do (#2451). `captionFloorBlocked()` reads the engine's rule
  from the input, no trial build. The reason is DRAFT copy, held for the owner.

### Why a pin, not a nudge
No nudge reaches +1% (`open` was kept off the nudge path in #2322 so nudging brands don't move), and display's derived
rung splits at 96px, so one nudge can never make display uniform. The pin replaces both for the category it names and
nothing else; re-anchoring three roles (the issue's route B) would have made `snug` and `normal` mean +1% for the brand.

### Held for the owner
- **The legacy fixture's title.2xs.** Its type is the engine default (title.xs 18), so a 20px 2xs can't sit below it.
  It stays without one; pinning the stored title ramp into the fixture would be a wider change than this issue.
- The field-message glyph beside a 10px caption is for the orchestrator to re-check in Figma.
- The 10px caption floor's refusal wording (DRAFT): "Caption md is 10px, which you set individually, so the engine
  refuses a second 10px caption."

### Traps
- The frozen Figma text-style fixture (test.ts, fix #3b and the size bind) predates the decision: the moved text types
  and caption.md are held to the decided values written in the test, code still to the fixture.
- "Release pinned sizes" leaves `sizes.caption` alone and the pinned count skips it: a caption size never clashes with
  the type scale, which is what that button fixes.
