## (2026-10-08) — Studio chrome: one switch, track and knob, and a disabled switch in Prism3's own disabled switch roles (#2183, #2237)

The redesign's switch clean-up (SG5 A), with #2237 folded in (owner Q52 B / DS2 A, SW1 D). The studio's own chrome only,
on both hosts; the switch components Prism3 generates for brands are untouched.

**One switch.** The four lever switches (Type's fluid headings, Interactive's strict contrast and full-contrast disabled,
Surfaces & fills' gradients) were the dot-and-word kind: an outline page button with a dot and "On" / "Off" (Gradients:
"Off: no gradients emitted"). They are now the track-and-knob switch the Build style guides page drew since #2171, made
by one builder (`switchEl`, `shell/dom.ts`) that `switchButton` (`ui/lever-kit.ts`) and Build style guides both call.
The classes went from `p3-sg-switch` / `p3-sg-track` / `p3-sg-knob` to `p3-switch` / `p3-switch-track` /
`p3-switch-knob`, and the dot switch's CSS is gone. Each keeps its `role="switch"`, `aria-checked`, `aria-label`, hook
and behavior.

**Three owner answers, 2026-10-08,** asked before building because the recorded decisions left them open:
- **No state words.** Track only, as Build style guides: the state is the knob's side, the track's fill and
  `aria-checked`. "On" / "Off" and "Off: no gradients emitted" are no longer drawn. #2183 had said "no copy change"; the
  owner chose the wordless switch over keeping the words beside it.
- **No glyph on the knob.** The engine's switch thumb carries a glyph (`disabled.border` when disabled); the chrome's knob
  stays plain, so that role has no chrome element.
- **The lever's name keeps its ink.** SW1 D named the switch-row label on `color.disabled.text`. A chrome switch has no
  label of its own; its row label is the lever name, which in a derived mode's read-only panel keeps its ink like every
  other lever name (RX1 A / RX2 A). Greying only the switch levers' names would also have needed the contrast exemption
  widened to a label outside the control. So `color.disabled.text` has no chrome element here either.

**A disabled switch** (on or off) draws the roles `switch-control.ts` binds at `disabled`: the track on
`--p3-disabled-fill` (`color.disabled.fill`), its edge on `--p3-disabled-edge` (`color.disabled.border`), the knob on
`--p3-disabled-ink` (`color.disabled.on-fill`), never the outline button's `--p3-disabled-icon`. The knob keeps its side,
so on and off still read apart. All three variables already existed (F1 A, X4 A) and were already `INACTIVE`, so the
exemption is unchanged; `spec.mjs` only names the switch in their notes.

**A hover cue, added.** Q28 a holds every enabled control kind to answering hover, and the track-and-knob switch had no
hover rule (the dot switch answered hover only as an outline button). It takes the chrome's existing control cues: off,
the track's edge steps to `--p3-field-edge-hover`; on, the track steps to the filled button's `--p3-inv-bg-2`. Build
style guides' switches gain it too.

**Tests** (`test-chrome.mjs`): a new `#2183` section on both hosts and both chrome themes. Each lever switch is named by
hook, so a missing one fails by name: it is the track-and-knob kind (one track, one knob, no dot, no words); it keeps
its role, state and name; a click turns it and moves its knob. Disabled the way the app disables one (`disabled`), on
and off, it draws exactly the three roles, read from the committed emission through `PRISM3_DISABLED`, never the CSS
(docs/34); a fallback to the outline button's `disabled.icon` is named in the failure. The same holds for a switch held in
a derived mode's read-only panel and for a Build style guides switch. A sweep of every page meets every switch the chrome
draws and holds each to the kind. The contrast probe now classifies `p3-switch` and measures each switch's track (edge or
fill against the ground around it) and knob (against the track) as indicators, as #2238 measures a check box, with
every drawn switch required to be measured. The hover sweep reads `.p3-switch` (no longer `.p3-btn.p3-switch`).
