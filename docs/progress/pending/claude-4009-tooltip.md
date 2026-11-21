## (2026-11-19) — Tooltip: a short label on the inverse surface, four logical placements and an arrow (#4009, Q-FL2)

**What.** Tooltip joins the catalog (`packages/engine/components/tooltip.ts`), built from the proposal on #4009 with
every OD at its recommendation, the owner's Q-FL2 record on #4007 and #4009 (2026-11-19) and the KB brief check on
#4009. One `placement` axis, `top | bottom | start | end`, projects 4 members (OD-X2 A: logical sides, so start and end
swap in right-to-left text with no rename; `placement` was already a `VARIANT_AXES` name, so no schema change). An
`arrow` boolean, on by default (OD-T2 A), drives four placement-gated glyph parts, one per member, the Switch.Control
`state icon` pattern. The bubble is the inverse surface, as Toast's card (OD-X1); the arrow takes the same `fill` key, so
the two cannot drift. The label is `type.body.sm.default`, padding 4/8 at comfortable (OD-T6). `align` is code only
(OD-T3 A). Generation priority 3 (as Badge; decided in Q-FL2), category overlay, `states: []`.

**The owner's three KB-conflict calls, as built (K7 reopened and decided A; see below).**
- K6 B: `kind="label"` on an icon-only control makes the tooltip the control's name (`aria-labelledby`, no
  `aria-label`); `description` stays the default.
- K7 A (owner, 2026-11-19, replacing the first build's K7 B fade plus scale): a fade alone,
  `motion.duration.fast` / `easing-role.enter`; the hide a fade on `instant` / `easing-role.exit`; no animation
  inside the skip window; both ways on `motion.duration-reduced.fast` under reduced motion.
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
built yet)". The prism3-build-ui skill's worked example of a missing component was Tooltip; it is Menu now (owner,
2026-11-19: Popover is being built in #4252). Dialog's placement value set becomes the canonical entry, Tooltip's an overlapping one sharing `bottom` and `end`.
Every hand-listed gate register takes Tooltip (hit target excluded: never a pointer target; no size axis; outside Control
shape: a surface), and the canvas furniture switch, the page taxonomy and the studio groups test list it.

**Decided by the owner (2026-11-19, on the PR), all as recommended.**
- **OD-TB1 A:** Figma's bubble hugs one line; the 240px wrap is code only.
- **OD-TB2 A:** an 8px base and a 4px right-angled tip.
- **OD-TB3 A:** its own Tooltip page under Components (Popover gets its own page too).
- **K7 A, a fade alone.** The `codeOnly` motion entry, `motion.enter` and `motion.reduceMotion` drop the scale, and the
  `#4009 tooltip code-side contract` arm now requires the fade alone and no scale.
- **N1 A:** `docs.do` reads "Use label mode when an icon-only control has a tooltip".
- **Popover and Tooltip list each other in `alternativeTo`**, replacing the `planned` entries. The list must be
  symmetric and name registered defs. Popover (#4252) merged first, so both halves land here: Popover's
  `alternativeTo` is `dialog, tooltip` and its `planned` is `menu`; Tooltip's `alternativeTo` is `field-message,
  popover` and its `planned` is empty.

**Landing second, after Popover (#4252).** The 27-file collision is resolved by the recipe on #4252: both components'
entries kept, the catalog at 65 sets, canvas furniture at 61 (Popover's one member excluded), Button's partners
`popover, tooltip`. `EXECUTOR_REVISION` rises 66 → 67, because #4325 widened `lint-executor-revision` to the engine code
the executor runs and Tooltip adds a `CANVAS_FURNITURE` entry; `executor-reach.json` names no redrawn set for 67.

**Right-to-left (#3986, Q-RTL1 A).** The side arrows (`startGlyph`, `endGlyph`) declare `mirror: 'mirrors'`, filled
from the right-to-left entry, which now says the arrow flips to point at the trigger; the top and bottom arrows are
symmetric and declare nothing. The usage section takes the generated "In RTL" note. The K7 A arm also rejects a size
change worded any other way (grow, shrink, zoom, transform, a percentage), not only the word scale.

**No motion literals in the timing note.** #4298 widened `lint-motion-literals` to the code-only notes that name
motion, so the `runtime-behavior` note no longer quotes the field's delay ranges in milliseconds; it points to the
motion gap batch (#3486), where the owner's Q-FL2 record already sent them.

**Follow-up, not in this PR.** IconButton's `aria` line still reads "aria-label is the accessible name (required)",
which K6 B qualifies on an icon-only control with a label-mode tooltip; filed as #4250.

**Trap.** `packages/engine/test.ts`'s #3833 replay needs full history: in a shallow clone it throws ("Could not read
<sha>") and every arm after it goes unrun with "0 failed" printed. `git fetch --unshallow` first. Filed as #4202.
