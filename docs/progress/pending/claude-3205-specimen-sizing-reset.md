## (2026-11-02) — A usage-panel example keeps its width once its panel is on the page (#3205 follow-up)

**What was wrong.** #3211 fixed each specimen at its member's width and set that width as its `minWidth`. The test host
honored that. In the template, after an Update with a build that included #3211, Dialog's specimen read
`layoutSizingHorizontal: FIXED` at **62px** inside a 687px stage. The width and the floor were both gone, and the
instance was frozen at the width it hugs (#3265's re-scan). Toast, Select, Textarea and the fields didn't change either.

**The host behavior modeled (`apps/plugin/test-doc-panel.ts`, `hostReset`).** When a tree is appended or moved to a new
parent, each instance inside another instance in it, such as a block's specimen, loses its size overrides. Its floor
goes back to its main's, and it is frozen FIXED at what it hugs, which is the state the scan read. `drawDocPanel`
sizes every specimen while the panel is still off the page, then moves the panel there (`parent.appendChild(panel)`).
So under this model every size it set is lost. With the model in, current main fails 24 arms, including
`collapse/dialog` ("example 1 is 40px wide, under the 560 its def declares"), `collapse/after reset` and
`update/redraw in place`. The #3211 arms run on this file's own host, not on `component-shim.ts`, so the model lives
here. **This trigger is inferred from one observation, not measured.** It is the first one consistent with what the
scan saw, and the plugin's last structural move before the markers.

**The fix (`apps/plugin/src/doc-panel.ts`).** The draw records each specimen with its member and sizes it again right
after the panel lands on the page: fixed at the member's width, with its floor. That happens before the markers, which
are placed from the specimens' final boxes. `PANEL_FORMAT` goes to 6, so Update redraws every usage panel once,
including the ones #3211 drew collapsed.

**Mutations,** each committed `wip:` first:
- the second sizing removed → the 24 arms above fail by name;
- `PANEL_FORMAT` left at 5 → `update/redraw in place` fails (the #3211-era panel isn't due).

**Owed.** Real-Figma confirmation: after an Update, read Dialog's specimen in the template and check that it is FIXED at
560 with `minWidth` 560. If it is still 62, the reset has another trigger (a later property write or a mode pin, say),
and the model and this fix move with it. Also note: with every panel due once, a panel whose print predates #3303 and
whose nested components changed is kept as "(edited)" by that PR's safe rule, so #3303 should land first.
