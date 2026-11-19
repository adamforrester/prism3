## (2026-11-19) — Tooltip: a short label on the inverse surface, four logical placements and an arrow (#4009, Q-FL2)

**What.** Tooltip joins the catalog (`packages/engine/components/tooltip.ts`), built from the proposal on #4009 with
every OD at its recommendation, the owner's Q-FL2 record on #4007 and #4009 (2026-11-19) and the KB brief check on
#4009. One `placement` axis, `top | bottom | start | end`, projects 4 members (OD-X2 A: logical sides, so start and end
swap in right-to-left text with no rename; `placement` was already a `VARIANT_AXES` name, so no schema change). An
`arrow` boolean, on by default (OD-T2 A), drives four placement-gated glyph parts, one per member, the Switch.Control
`state icon` pattern. The bubble is the inverse surface, as Toast's card (OD-X1); the arrow takes the same `fill` key, so
the two cannot drift. The label is `type.body.sm.default`, padding 4/8 at comfortable (OD-T6). `align` is code only
(OD-T3 A). Tier 3, category overlay, `states: []`.

**The owner's three KB-conflict calls, as built.**
- K6 B: `kind="label"` on an icon-only control makes the tooltip the control's name (`aria-labelledby`, no
  `aria-label`); `description` stays the default.
- K7 B: a fade plus a scale from 0.95, `motion.duration.fast` / `easing-role.enter`; the hide a fade on `instant` /
  `easing-role.exit`; no animation inside the skip window; the scale dropped under reduced motion. The 0.95 has no
  token.
- K8 A: an owned positioning layer on the platform (`popover="manual"`, CSS anchor positioning with
  `position-try-fallbacks`, a small owned fallback), no library, for the proof of concept.

**The arrow is a component-owned glyph.** Four new glyphs in `component-glyphs.ts` (`tooltip-arrow-down|up|start|end`),
not in the icon set (an arrow means nothing off a bubble), built at a literal 8px (`glyphPx`, no token, OD-T6). A
vector part is square, so each triangle's base spans the edge facing the bubble and its tip sits half the base in;
the far half of the 8px square is clear. A new `ARROW_GLYPH` arm in `lint-glyph-geometry.ts` measures each document's
three corners and the 8px literal against numbers typed in the gate.

**Motion presets.** No preset registry exists in the engine (#2857 is a wireframe), so the proposed Tooltip / show and
Tooltip / hide live only in the def's `motion` field and `codeOnly`. Nothing was added to a preset set, and no Popover
preset either (no open PR carries one).

**Fallout, all mechanical.** Button, IconButton and TextField had Tooltip in `composition.planned`; it moves to
`ai.commonPartners` (FieldMessage's to `alternativeTo`, which Tooltip names back), and IconButton's usage drops "(not
built yet)". The prism3-build-ui skill's worked example of a missing component was Tooltip; it is Popover now (DRAFT
copy). Dialog's placement value set becomes the canonical entry, Tooltip's an overlapping one sharing `bottom` and `end`.
Every hand-listed gate register takes Tooltip (hit target excluded: never a pointer target; no size axis; outside Control
shape: a surface), and the canvas furniture switch, the page taxonomy and the studio groups test list it.

**Held for the owner (built at the recommendation, pending).**
- **OD-TB1, the max width in Figma.** 240px has no Figma projection: `wrap: 'hug'` requires the text's parent to be the
  root, and the label sits in the padded bubble. A (built): Figma's bubble hugs one line; the wrap is code. B: extend
  `wrap: 'hug'` to a padded child, an engine change. C: build the bubble at a fixed 240.
- **OD-TB2, the arrow's depth.** A (built): 8px base, 4px right-angled tip. B: 8 by 8.
- **OD-TB3, the page.** A (built): its own Tooltip page under Components. B: an Overlays page shared with Menu and
  Popover.
- **OD-TB4, the tier.** A (built): 3, as Badge. B: 2.
- **New strings are DRAFT** (voice standard): every shipped field of the def, the build-ui skill's worked example.

**Follow-up, not in this PR.** IconButton's `aria` line still reads "aria-label is the accessible name (required)",
which K6 B qualifies on an icon-only control with a label-mode tooltip; filed as #4250.

**Trap.** `packages/engine/test.ts`'s #3833 replay needs full history: in a shallow clone it throws ("Could not read
<sha>") and every arm after it goes unrun with "0 failed" printed. `git fetch --unshallow` first.
